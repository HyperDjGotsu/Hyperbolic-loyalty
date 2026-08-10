-- Migration: 20260717003340_phase2_foundational_data_model
-- Applied to production: 2026-07-17
-- Captured retroactively 2026-08-09 from live schema introspection.
-- DO NOT re-apply. Register with CLI:
--   npx supabase migration repair --status applied 20260717003340

-- seasons: named competitive seasons (planned → active → completed)
CREATE TABLE IF NOT EXISTS seasons (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  description text,
  status      text        NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'active', 'completed')),
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_by  uuid        REFERENCES app_users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seasons_public_read"
  ON seasons FOR SELECT USING (true);

-- prize_wall_items: add fulfillment_store_id (which store fulfills network prizes)
ALTER TABLE prize_wall_items
  ADD COLUMN IF NOT EXISTS fulfillment_store_id uuid REFERENCES stores(id) ON DELETE SET NULL;

-- banners: add store_id for store-scoped banners
ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES stores(id) ON DELETE SET NULL;

-- xp_ledger: add season_id for season-scoped XP attribution
ALTER TABLE xp_ledger
  ADD COLUMN IF NOT EXISTS season_id uuid REFERENCES seasons(id) ON DELETE SET NULL;
