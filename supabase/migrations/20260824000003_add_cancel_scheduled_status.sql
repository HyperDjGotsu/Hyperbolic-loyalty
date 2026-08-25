-- Adds cancel_scheduled to the pass_status enum.
-- HARD DEPENDENCY: this migration MUST commit before 20260824000004 (membership RPCs)
-- because the grant/cancel-renewal RPCs write 'cancel_scheduled' to players.pass_status.
--
-- IF NOT EXISTS is safe for replay on any environment that already has the value.
ALTER TYPE pass_status ADD VALUE IF NOT EXISTS 'cancel_scheduled' AFTER 'active';
