# Founding Member: permanent numbered slots (plan only, ON HOLD)

Status: design and local tests. **Nothing here is applied, deployed or scheduled.** The permanent-slot migration and achievement badges are on hold until after the Benicia pilot.
The migration drafts (`supabase/drafts/founding_slots_phase1.sql`, `_phase2_enforce.sql`, `rollback_founding_slots.sql`) are local only and are NOT part of this commit.
The read-only monitoring queries are in `supabase/checks/first-week-watch.sql` (W9 to W15).

## Decisions (owner, Nov 8)
1. All nine existing Founding Members keep their titles and their +100 XP. Nothing is reset, revoked or recalculated.
2. Founding numbers #001 to #009 for the existing holders are approved **for planning**, and are marked as RECONSTRUCTED, not the exact historical award order (see below).
3. DjGotsu stays Administrator only. Dj is not given Founding Member manually.
4. Automatic qualification (a verified home store at any network store) is unchanged for now.
5. Permanent slots and achievement badges wait until after the Benicia pilot.

## Policy
100 lifetime slots across the whole network (not per store). Permanent legacy recognition. Not purchasable. Independent of any paid pass. A slot must never become available again because an account is deleted or a title is revoked. Manual grants and settings must respect the same lifetime cap.

## What exists today (verified)
- Cap is enforced only by `award_title_capped` (advisory lock, count of ACTIVE titles, insert). Concurrent awards are correct. The number 100 is a parameter from `store_config.title_settings`; HQ can set it up to 100,000. HQ "Give title" and restoring a revoked title ignore the cap. Revoking, or deleting an account, frees a slot.
- Real account deletion (`cleanup_player_data`) deletes the player row (title row cascades) and ANONYMISES ledger rows (`player_id` becomes NULL). So a deleted holder's +100 bonus row survives, and lifetime allocations are measurable: today 9 title rows + 0 orphaned bonus rows = 9. The three recorded deletions (August) predate titles.
- Title row, flag and +100 XP are separate writes. A failed flag or bonus write is not retried (confirmed by test).
- Development accounts share the production database (no separate project exists), but neither "Dj" nor DjGotsu holds a founding slot (W14).

## Numbering the nine (reconstructed)
The award order was not recorded: seven of the nine were granted in one batch (identical timestamp). The rule is grant time, then account creation time, then id. Verification time gives the same order.
1 Anthony, 2 maia, 3 True, 4 Sai, 5 TJ, 6 Justintime710, 7 tots, 8 Heather, 9 Bio. Stored with `source = backfill` and a note saying the order is reconstructed.

## Final design review

**1. Excluding development or administrative accounts without affecting legitimate players.** A `founding_exclusions` table keyed by the exact player id, with a required reason. Nothing is inferred from a name, email, role or title (an Administrator title or staff flag does NOT exclude anyone). Only the AUTOMATIC award consults it; a deliberate manual grant ignores it. An exclusion never removes an existing title, and an excluded account consumes no slot. Adding one is a reviewed statement: a SELECT preview of the exact account first, then one insert with a reason; the list is visible in monitoring. A deleted account takes its exclusion row with it. A re-created account has a new id and is not excluded (it would need its own entry). Tested: an excluded account gets nothing, a similarly named account is unaffected.
For the pilot nothing is excluded (decision 4): Dj and DjGotsu would take a slot only if they re-verify a home store with a join code; W14 shows them and would show if that happened.

**2. Behaviour between phase 1 and phase 2.** Phase 1 is additive and the live app is unaffected. Until the app is switched, the OLD path keeps awarding titles WITHOUT a slot. The new functions (and phase 2) run a catch-up first that gives such titles the next numbers in grant order, under the same locks as the old path, so the two paths cannot race. Tested: 3 old-path titles healed to #10 to #12; 10 old-path and 10 new-path awards at the same instant from 90 held ended at exactly 100 titles and 100 slots. After phase 2 the old path is rejected cleanly (an error, nothing written; player verification still succeeds). Order is therefore strict: phase 1, then deploy the app, then phase 2. If the app is deployed before phase 1, awards fail quietly (caught) and W14 would list the players.

**3. Can rollback reopen the cap?** A naive rollback (drop the new objects) does reopen it: the old function counts active titles only, so a deleted or revoked holder's slot frees again; tested, a 101st lifetime holder was awarded. The rollback in the draft (Level A) therefore replaces the strict trigger with a lifetime guard that counts every slot ever taken plus active unslotted holders and refuses at 100, even for the old code path and direct inserts; tested. Level B (drop the table) first copies the record to an archive table. Titles, flags and XP are never touched.

**4. Numbers through account deletion and restoration.** Deletion blanks only the player link; the slot row keeps its number and the public id, and cannot be deleted, truncated or renumbered. The next player gets the next number, never the freed one. A title revoked and restored keeps the same number and gets no second bonus. The app has no account-restore feature; for a person who re-creates an account, `restore_founding_slot(slot, new_player)` relinks an EMPTY slot (the only permitted relink; a direct update is blocked) with title and flag, and pays +100 only if explicitly requested, because the deleted account's original +100 row survives in the ledger. Whether a restored account gets a new +100 is a policy decision for the owner. Tested.

**5. Can monitoring detect partial award failures?** Mostly, with one blind spot. W10 (title vs flag) and W11 (exactly one correct 100-XP bonus per title; wrong amount or source; bonus with no title) detect the two real partial failures the application can produce (flag write fails, bonus write fails), shown by injecting each into the real code and running the queries after the 5-minute grace period (which avoids false alarms while an award is still being written). W15 detects a missing notification (best effort, low severity) for awards after the one-time backfill. W9 counts lifetime allocations, including deleted holders via their surviving bonus rows. **Blind spot:** an award that fails entirely (nothing written) is not distinguishable from an account that simply never qualified; W14 lists verified players with no title, but cannot prove a failure. The application also logs the error. After the migration, W9 should use the slot table count instead.

## Sequence and rollback
1. Phase 1 (additive, one transaction, self-checking). 2. Deploy the app to call `award_founding_member` (HQ grants use it too; the cap input is removed; the chip shows "#007"). 3. Phase 2 (enforcement). Rollback: Level A (standard) or Level B, as above, after returning the app to the old path.
Tested locally on a production-shaped schema: 32 tests of the design, 38 of this review, 25 of the existing function and application code, all passing.

## Network-wide qualification (verified)
Every verification path ends in `verifyHomeStore` then `maybeAwardFounding(playerId)`; no store is passed. All six active stores (Benicia, Pleasant Hill, Brentwood, Concord, Martinez, Trade Emporium) have one join code, so there is one pool. A player at a store that has not launched can claim a slot with that store's code (Pleasant Hill 1 and Brentwood 1 already have). Slots go to whoever verifies first, anywhere.

## Badges (post-launch, not built)
Titles stay rare, permanent, one row per player and key, defined in code. Badges would mirror that: a `player_badges` table (`player_id, badge_key, earned_at, source`, unique per player and badge), definitions in code, awarded by a post-step after check-in and wrap-up (never inside them). Cosmetic inventory (`shop_items`, `player_inventory`, avatar badge) stays a separate system; a badge may optionally unlock a cosmetic but never depends on the shop. Criteria use existing data: events attended, `event_results`, distinct stores visited.
