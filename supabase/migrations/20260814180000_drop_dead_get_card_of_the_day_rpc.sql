-- Drop the get_card_of_the_day() RPC function.
-- Confirmed dead: zero .rpc() callers in web or mobile.
-- CotD routes query card_of_the_day_history directly.
-- Hardened (REVOKE from PUBLIC/anon/authenticated) on 20260814 but never called.
-- Both independent audits confirmed no runtime dependency.
DROP FUNCTION IF EXISTS public.get_card_of_the_day(date) CASCADE;
