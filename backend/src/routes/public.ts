import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { getColorCategory, getEmoji } from '../utils/mapHelpers';

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

// Get site contact info (phone, email, social links)
router.get('/contact-info', async (req: Request, res: Response): Promise<void> => {
  try {
    const info = await prisma.siteContactInfo.findFirst({
      select: {
        phone: true,
        email: true,
        facebookUrl: true,
        instagramUrl: true,
      },
    });

    res.json({
      phone: info?.phone ?? null,
      email: info?.email ?? null,
      facebookUrl: info?.facebookUrl ?? null,
      instagramUrl: info?.instagramUrl ?? null,
    });
  } catch (error) {
    console.error('Get contact info error:', error);
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

// Get unified map objects (vendor houses + facilities) with search and filtering
router.get('/map-objects', async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, types, fairId } = req.query;

    const searchStr = typeof search === 'string' ? search.trim() : '';
    const typesArr = typeof types === 'string' && types.trim()
      ? types.split(',').map((t) => t.trim().toLowerCase())
      : [];

    // Determine the target fair: explicit fairId > active fair > earliest upcoming fair
    let targetFairId: string | null = null;

    if (fairId && typeof fairId === 'string') {
      targetFairId = fairId;
    } else {
      const activeFair = await prisma.fair.findFirst({
        where: { status: 'active' },
        select: { id: true },
      });
      if (activeFair) {
        targetFairId = activeFair.id;
      } else {
        const upcomingFair = await prisma.fair.findFirst({
          where: { status: 'upcoming' },
          orderBy: { startDate: 'asc' },
          select: { id: true },
        });
        if (upcomingFair) {
          targetFairId = upcomingFair.id;
        }
      }
    }

    // Determine whether to include vendor houses and which facility types to query
    const includeVendorHouses = typesArr.length === 0 || typesArr.includes('vendor_house');
    const facilityTypes = typesArr.length === 0
      ? [] // empty means all facility types
      : typesArr.filter((t) => t !== 'vendor_house');
    const includeFacilities = typesArr.length === 0 || facilityTypes.length > 0;

    // Build unified response array
    interface MapObject {
      id: string;
      type: string;
      label: string;
      description: string | null;
      latitude: number;
      longitude: number;
      color: string;
      emoji: string;
      isAvailable?: boolean | null;
      houseNumber?: string;
      areaSqm?: number | null;
      price?: number | null;
      panorama360Url?: string | null;
      photoUrl?: string | null;
    }

    const results: MapObject[] = [];

    // Query vendor houses if needed
    if (includeVendorHouses) {
      const houseWhere: Record<string, unknown> = { isEnabled: true };

      if (searchStr) {
        houseWhere.OR = [
          { houseNumber: { contains: searchStr } },
          { description: { contains: searchStr } },
        ];
      }

      const houses = await prisma.vendorHouse.findMany({
        where: houseWhere,
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

      // Find occupied house IDs from bookings for the target fair
      let occupiedHouseIds: Set<string> = new Set();

      if (targetFairId) {
        const activeBookings = await prisma.booking.findMany({
          where: {
            fairId: targetFairId,
            bookingStatus: { in: ['pending', 'approved'] },
            isArchived: false,
          },
          select: { vendorHouseId: true },
        });
        occupiedHouseIds = new Set(activeBookings.map((b) => b.vendorHouseId));
      }

      for (const house of houses) {
        results.push({
          id: house.id,
          type: 'vendor_house',
          label: `House ${house.houseNumber}`,
          description: house.description,
          latitude: house.latitude,
          longitude: house.longitude,
          color: getColorCategory('vendor_house'),
          emoji: getEmoji('vendor_house'),
          isAvailable: targetFairId ? !occupiedHouseIds.has(house.id) : null,
          houseNumber: house.houseNumber,
          areaSqm: house.areaSqm,
          price: house.price,
          panorama360Url: house.panorama360Url,
        });
      }
    }

    // Query facilities if needed
    if (includeFacilities) {
      const facilityWhere: Record<string, unknown> = {};

      // Filter by specific facility types if provided
      if (facilityTypes.length > 0) {
        facilityWhere.type = { in: facilityTypes };
      }

      if (searchStr) {
        facilityWhere.OR = [
          { name: { contains: searchStr } },
          { description: { contains: searchStr } },
        ];
      }

      const facilities = await prisma.facility.findMany({
        where: facilityWhere,
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          latitude: true,
          longitude: true,
          photoUrl: true,
        },
        orderBy: { name: 'asc' },
      });

      for (const facility of facilities) {
        results.push({
          id: facility.id,
          type: facility.type,
          label: facility.name,
          description: facility.description,
          latitude: facility.latitude,
          longitude: facility.longitude,
          color: getColorCategory(facility.type),
          emoji: getEmoji(facility.type),
          photoUrl: facility.photoUrl,
        });
      }
    }

    // Set cache headers: public data that changes infrequently
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

    res.json({
      fairId: targetFairId,
      count: results.length,
      objects: results,
    });
  } catch (error) {
    console.error('Get map objects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
