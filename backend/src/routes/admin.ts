import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { prisma } from '../index';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { deleteFromCloud } from '../utils/upload';
import { panoramaUpload, getUploadedFileUrl, isCloudinaryConfigured } from '../middleware/upload';

// Note: Panorama upload middleware is now imported from '../middleware/upload'
// which automatically uses Cloudinary storage when configured, or local disk storage as fallback

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

// Get admin activity logs with filtering
router.get('/logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, fromDate, toDate } = req.query;

    // Build filter conditions
    const where: any = {};

    // Filter by action type
    if (action && action !== 'all') {
      where.action = action as string;
    }

    // Filter by date range
    if (fromDate || toDate) {
      where.timestamp = {};
      if (fromDate) {
        where.timestamp.gte = new Date(fromDate as string);
      }
      if (toDate) {
        // Set to end of the day for toDate
        const endDate = new Date(toDate as string);
        endDate.setHours(23, 59, 59, 999);
        where.timestamp.lte = endDate;
      }
    }

    const logs = await prisma.adminLog.findMany({
      where,
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

    // Get distinct action types for filter dropdown
    const actionTypes = await prisma.adminLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });

    res.json({
      logs,
      actionTypes: actionTypes.map(a => a.action)
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== APPLICATION MANAGEMENT ====================

// Get all applications with vendor and fair details
router.get('/applications', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, fairId, sortBy, sortOrder } = req.query;

    // Build filter conditions
    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    if (fairId && fairId !== 'all') {
      where.fairId = fairId;
    }

    // Determine sort order
    let orderBy: any = { submittedAt: 'desc' };
    if (sortBy) {
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      switch (sortBy) {
        case 'submittedAt':
          orderBy = { submittedAt: order };
          break;
        case 'status':
          orderBy = { status: order };
          break;
        case 'companyName':
          orderBy = { vendorProfile: { companyName: order } };
          break;
        default:
          orderBy = { submittedAt: 'desc' };
      }
    }

    const applications = await prisma.application.findMany({
      where,
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
        fair: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        vendorHouse: {
          select: {
            id: true,
            houseNumber: true,
          },
        },
        reviewedBy: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy,
    });

    // Format applications for frontend
    const formattedApplications = applications.map(app => ({
      id: app.id,
      submittedAt: app.submittedAt,
      status: app.status,
      adminNotes: app.adminNotes,
      rejectionReason: app.rejectionReason,
      reviewedAt: app.reviewedAt,
      // Vendor info
      companyName: app.vendorProfile.companyName,
      productCategory: app.vendorProfile.productCategory,
      businessDescription: app.vendorProfile.businessDescription,
      contactName: `${app.vendorProfile.user.firstName || ''} ${app.vendorProfile.user.lastName || ''}`.trim(),
      contactEmail: app.vendorProfile.user.email,
      contactPhone: app.vendorProfile.user.phone,
      // Fair info
      fairId: app.fair.id,
      fairName: app.fair.name,
      fairStatus: app.fair.status,
      // House info
      vendorHouseId: app.vendorHouse.id,
      houseNumber: app.vendorHouse.houseNumber,
      // Reviewer info
      reviewedBy: app.reviewedBy ?
        `${app.reviewedBy.firstName || ''} ${app.reviewedBy.lastName || ''}`.trim() || app.reviewedBy.email
        : null,
    }));

    res.json({ applications: formattedApplications });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get application statistics
router.get('/applications/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const [total, pending, approved, rejected] = await Promise.all([
      prisma.application.count(),
      prisma.application.count({ where: { status: 'pending' } }),
      prisma.application.count({ where: { status: 'approved' } }),
      prisma.application.count({ where: { status: 'rejected' } }),
    ]);

    res.json({
      total,
      pending,
      approved,
      rejected,
    });
  } catch (error) {
    console.error('Get application stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve application
router.put('/applications/:applicationId/approve', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const { adminNotes } = req.body;

    // Get the application with related data
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        vendorProfile: {
          include: {
            user: true,
          },
        },
        fair: true,
        vendorHouse: true,
      },
    });

    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    if (application.status !== 'pending') {
      res.status(400).json({ error: `Application is already ${application.status}` });
      return;
    }

    // Check if house is already booked for this fair
    const existingBooking = await prisma.booking.findFirst({
      where: {
        vendorHouseId: application.vendorHouseId,
        fairId: application.fairId,
        bookingStatus: 'approved',
      },
    });

    if (existingBooking) {
      res.status(400).json({
        error: 'This house is already booked for this fair. Please reject this application or choose a different house.',
      });
      return;
    }

    // Update application status
    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedById: req.user!.id,
        adminNotes: adminNotes || null,
      },
    });

    // Create booking automatically
    const booking = await prisma.booking.create({
      data: {
        applicationId: application.id,
        vendorProfileId: application.vendorProfileId,
        vendorHouseId: application.vendorHouseId,
        fairId: application.fairId,
        bookingStatus: 'approved',
        startDate: application.fair.startDate,
        endDate: application.fair.endDate,
      },
    });

    // Log the action
    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: 'approve_application',
        details: `Approved application from ${application.vendorProfile.companyName || 'Unknown Vendor'} for fair ${application.fair.name}`,
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    // Log email (in production this would send an actual email)
    // Use user's preferred language for email content
    const userLang = application.vendorProfile.user.preferredLanguage || 'az';
    const vendorName = application.vendorProfile.user.firstName || 'Vendor';
    const fairName = application.fair.name;
    const houseNumber = application.vendorHouse.houseNumber;
    const startDate = application.fair.startDate.toISOString().split('T')[0];
    const endDate = application.fair.endDate.toISOString().split('T')[0];

    console.log('='.repeat(60));
    console.log(`EMAIL NOTIFICATION (Development Mode) - Language: ${userLang.toUpperCase()}`);
    console.log('='.repeat(60));
    console.log(`To: ${application.vendorProfile.user.email}`);

    if (userLang === 'en') {
      console.log(`Subject: Your Application Has Been Approved!`);
      console.log('');
      console.log(`Dear ${vendorName},`);
      console.log('');
      console.log(`Congratulations! Your application for ${fairName} has been approved.`);
      console.log('');
      console.log(`Details:`);
      console.log(`  - Fair: ${fairName}`);
      console.log(`  - House Number: ${houseNumber}`);
      console.log(`  - Fair Dates: ${startDate} to ${endDate}`);
      console.log('');
      console.log('Thank you for participating in our fair!');
    } else {
      // Azerbaijani
      console.log(`Mövzu: Müraciətiniz Təsdiqləndi!`);
      console.log('');
      console.log(`Hörmətli ${vendorName},`);
      console.log('');
      console.log(`Təbrik edirik! ${fairName} üçün müraciətiniz təsdiqləndi.`);
      console.log('');
      console.log(`Təfərrüatlar:`);
      console.log(`  - Yarmarka: ${fairName}`);
      console.log(`  - Ev Nömrəsi: ${houseNumber}`);
      console.log(`  - Yarmarka Tarixləri: ${startDate} - ${endDate}`);
      console.log('');
      console.log('Yarmarkamızda iştirak etdiyiniz üçün təşəkkür edirik!');
    }
    console.log('='.repeat(60));

    res.json({
      message: 'Application approved successfully',
      application: updatedApplication,
      booking: {
        id: booking.id,
        status: booking.bookingStatus,
        startDate: booking.startDate,
        endDate: booking.endDate,
      },
    });
  } catch (error) {
    console.error('Approve application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject application
router.put('/applications/:applicationId/reject', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      res.status(400).json({ error: 'Rejection reason is required' });
      return;
    }

    // Get the application with related data
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        vendorProfile: {
          include: {
            user: true,
          },
        },
        fair: true,
        vendorHouse: true,
      },
    });

    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    if (application.status !== 'pending') {
      res.status(400).json({ error: `Application is already ${application.status}` });
      return;
    }

    // Update application status to rejected
    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedById: req.user!.id,
        rejectionReason: rejectionReason.trim(),
      },
    });

    // Log the action
    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: 'reject_application',
        details: `Rejected application from ${application.vendorProfile.companyName || 'Unknown Vendor'} for fair ${application.fair.name}`,
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    // Log email (in production this would send an actual email)
    // Use user's preferred language for email content
    const userLang = application.vendorProfile.user.preferredLanguage || 'az';
    const vendorName = application.vendorProfile.user.firstName || 'Vendor';
    const fairName = application.fair.name;
    const houseNumber = application.vendorHouse.houseNumber;

    console.log('='.repeat(60));
    console.log(`EMAIL NOTIFICATION (Development Mode) - Language: ${userLang.toUpperCase()}`);
    console.log('='.repeat(60));
    console.log(`To: ${application.vendorProfile.user.email}`);

    if (userLang === 'en') {
      console.log(`Subject: Your Application Status Update`);
      console.log('');
      console.log(`Dear ${vendorName},`);
      console.log('');
      console.log(`We regret to inform you that your application for ${fairName} has been rejected.`);
      console.log('');
      console.log(`Reason: ${rejectionReason}`);
      console.log('');
      console.log(`Details:`);
      console.log(`  - Fair: ${fairName}`);
      console.log(`  - House Number: ${houseNumber}`);
      console.log('');
      console.log('If you have any questions, please contact our support team.');
    } else {
      // Azerbaijani
      console.log(`Mövzu: Müraciət Statusu Yeniləndi`);
      console.log('');
      console.log(`Hörmətli ${vendorName},`);
      console.log('');
      console.log(`Təəssüflə bildiririk ki, ${fairName} üçün müraciətiniz rədd edildi.`);
      console.log('');
      console.log(`Səbəb: ${rejectionReason}`);
      console.log('');
      console.log(`Təfərrüatlar:`);
      console.log(`  - Yarmarka: ${fairName}`);
      console.log(`  - Ev Nömrəsi: ${houseNumber}`);
      console.log('');
      console.log('Suallarınız varsa, dəstək komandamızla əlaqə saxlayın.');
    }
    console.log('='.repeat(60));

    res.json({
      message: 'Application rejected successfully',
      application: updatedApplication,
    });
  } catch (error) {
    console.error('Reject application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete application (with cascade to related booking)
router.delete('/applications/:applicationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { booking: true },
    });

    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    // Delete related booking first if exists
    if (application.booking) {
      await prisma.booking.delete({ where: { applicationId: applicationId } });
    }

    await prisma.application.delete({ where: { id: applicationId } });

    // Log the action
    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: 'delete_application',
        details: JSON.stringify({ applicationId, vendor: application.vendorProfileId }),
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

// Update application admin notes
router.put('/applications/:applicationId/notes', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const { adminNotes } = req.body;

    // Get the application
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        vendorProfile: true,
        fair: true,
      },
    });

    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    // Update admin notes
    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: {
        adminNotes: adminNotes ? adminNotes.trim() : null,
      },
    });

    // Log the action
    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: 'update_application_notes',
        details: `Updated admin notes for application from ${application.vendorProfile.companyName || 'Unknown Vendor'} for fair ${application.fair.name}`,
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.json({
      message: 'Admin notes updated successfully',
      application: updatedApplication,
    });
  } catch (error) {
    console.error('Update application notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single application details (for modal)
router.get('/applications/:applicationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
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
            productImages: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        fair: {
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
        vendorHouse: {
          select: {
            id: true,
            houseNumber: true,
            areaSqm: true,
            price: true,
            description: true,
          },
        },
        reviewedBy: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!application) {
      res.status(404).json({ error: 'Application not found' });
      return;
    }

    // Format application for frontend
    const formattedApplication = {
      id: application.id,
      submittedAt: application.submittedAt,
      status: application.status,
      adminNotes: application.adminNotes,
      rejectionReason: application.rejectionReason,
      reviewedAt: application.reviewedAt,
      // Vendor info
      companyName: application.vendorProfile.companyName,
      productCategory: application.vendorProfile.productCategory,
      businessDescription: application.vendorProfile.businessDescription,
      logoUrl: application.vendorProfile.logoUrl,
      productImages: application.vendorProfile.productImages.map(img => ({
        id: img.id,
        imageUrl: img.imageUrl,
        orderIndex: img.orderIndex,
      })),
      contactName: `${application.vendorProfile.user.firstName || ''} ${application.vendorProfile.user.lastName || ''}`.trim(),
      contactEmail: application.vendorProfile.user.email,
      contactPhone: application.vendorProfile.user.phone,
      // Fair info
      fairId: application.fair.id,
      fairName: application.fair.name,
      fairStatus: application.fair.status,
      fairStartDate: application.fair.startDate,
      fairEndDate: application.fair.endDate,
      // House info
      vendorHouseId: application.vendorHouse.id,
      houseNumber: application.vendorHouse.houseNumber,
      houseAreaSqm: application.vendorHouse.areaSqm,
      housePrice: application.vendorHouse.price,
      houseDescription: application.vendorHouse.description,
      // Reviewer info
      reviewedBy: application.reviewedBy ?
        `${application.reviewedBy.firstName || ''} ${application.reviewedBy.lastName || ''}`.trim() || application.reviewedBy.email
        : null,
    };

    res.json({ application: formattedApplication });
  } catch (error) {
    console.error('Get application details error:', error);
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
      res.json({ message: 'No fairs to archive', archivedCount: 0, archivedBookingsCount: 0 });
      return;
    }

    // Archive each fair and its bookings
    const archivedFairs = [];
    let totalArchivedBookings = 0;

    for (const fair of fairsToArchive) {
      // Archive the fair
      const archivedFair = await prisma.fair.update({
        where: { id: fair.id },
        data: {
          status: 'archived',
          archivedAt: new Date(),
        },
      });
      archivedFairs.push(archivedFair);

      // Archive all bookings for this fair
      const archivedBookings = await prisma.booking.updateMany({
        where: {
          fairId: fair.id,
          isArchived: false,
        },
        data: {
          isArchived: true,
          bookingStatus: 'archived',
        },
      });
      totalArchivedBookings += archivedBookings.count;

      // Log fair archival
      await prisma.adminLog.create({
        data: {
          adminId: req.user!.id,
          action: 'archive_fair',
          details: `Archived fair: ${fair.name} (ended ${fair.endDate.toISOString().split('T')[0]}) with ${archivedBookings.count} booking(s)`,
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });
    }

    res.json({
      message: `Successfully archived ${archivedFairs.length} fair(s) and ${totalArchivedBookings} booking(s)`,
      archivedCount: archivedFairs.length,
      archivedBookingsCount: totalArchivedBookings,
      archivedFairs,
    });
  } catch (error) {
    console.error('Archive fairs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Archive bookings for a specific fair (manual archive) - MUST be before /fairs/:fairId to avoid route conflict
router.post('/fairs/:fairId/archive-bookings', async (req: Request, res: Response): Promise<void> => {
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

    // Check if fair has ended
    const now = new Date();
    if (fair.endDate > now) {
      res.status(400).json({ error: 'Cannot archive bookings for a fair that has not ended yet' });
      return;
    }

    // Archive all bookings for this fair
    const archivedBookings = await prisma.booking.updateMany({
      where: {
        fairId: fairId,
        isArchived: false,
      },
      data: {
        isArchived: true,
        bookingStatus: 'archived',
      },
    });

    if (archivedBookings.count === 0) {
      res.json({ message: 'No bookings to archive for this fair', archivedCount: 0 });
      return;
    }

    // Log the action
    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: 'archive_bookings',
        details: `Archived ${archivedBookings.count} booking(s) for fair: ${fair.name}`,
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.json({
      message: `Successfully archived ${archivedBookings.count} booking(s)`,
      archivedCount: archivedBookings.count,
      fairName: fair.name,
    });
  } catch (error) {
    console.error('Archive bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get bookings with their archive status
router.get('/bookings', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fairId, isArchived } = req.query;

    const where: any = {};
    if (fairId) {
      where.fairId = fairId;
    }
    if (isArchived !== undefined) {
      where.isArchived = isArchived === 'true';
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        vendorProfile: {
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        fair: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
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
      orderBy: { createdAt: 'desc' },
    });

    const formattedBookings = bookings.map(booking => ({
      id: booking.id,
      bookingStatus: booking.bookingStatus,
      isArchived: booking.isArchived,
      startDate: booking.startDate,
      endDate: booking.endDate,
      createdAt: booking.createdAt,
      // Vendor info
      vendorCompany: booking.vendorProfile.companyName,
      vendorEmail: booking.vendorProfile.user.email,
      vendorName: `${booking.vendorProfile.user.firstName || ''} ${booking.vendorProfile.user.lastName || ''}`.trim(),
      // Fair info
      fairId: booking.fair.id,
      fairName: booking.fair.name,
      fairStatus: booking.fair.status,
      // House info
      houseNumber: booking.vendorHouse.houseNumber,
      houseAreaSqm: booking.vendorHouse.areaSqm,
      housePrice: booking.vendorHouse.price,
    }));

    res.json({ bookings: formattedBookings });
  } catch (error) {
    console.error('Get bookings error:', error);
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

    // Check if dates changed and send notifications to affected vendors
    const startDateChanged = existingFair.startDate.getTime() !== start.getTime();
    const endDateChanged = existingFair.endDate.getTime() !== end.getTime();

    if (startDateChanged || endDateChanged) {
      // Get all approved bookings for this fair
      const approvedBookings = await prisma.booking.findMany({
        where: {
          fairId: fairId,
          bookingStatus: 'approved',
        },
        include: {
          vendorProfile: {
            include: {
              user: {
                select: {
                  email: true,
                  firstName: true,
                  preferredLanguage: true,
                },
              },
            },
          },
          vendorHouse: true,
        },
      });

      // Send date change notification to each affected vendor
      for (const booking of approvedBookings) {
        const userLang = booking.vendorProfile.user.preferredLanguage || 'az';
        const vendorName = booking.vendorProfile.user.firstName || 'Vendor';
        const houseNumber = booking.vendorHouse.houseNumber;
        const oldStartDate = existingFair.startDate.toISOString().split('T')[0];
        const oldEndDate = existingFair.endDate.toISOString().split('T')[0];
        const newStartDate = start.toISOString().split('T')[0];
        const newEndDate = end.toISOString().split('T')[0];

        console.log('='.repeat(60));
        console.log(`EMAIL NOTIFICATION (Development Mode) - Language: ${userLang.toUpperCase()}`);
        console.log('='.repeat(60));
        console.log(`To: ${booking.vendorProfile.user.email}`);

        if (userLang === 'en') {
          console.log(`Subject: Fair Date Change Notice - ${fair.name}`);
          console.log('');
          console.log(`Dear ${vendorName},`);
          console.log('');
          console.log(`Important: The dates for ${fair.name} have been changed.`);
          console.log('');
          console.log('Previous Dates:');
          console.log(`  - Start: ${oldStartDate}`);
          console.log(`  - End: ${oldEndDate}`);
          console.log('');
          console.log('New Dates:');
          console.log(`  - Start: ${newStartDate}`);
          console.log(`  - End: ${newEndDate}`);
          console.log('');
          console.log(`Your booking details:`);
          console.log(`  - House Number: ${houseNumber}`);
          console.log('');
          console.log('Please update your calendar accordingly. If you have any questions,');
          console.log('please contact our support team.');
        } else {
          // Azerbaijani
          console.log(`Mövzu: Yarmarka Tarix Dəyişikliyi Bildirişi - ${fair.name}`);
          console.log('');
          console.log(`Hörmətli ${vendorName},`);
          console.log('');
          console.log(`Vacib: ${fair.name} üçün tarixlər dəyişdirildi.`);
          console.log('');
          console.log('Əvvəlki Tarixlər:');
          console.log(`  - Başlanğıc: ${oldStartDate}`);
          console.log(`  - Bitiş: ${oldEndDate}`);
          console.log('');
          console.log('Yeni Tarixlər:');
          console.log(`  - Başlanğıc: ${newStartDate}`);
          console.log(`  - Bitiş: ${newEndDate}`);
          console.log('');
          console.log(`Rezervasiya məlumatlarınız:`);
          console.log(`  - Ev Nömrəsi: ${houseNumber}`);
          console.log('');
          console.log('Zəhmət olmasa təqviminizi yeniləyin. Hər hansı sualınız varsa,');
          console.log('dəstək komandamızla əlaqə saxlayın.');
        }
        console.log('='.repeat(60));
        console.log('');
      }
    }

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

// ==================== TEST DATA (Development Only) ====================
// Create test applications for testing Application Review feature
router.post('/test-applications', async (req: Request, res: Response): Promise<void> => {
  try {
    // Get all active/upcoming fairs
    const fairs = await prisma.fair.findMany({
      where: { status: { in: ['active', 'upcoming'] } },
      take: 2,
    });

    // If no fairs exist, create two
    if (fairs.length === 0) {
      const winterFair = await prisma.fair.create({
        data: {
          name: 'Winter 2026',
          startDate: new Date('2026-12-01'),
          endDate: new Date('2027-01-05'),
          status: 'upcoming',
        },
      });
      const springFair = await prisma.fair.create({
        data: {
          name: 'Spring Festival 2026',
          startDate: new Date('2026-05-01'),
          endDate: new Date('2026-05-31'),
          status: 'active',
        },
      });
      fairs.push(winterFair, springFair);
    } else if (fairs.length === 1) {
      // Create a second fair if only one exists
      const springFair = await prisma.fair.create({
        data: {
          name: 'Spring Festival 2026',
          startDate: new Date('2026-05-01'),
          endDate: new Date('2026-05-31'),
          status: 'active',
        },
      });
      fairs.push(springFair);
    }

    // Create test vendor houses if they don't exist
    const houseNumbers = ['H-101', 'H-102', 'H-103', 'H-104'];
    for (const houseNumber of houseNumbers) {
      const existing = await prisma.vendorHouse.findUnique({
        where: { houseNumber },
      });
      if (!existing) {
        await prisma.vendorHouse.create({
          data: {
            houseNumber,
            areaSqm: 25 + Math.random() * 25,
            price: 500 + Math.random() * 500,
            description: `Test vendor house ${houseNumber}`,
            latitude: 40.4093 + Math.random() * 0.01,
            longitude: 49.8671 + Math.random() * 0.01,
            isEnabled: true,
          },
        });
      }
    }

    const houses = await prisma.vendorHouse.findMany({
      where: { houseNumber: { in: houseNumbers } },
    });

    // Create test vendors and applications - spread across fairs with diverse combinations
    const testVendors = [
      { company: 'Artisan Crafts Co', category: 'handicrafts', status: 'pending', fairIndex: 0 },
      { company: 'Fresh Bites Kitchen', category: 'food_beverages', status: 'approved', fairIndex: 0 },
      { company: 'Fashion Forward', category: 'clothing', status: 'rejected', fairIndex: 0 },
      { company: 'Spring Delights', category: 'food_beverages', status: 'pending', fairIndex: 1 },
      { company: 'Winter Food Vendor', category: 'food_beverages', status: 'pending', fairIndex: 0 }, // Matches: Pending + Food & Beverages + Winter
    ];

    const createdApplications = [];
    for (let i = 0; i < testVendors.length; i++) {
      const vendor = testVendors[i];
      const house = houses[i % houses.length];
      const fair = fairs[vendor.fairIndex % fairs.length];

      // Create test vendor user
      const email = `test-vendor-${Date.now()}-${i}@test.com`;
      const user = await prisma.user.create({
        data: {
          email,
          firstName: vendor.company.split(' ')[0],
          lastName: 'Vendor',
          role: 'vendor',
          isActive: true,
        },
      });

      // Create vendor profile
      const profile = await prisma.vendorProfile.create({
        data: {
          userId: user.id,
          companyName: vendor.company,
          businessDescription: `${vendor.company} is a quality provider of ${vendor.category.replace('_', ' ')} products.`,
          productCategory: vendor.category,
        },
      });

      // Create application
      const application = await prisma.application.create({
        data: {
          vendorProfileId: profile.id,
          fairId: fair.id,
          vendorHouseId: house.id,
          status: vendor.status,
          submittedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date in last 7 days
          reviewedAt: vendor.status !== 'pending' ? new Date() : null,
          reviewedById: vendor.status !== 'pending' ? req.user!.id : null,
          rejectionReason: vendor.status === 'rejected' ? 'Incomplete documentation' : null,
        },
      });

      createdApplications.push({
        id: application.id,
        company: vendor.company,
        status: vendor.status,
        fair: fair.name,
      });
    }

    res.status(201).json({
      message: `Created ${createdApplications.length} test applications`,
      applications: createdApplications,
    });
  } catch (error) {
    console.error('Create test applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete test applications
router.delete('/test-applications', async (req: Request, res: Response): Promise<void> => {
  try {
    // Find all test vendor users
    const testUsers = await prisma.user.findMany({
      where: {
        email: { contains: 'test-vendor-' },
      },
    });

    // Delete them (cascade will clean up profiles and applications)
    for (const user of testUsers) {
      await prisma.user.delete({
        where: { id: user.id },
      });
    }

    // Clean up test houses
    await prisma.vendorHouse.deleteMany({
      where: {
        houseNumber: { in: ['H-101', 'H-102', 'H-103', 'H-104'] },
      },
    });

    res.json({ message: `Cleaned up ${testUsers.length} test vendors and their data` });
  } catch (error) {
    console.error('Delete test applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create test vendor with password (for testing purposes)
router.post('/test-vendor', async (req: Request, res: Response): Promise<void> => {
  try {
    const testEmail = `test-vendor-${Date.now()}@test.com`;
    const testPassword = 'VendorPass123!';
    const passwordHash = await bcrypt.hash(testPassword, 10);

    // Create test vendor user with password
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        firstName: 'Test',
        lastName: 'Vendor',
        role: 'vendor',
        isActive: true,
        passwordHash,
      },
    });

    // Create vendor profile
    await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        companyName: '',  // Empty - for testing validation
        businessDescription: '',  // Empty - for testing validation
        productCategory: '',  // Empty - for testing validation
      },
    });

    res.status(201).json({
      message: 'Test vendor created successfully',
      credentials: {
        email: testEmail,
        password: testPassword,
      },
    });
  } catch (error) {
    console.error('Create test vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create test vendor with 360° panorama booking (for testing panorama feature)
router.post('/test-vendor-with-panorama', async (req: Request, res: Response): Promise<void> => {
  try {
    const testEmail = `test-panorama-vendor-${Date.now()}@test.com`;
    const testPassword = 'VendorPass123!';
    const passwordHash = await bcrypt.hash(testPassword, 10);

    // Create test vendor user with password
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        firstName: 'Panorama',
        lastName: 'Vendor',
        role: 'vendor',
        isActive: true,
        passwordHash,
      },
    });

    // Create vendor profile
    const vendorProfile = await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        companyName: 'Panorama Test Company',
        businessDescription: 'Test company for 360° panorama feature',
        productCategory: 'other',
      },
    });

    // Get an upcoming fair
    const fair = await prisma.fair.findFirst({
      where: { status: 'upcoming' },
    });

    if (!fair) {
      res.status(400).json({ error: 'No upcoming fair found. Create a fair first.' });
      return;
    }

    // Create a vendor house with 360° panorama
    const testHouseNumber = `PANORAMA-HOUSE-${Date.now()}`;
    const vendorHouse = await prisma.vendorHouse.create({
      data: {
        houseNumber: testHouseNumber,
        areaSqm: 30,
        price: 600,
        description: 'Test vendor house with 360° panorama tour',
        latitude: 40.4093,
        longitude: 49.8671,
        isEnabled: true,
        panorama360Url: 'https://photo-sphere-viewer-data.netlify.app/assets/sphere.jpg',
      },
    });

    // Create approved application
    const application = await prisma.application.create({
      data: {
        vendorProfileId: vendorProfile.id,
        fairId: fair.id,
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
        fairId: fair.id,
        bookingStatus: 'approved',
        startDate: fair.startDate,
        endDate: fair.endDate,
      },
    });

    res.status(201).json({
      message: 'Test vendor with 360° panorama booking created successfully',
      credentials: {
        email: testEmail,
        password: testPassword,
      },
      testData: {
        vendorId: user.id,
        vendorProfileId: vendorProfile.id,
        vendorHouseId: vendorHouse.id,
        houseNumber: testHouseNumber,
        applicationId: application.id,
        bookingId: booking.id,
        fairName: fair.name,
        panorama360Url: vendorHouse.panorama360Url,
      },
    });
  } catch (error) {
    console.error('Create test vendor with panorama error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// About Us Management
// ============================================

// Get all About Us content for editing
router.get('/about-us', async (req: Request, res: Response): Promise<void> => {
  try {
    const content = await prisma.aboutUsContent.findMany({
      include: {
        updatedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({ content });
  } catch (error) {
    console.error('Get about us content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update or create About Us content section
router.put('/about-us/:sectionKey', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sectionKey } = req.params;
    const { contentAz, contentEn } = req.body;

    // Upsert the content
    const content = await prisma.aboutUsContent.upsert({
      where: { sectionKey },
      update: {
        contentAz,
        contentEn,
        updatedById: req.user!.id,
      },
      create: {
        sectionKey,
        contentAz,
        contentEn,
        updatedById: req.user!.id,
      },
    });

    // Log the action
    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: 'update_about_us',
        details: `Updated About Us section: ${sectionKey}`,
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.json({ content, message: 'Content updated successfully' });
  } catch (error) {
    console.error('Update about us content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get site contact info for editing
router.get('/contact-info', async (req: Request, res: Response): Promise<void> => {
  try {
    const info = await prisma.siteContactInfo.findFirst({
      select: {
        id: true,
        phone: true,
        email: true,
        facebookUrl: true,
        instagramUrl: true,
        updatedAt: true,
      },
    });

    res.json({
      phone: info?.phone ?? '',
      email: info?.email ?? '',
      facebookUrl: info?.facebookUrl ?? '',
      instagramUrl: info?.instagramUrl ?? '',
      updatedAt: info?.updatedAt ?? null,
    });
  } catch (error) {
    console.error('Get contact info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update site contact info (upsert single row)
router.put('/contact-info', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, email, facebookUrl, instagramUrl } = req.body;

    const existing = await prisma.siteContactInfo.findFirst();
    const data = {
      phone: phone ?? null,
      email: email ?? null,
      facebookUrl: facebookUrl ?? null,
      instagramUrl: instagramUrl ?? null,
    };

    const info = existing
      ? await prisma.siteContactInfo.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.siteContactInfo.create({
          data,
        });

    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: 'update_contact_info',
        details: 'Updated site contact information',
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.json({
      phone: info.phone,
      email: info.email,
      facebookUrl: info.facebookUrl,
      instagramUrl: info.instagramUrl,
      message: 'Contact info updated successfully',
    });
  } catch (error) {
    console.error('Update contact info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// Vendor House Management (for 360° panorama testing)
// ============================================

// Update vendor house panorama URL
router.put('/vendor-houses/:houseId/panorama', async (req: Request, res: Response): Promise<void> => {
  try {
    const { houseId } = req.params;
    const { panorama360Url } = req.body;

    const vendorHouse = await prisma.vendorHouse.findUnique({
      where: { id: houseId },
    });

    if (!vendorHouse) {
      res.status(404).json({ error: 'Vendor house not found' });
      return;
    }

    const updated = await prisma.vendorHouse.update({
      where: { id: houseId },
      data: { panorama360Url },
    });

    res.json({
      message: 'Panorama URL updated successfully',
      vendorHouse: {
        id: updated.id,
        houseNumber: updated.houseNumber,
        panorama360Url: updated.panorama360Url,
      },
    });
  } catch (error) {
    console.error('Update vendor house panorama error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload panorama image file for vendor house
router.post('/vendor-houses/:houseId/panorama-upload', panoramaUpload.single('panorama'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { houseId } = req.params;

    if (!req.file) {
      res.status(400).json({ error: 'No panorama image file provided' });
      return;
    }

    const vendorHouse = await prisma.vendorHouse.findUnique({
      where: { id: houseId },
    });

    if (!vendorHouse) {
      // Clean up uploaded file (only for local storage - Cloudinary files are already uploaded)
      if (!isCloudinaryConfigured() && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error('Failed to delete temporary file:', e);
        }
      }
      res.status(404).json({ error: 'Vendor house not found' });
      return;
    }

    // Delete old panorama file if it exists
    if (vendorHouse.panorama360Url) {
      if (vendorHouse.panorama360Url.includes('cloudinary')) {
        await deleteFromCloud(vendorHouse.panorama360Url);
      } else if (vendorHouse.panorama360Url.startsWith('/uploads/panoramas/')) {
        const oldFilePath = path.join(__dirname, '../..', vendorHouse.panorama360Url);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }

    // Get the uploaded file URL
    // When Cloudinary is configured, multer-storage-cloudinary uploads directly and stores URL in file.path
    // When using local storage, we construct the URL from the filename
    const finalUrl = getUploadedFileUrl(req.file, 'panoramas');

    const updated = await prisma.vendorHouse.update({
      where: { id: houseId },
      data: { panorama360Url: finalUrl },
    });

    res.json({
      message: 'Panorama image uploaded successfully',
      vendorHouse: {
        id: updated.id,
        houseNumber: updated.houseNumber,
        panorama360Url: updated.panorama360Url,
      },
    });
  } catch (error) {
    console.error('Upload vendor house panorama error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new vendor house
router.post('/vendor-houses', async (req: Request, res: Response): Promise<void> => {
  try {
    const { houseNumber, areaSqm, price, description, latitude, longitude } = req.body;

    if (!houseNumber || !houseNumber.trim()) {
      res.status(400).json({ error: 'House number is required' });
      return;
    }

    if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
      res.status(400).json({ error: 'Latitude and longitude are required' });
      return;
    }

    const lat = parseFloat(String(latitude));
    const lng = parseFloat(String(longitude));
    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ error: 'Latitude and longitude must be valid numbers' });
      return;
    }

    // Check for duplicate house number
    const existingHouse = await prisma.vendorHouse.findUnique({
      where: { houseNumber: houseNumber.trim() },
    });
    if (existingHouse) {
      res.status(400).json({ error: 'A vendor house with this number already exists' });
      return;
    }

    const createData: Record<string, unknown> = {
      houseNumber: houseNumber.trim(),
      latitude: lat,
      longitude: lng,
    };

    if (areaSqm !== undefined && areaSqm !== null && areaSqm !== '') {
      const area = parseFloat(String(areaSqm));
      if (isNaN(area) || area < 0) {
        res.status(400).json({ error: 'Area must be a valid non-negative number' });
        return;
      }
      createData.areaSqm = area;
    }

    if (price !== undefined && price !== null && price !== '') {
      const p = parseFloat(String(price));
      if (isNaN(p) || p < 0) {
        res.status(400).json({ error: 'Price must be a valid non-negative number' });
        return;
      }
      createData.price = p;
    }

    if (description !== undefined && description !== null) {
      createData.description = String(description).trim() || null;
    }

    const vendorHouse = await prisma.vendorHouse.create({
      data: createData as {
        houseNumber: string;
        latitude: number;
        longitude: number;
        areaSqm?: number;
        price?: number;
        description?: string | null;
      },
    });

    // Log activity
    const adminUser = (req as Record<string, unknown>).user as { userId?: string } | undefined;
    if (adminUser?.userId) {
      try {
        await prisma.activityLog.create({
          data: {
            userId: adminUser.userId,
            action: 'CREATE_VENDOR_HOUSE',
            details: `Created vendor house ${vendorHouse.houseNumber}`,
          },
        });
      } catch (logError) {
        console.error('Failed to log activity:', logError);
      }
    }

    res.status(201).json({
      message: `Vendor house "${vendorHouse.houseNumber}" created successfully`,
      vendorHouse: {
        id: vendorHouse.id,
        houseNumber: vendorHouse.houseNumber,
        areaSqm: vendorHouse.areaSqm,
        price: vendorHouse.price,
        description: vendorHouse.description,
        latitude: vendorHouse.latitude,
        longitude: vendorHouse.longitude,
        panorama360Url: vendorHouse.panorama360Url,
        isEnabled: vendorHouse.isEnabled,
      },
    });
  } catch (error) {
    console.error('Create vendor house error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all vendor houses
router.get('/vendor-houses', async (req: Request, res: Response): Promise<void> => {
  try {
    const houses = await prisma.vendorHouse.findMany({
      orderBy: { houseNumber: 'asc' },
      select: {
        id: true,
        houseNumber: true,
        areaSqm: true,
        price: true,
        description: true,
        latitude: true,
        longitude: true,
        panorama360Url: true,
        isEnabled: true,
      },
    });

    res.json({ houses });
  } catch (error) {
    console.error('Get vendor houses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update vendor house details
router.put('/vendor-houses/:houseId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { houseId } = req.params;
    const { houseNumber, areaSqm, price, description, isEnabled } = req.body;

    const vendorHouse = await prisma.vendorHouse.findUnique({
      where: { id: houseId },
    });

    if (!vendorHouse) {
      res.status(404).json({ error: 'Vendor house not found' });
      return;
    }

    const updateData: Record<string, unknown> = {};

    if (houseNumber !== undefined) {
      if (houseNumber !== vendorHouse.houseNumber) {
        const existingHouse = await prisma.vendorHouse.findUnique({
          where: { houseNumber },
        });
        if (existingHouse) {
          res.status(400).json({ error: 'A vendor house with this number already exists' });
          return;
        }
      }
      updateData.houseNumber = houseNumber;
    }

    if (areaSqm !== undefined) {
      updateData.areaSqm = areaSqm !== null && areaSqm !== '' ? parseFloat(String(areaSqm)) : null;
    }

    if (price !== undefined) {
      updateData.price = price !== null && price !== '' ? parseFloat(String(price)) : null;
    }

    if (description !== undefined) {
      updateData.description = description || null;
    }

    if (isEnabled !== undefined) {
      updateData.isEnabled = Boolean(isEnabled);
    }

    const updated = await prisma.vendorHouse.update({
      where: { id: houseId },
      data: updateData,
    });

    res.json({
      message: 'Vendor house updated successfully',
      vendorHouse: {
        id: updated.id,
        houseNumber: updated.houseNumber,
        areaSqm: updated.areaSqm,
        price: updated.price,
        description: updated.description,
        isEnabled: updated.isEnabled,
        panorama360Url: updated.panorama360Url,
        latitude: updated.latitude,
        longitude: updated.longitude,
      },
    });
  } catch (error) {
    console.error('Update vendor house error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single vendor house details
router.get('/vendor-houses/:houseId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { houseId } = req.params;

    const vendorHouse = await prisma.vendorHouse.findUnique({
      where: { id: houseId },
      include: {
        applications: {
          select: {
            id: true,
            status: true,
            fair: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        bookings: {
          select: {
            id: true,
            status: true,
            fair: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!vendorHouse) {
      res.status(404).json({ error: 'Vendor house not found' });
      return;
    }

    res.json({ vendorHouse });
  } catch (error) {
    console.error('Get vendor house error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete vendor house (blocked if pending applications exist)
router.delete('/vendor-houses/:houseId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { houseId } = req.params;

    const vendorHouse = await prisma.vendorHouse.findUnique({
      where: { id: houseId },
      include: {
        applications: {
          where: { status: 'pending' },
        },
        bookings: {
          where: { bookingStatus: 'active' },
        },
      },
    });

    if (!vendorHouse) {
      res.status(404).json({ error: 'Vendor house not found' });
      return;
    }

    // Check for pending applications
    if (vendorHouse.applications.length > 0) {
      res.status(400).json({
        error: `Cannot delete vendor house "${vendorHouse.houseNumber}": it has ${vendorHouse.applications.length} pending application(s). Please resolve all pending applications first.`,
      });
      return;
    }

    // Check for active bookings
    if (vendorHouse.bookings.length > 0) {
      res.status(400).json({
        error: `Cannot delete vendor house "${vendorHouse.houseNumber}": it has ${vendorHouse.bookings.length} active booking(s). Please resolve all active bookings first.`,
      });
      return;
    }

    // Delete associated records first (non-pending applications and non-active bookings)
    await prisma.application.deleteMany({
      where: { vendorHouseId: houseId },
    });
    await prisma.booking.deleteMany({
      where: { vendorHouseId: houseId },
    });

    // Delete the vendor house
    await prisma.vendorHouse.delete({
      where: { id: houseId },
    });

    res.json({
      message: `Vendor house "${vendorHouse.houseNumber}" deleted successfully`,
    });
  } catch (error) {
    console.error('Delete vendor house error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// Facility Management
// ============================================

// Get all facilities
router.get('/facilities', async (req: Request, res: Response): Promise<void> => {
  try {
    const facilities = await prisma.facility.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ facilities });
  } catch (error) {
    console.error('Get facilities error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new facility
router.post('/facilities', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, type, description, latitude, longitude, photoUrl, icon, color } = req.body;

    // Validate required fields
    if (!name || !type || latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: 'Name, type, latitude, and longitude are required' });
      return;
    }

    // Validate type
    const validTypes = ['restaurant', 'cafe', 'kids_zone', 'restroom', 'taxi', 'bus_stop', 'parking', 'info', 'first_aid', 'atm'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: `Invalid facility type. Must be one of: ${validTypes.join(', ')}` });
      return;
    }

    const facility = await prisma.facility.create({
      data: {
        name,
        type,
        description: description || null,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        photoUrl: photoUrl || null,
        icon: icon || null,
        color: color || null,
      },
    });

    res.status(201).json({
      message: `Facility "${facility.name}" created successfully`,
      facility,
    });
  } catch (error) {
    console.error('Create facility error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a facility
router.put('/facilities/:facilityId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { facilityId } = req.params;
    const { name, type, description, latitude, longitude, photoUrl, icon, color } = req.body;

    const existing = await prisma.facility.findUnique({
      where: { id: facilityId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Facility not found' });
      return;
    }

    if (type) {
      const validTypes = ['restaurant', 'cafe', 'kids_zone', 'restroom', 'taxi', 'bus_stop', 'parking', 'info', 'first_aid', 'atm'];
      if (!validTypes.includes(type)) {
        res.status(400).json({ error: `Invalid facility type. Must be one of: ${validTypes.join(', ')}` });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description || null;
    if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
    if (longitude !== undefined) updateData.longitude = parseFloat(longitude);
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl || null;
    if (icon !== undefined) updateData.icon = icon || null;
    if (color !== undefined) updateData.color = color || null;

    const facility = await prisma.facility.update({
      where: { id: facilityId },
      data: updateData,
    });

    res.json({
      message: `Facility "${facility.name}" updated successfully`,
      facility,
    });
  } catch (error) {
    console.error('Update facility error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a facility
router.delete('/facilities/:facilityId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { facilityId } = req.params;

    const existing = await prisma.facility.findUnique({
      where: { id: facilityId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Facility not found' });
      return;
    }

    await prisma.facility.delete({
      where: { id: facilityId },
    });

    res.json({
      message: `Facility "${existing.name}" deleted successfully`,
    });
  } catch (error) {
    console.error('Delete facility error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
