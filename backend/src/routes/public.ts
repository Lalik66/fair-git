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

export default router;
