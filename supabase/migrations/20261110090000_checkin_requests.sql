-- DRAFT, NOT APPLIED. Additive only: one new table + two functions (expiry sweep, read-only award evidence). Nothing existing is altered.
--
-- Printable check-in QR: a player who scans the printed sign creates a PENDING REQUEST. A request never awards anything.
-- Staff approve it from the kiosk, and the approval runs the existing staff check-in path (the only place that writes
-- attendance, XP, Prize Points, home-store verification and Founding Member). This table is only the waiting list + audit trail.
--
-- SAFETY
--   * One transaction. lock_timeout 5s: gives up (changes nothing) rather than queueing behind a long query.
--   * Touches no existing table, policy, function or trigger. Nothing references the new table, so the live app is unaffected
--     until the matching code is deployed.
--   * RLS on, no policies, all privileges revoked from anon/authenticated/public: only the service role (the app server) can use it.
--   * Self-verifying: the last step re-reads the catalog and RAISES (rolling everything back) if the end state is not as expected.
--   * Idempotent: safe to run twice.
--   Rollback: supabase/drafts/rollback_checkin_requests.sql
--
-- Statuses
--   pending       waiting for staff
--   approving     a staff approval is running right now (claim; stops two staff approving the same request at once)
--   approved      the player is checked in (resolution says how: checked_in = this approval did it, already_checked_in = they already were)
--   dismissed     staff said they are not here (final for that event)
--   expired       the event ended (or was not active) while it was still pending
--   needs_review  an approval ended in an unknown state; NEVER retried automatically. A manager reconciles it in the kiosk panel, which
--                 re-reads the authoritative award records (checkin_award_evidence) and only offers what they prove; anything partial is
--                 repaired by hand with supabase/checks/checkin-reconciliation.sql first.
-- A dismissed or expired request can be reopened (staff, or the player for an expired one) ONLY while the event is active and the award
-- records show nothing was written; if the records show a completed or partial award it is settled / sent to needs_review instead.
-- History is kept: rows are never deleted by the feature. They go away only with the event or the player (ON DELETE CASCADE,
-- the same as event_attendances), so account deletion keeps working.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table if not exists public.checkin_requests (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id)  on delete cascade,
  player_id     uuid not null references public.players(id) on delete cascade,
  status        text not null default 'pending'
                check (status in ('pending','approving','approved','dismissed','expired','needs_review')),
  resolution    text,                       -- checked_in | already_checked_in | event_ended | dismissed | renewal_required | ...
  last_error    text,                       -- short machine-readable reason from the last approval attempt
  attempts      integer not null default 0, -- approval attempts started (audit)
  requested_at  timestamptz not null default now(),
  decided_by    uuid references public.players(id) on delete set null,  -- the staff member who approved/dismissed
  decided_at    timestamptz,
  reopened_count integer not null default 0,                             -- how many times it was put back to pending (audit)
  reviewed_by   uuid references public.players(id) on delete set null,  -- the manager who reconciled a needs_review request
  reviewed_at   timestamptz,
  updated_at    timestamptz not null default now(),
  constraint checkin_requests_event_player_key unique (event_id, player_id)   -- one request per event + player (idempotent)
);

-- The staff list and the expiry sweep only look at open rows.
create index if not exists checkin_requests_open_idx
  on public.checkin_requests (event_id, requested_at)
  where status in ('pending','approving','needs_review');

alter table public.checkin_requests enable row level security;
revoke all on table public.checkin_requests from public, anon, authenticated;
grant  all on table public.checkin_requests to service_role;

-- Expire still-pending requests whose event is no longer active. p_event = one event, or NULL = every event.
-- Only 'pending' rows are expired: 'approving' and 'needs_review' are never silently closed.
create or replace function public.expire_checkin_requests(p_event uuid default null)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare n integer;
begin
  update public.checkin_requests r
     set status = 'expired', resolution = 'event_ended', decided_at = now(), updated_at = now()
   where r.status = 'pending'
     and (p_event is null or r.event_id = p_event)
     and exists (select 1 from public.events e where e.id = r.event_id and e.status::text <> 'active');
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.expire_checkin_requests(uuid) from public, anon, authenticated;
grant execute on function public.expire_checkin_requests(uuid) to service_role;

-- READ-ONLY evidence of what an approval actually wrote for one (event, player). The staff screens never trust attendance alone:
-- attendance is only the lock the check-in takes first, XP and Prize Points are written after it. Counts, not booleans, so a
-- duplicate shows up. points_expected mirrors the check-in route: Prize Points are paid when the event (or, failing that, the
-- player's home store) has a store.
create or replace function public.checkin_award_evidence(p_event uuid, p_player uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'attendance_rows', (select count(*) from public.event_attendances a where a.event_id = p_event and a.player_id = p_player),
    'xp_rows',         (select count(*) from public.xp_ledger x where x.event_id = p_event and x.player_id = p_player and x.source = 'event_attendance'),
    'points_rows',     (select count(*) from public.prize_point_transactions t where t.reference_id = p_event and t.player_id = p_player and t.source = 'event_checkin' and t.type = 'earn'),
    'points_expected', coalesce((select coalesce(e.store_id, pl.home_store_id) is not null
                                   from public.events e, public.players pl where e.id = p_event and pl.id = p_player), false)
  );
$$;

revoke all on function public.checkin_award_evidence(uuid, uuid) from public, anon, authenticated;
grant execute on function public.checkin_award_evidence(uuid, uuid) to service_role;

-- Self-check: raise (and roll everything back) unless the end state is exactly as intended.
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.checkin_requests'::regclass) then
    raise exception 'checkin_requests: RLS is not enabled';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'checkin_requests') then
    raise exception 'checkin_requests: unexpected policy present (service role only is intended)';
  end if;
  if exists (select 1 from information_schema.role_table_grants
              where table_schema = 'public' and table_name = 'checkin_requests' and grantee in ('anon','authenticated','PUBLIC')) then
    raise exception 'checkin_requests: anon/authenticated/public still hold a privilege';
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.checkin_requests'::regclass and conname = 'checkin_requests_event_player_key') then
    raise exception 'checkin_requests: unique (event_id, player_id) is missing';
  end if;
  if has_function_privilege('anon', 'public.expire_checkin_requests(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.expire_checkin_requests(uuid)', 'execute') then
    raise exception 'expire_checkin_requests is callable by the public key';
  end if;
  if has_function_privilege('anon', 'public.checkin_award_evidence(uuid,uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.checkin_award_evidence(uuid,uuid)', 'execute') then
    raise exception 'checkin_award_evidence is callable by the public key';
  end if;
end $$;

commit;
