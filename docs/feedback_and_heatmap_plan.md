# Implementation Plan — Vendor Reviews (Feedback) & Crowd-Density Heatmap

Source: `feedback abd heatmap.docx` (RU). This plan adapts the two requested
features to **this** codebase (SQLite + Prisma, Express, Socket.io, Mapbox GL,
Nodemailer) rather than the generic stack in the doc.

## TL;DR — is it free?

**Yes. Both features can be built with zero new paid services.** Everything
required is already installed and in use in the project:

| Doc says you need | Reality in this repo | Cost |
|---|---|---|
| Review API / DB / email | Express + Prisma + Nodemailer already here | Free |
| Location stream (Socket.io) | **Already built** — `location:update` event | Free |
| Mapbox heatmap layer | `mapbox-gl` already installed & configured | Free (within current Mapbox usage) |
| TimescaleDB (marked "obligatory") | Not needed for a working feature — see §2.4 | Free |
| Redis (marked "recommended") | `node-cache` already covers single-instance caching | Free |

The only paid dependency involved is **Mapbox itself**, which you *already*
use. The heatmap adds map interactions but no new vendor. TimescaleDB/Redis are
scale optimizations, not requirements — you only need them if live users grow
into the thousands *and* you want 24h history + forecasting.

---

## Feature 1 — Feedback: Vendor Reviews & Ratings 🟢

**Complexity: Low. Estimate: 7–10 days. New paid services: none.**

### 1.1 What exists already
- `VendorProfile` model (needs 2 aggregate fields added).
- Admin panel + moderation patterns (`routes/admin.ts`, `AdminDashboard.tsx`).
- Email via Nodemailer for vendor notifications.
- `express-validator`, `express-rate-limit`, auth middleware — reuse for the API.

### 1.2 Database (Prisma — `backend/prisma/schema.prisma`)
Add a `Review` model. Note: SQLite has no enums or native JSON, so store
`status` as a `String` and `categories` as a JSON string (matches how the
codebase already handles similar cases).

```prisma
model Review {
  id              String    @id @default(uuid())
  vendorId        String    @map("vendor_id")   // -> VendorProfile.id
  visitorId       String    @map("visitor_id")  // -> User.id
  bookingId       String?   @map("booking_id")  // optional: only-after-purchase

  rating          Int       // 1-5 overall
  categories      String?   // JSON: {"quality":5,"service":4,"priceValue":3}
  comment         String?

  status          String    @default("PENDING") // PENDING | APPROVED | REJECTED
  rejectionReason String?   @map("rejection_reason")

  vendorReply     String?   @map("vendor_reply")
  repliedAt       DateTime? @map("replied_at")

  createdAt       DateTime  @default(now()) @map("created_at")
  moderatedAt     DateTime? @map("moderated_at")
  moderatedBy     String?   @map("moderated_by")

  vendor          VendorProfile @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  visitor         User          @relation(fields: [visitorId], references: [id], onDelete: Cascade)

  @@index([vendorId, status])
  @@map("reviews")
}
```

Add cached aggregates to `VendorProfile` (avoids recomputing on every read):
```prisma
  avgRating   Float  @default(0) @map("avg_rating")
  reviewCount Int    @default(0) @map("review_count")
  reviews     Review[]
```
Add the back-relation `reviews Review[]` on `User` too.

Apply with the project's workflow: `npm run db:push` + `db:generate` (no
migrations — per repo convention).

### 1.3 Backend (`backend/src/routes/reviews.ts`, new)
- `POST /api/reviews` — visitor submits (rating + categories + comment). Guard:
  one review per visitor per vendor (optionally require a completed `Booking`).
  Created with `status: PENDING`. Rate-limited.
- `GET /api/reviews/vendor/:vendorId` — public list of **APPROVED** reviews +
  the vendor's aggregate rating.
- `POST /api/reviews/:id/reply` — vendor replies (auth = that vendor only).
- `POST /api/reviews/:id/report` — visitor flags a suspicious review.
- **Admin moderation** (add to `routes/admin.ts`, reuse admin guard):
  - `GET /api/admin/reviews?status=PENDING` — moderation queue.
  - `PATCH /api/admin/reviews/:id` — approve / reject (+ reason).
- **Rating recalculation** — a small `recalcVendorRating(vendorId)` service
  called after any approve/reject; updates `avgRating` + `reviewCount`.
- **Notification** — on new review and on moderation decision, email the vendor
  via the existing Nodemailer service.

### 1.4 Frontend
- `ReviewForm.tsx` — star selector (1–5) + 3 category sliders + comment; posts
  to the API; shows "pending moderation" state.
- `ReviewList.tsx` + `RatingSummary.tsx` — render on the vendor profile page
  (average, distribution, individual reviews, vendor replies).
- Admin: a **Moderation Queue** tab in `AdminDashboard` (approve/reject, reason).
- i18n: add keys to `frontend/src/i18n` (az/en) — the app is already i18n'd.

### 1.5 Optional: "influence on placement"
The doc mentions rating affecting placement priority in future fairs. Simplest
version: sort vendors by `avgRating` where the app already lists them. Defer any
ranking algorithm — it's not required for the feature to ship.

### 1.6 Review effort
| Part | Days |
|---|---|
| Schema + backend API + moderation | 2–3 |
| Rating recalc + email hooks | 1 |
| Frontend form + display + admin queue | 3–4 |
| i18n + polish + tests | 1–2 |
| **Total** | **7–10** |

---

## Feature 2 — Real-time Crowd-Density Heatmap 🔴→🟡

**Doc estimate: High, 12–16 days. In this repo it's smaller** because the
location stream already exists. **New paid services: none required.**

### 2.1 What already exists (big head start)
- **Location stream**: `websocket/index.ts` already handles `location:update`
  `{lat,lng}`, respects the `isSharingLocation` privacy flag, and persists
  `lastLatitude/lastLongitude/locationUpdatedAt` on `User`.
- **Mapbox map**: `MapPanel.tsx` already creates the map and uses
  `addSource`/`addLayer`. A heatmap is just one more layer.
- `@turf/turf` is installed (handy for grid aggregation).
- `node-cache` + Socket.io rooms available for fan-out/caching.

### 2.2 Aggregation service (backend)
Add a lightweight in-process aggregator (no new DB needed for the live view):
- On an interval (e.g. every 30–60s, `setInterval` — matches existing polling
  cadence), read all users with recent `locationUpdatedAt` (last N minutes) and
  `isSharingLocation = true`.
- Snap each point to a grid cell (~50×50 m) and count. Turf or a simple
  lat/lng rounding does this.
- Emit an aggregated, **anonymized** GeoJSON `FeatureCollection` (cell centroid
  + weight) over a Socket.io room `heatmap:updates`. Never broadcast individual
  identities — this is the key privacy difference from the friends feature.
- Cache the last snapshot in `node-cache` so new subscribers get it instantly.

### 2.3 Frontend heatmap layer (`MapPanel.tsx`)
- Add a GeoJSON source `crowd-density` and a Mapbox `type: 'heatmap'` layer
  with a green→red color ramp weighted by cell count. This is native Mapbox GL
  — no plugin.
- Subscribe to `heatmap:updates`, `setData()` on the source when new snapshots
  arrive. Add a toggle control to show/hide the layer.

### 2.4 History & forecast — the only part the doc calls "obligatory TimescaleDB"
You do **not** need TimescaleDB to ship the live heatmap. For the optional
extras:
- **24h history**: a plain `CrowdDensitySnapshot` table (`time, zoneId, lat,
  lng, density`) written once per aggregation tick. On SQLite/Postgres this is
  fine at festival scale (a few hundred rows/hour). Query by time range for
  playback.
- **Forecast**: a simple moving-average / same-hour-yesterday estimate over
  that table. No ML, no time-series DB required.
- TimescaleDB only becomes worthwhile at **very high** write volume + long
  retention. Treat it as a later optimization, not a dependency.

### 2.5 Privacy (must-have)
- Only aggregate users who have `isSharingLocation = true`.
- Broadcast **counts per cell only** — never user ids or names on the heatmap
  channel. Suppress cells with fewer than ~3 users (k-anonymity) so individuals
  can't be inferred.

### 2.6 Heatmap effort (this repo)
| Part | Days |
|---|---|
| Aggregation service + Socket.io channel + cache | 2–3 |
| Frontend heatmap layer + toggle + wiring | 2–3 |
| History table + playback (optional) | 2–3 |
| Forecast (optional, simple) | 1–2 |
| Privacy hardening + tests | 1–2 |
| **Total (live only)** | **~5–6** |
| **Total (with history + forecast)** | **~9–12** |

---

## Suggested build order
1. **Reviews first** — self-contained, low risk, high user value, fully free.
2. **Live heatmap** — reuses the existing location stream; ship the live layer
   before investing in history/forecast.
3. History/forecast + (only if scale demands) TimescaleDB — defer.

## Bottom line on cost
No new subscriptions, licenses, or paid APIs are needed for either feature as
specified above. The doc's TimescaleDB/Redis line items are optional scale
tooling; the working features run entirely on what the project already pays for
(Mapbox) or gets for free (Socket.io, Prisma/SQLite, Nodemailer).
