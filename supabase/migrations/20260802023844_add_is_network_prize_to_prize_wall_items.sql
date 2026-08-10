-- Migration: 20260802023844_add_is_network_prize_to_prize_wall_items
-- Applied to production: 2026-08-02
-- Captured retroactively 2026-08-09 from live schema introspection.
-- DO NOT re-apply. Register with CLI:
--   npx supabase migration repair --status applied 20260802023844

-- is_network_prize: when true, item is available at all stores in the network
-- (not restricted to the store_id it belongs to).
-- Confirmed live: column is NOT NULL DEFAULT false (from OpenAPI spec).
ALTER TABLE prize_wall_items
  ADD COLUMN IF NOT EXISTS is_network_prize boolean NOT NULL DEFAULT false;
