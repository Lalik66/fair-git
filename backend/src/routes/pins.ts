import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Conservative whitelist. "car" is the MVP. Adding more labels here is a
// one-line change; the storage layer doesn't care what the string is.
const ALLOWED_LABELS = new Set(['car', 'picnic', 'stroller']);

function isValidCoord(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * GET /api/pins
 * Returns the current user's saved map pins. Always returns 200 with an array
 * (possibly empty) so the frontend has one happy path.
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const pins = await prisma.userPin.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        label: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json({ pins });
  } catch (error) {
    console.error('GET /pins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/pins
 * Body: { label: string, latitude: number, longitude: number }
 * Upserts on (userId, label) so "Save my car" always overwrites the previous
 * car location instead of stacking duplicates.
 */
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { label, latitude, longitude } = req.body ?? {};

    if (typeof label !== 'string' || !ALLOWED_LABELS.has(label)) {
      res.status(400).json({ error: 'Invalid pin label' });
      return;
    }
    if (!isValidCoord(latitude, longitude)) {
      res.status(400).json({ error: 'Invalid coordinates' });
      return;
    }

    const pin = await prisma.userPin.upsert({
      where: { userId_label: { userId, label } },
      create: { userId, label, latitude, longitude },
      update: { latitude, longitude },
      select: {
        id: true,
        label: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ pin });
  } catch (error) {
    console.error('POST /pins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/pins/:label
 * Idempotent: deleting a non-existent pin returns 204 the same as a real
 * delete, so the client can "clear my car" without race-condition checks.
 */
router.delete('/:label', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { label } = req.params;

    if (!ALLOWED_LABELS.has(label)) {
      res.status(400).json({ error: 'Invalid pin label' });
      return;
    }

    await prisma.userPin.deleteMany({
      where: { userId, label },
    });

    res.status(204).end();
  } catch (error) {
    console.error('DELETE /pins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
