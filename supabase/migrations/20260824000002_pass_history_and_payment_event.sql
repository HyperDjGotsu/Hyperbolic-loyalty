-- PRECONDITION: Before running, verify no live data references stripe_invoice_id:
--   SELECT COUNT(*) FROM players WHERE stripe_invoice_id IS NOT NULL;
-- If count > 0, migrate the values first before renaming.

-- Drop legacy pass_history table if it has the old payment-tracking schema
-- (identified by the presence of stripe_invoice_id column — old design).
-- Verified pre-migration: 0 rows in legacy table.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pass_history'
      AND column_name = 'stripe_invoice_id'
  ) THEN
    DROP TABLE pass_history;
  END IF;
END $$;

-- Audit log for all membership state transitions.
-- One row per operation; mutation_id UNIQUE prevents double-apply.
CREATE TABLE IF NOT EXISTS pass_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id        UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  changed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_type      TEXT NOT NULL CHECK (change_type IN (
                     'grant','renew','change_tier','cancel_renewal',
                     'revoke','restore','expire','trial_claim'
                   )),
  old_tier         TEXT,
  new_tier         TEXT,
  old_status       TEXT,
  new_status       TEXT,
  old_expires_at   TIMESTAMPTZ,
  new_expires_at   TIMESTAMPTZ,
  actor_type       TEXT NOT NULL CHECK (actor_type IN ('staff','network_admin','system','player')),
  actor_clerk_id   TEXT,
  actor_store_id   UUID,
  mutation_id      UUID NOT NULL UNIQUE,
  mutation_params  JSONB NOT NULL,
  payment_event_id TEXT,
  notes            TEXT
);

-- Prevent duplicate payment event IDs (future-proof for webhooks).
-- Partial index: NULL payment_event_id rows are excluded.
CREATE UNIQUE INDEX IF NOT EXISTS pass_history_payment_event_id_idx
  ON pass_history (payment_event_id) WHERE payment_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS pass_history_player_id_idx
  ON pass_history (player_id, changed_at DESC);

-- Rename legacy stripe_invoice_id column if it exists on players table.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'players'
      AND column_name = 'stripe_invoice_id'
  ) THEN
    ALTER TABLE players RENAME COLUMN stripe_invoice_id TO payment_event_id;
  END IF;
END $$;
