# Phase 8 — Launch Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden and verify the app for the August 1 staff demo. Five areas: pre-flight security fixes (delete dev endpoint, lock RLS on Phase 7 tables), data corrections (fix wrong store names and prefix conflicts), TypeScript type regeneration (broadcasts table is fully `as any` without it), environment verification (RESEND_API_KEY, Vercel env audit), and an E2E test matrix covering every critical player and staff flow.

**Supabase project:** `gdyksfarqpzfvymzifxr`

**Tech Stack:** Next.js 14, Supabase MCP for SQL, `npx supabase gen types typescript` for type regen, Vercel for deployment. No new features — this phase is fixes, verification, and hardening only.

## Global Constraints

- No new features in this phase — fixes and verification only
- `npx tsc --noEmit` must pass with 0 errors after every code change
- Deploy: `git push` — Vercel auto-deploys from main
- All SQL DDL changes go through `apply_migration` (not execute_sql) to land in migrations history
- Manual verification steps must be completed in the live Vercel deployment, not just localhost

---

## Current Store Inventory (live DB as of 2026-07-22)

| id suffix | Name | City | Prefix | Issue |
|-----------|------|------|--------|-------|
| 3766247c | Trade Emporium | Pittsburg | TEM | ✅ correct |
| 6845b53b | Games of Martinez | Martinez | GOM | ✅ correct |
| 7de1215e | Games of Brentwood | Brentwood | GOB | ✅ correct |
| d78a5bc9 | Games of Concord | Concord | GOC | ✅ correct |
| d036a0a2 | Gamer's Guild of Pleasant Hill | Pleasant Hill | GOPH | ✅ correct |
| 70f71af5 | Gamer's Guild of Benicia | Benicia | GOB2 | ⚠️ prefix conflicts with GOB (Brentwood) |
| cc477a71 | Gamer's Guild of Pittsburg | null | HYP | ❌ should be Gamer's Guild of Antioch |

Target: rename `cc477a71` → Gamer's Guild of Antioch, city = Antioch, prefix = GGOA. Update `70f71af5` Benicia prefix GOB2 → GGOB.

---

## Task 0: Pre-flight Security — Delete Dev Endpoint

**Files:**
- Delete: `app/api/dev/reset-spin/route.ts`
- Delete: `app/api/dev/` directory (if empty after removal)

**Interfaces:**
- Removes: `GET /api/dev/reset-spin` — an endpoint with a TODO comment explicitly flagging it for removal before demo

- [ ] **Step 1: Delete the file**

```bash
rm -rf /home/djgotsu/hyperbolic/projects/hyperbolic-app/app/api/dev/
```

- [ ] **Step 2: TypeScript check**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && npx tsc --noEmit
```

Expected: 0 errors. The route had no callers — deletion is self-contained.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "security: remove dev-only reset-spin endpoint before demo"
```

---

## Task 1: Fix Store Data

**Changes via Supabase MCP execute_sql (data changes, not DDL — no migration needed):**
- `cc477a71`: rename to `Gamer's Guild of Antioch`, city = `Antioch`, prefix = `GGOA`
- `70f71af5`: update prefix `GOB2` → `GGOB` to avoid conflict with Brentwood's `GOB`

- [ ] **Step 1: Rename Pittsburg → Antioch**

Via `mcp__plugin_supabase_supabase__execute_sql`:

```sql
UPDATE stores
SET
  name               = 'Gamer''s Guild of Antioch',
  city               = 'Antioch',
  state              = 'CA',
  player_id_prefix   = 'GGOA'
WHERE id = 'cc477a71-38a3-4ea9-913e-76a7ff87cf69';
```

- [ ] **Step 2: Fix Benicia prefix**

```sql
UPDATE stores
SET player_id_prefix = 'GGOB'
WHERE id = '70f71af5-26f1-46ec-b97a-8c8776318d3d';
```

- [ ] **Step 3: Verify**

```sql
SELECT name, city, player_id_prefix FROM stores ORDER BY name;
```

Expected: 7 rows, all unique prefixes, Antioch present, no GOB2.

- [ ] **Step 4: Commit a migration file documenting the data fix**

Create `supabase/migrations/20260722_fix_store_data.sql`:

```sql
-- Fix store data: rename legacy Pittsburg store to Antioch, fix Benicia prefix conflict
UPDATE stores
SET name = 'Gamer''s Guild of Antioch', city = 'Antioch', state = 'CA', player_id_prefix = 'GGOA'
WHERE id = 'cc477a71-38a3-4ea9-913e-76a7ff87cf69';

UPDATE stores
SET player_id_prefix = 'GGOB'
WHERE id = '70f71af5-26f1-46ec-b97a-8c8776318d3d';
```

```bash
git add supabase/migrations/20260722_fix_store_data.sql
git commit -m "fix: rename legacy HYP store to Gamer's Guild of Antioch, fix Benicia prefix"
```

---

## Task 2: RLS on notifications and broadcasts

**Why:** Both tables were created/modified in Phase 7. `notifications` holds per-player in-app messages — players should not be able to read each other's rows. `broadcasts` is staff-only — no authenticated role should have direct read access (all access goes through service_role via API routes).

**Files:**
- Create: `supabase/migrations/20260722_phase8_rls.sql`

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/20260722_phase8_rls.sql`:

```sql
-- Phase 8: RLS on notifications
-- Players can read only their own notifications via authenticated role.
-- All writes go through service_role (API routes) only.
alter table notifications enable row level security;

-- Players read their own notifications only
create policy "Players read own notifications"
  on notifications for select
  to authenticated
  using (
    player_id = (
      select id from players where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- All mutations via service_role only (API routes use supabaseAdmin)
-- No INSERT/UPDATE/DELETE policies for authenticated role needed.


-- Phase 8: RLS on broadcasts
-- Broadcasts are HQ-only. All reads and writes go through service_role.
-- No authenticated-role access needed — the API routes enforce staff auth
-- server-side before calling supabaseAdmin.
alter table broadcasts enable row level security;

-- No policies for authenticated role: service_role bypasses RLS by default.
-- Authenticated users have no access unless a policy grants it (deny by default).
```

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__plugin_supabase_supabase__apply_migration` with project_id `gdyksfarqpzfvymzifxr`.

- [ ] **Step 3: Verify RLS is active**

Via execute_sql:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('notifications', 'broadcasts');
```

Expected: both rows show `rowsecurity = true`.

- [ ] **Step 4: Verify policy exists on notifications**

```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'notifications';
```

Expected: `Players read own notifications` policy present with `SELECT` cmd.

- [ ] **Step 5: Confirm API routes still work**

The `app/api/notifications/route.ts` uses `supabaseAdmin` (service_role) — it bypasses RLS and continues to work. No code changes needed.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260722_phase8_rls.sql
git commit -m "security: enable RLS on notifications and broadcasts"
```

---

## Task 3: Regenerate Supabase TypeScript Types

**Why:** The `broadcasts` table was added in Phase 7 and has no TypeScript type — every reference uses `supabaseAdmin as any`. Regenerating brings `broadcasts` into the type system and reduces `as any` surface area across the whole codebase.

- [ ] **Step 1: Regenerate types**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && \
npx supabase gen types typescript --project-id gdyksfarqpzfvymzifxr \
  > types/database.types.ts
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

The broadcast route uses `supabaseAdmin as any` to avoid the missing type. After regeneration, update `app/api/hq/broadcast/route.ts` to remove the cast:

Before (in GET and POST):
```ts
await (supabaseAdmin as any).from('broadcasts')
```

After (once types are regenerated):
```ts
await supabaseAdmin.from('broadcasts')
```

Also check `lib/notifications.ts` for any `supabaseAdmin as any` casts that can be cleaned up — specifically the `.from('players')` and `.from('notifications')` calls.

If `tsc --noEmit` shows new errors after removing casts, fix them by aligning types. If the generated types still have gaps (e.g., RPCs not typed), keep `as any` only on those specific calls.

- [ ] **Step 3: TypeScript check again after cast removal**

```bash
npx tsc --noEmit 2>&1
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add types/database.types.ts app/api/hq/broadcast/route.ts lib/notifications.ts
git commit -m "chore: regenerate Supabase types, remove broadcasts as-any casts"
```

---

## Task 4: Environment Verification

This task is a checklist — no code changes. Verify that the Vercel production deployment has all required environment variables set.

- [ ] **Step 1: Confirm required env vars in Vercel dashboard**

Navigate to Vercel → Project → Settings → Environment Variables. Verify:

| Variable | Required for |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase calls |
| `SUPABASE_SERVICE_KEY` | Admin/server-side Supabase (supabaseAdmin) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth UI |
| `CLERK_SECRET_KEY` | Clerk server-side auth |
| `RESEND_API_KEY` | Staff invitation emails (currently 503 without this) |

- [ ] **Step 2: Test RESEND_API_KEY by sending a staff invitation**

In HQ → Settings → Staff Invitations:
1. Enter a real email address
2. Click Send Invite
3. Confirm the email arrives (not a 503 error)
4. If 503: add `RESEND_API_KEY` to Vercel env vars and redeploy

- [ ] **Step 3: Verify cron jobs are firing**

In Vercel dashboard → Project → Logs → filter for `/api/cron/`:
- `/api/cron/spin-reminder` — should fire at 6 PM daily (18:00 UTC)
- `/api/cron/event-reminders` — should fire at 3 PM daily (15:00 UTC)

If neither has fired: confirm Vercel plan supports cron jobs (requires Hobby or Pro). If on Hobby, crons are limited — check current plan.

- [ ] **Step 4: Confirm production URL is live**

```bash
curl -s -o /dev/null -w "%{http_code}" https://hyperbolic-loyalty.vercel.app/
```

Expected: 200 (or 307 redirect to sign-in).

---

## Task 5: E2E Player Journey Verification

Manual verification of the complete player flow in production (`https://hyperbolic-loyalty.vercel.app`). Do these in order — each step depends on the prior.

- [ ] **Step 1: Onboarding flow**

1. Sign out of any existing session
2. Sign up with a new test email
3. Onboarding page appears with store picker
4. All 7 stores appear in the list: Trade Emporium, Games of Martinez, Games of Brentwood, Games of Concord, Gamer's Guild of Pleasant Hill, Gamer's Guild of Benicia, Gamer's Guild of Antioch
5. Select "Gamer's Guild of Benicia" → complete onboarding
6. Land on dashboard

- [ ] **Step 2: Dashboard loads correctly**

1. XP balance shows (0 for new player)
2. NotificationBell renders (no errors in console)
3. Banner carousel renders if any banners exist for Benicia store
4. Daily spin card is visible

- [ ] **Step 3: Daily spin**

1. Tap the daily spin
2. Animation plays
3. XP awarded — ledger row created
4. Spin cannot be repeated same day

- [ ] **Step 4: Notification received**

1. After spin, a notification should appear in the bell (if crons are running)
2. Navigate to `/dashboard/notifications` — page loads, shows entries

- [ ] **Step 5: Shop / Prize Wall**

1. Navigate to `/dashboard/shop`
2. Prize wall loads with items for Benicia store (network-wide + Benicia-specific)
3. Items from other stores (e.g., Games of Martinez only) do NOT appear
4. Points balance shows correctly
5. Attempt to redeem an item with insufficient points → button disabled or error message shown gracefully

- [ ] **Step 6: Community / Leaderboard**

1. Navigate to `/dashboard/community`
2. "My Store" tab shows Benicia store leaderboard
3. "Network Season" tab shows cross-store leaderboard
4. Player appears in leaderboard after earning XP from spin

- [ ] **Step 7: Profile**

1. Navigate to `/dashboard/profile`
2. Player ID (GGOB-XXXXXX) shown correctly (uses Benicia store prefix)
3. XP history visible

---

## Task 6: E2E Staff HQ Verification

Manual verification of all HQ staff flows in production. Log in with a staff account (DjGotsu or another known staff member).

- [ ] **Step 1: HQ access**

1. Navigate to `/hq`
2. Store selector appears in header with correct store name
3. All tabs visible in nav: Players, Emperor, Bounty, Banners, Card of Day, Events, Prize Wall, Redemptions, Circuit, Broadcasts, Settings

- [ ] **Step 2: Store switching**

1. Switch from one store to another using the store indicator dropdown
2. All store-scoped tabs refresh (Players search clears, Prize Wall reloads, Banners reload)
3. No stale data from previous store appears after switch

- [ ] **Step 3: Player search + XP award**

1. Players tab → search for test player created in Task 5
2. Player details panel opens
3. XP tile section shows — select a tile (e.g., Event Attendance 30 XP)
4. Click Award — toast shows success, player's XP updates in DB

- [ ] **Step 4: Prize Point adjustment**

1. In same player detail panel, scroll to Prize Points section
2. Current balance shows
3. Enter `+50` and a reason → click Adjust Prize Points
4. Balance updates, toast shows new balance

- [ ] **Step 5: Broadcasts tab**

1. Click Broadcasts tab
2. Compose form shows (My Store / All Network toggle visible for network admin)
3. Enter title "Demo Test" and a message
4. Click Send → toast shows "Sent to N players"
5. Broadcast appears in Sent History with correct timestamp and player count
6. Log in as test player → notification bell shows the broadcast within 30 seconds

- [ ] **Step 6: Prize Wall management**

1. Prize Wall tab loads items for active store
2. Network-wide items show "Network Reward · Read Only" label (for store managers)
3. Create a new store-scoped item → it appears in the list
4. Toggle item active/inactive → change persists on reload

- [ ] **Step 7: Redemptions**

1. Redemptions tab loads for active store
2. Enter a claim code from the test player's redemption (if one was created in Task 5)
3. Fulfill the redemption → status changes to "claimed"
4. Switch stores → redemption list refreshes

- [ ] **Step 8: Staff invitations**

1. Settings tab → Staff Invitations section
2. Enter a test email, select role, select store
3. Click Send Invite → email arrives (requires RESEND_API_KEY to be set)
4. Accept invite link → new staff account created with correct store role

---

## Verification Gates (Phase 8 Complete)

- [ ] `/api/dev/reset-spin` route deleted — `curl https://hyperbolic-loyalty.vercel.app/api/dev/reset-spin` returns 404
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] All 7 stores in DB with unique prefixes and correct names (no GOB2, no HYP prefix on active stores)
- [ ] `notifications` table has RLS enabled with player-scoped read policy
- [ ] `broadcasts` table has RLS enabled (deny-by-default for authenticated role)
- [ ] `types/database.types.ts` includes `broadcasts` table definition
- [ ] RESEND_API_KEY confirmed in Vercel (staff invite email arrives)
- [ ] All 5 player journey steps complete without errors in prod
- [ ] All 8 staff HQ steps complete without errors in prod
- [ ] Store switching in HQ shows no stale data from previous store
- [ ] Notification delivered to player within 30 seconds of HQ broadcast

## What Phase 8 Does NOT Cover (Post-Demo Backlog)

These are real issues but not blocking the August 1 demo:

- RLS on `bounty_hunter_*`, `event_interest`, `network_settings`, `player_inventory` — all accessed via service_role in practice
- Store re-selection UI for players (change `home_store_id` from profile page)
- Hardcoded `GGC` player_id_prefix in `/api/player/link/route.ts` — needs to pull from `store_config.player_id_prefix` for multi-store SaaS
- Push notifications (blocked by Vercel Hobby plan cron limits)
- Automated redemption expiry cron for stale `pending` redemptions
- Per-player notification delivery receipts
- Full TypeScript cleanup (remaining `as any` casts on RPC calls)
