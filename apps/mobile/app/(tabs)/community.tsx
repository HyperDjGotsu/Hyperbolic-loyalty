import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useApi } from '@/lib/api';
import { LoadingView } from '@/components/ui';
import { C } from '@/lib/theme';

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
  { id: 'overall',            label: 'Overall',    icon: '🏆' },
  { id: 'one_piece',          label: 'One Piece',  icon: '🏴‍☠️' },
  { id: 'pokemon',            label: 'Pokemon',    icon: '⚡' },
  { id: 'mtg',                label: 'MTG',        icon: '✨' },
  { id: 'star_wars_unlimited', label: 'Star Wars', icon: '🌟' },
  { id: 'gundam',             label: 'Gundam',     icon: '🤖' },
  { id: 'lorcana',            label: 'Lorcana',    icon: '🪄' },
  { id: 'yugioh',             label: 'Yu-Gi-Oh',  icon: '⭐' },
];

function rankColor(rank: number): string {
  if (rank === 1) return '#f4c542';
  if (rank === 2) return '#d4d4d8';
  if (rank === 3) return '#c97c3a';
  return C.textTertiary;
}

function AvatarBubble({ avatar }: { avatar: Avatar }) {
  if (avatar.type === 'photo' && avatar.photoUrl) {
    return (
      <Image
        source={{ uri: avatar.photoUrl }}
        style={[styles.avatarCircle, { backgroundColor: avatar.background }]}
      />
    );
  }
  return (
    <View style={[styles.avatarCircle, { backgroundColor: avatar.background }]}>
      <Text style={styles.avatarEmoji}>{avatar.base}</Text>
    </View>
  );
}

export default function CommunityScreen() {
  const api = useApi();
  const insets = useSafeAreaInsets();
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [requestsSent, setRequestsSent] = useState<Set<string>>(new Set());
  const [sendingRequest, setSendingRequest] = useState(false);
  const homeStoreId = useRef<string | null>(null);
  const friendsLoaded = useRef(false);
  const friendsLoadInFlight = useRef(false);
  const inFlightPrefs = useRef(new Set<string>());

  useEffect(() => {
    if (!searchOpen) return;
    const query = searchQuery.trim();
    if (!query) { setSearchResults([]); setSearching(false); return; }
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

  // Load the player's homeStoreId once so we know what to pass to the store leaderboard
  useEffect(() => {
    api.get<{ homeStoreId: string | null }>('/api/player/pass-status')
      .then(d => {
        homeStoreId.current = d.homeStoreId ?? null;
        // Default to network if no home store
        if (!d.homeStoreId) setScope('network');
        loadLeaderboard('overall', d.homeStoreId ?? null, scope);
      })
      .catch(() => {
        setScope('network');
        loadLeaderboard('overall', null, 'network');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLeaderboard(
    g: string = game,
    storeId: string | null = homeStoreId.current,
    s: 'store' | 'network' = scope,
  ) {
    try {
      const gameParam = g !== 'overall' ? `&game=${g}` : '';
      const storeParam = s === 'store' && storeId ? `&store_id=${storeId}` : '';
      const data = await api.get<{ leaderboard: LeaderboardEntry[] }>(
        `/api/community/leaderboard?limit=50${gameParam}${storeParam}`
      );
      setEntries(data.leaderboard ?? []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleScope(s: 'store' | 'network') {
    setScope(s);
    setLoading(true);
    loadLeaderboard(game, homeStoreId.current, s);
  }

  function handleGame(g: string) {
    setGame(g);
    setLoading(true);
    loadLeaderboard(g, homeStoreId.current, scope);
  }

  function onRefresh() {
    setRefreshing(true);
    loadLeaderboard(game, homeStoreId.current, scope);
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
      await api.delete(`/api/community/friends/${odid}`);
      setFriends(current => current.filter(friend => friend.odid !== odid));
    } catch {
      // Keep the friend in place so the player can retry.
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

  return (
    <View style={styles.container}>
      <View style={[styles.tabRow, { marginTop: insets.top }]}>
        {([
          { id: 'ranks' as const, label: '🏆 Ranks' },
          { id: 'friends' as const, label: '👥 Friends' },
        ]).map(tab => (
          <Pressable key={tab.id} style={styles.tab} onPress={() => handleTab(tab.id)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {tab.id === 'friends' && friendRequests.length > 0 && (
                <View style={styles.requestBadge}>
                  <Text style={styles.requestBadgeText}>{friendRequests.length}</Text>
                </View>
              )}
            </View>
            {activeTab === tab.id && <View style={styles.tabUnderline} />}
          </Pressable>
        ))}
        <Pressable accessibilityLabel="Search players" style={styles.searchHeaderButton} onPress={() => setSearchOpen(true)}>
          <Text style={styles.searchHeaderIcon}>🔍</Text>
        </Pressable>
      </View>

      {activeTab === 'ranks' ? (
        <>
          {/* Scope toggle */}
          <View style={styles.scopeRow}>
        {(['store', 'network'] as const).map(s => (
          <Pressable
            key={s}
            style={[
              styles.scopeBtn,
              scope === s && styles.scopeBtnActive,
              s === 'store' && !homeStoreId.current && styles.scopeBtnDisabled,
            ]}
            onPress={() => { if (s !== 'store' || homeStoreId.current) handleScope(s); }}
          >
            <Text style={[styles.scopeText, scope === s && styles.scopeTextActive]}>
              {s === 'store' ? '🏪 My Store' : '🌐 Network'}
            </Text>
          </Pressable>
        ))}
          </View>

          {/* Game filter pills */}
          <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        {GAMES.map(g => (
          <Pressable
            key={g.id}
            style={[styles.pill, game === g.id && styles.pillActive]}
            onPress={() => handleGame(g.id)}
          >
            <Text style={styles.pillIcon}>{g.icon}</Text>
            <Text style={[styles.pillLabel, game === g.id && styles.pillLabelActive]}>
              {g.label}
            </Text>
          </Pressable>
        ))}
          </ScrollView>

          {loading ? (
        <LoadingView style={styles.fill} />
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyTitle}>No rankings yet</Text>
          <Text style={styles.emptyBody}>
            {scope === 'store'
              ? 'Earn XP at events to appear on the store board.'
              : game === 'overall'
              ? 'No players ranked yet.'
              : `No ${GAMES.find(g => g.id === game)?.label ?? 'game'} rankings yet — be the first to compete!`}
          </Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
          }
        >
          <View style={{ height: 8 }} />
          {entries.map(entry => (
            <View key={entry.id} style={styles.row}>
              {/* Rank */}
              <Text style={[styles.rank, { color: rankColor(entry.rank) }]}>
                #{entry.rank}
              </Text>

              {/* Avatar */}
              <AvatarBubble avatar={entry.avatar} />

              {/* Name + meta */}
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {entry.hidden ? 'Anonymous' : entry.name}
                </Text>
                <Text style={styles.meta}>Lv.{entry.level}</Text>
              </View>

              {/* XP */}
              <Text style={styles.xp}>{entry.totalXp.toLocaleString()}</Text>
            </View>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
          )}
        </>
      ) : friendsLoading ? (
        <LoadingView style={styles.fill} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.friendsContent}
          refreshControl={
            <RefreshControl
              refreshing={friendsRefreshing}
              onRefresh={refreshFriends}
              tintColor={C.accent}
            />
          }
        >
          {friendRequests.length > 0 && (
            <View style={styles.requestsSection}>
              <Text style={styles.requestsTitle}>
                ⚠️ Pending Requests ({friendRequests.length})
              </Text>
              {friendRequests.map(request => (
                <View key={request.friendshipId} style={styles.requestCard}>
                  <AvatarBubble avatar={request.avatar} />
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{request.name}</Text>
                    <Text style={styles.requestTimestamp}>{request.timestamp}</Text>
                  </View>
                  <Pressable
                    accessibilityLabel={`Accept friend request from ${request.name}`}
                    style={[styles.requestButton, styles.acceptButton]}
                    onPress={() => respondToRequest(request.friendshipId, 'accept')}
                  >
                    <Text style={styles.requestButtonText}>✓</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Decline friend request from ${request.name}`}
                    style={[styles.requestButton, styles.declineButton]}
                    onPress={() => respondToRequest(request.friendshipId, 'decline')}
                  >
                    <Text style={styles.requestButtonText}>✗</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {friends.length > 0 ? (
            <View>
              <Text style={styles.friendsTitle}>Friends ({friends.length})</Text>
              {friends.map(friend => (
                <View key={friend.id} style={styles.friendRow}>
                  <AvatarBubble avatar={friend.avatar} />
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{friend.name}</Text>
                    <Text style={styles.meta}>
                      Lv.{friend.level} · {friend.totalXp.toLocaleString()} XP
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel={`Remove ${friend.name} from friends`}
                    style={styles.unfriendButton}
                    onPress={() => unfriend(friend.odid)}
                  >
                    <Text style={styles.unfriendText}>Remove</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.friendsEmpty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyBody}>No friends yet — use search to find players!</Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={searchOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={closeSearch}>
        <View style={[styles.searchModal, { paddingTop: insets.top }]}>
          <View style={styles.searchModalHeader}>
            <TextInput autoFocus value={searchQuery} onChangeText={setSearchQuery} placeholder="Search players" placeholderTextColor={C.textTertiary} style={styles.searchInput} autoCapitalize="none" returnKeyType="search" />
            <Pressable onPress={closeSearch}><Text style={styles.cancelText}>Cancel</Text></Pressable>
          </View>
          {searching ? <ActivityIndicator style={styles.searchLoader} color={C.accent} /> : searchQuery.trim() && searchResults.length === 0 ? (
            <View style={styles.searchEmpty}><Text style={styles.emptyBody}>No players found</Text></View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled">{searchResults.map(result => {
              const alreadyFriend = result.isFriend;
              const sent = requestsSent.has(result.odid);
              const canAdd = !alreadyFriend && !sent && result.allowFriendRequests;
              return (
                <View key={result.id} style={styles.searchResultRow}>
                  <AvatarBubble avatar={result.avatar} />
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{result.name}</Text>
                    <Text style={styles.meta}>Lv.{result.level ?? 1} · {(result.totalXp ?? 0).toLocaleString()} XP</Text>
                  </View>
                  <Pressable
                    disabled={!canAdd || sendingRequest}
                    style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
                    onPress={() => sendFriendRequest(result)}
                  >
                    <Text style={[styles.addBtnText, !canAdd && styles.addBtnTextDisabled]}>
                      {alreadyFriend ? '✓' : sent ? '📨' : !result.allowFriendRequests ? '—' : '+ Add'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}</ScrollView>
          )}
          {selectedResult && <View style={styles.profileOverlay}>
            <Pressable style={styles.profileBackdrop} onPress={() => setSelectedResult(null)} />
            <View style={[styles.miniProfile, { paddingBottom: Math.max(insets.bottom, 20) }]}><View style={styles.sheetHandle} /><AvatarBubble avatar={selectedResult.avatar} /><Text style={styles.profileName}>{selectedResult.name}</Text><Text style={styles.profileMeta}>Level {selectedResult.level ?? 1} · {(selectedResult.totalXp ?? 0).toLocaleString()} XP</Text>
              <Pressable disabled={selectedResult.isFriend || requestsSent.has(selectedResult.odid) || !selectedResult.allowFriendRequests || sendingRequest} style={[styles.friendRequestButton, (selectedResult.isFriend || requestsSent.has(selectedResult.odid) || !selectedResult.allowFriendRequests) && styles.friendRequestDisabled]} onPress={() => sendFriendRequest(selectedResult)}><Text style={styles.friendRequestText}>{selectedResult.isFriend ? '✓ Friends' : requestsSent.has(selectedResult.odid) ? '📨 Request Sent' : !selectedResult.allowFriendRequests ? 'Friend Requests Disabled' : sendingRequest ? 'Sending…' : 'Send Friend Request'}</Text></Pressable>
            </View>
          </View>}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgBase },
  fill:      { flex: 1, backgroundColor: C.bgBase },

  // Tabs
  tabRow: { flexDirection: 'row', paddingRight: 52, borderBottomWidth: 1, borderBottomColor: C.border },
  tab: { flex: 1, alignItems: 'center', paddingTop: 14, paddingBottom: 12 },
  tabText: { color: C.textTertiary, fontSize: 14, fontWeight: '700' },
  tabTextActive: { color: C.accent },
  tabUnderline: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: -1,
    height: 2,
    borderRadius: 1,
    backgroundColor: C.accent,
  },
  requestBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  requestBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  searchHeaderButton: { position: 'absolute', right: 8, top: 5, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  searchHeaderIcon: { fontSize: 19 },

  // Scope toggle
  scopeRow: { flexDirection: 'row', margin: 16, gap: 8 },
  scopeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: C.bgSurface,
    borderWidth: 1,
    borderColor: C.border,
  },
  scopeBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  scopeBtnDisabled: { opacity: 0.4 },
  scopeText: { color: C.textTertiary, fontWeight: '600', fontSize: 14 },
  scopeTextActive: { color: C.accentFg },

  // Game pills
  pillRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8, flexDirection: 'row' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.bgSurface,
    borderWidth: 1,
    borderColor: C.border,
  },
  pillActive: { backgroundColor: 'rgba(196,181,253,0.15)', borderColor: C.accent },
  pillIcon: { fontSize: 14 },
  pillLabel: { color: C.textSecondary, fontSize: 12, fontWeight: '600' },
  pillLabelActive: { color: C.accent },

  // Leaderboard rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  rank: { width: 36, fontSize: 14, fontWeight: '800', textAlign: 'right' },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarEmoji: { fontSize: 20 },
  info: { flex: 1 },
  name: { color: C.textPrimary, fontSize: 14, fontWeight: '700' },
  meta: { color: C.textTertiary, fontSize: 11, marginTop: 1 },
  xp: { color: C.xp, fontSize: 13, fontWeight: '700' },

  // Friends
  friendsContent: { flexGrow: 1, padding: 16, paddingBottom: 32 },
  requestsSection: { marginBottom: 20, gap: 8 },
  requestsTitle: { color: C.orange, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(249,115,22,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.30)',
  },
  requestTimestamp: { color: C.textSecondary, fontSize: 11, marginTop: 2 },
  requestButton: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: { backgroundColor: C.success },
  declineButton: { backgroundColor: C.bgElevated },
  requestButtonText: { color: C.textPrimary, fontSize: 17, fontWeight: '800' },
  friendsTitle: { color: C.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  unfriendButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
  },
  unfriendText: { color: C.textTertiary, fontSize: 11, fontWeight: '700' },
  friendsEmpty: { flex: 1, minHeight: 320, alignItems: 'center', justifyContent: 'center', padding: 32 },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: C.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptyBody: { color: C.textTertiary, fontSize: 13, textAlign: 'center' },
  searchModal: { flex: 1, backgroundColor: C.bgBase },
  searchModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  searchInput: { flex: 1, height: 44, borderRadius: 12, paddingHorizontal: 14, color: C.textPrimary, backgroundColor: C.bgSurface, borderWidth: 1, borderColor: C.border, fontSize: 15 },
  cancelText: { color: C.accent, fontWeight: '700', fontSize: 14 },
  searchLoader: { marginTop: 32 },
  searchEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchResultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.accent },
  addBtnDisabled: { backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border },
  addBtnText: { color: C.accentFg, fontSize: 13, fontWeight: '700' },
  addBtnTextDisabled: { color: C.textTertiary },
  profileOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
  profileBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.65)' },
  miniProfile: { backgroundColor: C.bgElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, alignItems: 'center', paddingTop: 12, paddingHorizontal: 24 },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: C.border, marginBottom: 20 },
  profileName: { color: C.textPrimary, fontSize: 20, fontWeight: '800', marginTop: 12 },
  profileMeta: { color: C.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 20 },
  friendRequestButton: { width: '100%', minHeight: 48, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  friendRequestDisabled: { backgroundColor: C.bgSurface, borderWidth: 1, borderColor: C.border },
  friendRequestText: { color: C.accentFg, fontSize: 14, fontWeight: '800' },
});
