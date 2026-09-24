# TODO — known issues deliberately deferred

Tracked here so they don't get lost; none block current work.
(Noted during the July 2026 commit-hygiene pass.)

## Dependencies

- ~~**`@types/qrcode` is in `dependencies`**~~ — fixed (Sep 2026 audit pass):
  moved to `devDependencies`; frontend `@types/mapbox__mapbox-gl-draw` likewise;
  unused `zustand` removed.
- **`npm audit`**: the non-breaking fixes are applied (axios bumped to the
  patched 1.20.x, `npm audit fix` run in both workspaces). Remaining advisories
  require **breaking major upgrades** deliberately deferred so they can be tested
  in isolation: `react-router-dom` v7, `jspdf` (→ dompurify), `socket.io-client`,
  `vitest` 3.x (frontend); `nodemailer` 10.x, `cloudinary` v2, `multer` 2.x,
  `uuid` v14 (backend). Plan these as a dedicated upgrade PR.

## Security hardening — deferred (larger changes)

- **JWT delivered in the OAuth redirect URL query string**
  ([backend/src/routes/auth.ts](backend/src/routes/auth.ts) `/google/callback`).
  Leaks via history/`Referer`/proxy logs. Fix properly with a short-lived
  single-use exchange code or an httpOnly cookie handoff (frontend currently
  reads the token from localStorage for the `Authorization` header, so this is
  an auth-architecture change).
- **No token revocation / logout is client-side only.** Add a `tokenVersion`
  claim (or refresh-token model) so logout/compromise can invalidate outstanding
  tokens before their 24h expiry. Account deactivation/role changes are already
  enforced per-request.

## Code duplication

- **Duplicated admin-search shell logic**: the Cmd/Ctrl+K keydown handler and
  the `getSearchPlaceholder()` route→placeholder map exist verbatim in both
  [frontend/src/pages/AdminDashboard.tsx](frontend/src/pages/AdminDashboard.tsx)
  and [frontend/src/components/admin/AdminLayout.tsx](frontend/src/components/admin/AdminLayout.tsx).
  The two files look like parallel implementations of the same admin shell —
  consolidate (or delete the unused one) so the shortcut can't double-fire if
  both ever mount.

## Performance

- **No frontend code-splitting**: vite build emits a single ~3.5 MB minified
  chunk (~1 MB gzip). Add dynamic `import()` route splitting or
  `build.rollupOptions.output.manualChunks`.
- **Brand logo is an auto-trace**: `Remove_child_8.svg` was SVGO-optimized
  from 1.27 MB to 302 KB, but a proper hand-drawn vector export would be far
  smaller and cleaner than any traced version.

## Repository

- **A 9.1 MB webm blob lives permanently in history**: `Charityfairweb.webm`
  was committed in `c397252`, which is already on `origin/master`, so removing
  it would require history rewriting plus a force-push. Accepted as-is; noted
  so nobody re-discovers it.
- **Deploy-time media** (3 videos + 1 large photo) are gitignored and exist
  only on dev machines — see the "Deploy-time media (not in git)" section of
  [DESIGN.md](DESIGN.md) before deploying.
