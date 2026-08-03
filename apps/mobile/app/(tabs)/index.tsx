import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  homeStore?: { name: string } | null;
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

  async function loadPlayer() {
    try {
      const data = await api.get<PlayerResponse>('/api/player/by-clerk');
      if (!data.linked) {
        router.replace('/onboarding');
        return;
      }
      setPlayer(data);
      setError('');
    } catch {
      setError('Could not load player. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
            <Text style={styles.statCellValue}>—</Text>
          </View>
          <View style={[styles.statCell, styles.statCellMiddle]}>
            <Text style={styles.statCellLabel}>ACTIVITY</Text>
            <Text style={styles.statCellValue}>—</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statCellLabel}>POINTS</Text>
            <Text style={[styles.statCellValue, styles.statCellAccent]}>
              {player.gems.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Store row */}
        {player.homeStore?.name ? (
          <View style={styles.storeRow}>
            <View style={styles.storeDot} />
            <Text style={styles.storeName} numberOfLines={1}>
              {player.homeStore.name}
            </Text>
            <View style={styles.flagshipBadge}>
              <Text style={styles.flagshipBadgeText}>Flagship</Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Daily Spin button */}
      <View style={styles.spinWrapper}>
        <Pressable style={styles.spinBtn}>
          <View>
            <Text style={styles.spinBtnText}>Daily Spin</Text>
            <Text style={styles.spinBtnSub}>Tap to spin</Text>
          </View>
        </Pressable>
        <View style={styles.pingDot} />
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
          <Pressable style={styles.prizeWallBtn}>
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
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(242,239,232,0.08)',
  },
  storeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
  },
  storeName: {
    fontSize: 12,
    color: '#a89f90',
    fontWeight: '500',
    flex: 1,
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
  spinBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111009',
    textAlign: 'center',
  },
  spinBtnSub: {
    fontSize: 11,
    color: 'rgba(17,16,9,0.6)',
    textAlign: 'center',
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
});
