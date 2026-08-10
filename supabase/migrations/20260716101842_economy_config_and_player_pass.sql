-- Migration: 20260716101842_economy_config_and_player_pass
-- Applied to production: 2026-07-16
-- Captured retroactively 2026-08-09 from live schema introspection.
-- DO NOT re-apply. Register with CLI:
--   npx supabase migration repair --status applied 20260716101842

-- economy_config: versioned JSON blobs for XP economy tuning
CREATE TABLE IF NOT EXISTS economy_config (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  version    integer     NOT NULL DEFAULT 1,
  config     jsonb       NOT NULL,
  rationale  text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

ALTER TABLE economy_config ENABLE ROW LEVEL SECURITY;

-- Only service_role writes; no direct authenticated reads needed
-- (API routes use supabaseAdmin to read config)

-- player_pass_subscriptions: tracks Pass tier subscriptions per player
CREATE TABLE IF NOT EXISTS player_pass_subscriptions (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id                   uuid        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  home_store_id               uuid        REFERENCES stores(id) ON DELETE SET NULL,
  tier                        text        NOT NULL,
  status                      text        NOT NULL DEFAULT 'active',
  billing_frequency           text        NOT NULL DEFAULT 'monthly',
  recurring_amount            numeric     NOT NULL,
  started_at                  timestamptz NOT NULL DEFAULT now(),
  next_renewal_at             timestamptz,
  cancelled_at                timestamptz,
  diamond_entry_used_this_month boolean   NOT NULL DEFAULT false,
  diamond_entry_reset_at      timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE player_pass_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_player_pass_subscriptions_player_id
  ON player_pass_subscriptions (player_id);
