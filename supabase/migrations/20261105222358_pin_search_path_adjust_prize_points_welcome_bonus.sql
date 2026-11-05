-- Applied to production 2026-11-05 via Supabase MCP (version 20261105222358).
-- Clears the Supabase "function_search_path_mutable" WARN on two functions.
-- ALTER ... SET leaves bodies and grants untouched; public, pg_temp keeps the
-- unqualified prize_point_transactions reference in adjust_prize_points resolving to public.
ALTER FUNCTION public.adjust_prize_points(uuid, uuid, integer, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.award_welcome_bonus() SET search_path = public, pg_temp;
