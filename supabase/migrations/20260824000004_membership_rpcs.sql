-- Membership lifecycle RPCs — security-definer, service_role only.
-- All RPCs are atomic: advisory lock → idempotency check → state machine → update + audit.
-- REQUIRES: migration 20260824000003 (cancel_scheduled enum) deployed first.
-- REQUIRES: migration 20260824000002 (pass_history table) deployed first.
--
-- After deploying, verify:
--   SELECT proname, prosecdef FROM pg_proc WHERE proname LIKE 'membership_%';
--   All rows must have prosecdef = true.

-- ============================================================
-- 1. membership_grant
-- ============================================================
CREATE OR REPLACE FUNCTION membership_grant(
  p_player_id      UUID,
  p_tier           TEXT,
  p_duration_days  INT,
  p_actor_clerk_id TEXT,
  p_actor_store_id UUID,
  p_mutation_id    UUID,
  p_payment_event_id TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_tier       TEXT;
  v_old_status     TEXT;
  v_old_expires_at TIMESTAMPTZ;
  v_new_expires_at TIMESTAMPTZ;
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

  -- Block if player has an active real tier
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
    'actor_store_id', p_actor_store_id::TEXT
  );

  UPDATE players SET
    pass_tier       = p_tier,
    pass_status     = 'active',
    pass_started_at = now(),
    pass_expires_at = v_new_expires_at
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

-- ============================================================
-- 2. membership_renew
-- ============================================================
CREATE OR REPLACE FUNCTION membership_renew(
  p_player_id      UUID,
  p_duration_days  INT,
  p_actor_clerk_id TEXT,
  p_actor_store_id UUID,
  p_mutation_id    UUID,
  p_payment_event_id TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_tier       TEXT;
  v_old_status     TEXT;
  v_old_expires_at TIMESTAMPTZ;
  v_base           TIMESTAMPTZ;
  v_new_expires_at TIMESTAMPTZ;
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

  -- Extend from whichever is later: current expiry or now (handles already-lapsed passes)
  v_base := GREATEST(v_old_expires_at, now());
  v_new_expires_at := v_base + (p_duration_days || ' days')::INTERVAL;

  -- Defensive check — GREATEST guarantees v_base >= now()
  IF v_new_expires_at <= now() THEN
    RAISE EXCEPTION 'computed new_expires_at is not in the future'
      USING ERRCODE = 'internal_error';
  END IF;

  v_mutation_params := jsonb_build_object(
    'duration_days', p_duration_days,
    'old_expires_at', to_char(v_old_expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'new_expires_at', to_char(v_new_expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'actor_store_id', p_actor_store_id::TEXT
  );

  UPDATE players SET
    pass_status     = 'active',
    pass_expires_at = v_new_expires_at
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

-- ============================================================
-- 3. membership_change_tier
-- ============================================================
CREATE OR REPLACE FUNCTION membership_change_tier(
  p_player_id      UUID,
  p_new_tier       TEXT,
  p_actor_clerk_id TEXT,
  p_actor_store_id UUID,
  p_mutation_id    UUID,
  p_notes          TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_tier        TEXT;
  v_old_status      TEXT;
  v_old_expires_at  TIMESTAMPTZ;
  v_old_rank        INT;
  v_new_rank        INT;
  v_mutation_params JSONB;
BEGIN
  IF p_new_tier NOT IN ('access', 'player', 'all_access', 'diamond') THEN
    RAISE EXCEPTION 'tier % is not grantable', p_new_tier
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_player_id::text));

  IF EXISTS (SELECT 1 FROM pass_history WHERE mutation_id = p_mutation_id) THEN
    RETURN 'idempotent_skip';
  END IF;

  SELECT pass_tier, pass_status, pass_expires_at
  INTO v_old_tier, v_old_status, v_old_expires_at
  FROM players WHERE id = p_player_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'player % not found', p_player_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_old_status != 'active' THEN
    RAISE EXCEPTION 'change_tier requires active status (current: %)', v_old_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Downgrade requires a non-empty reason
  v_new_rank := CASE p_new_tier
    WHEN 'access'     THEN 1 WHEN 'player' THEN 2
    WHEN 'all_access' THEN 3 WHEN 'diamond' THEN 4 ELSE 0 END;
  v_old_rank := CASE v_old_tier
    WHEN 'access'     THEN 1 WHEN 'player' THEN 2
    WHEN 'all_access' THEN 3 WHEN 'diamond' THEN 4 ELSE 0 END;

  IF v_new_rank < v_old_rank AND (p_notes IS NULL OR trim(p_notes) = '') THEN
    RAISE EXCEPTION 'notes required when downgrading tier (% → %)', v_old_tier, p_new_tier
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_mutation_params := jsonb_build_object(
    'old_tier', v_old_tier,
    'new_tier', p_new_tier,
    'actor_store_id', p_actor_store_id::TEXT
  );

  UPDATE players SET pass_tier = p_new_tier WHERE id = p_player_id;

  INSERT INTO pass_history (
    player_id, change_type,
    old_tier, new_tier, old_status, new_status,
    old_expires_at, new_expires_at,
    actor_type, actor_clerk_id, actor_store_id,
    mutation_id, mutation_params, notes
  ) VALUES (
    p_player_id, 'change_tier',
    v_old_tier, p_new_tier, v_old_status, v_old_status,
    v_old_expires_at, v_old_expires_at,
    'staff', p_actor_clerk_id, p_actor_store_id,
    p_mutation_id, v_mutation_params, p_notes
  );

  RETURN 'ok';
END;
$$;

-- ============================================================
-- 4. membership_cancel_renewal
-- ============================================================
CREATE OR REPLACE FUNCTION membership_cancel_renewal(
  p_player_id      UUID,
  p_actor_clerk_id TEXT,
  p_actor_store_id UUID,
  p_mutation_id    UUID
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_tier       TEXT;
  v_old_status     TEXT;
  v_old_expires_at TIMESTAMPTZ;
  v_mutation_params JSONB;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_player_id::text));

  IF EXISTS (SELECT 1 FROM pass_history WHERE mutation_id = p_mutation_id) THEN
    RETURN 'idempotent_skip';
  END IF;

  SELECT pass_tier, pass_status, pass_expires_at
  INTO v_old_tier, v_old_status, v_old_expires_at
  FROM players WHERE id = p_player_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'player % not found', p_player_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_old_status != 'active' THEN
    RAISE EXCEPTION 'cancel_renewal requires active status (current: %)', v_old_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_mutation_params := jsonb_build_object(
    'scheduled_expiry_at', to_char(v_old_expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'actor_store_id', p_actor_store_id::TEXT
  );

  UPDATE players SET pass_status = 'cancel_scheduled' WHERE id = p_player_id;

  INSERT INTO pass_history (
    player_id, change_type,
    old_tier, new_tier, old_status, new_status,
    old_expires_at, new_expires_at,
    actor_type, actor_clerk_id, actor_store_id,
    mutation_id, mutation_params
  ) VALUES (
    p_player_id, 'cancel_renewal',
    v_old_tier, v_old_tier, v_old_status, 'cancel_scheduled',
    v_old_expires_at, v_old_expires_at,
    'staff', p_actor_clerk_id, p_actor_store_id,
    p_mutation_id, v_mutation_params
  );

  RETURN 'ok';
END;
$$;

-- ============================================================
-- 5. membership_revoke
-- ============================================================
CREATE OR REPLACE FUNCTION membership_revoke(
  p_player_id      UUID,
  p_actor_clerk_id TEXT,
  p_actor_store_id UUID,
  p_mutation_id    UUID,
  p_notes          TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_tier       TEXT;
  v_old_status     TEXT;
  v_old_expires_at TIMESTAMPTZ;
  v_mutation_params JSONB;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_player_id::text));

  IF EXISTS (SELECT 1 FROM pass_history WHERE mutation_id = p_mutation_id) THEN
    RETURN 'idempotent_skip';
  END IF;

  SELECT pass_tier, pass_status, pass_expires_at
  INTO v_old_tier, v_old_status, v_old_expires_at
  FROM players WHERE id = p_player_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'player % not found', p_player_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_old_status NOT IN ('active', 'cancel_scheduled') THEN
    RAISE EXCEPTION 'revoke requires active or cancel_scheduled status (current: %)', v_old_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_mutation_params := jsonb_build_object(
    'revoked_tier', v_old_tier,
    'revoked_expires_at', to_char(v_old_expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'actor_store_id', p_actor_store_id::TEXT
  );

  -- Tier preserved; effectivePassTier returns 'none' for cancelled status
  UPDATE players SET
    pass_status     = 'cancelled',
    pass_expires_at = NULL
  WHERE id = p_player_id;

  INSERT INTO pass_history (
    player_id, change_type,
    old_tier, new_tier, old_status, new_status,
    old_expires_at, new_expires_at,
    actor_type, actor_clerk_id, actor_store_id,
    mutation_id, mutation_params, notes
  ) VALUES (
    p_player_id, 'revoke',
    v_old_tier, v_old_tier, v_old_status, 'cancelled',
    v_old_expires_at, NULL,
    'staff', p_actor_clerk_id, p_actor_store_id,
    p_mutation_id, v_mutation_params, p_notes
  );

  RETURN 'ok';
END;
$$;

-- ============================================================
-- 6. membership_restore
-- ============================================================
CREATE OR REPLACE FUNCTION membership_restore(
  p_player_id      UUID,
  p_tier           TEXT,
  p_expires_at     TIMESTAMPTZ,
  p_actor_clerk_id TEXT,
  p_actor_store_id UUID,
  p_mutation_id    UUID,
  p_notes          TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_tier       TEXT;
  v_old_status     TEXT;
  v_old_expires_at TIMESTAMPTZ;
  v_mutation_params JSONB;
BEGIN
  IF p_tier IS NULL OR p_tier NOT IN ('access', 'player', 'all_access', 'diamond') THEN
    RAISE EXCEPTION 'tier must be one of access, player, all_access, diamond (got: %)', p_tier
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF p_expires_at IS NULL OR p_expires_at <= now() THEN
    RAISE EXCEPTION 'restore expires_at must be in the future'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_player_id::text));

  IF EXISTS (SELECT 1 FROM pass_history WHERE mutation_id = p_mutation_id) THEN
    RETURN 'idempotent_skip';
  END IF;

  SELECT pass_tier, pass_status, pass_expires_at
  INTO v_old_tier, v_old_status, v_old_expires_at
  FROM players WHERE id = p_player_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'player % not found', p_player_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_old_status NOT IN ('cancelled', 'expired') THEN
    RAISE EXCEPTION 'restore requires cancelled or expired status (current: %)', v_old_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_mutation_params := jsonb_build_object(
    'tier', p_tier,
    'expires_at', to_char(p_expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'actor_store_id', p_actor_store_id::TEXT
  );

  UPDATE players SET
    pass_tier       = p_tier,
    pass_status     = 'active',
    pass_started_at = now(),
    pass_expires_at = p_expires_at
  WHERE id = p_player_id;

  INSERT INTO pass_history (
    player_id, change_type,
    old_tier, new_tier, old_status, new_status,
    old_expires_at, new_expires_at,
    actor_type, actor_clerk_id, actor_store_id,
    mutation_id, mutation_params, notes
  ) VALUES (
    p_player_id, 'restore',
    v_old_tier, p_tier, v_old_status, 'active',
    v_old_expires_at, p_expires_at,
    'staff', p_actor_clerk_id, p_actor_store_id,
    p_mutation_id, v_mutation_params, p_notes
  );

  RETURN 'ok';
END;
$$;

-- ============================================================
-- 7. membership_expire_player (system cron — single player expiry)
-- ============================================================
CREATE OR REPLACE FUNCTION membership_expire_player(
  p_player_id   UUID,
  p_mutation_id UUID
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_tier       TEXT;
  v_old_status     TEXT;
  v_old_expires_at TIMESTAMPTZ;
  v_mutation_params JSONB;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_player_id::text));

  IF EXISTS (SELECT 1 FROM pass_history WHERE mutation_id = p_mutation_id) THEN
    RETURN 'idempotent_skip';
  END IF;

  SELECT pass_tier, pass_status, pass_expires_at
  INTO v_old_tier, v_old_status, v_old_expires_at
  FROM players WHERE id = p_player_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'player % not found', p_player_id USING ERRCODE = 'no_data_found';
  END IF;

  -- Only expire if still in a benefit-bearing status and truly past expiry
  IF v_old_status NOT IN ('active', 'cancel_scheduled') THEN
    RETURN 'already_expired';
  END IF;

  IF v_old_expires_at IS NULL OR v_old_expires_at > now() THEN
    RETURN 'not_yet_expired';
  END IF;

  v_mutation_params := jsonb_build_object(
    'expired_tier', v_old_tier,
    'expired_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );

  UPDATE players SET pass_status = 'expired' WHERE id = p_player_id;

  INSERT INTO pass_history (
    player_id, change_type,
    old_tier, new_tier, old_status, new_status,
    old_expires_at, new_expires_at,
    actor_type,
    mutation_id, mutation_params
  ) VALUES (
    p_player_id, 'expire',
    v_old_tier, v_old_tier, v_old_status, 'expired',
    v_old_expires_at, v_old_expires_at,
    'system',
    p_mutation_id, v_mutation_params
  );

  RETURN 'ok';
END;
$$;

-- ============================================================
-- 8. membership_notify_expiring (system cron — deduped notification insert)
-- Uses FOR UPDATE on player row to prevent concurrent duplicate inserts.
-- ============================================================
CREATE OR REPLACE FUNCTION membership_notify_expiring(
  p_player_id UUID,
  p_milestone TEXT
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INT;
  v_title    TEXT;
  v_message  TEXT;
BEGIN
  IF p_milestone NOT IN ('7d', '3d', '1d') THEN
    RAISE EXCEPTION 'milestone must be one of 7d, 3d, 1d (got: %)', p_milestone
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  v_title := CASE p_milestone
    WHEN '7d' THEN 'Pass Expires in 7 Days'
    WHEN '3d' THEN 'Pass Expires in 3 Days'
    WHEN '1d' THEN 'Pass Expires Tomorrow'
    ELSE           'Pass Expiring Soon'
  END;

  v_message := CASE p_milestone
    WHEN '1d' THEN 'Your PlayerPass expires tomorrow. Visit the store to renew now.'
    ELSE            'Your PlayerPass expires in ' || p_milestone || '. Visit the store to renew and keep your benefits.'
  END;

  -- Lock the player row to serialize concurrent cron invocations
  -- and ensure we read a consistent pass_expires_at for the dedup key.
  -- Also joins home_store_id so the notification is store-scoped.
  WITH locked_player AS (
    SELECT id, pass_expires_at, pass_status, home_store_id
    FROM players
    WHERE id = p_player_id
      AND pass_status IN ('active', 'cancel_scheduled')
      AND pass_expires_at > now()
    FOR UPDATE
  ),
  ins AS (
    INSERT INTO notifications (player_id, type, dedup_key, title, message, data, is_read, store_id)
    SELECT
      lp.id,
      'pass_expiring',
      'pass-expiring:' || lp.id::TEXT || ':' ||
        to_char(lp.pass_expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') ||
        ':' || p_milestone,
      v_title,
      v_message,
      jsonb_build_object('expires_at', lp.pass_expires_at, 'milestone', p_milestone),
      false,
      lp.home_store_id
    FROM locked_player lp
    ON CONFLICT (dedup_key) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO v_inserted FROM ins;

  RETURN COALESCE(v_inserted, 0);
END;
$$;

-- ============================================================
-- Lock down all RPCs to service_role only
-- ============================================================
DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'membership_grant(uuid,text,int,text,uuid,uuid,text)',
    'membership_renew(uuid,int,text,uuid,uuid,text)',
    'membership_change_tier(uuid,text,text,uuid,uuid,text)',
    'membership_cancel_renewal(uuid,text,uuid,uuid)',
    'membership_revoke(uuid,text,uuid,uuid,text)',
    'membership_restore(uuid,text,timestamptz,text,uuid,uuid,text)',
    'membership_expire_player(uuid,uuid)',
    'membership_notify_expiring(uuid,text)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END;
$$;
