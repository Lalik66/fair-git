# Route to Friend - Overview

## Feature Summary

Add a "Get Directions" feature to the fair map that shows a walking route from the user's current location to a selected friend's marker. This transforms the map into a navigation tool, helping families reunite and explore together.

---

## Context

- **Application**: Fair Marketplace - a city fair mobile/web app for families with children
- **Map technology**: Mapbox GL JS + React
- **Navigation profile**: Walking only (most appropriate for fair navigation)
- **Target users**: Families with children - UI must be simple, friendly, and accessible

---

## Existing Codebase

| File | Purpose |
|------|---------|
| `frontend/src/components/map/MapPanel.tsx` | Renders map, friend markers, popups. Uses `createFriendPopupContent`. Does **not** receive `userLocation` yet. |
| `frontend/src/components/map/SplitViewMapLayout.tsx` | Holds `userLocation` (from `useLocationTracking`), passes `friendLocations` to MapPanel. `userLocation` goes to FriendsPanel but not MapPanel. |
| `frontend/src/styles/index.css` | Design system with CSS variables for colors, typography, spacing |
| Turf.js | Already used in FriendsPanel for `distance` and `point` (`@turf/turf`) |
| `VITE_MAPBOX_TOKEN` | Mapbox access token in environment variables |

---

## Design Guidelines

### Colors (from styles/index.css)

| Usage | Color | CSS Variable |
|-------|-------|--------------|
| Route line | `#06BEE1` | `--color-sky-blue` |
| "Get Directions" button | `#FF6B6B` | `--color-coral` |
| Instructions panel bg | `#FFFFFF` | `--color-white` |
| Panel summary | `#06BEE1` | `--color-sky-blue` |

### Typography

- Body text: `var(--font-primary)` (Poppins)
- Panel titles: `var(--font-headings)` (Fredoka)
- Font sizes: `var(--font-size-sm)`, `var(--font-size-base)`, `var(--font-size-lg)`

### Spacing & Sizing

- Border radius for panels: `16px`
- Button minimum height: `48px` (touch targets)
- Icon size: `24px` minimum
- Safe area padding on iOS: `env(safe-area-inset-bottom)`

### Units

- Distances: Metric only (meters/kilometers)
- Format: "250 m" or "1.2 km" (space between number and unit)
- Durations: "15 min" or "1 hr 5 min"

---

## TypeScript Types

```typescript
// types/route.ts

export interface RouteStep {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  maneuver: {
    type: string; // 'turn', 'arrive', 'depart', 'continue'
    modifier?: string; // 'left', 'right', 'slight left', etc.
  };
}

export interface ActiveRoute {
  friendId: string;
  friendName: string;
  geometry: GeoJSON.LineString;
  steps: RouteStep[];
  distance: number;  // meters
  duration: number; // seconds
}

export interface CachedRoute {
  route: ActiveRoute;
  timestamp: number;
  userPosition: [number, number]; // [lng, lat]
}

// Mapbox Directions API Response
export interface DirectionsResponse {
  routes: Array<{
    geometry: GeoJSON.LineString;
    distance: number;
    duration: number;
    legs: Array<{
      steps: Array<{
        maneuver: {
          type: string;
          modifier?: string;
          instruction?: string;
        };
        distance: number;
        duration: number;
        name?: string;
      }>;
    }>;
  }>;
  code: string; // 'Ok' or error code
  message?: string;
}
```

---

## Files to Create/Modify

### Create

1. **`frontend/src/hooks/useRouteToFriend.ts`** - Route fetching, caching, formatting hook
2. **`frontend/src/components/map/RouteInstructionsPanel.tsx`** - Instructions panel UI
3. **`frontend/src/components/map/RouteInstructionsPanel.css`** - Panel styles
4. **`frontend/src/types/route.ts`** - TypeScript type definitions

### Modify

1. **`frontend/src/components/map/MapPanel.tsx`** - Add `userLocation`, `onGetDirections`, event delegation, `getMap()`
2. **`frontend/src/components/map/SplitViewMapLayout.tsx`** - Pass `userLocation`, use hook, render panel, handle callbacks

---

## Example User Flow

1. User taps a friend marker on the map
2. Popup shows: "Alex - 800 m away [Get Directions]"
3. User taps "Get Directions" button
4. Loading indicator appears: "Finding the best path..."
5. Route is fetched and displayed on map (blue line)
6. Map auto-zooms to fit the route
7. Instructions panel slides up showing:
   - "Directions to Alex"
   - "800 m - 10 min walk"
   - Step-by-step instructions with icons
8. User follows route (or just views it)
9. User taps "Clear Route" button
10. Route disappears, panel closes, map stays at current zoom

---

## Explicitly Excluded (Do Not Implement)

- Voice instructions / audio navigation
- Phone vibration on turn updates
- Auto-rotate map to heading/bearing
- Share route link via chat
- Swipeable directions panel (simple show/hide is enough)
- Real-time route recalculation when user moves
- Alternative route options (fastest/shortest)
- Bicycle or driving profiles (walking only)
- Offline route caching (beyond 5-minute memory cache)
- Route history / saved routes

---

## Notes

- **i18n**: Use `t()` from `react-i18next` for all user-facing strings
- **Walking profile only** - most appropriate for fair navigation
- **Keep UI simple** - designed for children and families
- **Only show routes to confirmed friends** - use existing friend list
- **Metric units only** - meters and kilometers
- **Performance** - cache routes, abort slow requests, retry once on network errors
- **Accessibility first** - keyboard nav, screen readers, motion sensitivity
- **Error handling** - friendly messages, automatic retry, clear error states

---

## Implementation Order

1. **Part 1: Foundation** - `userLocation` prop, popup with distance, event delegation, `getMap()`
2. **Part 2: Core Route** - Mapbox Directions API, `useRouteToFriend` hook, route layer on map
3. **Part 3: Instructions UI** - `RouteInstructionsPanel` component with steps and styling
4. **Part 4: Polish** - Error handling, loading states, caching, accessibility, i18n

---

## Testing Checklist

- [ ] Distance appears correctly in friend popup
- [ ] "Get Directions" button is clickable and styled correctly
- [ ] Route appears on map with correct color and style
- [ ] Map auto-zooms to show entire route
- [ ] Instructions panel displays with correct data
- [ ] Turn-by-turn steps show appropriate icons
- [ ] "Clear Route" button removes route and closes panel
- [ ] Multiple routes: clicking another friend clears previous route
- [ ] Loading state appears during API call
- [ ] Error messages display for API failures
- [ ] Works with null userLocation (shows "Distance unknown")
- [ ] Friend location staleness warning appears if > 30 min
- [ ] Keyboard navigation works (Tab, Enter, Esc)
- [ ] Screen readers announce route status
- [ ] Respects `prefers-reduced-motion`
- [ ] Works on mobile (touch targets, safe area)
- [ ] Works on desktop (sidebar layout)
- [ ] Route cache works (same friend within 5 min)
- [ ] Security: friend names are escaped in HTML
