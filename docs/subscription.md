Yes — you can build a popup like the Sneaker Con one (image left, signup form right) using your Christmas fair photo instead of the sneakers image.

> **Verified against the codebase (2026-09-07).** Design tokens, SOS gating, phone pattern, i18n structure, and the source image all check out. Concrete paths, z-index, and backend details below have been corrected to match the real repo.

## Best strategy (recommended)

Use a **single reusable modal component** plus a **custom hook** for triggers and frequency limits.

| Piece | Approach |
|--------|----------|
| **UI** | New `MarketingSignupModal` — split layout like your screenshot |
| **Image** | Copy `for_marketing.jpg` → `frontend/public/images/marketing/for_marketing.jpg` (source is already ~53KB — no compression needed; create the `images/marketing/` folders since `public/` is currently flat) |
| **Where it mounts** | `App.tsx`, on **public visitor pages only** (same gating as `SosButton`: `{!isAuthShell && !isPortalRoute && ...}` — hides on `/login`, `/oauth-callback`, `/admin/*`, `/vendor/*`, `/profile/*`) |
| **Triggers** | Combined hook `useMarketingPopupTriggers()` with **OR logic** + **frequency cap** |
| **Persistence** | `localStorage`: `marketing_popup_dismissed_at`, `marketing_popup_submitted`, `marketing_popup_shown_session` |
| **Copy & form** | Bilingual AZ/EN via `i18n`; phone field like `VendorApplicationForm` (`frontend/src/pages/VendorApplicationForm.tsx`, `.vaf-phone`, `PHONE_CODES = ['+994','+90','+995','+7']`, default `+994`) |
| **Backend** | New `POST /api/public/marketing-leads` + Prisma `MarketingLead` model (SQLite; phone, consentAccepted, source, preferredLanguage, createdAt) |

### Trigger behavior (realistic on the web)

| Trigger | Works? | How |
|---------|--------|-----|
| **Inactive for a while** | ✅ | Reset timer on mouse/keyboard/scroll/touch; show after ~45–60s |
| **Tab switch / app background** | ✅ | `document.visibilitychange` → when user returns after ≥5s away |
| **Rapid scroll up** | ✅ | Track scroll velocity; upward fling near page top |
| **Exit intent (desktop)** | ✅ | `mouseleave` when cursor leaves viewport at top |
| **Tap browser address bar** | ❌ | Browsers don’t expose this to websites — use scroll-up + inactivity instead |

### Frequency rules (avoid annoyance)

- Max **once per session**
- If dismissed: don’t show again for **7 days**
- If submitted: **never** show again
- Don’t show in first **15 seconds** after page load
- Don’t show while another modal is open (SOS overlay, AI chat, panorama, etc.)

### Design direction

Match the **Sneaker Con layout** (split card, dimmed backdrop, X, primary CTA, “No thanks”), but style it with **FestivKids tokens** so it fits Fair Marketplace — not a black Sneaker Con clone. Verified tokens in `frontend/src/styles/index.css`:
- Headings: `--font-headings` = `Fraunces`
- Body: `--font-primary` = `Inter Tight`
- Accents: `--color-coral` (#FF6B6B), `--color-sky-blue` (#06BEE1)

**Stacking / z-index** — the app already uses: AIChat 100, SOS FAB 900, SOS overlay 1000, WhatsOnNow 1000, MapSelection 2000, Panorama 9999. Put the marketing modal at **~1500** (above the SOS button/overlay, below MapSelection and Panorama). Do not use 850 — that would sit *below* the SOS button.

---

## Agent prompt (copy & paste)

```markdown
# Task: Marketing signup popup (Sneaker Con–style) for Fair Marketplace

## Goal
Implement a lead-capture marketing popup similar to the Sneaker Con reference:
- Left side: full-height promotional image
- Right side: headline, phone input, consent text, primary CTA ("Sign me up"), dismiss link ("No thanks"), close (×)
- Use the user's image: `C:\Users\User\Downloads\for_marketing.jpg` (Christmas fair installation photo)
- Adapt copy for FestivKids / Fair Marketplace (event announcements, fair dates, exclusive content) — NOT sneakers

## Reference
- Layout reference screenshot: Sneaker Con footer popup (split modal, phone capture, black pill CTA)
- Marketing image: `C:\Users\User\Downloads\for_marketing.jpg`

## Architecture (preferred strategy)

### 1. Component
Create:
- `frontend/src/components/MarketingSignupModal.tsx`
- `frontend/src/components/MarketingSignupModal.css`

Props: `isOpen`, `onClose`, `onSubmit`, `onDismiss`

Layout:
- Fixed overlay (`rgba` backdrop, **z-index ~1500** — above SOS FAB/overlay (900/1000), below MapSelection (2000) & Panorama (9999))
- Centered card, max-width ~900px, rounded corners, shadow
- Desktop: 50/50 grid (image | form)
- Mobile: image on top (fixed height ~200px, object-fit: cover), form below
- Accessible: focus trap, Escape to close, aria-modal, aria-labelledby

Form fields:
- Phone number with country code selector (reuse pattern from `frontend/src/pages/VendorApplicationForm.tsx` / `.vaf-phone` — a `<select>` of `PHONE_CODES = ['+994','+90','+995','+7']` next to a `type="tel"` input, default `+994` for Azerbaijan)
- Consent microcopy with links to `/about` or existing Privacy/Terms if available (placeholder `#` if not)
- Primary button: "SIGN ME UP!" / AZ equivalent
- Secondary text link: "NO, THANKS"

### 2. Image asset
- Copy `C:\Users\User\Downloads\for_marketing.jpg` into the repo at `frontend/public/images/marketing/for_marketing.jpg`
- **Create the `images/` and `images/marketing/` folders first** — `frontend/public/` is currently flat (no subdirectories)
- Source is already ~53KB, so **no compression needed**
- Reference in component as `/images/marketing/for_marketing.jpg`

### 3. Trigger hook
Create `frontend/src/hooks/useMarketingPopupTriggers.ts`

Show modal when ANY trigger fires (OR logic), subject to frequency rules:

**Triggers:**
1. **Inactivity** — no mouse, keyboard, scroll, or touch for 45 seconds (reset timer on activity)
2. **Tab return** — `visibilitychange`: user left tab hidden for ≥5s, then returned
3. **Rapid scroll up** — detect upward scroll with velocity threshold near top of page (mobile-friendly exit-intent proxy)
4. **Desktop exit intent** — `mouseleave` on `document` when `clientY <= 0`

**Do NOT** attempt to detect "tap on browser address bar" (not possible in web apps).

**Frequency / suppression (localStorage):**
- `marketing_popup_submitted` → never show again
- `marketing_popup_dismissed_at` → suppress for 7 days
- `marketing_popup_shown_session` → max once per browser session
- Minimum 15 seconds after initial page load before any trigger can fire
- Do not show on `/admin/*`, `/vendor/*`, `/profile/*`, `/login`, `/oauth-callback` (mirror SosButton gating in App.tsx)

### 4. Mount point
In `frontend/src/App.tsx` (inside `AppContent`), mount `<MarketingSignupModal />` on public visitor routes only using the **same gate as `<SosButton />`**: `{!isAuthShell && !isPortalRoute && <MarketingSignupModal ... />}`. (`isAuthShell` = `/login` or `/oauth-callback`; `isPortalRoute` = path starts with `/admin`, `/vendor`, or `/profile`.)

Wire hook at App level so triggers work across Home, About, Schedule, Map, etc.

### 5. Backend (minimal but real)
DB is **SQLite** (`provider = "sqlite"`). Follow the conventions of the closest precedent, `SiteFeedback` in `backend/prisma/schema.prisma` (uuid ids, snake_case columns via `@map()`, `@@map`, `@@index`).

Add Prisma model `MarketingLead`:
```prisma
model MarketingLead {
  id                String   @id @default(uuid())
  phone             String
  consentAccepted   Boolean  @default(false) @map("consent_accepted")
  source            String   @default("popup")
  preferredLanguage String?  @map("preferred_language")
  createdAt         DateTime @default(now()) @map("created_at")

  @@map("marketing_leads")
  @@index([createdAt])
}
```
Run `npx prisma migrate dev` after adding the model.

Add the endpoint by **mirroring `backend/src/routes/feedback.ts`** (the real precedent for a public POST form — `public.ts` is GET-only):
- Create `backend/src/routes/marketing-leads.ts` and mount in `backend/src/index.ts`: `app.use('/api/public/marketing-leads', marketingLeadsRoutes)`
- Reuse the `submitLimiter` pattern: **5 submissions / hour / IP** (`windowMs: 60*60*1000, max: 5`). The global limiter (1000/15min on `/api/*`) already applies too.
- **Manual validation** (express-validator is installed but unused in routes): check phone is a non-empty string of reasonable length/format, `consentAccepted === true`; return `400 { error }` on failure.
- Store lead with `prisma.marketingLead.create(...)` and return **201**.

Add frontend service method to the existing `publicApi` object in `frontend/src/services/api.ts` (base `http://localhost:3002/api`):
```ts
submitMarketingLead: async (payload: { phone: string; consentAccepted: boolean; preferredLanguage?: string }) => {
  const response = await api.post('/public/marketing-leads', payload);
  return response.data;
}
```

On success: set `marketing_popup_submitted`, close modal, optional toast.

### 6. i18n
Add a `marketingPopup` section to **both** `resources.en.translation` and `resources.az.translation` in `frontend/src/i18n/config.ts` (nested-object structure; access via `t('marketingPopup.title')`):
- title, phonePlaceholder, consent, cta, dismiss, closeAria, success, error

Example EN title: "Stay in the loop for fair announcements, seasonal events & exclusive content."

### 7. Design
- Read and follow `d:\fair-marketplace — design\.agents\skills\frontend-design\SKILL.md`
- Match existing Fair Marketplace / FestivKids design tokens from `frontend/src/styles/index.css` (`--font-headings` = Fraunces, `--font-primary` = Inter Tight, `--color-coral` #FF6B6B, `--color-sky-blue` #06BEE1)
- Layout inspired by Sneaker Con reference; visual styling should feel native to this app (warm, festive), not a generic black ecommerce popup

### 8. Edge cases
- Don't open if SOS overlay is active (check DOM or shared z-index/state if needed)
- Don't stack with other full-screen modals
- Handle submit loading/error states
- Respect `prefers-reduced-motion` for entrance animation

## Acceptance criteria
- [ ] Popup visually matches split-layout reference with user's fair marketing image
- [ ] Triggers: inactivity, tab return, rapid scroll up, desktop exit intent
- [ ] Frequency capped (session + 7-day dismiss + permanent after submit)
- [ ] Phone signup persists to backend
- [ ] Bilingual AZ/EN
- [ ] Only on public visitor pages
- [ ] Mobile responsive
- [ ] No linter errors

## Out of scope
- SMS provider integration (store lead only for now)
- Admin UI to view leads — **store-only, confirmed out of scope** (unlike the `SiteFeedback` admin inbox)
```

---

## Quick notes

1. **Copy the image into the project** — don’t reference `C:\Users\User\Downloads\...` in production code; create `frontend/public/images/marketing/` (currently no subfolders exist) and put it there. It's ~53KB, no compression needed.
2. **Address bar tap** isn’t detectable in a normal web app — the hook above covers the closest alternatives.
3. **z-index ~1500** for the modal overlay (above SOS 900/1000, below MapSelection 2000 & Panorama 9999). Don't use 850.
4. **Backend is SQLite + Express** — model after `SiteFeedback` / `feedback.ts`; run `npx prisma migrate dev` after adding the model.
5. **Run the app** after implementation with `npm run dev` from the project root and test triggers on `/` and `/about`.

