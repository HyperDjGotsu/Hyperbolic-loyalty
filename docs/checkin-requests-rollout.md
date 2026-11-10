# Printable check-in requests: rollout runbook

Status: code and migration are on branch `printable-checkin-requests`. **Nothing is applied, merged, pushed or deployed.** Every stage below needs the owner's explicit approval before it runs.

Rules for all stages: never `supabase db push` (local migration filenames and production versions differ). No force-push. One stage at a time, with its check passing before the next. Feature flag: `CHECKIN_REQUESTS_STORES` (comma-separated store ids; unset = off everywhere; changing it needs a redeploy).

Store ids: Benicia `70f71af5-26f1-46ec-b97a-8c8776318d3d`, Martinez `6845b53b-0dbc-4bb9-b22b-a745a527f038` (held, used for the controlled test), Pleasant Hill `d036a0a2-80f9-4be1-85a1-cfdc91314105`.

## What the code relies on (verified)

- **Evidence function** (`checkin_award_evidence(event, player)`) counts what the live check-in writes (`app/api/events/[id]/checkin/route.ts`): one `event_attendances` row; one `xp_ledger` row with `source = 'event_attendance'` and that `event_id`; one `prize_point_transactions` row with `source = 'event_checkin'`, `type = 'earn'`, `reference_id` = the event. Prize Points are 35 x multiplier (never 0), so the points row is always written when a store applies. `events.store_id` is NOT NULL in production.
- **No false matches:** the HQ "operational" award uses the same two sources but writes no `event_id` / `reference_id`, so it is never counted. Wrap-up awards use other sources.
- **Checked against real data:** all 6 launch-night attendances classify as complete (read-only query, 2026-11-10).
- **Stale XP views:** `player_xp_totals`, `player_game_xp`, `player_monthly_xp` are materialized views that are already out of date (DjGotsu: 3506 in the view vs 100 in the ledger). Nothing in the app refreshes them. **Never call `refresh_xp_aggregates()` as part of this rollout or its cleanup**: it would change unrelated visible totals.

## Stage 0: preflight (read-only)

1. `select status::text, count(*) from events group by 1;` expect no `active` row at apply time.
2. `select to_regclass('public.checkin_requests'), to_regprocedure('public.expire_checkin_requests(uuid)'), to_regprocedure('public.checkin_award_evidence(uuid,uuid)');` expect three nulls.
3. `list_migrations`: last version should still be `20261109050349 lock_down_attendance_and_votes` (anything newer means re-read before applying).
4. Baseline for the test accounts (recorded 2026-11-10; re-run immediately before testing):
   ```sql
   select p.player_id, p.display_name, p.referred_by is not null as has_referrer, p.referral_bonus_paid,
     (select count(*) from xp_ledger x where x.player_id=p.id) as xp_rows,
     (select count(*) from prize_point_transactions t where t.player_id=p.id) as point_rows,
     (select coalesce(sum(amount),0) from prize_point_transactions t where t.player_id=p.id) as points_balance,
     (select count(*) from event_attendances a where a.player_id=p.id) as attendances,
     (select count(*) from notifications n where n.player_id=p.id) as notifications
   from players p where p.player_id in ('GGOB-6SFUZBLX','HYP-NCTE64');
   ```
   2026-11-10: Dj = no referrer, 0 / 0 / 0 / 0 / 13. DjGotsu = no referrer, 5 / 1 / 35 / 1 / 31 (**DjGotsu is staff only in tests**).
5. `get_advisors` (security) baseline, to compare after.

## Stage 1: apply the migration (approval needed)

**Method:** the Supabase MCP `apply_migration`, name `checkin_requests`, query = the exact contents of `supabase/migrations/20261110090000_checkin_requests.sql`. Not `db push`. The tool records its own version (apply time) in `supabase_migrations`; that is expected.

**Transaction handling (tested on an isolated local Postgres, 13 checks):**
- The file has its own `begin; ... commit;`. As one multi-statement string it applies fully; inside an outer `BEGIN/COMMIT` it also applies fully (harmless warnings only: already in a transaction / none in progress).
- A failure anywhere before the file's `commit` (including the migration's own self-check) commits **nothing**. A second connection sees nothing created.
- **After a failed run the session stays in an aborted transaction until `ROLLBACK`** (error 25P02 on the next statement). If the tool reports "current transaction is aborted", run `rollback;` and re-check state with the query in Stage 0.2. No data is lost either way.
- Under a concurrent open write on `players` or `events` (the foreign keys need a brief lock) the file gives up with `lock_not_available` after 5 seconds and changes nothing. Retry when quiet. Apply with no event running.
- Not testable here: the exact wrapping the MCP tool adds. The file is safe under every wrapping tested, and the verification below does not depend on it.

**Verify (all read-only):**
```sql
select relrowsecurity from pg_class where oid='public.checkin_requests'::regclass;                      -- true
select count(*) from pg_policies where tablename='checkin_requests';                                     -- 0
select grantee from information_schema.role_table_grants where table_name='checkin_requests' and grantee in ('anon','authenticated','PUBLIC');  -- no rows
select conname from pg_constraint where conrelid='public.checkin_requests'::regclass and contype='u';    -- checkin_requests_event_player_key
select proname, prosecdef, proacl::text from pg_proc where proname in ('expire_checkin_requests','checkin_award_evidence');  -- secdef false; {postgres=X/postgres,service_role=X/postgres}
select count(*) from checkin_requests;                                                                   -- 0
select version, name from supabase_migrations.schema_migrations order by version desc limit 2;          -- checkin_requests on top
```
Then `public.checkin_award_evidence(<a launch-night event id>, <one of its players>)` should return 1 / 1 / 1 / true. Re-run `get_advisors`: the only new item expected is the informational "RLS enabled, no policy" (same as `store_join_codes`).

**Rollback:** the SQL below. It removes only the new table and functions (and the pending-request history), never attendance, XP or points.
```sql
begin;
set local lock_timeout = '5s';
drop function if exists public.checkin_award_evidence(uuid, uuid);
drop function if exists public.expire_checkin_requests(uuid);
drop table if exists public.checkin_requests;
commit;
```

## Stage 2: deploy with the feature OFF everywhere (approval needed: merge + push)

1. Fast-forward `main` to the branch, push, wait for the Vercel deployment (check the GitHub commit status of the pushed sha).
2. `CHECKIN_REQUESTS_STORES` is **not set**. Verify as DjGotsu in the browser console on any page, for a real scheduled Benicia event id: `fetch('/api/events/<id>/checkin-requests').then(r=>r.json())` returns `{enabled:false}`; `.../unlock` POST returns 404 `feature_disabled`.
3. A player opening `/checkin?event_id=<id>&mode=request` sees "This check-in sign isn't active yet".
4. Existing flows unchanged: the rotating kiosk QR and NFC still check in (their code is untouched; spot-check at the next real event, or in Stage 3 on a test event).
5. **Rollback:** Vercel "Promote" the previous deployment (instant). The migration can stay (nothing uses the table).

## Stage 3: controlled test activation (approval needed: env change + the test itself)

Setup: set `CHECKIN_REQUESTS_STORES` to the **Martinez** id only and redeploy. Create `[TEST] checkin-requests T0..T6` events at Martinez (held store, no real players). Player = **Dj only**; staff = **DjGotsu**. Both are already home-verified with no Founding title and no referrer, so no verification, Founding Member or referral reward can fire. Do not create accounts.

Independent cases, each on its own event so rows never collide:

| Case | Steps | Expected |
|---|---|---|
| T0 flag | Use an event at a store **not** listed (e.g. Pleasant Hill, no approvals) | Panel hidden; API 404 `feature_disabled`; player page "not active yet"; nothing written |
| T1 server PIN | As staff: call approve/dismiss/reopen with no PIN cookie; one wrong PIN only | 403 `pin_required`; no cookie on a wrong PIN; names hidden in the list |
| T2 pending to approved | Dj requests twice; staff unlock, tick, Approve | One row; approved/`checked_in`; **exactly 1** attendance, 1 XP, 1 points; `awarded_by` = DjGotsu; this also proves the nested Clerk call; `checkin-reconciliation.sql` returns nothing |
| T3 dismissed to reopened | Staff dismiss; Dj re-requests (stays dismissed); staff Reopen; Approve | `reopened_count` 1; exactly 1 award |
| T4 expired to reopened | Request, end event (expires), start it again, Dj asks again | Pending again, `reopened_count` 1; **no approval, no award**; end event again (expires) |
| T5 duplicate guard | Dj requests, then checks in by the rotating QR | List settles it as already checked in; still exactly 1 award |
| T6 tablet | On the real kiosk: idle lock after ~5 min, touch extends, airplane mode shows the banner and disables Approve | As described |

Not testable live (covered by automated tests): stale claims, `needs_review`, batches over 10. Optional later phase, only with separate approval: insert synthetic rows on one `[TEST]` event to exercise reconciliation.

Planned awards: T2, T3 and T5 each award Dj once (3 x 35 XP, 3 x 35 points, 3 notifications).

### Cleanup (targeted and auditable; do not delete events first)

Deleting an event does **not** remove its XP or point rows (`xp_ledger.event_id` and `prize_point_transactions.reference_id` have no foreign key), so cleaning by deleting events alone would leave unexplained rewards. Do it in this order:

1. **Candidate list (read-only), then send it to the owner for approval.** Use the test event ids: `select id, name from events where name like '[TEST] checkin-requests%' and store_id='6845b53b-0dbc-4bb9-b22b-a745a527f038';`
   ```sql
   select 'xp' k, id, final_xp::text v, event_id::text ref from xp_ledger where player_id=:dj and event_id = any(:events) and source='event_attendance'
   union all select 'points', id, amount::text, reference_id::text from prize_point_transactions where player_id=:dj and reference_id = any(:events) and source='event_checkin' and type='earn'
   union all select 'notification', id, title, data->>'event_id' from notifications where player_id=:dj and type='event_recap' and (data->>'event_id') = any(:events_text);
   ```
   Expected: exactly one xp, one points and one notification row per approved case (3 each). Anything else stops the cleanup.
2. **Guarded delete in one transaction**, pasting the approved ids (template, fill in; never run unfilled):
   ```sql
   begin;
   set local lock_timeout = '5s';
   do $$
   declare
     v_player uuid := '<Dj players.id>';
     v_events uuid[] := array['<test event ids>']::uuid[];
     v_xp  uuid[] := array['<xp_ledger ids from step 1>']::uuid[];
     v_pts uuid[] := array['<prize_point_transactions ids from step 1>']::uuid[];
     v_nt  uuid[] := array['<notifications ids from step 1>']::uuid[];
     n int;
   begin
     delete from public.xp_ledger where id = any(v_xp) and player_id = v_player and event_id = any(v_events) and source = 'event_attendance';
     get diagnostics n = row_count; if n <> array_length(v_xp,1) then raise exception 'xp: expected %, got %', array_length(v_xp,1), n; end if;
     delete from public.prize_point_transactions where id = any(v_pts) and player_id = v_player and reference_id = any(v_events) and source = 'event_checkin' and type = 'earn';
     get diagnostics n = row_count; if n <> array_length(v_pts,1) then raise exception 'points: expected %, got %', array_length(v_pts,1), n; end if;
     delete from public.notifications where id = any(v_nt) and player_id = v_player and type = 'event_recap' and (data->>'event_id')::uuid = any(v_events);
     get diagnostics n = row_count; if n <> array_length(v_nt,1) then raise exception 'notifications: expected %, got %', array_length(v_nt,1), n; end if;
     delete from public.events where id = any(v_events) and name like '[TEST] checkin-requests%';   -- cascades attendances, requests, results
     get diagnostics n = row_count; if n <> array_length(v_events,1) then raise exception 'events: expected %, got %', array_length(v_events,1), n; end if;
     -- back to the Stage 0.4 baseline for Dj (0 / 0 / 0 / 0 / 13), or whatever was re-recorded just before testing
     if (select count(*) from xp_ledger where player_id = v_player) <> 0
        or (select count(*) from prize_point_transactions where player_id = v_player) <> 0
        or (select count(*) from event_attendances where player_id = v_player) <> 0
        or (select count(*) from notifications where player_id = v_player) <> 13 then
       raise exception 'Dj is not back at the recorded baseline';
     end if;
   end $$;
   commit;
   ```
3. Re-run the Stage 0.4 query and keep the before/after output with the candidate list as the audit record.

Why not compensating entries: they would leave permanent negative XP and un-referenced `admin_adjust` point rows on the profile. Deleting exact, event-scoped, player-scoped, count-asserted rows restores the derived totals exactly (Prize Points are `SUM(amount)`; XP is summed from the ledger). Unrelated rewards cannot be touched: every delete needs the explicit id, the player, the test event id and the source, and any count mismatch rolls the whole transaction back. Push notifications already sent to Dj's phone cannot be recalled.

After cleanup: unset `CHECKIN_REQUESTS_STORES` (redeploy) or go straight to Stage 4.

## Stage 4: Benicia-only activation (approval needed: env change)

1. Set `CHECKIN_REQUESTS_STORES=70f71af5-26f1-46ec-b97a-8c8776318d3d` and redeploy. Other stores stay off.
2. Brief the staff: print the sign from the panel, tick only people in the room, never retry a "needs review" request, a manager handles those.
3. During the first event run `supabase/checks/checkin-requests-watch.sql`; afterwards `supabase/checks/checkin-reconciliation.sql`.
4. **Kill switch:** unset the variable and redeploy (about a minute). Players on a printed sign then see "not active yet" and staff fall back to the kiosk QR / NFC. Requests already made are kept as history.

## Rollback summary

| Stage | Undo |
|---|---|
| 4 | unset the env var, redeploy |
| 3 | unset the env var, redeploy; test data per the cleanup above |
| 2 | Vercel: promote the previous deployment |
| 1 | the rollback SQL above |
