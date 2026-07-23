# Phase 7 — Store Communications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable store staff to send in-app notifications to their store's players directly from HQ. Network admins can broadcast to a specific store or all players across the network. Players receive messages in their existing NotificationBell (30s polling) and `/dashboard/notifications` page — no new player UI required.

**Architecture:** Builds entirely on existing infrastructure. The `notifications` table gains a nullable `store_id` column (null = network-wide). A new `broadcasts` table tracks the audit trail per send. `lib/notifications.ts` gets a `notifyStorePlayers()` function that targets players by `home_store_id`. A new HQ Broadcasts tab provides the compose form and history. No realtime/WebSocket work — existing polling handles delivery.

**Tech Stack:** Next.js 14 App Router, Supabase PostgreSQL, Tailwind CSS, `lib/auth-helpers.ts` (`requireStoreAccess`, `requireNetworkAdmin`), `lib/notifications.ts` (extended). No test framework — verify with `npx tsc --noEmit` + `npm run build` + manual browser steps.

## Global Constraints

- No test framework — verify with `npx tsc --noEmit` then manual browser steps
- `hqStore.activeStoreId` is the source of truth for all HQ store-scoped calls
- Store managers can only broadcast to their own store's players — server enforces `requireStoreAccess(storeId)`
- Network admin can broadcast to a specific store OR all stores — "all network" requires `requireNetworkAdmin()`
- `notifyStorePlayers()` filters by `players.home_store_id`, not `selectedStore` — home store determines which store notifications a player receives
- Notifications respect player `notification_preferences.store` — players who opt out of `store` category are silently skipped
- `broadcasts` table is the audit trail — insert one row per send action (not per player), recording `player_count`
- Negative or zero `player_count` still succeeds — the broadcast was sent, just no eligible players at that moment
- Store managers see only their store's broadcast history; network admins see all
- `notifications.store_id` is nullable: null = network-wide, uuid = store-scoped
- No comments added to code unless explaining a non-obvious constraint
- `npx tsc --noEmit` must pass with 0 errors before every commit
- Deploy: `git push` — Vercel auto-deploys from main

---

## File Structure

**New files:**
- `supabase/migrations/20260722_phase7_schema.sql` — store_id on notifications, broadcasts table
- `app/api/hq/broadcast/route.ts` — POST (send broadcast), GET (history)

**Modified files:**
- `lib/notifications.ts` — add `notifyStorePlayers()`, update `notifyAllPlayers()` to return count and accept optional `store_id`
- `app/hq/page.tsx` — add Broadcasts tab (compose form + history)

---

## Task 0: Database Migrations

**Files:**
- Create: `supabase/migrations/20260722_phase7_schema.sql`

**Interfaces:**
- Produces: nullable `notifications.store_id`, `broadcasts` table for audit trail

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260722_phase7_schema.sql`:

```sql
-- Phase 7: store_id on notifications
-- store_id = null  → network-wide notification (sent to all players)
-- store_id = <uuid> → store-scoped notification (sent to that store's players)
alter table notifications
  add column if not exists store_id uuid references stores(id);

-- Phase 7: broadcasts audit table
-- One row per send action (not per player).
-- scope = 'store'   → sent to one store's players (store_id required)
-- scope = 'network' → sent to all players across all stores (store_id null)
create table if not exists broadcasts (
  id                 uuid        primary key default gen_random_uuid(),
  store_id           uuid        references stores(id),
  scope              text        not null check (scope in ('store', 'network')),
  title              text        not null,
  message            text        not null,
  notification_type  text        not null default 'store_announcement',
  sent_by_clerk_id   text        not null,
  player_count       integer     not null default 0,
  created_at         timestamptz not null default now()
);

-- Index for HQ history queries
create index if not exists broadcasts_store_id_created_at
  on broadcasts (store_id, created_at desc);

create index if not exists broadcasts_created_at
  on broadcasts (created_at desc);
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use `mcp__plugin_supabase_supabase__apply_migration` with project ID `gdyksfarqpzfvymzifxr` and the SQL above.

Or via CLI:
```bash
npx supabase db push
```

- [ ] **Step 3: Verify columns exist**

Run via Supabase MCP execute_sql:
```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'notifications' and column_name = 'store_id';

select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'broadcasts';
```

Expected: `notifications.store_id` exists as nullable uuid; `broadcasts` table exists.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260722_phase7_schema.sql
git commit -m "feat: add store_id to notifications, create broadcasts audit table"
```

---

## Task 1: Update lib/notifications.ts

**Files:**
- Modify: `lib/notifications.ts`

**Interfaces:**
- Produces: `notifyStorePlayers(storeId, ...)` → `Promise<number>` (player count notified)
- Produces: `notifyAllPlayers(...)` now also accepts optional `storeId` param and returns `number`
- `createNotification()` gains optional `storeId?: string` param

- [ ] **Step 1: Read the current file**

Read `lib/notifications.ts` (already done in plan preparation — 95 lines).

- [ ] **Step 2: Rewrite lib/notifications.ts**

Replace the entire file with:

```ts
import { supabaseAdmin } from '@/lib/supabase';

export type NotificationCategory = 'daily_rewards' | 'events' | 'leaderboard' | 'social' | 'store';

interface NotificationPrefs {
  daily_rewards: boolean;
  events: boolean;
  leaderboard: boolean;
  social: boolean;
  store: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  daily_rewards: true,
  events: true,
  leaderboard: true,
  social: true,
  store: true,
};

async function getPrefs(playerId: string): Promise<NotificationPrefs> {
  const { data } = await (supabaseAdmin as any)
    .from('players')
    .select('notification_preferences')
    .eq('id', playerId)
    .single();
  return { ...DEFAULT_PREFS, ...(data?.notification_preferences ?? {}) };
}

export async function createNotification(
  playerId: string,
  type: string,
  title: string,
  message: string,
  data: Record<string, string | null> | null,
  category: NotificationCategory,
  storeId?: string
): Promise<void> {
  try {
    const prefs = await getPrefs(playerId);
    if (!prefs[category]) return;

    await supabaseAdmin.from('notifications').insert({
      player_id: playerId,
      type,
      title,
      message,
      data: data as any,
      is_read: false,
      store_id: storeId ?? null,
    });
  } catch (err) {
    console.error('createNotification error:', err);
  }
}

// Send a notification to all players at a specific store (filtered by home_store_id).
// Returns the number of players actually notified (after preference filtering).
export async function notifyStorePlayers(
  storeId: string,
  type: string,
  title: string,
  message: string,
  data: Record<string, string | null> | null,
  category: NotificationCategory
): Promise<number> {
  try {
    const { data: players } = await (supabaseAdmin as any)
      .from('players')
      .select('id, notification_preferences')
      .eq('home_store_id', storeId);

    if (!players?.length) return 0;

    const eligible = (players as { id: string; notification_preferences: Partial<NotificationPrefs> | null }[])
      .filter((p) => {
        const prefs = { ...DEFAULT_PREFS, ...(p.notification_preferences ?? {}) };
        return prefs[category];
      });

    if (!eligible.length) return 0;

    const rows = eligible.map((p) => ({
      player_id: p.id,
      store_id: storeId,
      type,
      title,
      message,
      data: data as any,
      is_read: false,
    }));

    for (let i = 0; i < rows.length; i += 100) {
      await supabaseAdmin.from('notifications').insert(rows.slice(i, i + 100) as any);
    }

    return eligible.length;
  } catch (err) {
    console.error('notifyStorePlayers error:', err);
    return 0;
  }
}

// Send a notification to all players across the entire network.
// Returns the number of players actually notified (after preference filtering).
export async function notifyAllPlayers(
  type: string,
  title: string,
  message: string,
  data: Record<string, string | null> | null,
  category: NotificationCategory
): Promise<number> {
  try {
    const { data: players } = await (supabaseAdmin as any)
      .from('players')
      .select('id, notification_preferences');

    if (!players?.length) return 0;

    const eligible = (players as { id: string; notification_preferences: Partial<NotificationPrefs> | null }[])
      .filter((p) => {
        const prefs = { ...DEFAULT_PREFS, ...(p.notification_preferences ?? {}) };
        return prefs[category];
      });

    if (!eligible.length) return 0;

    const rows = eligible.map((p) => ({
      player_id: p.id,
      store_id: null,
      type,
      title,
      message,
      data: data as any,
      is_read: false,
    }));

    for (let i = 0; i < rows.length; i += 100) {
      await supabaseAdmin.from('notifications').insert(rows.slice(i, i + 100) as any);
    }

    return eligible.length;
  } catch (err) {
    console.error('notifyAllPlayers error:', err);
    return 0;
  }
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && npx tsc --noEmit
```

Expected: 0 errors. If callers of `notifyAllPlayers` assigned the void return, fix by ignoring the return value (`void notifyAllPlayers(...)` or `await notifyAllPlayers(...)`).

- [ ] **Step 4: Commit**

```bash
git add lib/notifications.ts
git commit -m "feat: add notifyStorePlayers, notifyAllPlayers returns player count"
```

---

## Task 2: POST /api/hq/broadcast + GET /api/hq/broadcasts

**Files:**
- Create: `app/api/hq/broadcast/route.ts`

**Interfaces:**
- `POST /api/hq/broadcast` body: `{ title: string, message: string, scope: 'store' | 'network', storeId: string | null }`
- `POST` response: `{ success: true, playerCount: number }` or `{ error: string }`
- `GET /api/hq/broadcasts?storeId=<uuid>` response: `{ broadcasts: Broadcast[] }` — history for that store
- `GET /api/hq/broadcasts` (no storeId, network admin only) response: `{ broadcasts: Broadcast[] }` — all history

- [ ] **Step 1: Create `app/api/hq/broadcast/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireStoreAccess, requireNetworkAdmin } from '@/lib/auth-helpers';
import { notifyStorePlayers, notifyAllPlayers } from '@/lib/notifications';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as {
      title: string;
      message: string;
      scope: 'store' | 'network';
      storeId: string | null;
    };

    const { title, message, scope, storeId } = body;

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'title and message are required' }, { status: 400 });
    }

    if (!['store', 'network'].includes(scope)) {
      return NextResponse.json({ error: 'scope must be "store" or "network"' }, { status: 400 });
    }

    if (scope === 'store' && !storeId) {
      return NextResponse.json({ error: 'storeId is required for store scope' }, { status: 400 });
    }

    // Authorization: network broadcasts require network admin; store broadcasts require store access
    if (scope === 'network') {
      const ctx = await requireNetworkAdmin();
      if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } else {
      const ctx = await requireStoreAccess(storeId!);
      if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Send notifications
    let playerCount = 0;
    if (scope === 'network') {
      playerCount = await notifyAllPlayers(
        'store_announcement',
        title.trim(),
        message.trim(),
        null,
        'store'
      );
    } else {
      playerCount = await notifyStorePlayers(
        storeId!,
        'store_announcement',
        title.trim(),
        message.trim(),
        null,
        'store'
      );
    }

    // Log to broadcasts audit table
    await supabaseAdmin.from('broadcasts' as any).insert({
      store_id: scope === 'store' ? storeId : null,
      scope,
      title: title.trim(),
      message: message.trim(),
      notification_type: 'store_announcement',
      sent_by_clerk_id: userId,
      player_count: playerCount,
    });

    return NextResponse.json({ success: true, playerCount });
  } catch (err) {
    console.error('broadcast POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      // Network admin unfiltered history
      const ctx = await requireNetworkAdmin();
      if (!ctx) return NextResponse.json({ error: 'storeId required' }, { status: 400 });

      const { data, error } = await (supabaseAdmin as any)
        .from('broadcasts')
        .select('id, store_id, scope, title, message, player_count, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return NextResponse.json({ broadcasts: data ?? [] });
    }

    const ctx = await requireStoreAccess(storeId);
    if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Store managers see their store's broadcasts + network-wide broadcasts
    const { data, error } = await (supabaseAdmin as any)
      .from('broadcasts')
      .select('id, store_id, scope, title, message, player_count, created_at')
      .or(`store_id.eq.${storeId},scope.eq.network`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ broadcasts: data ?? [] });
  } catch (err) {
    console.error('broadcast GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Manual API test**

Test via browser dev tools or curl after deploying:

```bash
# As logged-in staff — store broadcast
curl -X POST /api/hq/broadcast \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","message":"Hello store!","scope":"store","storeId":"<uuid>"}'
# Expected: { success: true, playerCount: N }

# GET history
curl /api/hq/broadcasts?storeId=<uuid>
# Expected: { broadcasts: [...] }
```

- [ ] **Step 4: Commit**

```bash
git add app/api/hq/broadcast/route.ts
git commit -m "feat: POST /api/hq/broadcast and GET /api/hq/broadcasts"
```

---

## Task 3: HQ Broadcasts Tab

**Files:**
- Modify: `app/hq/page.tsx`

**Interfaces:**
- Consumes: `hqStore.activeStoreId`, `staffContext.isNetworkAdmin`, `/api/hq/broadcast` (POST + GET)
- Produces: "Broadcasts" tab in HQ nav; compose form; sent history table; `broadcastsDataset: StoreDatasetState`

- [ ] **Step 1: Read the HQ nav tabs section**

```bash
grep -n "activeTab\|setActiveTab\|'players'\|'banners'\|'events'\|tab.*label\|navItems\|TabButton" \
  app/hq/page.tsx | head -40
```

Identify where to insert the "broadcasts" tab in the nav list and the tab panel switch.

- [ ] **Step 2: Add state variables to HQPage**

Inside `HQPage()`, after existing state declarations (find by searching for `const [redemptionsDataset`), add:

```ts
// Broadcasts tab state
const [broadcastTitle, setBroadcastTitle] = useState('');
const [broadcastMessage, setBroadcastMessage] = useState('');
const [broadcastScope, setBroadcastScope] = useState<'store' | 'network'>('store');
const [broadcastSending, setBroadcastSending] = useState(false);
const [broadcastHistory, setBroadcastHistory] = useState<Array<{
  id: string;
  store_id: string | null;
  scope: 'store' | 'network';
  title: string;
  message: string;
  player_count: number;
  created_at: string;
}>>([]);
const [broadcastsDataset, setBroadcastsDataset] = useState<StoreDatasetState>({ storeId: null, status: 'idle' });
const [broadcastHistoryLoading, setBroadcastHistoryLoading] = useState(false);
```

- [ ] **Step 3: Add loadBroadcastHistory function**

After the existing `loadBanners` function (search for `const loadBanners`), add:

```ts
const loadBroadcastHistory = async () => {
  if (!hqStore.activeStoreId && !staffContext?.isNetworkAdmin) return;
  const requestedStoreId = hqStore.activeStoreId;
  setBroadcastHistoryLoading(true);
  setBroadcastsDataset({ storeId: requestedStoreId, status: 'loading' });
  try {
    const url = requestedStoreId
      ? `/api/hq/broadcast?storeId=${encodeURIComponent(requestedStoreId)}`
      : '/api/hq/broadcast';
    const res = await fetch(url);
    if (requestedStoreId !== activeStoreRef.current) return;
    const data = await res.json();
    setBroadcastHistory(data.broadcasts || []);
    setBroadcastsDataset({ storeId: requestedStoreId, status: 'ready' });
  } catch {
    setBroadcastsDataset({ storeId: requestedStoreId, status: 'error' });
    showToast('Failed to load broadcast history', 'error');
  } finally {
    setBroadcastHistoryLoading(false);
  }
};
```

- [ ] **Step 4: Add sendBroadcast function**

After `loadBroadcastHistory`, add:

```ts
const sendBroadcast = async () => {
  if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
    showToast('Title and message are required', 'error');
    return;
  }
  if (broadcastScope === 'store' && !hqStore.activeStoreId) {
    showToast('No active store selected', 'error');
    return;
  }

  setBroadcastSending(true);
  try {
    const res = await fetch('/api/hq/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        scope: broadcastScope,
        storeId: broadcastScope === 'store' ? hqStore.activeStoreId : null,
      }),
    });
    const data = await res.json();
    if (data.error) {
      showToast(data.error, 'error');
    } else {
      setBroadcastTitle('');
      setBroadcastMessage('');
      showToast(`Sent to ${data.playerCount} player${data.playerCount !== 1 ? 's' : ''}`, 'success');
      loadBroadcastHistory();
    }
  } catch {
    showToast('Failed to send broadcast', 'error');
  } finally {
    setBroadcastSending(false);
  }
};
```

- [ ] **Step 5: Wire loadBroadcastHistory into the store-switch effect**

Find the `useEffect` that triggers tab reloads on store switch (the one added in Phase 6 that calls `loadPrizeItems`, `loadBanners`, `loadHQEvents` etc. when `activeTab` changes). Add `loadBroadcastHistory` to the broadcasts case:

```ts
} else if (activeTab === 'broadcasts') {
  loadBroadcastHistory();
}
```

Also add to the `onStoreChange` cleanup block — clearing the state when switching stores:

```ts
setBroadcastHistory([]);
setBroadcastsDataset({ storeId: null, status: 'idle' });
```

- [ ] **Step 6: Add "broadcasts" to the nav tab list**

Find the array or JSX block that renders HQ nav tabs (search for `'players'` or `'banners'` near a tab label). Insert a new tab entry for broadcasts:

```tsx
{ id: 'broadcasts', label: 'Broadcasts' }
```

Or if tabs are rendered as inline JSX buttons, add:

```tsx
<button
  onClick={() => setActiveTab('broadcasts')}
  className={activeTab === 'broadcasts' ? activeTabClass : inactiveTabClass}
>
  Broadcasts
</button>
```

- [ ] **Step 7: Add useEffect to load broadcasts on tab switch**

Find the existing `useEffect` that fires when `activeTab` changes and already handles `banners`, `prize-wall`, etc. Add broadcasts to it:

```ts
} else if (activeTab === 'broadcasts') {
  if (broadcastsDataset.storeId !== hqStore.activeStoreId || broadcastsDataset.status === 'idle') {
    loadBroadcastHistory();
  }
}
```

- [ ] **Step 8: Add the Broadcasts tab panel JSX**

Find the tab panel switch (the large block of `activeTab === 'players'`, `activeTab === 'banners'` conditionals). Add the broadcasts panel:

```tsx
{activeTab === 'broadcasts' && (
  <div className="space-y-6">
    {/* Compose */}
    <div className="bg-surface rounded-xl border border-border-token p-5 space-y-4">
      <h2 className="text-sm font-semibold text-primary">Send Message to Players</h2>

      {staffContext?.isNetworkAdmin && (
        <div className="flex gap-2">
          <button
            onClick={() => setBroadcastScope('store')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
              broadcastScope === 'store'
                ? 'bg-accent text-accent-fg border-accent'
                : 'bg-transparent text-secondary border-border-token hover:border-accent'
            }`}
          >
            My Store
          </button>
          <button
            onClick={() => setBroadcastScope('network')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
              broadcastScope === 'network'
                ? 'bg-accent text-accent-fg border-accent'
                : 'bg-transparent text-secondary border-border-token hover:border-accent'
            }`}
          >
            All Network
          </button>
        </div>
      )}

      <input
        type="text"
        value={broadcastTitle}
        onChange={e => setBroadcastTitle(e.target.value)}
        placeholder="Title (e.g. Weekend Sale, Event Reminder)"
        maxLength={80}
        className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
      />

      <textarea
        value={broadcastMessage}
        onChange={e => setBroadcastMessage(e.target.value)}
        placeholder="Message body…"
        rows={3}
        maxLength={500}
        className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent resize-none"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-secondary">
          {broadcastScope === 'network'
            ? 'All network players will be notified'
            : hqStore.activeStoreId
            ? 'Notifies players with this store as home store'
            : 'No store selected'}
        </span>
        <button
          onClick={sendBroadcast}
          disabled={
            broadcastSending ||
            !broadcastTitle.trim() ||
            !broadcastMessage.trim() ||
            (broadcastScope === 'store' && !hqStore.activeStoreId)
          }
          className="px-4 py-2 bg-accent text-accent-fg text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {broadcastSending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>

    {/* History */}
    <div className="bg-surface rounded-xl border border-border-token p-5 space-y-3">
      <h2 className="text-sm font-semibold text-primary">Sent History</h2>

      {broadcastHistoryLoading && (
        <p className="text-sm text-secondary">Loading…</p>
      )}

      {!broadcastHistoryLoading && broadcastHistory.length === 0 && (
        <p className="text-sm text-secondary">No broadcasts sent yet.</p>
      )}

      {broadcastHistory.map(b => (
        <div key={b.id} className="border border-border-token rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary">{b.title}</span>
            <span className="text-xs text-secondary">
              {b.scope === 'network' ? 'All Network' : 'Store'} · {b.player_count} player{b.player_count !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-secondary line-clamp-2">{b.message}</p>
          <p className="text-xs text-tertiary">
            {new Date(b.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 9: TypeScript check**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && npx tsc --noEmit
```

Expected: 0 errors. Fix any type narrowing issues with `broadcastScope` or `StoreDatasetState`.

- [ ] **Step 10: Build check**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && npm run build 2>&1 | tail -20
```

Expected: successful build (prerender warnings from Clerk are pre-existing, not a regression).

- [ ] **Step 11: Manual verify**

1. Open HQ → confirm "Broadcasts" tab appears in nav
2. Switch stores → confirm broadcast history refreshes
3. As store manager: confirm scope selector is hidden (only "My Store" sends)
4. As network admin: confirm scope selector shows "My Store" | "All Network" buttons
5. Fill in title + message, click Send → toast shows "Sent to N players"
6. Broadcast appears in history with correct date, scope label, and player count
7. Log in as a player whose `home_store_id` matches the active store → check notification bell → broadcast appears within 30 seconds
8. Send with empty title → button remains disabled
9. Switch stores as network admin → history refreshes to show new store + network-wide broadcasts

- [ ] **Step 12: Commit and push**

```bash
git add app/hq/page.tsx
git commit -m "feat: HQ Broadcasts tab with compose form and sent history"
git push
```

---

## Verification Gates (Phase 7 Complete)

Run these after Task 3 before declaring Phase 7 complete:

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run build` — compiles (pre-existing Clerk prerender warnings acceptable)
- [ ] Store manager cannot send a network-wide broadcast — POST with `scope: 'network'` returns 403
- [ ] Store manager cannot broadcast to a different store's players — POST with a storeId they don't manage returns 403
- [ ] Network admin can broadcast to a specific store OR all stores — both succeed
- [ ] Broadcasts table contains one row per send, not one row per player
- [ ] `notifications.store_id` is populated for store-scoped sends, null for network-wide
- [ ] Players with `notification_preferences.store = false` are skipped — `player_count` reflects actual notified count, not total player count
- [ ] Broadcast history shows in reverse chronological order
- [ ] Store manager sees only their store's broadcasts + network-wide; network admin sees all
- [ ] Switching stores in HQ clears and reloads broadcast history
- [ ] Player receives notification in `NotificationBell` within 30 seconds of broadcast

## What Phase 7 Does NOT Cover

These are future phases or explicitly out of scope:

- Email broadcasts (no Resend campaign infrastructure)
- SMS or push notifications (Vercel Hobby plan — no cron for delivery; restore on Pro upgrade)
- Scheduling broadcasts for future delivery
- Broadcast templates or drafts
- Per-player notification delivery receipts
- Analytics on open/read rates
- Player opt-in/opt-out UI (existing `notification_preferences` handles server-side; player UI is a future feature)
