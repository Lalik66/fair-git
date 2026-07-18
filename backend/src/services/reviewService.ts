import { prisma } from '../index';

/**
 * Recompute the cached rating aggregates on a vendor profile.
 *
 * Only APPROVED reviews count toward the public average. Called after any
 * transition into or out of APPROVED (moderation decision, or a visitor
 * editing a previously-approved review which resets it to PENDING).
 */
export async function recalcVendorRating(vendorId: string): Promise<void> {
  const agg = await prisma.review.aggregate({
    where: { vendorId, status: 'APPROVED' },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await prisma.vendorProfile.update({
    where: { id: vendorId },
    data: {
      // One decimal place — "4.3" reads better than 4.3333333.
      avgRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
      reviewCount: agg._count._all,
    },
  });
}

/** Category ratings payload: {"quality":5,"service":4,"priceValue":3}. */
const CATEGORY_KEYS = ['quality', 'service', 'priceValue'] as const;

function isValidStar(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5;
}

/**
 * Validate and serialize the optional per-category ratings object.
 * Returns the JSON string to store, null for "not provided", or undefined
 * when the payload is malformed (caller should 400).
 */
export function serializeCategories(input: unknown): string | null | undefined {
  if (input === undefined || input === null) return null;
  if (typeof input !== 'object' || Array.isArray(input)) return undefined;

  const obj = input as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const key of Object.keys(obj)) {
    if (!(CATEGORY_KEYS as readonly string[]).includes(key)) return undefined;
    if (!isValidStar(obj[key])) return undefined;
    out[key] = obj[key] as number;
  }
  return Object.keys(out).length > 0 ? JSON.stringify(out) : null;
}

/** Parse the stored categories JSON back into an object (null-safe). */
export function parseCategories(stored: string | null): Record<string, number> | null {
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Public display name for a reviewer: "Aysel M." — first name plus last
 * initial. Never expose the full identity or email on a public listing.
 */
export function reviewerDisplayName(
  firstName: string | null,
  lastName: string | null
): string {
  const first = (firstName || '').trim();
  const lastInitial = (lastName || '').trim().charAt(0);
  if (!first && !lastInitial) return 'Anonymous';
  return lastInitial ? `${first} ${lastInitial}.`.trim() : first;
}
