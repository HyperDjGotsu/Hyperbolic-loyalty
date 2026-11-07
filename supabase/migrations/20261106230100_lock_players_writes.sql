-- Lock down direct writes to public.players.
-- Found Nov 6, 2026: the anon and authenticated roles have INSERT/UPDATE on every column of players
-- (pass_tier, pass_expires_at, home_store_id, is_staff, ...), and two RLS policies allow it:
--   "Allow creating new players"  INSERT WITH CHECK (true)
--   "Allow initial clerk link"    UPDATE where clerk_user_id IS NULL
-- Anyone holding the public anon key could insert a player row with, say, a Diamond pass.
-- The web app only writes players through server routes using the service role (lib/supabase.ts is
-- 'server-only'; the mobile app has no Supabase client), so nothing legitimate depends on these.
-- Service role bypasses RLS and keeps working.

DROP POLICY IF EXISTS "Allow creating new players" ON public.players;
DROP POLICY IF EXISTS "Allow initial clerk link"   ON public.players;

REVOKE INSERT, UPDATE, DELETE ON public.players FROM anon, authenticated;
