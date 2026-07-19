# SOS Emergency Button — Implementation Plan

Source: `SOS.docx` spec (floating SOS button, geolocation, 10-second voice
message, real-time security alert, incident history). This plan adapts the
spec to the existing codebase and trims what a web app cannot honestly
deliver.

## Reality check vs. the spec

| Spec item | Verdict |
|---|---|
| Floating button on all screens | ✅ Keep |
| Geolocation with coordinates | ✅ Keep (browser gives best-effort accuracy; ±5 m cannot be guaranteed) |
| 10-second voice message | ✅ Keep, but optional — never block the alert on mic permission |
| Real-time alert via WebSocket | ✅ Keep — Socket.io server with JWT auth already exists (`backend/src/websocket/index.ts`) |
| Incident history with statuses | ✅ Keep (ACTIVE / RESOLVED / FALSE_ALARM) |
| Works with locked screen (foreground service) | ❌ Skip — impossible in a web app; a Service Worker cannot capture location/audio from a locked phone. Would require a native app. |
| Twilio auto-call | ❌ Skip for v1 (email alert to admins is nearly free instead — SMTP transport is live) |
| Google Maps geocoding to street address | ❌ Skip — security sees the incident as a pin on the fair map, which is more useful on fairgrounds than a street address |

## What already exists to reuse

- **WebSocket**: authenticated Socket.io (`websocket/index.ts`), user rooms,
  `setSocketIO` injection pattern (see `routes/messages.ts`).
- **Uploads**: `middleware/upload.ts` — multer + Cloudinary with local-disk
  fallback; needs a small audio variant.
- **Map**: mapbox-gl already in frontend deps (`MapPanel`).
- **Geolocation**: `hooks/useLocationTracking.ts` shows the working
  getCurrentPosition/watchPosition options for this app.
- **Admin shell**: sidebar nav + routes in `pages/AdminDashboard.tsx`.
- **Email**: `utils/notifications.ts` now delivers via SMTP.
- **Audit log**: `AdminLog` model for resolution actions.

## Open decisions (recommendations in bold)

1. Anonymous SOS? **Yes** — emergencies must not require login
   (`userId` nullable, `optionalAuth`).
2. Who is "security"? **Reuse the `admin` role for v1**; a dedicated
   `security` role is a later refinement.
3. Accidental-press protection? **Tap → 5-second cancellable countdown**
   ("Sending alert in 5…4…") rather than hold-to-press — discoverable and
   panic-friendly, still stops pocket taps.
4. Voice message? **Optional step after the alert is already sent** — the
   alert must never wait on a mic permission dialog.

## Phase 1 — Database (0.5 day)

`SosIncident` model in `backend/prisma/schema.prisma` (SQLite: status is a
plain string, no enums — same convention as `Review.status`):

```prisma
model SosIncident {
  id             String    @id @default(uuid())
  userId         String?   @map("user_id")          // null = anonymous visitor
  latitude       Float?                              // null = location denied/timeout
  longitude      Float?
  accuracy       Float?                              // meters, as reported by browser
  audioUrl       String?   @map("audio_url")         // optional voice message
  status         String    @default("ACTIVE")        // ACTIVE | RESOLVED | FALSE_ALARM
  resolutionNote String?   @map("resolution_note")
  resolvedById   String?   @map("resolved_by_id")
  resolvedAt     DateTime? @map("resolved_at")
  createdAt      DateTime  @default(now()) @map("created_at")

  user       User? @relation("SosUser", fields: [userId], references: [id], onDelete: SetNull)
  resolvedBy User? @relation("SosResolver", fields: [resolvedById], references: [id], onDelete: SetNull)

  @@map("sos_incidents")
  @@index([status, createdAt])
}
```

`npx prisma db push` in the main `backend/` (no migrations in this project).

## Phase 2 — Backend (1.5–2 days)

1. **Audio upload** (`middleware/upload.ts`): add `audioUpload` multer
   instance — mimetypes `audio/webm`, `audio/ogg`, `audio/mp4`, `audio/mpeg`;
   ~2 MB limit; same Cloudinary/local switch as images.
2. **`routes/sos.ts`** (new, registered as `/api/sos` in `index.ts`):
   - `POST /api/sos` — `optionalAuth`, multipart (`audio` file optional),
     body: lat/lng/accuracy (all optional — an alert with no location is
     still an alert). Rate limit ~3 per 10 min per IP (stops pranks, doesn't
     block a genuine repeat call). Creates the incident, emits the socket
     event, fires an email alert to admins via `notifications.ts`.
   - `GET /api/sos/:id` — poll endpoint so the sender's phone can show
     "security has seen / resolved your alert".
3. **Admin endpoints** (in `routes/admin.ts`, same file-pattern as review
   moderation):
   - `GET /api/admin/sos?status=ACTIVE|RESOLVED|FALSE_ALARM|all` — newest
     first + `activeCount` for the sidebar badge.
   - `PATCH /api/admin/sos/:id` — body `{ action: 'resolve' | 'false_alarm',
     note? }`; stamps `resolvedBy/resolvedAt`, writes an `AdminLog` entry,
     emits `sos:updated`.
4. **WebSocket** (`websocket/index.ts`):
   - Extend the auth middleware's user select with `role`; admins also join
     a `security` room on connect.
   - `routes/sos.ts` gets the `io` instance via the existing `setSocketIO`
     pattern; emits `sos:new` (full incident payload) and `sos:updated` to
     `security`, and `sos:status` to `user:<senderId>` when resolved.

## Phase 3 — Frontend: SOS button & flow (2 days)

`components/SosButton.tsx` + CSS, mounted once in `App.tsx` so it floats on
every visitor page (hidden inside admin/vendor portals):

1. Pulsing floating button (bottom corner, above the fox mascot z-order).
2. Tap → full-screen confirm sheet: "Send emergency alert to fair security?"
   with a 5-second auto-send countdown and a big Cancel.
3. On send: `navigator.geolocation.getCurrentPosition`
   (`enableHighAccuracy: true`, 10 s timeout) — if denied or timed out, send
   the alert **without** coordinates rather than failing.
4. After the alert is accepted: "Alert sent — security has been notified"
   state, plus an optional "Add a 10-second voice message" button →
   MediaRecorder, auto-stop at 10 s, upload attaches to the incident
   (`PATCH`/second multipart POST to `/api/sos/:id/audio`).
5. Live status: poll `GET /api/sos/:id` (or reuse the socket) to flip the
   UI to "Security is responding" / "Resolved".

## Phase 4 — Security dashboard (2 days)

`pages/SosDashboard.tsx` at `/admin/sos` (+ sidebar item "SOS Alerts" with
red active-count badge, same wiring as the Feedback Inbox):

1. Socket subscription to `sos:new` / `sos:updated`; also initial fetch.
2. New-alert attention: looping alert sound + browser `Notification` (with
   permission request) + row flash.
3. Incident card: time, sender (name or "Anonymous"), accuracy, mini
   mapbox-gl map with the incident pin over the fair map, audio `<audio>`
   player when a voice message exists.
4. Actions: **Resolve** / **False alarm**, each with an optional note.
5. History tab (RESOLVED / FALSE_ALARM) with who resolved and when.

## Phase 5 — i18n, polish, verification (1 day)

- az/en keys for every string (both button flow and dashboard).
- Permission-denied UX copy for mic and location.
- End-to-end test: trigger SOS from a visitor session → alert appears on
  dashboard in real time → resolve → sender sees "Resolved".
- `tsc --noEmit` both apps.

## Estimate

| Phase | Days |
|---|---|
| Database | 0.5 |
| Backend API + WebSocket | 1.5–2 |
| SOS button & flow | 2 |
| Security dashboard | 2 |
| i18n + verification | 1 |
| **Total** | **7–7.5 days** (vs. 11–15 in the spec, thanks to existing infra) |

## Out of scope for v1 (possible later)

- Twilio programmable voice call to a security phone.
- Dedicated `security` user role with its own restricted portal.
- Reverse geocoding of coordinates to addresses.
- Native app / locked-screen support (not achievable on the web).
