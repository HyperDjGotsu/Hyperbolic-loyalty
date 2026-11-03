import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Alert, Image, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApi } from '@/lib/api';
import { useAlertsContext } from '@/lib/alerts-context';
import { useTheme } from '@/lib/theme-context';
import { API_BASE } from '@/lib/config';
import { AppText, Button, Skeleton } from '@/components/kit';

type Notification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  type: string;
  data?: { event_id?: string; image_url?: string; kind?: string } | null;
};

type FeatherIconName = 'calendar' | 'zap' | 'radio' | 'award' | 'bell' | 'star' | 'gift' | 'trending-up' | 'clock' | 'check-circle' | 'user-plus';

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
    case 'friend_request':
      return 'user-plus';
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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
      setItems(data.notifications ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function open(n: Notification) {
    if (!n.is_read) {
      setItems(prev => prev.map(x => (x.id === n.id ? { ...x, is_read: true } : x)));
      api.post('/api/notifications', { notificationIds: [n.id] }).then(refreshBadge).catch(() => {});
    }
    const d = n.data ?? {};
    // Same destination as a push tap: one event goes to its event page, anything else to the Events tab
    if (d.event_id && /^[a-zA-Z0-9-]{1,64}$/.test(d.event_id)) {
      router.push(`/event/${d.event_id}` as never);
    } else if (n.type.startsWith('event') || d.kind === 'morning') {
      router.push('/(tabs)/events' as never);
    } else if (n.type === 'friend_request' || n.type === 'leaderboard' || n.type === 'weekly_summary') {
      router.push('/(tabs)/community' as never);
    } else if (n.type === 'store' || n.type === 'spin_ready') {
      router.push((n.type === 'spin_ready' ? '/(tabs)' : '/(tabs)/prize-wall') as never);
    } else {
      router.push('/(tabs)/profile' as never);
    }
  }

  async function markAllRead() {
    setItems(prev => prev.map(x => ({ ...x, is_read: true })));
    api.post('/api/notifications', { markAll: true }).then(refreshBadge).catch(() => {});
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

  function clearAll() {
    if (clearing || items.length === 0) return;
    Alert.alert('Clear all alerts', 'This will permanently delete all your alerts.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: async () => {
          setClearing(true);
          try {
            await api.delete('/api/notifications');
            setItems([]);
            refreshBadge();
          } catch {
            Alert.alert('Error', 'Could not clear alerts. Try again.');
          } finally {
            setClearing(false);
          }
        },
      },
    ]);
  }

  useEffect(() => { load(); }, []);

  const unread = items.filter(i => !i.is_read).length;
  const thumb = (n: Notification) => {
    const u = n.data?.image_url;
    return u ? (u.startsWith('http') ? u : `${API_BASE}${u}`) : null;
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgBase }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
    >
      <View style={{ paddingTop: insets.top + 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <AppText variant="display">Alerts</AppText>
          <AppText variant="caption" tone="secondary">{unread > 0 ? `${unread} unread` : 'You are all caught up'}</AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          {unread > 0 && (
            <Pressable onPress={markAllRead} hitSlop={8}><AppText variant="caption" tone="accent" style={{ fontWeight: '700' }}>Mark all read</AppText></Pressable>
          )}
          {items.length > 0 && (
            <Pressable onPress={clearAll} disabled={clearing} hitSlop={8}><AppText variant="caption" tone="tertiary" style={{ fontWeight: '700' }}>{clearing ? 'Clearing…' : 'Clear all'}</AppText></Pressable>
          )}
        </View>
      </View>

      {friendRequests.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <AppText variant="eyebrow" tone="tertiary" style={{ marginBottom: 8 }}>Friend requests</AppText>
          {friendRequests.map(req => (
            <View key={req.friendshipId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginBottom: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.bgSurface }}>
              <View style={{ flex: 1 }}>
                <AppText variant="body" style={{ fontWeight: '700' }}>{req.name}</AppText>
                <AppText variant="caption" tone="tertiary">{req.timestamp}</AppText>
              </View>
              <Button label="Accept" disabled={respondingTo === req.friendshipId} onPress={() => respondToRequest(req.friendshipId, 'accept')} style={{ paddingVertical: 8, paddingHorizontal: 14 }} />
              <Button label="✗" variant="secondary" disabled={respondingTo === req.friendshipId} onPress={() => respondToRequest(req.friendshipId, 'decline')} style={{ paddingVertical: 8, paddingHorizontal: 14 }} />
            </View>
          ))}
        </View>
      )}

      <View style={{ marginTop: 16, gap: 8 }}>
        {loading ? (
          [0, 1, 2, 3].map(i => <Skeleton key={i} height={76} radius={20} />)
        ) : error ? (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
            <Feather name="bell-off" size={40} color={colors.textTertiary} />
            <AppText variant="body" tone="secondary">Could not load alerts</AppText>
            <Button label="Retry" onPress={() => { setLoading(true); void load(); }} style={{ paddingHorizontal: 32 }} />
          </View>
        ) : items.length === 0 && friendRequests.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 8 }}>
            <Feather name="bell" size={40} color={colors.textTertiary} />
            <AppText variant="title">No alerts yet</AppText>
            <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>Event reminders, rewards and friend news show up here.</AppText>
          </View>
        ) : (
          items.map(item => {
            const img = thumb(item);
            return (
              <Pressable
                key={item.id}
                onPress={() => open(item)}
                style={({ pressed }) => [{
                  flexDirection: 'row', gap: 12, padding: 12, borderRadius: 20, borderWidth: 1,
                  backgroundColor: colors.bgSurface,
                  borderColor: item.is_read ? colors.border : colors.accent,
                  opacity: pressed ? 0.85 : 1,
                }]}
              >
                {img ? (
                  <Image source={{ uri: img }} style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.bgElevated }} />
                ) : (
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name={typeIcon(item.type)} size={20} color={item.is_read ? colors.textTertiary : colors.accent} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <AppText variant="body" numberOfLines={1} style={{ fontWeight: '700', flex: 1 }}>{item.title}</AppText>
                    <AppText variant="caption" tone="tertiary">{timeAgo(item.created_at)}</AppText>
                  </View>
                  <AppText variant="caption" tone="secondary" style={{ marginTop: 2, lineHeight: 18, fontSize: 13 }}>{item.message}</AppText>
                </View>
                {!item.is_read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginTop: 6 }} />}
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
