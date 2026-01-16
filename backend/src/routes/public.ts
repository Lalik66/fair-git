import { Router, Request, Response } from 'express';
import { prisma } from '../index';

const router = Router();

// Get next upcoming fair for countdown
router.get('/next-fair', async (req: Request, res: Response): Promise<void> => {
  try {
    // Find the next upcoming fair (status = 'upcoming' or 'active', start date >= today)
    // Prioritize active fairs, then upcoming fairs ordered by start date
    const now = new Date();

    // First check for an active fair
    let fair = await prisma.fair.findFirst({
      where: {
        status: 'active',
        endDate: { gte: now },
      },
      select: {
        id: true,
        name: true,
        descriptionAz: true,
        descriptionEn: true,
        startDate: true,
        endDate: true,
        locationAddress: true,
        status: true,
      },
    });

    // If no active fair, get the next upcoming fair
    if (!fair) {
      fair = await prisma.fair.findFirst({
        where: {
          status: 'upcoming',
          startDate: { gte: now },
        },
        orderBy: { startDate: 'asc' },
        select: {
          id: true,
          name: true,
          descriptionAz: true,
          descriptionEn: true,
          startDate: true,
          endDate: true,
          locationAddress: true,
          status: true,
        },
      });
    }

    if (!fair) {
      res.json({ fair: null, message: 'No upcoming fairs scheduled' });
      return;
    }

    res.json({ fair });
  } catch (error) {
    console.error('Get next fair error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all active/upcoming fairs (public info only)
router.get('/fairs', async (req: Request, res: Response): Promise<void> => {
  try {
    const fairs = await prisma.fair.findMany({
      where: {
        status: { in: ['active', 'upcoming'] },
      },
      select: {
        id: true,
        name: true,
        descriptionAz: true,
        descriptionEn: true,
        startDate: true,
        endDate: true,
        locationAddress: true,
        status: true,
        bannerImageUrl: true,
      },
      orderBy: { startDate: 'asc' },
    });

    res.json({ fairs });
  } catch (error) {
    console.error('Get public fairs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get past events (archived/completed fairs) with vendor participation
router.get('/past-events', async (req: Request, res: Response): Promise<void> => {
  try {
    const pastFairs = await prisma.fair.findMany({
      where: {
        status: { in: ['completed', 'archived'] },
      },
      select: {
        id: true,
        name: true,
        descriptionAz: true,
        descriptionEn: true,
        startDate: true,
        endDate: true,
        locationAddress: true,
        bannerImageUrl: true,
        status: true,
        bookings: {
          select: {
            id: true,
            vendorProfile: {
              select: {
                id: true,
                companyName: true,
                productCategory: true,
                logoUrl: true,
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { endDate: 'desc' },
    });

    // Transform data to include vendor count and vendor details
    const events = pastFairs.map((fair) => ({
      id: fair.id,
      name: fair.name,
      descriptionAz: fair.descriptionAz,
      descriptionEn: fair.descriptionEn,
      startDate: fair.startDate,
      endDate: fair.endDate,
      locationAddress: fair.locationAddress,
      bannerImageUrl: fair.bannerImageUrl,
      status: fair.status,
      vendorCount: fair.bookings.length,
      vendors: fair.bookings.map((booking) => ({
        id: booking.vendorProfile.id,
        companyName: booking.vendorProfile.companyName,
        productCategory: booking.vendorProfile.productCategory,
        logoUrl: booking.vendorProfile.logoUrl,
        ownerName: booking.vendorProfile.user
          ? `${booking.vendorProfile.user.firstName || ''} ${booking.vendorProfile.user.lastName || ''}`.trim()
          : null,
      })),
    }));

    res.json({ events });
  } catch (error) {
    console.error('Get past events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get About Us content
router.get('/about-us', async (req: Request, res: Response): Promise<void> => {
  try {
    const content = await prisma.aboutUsContent.findMany({
      select: {
        sectionKey: true,
        contentAz: true,
        contentEn: true,
        updatedAt: true,
      },
    });

    // Convert array to object keyed by sectionKey
    const contentMap: Record<string, { contentAz: string | null; contentEn: string | null; updatedAt: Date }> = {};
    content.forEach((item) => {
      contentMap[item.sectionKey] = {
        contentAz: item.contentAz,
        contentEn: item.contentEn,
        updatedAt: item.updatedAt,
      };
    });

    res.json({ content: contentMap });
  } catch (error) {
    console.error('Get about us error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
