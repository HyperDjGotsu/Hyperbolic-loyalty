import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
  notification_events: boolean;
  notification_broadcasts: boolean;
  notification_rewards: boolean;
};

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const api = useApi();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const data = await api.get<{ player: Player }>('/api/player/by-clerk');
      setPlayer(data.player);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function togglePref(key: keyof Player, value: boolean) {
    if (!player) return;
    setPlayer({ ...player, [key]: value });
    setSaving(true);
    try {
      await api.patch('/api/player/notification-preferences', { [key]: value });
    } catch {
      setPlayer({ ...player, [key]: !value });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#a78bfa" size="large" />
      </View>
    );
  }

  if (!player) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load profile</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{player.display_name[0]?.toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{player.display_name}</Text>
        <Text style={styles.hypId}>{player.hyp_id}</Text>
        {player.home_store_name ? (
          <Text style={styles.store}>📍 {player.home_store_name}</Text>
        ) : null}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{player.xp.toLocaleString()}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{player.gems}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{(player.player_pass_tier ?? 'FREE').toUpperCase()}</Text>
            <Text style={styles.statLabel}>Pass</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Notifications {saving ? '(saving…)' : ''}</Text>
      <View style={styles.card}>
        {[
          { key: 'notification_events' as const, label: 'Events', icon: '📅' },
          { key: 'notification_broadcasts' as const, label: 'Broadcasts', icon: '📢' },
          { key: 'notification_rewards' as const, label: 'Rewards & XP', icon: '⚡' },
        ].map(({ key, label, icon }) => (
          <View key={key} style={styles.prefRow}>
            <Text style={styles.prefIcon}>{icon}</Text>
            <Text style={styles.prefLabel}>{label}</Text>
            <Switch
              value={!!player[key]}
              onValueChange={v => togglePref(key, v)}
              trackColor={{ false: '#2d2d3d', true: '#7c3aed' }}
              thumbColor="#fff"
            />
          </View>
        ))}
      </View>

      <Pressable style={styles.signOutBtn} onPress={() => signOut()}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0f' },
  card: {
    backgroundColor: '#16161f',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#2d2d3d',
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, color: '#fff', fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff' },
  hypId: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  store: { color: '#9ca3af', fontSize: 13, marginTop: 6 },
  statsRow: { flexDirection: 'row', marginTop: 20, gap: 0 },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#2d2d3d' },
  statVal: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginHorizontal: 16, marginTop: 24, marginBottom: 4 },
  prefRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 10 },
  prefIcon: { fontSize: 18, marginRight: 10 },
  prefLabel: { flex: 1, color: '#d1d5db', fontSize: 15 },
  signOutBtn: {
    backgroundColor: '#1f1f2e',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  signOutText: { color: '#f87171', fontWeight: '700', fontSize: 15 },
  errorText: { color: '#f87171', fontSize: 15 },
});
