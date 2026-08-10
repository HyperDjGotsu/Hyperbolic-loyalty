-- Migration: 20260717011227_phase2_rls_and_data_integrity
-- Applied to production: 2026-07-17
-- Captured retroactively 2026-08-09 from live schema introspection.
-- DO NOT re-apply. Register with CLI:
--   npx supabase migration repair --status applied 20260717011227

-- Backfill events.store_id: set to flagship store for any events missing it
-- (events.store_id was made NOT NULL; all existing events must have a value)
UPDATE events e
SET store_id = (
  SELECT id FROM stores WHERE is_flagship = true LIMIT 1
)
WHERE e.store_id IS NULL;

-- Make events.store_id NOT NULL now that backfill is done
ALTER TABLE events
  ALTER COLUMN store_id SET NOT NULL;

-- RLS on identity/role tables: lock to service_role only
-- app_users: no authenticated-role access (all reads via supabaseAdmin)
-- network_staff_roles: service_role only
-- staff_store_roles: service_role only

-- These tables had RLS enabled in 20260716234539 with no policies,
-- which means deny-all for authenticated role (correct by default).
-- Add explicit documentation policies for clarity:

-- No authenticated-role policies on app_users, network_staff_roles, staff_store_roles.
-- All access is via service_role (API routes using supabaseAdmin).
-- This is intentional — see RLS Gap notes in project documentation.
