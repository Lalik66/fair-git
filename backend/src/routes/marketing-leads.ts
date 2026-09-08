import { Router, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { prisma } from '../index';

const router = Router();

const MAX_PHONE_LENGTH = 32;
const MIN_PHONE_DIGITS = 7;
const ALLOWED_LANGUAGES = ['az', 'en'];

// Unauthenticated public endpoint (marketing popup), so keep the abuse surface
// small: a handful of submissions per IP per hour is plenty for a genuine
// opt-in and starves spam scripts. Sits on top of the global /api limiter.
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signups. Please try again later.' },
});

/**
 * POST /api/public/marketing-leads
 * Body: { phone, consentAccepted, preferredLanguage? }
 *
 * Lead capture from the Sneaker Con–style marketing popup. Anonymous by
 * design — just a phone number the visitor opted in with, the consent flag,
 * and the language they saw the form in. Store-only: no SMS integration, no
 * admin inbox (see docs/subscription.md).
 */
router.post('/', submitLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, consentAccepted, preferredLanguage, source } = req.body ?? {};

    if (typeof phone !== 'string' || phone.trim().length === 0 || phone.length > MAX_PHONE_LENGTH) {
      res.status(400).json({ error: 'phone must be a non-empty string' });
      return;
    }
    // Accept the common phone characters (digits, +, spaces, dashes, parens)
    // and require enough digits to be plausible. Deliberately lenient — the
    // country-code selector already shapes most of the input.
    const trimmedPhone = phone.trim();
    const digitCount = (trimmedPhone.match(/\d/g) ?? []).length;
    if (!/^[+\d][\d\s()-]*$/.test(trimmedPhone) || digitCount < MIN_PHONE_DIGITS) {
      res.status(400).json({ error: 'phone must be a valid phone number' });
      return;
    }

    if (consentAccepted !== true) {
      res.status(400).json({ error: 'consent is required' });
      return;
    }

    let language: string | null = null;
    if (preferredLanguage !== undefined && preferredLanguage !== null) {
      if (typeof preferredLanguage !== 'string' || !ALLOWED_LANGUAGES.includes(preferredLanguage)) {
        res.status(400).json({ error: 'preferredLanguage must be one of: az, en' });
        return;
      }
      language = preferredLanguage;
    }

    const leadSource =
      typeof source === 'string' && source.trim().length > 0 && source.length <= 50
        ? source.trim()
        : 'popup';

    await prisma.marketingLead.create({
      data: {
        phone: trimmedPhone,
        consentAccepted: true,
        source: leadSource,
        preferredLanguage: language,
      },
    });

    res.status(201).json({ message: 'Signup received' });
  } catch (error) {
    console.error('POST /public/marketing-leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
