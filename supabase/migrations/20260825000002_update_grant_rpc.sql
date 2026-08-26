-- Update membership_grant: add p_payment_confirmed to drive has_been_paid_member.
-- Drops old 7-param signature; creates new 8-param version.
DROP FUNCTION IF EXISTS membership_grant(uuid, text, int, text, uuid, uuid, text);
DROP FUNCTION IF EXISTS membership_grant(uuid, text, int, text, uuid, uuid, text, boolean);

CREATE OR REPLACE FUNCTION membership_grant(
  p_player_id         UUID,
  p_tier              TEXT,
  p_duration_days     INT,
  p_actor_clerk_id    TEXT,
  p_actor_store_id    UUID,
  p_mutation_id       UUID,
  p_payment_event_id  TEXT    DEFAULT NULL,
  p_payment_confirmed BOOLEAN DEFAULT FALSE,
  p_allow_cancelled   BOOLEAN DEFAULT FALSE
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_tier        TEXT;
  v_old_status      TEXT;
  v_old_expires_at  TIMESTAMPTZ;
  v_new_expires_at  TIMESTAMPTZ;
  v_mutation_params JSONB;
BEGIN
  IF p_tier NOT IN ('access', 'player', 'all_access', 'diamond') THEN
    RAISE EXCEPTION 'tier % is not grantable', p_tier
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_duration_days <= 0 OR p_duration_days > 365 THEN
    RAISE EXCEPTION 'duration_days must be between 1 and 365'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_player_id::text));

  IF EXISTS (SELECT 1 FROM pass_history WHERE mutation_id = p_mutation_id) THEN
    RETURN 'idempotent_skip';
  END IF;

  IF p_payment_event_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM pass_history WHERE payment_event_id = p_payment_event_id
  ) THEN
    RETURN 'idempotent_payment_skip';
  END IF;

  SELECT pass_tier, pass_status, pass_expires_at
  INTO v_old_tier, v_old_status, v_old_expires_at
  FROM players WHERE id = p_player_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'player % not found', p_player_id USING ERRCODE = 'no_data_found';
  END IF;

  -- Cancelled players were administratively revoked; only network_admin may grant to them.
  -- Routes pass p_allow_cancelled=TRUE only for network_admin-authenticated requests.
  IF v_old_status = 'cancelled' AND NOT p_allow_cancelled THEN
    RAISE EXCEPTION 'granting to a cancelled player requires elevated authorization'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_old_tier IN ('access', 'player', 'all_access', 'diamond')
     AND v_old_status IN ('active', 'cancel_scheduled') THEN
    RAISE EXCEPTION 'player already has an active pass — use renew or change-tier'
      USING ERRCODE = 'unique_violation';
  END IF;

  v_new_expires_at := now() + (p_duration_days || ' days')::INTERVAL;

  v_mutation_params := jsonb_build_object(
    'tier', p_tier,
    'duration_days', p_duration_days,
    'new_expires_at', to_char(v_new_expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'payment_confirmed', p_payment_confirmed,
    'actor_store_id', p_actor_store_id::TEXT
  );

  UPDATE players SET
    pass_tier            = p_tier,
    pass_status          = 'active',
    pass_started_at      = now(),
    pass_expires_at      = v_new_expires_at,
    has_been_paid_member = CASE WHEN p_payment_confirmed THEN TRUE ELSE has_been_paid_member END
  WHERE id = p_player_id;

  INSERT INTO pass_history (
    player_id, change_type,
    old_tier, new_tier, old_status, new_status,
    old_expires_at, new_expires_at,
    actor_type, actor_clerk_id, actor_store_id,
    mutation_id, mutation_params, payment_event_id
  ) VALUES (
    p_player_id, 'grant',
    v_old_tier, p_tier, v_old_status, 'active',
    v_old_expires_at, v_new_expires_at,
    'staff', p_actor_clerk_id, p_actor_store_id,
    p_mutation_id, v_mutation_params, p_payment_event_id
  );

  RETURN 'ok';
END;
$$;

REVOKE EXECUTE ON FUNCTION membership_grant(uuid, text, int, text, uuid, uuid, text, boolean, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION membership_grant(uuid, text, int, text, uuid, uuid, text, boolean, boolean)
  TO service_role;
