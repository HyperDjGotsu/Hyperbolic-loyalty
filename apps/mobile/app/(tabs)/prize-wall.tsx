import { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image, Modal, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ApiError, errorMessage, useApi } from '@/lib/api';
import { useTheme } from '@/lib/theme-context';
import { PageIntro } from '@/components/PageIntro';
import { FREE_TIER_GATE } from '@/lib/pass-tiers';
import { AppText, Button, Skeleton } from '@/components/kit';
import { PassesSheet } from '@/components/PassesSheet';

const TRADE_EMPORIUM_ID = '3766247c-d900-4b15-bc4a-f0b8f5e4fa2d';

type PlayerTier = 'free' | 'bronze' | 'silver' | 'gold' | 'diamond';
type PassStatus = { tier: PlayerTier; lifetimeXp: number; prizePoints: number; homeStoreId: string | null; multiplier: number };
type PrizeItem = {
  id: string; name: string; description: string | null; image_url: string | null; xp_cost: number;
  retail_value: number | null; quantity: number | null; unlock_threshold: number | null;
  is_unlocked: boolean; is_network_prize: boolean; store_id: string | null;
};
type ClaimDetails = { claimCode: string; itemName: string; pointsDeducted: number; redemptionId: string };

export default function PrizeWallScreen() {
  const api = useApi();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const apiRef = useRef(api);
  apiRef.current = api;

  const [passStatus, setPassStatus] = useState<PassStatus | null>(null);
  const [passError, setPassError] = useState('');
  const [storeId, setStoreId] = useState<string | null | undefined>(undefined);
  const [items, setItems] = useState<PrizeItem[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedItem, setSelectedItem] = useState<PrizeItem | null>(null);
  const [claimDetails, setClaimDetails] = useState<ClaimDetails | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [showPasses, setShowPasses] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');

  const loadPassStatus = useCallback(async () => {
    setPassError('');
    try {
      const data = await apiRef.current.get<PassStatus>('/api/player/pass-status');
      setPassStatus(data);
      setStoreId(data.homeStoreId ?? null);
    } catch (e) {
      setPassError(errorMessage(e, 'Unable to load your balance'));
      setStoreId(null);
    }
  }, []);

  const loadCatalog = useCallback(async (sid: string) => {
    setCatalogError(false);
    try {
      const data = await apiRef.current.get<{ items: PrizeItem[]; subscriber_count: number }>(`/api/prize-wall?storeId=${encodeURIComponent(sid)}`);
      setItems(data.items ?? []);
      setSubscriberCount(data.subscriber_count ?? 0);
    } catch {
      setCatalogError(true);
    } finally {
      setCatalogLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadPassStatus(); }, [loadPassStatus]);
  useEffect(() => {
    if (storeId === undefined) return;
    if (!storeId) { setCatalogLoading(false); setRefreshing(false); return; }
    void loadCatalog(storeId);
  }, [storeId, loadCatalog]);

  async function redeemItem() {
    if (!selectedItem) return;
    setRedeeming(true);
    setRedeemError(null);
    try {
      const data = await api.post<ClaimDetails>('/api/prize-wall/redeem', { itemId: selectedItem.id });
      setSelectedItem(null);
      setClaimDetails(data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        let need = '';
        try { const b = JSON.parse(e.message.slice(e.message.indexOf(': ') + 2)); if (b.required != null) need = ` Need ${Number(b.required).toLocaleString()} pts.`; } catch { /* ignore */ }
        setRedeemError(`Not enough Prize Points.${need}`);
      } else if (e instanceof ApiError && e.status === 403) {
        setRedeemError(`Prize Wall requires a paid pass. Earn ${FREE_TIER_GATE} Guild Points for a free trial.`);
      } else if (e instanceof ApiError) {
        setRedeemError(e.serverMessage ?? 'Redemption failed. Please try again.');
      } else {
        setRedeemError('Unable to connect. Check your connection and try again.');
      }
    } finally {
      setRedeeming(false);
    }
  }

  async function claimTrial() {
    setClaiming(true);
    setClaimError('');
    try {
      await api.post('/api/player/claim-trial', {});
      await loadPassStatus();
    } catch (e) {
      setClaimError(errorMessage(e, 'Failed to claim trial'));
    } finally {
      setClaiming(false);
    }
  }

  function closeClaim() {
    setClaimDetails(null);
    void loadPassStatus();
    if (storeId) void loadCatalog(storeId);
  }

  const floor = items.filter(i => !i.unlock_threshold);
  const unlocked = items.filter(i => i.unlock_threshold && i.is_unlocked);
  const locked = items.filter(i => i.unlock_threshold && !i.is_unlocked);

  const gateLocked = !!passStatus && passStatus.tier === 'free' && passStatus.lifetimeXp < FREE_TIER_GATE;
  const trialReady = !!passStatus && passStatus.tier === 'free' && passStatus.lifetimeXp >= FREE_TIER_GATE;

  const grid = (list: PrizeItem[]) => {
    const rows: PrizeItem[][] = [];
    for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2));
    return rows.map((pair, i) => (
      <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
        {pair.map(item => (
          <ItemCard key={item.id} item={item} passStatus={passStatus} storeId={storeId ?? null} redeeming={redeeming}
            onRedeem={it => { setRedeemError(null); setSelectedItem(it); }} />
        ))}
        {pair.length === 1 && <View style={{ flex: 1 }} />}
      </View>
    ));
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgBase }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => { setRefreshing(true); void loadPassStatus(); if (storeId) void loadCatalog(storeId); else setRefreshing(false); }} />}
    >
      <PageIntro page="prize-wall" />
      <View style={{ paddingTop: insets.top + 12 }}>
        <AppText variant="display">Prize Wall</AppText>
        <AppText variant="caption" tone="secondary">Spend your Points on real prizes. Points never expire.</AppText>
      </View>

      {passError ? (
        <View style={[card(colors), { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }]}>
          <AppText variant="caption" style={{ color: colors.danger, flex: 1 }}>{passError}</AppText>
          <Pressable onPress={() => void loadPassStatus()}><AppText variant="caption" style={{ fontWeight: '700', textDecorationLine: 'underline' }}>Retry</AppText></Pressable>
        </View>
      ) : !passStatus ? (
        <Skeleton height={110} radius={30} />
      ) : (
        <View style={[card(colors), { borderRadius: 30, padding: 20, backgroundColor: colors.bgElevated }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <AppText variant="eyebrow" tone="secondary">Prize points</AppText>
              <AppText variant="display" style={{ color: colors.xp, fontSize: 44, lineHeight: 48, fontVariant: ['tabular-nums'] }}>{passStatus.prizePoints.toLocaleString()}</AppText>
              <AppText variant="caption" tone="tertiary" style={{ marginTop: 6 }}>Lifetime XP {passStatus.lifetimeXp.toLocaleString()}</AppText>
            </View>
            <View style={{ backgroundColor: colors.bgSurface, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
              <AppText variant="eyebrow">{passStatus.tier}</AppText>
            </View>
          </View>
          {gateLocked && (
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>Redeem a 1-month Bronze trial at {FREE_TIER_GATE} Guild Points</AppText>
                <AppText variant="caption" tone="secondary">{passStatus.lifetimeXp.toLocaleString()} / {FREE_TIER_GATE}</AppText>
              </View>
              <View style={{ height: 8, backgroundColor: colors.bgSurface, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ height: '100%', backgroundColor: colors.accent, width: `${Math.min(100, (passStatus.lifetimeXp / FREE_TIER_GATE) * 100)}%` }} />
              </View>
            </View>
          )}
          {trialReady && (
            <View style={{ marginTop: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.1)' }}>
              <AppText variant="body" style={{ color: '#fbbf24', fontWeight: '700' }}>You've unlocked a 30-day Bronze Trial!</AppText>
              <AppText variant="caption" tone="secondary" style={{ marginVertical: 6 }}>Claim your trial to start earning Prize Points and access exclusive perks.</AppText>
              {claimError ? <AppText variant="caption" style={{ color: colors.danger, marginBottom: 6 }}>{claimError}</AppText> : null}
              <Button label="Claim Bronze Trial — Free for 30 Days" onPress={() => void claimTrial()} loading={claiming} style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b', paddingVertical: 10 }} />
            </View>
          )}
          <Pressable onPress={() => setShowPasses(true)} style={{ marginTop: 16 }}>
            <AppText variant="body" tone="accent" style={{ fontWeight: '700' }}>View passes</AppText>
          </Pressable>
        </View>
      )}

      <View style={[card(colors), { flexDirection: 'row', gap: 10, backgroundColor: colors.bgElevated, padding: 12 }]}>
        <AppText variant="body">🏪</AppText>
        <AppText variant="caption" tone="secondary" style={{ flex: 1, fontSize: 13, lineHeight: 18 }}>
          All prizes are redeemed in person at the store. Show your claim code to a staff member to collect your item.
        </AppText>
      </View>

      {catalogLoading && storeId !== null ? (
        <View style={{ gap: 12 }}><Skeleton height={220} radius={26} /><Skeleton height={220} radius={26} /></View>
      ) : storeId === null ? (
        <Empty icon="map-pin" text="No store selected. Visit a store to access the Prize Wall." />
      ) : catalogError ? (
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 32 }}>
          <AppText variant="body" tone="secondary">Could not load prizes.</AppText>
          <Button label="Retry" onPress={() => { setCatalogLoading(true); if (storeId) void loadCatalog(storeId); }} style={{ paddingHorizontal: 32 }} />
        </View>
      ) : items.length === 0 ? (
        <Empty icon="gift" text="No prizes available yet. Check back soon." />
      ) : (
        <>
          {floor.length > 0 && <View style={{ gap: 12 }}><AppText variant="title">Always available</AppText>{grid(floor)}</View>}
          {unlocked.length > 0 && <View style={{ gap: 12 }}><AppText variant="title">Community unlocked</AppText>{grid(unlocked)}</View>}
          {locked.length > 0 && (
            <View style={{ gap: 12 }}>
              <View>
                <AppText variant="eyebrow" tone="secondary">Community goals</AppText>
                <AppText variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
                  {subscriberCount} active {subscriberCount === 1 ? 'subscriber' : 'subscribers'} across the network. Grow the community to unlock these.
                </AppText>
              </View>
              {locked.map(item => <LockedItem key={item.id} item={item} subscriberCount={subscriberCount} />)}
            </View>
          )}
        </>
      )}

      {showPasses && passStatus && <PassesSheet currentTier={passStatus.tier} onClose={() => setShowPasses(false)} />}

      {selectedItem && passStatus && (
        <Modal transparent animationType="fade" onRequestClose={() => { setSelectedItem(null); setRedeemError(null); }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 }}>
            <View style={{ backgroundColor: colors.bgSurface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.border }}>
              <AppText variant="title">Redeem {selectedItem.name} for {selectedItem.xp_cost.toLocaleString()} Prize Points?</AppText>
              <AppText variant="body" tone="secondary" style={{ marginTop: 10 }}>You'll have {(passStatus.prizePoints - selectedItem.xp_cost).toLocaleString()} pts left</AppText>
              <AppText variant="caption" tone="tertiary" style={{ marginTop: 6 }}>Collect in person — show your claim code to staff at the store.</AppText>
              {redeemError ? <AppText variant="caption" style={{ color: colors.danger, marginTop: 10 }}>{redeemError}</AppText> : null}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <Button label="Cancel" variant="secondary" disabled={redeeming} onPress={() => { setSelectedItem(null); setRedeemError(null); }} style={{ flex: 1 }} />
                <Button label="Confirm" loading={redeeming} onPress={() => void redeemItem()} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {claimDetails && (
        <Modal animationType="slide" onRequestClose={closeClaim}>
          <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <AppText variant="title" style={{ color: '#fff', textAlign: 'center', marginBottom: 28 }}>{claimDetails.itemName}</AppText>
            <View style={{ backgroundColor: '#1c1c1e', borderRadius: 20, borderWidth: 1, borderColor: '#3a3a3c', paddingHorizontal: 24, paddingVertical: 44, width: '100%', alignItems: 'center' }}>
              <AppText variant="display" style={{ color: '#fff', fontSize: 44, letterSpacing: 6, fontFamily: 'monospace', textAlign: 'center' }}>{claimDetails.claimCode}</AppText>
            </View>
            <AppText variant="body" style={{ color: '#d1d5db', textAlign: 'center', marginTop: 24 }}>Show this code to staff at the counter to claim your prize</AppText>
            <AppText variant="title" style={{ color: '#f87171', marginTop: 14 }}>−{claimDetails.pointsDeducted.toLocaleString()} Prize Points</AppText>
            <AppText variant="caption" style={{ color: '#9ca3af', marginTop: 6 }}>Valid for 30 days</AppText>
            <Button label="Done" onPress={closeClaim} style={{ marginTop: 32, backgroundColor: '#fff', borderColor: '#fff', paddingHorizontal: 56 }} />
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

function card(colors: ReturnType<typeof useTheme>['colors']) {
  return { backgroundColor: colors.bgSurface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border } as const;
}

function Empty({ icon, text }: { icon: 'map-pin' | 'gift'; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 24 }}>
      <Feather name={icon} size={32} color={colors.textTertiary} />
      <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>{text}</AppText>
    </View>
  );
}

function Cover({ uri, style }: { uri: string | null; style: object }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  if (!uri || failed) {
    return <View style={[style, { backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center' }]}><Feather name="gift" size={22} color={colors.textTertiary} /></View>;
  }
  return <Image source={{ uri }} style={style} resizeMode="cover" onError={() => setFailed(true)} />;
}

function ItemCard({ item, passStatus, storeId, redeeming, onRedeem }: {
  item: PrizeItem; passStatus: PassStatus | null; storeId: string | null; redeeming: boolean; onRedeem: (i: PrizeItem) => void;
}) {
  const { colors } = useTheme();
  const grailElsewhere = item.is_network_prize && storeId !== TRADE_EMPORIUM_ID;
  const outOfStock = item.quantity != null && item.quantity <= 0;
  // Same rule as the web: only a free player below the gate is blocked; a free player past it can claim the trial
  const gateLocked = passStatus?.tier === 'free' && passStatus.lifetimeXp < FREE_TIER_GATE;
  const insufficient = passStatus != null && passStatus.prizePoints < item.xp_cost;
  const reason = !passStatus ? 'Loading…'
    : !item.is_unlocked ? 'Locked'
    : gateLocked ? 'Pass required'
    : insufficient ? `Need ${item.xp_cost.toLocaleString()} pts`
    : null;
  const disabled = reason !== null || redeeming;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSurface, borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      <View style={{ aspectRatio: 4 / 5 }}>
        <Cover uri={item.image_url} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' }} />
        {item.is_network_prize && <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: '#facc15', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}><AppText variant="caption" style={{ color: '#000', fontWeight: '700', fontSize: 11 }}>Grail</AppText></View>}
        {item.quantity != null && <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}><AppText variant="caption" style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>{outOfStock ? 'Out of stock' : `${item.quantity} left`}</AppText></View>}
        <View style={{ position: 'absolute', left: 12, right: 12, bottom: 10 }}>
          <AppText variant="body" numberOfLines={2} style={{ color: '#fff', fontWeight: '800', lineHeight: 18 }}>{item.name}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
            <AppText variant="numeral" style={{ color: '#fff', fontSize: 20 }}>{item.xp_cost.toLocaleString()}</AppText>
            <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>pts</AppText>
            {item.retail_value != null && <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.6)', marginLeft: 'auto', fontSize: 11 }}>${item.retail_value} value</AppText>}
          </View>
        </View>
      </View>
      <View style={{ padding: 12 }}>
        {item.description ? <AppText variant="caption" tone="tertiary" numberOfLines={2} style={{ marginBottom: 8 }}>{item.description}</AppText> : null}
        {grailElsewhere ? (
          <View style={{ padding: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(234,179,8,0.3)', backgroundColor: 'rgba(234,179,8,0.1)', alignItems: 'center' }}>
            <AppText variant="caption" style={{ color: '#eab308', fontWeight: '600' }}>Only redeemable at Trade Emporium</AppText>
          </View>
        ) : outOfStock ? (
          <View style={{ padding: 9, borderRadius: 999, backgroundColor: colors.bgElevated, alignItems: 'center' }}>
            <AppText variant="caption" tone="tertiary" style={{ fontWeight: '600' }}>Out of Stock</AppText>
          </View>
        ) : (
          <Button label={reason ?? 'Redeem'} onPress={() => onRedeem(item)} disabled={disabled} style={{ paddingVertical: 10, borderRadius: 999 }} />
        )}
      </View>
    </View>
  );
}

function LockedItem({ item, subscriberCount }: { item: PrizeItem; subscriberCount: number }) {
  const { colors } = useTheme();
  const threshold = item.unlock_threshold!;
  const pct = Math.min(100, Math.round((subscriberCount / threshold) * 100));
  return (
    <View style={[card(colors), { flexDirection: 'row', gap: 14, opacity: 0.75 }]}>
      <Cover uri={item.image_url} style={{ width: 64, height: 64, borderRadius: 12, opacity: 0.5 }} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <AppText variant="body" style={{ fontWeight: '600' }}>{item.name}</AppText>
            {item.description ? <AppText variant="caption" tone="tertiary" numberOfLines={1}>{item.description}</AppText> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="body" style={{ fontWeight: '700' }}>{item.xp_cost.toLocaleString()} pts</AppText>
            {item.retail_value != null && <AppText variant="caption" tone="tertiary">${item.retail_value} value</AppText>}
          </View>
        </View>
        <View style={{ marginTop: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <AppText variant="caption" tone="tertiary">Unlocks at {threshold} subscribers</AppText>
            <AppText variant="caption" tone="tertiary">{subscriberCount} / {threshold}</AppText>
          </View>
          <View style={{ height: 6, backgroundColor: colors.bgElevated, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${pct}%`, backgroundColor: colors.accent }} />
          </View>
        </View>
      </View>
    </View>
  );
}
