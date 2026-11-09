# Check-in reconciliation runbook

For incomplete or inconsistent event check-ins: a player was checked in but is missing XP or Prize Points, or a reward was written twice. Written for store managers and the developer.

**Golden rules**
1. **Never retry a check-in that said "ask a manager".** A retry cannot pay twice (the attendance row blocks it), but fixing it by hand is the safe way.
2. **Never edit an amount.** Rows are added or removed whole, never changed.
3. **Remove all three rows of a check-in, or none.** Never delete just one: a leftover XP or points row blocks the player's re-check-in on purpose.
4. **Preview first, change second, verify third.** Every change below starts with a SELECT.
5. Anything that writes to the production database is done by the developer (or with the developer), with a note of what was changed and why.

## Who does what

| Role | Can do |
|---|---|
| **Store staff** | Write down the player's ID, the event, the time and what the screen said. Do not retry. Tell a manager. |
| **Store manager** | Confirm the player really attended; look the player up in HQ (Players tab) and read Recent Activity; give the player a temporary make-good (HQ Award XP, up to 500, with a reason) if the manager decides to; escalate. |
| **Network admin / developer** | Run the reconciliation query; fix Prize Points (only a network admin can adjust them in HQ); run the repair SQL below. |

## 1. Detect

Any one of these:
- The kiosk or phone shows "This check-in could not be completed. Please ask a manager to check this player before trying again."
- A player says they checked in but their XP or points did not change.
- The weekly check: the developer runs `supabase/checks/checkin-reconciliation.sql` (SELECT only, safe any time). **Zero rows = healthy.**
- Log search (Vercel logs): `CHECKIN_NEEDS_REVIEW`. The line has ids only: `event=<id> player=<id> store=<id> staff=<id|self> reason=<...> remaining=<rows that may remain> at=<time>`.

The query returns one row per problem:

| `problem` | Meaning |
|---|---|
| `attendance_without_xp` | checked in, no attendance XP row |
| `attendance_without_points` | checked in at a store event, no check-in points row |
| `orphaned_xp` | attendance XP row, but no attendance row |
| `orphaned_points` | check-in points row, but no attendance row |
| `duplicate_xp` | more than one attendance XP row for one check-in (paid twice) |
| `duplicate_points` | more than one check-in points row (paid twice) |

Not covered by the query: attendance at a network (store-less) event, because those points follow the player's home store. Check those by hand.

## 2. Investigate (SELECT only)

Replace `<EVENT>` and `<PLAYER>` with the ids from the query or the log line. Use the player's `players.id` (a uuid), not the public ID on their card; find it with `select id from players where player_id = 'GGOB-XXXXXXXX'`.

```sql
-- the event
select id, name, status, store_id, scheduled_at from events where id = '<EVENT>';
-- the check-in
select id, event_id, player_id, xp_awarded, checked_in_at from event_attendances where event_id = '<EVENT>' and player_id = '<PLAYER>';
-- the XP rows for it
select id, final_xp, source, description, awarded_by, store_id, created_at from xp_ledger
 where event_id = '<EVENT>' and player_id = '<PLAYER>' and source = 'event_attendance' order by created_at;
-- the points rows for it
select id, amount, type, source, store_id, note, created_at from prize_point_transactions
 where reference_id = '<EVENT>' and player_id = '<PLAYER>' and source = 'event_checkin' order by created_at;
-- the player's pass (decides the points multiplier)
select player_id, display_name, home_store_id, pass_tier, pass_status, pass_expires_at from players where id = '<PLAYER>';
```

**Confirm with the store that the player was actually there.** That single fact decides between "complete the award" and "remove the leftovers".

**Expected amounts** (change nothing; these come from `lib/xp-constants.ts`): XP = 35 + 5 per round won. Points = round((35 + 5 per round) x multiplier), where the multiplier is 1.5 for a current Silver (`player`), 2 for a current Gold or Diamond (`all_access`, `diamond`), and 1 otherwise (including Bronze, expired or inactive passes). Only staff check-ins carry round wins.

## 3. Decide

| Problem | The player attended | The player did NOT attend |
|---|---|---|
| `attendance_without_xp` (also a `CHECKIN_NEEDS_REVIEW` with `remaining` containing `attendance` or `attendance_unknown`) | **Complete it:** add the missing XP row (A) and, at a store event, the missing points row (B) | **Remove it:** delete the attendance row (E), after confirming no XP or points rows exist |
| `attendance_without_points` | **Complete it:** add the missing points row (B) | Remove all three rows (C, then D, then E) |
| `orphaned_xp` | **Complete it:** add the missing attendance row (F), plus points if missing (B) | Delete the orphan XP row (C) |
| `orphaned_points` | **Complete it:** add the missing attendance row (F), plus XP if missing (A) | Delete the orphan points row (D) |
| `duplicate_xp` / `duplicate_points` | Delete the **later** duplicate by id (C / D), keep the earliest | same |

## 4. Repair (developer, production write: SELECT preview first, one transaction, check the row count)

Each statement is wrapped like this. If the preview or the returned count is not what you expect, `rollback` instead of `commit`. Never use a `where` that is not tied to the exact id or the exact event + player.

```sql
begin;
  -- run the matching statement below, then look at what it returned
commit;   -- or: rollback;
```

**A. Add the missing attendance XP row** (use the exact expected XP; description must start with `Attended ` so the referral check still works):
```sql
insert into xp_ledger (player_id, game_id, base_xp, final_xp, multiplier, description, source, awarded_by, store_id, event_id)
select '<PLAYER>', e.game_id, <XP>, <XP>, 1, 'Attended ' || e.name || ' (reconciled)', 'event_attendance', null, coalesce(e.store_id, p.home_store_id), e.id
  from events e, players p where e.id = '<EVENT>' and p.id = '<PLAYER>'
returning id, final_xp, store_id;           -- expect exactly 1 row
```
**B. Add the missing check-in points row** (exact expected points; skip if the event has no store and the player has no home store):
```sql
insert into prize_point_transactions (player_id, store_id, amount, type, source, reference_id, note)
select '<PLAYER>', coalesce(e.store_id, p.home_store_id), <POINTS>, 'earn', 'event_checkin', e.id, 'Attendance (reconciled)'
  from events e, players p where e.id = '<EVENT>' and p.id = '<PLAYER>'
returning id, amount, store_id;             -- expect exactly 1 row
```
**C. Delete one XP row (the extra or the orphan), by id:** `delete from xp_ledger where id = '<XP_ROW_ID>' and event_id = '<EVENT>' and player_id = '<PLAYER>' and source = 'event_attendance' returning id;` (expect 1 row)

**D. Delete one points row, by id:** `delete from prize_point_transactions where id = '<POINTS_ROW_ID>' and reference_id = '<EVENT>' and player_id = '<PLAYER>' and source = 'event_checkin' returning id;` (expect 1 row)

**E. Delete the attendance row** (only when no XP and no points rows remain for it): `delete from event_attendances where id = '<ATTENDANCE_ROW_ID>' and event_id = '<EVENT>' and player_id = '<PLAYER>' returning id;` (expect 1 row)

**F. Add the missing attendance row:**
```sql
insert into event_attendances (event_id, player_id, game_id, xp_awarded)
select e.id, '<PLAYER>', e.game_id, <XP> from events e where e.id = '<EVENT>'
returning id;                                -- expect exactly 1 row
```
If the player is waiting at the store, a manager's HQ **Award XP** (reason "Reconcile check-in <event name>") is an acceptable stopgap. It does not clear the query's flag (it is recorded as a manual adjustment), so the developer still completes A or B afterwards, and removes the stopgap row (C) so the player is not paid twice. Write the stopgap down.

## 5. Verify

1. Re-run `supabase/checks/checkin-reconciliation.sql`: the row for this event and player is gone, and nothing new appeared.
2. HQ Players tab, this player: Recent Activity shows "Attended <event>" once, and the Prize Points balance moved by the expected amount.
3. The player's own Home screen shows the new XP and points (they may need to pull to refresh or reopen the app).
4. The leaderboard shows the right total for them.
5. Write down: what was found, which statements were run, who confirmed attendance, the date.
