import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticateToken, requireVendor } from '../middleware/auth';

const router = Router();

// All vendor routes require authentication and vendor role
router.use(authenticateToken);
router.use(requireVendor);

// Get vendor's bookings
router.get('/bookings', async (req: Request, res: Response): Promise<void> => {
  try {
    // Get the vendor profile for the current user
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!vendorProfile) {
      res.status(404).json({ error: 'Vendor profile not found' });
      return;
    }

    // Get all bookings for this vendor
    const bookings = await prisma.booking.findMany({
      where: { vendorProfileId: vendorProfile.id },
      include: {
        fair: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
            locationAddress: true,
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
        application: {
          select: {
            id: true,
            submittedAt: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format bookings for frontend
    const formattedBookings = bookings.map(booking => ({
      id: booking.id,
      bookingStatus: booking.bookingStatus,
      startDate: booking.startDate,
      endDate: booking.endDate,
      createdAt: booking.createdAt,
      // Fair info
      fairId: booking.fair.id,
      fairName: booking.fair.name,
      fairStartDate: booking.fair.startDate,
      fairEndDate: booking.fair.endDate,
      fairStatus: booking.fair.status,
      fairLocation: booking.fair.locationAddress,
      // House info
      houseId: booking.vendorHouse.id,
      houseNumber: booking.vendorHouse.houseNumber,
      houseArea: booking.vendorHouse.areaSqm,
      housePrice: booking.vendorHouse.price,
      houseDescription: booking.vendorHouse.description,
      // Application info
      applicationId: booking.application.id,
      applicationSubmittedAt: booking.application.submittedAt,
    }));

    res.json({ bookings: formattedBookings });
  } catch (error) {
    console.error('Get vendor bookings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get vendor profile
router.get('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
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
    });

    if (!vendorProfile) {
      res.status(404).json({ error: 'Vendor profile not found' });
      return;
    }

    res.json({
      profile: {
        id: vendorProfile.id,
        companyName: vendorProfile.companyName,
        businessDescription: vendorProfile.businessDescription,
        productCategory: vendorProfile.productCategory,
        logoUrl: vendorProfile.logoUrl,
        contactEmail: vendorProfile.user.email,
        contactName: `${vendorProfile.user.firstName || ''} ${vendorProfile.user.lastName || ''}`.trim(),
        contactPhone: vendorProfile.user.phone,
        productImages: vendorProfile.productImages.map(img => ({
          id: img.id,
          imageUrl: img.imageUrl,
          orderIndex: img.orderIndex,
        })),
      },
    });
  } catch (error) {
    console.error('Get vendor profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get vendor's applications
router.get('/applications', async (req: Request, res: Response): Promise<void> => {
  try {
    const vendorProfile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!vendorProfile) {
      res.status(404).json({ error: 'Vendor profile not found' });
      return;
    }

    const applications = await prisma.application.findMany({
      where: { vendorProfileId: vendorProfile.id },
      include: {
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
      orderBy: { submittedAt: 'desc' },
    });

    // Format applications - note: adminNotes should NOT be included for vendors
    const formattedApplications = applications.map(app => ({
      id: app.id,
      submittedAt: app.submittedAt,
      status: app.status,
      rejectionReason: app.rejectionReason,
      reviewedAt: app.reviewedAt,
      // Fair info
      fairId: app.fair.id,
      fairName: app.fair.name,
      fairStartDate: app.fair.startDate,
      fairEndDate: app.fair.endDate,
      fairStatus: app.fair.status,
      // House info
      houseId: app.vendorHouse.id,
      houseNumber: app.vendorHouse.houseNumber,
      houseArea: app.vendorHouse.areaSqm,
      housePrice: app.vendorHouse.price,
    }));

    res.json({ applications: formattedApplications });
  } catch (error) {
    console.error('Get vendor applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
