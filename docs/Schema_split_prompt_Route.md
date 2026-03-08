
Here’s an outline you can use to split the prompt into separate files:

---

## File structure

| File | Purpose |
|------|---------|
| `Route_to_friend_00_Overview.md` | Shared context, design system, types, excluded items |
| `Route_to_friend_01_Foundation.md` | Part 1 – Popup, props, event delegation |
| `Route_to_friend_02_Core_Route.md` | Part 2 – API, route layer, state |
| `Route_to_friend_03_Instructions_UI.md` | Part 3 – Instructions panel UI |
| `Route_to_friend_04_Polish.md` | Part 4 – Errors, loading, accessibility, caching |

---

## Part 0: Overview (shared reference)

**File:** `Route_to_friend_00_Overview.md`

**Sections:**
- **Context** – Fair map, Mapbox, friends, walking route
- **Existing codebase** – MapPanel, SplitViewMapLayout, Turf.js, `VITE_MAPBOX_TOKEN`
- **Design guidelines** – Colors, typography, spacing, units (from `styles/index.css`)
- **Types** – `RouteStep`, `ActiveRoute`, `CachedRoute`, `DirectionsResponse`
- **Example user flow** – Steps 1–10
- **Explicitly excluded** – Voice, vibration, auto-rotate, etc.
- **Notes** – i18n, walking only, metric units

---

## Part 1: Foundation

**File:** `Route_to_friend_01_Foundation.md`

**Prerequisite:** Read `Route_to_friend_00_Overview.md` for context.

**Sections:**

1. **Pass `userLocation` to MapPanel**
   - Add `userLocation?: { latitude, longitude } | null` to `MapPanelProps`
   - Add `onGetDirections?: (friendId: string) => void` to `MapPanelProps`
   - In SplitViewMapLayout, pass `userLocation={userLocation}` and `onGetDirections={handleGetDirections}` to MapPanel

2. **Extend friend popup with distance and “Get Directions”**
   - In `createFriendPopupContent`, compute distance with Turf.js (`distance`, `point`, `{ units: 'kilometers' }`)
   - Format as `"250 m away"` or `"1.2 km away"` (or `"Distance unknown"` if no `userLocation`)
   - Add “Get Directions” button with `data-action="get-directions"` and `data-friend-id="{friendId}"`
   - If `userLocation` is null: show “Distance unknown” and disable/hide the button
   - If `friend.locationUpdatedAt` > 30 min: show “Last seen X min ago”
   - Escape friend names for XSS (e.g. `escapeHTML` helper)

3. **Event delegation for popup buttons**
   - Attach click listener to `mapContainer.current` in a `useEffect` with `[onGetDirections]`
   - Use `event.target.closest('[data-action="get-directions"]')` and read `data-friend-id`
   - Call `onGetDirections(friendId)`
   - Remove listener on unmount

4. **Map instance access**
   - Add `getMap(): mapboxgl.Map | null` to `MapPanelRef`
   - In `useImperativeHandle`, keep `flyTo` and add `getMap: () => map.current`

**Files to modify:** `MapPanel.tsx`, `SplitViewMapLayout.tsx`  
**Deliverable:** Clicking a friend shows distance and “Get Directions”; button triggers callback.

---

## Part 2: Core route

**File:** `Route_to_friend_02_Core_Route.md`

**Prerequisite:** Part 1 done. Read Overview for types and design.

**Sections:**

1. **Mapbox Directions API**
   - Endpoint: `GET .../directions/v5/mapbox/walking/{userLng},{userLat};{friendLng},{friendLat}`
   - Params: `geometries=geojson`, `steps=true`, `access_token`
   - Parse: `routes[0].geometry`, `legs[0].steps`, `distance`, `duration`
   - Handle: no routes, HTTP errors, timeout (10 s with `AbortController`)

2. **`useRouteToFriend` hook**
   - Args: `map` (from `mapRef.current?.getMap()`), `userLocation`
   - State: `activeRoute`, `isLoading`, `error`
   - `fetchRoute(friend: FriendLocation)` – call API, parse, return route
   - `clearRoute()` – remove route layer/source, reset state
   - `formatDistance(meters)`, `formatDuration(seconds)`
   - Return: `{ activeRoute, isLoading, error, fetchRoute, clearRoute, formatDistance, formatDuration }`

3. **Route display on map**
   - Add GeoJSON source `route` and line layer
   - Style: `#06BEE1`, `line-width` by zoom, `line-opacity: 0.8`
   - Friend markers are DOM overlays; no `beforeId` needed
   - `fitBounds` on route with padding; respect `prefers-reduced-motion` for `duration`

4. **Route clearing and state**
   - State: `activeRoute`, `isDirectionsPanelOpen`, `isLoadingRoute`
   - `clearRoute`: remove layer/source, reset state, keep current map view
   - If user selects another friend while route is active: clear previous route, then fetch new one

**Files to create:** `useRouteToFriend.ts`  
**Files to modify:** `SplitViewMapLayout.tsx`  
**Deliverable:** “Get Directions” fetches route and draws it on the map.

---

## Part 3: Instructions UI

**File:** `Route_to_friend_03_Instructions_UI.md`

**Prerequisite:** Part 2 done. Read Overview for design system.

**Sections:**

1. **`RouteInstructionsPanel` component**
   - Props: `friendName`, `totalDistance`, `totalDuration`, `steps`, `onClearRoute`, `isLoading?`
   - Summary: friend name, distance, duration
   - Steps list with maneuver icon, instruction text, distance per step

2. **Maneuver icon mapping**
   - `arrive` → 🎯, `depart` → ⬆️, `turn` + `left`/`right`/`slight left`/`slight right` → ⬅️➡️↖️↗️, `continue` → ⬆️, default → ➡️

3. **Layout and styling**
   - Mobile: fixed bottom, `max-height: 50vh`, safe-area padding
   - Desktop: bottom-right, `width: 400px`, `max-height: 60vh`
   - Use `var(--color-sky-blue)`, `var(--font-size-lg)`, etc. from `styles/index.css`

4. **“Clear Route” button**
   - Secondary style, min 48px height, calls `onClearRoute`

**Files to create:** `RouteInstructionsPanel.tsx`, `RouteInstructionsPanel.css`  
**Files to modify:** `SplitViewMapLayout.tsx`  
**Deliverable:** Instructions panel shows route summary and steps; “Clear Route” works.

---

## Part 4: Polish

**File:** `Route_to_friend_04_Polish.md`

**Prerequisite:** Part 3 done. Read Overview for design and notes.

**Sections:**

1. **Error handling**
   - No route: “Sorry, we couldn't find a walking route…”
   - API error: “Oops! We're having trouble…”
   - No user location: “Please enable location tracking…”
   - Friend outdated: “Last seen X min ago” in popup; disclaimer in panel
   - Timeout: “This is taking too long…”
   - Use design-system error component, friendly copy, emoji

2. **Loading states**
   - During fetch: “Finding the best path…” (toast, inline, or overlay)
   - Disable “Get Directions” while loading
   - `AbortController` with 10 s timeout

3. **Route caching**
   - Cache for 5 min if friend hasn’t moved
   - Invalidate if user moves > 100 m or `friend.locationUpdatedAt` changes
   - Use `useRef<Map<string, CachedRoute>>`

4. **Error recovery**
   - Retry once on network error (not 4xx)
   - Show error only after retry fails

5. **Accessibility**
   - Native `<button>` for “Get Directions” and “Clear Route”
   - `aria-label` on buttons
   - `aria-live` for route status
   - Semantic HTML: `<nav>`, `<ol>`, heading hierarchy
   - Escape closes instructions panel
   - `prefers-reduced-motion` for `fitBounds` duration
   - Optional: white outline for route line if contrast is poor

6. **i18n**
   - Use `t()` from `react-i18next` for all user-facing strings

**Files to modify:** `useRouteToFriend.ts`, `RouteInstructionsPanel.tsx`, `SplitViewMapLayout.tsx`, `MapPanel.tsx`  
**Deliverable:** Production-ready behavior, errors, loading, caching, accessibility, i18n.

---

## Testing checklist (append to Part 4 or Overview)

- [ ] Distance in friend popup
- [ ] “Get Directions” clickable and styled
- [ ] Route on map with correct style
- [ ] Map fits route bounds
- [ ] Instructions panel with correct data
- [ ] Maneuver icons correct
- [ ] “Clear Route” removes route and closes panel
- [ ] Selecting another friend clears previous route
- [ ] Loading state during API call
- [ ] Error messages for failures
- [ ] Null `userLocation` shows “Distance unknown”
- [ ] Staleness warning when > 30 min
- [ ] Keyboard nav (Tab, Enter, Esc)
- [ ] Screen reader announcements
- [ ] `prefers-reduced-motion` respected
- [ ] Mobile touch targets and safe area
- [ ] Desktop layout
- [ ] Route cache works
- [ ] Friend names escaped in HTML

---

## Usage order

1. Create `Route_to_friend_00_Overview.md` first (shared reference).
2. Run Parts 1 → 2 → 3 → 4 in order.
3. Each part references the Overview and the previous parts.

