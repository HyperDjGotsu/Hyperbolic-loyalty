# Printable check-in requests: Benicia-only rollout (Tue Nov 10)

Status: code and migration are on branch `printable-checkin-requests` (commit `89d2372`). **Stage 1 (migration) is DONE and verified.** Everything after it is a plan: nothing is merged, pushed, deployed, enabled or tested yet, and **every stage below needs the owner's explicit approval before it runs.** Martinez is no longer part of this rollout. Only Benicia is ever enabled.

## Ground rules

1. **The default is OFF.** If any gate fails, or a deadline below is missed, printable QR is NOT used tonight. Tonight's events then run on the existing rotating kiosk QR and NFC, exactly as before. Not using it tonight costs nothing; rushing it can cost real players their points.
2. **No real player touches printable QR until Gates G1 to G4 have all passed**, in order. No printed sign leaves the building before G5.
3. One stage at a time. Re-run the stage's preflight immediately before it. Stop and report on any unexpected result; do not "fix forward" in production.
4. Never `supabase db push`. No force-push. No XP / Prize Point edits except the approved cleanup in Stage 5.
5. The existing check-in system (rotating QR, NFC, the check-in endpoint, `attendance-award.ts`) is never modified by this feature and is never switched off by it.

Feature flag: `CHECKIN_REQUESTS_STORES` (comma-separated store ids; unset = off everywhere; a change needs a redeploy). **The only value ever used is Benicia: `70f71af5-26f1-46ec-b97a-8c8776318d3d`.** Other store ids (for the "off elsewhere" check only): Pleasant Hill `d036a0a2-80f9-4be1-85a1-cfdc91314105`.

## Tonight's schedule (Benicia, PT) and the working timeline

Events: Star Wars Legion Open Tables 17:00 to 21:00; Lorcana Weekly 17:30 to 18:30; Gundam Weekly 18:30 to 19:30; One Piece Pirates Party Vol.4 18:30 to 19:30.

**Before anything else (independent of this feature):** Star Wars Legion and Lorcana Weekly are already marked `completed` (they were ended during this morning's testing, updated 08:44 PT; Legion holds DjGotsu's one test attendance and one result). Check-in only works on `active` events, so staff must be able to **Start** them again tonight. The activate route allows start from any status; confirm the HQ button is offered for a completed event, otherwise tell me and I will propose the smallest fix. This applies to existing check-in too.

| By (PT) | What | Deadline rule |
|---|---|---|
| now | Approvals for Stages 2 to 5 as a package, owner present at a Benicia-capable device | none |
| 12:00 | Stage 2: deploy with flag OFF, verified | If not done, skip tonight |
| 13:00 | Stage 3: fallbacks verified with the flag OFF | If not done, skip tonight |
| 14:30 | Stage 4: controlled test (flag ON for Benicia), Gates G1 to G3 passed | If not done, skip tonight |
| 15:15 | Stage 5: cleanup done and Dj back at baseline, kill-switch rehearsed | If not done, flag goes OFF and we stop |
| 15:30 | Stage 6: go / no-go (G4, G5) | **No-go is the default** |
| 16:00 | Staff briefing | |
| 17:00 | First live event, graduated use (Stage 7) | |

The test window is the daytime so no real players are in the store. Confirm no players are present and the Benicia kiosk tablet is off, or pinned to a test event, before creating each test event.

## What the code relies on (verified)

- **Evidence function** (`checkin_award_evidence(event, player)`) counts what the live check-in writes (`app/api/events/[id]/checkin/route.ts`): one `event_attendances` row; one `xp_ledger` row with `source = 'event_attendance'` and that `event_id`; one `prize_point_transactions` row with `source = 'event_checkin'`, `type = 'earn'`, `reference_id` = the event. Prize Points are 35 x multiplier (never 0). `events.store_id` is NOT NULL in production.
- **No false matches:** the HQ "operational" award uses the same two sources but writes no `event_id` / `reference_id`, so it is never counted. Wrap-up awards use other sources.
- **Checked against real data:** all 6 launch-night attendances classify as complete.
- **Stale XP views:** `player_xp_totals`, `player_game_xp`, `player_monthly_xp` are materialized views that are already out of date and are tracked as a separate follow-up. **Never call `refresh_xp_aggregates()` during this rollout or its cleanup.**
- **A pending request awards nothing.** Even with the flag on, a printed sign can only create a waiting-list row. Only a staff approval (PIN, ticked player, existing check-in route) can award. That is why "stop using the panel" is an instant, safe fallback.

## Stage 0: preflight (read-only, before every stage)

1. No active event unless the stage itself created one: `select status::text, count(*) from events group by 1;`
2. Migration still applied and nothing newer: `list_migrations` ends with `checkin_requests` (version `20261110182949`).
3. `select count(*) from checkin_requests;` is 0 before Stage 4, and equals the test rows after.
4. Test-account baseline (re-run immediately before Stage 3):
   ```sql
   select p.player_id, p.display_name, p.referred_by is not null as has_referrer, p.referral_bonus_paid,
     (select count(*) from xp_ledger x where x.player_id=p.id) as xp_rows,
     (select count(*) from prize_point_transactions t where t.player_id=p.id) as point_rows,
     (select coalesce(sum(amount),0) from prize_point_transactions t where t.player_id=p.id) as points_balance,
     (select count(*) from event_attendances a where a.player_id=p.id) as attendances,
     (select count(*) from notifications n where n.player_id=p.id) as notifications
   from players p where p.player_id in ('GGOB-6SFUZBLX','HYP-NCTE64');
   ```
   2026-11-10 10:32 PT: Dj = no referrer, 0 / 0 / 0 / 0 / 13. DjGotsu = no referrer, 5 / 1 / 35 / 1 / 31 (**DjGotsu is staff only in every test**). Dj is not staff; DjGotsu is network admin and Benicia manager and has a PIN.
5. `get_advisors` after any schema change.

## Stage 1: apply the migration. DONE 2026-11-10 18:29 UTC

Applied with `apply_migration` (name `checkin_requests`, exact file, md5 `82dd7249…`, recorded as version `20261110182949`) and verified: RLS on with no policies, `service_role`-only privileges, constraints, function ACLs, evidence function correct on all 6 real attendances, security advisors +1 informational "RLS enabled, no policy" (as intended), performance advisors +3 informational unindexed foreign keys on the new table (tiny table, no action). Rollback SQL (not needed unless the feature is abandoned):
```sql
begin;
set local lock_timeout = '5s';
drop function if exists public.checkin_award_evidence(uuid, uuid);
drop function if exists public.expire_checkin_requests(uuid);
drop table if exists public.checkin_requests;
commit;
```
Migration execution method (for the record): tested on an isolated Postgres under a single multi-statement string, an outer BEGIN/COMMIT, an injected failure, and lock contention. After a failed run the session stays aborted until `ROLLBACK`.

## Stage 2: deploy with the feature OFF everywhere (APPROVAL: merge + push)

Quiet window: no active events anywhere (Stage 0.1).
1. Fast-forward `main` to the branch, push, wait for the Vercel deployment (GitHub commit status of the pushed sha = success). `CHECKIN_REQUESTS_STORES` stays **unset**.
2. As DjGotsu, in the browser console on any page, for any real scheduled Benicia event id: `fetch('/api/events/<id>/checkin-requests').then(r=>r.json())` returns `{enabled:false}`; POST to `.../checkin-requests/unlock` returns 404 `feature_disabled`.
3. `/checkin?event_id=<id>&mode=request` shows "This check-in sign isn't active yet" for a signed-in player.
4. The kiosk page loads for a Benicia event and looks unchanged (rotating QR and "Tap Your Card" visible, no "Requests" button).
5. **Rollback:** Vercel promote the previous deployment (instant). The migration can stay; nothing else uses the table.

## Stage 3: verify the existing check-in methods with the flag OFF (APPROVAL: create test events, award Dj)

Goal: prove the fallbacks work on the new deployment before the feature exists in their path.
- Create `[TEST] checkin-requests E0` at Benicia through HQ (the same path as real events), scheduled in the past hour so it is not "upcoming", and Start it. Open `/kiosk?event_id=<E0>` on a staff device (not the shop kiosk).
- **Rotating QR:** Dj scans the kiosk QR with a phone and checks in. Expected: success screen (+35 XP, +35 points); then the Gate G1 SQL (below) shows exactly 1 / 1 / 1 and complete.
- **NFC (if the kiosk tablet and an NFC card for Dj are available):** tap on a second test event `E0n`. Expected: the same award. If no NFC hardware is on hand today, record "NFC not exercised"; its code is untouched and it calls the same endpoint that staff approval uses.
- Confirm no "Requests" button anywhere. End the events.

## Stage 4: controlled test with the flag ON for Benicia (APPROVAL: env change + redeploy + test events)

Setup: set `CHECKIN_REQUESTS_STORES=70f71af5-26f1-46ec-b97a-8c8776318d3d` and redeploy. Each case gets its own `[TEST] checkin-requests <case>` event at Benicia, active only while that case runs. Player = **Dj only**; staff = **DjGotsu**. Both are already home-verified with no Founding title and no referrer, so no verification, Founding Member or referral reward can fire. Do not create accounts.

| Case | Steps | Expected |
|---|---|---|
| T0 flag off elsewhere | As DjGotsu, `GET /api/events/<a scheduled Pleasant Hill event id>/checkin-requests` and the unlock POST | `{enabled:false}` / 404 `feature_disabled`; nothing written. Confirms only Benicia is on |
| T1 server PIN | Call approve / dismiss / reopen with no PIN cookie; one wrong PIN only (5 wrong tries lock the PIN for 5 minutes) | 403 `pin_required`; no cookie on a wrong PIN; names hidden in the list |
| T2 pending to approved | Dj scans the printed-sign link twice; staff unlock, tick Dj, Approve | One row; approved/`checked_in`; **exactly 1** attendance, 1 XP, 1 points; `awarded_by` = DjGotsu. This also proves the nested Clerk call |
| T3 dismissed to reopened | Staff dismiss; Dj re-requests (stays dismissed); staff Reopen; Approve | `reopened_count` 1; exactly 1 award |
| T4 expired to reopened | Request, end the event (expires), Start it again, Dj asks again | Pending again, `reopened_count` 1; **no approval, no award**; end the event again (expires) |
| T5 duplicate guard + fallbacks with the flag ON | Dj requests; then Dj checks in by the rotating QR; kiosk still shows the QR and the NFC prompt | List settles the request as already checked in; still exactly 1 award; rotating QR still works |
| T6 tablet | On the real kiosk tablet (store closed): idle lock after ~5 min, touch extends, airplane mode shows the banner and disables Approve | As described |

Not testable live (covered by automated tests): stale claims, `needs_review`, batches over 10. Optional, separate approval: synthetic rows on one `[TEST]` event.

### Gates

- **G1: award is complete (after the Stage 3 rotating-QR check-in and again after T2).** For the test event `<E>` and Dj (`<D>` = Dj's `players.id`):
  ```sql
  select 'attendance' k, count(*)::text v from event_attendances where event_id='<E>' and player_id='<D>'
  union all select 'xp rows / final_xp', count(*)::text || ' / ' || coalesce(max(final_xp)::text,'-') from xp_ledger where event_id='<E>' and player_id='<D>' and source='event_attendance'
  union all select 'points rows / amount / store', count(*)::text || ' / ' || coalesce(max(amount)::text,'-') || ' / ' || coalesce(max(store_id::text),'-') from prize_point_transactions where reference_id='<E>' and player_id='<D>' and source='event_checkin' and type='earn'
  union all select 'evidence', public.checkin_award_evidence('<E>','<D>')::text
  union all select 'request', coalesce((select status || '/' || coalesce(resolution,'-') || ' decided_by=' || coalesce(decided_by::text,'-') from checkin_requests where event_id='<E>' and player_id='<D>'),'none');
  ```
  Pass = attendance 1; XP 1 row with 35; points 1 row with 35 and store = Benicia; evidence `{attendance_rows:1, xp_rows:1, points_rows:1, points_expected:true}`; request `approved/checked_in` with `decided_by` = DjGotsu's `players.id` (for T2). Also run `supabase/checks/checkin-reconciliation.sql`: zero rows. And Dj's phone shows the confirmation.
- **G2: all of T0 to T6 pass**, with exactly the expected number of awards for Dj (each approved or checked-in case once).
- **G3: cleanup completes and Dj is back at baseline** (Stage 5).
- **G4: kill-switch rehearsal passes** (Stage 5).
- **G5: owner go decision and staff briefed** (Stage 6).

Any failure at any gate: stop, turn the flag off, report. No sign is printed.

## Stage 5: cleanup and kill-switch rehearsal (APPROVAL: the exact cleanup list)

### Cleanup (targeted and auditable; do not delete events first)

Deleting an event does **not** remove its XP or point rows (`xp_ledger.event_id` and `prize_point_transactions.reference_id` have no foreign key), so cleaning by deleting events alone would leave unexplained rewards. Order:

1. **Candidate list (read-only), then send it to the owner for approval.** Test events: `select id, name from events where name like '[TEST] checkin-requests%' and store_id='70f71af5-26f1-46ec-b97a-8c8776318d3d';`
   ```sql
   select 'xp' k, id, final_xp::text v, event_id::text ref from xp_ledger where player_id=:dj and event_id = any(:events) and source='event_attendance'
   union all select 'points', id, amount::text, reference_id::text from prize_point_transactions where player_id=:dj and reference_id = any(:events) and source='event_checkin' and type='earn'
   union all select 'notification', id, title, data->>'event_id' from notifications where player_id=:dj and type='event_recap' and (data->>'event_id') = any(:events_text);
   ```
   Expected: exactly one xp, one points and one notification row per award given to Dj (the Stage 3 check-ins plus T2, T3, T5: up to 5 each). Anything else stops the cleanup. **Only events named `[TEST] checkin-requests%` are ever in scope; no real Benicia event, and no row of a real player, can appear.**
2. **Guarded delete in one transaction**, pasting the approved ids (template; never run unfilled):
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
     delete from public.events where id = any(v_events) and name like '[TEST] checkin-requests%' and store_id = '70f71af5-26f1-46ec-b97a-8c8776318d3d';   -- cascades attendances, requests, results of these events only
     get diagnostics n = row_count; if n <> array_length(v_events,1) then raise exception 'events: expected %, got %', array_length(v_events,1), n; end if;
     -- back to the Stage 0.4 baseline for Dj (0 / 0 / 0 / 0 / 13), or whatever was re-recorded just before Stage 3
     if (select count(*) from xp_ledger where player_id = v_player) <> 0
        or (select count(*) from prize_point_transactions where player_id = v_player) <> 0
        or (select count(*) from event_attendances where player_id = v_player) <> 0
        or (select count(*) from notifications where player_id = v_player) <> 13 then
       raise exception 'Dj is not back at the recorded baseline';
     end if;
   end $$;
   commit;
   ```
3. Re-run the Stage 0.4 query and keep the before/after output with the candidate list as the audit record. Confirm `select count(*) from checkin_requests;` is 0 (the test rows went with their events).

Why not compensating entries: they would leave permanent negative XP and un-referenced `admin_adjust` point rows on the profile. Deleting exact, event-scoped, player-scoped, count-asserted rows restores the derived totals exactly (Prize Points are `SUM(amount)`; XP is summed from the ledger). Every delete needs the explicit id, the player, the test event id and the source, and any count mismatch rolls the whole transaction back. Push notifications already sent to Dj's phone cannot be recalled. **Do the cleanup before 17:00 so no test row ever sits beside real Benicia event data during a live event.**

### Kill-switch rehearsal (G4)

Unset `CHECKIN_REQUESTS_STORES` and redeploy. Verify: `{enabled:false}` for a Benicia event as DjGotsu; kiosk page loads with no "Requests" button; rotating QR and NFC prompt still shown (the Stage 3 results stand for the check-in itself). Then set it back to the Benicia id and redeploy, and verify `enabled:true`. This proves the switch works before anyone depends on it, and is rehearsed only while no event is active.

## Stage 6: go / no-go (owner decision, 15:30)

Go only if **all** are true: G1 to G4 passed; cleanup output attached; Star Wars Legion and Lorcana can be Started; staff know the fallback; a manager (network admin or Benicia manager with a PIN) is present at the shop for the first hour; the flag is set to Benicia only. Otherwise: flag OFF (or left OFF), existing methods only.

Staff briefing (5 minutes): print the sign from the panel; tick **only** people you can see in the room; approve in small groups; a "Needs review" row is never retried, it goes to the manager; the rotating QR and NFC stay on screen and keep working; if the panel misbehaves, stop using it and tell players to scan the kiosk QR.

## Stage 7: live use, graduated (starts 17:00)

1. **First event (Star Wars Legion): printable QR runs alongside the rotating QR and NFC, not instead of them.** Staff use it only for players who cannot reach the kiosk.
2. **First live batch:** after the first approvals (and again after every ~10 approvals for the first hour), run the checks below. Do not scale up until the first batch shows complete awards and no needs_review.
3. Print signs only after G1 to G4 (sign = the panel's Print button; one sign per event; it works only while that event is active).

### Monitoring (read-only, every ~15 minutes and after each batch; keep a note of the results)

- `supabase/checks/checkin-requests-watch.sql` R1 (requests by status), R2 (needs_review / stuck approvals), R3 (approved but award not complete), R5 (open requests on ended events).
- `supabase/checks/checkin-reconciliation.sql`: must return no rows (this is the duplicate / orphan check for XP and points).
- Duplicate prevention at a glance (healthy: attendance, XP and points counts are equal for each event; attendance is also protected by a unique constraint):
  ```sql
  select e.name,
    (select count(*) from event_attendances a where a.event_id=e.id) as attendance,
    (select count(*) from xp_ledger x where x.event_id=e.id and x.source='event_attendance') as xp_rows,
    (select count(*) from prize_point_transactions t where t.reference_id=e.id and t.source='event_checkin' and t.type='earn') as point_rows,
    (select count(*) from checkin_requests r where r.event_id=e.id and r.status='pending') as waiting,
    (select count(*) from checkin_requests r where r.event_id=e.id and r.status='needs_review') as needs_review
  from events e
  where e.store_id='70f71af5-26f1-46ec-b97a-8c8776318d3d' and e.status::text in ('active','completed') and e.scheduled_at > now() - interval '12 hours' and e.scheduled_at < now() + interval '12 hours'
  order by e.scheduled_at;
  ```
- Pending health: waiting requests should clear within a few minutes; oldest `pending` older than ~10 minutes while staff are present, or any `approving` older than 2 minutes, is a flag.

### Stop-the-line conditions (any one: stop using printable QR, tell staff to use the kiosk QR / NFC, then investigate)

- any `needs_review` that is not explained within 5 minutes;
- any R3 row (approved but not complete) or any reconciliation row (especially `duplicate_xp`, `duplicate_points`, `orphaned_*`);
- `attendance`, `xp_rows`, `point_rows` unequal for an event;
- an approval stuck in `approving` for over 2 minutes, or repeated approval failures;
- the panel's red banner ("cannot reach the server") or PIN unlock failing repeatedly;
- any player reporting double or missing points.

## Rollback (disables printable QR without touching the existing check-in system)

What is never affected: the check-in endpoint (`/api/events/[id]/checkin`), the rotating QR token route, the NFC handler, `attendance-award.ts`, XP and Prize Point logic. Printable QR is additive and sits beside them.

- **R-A, instant, no deploy (use first, in the room):** staff stop using the Requests panel and tell players to scan the kiosk QR or tap their NFC card. A pending request awards nothing, so leaving it pending is harmless. Players who already requested are simply checked in by QR / NFC (the list settles them as already checked in).
- **R-B, flag off (about 1 to 2 minutes):** unset `CHECKIN_REQUESTS_STORES` in Vercel and Redeploy. Do it when no approval batch is running (a batch of 10 takes seconds). Effects: panel hidden, staff routes return 404 `feature_disabled`, printed signs show "This check-in sign isn't active yet", no new requests are written. Existing requests stay as history; any `needs_review` row is handled by a manager with the reconciliation SQL.
- **R-C, code revert:** Vercel "Promote" the previous deployment (instant). The table stays (inert).
- **R-D, data:** nothing to undo for the feature itself. For test data, the Stage 5 cleanup. Do **not** drop `checkin_requests` unless the feature is abandoned (rollback SQL in Stage 1).
- **Verify after any rollback:** kiosk page shows the rotating QR and the NFC prompt; the next real check-in (or a `[TEST]` one when no event is live) completes with a full award (Gate G1 query); `{enabled:false}` for a Benicia event as DjGotsu.

## Approvals needed (nothing below has happened)

1. Stage 2: merge `printable-checkin-requests` to `main` and push (deploys with the flag unset).
2. Stage 3: create `[TEST]` events at Benicia and run the check-ins that award Dj.
3. Stage 4: set the flag to Benicia and redeploy; run the test cases T0 to T6.
4. Stage 5: the exact cleanup id list; the kill-switch rehearsal.
5. Stage 6: the go / no-go call itself.
