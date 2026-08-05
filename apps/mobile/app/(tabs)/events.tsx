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

type Event = {
  id: string;
  title: string;
  game_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  store_name: string;
  xp_reward: number;
};

export default function EventsScreen() {
  const api = useApi();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'store' | 'network'>('store');

  async function loadEvents() {
    try {
      const path = tab === 'network' ? '/api/events?scope=network' : '/api/events';
      const data = await api.get<{ events: Event[] }>(path);
      setEvents(data.events ?? []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadEvents(); }, [tab]);

  function onRefresh() {
    setRefreshing(true);
    loadEvents();
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function statusColor(status: string) {
    if (status === 'active') return '#22c55e';
    if (status === 'upcoming') return '#c4b5fd';
    return '#7a7060';
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {(['store', 'network'] as const).map(t => (
          <Pressable
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
              {t === 'store' ? 'My Store' : 'Network'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#c4b5fd" size="large" />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No upcoming events</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c4b5fd" />}
        >
          {events.map(event => (
            <Pressable
              key={event.id}
              style={styles.eventCard}
              onPress={() => router.push(`/event/${event.id}`)}
            >
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <View style={[styles.statusDot, { backgroundColor: statusColor(event.status) }]} />
              </View>
              <Text style={styles.eventStore}>{event.store_name}</Text>
              <Text style={styles.eventDate}>{formatDate(event.starts_at)}</Text>
              {event.xp_reward ? (
                <View style={styles.xpBadge}>
                  <Text style={styles.xpBadgeText}>+{event.xp_reward} XP</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111009' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabRow: { flexDirection: 'row', margin: 16, gap: 8 },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#1a1810',
    borderWidth: 1,
    borderColor: 'rgba(242,239,232,0.08)',
  },
  tabBtnActive: { backgroundColor: '#c4b5fd', borderColor: '#c4b5fd' },
  tabBtnText: { color: '#7a7060', fontWeight: '600', fontSize: 14 },
  tabBtnTextActive: { color: '#111009' },
  eventCard: {
    backgroundColor: '#1a1810',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(242,239,232,0.08)',
  },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventTitle: { fontSize: 16, fontWeight: '700', color: '#f2efe8', flex: 1, marginRight: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  eventStore: { color: '#a89f90', fontSize: 12, marginTop: 4 },
  eventDate: { color: '#7a7060', fontSize: 12, marginTop: 2 },
  xpBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(196,181,253,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
  },
  xpBadgeText: { color: '#c4b5fd', fontSize: 11, fontWeight: '700' },
  emptyText: { color: '#7a7060', fontSize: 15 },
});
