import { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useApi } from '@/lib/api';
import { useTheme } from '@/lib/theme-context';
import { AppText } from '@/components/kit';

type Share = { id: string; kind: string; amount: number | null; label: string | null; seen: boolean; from: { name: string } };
type Activity = { icon: string; headline: string; subtext?: string };
type Friend = { id: string; name: string; level?: number; status?: string | null };

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  checkin: 'user-check', xp: 'zap', placement: 'award', winner: 'award', new_event: 'calendar', broadcast: 'speaker',
};

// Floating friends button (web FriendsFab + FriendsMini): friend shares inbox, activity and friends list.
export function FriendsFabMobile() {
  const { isSignedIn } = useAuth();
  const api = useApi();
  const router = useRouter();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'activity' | 'friends'>('activity');
  const [activity, setActivity] = useState<Activity[] | null>(null);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [shares, setShares] = useState<Share[]>([]);
  const [unseen, setUnseen] = useState(0);

  const loadShares = useCallback(() => {
    api.get<{ shares: Share[]; unseen: number }>('/api/friend-shares')
      .then(d => { setShares(d.shares || []); setUnseen(d.unseen || 0); })
      .catch(() => {});
  }, []);

  useEffect(() => { if (isSignedIn) loadShares(); }, [isSignedIn]);

  useEffect(() => {
    if (!open) return;
    setActivity(null);
    api.get<{ activity: Activity[] }>('/api/friends-activity').then(d => setActivity(d.activity || [])).catch(() => setActivity([]));
    if (unseen > 0) {
      api.post('/api/friend-shares', { action: 'seen' }).then(() => setUnseen(0)).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (!open || tab !== 'friends' || friends !== null) return;
    api.get<{ friends: Friend[] }>('/api/community/friends').then(d => setFriends(d.friends || [])).catch(() => setFriends([]));
  }, [open, tab, friends]);

  if (!isSignedIn) return null;

  const pill = (id: 'activity' | 'friends', label: string) => (
    <Pressable key={id} onPress={() => setTab(id)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: tab === id ? colors.bgElevated : 'transparent' }}>
      <AppText variant="caption" tone={tab === id ? 'accent' : 'secondary'} style={{ fontWeight: '700' }}>{label}</AppText>
    </Pressable>
  );

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel="Friends"
        style={{ position: 'absolute', right: 16, bottom: Platform.OS === 'ios' ? 100 : 76, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}
      >
        <Feather name="users" size={22} color={colors.accentFg} />
        {unseen > 0 && <View style={{ position: 'absolute', right: -2, top: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.bgBase }} />}
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={{ maxHeight: '75%', minHeight: 320, backgroundColor: colors.bgSurface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <AppText variant="title">Friends</AppText>
              <Pressable onPress={() => setOpen(false)} accessibilityLabel="Close" hitSlop={10}>
                <Feather name="x" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView>
              {shares.length > 0 && (
                <View style={{ marginBottom: 12, gap: 8 }}>
                  <AppText variant="eyebrow" tone="tertiary">From friends</AppText>
                  {shares.slice(0, 3).map(s => (
                    <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgElevated, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
                      <AppText variant="body">{s.kind === 'gacha' ? '🎰' : '🎉'}</AppText>
                      <AppText variant="body" numberOfLines={2} style={{ flex: 1 }}>
                        <AppText variant="body" style={{ fontWeight: '800' }}>{s.from.name}</AppText> earned{' '}
                        <AppText variant="body" tone="accent" style={{ fontWeight: '800' }}>+{s.amount}</AppText> from {s.label}
                      </AppText>
                    </View>
                  ))}
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 4, marginBottom: 8 }}>{pill('activity', 'Activity')}{pill('friends', 'Friends')}</View>
              {tab === 'activity' ? (
                activity === null ? (
                  <AppText variant="caption" tone="tertiary" style={{ textAlign: 'center', paddingVertical: 24 }}>Loading…</AppText>
                ) : activity.length === 0 ? (
                  <AppText variant="caption" tone="tertiary" style={{ textAlign: 'center', paddingVertical: 24 }}>Add friends to see what they are playing.</AppText>
                ) : activity.slice(0, 6).map((f, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name={ICONS[f.icon] ?? 'star'} size={16} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="body" numberOfLines={1} style={{ fontWeight: '700' }}>{f.headline}</AppText>
                      {f.subtext ? <AppText variant="caption" tone="secondary" numberOfLines={1}>{f.subtext}</AppText> : null}
                    </View>
                  </View>
                ))
              ) : friends === null ? (
                <AppText variant="caption" tone="tertiary" style={{ textAlign: 'center', paddingVertical: 24 }}>Loading…</AppText>
              ) : friends.length === 0 ? (
                <AppText variant="caption" tone="tertiary" style={{ textAlign: 'center', paddingVertical: 24 }}>No friends yet. Find players in Community.</AppText>
              ) : friends.slice(0, 9).map(f => (
                <Pressable key={f.id} onPress={() => { setOpen(false); router.push('/(tabs)/community' as any); }} style={{ paddingVertical: 8 }}>
                  <AppText variant="body" numberOfLines={1} style={{ fontWeight: '700' }}>{f.name}</AppText>
                  <AppText variant="caption" tone="secondary" numberOfLines={1}>{f.status || (f.level ? `Level ${f.level}` : '')}</AppText>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
