-- Run this in the Supabase SQL editor for project gdyksfarqpzfvymzifxr (Hyperbolic Loyalty)
-- Tracks per-event player check-ins separately from the xp_ledger

CREATE TABLE IF NOT EXISTS event_attendances (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_id text,
  xp_awarded integer NOT NULL DEFAULT 0,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendances_event_id ON event_attendances(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendances_player_id ON event_attendances(player_id);

ALTER TABLE event_attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_event_attendances" ON event_attendances
  FOR SELECT USING (true);

CREATE POLICY "insert_event_attendances" ON event_attendances
  FOR INSERT WITH CHECK (true);
