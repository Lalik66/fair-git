import { describe, it, expect } from 'vitest';
import {
  getAvatarLetter,
  getAvatarColor,
  getAvatarAnimationDelay,
} from './avatarHelpers';

describe('avatarHelpers', () => {
  describe('getAvatarLetter', () => {
    it('returns the uppercased first letter', () => {
      expect(getAvatarLetter('aysel')).toBe('A');
      expect(getAvatarLetter('  bob')).toBe('B');
    });

    it('falls back to "?" for empty input', () => {
      expect(getAvatarLetter('')).toBe('?');
      expect(getAvatarLetter('   ')).toBe('?');
    });
  });

  describe('getAvatarColor', () => {
    it('returns neutral grey for empty names', () => {
      expect(getAvatarColor('')).toBe('#94A3B8');
      expect(getAvatarColor('   ')).toBe('#94A3B8');
    });

    it('is deterministic for the same name', () => {
      expect(getAvatarColor('Aysel')).toBe(getAvatarColor('Aysel'));
    });

    it('returns a colour from the palette', () => {
      const palette = [
        '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
        '#EC4899', '#EF4444', '#06B6D4',
      ];
      expect(palette).toContain(getAvatarColor('Rashad'));
    });
  });

  describe('getAvatarAnimationDelay', () => {
    it('returns 0 for empty names', () => {
      expect(getAvatarAnimationDelay('')).toBe(0);
    });

    it('is deterministic and within the 0–2s range', () => {
      const delay = getAvatarAnimationDelay('Aysel');
      expect(delay).toBe(getAvatarAnimationDelay('Aysel'));
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(2);
    });
  });
});
