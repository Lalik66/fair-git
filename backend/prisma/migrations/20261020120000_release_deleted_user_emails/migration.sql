-- Release the email (and Google link / password) of users that were
-- soft-deleted before admin deletion started doing this itself.
-- Their unique email stayed on the row, so the same address could never log
-- in, sign up with Google, or be re-created again. Rewrite it to the same
-- tombstone format the app now uses: deleted_<id>_<original email>.
UPDATE "users"
SET "email"         = 'deleted_' || "id" || '_' || "email",
    "google_id"     = NULL,
    "password_hash" = NULL,
    "updated_at"    = CURRENT_TIMESTAMP
WHERE "deleted_at" IS NOT NULL
  AND "email" NOT LIKE 'deleted\_' || "id" || '\_%';
