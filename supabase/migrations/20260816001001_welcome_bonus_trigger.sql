-- Onboarding & Identity Integrity Hardening — Part 2 of 2
--
-- Runs after Part 1 (20260816001000) has committed so 'welcome_bonus' is a
-- valid xp_source value and can be used in index predicates.
--
-- Creates:
--   1. Partial unique index — one welcome_bonus row per player, enforced at DB level
--   2. Trigger function — awards 30 LXP atomically with every player INSERT
--   3. Trigger — installs the function on the players table

-- 1. Partial unique index: enforces exactly one welcome_bonus entry per player.
--    Also serves as the ON CONFLICT target in the trigger function below.
CREATE UNIQUE INDEX IF NOT EXISTS xp_ledger_welcome_one_per_player
  ON public.xp_ledger(player_id)
  WHERE source = 'welcome_bonus';

-- 2. Trigger function.
--    SECURITY DEFINER so it can insert into xp_ledger regardless of session role.
--    SET search_path = pg_catalog prevents search_path hijacking; all public-schema
--    objects are explicitly qualified.
--    ON CONFLICT ... DO NOTHING targets only the welcome-bonus index — any other
--    unique violation on xp_ledger surfaces normally and aborts the transaction.
CREATE OR REPLACE FUNCTION public.award_welcome_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO public.xp_ledger (
    player_id, game_id, base_xp, final_xp, multiplier, description, source
  ) VALUES (
    NEW.id, 'general', 30, 30, 1, 'Welcome bonus — account created', 'welcome_bonus'
  )
  ON CONFLICT (player_id) WHERE source = 'welcome_bonus'
  DO NOTHING;
  RETURN NEW;
END;
$$;

-- Revoke all direct invocation rights.
-- The trigger is invoked by PostgreSQL internally; no role needs EXECUTE.
REVOKE EXECUTE ON FUNCTION public.award_welcome_bonus() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_welcome_bonus() FROM anon;
REVOKE EXECUTE ON FUNCTION public.award_welcome_bonus() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.award_welcome_bonus() FROM service_role;

-- 3. Install the trigger (replace any prior version).
DROP TRIGGER IF EXISTS player_welcome_bonus ON public.players;
CREATE TRIGGER player_welcome_bonus
  AFTER INSERT ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.award_welcome_bonus();
