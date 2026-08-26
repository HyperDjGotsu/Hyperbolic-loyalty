-- Update membership_renew: add p_payment_confirmed to drive has_been_paid_member.
-- Drops old 6-param signature; creates new 7-param version.
DROP FUNCTION IF EXISTS membership_renew(uuid, int, text, uuid, uuid, text);

CREATE OR REPLACE FUNCTION membership_renew(
  p_player_id         UUID,
  p_duration_days     INT,
  p_actor_clerk_id    TEXT,
  p_actor_store_id    UUID,
  p_mutation_id       UUID,
  p_payment_event_id  TEXT    DEFAULT NULL,
  p_payment_confirmed BOOLEAN DEFAULT FALSE
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_tier        TEXT;
  v_old_status      TEXT;
  v_old_expires_at  TIMESTAMPTZ;
  v_base            TIMESTAMPTZ;
  v_new_expires_at  TIMESTAMPTZ;
  v_mutation_params JSONB;
BEGIN
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

  IF v_old_status NOT IN ('active', 'cancel_scheduled') THEN
    RAISE EXCEPTION 'renew requires active or cancel_scheduled status (current: %)', v_old_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF v_old_expires_at IS NULL THEN
    RAISE EXCEPTION 'player has no current expiry — use grant instead'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_base := GREATEST(v_old_expires_at, now());
  v_new_expires_at := v_base + (p_duration_days || ' days')::INTERVAL;

  IF v_new_expires_at <= now() THEN
    RAISE EXCEPTION 'computed new_expires_at is not in the future'
      USING ERRCODE = 'internal_error';
  END IF;

  v_mutation_params := jsonb_build_object(
    'duration_days', p_duration_days,
    'old_expires_at', to_char(v_old_expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'new_expires_at', to_char(v_new_expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'payment_confirmed', p_payment_confirmed,
    'actor_store_id', p_actor_store_id::TEXT
  );

  UPDATE players SET
    pass_status          = 'active',
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
    p_player_id, 'renew',
    v_old_tier, v_old_tier, v_old_status, 'active',
    v_old_expires_at, v_new_expires_at,
    'staff', p_actor_clerk_id, p_actor_store_id,
    p_mutation_id, v_mutation_params, p_payment_event_id
  );

  RETURN 'ok';
END;
$$;

REVOKE EXECUTE ON FUNCTION membership_renew(uuid, int, text, uuid, uuid, text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION membership_renew(uuid, int, text, uuid, uuid, text, boolean)
  TO service_role;
