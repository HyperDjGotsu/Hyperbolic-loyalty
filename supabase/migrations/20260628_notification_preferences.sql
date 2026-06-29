-- Add notification_preferences JSONB column to players
-- 5 categories: daily_rewards, events, leaderboard, social, store
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{
    "daily_rewards": true,
    "events": true,
    "leaderboard": true,
    "social": true,
    "store": true
  }'::jsonb;
