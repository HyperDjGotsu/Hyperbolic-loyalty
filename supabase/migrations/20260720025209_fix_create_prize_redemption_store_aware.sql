-- Migration: 20260720025209_fix_create_prize_redemption_store_aware
-- Applied to production: 2026-07-20
-- Captured retroactively 2026-08-09 from live schema introspection.
-- DO NOT re-apply. Register with CLI:
--   npx supabase migration repair --status applied 20260720025209
--
-- NOTE: Intermediate version — balance check is store-scoped.
-- Superseded by 20260801_fix_prize_redemption_network_wide_balance which uses
-- network-wide balance (matching what the UI displays).

CREATE OR REPLACE FUNCTION public.create_prize_redemption(
  p_player_id uuid,
  p_item_id   uuid,
  p_store_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item          record;
  v_balance       integer;
  v_claim_code    text;
  v_redemption_id uuid;
BEGIN
  SELECT id, name, xp_cost, retail_value, quantity, store_id, is_active
    INTO v_item
    FROM prize_wall_items
    WHERE id = p_item_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Item not found');
  END IF;

  IF NOT v_item.is_active THEN
    RETURN jsonb_build_object('error', 'Item is not available');
  END IF;

  -- is_network_prize items are available regardless of store
  IF v_item.store_id IS NOT NULL
     AND v_item.store_id <> p_store_id
     AND NOT COALESCE(v_item.is_network_prize, false)
  THEN
    RETURN jsonb_build_object('error', 'Item not available at selected store');
  END IF;

  IF v_item.quantity IS NOT NULL AND v_item.quantity <= 0 THEN
    RETURN jsonb_build_object('error', 'Item is out of stock');
  END IF;

  -- Store-scoped balance check (this version)
  SELECT COALESCE(SUM(amount), 0)::integer INTO v_balance
    FROM prize_point_transactions
    WHERE player_id = p_player_id
      AND store_id = p_store_id;

  IF v_balance < v_item.xp_cost THEN
    RETURN jsonb_build_object(
      'error', 'Insufficient Prize Points',
      'balance', v_balance,
      'required', v_item.xp_cost
    );
  END IF;

  IF v_item.quantity IS NOT NULL THEN
    UPDATE prize_wall_items SET quantity = quantity - 1 WHERE id = p_item_id;
  END IF;

  INSERT INTO prize_point_transactions (player_id, store_id, amount, type, source, note)
    VALUES (p_player_id, p_store_id, -v_item.xp_cost, 'spend', 'prize_redemption', v_item.name);

  LOOP
    v_claim_code := upper(
      substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 4) || '-' ||
      substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 4)
    );
    EXIT WHEN NOT EXISTS (SELECT 1 FROM prize_wall_redemptions WHERE claim_code = v_claim_code);
  END LOOP;

  INSERT INTO prize_wall_redemptions (
    player_id, store_id, item_id, claim_code,
    points_deducted, item_name, item_retail_value
  )
  VALUES (
    p_player_id, p_store_id, p_item_id, v_claim_code,
    v_item.xp_cost, v_item.name, v_item.retail_value
  )
  RETURNING id INTO v_redemption_id;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'claim_code', v_claim_code,
    'item_name', v_item.name,
    'points_deducted', v_item.xp_cost
  );
END;
$$;
