import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import {
  recalcVendorRating,
  serializeCategories,
  parseCategories,
  reviewerDisplayName,
} from '../services/reviewService';

const router = Router();

const MAX_COMMENT_LENGTH = 2000;
const MAX_REPLY_LENGTH = 1000;

function isValidStar(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5;
}

/**
 * POST /api/reviews
 * Body: { vendorId, rating (1-5), categories?, comment? }
 *
 * Submit (or re-submit) a review for a vendor. One review per visitor per
 * vendor — resubmitting overwrites the previous one and sends it back to
 * moderation. Nothing is public until an admin approves it.
 */
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const visitorId = req.user!.id;
    const { vendorId, rating, categories, comment } = req.body ?? {};

    if (typeof vendorId !== 'string' || !vendorId) {
      res.status(400).json({ error: 'vendorId is required' });
      return;
    }
    if (!isValidStar(rating)) {
      res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
      return;
    }
    const categoriesJson = serializeCategories(categories);
    if (categoriesJson === undefined) {
      res.status(400).json({
        error: 'categories must be an object with quality/service/priceValue ratings 1-5',
      });
      return;
    }
    if (
      comment !== undefined &&
      comment !== null &&
      (typeof comment !== 'string' || comment.length > MAX_COMMENT_LENGTH)
    ) {
      res.status(400).json({ error: `comment must be a string up to ${MAX_COMMENT_LENGTH} characters` });
      return;
    }
    const trimmedComment =
      typeof comment === 'string' && comment.trim().length > 0 ? comment.trim() : null;

    const vendor = await prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      select: { id: true, userId: true },
    });
    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }
    if (vendor.userId === visitorId) {
      res.status(403).json({ error: 'You cannot review your own profile' });
      return;
    }

    // Was the previous review (if any) public? Then the aggregate must be
    // recomputed after we pull it back into PENDING.
    const previous = await prisma.review.findUnique({
      where: { vendorId_visitorId: { vendorId, visitorId } },
      select: { status: true },
    });

    const review = await prisma.review.upsert({
      where: { vendorId_visitorId: { vendorId, visitorId } },
      create: {
        vendorId,
        visitorId,
        rating,
        categories: categoriesJson,
        comment: trimmedComment,
      },
      update: {
        rating,
        categories: categoriesJson,
        comment: trimmedComment,
        // Edited content goes back through moderation; the old reply refers
        // to the old text, so it is cleared too.
        status: 'PENDING',
        rejectionReason: null,
        vendorReply: null,
        repliedAt: null,
        reportCount: 0,
        moderatedAt: null,
        moderatedById: null,
      },
      select: {
        id: true,
        rating: true,
        categories: true,
        comment: true,
        status: true,
        createdAt: true,
      },
    });

    if (previous?.status === 'APPROVED') {
      await recalcVendorRating(vendorId);
    }

    res.status(201).json({
      review: { ...review, categories: parseCategories(review.categories) },
    });
  } catch (error) {
    console.error('POST /reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reviews/vendor/:vendorId
 * Public: approved reviews + aggregates for one vendor. When the caller is
 * authenticated, also returns their own review (any status) as `myReview`
 * so the form can show "pending moderation" state.
 */
router.get('/vendor/:vendorId', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { vendorId } = req.params;

    const vendor = await prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        companyName: true,
        avgRating: true,
        reviewCount: true,
        userId: true,
      },
    });
    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    const reviews = await prisma.review.findMany({
      where: { vendorId, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        rating: true,
        categories: true,
        comment: true,
        vendorReply: true,
        repliedAt: true,
        createdAt: true,
        visitor: { select: { firstName: true, lastName: true } },
      },
    });

    const callerId = req.user?.id ?? null;
    let myReview = null;
    if (callerId) {
      const own = await prisma.review.findUnique({
        where: { vendorId_visitorId: { vendorId, visitorId: callerId } },
        select: {
          id: true,
          rating: true,
          categories: true,
          comment: true,
          status: true,
          rejectionReason: true,
          vendorReply: true,
          repliedAt: true,
          createdAt: true,
        },
      });
      if (own) {
        myReview = { ...own, categories: parseCategories(own.categories) };
      }
    }

    res.json({
      vendor: {
        id: vendor.id,
        companyName: vendor.companyName,
        avgRating: vendor.avgRating,
        reviewCount: vendor.reviewCount,
        isOwnProfile: callerId !== null && vendor.userId === callerId,
      },
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        categories: parseCategories(r.categories),
        comment: r.comment,
        vendorReply: r.vendorReply,
        repliedAt: r.repliedAt,
        createdAt: r.createdAt,
        visitorName: reviewerDisplayName(r.visitor.firstName, r.visitor.lastName),
      })),
      myReview,
    });
  } catch (error) {
    console.error('GET /reviews/vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reviews/my-vendor
 * Vendor-only: all reviews about the caller's vendor profile (approved +
 * pending count so the dashboard can hint at what's in moderation).
 */
router.get('/my-vendor', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
      select: { id: true, avgRating: true, reviewCount: true },
    });
    if (!vendor) {
      res.status(404).json({ error: 'Vendor profile not found' });
      return;
    }

    const reviews = await prisma.review.findMany({
      where: { vendorId: vendor.id, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        categories: true,
        comment: true,
        vendorReply: true,
        repliedAt: true,
        createdAt: true,
        visitor: { select: { firstName: true, lastName: true } },
      },
    });

    res.json({
      vendor: {
        id: vendor.id,
        avgRating: vendor.avgRating,
        reviewCount: vendor.reviewCount,
      },
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        categories: parseCategories(r.categories),
        comment: r.comment,
        vendorReply: r.vendorReply,
        repliedAt: r.repliedAt,
        createdAt: r.createdAt,
        visitorName: reviewerDisplayName(r.visitor.firstName, r.visitor.lastName),
      })),
    });
  } catch (error) {
    console.error('GET /reviews/my-vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/reviews/:id/reply
 * Body: { reply }
 * The vendor the review is about answers it. Only on approved reviews.
 */
router.post('/:id/reply', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reply } = req.body ?? {};

    if (
      typeof reply !== 'string' ||
      reply.trim().length === 0 ||
      reply.length > MAX_REPLY_LENGTH
    ) {
      res.status(400).json({ error: `reply must be a non-empty string up to ${MAX_REPLY_LENGTH} characters` });
      return;
    }

    const review = await prisma.review.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        vendor: { select: { userId: true } },
      },
    });
    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    if (review.vendor.userId !== req.user!.id) {
      res.status(403).json({ error: 'Only the reviewed vendor can reply' });
      return;
    }
    if (review.status !== 'APPROVED') {
      res.status(400).json({ error: 'Only approved reviews can be replied to' });
      return;
    }

    const updated = await prisma.review.update({
      where: { id },
      data: { vendorReply: reply.trim(), repliedAt: new Date() },
      select: { id: true, vendorReply: true, repliedAt: true },
    });

    res.json({ review: updated });
  } catch (error) {
    console.error('POST /reviews/:id/reply error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/reviews/:id/report
 * Flag a published review as suspicious. Bumps a counter the admin queue
 * sorts by; the review stays public until an admin acts on it.
 */
router.post('/:id/report', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!review || review.status !== 'APPROVED') {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    await prisma.review.update({
      where: { id },
      data: { reportCount: { increment: 1 } },
    });

    res.json({ message: 'Report received' });
  } catch (error) {
    console.error('POST /reviews/:id/report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
