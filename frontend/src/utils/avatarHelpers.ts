/**
 * Avatar helpers — single source of truth for FriendsPanel and MapPanel
 */

// Private — not exported, only used within avatarHelpers.ts
const hashName = (name: string): number => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

export const getAvatarLetter = (name: string): string =>
  (name?.trim().charAt(0) || '?').toUpperCase();

export const getAvatarColor = (name: string): string => {
  if (!name?.trim()) return '#94A3B8'; // neutral grey for unknown/empty names
  const colors = [
    '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
    '#EC4899', '#EF4444', '#06B6D4',
  ];
  return colors[hashName(name) % colors.length];
};

/**
 * Stable 0–2s delay for staggered pulse animation.
 * Derived from name hash so it doesn't change on re-render.
 * 21 steps (0–20) ÷ 10 = 0.0s to 2.0s in 0.1s increments
 */
export const getAvatarAnimationDelay = (name: string): number => {
  if (!name?.trim()) return 0;
  return (hashName(name) % 21) / 10;
};
