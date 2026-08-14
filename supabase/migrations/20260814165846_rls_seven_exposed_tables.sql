-- RLS hardening for 7 tables that had RLS disabled with full anon/authenticated CRUD.
--
-- Architecture context:
-- All app reads and writes go through supabaseAdmin (service_role) in Next.js API routes.
-- service_role has BYPASSRLS and is unaffected by anything below.
-- No Supabase JWT auth is issued to end users — Clerk is the auth layer.
-- The TO authenticated SELECT policies below are architecturally inert today
-- (authenticated role is never assumed by current app traffic). They are
-- forward-compatibility stubs for a potential future Supabase-auth'd browser client.
-- Codex independent review: PARTIAL AGREE — safe to apply, no blocking issues.
--
-- Idempotency: CREATE POLICY fails if run twice (no IF NOT EXISTS in PostgreSQL).
-- This is safe because apply_migration registers the version; migration runners
-- will not replay an already-applied version.

-- ----------------------------------------------------------------
-- shop_items
-- Intended: publicly browsable (behind login), all writes via HQ
-- ----------------------------------------------------------------
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_items: authenticated read"
  ON public.shop_items FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------
-- player_inventory
-- Intended: private — player's own unlocked items, server writes only
-- No SELECT policy = deny-all for non-service_role (correct)
-- ----------------------------------------------------------------
ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- network_settings
-- Intended: service_role only — network config, no client access
-- No policies = deny-all (correct)
-- ----------------------------------------------------------------
ALTER TABLE public.network_settings ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- bounty_hunter_events
-- Intended: players read event schedule; HQ writes via service_role
-- ----------------------------------------------------------------
ALTER TABLE public.bounty_hunter_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bounty_hunter_events: authenticated read"
  ON public.bounty_hunter_events FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------
-- bounty_hunter_participants
-- Intended: players read participant list; opt-in/out via API (service_role)
-- ----------------------------------------------------------------
ALTER TABLE public.bounty_hunter_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bounty_hunter_participants: authenticated read"
  ON public.bounty_hunter_participants FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------
-- bounty_hunter_matches
-- Intended: players read results; HQ records matches via service_role
-- ----------------------------------------------------------------
ALTER TABLE public.bounty_hunter_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bounty_hunter_matches: authenticated read"
  ON public.bounty_hunter_matches FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------
-- event_interest
-- Intended: players read interest counts; toggle via /api/events/interest (service_role)
-- ----------------------------------------------------------------
ALTER TABLE public.event_interest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_interest: authenticated read"
  ON public.event_interest FOR SELECT TO authenticated USING (true);
