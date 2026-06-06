import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Locked preset palette. Keeps the visitor map looking consistent across
// fairs and side-steps a "what color is the food court?" debate. Adding a
// new type later means one line here, one i18n key, and a CSS update.
const ZONE_PRESETS = {
  food:  { color: '#F59E0B', defaultOpacity: 0.30 },
  kids:  { color: '#EC4899', defaultOpacity: 0.30 },
  vip:   { color: '#8B5CF6', defaultOpacity: 0.30 },
  craft: { color: '#14B8A6', defaultOpacity: 0.30 },
  stage: { color: '#EF4444', defaultOpacity: 0.30 },
  info:  { color: '#10B981', defaultOpacity: 0.30 },
  other: { color: '#6B7280', defaultOpacity: 0.30 },
} as const;
type ZoneType = keyof typeof ZONE_PRESETS;

// Quickly validate a stringified GeoJSON Polygon. Defensive enough to reject
// nonsense (string, object with wrong type, ring with < 4 points, malformed
// coordinates) without pulling a full geojson schema dep.
function parseAndValidatePolygon(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as { type?: unknown; coordinates?: unknown };
  if (obj.type !== 'Polygon') return null;
  if (!Array.isArray(obj.coordinates) || obj.coordinates.length === 0) return null;
  for (const ring of obj.coordinates) {
    if (!Array.isArray(ring) || ring.length < 4) return null;
    for (const pt of ring) {
      if (!Array.isArray(pt) || pt.length < 2) return null;
      const [lng, lat] = pt;
      if (typeof lng !== 'number' || typeof lat !== 'number') return null;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    }
  }
  // Re-serialise so we control the storage format (and strip whitespace).
  return JSON.stringify(obj);
}

interface ZoneBody {
  fairId?: string;
  name?: string;
  type?: string;
  opacity?: number;
  descriptionAz?: string | null;
  descriptionEn?: string | null;
  geometry?: string;
  isVisible?: boolean;
}

function isValidType(t: unknown): t is ZoneType {
  return typeof t === 'string' && t in ZONE_PRESETS;
}

/**
 * GET /api/zones?fairId=<id>
 * Public. Returns only visible zones for the given fair so anonymous visitors
 * can render the map. Omitting fairId returns an empty list — the visitor map
 * always has a selected fair, and we don't want to leak draft zones from
 * other fairs.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const fairId = typeof req.query.fairId === 'string' ? req.query.fairId : '';
    if (!fairId) {
      res.json({ zones: [] });
      return;
    }
    const zones = await prisma.mapZone.findMany({
      where: { fairId, isVisible: true },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        color: true,
        opacity: true,
        descriptionAz: true,
        descriptionEn: true,
        geometry: true,
      },
    });
    res.json({ zones });
  } catch (error) {
    console.error('GET /zones error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/zones/admin?fairId=<id>
 * Admin-only. Includes hidden zones so the admin can manage drafts.
 */
router.get(
  '/admin',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const fairId = typeof req.query.fairId === 'string' ? req.query.fairId : '';
      if (!fairId) {
        res.status(400).json({ error: 'fairId is required' });
        return;
      }
      const zones = await prisma.mapZone.findMany({
        where: { fairId },
        orderBy: { createdAt: 'asc' },
      });
      res.json({ zones });
    } catch (error) {
      console.error('GET /zones/admin error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/zones
 * Admin-only. Creates a new zone for a fair.
 */
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.body ?? {}) as ZoneBody;

      if (typeof body.fairId !== 'string' || body.fairId.length === 0) {
        res.status(400).json({ error: 'fairId is required' });
        return;
      }
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        res.status(400).json({ error: 'name is required' });
        return;
      }
      if (!isValidType(body.type)) {
        res.status(400).json({ error: 'Invalid zone type' });
        return;
      }
      const geometry = parseAndValidatePolygon(body.geometry);
      if (!geometry) {
        res.status(400).json({ error: 'Invalid GeoJSON Polygon geometry' });
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

      const preset = ZONE_PRESETS[body.type];
      const opacity =
        typeof body.opacity === 'number' && body.opacity >= 0 && body.opacity <= 1
          ? body.opacity
          : preset.defaultOpacity;

      const zone = await prisma.mapZone.create({
        data: {
          fairId: body.fairId,
          name: body.name.trim(),
          type: body.type,
          color: preset.color,
          opacity,
          descriptionAz: body.descriptionAz ?? null,
          descriptionEn: body.descriptionEn ?? null,
          geometry,
          isVisible: body.isVisible !== false, // default true
        },
      });

      res.status(201).json({ zone });
    } catch (error) {
      console.error('POST /zones error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PATCH /api/zones/:id
 * Admin-only. Partial update; only provided fields are touched.
 */
router.patch(
  '/:id',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const body = (req.body ?? {}) as ZoneBody;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, any> = {};
      if (typeof body.name === 'string' && body.name.trim().length > 0) {
        data.name = body.name.trim();
      }
      if (body.type !== undefined) {
        if (!isValidType(body.type)) {
          res.status(400).json({ error: 'Invalid zone type' });
          return;
        }
        data.type = body.type;
        data.color = ZONE_PRESETS[body.type].color;
      }
      if (body.geometry !== undefined) {
        const geom = parseAndValidatePolygon(body.geometry);
        if (!geom) {
          res.status(400).json({ error: 'Invalid GeoJSON Polygon geometry' });
          return;
        }
        data.geometry = geom;
      }
      if (typeof body.opacity === 'number' && body.opacity >= 0 && body.opacity <= 1) {
        data.opacity = body.opacity;
      }
      if (body.descriptionAz !== undefined) data.descriptionAz = body.descriptionAz;
      if (body.descriptionEn !== undefined) data.descriptionEn = body.descriptionEn;
      if (typeof body.isVisible === 'boolean') data.isVisible = body.isVisible;

      if (Object.keys(data).length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      const zone = await prisma.mapZone.update({
        where: { id },
        data,
      });

      res.json({ zone });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any)?.code === 'P2025') {
        res.status(404).json({ error: 'Zone not found' });
        return;
      }
      console.error('PATCH /zones/:id error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * DELETE /api/zones/:id
 * Admin-only. Idempotent — deleting a missing zone returns 204.
 */
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await prisma.mapZone.deleteMany({ where: { id } });
      res.status(204).end();
    } catch (error) {
      console.error('DELETE /zones/:id error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
