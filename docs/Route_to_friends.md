Here's your **complete, production-ready prompt** with all improvements:

---

## **Prompt: Route to Friend – Navigation Feature**

### Context

Fair map built with Mapbox GL JS and React. Users see friends' locations as markers. Add a "Get Directions" feature that shows a walking route from the user's current location to a selected friend's marker.

### Existing Codebase

- **MapPanel** (`frontend/src/components/map/MapPanel.tsx`): Renders the map, friend markers, and popups. Friend popup content is created by `createFriendPopupContent`. MapPanel does **not** receive `userLocation` yet.
- **SplitViewMapLayout** (`frontend/src/components/map/SplitViewMapLayout.tsx`): Holds `userLocation` (from `useLocationTracking`) and passes `friendLocations` to MapPanel. `userLocation` is passed to FriendsPanel but not to MapPanel.
- **Turf.js**: Already used in FriendsPanel for `distance` and `point` (`@turf/turf`).
- **Mapbox token**: `VITE_MAPBOX_TOKEN` in env.

---

### Required Changes

#### 1. Pass userLocation to MapPanel

- Add `userLocation?: { latitude: number; longitude: number } | null` to `MapPanelProps`.
- In `SplitViewMapLayout`, pass `userLocation={userLocation}` to `MapPanel`.
- Also add `onGetDirections?: (friendId: string) => void` callback to `MapPanelProps` for handling "Get Directions" button clicks.

#### 2. Extend Friend Popup with Distance and "Get Directions"

**In `createFriendPopupContent`:**
- Calculate distance from user to friend using Turf.js:
  ```typescript
  const distanceText = userLocation 
    ? (() => {
        const dist = distance(
          point([userLocation.longitude, userLocation.latitude]),
          point([friend.lastLongitude, friend.lastLatitude]),
          { units: 'kilometers' }
        );
        return dist < 1 
          ? `${Math.round(dist * 1000)} m away` 
          : `${dist.toFixed(1)} km away`;
      })()
    : 'Distance unknown';
  ```

- Format distance as "250 m away" or "1.2 km away"

- Add a "Get Directions" button with attributes:
  ```html
  <button 
    data-action="get-directions" 
    data-friend-id="{friendId}"
    class="btn-primary"
  >
    Get Directions 🧭
  </button>
  ```

- **Handle null userLocation**: If userLocation is null, show "Distance unknown 📍" and either disable or hide the "Get Directions" button

- **Friend Location Staleness**: Calculate time since `friend.locationUpdatedAt` (FriendLocation uses this field, not `updatedAt`). If > 30 minutes, show warning badge in popup: "⚠️ Last seen 45 min ago"

- **Security**: Escape friend names before injecting into HTML to prevent XSS:
  ```typescript
  const escapeHTML = (str: string) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };
  const safeName = escapeHTML(friend.name);
  ```

#### 3. Event Delegation for Popup Buttons

Because popups use `setHTML()`, handle the "Get Directions" button click via **event delegation**:

**Implementation Details:**
- Attach the click listener inside the same `useEffect` that initializes the map (where `map.current` is set), or use `mapContainer.current` in a separate `useEffect` that depends on `onGetDirections`. Since `map` is a ref, do NOT put `map` in the dependency array—use `[onGetDirections]` and check `map.current` inside the effect.
- Use `mapContainer.current` or `map.current?.getContainer()` to get the element
- Clean up listener on unmount
- Check `event.target.closest('[data-action="get-directions"]')` to identify button clicks
- Extract `data-friend-id` attribute
- Call parent callback `onGetDirections(friendId)`

```typescript
// In MapPanel - attach to map container
useEffect(() => {
  const container = mapContainer.current ?? map.current?.getContainer();
  if (!container || !onGetDirections) return;

  const handlePopupClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const btn = target.closest('[data-action="get-directions"]');
    if (btn) {
      const friendId = btn.getAttribute('data-friend-id');
      if (friendId) onGetDirections(friendId);
    }
  };

  container.addEventListener('click', handlePopupClick);
  return () => container.removeEventListener('click', handlePopupClick);
}, [onGetDirections]);
```

#### 4. Map Instance Access

- Extend `MapPanelRef` with `getMap(): mapboxgl.Map | null` so the parent can add/remove route layers.
- MapPanelRef already has `flyTo`. Add `getMap` and keep the existing `flyTo` method.
- Implement in MapPanel via `useImperativeHandle`:
  ```typescript
  useImperativeHandle(ref, () => ({
    flyTo: (lng, lat, zoom) => { /* existing implementation */ },
    getMap: () => map.current
  }), []);
  ```

#### 5. Mapbox Directions API

**API Endpoint:**
```
GET https://api.mapbox.com/directions/v5/mapbox/walking/{userLng},{userLat};{friendLng},{friendLat}
```

**Query Parameters:**
- `geometries=geojson`
- `steps=true`
- `access_token={VITE_MAPBOX_TOKEN}`

**Full URL Example:**
```typescript
const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${userLng},${userLat};${friendLng},${friendLat}?geometries=geojson&steps=true&access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`;
```

**Response Parsing:**
- Extract route geometry: `response.routes[0].geometry` (GeoJSON LineString)
- Extract steps: `response.routes[0].legs[0].steps`
- Extract distance: `response.routes[0].distance` (meters)
- Extract duration: `response.routes[0].duration` (seconds)

**Error Handling:**
- No routes in response: Route not found
- HTTP errors (401, 403, 500)
- Network timeout (abort after 10 seconds)

#### 6. Route Display on Map

**Add Route Layer:**
```typescript
// Add source
map.addSource('route', {
  type: 'geojson',
  data: {
    type: 'Feature',
    properties: {},
    geometry: routeGeometry // LineString from API
  }
});

// Add route line layer. Friend markers are Mapbox Marker DOM elements (not map layers),
// so they render on top of the map. The route line will appear underneath them by default.
// No need to specify beforeId—just add the layer.
map.addLayer({
  id: 'route',
  type: 'line',
  source: 'route',
  layout: {
    'line-join': 'round',
    'line-cap': 'round'
  },
  paint: {
    'line-color': '#06BEE1', // sky-blue
    'line-width': ['interpolate', ['linear'], ['zoom'], 10, 5, 15, 6],
    'line-opacity': 0.8
  }
});
```

**Layer Ordering:**
- Friend markers are DOM overlays (Mapbox Marker), not map layers—there is no `friend-markers-layer-id`
- The route line layer will render on the map; markers float above it

**Fit Map Bounds:**
```typescript
// Calculate bounds from route geometry
const coordinates = routeGeometry.coordinates;
const bounds = coordinates.reduce((bounds, coord) => {
  return bounds.extend(coord as [number, number]);
}, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

// Fit with padding
map.fitBounds(bounds, {
  padding: { top: 100, bottom: 300, left: 50, right: 50 },
  duration: 1000 // Smooth animation
});
```

**Destination Marker Enhancement (Optional):**
- Add a subtle pulse animation to the friend's marker when route is active
- Remove pulse when route is cleared

**User Location Marker:**
- User location is already shown by Mapbox GeolocateControl; no extra start marker needed

#### 7. Turn-by-Turn Instructions Panel

**UI Positioning:**
- **Mobile**: Fixed bottom panel, slides up from bottom
- **Desktop**: Fixed bottom-right or sidebar

**Panel Structure:**

```typescript
interface RouteInstructionsProps {
  friendName: string;
  totalDistance: number; // meters
  totalDuration: number; // seconds
  steps: RouteStep[];
  onClearRoute: () => void;
  isLoading?: boolean;
}
```

**Summary Section:**
- Friend name with emoji: "Directions to Alex 👋"
- Total distance: "1.2 km" (or "800 m" if < 1 km)
- Estimated time: "15 min walk"

**Steps List:**
- Each step includes:
  - Icon based on maneuver type (⬆️ ➡️ ⬅️ 🎯)
  - Instruction text: "Turn left onto Main Street"
  - Distance per step: "Walk 200 m"

**Maneuver Icon Mapping:**
```typescript
const getManeuverIcon = (type: string, modifier?: string): string => {
  if (type === 'arrive') return '🎯';
  if (type === 'depart') return '⬆️';
  if (type === 'turn') {
    if (modifier === 'left') return '⬅️';
    if (modifier === 'right') return '➡️';
    if (modifier === 'slight left') return '↖️';
    if (modifier === 'slight right') return '↗️';
  }
  if (type === 'continue') return '⬆️';
  return '➡️'; // default
};
```

**"Clear Route" Button:**
- Positioned at bottom of panel
- Uses secondary button style from design system (styles/index.css)
- Minimum 48px height for touch accessibility

**Mobile UX:**
- Instructions panel should not be obstructed by mobile keyboard
- Use `position: fixed` with `bottom` offset
- Add `padding-bottom: env(safe-area-inset-bottom)` for iOS notch/safe area

**Design (use design system in styles/index.css):**
```css
.route-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--color-white);
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  max-height: 50vh;
  overflow-y: auto;
  z-index: 200;
}

.route-summary {
  background: var(--color-sky-blue);
  color: var(--color-white);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.route-summary h3 {
  font-size: var(--font-size-lg);
  font-weight: 700;
  margin-bottom: 8px;
}

.route-summary-stats {
  display: flex;
  gap: 16px;
  font-size: var(--font-size-sm);
}

.route-steps {
  margin-bottom: 16px;
}

.route-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #E5E7EB;
}

.route-step:last-child {
  border-bottom: none;
}

.step-icon {
  font-size: 24px;
  flex-shrink: 0;
  width: 32px;
  text-align: center;
}

.step-content {
  flex: 1;
}

.step-instruction {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.step-distance {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

@media (min-width: 1025px) {
  .route-panel {
    bottom: 20px;
    left: auto;
    right: 20px;
    width: 400px;
    max-height: 60vh;
    border-radius: 16px;
  }
}
```

#### 8. Route Clearing & State Management

**State in Parent Component (SplitViewMapLayout or similar):**
```typescript
const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
const [isDirectionsPanelOpen, setIsDirectionsPanelOpen] = useState(false);
const [isLoadingRoute, setIsLoadingRoute] = useState(false);

interface ActiveRoute {
  friendId: string;
  friendName: string;
  geometry: GeoJSON.LineString;
  steps: RouteStep[];
  distance: number;  // meters
  duration: number;  // seconds
}
```

**Clear Route Functionality:**
```typescript
const clearRoute = () => {
  const map = mapPanelRef.current?.getMap();
  if (map) {
    // Remove route layer and source
    if (map.getLayer('route')) {
      map.removeLayer('route');
    }
    if (map.getSource('route')) {
      map.removeSource('route');
    }
  }
  
  // Clear state
  setActiveRoute(null);
  setIsDirectionsPanelOpen(false);
  
  // Do NOT restore previous bounds - keep current view
  // (simpler and less disorienting for children)
};
```

**Multiple Routes Handling:**
- If user clicks "Get Directions" on a different friend while a route is active:
  - Automatically clear the previous route first using `clearRoute()`
  - Then fetch and display the new route
- Only one route can be active at a time

**Map View After Clear:**
- Do NOT restore previous map bounds/zoom
- User can manually zoom/pan after clearing
- This is simpler and less disorienting for children

#### 9. Error Handling

**Error Scenarios:**

**No Route Found:**
- Message: "Sorry, we couldn't find a walking route to your friend. They might be too far away! 🚶"
- Display in a toast notification or error message component

**API Error:**
- Message: "Oops! We're having trouble calculating the route. Please try again."
- HTTP errors (401, 403, 500), network errors

**User Location Unavailable:**
- Message: "Please enable location tracking to get directions 📍"
- Show in popup when "Get Directions" is clicked without user location

**Friend Location Outdated:**
- If `friend.locationUpdatedAt` is > 30 minutes ago:
  - Show warning in popup: "⚠️ Last seen 45 min ago"
  - Still allow "Get Directions" but show disclaimer in instructions panel:
    - "Note: Your friend's location was last updated X minutes ago. The route might not be accurate."

**Timeout:**
- Abort API request after 10 seconds
- Message: "This is taking too long. Please try again."

**Error Display:**
- Use error message component consistent with design system (styles/index.css)
- Friendly, child-appropriate language
- Include emoji to soften the message
- Example:
  ```typescript
  <div className="error-message">
    <span className="error-icon">⚠️</span>
    <div className="error-content">
      <p className="error-title">Oops!</p>
      <p className="error-description">We couldn't find a route. Try again?</p>
    </div>
  </div>
  ```

#### 10. Loading & Performance

**Loading States:**

**During API Call:**
- Show loading indicator: "Finding the best path... 🧭"
- Display in:
  - Toast notification, OR
  - Inline in popup, OR
  - Modal overlay on map
- Disable "Get Directions" button during fetch (add `disabled` attribute and loading spinner)

**Loading UI Example:**
```typescript
{isLoadingRoute && (
  <div className="loading-overlay">
    <div className="loading-icon">🧭</div>
    <p className="loading-text">Finding the best path...</p>
  </div>
)}
```

**Timeout Handling:**
- Set timeout for 10 seconds
- If API doesn't respond, abort request and show error: "This is taking too long. Please try again."
- Use `AbortController` for fetch cancellation:
  ```typescript
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    // ... process response
  } catch (error) {
    if (error.name === 'AbortError') {
      // Timeout error
    }
  }
  ```

**Route Caching:**
- Cache route for 5 minutes if friend hasn't moved
- Check `friend.locationUpdatedAt` against cache timestamp
- Invalidate cache if:
  - User moves > 100m from original position (where route was calculated)
  - Friend's `locationUpdatedAt` changes (they've moved)
- Store in component state or ref:
  ```typescript
  const routeCache = useRef<Map<string, { 
    route: ActiveRoute; 
    timestamp: number;
    userPosition: [number, number];
  }>>(new Map());
  ```

**Error Recovery:**
- Retry once automatically on network error (not on 4xx errors)
- Show error only after retry fails
- Example:
  ```typescript
  const fetchWithRetry = async (url: string, retries = 1) => {
    try {
      return await fetch(url);
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchWithRetry(url, retries - 1);
      }
      throw error;
    }
  };
  ```

#### 11. Accessibility

**Keyboard Navigation:**
- Ensure "Get Directions" button is keyboard accessible (native `<button>` element)
- "Clear Route" button should be focusable and activatable with Enter/Space
- Escape key closes instructions panel:
  ```typescript
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDirectionsPanelOpen) {
        clearRoute();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isDirectionsPanelOpen]);
  ```

**Screen Readers:**
- Add `aria-label` to buttons: `aria-label="Get directions to {friendName}"`
- Announce route status with live region:
  ```html
  <div aria-live="polite" aria-atomic="true" className="sr-only">
    {activeRoute && `Route calculated: ${formatDistance(activeRoute.distance)}, ${formatDuration(activeRoute.duration)}`}
  </div>
  ```
- Use semantic HTML:
  - `<nav>` for instructions panel
  - `<ol>` for steps list
  - Proper heading hierarchy (`<h3>` for panel title)

**Motion Sensitivity:**
- Respect `prefers-reduced-motion` for route line animations
- Skip auto-zoom animation if user has motion sensitivity enabled:
  ```typescript
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  map.fitBounds(bounds, {
    padding: { top: 100, bottom: 300, left: 50, right: 50 },
    duration: prefersReducedMotion ? 0 : 1000
  });
  ```

**Color Contrast:**
- Ensure route line color (#06BEE1) has sufficient contrast against map background
- If visibility is poor, add a white outline to the route line:
  ```typescript
  // Add outline layer first
  map.addLayer({
    id: 'route-outline',
    type: 'line',
    source: 'route',
    paint: {
      'line-color': '#FFFFFF',
      'line-width': 8,
      'line-opacity': 0.6
    }
  });
  
  // Then main route layer on top
  map.addLayer({
    id: 'route',
    // ... existing route layer
  });
  ```

#### 12. Design Guidelines

**Colors (from styles/index.css design system):**
- Route line: `#06BEE1` (sky-blue)
- "Get Directions" button: `#FF6B6B` (coral)
- Instructions panel background: `#FFFFFF` (white)
- Panel summary: `#06BEE1` (sky-blue background)

**Spacing & Sizing:**
- Border radius for panels: `16px`
- Button minimum height: `48px` (touch targets)
- Icon size: `24px` minimum

**Typography:**
- Use `var(--font-primary)` for body text
- Use `var(--font-headings)` for panel titles
- Font sizes: `var(--font-size-sm)`, `var(--font-size-base)`, `var(--font-size-lg)` (from styles/index.css)

**Units:**
- Display distances in metric only (meters/kilometers)
- Format: "250 m" or "1.2 km" (space between number and unit)
- Format durations: "15 min" or "1 hr 5 min"

---

### Implementation Approach

**Recommended: Hook + Parent Component**

Create a custom hook `useRouteToFriend` that handles route fetching and formatting. The map is obtained from `mapRef.current?.getMap()` in SplitViewMapLayout—pass it to the hook. The hook receives `map: mapboxgl.Map | null` (which may be null before MapPanel mounts).

```typescript
// hooks/useRouteToFriend.ts
export function useRouteToFriend(
  map: mapboxgl.Map | null,  // From mapRef.current?.getMap() in parent
  userLocation: { latitude: number; longitude: number } | null
) {
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const routeCache = useRef<Map<string, CachedRoute>>(new Map());

  const fetchRoute = async (friend: FriendLocation) => {
    // Implementation
  };

  const clearRoute = () => {
    // Implementation
  };

  const formatDistance = (meters: number): string => {
    // Implementation
  };

  const formatDuration = (seconds: number): string => {
    // Implementation
  };

  return {
    activeRoute,
    isLoading,
    error,
    fetchRoute,
    clearRoute,
    formatDistance,
    formatDuration
  };
}
```

**Parent Component (SplitViewMapLayout):**
- Manages route state using the hook
- Renders `RouteInstructionsPanel` when route is active
- Passes `onGetDirections` callback to MapPanel
- Handles adding/removing route layer from map

**MapPanel:**
- Receives `userLocation` prop
- Displays distance in friend popup
- Implements event delegation for "Get Directions" button
- Calls `onGetDirections(friendId)` callback
- Exposes `getMap()` via `useImperativeHandle`

---

### Files to Create/Modify

**Create:**

1. **`frontend/src/hooks/useRouteToFriend.ts`**
   - Custom hook for route fetching, caching, and formatting
   - Exports: `fetchRoute`, `clearRoute`, `formatDistance`, `formatDuration`, state

2. **`frontend/src/components/map/RouteInstructionsPanel.tsx`**
   - Instructions panel UI component
   - Props: `friendName`, `totalDistance`, `totalDuration`, `steps`, `onClearRoute`, `isLoading`
   - Includes summary, steps list, clear button

3. **`frontend/src/components/map/RouteInstructionsPanel.css`** (or add to existing CSS)
   - Panel styles following design system in styles/index.css
   - Responsive styles for mobile/desktop

**Modify:**

1. **`frontend/src/components/map/MapPanel.tsx`**
   - Add `userLocation` and `onGetDirections` to props
   - Update `createFriendPopupContent` to include distance and "Get Directions" button
   - Implement event delegation for popup button clicks
   - Extend `MapPanelRef` with `getMap()` method
   - Handle security (escape friend names in HTML)

2. **`frontend/src/components/map/SplitViewMapLayout.tsx`**
   - Pass `userLocation` to MapPanel
   - Use `useRouteToFriend` hook with `mapRef.current?.getMap()` as the map argument
   - Implement `handleGetDirections` callback (alongside existing `handleFlyToFriend`)
   - Add route layer to map when route is fetched
   - Render `RouteInstructionsPanel` when route is active
   - Handle route clearing

**Optional:**

3. **`frontend/src/utils/mapHelpers.ts`**
   - Helper functions for map operations (if needed)
   - `addRouteToMap`, `removeRouteFromMap`, `fitMapToRoute`

---

### Types (TypeScript)

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

### Example User Flow

1. User taps a friend marker on the map
2. Popup shows: "Alex 👋 • 800 m away 📍 [Get Directions 🧭]"
3. User taps "Get Directions" button
4. Loading indicator appears: "Finding the best path... 🧭"
5. Route is fetched and displayed on map (blue line)
6. Map auto-zooms to fit the route
7. Instructions panel slides up showing:
   - "Directions to Alex 👋"
   - "📏 800 m • ⏱️ 10 min walk"
   - Step-by-step instructions with icons
8. User follows route (or just views it)
9. User taps "Clear Route" button
10. Route disappears, panel closes, map stays at current zoom

---

### Explicitly Excluded (Do Not Implement)

- Voice instructions / audio navigation
- Phone vibration on turn updates
- Auto-rotate map to heading/bearing
- Share route link via chat
- Swipeable directions panel (simple show/hide is enough)
- Real-time route recalculation when user moves (defer to later)
- Alternative route options (fastest/shortest)
- Bicycle or driving profiles (walking only)
- Offline route caching (beyond 5-minute memory cache)
- Route history / saved routes

---

### Testing Checklist

After implementation, verify:

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

---

### Notes

- **i18n**: The app uses `react-i18next`. Use `t()` for user-facing strings (e.g. `t('route.getDirections')`) to stay consistent with existing UI (e.g. friend popup uses "Son yeniləmə").
- **Walking profile only** – most appropriate for fair navigation
- **Keep UI simple** – designed for children and families
- **Only show routes to confirmed friends** – use existing friend list
- **Metric units only** – meters and kilometers
- **Performance** – cache routes, abort slow requests, retry once on network errors
- **Accessibility first** – keyboard nav, screen readers, motion sensitivity
- **Error handling** – friendly messages, automatic retry, clear error states

---

**This feature transforms the fair map into a true navigation tool, helping families reunite and explore together! 🎪🧭✨**

---

**Ready to send to your agent!** This prompt is comprehensive, addresses all edge cases, and includes production-ready implementation details. Good luck with your build! 🚀