import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Feather } from '@expo/vector-icons';
import { useApi } from '@/lib/api';
import { C } from '@/lib/theme';

const FREE_TIER_GATE = 720;
const TRADE_EMPORIUM_ID = '3766247c-d900-4b15-bc4a-f0b8f5e4fa2d';
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://hyperbolic-loyalty.vercel.app';

type PlayerTier = 'free' | 'bronze' | 'silver' | 'gold' | 'diamond';

type PassStatus = {
  tier: PlayerTier;
  lifetimeXp: number;
  prizePoints: number;
  homeStoreId: string | null;
  multiplier: number;
};

type PrizeItem = {
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
};

type ClaimDetails = {
  claimCode: string;
  itemName: string;
  pointsDeducted: number;
  redemptionId: string;
};

export default function PrizeWallScreen() {
  const router = useRouter();
  const api = useApi();
  const { getToken } = useAuth();
  const apiRef = useRef(api);
  apiRef.current = api;

  const [passStatus, setPassStatus] = useState<PassStatus | null>(null);
  const [passError, setPassError] = useState('');
  // undefined = loading, null = no store, string = store ID
  const [storeId, setStoreId] = useState<string | null | undefined>(undefined);
  const [items, setItems] = useState<PrizeItem[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState<PrizeItem | null>(null);
  const [claimDetails, setClaimDetails] = useState<ClaimDetails | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const loadPassStatus = useCallback(() => {
    apiRef.current.get<PassStatus>('/api/player/pass-status')
      .then(data => { setPassStatus(data); setStoreId(data.homeStoreId ?? null); })
      .catch((e: unknown) => {
        setPassError(e instanceof Error ? e.message : 'Unable to load balance');
        setStoreId(null);
      });
  }, []);

  const loadCatalog = useCallback((sid: string) => {
    setCatalogLoading(true);
    apiRef.current
      .get<{ items: PrizeItem[]; subscriber_count: number }>(
        `/api/prize-wall?storeId=${encodeURIComponent(sid)}`
      )
      .then(data => { setItems(data.items ?? []); setSubscriberCount(data.subscriber_count ?? 0); })
      .catch(() => setItems([]))
      .finally(() => setCatalogLoading(false));
  }, []);

  useEffect(() => {
    loadPassStatus();
  }, [loadPassStatus]);

  useEffect(() => {
    if (storeId === undefined) return;
    if (!storeId) { setCatalogLoading(false); return; }
    loadCatalog(storeId);
  }, [storeId, loadCatalog]);

  async function redeemItem() {
    if (!selectedItem) return;
    try {
      setRedeeming(true);
      setRedeemError(null);
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/prize-wall/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ itemId: selectedItem.id }),
      });
      const data = await res.json() as
        | ClaimDetails
        | { error: string; balance?: number; required?: number; gateRequired?: number; currentBalance?: number };

      if (res.status === 400) {
        const err = data as { error: string; balance?: number; required?: number };
        const needed = err.required != null ? ` Need ${err.required.toLocaleString()} pts.` : '';
        setRedeemError(`Not enough Prize Points.${needed}`);
        return;
      }
      if (res.status === 403) {
        const err = data as { gateRequired?: number };
        const gate = err.gateRequired ?? FREE_TIER_GATE;
        setRedeemError(`Prize Wall locked until ${gate} lifetime XP.`);
        return;
      }
      if (!res.ok || !('claimCode' in data)) {
        setRedeemError('Redemption failed. Please try again.');
        return;
      }
      setSelectedItem(null);
      setClaimDetails(data as ClaimDetails);
    } catch {
      setRedeemError('Unable to connect. Check your connection and try again.');
    } finally {
      setRedeeming(false);
    }
  }

  function closeClaim() {
    setClaimDetails(null);
    loadPassStatus();
    if (storeId) loadCatalog(storeId);
  }

  const floor = items.filter(i => i.unlock_threshold === null);
  const unlocked = items.filter(i => i.unlock_threshold !== null && i.is_unlocked);
  const locked = items.filter(i => i.unlock_threshold !== null && !i.is_unlocked);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.backRow} onPress={() => router.back()}>
        <Feather name="arrow-left" size={18} color={C.textSecondary} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Text style={styles.title}>Prize Wall</Text>
      <Text style={styles.subtitle}>Spend your Points on real prizes. Points never expire.</Text>

      <BalanceBar passStatus={passStatus} error={passError} />

      <View style={styles.noticeRow}>
        <Text style={styles.noticeIcon}>🏪</Text>
        <Text style={styles.noticeText}>
          All prizes are redeemed in person at the store. Show your claim code to a staff member to collect your item.
        </Text>
      </View>

      {catalogLoading && storeId !== null ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : storeId === null ? (
        <View style={styles.emptyBox}>
          <Feather name="map-pin" size={32} color={C.textTertiary} />
          <Text style={styles.emptyText}>No store selected. Visit a store to access the Prize Wall.</Text>
        </View>
      ) : items.length === 0 && !catalogLoading ? (
        <View style={styles.emptyBox}>
          <Feather name="gift" size={32} color={C.textTertiary} />
          <Text style={styles.emptyText}>No prizes available yet. Check back soon.</Text>
        </View>
      ) : (
        <>
          {floor.length > 0 && (
            <CatalogSection title="ALWAYS AVAILABLE">
              <ItemGrid
                items={floor}
                passStatus={passStatus}
                storeId={storeId ?? null}
                redeeming={redeeming}
                onRedeem={item => { setRedeemError(null); setSelectedItem(item); }}
              />
            </CatalogSection>
          )}
          {unlocked.length > 0 && (
            <CatalogSection title="COMMUNITY UNLOCKED">
              <ItemGrid
                items={unlocked}
                passStatus={passStatus}
                storeId={storeId ?? null}
                redeeming={redeeming}
                onRedeem={item => { setRedeemError(null); setSelectedItem(item); }}
              />
            </CatalogSection>
          )}
          {locked.length > 0 && (
            <CatalogSection
              title="COMMUNITY GOALS"
              subtitle={`${subscriberCount} active ${subscriberCount === 1 ? 'subscriber' : 'subscribers'} across the network. Grow the community to unlock these.`}
            >
              {locked.map(item => (
                <LockedItem key={item.id} item={item} subscriberCount={subscriberCount} />
              ))}
            </CatalogSection>
          )}
        </>
      )}

      <View style={{ height: 40 }} />

      {selectedItem && passStatus && (
        <RedeemModal
          item={selectedItem}
          balance={passStatus.prizePoints}
          redeeming={redeeming}
          error={redeemError}
          onCancel={() => { setSelectedItem(null); setRedeemError(null); }}
          onConfirm={() => void redeemItem()}
        />
      )}

      {claimDetails && (
        <ClaimCodeScreen claim={claimDetails} onDone={closeClaim} />
      )}
    </ScrollView>
  );
}

function BalanceBar({ passStatus, error }: { passStatus: PassStatus | null; error: string }) {
  if (error) {
    return (
      <View style={styles.balanceCard}>
        <Text style={styles.balanceError}>{error}</Text>
      </View>
    );
  }
  if (!passStatus) {
    return <View style={[styles.balanceCard, { opacity: 0.4, height: 72 }]} />;
  }

  const gateLocked = passStatus.tier === 'free' && passStatus.lifetimeXp < FREE_TIER_GATE;
  const trialReady = passStatus.tier === 'free' && passStatus.lifetimeXp >= FREE_TIER_GATE;
  const gateProgress = Math.min(1, passStatus.lifetimeXp / FREE_TIER_GATE);

  return (
    <View style={styles.balanceCard}>
      <View style={styles.balanceRow}>
        <View style={styles.tierBadge}>
          <Text style={styles.tierBadgeText}>{passStatus.tier.toUpperCase()}</Text>
        </View>
        <Text style={styles.balancePoints}>
          {passStatus.prizePoints.toLocaleString()} Prize Points
        </Text>
      </View>
      <Text style={styles.lifetimeXpText}>Lifetime XP: {passStatus.lifetimeXp.toLocaleString()}</Text>

      {gateLocked && (
        <View style={styles.gateSection}>
          <View style={styles.gateLabelRow}>
            <Text style={styles.gateLabel}>Redeem a 1-month Bronze trial at {FREE_TIER_GATE} lifetime XP</Text>
            <Text style={styles.gateCount}>{passStatus.lifetimeXp} / {FREE_TIER_GATE}</Text>
          </View>
          <View style={styles.gateTrack}>
            <View style={[styles.gateFill, { width: `${Math.round(gateProgress * 100)}%` as `${number}%` }]} />
          </View>
        </View>
      )}

      {trialReady && (
        <View style={styles.trialBanner}>
          <Text style={styles.trialTitle}>🎉 You've unlocked a 30-day Bronze Trial!</Text>
          <Text style={styles.trialSub}>Claim your trial from the web app to start earning Prize Points.</Text>
        </View>
      )}
    </View>
  );
}

function CatalogSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function ItemGrid({
  items,
  passStatus,
  storeId,
  redeeming,
  onRedeem,
}: {
  items: PrizeItem[];
  passStatus: PassStatus | null;
  storeId: string | null;
  redeeming: boolean;
  onRedeem: (item: PrizeItem) => void;
}) {
  const pairs: PrizeItem[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push(items.slice(i, i + 2));
  }
  return (
    <View>
      {pairs.map((pair, i) => (
        <View key={i} style={styles.gridRow}>
          {pair.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              passStatus={passStatus}
              storeId={storeId}
              redeeming={redeeming}
              onRedeem={onRedeem}
            />
          ))}
          {pair.length === 1 && <View style={styles.itemCardSpacer} />}
        </View>
      ))}
    </View>
  );
}

function ItemCard({
  item,
  passStatus,
  storeId,
  redeeming,
  onRedeem,
}: {
  item: PrizeItem;
  passStatus: PassStatus | null;
  storeId: string | null;
  redeeming: boolean;
  onRedeem: (item: PrizeItem) => void;
}) {
  const isGrailElsewhere = item.is_network_prize && storeId !== TRADE_EMPORIUM_ID;
  const outOfStock = item.quantity != null && item.quantity <= 0;
  const gateLocked = passStatus?.tier === 'free' && (passStatus.lifetimeXp ?? 0) < FREE_TIER_GATE;
  const insufficientPoints = passStatus != null && passStatus.prizePoints < item.xp_cost;

  const disabledReason = !passStatus
    ? 'Loading…'
    : outOfStock || isGrailElsewhere
    ? null // handled with separate UI
    : !item.is_unlocked
    ? 'Locked'
    : gateLocked
    ? `${FREE_TIER_GATE} lifetime XP required`
    : insufficientPoints
    ? `Need ${item.xp_cost.toLocaleString()} pts`
    : null;

  const canRedeem = !outOfStock && !isGrailElsewhere && item.is_unlocked && !gateLocked && !insufficientPoints && !!passStatus;
  const btnDisabled = !canRedeem || redeeming;

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemImageBox}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.itemImageEl}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <Feather name="image" size={20} color={C.textTertiary} />
          </View>
        )}
        {item.is_network_prize && (
          <View style={styles.grailBadge}>
            <Text style={styles.grailBadgeText}>GRAIL</Text>
          </View>
        )}
      </View>

      <View style={styles.itemBody}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}

        <View style={styles.itemPriceRow}>
          <Text style={styles.itemCost}>{item.xp_cost.toLocaleString()}</Text>
          <Text style={styles.itemCostUnit}> pts</Text>
        </View>
        {item.retail_value != null ? (
          <Text style={styles.itemRetail}>${item.retail_value} value</Text>
        ) : null}
        {item.quantity != null && !outOfStock ? (
          <Text style={styles.itemQty}>{item.quantity} remaining</Text>
        ) : null}

        {isGrailElsewhere ? (
          <View style={styles.grailElsewhereBox}>
            <Text style={styles.grailElsewhereText}>Only at Trade Emporium</Text>
          </View>
        ) : outOfStock ? (
          <View style={styles.oosBox}>
            <Text style={styles.oosText}>Out of Stock</Text>
          </View>
        ) : (
          <Pressable
            style={[styles.redeemBtn, btnDisabled && styles.redeemBtnDisabled]}
            disabled={btnDisabled}
            onPress={canRedeem && !redeeming ? () => onRedeem(item) : undefined}
          >
            <Text style={[styles.redeemBtnText, btnDisabled && styles.redeemBtnTextDisabled]}>
              {disabledReason ?? 'Redeem'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function RedeemModal({
  item,
  balance,
  redeeming,
  error,
  onCancel,
  onConfirm,
}: {
  item: PrizeItem;
  balance: number;
  redeeming: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Redeem {item.name}?</Text>
          <Text style={styles.modalCost}>{item.xp_cost.toLocaleString()} Prize Points</Text>
          <Text style={styles.modalBalance}>
            You&apos;ll have {(balance - item.xp_cost).toLocaleString()} pts remaining
          </Text>
          <Text style={styles.modalNotice}>🏪 Collect in person — show your claim code to staff.</Text>
          {error ? <Text style={styles.modalError}>{error}</Text> : null}
          <View style={styles.modalButtons}>
            <Pressable
              style={[styles.modalBtn, styles.modalBtnCancel]}
              onPress={onCancel}
              disabled={redeeming}
            >
              <Text style={styles.modalBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.modalBtn, styles.modalBtnConfirm, redeeming && styles.modalBtnOpacity]}
              onPress={onConfirm}
              disabled={redeeming}
            >
              <Text style={styles.modalBtnConfirmText}>
                {redeeming ? 'Redeeming…' : 'Confirm'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ClaimCodeScreen({ claim, onDone }: { claim: ClaimDetails; onDone: () => void }) {
  return (
    <Modal animationType="slide" visible onRequestClose={onDone}>
      <View style={styles.claimScreen}>
        <Text style={styles.claimItemName}>{claim.itemName}</Text>
        <View style={styles.claimCodeBox}>
          <Text style={styles.claimCode}>{claim.claimCode}</Text>
        </View>
        <Text style={styles.claimInstruction}>
          Show this code to staff at the counter to collect your prize.
        </Text>
        <Text style={styles.claimDeducted}>
          −{claim.pointsDeducted.toLocaleString()} Prize Points
        </Text>
        <Pressable style={styles.claimDoneBtn} onPress={onDone}>
          <Text style={styles.claimDoneBtnText}>Done</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function LockedItem({ item, subscriberCount }: { item: PrizeItem; subscriberCount: number }) {
  const threshold = item.unlock_threshold!;
  const pct = Math.min(100, Math.round((subscriberCount / threshold) * 100));

  return (
    <View style={[styles.lockedItem, { opacity: 0.7 }]}>
      <View style={styles.lockedThumb}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={[styles.lockedThumbImg, { opacity: 0.35 }]}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.lockedThumbPlaceholder} />
        )}
      </View>
      <View style={styles.lockedBody}>
        <View style={styles.lockedTitleRow}>
          <Text style={styles.lockedName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.lockedCost}>{item.xp_cost.toLocaleString()} pts</Text>
        </View>
        {item.description ? (
          <Text style={styles.lockedDesc} numberOfLines={1}>{item.description}</Text>
        ) : null}
        <View style={styles.lockedProgressSection}>
          <View style={styles.lockedProgressLabelRow}>
            <Text style={styles.lockedProgressLabel}>Unlocks at {threshold} subscribers</Text>
            <Text style={styles.lockedProgressLabel}>{subscriberCount} / {threshold}</Text>
          </View>
          <View style={styles.lockedTrack}>
            <View style={[styles.lockedFill, { width: `${pct}%` as `${number}%` }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgBase },
  content: { paddingBottom: 24 },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8 },
  backText: { color: C.textSecondary, fontSize: 14 },

  title: { fontSize: 24, fontWeight: '800', color: C.textPrimary, paddingHorizontal: 16, marginTop: 4 },
  subtitle: { fontSize: 13, color: C.textSecondary, paddingHorizontal: 16, marginTop: 4, marginBottom: 16 },

  // Balance card
  balanceCard: {
    backgroundColor: C.bgSurface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tierBadge: {
    backgroundColor: C.bgElevated,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tierBadgeText: { color: C.textPrimary, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  balancePoints: { color: C.textPrimary, fontSize: 15, fontWeight: '600', flex: 1 },
  lifetimeXpText: { color: C.textTertiary, fontSize: 11, marginTop: 4 },
  balanceError: { color: C.danger, fontSize: 13 },

  gateSection: { marginTop: 14 },
  gateLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  gateLabel: { color: C.textSecondary, fontSize: 11, flex: 1 },
  gateCount: { color: C.textTertiary, fontSize: 11 },
  gateTrack: { height: 6, backgroundColor: C.bgElevated, borderRadius: 3, overflow: 'hidden' },
  gateFill: { height: '100%', backgroundColor: C.accent, borderRadius: 3 },

  trialBanner: {
    marginTop: 14,
    backgroundColor: 'rgba(234,179,8,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.3)',
    padding: 12,
  },
  trialTitle: { color: '#eab308', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  trialSub: { color: C.textSecondary, fontSize: 12, lineHeight: 18 },

  // In-person notice
  noticeRow: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: C.bgSurface,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'flex-start',
  },
  noticeIcon: { fontSize: 16 },
  noticeText: { color: C.textSecondary, fontSize: 12, lineHeight: 18, flex: 1 },

  // Loading / empty
  loadingBox: { paddingVertical: 48, alignItems: 'center' },
  emptyBox: { paddingVertical: 48, alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  emptyText: { color: C.textTertiary, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // Section
  section: { marginTop: 8, paddingHorizontal: 16 },
  sectionTitle: {
    color: C.textTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
    marginTop: 16,
  },
  sectionSubtitle: { color: C.textTertiary, fontSize: 11, marginBottom: 10, lineHeight: 16 },

  // Item grid
  gridRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  itemCardSpacer: { flex: 1 },

  // Item card
  itemCard: {
    flex: 1,
    backgroundColor: C.bgSurface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  itemImageBox: { aspectRatio: 1, backgroundColor: C.bgElevated, position: 'relative' },
  itemImageEl: { width: '100%', height: '100%' },
  itemImagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },

  grailBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(234,179,8,0.9)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  grailBadgeText: { color: '#111', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  itemBody: { padding: 10 },
  itemName: { color: C.textPrimary, fontSize: 12, fontWeight: '700', lineHeight: 16 },
  itemDesc: { color: C.textTertiary, fontSize: 10, lineHeight: 14, marginTop: 3 },
  itemPriceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  itemCost: { color: C.textPrimary, fontSize: 16, fontWeight: '800' },
  itemCostUnit: { color: C.textSecondary, fontSize: 10 },
  itemRetail: { color: C.textTertiary, fontSize: 10, marginTop: 2 },
  itemQty: { color: C.textTertiary, fontSize: 10, marginTop: 2 },

  grailElsewhereBox: {
    marginTop: 8,
    backgroundColor: 'rgba(234,179,8,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.3)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  grailElsewhereText: { color: '#eab308', fontSize: 10, fontWeight: '600' },

  oosBox: {
    marginTop: 8,
    backgroundColor: C.bgElevated,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  oosText: { color: C.textTertiary, fontSize: 10, fontWeight: '600' },

  redeemBtn: {
    marginTop: 8,
    backgroundColor: C.success,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  redeemBtnDisabled: { backgroundColor: C.bgElevated },
  redeemBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  redeemBtnTextDisabled: { color: C.textTertiary },

  // Locked items
  lockedItem: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: C.bgSurface,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  lockedThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: C.bgElevated,
    overflow: 'hidden',
    flexShrink: 0,
  },
  lockedThumbImg: { width: '100%', height: '100%' },
  lockedThumbPlaceholder: { width: '100%', height: '100%' },
  lockedBody: { flex: 1 },
  lockedTitleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  lockedName: { color: C.textPrimary, fontSize: 12, fontWeight: '600', flex: 1 },
  lockedCost: { color: C.textPrimary, fontSize: 12, fontWeight: '700', flexShrink: 0 },
  lockedDesc: { color: C.textTertiary, fontSize: 10, marginTop: 2 },
  lockedProgressSection: { marginTop: 8 },
  lockedProgressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  lockedProgressLabel: { color: C.textTertiary, fontSize: 10 },
  lockedTrack: { height: 4, backgroundColor: C.bgElevated, borderRadius: 2, overflow: 'hidden' },
  lockedFill: { height: '100%', backgroundColor: C.accent, borderRadius: 2 },

  // Confirmation modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    backgroundColor: C.bgSurface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  modalCost: { color: C.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 6 },
  modalBalance: { color: C.textSecondary, fontSize: 14, marginBottom: 8 },
  modalNotice: { color: C.textTertiary, fontSize: 12, lineHeight: 18 },
  modalError: { color: C.danger, fontSize: 13, marginTop: 10 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: C.bgElevated },
  modalBtnCancelText: { color: C.textPrimary, fontSize: 15, fontWeight: '600' },
  modalBtnConfirm: { backgroundColor: C.success },
  modalBtnConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalBtnOpacity: { opacity: 0.5 },

  // Claim code screen
  claimScreen: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  claimItemName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
  },
  claimCodeBox: {
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    paddingHorizontal: 32,
    paddingVertical: 48,
    alignItems: 'center',
    width: '100%',
  },
  claimCode: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 6,
    textAlign: 'center',
  },
  claimInstruction: {
    color: '#d1d5db',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 28,
    lineHeight: 22,
  },
  claimDeducted: {
    color: '#f87171',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  claimDoneBtn: {
    marginTop: 40,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  claimDoneBtnText: { color: '#0a0a0a', fontSize: 16, fontWeight: '700' },
});
