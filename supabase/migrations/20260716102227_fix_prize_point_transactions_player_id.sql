-- Migration: 20260716102227_fix_prize_point_transactions_player_id
-- Applied to production: 2026-07-16
-- Captured retroactively 2026-08-09 from live schema introspection.
-- DO NOT re-apply. Register with CLI:
--   npx supabase migration repair --status applied 20260716102227

-- Rename user_id → player_id and re-anchor FK to players(id)
ALTER TABLE prize_point_transactions
  RENAME COLUMN user_id TO player_id;

-- Drop old FK to auth.users
ALTER TABLE prize_point_transactions
  DROP CONSTRAINT IF EXISTS prize_point_transactions_user_id_fkey;

-- Add new FK to players(id)
ALTER TABLE prize_point_transactions
  ADD CONSTRAINT prize_point_transactions_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

-- Rebuild indexes with new column name
DROP INDEX IF EXISTS prize_point_transactions_user_store_idx;
DROP INDEX IF EXISTS prize_point_transactions_store_created_at_idx;

CREATE INDEX IF NOT EXISTS idx_prize_point_transactions_player_store
  ON prize_point_transactions (player_id, store_id);

CREATE INDEX IF NOT EXISTS idx_prize_point_transactions_store_created
  ON prize_point_transactions (store_id, created_at DESC);

-- Drop old RLS policies that referenced user_id / is_staff
DROP POLICY IF EXISTS "Users can read their own prize point transactions" ON prize_point_transactions;
DROP POLICY IF EXISTS "Staff can read prize point transactions for managed stores" ON prize_point_transactions;

-- New player-based read policy (service_role handles all writes)
CREATE POLICY "players_read_own_prize_transactions"
  ON prize_point_transactions
  FOR SELECT
  TO authenticated
  USING (
    player_id = (
      SELECT id FROM players
      WHERE clerk_user_id = auth.jwt() ->> 'sub'
      LIMIT 1
    )
  );

-- Recreate get_user_point_balance with player_id parameter and optional store_id
-- (store_id = NULL → sum across all stores, i.e. network-wide balance)
CREATE OR REPLACE FUNCTION get_user_point_balance(p_player_id uuid, p_store_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(SUM(amount), 0)::integer
  FROM prize_point_transactions
  WHERE player_id = p_player_id
    AND (p_store_id IS NULL OR store_id = p_store_id);
$$;
