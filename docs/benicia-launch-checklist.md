# Benicia limited launch: checklist, first-week monitoring, escalation

Scope: Gamer's Guild of Benicia only. Martinez and Pleasant Hill stay off until Benicia has run a clean event night.
Everything here is read-only except the items marked "needs approval".

## A. Go / no-go

| # | Item | Status | Owner |
|---|---|---|---|
| 1 | Security lockdown applied and verified (no always-true write policies) | DONE | |
| 2 | P0 reliability code live on main (e58259b) | DONE | |
| 3 | Smoke test: one kiosk check-in, one blocked duplicate, rows and balances exact, reconciliation 0 | DONE (database level) | |
| 4 | Home and Profile show 65 XP, 35 Prize Points and exactly one Universus activity | OPEN | Darrell (screenshot) |
| 5 | Vercel logs: no `CHECKIN_NEEDS_REVIEW` and no check-in 5xx around 22:06 PT Nov 8 | OPEN | Darrell |
| 6 | Stale Benicia events closed (see section B) | DONE Nov 8, 10:2x PM PT: both set to `completed`, no other event touched, reconciliation still 0 | Darrell |
| 7 | This runbook and the SQL files are on main | DONE with this commit | |
| 8 | Staff told the one rule: on "ask a manager", do not retry, write down the player, event and time, tell a manager | OPEN | Darrell |
| 9 | Martinez and Pleasant Hill still off | HOLD | |

GO when 4 to 8 are done. NO-GO if 5 shows any `CHECKIN_NEEDS_REVIEW` or a check-in 5xx, or reconciliation returns any row.

## B. Stale-event audit (Nov 8, evening). The two stale events were then closed, see item 6

Closing means setting status to `completed`. Staff normally do this from HQ ("End event"); nothing here was changed.

| Event | Status | Scheduled | Check-ins | Recommendation |
|---|---|---|---|---|
| Universus Weekly (3593794d) | active | Nov 1 17:00 | 1 (the smoke test) | Close after the launch is confirmed. It was left active on purpose for the test. It keeps its check-in. |
| Pokemon Weekend Play (fb7538c8) | active | Nov 1 15:30 | 0 | Close. A week old, active, nobody checked in. Players could still be checked into it. |
| Seven Nov 8 events (Dragon Ball Fusion, One Piece Pirates Party Vol.4, Union Arena Weekly, Pokemon Weekend Trade, Azuki, Pokemon Weekend Play, Universus Weekly) | scheduled | Nov 8 14:00 to 18:00 | 0 | Leave. The 3am job marks them completed on its own once they ended more than an hour ago. |

The 3am job only completes events still `scheduled`. An `active` event that nobody ends stays active forever, so these two will not clear themselves. Week-one habit: staff end the event at close.
Martinez has one past-dated scheduled event and one for Jan 13; left alone (store on hold).

## C. First-week monitoring

After every Benicia event night (same night or the next morning), the developer runs, SELECT only:
1. `supabase/checks/checkin-reconciliation.sql`. Zero rows is healthy.
2. `supabase/checks/event-night-summary.sql`. Each event: attendances = XP rows = points rows, `mismatch` says `ok`.
3. `supabase/checks/first-week-watch.sql` (queries W1 to W8, one at a time; each states what healthy looks like).
4. Vercel logs: search `CHECKIN_NEEDS_REVIEW`, and 5xx on `/api/events`.

Daily for the first three days: items 1 and 4. Record the result in the shared notes (date, rows found, action).

Stop rule: any reconciliation row, any `CHECKIN_NEEDS_REVIEW`, or any MISMATCH means no new store and no new feature until it is explained and fixed under the runbook.

## D. Escalation

| Who | When | Does |
|---|---|---|
| Staff | The screen says "ask a manager", or a player says XP or points did not change | Do not retry. Note player ID, event, time, what the screen said. Tell the manager. |
| Manager | Staff report, or player complaint | Confirm the player attended. Check the player in HQ, Players tab, Recent Activity. Message the developer with the note. May give a small make-good (HQ Award XP, with a reason) if they decide to. |
| Developer | Manager report, `CHECKIN_NEEDS_REVIEW`, or a monitoring row | Run reconciliation, follow `docs/checkin-reconciliation-runbook.md` (preview, one fix, verify). Every production write needs Darrell's approval. |
| Darrell | Anything touching more than one player, any money or pass issue, or a repeat of the same problem | Decides: pause check-ins, or hold the launch. |

## E. Not yet exercised in production, watch at the first real event

| Workflow | Why it matters | Watch with |
|---|---|---|
| Player self check-in (QR on own phone) | Only the staff kiosk path ran live. DB should show `awarded_by` empty for phone check-ins. | W2 |
| Round wins and wrap-up (+5 XP, +5 points per win, undefeated bonus) | Never run live. Largest write path, and where double awards would show. | W3, reconciliation |
| Referral reward on a new player's first event (+50 XP, +10 points to the referrer) | Never fired live (0 rows). Must pay once. | W4 |
| Founding Member and home-store verification on a check-in | Join-code signup was fixed; the check-in path was not exercised for a new player. | W6 |
| Paid-pass multipliers (1.5x, 2x) | All players are on the free tier, so these have never run. Do not sell passes until tested once. | W7 |
| Card of the Day winner award | Fixed and tested locally; no winning vote exists yet. | W5 |
| Leaderboard past 1,000 ledger rows | Ledger has 33 rows. Pagination only matters later. | Re-check rank totals against SQL at about 800 rows. |
| Stale events | Active events keep accepting check-ins. | W1 |

## F. Out of scope this week (needs separate approval)
The atomic check-in function, the unique indexes, any migration, Martinez and Pleasant Hill, running `supabase db push` (never; migration history differs from production).
