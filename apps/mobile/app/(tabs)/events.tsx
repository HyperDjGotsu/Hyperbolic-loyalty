import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useApi } from '@/lib/api';
import { LoadingView } from '@/components/ui';

type Event = {
  id: string;
  name: string;
  game_id: string;
  description: string | null;
  date: string;
  time: string;
  scheduledAt: string;
  endsAt: string | null;
  status: string;
  attendanceXp: number;
  winXp: number;
  isLive: boolean;
  isNetworkEvent: boolean;
  game: { id: string; name: string; icon: string; color: string } | null;
};

function statusColor(status: string) {
  if (status === 'active') return '#22c55e';
  if (status === 'scheduled') return '#c4b5fd';
  return '#7a7060';
}

export default function EventsScreen() {
  const api = useApi();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'store' | 'network'>('store');
  const [homeStoreId, setHomeStoreId] = useState<string | null>(null);

  async function loadAll(currentTab: 'store' | 'network', cachedStoreId: string | null) {
    let storeId = cachedStoreId;
    if (!storeId) {
      try {
        const data = await api.get<{ homeStore?: { id: string } | null }>('/api/player/by-clerk');
        storeId = data.homeStore?.id ?? null;
        if (storeId) setHomeStoreId(storeId);
      } catch { /* non-critical */ }
    }
    try {
      let path: string;
      if (currentTab === 'network') {
        path = '/api/events?network=true';
      } else if (storeId) {
        path = `/api/events?store_id=${storeId}`;
      } else {
        path = '/api/events';
      }
      const data = await api.get<{ events: Event[] }>(path);
      setEvents(data.events ?? []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    void loadAll(tab, homeStoreId);
  }, [tab]);

  function onRefresh() {
    setRefreshing(true);
    void loadAll(tab, homeStoreId);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.tabRow, { marginTop: insets.top + 8 }]}>
        {(['store', 'network'] as const).map(t => (
          <Pressable
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => { setLoading(true); setTab(t); }}
          >
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
              {t === 'store' ? 'My Store' : 'Network'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <LoadingView style={styles.center} />
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
              onPress={() => router.push(`/event/${event.id}` as never)}
            >
              <View style={styles.eventHeader}>
                <Text style={styles.eventTitle}>{event.name}</Text>
                <View style={[styles.statusDot, { backgroundColor: statusColor(event.status) }]} />
              </View>
              {event.game ? (
                <Text style={styles.eventGame}>{event.game.icon} {event.game.name}</Text>
              ) : null}
              <Text style={styles.eventDate}>{event.date} · {event.time}</Text>
              {event.attendanceXp ? (
                <View style={styles.xpBadge}>
                  <Text style={styles.xpBadgeText}>+{event.attendanceXp} XP</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111009' },
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
  eventGame: { color: '#a89f90', fontSize: 12, marginTop: 4 },
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
