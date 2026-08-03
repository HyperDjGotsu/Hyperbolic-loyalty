import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

type Player = {
  id: string;
  display_name: string;
  hyp_id: string;
  xp: number;
  gems: number;
  player_pass_tier: string;
  home_store_name: string;
};

export default function DashboardScreen() {
  const { signOut } = useAuth();
  const api = useApi();
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function loadPlayer() {
    try {
      const data = await api.get<{ player: Player }>('/api/player/by-clerk');
      setPlayer(data.player);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load player');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadPlayer(); }, []);

  function onRefresh() {
    setRefreshing(true);
    loadPlayer();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#a78bfa" size="large" />
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

  const xpProgress = (player.xp % 1000) / 1000;
  const xpToNext = 1000 - (player.xp % 1000);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a78bfa" />}
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.displayName}>{player.display_name}</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{(player.player_pass_tier ?? 'free').toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.hypId}>{player.hyp_id}</Text>
        {player.home_store_name ? (
          <Text style={styles.storeName}>📍 {player.home_store_name}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.xpRow}>
          <Text style={styles.statLabel}>Total XP</Text>
          <Text style={styles.statValue}>{player.xp.toLocaleString()}</Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${Math.round(xpProgress * 100)}%` as `${number}%` }]} />
        </View>
        <Text style={styles.xpHint}>{xpToNext} XP to next level</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statBig}>{player.gems}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        <View style={[styles.statCard, { justifyContent: 'center' }]}>
          <Pressable style={styles.actionBtn} onPress={() => router.push('/events')}>
            <Text style={styles.actionBtnText}>📅  Events</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <Pressable style={styles.actionTile} onPress={() => router.push('/events')}>
          <Text style={styles.actionIcon}>📅</Text>
          <Text style={styles.actionLabel}>Events</Text>
        </Pressable>
        <Pressable style={styles.actionTile} onPress={() => router.push('/notifications')}>
          <Text style={styles.actionIcon}>🔔</Text>
          <Text style={styles.actionLabel}>Inbox</Text>
        </Pressable>
        <Pressable style={styles.actionTile} onPress={() => router.push('/profile')}>
          <Text style={styles.actionIcon}>👤</Text>
          <Text style={styles.actionLabel}>Profile</Text>
        </Pressable>
        <Pressable style={styles.actionTile} onPress={() => signOut()}>
          <Text style={styles.actionIcon}>🚪</Text>
          <Text style={styles.actionLabel}>Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0f', gap: 16 },
  card: {
    backgroundColor: '#16161f',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#2d2d3d',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  displayName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  tierBadge: { backgroundColor: '#7c3aed', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  tierText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  hypId: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  storeName: { color: '#9ca3af', fontSize: 13, marginTop: 6 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statLabel: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
  statValue: { color: '#a78bfa', fontSize: 18, fontWeight: '800' },
  progressBg: { height: 8, backgroundColor: '#2d2d3d', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#7c3aed', borderRadius: 4 },
  xpHint: { color: '#4b5563', fontSize: 11, marginTop: 6, textAlign: 'right' },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#16161f',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d2d3d',
  },
  statBig: { fontSize: 28, fontWeight: '800', color: '#fff' },
  actionBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 12, paddingBottom: 32 },
  actionTile: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: '#16161f',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d2d3d',
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
  errorText: { color: '#f87171', fontSize: 15, textAlign: 'center' },
  retryBtn: { backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 },
  retryText: { color: '#fff', fontWeight: '700' },
});
