-- Migration: 20260716103706_prize_wall_redemptions_security
-- Applied to production: 2026-07-16
-- Captured retroactively 2026-08-09 from live schema introspection.
-- DO NOT re-apply. Register with CLI:
--   npx supabase migration repair --status applied 20260716103706

-- Drop and fully recreate prize_wall_redemptions with the canonical live schema.
-- The original 20260715 version had a different column layout (prize_points_spent,
-- redeemed_at, fulfilled_at, fulfilled_by columns). The live schema uses:
-- points_deducted, claim_code, expires_at, claimed_at, claimed_by, voided_at, voided_by.

DROP TABLE IF EXISTS prize_wall_redemptions CASCADE;

CREATE TABLE prize_wall_redemptions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       uuid        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  store_id        uuid        REFERENCES stores(id) ON DELETE SET NULL,
  item_id         uuid        NOT NULL REFERENCES prize_wall_items(id) ON DELETE RESTRICT,
  claim_code      text        NOT NULL,
  status          text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'voided', 'expired')),
  points_deducted integer     NOT NULL,
  item_name       text        NOT NULL,
  item_retail_value numeric,
  expires_at      timestamptz NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at      timestamptz NOT NULL DEFAULT now(),
  claimed_at      timestamptz,
  claimed_by      uuid        REFERENCES players(id) ON DELETE SET NULL,
  voided_at       timestamptz,
  voided_by       uuid        REFERENCES players(id) ON DELETE SET NULL,
  void_reason     text
);

ALTER TABLE prize_wall_redemptions ENABLE ROW LEVEL SECURITY;

-- Players read their own redemptions
CREATE POLICY "players_read_own_redemptions"
  ON prize_wall_redemptions
  FOR SELECT
  TO authenticated
  USING (
    player_id = (
      SELECT id FROM players
      WHERE clerk_user_id = auth.jwt() ->> 'sub'
      LIMIT 1
    )
  );

CREATE INDEX IF NOT EXISTS idx_prize_wall_redemptions_player_id
  ON prize_wall_redemptions (player_id);

CREATE INDEX IF NOT EXISTS idx_prize_wall_redemptions_store_id
  ON prize_wall_redemptions (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prize_wall_redemptions_claim_code
  ON prize_wall_redemptions (claim_code);
