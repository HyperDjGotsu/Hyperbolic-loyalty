-- Security hardening: revoke direct PostgREST/RPC access to server-only
-- SECURITY DEFINER functions and fix mutable search_path.
--
-- All four functions are called exclusively via supabaseAdmin (service_role)
-- in Next.js API routes. Granting PUBLIC/anon/authenticated EXECUTE allowed
-- unauthenticated callers to invoke them directly via /rest/v1/rpc/<name>,
-- bypassing all application-layer auth checks.
--
-- service_role retains EXECUTE (confirmed explicit in proacl prior to migration).
-- Codex independent review: PARTIAL → resolved (service_role explicit grant verified).

-- adjust_prize_points(uuid, uuid, integer, text)
-- Caller: apps/web/app/api/hq/prize-points/route.ts (service_role only)
REVOKE EXECUTE ON FUNCTION public.adjust_prize_points(uuid, uuid, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.adjust_prize_points(uuid, uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.adjust_prize_points(uuid, uuid, integer, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.adjust_prize_points(uuid, uuid, integer, text) TO service_role;
ALTER  FUNCTION public.adjust_prize_points(uuid, uuid, integer, text) SET search_path = public, pg_temp;

-- create_prize_redemption(uuid, uuid, uuid)
-- Caller: apps/web/app/api/prize-wall/redeem/route.ts (service_role only)
REVOKE EXECUTE ON FUNCTION public.create_prize_redemption(uuid, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_prize_redemption(uuid, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_prize_redemption(uuid, uuid, uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.create_prize_redemption(uuid, uuid, uuid) TO service_role;
ALTER  FUNCTION public.create_prize_redemption(uuid, uuid, uuid) SET search_path = public, pg_temp;

-- get_player_multiplier(uuid)
-- No active API callers — lock down fully.
REVOKE EXECUTE ON FUNCTION public.get_player_multiplier(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_player_multiplier(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_player_multiplier(uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.get_player_multiplier(uuid) TO service_role;
ALTER  FUNCTION public.get_player_multiplier(uuid) SET search_path = public, pg_temp;

-- get_user_point_balance(uuid, uuid)
-- Callers: by-clerk/route.ts, pass-status/route.ts, inventory/route.ts,
--          prize-wall/redeem/route.ts, lib/points.ts (all service_role)
-- Note: p_store_id has DEFAULT NULL in body; identity_args omit defaults.
REVOKE EXECUTE ON FUNCTION public.get_user_point_balance(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_point_balance(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_point_balance(uuid, uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.get_user_point_balance(uuid, uuid) TO service_role;
ALTER  FUNCTION public.get_user_point_balance(uuid, uuid) SET search_path = public, pg_temp;
