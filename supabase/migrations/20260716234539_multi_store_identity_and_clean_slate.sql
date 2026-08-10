-- Migration: 20260716234539_multi_store_identity_and_clean_slate
-- Applied to production: 2026-07-16
-- Captured retroactively 2026-08-09 from live schema introspection.
-- DO NOT re-apply. Register with CLI:
--   npx supabase migration repair --status applied 20260716234539

-- app_users: maps Clerk identities to internal UUIDs for staff/admin
-- Separate from players table; a person can be both a player and a staff user
CREATE TABLE IF NOT EXISTS app_users (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text        NOT NULL UNIQUE,
  email         text,
  real_name     text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
-- All reads/writes via service_role only (no authenticated-role policies)

-- network_staff_roles: global admin roles (e.g. network_admin)
CREATE TABLE IF NOT EXISTS network_staff_roles (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role       text        NOT NULL DEFAULT 'network_admin',
  granted_by uuid        REFERENCES app_users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE network_staff_roles ENABLE ROW LEVEL SECURITY;

-- staff_store_roles: per-store roles (e.g. store_staff, store_manager)
CREATE TABLE IF NOT EXISTS staff_store_roles (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  store_id   uuid        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  role       text        NOT NULL DEFAULT 'store_staff',
  granted_by uuid        REFERENCES app_users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE staff_store_roles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_staff_store_roles_user_id  ON staff_store_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_staff_store_roles_store_id ON staff_store_roles (store_id);

-- network_settings: single-row global settings (id always = 1)
CREATE TABLE IF NOT EXISTS network_settings (
  id               integer     PRIMARY KEY DEFAULT 1,
  player_id_prefix text        NOT NULL DEFAULT 'GGC',
  network_name     text        NOT NULL DEFAULT 'Gamer''s Guild Corp',
  updated_at       timestamptz NOT NULL DEFAULT now()
);

INSERT INTO network_settings (id, player_id_prefix, network_name)
VALUES (1, 'GGC', 'Gamer''s Guild Corp')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE network_settings ENABLE ROW LEVEL SECURITY;
