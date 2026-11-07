import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApi } from '@/lib/api';
import { useTheme } from '@/lib/theme-context';
import { useSelectedStoreId } from '@/lib/selected-store';
import { SELECTABLE_GAMES } from '@/lib/games';
import { AppText, Button, Skeleton } from '@/components/kit';
import { EventCover } from '@/components/EventCover';
import { ShareEventSheet } from '@/components/ShareEventSheet';

type Game = { id: string; name: string; icon: string; color: string };
type Friend = { id: string; name: string };
type CalendarEvent = {
  id: string;
  name: string;
  description: string | null;
  date: string;
  time: string;
  scheduledAt: string;
  game: Game | null;
  imageUrl?: string | null;
  storeId?: string | null;
  maxSpots: number | null;
  entryFee: string;
  isFree: boolean;
  passFreeEntry: boolean;
  attendanceXp: number;
  winXp: number;
  interestedCount: number;
  checkedInCount: number;
  isInterested: boolean;
  interestedFriends: Friend[];
  isStartingSoon: boolean;
  isLive: boolean;
  hasStream: boolean;
  twitchUrl: string | null;
  youtubeUrl: string | null;
  prizing: string[] | null;
};

const SHORT: Record<string, string> = {
  mtg: 'Magic', star_wars_unlimited: 'Star Wars', sw_legion: 'Legion', union_arena: 'Union Arena',
  blood_bowl: 'Blood Bowl', bolt_action: 'Bolt Action',
};
const GAME_FILTERS = [
  { id: 'all', name: 'All Games', icon: '🎮' },
  ...SELECTABLE_GAMES.map(g => ({ id: g.id, name: SHORT[g.id] ?? g.name, icon: g.icon })),
  { id: 'board_games', name: 'Board Games', icon: '🎲' },
];

const PRIZES: Record<string, { title: string; desc: string }> = {
  'pack-per-win': { title: 'Pack Per Win', desc: 'Win a booster pack for each match victory' },
  packperwin: { title: 'Pack Per Win', desc: 'Win a booster pack for each match victory' },
  '1-3-5': { title: '1-3-5 Packs', desc: '1 win = 1 pack • 2 wins = 3 packs • 3 wins = 5 packs' },
  promo: { title: 'Promo Card', desc: 'All participants receive a promo card' },
};

function Counts({ interested, checkedIn, light }: { interested: number; checkedIn: number; light?: boolean }) {
  const { colors } = useTheme();
  if (interested <= 0 && checkedIn <= 0) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
      {checkedIn > 0 && <AppText variant="caption" style={{ color: '#34d399' }}>{checkedIn} checked in</AppText>}
      {interested > 0 && <AppText variant="caption" style={{ color: light ? '#ffffff' : colors.accent }}>★ {interested} interested</AppText>}
    </View>
  );
}

export default function EventsScreen() {
  const api = useApi();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { event: openId } = useLocalSearchParams<{ event?: string }>();

  const [scope, setScope] = useState<'store' | 'network'>('store');
  const [game, setGame] = useState('all');
  const [homeStoreId, setHomeStoreId] = useState<string | null>(null);
  const [selectedStoreId] = useSelectedStoreId();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [special, setSpecial] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [shareFor, setShareFor] = useState<CalendarEvent | null>(null);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const seq = useRef(0);
  const opened = useRef<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    const mine = ++seq.current;
    if (!quiet) setError('');
    try {
      let storeId = selectedStoreId ?? homeStoreId;
      if (scope === 'store' && !storeId) {
        const me = await api.get<{ homeStore?: { id: string } | null }>('/api/player/by-clerk');
        storeId = me.homeStore?.id ?? null;
        if (storeId) setHomeStoreId(storeId);
      }
      if (scope === 'store' && !storeId) throw new Error('no store');
      const scopeQs = scope === 'network' ? '&network=true' : `&store_id=${storeId}`;
      const [all, sp] = await Promise.all([
        api.get<{ events: CalendarEvent[] }>(`/api/events?status=upcoming&limit=50${scopeQs}`),
        api.get<{ events: CalendarEvent[] }>(`/api/events?status=upcoming&special=true&limit=5${scopeQs}`).catch(() => ({ events: [] as CalendarEvent[] })),
      ]);
      if (mine !== seq.current) return;
      setEvents(all.events ?? []);
      setSpecial(sp.events ?? []);
    } catch (e) {
      if (mine !== seq.current) return;
      if (!quiet) { setEvents([]); setSpecial([]); setError(e instanceof Error && e.message === 'no store' ? 'Pick a home store in Profile to see its events, or try Network.' : 'Could not load events.'); }
    } finally {
      if (mine === seq.current) { setLoading(false); setRefreshing(false); }
    }
  }, [api, scope, selectedStoreId, homeStoreId]);

  useEffect(() => { setLoading(true); void load(); }, [scope, selectedStoreId]);

  // Quiet refresh so "Starting soon" cards move to "Live now" on their own
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    const t = setInterval(() => { void loadRef.current(true); }, 60000);
    return () => clearInterval(t);
  }, []);

  // Open one event by id (push tap or link): /(tabs)/events?event=<id>
  useEffect(() => {
    if (!openId || opened.current === openId) return;
    const hit = events.find(e => e.id === openId) ?? special.find(e => e.id === openId);
    if (hit) { opened.current = openId; setSelected(hit); }
  }, [openId, events, special]);

  const visible = useMemo(() => (game === 'all' ? events : events.filter(e => e.game?.id === game)), [events, game]);
  const live = visible.filter(e => e.isLive);
  const soon = visible.filter(e => e.isStartingSoon && !e.isLive);
  const spotlight = new Set([...live, ...soon].map(e => e.id));
  const groups = useMemo(() => {
    const out: Array<[string, CalendarEvent[]]> = [];
    for (const e of visible) {
      if (spotlight.has(e.id)) continue;
      const g = out.find(x => x[0] === e.date);
      if (g) g[1].push(e); else out.push([e.date, [e]]);
    }
    return out;
  }, [visible]);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  }

  async function toggleInterest(ev: CalendarEvent) {
    setBusy(ev.id);
    try {
      await api.post('/api/events/interest', { eventId: ev.id });
      const flip = (e: CalendarEvent) => e.id !== ev.id ? e
        : { ...e, isInterested: !e.isInterested, interestedCount: e.interestedCount + (e.isInterested ? -1 : 1) };
      setEvents(p => p.map(flip));
      setSpecial(p => p.map(flip));
      setSelected(p => (p ? flip(p) : p));
      if (!ev.isInterested) flash('Marked interested');
    } catch {
      flash('Could not update. Try again.');
    } finally {
      setBusy(null);
    }
  }

  const star = (ev: CalendarEvent, onDark = false) => (
    <Pressable
      onPress={() => toggleInterest(ev)}
      disabled={busy === ev.id}
      hitSlop={6}
      accessibilityLabel={ev.isInterested ? 'Remove interest' : 'Mark interested'}
      style={[styles.star, { backgroundColor: ev.isInterested ? colors.accent : onDark ? 'rgba(0,0,0,0.5)' : colors.bgElevated }]}
    >
      <Feather name="star" size={18} color={ev.isInterested ? colors.accentFg : onDark ? '#fff' : colors.textSecondary} />
    </Pressable>
  );

  const spotlightCard = (ev: CalendarEvent, wide: boolean) => (
    <Pressable key={ev.id} onPress={() => setSelected(ev)} style={[styles.spot, { width: wide ? '85%' : '100%', borderColor: ev.isLive ? 'rgba(239,68,68,0.5)' : 'rgba(234,179,8,0.5)' }]}>
      <EventCover src={ev.imageUrl} gameId={ev.game?.id} storeId={ev.storeId} color={ev.game?.color} style={{ height: 170 }}>
        <View style={styles.badges}>
          {ev.isLive && <View style={[styles.pill, { backgroundColor: '#ef4444' }]}><AppText variant="caption" style={styles.pillText}>LIVE</AppText></View>}
          {ev.isStartingSoon && !ev.isLive && <View style={[styles.pill, { backgroundColor: '#facc15' }]}><AppText variant="caption" style={[styles.pillText, { color: '#000' }]}>STARTING SOON</AppText></View>}
        </View>
        <View style={styles.topRight}>
          <View style={[styles.pill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}><AppText variant="caption" style={styles.pillText}>{ev.entryFee}</AppText></View>
          {star(ev, true)}
        </View>
        <View style={styles.spotBottom}>
          <AppText variant="eyebrow" style={{ color: 'rgba(255,255,255,0.75)' }}>{ev.time}{ev.game?.name ? ` · ${ev.game.name}` : ''}</AppText>
          <AppText variant="title" numberOfLines={2} style={{ color: '#fff' }}>{ev.name}</AppText>
          <Counts interested={ev.interestedCount} checkedIn={ev.checkedInCount} light />
        </View>
      </EventCover>
    </Pressable>
  );

  const row = (ev: CalendarEvent) => (
    <Pressable key={ev.id} onPress={() => setSelected(ev)} style={[styles.row, { backgroundColor: colors.bgSurface, borderColor: colors.border }]}>
      <EventCover src={ev.imageUrl} gameId={ev.game?.id} storeId={ev.storeId} color={ev.game?.color} style={styles.thumb} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" numberOfLines={1} style={{ fontWeight: '700' }}>{ev.name}</AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>{ev.time}{ev.game?.name ? ` · ${ev.game.name}` : ''}</AppText>
        <Counts interested={ev.interestedCount} checkedIn={ev.checkedInCount} />
      </View>
      <AppText variant="caption" tone={ev.isFree ? 'accent' : 'primary'} style={{ fontWeight: '700' }}>{ev.entryFee}</AppText>
      {star(ev)}
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16 }}>
        <AppText variant="display">Events</AppText>
        <AppText variant="caption" tone="secondary">Games, tournaments & meetups</AppText>
        <View style={[styles.seg, { backgroundColor: colors.bgElevated }]}>
          {(['store', 'network'] as const).map(s => (
            <Pressable key={s} onPress={() => scope !== s && setScope(s)} style={[styles.segBtn, scope === s && { backgroundColor: colors.bgSurface }]}>
              <AppText variant="caption" tone={scope === s ? 'primary' : 'tertiary'} style={{ fontWeight: '700', fontSize: 14 }}>{s === 'store' ? 'My Store' : 'Network'}</AppText>
            </Pressable>
          ))}
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.chips}>
        {GAME_FILTERS.map(g => (
          <Pressable key={g.id} onPress={() => setGame(g.id)} style={[styles.chip, { backgroundColor: game === g.id ? colors.accent : colors.bgElevated }]}>
            <AppText variant="caption" style={{ color: game === g.id ? colors.accentFg : colors.textSecondary, fontSize: 14 }}>{g.icon} {g.name}</AppText>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.accent} />}
      >
        {loading ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={170} radius={26} />
            <Skeleton height={76} radius={20} />
            <Skeleton height={76} radius={20} />
          </View>
        ) : error ? (
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 48 }}>
            <AppText variant="body" tone="secondary">{error}</AppText>
            <Button label="Retry" onPress={() => { setLoading(true); void load(); }} style={{ paddingHorizontal: 32 }} />
          </View>
        ) : (
          <>
            {special.length > 0 && (
              <View>
                <AppText variant="title" style={{ marginBottom: 12 }}>Special events</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                  {special.map(ev => (
                    <Pressable key={ev.id} onPress={() => setSelected(ev)} style={[styles.spot, { width: 280, borderColor: colors.border }]}>
                      <EventCover src={ev.imageUrl} gameId={ev.game?.id} storeId={ev.storeId} color={ev.game?.color} style={{ height: 140, justifyContent: 'flex-end', padding: 14 }}>
                        <AppText variant="eyebrow" style={{ color: 'rgba(255,255,255,0.75)' }}>{ev.date} · {ev.time}</AppText>
                        <AppText variant="title" numberOfLines={2} style={{ color: '#fff' }}>{ev.name}</AppText>
                      </EventCover>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {visible.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 48, gap: 6 }}>
                <Feather name="calendar" size={32} color={colors.textTertiary} />
                <AppText variant="title">No upcoming events</AppText>
                <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
                  {game !== 'all' ? 'Try All Games to see more events.' : scope === 'network' ? 'No network events scheduled yet.' : 'Nothing scheduled at your store yet.'}
                </AppText>
              </View>
            ) : (
              <>
                {live.length > 0 && (
                  <View>
                    <AppText variant="title" style={{ marginBottom: 12 }}>● Live now</AppText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }} snapToAlignment="center">
                      {live.map(e => spotlightCard(e, live.length > 1))}
                    </ScrollView>
                  </View>
                )}
                {soon.length > 0 && (
                  <View>
                    <AppText variant="title" style={{ marginBottom: 12 }}>Starting soon <AppText variant="caption" tone="secondary">next 2 hours</AppText></AppText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                      {soon.map(e => spotlightCard(e, soon.length > 1))}
                    </ScrollView>
                  </View>
                )}
                {groups.map(([date, list]) => (
                  <View key={date}>
                    <AppText variant="title" style={{ marginBottom: 12 }}>{date}</AppText>
                    <View style={{ gap: 8 }}>{list.map(row)}</View>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {toast ? (
        <View pointerEvents="none" style={styles.toastWrap}>
          <View style={[styles.toast, { backgroundColor: colors.bgSurface, borderColor: colors.border }]}>
            <AppText variant="caption">{toast}</AppText>
          </View>
        </View>
      ) : null}

      {selected && (
        <Modal transparent animationType="slide" onRequestClose={() => setSelected(null)}>
          <Pressable style={styles.backdrop} onPress={() => setSelected(null)} />
          <View style={[styles.sheet, { backgroundColor: colors.bgSurface }]}>
            <ScrollView>
              <EventCover src={selected.imageUrl} gameId={selected.game?.id} storeId={selected.storeId} color={selected.game?.color} style={{ height: 210, justifyContent: 'flex-end', padding: 20 }}>
                <Pressable onPress={() => setSelected(null)} accessibilityLabel="Close" style={styles.close}><Feather name="x" size={20} color="#fff" /></Pressable>
                {selected.isLive && <View style={[styles.pill, { backgroundColor: '#ef4444', alignSelf: 'flex-start', marginBottom: 6 }]}><AppText variant="caption" style={styles.pillText}>LIVE NOW</AppText></View>}
                <AppText variant="eyebrow" style={{ color: 'rgba(255,255,255,0.75)' }}>{selected.game?.name ?? 'General'}</AppText>
                <AppText variant="display" style={{ color: '#fff', fontSize: 26, lineHeight: 30 }}>{selected.name}</AppText>
              </EventCover>
              <View style={{ padding: 16, gap: 12 }}>
                <Box><AppText variant="body" style={{ fontWeight: '700' }}>{selected.date}</AppText><AppText variant="body" tone="secondary">{selected.time}</AppText></Box>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Box style={{ flex: 1, alignItems: 'center' }}>
                    <AppText variant="caption" tone="secondary">Entry fee</AppText>
                    <AppText variant="numeral">{selected.entryFee}</AppText>
                    {selected.passFreeEntry && <AppText variant="caption" style={{ color: '#facc15' }}>Free with Pass</AppText>}
                  </Box>
                  <Box style={{ flex: 1, alignItems: 'center' }}>
                    <AppText variant="caption" tone="secondary">Capacity</AppText>
                    <AppText variant="numeral">{selected.maxSpots ?? 'Open'}</AppText>
                  </Box>
                </View>
                {(selected.interestedCount > 0 || selected.checkedInCount > 0) && (
                  <Box>
                    <Counts interested={selected.interestedCount} checkedIn={selected.checkedInCount} />
                    {selected.interestedFriends?.length > 0 && (
                      <AppText variant="caption" tone="secondary" style={{ marginTop: 6 }}>Friends: {selected.interestedFriends.map(f => f.name).join(', ')}</AppText>
                    )}
                  </Box>
                )}
                <Box>
                  <AppText variant="eyebrow" tone="tertiary" style={{ marginBottom: 8 }}>XP rewards</AppText>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                    <View style={{ alignItems: 'center' }}><AppText variant="numeral" tone="accent">+{selected.attendanceXp}</AppText><AppText variant="caption" tone="secondary">Attendance</AppText></View>
                    <View style={{ alignItems: 'center' }}><AppText variant="numeral" tone="accent">+{selected.winXp}</AppText><AppText variant="caption" tone="secondary">Per win</AppText></View>
                  </View>
                </Box>
                {selected.prizing && selected.prizing.length > 0 && (
                  <Box>
                    <AppText variant="eyebrow" tone="tertiary" style={{ marginBottom: 8 }}>Prizes</AppText>
                    {selected.prizing.map((p, i) => {
                      const info = PRIZES[p.toLowerCase()] ?? { title: p, desc: '' };
                      return (
                        <View key={i} style={{ marginBottom: 6 }}>
                          <AppText variant="body" style={{ fontWeight: '600' }}>{info.title}</AppText>
                          {info.desc ? <AppText variant="caption" tone="secondary">{info.desc}</AppText> : null}
                        </View>
                      );
                    })}
                  </Box>
                )}
                {selected.description ? (
                  <Box><AppText variant="eyebrow" tone="tertiary" style={{ marginBottom: 6 }}>Description</AppText><AppText variant="body">{selected.description}</AppText></Box>
                ) : null}
                {selected.hasStream && (
                  <Box>
                    <AppText variant="body" style={{ fontWeight: '700' }}>Watch live</AppText>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      {selected.twitchUrl && <Button label="Twitch" variant="secondary" onPress={() => Linking.openURL(selected.twitchUrl!)} style={{ flex: 1, paddingVertical: 10 }} />}
                      {selected.youtubeUrl && <Button label="YouTube" variant="secondary" onPress={() => Linking.openURL(selected.youtubeUrl!)} style={{ flex: 1, paddingVertical: 10 }} />}
                      {!selected.twitchUrl && !selected.youtubeUrl && <AppText variant="caption" tone="secondary">Stream link coming soon</AppText>}
                    </View>
                  </Box>
                )}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    label={selected.isInterested ? '✓ Interested' : "I'm interested"}
                    variant={selected.isInterested ? 'secondary' : 'primary'}
                    onPress={() => toggleInterest(selected)}
                    loading={busy === selected.id}
                    style={{ flex: 1 }}
                  />
                  <Button label="Share" variant="secondary" onPress={() => setShareFor(selected)} style={{ paddingHorizontal: 24 }} />
                </View>
                <Button label="Check in" variant="secondary" onPress={() => { const id = selected.id; setSelected(null); router.push(`/event/${id}` as never); }} />
                <AppText variant="caption" tone="tertiary" style={{ textAlign: 'center' }}>Registration handled in-store</AppText>
              </View>
            </ScrollView>
          </View>
          {shareFor && (
            <ShareEventSheet
              event={shareFor}
              onClose={() => setShareFor(null)}
              onDone={m => { setShareFor(null); flash(m); }}
            />
          )}
        </Modal>
      )}
    </View>
  );
}

function Box({ children, style }: { children: React.ReactNode; style?: object }) {
  const { colors } = useTheme();
  return <View style={[{ backgroundColor: colors.bgElevated, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  seg: { flexDirection: 'row', marginTop: 16, borderRadius: 16, padding: 4 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  chips: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  spot: { borderRadius: 26, borderWidth: 1, overflow: 'hidden' },
  badges: { position: 'absolute', left: 12, top: 12, flexDirection: 'row', gap: 6 },
  topRight: { position: 'absolute', right: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  spotBottom: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  star: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 20, borderWidth: 1 },
  thumb: { width: 60, height: 60, borderRadius: 14 },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 100, alignItems: 'center' },
  toast: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: { maxHeight: '90%', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
  close: { position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
});
