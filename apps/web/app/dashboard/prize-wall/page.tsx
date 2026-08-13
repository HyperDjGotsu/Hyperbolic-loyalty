'use client';

import { useCallback, useEffect, useState } from 'react';

const FREE_TIER_GATE = 720;

type PlayerTier = 'free' | 'bronze' | 'silver' | 'gold' | 'diamond';

interface PrizeWallItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  xp_cost: number;
  retail_value: number | null;
  quantity: number | null;
  unlock_threshold: number | null;
  is_unlocked: boolean;
  is_network_prize: boolean;
  store_id: string | null;
}

const TRADE_EMPORIUM_ID = '3766247c-d900-4b15-bc4a-f0b8f5e4fa2d';

interface PassStatus {
  tier: PlayerTier;
  lifetimeXp: number;
  prizePoints: number;
  multiplier: number;
  homeStoreId: string | null;
}

interface ClaimDetails {
  claimCode: string;
  itemName: string;
  pointsDeducted: number;
  redemptionId: string;
}

interface ApiError {
  error?: string;
  balance?: number;
  required?: number;
  gateRequired?: number;
  currentBalance?: number;
}

export default function PrizeWallPage() {
  const [items, setItems] = useState<PrizeWallItem[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [passStatus, setPassStatus] = useState<PassStatus | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null | undefined>(undefined);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PrizeWallItem | null>(null);
  const [claimDetails, setClaimDetails] = useState<ClaimDetails | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const loadPassStatus = useCallback(async () => {
    try {
      setBalanceError(null);
      const response = await fetch('/api/player/pass-status', { cache: 'no-store' });
      const data = await response.json() as PassStatus | ApiError;

      if (!response.ok || !('tier' in data)) {
        throw new Error('error' in data ? data.error : 'Unable to load your balance');
      }

      setPassStatus(data);
      // Use selected store from localStorage (browsing context); fall back to home store
      const saved = localStorage.getItem('ggc_selected_store_id');
      setSelectedStoreId(saved || data.homeStoreId || null);
    } catch (error) {
      setBalanceError(error instanceof Error ? error.message : 'Unable to load your balance');
      setSelectedStoreId(null);
    }
  }, []);

  useEffect(() => {
    void loadPassStatus();
  }, [loadPassStatus]);

  useEffect(() => {
    if (selectedStoreId === undefined) return;
    if (!selectedStoreId) {
      setLoading(false);
      return;
    }

    fetch(`/api/prize-wall?storeId=${encodeURIComponent(selectedStoreId)}`)
      .then(r => r.json())
      .then(data => {
        setItems(data.items || []);
        setSubscriberCount(data.subscriber_count || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedStoreId]);

  async function redeemSelectedItem() {
    if (!selectedItem) return;

    try {
      setRedeeming(true);
      setRedeemError(null);
      const response = await fetch('/api/prize-wall/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: selectedItem.id }),
      });
      const data = await response.json() as ClaimDetails | ApiError;

      if (!response.ok || !('claimCode' in data)) {
        throw new Error('error' in data ? data.error : 'Redemption failed');
      }

      setSelectedItem(null);
      setClaimDetails(data);
    } catch (error) {
      setRedeemError(error instanceof Error ? error.message : 'Redemption failed');
    } finally {
      setRedeeming(false);
    }
  }

  async function closeClaimModal() {
    setClaimDetails(null);
    await loadPassStatus();
  }

  const floor = items.filter(i => !i.unlock_threshold);
  const locked = items.filter(i => i.unlock_threshold && !i.is_unlocked);
  const unlocked = items.filter(i => i.unlock_threshold && i.is_unlocked);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-primary">Prize Wall</h1>
        <p className="text-secondary text-sm mt-1">
          Spend your Points on real prizes. Points never expire.
        </p>
      </div>

      <BalanceBar
        passStatus={passStatus}
        error={balanceError}
        onRetry={loadPassStatus}
        onClaimTrial={loadPassStatus}
      />

      <div className="flex items-start gap-3 px-4 py-3 bg-elevated rounded-xl border border-border-token text-sm text-secondary">
        <span className="text-base leading-none mt-0.5">🏪</span>
        <p>All prizes are redeemed in person at the store. Show your claim code to a staff member to collect your item.</p>
      </div>

      {!loading && selectedStoreId === null ? (
        <div className="text-center text-secondary py-12">
          <p>No store selected. Visit a store to access the Prize Wall.</p>
        </div>
      ) : loading ? (
        <div className="text-center py-20 text-tertiary text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-tertiary text-sm">
          No prizes available yet. Check back soon.
        </div>
      ) : (
        <>
          {floor.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-4">
                Always Available
              </h2>
              <ItemGrid
                items={floor}
                passStatus={passStatus}
                redeeming={redeeming}
                selectedStoreId={selectedStoreId}
                onRedeem={item => {
                  setRedeemError(null);
                  setSelectedItem(item);
                }}
              />
            </section>
          )}

          {unlocked.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-4">
                Community Unlocked
              </h2>
              <ItemGrid
                items={unlocked}
                passStatus={passStatus}
                redeeming={redeeming}
                selectedStoreId={selectedStoreId}
                onRedeem={item => {
                  setRedeemError(null);
                  setSelectedItem(item);
                }}
              />
            </section>
          )}

          {locked.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
                Community Goals
              </h2>
              <p className="text-xs text-tertiary mb-4">
                {subscriberCount} active {subscriberCount === 1 ? 'subscriber' : 'subscribers'} across
                the network. Grow the community to unlock these.
              </p>
              <div className="space-y-3">
                {locked.map(item => (
                  <LockedItem key={item.id} item={item} subscriberCount={subscriberCount} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {selectedItem && passStatus && (
        <ConfirmationModal
          item={selectedItem}
          balance={passStatus.prizePoints}
          redeeming={redeeming}
          error={redeemError}
          onCancel={() => {
            setSelectedItem(null);
            setRedeemError(null);
          }}
          onConfirm={redeemSelectedItem}
        />
      )}

      {claimDetails && <ClaimCodeModal claim={claimDetails} onDone={closeClaimModal} />}
    </div>
  );
}

function BalanceBar({
  passStatus,
  error,
  onRetry,
  onClaimTrial,
}: {
  passStatus: PassStatus | null;
  error: string | null;
  onRetry: () => Promise<void>;
  onClaimTrial: () => Promise<void>;
}) {
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  if (error) {
    return (
      <div className="bg-surface rounded-xl p-4 flex items-center justify-between gap-4">
        <span className="text-sm text-danger">{error}</span>
        <button className="text-sm text-primary underline" onClick={() => void onRetry()}>
          Retry
        </button>
      </div>
    );
  }

  if (!passStatus) {
    return <div className="h-24 bg-surface rounded-xl animate-pulse" aria-label="Loading balance" />;
  }

  const gateLocked = passStatus.tier === 'free' && passStatus.lifetimeXp < FREE_TIER_GATE;
  const trialReady = passStatus.tier === 'free' && passStatus.lifetimeXp >= FREE_TIER_GATE;
  const gateProgress = Math.min(100, (passStatus.lifetimeXp / FREE_TIER_GATE) * 100);

  async function handleClaimTrial() {
    try {
      setClaiming(true);
      setClaimError(null);
      const res = await fetch('/api/player/claim-trial', { method: 'POST' });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed to claim trial');
      await onClaimTrial();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Failed to claim trial');
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="bg-surface rounded-xl p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-elevated text-xs font-semibold text-primary uppercase tracking-wide">
              {passStatus.tier}
            </span>
            <span className="font-semibold text-primary">
              {passStatus.prizePoints.toLocaleString()} Prize Points available
            </span>
          </div>
          <p className="text-xs text-tertiary mt-1">
            Lifetime XP: {passStatus.lifetimeXp.toLocaleString()}
          </p>
        </div>
      </div>
      {gateLocked && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-secondary mb-1.5">
            <span>Redeem a 1-month Bronze trial at {FREE_TIER_GATE} Guild Points</span>
            <span>
              {passStatus.lifetimeXp.toLocaleString()} / {FREE_TIER_GATE}
            </span>
          </div>
          <div className="h-2 bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${gateProgress}%` }}
            />
          </div>
        </div>
      )}
      {trialReady && (
        <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <p className="text-sm font-semibold text-amber-400 mb-1">
            You&apos;ve unlocked a 30-day Bronze Trial!
          </p>
          <p className="text-xs text-secondary mb-3">
            Claim your trial to start earning Prize Points and access exclusive perks.
          </p>
          {claimError && <p className="text-xs text-danger mb-2">{claimError}</p>}
          <button
            onClick={() => void handleClaimTrial()}
            disabled={claiming}
            className="w-full py-2 bg-amber-500 text-black text-sm font-semibold rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {claiming ? 'Activating…' : 'Claim Bronze Trial — Free for 30 Days'}
          </button>
        </div>
      )}
    </div>
  );
}

function ItemGrid({
  items,
  passStatus,
  redeeming,
  onRedeem,
  selectedStoreId,
}: {
  items: PrizeWallItem[];
  passStatus: PassStatus | null;
  redeeming: boolean;
  onRedeem: (item: PrizeWallItem) => void;
  selectedStoreId: string | null | undefined;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {items.map(item => (
        <ItemCard
          key={item.id}
          item={item}
          passStatus={passStatus}
          redeeming={redeeming}
          onRedeem={onRedeem}
          selectedStoreId={selectedStoreId}
        />
      ))}
    </div>
  );
}

function ItemCard({
  item,
  passStatus,
  redeeming,
  onRedeem,
  selectedStoreId,
}: {
  item: PrizeWallItem;
  passStatus: PassStatus | null;
  redeeming: boolean;
  onRedeem: (item: PrizeWallItem) => void;
  selectedStoreId: string | null | undefined;
}) {
  const isGrailViewedElsewhere = item.is_network_prize && selectedStoreId !== TRADE_EMPORIUM_ID;
  const outOfStock = item.quantity != null && item.quantity <= 0;
  const gateLocked = passStatus?.tier === 'free' && (passStatus.lifetimeXp ?? 0) < FREE_TIER_GATE;
  const insufficientPoints = passStatus !== null && passStatus.prizePoints < item.xp_cost;
  const disabledReason = !passStatus
    ? 'Loading player balance'
    : outOfStock
      ? 'Out of stock'
      : !item.is_unlocked
        ? 'This prize is still locked'
        : gateLocked
          ? `Reach ${FREE_TIER_GATE} lifetime points to redeem your 1-month Bronze trial`
          : insufficientPoints
            ? `You need ${item.xp_cost.toLocaleString()} Prize Points`
            : null;
  const disabled = disabledReason !== null || redeeming;

  return (
    <div className="bg-surface rounded-xl overflow-hidden">
      <div className="aspect-square bg-elevated relative">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-tertiary text-xs">
            No image
          </div>
        )}
        {item.is_network_prize && (
          <span className="absolute top-2 left-2 text-xs bg-yellow-500/90 text-black font-semibold px-1.5 py-0.5 rounded">
            Grail
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="font-semibold text-primary text-sm leading-tight">{item.name}</div>
        {item.description && (
          <div className="text-xs text-tertiary mt-1 leading-snug">{item.description}</div>
        )}
        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <span className="text-lg font-bold text-primary">{item.xp_cost.toLocaleString()}</span>
            <span className="text-xs text-secondary ml-1">pts</span>
          </div>
          {item.retail_value != null && (
            <span className="text-xs text-tertiary">${item.retail_value} value</span>
          )}
        </div>
        {item.quantity != null && (
          <div className="text-xs text-tertiary mt-1">
            {outOfStock ? 'Out of stock' : `${item.quantity} remaining`}
          </div>
        )}
        {isGrailViewedElsewhere ? (
          <div className="mt-3 text-center py-2 px-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-xs text-yellow-400 font-medium">Only redeemable at Trade Emporium</p>
          </div>
        ) : outOfStock ? (
          <div className="mt-3 text-center py-2 px-3 bg-elevated rounded-lg">
            <p className="text-xs text-tertiary font-medium">Out of Stock</p>
          </div>
        ) : (
          <span className="block mt-3" title={disabledReason ?? undefined}>
            <button
              className="w-full py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-500 transition-colors disabled:bg-elevated disabled:text-tertiary disabled:cursor-not-allowed"
              disabled={disabled}
              onClick={() => onRedeem(item)}
            >
              Redeem
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

function ConfirmationModal({
  item,
  balance,
  redeeming,
  error,
  onCancel,
  onConfirm,
}: {
  item: PrizeWallItem;
  balance: number;
  redeeming: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="redeem-title">
      <div className="w-full max-w-md bg-surface border border-border-token rounded-2xl p-6 shadow-2xl">
        <h2 id="redeem-title" className="text-xl font-bold text-primary">
          Redeem {item.name} for {item.xp_cost.toLocaleString()} Prize Points?
        </h2>
        <p className="text-sm text-secondary mt-3">
          You&apos;ll have {(balance - item.xp_cost).toLocaleString()} pts left
        </p>
        <p className="text-xs text-tertiary mt-2">🏪 Collect in person — show your claim code to staff at the store.</p>
        {error && <p className="text-sm text-danger mt-3" role="alert">{error}</p>}
        <div className="flex gap-3 mt-6">
          <button
            className="flex-1 py-2.5 bg-elevated text-primary rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            disabled={redeeming}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 disabled:opacity-50"
            disabled={redeeming}
            onClick={onConfirm}
          >
            {redeeming ? 'Redeeming…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ClaimCodeModal({ claim, onDone }: { claim: ClaimDetails; onDone: () => Promise<void> }) {
  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="claim-title">
      <div className="w-full max-w-xl text-center">
        <p id="claim-title" className="text-xl font-semibold text-white mb-6">{claim.itemName}</p>
        <div className="bg-zinc-800 border border-zinc-600 rounded-2xl px-4 py-10 shadow-2xl">
          <div className="font-mono text-5xl sm:text-7xl font-bold tracking-wider text-white">
            {claim.claimCode}
          </div>
        </div>
        <p className="text-base text-zinc-200 mt-6">
          Show this code to staff at the counter to claim your prize
        </p>
        <p className="text-lg font-semibold text-red-400 mt-4">
          -{claim.pointsDeducted.toLocaleString()} Prize Points
        </p>
        <p className="text-sm text-zinc-400 mt-2">Valid for 30 days</p>
        <button
          className="w-full sm:w-auto sm:min-w-48 mt-8 py-3 px-8 bg-white text-zinc-950 rounded-lg font-semibold hover:bg-zinc-200"
          onClick={() => void onDone()}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function LockedItem({ item, subscriberCount }: { item: PrizeWallItem; subscriberCount: number }) {
  const threshold = item.unlock_threshold!;
  const pct = Math.min(100, Math.round((subscriberCount / threshold) * 100));

  return (
    <div className="bg-surface rounded-xl p-4 flex gap-4 opacity-70">
      <div className="w-16 h-16 bg-elevated rounded-lg flex-shrink-0 overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover grayscale"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-tertiary text-xs">
            —
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold text-primary text-sm">{item.name}</div>
            {item.description && (
              <div className="text-xs text-tertiary mt-0.5">{item.description}</div>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-bold text-primary">{item.xp_cost.toLocaleString()} pts</div>
            {item.retail_value != null && (
              <div className="text-xs text-tertiary">${item.retail_value} value</div>
            )}
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-tertiary mb-1">
            <span>Unlocks at {threshold} subscribers</span>
            <span>{subscriberCount} / {threshold}</span>
          </div>
          <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
