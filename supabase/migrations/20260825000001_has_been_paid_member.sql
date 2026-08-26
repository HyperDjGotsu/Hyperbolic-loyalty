-- Add has_been_paid_member flag.
-- TRUE iff this player has provably paid real money for a Player Pass at least once.
-- No backfill: audit + Codex confirmed no trustworthy historical payment evidence in schema.
-- False negatives (missing renewal prompts) are acceptable; false positives contaminate the field permanently.
ALTER TABLE players
  ADD COLUMN has_been_paid_member BOOLEAN NOT NULL DEFAULT FALSE;
