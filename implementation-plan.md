# Fair Marketplace - Full Implementation Plan

## Current Status: 233/240 features passing (97.1%)

---

## Part 1: Split-View Map Layout — Frontend Architecture

### Critical Files

| # | File | Purpose |
|---|------|---------|
| 1 | `frontend/src/types/map.ts` | TypeScript interfaces (`MapObject`, `FilterType`, `VendorHouse`), constants (`TYPE_COLORS`, `FILTER_BUTTONS`) that every other component depends on |
| 2 | `frontend/src/components/map/SplitViewMapLayout.tsx` | Top-level orchestrator wiring sidebar, map, hooks, panorama modal, and conditional desktop/mobile rendering |
| 3 | `frontend/src/components/map/MapPanel.tsx` | Mapbox GL JS wrapper: color-coded markers, 3D buildings, marker click events, search box overlay, panorama preview overlay |
| 4 | `frontend/src/hooks/useMapInteraction.ts` | Bidirectional sync engine — manages `selectedObjectId`, coordinates `flyTo` calls, triggers lazy panorama detail fetching |
| 5 | `frontend/src/components/map/MobileBottomSheet.tsx` | Touch-draggable bottom sheet with 3 snap points (collapsed/half/full), horizontal-scrolling filter bar, scroll-locked object list |

### Component Architecture

```
SplitViewMapLayout (orchestrator)
├── Sidebar (desktop only, 35% width)
│   ├── Header ("Yarmarka xəritəsi")
│   ├── FilterBar (filter buttons row)
│   └── ObjectList (scrollable list of map objects)
│       └── ObjectListItem (individual item, highlighted on select)
├── MapPanel (65% width desktop, 100% mobile)
│   ├── Mapbox GL JS canvas
│   ├── MapSearchBox (top-right overlay)
│   └── PanoramaPreview (bottom-right overlay, shows when house selected)
├── MobileBottomSheet (mobile only, replaces Sidebar)
│   ├── DragHandle
│   ├── FilterBar (horizontal scroll)
│   └── ObjectList
└── PanoramaModal (full-screen 360° viewer, opened from preview)
```

### State Management

Shared state lives in `useMapInteraction` hook:

```typescript
interface MapInteractionState {
  selectedObjectId: string | null;
  activeFilter: FilterType; // 'all' | 'vendor_house' | 'restaurant' | ...
  searchQuery: string;
  mapObjects: MapObject[];
  filteredObjects: MapObject[];
  isLoading: boolean;
  panoramaData: PanoramaDetail | null;
}
```

- Sidebar click → sets `selectedObjectId` → map `flyTo` + open popup
- Map marker click → sets `selectedObjectId` → sidebar scrolls to and highlights item
- Filter change → updates `activeFilter` → re-filters `mapObjects` → updates both sidebar list and map markers
- Search input → updates `searchQuery` → re-fetches from API or filters client-side

### CSS Layout Strategy

**Desktop (>768px):**
```css
.split-view-container {
  display: flex;
  height: 100vh;
}
.sidebar {
  width: 35%;
  min-width: 320px;
  max-width: 480px;
  overflow-y: auto;
  border-right: 1px solid var(--border-color);
}
.map-panel {
  flex: 1;
  position: relative;
}
```

**Mobile (≤768px):**
- Map takes 100% width/height
- Sidebar replaced by bottom sheet overlay
- Bottom sheet has 3 snap points: collapsed (80px), half (50vh), full (90vh)
- Touch gesture handling via pointer events

### Filter Buttons

```typescript
const FILTER_BUTTONS = [
  { key: 'all', label: 'Hamısı', emoji: '📍' },
  { key: 'vendor_house', label: 'Evlər', emoji: '🏠' },
  { key: 'cafe', label: 'Kafe', emoji: '☕' },
  { key: 'restroom', label: 'WC', emoji: '🚻' },
  { key: 'entrance', label: 'Giriş', emoji: '🚪' },
  { key: 'kids_zone', label: 'Əyləncələr', emoji: '🎪' },
  { key: 'bus_stop', label: 'Dayancaq', emoji: '🚌' },
  { key: 'parking', label: 'Parking', emoji: '🅿️' },
];
```

### Color Coding

| Category | Color | Hex | Object Types |
|----------|-------|-----|-------------|
| Vendor Houses | Green | `#22c55e` | `vendor_house` |
| Food & Cafes | Orange/Red | `#f97316` | `restaurant`, `cafe` |
| Services | Blue | `#3b82f6` | `restroom`, info |
| Entertainment | Purple | `#a855f7` | `kids_zone` |
| Transport/Parking | Gray | `#6b7280` | `parking`, `bus_stop`, `taxi` |

### 360° Panorama Preview

- Small panel (300x200px) at bottom-right of map
- Appears when a vendor house with `hasPanorama: true` is selected
- Shows: panorama thumbnail, house number, area (e.g., "Evin ölçüləri: 130m²")
- "View 360°" button opens full-screen `PanoramaModal` using Photo Sphere Viewer

### Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| >1024px | Full sidebar (35%) + map (65%) |
| 769-1024px | Narrower sidebar (320px) + map (rest) |
| ≤768px | Full-screen map + bottom sheet overlay |

---

## Part 2: Split-View Map Layout — Backend API

### New Unified Endpoint

**`GET /api/public/map-objects`**

Returns all map objects (vendor houses + facilities) in a single normalized array.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | `""` | Text search across name/description/house_number |
| `types` | string (comma-separated) | `""` (all) | Filter: `vendor_house,restaurant,cafe,kids_zone,restroom,taxi,bus_stop,parking` |
| `fairId` | string (UUID) | active fair | Fair ID to determine house occupancy status |

#### Response Format

```typescript
interface MapObjectsResponse {
  objects: MapObject[];
  count: number;
  fairId: string | null;
}

interface MapObject {
  id: string;
  objectType: string;        // 'vendor_house' | 'restaurant' | 'cafe' | etc.
  name: string;              // house_number for houses, name for facilities
  description: string | null;
  latitude: number;
  longitude: number;
  colorCategory: 'green' | 'orange' | 'blue' | 'purple' | 'gray';
  icon: string | null;
  emoji: string;
  metadata: HouseMetadata | FacilityMetadata;
}

interface HouseMetadata {
  area_sqm: number | null;
  price: number | null;
  hasPanorama: boolean;
  panorama_360_url: string | null;
  isOccupied: boolean;
}

interface FacilityMetadata {
  photo_url: string | null;
}
```

#### Example Response

```json
{
  "objects": [
    {
      "id": "54949ed4-...",
      "objectType": "vendor_house",
      "name": "H-101",
      "description": "Test vendor house H-101",
      "latitude": 40.41745,
      "longitude": 49.86803,
      "colorCategory": "green",
      "icon": null,
      "emoji": "🏠",
      "metadata": {
        "area_sqm": 45.28,
        "price": 941.09,
        "hasPanorama": false,
        "panorama_360_url": null,
        "isOccupied": false
      }
    },
    {
      "id": "abc123...",
      "objectType": "restaurant",
      "name": "Fair Food Court",
      "description": "Main dining area",
      "latitude": 40.4150,
      "longitude": 49.8700,
      "colorCategory": "orange",
      "icon": "utensils",
      "emoji": "🍽️",
      "metadata": {
        "photo_url": "/uploads/food-court.jpg"
      }
    }
  ],
  "count": 2,
  "fairId": "d3616bcb-..."
}
```

#### Handler Implementation

```typescript
router.get('/api/public/map-objects', async (req, res) => {
  const { search = '', types = '', fairId } = req.query;
  const typeFilter = types ? types.split(',').map(t => t.trim()) : [];
  const searchTerm = search.trim().toLowerCase();
  const targetFairId = fairId || (await getActiveFairId(prisma));
  const results: MapObject[] = [];

  // Fetch vendor houses (conditionally)
  const includeHouses = typeFilter.length === 0 || typeFilter.includes('vendor_house');
  if (includeHouses) {
    const houses = await prisma.vendorHouse.findMany({
      where: {
        is_enabled: true,
        ...(searchTerm ? {
          OR: [
            { house_number: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ]
        } : {})
      },
      select: {
        id: true, house_number: true, area_sqm: true, price: true,
        description: true, latitude: true, longitude: true, panorama_360_url: true,
      }
    });

    const occupiedHouseIds = targetFairId
      ? await getOccupiedHouseIds(prisma, targetFairId)
      : new Set<string>();

    for (const house of houses) {
      results.push({
        id: house.id,
        objectType: 'vendor_house',
        name: house.house_number,
        description: house.description,
        latitude: house.latitude,
        longitude: house.longitude,
        colorCategory: 'green',
        icon: null,
        emoji: '🏠',
        metadata: {
          area_sqm: house.area_sqm,
          price: house.price,
          hasPanorama: !!house.panorama_360_url,
          panorama_360_url: house.panorama_360_url,
          isOccupied: occupiedHouseIds.has(house.id),
        }
      });
    }
  }

  // Fetch facilities (conditionally)
  const facilityTypes = typeFilter.filter(t => t !== 'vendor_house');
  const includeFacilities = typeFilter.length === 0 || facilityTypes.length > 0;
  if (includeFacilities) {
    const facilities = await prisma.facility.findMany({
      where: {
        ...(facilityTypes.length > 0 ? { type: { in: facilityTypes } } : {}),
        ...(searchTerm ? {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ]
        } : {})
      },
      select: {
        id: true, name: true, type: true, description: true,
        latitude: true, longitude: true, photo_url: true, icon: true, color: true,
      }
    });

    for (const facility of facilities) {
      results.push({
        id: facility.id,
        objectType: facility.type,
        name: facility.name,
        description: facility.description,
        latitude: facility.latitude,
        longitude: facility.longitude,
        colorCategory: getColorCategory(facility.type),
        icon: facility.icon,
        emoji: getEmoji(facility.type),
        metadata: { photo_url: facility.photo_url }
      });
    }
  }

  res.json({ objects: results, count: results.length, fairId: targetFairId });
});
```

#### Helper Functions

```typescript
function getColorCategory(objectType: string): ColorCategory {
  switch (objectType) {
    case 'vendor_house': return 'green';
    case 'restaurant':
    case 'cafe': return 'orange';
    case 'restroom': return 'blue';
    case 'kids_zone': return 'purple';
    case 'parking':
    case 'bus_stop':
    case 'taxi': return 'gray';
    default: return 'gray';
  }
}

function getEmoji(objectType: string): string {
  switch (objectType) {
    case 'vendor_house': return '🏠';
    case 'restaurant': return '🍽️';
    case 'cafe': return '☕';
    case 'kids_zone': return '🎪';
    case 'restroom': return '🚻';
    case 'parking': return '🅿️';
    case 'bus_stop': return '🚌';
    case 'taxi': return '🚕';
    default: return '📍';
  }
}

async function getActiveFairId(prisma): Promise<string | null> {
  const fair = await prisma.fair.findFirst({
    where: { status: 'active' },
    select: { id: true },
  });
  if (fair) return fair.id;
  const upcoming = await prisma.fair.findFirst({
    where: { status: 'upcoming' },
    orderBy: { start_date: 'asc' },
    select: { id: true },
  });
  return upcoming?.id || null;
}

async function getOccupiedHouseIds(prisma, fairId: string): Promise<Set<string>> {
  const bookings = await prisma.booking.findMany({
    where: {
      fair_id: fairId,
      booking_status: { in: ['pending', 'approved'] },
      is_archived: false,
    },
    select: { vendor_house_id: true },
  });
  return new Set(bookings.map(b => b.vendor_house_id));
}
```

### Database Index Additions

```sql
CREATE INDEX "facilities_type_idx" ON "facilities"("type");
CREATE INDEX "vendor_houses_is_enabled_idx" ON "vendor_houses"("is_enabled");
CREATE INDEX "bookings_fair_status_idx" ON "bookings"("fair_id", "booking_status");
```

### Performance Strategy

- **3-4 queries max** per request (fair lookup, houses, bookings, facilities)
- **HTTP caching**: `Cache-Control: public, max-age=30, stale-while-revalidate=60`
- **Optional in-memory cache**: 30s TTL, keyed by `map-objects:${fairId}`, cleared on admin mutations
- **Response size**: ~45KB uncompressed / ~8KB gzipped for 150 objects
- **No schema migrations required** — existing tables have all needed columns

### Cache Invalidation Points

Add `mapObjectsCache.clear()` after mutations in:
- `POST /api/admin/vendor-houses` (create house)
- `PATCH /api/admin/vendor-houses/:id` (edit house)
- `DELETE /api/admin/vendor-houses/:id` (delete house)
- `POST /api/admin/facilities` (create facility)
- `PATCH /api/admin/facilities/:id` (edit facility)
- `DELETE /api/admin/facilities/:id` (delete facility)
- `PATCH /api/admin/applications/:id/approve`
- `PATCH /api/admin/applications/:id/reject`

---

## Part 3: Remaining 7 Features — Strategy

### Priority 1: Application Deletion (Features 151, 152)

**Why first:** No external dependencies, lowest effort, immediate score increase.

#### Feature 151: Admin can delete applications

**Backend — `DELETE /api/admin/applications/:id`**

```typescript
router.delete('/api/admin/applications/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const application = await prisma.application.findUnique({
    where: { id },
    include: { booking: true }
  });
  if (!application) return res.status(404).json({ error: 'Application not found' });

  // Cascade: delete related booking if exists
  if (application.booking) {
    await prisma.booking.delete({ where: { application_id: id } });
  }

  // Delete uploaded files (logo, documents)
  if (application.logo_url) {
    deleteLocalFile(application.logo_url);
  }

  await prisma.application.delete({ where: { id } });

  // Log activity
  await logActivity(req.user.id, 'DELETE_APPLICATION', { applicationId: id });

  res.json({ success: true });
});
```

**Frontend — ApplicationReview.tsx**

- Add red "Delete" button to each application row/card
- Confirmation modal: "Are you sure you want to delete this application? This action cannot be undone."
- On confirm: call `DELETE /api/admin/applications/:id`
- On success: remove from list, show toast notification

#### Feature 152: Delete application removes related data

Handled by cascade logic above:
- Related booking deleted
- Uploaded files cleaned up from `/uploads/`
- Activity log entry created

### Priority 2: Cloudinary Integration (Feature 225)

**Why second:** Medium effort, needs external account but no complex auth flows.

#### Environment Variables

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_PRESET=fair_marketplace
```

#### Backend Changes

1. **Install packages:**
   ```bash
   npm install cloudinary multer-storage-cloudinary
   ```

2. **Create `backend/src/config/cloudinary.ts`:**
   ```typescript
   import { v2 as cloudinary } from 'cloudinary';
   import { CloudinaryStorage } from 'multer-storage-cloudinary';

   cloudinary.config({
     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
     api_key: process.env.CLOUDINARY_API_KEY,
     api_secret: process.env.CLOUDINARY_API_SECRET,
   });

   export const cloudinaryStorage = new CloudinaryStorage({
     cloudinary,
     params: {
       folder: 'fair-marketplace',
       allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
       transformation: [{ width: 1200, crop: 'limit' }],
     },
   });

   export default cloudinary;
   ```

3. **Modify upload middleware:**
   - If `CLOUDINARY_CLOUD_NAME` is set, use `cloudinaryStorage`
   - Otherwise, fall back to existing local `multer.diskStorage`
   - This keeps local development working without Cloudinary credentials

4. **Migration strategy for existing images:**
   - Existing local images continue to work (served from `/uploads/`)
   - New uploads go to Cloudinary when configured
   - Optional: batch migration script for existing files

### Priority 3: Google OAuth (Features 2, 3, 6, 221)

**Why last:** Highest effort, needs Google Cloud Console project setup, most complex integration.

#### Environment Variables

```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3002/api/auth/google/callback
```

#### Backend Changes

1. **Install packages:**
   ```bash
   npm install passport passport-google-oauth20 express-session
   npm install -D @types/passport @types/passport-google-oauth20
   ```

2. **Create `backend/src/config/passport.ts`:**
   ```typescript
   import passport from 'passport';
   import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

   passport.use(new GoogleStrategy({
     clientID: process.env.GOOGLE_CLIENT_ID!,
     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
     callbackURL: process.env.GOOGLE_CALLBACK_URL!,
   }, async (accessToken, refreshToken, profile, done) => {
     const email = profile.emails?.[0]?.value;
     if (!email) return done(new Error('No email from Google'));

     // Find or create user
     let user = await prisma.user.findUnique({ where: { email } });
     if (!user) {
       user = await prisma.user.create({
         data: {
           email,
           name: profile.displayName,
           avatar_url: profile.photos?.[0]?.value,
           google_id: profile.id,
           password_hash: '', // No password for OAuth users
         }
       });
     } else if (!user.google_id) {
       // Link Google account to existing user (Feature 221)
       user = await prisma.user.update({
         where: { id: user.id },
         data: { google_id: profile.id, avatar_url: user.avatar_url || profile.photos?.[0]?.value }
       });
     }
     return done(null, user);
   }));
   ```

3. **Add Prisma schema change:**
   ```prisma
   model User {
     // ... existing fields ...
     google_id String? @unique
   }
   ```

4. **Add OAuth routes:**
   ```
   GET  /api/auth/google          → passport.authenticate('google', { scope: ['profile', 'email'] })
   GET  /api/auth/google/callback → passport.authenticate callback → redirect to frontend
   ```

#### Frontend Changes

- Add "Sign in with Google" button on login page
- Add "Sign up with Google" button on register page
- Button links to `/api/auth/google` (backend handles redirect to Google)
- After OAuth callback, backend sets session/JWT and redirects to frontend

#### Make OAuth Optional

- If `GOOGLE_CLIENT_ID` is not set, Google OAuth routes return 404
- Login/register pages conditionally show Google buttons only when OAuth is configured
- Email/password login always remains available as fallback

---

## Implementation Order (All Work)

### Phase 1: Quick Wins

| Step | Task | Features |
|------|------|----------|
| 1 | Add `DELETE /api/admin/applications/:id` endpoint with cascade | 151, 152 |
| 2 | Add delete button + confirmation modal in ApplicationReview UI | 151, 152 |
| 3 | Test deletion end-to-end | 151, 152 |

**Result: 235/240 (97.9%)**

### Phase 2: Split-View Map — Backend

| Step | Task |
|------|------|
| 4 | Add database indexes (facilities.type, vendor_houses.is_enabled, bookings composite) |
| 5 | Create `getColorCategory`, `getEmoji` utility functions |
| 6 | Create `getActiveFairId` and `getOccupiedHouseIds` helpers |
| 7 | Implement `GET /api/public/map-objects` endpoint |
| 8 | Add cache headers and optional in-memory caching |
| 9 | Add cache invalidation to admin mutation endpoints |
| 10 | Test endpoint with various filter/search combinations |

### Phase 3: Split-View Map — Frontend Foundation

| Step | Task |
|------|------|
| 11 | Create `frontend/src/types/map.ts` (interfaces, constants, color map) |
| 12 | Create `useMapInteraction` hook (selection state, flyTo, filter, search) |
| 13 | Create API service method for `GET /api/public/map-objects` |

### Phase 4: Split-View Map — Desktop Layout

| Step | Task |
|------|------|
| 14 | Create `SplitViewMapLayout.tsx` (flexbox container) |
| 15 | Build Sidebar component (header, filter bar, object list) |
| 16 | Build `MapPanel.tsx` (refactor existing Mapbox code, add color-coded markers) |
| 17 | Implement bidirectional sync (sidebar click → map flyTo, marker click → sidebar highlight) |
| 18 | Add `MapSearchBox` overlay component |

### Phase 5: Split-View Map — Panorama & Polish

| Step | Task |
|------|------|
| 19 | Build `PanoramaPreview` overlay (bottom-right of map, shows on house select) |
| 20 | Build `PanoramaModal` (full-screen Photo Sphere Viewer) |
| 21 | Add animations/transitions (sidebar highlight, panorama panel slide-in) |

### Phase 6: Split-View Map — Mobile

| Step | Task |
|------|------|
| 22 | Build `MobileBottomSheet` with 3 snap points and touch gestures |
| 23 | Add horizontal-scrolling filter bar for mobile |
| 24 | Test responsive behavior at all breakpoints |

### Phase 7: Cloudinary Integration

| Step | Task | Features |
|------|------|----------|
| 25 | Install cloudinary + multer-storage-cloudinary | 225 |
| 26 | Create cloudinary config with env var detection | 225 |
| 27 | Modify upload middleware to use Cloudinary when configured | 225 |
| 28 | Test upload flow with and without Cloudinary credentials | 225 |

**Result: 236/240 (98.3%)**

### Phase 8: Google OAuth

| Step | Task | Features |
|------|------|----------|
| 29 | Add `google_id` column to users table (Prisma migration) | 2, 3, 6, 221 |
| 30 | Install passport + passport-google-oauth20 | 2, 3, 6, 221 |
| 31 | Create passport Google strategy config | 2, 3, 6, 221 |
| 32 | Add OAuth routes (initiate + callback) | 2, 3, 6, 221 |
| 33 | Add Google sign-in buttons to frontend (conditional) | 2, 3, 6, 221 |
| 34 | Test full OAuth flow (login, register, session, profile linking) | 2, 3, 6, 221 |

**Result: 240/240 (100%)**

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Existing map page breaks during refactor | Keep old component, build new one in parallel, swap when ready |
| Mapbox GL JS version conflicts with new features | Pin version, test 3D buildings early |
| Mobile bottom sheet touch conflicts with map pan | Use pointer event detection to distinguish sheet drag from map pan |
| Google OAuth requires deployed callback URL for testing | Use localhost callback for dev, ngrok for mobile testing |
| Cloudinary free tier limits | Implement local fallback, optimize image sizes with transformations |
| SQLite `contains` case sensitivity | Use Prisma `mode: 'insensitive'` which works with SQLite |
| Cache staleness after admin edits | Cache invalidation on every admin mutation endpoint |

---

## Architecture Reference

- **Frontend:** React 18+ with TypeScript, Vite (port 3000)
- **Backend:** Node.js + Express + Prisma + SQLite (port 3002)
- **Map:** Mapbox GL JS for interactive maps
- **Panorama:** Photo Sphere Viewer for 360° tours
- **Database:** SQLite (`backend/prisma/dev.db`)
- **Existing data:** 4 vendor houses (H-101 to H-104), 2 fairs, 5 vendor profiles, 5 applications, 1 booking
