-- Fix: balance check uses network-wide total (all stores), matching what the UI displays.
-- The spend transaction is still recorded store-scoped for attribution.
create or replace function public.create_prize_redemption(p_player_id uuid, p_item_id uuid, p_store_id uuid)
returns jsonb
language plpgsql
security definer
as $function$
declare
  v_item record;
  v_balance integer;
  v_claim_code text;
  v_redemption_id uuid;
begin
  -- Lock item row to prevent concurrent over-redemption
  select id, name, xp_cost, retail_value, quantity, store_id, is_active
    into v_item
    from prize_wall_items
    where id = p_item_id
    for update;

  if not found then
    return jsonb_build_object('error', 'Item not found');
  end if;

  if not v_item.is_active then
    return jsonb_build_object('error', 'Item is not available');
  end if;

  -- Item must belong to the selected store or be network-wide (store_id IS NULL)
  if v_item.store_id is not null and v_item.store_id <> p_store_id then
    return jsonb_build_object('error', 'Item not available at selected store');
  end if;

  -- Quantity check: NULL = unlimited, 0 = out of stock
  if v_item.quantity is not null and v_item.quantity <= 0 then
    return jsonb_build_object('error', 'Item is out of stock');
  end if;

  -- Balance check: network-wide (matches what the UI displays to the player)
  select coalesce(sum(amount), 0)::integer into v_balance
    from prize_point_transactions
    where player_id = p_player_id;

  if v_balance < v_item.xp_cost then
    return jsonb_build_object(
      'error', 'Insufficient Prize Points',
      'balance', v_balance,
      'required', v_item.xp_cost
    );
  end if;

  -- Decrement quantity if finite
  if v_item.quantity is not null then
    update prize_wall_items set quantity = quantity - 1 where id = p_item_id;
  end if;

  -- Deduct points (store-scoped spend transaction for attribution)
  insert into prize_point_transactions (player_id, store_id, amount, type, source, note)
    values (p_player_id, p_store_id, -v_item.xp_cost, 'spend', 'prize_redemption', v_item.name);

  -- Generate unique claim code
  loop
    v_claim_code := upper(
      substring(md5(random()::text || clock_timestamp()::text) from 1 for 4) || '-' ||
      substring(md5(random()::text || clock_timestamp()::text) from 1 for 4)
    );
    exit when not exists (select 1 from prize_wall_redemptions where claim_code = v_claim_code);
  end loop;

  -- Create redemption record with fulfillment store snapshot
  insert into prize_wall_redemptions (
    player_id, store_id, item_id, claim_code,
    points_deducted, item_name, item_retail_value
  )
  values (
    p_player_id, p_store_id, p_item_id, v_claim_code,
    v_item.xp_cost, v_item.name, v_item.retail_value
  )
  returning id into v_redemption_id;

  return jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'claim_code', v_claim_code,
    'item_name', v_item.name,
    'points_deducted', v_item.xp_cost
  );
end;
$function$;
