import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useApi } from '@/lib/api';
import { LoadingView } from '@/components/ui';
import { C } from '@/lib/theme';

type Avatar = {
  type: 'emoji' | 'photo';
  base: string;
  photoUrl: string | null;
  background: string;
  frame: string;
  badge: string | null;
};

type LeaderboardEntry = {
  rank: number;
  id: string;
  odid: string;
  name: string;
  totalXp: number;
  level: number;
  hidden: boolean;
  avatar: Avatar;
};

const GAMES = [
  { id: 'overall',            label: 'Overall',    icon: '🏆' },
  { id: 'one_piece',          label: 'One Piece',  icon: '🏴‍☠️' },
  { id: 'pokemon',            label: 'Pokemon',    icon: '⚡' },
  { id: 'mtg',                label: 'MTG',        icon: '✨' },
  { id: 'star_wars_unlimited', label: 'Star Wars', icon: '🌟' },
  { id: 'gundam',             label: 'Gundam',     icon: '🤖' },
  { id: 'lorcana',            label: 'Lorcana',    icon: '🪄' },
  { id: 'yugioh',             label: 'Yu-Gi-Oh',  icon: '⭐' },
];

function rankColor(rank: number): string {
  if (rank === 1) return '#f4c542';
  if (rank === 2) return '#d4d4d8';
  if (rank === 3) return '#c97c3a';
  return C.textTertiary;
}

function AvatarBubble({ avatar }: { avatar: Avatar }) {
  if (avatar.type === 'photo' && avatar.photoUrl) {
    return (
      <Image
        source={{ uri: avatar.photoUrl }}
        style={[styles.avatarCircle, { backgroundColor: avatar.background }]}
      />
    );
  }
  return (
    <View style={[styles.avatarCircle, { backgroundColor: avatar.background }]}>
      <Text style={styles.avatarEmoji}>{avatar.base}</Text>
    </View>
  );
}

export default function CommunityScreen() {
  const api = useApi();
  const [scope, setScope] = useState<'store' | 'network'>('store');
  const [game, setGame] = useState('overall');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const homeStoreId = useRef<string | null>(null);

  // Load the player's homeStoreId once so we know what to pass to the store leaderboard
  useEffect(() => {
    api.get<{ homeStoreId: string | null }>('/api/player/pass-status')
      .then(d => {
        homeStoreId.current = d.homeStoreId ?? null;
        // Default to network if no home store
        if (!d.homeStoreId) setScope('network');
        loadLeaderboard('overall', d.homeStoreId ?? null, scope);
      })
      .catch(() => {
        setScope('network');
        loadLeaderboard('overall', null, 'network');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLeaderboard(
    g: string = game,
    storeId: string | null = homeStoreId.current,
    s: 'store' | 'network' = scope,
  ) {
    try {
      const gameParam = g !== 'overall' ? `&game=${g}` : '';
      const storeParam = s === 'store' && storeId ? `&store_id=${storeId}` : '';
      const data = await api.get<{ leaderboard: LeaderboardEntry[] }>(
        `/api/community/leaderboard?limit=50${gameParam}${storeParam}`
      );
      setEntries(data.leaderboard ?? []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleScope(s: 'store' | 'network') {
    setScope(s);
    setLoading(true);
    loadLeaderboard(game, homeStoreId.current, s);
  }

  function handleGame(g: string) {
    setGame(g);
    setLoading(true);
    loadLeaderboard(g, homeStoreId.current, scope);
  }

  function onRefresh() {
    setRefreshing(true);
    loadLeaderboard(game, homeStoreId.current, scope);
  }

  return (
    <View style={styles.container}>
      {/* Scope toggle */}
      <View style={styles.scopeRow}>
        {(['store', 'network'] as const).map(s => (
          <Pressable
            key={s}
            style={[
              styles.scopeBtn,
              scope === s && styles.scopeBtnActive,
              s === 'store' && !homeStoreId.current && styles.scopeBtnDisabled,
            ]}
            onPress={() => { if (s !== 'store' || homeStoreId.current) handleScope(s); }}
          >
            <Text style={[styles.scopeText, scope === s && styles.scopeTextActive]}>
              {s === 'store' ? '🏪 My Store' : '🌐 Network'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Game filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        {GAMES.map(g => (
          <Pressable
            key={g.id}
            style={[styles.pill, game === g.id && styles.pillActive]}
            onPress={() => handleGame(g.id)}
          >
            <Text style={styles.pillIcon}>{g.icon}</Text>
            <Text style={[styles.pillLabel, game === g.id && styles.pillLabelActive]}>
              {g.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <LoadingView style={styles.fill} />
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyTitle}>No rankings yet</Text>
          <Text style={styles.emptyBody}>
            {scope === 'store'
              ? 'Earn XP at events to appear on the store board.'
              : 'No network rankings yet.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
          }
        >
          <View style={{ height: 8 }} />
          {entries.map(entry => (
            <View key={entry.id} style={styles.row}>
              {/* Rank */}
              <Text style={[styles.rank, { color: rankColor(entry.rank) }]}>
                #{entry.rank}
              </Text>

              {/* Avatar */}
              <AvatarBubble avatar={entry.avatar} />

              {/* Name + meta */}
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {entry.hidden ? 'Anonymous' : entry.name}
                </Text>
                <Text style={styles.meta}>Lv.{entry.level}</Text>
              </View>

              {/* XP */}
              <Text style={styles.xp}>{entry.totalXp.toLocaleString()}</Text>
            </View>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgBase },
  fill:      { flex: 1, backgroundColor: C.bgBase },

  // Scope toggle
  scopeRow: { flexDirection: 'row', margin: 16, gap: 8 },
  scopeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: C.bgSurface,
    borderWidth: 1,
    borderColor: C.border,
  },
  scopeBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  scopeBtnDisabled: { opacity: 0.4 },
  scopeText: { color: C.textTertiary, fontWeight: '600', fontSize: 14 },
  scopeTextActive: { color: C.accentFg },

  // Game pills
  pillRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8, flexDirection: 'row' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.bgSurface,
    borderWidth: 1,
    borderColor: C.border,
  },
  pillActive: { backgroundColor: 'rgba(196,181,253,0.15)', borderColor: C.accent },
  pillIcon: { fontSize: 14 },
  pillLabel: { color: C.textSecondary, fontSize: 12, fontWeight: '600' },
  pillLabelActive: { color: C.accent },

  // Leaderboard rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  rank: { width: 36, fontSize: 14, fontWeight: '800', textAlign: 'right' },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarEmoji: { fontSize: 20 },
  info: { flex: 1 },
  name: { color: C.textPrimary, fontSize: 14, fontWeight: '700' },
  meta: { color: C.textTertiary, fontSize: 11, marginTop: 1 },
  xp: { color: C.xp, fontSize: 13, fontWeight: '700' },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptyBody: { color: C.textTertiary, fontSize: 13, textAlign: 'center' },
});
