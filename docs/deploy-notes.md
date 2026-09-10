# Deploy Notes

## One-time decode migration: double-encoded stored text

**Status:** required before any dev data is promoted toward production.

### Background

We moved from encode-on-store to store-raw for user-supplied text. Output
encoding is now the renderer's job — the frontend displays this content as
plain-text JSX, so React escapes it on render. Because of that switch, any rows
written while the old encode-on-store logic was live are HTML-entity-encoded in
the database (e.g. `&amp;` and `&lt;` are stored literally). Those rows now
double-render: the stored entities get escaped a second time on display, so
users see `&amp;` / `&lt;` instead of `&` / `<`.

### Affected tables / columns

- **Review comment** — `comment` column (written in `backend/src/routes/reviews.ts`).
  Old logic: `escapeHtml`-on-store.
- **Review vendor reply** — `vendorReply` column (same route/table as above).
- **Chat message content** — message `content` (written in
  `backend/src/services/messageService.ts` via the old
  `sanitizeMessageContent` encode-on-store logic).

### Action required

Run a **one-time decode migration** over the existing rows in the columns above
(review `comment`, review `vendorReply`, and chat message `content`),
HTML-entity-decoding the stored values so they hold raw text again. This must
run **before any dev data is promoted toward production**; otherwise the
double-encoded rows will render incorrectly.

Only pre-switch rows are affected. Rows written under the current store-raw
logic are already correct and should not be decoded again — scope the migration
carefully (e.g. by created-at cutoff or by detecting entity-encoded content) so
it is not applied twice.
