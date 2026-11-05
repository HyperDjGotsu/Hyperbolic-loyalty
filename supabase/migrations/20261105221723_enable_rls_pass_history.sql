-- Applied to production 2026-11-05 via Supabase MCP (version 20261105221723).
-- pass_history is only touched by SECURITY DEFINER membership RPCs and service-role routes,
-- so RLS on with no policies (deny anon/authenticated) is the intended lockdown.
ALTER TABLE public.pass_history ENABLE ROW LEVEL SECURITY;
