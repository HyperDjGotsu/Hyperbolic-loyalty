# HQ Staff Store Context — Design Spec
**Date:** 2026-07-19
**Phase:** 6 — Foundation Task 0
**Status:** Approved

---

## Problem

HQ APIs already enforce store-scoped authorization, but HQPage has no concept of an active store. Store staff can access HQ but cannot act — write endpoints require a `storeId` they have no way to supply. Network admins see all data without knowing which store they are operating on. Every store-specific write action is ambiguous or broken.

---

## Scope

This spec covers the store context foundation only:
- `useHQStore` hook
- HQ header store indicator and selector
- API threading (wiring `activeStoreId` into existing calls)
- Authorization audit for every store-scoped route
- Stale response protection
- Per-dataset load readiness tracking

It does not cover Prize Wall UI, Redemption UI, or Points award UI — those are Phase 6 features that depend on this foundation.

---

## Section 1 — `useHQStore` Hook

**File:** `lib/hooks/useHQStore.ts`

### Types

```ts
export type StaffStore = {
  id: string;
  name: string;
  role: string; // 'store_staff' | 'store_manager'
};

export type UseHQStoreReturn = {
  activeStore: StaffStore | null;
  activeStoreId: string | null;
  setActiveStoreId: (storeId: string) => void;
  availableStores: StaffStore[];
  canSwitchStores: boolean;
  isInitialized: boolean;
};
```

### Internal state

```ts
const [activeStoreId, setActiveStoreIdState] = useState<string | null>(null);
const [isInitialized, setIsInitialized] = useState(false);

const availableStores = staffContext?.stores ?? [];

// Derived — never held as independent state
const activeStore = availableStores.find(s => s.id === activeStoreId) ?? null;
```

`activeStore` is always derived from `activeStoreId` to prevent ID/object inconsistency when the auth context refreshes.

### Initialization

Runs in a `useEffect` whenever `staffContext` changes from null to a value.

1. `staffContext === null` → `isInitialized: false`, all values null/empty. No-op.
2. When `staffContext` is non-null:
   - Read `ggc_hq_selected_store_id` from localStorage (synchronous).
   - Validate against `staffContext.stores`.
   - **If valid:** use the saved ID.
   - **If invalid or missing:** run fallback cascade:
     - Single-store staff → their one authorized store.
     - Multi-store staff → `staffContext.primaryStoreId` or first store.
     - Network admin → `staffContext.primaryStoreId` or first store alphabetically.
   - **If no authorized stores exist:** `activeStoreId: null`, `isInitialized: true` — HQ shows access error.
   - Remove stale localStorage value if it no longer maps to an authorized store.
   - Set `activeStoreId` and `isInitialized: true` together (single state update).

### Setter

`setActiveStoreId(id: string)` validates before persisting:
1. Confirm `id` exists in `availableStores`.
2. If unauthorized, reject silently (no state change, no localStorage write).
3. If valid: update state, write to `localStorage.setItem('ggc_hq_selected_store_id', id)`.

### Storage key

`ggc_hq_selected_store_id` — separate from the player-facing `ggc_selected_store_id`. Changing HQ store context never touches the player-facing key or `home_store_id`.

### Derived values

- `canSwitchStores`: `availableStores.length > 1`
- `availableStores`: for network admins, this is all active stores returned by `/api/hq/auth`; for store staff, only their authorized stores.

### Hydration gate

HQPage must not fire store-scoped requests until:
```ts
hqStore.isInitialized && hqStore.activeStoreId !== null
```

---

## Section 2 — HQ Header Store Indicator

### Placement

Replaces the current "Staff Only" subtitle line in the HQ header. The HQ header must be made `sticky top-0 z-40` as part of this implementation — it currently scrolls away. The pill must remain visible on all tabs regardless of scroll depth, which requires the header to be sticky.

### Visual treatment

```
HQ Command Center
[● Gamers Guild of Benicia · Manager]     ← non-interactive (single-store)
[● Gamers Guild of Benicia · Manager ▼]  ← dropdown (multi-store / network admin)
```

- Pill style: `bg-accent/15 border border-accent/40 text-accent rounded-full px-3 py-1`
- Store name bold, role label muted
- Role label uses the actual role from the selected store assignment — never hard-coded

### Role labels

| Auth role | Display |
|---|---|
| `store_staff` | `· Staff` |
| `store_manager` | `· Manager` |
| network admin (any store) | `· Network Admin` |

### Interaction

- **Single-store staff:** static pill, no interaction.
- **Multi-store staff:** dropdown showing only their authorized stores.
- **Network admin:** dropdown showing all active stores from `/api/hq/auth`.

On store change:
1. `setStoreTransitioning(true)` + clear all store-scoped state synchronously.
2. Call `hqStore.setActiveStoreId(nextId)`.
3. Show "Switched to [Store Name]" toast.
4. `storeTransitioning` releases once React commits the new store context and the active tab begins loading (not on a timer).

### No-store state

When `isInitialized: true` and `activeStoreId: null`, the pill shows:
```
⚠ No authorized store access
Contact a network administrator to assign this account to a store.
```
All store-scoped tabs render a blocked/empty state rather than attempting to load.

### Hydration gate

```ts
if (loading || isStaff === null || !hqStore.isInitialized) {
  return <VerifyingAccess />;
}
```
The no-store case is handled **after** this gate — not trapped inside it.

---

## Section 3 — API Threading, Stale Response Protection & Authorization

### Stale response protection

Every store-scoped fetch:
1. Captures `activeStoreId` at call time as `requestedStoreId`.
2. Creates an `AbortController`; aborts on store switch (primary protection).
3. After the response resolves, checks:
   ```ts
   if (requestedStoreId !== activeStoreRef.current) return;
   ```
   Discards the result if the store changed while the request was in flight (secondary guard).

`activeStoreRef` is a `useRef` kept in sync with `activeStoreId` on every render.

### Per-dataset readiness

Each store-scoped dataset tracks:

```ts
type StoreDatasetState = {
  storeId: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
};
```

One instance per dataset: `playersDataset`, `prizeWallDataset`, `redemptionsDataset`, `eventsDataset`, `bannersDataset`.

Write controls within a tab require:
```ts
dataset.storeId === activeStoreId && dataset.status === 'ready'
```

This allows: loading indicator for current store, error message on failure, and clear stale-data detection (dataset store ≠ active store).

### Store transition lock

`storeTransitioning` is set `true` synchronously on store change and released once React commits the new context and the active tab starts loading. It is **not** a timer. It prevents immediate clicks during the state transition moment only.

Dataset readiness is the actual authority for write controls.

### Player/store association rule

`getPlayersAssociatedWithStore(storeId)` returns players where:
- `home_store_id = storeId`, **or**
- at least one `xp_ledger` entry exists with `store_id = storeId` (any historical activity)

This ensures a Martinez manager can find a player who attended Martinez events but chose Benicia as home store.

**Documented behavior:** Association is historical and does not alter the player's home store. Deactivated players are excluded unless the query explicitly requests inactive players.

### Authorization audit

Every store-scoped route must use `requireStoreAccess(storeId)` for both reads and writes. `requireAnyStaff()` alone is insufficient for store-specific actions.

| Route | Required check | Note |
|---|---|---|
| Player search / lookup | `requireStoreAccess(storeId)` | storeId required |
| XP award | `requireStoreAccess(storeId)` | Already partially implemented — verify |
| Prize Point award | `requireStoreAccess(storeId)` | storeId required; null storeId → network admin only |
| Prize item create/edit | `requireStoreManager(store_id)` or `requireNetworkAdmin()` | Already correct |
| Redemption queue | `requireStoreAccess(storeId)` | storeId required |
| Claim code lookup | `requireStoreAccess(storeId)` | Must not reveal cross-store existence |
| Fulfill/void redemption | `requireStoreAccess(storeId)` + ownership check | Re-validate inside mutation path |
| Banner management | `requireStoreAccess(storeId)` | Needs audit |
| Event management | `requireStoreAccess(storeId)` | Needs audit |

Network admin bypass is explicit inside `requireStoreAccess` — already implemented.

### Cross-store redemption disclosure

When a claim code belongs to a different store, the lookup returns:
```json
{ "error": "Redemption not found for the selected store." }
```
Not: "Redemption exists but belongs to another store." Network admins may receive broader detail.

Fulfillment and void paths re-validate authorization and store ownership independently — they do not trust a prior lookup.

### Prize Point adjustment store rule

| Actor | storeId in request | Behavior |
|---|---|---|
| Store staff | required, must be authorized | Normal store-scoped award |
| Network admin | optional | Uses provided storeId if present; null = network-wide |
| Any staff | missing | Returns 400 error |

Network-wide adjustments (`store_id = null`) are an explicit network-admin-only action, not the result of a missing parameter.

### Network-wide Prize Wall items

- Items with `store_id = null` are network-wide.
- Store managers see them as **read-only**, clearly labeled: `Network Reward · Read Only`
- Store managers cannot edit them.
- Network admins can create/edit network-wide items regardless of selected HQ store.
- Selecting a store in the HQ header does **not** convert a null-store item to a store-scoped one.
- Editing a network-wide item preserves `store_id = null` unless an explicit scope-change action is performed.

### Parameter naming

Existing APIs mix `storeId` (camelCase, query params/JSON) and `store_id` (snake_case, DB). No routes are rewritten in this phase. Each route file documents which format it expects. A cleanup task is deferred to post-Phase 6.

---

## Implementation Order

1. `lib/hooks/useHQStore.ts` — hook only, no UI
2. Wire `useHQStore` into `HQPage` — state init, hydration gate, store transition handling
3. HQ header store indicator — static for single-store, dropdown for multi/admin
4. Per-dataset state shapes (`StoreDatasetState`) replacing bare arrays
5. Stale response protection (`AbortController` + ref check) on each fetch
6. Authorization audit — fix each route flagged above
7. Wire `activeStoreId` into API calls for each tab

---

## Out of Scope (Phase 6 features, not this spec)

- Prize Wall tab UI and management
- Redemption fulfillment UI
- Prize Point award UI
- Store-scoped events and banners management UI

Those features depend on this foundation and will be specced separately.
