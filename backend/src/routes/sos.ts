import { Router, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { prisma } from '../index';
import { optionalAuth } from '../middleware/auth';
import { sosAudioUpload, getUploadedFileUrl } from '../middleware/upload';
import { sendSosAlertAdminEmail } from '../utils/notifications';
import { emitSosNew, emitSosUpdated } from '../services/sosService';

const router = Router();

// A minute-scale cap on raising alerts: generous enough for a genuine
// repeat call, tight enough to blunt prank scripts. Status polling and the
// audio attach are left to the global /api limiter.
const raiseLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many SOS requests. If this is a real emergency, call the venue security directly.' },
});

// How long after creation the sender may still attach a voice message.
const AUDIO_ATTACH_WINDOW_MS = 15 * 60 * 1000;

// Multer/Cloudinary reject bad uploads by throwing; surface that as a 400
// (client sent an unusable file) instead of the generic 500.
function attachAudioUpload(req: Request, res: Response, next: () => void): void {
  sosAudioUpload.single('audio')(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Audio upload failed';
      res.status(400).json({ error: message });
      return;
    }
    next();
  });
}

const userSelect = {
  select: { firstName: true, lastName: true, email: true },
} as const;

function parseCoord(value: unknown, min: number, max: number): number | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    return undefined; // invalid
  }
  return value;
}

/**
 * POST /api/sos
 * Body: { latitude?, longitude?, accuracy? }
 *
 * Raise an emergency alert. Works logged-out (an emergency must not require
 * an account) and without coordinates (a denied geolocation prompt must not
 * block the alert). The incident id doubles as the sender's capability token
 * for the follow-up audio upload and status polling.
 */
router.post('/', raiseLimiter, optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, accuracy } = req.body ?? {};

    const lat = parseCoord(latitude, -90, 90);
    const lng = parseCoord(longitude, -180, 180);
    const acc = parseCoord(accuracy, 0, 100000);
    if (lat === undefined || lng === undefined || acc === undefined) {
      res.status(400).json({ error: 'latitude/longitude/accuracy must be valid numbers when provided' });
      return;
    }
    // Half a coordinate is a client bug; treat as no location.
    const hasLocation = lat !== null && lng !== null;

    const incident = await prisma.sosIncident.create({
      data: {
        userId: req.user?.id ?? null,
        latitude: hasLocation ? lat : null,
        longitude: hasLocation ? lng : null,
        accuracy: hasLocation ? acc : null,
      },
      include: { user: userSelect },
    });

    emitSosNew(incident);

    // Backup channel for admins not watching the dashboard.
    const admins = await prisma.user.findMany({
      where: { role: 'admin', isActive: true },
      select: { email: true },
    });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const senderName = incident.user
      ? `${incident.user.firstName || ''} ${incident.user.lastName || ''}`.trim() || incident.user.email
      : null;
    admins.forEach((a) =>
      sendSosAlertAdminEmail(a.email, {
        incidentId: incident.id,
        senderName,
        latitude: incident.latitude,
        longitude: incident.longitude,
        dashboardUrl: `${frontendUrl}/admin/sos`,
      })
    );

    res.status(201).json({
      incident: { id: incident.id, status: incident.status, createdAt: incident.createdAt },
    });
  } catch (error) {
    console.error('POST /sos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/sos/:id/audio  (multipart field: "audio")
 *
 * Attach the optional voice message to a fresh incident. For logged-in
 * senders the incident must be theirs; for anonymous ones possession of the
 * uuid is the proof of ownership. Only while the incident is ACTIVE, has no
 * audio yet, and is younger than the attach window.
 */
router.post(
  '/:id/audio',
  optionalAuth,
  attachAudioUpload,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!req.file) {
        res.status(400).json({ error: 'audio file is required' });
        return;
      }

      const incident = await prisma.sosIncident.findUnique({
        where: { id },
        select: { id: true, userId: true, status: true, audioUrl: true, createdAt: true },
      });
      if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
      }
      if (incident.userId && incident.userId !== req.user?.id) {
        res.status(403).json({ error: 'Not your incident' });
        return;
      }
      if (
        incident.status !== 'ACTIVE' ||
        incident.audioUrl ||
        Date.now() - incident.createdAt.getTime() > AUDIO_ATTACH_WINDOW_MS
      ) {
        res.status(400).json({ error: 'Voice message can no longer be attached to this incident' });
        return;
      }

      const updated = await prisma.sosIncident.update({
        where: { id },
        data: { audioUrl: getUploadedFileUrl(req.file, 'sos') },
        include: { user: userSelect },
      });

      emitSosUpdated(updated);

      res.json({ incident: { id: updated.id, audioUrl: updated.audioUrl } });
    } catch (error) {
      console.error('POST /sos/:id/audio error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/sos/:id
 * Status poll for the sender's device ("security has resolved your alert").
 * Returns only status fields — no location or audio, since any holder of the
 * uuid can call this.
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const incident = await prisma.sosIncident.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true, createdAt: true, resolvedAt: true },
    });
    if (!incident) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }
    res.json({ incident });
  } catch (error) {
    console.error('GET /sos/:id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
