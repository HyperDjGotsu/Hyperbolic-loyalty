-- DRAFT v3, NOT APPLIED. Apply FIRST. Needs no application change.
-- Closes security holes that exist in production today (audited from the live catalog on 2026-11-08):
--   event_attendances         INSERT policy for PUBLIC with check (true): anyone can forge a check-in row for any player.
--   card_of_the_day_votes     two policies granted to PUBLIC (INSERT check true; ALL true): anyone can add, change, delete votes.
--   card_of_the_day_pool      "Service role can manage pool"    (ALL, true) granted to PUBLIC: anyone can edit the pool.
--   card_of_the_day_history   "Service role can manage history" (ALL, true) granted to PUBLIC: anyone can edit the history.
--   xp_ledger, prize_point_transactions: RLS refuses writes today only because no policy exists; anon/authenticated still
--     HOLD insert/update/delete AND TRUNCATE (TRUNCATE ignores row-level security) on all six tables.
--   Five functions are callable by the public key and are not used by the application (award_xp is refused by RLS today).
-- The service role has BYPASSRLS and keeps all its privileges, so nothing the application does changes.
--
-- SAFETY
--   * One transaction: begin ... commit. If any statement fails, nothing is changed.
--   * lock_timeout 5s: if a long-running query holds a lock on one of these tables, the migration gives up (and changes
--     nothing) instead of queueing behind it and blocking the app.
--   * Self-verifying: the last step before commit re-reads the catalog and RAISES if the end state is not exactly what is
--     expected (a leftover grant, a column-level grant, any write policy for public/anon/authenticated, service_role missing a
--     privilege, a function still callable by the public key). Raising rolls the whole migration back.
--   * Idempotent: every statement is safe to run twice.
--   Rollback: supabase/drafts/rollback_20261108210200_lock_down_attendance_and_votes.sql

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Attendance
drop policy if exists "insert_event_attendances" on public.event_attendances;
drop policy if exists "read_event_attendances"   on public.event_attendances;   -- server-only data; nothing in a browser reads it
revoke insert, update, delete, truncate on public.event_attendances from anon, authenticated;

-- Card of the Day (votes drive XP; pool and history decide the winner)
drop policy if exists "Players can insert own votes"      on public.card_of_the_day_votes;
drop policy if exists "Service role can manage votes"     on public.card_of_the_day_votes;
drop policy if exists "Players can view own votes"        on public.card_of_the_day_votes;   -- was USING (true): everyone's votes
drop policy if exists "Service role can manage pool"      on public.card_of_the_day_pool;
drop policy if exists "Service role can manage history"   on public.card_of_the_day_history;
revoke insert, update, delete, truncate on public.card_of_the_day_votes   from anon, authenticated;
revoke insert, update, delete, truncate on public.card_of_the_day_pool    from anon, authenticated;
revoke insert, update, delete, truncate on public.card_of_the_day_history from anon, authenticated;
-- kept on purpose (read-only, public by design): "Anyone can view approved pool cards", "Anyone can view history"

-- Ledger and points: turn "no policy" into a hard wall
revoke insert, update, delete, truncate on public.xp_ledger                from anon, authenticated;
revoke insert, update, delete, truncate on public.prize_point_transactions from anon, authenticated;

-- Functions the public key can call but the application never does
do $$
declare f text;
begin
  foreach f in array array[
    'public.award_xp(uuid, integer, xp_source, text, text, uuid, uuid)',
    'public.get_pass_multiplier(uuid)',
    'public.get_xp_discount(uuid)',
    'public.get_player_rank(uuid, text)',
    'public.refresh_xp_aggregates()'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke execute on function %s from public, anon, authenticated', f);
    end if;
  end loop;
end $$;

-- VERIFY: re-read the catalog; any surprise raises, which rolls everything above back.
do $verify$
declare
  tbl   text;
  rol   text;
  fn    text;
  oid_  oid;
  bad   text := '';
  six   text[] := array['event_attendances','xp_ledger','prize_point_transactions','card_of_the_day_votes','card_of_the_day_pool','card_of_the_day_history'];
  n     int;
begin
  foreach tbl in array six loop
    foreach rol in array array['anon','authenticated'] loop
      -- has_any_column_privilege is true for a table-level grant AND for a grant on even one column
      if has_any_column_privilege(rol, 'public.' || tbl, 'INSERT') then bad := bad || format('%s can still INSERT into %s; ', rol, tbl); end if;
      if has_any_column_privilege(rol, 'public.' || tbl, 'UPDATE') then bad := bad || format('%s can still UPDATE %s; ', rol, tbl); end if;
      if has_table_privilege(rol, 'public.' || tbl, 'DELETE')      then bad := bad || format('%s can still DELETE from %s; ', rol, tbl); end if;
      if has_table_privilege(rol, 'public.' || tbl, 'TRUNCATE')    then bad := bad || format('%s can still TRUNCATE %s; ', rol, tbl); end if;
    end loop;
    -- the application's role must keep everything
    if not (has_table_privilege('service_role', 'public.' || tbl, 'SELECT') and has_table_privilege('service_role', 'public.' || tbl, 'INSERT')
        and has_table_privilege('service_role', 'public.' || tbl, 'UPDATE') and has_table_privilege('service_role', 'public.' || tbl, 'DELETE')) then
      bad := bad || format('service_role lost access to %s; ', tbl);
    end if;
  end loop;

  -- no policy may let public/anon/authenticated write to these tables, whatever its name or condition
  select count(*) into n from pg_policies
   where schemaname = 'public' and tablename = any(six) and cmd in ('INSERT','UPDATE','DELETE','ALL')
     and roles && array['public','anon','authenticated']::name[];
  if n > 0 then bad := bad || format('%s write policies for public/anon/authenticated remain; ', n); end if;

  -- the read policies kept on purpose must still exist (guards against dropping too much)
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='card_of_the_day_history' and policyname='Anyone can view history') then bad := bad || 'history read policy is gone; '; end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='card_of_the_day_pool' and policyname='Anyone can view approved pool cards') then bad := bad || 'pool read policy is gone; '; end if;

  -- functions: not callable by the public key (EXECUTE via PUBLIC counts), still callable by the service role
  foreach fn in array array['public.award_xp(uuid, integer, xp_source, text, text, uuid, uuid)','public.get_pass_multiplier(uuid)','public.get_xp_discount(uuid)','public.get_player_rank(uuid, text)','public.refresh_xp_aggregates()'] loop
    oid_ := to_regprocedure(fn);
    if oid_ is not null then
      if has_function_privilege('anon', oid_, 'EXECUTE') or has_function_privilege('authenticated', oid_, 'EXECUTE') then bad := bad || format('%s is still callable by the public key; ', fn); end if;
      if not has_function_privilege('service_role', oid_, 'EXECUTE') then bad := bad || format('service_role lost EXECUTE on %s; ', fn); end if;
    end if;
  end loop;

  if bad <> '' then
    raise exception 'LOCKDOWN VERIFICATION FAILED, nothing was changed: %', bad using errcode = 'P0001';
  end if;
end
$verify$;

commit;
