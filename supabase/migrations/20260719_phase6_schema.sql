-- Phase 6: nullable store_id on prize_point_transactions
-- store_id = null means a network-level adjustment (network admin only)
-- store_id = <uuid> means a store-scoped transaction (any authorized staff)
alter table prize_point_transactions
  alter column store_id drop not null;

-- Phase 6: add 'expired' to prize_wall_redemptions status
-- NOTE: 'expired' was already present in the check constraint as of this migration.
-- The drop/re-add below is a no-op included for idempotency and documentation.
-- expired: set when claim code TTL passes and redemption was never claimed
-- pending → claimed (staff fulfills)
-- pending → voided (staff voids, points refunded)
-- pending → expired (TTL passed, points refunded by cron or lazy evaluation)
alter table prize_wall_redemptions
  drop constraint if exists prize_wall_redemptions_status_check;

alter table prize_wall_redemptions
  add constraint prize_wall_redemptions_status_check
  check (status in ('pending', 'claimed', 'voided', 'expired'));
