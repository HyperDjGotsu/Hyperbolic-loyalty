-- Harden adjust_prize_points: enforce non-negative balance invariant.
--
-- Previous version inserted the transaction first, then computed the new
-- balance — so a deduction of -300 against a 50-point balance would succeed
-- and produce -250 (verified by Codex audit 2026-08-18).
--
-- This version:
--   1. Acquires a transaction-scoped advisory lock keyed on the player_id hash
--      so concurrent admin corrections for the same player are serialized.
--   2. Reads the current network-wide balance BEFORE inserting.
--   3. Rejects (returns error JSON, no INSERT) when the adjustment would take
--      the balance below zero.
--   4. Returns the resulting balance from the same read + arithmetic — no
--      second SELECT needed.
--
-- Isolation note: create_prize_redemption is unaffected. It performs its own
-- balance check and direct INSERT and does not call this function. The advisory
-- lock here serializes only adjust_prize_points calls against each other.

CREATE OR REPLACE FUNCTION public.adjust_prize_points(
  p_player_id uuid,
  p_store_id  uuid,
  p_amount    integer,
  p_reason    text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance integer;
  v_new_balance     integer;
BEGIN
  -- Validate amount is non-zero
  IF p_amount = 0 THEN
    RETURN jsonb_build_object('error', 'Amount cannot be zero');
  END IF;

  -- Serialize concurrent corrections for the same player within this transaction.
  -- pg_advisory_xact_lock is automatically released at transaction end.
  PERFORM pg_advisory_xact_lock(hashtext(p_player_id::text));

  -- Read current network-wide balance under the lock
  SELECT COALESCE(SUM(amount), 0)::integer
    INTO v_current_balance
    FROM prize_point_transactions
   WHERE player_id = p_player_id;

  v_new_balance := v_current_balance + p_amount;

  -- Reject deductions that would take the balance negative
  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object(
      'error',           'Insufficient balance — adjustment would result in a negative balance',
      'current_balance', v_current_balance,
      'requested',       p_amount,
      'shortfall',       ABS(v_new_balance)
    );
  END IF;

  -- Insert the adjustment transaction only after the balance check passes
  INSERT INTO prize_point_transactions (
    player_id, store_id, amount, type, source, note
  )
  VALUES (
    p_player_id,
    p_store_id,
    p_amount,
    'admin_adjust',
    'manual_adjustment',
    p_reason
  );

  RETURN jsonb_build_object(
    'success',       true,
    'new_balance',   v_new_balance,
    'amount_applied', p_amount
  );
END;
$$;

-- Grants unchanged — service_role only, per 20260814164349 hardening migration
REVOKE EXECUTE ON FUNCTION public.adjust_prize_points(uuid, uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.adjust_prize_points(uuid, uuid, integer, text) FROM authenticated;
