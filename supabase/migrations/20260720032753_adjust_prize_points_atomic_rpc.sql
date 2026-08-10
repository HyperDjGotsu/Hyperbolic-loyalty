-- Migration: 20260720032753_adjust_prize_points_atomic_rpc
-- Applied to production: 2026-07-20
-- Captured retroactively 2026-08-09 from live schema introspection.
-- DO NOT re-apply. Register with CLI:
--   npx supabase migration repair --status applied 20260720032753
--
-- adjust_prize_points: atomic staff-facing RPC to add or subtract prize points.
-- Live signature confirmed via PostgREST OpenAPI spec:
--   p_player_id uuid, p_store_id uuid, p_amount integer, p_reason text
-- Returns jsonb with new_balance.

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
  v_new_balance integer;
BEGIN
  -- Validate amount is non-zero
  IF p_amount = 0 THEN
    RETURN jsonb_build_object('error', 'Amount cannot be zero');
  END IF;

  -- Insert the adjustment transaction
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

  -- Compute new network-wide balance
  SELECT COALESCE(SUM(amount), 0)::integer INTO v_new_balance
    FROM prize_point_transactions
    WHERE player_id = p_player_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'amount_applied', p_amount
  );
END;
$$;

-- Only service_role should call this; revoke from public roles
REVOKE EXECUTE ON FUNCTION public.adjust_prize_points(uuid, uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.adjust_prize_points(uuid, uuid, integer, text) FROM authenticated;
