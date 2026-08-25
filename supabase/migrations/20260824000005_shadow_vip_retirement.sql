-- Retires shadow_vip feature columns.
-- The pass_tier enum value 'shadow_vip' is intentionally preserved for historical rows.
-- effectivePassTier and BENEFIT_BEARING_TIERS already exclude it from all benefit enforcement.
-- No existing production rows have pass_tier = 'shadow_vip' (verified pre-migration).

ALTER TABLE players
  DROP COLUMN IF EXISTS is_shadow_vip;

ALTER TABLE store_config
  DROP COLUMN IF EXISTS shadow_vip_enabled;
