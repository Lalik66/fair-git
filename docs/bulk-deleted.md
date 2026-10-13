Bulk delete polish**

Follow up on the bulk user delete feature. Keep changes small; don’t refactor unrelated admin UI.

**1. Button label (frontend)**  
In `frontend/src/pages/UserManagement.tsx`, show the count on the toolbar button, e.g. **“Delete selected (N)”** where `N = bulkDeletableIds.length`. Add/update i18n in `frontend/src/i18n/config.ts` (EN + AZ), e.g. `userAdmin.bulkDelete: 'Delete selected ({{count}})'` (adjust AZ similarly).

**2. Empty / partial batch (backend + frontend)**  
- **Backend** `POST /admin/users/bulk-delete` in `backend/src/routes/admin.ts`: after `updateMany`, if `result.count === 0`, respond with **400** and a clear error (e.g. `No users were deleted — they may already be deleted or ids were invalid`). If `result.count < ids.length`, still **200** but include `deletedCount`, `requestedCount: ids.length`, and optional `skippedCount` so the client can show a warning when not all selected rows were deleted.  
- **Frontend**: on success, if `skippedCount > 0` (or `deletedCount < bulkDeletableIds.length`), show a non-blocking message (success banner or `successMessage`) that some users were skipped. On 400, keep using `userAdmin.bulkDeleteFailed` or add a specific key.

**3. Server-side cap (backend)**  
Reject oversized batches: e.g. max **100** ids per request (constant at top of route or env `ADMIN_BULK_DELETE_MAX` default 100). Return **400** if exceeded. Document in a one-line comment near the route.

**4. Tests (backend)**  
In `backend/tests/` (same style as existing smoke/API tests), add coverage for `POST /api/admin/users/bulk-delete`:  
- **401/403** without admin auth (match how other admin routes are tested).  
- **400** for empty `userIds`, non-array, or over max length.  
- **Happy path** (if tests use a test DB/admin token): soft-delete 1–2 users, assert `deletedCount`, assert they no longer appear on `GET /admin/users` (or `deletedAt` set).  
Reuse existing test helpers; don’t duplicate auth setup.

**5. Do not change (unless you find a bug)**  
- Allowing bulk delete of **admin** users (same as single delete).  
- Single delete / deactivate flows.

**Done when**  
- Toolbar shows **Delete selected (N)**.  
- Zero deleted → 400 + clear UI error.  
- Partial batch → success + warning if applicable.  
- Cap enforced.  
- New tests pass with `npm test` in `backend`.  
- `npx tsc --noEmit` clean in frontend and backend.

Do **not** commit unless I ask.
