-- =============================================================================
-- Account Deletion: player_deletions audit table + cleanup RPC + nullable columns
-- =============================================================================
-- Safe to run on live production:
--   - CREATE TABLE / CREATE FUNCTION hold no locks on existing tables
--   - ALTER COLUMN DROP NOT NULL holds AccessExclusiveLock per table for
--     milliseconds only (no table rewrite)
-- Rollback SQL is at the bottom of this file.
-- =============================================================================

-- 1. player_deletions audit table
--    clerk_user_id is nullable: populated during deletion, NULLed after completion.
--    player_id is a dangling reference after deletion completes — retained as an
--    opaque audit key, not a live FK.

CREATE TABLE IF NOT EXISTS player_deletions (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id                 UUID        NOT NULL,
  clerk_user_id             TEXT,                          -- cleared on completion
  initiated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at              TIMESTAMPTZ,
  status                    TEXT        NOT NULL DEFAULT 'in_progress'
                            CHECK (status IN (
                              'in_progress',
                              'completed',
                              'failed_at_clerk',
                              'manual_review_required'
                            )),
  current_step              TEXT,
  error_message             TEXT,
  retry_count               INT         NOT NULL DEFAULT 0,
  last_retry_at             TIMESTAMPTZ,
  external_systems_notified TEXT[]      NOT NULL DEFAULT '{}',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_deletions_player_id_idx
  ON player_deletions(player_id);

CREATE INDEX IF NOT EXISTS player_deletions_status_idx
  ON player_deletions(status)
  WHERE status != 'completed';         -- partial index — only live/failed rows

ALTER TABLE player_deletions ENABLE ROW LEVEL SECURITY;
-- No player-facing SELECT policy. Service role bypasses RLS; no other role
-- should read or write this table.


-- =============================================================================
-- 2. cleanup_player_data — transactional SECURITY DEFINER function
--
-- All anonymize/delete steps run inside one Postgres transaction.
-- If any step raises an exception the entire transaction rolls back.
-- No partial deletion states are possible within the Supabase layer.
--
-- Authorization: the API endpoint validates Clerk identity, confirms the
-- caller is deleting their own account, and enforces the staff block BEFORE
-- calling this function. The function itself does not re-validate — it trusts
-- the caller has performed those checks.
--
-- Security: EXECUTE is revoked from all non-superuser roles. Only the
-- service_role key (used exclusively by the server-side API) can invoke it.
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_player_data(p_player_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── Cancel pending/approved prize redemptions ───────────────────────────
  UPDATE prize_wall_redemptions
  SET    status     = 'cancelled',
         void_reason = 'account_deleted',
         voided_at  = now()
  WHERE  player_id = p_player_id
    AND  status IN ('pending', 'approved');

  -- ── Hard delete: personal / device records ──────────────────────────────
  DELETE FROM friendships
  WHERE  requester_id = p_player_id
     OR  addressee_id = p_player_id;

  DELETE FROM event_interest          WHERE player_id = p_player_id;
  DELETE FROM notifications           WHERE player_id = p_player_id;
  DELETE FROM expo_push_tokens        WHERE player_id = p_player_id;
  DELETE FROM push_subscriptions      WHERE player_id = p_player_id;
  DELETE FROM bounty_hunter_participants WHERE player_id = p_player_id;
  DELETE FROM player_inventory        WHERE player_id = p_player_id;

  -- card_of_the_day_votes: hard delete (no audit value; avoids unique-constraint
  -- ambiguity with multiple NULL player_id rows on the same vote_date)
  DELETE FROM card_of_the_day_votes   WHERE player_id = p_player_id;

  -- ── Anonymize: operational history (player_id → NULL) ───────────────────
  -- Rows are retained for store-level reporting and financial audit.
  -- player_id is severed so no PII remains.

  UPDATE xp_ledger                SET player_id = NULL WHERE player_id = p_player_id;
  UPDATE prize_point_transactions  SET player_id = NULL WHERE player_id = p_player_id;
  UPDATE prize_wall_redemptions    SET player_id = NULL WHERE player_id = p_player_id;
  UPDATE daily_spins               SET player_id = NULL WHERE player_id = p_player_id;
  UPDATE pass_history              SET player_id = NULL WHERE player_id = p_player_id;
  UPDATE player_pass_subscriptions SET player_id = NULL WHERE player_id = p_player_id;
  UPDATE circuit_qualifiers        SET player_id = NULL WHERE player_id = p_player_id;
  UPDATE preorder_claims           SET player_id = NULL WHERE player_id = p_player_id;
  UPDATE transactions              SET player_id = NULL WHERE player_id = p_player_id;
  UPDATE event_attendances         SET player_id = NULL WHERE player_id = p_player_id;

  -- Emperor: anonymize identity AND overwrite display name in one statement
  UPDATE emperors
  SET    player_id  = NULL,
         player_name = 'Deleted Player'
  WHERE  player_id = p_player_id;

  -- Bounty Hunter matches reference player by winner_id / loser_id (already nullable)
  UPDATE bounty_hunter_matches SET winner_id = NULL WHERE winner_id = p_player_id;
  UPDATE bounty_hunter_matches SET loser_id  = NULL WHERE loser_id  = p_player_id;

  -- ── Anonymize: cross-reference cleanup ──────────────────────────────────
  -- xp_ledger.awarded_by: staff who awarded XP — may reference the deleted player
  UPDATE xp_ledger SET awarded_by = NULL WHERE awarded_by = p_player_id;

  -- players.referred_by: other players who were referred by the deleted player
  UPDATE players SET referred_by = NULL WHERE referred_by = p_player_id;

  -- ── Delete the player row ────────────────────────────────────────────────
  -- All FK child rows have been cleared above. This will succeed.
  DELETE FROM players WHERE id = p_player_id;

END;
$$;

-- Revoke EXECUTE from all non-superuser roles.
-- The service_role key (used server-side only) has superuser-equivalent
-- privileges and bypasses these restrictions.
-- Ordinary authenticated or anonymous clients cannot invoke this function.
REVOKE ALL ON FUNCTION cleanup_player_data(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cleanup_player_data(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION cleanup_player_data(uuid) FROM anon;


-- =============================================================================
-- 3. Make player_id nullable on all anonymize targets
--    (11 tables — event_attendance excluded: legacy table, no active writes;
--     card_of_the_day_votes excluded: hard-deleted, no NULL anonymization)
-- =============================================================================

ALTER TABLE xp_ledger                 ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE prize_point_transactions  ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE prize_wall_redemptions    ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE daily_spins               ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE emperors                  ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE event_attendances         ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE pass_history              ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE player_pass_subscriptions ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE circuit_qualifiers        ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE preorder_claims           ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE transactions              ALTER COLUMN player_id DROP NOT NULL;


-- =============================================================================
-- ROLLBACK SQL (apply only if migration needs to be reversed AND no deletions
-- have run yet — SET NOT NULL fails if any NULL values exist in the column)
-- =============================================================================
--
-- DROP FUNCTION IF EXISTS cleanup_player_data(uuid);
-- DROP TABLE  IF EXISTS player_deletions;
--
-- ALTER TABLE xp_ledger                 ALTER COLUMN player_id SET NOT NULL;
-- ALTER TABLE prize_point_transactions  ALTER COLUMN player_id SET NOT NULL;
-- ALTER TABLE prize_wall_redemptions    ALTER COLUMN player_id SET NOT NULL;
-- ALTER TABLE daily_spins               ALTER COLUMN player_id SET NOT NULL;
-- ALTER TABLE emperors                  ALTER COLUMN player_id SET NOT NULL;
-- ALTER TABLE event_attendances         ALTER COLUMN player_id SET NOT NULL;
-- ALTER TABLE pass_history              ALTER COLUMN player_id SET NOT NULL;
-- ALTER TABLE player_pass_subscriptions ALTER COLUMN player_id SET NOT NULL;
-- ALTER TABLE circuit_qualifiers        ALTER COLUMN player_id SET NOT NULL;
-- ALTER TABLE preorder_claims           ALTER COLUMN player_id SET NOT NULL;
-- ALTER TABLE transactions              ALTER COLUMN player_id SET NOT NULL;
