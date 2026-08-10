-- player_deletions audit table
CREATE TABLE IF NOT EXISTS player_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  clerk_user_id TEXT NOT NULL,
  initiated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'failed_at_clerk', 'manual_review_required')),
  current_step TEXT,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  external_systems_notified TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_deletions_player_id_idx ON player_deletions(player_id);
CREATE INDEX IF NOT EXISTS player_deletions_clerk_user_id_idx ON player_deletions(clerk_user_id);

-- Enable RLS — only service role can read/write (no player-facing RLS policy needed)
ALTER TABLE player_deletions ENABLE ROW LEVEL SECURITY;

-- Make player_id nullable on all anonymize targets
-- These are instant DDL ops — no table rewrite, no data impact
ALTER TABLE xp_ledger                 ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE prize_point_transactions  ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE prize_wall_redemptions    ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE daily_spins               ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE emperors                  ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE event_attendance          ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE event_attendances         ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE pass_history              ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE player_pass_subscriptions ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE circuit_qualifiers        ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE preorder_claims           ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE transactions              ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE card_of_the_day_votes     ALTER COLUMN player_id DROP NOT NULL;
