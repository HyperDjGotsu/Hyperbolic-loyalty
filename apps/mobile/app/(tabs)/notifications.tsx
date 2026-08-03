import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useApi } from '@/lib/api';

type Notification = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
  type: string;
};

export default function NotificationsScreen() {
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

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function typeIcon(type: string) {
    if (type === 'event') return '📅';
    if (type === 'xp') return '⚡';
    if (type === 'broadcast') return '📢';
    if (type === 'reward') return '🏆';
    return '🔔';
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#a78bfa" size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#a78bfa" />}
    >
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : items.map(item => (
        <View key={item.id} style={[styles.row, !item.read && styles.rowUnread]}>
          <Text style={styles.icon}>{typeIcon(item.type)}</Text>
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
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0f' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#4b5563', fontSize: 15 },
  row: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#16161f',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2d2d3d',
    gap: 12,
  },
  rowUnread: { borderColor: '#7c3aed' },
  icon: { fontSize: 24, marginTop: 2 },
  content: { flex: 1 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  title: { color: '#fff', fontWeight: '700', fontSize: 14, flex: 1, marginRight: 8 },
  time: { color: '#4b5563', fontSize: 11 },
  body: { color: '#9ca3af', fontSize: 13, lineHeight: 18 },
});
