
# PROMPT — Avatar on Map Marker (Fair Marketplace)

**Version 4** — With shared hash helper and clearer comments.

---

## Overview

Replace the generic friend marker (purple circle + person icon) with generated avatars: **first letter of name + per-friend color**, matching the FriendsPanel style.

---

## Implementation Steps

### Step 1 — Create shared utility (prevents drift)

**File:** `frontend/src/utils/avatarHelpers.ts`

```ts
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
```

---

### Step 2 — Update FriendsPanel.tsx

- Remove local `getAvatarLetter` and `getAvatarColor`.
- Add: `import { getAvatarLetter, getAvatarColor } from '../../utils/avatarHelpers';`
- **Note:** FriendsPanel does not use `getAvatarAnimationDelay` — only MapPanel does. Do not import it here.

---

### Step 3 — Update MapPanel.tsx

- Add: `import { getAvatarLetter, getAvatarColor, getAvatarAnimationDelay } from '../../utils/avatarHelpers';`
- Replace friend marker creation (around lines 271–276) with:

```ts
const avatarColor = getAvatarColor(friend.name);
const avatarLetter = getAvatarLetter(friend.name);
const animationDelay = getAvatarAnimationDelay(friend.name);

const el = document.createElement('div');
el.className = 'map-marker friend-marker';
el.style.backgroundColor = avatarColor;
// Do NOT set borderColor — CSS uses white border for contrast
el.style.color = '#FFFFFF';
el.style.fontWeight = '700';
el.style.fontSize = '16px';
el.style.fontFamily = 'Poppins, sans-serif';
el.style.animationDelay = `${animationDelay}s`; // Stable per friend, no re-render reset
el.innerHTML = `<span class="marker-icon marker-letter">${avatarLetter}</span>`;
el.title = friend.name;
```

- Keep the existing popup (or ensure it shows friend name for mobile):

```ts
const popup = new mapboxgl.Popup({ offset: 25, closeOnClick: true })
  .setHTML(createFriendPopupContent(friend));
```

---

### Step 4 — Update all CSS files with `.friend-marker`

**Action:** Search the codebase for `.friend-marker`:

```bash
grep -r "friend-marker" frontend/src/
```

Update every file that defines `.friend-marker`. Do not leave any file with `background-color: #8B5CF6` on `.friend-marker`.

**Files to check:** `SplitViewMapLayout.css`, `MapPage.css`, and any other matches.

**Replace:**

```css
/* Friend markers - distinct purple style */
.friend-marker {
  width: 38px;
  height: 38px;
  background-color: #8B5CF6 !important;
  border: 3px solid #7C3AED !important;
  ...
}
```

**With:**
> **Note:** `border-radius`, `display`, and centering are set explicitly so `.friend-marker` works even if `.map-marker` is changed. If your base class already provides these, the redundancy is harmless.
```css
/* Friend markers - letter avatar with per-friend color (set inline in MapPanel) */
.friend-marker {
  width: 38px;
  height: 38px;
  border-radius: 50%; /* Guarantee circle shape (self-contained if .map-marker changes) */
  display: flex;
  align-items: center;
  justify-content: center;
  /* No background-color here — use inline style from MapPanel */
  border: 3px solid white !important;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
  animation: friend-pulse 2s ease-in-out infinite;
}
.friend-marker .marker-letter {
  font-size: 16px !important;
  font-weight: 700;
  color: white;
}
.friend-marker:hover {
  transform: scale(1.2) !important; /* Override animation so hover always wins */
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
}
@keyframes friend-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
  }
  50% {
    transform: scale(1.08);
    box-shadow: 0 5px 16px rgba(0, 0, 0, 0.4);
  }
}
```
---
## Checklist

| Step | Action |
|------|--------|
| Create `avatarHelpers.ts` with `hashName`, `getAvatarLetter`, `getAvatarColor`, `getAvatarAnimationDelay` | Add |
| Update imports in `FriendsPanel.tsx` (no `getAvatarAnimationDelay`) | Add |
| Update imports in `MapPanel.tsx` | Add |
| Do NOT set `el.style.borderColor` | Fix |
| Add grey fallback for empty name in `getAvatarColor` | Fix |
| Grep all CSS files for `.friend-marker` before editing | Fix |
| Use `getAvatarAnimationDelay` instead of `Math.random()` | Fix |
| Use scale + shadow in `friend-pulse` keyframes | Fix |
| Add `transform: scale(1.2) !important` on `.friend-marker:hover` | Fix |

---

## Bug Fixes Applied

1. **borderColor conflict** — Removed `el.style.borderColor`; CSS uses `border: 3px solid white !important` for contrast.
2. **Code duplication** — Shared `avatarHelpers.ts` used by FriendsPanel and MapPanel.
3. **Empty name fallback** — `getAvatarColor('')` returns `#94A3B8` (neutral grey).
4. **Animation too subtle** — `friend-pulse` now uses scale (1 → 1.08) and stronger shadow.
5. **Unstable animation delay** — `getAvatarAnimationDelay(name)` gives a stable 0–2s delay per friend across re-renders.
6. **Hover vs animation** — `.friend-marker:hover` uses `transform: scale(1.2) !important` so hover overrides the pulse.
7. **Hash loop duplication** — Private `hashName()` helper used by both `getAvatarColor` and `getAvatarAnimationDelay`; hash algorithm changes only in one place.

---

## Improvements Applied

1. **Mobile tooltip** — Existing popup with `createFriendPopupContent(friend)` shows friend name on tap.
2. **Staggered animation** — `getAvatarAnimationDelay(friend.name)` for consistent per-friend stagger.
3. **Explicit CSS scope** — Grep for `.friend-marker` and update all occurrences.
4. **Clear comment for hash math** — `% 21` / 10 documented as `21 steps (0–20) ÷ 10 = 0.0s to 2.0s in 0.1s increments`.
5. **Clarified import** — Step 2 explicitly notes that FriendsPanel does not use `getAvatarAnimationDelay`.

---

End of prompt.

---

**Summary of v4 changes:**

- Added private `hashName()` helper used by `getAvatarColor` and `getAvatarAnimationDelay`.
- Removed hash loop duplication inside `avatarHelpers.ts`.
- Documented `% 21` / 10 as producing 0.0s–2.0s in 0.1s steps.
- Clarified in Step 2 that FriendsPanel does not import `getAvatarAnimationDelay`.
