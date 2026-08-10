-- Migration: 20260716190155_multi_store_foundation
-- Applied to production: 2026-07-16
-- Captured retroactively 2026-08-09 from live schema introspection.
-- DO NOT re-apply. Register with CLI:
--   npx supabase migration repair --status applied 20260716190155

-- Add multi-store columns to stores table
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS slug       text,
  ADD COLUMN IF NOT EXISTS is_flagship boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ical_url   text,
  ADD COLUMN IF NOT EXISTS address    text,
  ADD COLUMN IF NOT EXISTS phone      text,
  ADD COLUMN IF NOT EXISTS currency_name text NOT NULL DEFAULT 'Points',
  ADD COLUMN IF NOT EXISTS currency_icon text NOT NULL DEFAULT '⭐';

-- Add managed_store_id to players (links a player to the store they manage)
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS managed_store_id uuid REFERENCES stores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_players_managed_store_id
  ON players (managed_store_id);
