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
        mapCenterLat: true,
        mapCenterLng: true,
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
          mapCenterLat: true,
          mapCenterLng: true,
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
        mapCenterLat: true,
        mapCenterLng: true,
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

// Get vendor houses for map display with availability status and vendor info
router.get('/vendor-houses', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fairId } = req.query;

    // Get all enabled vendor houses
    const houses = await prisma.vendorHouse.findMany({
      where: {
        isEnabled: true,
      },
      select: {
        id: true,
        houseNumber: true,
        areaSqm: true,
        price: true,
        description: true,
        latitude: true,
        longitude: true,
        panorama360Url: true,
      },
      orderBy: { houseNumber: 'asc' },
    });

    // If fairId is provided, get booking information to determine availability and vendor info
    interface VendorInfo {
      companyName: string | null;
      productCategory: string | null;
      businessDescription: string | null;
      logoUrl: string | null;
      productImages: string[];
    }
    let bookingsMap: Map<string, VendorInfo | true> = new Map();

    if (fairId && typeof fairId === 'string') {
      // Get bookings with vendor profile information (for occupied houses)
      const bookings = await prisma.booking.findMany({
        where: {
          fairId: fairId,
          bookingStatus: { in: ['pending', 'approved'] },
        },
        select: {
          vendorHouseId: true,
          vendorProfile: {
            select: {
              companyName: true,
              productCategory: true,
              businessDescription: true,
              logoUrl: true,
              productImages: {
                select: {
                  imageUrl: true,
                },
                orderBy: { orderIndex: 'asc' },
              },
            },
          },
        },
      });

      // Also check for pending/approved applications (mark as occupied without vendor info)
      const applications = await prisma.application.findMany({
        where: {
          fairId: fairId,
          status: { in: ['pending', 'approved'] },
        },
        select: {
          vendorHouseId: true,
          vendorProfile: {
            select: {
              companyName: true,
              productCategory: true,
              businessDescription: true,
              logoUrl: true,
              productImages: {
                select: {
                  imageUrl: true,
                },
                orderBy: { orderIndex: 'asc' },
              },
            },
          },
        },
      });

      // Map bookings to vendor info
      bookings.forEach((b) => {
        const vendorInfo: VendorInfo = {
          companyName: b.vendorProfile.companyName,
          productCategory: b.vendorProfile.productCategory,
          businessDescription: b.vendorProfile.businessDescription,
          logoUrl: b.vendorProfile.logoUrl,
          productImages: b.vendorProfile.productImages.map((img) => img.imageUrl),
        };
        bookingsMap.set(b.vendorHouseId, vendorInfo);
      });

      // Map applications (only if not already in bookings)
      applications.forEach((a) => {
        if (!bookingsMap.has(a.vendorHouseId)) {
          const vendorInfo: VendorInfo = {
            companyName: a.vendorProfile.companyName,
            productCategory: a.vendorProfile.productCategory,
            businessDescription: a.vendorProfile.businessDescription,
            logoUrl: a.vendorProfile.logoUrl,
            productImages: a.vendorProfile.productImages.map((img) => img.imageUrl),
          };
          bookingsMap.set(a.vendorHouseId, vendorInfo);
        }
      });
    }

    // Transform houses to include availability and vendor info
    const housesWithAvailability = houses.map((house) => {
      const bookingInfo = bookingsMap.get(house.id);
      const isOccupied = !!bookingInfo;
      const vendorInfo = bookingInfo && typeof bookingInfo !== 'boolean' ? bookingInfo : null;

      return {
        ...house,
        isAvailable: fairId ? !isOccupied : null,
        // Include vendor info for occupied houses (public display)
        vendor: vendorInfo ? {
          companyName: vendorInfo.companyName,
          productCategory: vendorInfo.productCategory,
          businessDescription: vendorInfo.businessDescription,
          logoUrl: vendorInfo.logoUrl,
          productImages: vendorInfo.productImages,
          // Note: Contact info is NOT included for privacy
        } : null,
      };
    });

    res.json({ houses: housesWithAvailability });
  } catch (error) {
    console.error('Get vendor houses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get facilities for map display
router.get('/facilities', async (req: Request, res: Response): Promise<void> => {
  try {
    const facilities = await prisma.facility.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        latitude: true,
        longitude: true,
        photoUrl: true,
        icon: true,
        color: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({ facilities });
  } catch (error) {
    console.error('Get facilities error:', error);
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
