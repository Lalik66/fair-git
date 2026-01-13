import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../index';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Get all users
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new admin account
router.post('/create-admin', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, firstName, lastName, currentPassword } = req.body;

    // Validate required fields
    if (!email || !firstName || !lastName || !currentPassword) {
      res.status(400).json({ error: 'Email, first name, last name, and current password are required' });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    // Verify current admin's password
    const currentAdmin = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!currentAdmin || !currentAdmin.passwordHash) {
      res.status(401).json({ error: 'Unable to verify admin credentials' });
      return;
    }

    const isValidPassword = await bcrypt.compare(currentPassword, currentAdmin.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      res.status(400).json({ error: 'An account with this email already exists' });
      return;
    }

    // Generate temporary password
    const temporaryPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    // Create new admin
    const newAdmin = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        firstName,
        lastName,
        role: 'admin',
        passwordHash,
        mustChangePassword: true,
        isActive: true,
      },
    });

    // Log the admin creation
    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: 'create_admin',
        details: `Created new admin account: ${email}`,
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.status(201).json({
      message: 'Admin account created successfully',
      temporaryPassword,
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        role: newAdmin.role,
        mustChangePassword: newAdmin.mustChangePassword,
      },
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Deactivate/activate user
router.patch('/users/:userId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      res.status(400).json({ error: 'isActive must be a boolean' });
      return;
    }

    // Prevent admin from deactivating themselves
    if (userId === req.user!.id && !isActive) {
      res.status(400).json({ error: 'You cannot deactivate your own account' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    // Log the action
    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: isActive ? 'activate_user' : 'deactivate_user',
        details: `${isActive ? 'Activated' : 'Deactivated'} user: ${user.email}`,
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.json({ user, message: `User ${isActive ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get admin activity logs
router.get('/logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.adminLog.findMany({
      include: {
        admin: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    res.json({ logs });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== FAIR MANAGEMENT ====================

// Get archived/past fairs - MUST be before /fairs/:fairId to avoid route conflict
router.get('/fairs/past', async (req: Request, res: Response): Promise<void> => {
  try {
    const pastFairs = await prisma.fair.findMany({
      where: {
        OR: [
          { status: 'archived' },
          { status: 'completed' },
        ],
      },
      orderBy: { endDate: 'desc' },
    });

    res.json({ fairs: pastFairs });
  } catch (error) {
    console.error('Get past fairs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Archive fairs that ended 30+ days ago - MUST be before /fairs/:fairId to avoid route conflict
router.post('/fairs/archive', async (req: Request, res: Response): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find fairs that ended 30+ days ago and aren't already archived
    const fairsToArchive = await prisma.fair.findMany({
      where: {
        endDate: { lte: thirtyDaysAgo },
        status: { not: 'archived' },
      },
    });

    if (fairsToArchive.length === 0) {
      res.json({ message: 'No fairs to archive', archivedCount: 0 });
      return;
    }

    // Archive each fair
    const archivedFairs = [];
    for (const fair of fairsToArchive) {
      const archivedFair = await prisma.fair.update({
        where: { id: fair.id },
        data: {
          status: 'archived',
          archivedAt: new Date(),
        },
      });
      archivedFairs.push(archivedFair);

      // Log each archival
      await prisma.adminLog.create({
        data: {
          adminId: req.user!.id,
          action: 'archive_fair',
          details: `Archived fair: ${fair.name} (ended ${fair.endDate.toISOString().split('T')[0]})`,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });
    }

    res.json({
      message: `Successfully archived ${archivedFairs.length} fair(s)`,
      archivedCount: archivedFairs.length,
      archivedFairs,
    });
  } catch (error) {
    console.error('Archive fairs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all fairs
router.get('/fairs', async (req: Request, res: Response): Promise<void> => {
  try {
    const fairs = await prisma.fair.findMany({
      orderBy: { startDate: 'desc' },
    });

    res.json({ fairs });
  } catch (error) {
    console.error('Get fairs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single fair by ID
router.get('/fairs/:fairId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fairId } = req.params;

    const fair = await prisma.fair.findUnique({
      where: { id: fairId },
    });

    if (!fair) {
      res.status(404).json({ error: 'Fair not found' });
      return;
    }

    res.json({ fair });
  } catch (error) {
    console.error('Get fair error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get detailed fair information with vendor participation data (for archived fairs)
router.get('/fairs/:fairId/details', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fairId } = req.params;

    // Get fair info
    const fair = await prisma.fair.findUnique({
      where: { id: fairId },
    });

    if (!fair) {
      res.status(404).json({ error: 'Fair not found' });
      return;
    }

    // Get application statistics
    const applications = await prisma.application.findMany({
      where: { fairId },
    });

    const applicationStats = {
      total: applications.length,
      approved: applications.filter(a => a.status === 'approved').length,
      rejected: applications.filter(a => a.status === 'rejected').length,
      pending: applications.filter(a => a.status === 'pending').length,
    };

    // Get bookings with vendor and house details
    const bookings = await prisma.booking.findMany({
      where: { fairId },
      include: {
        vendorProfile: {
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        vendorHouse: {
          select: {
            id: true,
            houseNumber: true,
            areaSqm: true,
            price: true,
          },
        },
      },
    });

    // Format participating vendors
    const participatingVendors = bookings.map(booking => ({
      vendorId: booking.vendorProfile.id,
      companyName: booking.vendorProfile.companyName,
      productCategory: booking.vendorProfile.productCategory,
      contactEmail: booking.vendorProfile.user.email,
      contactName: `${booking.vendorProfile.user.firstName || ''} ${booking.vendorProfile.user.lastName || ''}`.trim(),
      contactPhone: booking.vendorProfile.user.phone,
      houseNumber: booking.vendorHouse.houseNumber,
      houseArea: booking.vendorHouse.areaSqm,
      housePrice: booking.vendorHouse.price,
      bookingStatus: booking.bookingStatus,
      bookingStartDate: booking.startDate,
      bookingEndDate: booking.endDate,
    }));

    // Get list of rented houses
    const rentedHouses = bookings.map(booking => ({
      id: booking.vendorHouse.id,
      houseNumber: booking.vendorHouse.houseNumber,
      areaSqm: booking.vendorHouse.areaSqm,
      price: booking.vendorHouse.price,
      vendorCompany: booking.vendorProfile.companyName,
    }));

    res.json({
      fair,
      applicationStats,
      participatingVendors,
      rentedHouses,
      totalRevenue: rentedHouses.reduce((sum, h) => sum + (h.price || 0), 0),
    });
  } catch (error) {
    console.error('Get fair details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new fair
router.post('/fairs', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      descriptionAz,
      descriptionEn,
      startDate,
      endDate,
      locationAddress,
      mapCenterLat,
      mapCenterLng,
      bannerImageUrl,
      status,
    } = req.body;

    // Validate required fields
    if (!name || !startDate || !endDate) {
      res.status(400).json({ error: 'Name, start date, and end date are required' });
      return;
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ error: 'Invalid date format' });
      return;
    }

    if (end <= start) {
      res.status(400).json({ error: 'End date must be after start date' });
      return;
    }

    // If setting status to 'active', deactivate all other fairs first
    const newStatus = status || 'upcoming';
    if (newStatus === 'active') {
      await prisma.fair.updateMany({
        where: { status: 'active' },
        data: { status: 'upcoming' },
      });
    }

    // Create fair
    const fair = await prisma.fair.create({
      data: {
        name,
        descriptionAz: descriptionAz || null,
        descriptionEn: descriptionEn || null,
        startDate: start,
        endDate: end,
        locationAddress: locationAddress || null,
        mapCenterLat: mapCenterLat ? parseFloat(mapCenterLat) : null,
        mapCenterLng: mapCenterLng ? parseFloat(mapCenterLng) : null,
        bannerImageUrl: bannerImageUrl || null,
        status: status || 'upcoming',
      },
    });

    // Log the action
    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: 'create_fair',
        details: `Created new fair: ${name}`,
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.status(201).json({ fair, message: 'Fair created successfully' });
  } catch (error) {
    console.error('Create fair error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update fair
router.put('/fairs/:fairId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fairId } = req.params;
    const {
      name,
      descriptionAz,
      descriptionEn,
      startDate,
      endDate,
      locationAddress,
      mapCenterLat,
      mapCenterLng,
      bannerImageUrl,
      status,
    } = req.body;

    // Check if fair exists
    const existingFair = await prisma.fair.findUnique({
      where: { id: fairId },
    });

    if (!existingFair) {
      res.status(404).json({ error: 'Fair not found' });
      return;
    }

    // Validate dates if provided
    let start = existingFair.startDate;
    let end = existingFair.endDate;

    if (startDate) {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        res.status(400).json({ error: 'Invalid start date format' });
        return;
      }
    }

    if (endDate) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        res.status(400).json({ error: 'Invalid end date format' });
        return;
      }
    }

    if (end <= start) {
      res.status(400).json({ error: 'End date must be after start date' });
      return;
    }

    // If setting status to 'active', deactivate all other fairs first
    const newStatus = status || existingFair.status;
    if (newStatus === 'active' && existingFair.status !== 'active') {
      await prisma.fair.updateMany({
        where: {
          status: 'active',
          id: { not: fairId },
        },
        data: { status: 'upcoming' },
      });
    }

    // Update fair
    const fair = await prisma.fair.update({
      where: { id: fairId },
      data: {
        name: name || existingFair.name,
        descriptionAz: descriptionAz !== undefined ? descriptionAz : existingFair.descriptionAz,
        descriptionEn: descriptionEn !== undefined ? descriptionEn : existingFair.descriptionEn,
        startDate: start,
        endDate: end,
        locationAddress: locationAddress !== undefined ? locationAddress : existingFair.locationAddress,
        mapCenterLat: mapCenterLat !== undefined ? (mapCenterLat ? parseFloat(mapCenterLat) : null) : existingFair.mapCenterLat,
        mapCenterLng: mapCenterLng !== undefined ? (mapCenterLng ? parseFloat(mapCenterLng) : null) : existingFair.mapCenterLng,
        bannerImageUrl: bannerImageUrl !== undefined ? bannerImageUrl : existingFair.bannerImageUrl,
        status: status || existingFair.status,
      },
    });

    // Log the action
    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: 'update_fair',
        details: `Updated fair: ${fair.name}`,
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.json({ fair, message: 'Fair updated successfully' });
  } catch (error) {
    console.error('Update fair error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete fair
router.delete('/fairs/:fairId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fairId } = req.params;

    // Check if fair exists
    const existingFair = await prisma.fair.findUnique({
      where: { id: fairId },
    });

    if (!existingFair) {
      res.status(404).json({ error: 'Fair not found' });
      return;
    }

    // Check for approved bookings
    const approvedBookingsCount = await prisma.booking.count({
      where: {
        fairId: fairId,
        bookingStatus: 'approved',
      },
    });

    if (approvedBookingsCount > 0) {
      res.status(400).json({
        error: `Cannot delete fair with approved bookings. This fair has ${approvedBookingsCount} approved booking(s). Please cancel or complete the bookings first.`,
      });
      return;
    }

    // Delete fair
    await prisma.fair.delete({
      where: { id: fairId },
    });

    // Log the action
    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: 'delete_fair',
        details: `Deleted fair: ${existingFair.name}`,
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.json({ message: 'Fair deleted successfully' });
  } catch (error) {
    console.error('Delete fair error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== TEST DATA (Development Only) ====================

// Create test booking for a fair (for testing deletion protection)
router.post('/fairs/:fairId/test-booking', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fairId } = req.params;

    // Check if fair exists
    const fair = await prisma.fair.findUnique({
      where: { id: fairId },
    });

    if (!fair) {
      res.status(404).json({ error: 'Fair not found' });
      return;
    }

    // Create a test vendor user
    const testVendorEmail = `test-vendor-${Date.now()}@test.com`;
    const testVendor = await prisma.user.create({
      data: {
        email: testVendorEmail,
        firstName: 'Test',
        lastName: 'Vendor',
        role: 'vendor',
        isActive: true,
      },
    });

    // Create vendor profile
    const vendorProfile = await prisma.vendorProfile.create({
      data: {
        userId: testVendor.id,
        companyName: 'Test Company',
        businessDescription: 'Test business for booking verification',
        productCategory: 'other',
      },
    });

    // Create a test vendor house
    const testHouseNumber = `TEST-HOUSE-${Date.now()}`;
    const vendorHouse = await prisma.vendorHouse.create({
      data: {
        houseNumber: testHouseNumber,
        areaSqm: 25,
        price: 500,
        description: 'Test vendor house',
        latitude: 40.4093,
        longitude: 49.8671,
        isEnabled: true,
      },
    });

    // Create application
    const application = await prisma.application.create({
      data: {
        vendorProfileId: vendorProfile.id,
        fairId: fairId,
        vendorHouseId: vendorHouse.id,
        status: 'approved',
        reviewedAt: new Date(),
        reviewedById: req.user!.id,
      },
    });

    // Create approved booking
    const booking = await prisma.booking.create({
      data: {
        applicationId: application.id,
        vendorProfileId: vendorProfile.id,
        vendorHouseId: vendorHouse.id,
        fairId: fairId,
        bookingStatus: 'approved',
        startDate: fair.startDate,
        endDate: fair.endDate,
      },
    });

    res.status(201).json({
      message: 'Test booking created successfully',
      testData: {
        vendorId: testVendor.id,
        vendorProfileId: vendorProfile.id,
        vendorHouseId: vendorHouse.id,
        applicationId: application.id,
        bookingId: booking.id,
      },
    });
  } catch (error) {
    console.error('Create test booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete test booking data
router.delete('/fairs/:fairId/test-booking', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fairId } = req.params;

    // Delete all test bookings for this fair (cascade will clean up related data)
    const bookings = await prisma.booking.findMany({
      where: { fairId: fairId },
      include: {
        vendorProfile: {
          include: {
            user: true,
          },
        },
        vendorHouse: true,
      },
    });

    for (const booking of bookings) {
      // Delete vendor house if it's a test house
      if (booking.vendorHouse.houseNumber.startsWith('TEST-HOUSE-')) {
        await prisma.vendorHouse.delete({
          where: { id: booking.vendorHouse.id },
        });
      }

      // Delete test vendor user (cascade will delete profile)
      if (booking.vendorProfile.user.email.includes('test-vendor-')) {
        await prisma.user.delete({
          where: { id: booking.vendorProfile.user.id },
        });
      }
    }

    res.json({ message: 'Test booking data cleaned up' });
  } catch (error) {
    console.error('Delete test booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
// Force reload
