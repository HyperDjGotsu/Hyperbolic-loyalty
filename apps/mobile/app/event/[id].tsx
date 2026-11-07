import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApi } from '@/lib/api';
import { isSafeEventId } from '@/lib/checkin';
import { useTheme } from '@/lib/theme-context';
import { AppText, Button, Card, Skeleton } from '@/components/kit';
import { EventCover } from '@/components/EventCover';
import { ShareEventSheet } from '@/components/ShareEventSheet';

type EventDetail = {
  id: string;
  name: string;
  description: string | null;
  date: string;
  time: string;
  scheduledAt: string;
  endsAt: string | null;
  status: string;
  storeId: string | null;
  imageUrl: string | null;
  game: { id: string; name: string; icon: string; color: string } | null;
  entryFee: string;
  isFree: boolean;
  maxSpots: number | null;
  hasStream: boolean;
  twitchUrl: string | null;
  youtubeUrl: string | null;
  interestedCount: number;
  attendanceXp: number;
  winXp: number;
  prizing: string[] | null;
  location: string;
  address: string;
};

const PRIZES: Record<string, { icon: string; title: string; desc: string }> = {
  'pack-per-win': { icon: '🎁', title: 'Pack Per Win', desc: 'Win a booster pack for each match victory' },
  packperwin: { icon: '🎁', title: 'Pack Per Win', desc: 'Win a booster pack for each match victory' },
  '1-3-5': { icon: '🏆', title: '1-3-5 Packs', desc: '1 win = 1 pack • 2 wins = 3 packs • 3 wins = 5 packs' },
  promo: { icon: '🌟', title: 'Promo Card', desc: 'All participants receive a promo card (while supplies last)' },
};

function httpUrl(u: string | null): string | null {
  return u && /^https?:\/\//i.test(u) ? u : null;
}

export default function EventDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = isSafeEventId(rawId) ? rawId : null;
  const router = useRouter();
  const api = useApi();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [interested, setInterested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    try {
      const data = await api.get<{ event: EventDetail }>(`/api/events/${id}/public`);
      setEvent(data.event);
    } catch {
      setEvent(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    api.get<{ interested: boolean }>(`/api/events/interest?eventId=${encodeURIComponent(id)}`)
      .then(d => setInterested(!!d.interested))
      .catch(() => {});
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  }

  async function toggleInterest() {
    if (!event || busy) return;
    setBusy(true);
    try {
      const res = await api.post<{ interested: boolean }>('/api/events/interest', { eventId: event.id });
      setInterested(res.interested);
      setEvent(e => (e ? { ...e, interestedCount: Math.max(0, e.interestedCount + (res.interested ? 1 : -1)) } : e));
      if (res.interested) flash('Marked interested');
    } catch {
      flash('Could not update. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function openMaps(address: string) {
    const q = encodeURIComponent(address);
    void Linking.openURL(Platform.OS === 'ios' ? `http://maps.apple.com/?q=${q}` : `geo:0,0?q=${q}`).catch(() => {});
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
        <Skeleton height={230} radius={0} />
        <View style={{ padding: 16, gap: 12 }}><Skeleton height={90} radius={16} /><Skeleton height={90} radius={16} /></View>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <AppText variant="title">Event not found</AppText>
        <AppText variant="body" tone="secondary">It may have been removed.</AppText>
        <Button label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/events' as never))} style={{ paddingHorizontal: 32 }} />
      </View>
    );
  }

  const startsAt = new Date(event.scheduledAt).getTime();
  const endedByTime = Date.now() > (event.endsAt ? new Date(event.endsAt).getTime() : startsAt + 4 * 60 * 60 * 1000);
  const isLive = event.status === 'active';
  const cancelled = event.status === 'cancelled';
  const isEnded = event.status === 'completed' || cancelled || (!isLive && endedByTime);
  const twitch = httpUrl(event.twitchUrl);
  const youtube = httpUrl(event.youtubeUrl);
  const where = [event.location, event.address].filter(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 150 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accent} />}
      >
        <EventCover src={event.imageUrl} gameId={event.game?.id} storeId={event.storeId} color={event.game?.color} style={{ height: 250, justifyContent: 'flex-end', padding: 20 }}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/events' as never))}
            accessibilityLabel="Back"
            style={[styles.back, { top: insets.top + 8 }]}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
            {isLive ? (
              <View style={[styles.pill, { backgroundColor: '#ef4444' }]}><AppText variant="caption" style={styles.pillText}>LIVE NOW</AppText></View>
            ) : cancelled ? (
              <View style={[styles.pill, { backgroundColor: 'rgba(0,0,0,0.55)' }]}><AppText variant="caption" style={styles.pillText}>CANCELLED</AppText></View>
            ) : isEnded ? (
              <View style={[styles.pill, { backgroundColor: 'rgba(0,0,0,0.55)' }]}><AppText variant="caption" style={styles.pillText}>ENDED</AppText></View>
            ) : (
              <View style={[styles.pill, { backgroundColor: '#facc15' }]}><AppText variant="caption" style={[styles.pillText, { color: '#000' }]}>UPCOMING</AppText></View>
            )}
            <View style={[styles.pill, { backgroundColor: event.isFree ? '#16a34a' : 'rgba(0,0,0,0.55)' }]}>
              <AppText variant="caption" style={styles.pillText}>{event.isFree ? 'FREE' : event.entryFee}</AppText>
            </View>
          </View>
          {event.game && <AppText variant="eyebrow" style={{ color: 'rgba(255,255,255,0.8)' }}>{event.game.icon} {event.game.name}</AppText>}
          <AppText variant="display" style={{ color: '#fff', fontSize: 28, lineHeight: 32 }}>{event.name}</AppText>
        </EventCover>

        <View style={{ padding: 16, gap: 12 }}>
          <Card style={{ gap: 10 }}>
            <InfoRow icon="calendar" text={`${event.date} · ${event.time}`} />
            {where.length > 0 && (
              <Pressable onPress={() => event.address && openMaps(event.address)} disabled={!event.address} accessibilityRole={event.address ? 'link' : undefined}>
                <InfoRow icon="map-pin" text={where.join(' · ')} accent={!!event.address} />
              </Pressable>
            )}
            {event.maxSpots ? <InfoRow icon="users" text={`${event.maxSpots} spots max`} /> : null}
            {event.interestedCount > 0 ? <InfoRow icon="star" text={`${event.interestedCount} interested`} /> : null}
          </Card>

          <Card>
            <AppText variant="eyebrow" tone="tertiary" style={{ marginBottom: 10 }}>XP rewards</AppText>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}><AppText variant="numeral" tone="accent">+{event.attendanceXp}</AppText><AppText variant="caption" tone="secondary">Attendance</AppText></View>
              <View style={{ alignItems: 'center' }}><AppText variant="numeral" tone="accent">+{event.winXp}</AppText><AppText variant="caption" tone="secondary">Per win</AppText></View>
            </View>
          </Card>

          {event.prizing && event.prizing.length > 0 && (
            <Card style={{ gap: 10 }}>
              <AppText variant="eyebrow" tone="tertiary">Prizes</AppText>
              {event.prizing.map((p, i) => {
                const info = PRIZES[p.toLowerCase().replace(/\s+/g, '')] ?? { icon: '🎁', title: p, desc: '' };
                return (
                  <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                    <AppText style={{ fontSize: 22 }}>{info.icon}</AppText>
                    <View style={{ flex: 1 }}>
                      <AppText variant="body" style={{ fontWeight: '600' }}>{info.title}</AppText>
                      {info.desc ? <AppText variant="caption" tone="secondary">{info.desc}</AppText> : null}
                    </View>
                  </View>
                );
              })}
            </Card>
          )}

          {event.description ? (
            <Card>
              <AppText variant="eyebrow" tone="tertiary" style={{ marginBottom: 6 }}>About this event</AppText>
              <AppText variant="body" tone="secondary">{event.description}</AppText>
            </Card>
          ) : null}

          {event.hasStream && (twitch || youtube) && (
            <Card>
              <AppText variant="body" style={{ fontWeight: '700' }}>Watch live</AppText>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {twitch && <Button label="Twitch" variant="secondary" onPress={() => Linking.openURL(twitch)} style={{ flex: 1, paddingVertical: 10 }} />}
                {youtube && <Button label="YouTube" variant="secondary" onPress={() => Linking.openURL(youtube)} style={{ flex: 1, paddingVertical: 10 }} />}
              </View>
            </Card>
          )}
        </View>
      </ScrollView>

      {toast ? (
        <View pointerEvents="none" style={[styles.toastWrap, { bottom: insets.bottom + 140 }]}>
          <View style={[styles.toast, { backgroundColor: colors.bgSurface, borderColor: colors.border }]}><AppText variant="caption">{toast}</AppText></View>
        </View>
      ) : null}

      <View style={[styles.actions, { backgroundColor: colors.bgBase, borderColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
        {isLive ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Scan QR to Check In" onPress={() => router.push(`/checkin/${event.id}` as never)} style={{ flex: 1 }} />
          </View>
        ) : (
          <AppText variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
            {cancelled ? 'This event was cancelled.' : isEnded ? 'This event has ended. Check-in is closed.' : 'Check-in opens when staff start the event.'}
          </AppText>
        )}
        {!isEnded && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              label={interested ? '✓ Interested' : "I'm interested"}
              variant={interested ? 'secondary' : isLive ? 'secondary' : 'primary'}
              onPress={toggleInterest}
              loading={busy}
              style={{ flex: 2 }}
            />
            <Button label="Share" variant="secondary" onPress={() => setShare(true)} style={{ flex: 1 }} />
          </View>
        )}
        {isEnded && <Button label="Share" variant="secondary" onPress={() => setShare(true)} />}
      </View>

      {share && (
        <ShareEventSheet
          event={{ id: event.id, name: event.name, date: event.date, time: event.time }}
          onClose={() => setShare(false)}
          onDone={m => { setShare(false); flash(m); }}
        />
      )}
    </View>
  );
}

function InfoRow({ icon, text, accent }: { icon: React.ComponentProps<typeof Feather>['name']; text: string; accent?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <Feather name={icon} size={16} color={accent ? colors.accent : colors.textSecondary} style={{ marginTop: 2 }} />
      <AppText variant="body" tone={accent ? 'accent' : 'secondary'} style={{ flex: 1 }}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  back: { position: 'absolute', left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  actions: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
});
