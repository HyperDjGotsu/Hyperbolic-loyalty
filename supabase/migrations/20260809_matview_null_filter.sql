-- Materialized View Recreation: add WHERE player_id IS NOT NULL
-- Source definitions: pg_matviews queried 2026-08-09.
-- Changes per view:
--   player_game_xp    - added AND player_id IS NOT NULL to existing WHERE game_id IS NOT NULL
--   player_monthly_xp - added AND player_id IS NOT NULL to existing WHERE game_id IS NOT NULL
--   player_xp_totals  - added WHERE player_id IS NOT NULL (no WHERE existed before)
--
-- Strategy: CREATE MATERIALIZED VIEW populates the view by default (WITH DATA).
-- No REFRESH command is included - the CREATE already populates the data.
--
-- Deployment order:
--   1. This file (20260809_matview_null_filter.sql)
--   2. 20260809_account_deletion.sql
--   3. Regenerate types
--
-- Verification after this migration, before the deletion migration:
--   SELECT COUNT(*) FROM player_xp_totals  WHERE player_id IS NULL;
--   SELECT COUNT(*) FROM player_game_xp    WHERE player_id IS NULL;
--   SELECT COUNT(*) FROM player_monthly_xp WHERE player_id IS NULL;
--   All three must return 0.

BEGIN;

-- player_game_xp

DROP MATERIALIZED VIEW IF EXISTS player_game_xp RESTRICT;

CREATE MATERIALIZED VIEW player_game_xp AS
SELECT player_id,
       game_id,
       sum(final_xp) AS game_xp,
       count(*) FILTER (WHERE source = 'match_win'::xp_source) AS game_wins,
       count(*) FILTER (WHERE source = 'event_attendance'::xp_source) AS game_events
FROM xp_ledger
WHERE game_id IS NOT NULL
  AND player_id IS NOT NULL
GROUP BY player_id, game_id;

ALTER MATERIALIZED VIEW player_game_xp OWNER TO postgres;

CREATE UNIQUE INDEX idx_player_game_xp
  ON player_game_xp (player_id, game_id);

GRANT ALL ON player_game_xp TO postgres;
GRANT ALL ON player_game_xp TO service_role;
GRANT ALL ON player_game_xp TO anon;
GRANT ALL ON player_game_xp TO authenticated;
REVOKE SELECT ON player_game_xp FROM anon;
REVOKE SELECT ON player_game_xp FROM authenticated;


-- player_monthly_xp
-- month column is timestamptz, result of date_trunc

DROP MATERIALIZED VIEW IF EXISTS player_monthly_xp RESTRICT;

CREATE MATERIALIZED VIEW player_monthly_xp AS
SELECT player_id,
       game_id,
       date_trunc('month'::text, created_at) AS month,
       sum(final_xp) AS monthly_xp
FROM xp_ledger
WHERE game_id IS NOT NULL
  AND player_id IS NOT NULL
GROUP BY player_id, game_id, date_trunc('month'::text, created_at);

ALTER MATERIALIZED VIEW player_monthly_xp OWNER TO postgres;

CREATE UNIQUE INDEX idx_player_monthly_xp
  ON player_monthly_xp (player_id, game_id, month);

GRANT ALL ON player_monthly_xp TO postgres;
GRANT ALL ON player_monthly_xp TO service_role;
GRANT ALL ON player_monthly_xp TO anon;
GRANT ALL ON player_monthly_xp TO authenticated;
REVOKE SELECT ON player_monthly_xp FROM anon;
REVOKE SELECT ON player_monthly_xp FROM authenticated;


-- player_xp_totals

DROP MATERIALIZED VIEW IF EXISTS player_xp_totals RESTRICT;

CREATE MATERIALIZED VIEW player_xp_totals AS
SELECT player_id,
       sum(final_xp) AS total_xp,
       count(*) FILTER (WHERE source = 'match_win'::xp_source) AS total_wins,
       count(*) FILTER (WHERE source = 'event_attendance'::xp_source) AS total_events
FROM xp_ledger
WHERE player_id IS NOT NULL
GROUP BY player_id;

ALTER MATERIALIZED VIEW player_xp_totals OWNER TO postgres;

CREATE UNIQUE INDEX idx_player_xp_totals
  ON player_xp_totals (player_id);

GRANT ALL ON player_xp_totals TO postgres;
GRANT ALL ON player_xp_totals TO service_role;
GRANT ALL ON player_xp_totals TO anon;
GRANT ALL ON player_xp_totals TO authenticated;
REVOKE SELECT ON player_xp_totals FROM anon;
REVOKE SELECT ON player_xp_totals FROM authenticated;


COMMIT;


-- ROLLBACK SQL
-- Restores exact live definitions without the player_id IS NOT NULL filters.
-- PostgreSQL treats NULLs as distinct in unique indexes by default, so the
-- rollback indexes will not fail. The filters exist to prevent meaningless
-- NULL aggregates in the views after a deletion and subsequent REFRESH.

-- BEGIN;
--
-- DROP MATERIALIZED VIEW IF EXISTS player_game_xp RESTRICT;
--
-- CREATE MATERIALIZED VIEW player_game_xp AS
-- SELECT player_id,
--        game_id,
--        sum(final_xp) AS game_xp,
--        count(*) FILTER (WHERE source = 'match_win'::xp_source) AS game_wins,
--        count(*) FILTER (WHERE source = 'event_attendance'::xp_source) AS game_events
-- FROM xp_ledger
-- WHERE game_id IS NOT NULL
-- GROUP BY player_id, game_id;
--
-- ALTER MATERIALIZED VIEW player_game_xp OWNER TO postgres;
-- CREATE UNIQUE INDEX idx_player_game_xp ON player_game_xp (player_id, game_id);
-- GRANT ALL ON player_game_xp TO postgres;
-- GRANT ALL ON player_game_xp TO service_role;
-- GRANT ALL ON player_game_xp TO anon;
-- GRANT ALL ON player_game_xp TO authenticated;
-- REVOKE SELECT ON player_game_xp FROM anon;
-- REVOKE SELECT ON player_game_xp FROM authenticated;
--
-- DROP MATERIALIZED VIEW IF EXISTS player_monthly_xp RESTRICT;
--
-- CREATE MATERIALIZED VIEW player_monthly_xp AS
-- SELECT player_id,
--        game_id,
--        date_trunc('month'::text, created_at) AS month,
--        sum(final_xp) AS monthly_xp
-- FROM xp_ledger
-- WHERE game_id IS NOT NULL
-- GROUP BY player_id, game_id, date_trunc('month'::text, created_at);
--
-- ALTER MATERIALIZED VIEW player_monthly_xp OWNER TO postgres;
-- CREATE UNIQUE INDEX idx_player_monthly_xp ON player_monthly_xp (player_id, game_id, month);
-- GRANT ALL ON player_monthly_xp TO postgres;
-- GRANT ALL ON player_monthly_xp TO service_role;
-- GRANT ALL ON player_monthly_xp TO anon;
-- GRANT ALL ON player_monthly_xp TO authenticated;
-- REVOKE SELECT ON player_monthly_xp FROM anon;
-- REVOKE SELECT ON player_monthly_xp FROM authenticated;
--
-- DROP MATERIALIZED VIEW IF EXISTS player_xp_totals RESTRICT;
--
-- CREATE MATERIALIZED VIEW player_xp_totals AS
-- SELECT player_id,
--        sum(final_xp) AS total_xp,
--        count(*) FILTER (WHERE source = 'match_win'::xp_source) AS total_wins,
--        count(*) FILTER (WHERE source = 'event_attendance'::xp_source) AS total_events
-- FROM xp_ledger
-- GROUP BY player_id;
--
-- ALTER MATERIALIZED VIEW player_xp_totals OWNER TO postgres;
-- CREATE UNIQUE INDEX idx_player_xp_totals ON player_xp_totals (player_id);
-- GRANT ALL ON player_xp_totals TO postgres;
-- GRANT ALL ON player_xp_totals TO service_role;
-- GRANT ALL ON player_xp_totals TO anon;
-- GRANT ALL ON player_xp_totals TO authenticated;
-- REVOKE SELECT ON player_xp_totals FROM anon;
-- REVOKE SELECT ON player_xp_totals FROM authenticated;
--
-- COMMIT;
