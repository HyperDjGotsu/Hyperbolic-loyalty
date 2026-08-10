-- Migration: 20260717012121_phase2_security_cleanup
-- Applied to production: 2026-07-17
-- Captured retroactively 2026-08-09 from live schema introspection.
-- DO NOT re-apply. Register with CLI:
--   npx supabase migration repair --status applied 20260717012121

-- Drop all stale is_staff-based RLS policies.
-- The is_staff column on players was the original staff access mechanism.
-- Phase 2 replaced it with app_users + staff_store_roles + network_staff_roles.
-- All staff reads now go through service_role (supabaseAdmin) in API routes.

DROP POLICY IF EXISTS "Staff can read prize point transactions for managed stores" ON prize_point_transactions;
DROP POLICY IF EXISTS "staff_read_prize_transactions" ON prize_point_transactions;
DROP POLICY IF EXISTS "is_staff_read_redemptions" ON prize_wall_redemptions;
DROP POLICY IF EXISTS "staff_manage_redemptions" ON prize_wall_redemptions;
DROP POLICY IF EXISTS "staff_read_prize_wall_items" ON prize_wall_items;
DROP POLICY IF EXISTS "staff_insert_event_attendances" ON event_attendances;
DROP POLICY IF EXISTS "staff_update_event_attendances" ON event_attendances;

-- Also clean up the legacy circuit_qualifiers is_staff policy if present
DROP POLICY IF EXISTS "staff_manage_qualifiers" ON circuit_qualifiers;
