-- Prize Wall claim code hardening
-- 1. Add UNIQUE constraint on claim_code (no duplicates in production — verified pre-apply)
-- 2. Drop now-redundant non-unique index (UNIQUE creates its own)
-- 3. Upgrade create_prize_redemption() claim code generation: MD5 → extensions.gen_random_bytes
--    and use ON CONFLICT ON CONSTRAINT for targeted collision retry

ALTER TABLE prize_wall_redemptions
  ADD CONSTRAINT prize_wall_redemptions_claim_code_unique UNIQUE (claim_code);

DROP INDEX IF EXISTS idx_prize_wall_redemptions_claim_code;

CREATE OR REPLACE FUNCTION public.create_prize_redemption(
  p_player_id uuid,
  p_item_id   uuid,
  p_store_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item          record;
  v_balance       integer;
  v_claim_code    text;
  v_redemption_id uuid;
BEGIN
  -- Lock item row to prevent concurrent over-redemption
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

  -- Item must belong to the selected store or be network-wide (store_id IS NULL)
  IF v_item.store_id IS NOT NULL AND v_item.store_id <> p_store_id THEN
    RETURN jsonb_build_object('error', 'Item not available at selected store');
  END IF;

  -- Quantity check: NULL = unlimited, 0 = out of stock
  IF v_item.quantity IS NOT NULL AND v_item.quantity <= 0 THEN
    RETURN jsonb_build_object('error', 'Item is out of stock');
  END IF;

  -- Balance check: network-wide (matches what the UI displays to the player)
  SELECT COALESCE(SUM(amount), 0)::integer INTO v_balance
    FROM prize_point_transactions
    WHERE player_id = p_player_id;

  IF v_balance < v_item.xp_cost THEN
    RETURN jsonb_build_object(
      'error', 'Insufficient Prize Points',
      'balance', v_balance,
      'required', v_item.xp_cost
    );
  END IF;

  -- Decrement quantity if finite
  IF v_item.quantity IS NOT NULL THEN
    UPDATE prize_wall_items SET quantity = quantity - 1 WHERE id = p_item_id;
  END IF;

  -- Deduct points (store-scoped spend transaction for attribution)
  INSERT INTO prize_point_transactions (player_id, store_id, amount, type, source, note)
    VALUES (p_player_id, p_store_id, -v_item.xp_cost, 'spend', 'prize_redemption', v_item.name);

  -- Generate unique claim code with collision-safe retry.
  -- ON CONFLICT ON CONSTRAINT targets only the claim_code uniqueness — other constraint
  -- violations (e.g. FK failures) surface normally rather than being swallowed.
  LOOP
    v_redemption_id := NULL;
    v_claim_code := upper(
      encode(extensions.gen_random_bytes(2), 'hex') || '-' ||
      encode(extensions.gen_random_bytes(2), 'hex')
    );

    INSERT INTO prize_wall_redemptions (
      player_id, store_id, item_id, claim_code,
      points_deducted, item_name, item_retail_value
    )
    VALUES (
      p_player_id, p_store_id, p_item_id, v_claim_code,
      v_item.xp_cost, v_item.name, v_item.retail_value
    )
    ON CONFLICT ON CONSTRAINT prize_wall_redemptions_claim_code_unique
    DO NOTHING
    RETURNING id INTO v_redemption_id;

    EXIT WHEN v_redemption_id IS NOT NULL;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'claim_code', v_claim_code,
    'item_name', v_item.name,
    'points_deducted', v_item.xp_cost
  );
END;
$$;

-- Revoke broad execution rights; re-grant explicitly to service_role.
REVOKE EXECUTE ON FUNCTION public.create_prize_redemption(uuid, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_prize_redemption(uuid, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_prize_redemption(uuid, uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_prize_redemption(uuid, uuid, uuid) TO service_role;
