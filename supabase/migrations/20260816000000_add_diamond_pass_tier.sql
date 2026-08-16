-- Add diamond tier to the pass_tier enum.
-- IF NOT EXISTS is a PostgreSQL safety guard; a duplicate ADD VALUE is a no-op.
-- Existing rows are unaffected — all production players currently hold 'none'.
ALTER TYPE pass_tier ADD VALUE IF NOT EXISTS 'diamond';
