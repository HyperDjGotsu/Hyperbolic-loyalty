-- Rate-limiting infrastructure: atomic PostgreSQL fixed-window counter.
-- Service-role-only access throughout; no anon/authenticated path.
-- PENDING: Apply via apply_migration and rename with DB-assigned version.

-- ── Table ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key    TEXT        NOT NULL,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- BIGINT prevents overflow for very active buckets (INT would fail at ~2B requests)
  request_count BIGINT      NOT NULL DEFAULT 0,
  CONSTRAINT rate_limit_buckets_pkey PRIMARY KEY (bucket_key)
);

-- Enable RLS — service_role has BYPASSRLS; no policies = deny-all for other roles
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- Explicit table privilege lockdown (no reliance on RLS alone)
REVOKE ALL ON public.rate_limit_buckets FROM PUBLIC;
REVOKE ALL ON public.rate_limit_buckets FROM anon;
REVOKE ALL ON public.rate_limit_buckets FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.rate_limit_buckets TO service_role;

-- ── Function ───────────────────────────────────────────────────────────────
-- Atomically increments the request counter for a fixed-window bucket and
-- returns allowed/remaining/reset_at.
--
-- Fixed-window semantics: the window anchors to the first request in each
-- period. A client can burst up to 2×limit by sending limit requests just
-- before expiry and limit requests just after reset. This is acceptable for
-- this app because DB constraints (unique daily_spin, optimistic lock on
-- gems, idempotent redemptions) remain the authoritative correctness control;
-- rate limiting is defense-in-depth only.
--
-- Always increments BEFORE checking: concurrent callers serialize on the PK
-- row lock and receive distinct post-increment counts. Only the request whose
-- count lands at or below p_max_requests is allowed.
--
-- SECURITY INVOKER: runs as the caller role (service_role). service_role has
-- BYPASSRLS plus explicit SELECT/INSERT/UPDATE grants. No SECURITY DEFINER
-- needed — that would create unnecessary privilege-escalation surface.

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key            TEXT,
  p_window_seconds INT,
  p_max_requests   INT
)
RETURNS TABLE(allowed BOOLEAN, remaining BIGINT, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_now          TIMESTAMPTZ := NOW();
  v_window_start TIMESTAMPTZ;
  v_count        BIGINT;
BEGIN
  -- Basic input validation — prevents bad callers from corrupting buckets
  IF p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'p_window_seconds must be positive, got %', p_window_seconds;
  END IF;
  IF p_max_requests <= 0 THEN
    RAISE EXCEPTION 'p_max_requests must be positive, got %', p_max_requests;
  END IF;
  IF length(p_key) = 0 OR length(p_key) > 512 THEN
    RAISE EXCEPTION 'p_key must be 1–512 characters, got length %', length(p_key);
  END IF;

  -- Atomic upsert:
  --   New bucket      → insert (window = now, count = 1)
  --   Expired window  → reset  (window = now, count = 1)
  --   Active window   → increment count in place
  -- Uses <= so a request arriving at the exact reset instant starts a new window.
  INSERT INTO public.rate_limit_buckets (bucket_key, window_start, request_count)
  VALUES (p_key, v_now, 1)
  ON CONFLICT (bucket_key) DO UPDATE
    SET
      window_start = CASE
        WHEN rate_limit_buckets.window_start
             + make_interval(secs => p_window_seconds) <= v_now
        THEN v_now
        ELSE rate_limit_buckets.window_start
      END,
      request_count = CASE
        WHEN rate_limit_buckets.window_start
             + make_interval(secs => p_window_seconds) <= v_now
        THEN 1
        ELSE rate_limit_buckets.request_count + 1
      END
  RETURNING window_start, request_count
  INTO v_window_start, v_count;

  RETURN QUERY SELECT
    (v_count <= p_max_requests::BIGINT)                          AS allowed,
    GREATEST(0, p_max_requests::BIGINT - v_count)                AS remaining,
    (v_window_start + make_interval(secs => p_window_seconds))   AS reset_at;
END;
$$;

-- ── Function permissions ───────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO service_role;
