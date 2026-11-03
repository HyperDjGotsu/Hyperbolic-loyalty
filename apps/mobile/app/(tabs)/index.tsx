import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, Image, ImageBackground, Modal, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useApi } from '@/lib/api';
import { getLevel, getXpProgress, getXpToNext } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { AppText, Button, Card, Skeleton } from '@/components/kit';
import { EventCover } from '@/components/EventCover';
import { CardOfDayVote } from '@/components/CardOfDayVote';
import { GettingStarted } from '@/components/GettingStarted';

type GameXP = {
  game_id: string;
  game_xp: number;
  game_wins: number;
  game_events: number;
  rank: string;
  xpName: string;
  monthlyAttendance: number;
  monthlyThreshold: number;
  earnedMonthlyBonus: boolean;
  achievementName: string;
};

type ActivityEntry = {
  id: string;
  source: string;
  description: string;
  final_xp: number;
  base_xp: number;
  created_at: string;
  game_id: string | null;
};

type Banner = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  colorFrom: string;
  colorTo: string;
  badge: string;
  linkUrl: string | null;
  eventId: string | null;
  backgroundImage: string | null;
  bgSize: string | null;
  bgPosition: string | null;
  textColor: string | null;
};

type CardOfDay = {
  name: string;
  game: string;
  gameDisplay: string;
  set: string;
  rarity: string;
  price: number | null;
  priceChange7d: number | null;
};

type PrizePreviewItem = {
  id: string;
  name: string;
  image_url: string | null;
  xp_cost: number;
};

type StoreUpdate = {
  type: 'winner' | 'new_event' | 'broadcast';
  icon: string;
  label: string;
  headline: string;
  subtext?: string;
  date: string;
};

type FriendActivity = {
  type: 'checkin' | 'xp' | 'placement';
  icon: string;
  headline: string;
  subtext?: string;
  date: string;
};

type UpcomingEvent = {
  id: string;
  name: string;
  game: { id: string; name: string; icon: string; color: string } | null;
  scheduledAt: string;
  date: string;
  time: string;
  entryFee: string;
  isFree: boolean;
  attendanceXp: number;
  status: string;
};

type PlayerResponse = {
  linked: boolean;
  id: string;
  player_id: string;
  displayName: string;
  xp: number;
  gems: number;
  passTier: string;
  homeStore?: { id: string; name: string; city: string | null; is_flagship: boolean; color: string | null } | null;
  gameXP?: GameXP[];
  recentActivity?: ActivityEntry[];
  avatarConfig?: { base?: string; background?: string; frame?: string; photo_url?: string | null } | null;
};

const FREE_TIER_GATE = 720; // XP required to unlock prize wall trial

const GAME_ICONS: Record<string, string> = {
  one_piece: '🏴‍☠️', pokemon: '⚡', mtg: '✨', gundam: '🤖',
  lorcana: '🪄', star_wars: '🌟', star_wars_unlimited: '🌟',
  vanguard: '⚔️', yugioh: '⭐', digimon: '🦖', uvs: '👊',
  hololive: '🎤', weiss: '🎴', riftbound: '🌀', general: '🎮',
};

type Store = {
  id: string;
  name: string;
  city: string | null;
  is_flagship: boolean;
  color: string | null;
};

type TierStyle = {
  text: string;
  border: string;
  bg: string;
};

function getTierStyle(tier: string): TierStyle {
  switch (tier) {
    case 'bronze':
      return { text: '#b45309', border: 'rgba(180,83,9,0.3)', bg: 'rgba(180,83,9,0.1)' };
    case 'silver':
      return { text: '#94a3b8', border: 'rgba(148,163,184,0.3)', bg: 'rgba(148,163,184,0.1)' };
    case 'gold':
      return { text: '#eab308', border: 'rgba(234,179,8,0.3)', bg: 'rgba(234,179,8,0.1)' };
    case 'diamond':
      return { text: '#67e8f9', border: 'rgba(103,232,249,0.3)', bg: 'rgba(103,232,249,0.1)' };
    default: // free
      return { text: '#9ca3af', border: 'rgba(156,163,175,0.3)', bg: 'rgba(156,163,175,0.1)' };
  }
}

export default function DashboardScreen() {
  const api = useApi();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [gameStats, setGameStats] = useState<Array<{ gameId: string; name: string; icon: string; xp: number }>>([]);
  const [player, setPlayer] = useState<PlayerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<string | null>(null);
  const [showStoreSwitcher, setShowStoreSwitcher] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const manualStoreRef = useRef<Store | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [card, setCard] = useState<CardOfDay | null>(null);
  const [storeUpdates, setStoreUpdates] = useState<StoreUpdate[]>([]);
  const [friendActivity, setFriendActivity] = useState<FriendActivity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [feedErrors, setFeedErrors] = useState<Record<string, boolean>>({});
  const loadGeneration = useRef(0);

  async function loadFeeds(storeId: string | null, generation: number) {
    const requests = [
      ['stores', api.get<{ stores: Store[] }>('/api/stores')],
      ['banners', api.get<{ banners: Banner[] }>(`/api/banners${storeId ? `?store_id=${storeId}` : ''}`)],
      ['card', api.get<CardOfDay>('/api/card-of-the-day')],
      ['storeUpdates', api.get<{ updates: StoreUpdate[] }>(`/api/store-updates${storeId ? `?store_id=${storeId}` : ''}`)],
      ['friendActivity', api.get<{ activity: FriendActivity[] }>('/api/friends-activity')],
      ['upcomingEvents', api.get<{ events: UpcomingEvent[] }>(`/api/events?status=upcoming&limit=3${storeId ? `&store_id=${storeId}` : ''}`)],
    ] as const;
    const results = await Promise.allSettled(requests.map(([, request]) => request));
    if (generation !== loadGeneration.current) return;

    const errors: Record<string, boolean> = {};
    results.forEach((result, index) => {
      const key = requests[index][0];
      if (result.status === 'rejected') { errors[key] = true; return; }
      const value = result.value;
      if (key === 'stores') setStores((value as { stores: Store[] }).stores ?? []);
      if (key === 'banners') setBanners((value as { banners: Banner[] }).banners ?? []);
      if (key === 'card') setCard((value as CardOfDay).name ? value as CardOfDay : null);
      if (key === 'storeUpdates') setStoreUpdates((value as { updates: StoreUpdate[] }).updates ?? []);
      if (key === 'friendActivity') setFriendActivity((value as { activity: FriendActivity[] }).activity ?? []);
      if (key === 'upcomingEvents') setUpcomingEvents((value as { events: UpcomingEvent[] }).events ?? []);
    });
    setFeedErrors(errors);
  }

  async function loadPlayer() {
    const generation = ++loadGeneration.current;
    try {
      const [data, spinData] = await Promise.all([
        api.get<PlayerResponse>('/api/player/by-clerk'),
        api.get<{ canSpin: boolean }>('/api/xp/daily-spin').catch(() => ({ canSpin: true })),
      ]);
      if (generation !== loadGeneration.current) return;
      if (!data.linked) {
        router.replace('/onboarding');
        return;
      }
      setPlayer(data);
      setHasSpunToday(!spinData.canSpin);
      setError('');
      // Seed selectedStore only if user hasn't manually chosen a store (ref survives stale closures)
      if (data.homeStore && !manualStoreRef.current) setSelectedStore(data.homeStore as Store);
      const storeId = (manualStoreRef.current ?? data.homeStore)?.id ?? null;
      api.get<{ games: Array<{ gameId: string; name: string; icon: string; xp: number }> }>('/api/player/game-stats')
        .then(g => { if (generation === loadGeneration.current) setGameStats((g.games ?? []).filter(x => x.xp > 0).sort((x, y) => y.xp - x.xp)); })
        .catch(() => {});
      await loadFeeds(storeId, generation);
    } catch {
      if (generation !== loadGeneration.current) return;
      setError('Could not load player. Pull down to retry.');
    } finally {
      if (generation === loadGeneration.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  async function handleSpin() {
    if (hasSpunToday || isSpinning) return;
    setIsSpinning(true);
    try {
      const data = await api.post<{ success: boolean; prize: { xp: number; label: string } }>(
        '/api/xp/daily-spin',
        {}
      );
      if (data.success) {
        setHasSpunToday(true);
        setSpinResult(`+${data.prize.xp} XP — ${data.prize.label}`);
        setTimeout(() => setSpinResult(null), 3000);
      }
    } catch (err: unknown) {
      // Lock button only on confirmed 409 (already spun); leave retryable for network errors
      const isAlreadySpun = err instanceof Error && err.message.includes('already_claimed');
      if (isAlreadySpun) {
        setHasSpunToday(true);
      } else {
        Alert.alert('Spin failed', 'Could not complete your daily spin. Please try again.');
      }
    } finally {
      setIsSpinning(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (!player) setLoading(true);
      void loadPlayer();
      return () => { loadGeneration.current += 1; };
    }, [])
  );

  function onRefresh() {
    setRefreshing(true);
    loadPlayer();
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgBase, padding: 16, paddingTop: insets.top + 16, gap: 12 }}>
        <Skeleton height={230} radius={28} />
        <Skeleton height={64} radius={20} />
        <Skeleton height={120} radius={20} />
        <Skeleton height={76} radius={20} />
      </View>
    );
  }

  if (error || !player) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>{error || 'Player not found'}</AppText>
        <Button label="Retry" onPress={loadPlayer} style={{ paddingHorizontal: 32 }} />
      </View>
    );
  }

  const xpProgress = getXpProgress(player.xp);
  const xpToNext = getXpToNext(player.xp);
  const level = getLevel(player.xp);
  const rawTier = (player.passTier ?? 'free').toLowerCase();
  const tier = rawTier === 'none' ? 'free' : rawTier;
  const tierStyle = getTierStyle(tier);
  const isPaidTier = tier !== 'free';
  const initial = (player.displayName ?? '?')[0].toUpperCase();
  const store = selectedStore ?? player.homeStore ?? null;
  const topGame = gameStats[0]?.gameId ?? player.gameXP?.[0]?.game_id ?? null;
  const goPrize = () => {
    SecureStore.setItemAsync('pp_done_shop', '1').catch(() => {});
    router.push('/prize-wall' as never);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgBase }}
      contentContainerStyle={{ paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Hero */}
      <EventCover gameId={topGame} color={store?.color ?? '#475569'} style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: colors.accent, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {player.avatarConfig?.photo_url
              ? <Image source={{ uri: player.avatarConfig.photo_url }} style={{ width: 72, height: 72 }} />
              : <AppText variant="display" style={{ color: '#fff', fontSize: 30 }}>{player.avatarConfig?.base ?? initial}</AppText>}
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="display" numberOfLines={1} style={{ color: '#fff', fontSize: 26, lineHeight: 30 }}>{player.displayName}</AppText>
            <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>{player.player_id}</AppText>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.accent }}>
                <AppText variant="caption" style={{ color: colors.accentFg, fontWeight: '800' }}>LEVEL {level}</AppText>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: tierStyle.border }}>
                <AppText variant="caption" style={{ color: tierStyle.text, fontWeight: '800' }}>{tier.toUpperCase()}</AppText>
              </View>
            </View>
          </View>
        </View>
        <View style={{ marginTop: 18 }}>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
            <View style={{ height: 10, width: `${Math.round(xpProgress * 100)}%` as `${number}%`, backgroundColor: colors.accent }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <AppText variant="caption" style={{ color: '#fff' }}>{player.xp.toLocaleString()} XP</AppText>
            <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>{xpToNext} to level {level + 1}</AppText>
          </View>
        </View>
        {store ? (
          <Pressable onPress={() => setShowStoreSwitcher(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: store.color ?? colors.accent }} />
            <AppText variant="caption" numberOfLines={1} style={{ color: '#fff', flex: 1 }}>{store.name}</AppText>
            <Feather name="chevron-down" size={14} color="#fff" />
          </Pressable>
        ) : null}
      </EventCover>

      <View style={{ padding: 16, gap: 20 }}>
        {/* Daily spin */}
        <Pressable
          onPress={handleSpin}
          disabled={hasSpunToday || isSpinning}
          accessibilityRole="button"
          style={({ pressed }) => [{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 20,
            backgroundColor: hasSpunToday || isSpinning ? colors.bgSurface : colors.accent,
            borderWidth: 1, borderColor: hasSpunToday ? colors.border : colors.accent, opacity: pressed ? 0.85 : 1,
          }]}
        >
          <View>
            <AppText variant="title" style={{ color: hasSpunToday || isSpinning ? colors.textPrimary : colors.accentFg }}>
              {isSpinning ? 'Spinning…' : hasSpunToday ? (spinResult ?? 'Claimed today') : 'Daily spin'}
            </AppText>
            <AppText variant="caption" style={{ color: hasSpunToday || isSpinning ? colors.textSecondary : colors.accentFg }}>
              {hasSpunToday ? 'Come back tomorrow' : 'Tap to earn free XP'}
            </AppText>
          </View>
          <Feather name={hasSpunToday ? 'check-circle' : 'zap'} size={26} color={hasSpunToday || isSpinning ? colors.textTertiary : colors.accentFg} />
        </Pressable>

        <GettingStarted
          items={[
            { key: 'spin', label: 'Do your first daily spin', done: hasSpunToday },
            { key: 'games', label: 'Earn XP in a game', done: (player.gameXP?.length ?? 0) > 0 },
            { key: 'event', label: 'Check in to an event', done: (player.gameXP ?? []).some(g => g.game_events > 0), onPress: () => router.push('/(tabs)/events' as never) },
            { key: 'shop', label: 'Visit the Prize Wall', done: false, storeKey: 'pp_done_shop', onPress: goPrize },
          ]}
        />

        {/* Points */}
        <Card>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1 }}>
              <AppText variant="eyebrow" tone="tertiary">Guild points</AppText>
              <AppText variant="numeral">{player.xp.toLocaleString()}</AppText>
              <AppText variant="caption" tone="tertiary">total earned</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="eyebrow" tone="tertiary">Prize points</AppText>
              <AppText variant="numeral" tone={isPaidTier ? 'accent' : 'primary'}>{player.gems.toLocaleString()}</AppText>
              <AppText variant="caption" tone="tertiary">spendable</AppText>
            </View>
          </View>
          <Button label={isPaidTier ? 'Spend at Prize Wall' : 'View Prize Wall'} variant="secondary" onPress={goPrize} style={{ marginTop: 14 }} />
          {!isPaidTier && (
            <View style={{ marginTop: 12 }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.bgElevated, overflow: 'hidden' }}>
                <View style={{ height: 6, width: `${Math.round(Math.min(1, player.xp / FREE_TIER_GATE) * 100)}%` as `${number}%`, backgroundColor: colors.accent }} />
              </View>
              <AppText variant="caption" tone="secondary" style={{ marginTop: 6 }}>
                {player.xp >= FREE_TIER_GATE ? '🎉 Bronze trial unlocked — claim it on the Prize Wall' : `${player.xp} / ${FREE_TIER_GATE} XP to unlock the Prize Wall trial`}
              </AppText>
            </View>
          )}
        </Card>

        {/* Banners */}
        {banners.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {banners.map(b => {
              const textColor = b.textColor || '#ffffff';
              const inner = (
                <View style={{ padding: 16, flex: 1, justifyContent: 'flex-end' }}>
                  {!!b.badge && <AppText variant="eyebrow" style={{ color: textColor, opacity: 0.8 }}>{b.badge}</AppText>}
                  <AppText variant="title" numberOfLines={2} style={{ color: textColor }}>{b.icon} {b.title}</AppText>
                  {!!b.subtitle && <AppText variant="caption" numberOfLines={2} style={{ color: textColor, opacity: 0.8 }}>{b.subtitle}</AppText>}
                </View>
              );
              const box = { width: 280, height: 130, borderRadius: 24, overflow: 'hidden' as const, backgroundColor: b.colorFrom || colors.bgSurface };
              return b.backgroundImage
                ? <ImageBackground key={b.id} source={{ uri: b.backgroundImage }} style={box} imageStyle={{ resizeMode: b.bgSize === 'contain' ? 'contain' : 'cover', opacity: 0.75 }}>{inner}</ImageBackground>
                : <View key={b.id} style={box}>{inner}</View>;
            })}
          </ScrollView>
        )}

        {/* Upcoming events */}
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <AppText variant="title">Upcoming events</AppText>
            <Pressable onPress={() => router.push('/(tabs)/events' as never)}><AppText variant="caption" tone="accent" style={{ fontWeight: '700' }}>See all →</AppText></Pressable>
          </View>
          {upcomingEvents.length === 0 ? (
            <AppText variant="body" tone="secondary">{feedErrors.upcomingEvents ? 'Could not load events. Pull down to retry.' : 'No upcoming events at this store.'}</AppText>
          ) : (
            <View style={{ gap: 8 }}>
              {upcomingEvents.map(ev => (
                <Pressable key={ev.id} onPress={() => router.push({ pathname: '/(tabs)/events', params: { event: ev.id } } as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSurface }}>
                  <EventCover gameId={ev.game?.id} color={ev.game?.color} style={{ width: 60, height: 60, borderRadius: 14 }} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" numberOfLines={1} style={{ fontWeight: '700' }}>{ev.name}</AppText>
                    <AppText variant="caption" tone="secondary">{ev.date} · {ev.time}</AppText>
                  </View>
                  <AppText variant="caption" tone={ev.isFree ? 'accent' : 'primary'} style={{ fontWeight: '700' }}>{ev.entryFee}</AppText>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Game stats */}
        {(gameStats.length > 0 || (player.gameXP ?? []).length > 0) && (
          <View>
            <AppText variant="title" style={{ marginBottom: 12 }}>My games</AppText>
            <View style={{ gap: 8 }}>
              {(player.gameXP ?? []).slice().sort((a, b) => b.game_xp - a.game_xp).map(g => (
                <Card key={g.game_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
                  <AppText variant="title">{GAME_ICONS[g.game_id] ?? gameStats.find(x => x.gameId === g.game_id)?.icon ?? '🎮'}</AppText>
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" style={{ fontWeight: '700' }}>{g.game_id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</AppText>
                    <AppText variant="caption" tone="secondary">{g.rank}</AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText variant="numeral" tone="accent" style={{ fontSize: 18 }}>{g.game_xp.toLocaleString()}</AppText>
                    <AppText variant="caption" tone="tertiary">{g.xpName}</AppText>
                  </View>
                  {g.earnedMonthlyBonus && <AppText variant="body">🏆</AppText>}
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* Recent activity */}
        {(player.recentActivity ?? []).length > 0 && (
          <View>
            <AppText variant="title" style={{ marginBottom: 12 }}>Recent activity</AppText>
            <Card style={{ paddingVertical: 4 }}>
              {(player.recentActivity ?? []).slice(0, 5).map((a, i) => {
                const xp = a.final_xp || a.base_xp || 0;
                return (
                  <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: colors.border }}>
                    <AppText variant="body">{GAME_ICONS[a.game_id ?? ''] ?? '🎮'}</AppText>
                    <View style={{ flex: 1 }}>
                      <AppText variant="body" numberOfLines={1}>{a.description || a.source}</AppText>
                      <AppText variant="caption" tone="tertiary">{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</AppText>
                    </View>
                    {xp > 0 && <AppText variant="caption" tone="accent" style={{ fontWeight: '800' }}>+{xp}</AppText>}
                  </View>
                );
              })}
            </Card>
          </View>
        )}

        {store && <PrizeWallPreview storeId={store.id} onPress={goPrize} />}

        {/* Store updates */}
        <View>
          <AppText variant="title" style={{ marginBottom: 12 }}>From the store</AppText>
          {storeUpdates.length === 0 ? (
            <AppText variant="body" tone="secondary">{feedErrors.storeUpdates ? 'Could not load store updates.' : 'No recent store activity.'}</AppText>
          ) : (
            <Card style={{ paddingVertical: 4 }}>
              {storeUpdates.map((u, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: colors.border }}>
                  <AppText variant="body">{u.icon}</AppText>
                  <View style={{ flex: 1 }}>
                    <AppText variant="eyebrow" tone="tertiary">{u.label}</AppText>
                    <AppText variant="body" numberOfLines={2}>{u.headline}</AppText>
                    {u.subtext ? <AppText variant="caption" tone="secondary" numberOfLines={1}>{u.subtext}</AppText> : null}
                  </View>
                </View>
              ))}
            </Card>
          )}
        </View>

        {/* Friends activity */}
        <View>
          <AppText variant="title" style={{ marginBottom: 12 }}>Friends activity</AppText>
          {friendActivity.length === 0 ? (
            <AppText variant="body" tone="secondary">{feedErrors.friendActivity ? 'Could not load friends activity.' : "No friends activity yet. Add friends to see what they're up to."}</AppText>
          ) : (
            <Card style={{ paddingVertical: 4 }}>
              {friendActivity.map((a, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: colors.border }}>
                  <AppText variant="body">{a.icon}</AppText>
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" numberOfLines={2}>{a.headline}</AppText>
                    {a.subtext ? <AppText variant="caption" tone="secondary" numberOfLines={1}>{a.subtext}</AppText> : null}
                  </View>
                </View>
              ))}
            </Card>
          )}
        </View>

        {/* Card of the day */}
        {card && (
          <View>
            <AppText variant="title" style={{ marginBottom: 12 }}>Card of the day</AppText>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="eyebrow" tone="tertiary">{card.gameDisplay}</AppText>
                {!!card.rarity && <AppText variant="eyebrow" tone="accent">{card.rarity}</AppText>}
              </View>
              <AppText variant="title" style={{ marginTop: 4 }}>{card.name}</AppText>
              {!!card.set && <AppText variant="caption" tone="secondary">{card.set}</AppText>}
              {card.price != null && (
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
                  <AppText variant="numeral">${card.price.toFixed(2)}</AppText>
                  {card.priceChange7d != null && (
                    <AppText variant="caption" style={{ color: card.priceChange7d >= 0 ? '#22c55e' : '#ef4444' }}>
                      {card.priceChange7d >= 0 ? '▲' : '▼'} {Math.abs(card.priceChange7d).toFixed(1)}% (7d)
                    </AppText>
                  )}
                </View>
              )}
            </Card>
          </View>
        )}
        <CardOfDayVote />

        {Object.keys(feedErrors).length > 0 && (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <AppText variant="caption" tone="secondary">Some content could not be loaded.</AppText>
            <Button label="Retry" variant="secondary" onPress={onRefresh} style={{ paddingHorizontal: 28, paddingVertical: 10 }} />
          </View>
        )}
      </View>

      <Modal visible={showStoreSwitcher} transparent animationType="slide" onRequestClose={() => setShowStoreSwitcher(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => setShowStoreSwitcher(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.bgSurface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40 }}>
            <AppText variant="title">Switch store</AppText>
            <AppText variant="caption" tone="secondary" style={{ marginBottom: 12 }}>Choose your browsing context</AppText>
            {stores.map(st => {
              const isSelected = (selectedStore?.id ?? player.homeStore?.id) === st.id;
              return (
                <Pressable
                  key={st.id}
                  onPress={() => {
                    manualStoreRef.current = st;
                    setSelectedStore(st);
                    setBanners([]); setStoreUpdates([]); setUpcomingEvents([]);
                    setShowStoreSwitcher(false);
                    setRefreshing(true);
                    void loadPlayer();
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 6, borderRadius: 14, borderWidth: 1, borderColor: isSelected ? colors.accent : colors.border, backgroundColor: colors.bgElevated }}
                >
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: st.color ?? colors.textTertiary }} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" style={{ fontWeight: '700' }}>{st.name}</AppText>
                    {st.city ? <AppText variant="caption" tone="secondary">{st.city}</AppText> : null}
                  </View>
                  {isSelected && <Feather name="check" size={16} color={colors.accent} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function PrizeWallPreview({ storeId, onPress }: { storeId: string; onPress: () => void }) {
  const api = useApi();
  const { colors } = useTheme();
  const [items, setItems] = useState<PrizePreviewItem[]>([]);

  useEffect(() => {
    api.get<{ items: PrizePreviewItem[] }>(`/api/prize-wall?storeId=${encodeURIComponent(storeId)}`)
      .then(d => setItems((d.items ?? []).slice(0, 4)))
      .catch(() => {});
  }, [storeId]);

  if (items.length === 0) return null;
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <AppText variant="title">Prize Wall</AppText>
        <Pressable onPress={onPress}><AppText variant="caption" tone="accent" style={{ fontWeight: '700' }}>View all →</AppText></Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {items.map(item => (
          <Pressable key={item.id} onPress={onPress} style={{ width: '48%', padding: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSurface }}>
            <View style={{ height: 90, borderRadius: 14, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {item.image_url ? <Image source={{ uri: item.image_url }} style={{ width: '100%', height: 90 }} resizeMode="contain" /> : <Feather name="gift" size={22} color={colors.textTertiary} />}
            </View>
            <AppText variant="caption" numberOfLines={2} style={{ marginTop: 8, fontWeight: '700', color: colors.textPrimary }}>{item.name}</AppText>
            <AppText variant="caption" tone="accent">{item.xp_cost.toLocaleString()} pts</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
