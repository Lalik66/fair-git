import { Router, Request, Response } from 'express';
import fs from 'fs';
import sharp from 'sharp';
import { prisma } from '../index';
import { authenticateToken, requireAdmin, optionalAuth } from '../middleware/auth';
import { bannerUpload, getUploadedFileUrl, isCloudinaryConfigured } from '../middleware/upload';

const router = Router();

const VALID_PLACEMENTS = new Set([
  'home_bottom',
  'map_top',
  'popup_footer',
  'sidebar',
]);

interface BannerBody {
  fairId?: string | null;
  imageUrl?: string;
  linkUrl?: string | null;
  altText?: string | null;
  placement?: string;
  startsAt?: string;
  endsAt?: string;
  priority?: number;
  isActive?: boolean;
}

function parseDate(v: unknown): Date | null {
  if (typeof v !== 'string' || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * GET /api/banners?placement=…&fairId=…
 * Public. Returns active banners for the placement that are currently within
 * their start/end window. Sorted by priority desc, then random within ties
 * so two equally-priority banners share rotation roughly evenly.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const placement = typeof req.query.placement === 'string' ? req.query.placement : '';
    if (!placement || !VALID_PLACEMENTS.has(placement)) {
      res.json({ banners: [] });
      return;
    }
    const fairId = typeof req.query.fairId === 'string' ? req.query.fairId : null;
    const now = new Date();
    // Either a global banner (fairId null) or one bound to the requested fair.
    // Bare "fairId IN [null, x]" doesn't work in Prisma; OR-and-flatten.
    const banners = await prisma.sponsorBanner.findMany({
      where: {
        placement,
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
        OR: [{ fairId: null }, ...(fairId ? [{ fairId }] : [])],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ banners });
  } catch (error) {
    console.error('GET /banners error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/banners/admin
 * Admin-only. All banners, including expired and inactive.
 */
router.get(
  '/admin/list',
  authenticateToken,
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const banners = await prisma.sponsorBanner.findMany({
        orderBy: [{ isActive: 'desc' }, { startsAt: 'desc' }],
      });
      res.json({ banners });
    } catch (error) {
      console.error('GET /banners/admin/list error:', error);
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
      const body = (req.body ?? {}) as BannerBody;
      if (typeof body.imageUrl !== 'string' || !body.imageUrl) {
        res.status(400).json({ error: 'imageUrl is required (upload first)' });
        return;
      }
      if (typeof body.placement !== 'string' || !VALID_PLACEMENTS.has(body.placement)) {
        res.status(400).json({ error: 'Invalid placement' });
        return;
      }
      const startsAt = parseDate(body.startsAt);
      const endsAt = parseDate(body.endsAt);
      if (!startsAt || !endsAt) {
        res.status(400).json({ error: 'startsAt and endsAt are required' });
        return;
      }
      if (endsAt <= startsAt) {
        res.status(400).json({ error: 'endsAt must be after startsAt' });
        return;
      }

      const banner = await prisma.sponsorBanner.create({
        data: {
          fairId: body.fairId ?? null,
          imageUrl: body.imageUrl,
          linkUrl: body.linkUrl ?? null,
          altText: body.altText ?? null,
          placement: body.placement,
          startsAt,
          endsAt,
          priority: typeof body.priority === 'number' ? body.priority : 0,
          isActive: body.isActive !== false,
        },
      });
      res.status(201).json({ banner });
    } catch (error) {
      console.error('POST /banners error:', error);
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
      const body = (req.body ?? {}) as BannerBody;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, any> = {};
      if (body.fairId !== undefined) data.fairId = body.fairId;
      if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
      if (body.linkUrl !== undefined) data.linkUrl = body.linkUrl;
      if (body.altText !== undefined) data.altText = body.altText;
      if (body.placement !== undefined) {
        if (!VALID_PLACEMENTS.has(body.placement)) {
          res.status(400).json({ error: 'Invalid placement' }); return;
        }
        data.placement = body.placement;
      }
      if (body.startsAt !== undefined) {
        const d = parseDate(body.startsAt);
        if (!d) { res.status(400).json({ error: 'Invalid startsAt' }); return; }
        data.startsAt = d;
      }
      if (body.endsAt !== undefined) {
        const d = parseDate(body.endsAt);
        if (!d) { res.status(400).json({ error: 'Invalid endsAt' }); return; }
        data.endsAt = d;
      }
      if (typeof body.priority === 'number') data.priority = body.priority;
      if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

      if (Object.keys(data).length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }
      const banner = await prisma.sponsorBanner.update({ where: { id: req.params.id }, data });
      res.json({ banner });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any)?.code === 'P2025') {
        res.status(404).json({ error: 'Banner not found' });
        return;
      }
      console.error('PATCH /banners/:id error:', error);
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
      await prisma.sponsorBanner.deleteMany({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (error) {
      console.error('DELETE /banners/:id error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Upload a banner image and return the URL the admin should then submit
// alongside the rest of the banner metadata. Two-step (upload then create)
// mirrors the panorama flow and keeps create/update payloads JSON.
router.post(
  '/upload',
  authenticateToken,
  requireAdmin,
  bannerUpload.single('banner'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No image file provided' });
        return;
      }
      // Local disk uploads keep their native resolution, which often blows out
      // the carousel. Shrink in place so the served file matches what the UI
      // actually renders. Cloudinary applies its own width:limit transform on
      // upload, so we skip this branch when it's in play.
      if (!isCloudinaryConfigured() && req.file.path) {
        const src = req.file.path;
        const tmp = `${src}.resize.tmp`;
        await sharp(src)
          .rotate()
          .resize({ width: 1600, height: 600, fit: 'inside', withoutEnlargement: true })
          .toFile(tmp);
        await fs.promises.rename(tmp, src);
      }
      const imageUrl = getUploadedFileUrl(req.file, 'banners');
      res.json({ imageUrl });
    } catch (error) {
      console.error('POST /banners/upload error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/banners/:id/track
 * Public (optionalAuth). Logs an impression or click. Best-effort: never
 * blocks rendering on the client; firing this on mount is fire-and-forget.
 */
router.post(
  '/:id/track',
  optionalAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const eventType = req.body?.eventType === 'click' ? 'click' : 'impression';
      const banner = await prisma.sponsorBanner.findUnique({
        where: { id: req.params.id },
        select: { id: true },
      });
      if (!banner) {
        res.status(204).end();
        return;
      }
      await prisma.bannerImpression.create({
        data: {
          bannerId: req.params.id,
          eventType,
          userId: req.user?.id ?? null,
        },
      });
      res.status(204).end();
    } catch (error) {
      console.error('POST /banners/:id/track error:', error);
      // Tracking failures must not error the visitor; swallow with 204.
      res.status(204).end();
    }
  }
);

export default router;
