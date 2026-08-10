-- Migration: 20260717013053_phase3_accept_invitation_atomic
-- Applied to production: 2026-07-17
-- Captured retroactively 2026-08-09 from live schema introspection.
-- DO NOT re-apply. Register with CLI:
--   npx supabase migration repair --status applied 20260717013053
--
-- NOTE: This is the initial version of accept_staff_invitation.
-- It was hardened in 20260717013624 (REVOKE + updated body).
-- The live function is the 20260717013624 version.

CREATE OR REPLACE FUNCTION public.accept_staff_invitation(
  p_token_hash     text,
  p_clerk_user_id  text,
  p_verified_emails text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation record;
  v_app_user_id uuid;
BEGIN
  -- Validate invitation token
  SELECT id, email, store_id, role, expires_at, accepted_at, revoked_at
    INTO v_invitation
    FROM staff_invitations
    WHERE token_hash = p_token_hash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid or expired invitation');
  END IF;

  IF v_invitation.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Invitation has been revoked');
  END IF;

  IF v_invitation.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Invitation already accepted');
  END IF;

  IF v_invitation.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'Invitation has expired');
  END IF;

  -- Upsert app_user record
  INSERT INTO app_users (clerk_user_id, email)
    VALUES (p_clerk_user_id, v_invitation.email)
  ON CONFLICT (clerk_user_id) DO UPDATE
    SET email = EXCLUDED.email, updated_at = now()
  RETURNING id INTO v_app_user_id;

  -- Grant store role (upsert to handle re-invite scenario)
  INSERT INTO staff_store_roles (user_id, store_id, role)
    VALUES (v_app_user_id, v_invitation.store_id, v_invitation.role)
  ON CONFLICT DO NOTHING;

  -- Mark invitation accepted
  UPDATE staff_invitations
    SET accepted_at = now()
    WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'success', true,
    'app_user_id', v_app_user_id,
    'store_id', v_invitation.store_id,
    'role', v_invitation.role
  );
END;
$$;
