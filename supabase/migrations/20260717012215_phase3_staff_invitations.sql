-- Migration: 20260717012215_phase3_staff_invitations
-- Applied to production: 2026-07-17
-- Captured retroactively 2026-08-09 from live schema introspection.
-- DO NOT re-apply. Register with CLI:
--   npx supabase migration repair --status applied 20260717012215

-- staff_invitations: email-based invitation tokens for onboarding store staff
-- A staff_invitation is created by a network admin or store manager.
-- The invitee clicks the link, Clerk authenticates them, then
-- accept_staff_invitation RPC atomically creates/links app_users + staff_store_roles.

CREATE TABLE IF NOT EXISTS staff_invitations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL,
  store_id    uuid        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  role        text        NOT NULL,
  token_hash  text        NOT NULL UNIQUE,
  invited_by  uuid        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;
-- No authenticated-role policies; all access via service_role.

CREATE INDEX IF NOT EXISTS idx_staff_invitations_token_hash ON staff_invitations (token_hash);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_email      ON staff_invitations (email);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_store_id   ON staff_invitations (store_id);
