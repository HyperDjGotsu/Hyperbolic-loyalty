-- ============================================================
-- PRODUCTION PRECONDITION AUDIT
-- Run ALL queries below against production Supabase before
-- deploying any migration from this batch (000001–000005).
-- Each query has a PASS condition. Do not proceed if any FAIL.
-- ============================================================

-- P0: Verify stripe_invoice_id exists and check for live data
--     (migration 000002 renames it to payment_event_id)
--     PASS: count = 0 (no live payment references to lose)
--     ACTION IF FAIL: record all non-null rows before renaming
SELECT COUNT(*) AS stripe_invoice_id_count
FROM players
WHERE stripe_invoice_id IS NOT NULL;

-- P1: Verify no shadow_vip players exist with active benefits
--     PASS: count = 0
SELECT COUNT(*) AS active_shadow_vip_count
FROM players
WHERE pass_tier = 'shadow_vip'
  AND pass_status IN ('active', 'cancel_scheduled')
  AND pass_expires_at > now();

-- P2: Current tier/status distribution — review before migration
--     PASS: no unexpected combinations (e.g. active + null expiry on paid tier)
SELECT pass_tier, pass_status,
  COUNT(*) AS player_count,
  COUNT(CASE WHEN pass_expires_at IS NULL THEN 1 END) AS null_expiry_count,
  COUNT(CASE WHEN pass_expires_at < now() THEN 1 END) AS past_expiry_count
FROM players
GROUP BY pass_tier, pass_status
ORDER BY player_count DESC;

-- P3: Players with active/cancel_scheduled status but expired pass_expires_at
--     PASS: ideally 0, but non-zero means the expiry-sync cron hasn't run yet
--     ACTION IF FAIL: note the count; pass-expiry-sync will clean these up on first run
SELECT COUNT(*) AS stale_active_expired_count
FROM players
WHERE pass_status IN ('active', 'cancel_scheduled')
  AND pass_expires_at IS NOT NULL
  AND pass_expires_at < now();

-- P4: Players with paid tier but null pass_expires_at (malformed — should be 0)
--     PASS: count = 0
--     ACTION IF FAIL: investigate these rows before running effectivePassTier in prod
SELECT id, player_id, pass_tier, pass_status, pass_expires_at
FROM players
WHERE pass_tier IN ('access', 'player', 'all_access', 'diamond')
  AND pass_expires_at IS NULL
  AND pass_status NOT IN ('cancelled', 'expired');

-- P5: Check if grace_period is in use (excluded from BENEFIT_BEARING_STATUSES)
--     PASS: count = 0 (we never set it; confirm)
SELECT COUNT(*) AS grace_period_count
FROM players
WHERE pass_status = 'grace_period';

-- P6: Check if cancel_scheduled already exists in enum (migration 000003 uses IF NOT EXISTS)
--     Informational — not blocking
SELECT e.enumlabel
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname = 'pass_status'
ORDER BY e.enumsortorder;

-- P7: Check for existing membership_* RPC overloads that might conflict
--     PASS: count = 0 (no prior versions)
SELECT proname, pronargs
FROM pg_proc
WHERE proname LIKE 'membership_%';

-- P8: Verify pass_history table does not already exist with conflicting schema
--     PASS: 0 rows (table does not exist yet) OR columns match expected schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pass_history'
ORDER BY ordinal_position;

-- P9: Verify notifications table has the expected structure for dedup_key
--     PASS: shows existing columns; dedup_key should NOT be present yet
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'notifications'
ORDER BY ordinal_position;

-- P10: Verify is_shadow_vip and shadow_vip_enabled columns exist before dropping
--      PASS: if they exist, migration 000005 will drop them; if not, IF EXISTS is safe
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('is_shadow_vip', 'shadow_vip_enabled');
