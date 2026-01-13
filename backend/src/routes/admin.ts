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

export default router;
