import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, Alert, Image, Modal, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApi } from '@/lib/api';
import { useTheme } from '@/lib/theme-context';
import { PageIntro } from '@/components/PageIntro';
import { AppText, Button, Skeleton } from '@/components/kit';
import { useAlertsContext } from '@/lib/alerts-context';
import { SELECTABLE_GAMES } from '@/lib/games';
import { useSelectedStoreId } from '@/lib/selected-store';

type Avatar = {
  type: 'emoji' | 'photo';
  base: string;
  photoUrl: string | null;
  background: string;
  frame: string;
  badge: string | null;
};

type LeaderboardEntry = {
  rank: number;
  id: string;
  odid: string;
  name: string;
  totalXp: number;
  level: number;
  hidden: boolean;
  status?: string | null;
  avatar: Avatar;
};

type Friend = {
  id: string;
  odid: string;
  name: string;
  title: string;
  level: number;
  totalXp: number;
  avatar: Avatar;
  isFriend: boolean;
  isOnline: boolean | null;
  status: string | null;
};

type FriendRequest = {
  friendshipId: string;
  id: string;
  odid: string;
  name: string;
  avatar: Avatar;
  timestamp: string;
};

type SearchResult = {
  id: string;
  odid: string;
  name: string;
  level: number | null;
  totalXp: number | null;
  avatar: Avatar;
  isFriend: boolean;
  allowFriendRequests: boolean;
};

const GAMES = [
  { id: 'overall', label: 'Overall', icon: '🏆' },
  ...SELECTABLE_GAMES.map(g => ({ id: g.id, label: g.name, icon: g.icon })),
];

function rankColor(rank: number, fallback: string): string {
  if (rank === 1) return '#f4c542';
  if (rank === 2) return '#d4d4d8';
  if (rank === 3) return '#c97c3a';
  return fallback;
}

function AvatarBubble({ avatar, size = 40 }: { avatar: Avatar; size?: number }) {
  const box = { width: size, height: size, borderRadius: size / 2, backgroundColor: avatar.background, alignItems: 'center' as const, justifyContent: 'center' as const, overflow: 'hidden' as const };
  if (avatar.type === 'photo' && avatar.photoUrl) return <Image source={{ uri: avatar.photoUrl }} style={box} />;
  return <View style={box}><AppText style={{ fontSize: size * 0.5 }}>{avatar.base}</AppText></View>;
}

type Member = { odid: string; name: string; avatar: Avatar; level?: number | null; totalXp?: number | null; rank?: number; isFriend?: boolean; status?: string | null; hidden?: boolean };

export default function CommunityScreen() {
  const api = useApi();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [meId, setMeId] = useState<string | null>(null);
  const [meEntry, setMeEntry] = useState<LeaderboardEntry | null>(null);
  const [actionFor, setActionFor] = useState<Member | null>(null);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'ranks' | 'friends'>('ranks');
  const [scope, setScope] = useState<'store' | 'network'>('store');
  const [game, setGame] = useState('overall');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsRefreshing, setFriendsRefreshing] = useState(false);
  const { refreshBadge } = useAlertsContext();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [requestsSent, setRequestsSent] = useState<Set<string>>(new Set());
  const [sendingRequest, setSendingRequest] = useState(false);
  const [homeStoreId, setHomeStoreId] = useState<string | null>(null);
  const [homeLoaded, setHomeLoaded] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [selectedStoreId] = useSelectedStoreId();
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [draftFavorites, setDraftFavorites] = useState<string[]>([]);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [savingFavorites, setSavingFavorites] = useState(false);
  const storeId = selectedStoreId ?? homeStoreId;
  const friendsLoaded = useRef(false);
  const friendsLoadInFlight = useRef(false);
  const inFlightPrefs = useRef(new Set<string>());

  useEffect(() => {
    if (!searchOpen) return;
    const query = searchQuery.trim();
    if (query.length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      api.get<{ results: SearchResult[] }>(`/api/community/search?q=${encodeURIComponent(query)}`)
        .then(data => { if (!cancelled) setSearchResults(data.results ?? []); })
        .catch(() => { if (!cancelled) setSearchResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery, searchOpen]);

  // Silently pre-load friends and requests on mount so the badge is visible
  // before the user taps Friends. Uses showLoading=false to avoid spinner flash.
  useEffect(() => {
    loadFriends(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.get<{ id?: string }>('/api/player/by-clerk').then(d => setMeId(d.id ?? null)).catch(() => {});
  }, []);

  // Home store (fallback when no store is selected), store names and favorite games.
  useEffect(() => {
    api.get<{ homeStoreId: string | null }>('/api/player/pass-status')
      .then(d => setHomeStoreId(d.homeStoreId ?? null))
      .catch(() => {})
      .finally(() => setHomeLoaded(true));
    api.get<{ stores: Array<{ id: string; name: string }> }>('/api/stores')
      .then(d => setStoreNames(Object.fromEntries((d.stores ?? []).map(st => [st.id, st.name]))))
      .catch(() => {});
    api.get<{ favorites: string[] }>('/api/player/favorite-games')
      .then(d => setFavorites(d.favorites ?? []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No store to scope to means the network board.
  useEffect(() => { if (homeLoaded && !storeId) setScope('network'); }, [homeLoaded, storeId]);

  useEffect(() => {
    if (!homeLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const gameParam = game !== 'overall' ? `&game=${encodeURIComponent(game)}` : '';
        const storeParam = scope === 'store' && storeId ? `&store_id=${encodeURIComponent(storeId)}` : '';
        const data = await api.get<{ leaderboard: LeaderboardEntry[]; me?: LeaderboardEntry | null }>(
          `/api/community/leaderboard?limit=50${gameParam}${storeParam}`
        );
        if (cancelled) return;
        setEntries(data.leaderboard ?? []);
        setMeEntry(data.me ?? null);
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) { setLoading(false); setRefreshing(false); }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeLoaded, game, scope, storeId, reloadTick]);

  function handleScope(s: 'store' | 'network') { setScope(s); setLoading(true); }
  function handleGame(g: string) { setGame(g); setLoading(true); }
  function onRefresh() { setRefreshing(true); setReloadTick(t => t + 1); }

  function openFavorites() { setDraftFavorites(favorites); setFavoritesOpen(true); }
  function toggleFavorite(id: string) {
    setDraftFavorites(current => {
      if (current.includes(id)) return current.filter(v => v !== id);
      return current.length < 8 ? [...current, id] : current;
    });
  }
  async function saveFavorites() {
    setSavingFavorites(true);
    try {
      const data = await api.post<{ favorites: string[] }>('/api/player/favorite-games', { favorites: draftFavorites });
      const next = data.favorites ?? draftFavorites;
      setFavorites(next);
      if (game !== 'overall' && !next.includes(game)) { setGame('overall'); setLoading(true); }
      setFavoritesOpen(false);
    } catch { Alert.alert('Could not save', 'Please try again.'); } finally { setSavingFavorites(false); }
  }

  async function loadFriends(showLoading = true) {
    if (friendsLoadInFlight.current) return;
    friendsLoadInFlight.current = true;
    if (showLoading) setFriendsLoading(true);
    try {
      const [friendsData, requestsData] = await Promise.all([
        api.get<{ friends: Friend[] }>('/api/community/friends'),
        api.get<{ requests: FriendRequest[] }>('/api/community/friend-requests'),
      ]);
      setFriends(friendsData.friends ?? []);
      setFriendRequests(requestsData.requests ?? []);
      friendsLoaded.current = true;
    } catch {
      // Keep any previously loaded data visible if refreshing fails.
    } finally {
      friendsLoadInFlight.current = false;
      setFriendsLoading(false);
      setFriendsRefreshing(false);
    }
  }

  function handleTab(tab: 'ranks' | 'friends') {
    setActiveTab(tab);
    if (tab === 'friends' && !friendsLoaded.current && !friendsLoading) {
      loadFriends();
    }
  }

  function refreshFriends() {
    setFriendsRefreshing(true);
    loadFriends(false);
  }

  async function respondToRequest(friendshipId: string, action: 'accept' | 'decline') {
    const requestKey = `request:${friendshipId}`;
    if (inFlightPrefs.current.has(requestKey)) return;
    inFlightPrefs.current.add(requestKey);
    try {
      await api.post('/api/community/respond-request', { friendshipId, action });
      setFriendRequests(current => current.filter(r => r.friendshipId !== friendshipId));
      refreshBadge();
      if (action === 'accept') {
        const data = await api.get<{ friends: Friend[] }>('/api/community/friends');
        setFriends(data.friends ?? []);
      }
    } catch {
      // Leave the request in place so the player can retry.
    } finally {
      inFlightPrefs.current.delete(requestKey);
    }
  }

  async function unfriend(odid: string) {
    const requestKey = `unfriend:${odid}`;
    if (inFlightPrefs.current.has(requestKey)) return;
    inFlightPrefs.current.add(requestKey);
    try {
      await api.post('/api/community/unfriend', { friendId: odid });
      setFriends(current => current.filter(friend => friend.odid !== odid));
      setRequestsSent(current => { const s = new Set(current); s.delete(odid); return s; });
    } catch {
      // Keep the friend in place so the player can retry.
    } finally {
      inFlightPrefs.current.delete(requestKey);
    }
  }

  async function cancelFriendRequest(odid: string) {
    const requestKey = `cancel:${odid}`;
    if (inFlightPrefs.current.has(requestKey)) return;
    inFlightPrefs.current.add(requestKey);
    try {
      await api.post('/api/community/cancel-request', { targetPlayerId: odid });
      setRequestsSent(current => { const s = new Set(current); s.delete(odid); return s; });
    } catch {
      // Keep "sent" state visible so the player can retry.
    } finally {
      inFlightPrefs.current.delete(requestKey);
    }
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResult(null);
  }

  async function sendFriendRequest(result: SearchResult) {
    if (sendingRequest || result.isFriend || requestsSent.has(result.odid)) return;
    setSendingRequest(true);
    try {
      await api.post('/api/community/friend-requests', { targetPlayerId: result.odid });
      setRequestsSent(current => new Set(current).add(result.odid));
    } catch {
      // Keep the action available so it can be retried.
    } finally {
      setSendingRequest(false);
    }
  }

  async function blockPlayer(m: Member) {
    try {
      await api.post('/api/community/block', { targetPlayerId: m.odid });
      setBlocked(cur => new Set(cur).add(m.odid));
      setFriends(cur => cur.filter(f => f.odid !== m.odid));
      setFriendRequests(cur => cur.filter(r => r.odid !== m.odid));
      setActionFor(null);
    } catch {
      Alert.alert('Error', 'Could not block this player. Try again.');
    }
  }

  function confirmBlock(m: Member) {
    Alert.alert(`Block ${m.name}?`, "They won't be able to find you or send friend requests, and you won't see them in search.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: () => void blockPlayer(m) },
    ]);
  }

  async function sendReport(m: Member, reason: string) {
    try {
      await api.post('/api/community/report', { targetPlayerId: m.odid, reason });
      Alert.alert('Report sent', 'Thanks. Our team will review it.');
    } catch {
      Alert.alert('Error', 'Could not send the report. Try again.');
    }
  }

  function reportPlayer(m: Member) {
    setActionFor(null);
    Alert.alert(`Report ${m.name}`, 'What is the problem?', [
      { text: 'Harassment or abuse', onPress: () => void sendReport(m, 'harassment') },
      { text: 'Inappropriate name or photo', onPress: () => void sendReport(m, 'inappropriate_profile') },
      { text: 'Something else', onPress: () => void sendReport(m, 'other') },
    ], { cancelable: true });
  }

  const chipGames = favorites.length ? GAMES.filter(g => g.id === 'overall' || favorites.includes(g.id)) : GAMES;
  const shown = entries.filter(e => !blocked.has(e.odid));
  const mine = meEntry ?? shown.find(e => e.odid === meId) ?? null;

  const memberRow = (m: Member, right?: React.ReactNode) => (
    <Pressable
      key={m.odid}
      onPress={() => { if (m.odid !== meId && !m.hidden) setActionFor(m); }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 20, borderWidth: 1, borderColor: m.odid === meId ? colors.accent : colors.border, backgroundColor: colors.bgSurface }}
    >
      {m.rank != null && <AppText variant="numeral" style={{ width: 44, fontSize: 16, color: rankColor(m.rank, colors.textTertiary) }}>#{m.rank}</AppText>}
      <AvatarBubble avatar={m.avatar} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" numberOfLines={1} style={{ fontWeight: '700' }}>{m.name}{m.odid === meId ? ' (you)' : ''}</AppText>
        {m.level != null && <AppText variant="caption" tone="secondary">Lv.{m.level}</AppText>}
      </View>
      {m.rank != null && m.rank <= 5 && (
        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.bgElevated }}>
          <AppText variant="caption" style={{ fontSize: 10, fontWeight: '800', color: '#ef4444' }}>WANTED</AppText>
        </View>
      )}
      {right ?? (m.totalXp != null ? <AppText variant="numeral" style={{ fontSize: 16 }}>{m.totalXp.toLocaleString()}</AppText> : null)}
    </Pressable>
  );

  const toMember = (e: LeaderboardEntry): Member => ({ odid: e.odid, name: e.hidden ? 'Anonymous' : e.name, avatar: e.avatar, level: e.level, totalXp: e.totalXp, rank: e.rank, status: e.status ?? null, hidden: e.hidden });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
      <PageIntro page="community" />
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <AppText variant="display">Community</AppText>
            <AppText variant="caption" tone="secondary">Ranks, friends & players</AppText>
          </View>
          <Pressable accessibilityLabel="Search players" onPress={() => setSearchOpen(true)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgElevated, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="search" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 16, borderRadius: 16, padding: 4, backgroundColor: colors.bgElevated }}>
          {([{ id: 'ranks', label: 'Ranks' }, { id: 'friends', label: friendRequests.length ? `Friends (${friendRequests.length})` : 'Friends' }] as const).map(t => (
            <Pressable key={t.id} onPress={() => handleTab(t.id)} style={{ flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center', backgroundColor: activeTab === t.id ? colors.bgSurface : 'transparent' }}>
              <AppText variant="caption" tone={activeTab === t.id ? 'primary' : 'tertiary'} style={{ fontWeight: '700', fontSize: 14 }}>{t.label}</AppText>
            </Pressable>
          ))}
        </View>
      </View>

      {activeTab === 'ranks' ? (
        <>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12 }}>
            {(['store', 'network'] as const).map(sc => {
              const off = sc === 'store' && !storeId;
              return (
                <Pressable key={sc} disabled={off} onPress={() => handleScope(sc)} style={{ flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center', opacity: off ? 0.4 : 1, backgroundColor: scope === sc ? colors.accent : colors.bgElevated }}>
                  <AppText variant="caption" style={{ fontWeight: '700', fontSize: 14, color: scope === sc ? colors.accentFg : colors.textSecondary }}>{sc === 'store' ? (storeId && storeNames[storeId]) || 'My Store' : 'Network'}</AppText>
                </Pressable>
              );
            })}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
            {chipGames.map(g => (
              <Pressable key={g.id} onPress={() => handleGame(g.id)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: game === g.id ? colors.accent : colors.bgElevated }}>
                <AppText variant="caption" style={{ fontSize: 14, color: game === g.id ? colors.accentFg : colors.textSecondary }}>{g.icon} {g.label}</AppText>
              </Pressable>
            ))}
            <Pressable onPress={openFavorites} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border }}>
              <AppText variant="caption" style={{ fontSize: 14, color: colors.accent }}>{favorites.length ? 'Edit' : '+ Favorites'}</AppText>
            </Pressable>
          </ScrollView>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 8 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          >
            {loading ? (
              [0, 1, 2, 3, 4].map(i => <Skeleton key={i} height={64} radius={20} />)
            ) : shown.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 48, gap: 6 }}>
                <Feather name="award" size={32} color={colors.textTertiary} />
                <AppText variant="title">No rankings yet</AppText>
                <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
                  {scope === 'store' ? 'Earn XP at events to appear on the store board.' : game === 'overall' ? 'No players ranked yet.' : `No ${GAMES.find(g => g.id === game)?.label ?? 'game'} rankings yet. Be the first to compete!`}
                </AppText>
              </View>
            ) : (
              <>
                {mine && (
                  <View style={{ marginBottom: 8 }}>
                    <AppText variant="eyebrow" tone="tertiary" style={{ marginBottom: 8 }}>Your rank</AppText>
                    {memberRow({ ...toMember(mine), odid: mine.odid })}
                  </View>
                )}
                {shown.length >= 3 && (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingBottom: 8 }}>
                    {[shown[1], shown[0], shown[2]].map(e => {
                      const anon = !!e.hidden;
                      const first = shown[0].odid === e.odid;
                      const medal = first ? '#f4c542' : shown[1].odid === e.odid ? '#d4d4d8' : '#c97c3a';
                      const place = shown.indexOf(e) + 1;
                      return (
                        <Pressable
                          key={e.odid}
                          onPress={() => { if (e.odid !== meId && !anon) setActionFor(toMember(e)); }}
                          style={{ flex: 1, alignItems: 'center', borderRadius: 26, borderWidth: 1, borderColor: colors.border, backgroundColor: first ? colors.bgElevated : colors.bgSurface, paddingHorizontal: 6, paddingTop: first ? 28 : 20, paddingBottom: first ? 20 : 16 }}
                        >
                          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: medal, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                            <AppText variant="caption" style={{ color: place === 3 ? '#fff' : '#000', fontWeight: '800', fontSize: 14 }}>{place}</AppText>
                          </View>
                          <AvatarBubble avatar={anon ? { type: 'emoji', base: '❓', photoUrl: null, background: colors.bgElevated, frame: 'none', badge: null } : e.avatar} size={first ? 56 : 44} />
                          <AppText variant="body" numberOfLines={1} style={{ fontWeight: '700', fontSize: 14, marginTop: 8, alignSelf: 'stretch', textAlign: 'center' }}>{anon ? 'Anonymous' : e.name}</AppText>
                          <AppText variant="caption" style={{ color: colors.xp, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{e.totalXp.toLocaleString()}</AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                {(shown.length >= 3 ? shown.slice(3) : shown).map(e => memberRow(toMember(e)))}
              </>
            )}
          </ScrollView>
        </>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
          refreshControl={<RefreshControl refreshing={friendsRefreshing} onRefresh={refreshFriends} tintColor={colors.accent} />}
        >
          {friendsLoading ? (
            [0, 1, 2].map(i => <Skeleton key={i} height={64} radius={20} />)
          ) : (
            <>
              {friendRequests.length > 0 && (
                <View style={{ gap: 8 }}>
                  <AppText variant="eyebrow" tone="tertiary">Pending requests ({friendRequests.length})</AppText>
                  {friendRequests.map(rq => (
                    <View key={rq.friendshipId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.bgSurface }}>
                      <AvatarBubble avatar={rq.avatar} />
                      <View style={{ flex: 1 }}>
                        <AppText variant="body" numberOfLines={1} style={{ fontWeight: '700' }}>{rq.name}</AppText>
                        <AppText variant="caption" tone="tertiary">{rq.timestamp}</AppText>
                      </View>
                      <Button label="Accept" onPress={() => respondToRequest(rq.friendshipId, 'accept')} style={{ paddingVertical: 8, paddingHorizontal: 14 }} />
                      <Button label="✗" variant="secondary" onPress={() => respondToRequest(rq.friendshipId, 'decline')} style={{ paddingVertical: 8, paddingHorizontal: 14 }} />
                    </View>
                  ))}
                </View>
              )}
              {friends.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <AppText variant="eyebrow" tone="tertiary">Friends ({friends.length})</AppText>
                  {friends.map(f => memberRow({ odid: f.odid, name: f.name, avatar: f.avatar, level: f.level, totalXp: f.totalXp, isFriend: true, status: f.status }))}
                </View>
              ) : friendRequests.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 48, gap: 6 }}>
                  <Feather name="users" size={32} color={colors.textTertiary} />
                  <AppText variant="title">No friends yet</AppText>
                  <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>Use search to find players.</AppText>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      )}

      {/* Player actions: friend, block, report */}
      <Modal visible={!!actionFor} transparent animationType="slide" onRequestClose={() => setActionFor(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} onPress={() => setActionFor(null)} />
        {actionFor && (
          <View style={{ padding: 20, paddingBottom: 36, gap: 10, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.bgSurface }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <AvatarBubble avatar={actionFor.avatar} size={48} />
              <View style={{ flex: 1 }}>
                <AppText variant="title" numberOfLines={1}>{actionFor.name}</AppText>
                {actionFor.level != null && <AppText variant="caption" tone="secondary">Lv.{actionFor.level}{actionFor.totalXp != null ? ` · ${actionFor.totalXp.toLocaleString()} XP` : ''}</AppText>}
              </View>
            </View>
            {actionFor.status ? <AppText variant="body" tone="secondary" style={{ marginBottom: 4 }}>{actionFor.status}</AppText> : null}
            {friends.some(f => f.odid === actionFor.odid) ? (
              <Button label="Remove friend" variant="secondary" onPress={() => { void unfriend(actionFor.odid); setActionFor(null); }} />
            ) : requestsSent.has(actionFor.odid) ? (
              <Button label="Cancel friend request" variant="secondary" onPress={() => { void cancelFriendRequest(actionFor.odid); setActionFor(null); }} />
            ) : (
              <Button label="Add friend" onPress={() => { void sendFriendRequest({ id: '', odid: actionFor.odid, name: actionFor.name, level: null, totalXp: null, avatar: actionFor.avatar, isFriend: false, allowFriendRequests: true }); setActionFor(null); }} />
            )}
            <Button label="Report player" variant="secondary" onPress={() => reportPlayer(actionFor)} />
            <Button label="Block player" variant="ghost" onPress={() => confirmBlock(actionFor)} />
          </View>
        )}
      </Modal>

      <Modal visible={favoritesOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setFavoritesOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bgBase, paddingTop: insets.top }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
            <Pressable onPress={() => setFavoritesOpen(false)}><AppText variant="body" tone="accent" style={{ fontWeight: '700' }}>Cancel</AppText></Pressable>
            <AppText variant="title">Favorite Games</AppText>
            <Pressable disabled={savingFavorites} onPress={saveFavorites}><AppText variant="body" tone="accent" style={{ fontWeight: '700' }}>{savingFavorites ? 'Saving…' : 'Save'}</AppText></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
            {SELECTABLE_GAMES.map(g => {
              const on = draftFavorites.includes(g.id);
              return (
                <Pressable key={g.id} onPress={() => toggleFavorite(g.id)} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: on ? colors.accent : colors.bgElevated }}>
                  <AppText variant="caption" style={{ fontSize: 14, color: on ? colors.accentFg : colors.textSecondary }}>{g.icon} {g.name}</AppText>
                </Pressable>
              );
            })}
          </ScrollView>
          <AppText variant="caption" tone="tertiary" style={{ textAlign: 'center', paddingBottom: insets.bottom + 12 }}>Pick up to 8 games</AppText>
        </View>
      </Modal>

      <Modal visible={searchOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={closeSearch}>
        <View style={{ flex: 1, backgroundColor: colors.bgBase, paddingTop: insets.top }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
            <TextInput
              autoFocus value={searchQuery} onChangeText={setSearchQuery} placeholder="Search players"
              placeholderTextColor={colors.textTertiary} autoCapitalize="none" returnKeyType="search"
              style={{ flex: 1, color: colors.textPrimary, backgroundColor: colors.bgInput, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 }}
            />
            <Pressable onPress={closeSearch}><AppText variant="body" tone="accent" style={{ fontWeight: '700' }}>Cancel</AppText></Pressable>
          </View>
          {searchQuery.trim().length < 2 ? (
            <View style={{ alignItems: 'center', marginTop: 40, gap: 6, paddingHorizontal: 24 }}>
              <Feather name="search" size={28} color={colors.textTertiary} />
              <AppText variant="title">Find players</AppText>
              <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>Search by name or player ID (at least 2 characters)</AppText>
            </View>
          ) : searching ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={colors.accent} />
          ) : searchResults.length === 0 ? (
            <AppText variant="body" tone="secondary" style={{ textAlign: 'center', marginTop: 32 }}>No players found</AppText>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {searchResults.filter(rs => !blocked.has(rs.odid)).map(rs => {
                const sent = requestsSent.has(rs.odid);
                const canAdd = !rs.isFriend && !sent && rs.allowFriendRequests;
                return (
                  <View key={rs.odid} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSurface }}>
                    <AvatarBubble avatar={rs.avatar} />
                    <View style={{ flex: 1 }}>
                      <AppText variant="body" numberOfLines={1} style={{ fontWeight: '700' }}>{rs.name}</AppText>
                      {rs.level != null && <AppText variant="caption" tone="secondary">Lv.{rs.level} · {(rs.totalXp ?? 0).toLocaleString()} XP</AppText>}
                    </View>
                    {sent ? (
                      <Button label="Cancel" variant="secondary" onPress={() => cancelFriendRequest(rs.odid)} style={{ paddingVertical: 8, paddingHorizontal: 14 }} />
                    ) : canAdd ? (
                      <Button label="Add" onPress={() => sendFriendRequest(rs)} loading={sendingRequest} style={{ paddingVertical: 8, paddingHorizontal: 18 }} />
                    ) : (
                      <AppText variant="caption" tone="tertiary">{rs.isFriend ? 'Friends' : 'Not accepting'}</AppText>
                    )}
                    <Pressable hitSlop={8} onPress={() => { closeSearch(); setActionFor({ odid: rs.odid, name: rs.name, avatar: rs.avatar, level: rs.level, totalXp: rs.totalXp }); }}>
                      <Feather name="more-horizontal" size={20} color={colors.textTertiary} />
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}
