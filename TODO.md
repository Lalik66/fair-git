# TODO — known issues deliberately deferred

Tracked here so they don't get lost; none block current work.
(Noted during the July 2026 commit-hygiene pass.)

## Dependencies

- **`@types/qrcode` is in `dependencies`** ([backend/package.json](backend/package.json));
  it belongs in `devDependencies`. Type stubs ship to production installs.
- **`npm audit` reports vulnerabilities** in both `backend/` and `frontend/`.
  Triage and update; Prisma also suggests a client upgrade.

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
