-- Onboarding & Identity Integrity Hardening — Part 1 of 2
--
-- Adds the welcome_bonus value to xp_source enum.
-- Must commit independently before Part 2 uses the new value in an index predicate
-- (PostgreSQL restriction: newly added enum values cannot be used until the
-- transaction that added them commits).
ALTER TYPE xp_source ADD VALUE IF NOT EXISTS 'welcome_bonus';
