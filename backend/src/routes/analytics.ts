import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { optionalAuth, authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

const VALID_EVENT_TYPES = ['popup_open', 'directions'] as const;
type EventType = typeof VALID_EVENT_TYPES[number];

// In-memory rate limit: one click per (IP, vendorHouseId, eventType) per minute.
// Prevents a visitor from inflating numbers by spamming a popup, while still
// counting genuine repeat opens after a cool-off.
const RATE_LIMIT_WINDOW_MS = 60_000;
const recentClicks = new Map<string, number>();

function shouldRecord(key: string): boolean {
  const now = Date.now();
  const last = recentClicks.get(key);
  if (last && now - last < RATE_LIMIT_WINDOW_MS) return false;
  recentClicks.set(key, now);
  // Lightweight cleanup so the map doesn't grow unbounded over a long uptime.
  if (recentClicks.size > 10_000) {
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    for (const [k, t] of recentClicks) {
      if (t < cutoff) recentClicks.delete(k);
    }
  }
  return true;
}

/**
 * POST /api/analytics/click
 * Body: { vendorHouseId: string, eventType?: "popup_open" | "directions" }
 * Public endpoint — anonymous visitors are counted (userId stays null).
 */
router.post('/click', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { vendorHouseId } = req.body ?? {};
    const eventType: EventType = VALID_EVENT_TYPES.includes(req.body?.eventType)
      ? req.body.eventType
      : 'popup_open';

    if (typeof vendorHouseId !== 'string' || vendorHouseId.length === 0) {
      res.status(400).json({ error: 'vendorHouseId is required' });
      return;
    }

    // Cheap existence check — also stops fabricated IDs from polluting the table.
    const house = await prisma.vendorHouse.findUnique({
      where: { id: vendorHouseId },
      select: { id: true },
    });
    if (!house) {
      res.status(404).json({ error: 'Vendor house not found' });
      return;
    }

    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || 'unknown';
    const rateLimitKey = `${ip}|${vendorHouseId}|${eventType}`;
    if (!shouldRecord(rateLimitKey)) {
      res.status(204).end();
      return;
    }

    await prisma.vendorClick.create({
      data: {
        vendorHouseId,
        userId: req.user?.id ?? null,
        eventType,
      },
    });

    res.status(204).end();
  } catch (error) {
    console.error('analytics click error:', error);
    // Never let analytics failure leak to the client UI.
    res.status(204).end();
  }
});

/**
 * GET /api/analytics/vendor-houses?days=7
 * Admin-only. Returns per-house click totals + a 24-bucket hour-of-day
 * histogram for the requested window.
 */
router.get(
  '/vendor-houses',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const daysRaw = parseInt(String(req.query.days ?? '7'), 10);
      const days = Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 365 ? daysRaw : 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const clicks = await prisma.vendorClick.findMany({
        where: { createdAt: { gte: since } },
        select: {
          vendorHouseId: true,
          eventType: true,
          createdAt: true,
          vendorHouse: {
            select: {
              houseNumber: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      });

      // Aggregate in-memory: SQLite groupBy with hour-extract is awkward and
      // this table is small enough that an in-process roll-up is fine.
      const perHouse = new Map<string, {
        vendorHouseId: string;
        houseNumber: string;
        popupOpens: number;
        directionsTaps: number;
        total: number;
      }>();
      const hourBuckets = new Array<number>(24).fill(0);

      for (const c of clicks) {
        const key = c.vendorHouseId;
        let row = perHouse.get(key);
        if (!row) {
          row = {
            vendorHouseId: key,
            houseNumber: c.vendorHouse.houseNumber,
            popupOpens: 0,
            directionsTaps: 0,
            total: 0,
          };
          perHouse.set(key, row);
        }
        if (c.eventType === 'directions') row.directionsTaps += 1;
        else row.popupOpens += 1;
        row.total += 1;
        hourBuckets[c.createdAt.getHours()] += 1;
      }

      const houses = Array.from(perHouse.values()).sort((a, b) => b.total - a.total);

      res.json({
        rangeDays: days,
        totalClicks: clicks.length,
        houses,
        hourBuckets,
      });
    } catch (error) {
      console.error('analytics summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
