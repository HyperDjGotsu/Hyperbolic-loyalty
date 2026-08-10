-- Migration: 20260716234330_fix_store_names_add_pittsburg
-- Applied to production: 2026-07-16
-- Captured retroactively 2026-08-09 from live schema introspection.
-- DO NOT re-apply. Register with CLI:
--   npx supabase migration repair --status applied 20260716234330
--
-- Data-only migration: fix store slugs and names to match the live network.
-- Adds "Trade Emporium" (Pittsburg, CA) as a sixth store.

-- Set slugs on existing stores seeded by 20260629_circuit_multistore
UPDATE stores SET slug = 'games-of-martinez'       WHERE player_id_prefix = 'GOM'  AND slug IS NULL;
UPDATE stores SET slug = 'games-of-brentwood'      WHERE player_id_prefix = 'GOB'  AND slug IS NULL;
UPDATE stores SET slug = 'games-of-concord'        WHERE player_id_prefix = 'GOC'  AND slug IS NULL;
UPDATE stores SET slug = 'gamers-guild-pleasant-hill' WHERE player_id_prefix = 'GOPH' AND slug IS NULL;
UPDATE stores SET slug = 'trade-emporium'          WHERE player_id_prefix = 'TEM'  AND slug IS NULL;

-- Mark flagship store (Trade Emporium - Pittsburg)
UPDATE stores SET is_flagship = true WHERE player_id_prefix = 'TEM';
