-- Migration: 20260717013624_phase3_harden_accept_function
-- Applied to production: 2026-07-17
-- Verified against live DB via pg_get_functiondef(): 2026-08-17
-- DO NOT re-apply. Register with CLI:
--   npx supabase migration repair --status applied 20260717013624
--
-- NOTE: This file was previously inaccurate (showed 'success' key, simplified logic).
-- Replaced with the verified live function definition.
-- The live function returns:
--   Success: { ok: true, code?: string, store_id: uuid, role: text }
--   Error:   { ok: false, code: string }
--   Codes: NOT_FOUND, REVOKED, ALREADY_ACCEPTED, EXPIRED, EMAIL_MISMATCH,
--          WOULD_DOWNGRADE, ALREADY_ASSIGNED, UPGRADED

REVOKE EXECUTE ON FUNCTION public.accept_staff_invitation(text, text, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_staff_invitation(text, text, text[]) FROM authenticated;

CREATE OR REPLACE FUNCTION public.accept_staff_invitation(
  p_token_hash      text,
  p_clerk_user_id   text,
  p_verified_emails text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_inv      RECORD;
  v_app_id   uuid;
  v_existing RECORD;
BEGIN
  -- Acquire a row-level lock so concurrent acceptance attempts serialize.
  SELECT * INTO v_inv
  FROM public.staff_invitations
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;

  IF v_inv.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'REVOKED');
  END IF;

  IF v_inv.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_ACCEPTED');
  END IF;

  IF v_inv.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'EXPIRED');
  END IF;

  -- Email binding: at least one of the caller's verified emails must match.
  IF NOT EXISTS (
    SELECT 1 FROM unnest(p_verified_emails) AS ve
    WHERE lower(ve) = lower(v_inv.email)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'EMAIL_MISMATCH');
  END IF;

  -- Find or create the app_users record for this Clerk user.
  SELECT id INTO v_app_id
  FROM public.app_users
  WHERE clerk_user_id = p_clerk_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.app_users (clerk_user_id)
    VALUES (p_clerk_user_id)
    RETURNING id INTO v_app_id;
  END IF;

  -- Check for an existing role at this store (lock the row if it exists
  -- so the role column cannot change underneath us).
  SELECT * INTO v_existing
  FROM public.staff_store_roles
  WHERE user_id = v_app_id AND store_id = v_inv.store_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.role = v_inv.role THEN
      -- Idempotent: already holds exactly the invited role.
      UPDATE public.staff_invitations SET accepted_at = now() WHERE id = v_inv.id;
      RETURN jsonb_build_object(
        'ok', true, 'code', 'ALREADY_ASSIGNED',
        'store_id', v_inv.store_id, 'role', v_inv.role
      );

    ELSIF v_existing.role = 'store_staff' AND v_inv.role = 'store_manager' THEN
      -- Promotion: valid because the invitation API already enforced that only
      -- a network admin could have created a store_manager invitation.
      UPDATE public.staff_store_roles
      SET role = 'store_manager'
      WHERE user_id = v_app_id AND store_id = v_inv.store_id;
      UPDATE public.staff_invitations SET accepted_at = now() WHERE id = v_inv.id;
      RETURN jsonb_build_object(
        'ok', true, 'code', 'UPGRADED',
        'store_id', v_inv.store_id, 'role', v_inv.role
      );

    ELSIF v_existing.role = 'store_manager' AND v_inv.role = 'store_staff' THEN
      -- Never downgrade a manager. Do NOT consume the invitation.
      RETURN jsonb_build_object(
        'ok', false, 'code', 'WOULD_DOWNGRADE',
        'existing_role', v_existing.role, 'invited_role', v_inv.role
      );
    END IF;

  ELSE
    -- No existing role at this store: clean insert.
    INSERT INTO public.staff_store_roles (user_id, store_id, role)
    VALUES (v_app_id, v_inv.store_id, v_inv.role);
    UPDATE public.staff_invitations SET accepted_at = now() WHERE id = v_inv.id;
    RETURN jsonb_build_object(
      'ok', true, 'store_id', v_inv.store_id, 'role', v_inv.role
    );
  END IF;

  -- Unreachable, but required for plpgsql completeness.
  RETURN jsonb_build_object('ok', false, 'code', 'INTERNAL_ERROR');
END;
$function$;
