import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Alert,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApi } from '@/lib/api';
import { useAlertsContext } from '@/lib/alerts-context';

type Notification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type: string;
};

type FeatherIconName = 'calendar' | 'zap' | 'radio' | 'award' | 'bell' | 'star' | 'gift' | 'trending-up' | 'clock' | 'check-circle';

function typeIcon(type: string): FeatherIconName {
  switch (type) {
    case 'event':
    case 'event_share':
    case 'event_announced':
    case 'event_reminder':
    case 'event_recap':
      return 'calendar';
    case 'xp':
    case 'xp_earned':
      return 'zap';
    case 'broadcast':
    case 'store':
      return 'radio';
    case 'reward':
    case 'achievement':
      return 'award';
    case 'referral':
      return 'gift';
    case 'leaderboard':
    case 'weekly_summary':
      return 'trending-up';
    case 'spin_ready':
      return 'star';
    case 'pass_expiring':
      return 'clock';
    default:
      return 'bell';
  }
}

function timeAgo(iso: string) {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AlertsScreen() {
  const api = useApi();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState(false);
  const storeIdRef = useRef<string | null>(null);
  const { friendRequests, removeFriendRequest, refreshBadge } = useAlertsContext();
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  async function load() {
    setError(false);
    try {
      if (!storeIdRef.current) {
        const player = await api.get<{ homeStore?: { id: string } | null }>('/api/player/by-clerk');
        storeIdRef.current = player.homeStore?.id ?? null;
      }
      const storeParam = storeIdRef.current ? `?store_id=${storeIdRef.current}` : '';
      const data = await api.get<{ notifications: Notification[] }>(`/api/notifications${storeParam}`);
      const notifications = data.notifications ?? [];
      // Optimistically mark all read in local state before the API call resolves
      if (notifications.some(n => !n.is_read)) {
        setItems(notifications.map(n => ({ ...n, is_read: true })));
        api.post('/api/notifications', { markAll: true }).catch(() => {});
        refreshBadge();
      } else {
        setItems(notifications);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function respondToRequest(friendshipId: string, action: 'accept' | 'decline') {
    if (respondingTo) return;
    setRespondingTo(friendshipId);
    try {
      await api.post('/api/community/respond-request', { friendshipId, action });
      removeFriendRequest(friendshipId);
    } catch {
      // keep the card visible so the user can retry
    } finally {
      setRespondingTo(null);
    }
  }

  async function clearAll() {
    if (clearing || items.length === 0) return;
    Alert.alert(
      'Clear All Alerts',
      'This will permanently delete all your alerts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              await api.delete('/api/notifications');
              setItems([]);
            } catch {
              Alert.alert('Error', 'Could not clear alerts. Try again.');
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
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
      <View style={[styles.headingRow, { marginTop: insets.top + 8 }]}>
        <Text style={styles.heading}>Alerts</Text>
        {items.length > 0 && (
          <Pressable
            style={[styles.clearBtn, clearing && styles.clearBtnDisabled]}
            onPress={clearAll}
            disabled={clearing}
          >
            <Text style={styles.clearBtnText}>{clearing ? 'Clearing…' : 'Clear All'}</Text>
          </Pressable>
        )}
      </View>
      {friendRequests.length > 0 && (
        <View style={styles.friendSection}>
          <Text style={styles.friendSectionTitle}>👥 Friend Requests</Text>
          {friendRequests.map(req => (
            <View key={req.friendshipId} style={styles.friendCard}>
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{req.name}</Text>
                <Text style={styles.friendTime}>{req.timestamp}</Text>
              </View>
              <Pressable
                disabled={respondingTo === req.friendshipId}
                style={[styles.friendBtn, styles.acceptBtn]}
                onPress={() => respondToRequest(req.friendshipId, 'accept')}
              >
                <Text style={styles.friendBtnText}>✓ Accept</Text>
              </Pressable>
              <Pressable
                disabled={respondingTo === req.friendshipId}
                style={[styles.friendBtn, styles.declineBtn]}
                onPress={() => respondToRequest(req.friendshipId, 'decline')}
              >
                <Text style={[styles.friendBtnText, { color: '#7a7060' }]}>✗</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
      {error ? (
        <View style={styles.empty}>
          <Feather name="bell" size={48} color="#7a7060" />
          <Text style={styles.emptyText}>Could not load alerts</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => { setLoading(true); void load(); }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : items.length === 0 && friendRequests.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="bell" size={48} color="#7a7060" />
          <Text style={styles.emptyText}>No alerts yet</Text>
        </View>
      ) : items.length === 0 ? null : items.map(item => (
        <View key={item.id} style={[styles.row, !item.is_read && styles.rowUnread]}>
          <View style={styles.iconWrap}>
            <Feather name={typeIcon(item.type)} size={18} color={item.is_read ? '#7a7060' : '#c4b5fd'} />
          </View>
          <View style={styles.content}>
            <View style={styles.rowHeader}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
            </View>
            <Text style={styles.body}>{item.message}</Text>
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
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  heading: {
    color: '#f2efe8',
    fontSize: 24,
    fontWeight: '800',
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  clearBtnDisabled: { opacity: 0.5 },
  clearBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { color: '#7a7060', fontSize: 15 },
  retryBtn: {
    backgroundColor: 'rgba(196,181,253,0.12)',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.25)',
  },
  retryText: { color: '#c4b5fd', fontWeight: '700', fontSize: 13 },
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
  friendSection: { marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
  friendSectionTitle: { color: '#f2efe8', fontWeight: '800', fontSize: 14, marginBottom: 8 },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1810',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c4b5fd',
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  friendInfo: { flex: 1 },
  friendName: { color: '#f2efe8', fontWeight: '700', fontSize: 14 },
  friendTime: { color: '#7a7060', fontSize: 11, marginTop: 2 },
  friendBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: { backgroundColor: 'rgba(196,181,253,0.15)', borderWidth: 1, borderColor: '#c4b5fd' },
  declineBtn: { backgroundColor: 'rgba(242,239,232,0.06)', borderWidth: 1, borderColor: 'rgba(242,239,232,0.12)' },
  friendBtnText: { color: '#c4b5fd', fontWeight: '700', fontSize: 13 },
});
