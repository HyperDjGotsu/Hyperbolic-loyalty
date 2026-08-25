-- Adds dedup_key to notifications to prevent duplicate expiry/event notifications.
-- The unique index uses a partial index (WHERE dedup_key IS NOT NULL) so existing
-- rows with NULL dedup_key are unaffected.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS dedup_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedup_key_idx
  ON notifications (dedup_key) WHERE dedup_key IS NOT NULL;
