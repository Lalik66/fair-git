import {
  serializeCategories,
  parseCategories,
  reviewerDisplayName,
} from '../src/services/reviewService';

describe('reviewService pure helpers', () => {
  describe('serializeCategories', () => {
    it('returns null for null/undefined input', () => {
      expect(serializeCategories(null)).toBeNull();
      expect(serializeCategories(undefined)).toBeNull();
    });

    it('serializes a valid category object', () => {
      const out = serializeCategories({ quality: 5, service: 4, priceValue: 3 });
      expect(out).toBe(JSON.stringify({ quality: 5, service: 4, priceValue: 3 }));
    });

    it('rejects unknown keys with undefined', () => {
      expect(serializeCategories({ bogus: 5 })).toBeUndefined();
    });

    it('rejects out-of-range or non-integer stars with undefined', () => {
      expect(serializeCategories({ quality: 0 })).toBeUndefined();
      expect(serializeCategories({ quality: 6 })).toBeUndefined();
      expect(serializeCategories({ quality: 3.5 })).toBeUndefined();
    });

    it('rejects arrays with undefined', () => {
      expect(serializeCategories([1, 2, 3])).toBeUndefined();
    });

    it('returns null for an empty object (nothing to store)', () => {
      expect(serializeCategories({})).toBeNull();
    });
  });

  describe('parseCategories', () => {
    it('round-trips a serialized object', () => {
      const stored = serializeCategories({ quality: 5, service: 4 }) as string;
      expect(parseCategories(stored)).toEqual({ quality: 5, service: 4 });
    });

    it('returns null for null input', () => {
      expect(parseCategories(null)).toBeNull();
    });

    it('returns null for malformed JSON', () => {
      expect(parseCategories('{not json')).toBeNull();
    });
  });

  describe('reviewerDisplayName', () => {
    it('formats first name + last initial', () => {
      expect(reviewerDisplayName('Aysel', 'Mammadova')).toBe('Aysel M.');
    });

    it('uses first name only when no last name', () => {
      expect(reviewerDisplayName('Aysel', null)).toBe('Aysel');
    });

    it('falls back to Anonymous when nothing is provided', () => {
      expect(reviewerDisplayName(null, null)).toBe('Anonymous');
      expect(reviewerDisplayName('', '')).toBe('Anonymous');
    });
  });
});
