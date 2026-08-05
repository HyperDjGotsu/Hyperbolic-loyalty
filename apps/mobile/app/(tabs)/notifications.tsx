import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApi } from '@/lib/api';

type Notification = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
  type: string;
};

type FeatherIconName = 'calendar' | 'zap' | 'radio' | 'award' | 'bell';

function typeIcon(type: string): FeatherIconName {
  if (type === 'event') return 'calendar';
  if (type === 'xp') return 'zap';
  if (type === 'broadcast') return 'radio';
  if (type === 'reward') return 'award';
  return 'bell';
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AlertsScreen() {
  const api = useApi();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const data = await api.get<{ notifications: Notification[] }>('/api/notifications');
      setItems(data.notifications ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c4b5fd" size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor="#c4b5fd"
        />
      }
    >
      <Text style={styles.heading}>Alerts</Text>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="bell" size={48} color="#7a7060" />
          <Text style={styles.emptyText}>No alerts yet</Text>
        </View>
      ) : items.map(item => (
        <View key={item.id} style={[styles.row, !item.read && styles.rowUnread]}>
          <View style={styles.iconWrap}>
            <Feather name={typeIcon(item.type)} size={18} color={item.read ? '#7a7060' : '#c4b5fd'} />
          </View>
          <View style={styles.content}>
            <View style={styles.rowHeader}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
            </View>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        </View>
      ))}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111009' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111009' },
  heading: {
    color: '#f2efe8',
    fontSize: 24,
    fontWeight: '800',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { color: '#7a7060', fontSize: 15 },
  row: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#1a1810',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(242,239,232,0.08)',
    gap: 12,
  },
  rowUnread: { borderColor: '#c4b5fd' },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(196,181,253,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  content: { flex: 1 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  title: { color: '#f2efe8', fontWeight: '700', fontSize: 14, flex: 1, marginRight: 8 },
  time: { color: '#7a7060', fontSize: 11 },
  body: { color: '#a89f90', fontSize: 13, lineHeight: 18 },
});
