import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

const VALID_CATEGORIES = new Set([
  'performance',
  'workshop',
  'food',
  'show',
  'music',
  'other',
]);
const VALID_LOCATION_TYPES = new Set(['house', 'facility', 'zone']);

interface EventBody {
  fairId?: string;
  nameAz?: string;
  nameEn?: string;
  descriptionAz?: string | null;
  descriptionEn?: string | null;
  category?: string;
  emoji?: string | null;
  startTime?: string;
  endTime?: string;
  locationType?: string;
  locationId?: string;
  isCancelled?: boolean;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Verifies the referenced location actually exists. The polymorphic FK is
// enforced in code (Prisma can't model it) so a bad locationId silently
// breaking the program list is the failure mode we're guarding against here.
async function locationExists(type: string, id: string): Promise<boolean> {
  if (type === 'house') {
    const row = await prisma.vendorHouse.findUnique({ where: { id }, select: { id: true } });
    return !!row;
  }
  if (type === 'facility') {
    const row = await prisma.facility.findUnique({ where: { id }, select: { id: true } });
    return !!row;
  }
  if (type === 'zone') {
    const row = await prisma.mapZone.findUnique({ where: { id }, select: { id: true } });
    return !!row;
  }
  return false;
}

// Look up coordinates for a location reference. Returns lat/lng + name for
// quick rendering on the schedule and "What's On Now" rows; for zones we
// derive a representative point from the polygon centroid-ish first ring vertex.
async function resolveLocation(
  type: string,
  id: string
): Promise<{ latitude: number; longitude: number; label: string } | null> {
  if (type === 'house') {
    const row = await prisma.vendorHouse.findUnique({
      where: { id },
      select: { houseNumber: true, latitude: true, longitude: true },
    });
    if (!row) return null;
    return { latitude: row.latitude, longitude: row.longitude, label: `#${row.houseNumber}` };
  }
  if (type === 'facility') {
    const row = await prisma.facility.findUnique({
      where: { id },
      select: { name: true, latitude: true, longitude: true },
    });
    if (!row) return null;
    return { latitude: row.latitude, longitude: row.longitude, label: row.name };
  }
  if (type === 'zone') {
    const row = await prisma.mapZone.findUnique({
      where: { id },
      select: { name: true, geometry: true },
    });
    if (!row) return null;
    // Cheap centroid: average the first ring's vertices. Good enough for
    // "fly to this zone" — we don't need a true Polygon centroid here.
    try {
      const geo = JSON.parse(row.geometry) as { coordinates: number[][][] };
      const ring = geo.coordinates?.[0] ?? [];
      if (ring.length === 0) return null;
      let sx = 0;
      let sy = 0;
      for (const [lng, lat] of ring) {
        sx += lng;
        sy += lat;
      }
      return {
        longitude: sx / ring.length,
        latitude: sy / ring.length,
        label: row.name,
      };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * GET /api/events?fairId=<id>&nowOnly=true|false&locationId=<id>&locationType=<t>
 * Public. Returns non-cancelled events. nowOnly clamps to events currently
 * in progress (start <= now < end). locationId/locationType narrow to a
 * single map object — used by popup "today's program" lists.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const fairId = typeof req.query.fairId === 'string' ? req.query.fairId : '';
    if (!fairId) {
      res.json({ events: [] });
      return;
    }
    const nowOnly = req.query.nowOnly === 'true' || req.query.nowOnly === '1';
    const locationId =
      typeof req.query.locationId === 'string' ? req.query.locationId : undefined;
    const locationType =
      typeof req.query.locationType === 'string' ? req.query.locationType : undefined;

    const now = new Date();
    const where: Record<string, unknown> = { fairId, isCancelled: false };
    if (nowOnly) {
      where.startTime = { lte: now };
      where.endTime = { gt: now };
    }
    if (locationId) where.locationId = locationId;
    if (locationType) where.locationType = locationType;

    const events = await prisma.fairEvent.findMany({
      where,
      orderBy: nowOnly ? { endTime: 'asc' } : { startTime: 'asc' },
    });

    // Hydrate with the location label and coordinates so callers don't need
    // a follow-up round-trip per row (would N+1 the schedule page).
    const enriched = await Promise.all(
      events.map(async (e) => {
        const loc = await resolveLocation(e.locationType, e.locationId);
        return {
          ...e,
          locationLabel: loc?.label ?? null,
          locationLatitude: loc?.latitude ?? null,
          locationLongitude: loc?.longitude ?? null,
        };
      })
    );

    res.json({ events: enriched });
  } catch (error) {
    console.error('GET /events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/events/:id
 * Public. Single event with hydrated location. Used by /map?eventId=… deep
 * links so the map can fly to and open the right popup without re-listing.
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await prisma.fairEvent.findUnique({ where: { id: req.params.id } });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    const loc = await resolveLocation(event.locationType, event.locationId);
    res.json({
      event: {
        ...event,
        locationLabel: loc?.label ?? null,
        locationLatitude: loc?.latitude ?? null,
        locationLongitude: loc?.longitude ?? null,
      },
    });
  } catch (error) {
    console.error('GET /events/:id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/events/admin?fairId=<id>
 * Admin-only. Returns ALL events for the fair (including cancelled) so the
 * admin can manage them. No location hydration — the admin list shows the
 * raw locationType/locationId, and the UI looks names up from its own caches.
 */
router.get(
  '/admin/list',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const fairId = typeof req.query.fairId === 'string' ? req.query.fairId : '';
      if (!fairId) {
        res.status(400).json({ error: 'fairId is required' });
        return;
      }
      const events = await prisma.fairEvent.findMany({
        where: { fairId },
        orderBy: { startTime: 'asc' },
      });
      res.json({ events });
    } catch (error) {
      console.error('GET /events/admin/list error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.post(
  '/',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.body ?? {}) as EventBody;

      if (typeof body.fairId !== 'string' || body.fairId.length === 0) {
        res.status(400).json({ error: 'fairId is required' });
        return;
      }
      const nameAz = typeof body.nameAz === 'string' ? body.nameAz.trim() : '';
      const nameEn = typeof body.nameEn === 'string' ? body.nameEn.trim() : '';
      if (!nameAz || !nameEn) {
        res.status(400).json({ error: 'nameAz and nameEn are required' });
        return;
      }
      if (typeof body.category !== 'string' || !VALID_CATEGORIES.has(body.category)) {
        res.status(400).json({ error: 'Invalid category' });
        return;
      }
      if (typeof body.locationType !== 'string' || !VALID_LOCATION_TYPES.has(body.locationType)) {
        res.status(400).json({ error: 'Invalid locationType' });
        return;
      }
      if (typeof body.locationId !== 'string' || body.locationId.length === 0) {
        res.status(400).json({ error: 'locationId is required' });
        return;
      }
      const startTime = parseDate(body.startTime);
      const endTime = parseDate(body.endTime);
      if (!startTime || !endTime) {
        res.status(400).json({ error: 'startTime and endTime are required' });
        return;
      }
      if (endTime <= startTime) {
        res.status(400).json({ error: 'endTime must be after startTime' });
        return;
      }

      const fair = await prisma.fair.findUnique({
        where: { id: body.fairId },
        select: { id: true },
      });
      if (!fair) {
        res.status(404).json({ error: 'Fair not found' });
        return;
      }
      if (!(await locationExists(body.locationType, body.locationId))) {
        res.status(404).json({ error: 'Location not found' });
        return;
      }

      const event = await prisma.fairEvent.create({
        data: {
          fairId: body.fairId,
          nameAz,
          nameEn,
          descriptionAz: body.descriptionAz ?? null,
          descriptionEn: body.descriptionEn ?? null,
          category: body.category,
          emoji: typeof body.emoji === 'string' ? body.emoji : null,
          startTime,
          endTime,
          locationType: body.locationType,
          locationId: body.locationId,
          isCancelled: body.isCancelled === true,
        },
      });
      res.status(201).json({ event });
    } catch (error) {
      console.error('POST /events error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.patch(
  '/:id',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.body ?? {}) as EventBody;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, any> = {};

      if (body.nameAz !== undefined) {
        const v = body.nameAz.trim();
        if (!v) { res.status(400).json({ error: 'nameAz cannot be empty' }); return; }
        data.nameAz = v;
      }
      if (body.nameEn !== undefined) {
        const v = body.nameEn.trim();
        if (!v) { res.status(400).json({ error: 'nameEn cannot be empty' }); return; }
        data.nameEn = v;
      }
      if (body.descriptionAz !== undefined) data.descriptionAz = body.descriptionAz;
      if (body.descriptionEn !== undefined) data.descriptionEn = body.descriptionEn;
      if (body.category !== undefined) {
        if (!VALID_CATEGORIES.has(body.category)) {
          res.status(400).json({ error: 'Invalid category' }); return;
        }
        data.category = body.category;
      }
      if (body.emoji !== undefined) data.emoji = body.emoji;
      if (body.startTime !== undefined) {
        const d = parseDate(body.startTime);
        if (!d) { res.status(400).json({ error: 'Invalid startTime' }); return; }
        data.startTime = d;
      }
      if (body.endTime !== undefined) {
        const d = parseDate(body.endTime);
        if (!d) { res.status(400).json({ error: 'Invalid endTime' }); return; }
        data.endTime = d;
      }
      if (body.locationType !== undefined || body.locationId !== undefined) {
        // Both must move together — locationId only makes sense with its type.
        const newType = body.locationType ?? (await prisma.fairEvent.findUnique({
          where: { id: req.params.id }, select: { locationType: true },
        }))?.locationType;
        const newId = body.locationId ?? (await prisma.fairEvent.findUnique({
          where: { id: req.params.id }, select: { locationId: true },
        }))?.locationId;
        if (!newType || !VALID_LOCATION_TYPES.has(newType)) {
          res.status(400).json({ error: 'Invalid locationType' }); return;
        }
        if (!newId) {
          res.status(400).json({ error: 'locationId is required' }); return;
        }
        if (!(await locationExists(newType, newId))) {
          res.status(404).json({ error: 'Location not found' }); return;
        }
        data.locationType = newType;
        data.locationId = newId;
      }
      if (typeof body.isCancelled === 'boolean') data.isCancelled = body.isCancelled;

      // Cross-field check after merging.
      if (data.startTime || data.endTime) {
        const current = await prisma.fairEvent.findUnique({
          where: { id: req.params.id },
          select: { startTime: true, endTime: true },
        });
        const s = data.startTime ?? current?.startTime;
        const e = data.endTime ?? current?.endTime;
        if (s && e && e <= s) {
          res.status(400).json({ error: 'endTime must be after startTime' }); return;
        }
      }

      if (Object.keys(data).length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      const event = await prisma.fairEvent.update({ where: { id: req.params.id }, data });
      res.json({ event });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any)?.code === 'P2025') {
        res.status(404).json({ error: 'Event not found' });
        return;
      }
      console.error('PATCH /events/:id error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      await prisma.fairEvent.deleteMany({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (error) {
      console.error('DELETE /events/:id error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
