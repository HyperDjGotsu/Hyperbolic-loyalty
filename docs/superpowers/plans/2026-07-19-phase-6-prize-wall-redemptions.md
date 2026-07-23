# Phase 6 — Prize Wall, Prize Points & Redemptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete HQ store-scoped Prize Point adjustments, player-facing Prize Wall store filtering, atomic redemption transactions, HQ Prize Wall display rules, redemption queue readiness, and Events/Banners store threading — all building on the Foundation Task 0 store context.

**Architecture:** Every write in this phase must include `activeStoreId` from `hqStore` (available in HQPage after Foundation Task 0). Server-side routes enforce `requireStoreAccess(storeId)` for reads and writes. The `create_prize_redemption` Supabase RPC is the single atomic transaction point for all redemptions — no split updates. Network-wide Prize Wall items (`store_id = null`) are visible everywhere but only editable by network admins.

**Tech Stack:** Next.js 14 App Router, Supabase PostgreSQL (RPC for atomic transactions), Tailwind CSS, `lib/auth-helpers.ts` (`requireStoreAccess`, `requireStoreManager`, `requireNetworkAdmin`), `lib/points.ts` (`logPointTransaction`, `getPlayerBalance`). No test framework — verify with `npx tsc --noEmit` + `npm run build` + manual browser steps.

## Global Constraints

- No test framework — verify with `npx tsc --noEmit` then manual browser steps
- `hqStore.activeStoreId` is the source of truth for all HQ store-scoped calls
- Network-level Prize Point adjustment (`store_id = null`) requires `isNetworkAdmin = true` — never allowed for store staff
- Network-wide Prize Wall items (`store_id = null`) are read-only for store managers — label: `Network Reward · Read Only`
- Editing a network-wide item preserves `store_id = null` — no scope promotion
- Every mutation re-validates store ownership server-side — client `activeStoreId` is untrusted input
- `create_prize_redemption` RPC is the only place points are deducted and a redemption record is created — never split into two calls
- `prize_point_transactions.store_id` is nullable after Task 1 migration — `null` means explicit network-level adjustment
- Negative balance corrections are allowed (negative `amount`) but the resulting balance must never go below 0
- Stale-response pattern from Foundation Task 0: capture `requestedStoreId` at call time, check `requestedStoreId !== activeStoreRef.current` after response, abort via `AbortController`
- All per-dataset state follows `StoreDatasetState = { storeId: string | null; status: 'idle'|'loading'|'ready'|'error'; error?: string }`
- No comments added to code unless explaining a non-obvious constraint
- `npx tsc --noEmit` must pass with 0 errors before every commit
- Deploy: `git push` — Vercel auto-deploys from main

---

## File Structure

**New files:**
- `supabase/migrations/20260719_phase6_schema.sql` — nullable `store_id` on `prize_point_transactions`, `expired` status on `prize_wall_redemptions`, documented semantics

**Modified files:**
- `lib/points.ts` — `storeId` becomes `string | null` in `logPointTransaction`
- `app/hq/page.tsx` — Task 0 polish (abort, search disable, dropdown); Prize Points UI in Players tab; store threading for prize-wall, banners, events load/save calls; `StoreDatasetState` for prizeWall, banners, events datasets
- `app/api/hq/prize-wall/route.ts` — `GET` requires `storeId` param, returns `null OR storeId` items
- `app/api/hq/banners/route.ts` — `GET` requires `storeId` param, returns `null OR storeId` banners
- `app/api/prize-wall/route.ts` — add `storeId` query param to filter items by `null OR storeId`
- `app/api/prize-wall/redeem/route.ts` — verify `create_prize_redemption` RPC call, add `fulfillment_store_id` snapshot

---

## Task 0: Foundation Polish — Three Deferred Foundation Items

**Files:**
- Modify: `app/hq/page.tsx`

**Interfaces:**
- Consumes: `hqStore.activeStoreId`, `activeStoreRef`, `storeTransitioning`, `StoreIndicator` — all from Foundation Task 0
- Produces: `searchPlayer` now aborting in-flight requests on store switch; search button disabled when no `activeStoreId`; dropdown closes on outside-click and Escape

- [ ] **Step 1: Read the relevant sections of HQPage**

Read `app/hq/page.tsx` lines 340–570 (StoreIndicator component) and the `onStoreChange` handler inside HQPage (look for `setStoreTransitioning(true)`). Also read the search button render (around line 2179).

- [ ] **Step 2: Add `AbortController` ref and abort on store switch**

Inside `HQPage()`, after the `activeStoreRef` declaration, add an abort controller ref:

```ts
const searchAbortRef = useRef<AbortController | null>(null);
```

In `searchPlayer`, before creating a new controller, abort any in-flight request:

```ts
const searchPlayer = async () => {
  if (!searchQuery.trim() || !hqStore.activeStoreId) return;

  searchAbortRef.current?.abort();
  const controller = new AbortController();
  searchAbortRef.current = controller;

  const requestedStoreId = hqStore.activeStoreId;
  // ... rest of existing function unchanged
```

In the `onStoreChange` handler inside the JSX (the `StoreIndicator` `onStoreChange` prop), add `searchAbortRef.current?.abort()` as the first line:

```ts
onStoreChange={(id) => {
  searchAbortRef.current?.abort();
  const storeName = hqStore.availableStores.find(s => s.id === id)?.name ?? id;
  setStoreTransitioning(true);
  setPlayerDetails(null);
  setPlayersDataset({ storeId: null, status: 'idle' });
  hqStore.setActiveStoreId(id);
  showToast(`Switched to ${storeName}`, 'success');
  setStoreTransitioning(false);
}}
```

- [ ] **Step 3: Disable search button when no `activeStoreId`**

Find the search button in the Players tab (around line 2179):

```tsx
onClick={searchPlayer}
```

The containing button likely has `disabled={searchLoading}`. Change it to:

```tsx
disabled={searchLoading || !hqStore.activeStoreId}
```

Also find the input `onKeyDown` handler that calls `searchPlayer` on Enter. Wrap it:

```ts
onKeyDown={(e) => e.key === 'Enter' && hqStore.activeStoreId && searchPlayer()}
```

- [ ] **Step 4: Add outside-click and Escape handling to StoreIndicator dropdown**

In the `StoreIndicator` component (around line 340 of `app/hq/page.tsx`), add a `useRef` and `useEffect` for the multi-store dropdown:

```tsx
function StoreIndicator({ hqStore, isNetworkAdmin, storeTransitioning, onStoreChange }: {
  hqStore: UseHQStoreReturn;
  isNetworkAdmin: boolean;
  storeTransitioning: boolean;
  onStoreChange: (id: string) => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dropdownOpen]);
```

Wrap the dropdown `<div className="relative">` with `ref={dropdownRef}`:

```tsx
<div className="relative" ref={dropdownRef}>
```

- [ ] **Step 5: TypeScript check**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Manual verify**

Open HQ, switch stores — the store name flips in the header. Open the dropdown and click elsewhere — it closes. Press Escape — it closes. Search while no store is selected (shouldn't be possible after init, but force `isInitialized` to true with `activeStoreId: null` in dev) — button is disabled.

- [ ] **Step 7: Commit**

```bash
git add app/hq/page.tsx
git commit -m "fix: abort in-flight search on store switch, disable search with no store, dropdown outside-click"
```

---

## Task 1: Database Migrations — Schema Semantics for Phase 6

**Files:**
- Create: `supabase/migrations/20260719_phase6_schema.sql`

**Interfaces:**
- Produces: nullable `prize_point_transactions.store_id`, `expired` in `prize_wall_redemptions.status` check, documented null semantics

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260719_phase6_schema.sql`:

```sql
-- Phase 6: nullable store_id on prize_point_transactions
-- store_id = null means a network-level adjustment (network admin only)
-- store_id = <uuid> means a store-scoped transaction (any authorized staff)
alter table prize_point_transactions
  alter column store_id drop not null;

-- Phase 6: add 'expired' to prize_wall_redemptions status
-- expired: set when claim code TTL passes and redemption was never claimed
-- pending → claimed (staff fulfills)
-- pending → voided (staff voids, points refunded)
-- pending → expired (TTL passed, points refunded by cron or lazy evaluation)
alter table prize_wall_redemptions
  drop constraint if exists prize_wall_redemptions_status_check;

alter table prize_wall_redemptions
  add constraint prize_wall_redemptions_status_check
  check (status in ('pending', 'claimed', 'voided', 'expired'));
```

- [ ] **Step 2: Apply migration to Supabase**

Use the Supabase MCP tool: `mcp__plugin_supabase_supabase__apply_migration` with the SQL above, or run:

```bash
# If Supabase CLI is available:
npx supabase db push
```

Otherwise apply via Supabase Dashboard → SQL Editor.

- [ ] **Step 3: Update `lib/points.ts` — `storeId` nullable**

Read `lib/points.ts`. Change `LogPointTransactionParams`:

```ts
type LogPointTransactionParams = {
  playerId: string;
  storeId: string | null;  // null = network-level adjustment (network admin only)
  amount: number;
  type: PointTransactionType;
  source: string;
  referenceId?: string;
  note?: string;
};
```

The `insert` call already uses `store_id: storeId` — no other change needed.

- [ ] **Step 4: TypeScript check**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && npx tsc --noEmit
```

Expected: 0 errors (the only change is relaxing `string` to `string | null`).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260719_phase6_schema.sql lib/points.ts
git commit -m "feat: nullable prize_point_transactions.store_id, expired redemption status"
```

---

## Task 2: Prize Point Adjustment in Players Tab

**Files:**
- Modify: `app/hq/page.tsx` — new Prize Points section inside the player detail panel
- Modify: `app/api/hq/xp/route.ts` — already handles `storeId` for XP; Prize Points are separate (via `logPointTransaction`). Add a new `/api/hq/prize-points` route.
- Create: `app/api/hq/prize-points/route.ts` — Prize Point adjustment endpoint

**Interfaces:**
- Consumes: `hqStore.activeStoreId`, `playerDetails.player.id`, `requireStoreAccess`, `getPlayerBalance`, `logPointTransaction`
- Produces: `POST /api/hq/prize-points` → `{ success: true, newBalance: number }` or `{ error: string }`

- [ ] **Step 1: Read the current player detail panel in HQPage**

Grep for the XP tile section:

```bash
grep -n "awardSelectedXp\|Award XP\|selectedTiles\|prize" app/hq/page.tsx | head -30
```

Find where the XP award UI ends and where to insert the Prize Points section (after the XP tile section, before the Pass Management section).

- [ ] **Step 2: Create `app/api/hq/prize-points/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { requireStoreAccess, requireNetworkAdmin } from '@/lib/auth-helpers';
import { logPointTransaction, getPlayerBalance } from '@/lib/points';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      playerId: string;
      amount: number;
      reason: string;
      storeId: string | null;
    };

    const { playerId, amount, reason, storeId } = body;

    if (!playerId || amount === undefined || !reason?.trim()) {
      return NextResponse.json(
        { error: 'playerId, amount, and reason are required' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(amount) || amount === 0) {
      return NextResponse.json(
        { error: 'amount must be a non-zero integer' },
        { status: 400 }
      );
    }

    // storeId = null → network-level adjustment → network admin only
    // storeId = uuid → store-scoped → any authorized staff for that store
    const staffCtx = storeId
      ? await requireStoreAccess(storeId)
      : await requireNetworkAdmin();

    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify player exists
    const { data: player, error: playerErr } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('id', playerId)
      .single();

    if (playerErr || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Negative corrections must not result in a negative balance
    if (amount < 0) {
      const currentBalance = await getPlayerBalance(playerId, storeId ?? undefined);
      if (currentBalance + amount < 0) {
        return NextResponse.json(
          { error: `Cannot deduct ${Math.abs(amount)} pts — current balance is ${currentBalance}` },
          { status: 400 }
        );
      }
    }

    await logPointTransaction({
      playerId,
      storeId,
      amount,
      type: 'admin_adjust',
      source: 'hq_manual',
      note: reason.trim(),
    });

    const newBalance = await getPlayerBalance(playerId, storeId ?? undefined);
    return NextResponse.json({ success: true, newBalance });
  } catch (err) {
    console.error('prize-points POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const storeId = searchParams.get('storeId');

    if (!playerId || !storeId) {
      return NextResponse.json({ error: 'playerId and storeId are required' }, { status: 400 });
    }

    const staffCtx = await requireStoreAccess(storeId);
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const balance = await getPlayerBalance(playerId, storeId);
    return NextResponse.json({ balance });
  } catch (err) {
    console.error('prize-points GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Add Prize Points UI to player detail panel in HQPage**

Add state variables inside `HQPage()`:

```ts
const [ppAmount, setPpAmount] = useState('');
const [ppReason, setPpReason] = useState('');
const [ppBalance, setPpBalance] = useState<number | null>(null);
const [ppLoading, setPpLoading] = useState(false);
const [ppAdjusting, setPpAdjusting] = useState(false);
```

Add `loadPlayerBalance` function (call it from `searchPlayer` after setting `playerDetails`):

```ts
const loadPlayerBalance = async (playerId: string) => {
  if (!hqStore.activeStoreId) return;
  try {
    const res = await fetch(
      `/api/hq/prize-points?playerId=${playerId}&storeId=${encodeURIComponent(hqStore.activeStoreId)}`
    );
    const data = await res.json();
    if (!data.error) setPpBalance(data.balance);
  } catch {}
};
```

In `searchPlayer`, after `setPlayerDetails(data)`:

```ts
setPlayerDetails(data);
setPpBalance(null); // clear stale balance
loadPlayerBalance(data.player.id);
```

Add `adjustPrizePoints` function:

```ts
const adjustPrizePoints = async () => {
  if (!playerDetails || !ppReason.trim()) {
    showToast('Reason is required', 'error');
    return;
  }
  const amount = parseInt(ppAmount);
  if (!amount || amount === 0) {
    showToast('Enter a non-zero integer amount', 'error');
    return;
  }

  setPpAdjusting(true);
  try {
    const res = await fetch('/api/hq/prize-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: playerDetails.player.id,
        amount,
        reason: ppReason.trim(),
        storeId: hqStore.activeStoreId,
      }),
    });
    const data = await res.json();
    if (data.error) {
      showToast(data.error, 'error');
    } else {
      setPpBalance(data.newBalance);
      setPpAmount('');
      setPpReason('');
      showToast(`${amount > 0 ? '+' : ''}${amount} pts — new balance: ${data.newBalance}`, 'success');
    }
  } catch {
    showToast('Failed to adjust points', 'error');
  } finally {
    setPpAdjusting(false);
  }
};
```

In the player detail panel JSX, add a Prize Points section after the XP tiles section:

```tsx
{/* Prize Points */}
<div className="bg-surface rounded-xl border border-border-token p-4 space-y-3">
  <div className="flex items-center justify-between">
    <h3 className="text-sm font-semibold text-primary">Prize Points</h3>
    {ppBalance !== null && (
      <span className="text-accent font-bold text-sm">{ppBalance} pts</span>
    )}
    {ppBalance === null && ppLoading && (
      <span className="text-secondary text-xs">Loading…</span>
    )}
  </div>
  <div className="flex gap-2">
    <input
      type="number"
      value={ppAmount}
      onChange={e => setPpAmount(e.target.value)}
      placeholder="±amount (e.g. 50 or -25)"
      className="flex-1 bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
    />
  </div>
  <input
    type="text"
    value={ppReason}
    onChange={e => setPpReason(e.target.value)}
    placeholder="Reason (required)"
    className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
  />
  <button
    onClick={adjustPrizePoints}
    disabled={ppAdjusting || !ppAmount || !ppReason.trim() || !hqStore.activeStoreId}
    className="w-full py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
  >
    {ppAdjusting ? 'Adjusting…' : 'Adjust Prize Points'}
  </button>
</div>
```

- [ ] **Step 4: TypeScript check**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Manual verify**

1. Search a player in HQ
2. Confirm Prize Points balance loads next to the section header
3. Enter `+50` and a reason, confirm balance increases
4. Enter `-25` and a reason, confirm balance decreases
5. Enter `-9999` — confirm error "Cannot deduct…"
6. Leave reason blank — confirm button is disabled

- [ ] **Step 6: Commit**

```bash
git add app/api/hq/prize-points/route.ts app/hq/page.tsx
git commit -m "feat: Prize Point adjustment in Players tab with balance display"
```

---

## Task 3: Player-Facing Prize Wall Store Filtering

**Files:**
- Modify: `app/api/prize-wall/route.ts` — add `storeId` query param, filter to `null OR storeId`
- Modify: `app/dashboard/shop/page.tsx` — pass player's `home_store_id` as `storeId` to the API

**Interfaces:**
- Produces: `GET /api/prize-wall?storeId=<uuid>` → `{ items: PrizeWallItem[], subscriber_count: number }` — only network-wide + selected store items
- Produces: `GET /api/prize-wall` (no storeId) → 400 error `{ error: 'storeId is required' }`

- [ ] **Step 1: Update `app/api/prize-wall/route.ts`**

Read the current file. Replace the entire GET handler:

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    const [itemsResult, subscriberResult] = await Promise.all([
      (supabaseAdmin as any)
        .from('prize_wall_items')
        .select('id, name, description, image_url, xp_cost, retail_value, quantity, store_id, unlock_threshold, is_active, created_at')
        .eq('is_active', true)
        .or(`store_id.is.null,store_id.eq.${storeId}`)
        .order('xp_cost', { ascending: true }),
      supabaseAdmin
        .from('players')
        .select('id', { count: 'exact', head: true })
        .neq('pass_tier', 'none'),
    ]);

    if (itemsResult.error) throw itemsResult.error;
    if (subscriberResult.error) throw subscriberResult.error;

    const subscriber_count = subscriberResult.count ?? 0;

    const items = (itemsResult.data ?? []).map((item: any) => ({
      ...item,
      is_unlocked: item.unlock_threshold === null || subscriber_count >= item.unlock_threshold,
    }));

    return NextResponse.json({ items, subscriber_count });
  } catch (err) {
    console.error('prize-wall public GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update `app/dashboard/shop/page.tsx` to pass `storeId`**

Read the current file. The page needs to fetch the player's `home_store_id` and pass it to `/api/prize-wall`. Add a `useEffect` to load it:

```ts
const [storeId, setStoreId] = useState<string | null>(null);

useEffect(() => {
  fetch('/api/player/profile')
    .then(r => r.json())
    .then(d => setStoreId(d.home_store_id ?? null))
    .catch(() => {});
}, []);
```

Then update the prize wall fetch to wait for `storeId`:

```ts
useEffect(() => {
  if (!storeId) return;
  fetch(`/api/prize-wall?storeId=${encodeURIComponent(storeId)}`)
    .then(r => r.json())
    .then(data => {
      setItems(data.items || []);
      setSubscriberCount(data.subscriber_count || 0);
    })
    .catch(() => {})
    .finally(() => setLoading(false));
}, [storeId]);
```

If there is no `/api/player/profile` route, check what route returns `home_store_id`:

```bash
grep -r "home_store_id" app/api/ --include="*.ts" | head -10
```

Use whichever player info route already returns `home_store_id`. If none exists, fall back to the `home_store_id` from `pass-status`:

```ts
// In loadPassStatus, after setting passStatus:
// passStatus response likely includes home_store_id if we add it
```

Check `/api/player/pass-status` response shape first — if it returns `home_store_id`, use that instead of a separate call.

- [ ] **Step 3: Handle no-store state in shop page**

If `storeId` is null after loading, show a message instead of the prize wall:

```tsx
if (!storeId && !loading) {
  return (
    <div className="text-center text-secondary py-12">
      <p>No store selected. Visit a store to access the Prize Wall.</p>
    </div>
  );
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Manual verify**

1. Open `/dashboard/shop` as a logged-in player with a `home_store_id`
2. Confirm items load (both network-wide and store-specific items appear)
3. Confirm items from other stores do NOT appear
4. Check Network tab: request includes `storeId=<uuid>`

- [ ] **Step 6: Commit**

```bash
git add app/api/prize-wall/route.ts app/dashboard/shop/page.tsx
git commit -m "feat: player-facing prize wall filtered by home store"
```

---

## Task 4: Store-Aware Redemption Transaction Audit

**Files:**
- Modify: `app/api/prize-wall/redeem/route.ts` — audit RPC call, verify store enforcement, add `fulfillment_store_id` snapshot

**Interfaces:**
- Consumes: `create_prize_redemption` Supabase RPC
- Produces: verified atomic redemption with store enforcement, `fulfillment_store_id` snapshotted at creation time

- [ ] **Step 1: Inspect `create_prize_redemption` RPC**

Run via Supabase MCP:

```sql
SELECT prosrc FROM pg_proc WHERE proname = 'create_prize_redemption';
```

Or use:
```bash
# Via Supabase MCP tool: execute_sql
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'create_prize_redemption';
```

Verify the RPC:
- Takes `p_player_id uuid`, `p_item_id uuid`, `p_store_id uuid`
- Checks item belongs to `p_store_id` OR `store_id IS NULL` (network-wide)
- Checks `is_active = true`
- Checks `quantity > 0` OR `quantity IS NULL` (unlimited)
- Reads current balance and validates `balance >= xp_cost`
- Atomically: decrements `quantity`, inserts `prize_point_transactions` (spend), inserts `prize_wall_redemptions` with `claim_code`, `expires_at`, `store_id`
- Returns `{ claim_code, item_name, points_deducted, redemption_id }` on success or `{ error, balance, required }` on failure

**If the RPC does NOT enforce item-to-store matching** (item belongs to selected store OR is network-wide), add that check.

**If the RPC does NOT snapshot `fulfillment_store_id`**, create a migration to add the column and update the RPC.

Required RPC behavior — reference SQL if updates are needed:

```sql
create or replace function create_prize_redemption(
  p_player_id uuid,
  p_item_id uuid,
  p_store_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_item record;
  v_balance integer;
  v_claim_code text;
  v_redemption_id uuid;
begin
  -- Lock item row
  select id, name, xp_cost, quantity, store_id, is_active
    into v_item
    from prize_wall_items
    where id = p_item_id
    for update;

  if not found then
    return jsonb_build_object('error', 'Item not found');
  end if;

  if not v_item.is_active then
    return jsonb_build_object('error', 'Item is not available');
  end if;

  -- Item must belong to the selected store or be network-wide
  if v_item.store_id is not null and v_item.store_id <> p_store_id then
    return jsonb_build_object('error', 'Item not available at selected store');
  end if;

  if v_item.quantity is not null and v_item.quantity <= 0 then
    return jsonb_build_object('error', 'Item is out of stock');
  end if;

  -- Check balance
  select coalesce(sum(amount), 0)::integer into v_balance
    from prize_point_transactions
    where player_id = p_player_id and store_id = p_store_id;

  if v_balance < v_item.xp_cost then
    return jsonb_build_object('error', 'Insufficient points', 'balance', v_balance, 'required', v_item.xp_cost);
  end if;

  -- Decrement quantity if finite
  if v_item.quantity is not null then
    update prize_wall_items set quantity = quantity - 1 where id = p_item_id;
  end if;

  -- Deduct points
  insert into prize_point_transactions (player_id, store_id, amount, type, source, reference_id)
    values (p_player_id, p_store_id, -v_item.xp_cost, 'spend', 'prize_redemption', null);

  -- Generate claim code
  v_claim_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))
    || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));

  -- Create redemption
  insert into prize_wall_redemptions (
    player_id, item_id, item_name, points_deducted,
    store_id, claim_code, status, expires_at
  )
  values (
    p_player_id, p_item_id, v_item.name, v_item.xp_cost,
    p_store_id, v_claim_code, 'pending',
    now() + interval '72 hours'
  )
  returning id into v_redemption_id;

  return jsonb_build_object(
    'claim_code', v_claim_code,
    'item_name', v_item.name,
    'points_deducted', v_item.xp_cost,
    'redemption_id', v_redemption_id
  );
end;
$$;
```

If the actual RPC differs significantly, apply the above as a `create or replace` via Supabase MCP.

- [ ] **Step 2: Verify `app/api/prize-wall/redeem/route.ts`**

Read the current file. Confirm:
1. `storeId` comes from request body (already the case: `const { itemId, storeId } = await request.json()`)
2. `resolvedStoreId = storeId || player.home_store_id || null` — update this: do NOT silently fall back. If `storeId` is absent and player has no `home_store_id`, return 400:

```ts
const { itemId, storeId } = await request.json() as { itemId: string; storeId?: string };

if (!itemId) {
  return NextResponse.json({ error: 'itemId required' }, { status: 400 });
}

// Resolve store: prefer explicit storeId, fall back to player home store
const { data: player } = await supabaseAdmin
  .from('players')
  .select('id, pass_tier, home_store_id')
  .eq('clerk_user_id', userId)
  .single();

if (!player) {
  return NextResponse.json({ error: 'Player not found' }, { status: 404 });
}

const resolvedStoreId: string | null = storeId || (player as any).home_store_id || null;

if (!resolvedStoreId) {
  return NextResponse.json({ error: 'No store selected — visit a store first' }, { status: 400 });
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Manual verify concurrent claim test**

Open two browser tabs both logged in as the same test player. Have both attempt to redeem the same item (with quantity=1) at the same time. Only one should succeed. The second should return "Item is out of stock" (from the RPC's quantity check under row lock).

- [ ] **Step 5: Commit**

```bash
git add app/api/prize-wall/redeem/route.ts
git commit -m "feat: enforce store ownership in redemption, require resolved store"
```

---

## Task 5: HQ Prize Wall Store Threading + Display Rules

**Files:**
- Modify: `app/api/hq/prize-wall/route.ts` — GET requires `storeId`, filters to `null OR storeId`
- Modify: `app/hq/page.tsx` — `loadPrizeItems` passes storeId; `savePrizeItem` includes `store_id`; network items shown read-only

**Interfaces:**
- Consumes: `hqStore.activeStoreId`, `staffContext.isNetworkAdmin`
- Produces: `prizeWallDataset: StoreDatasetState`, stale-response protection on prize wall load

- [ ] **Step 1: Update `app/api/hq/prize-wall/route.ts` GET**

Read the current GET handler. It currently accepts no params and filters by `allStoreIds`. Replace:

```ts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      // Network admin can omit storeId to see all items
      const staffCtx = await requireNetworkAdmin();
      if (!staffCtx) {
        return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
      }
      // Network admin unfiltered list
      const { data, error } = await supabaseAdmin
        .from('prize_wall_items' as any)
        .select('id, name, description, image_url, xp_cost, retail_value, quantity, store_id, unlock_threshold, is_active, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json({ items: data ?? [] });
    }

    const staffCtx = await requireStoreAccess(storeId);
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Return network-wide items + items belonging to this store
    const { data, error } = await (supabaseAdmin as any)
      .from('prize_wall_items')
      .select('id, name, description, image_url, xp_cost, retail_value, quantity, store_id, unlock_threshold, is_active, created_at')
      .or(`store_id.is.null,store_id.eq.${storeId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ items: data ?? [] });
  } catch (err) {
    console.error('prize-wall GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

Also update the import to include `requireStoreAccess`:

```ts
import { requireAnyStaff, requireNetworkAdmin, requireStoreManager, requireStoreAccess } from '@/lib/auth-helpers';
```

- [ ] **Step 2: Add `prizeWallDataset` state and update `loadPrizeItems` in HQPage**

Add state after `playersDataset`:

```ts
const [prizeWallDataset, setPrizeWallDataset] = useState<StoreDatasetState>({ storeId: null, status: 'idle' });
```

Replace `loadPrizeItems`:

```ts
const loadPrizeItems = async () => {
  if (!hqStore.activeStoreId && !staffContext?.isNetworkAdmin) return;
  const requestedStoreId = hqStore.activeStoreId;
  setPrizeLoading(true);
  setPrizeWallDataset({ storeId: requestedStoreId, status: 'loading' });
  try {
    const url = requestedStoreId
      ? `/api/hq/prize-wall?storeId=${encodeURIComponent(requestedStoreId)}`
      : '/api/hq/prize-wall';
    const res = await fetch(url);
    if (requestedStoreId !== activeStoreRef.current) return;
    const data = await res.json();
    setPrizeItems(data.items || []);
    setPrizeWallDataset({ storeId: requestedStoreId, status: 'ready' });
  } catch {
    setPrizeWallDataset({ storeId: requestedStoreId, status: 'error' });
    showToast('Failed to load prize wall items', 'error');
  } finally {
    setPrizeLoading(false);
  }
};
```

- [ ] **Step 3: Fix `savePrizeItem` POST to include `store_id`**

In `savePrizeItem`, the current POST body doesn't include `store_id`. Update:

```ts
body: JSON.stringify({
  name: prizeForm.name,
  description: prizeForm.description || null,
  image_url: prizeForm.image_url || null,
  xp_cost: Number(prizeForm.xp_cost),
  retail_value: prizeForm.retail_value ? Number(prizeForm.retail_value) : null,
  quantity: prizeForm.quantity ? Number(prizeForm.quantity) : null,
  unlock_threshold: prizeForm.unlock_threshold ? Number(prizeForm.unlock_threshold) : null,
  is_active: prizeForm.is_active,
  // Store managers create store-scoped items; network admins create network-wide items
  store_id: staffContext?.isNetworkAdmin ? null : (hqStore.activeStoreId ?? null),
}),
```

- [ ] **Step 4: Show network-wide items as read-only in prize wall tab**

In the prize wall items list JSX in HQPage, find where items are rendered. Add a label and disable edit/delete for network-wide items when viewed by store managers:

```tsx
{item.store_id === null && !staffContext?.isNetworkAdmin && (
  <span className="text-xs text-secondary border border-border-token rounded px-1.5 py-0.5">
    Network Reward · Read Only
  </span>
)}
```

Disable edit/delete buttons for network-wide items for store managers:

```tsx
<button
  onClick={() => handleEditPrizeItem(item)}
  disabled={item.store_id === null && !staffContext?.isNetworkAdmin}
  className="... disabled:opacity-30 disabled:cursor-not-allowed"
>
  Edit
</button>
```

- [ ] **Step 5: TypeScript check**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Manual verify**

1. Log in as store manager → Prize Wall tab → confirm network-wide items show "Network Reward · Read Only" and Edit/Delete are disabled
2. Log in as network admin → confirm all items are editable
3. Network admin creates a new item → `store_id` should be null in DB
4. Store manager creates a new item → `store_id` should be their active store in DB
5. Switch stores as network admin → prize wall refreshes to show the new store's items

- [ ] **Step 7: Commit**

```bash
git add app/api/hq/prize-wall/route.ts app/hq/page.tsx
git commit -m "feat: HQ prize wall scoped to active store, network items read-only for managers"
```

---

## Task 6: HQ Redemptions Dataset Readiness + Stale Protection

**Files:**
- Modify: `app/hq/page.tsx` — `RedemptionsPanel` now accepts `storeDataset` prop; stale-response guard; claim/void re-validates store

**Note:** `RedemptionsPanel` already accepts `activeStoreId` from Foundation Task 0 and passes it to both the list fetch and the PATCH call. This task adds `StoreDatasetState` tracking and ensures every mutation re-validates store ownership.

**Interfaces:**
- Consumes: `activeStoreId`, `StoreDatasetState` from Foundation Task 0
- Produces: `redemptionsDataset: StoreDatasetState` tracked in HQPage, passed to `RedemptionsPanel`

- [ ] **Step 1: Add `redemptionsDataset` state to HQPage**

```ts
const [redemptionsDataset, setRedemptionsDataset] = useState<StoreDatasetState>({ storeId: null, status: 'idle' });
```

- [ ] **Step 2: Update `RedemptionsPanel` to track dataset state**

Change the signature to include `onDatasetChange`:

```ts
function RedemptionsPanel({
  activeStoreId,
  onDatasetChange,
}: {
  activeStoreId: string | null;
  onDatasetChange: (state: StoreDatasetState) => void;
}) {
```

In the list fetch `useEffect`, update:

```ts
useEffect(() => {
  if (!activeStoreId) {
    onDatasetChange({ storeId: null, status: 'idle' });
    return;
  }
  const requestedStoreId = activeStoreId;
  setListLoading(true);
  onDatasetChange({ storeId: requestedStoreId, status: 'loading' });
  fetch(`/api/hq/redemptions?storeId=${encodeURIComponent(requestedStoreId)}`)
    .then(r => r.json())
    .then(d => {
      setRecentList(d.redemptions || []);
      onDatasetChange({ storeId: requestedStoreId, status: 'ready' });
    })
    .catch(() => {
      onDatasetChange({ storeId: requestedStoreId, status: 'error' });
    })
    .finally(() => setListLoading(false));
}, [actionResult, activeStoreId]);
```

- [ ] **Step 3: Update render call to pass `onDatasetChange`**

Find the render call `<RedemptionsPanel activeStoreId={hqStore.activeStoreId} />` and update:

```tsx
<RedemptionsPanel
  activeStoreId={hqStore.activeStoreId}
  onDatasetChange={setRedemptionsDataset}
/>
```

The `redemptions/[code]` PATCH route already re-validates store ownership server-side (from Foundation Task 0) — no additional server change needed. The claim/void buttons in `RedemptionsPanel` already use the `storeParam` pattern added in Foundation Task 0.

- [ ] **Step 4: TypeScript check**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Manual verify**

1. Open Redemptions tab → list loads for the active store
2. Switch stores → list refreshes for the new store
3. Look up a claim code and fulfill it → verify the PATCH includes the `storeId` query param
4. Attempt to void a redemption from a different store by manually changing the claim code → server returns 404 "Redemption not found for the selected store."

- [ ] **Step 6: Commit**

```bash
git add app/hq/page.tsx
git commit -m "feat: redemptions dataset readiness tracking with stale-store protection"
```

---

## Task 7: Events and Banners Store Threading

**Files:**
- Modify: `app/api/hq/banners/route.ts` — GET requires `storeId`, returns `null OR storeId`
- Modify: `app/hq/page.tsx` — `loadBanners` passes storeId; `loadHQEvents` passes storeId; `bannersDataset` and `eventsDataset` tracked

**Interfaces:**
- Consumes: `hqStore.activeStoreId`, `activeStoreRef`
- Produces: `bannersDataset: StoreDatasetState`, `eventsDataset: StoreDatasetState`

- [ ] **Step 1: Update `app/api/hq/banners/route.ts` GET**

Read the current GET handler. Add `storeId` param:

```ts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      const staffCtx = await requireNetworkAdmin();
      if (!staffCtx) {
        return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
      }
      // Network admin unfiltered
      const { data: banners, error } = await supabaseAdmin
        .from('banners')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return NextResponse.json({ banners: banners || [] });
    }

    const staffCtx = await requireStoreAccess(storeId);
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: banners, error } = await supabaseAdmin
      .from('banners')
      .select('*')
      .or(`store_id.is.null,store_id.eq.${storeId}`)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ banners: banners || [] });
  } catch (error) {
    console.error('Banners GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

Also add `requireStoreAccess` to the import.

- [ ] **Step 2: Add dataset state and update `loadBanners` in HQPage**

Add state:

```ts
const [bannersDataset, setBannersDataset] = useState<StoreDatasetState>({ storeId: null, status: 'idle' });
const [eventsDataset, setEventsDataset] = useState<StoreDatasetState>({ storeId: null, status: 'idle' });
```

Replace `loadBanners`:

```ts
const loadBanners = async () => {
  if (!hqStore.activeStoreId && !staffContext?.isNetworkAdmin) return;
  const requestedStoreId = hqStore.activeStoreId;
  setBannerLoading(true);
  setBannersDataset({ storeId: requestedStoreId, status: 'loading' });
  try {
    const url = requestedStoreId
      ? `/api/hq/banners?storeId=${encodeURIComponent(requestedStoreId)}`
      : '/api/hq/banners';
    const res = await fetch(url);
    if (requestedStoreId !== activeStoreRef.current) return;
    const data = await res.json();
    setBanners(data.banners || []);
    setBannersDataset({ storeId: requestedStoreId, status: 'ready' });
  } catch {
    setBannersDataset({ storeId: requestedStoreId, status: 'error' });
    showToast('Failed to load banners', 'error');
  } finally {
    setBannerLoading(false);
  }
};
```

- [ ] **Step 3: Update `loadHQEvents` to pass storeId**

The events route at `/api/events` already accepts a `store_id` query param (confirmed in codebase grep). Update `loadHQEvents`:

```ts
const loadHQEvents = async () => {
  if (!hqStore.activeStoreId) return;
  const requestedStoreId = hqStore.activeStoreId;
  setEventsLoading(true);
  setEventsDataset({ storeId: requestedStoreId, status: 'loading' });
  try {
    const [eventsRes, activeRes] = await Promise.all([
      fetch(`/api/events?status=upcoming&limit=20&store_id=${encodeURIComponent(requestedStoreId)}`),
      fetch('/api/events/active'),
    ]);
    if (requestedStoreId !== activeStoreRef.current) return;
    // ... existing response processing unchanged ...
    setEventsDataset({ storeId: requestedStoreId, status: 'ready' });
  } catch (error) {
    setEventsDataset({ storeId: requestedStoreId, status: 'error' });
    console.error('Failed to load events:', error);
  } finally {
    setEventsLoading(false);
  }
};
```

- [ ] **Step 4: Audit `saveBanner` and `deleteBanner` for store scoping**

Read the current `saveBanner` and `deleteBanner` functions. Confirm:
- `saveBanner` POSTs with `store_id` in the body. If it doesn't, add `store_id: staffContext?.isNetworkAdmin ? null : hqStore.activeStoreId`
- `deleteBanner` DELETEs by ID — the route already validates ownership from item's `store_id`. No client change needed.

- [ ] **Step 5: TypeScript check**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Manual verify**

1. Open Banners tab → banners load for active store
2. Switch stores → banners refresh
3. Open Events tab → events load for active store
4. Switch stores → events refresh, previous store's events disappear
5. Create a banner as store manager → `store_id` in DB matches active store
6. Network-wide banners (`store_id = null`) appear for all store contexts

- [ ] **Step 7: Commit and push**

```bash
git add app/api/hq/banners/route.ts app/hq/page.tsx
git commit -m "feat: banners and events scoped to active store with dataset readiness"
git push
```

---

## Verification Gates (Phase 6 Complete)

Run these after Task 7 before declaring Phase 6 complete:

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run build` — compiles (prerender failures from Clerk placeholder key are pre-existing, not a regression)
- [ ] Store manager cannot read another store's redemptions by changing `storeId` to a different store UUID — API returns 403
- [ ] Network admin switches across multiple active stores — each switch refreshes all tabs, no stale data
- [ ] Switching stores clears player search results (`playerDetails` becomes null)
- [ ] Simultaneous redemption claims of a quantity-1 item result in exactly one `claimed` status and one "out of stock" error
- [ ] Negative Prize Point corrections cannot create a negative balance — API returns 400
- [ ] Network-wide Prize Wall items remain `store_id = null` after a network admin edits them while viewing a specific store
- [ ] All prize point transactions record `store_id = activeStoreId` for store adjustments, or `store_id = null` for network-level admin adjustments
- [ ] Expired redemptions (`status = 'expired'`) are correctly handled in the redemptions queue display

## What Phase 6 Does NOT Cover

These are future phases:
- Push notifications for earned Prize Points
- Automated expiry cron for `pending` redemptions past TTL (currently set on claim)
- Redemption history player-facing view
- Prize Wall analytics (store-level redemption reporting)
- Player-selectable store (currently defaults to `home_store_id`)
