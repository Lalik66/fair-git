# Fair Marketplace — Design

A web app for recurring city fairs (Winter / Spring): interactive map, 360° vendor tours, vendor application pipeline, friends + live location, sponsor banners, scheduled events.

## Audience & roles

Four audiences, three persisted roles on `User.role`:

- **Visitor** (anonymous) — home, map, schedule, About; opens vendor popups and 360° tours.
- **User** — applies for a vendor house, tracks applications, shares live location with friends, chats, saves personal pins (e.g. "where I parked").
- **Vendor** — adds company profile, logo, product gallery; sees approved bookings.
- **Admin** — runs the fair: houses, facilities, zones, events, banners, applications, analytics, About Us, contact info.

Auth: email + password (first admin seeded from env) or Google OAuth. New OAuth users land on `/select-role` once.

## Architecture

React 18 + Vite frontend, Express + Prisma backend, Socket.io for real-time, SQLite in dev (Postgres + PostGIS as the production target). Cloudinary for image hosting, Mapbox for the map + directions, Photo Sphere Viewer for panoramas, Gemini for the optional chatbot.

The whole social layer (location updates, chat, reactions) runs over a single Socket.io server attached to the HTTP server; REST handlers emit out of band via an `io` reference injected at boot.

## Domain model

Schema lives in [backend/prisma/schema.prisma](backend/prisma/schema.prisma). Five concerns:

- **Fair ops** — `Fair`, `VendorHouse` (lat/lng + optional 360° URL + a public `visitorStory` distinct from the internal `description`), `Facility`, `MapZone`, `FairEvent`.
- **Vendor pipeline** — `VendorProfile`, `VendorProductImage`, `Application`, `Booking`.
- **Social** — `UserFollow` (asymmetric; mutual follow gates chat + live location), `Conversation` + `Message`, `Reaction`, `InviteLink`, `UserPin`.
- **Sponsor** — `SponsorBanner`, `BannerImpression`.
- **Ops** — `VendorClick`, `AdminLog`, `AboutUsContent`, `SiteContactInfo`.

Choices worth flagging:

- **Polymorphic location on `FairEvent`** (`locationType ∈ {house, facility, zone}` + `locationId`) — one events table, three possible parents.
- **GeoJSON-as-string** for `MapZone.geometry` because SQLite has no native JSON type; parsed on read.
- **Bilingual fields at the column level** (`*_az` / `*_en`) for `Fair`, `MapZone`, `FairEvent`, `AboutUsContent` — cheap and simple for two languages.
- **Normalized participant order** on `Conversation` (`participant1 < participant2`) so a pair maps to exactly one row.
- **`Reaction.seenAt` as soft-delete** (null = unread) — keeps history for multi-device sync.
- **`User.isSharingLocation` defaults true** — the whole point of a festival app is "find each other"; users who want privacy opt out.
- **Nullable `userId` on analytics tables** (`VendorClick`, `BannerImpression`) — anonymous foot traffic must count.
- **Personal pins are server-side** so "where I parked" survives a device change or a cleared localStorage.

## Key flows

**Visitor on the map.** `GET /api/public/map` returns the active fair + houses + facilities + visible zones in one call. Mapbox renders markers, facility icons, and polygon zones. Tapping a house fires a `VendorClick` (`popup_open`) and shows `visitorStory`, photo, 360° button, directions button (also tracked), and any `FairEvent` rows live right now at that location. A global "What's On Now" panel tickers across the app.

**Friends & live location.** Invite link → mutual `UserFollow` → unlocks chat + live location. Browser geolocation pushes to the server, gated on `isSharingLocation`; Socket.io fans out to mutual followers' sockets. "Route to friend" calls Mapbox Directions on the client. Reactions are a single emoji, soft-delete via `seenAt`, surfaced as a toast.

**Vendor application pipeline.**
```
user signs up
  → fills /applications/new (personal data + ID + rules + payment acceptance,
                             picks fair, picks an enabled house)
  → Application(status=pending)
  → admin reviews
      ├─ reject  → status=rejected, rejectionReason
      └─ approve → Application(status=approved) + Booking(pending)
                   and the user is upgraded to role=vendor
```
The applicant fields on `Application` are nullable so older map-only applications keep displaying without a backfill.

**Admin running the fair.** A tabbed `/admin` console for fairs, map (houses + facilities + panoramas), zones, events, banners, QR, application review, users, analytics, About Us, contact info, and an audit log.

## Frontend

- `react-router` with role-gated `ProtectedRoute` (`requiredRole` ladders user≤vendor≤admin; `exactRole` matches one; `allowMustChangePassword` lets the password-change screen through).
- Three portal shells: public site, `/profile/*` user portal, `/vendor/*` vendor portal, `/admin/*` admin console — the user and vendor portals share a sidebar layout.
- **Handwritten CSS, no UI library.** Design tokens in [frontend/src/styles/index.css](frontend/src/styles/index.css): festive primary palette (warm yellow `#FFD166`, sky blue `#06BEE1`, mint, coral), `Fraunces` for editorial headings, `Inter Tight` for UI. A separate winter palette is kept so a fair can swap theme. Editorial "FestivKids" admin theme in `admin-design-system.css`.
- **i18n** is AZ (default) + EN end to end. User language preference is stored on `User.preferredLanguage` server-side and mirrored to `localStorage`; server wins for logged-in users.

## Backend

- Express entry at [backend/src/index.ts](backend/src/index.ts): helmet, CORS gated to `FRONTEND_URL`, `express-rate-limit` on `/api/*`, sessions for OAuth state, JWT for stateless REST/WS auth, bcrypt for passwords.
- Prisma is the source of truth. Dev uses `prisma db push` (no migrations folder committed). First admin is seeded on boot from env.
- Explicit indexes on every hot read path (`(fairId, startTime)`, `(placement, isActive, startsAt, endsAt)`, `(recipientId, createdAt desc)`, …).
- Cloudinary uploads degrade gracefully if env vars are blank.

### Deploy-time media (not in git)

Four large assets under `frontend/public/` are gitignored and exist only on dev machines: `Charityfairmp4.mp4`, `Chertovo_koleso.webm`, `svetlee_background.mp4`, `fevvareler4.jpg`. Nothing in the code references them — their URLs live in database content (fair gallery/recap fields edited via FairManagement). **Before any deploy whose DB references these paths, host them on Cloudinary (or another CDN) and update the stored URLs**, or the archive pages will serve 404s.

## Analytics

First-party only — no third-party SDK.

- **Vendor engagement** — `VendorClick` for `popup_open` and `directions`, surfaced as most-clicked houses, directions per house, and a time series.
- **Sponsor performance** — `BannerImpression` rows split by `eventType` (`impression` / `click`). CTR is a group-by, not a second table.

## Non-goals

- Not a ticketing platform — no paid entry.
- Not an open marketplace — vendor onboarding is gated by admin-reviewed applications.
- Not a generic CMS — admin editing is scoped to a fixed set of known surfaces.
