-- Enforce one role per user per store.
-- Duplicate check run 2026-08-23: 7 rows, 0 duplicates — safe to apply.
ALTER TABLE staff_store_roles
  ADD CONSTRAINT staff_store_roles_user_store_unique UNIQUE (user_id, store_id);
