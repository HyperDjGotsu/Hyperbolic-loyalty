# HQ Staff Store Context — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent store context to HQ so staff always know which store they are operating on, and every store-scoped write is correctly authorized and scoped.

**Architecture:** A `useHQStore` hook owns store selection (localStorage + auth context), passes `activeStoreId` down through HQPage, and every API call includes it. Route handlers are upgraded to require explicit store authorization.

**Tech Stack:** Next.js 14 App Router, React hooks, Tailwind CSS, Supabase (via existing `requireStoreAccess`), no test framework — verification via `npx tsc --noEmit` + manual browser steps.

## Global Constraints

- Storage key for HQ store: `ggc_hq_selected_store_id` — never touch `ggc_selected_store_id` (player-facing)
- `activeStore` is always derived from `activeStoreId` — never held as independent state
- Hydration gate: `if (loading || isStaff === null || !hqStore.isInitialized)` — no-store state handled after the gate
- Pill style: `bg-accent/15 border border-accent/40 text-accent rounded-full px-3 py-1`
- Header must be `sticky top-0 z-40` — spec requirement
- No timer-based transitions — `storeTransitioning` is state-driven only
- No test framework in this project — verify with `npx tsc --noEmit` + browser

---

### Task 1: `lib/hooks/useHQStore.ts`

**Files:**
- Create: `lib/hooks/useHQStore.ts`

**Interfaces:**
- Produces: `useHQStore(staffContext)` → `UseHQStoreReturn` (consumed by Tasks 2, 3, 4, 6)
- Produces: `StaffStore` type (consumed by Task 3)
- Produces: `UseHQStoreReturn` type (consumed by Task 3)

- [ ] **Step 1: Create the hooks directory and file**

```bash
mkdir -p /home/djgotsu/hyperbolic/projects/hyperbolic-app/lib/hooks
```

- [ ] **Step 2: Write the hook**

Create `lib/hooks/useHQStore.ts`:

```ts
'use client';

import { useState, useEffect } from 'react';

export type StaffStore = {
  id: string;
  name: string;
  role: string;
};

export type UseHQStoreReturn = {
  activeStore: StaffStore | null;
  activeStoreId: string | null;
  setActiveStoreId: (storeId: string) => void;
  availableStores: StaffStore[];
  canSwitchStores: boolean;
  isInitialized: boolean;
};

type StaffContextInput = {
  stores: StaffStore[];
  primaryStoreId: string | null;
  isNetworkAdmin: boolean;
} | null;

const STORAGE_KEY = 'ggc_hq_selected_store_id';

export function useHQStore(staffContext: StaffContextInput): UseHQStoreReturn {
  const [activeStoreId, setActiveStoreIdState] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const availableStores = staffContext?.stores ?? [];
  const activeStore = availableStores.find(s => s.id === activeStoreId) ?? null;

  useEffect(() => {
    if (!staffContext) {
      setActiveStoreIdState(null);
      setIsInitialized(false);
      return;
    }

    const stores = staffContext.stores;

    if (stores.length === 0) {
      setActiveStoreIdState(null);
      setIsInitialized(true);
      return;
    }

    const saved = typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null;
    const isValid = saved !== null && stores.some(s => s.id === saved);

    if (saved !== null && !isValid) {
      localStorage.removeItem(STORAGE_KEY);
    }

    let resolved: string;
    if (isValid && saved) {
      resolved = saved;
    } else if (stores.length === 1) {
      resolved = stores[0].id;
    } else {
      resolved = staffContext.primaryStoreId ?? stores[0].id;
    }

    setActiveStoreIdState(resolved);
    setIsInitialized(true);
  }, [staffContext]);

  function setActiveStoreId(id: string): void {
    if (!availableStores.some(s => s.id === id)) return;
    setActiveStoreIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }

  return {
    activeStore,
    activeStoreId,
    setActiveStoreId,
    availableStores,
    canSwitchStores: availableStores.length > 1,
    isInitialized,
  };
}
```

- [ ] **Step 3: Verify TypeScript compiles clean**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && npx tsc --noEmit
```

Expected: 0 new errors introduced.

- [ ] **Step 4: Commit**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app
git add lib/hooks/useHQStore.ts
git commit -m "feat: add useHQStore hook with localStorage persistence and fallback cascade"
```

---

### Task 2: Wire `useHQStore` into HQPage

**Files:**
- Modify: `app/hq/page.tsx` — add import, hook call, `storeTransitioning` state, updated hydration gate, `StoreDatasetState` type

**Interfaces:**
- Consumes: `useHQStore` from `@/lib/hooks/useHQStore`
- Consumes: `staffContext` state (already exists at line 570)
- Produces: `hqStore` object (used by Tasks 3, 4, 6)
- Produces: `storeTransitioning` state (used by Task 3)
- Produces: `StoreDatasetState` type (used by Task 4)
- Produces: `activeStoreRef` ref (used by Task 4)

- [ ] **Step 1: Add the import**

In `app/hq/page.tsx`, find the existing imports at the top:

```ts
import { useState, useEffect, useRef } from 'react';
```

Add after it:

```ts
import { useHQStore } from '@/lib/hooks/useHQStore';
import type { UseHQStoreReturn } from '@/lib/hooks/useHQStore';
```

- [ ] **Step 2: Add `StoreDatasetState` type**

After the existing `HQShopItem` interface (around line 339), add:

```ts
type StoreDatasetState = {
  storeId: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
};
```

- [ ] **Step 3: Add hook call and new state inside HQPage**

Inside `HQPage()`, after the existing state declarations (after line ~710), add:

```ts
// Store context hook — initialized from staffContext once auth resolves
const hqStore = useHQStore(staffContext);
const activeStoreRef = useRef<string | null>(null);
useEffect(() => {
  activeStoreRef.current = hqStore.activeStoreId;
}, [hqStore.activeStoreId]);

const [storeTransitioning, setStoreTransitioning] = useState(false);
const [playersDataset, setPlayersDataset] = useState<StoreDatasetState>({ storeId: null, status: 'idle' });
```

- [ ] **Step 4: Update the hydration gate**

Find the existing gate at line 2049:

```ts
if (loading || isStaff === null) {
```

Replace with:

```ts
if (loading || isStaff === null || !hqStore.isInitialized) {
```

- [ ] **Step 5: Verify TypeScript compiles clean**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 6: Commit**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app
git add app/hq/page.tsx
git commit -m "feat: wire useHQStore into HQPage with hydration gate and StoreDatasetState"
```

---

### Task 3: HQ Header Store Indicator

**Files:**
- Modify: `app/hq/page.tsx` — add `StoreIndicator` component, replace header subtitle, make header sticky

**Interfaces:**
- Consumes: `UseHQStoreReturn` from Task 1
- Consumes: `hqStore`, `staffContext`, `storeTransitioning` from Task 2
- Consumes: `showToast` (already exists in HQPage)

- [ ] **Step 1: Add `StoreIndicator` component**

Add this component near the top of the file, after the `RedemptionsPanel` component (after line ~563) and before `export default function HQPage`:

```tsx
function StoreIndicator({
  hqStore,
  isNetworkAdmin,
  storeTransitioning,
  onStoreChange,
}: {
  hqStore: UseHQStoreReturn;
  isNetworkAdmin: boolean;
  storeTransitioning: boolean;
  onStoreChange: (id: string) => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!hqStore.activeStore) {
    return (
      <div className="flex items-center gap-2 text-yellow-400 text-sm">
        <span>⚠</span>
        <span>No authorized store access</span>
      </div>
    );
  }

  const roleLabel = isNetworkAdmin
    ? '· Network Admin'
    : hqStore.activeStore.role === 'store_manager'
      ? '· Manager'
      : '· Staff';

  if (!hqStore.canSwitchStores) {
    return (
      <span className="inline-flex items-center gap-2 bg-accent/15 border border-accent/40 text-accent rounded-full px-3 py-1 text-sm">
        <span className="w-2 h-2 rounded-full bg-accent inline-block" />
        <span className="font-semibold">{hqStore.activeStore.name}</span>
        <span className="text-accent/70 font-normal">{roleLabel}</span>
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(v => !v)}
        disabled={storeTransitioning}
        className="inline-flex items-center gap-2 bg-accent/15 border border-accent/40 text-accent rounded-full px-3 py-1 text-sm hover:bg-accent/25 transition-colors disabled:opacity-50"
      >
        <span className="w-2 h-2 rounded-full bg-accent inline-block" />
        <span className="font-semibold">{hqStore.activeStore.name}</span>
        <span className="text-accent/70 font-normal">{roleLabel}</span>
        <span className="text-accent/50 text-xs">▼</span>
      </button>
      {dropdownOpen && (
        <div className="absolute top-full left-0 mt-1 bg-surface border border-border-token rounded-xl shadow-xl z-50 min-w-[220px] overflow-hidden">
          {hqStore.availableStores.map(store => (
            <button
              key={store.id}
              onClick={() => {
                setDropdownOpen(false);
                if (store.id !== hqStore.activeStoreId) onStoreChange(store.id);
              }}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-elevated transition-colors flex items-center justify-between ${
                store.id === hqStore.activeStoreId ? 'text-accent font-semibold' : 'text-primary'
              }`}
            >
              <span>{store.name}</span>
              {store.id === hqStore.activeStoreId && <span className="text-accent text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Make the header sticky and replace subtitle**

Find the header block at line ~2083:

```tsx
      {/* Header */}
      <div className="border-b border-border-token bg-surface/50">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-accent">
                HQ Command Center
              </h1>
              <p className="text-secondary text-sm">
                {staffContext?.isNetworkAdmin
                  ? 'Network Administration'
                  : staffContext?.stores.length === 1
                    ? `${staffContext.stores[0].name} · ${staffContext.stores[0].role === 'store_manager' ? 'Manager' : 'Staff'}`
                    : staffContext && staffContext.stores.length > 1
                      ? `${staffContext.stores.length} stores`
                      : 'Staff Only'}
              </p>
            </div>
            <a href="/dashboard" className="text-secondary hover:text-primary text-sm">
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
```

Replace with:

```tsx
      {/* Header — sticky so store pill stays visible on scroll */}
      <div className="sticky top-0 z-40 border-b border-border-token bg-surface/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-xl sm:text-2xl font-bold text-accent">
                HQ Command Center
              </h1>
              <StoreIndicator
                hqStore={hqStore}
                isNetworkAdmin={staffContext?.isNetworkAdmin ?? false}
                storeTransitioning={storeTransitioning}
                onStoreChange={(id) => {
                  const storeName = hqStore.availableStores.find(s => s.id === id)?.name ?? id;
                  setStoreTransitioning(true);
                  setPlayerDetails(null);
                  setPlayersDataset({ storeId: null, status: 'idle' });
                  hqStore.setActiveStoreId(id);
                  showToast(`Switched to ${storeName}`, 'success');
                  setStoreTransitioning(false);
                }}
              />
            </div>
            <a href="/dashboard" className="text-secondary hover:text-primary text-sm">
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
```

- [ ] **Step 3: Verify TypeScript compiles clean**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 4: Manual browser check**

Run the dev server (`npm run dev`), open HQ. Verify:
- Header is sticky (scroll a long tab — header stays at top)
- Store pill shows store name and role
- If network admin: dropdown shows all stores
- If single-store: no dropdown arrow, static pill

- [ ] **Step 5: Commit**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app
git add app/hq/page.tsx
git commit -m "feat: add sticky HQ header with store indicator pill and store switcher dropdown"
```

---

### Task 4: Stale Response Protection on Player Search

**Files:**
- Modify: `app/hq/page.tsx` — update `searchPlayer` to use AbortController + `activeStoreRef` check + `playersDataset` state

**Interfaces:**
- Consumes: `hqStore.activeStoreId`, `activeStoreRef`, `playersDataset`/`setPlayersDataset` from Task 2
- Produces: write controls gated on `playersDataset.storeId === hqStore.activeStoreId && playersDataset.status === 'ready'`

- [ ] **Step 1: Update `searchPlayer`**

Find the existing `searchPlayer` function at line ~974:

```ts
  const searchPlayer = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    setPlayerDetails(null);
    
    try {
      const res = await fetch(`/api/hq/player?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        setPlayerDetails(data);
        if (data.gameXp?.length > 0) {
          setSelectedGame(data.gameXp[0].game_id);
        }
        // Default to favorites if player has them, otherwise show games with XP
        if (data.player?.favorite_games?.length > 0) {
          setGameFilter('favorites');
        } else {
          setGameFilter('with_xp');
        }
      }
    } catch (error) {
      showToast('Search failed', 'error');
    } finally {
      setSearchLoading(false);
    }
  };
```

Replace with:

```ts
  const searchPlayer = async () => {
    if (!searchQuery.trim() || !hqStore.activeStoreId) return;

    const requestedStoreId = hqStore.activeStoreId;
    const controller = new AbortController();

    setSearchLoading(true);
    setPlayerDetails(null);
    setPlayersDataset({ storeId: requestedStoreId, status: 'loading' });

    try {
      const res = await fetch(
        `/api/hq/player?q=${encodeURIComponent(searchQuery)}&storeId=${encodeURIComponent(requestedStoreId)}`,
        { signal: controller.signal }
      );

      // Discard result if store changed while request was in flight
      if (requestedStoreId !== activeStoreRef.current) return;

      const data = await res.json();

      if (data.error) {
        setPlayersDataset({ storeId: requestedStoreId, status: 'error', error: data.error });
        showToast(data.error, 'error');
      } else {
        setPlayerDetails(data);
        setPlayersDataset({ storeId: requestedStoreId, status: 'ready' });
        if (data.gameXp?.length > 0) {
          setSelectedGame(data.gameXp[0].game_id);
        }
        if (data.player?.favorite_games?.length > 0) {
          setGameFilter('favorites');
        } else {
          setGameFilter('with_xp');
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setPlayersDataset({ storeId: requestedStoreId, status: 'error' });
      showToast('Search failed', 'error');
    } finally {
      setSearchLoading(false);
    }
  };
```

- [ ] **Step 2: Verify TypeScript compiles clean**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 3: Commit**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app
git add app/hq/page.tsx
git commit -m "feat: add AbortController stale response protection to player search"
```

---

### Task 5: Authorization Audit — Fix Route Handlers

**Files:**
- Modify: `app/api/hq/player/route.ts` — require `storeId` param, use `requireStoreAccess`
- Modify: `app/api/hq/redemptions/[code]/route.ts` — require `storeId` query param, fix cross-store disclosure

**Interfaces:**
- Consumes: `requireStoreAccess` from `@/lib/auth-helpers` (already imported in both files)
- Produces: `player` route now requires `storeId` query param, returns 400 if missing

- [ ] **Step 1: Fix `app/api/hq/player/route.ts`**

Find the `GET` function:

```ts
export async function GET(request: Request) {
  try {
    const staffCtx = await requireAnyStaff();
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
```

Replace the top of `GET` (up to the query extraction) with:

```ts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const query = searchParams.get('q');

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    const staffCtx = await requireStoreAccess(storeId);
    if (!staffCtx) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
```

Also update the import at the top of the file — replace:

```ts
import { requireAnyStaff } from '@/lib/auth-helpers';
```

with:

```ts
import { requireStoreAccess } from '@/lib/auth-helpers';
```

- [ ] **Step 2: Fix `app/api/hq/redemptions/[code]/route.ts` — cross-store disclosure**

The current `PATCH` handler fetches the redemption to get its `store_id`, then calls `requireStoreAccess(redemption.store_id)`. This lets any staff member's store context be used to claim codes from another store if they know the code. Fix: auth against the requested storeId first, then validate ownership.

Find the top of `PATCH`:

```ts
export async function PATCH(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    // Load the redemption first to get its store_id for scoped authorization
    const { data: redemption, error: fetchError } = await (supabaseAdmin as any)
      .from('prize_wall_redemptions')
      .select('id, status, player_id, store_id, points_deducted, item_name, expires_at')
      .eq('claim_code', params.code.toUpperCase())
      .single();

    if (fetchError || !redemption) {
      return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });
    }

    // Scope authorization to the redemption's store when present.
    // Null store_id is rare (legacy data) — fall back to any staff.
    const staffCtx = redemption.store_id
      ? await requireStoreAccess(redemption.store_id)
      : await requireAnyStaff();

    if (!staffCtx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
```

Replace that block with:

```ts
export async function PATCH(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedStoreId = searchParams.get('storeId');

    if (!requestedStoreId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    // Auth against the requested store before revealing anything about the code
    const staffCtx = await requireStoreAccess(requestedStoreId);
    if (!staffCtx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: redemption, error: fetchError } = await (supabaseAdmin as any)
      .from('prize_wall_redemptions')
      .select('id, status, player_id, store_id, points_deducted, item_name, expires_at')
      .eq('claim_code', params.code.toUpperCase())
      .single();

    if (fetchError || !redemption) {
      return NextResponse.json({ error: 'Redemption not found' }, { status: 404 });
    }

    // Cross-store disclosure: code belongs to a different store — return generic not-found
    if (redemption.store_id && redemption.store_id !== requestedStoreId && !staffCtx.isNetworkAdmin) {
      return NextResponse.json({ error: 'Redemption not found for the selected store.' }, { status: 404 });
    }
```

- [ ] **Step 3: Verify TypeScript compiles clean**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 4: Commit**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app
git add app/api/hq/player/route.ts app/api/hq/redemptions/[code]/route.ts
git commit -m "security: scope player search and redemption lookup to active store"
```

---

### Task 6: Wire `activeStoreId` into API Calls

**Files:**
- Modify: `app/hq/page.tsx` — update `awardSelectedXp`, `addCustomXp`, update `RedemptionsPanel` to accept `activeStoreId` prop, update its list fetch and PATCH call

**Interfaces:**
- Consumes: `hqStore.activeStoreId` from Task 2
- Consumes: fixed route handlers from Task 5

- [ ] **Step 1: Add `storeId` to `awardSelectedXp`**

Find the `awardSelectedXp` fetch body at line ~1063:

```ts
      const res = await fetch('/api/hq/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: playerDetails.player.id,
          gameId: selectedGame,
          amount: totalXp,
          reason: reason,
        }),
      });
```

Replace the body with:

```ts
      const res = await fetch('/api/hq/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: playerDetails.player.id,
          gameId: selectedGame,
          amount: totalXp,
          reason: reason,
          storeId: hqStore.activeStoreId,
        }),
      });
```

- [ ] **Step 2: Add `storeId` to `addCustomXp`**

Find the `addCustomXp` fetch body at line ~1105:

```ts
      const res = await fetch('/api/hq/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: playerDetails.player.id,
          gameId: selectedGame,
          amount: xp,
          reason: xpReason || (xp > 0 ? 'Custom bonus' : 'Custom correction'),
        }),
      });
```

Replace the body with:

```ts
      const res = await fetch('/api/hq/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: playerDetails.player.id,
          gameId: selectedGame,
          amount: xp,
          reason: xpReason || (xp > 0 ? 'Custom bonus' : 'Custom correction'),
          storeId: hqStore.activeStoreId,
        }),
      });
```

- [ ] **Step 3: Update `RedemptionsPanel` to accept `activeStoreId` prop**

Find the component declaration at line 340:

```ts
function RedemptionsPanel() {
```

Replace with:

```ts
function RedemptionsPanel({ activeStoreId }: { activeStoreId: string | null }) {
```

- [ ] **Step 4: Update `RedemptionsPanel` list fetch to pass storeId**

Find the `useEffect` in `RedemptionsPanel` at line ~352:

```ts
  useEffect(() => {
    fetch('/api/hq/redemptions')
      .then(r => r.json())
      .then(d => setRecentList(d.redemptions || []))
      .catch(() => {})
      .finally(() => setListLoading(false));
  }, [actionResult]);
```

Replace with:

```ts
  useEffect(() => {
    if (!activeStoreId) return;
    setListLoading(true);
    fetch(`/api/hq/redemptions?storeId=${encodeURIComponent(activeStoreId)}`)
      .then(r => r.json())
      .then(d => setRecentList(d.redemptions || []))
      .catch(() => {})
      .finally(() => setListLoading(false));
  }, [actionResult, activeStoreId]);
```

- [ ] **Step 5: Update `doAction` PATCH call to pass storeId as query param**

Find `doAction` in `RedemptionsPanel` at line ~382:

```ts
      const res = await fetch(`/api/hq/redemptions/${lookup.claim_code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, voidReason: voidReason || undefined }),
      });
```

Replace with:

```ts
      const storeParam = activeStoreId ? `?storeId=${encodeURIComponent(activeStoreId)}` : '';
      const res = await fetch(`/api/hq/redemptions/${lookup.claim_code}${storeParam}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, voidReason: voidReason || undefined }),
      });
```

- [ ] **Step 6: Update the render call for `RedemptionsPanel`**

Find at line 4508:

```tsx
          <RedemptionsPanel />
```

Replace with:

```tsx
          <RedemptionsPanel activeStoreId={hqStore.activeStoreId} />
```

- [ ] **Step 7: Verify TypeScript compiles clean**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app && npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 8: Manual end-to-end browser check**

1. Open HQ as a store staff user
2. Confirm store pill shows correct store name + role
3. Search a player — verify results load for the correct store
4. Award XP — verify award succeeds (no 400 "storeId required" error)
5. Open Redemptions tab — verify recent list loads
6. If network admin: switch store via dropdown, confirm toast appears, confirm player search clears

- [ ] **Step 9: Commit and push**

```bash
cd /home/djgotsu/hyperbolic/projects/hyperbolic-app
git add app/hq/page.tsx
git commit -m "feat: thread activeStoreId into XP award and redemptions calls"
git push
```
