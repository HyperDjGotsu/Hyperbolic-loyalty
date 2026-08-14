-- Harden get_card_of_the_day: revoke public execute, fix mutable search_path.
-- Function is SECURITY INVOKER and not called from application code.
-- PUBLIC EXECUTE allows any anon caller to invoke via PostgREST /rpc/get_card_of_the_day.

REVOKE EXECUTE ON FUNCTION public.get_card_of_the_day(date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_card_of_the_day(date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_card_of_the_day(date) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.get_card_of_the_day(date) TO service_role;

ALTER FUNCTION public.get_card_of_the_day(date)
  SET search_path = pg_catalog, public, pg_temp;
