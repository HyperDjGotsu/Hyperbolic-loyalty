-- Reconciliation: staff_store_roles UNIQUE constraint audit (2026-08-23)
--
-- History:
--   staff_store_roles_user_id_store_id_key was applied directly to production via
--   SQL editor and was never tracked in a migration file.
--   20260823000000 added a duplicate (staff_store_roles_user_store_unique),
--   which was dropped manually in production on 2026-08-23.
--
-- Paths handled:
--   Production:        canonical constraint already exists → no ALTER TABLE, no lock.
--   Fresh env (after 20260823000000): duplicate exists, no canonical → rename (metadata-only).
--   Fresh env (clean): neither exists → create canonical constraint.

DO $$
BEGIN
  -- Production fast-path: canonical constraint already exists — nothing to do.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'staff_store_roles'::regclass
      AND contype = 'u'
      AND conname = 'staff_store_roles_user_id_store_id_key'
  ) THEN
    RETURN;
  END IF;

  -- Fresh env after 20260823000000: rename duplicate to canonical name.
  -- Rename is metadata-only and preserves continuous uniqueness enforcement without a gap.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'staff_store_roles'::regclass
      AND contype = 'u'
      AND conname = 'staff_store_roles_user_store_unique'
  ) THEN
    ALTER TABLE staff_store_roles
      RENAME CONSTRAINT staff_store_roles_user_store_unique
      TO staff_store_roles_user_id_store_id_key;
    RETURN;
  END IF;

  -- Fresh env with no prior unique constraint: create canonical constraint.
  ALTER TABLE staff_store_roles
    ADD CONSTRAINT staff_store_roles_user_id_store_id_key UNIQUE (user_id, store_id);
END $$;
