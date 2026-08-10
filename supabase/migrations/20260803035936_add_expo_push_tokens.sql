-- Migration: 20260803035936_add_expo_push_tokens
-- Applied to production: 2026-08-03
-- Captured retroactively 2026-08-09 from live schema introspection.
-- DO NOT re-apply. Register with CLI:
--   npx supabase migration repair --status applied 20260803035936
--
-- expo_push_tokens: stores Expo push notification tokens for the mobile app.
-- Column layout confirmed from live OpenAPI spec.

CREATE TABLE IF NOT EXISTS expo_push_tokens (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  uuid        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  token      text        NOT NULL,
  platform   text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expo_push_tokens ENABLE ROW LEVEL SECURITY;

-- Players can read their own tokens; all writes via service_role
CREATE POLICY "players_read_own_push_tokens"
  ON expo_push_tokens
  FOR SELECT
  TO authenticated
  USING (
    player_id = (
      SELECT id FROM players
      WHERE clerk_user_id = auth.jwt() ->> 'sub'
      LIMIT 1
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_expo_push_tokens_player_token
  ON expo_push_tokens (player_id, token);

CREATE INDEX IF NOT EXISTS idx_expo_push_tokens_player_id
  ON expo_push_tokens (player_id);
