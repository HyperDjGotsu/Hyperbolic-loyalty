import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApi } from '@/lib/api';
import { getLevel, getXpProgress, getXpToNext } from '@/lib/theme';

type PlayerResponse = {
  linked: boolean;
  id: string;
  hyp_id: string;
  displayName: string;
  xp: number;
  gems: number;
  passTier: string;
  homeStore?: { id: string; name: string; city: string | null; is_flagship: boolean; color: string | null } | null;
  gameXP?: { game_id: string }[];
  recentActivity?: { id: string }[];
};

type Store = {
  id: string;
  name: string;
  city: string | null;
  is_flagship: boolean;
  color: string | null;
};

type TierStyle = {
  text: string;
  border: string;
  bg: string;
};

function getTierStyle(tier: string): TierStyle {
  switch (tier) {
    case 'bronze':
      return { text: '#b45309', border: 'rgba(180,83,9,0.3)', bg: 'rgba(180,83,9,0.1)' };
    case 'silver':
      return { text: '#94a3b8', border: 'rgba(148,163,184,0.3)', bg: 'rgba(148,163,184,0.1)' };
    case 'gold':
      return { text: '#eab308', border: 'rgba(234,179,8,0.3)', bg: 'rgba(234,179,8,0.1)' };
    case 'diamond':
      return { text: '#67e8f9', border: 'rgba(103,232,249,0.3)', bg: 'rgba(103,232,249,0.1)' };
    default: // free
      return { text: '#9ca3af', border: 'rgba(156,163,175,0.3)', bg: 'rgba(156,163,175,0.1)' };
  }
}

export default function DashboardScreen() {
  const api = useApi();
  const router = useRouter();
  const [player, setPlayer] = useState<PlayerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [showStoreSwitcher, setShowStoreSwitcher] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  async function loadPlayer() {
    try {
      const [data, spinData] = await Promise.all([
        api.get<PlayerResponse>('/api/player/by-clerk'),
        api.get<{ canSpin: boolean }>('/api/xp/daily-spin').catch(() => ({ canSpin: true })),
      ]);
      if (!data.linked) {
        router.replace('/onboarding');
        return;
      }
      setPlayer(data);
      setHasSpunToday(!spinData.canSpin);
      setError('');
      // Seed selectedStore from homeStore; load full store list for switcher
      if (data.homeStore) setSelectedStore(data.homeStore as Store);
      api.get<{ stores: Store[] }>('/api/stores')
        .then(s => setStores(s.stores ?? []))
        .catch(() => {});
    } catch {
      setError('Could not load player. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleSpin() {
    if (hasSpunToday || isSpinning) return;
    setIsSpinning(true);
    try {
      const data = await api.post<{ success: boolean; prize: { xp: number; label: string } }>(
        '/api/xp/daily-spin',
        {}
      );
      if (data.success) {
        setHasSpunToday(true);
        setSpinResult(`+${data.prize.xp} XP — ${data.prize.label}`);
        setTimeout(() => setSpinResult(null), 3000);
      }
    } catch {
      // already spun or error — mark as spun to avoid double-tap
      setHasSpunToday(true);
    } finally {
      setIsSpinning(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (!player) setLoading(true);
      loadPlayer();
    }, [])
  );

  function onRefresh() {
    setRefreshing(true);
    loadPlayer();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c4b5fd" size="large" />
      </View>
    );
  }

  if (error || !player) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Player not found'}</Text>
        <Pressable style={styles.retryBtn} onPress={loadPlayer}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const xpProgress = getXpProgress(player.xp);
  const xpToNext = getXpToNext(player.xp);
  const level = getLevel(player.xp);
  const rawTier = (player.passTier ?? 'free').toLowerCase();
  const tier = rawTier === 'none' ? 'free' : rawTier;
  const tierStyle = getTierStyle(tier);
  const isPaidTier = tier !== 'free';
  const initial = (player.displayName ?? '?')[0].toUpperCase();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#c4b5fd"
        />
      }
    >
      {/* Header block */}
      <View style={styles.headerBlock}>
        <Text style={styles.logoText}>GSHC</Text>
        <Text style={styles.logoSub}>— PLAYER PASS —</Text>
      </View>

      {/* Player card */}
      <View style={styles.playerCard}>
        {/* Top row: avatar + info */}
        <View style={styles.playerTopRow}>
          {/* Avatar */}
          <View style={styles.avatarOuter}>
            <Text style={styles.avatarInitial}>{initial}</Text>
            {/* Level badge */}
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{level}</Text>
            </View>
          </View>

          {/* Info column */}
          <View style={styles.infoCol}>
            <Text style={styles.displayName}>{player.displayName}</Text>
            <Text style={styles.hypId}>{player.hyp_id}</Text>
            <Text style={styles.levelLabel}>Level {level} Player</Text>

            {/* XP bar */}
            <View style={styles.xpBarRow}>
              <View style={styles.xpTrack}>
                <View
                  style={[
                    styles.xpFill,
                    { width: `${Math.round(xpProgress * 100)}%` as `${number}%` },
                  ]}
                />
              </View>
            </View>
            <View style={styles.xpLabels}>
              <Text style={styles.xpLabelText}>{player.xp.toLocaleString()} XP</Text>
              <Text style={styles.xpLabelText}>{xpToNext} to next</Text>
            </View>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Text style={styles.statCellLabel}>GAMES</Text>
            <Text style={styles.statCellValue}>{player.gameXP?.length ?? 0}</Text>
          </View>
          <View style={[styles.statCell, styles.statCellMiddle]}>
            <Text style={styles.statCellLabel}>ACTIVITY</Text>
            <Text style={styles.statCellValue}>{player.recentActivity?.length ?? 0}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statCellLabel}>POINTS</Text>
            <Text style={[styles.statCellValue, styles.statCellAccent]}>
              {player.gems.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Store row — tappable, shows selected store context */}
        {(selectedStore ?? player.homeStore) ? (
          <Pressable style={styles.storeRow} onPress={() => setShowStoreSwitcher(true)}>
            <View style={[styles.storeDot, { backgroundColor: (selectedStore ?? player.homeStore)!.color ?? '#22c55e' }]} />
            <View style={styles.storeNameCol}>
              <Text style={styles.storeContext}>Viewing</Text>
              <Text style={styles.storeName} numberOfLines={1}>
                {(selectedStore ?? player.homeStore)!.name}
              </Text>
            </View>
            {(selectedStore ?? player.homeStore)!.is_flagship && (
              <View style={styles.flagshipBadge}>
                <Text style={styles.flagshipBadgeText}>Flagship</Text>
              </View>
            )}
            <Feather name="chevron-right" size={14} color="#7a7060" />
          </Pressable>
        ) : null}
      </View>

      {/* Daily Spin button */}
      <View style={styles.spinWrapper}>
        <Pressable
          style={[styles.spinBtn, (hasSpunToday || isSpinning) && styles.spinBtnClaimed]}
          onPress={handleSpin}
          disabled={hasSpunToday || isSpinning}
        >
          <View>
            <Text style={[styles.spinBtnText, (hasSpunToday || isSpinning) && styles.spinBtnTextClaimed]}>
              {isSpinning ? 'Spinning…' : hasSpunToday ? (spinResult ?? 'Claimed Today') : 'Daily Spin'}
            </Text>
            <Text style={[styles.spinBtnSub, (hasSpunToday || isSpinning) && styles.spinBtnSubClaimed]}>
              {hasSpunToday ? 'Come back tomorrow' : 'Tap to spin'}
            </Text>
          </View>
        </Pressable>
        {!hasSpunToday && !isSpinning && <View style={styles.pingDot} />}
      </View>

      {/* Player Pass card */}
      <View style={styles.passCard}>
        {/* Header row */}
        <View style={styles.passHeaderRow}>
          <Text style={styles.passHeaderLabel}>PLAYER PASS</Text>
          <View
            style={[
              styles.tierBadge,
              { borderColor: tierStyle.border, backgroundColor: tierStyle.bg },
            ]}
          >
            <Text style={[styles.tierBadgeText, { color: tierStyle.text }]}>
              {tier.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.passDivider} />

        {/* Two-column stats */}
        <View style={styles.passStatsRow}>
          <View style={styles.passStatCol}>
            <Text style={styles.passStatLabel}>LIFETIME XP</Text>
            <Text style={styles.passXpValue}>{player.xp.toLocaleString()}</Text>
            <Text style={styles.passStatNote}>total earned</Text>
          </View>
          <View style={styles.passColDivider} />
          <View style={styles.passStatCol}>
            <Text style={styles.passStatLabel}>PRIZE POINTS</Text>
            <Text
              style={[
                styles.passGemsValue,
                isPaidTier && styles.passGemsValueAccent,
              ]}
            >
              {player.gems.toLocaleString()}
            </Text>
            <Text style={styles.passStatNote}>spendable</Text>
          </View>
        </View>

        {/* Footer */}
        {isPaidTier ? (
          <Pressable style={styles.prizeWallBtn} onPress={() => router.push('/prize-wall' as never)}>
            <Text style={styles.prizeWallBtnText}>Spend at Prize Wall</Text>
          </Pressable>
        ) : (
          <View style={styles.passFooterFree}>
            <View style={styles.freeProgressTrack}>
              <View style={styles.freeProgressFill} />
            </View>
            <Text style={styles.freeProgressLabel}>Upgrade to unlock more rewards</Text>
          </View>
        )}
      </View>

      <View style={styles.bottomPad} />

      {/* Store Switcher Modal */}
      <Modal
        visible={showStoreSwitcher}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStoreSwitcher(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowStoreSwitcher(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Switch Store</Text>
            <Text style={styles.modalSub}>Choose your browsing context</Text>
            {stores.map(store => {
              const isSelected = (selectedStore?.id ?? player?.homeStore?.id) === store.id;
              return (
                <Pressable
                  key={store.id}
                  style={[styles.storeOption, isSelected && styles.storeOptionSelected]}
                  onPress={() => {
                    setSelectedStore(store);
                    setShowStoreSwitcher(false);
                  }}
                >
                  <View style={[styles.storeOptionDot, { backgroundColor: store.color ?? '#7a7060' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.storeOptionName}>{store.name}</Text>
                    {store.city ? <Text style={styles.storeOptionCity}>{store.city}</Text> : null}
                  </View>
                  {store.is_flagship && (
                    <View style={styles.flagshipBadge}>
                      <Text style={styles.flagshipBadgeText}>Flagship</Text>
                    </View>
                  )}
                  {isSelected && <Feather name="check" size={16} color="#c4b5fd" />}
                </Pressable>
              );
            })}
            <View style={{ height: 24 }} />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111009',
  },
  contentContainer: {
    paddingBottom: 0,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111009',
    gap: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryBtn: {
    backgroundColor: '#c4b5fd',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryText: {
    color: '#111009',
    fontWeight: '700',
  },

  // Header block
  headerBlock: {
    paddingTop: 52,
    paddingBottom: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  logoText: {
    fontFamily: 'Georgia',
    fontSize: 28,
    fontWeight: '900',
    color: '#a89f90',
  },
  logoSub: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 4,
    color: '#f97316',
    marginTop: 4,
  },

  // Player card
  playerCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#1a1810',
    borderWidth: 1,
    borderColor: 'rgba(242,239,232,0.08)',
    borderRadius: 12,
  },
  playerTopRow: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(196,181,253,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: '800',
    color: '#c4b5fd',
  },
  levelBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  infoCol: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f2efe8',
  },
  hypId: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#a89f90',
    marginTop: 2,
  },
  levelLabel: {
    fontSize: 12,
    color: '#a89f90',
    marginTop: 2,
  },
  xpBarRow: {
    marginTop: 8,
  },
  xpTrack: {
    height: 6,
    backgroundColor: 'rgba(242,239,232,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#c4b5fd',
    borderRadius: 3,
  },
  xpLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  xpLabelText: {
    fontSize: 10,
    color: '#7a7060',
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(242,239,232,0.08)',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statCellMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(242,239,232,0.08)',
  },
  statCellLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7a7060',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statCellValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f2efe8',
    marginTop: 2,
  },
  statCellAccent: {
    color: '#c4b5fd',
  },

  // Store row
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(242,239,232,0.08)',
  },
  storeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  storeNameCol: {
    flex: 1,
  },
  storeContext: {
    fontSize: 10,
    color: '#7a7060',
  },
  storeName: {
    fontSize: 12,
    color: '#a89f90',
    fontWeight: '500',
  },
  flagshipBadge: {
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.3)',
    backgroundColor: 'rgba(234,179,8,0.1)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  flagshipBadgeText: {
    fontSize: 10,
    color: '#eab308',
    fontWeight: '700',
  },

  // Daily Spin
  spinWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  spinBtn: {
    backgroundColor: '#c4b5fd',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  spinBtnClaimed: {
    backgroundColor: '#1a1810',
    borderWidth: 1,
    borderColor: 'rgba(242,239,232,0.08)',
  },
  spinBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111009',
    textAlign: 'center',
  },
  spinBtnTextClaimed: {
    color: '#7a7060',
  },
  spinBtnSub: {
    fontSize: 11,
    color: 'rgba(17,16,9,0.6)',
    textAlign: 'center',
  },
  spinBtnSubClaimed: {
    color: '#7a7060',
  },
  pingDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
  },

  // Player Pass card
  passCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#1a1810',
    borderWidth: 1,
    borderColor: 'rgba(242,239,232,0.08)',
  },
  passHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passHeaderLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    color: '#7a7060',
  },
  tierBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  passDivider: {
    height: 1,
    backgroundColor: 'rgba(242,239,232,0.08)',
    marginVertical: 12,
  },
  passStatsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  passStatCol: {
    flex: 1,
    paddingHorizontal: 4,
  },
  passColDivider: {
    width: 1,
    backgroundColor: 'rgba(242,239,232,0.08)',
  },
  passStatLabel: {
    fontSize: 10,
    color: '#7a7060',
    letterSpacing: 1,
    marginBottom: 4,
  },
  passXpValue: {
    fontFamily: 'Georgia',
    fontSize: 24,
    fontWeight: '900',
    color: '#f4c542',
  },
  passGemsValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f2efe8',
  },
  passGemsValueAccent: {
    color: '#c4b5fd',
  },
  passStatNote: {
    fontSize: 10,
    color: '#7a7060',
    marginTop: 2,
  },

  // Pass footer
  passFooterFree: {
    marginTop: 12,
    gap: 6,
  },
  freeProgressTrack: {
    height: 6,
    backgroundColor: 'rgba(242,239,232,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  freeProgressFill: {
    height: '100%',
    width: '30%',
    backgroundColor: '#67e8f9',
    borderRadius: 3,
  },
  freeProgressLabel: {
    fontSize: 10,
    color: '#7a7060',
  },
  prizeWallBtn: {
    backgroundColor: '#67e8f9',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  prizeWallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#09090b',
  },

  bottomPad: {
    paddingBottom: 24,
  },

  // Store Switcher Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#1a1810',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(242,239,232,0.08)',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(242,239,232,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#f2efe8',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSub: {
    color: '#7a7060',
    fontSize: 13,
    marginBottom: 16,
  },
  storeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: 'rgba(242,239,232,0.04)',
  },
  storeOptionSelected: {
    backgroundColor: 'rgba(196,181,253,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.3)',
  },
  storeOptionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  storeOptionName: {
    color: '#f2efe8',
    fontSize: 14,
    fontWeight: '600',
  },
  storeOptionCity: {
    color: '#7a7060',
    fontSize: 12,
    marginTop: 1,
  },
});
