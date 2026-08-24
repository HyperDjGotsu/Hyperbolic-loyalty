-- Records the column already applied to production.
-- IF NOT EXISTS is safe for replay on any environment that already has it.
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS has_claimed_trial BOOLEAN NOT NULL DEFAULT FALSE;
