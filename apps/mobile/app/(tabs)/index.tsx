import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, Image, Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useApi } from '@/lib/api';
import { getLevel, getXpProgress, getXpToNext } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { AppText, Button, Card, Skeleton } from '@/components/kit';
import { EventCover } from '@/components/EventCover';
import { CardOfDayVote } from '@/components/CardOfDayVote';
import { GettingStarted } from '@/components/GettingStarted';
import { WelcomeOverlay } from '@/components/WelcomeOverlay';
import { HomeTour } from '@/components/HomeTour';
import { HomeStorePicker } from '@/components/HomeStorePicker';
import { ShareWinSheet } from '@/components/ShareWinSheet';
import { HomeSpecialEvents, type SpecialEvent } from '@/components/HomeSpecialEvents';
import { HomeBannerCarousel, type HomeBanner } from '@/components/HomeBannerCarousel';
import { useSelectedStoreId } from '@/lib/selected-store';
import { useStoreConfig } from '@/lib/store-config';
import { openAppLink } from '@/lib/home-links';
import { passTierKey } from '@/lib/pass-tiers';

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
  store_short_id?: string | null;
};

type Banner = HomeBanner;

type PassStatus = { tier: string; prizePoints: number; multiplier: number };

type CardOfDay = {
  name: string;
  game: string;
  gameDisplay: string;
  set: string;
  rarity: string;
  price: number | null;
  priceChange7d: number | null;
  priceChange30d?: number | null;
  imageUrl?: string | null;
  tcgplayerUrl?: string | null;
};

type PrizePreviewItem = {
  id: string;
  name: string;
  image_url: string | null;
  xp_cost: number;
  cost?: number;
};

type StoreUpdate = {
  type: 'winner' | 'new_event' | 'broadcast';
  icon: string;
  label: string;
  headline: string;
  subtext?: string;
  date: string;
  link?: string;
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
  status?: string | null;
  heroBackdrop?: string | null;
  avatarConfig?: { base?: string; background?: string; frame?: string; photo_url?: string | null } | null;
};

const FREE_TIER_GATE = 720; // prize points required to unlock the prize wall trial
const PASS_MULTIPLIER: Record<string, string> = { free: '1x', bronze: '1x', silver: '1.5x', gold: '2x', diamond: '2x★' };

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
  const [selectedId, setSelectedId] = useSelectedStoreId();
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;
  const cfg = useStoreConfig();
  const [passStatus, setPassStatus] = useState<PassStatus | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [specialEvents, setSpecialEvents] = useState<SpecialEvent[]>([]);
  const [shareLedgerId, setShareLedgerId] = useState<string | null>(null);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
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
      ['specialEvents', api.get<{ events: SpecialEvent[] }>(`/api/events?status=upcoming&special=true&limit=5${storeId ? `&store_id=${storeId}` : ''}`)],
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
      if (key === 'specialEvents') setSpecialEvents((value as { events: SpecialEvent[] }).events ?? []);
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
      api.get<PassStatus>('/api/player/pass-status').then(p => { if (generation === loadGeneration.current) setPassStatus(p); }).catch(() => {});
      api.get<{ favorites: string[] }>('/api/player/favorite-games').then(f => { if (generation === loadGeneration.current) setFavorites(f.favorites ?? []); }).catch(() => {});
      // Browsed store (persisted) wins; otherwise the home store.
      const storeId = selectedIdRef.current ?? data.homeStore?.id ?? null;
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

  const firstStore = useRef(true);
  useEffect(() => {
    if (firstStore.current) { firstStore.current = false; return; }
    setBanners([]); setStoreUpdates([]); setUpcomingEvents([]); setSpecialEvents([]);
    void loadPlayer();
  }, [selectedId]);

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
  const tier = passTierKey(passStatus?.tier ?? player.passTier);
  const tierStyle = getTierStyle(tier);
  const isPaidTier = tier !== 'free';
  const initial = (player.displayName ?? '?')[0].toUpperCase();
  const homeStore = player.homeStore ?? null;
  const store = stores.find(x => x.id === selectedId) ?? homeStore;
  const spendable = passStatus?.prizePoints ?? player.gems;
  const pointsLabel = passStatus ? 'Prize points' : cfg.currency_name;
  const favSet = favorites.filter(f => f !== 'overall');
  const backdropValue = player.heroBackdrop ?? '';
  const backdropGame = backdropValue.startsWith('game:') ? backdropValue.slice(5) : null;
  const backdropUpload = backdropValue.startsWith('upload:') ? backdropValue.slice(7) : null;
  const topGame = backdropGame ?? favSet[0] ?? gameStats[0]?.gameId ?? player.gameXP?.[0]?.game_id ?? null;
  const visibleGames = (player.gameXP ?? [])
    .filter(g => g && g.game_id && (favSet.length === 0 || g.game_id === 'general' || favSet.includes(g.game_id)))
    .slice().sort((a, b) => b.game_xp - a.game_xp);
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
      <WelcomeOverlay />
      <HomeTour />
      {/* Hero */}
      <EventCover src={backdropUpload} gameId={topGame} storeId={store?.id} color={store?.color ?? '#475569'} style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable onPress={() => router.push('/(tabs)/notifications' as never)} accessibilityLabel="Alerts" style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: colors.accent, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {player.avatarConfig?.photo_url
              ? <Image source={{ uri: player.avatarConfig.photo_url }} style={{ width: 72, height: 72 }} />
              : <AppText variant="display" style={{ color: '#fff', fontSize: 30 }}>{player.avatarConfig?.base ?? initial}</AppText>}
          </Pressable>
          <View style={{ flex: 1 }}>
            <AppText variant="display" numberOfLines={1} style={{ color: '#fff', fontSize: 26, lineHeight: 30 }}>{player.displayName}</AppText>
            {player.status ? <AppText variant="caption" numberOfLines={1} style={{ color: 'rgba(255,255,255,0.85)' }}>{player.status}</AppText> : null}
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
            <AppText variant="caption" numberOfLines={1} style={{ color: '#fff', flex: 1 }}>{store.name}{store.id !== homeStore?.id ? ' (viewing)' : ''}</AppText>
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
            { key: 'profile', label: 'Set up your profile', description: 'Pick an avatar and a status', done: !!(player.avatarConfig?.photo_url || player.status), storeKey: 'pp_done_profile', onPress: () => { SecureStore.setItemAsync('pp_done_profile', '1').catch(() => {}); router.push('/(tabs)/profile' as never); } },
            { key: 'spin', label: 'Do your first daily spin', description: 'Free XP every day', done: hasSpunToday },
            { key: 'games', label: 'Pick your favorite games', description: 'Home shows the games you play', done: favSet.length > 0, storeKey: 'pp_done_games', onPress: () => { SecureStore.setItemAsync('pp_done_games', '1').catch(() => {}); router.push('/(tabs)/profile' as never); } },
            { key: 'shop', label: 'Visit the Prize Wall', description: 'See what you can win', done: false, storeKey: 'pp_done_shop', onPress: goPrize },
            { key: 'event', label: 'Check in to an event', description: 'Earn XP by showing up', done: (player.gameXP ?? []).some(g => g.game_events > 0), onPress: () => router.push('/(tabs)/events' as never) },
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
              <AppText variant="eyebrow" tone="tertiary">{pointsLabel}</AppText>
              <AppText variant="numeral" tone={isPaidTier ? 'accent' : 'primary'}>{spendable.toLocaleString()}</AppText>
              <AppText variant="caption" tone="tertiary">spendable</AppText>
            </View>
          </View>
          <Button label={isPaidTier ? 'Spend at Prize Wall' : 'View Prize Wall'} variant="secondary" onPress={goPrize} style={{ marginTop: 14 }} />
          {passStatus && !isPaidTier && (
            <View style={{ marginTop: 12 }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.bgElevated, overflow: 'hidden' }}>
                <View style={{ height: 6, width: `${Math.round(Math.min(1, passStatus.prizePoints / FREE_TIER_GATE) * 100)}%` as `${number}%`, backgroundColor: colors.accent }} />
              </View>
              <AppText variant="caption" tone="secondary" style={{ marginTop: 6 }}>
                {passStatus.prizePoints >= FREE_TIER_GATE ? '🎉 Prize Wall trial unlocked — claim it on the Prize Wall' : `${passStatus.prizePoints.toLocaleString()} / ${FREE_TIER_GATE} pts to unlock the Prize Wall`}
              </AppText>
            </View>
          )}
          {passStatus && isPaidTier && (
            <AppText variant="caption" tone="secondary" style={{ marginTop: 12 }}>{PASS_MULTIPLIER[tier] ?? '1x'} XP on every event · {tier.toUpperCase()} Pass</AppText>
          )}
        </Card>

        <HomeBannerCarousel banners={banners} />

        <HomeSpecialEvents events={specialEvents} />

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
        {visibleGames.length > 0 ? (
          <View>
            <AppText variant="title" style={{ marginBottom: 12 }}>Your games</AppText>
            <View style={{ gap: 8 }}>
              {visibleGames.map(g => {
                const isGeneral = g.game_id === 'general';
                const lvl = Math.floor(g.game_xp / 50) + 1;
                const toNext = 50 - (g.game_xp % 50);
                const goal = g.monthlyThreshold || (g.game_id === 'one_piece' ? 5 : 3);
                const visits = Math.min(g.monthlyAttendance || 0, goal);
                const open = expandedGame === g.game_id;
                return (
                  <Card key={g.game_id} onPress={() => setExpandedGame(open ? null : g.game_id)} style={{ padding: 12, borderColor: open ? colors.accent : colors.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <AppText variant="title">{GAME_ICONS[g.game_id] ?? gameStats.find(x => x.gameId === g.game_id)?.icon ?? '🎮'}</AppText>
                      <View style={{ flex: 1 }}>
                        <AppText variant="body" style={{ fontWeight: '700' }}>{isGeneral ? 'Guild Points' : g.game_id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} · Lv {lvl}</AppText>
                        <AppText variant="caption" tone="secondary">{g.rank}</AppText>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <AppText variant="numeral" tone="accent" style={{ fontSize: 18 }}>{g.game_xp.toLocaleString()}</AppText>
                        <AppText variant="caption" tone="tertiary">{g.xpName || 'XP'}</AppText>
                      </View>
                    </View>
                    <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.bgElevated, overflow: 'hidden', marginTop: 10 }}>
                      <View style={{ height: 5, width: `${((g.game_xp % 50) / 50) * 100}%` as `${number}%`, backgroundColor: colors.accent }} />
                    </View>
                    <AppText variant="caption" tone="tertiary" style={{ marginTop: 4 }}>{toNext} to Lv {lvl + 1}</AppText>
                    {!isGeneral && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                        {Array.from({ length: goal }).map((_, i) => (
                          <View key={i} style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: colors.accent, backgroundColor: g.earnedMonthlyBonus || i < visits ? colors.accent : 'transparent' }} />
                        ))}
                        <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>{g.earnedMonthlyBonus ? '✓ ' : ''}{g.achievementName || (g.game_id === 'one_piece' ? "Pirate's Life" : 'The Regular')}</AppText>
                      </View>
                    )}
                    {open && (
                      <AppText variant="caption" tone="secondary" style={{ marginTop: 8 }}>
                        {g.game_events} events · {g.game_wins} wins{!isGeneral ? ` · ${visits}/${goal} visits this month` : ''}
                      </AppText>
                    )}
                  </Card>
                );
              })}
            </View>
          </View>
        ) : (
          <View>
            <AppText variant="title" style={{ marginBottom: 12 }}>Your games</AppText>
            <AppText variant="body" tone="secondary">No game XP yet. Attend events to start earning!</AppText>
          </View>
        )}

        {/* Recent activity */}
        <View>
          <AppText variant="title" style={{ marginBottom: 12 }}>Activity</AppText>
          {(player.recentActivity ?? []).length === 0 ? (
            <AppText variant="body" tone="secondary">No activity yet. Find players in Community.</AppText>
          ) : (
            <Card style={{ paddingVertical: 4 }}>
              {(player.recentActivity ?? []).map((a, i) => {
                const xp = a.final_xp || a.base_xp || 0;
                return (
                  <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: colors.border }}>
                    <AppText variant="body">{GAME_ICONS[a.game_id ?? ''] ?? '🎮'}</AppText>
                    <View style={{ flex: 1 }}>
                      <AppText variant="body" numberOfLines={1}>{a.description || a.source}</AppText>
                      <AppText variant="caption" tone="tertiary">{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{a.store_short_id ? ` @ ${a.store_short_id}` : ''}</AppText>
                    </View>
                    {xp !== 0 && <AppText variant="caption" style={{ fontWeight: '800', color: xp > 0 ? colors.accent : '#ef4444' }}>{xp > 0 ? '+' : ''}{xp}</AppText>}
                    {xp > 0 && (
                      <Pressable hitSlop={8} onPress={() => setShareLedgerId(a.id)} accessibilityLabel="Share with a friend">
                        <Feather name="share-2" size={16} color={colors.textTertiary} />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </Card>
          )}
        </View>

        {store && <PrizeWallPreview storeId={store.id} spendable={spendable} onPress={goPrize} />}

        {/* Store updates */}
        <View>
          <AppText variant="title" style={{ marginBottom: 12 }}>From the store</AppText>
          {storeUpdates.length === 0 ? (
            <AppText variant="body" tone="secondary">{feedErrors.storeUpdates ? 'Could not load store updates.' : 'No recent store activity.'}</AppText>
          ) : (
            <Card style={{ paddingVertical: 4 }}>
              {storeUpdates.map((u, i) => (
                <Pressable key={i} disabled={!u.link} onPress={() => u.link && openAppLink(router, u.link)} style={{ flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: colors.border }}>
                  <AppText variant="body">{u.icon}</AppText>
                  <View style={{ flex: 1 }}>
                    <AppText variant="eyebrow" tone="tertiary">{u.label}</AppText>
                    <AppText variant="body" numberOfLines={2}>{u.headline}</AppText>
                    {u.subtext ? <AppText variant="caption" tone="secondary" numberOfLines={1}>{u.subtext}</AppText> : null}
                  </View>
                </Pressable>
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
              {card.imageUrl ? <Image source={{ uri: card.imageUrl }} style={{ width: '100%', height: 200, marginBottom: 10 }} resizeMode="contain" /> : null}
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
                  {card.priceChange30d != null && (
                    <AppText variant="caption" style={{ color: card.priceChange30d >= 0 ? '#22c55e' : '#ef4444' }}>
                      {card.priceChange30d >= 0 ? '▲' : '▼'} {Math.abs(card.priceChange30d).toFixed(1)}% (30d)
                    </AppText>
                  )}
                </View>
              )}
              {card.tcgplayerUrl ? (
                <Pressable onPress={() => Linking.openURL(card.tcgplayerUrl!).catch(() => {})} style={{ marginTop: 8 }}>
                  <AppText variant="caption" tone="accent" style={{ fontWeight: '700' }}>View on TCGplayer →</AppText>
                </Pressable>
              ) : null}
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

      <HomeStorePicker
        visible={showStoreSwitcher || (!homeStore && stores.length > 0)}
        stores={stores}
        currentId={store?.id ?? null}
        homeId={homeStore?.id ?? null}
        required={!homeStore}
        onClose={() => setShowStoreSwitcher(false)}
        onPick={st => {
          if (!homeStore) setPlayer(p => (p ? { ...p, homeStore: st } : p));
          setSelectedId(st.id);
          setShowStoreSwitcher(false);
        }}
      />
      <ShareWinSheet ledgerId={shareLedgerId} onClose={() => setShareLedgerId(null)} />
    </ScrollView>
  );
}

function PrizeWallPreview({ storeId, spendable, onPress }: { storeId: string; spendable: number; onPress: () => void }) {
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
            <AppText variant="caption" tone="accent">
              {spendable >= item.xp_cost ? `Redeem · ${item.xp_cost.toLocaleString()}` : `${(item.xp_cost - spendable).toLocaleString()} to go`}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
