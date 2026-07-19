import { Router, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { prisma } from '../index';

const router = Router();

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 200;
const MIN_MESSAGE_LENGTH = 5;
const MAX_MESSAGE_LENGTH = 1000;

// Unauthenticated public endpoint, so keep the abuse surface small: a few
// submissions per IP per hour is plenty for genuine feedback and starves
// spam scripts. Sits on top of the global /api limiter.
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many feedback submissions. Please try again later.' },
});

/**
 * POST /api/feedback
 * Body: { rating (1-5), message, name?, email? }
 *
 * Fair feedback from the About page form. Anonymous by design — name and
 * email are optional and only used so the organizers know who to thank or
 * follow up with. Lands in the admin Feedback Inbox; never shown publicly.
 */
router.post('/', submitLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rating, message, name, email } = req.body ?? {};

    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
      return;
    }
    if (typeof message !== 'string' || message.trim().length < MIN_MESSAGE_LENGTH) {
      res.status(400).json({ error: `message must be at least ${MIN_MESSAGE_LENGTH} characters` });
      return;
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      res.status(400).json({ error: `message must be at most ${MAX_MESSAGE_LENGTH} characters` });
      return;
    }
    if (name !== undefined && name !== null && (typeof name !== 'string' || name.length > MAX_NAME_LENGTH)) {
      res.status(400).json({ error: `name must be a string up to ${MAX_NAME_LENGTH} characters` });
      return;
    }
    if (email !== undefined && email !== null) {
      if (
        typeof email !== 'string' ||
        email.length > MAX_EMAIL_LENGTH ||
        (email.trim().length > 0 && !/^\S+@\S+\.\S+$/.test(email.trim()))
      ) {
        res.status(400).json({ error: 'email must be a valid email address' });
        return;
      }
    }

    const trimmedName = typeof name === 'string' && name.trim().length > 0 ? name.trim() : null;
    const trimmedEmail = typeof email === 'string' && email.trim().length > 0 ? email.trim() : null;

    await prisma.siteFeedback.create({
      data: {
        rating,
        message: message.trim(),
        name: trimmedName,
        email: trimmedEmail,
      },
    });

    res.status(201).json({ message: 'Feedback received' });
  } catch (error) {
    console.error('POST /feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
