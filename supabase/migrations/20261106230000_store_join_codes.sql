-- Store join codes + verified home store.
-- Anyone can pick a home store at signup, so a stranger could claim to belong to a store.
-- Each store gets a rotatable join code (shown to staff in HQ, printed as a QR). A player
-- whose home store was set with the code, or who has checked in at that store, is "verified".

-- 1. Codes live in their own table so they can never leak through the stores table's read access.
--    RLS on with no policies = service role only (the app reads it server-side).
CREATE TABLE IF NOT EXISTS public.store_join_codes (
  store_id   uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  code       text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{6,12}$'),
  rotated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_join_codes ENABLE ROW LEVEL SECURITY;

-- 2. A starting code for every existing store (unambiguous letters and digits; staff can rotate in HQ).
INSERT INTO public.store_join_codes (store_id, code)
SELECT s.id,
       (SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (get_byte(gen_random_bytes(1), 0) % 32), 1), '')
          FROM generate_series(1, 6) WHERE s.id IS NOT NULL)
FROM public.stores s
ON CONFLICT (store_id) DO NOTHING;

-- 3. Verified home store. NULL = unverified.
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS home_store_verified_at timestamptz;

-- 4. Existing players keep working: grandfather everyone who already has a home store.
UPDATE public.players
   SET home_store_verified_at = now()
 WHERE home_store_id IS NOT NULL AND home_store_verified_at IS NULL;
