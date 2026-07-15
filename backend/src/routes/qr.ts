import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Allow-list of frontend hosts the QR can point at. Prevents a compromised
// admin from generating QRs that redirect visitors to attacker-controlled
// pages. Defaults to localhost in dev; set QR_PUBLIC_BASE in production.
const PUBLIC_BASE = process.env.QR_PUBLIC_BASE || process.env.FRONTEND_URL || 'http://localhost:3000';

const VALID_TARGETS = new Set(['map', 'fair', 'house', 'event', 'schedule', 'whatsOn']);

interface QrBody {
  target: string;
  id?: string;
  source?: string;
  format?: 'png' | 'svg';
  size?: number;
}

function buildUrl(target: string, id: string | undefined, source: string | undefined): string | null {
  const url = new URL(PUBLIC_BASE);
  switch (target) {
    case 'map':
      url.pathname = '/map';
      break;
    case 'fair':
      if (!id) return null;
      url.pathname = '/map';
      url.searchParams.set('fairId', id);
      break;
    case 'house':
      if (!id) return null;
      url.pathname = '/map';
      url.searchParams.set('houseId', id);
      break;
    case 'event':
      if (!id) return null;
      url.pathname = '/map';
      url.searchParams.set('eventId', id);
      break;
    case 'schedule':
      url.pathname = '/schedule';
      if (id) url.searchParams.set('fairId', id);
      break;
    case 'whatsOn':
      url.pathname = '/map';
      url.searchParams.set('whatsOn', '1');
      if (id) url.searchParams.set('fairId', id);
      break;
    default:
      return null;
  }
  if (source) url.searchParams.set('src', source);
  return url.toString();
}

/**
 * POST /api/qr
 * Admin-only. Returns a QR encoding a deep-link into the frontend. Body:
 *   { target, id?, source?, format?, size? }
 * `format` defaults to 'png' (binary); 'svg' returns a string and is best
 * for high-resolution print.
 */
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const body = (req.body ?? {}) as QrBody;
      if (typeof body.target !== 'string' || !VALID_TARGETS.has(body.target)) {
        res.status(400).json({ error: 'Invalid target' });
        return;
      }
      const url = buildUrl(body.target, body.id, body.source);
      if (!url) {
        res.status(400).json({ error: 'id required for this target' });
        return;
      }
      const size = typeof body.size === 'number' && body.size >= 128 && body.size <= 2048
        ? body.size
        : 512;
      const format = body.format === 'svg' ? 'svg' : 'png';

      // Echo the URL back so the admin UI can show what was encoded — useful
      // for verifying the QR before printing 5,000 copies of a typo.
      if (format === 'svg') {
        const svg = await QRCode.toString(url, { type: 'svg', width: size, margin: 1 });
        res.json({ url, svg });
        return;
      }
      const dataUrl = await QRCode.toDataURL(url, { width: size, margin: 1 });
      res.json({ url, dataUrl });
    } catch (error) {
      console.error('POST /qr error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
