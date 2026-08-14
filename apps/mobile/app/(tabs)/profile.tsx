import { useAuth } from '@clerk/clerk-expo';
import { API_BASE } from '@/lib/config';
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useApi } from '@/lib/api';

type Player = {
  linked: boolean;
  id: string;
  hyp_id: string;
  displayName: string;
  xp: number;
  gems: number;
  passTier: string | null;
  passStatus: string | null;
  passExpiresAt: string | null;
  avatarConfig: AvatarConfig;
  homeStore: { id: string; name: string; city: string | null } | null;
};

type AvatarConfig = {
  base: string;
  background: string;
  frame: string;
  badge: string | null;
  photo_url: string | null;
};

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  assetData: { emoji?: string; color?: string; style?: string };
};

type Inventory = Record<'base' | 'background' | 'frame' | 'badge', InventoryItem[]>;
type Privacy = {
  profile_visibility: 'public' | 'friends' | 'private';
  show_as_anonymous: boolean;
  allow_friend_requests: boolean;
  hide_from_search: boolean;
};

type NotifPrefs = {
  daily_rewards: boolean;
  events: boolean;
  leaderboard: boolean;
  social: boolean;
  store: boolean;
};

type ReferralStats = {
  referralCode: string;
  shareUrl: string;
  stats: {
    totalReferred: number;
    attendedFirstEvent: number;
    totalXpEarned: number;
  };
};

const DEFAULT_PREFS: NotifPrefs = {
  daily_rewards: true,
  events: true,
  leaderboard: true,
  social: true,
  store: true,
};

const PREF_LABELS: { key: keyof NotifPrefs; label: string; icon: string }[] = [
  { key: 'events', label: 'Events', icon: '📅' },
  { key: 'daily_rewards', label: 'Daily Rewards', icon: '🎁' },
  { key: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { key: 'social', label: 'Social', icon: '💬' },
  { key: 'store', label: 'Store Broadcasts', icon: '📢' },
];

const GAMES = [
  ['one_piece', 'One Piece', '🏴‍☠️'], ['pokemon', 'Pokemon', '⚡'], ['mtg', 'MTG', '✨'],
  ['gundam', 'Gundam', '🤖'], ['star_wars_unlimited', 'Star Wars', '🌟'],
  ['vanguard', 'Vanguard', '⚔️'], ['lorcana', 'Lorcana', '🪄'], ['uvs', 'UVS', '👊'],
  ['digimon', 'Digimon', '🦖'], ['yugioh', 'Yu-Gi-Oh', '⭐'], ['riftbound', 'Riftbound', '🌀'],
  ['hololive', 'Hololive', '🎤'], ['weiss', 'Weiss Schwarz', '🎴'], ['sw_legion', 'SW Legion', '🎖️'],
  ['union_arena', 'Union Arena', '🛡️'], ['warhammer', 'Warhammer', '⚔️'],
] as const;

const EMPTY_INVENTORY: Inventory = { base: [], background: [], frame: [], badge: [] };
const DEFAULT_PRIVACY: Privacy = {
  profile_visibility: 'public', show_as_anonymous: false, allow_friend_requests: true, hide_from_search: false,
};

export default function ProfileScreen() {
  const { signOut, getToken } = useAuth();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const api = useApi();
  const insets = useSafeAreaInsets();
  const [player, setPlayer] = useState<Player | null>(null);
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [referral, setReferral] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [draftFavorites, setDraftFavorites] = useState<string[]>([]);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [inventory, setInventory] = useState<Inventory>(EMPTY_INVENTORY);
  const [avatarDraft, setAvatarDraft] = useState<AvatarConfig | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarTab, setAvatarTab] = useState<keyof Inventory>('base');
  const [privacy, setPrivacy] = useState<Privacy>(DEFAULT_PRIVACY);
  const [privacyDraft, setPrivacyDraft] = useState<Privacy>(DEFAULT_PRIVACY);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const prefsRef = useRef(prefs);
  const inFlightPrefs = useRef(new Set<keyof NotifPrefs>());

  prefsRef.current = prefs;

  async function load() {
    setError(false);
    try {
      const [playerData, prefData] = await Promise.all([
        api.get<Player>('/api/player/by-clerk'),
        api.get<{ prefs: NotifPrefs }>('/api/player/notification-preferences'),
      ]);
      setPlayer(playerData);
      setPrefs({ ...DEFAULT_PREFS, ...prefData.prefs });
      void Promise.all([
        api.get<{ favorites: string[] }>('/api/player/favorite-games').then(d => setFavorites(d.favorites ?? [])),
        api.get<{ grouped: Inventory; avatarConfig: AvatarConfig }>('/api/player/inventory').then(d => {
          setInventory({ ...EMPTY_INVENTORY, ...d.grouped });
          setPlayer(current => current ? { ...current, avatarConfig: d.avatarConfig } : current);
        }),
        api.get<{ privacy: Privacy }>('/api/player/privacy').then(d => setPrivacy({ ...DEFAULT_PRIVACY, ...d.privacy })),
      ]).catch(() => {});
      api.get<ReferralStats>('/api/referral/stats')
        .then(data => setReferral(data))
        .catch(() => {});
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { void load(); }, []));

  async function togglePref(key: keyof NotifPrefs, value: boolean) {
    if (inFlightPrefs.current.has(key)) return;
    inFlightPrefs.current.add(key);
    const updated = { ...prefsRef.current, [key]: value };
    setSaving(true);
    try {
      const response = await api.post<{ prefs: NotifPrefs }>('/api/player/notification-preferences', updated);
      setPrefs({ ...DEFAULT_PREFS, ...response.prefs });
    } catch {
      // Keep the last server-confirmed preferences.
    } finally {
      inFlightPrefs.current.delete(key);
      setSaving(inFlightPrefs.current.size > 0);
    }
  }

  async function handleSignOut() {
    // Deregister push token before Clerk clears the session (JWT still valid here)
    try {
      const [jwt, storedToken] = await Promise.all([
        getToken(),
        SecureStore.getItemAsync('expo_push_token'),
      ]);
      if (jwt) {
        const body = storedToken ? JSON.stringify({ expo_push_token: storedToken }) : JSON.stringify({});
        await fetch(`${API_BASE}/api/player/expo-push-token`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
          body,
        });
        if (storedToken) await SecureStore.deleteItemAsync('expo_push_token');
      }
    } catch { /* non-critical */ }
    signOut();
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete your account?',
      'This will permanently delete your Player Pass account, XP history, and all associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Your account will be permanently deleted immediately. There is no recovery or grace period.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete permanently',
                  style: 'destructive',
                  onPress: () => void performDeletion(),
                },
              ]
            );
          },
        },
      ]
    );
  }

  async function performDeletion() {
    setDeletingAccount(true);
    try {
      const jwt = await getToken();
      if (!jwt) throw new Error('No auth token');

      const res = await fetch(`${API_BASE}/api/player/delete`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwt}` },
      });

      const data = await res.json().catch(() => ({})) as Record<string, string>;

      if (res.ok && data.success) {
        await signOut();
        return;
      }

      if (data.error === 'staff_active') {
        Alert.alert(
          'Cannot Delete Account',
          data.message || 'Your account has active staff permissions. Ask your network administrator to remove your staff role before deleting your account.'
        );
        return;
      }

      if (data.error === 'deletion_in_progress') {
        Alert.alert('Deletion In Progress', 'Account deletion is already in progress. Please try again later.');
        return;
      }

      Alert.alert('Deletion Failed', 'Account deletion failed. Please contact support.');
    } catch {
      Alert.alert('Deletion Failed', 'Account deletion failed. Please contact support.');
    } finally {
      setDeletingAccount(false);
    }
  }

  async function shareReferral() {
    if (!referral) return;
    await Share.share({
      message: `Join Player Pass with my referral link and earn bonus XP! ${referral.shareUrl}`,
      url: referral.shareUrl,
    });
  }

  function openFavorites() { setDraftFavorites(favorites); setFavoritesOpen(true); }
  function toggleFavorite(id: string) {
    setDraftFavorites(current => current.includes(id)
      ? current.filter(value => value !== id)
      : current.length < 8 ? [...current, id] : current);
  }
  async function saveFavorites() {
    setModalSaving(true);
    try {
      const data = await api.post<{ favorites: string[] }>('/api/player/favorite-games', { favorites: draftFavorites });
      setFavorites(data.favorites ?? draftFavorites); setFavoritesOpen(false);
    } catch { Alert.alert('Could not save', 'Please try again.'); } finally { setModalSaving(false); }
  }

  function openAvatar() {
    if (!player?.avatarConfig) return;
    setAvatarDraft(player.avatarConfig); setAvatarTab('base'); setAvatarOpen(true);
  }
  function avatarAsset(category: keyof Inventory, id: string | null | undefined) {
    return inventory[category].find(item => item.id === id)?.assetData;
  }
  async function saveAvatar() {
    if (!avatarDraft) return;
    setModalSaving(true);
    try {
      await api.post('/api/player/avatar', avatarDraft);
      setPlayer(current => current ? { ...current, avatarConfig: avatarDraft } : current); setAvatarOpen(false);
    } catch { Alert.alert('Could not save avatar', 'Please try again.'); } finally { setModalSaving(false); }
  }

  function openPrivacy() { setPrivacyDraft(privacy); setPrivacyOpen(true); }
  async function savePrivacy() {
    setModalSaving(true);
    try {
      await api.post('/api/player/privacy', {
        profileVisibility: privacyDraft.profile_visibility,
        showAsAnonymous: privacyDraft.show_as_anonymous,
        allowFriendRequests: privacyDraft.allow_friend_requests,
        hideFromSearch: privacyDraft.hide_from_search,
      });
      setPrivacy(privacyDraft); setPrivacyOpen(false);
    } catch { Alert.alert('Could not save privacy settings', 'Please try again.'); } finally { setModalSaving(false); }
  }

  const passTierLabel = !player || !player.passTier || player.passTier === 'none' ? 'Free Member'
    : player.passTier === 'player' || player.passTier === 'player_pass' ? 'Player Pass'
    : player.passTier === 'all_access' || player.passTier === 'all_access_pass' ? 'All Access Pass'
    : player.passTier === 'shadow_vip' ? 'Shadow VIP' : player.passTier;
  const isFree = passTierLabel === 'Free Member';
  const isGrace = !isFree && player?.passStatus === 'grace_period';
  const isActive = !isFree && player?.passStatus === 'active';
  const avatarEmoji = avatarAsset('base', player?.avatarConfig?.base)?.emoji ?? player?.avatarConfig?.base ?? '🙂';
  const avatarBg = avatarAsset('background', player?.avatarConfig?.background)?.color ?? '#29241d';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#c4b5fd" size="large" />
      </View>
    );
  }

  if (error || !player || !player.linked) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load profile</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top }}>
      {/* Player card */}
      <View style={styles.card}>
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <Text style={styles.avatarText}>{avatarEmoji}</Text>
        </View>
        <Text style={styles.name}>{player.displayName}</Text>
        <Text style={styles.hypId}>{player.hyp_id}</Text>
        <Pressable style={styles.editAvatarBtn} onPress={openAvatar}><Text style={styles.editLink}>Edit Avatar</Text></Pressable>
        {player.homeStore ? (
          <Text style={styles.store}>📍 {player.homeStore.name}</Text>
        ) : null}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statVal, styles.xpVal]}>{player.xp.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Guild Points</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statVal, styles.pointsVal]}>{player.gems}</Text>
            <Text style={styles.statLabel}>Prize Points</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>
              {(player.passTier === 'none' || !player.passTier ? 'FREE' : player.passTier).toUpperCase()}
            </Text>
            <Text style={styles.statLabel}>Pass</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Membership</Text>
      <View style={[styles.card, styles.cardLeft, styles.membershipRow]}>
        <View style={styles.flex}><Text style={styles.membershipTier}>{passTierLabel}</Text>
          {isFree && <Text style={styles.helper}>Ask staff in-store to upgrade your membership</Text>}
        </View>
        <View style={[styles.statusBadge, isActive ? styles.statusActive : isGrace ? styles.statusGrace : styles.statusFree]}>
          <Text style={styles.statusText}>{isActive ? 'Active' : isGrace ? 'Grace Period' : 'Free'}</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}><Text style={styles.sectionHeaderTitle}>Favorite Games</Text>
        <Pressable onPress={openFavorites}><Text style={styles.editLink}>Edit</Text></Pressable></View>
      <View style={[styles.card, styles.cardLeft, styles.favoriteCard]}>
        {favorites.length ? <View style={styles.gamePills}>{favorites.map(id => {
          const game = GAMES.find(item => item[0] === id); return game ? <View key={id} style={styles.gamePill}><Text>{game[2]}</Text><Text style={styles.gamePillText}>{game[1]}</Text></View> : null;
        })}</View> : <Pressable onPress={openFavorites}><Text style={styles.helper}>No favorites yet</Text><Text style={styles.addLink}>+ Add favorites</Text></Pressable>}
      </View>

      {/* Referral */}
      {referral && (
        <>
          <Text style={styles.sectionTitle}>Refer a Friend</Text>
          <View style={[styles.card, styles.cardLeft]}>
            <View style={styles.referralRow}>
              <View style={styles.referralCode}>
                <Text style={styles.referralCodeLabel}>Your Code</Text>
                <Text style={styles.referralCodeText}>{referral.referralCode}</Text>
              </View>
              <Pressable style={styles.shareBtn} onPress={shareReferral}>
                <Text style={styles.shareBtnText}>Share</Text>
              </Pressable>
            </View>
            <View style={styles.referralStats}>
              <View style={styles.refStat}>
                <Text style={styles.refStatVal}>{referral.stats.totalReferred}</Text>
                <Text style={styles.refStatLabel}>Referred</Text>
              </View>
              <View style={styles.refStat}>
                <Text style={styles.refStatVal}>{referral.stats.attendedFirstEvent}</Text>
                <Text style={styles.refStatLabel}>Attended</Text>
              </View>
              <View style={styles.refStat}>
                <Text style={[styles.refStatVal, styles.xpColor]}>{referral.stats.totalXpEarned}</Text>
                <Text style={styles.refStatLabel}>XP Earned</Text>
              </View>
            </View>
            <Text style={styles.referralHint}>
              You earn +50 XP when a referral attends their first event
            </Text>
          </View>
        </>
      )}

      {/* Notification preferences */}
      <Text style={styles.sectionTitle}>Notifications {saving ? '(saving…)' : ''}</Text>
      <View style={[styles.card, styles.cardLeft]}>
        {PREF_LABELS.map(({ key, label, icon }) => (
          <View key={key} style={styles.prefRow}>
            <Text style={styles.prefIcon}>{icon}</Text>
            <Text style={styles.prefLabel}>{label}</Text>
            <Switch
              value={!!prefs[key]}
              onValueChange={v => { if (!saving) void togglePref(key, v); }}
              trackColor={{ false: 'rgba(242,239,232,0.08)', true: '#c4b5fd' }}
              thumbColor="#fff"
              disabled={saving}
            />
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Privacy</Text>
      <Pressable style={[styles.card, styles.settingsRow]} onPress={openPrivacy}>
        <Text style={styles.prefIcon}>🔒</Text><View style={styles.flex}><Text style={styles.settingsTitle}>Privacy Settings</Text><Text style={styles.helper}>Visibility, leaderboard and discovery</Text></View><Text style={styles.chevron}>›</Text>
      </Pressable>

      <Pressable style={styles.signOutBtn} onPress={() => void handleSignOut()}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      {/* Danger Zone */}
      <View style={styles.dangerZone}>
        <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
        <Pressable
          style={[styles.deleteBtn, deletingAccount && styles.deleteBtnDisabled]}
          onPress={() => void handleDeleteAccount()}
          disabled={deletingAccount}
        >
          {deletingAccount ? (
            <ActivityIndicator color="#ef4444" size="small" />
          ) : (
            <Text style={styles.deleteText}>Delete Account</Text>
          )}
        </Pressable>
        <Text style={styles.dangerZoneHint}>
          Permanently deletes your account and all data. This cannot be undone.
        </Text>
      </View>

      <View style={{ height: 40 }} />

      <Modal visible={favoritesOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setFavoritesOpen(false)}>
        <View style={[styles.modal, { paddingTop: insets.top }]}><View style={styles.modalHeader}><Pressable onPress={() => setFavoritesOpen(false)}><Text style={styles.modalAction}>Cancel</Text></Pressable><Text style={styles.modalTitle}>Favorite Games</Text><Pressable disabled={modalSaving} onPress={saveFavorites}><Text style={styles.modalAction}>{modalSaving ? 'Saving…' : 'Save'}</Text></Pressable></View>
          <Text style={styles.selectionCount}>{draftFavorites.length}/8 selected</Text><ScrollView contentContainerStyle={styles.optionGrid}>{GAMES.map(game => <Pressable key={game[0]} style={[styles.gameOption, draftFavorites.includes(game[0]) && styles.optionSelected]} onPress={() => toggleFavorite(game[0])}><Text style={styles.optionEmoji}>{game[2]}</Text><Text style={styles.optionName}>{game[1]}</Text></Pressable>)}</ScrollView></View>
      </Modal>

      <Modal visible={privacyOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setPrivacyOpen(false)}>
        <View style={[styles.modal, { paddingTop: insets.top }]}><View style={styles.modalHeader}><Pressable onPress={() => setPrivacyOpen(false)}><Text style={styles.modalAction}>Cancel</Text></Pressable><Text style={styles.modalTitle}>Privacy</Text><Pressable disabled={modalSaving} onPress={savePrivacy}><Text style={styles.modalAction}>{modalSaving ? 'Saving…' : 'Save'}</Text></Pressable></View><ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalSection}>Profile Visibility</Text>{([['public','🌐','Public','Anyone can see your profile'],['friends','👥','Friends Only','Only friends can see your profile'],['private','🔒','Private','Only you can see your profile']] as const).map(item => <Pressable key={item[0]} style={styles.privacyRow} onPress={() => setPrivacyDraft(p => ({ ...p, profile_visibility: item[0] }))}><Text style={styles.prefIcon}>{item[1]}</Text><View style={styles.flex}><Text style={styles.settingsTitle}>{item[2]}</Text><Text style={styles.helper}>{item[3]}</Text></View><Text style={styles.radio}>{privacyDraft.profile_visibility === item[0] ? '●' : '○'}</Text></Pressable>)}
          <Text style={styles.modalSection}>Leaderboard</Text><ToggleRow icon="🎭" title="Show as Anonymous" subtitle="Hide your name on leaderboard" value={privacyDraft.show_as_anonymous} onChange={v => setPrivacyDraft(p => ({ ...p, show_as_anonymous: v }))} />
          <Text style={styles.modalSection}>Discovery</Text><ToggleRow icon="🚫" title="Hide from Search" value={privacyDraft.hide_from_search} onChange={v => setPrivacyDraft(p => ({ ...p, hide_from_search: v }))} /><ToggleRow icon="👥" title="Allow Friend Requests" value={privacyDraft.allow_friend_requests} onChange={v => setPrivacyDraft(p => ({ ...p, allow_friend_requests: v }))} />
        </ScrollView></View>
      </Modal>

      <Modal visible={avatarOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setAvatarOpen(false)}>
        <View style={[styles.modal, { paddingTop: insets.top }]}><View style={styles.modalHeader}><Pressable onPress={() => setAvatarOpen(false)}><Text style={styles.modalAction}>Cancel</Text></Pressable><Text style={styles.modalTitle}>Edit Avatar</Text><Pressable disabled={modalSaving} onPress={saveAvatar}><Text style={styles.modalAction}>{modalSaving ? 'Saving…' : 'Save'}</Text></Pressable></View>
          {avatarDraft && <><View style={[styles.avatarPreview, { backgroundColor: avatarAsset('background', avatarDraft.background)?.color ?? '#29241d' }]}><Text style={styles.previewEmoji}>{avatarAsset('base', avatarDraft.base)?.emoji ?? avatarDraft.base ?? '🙂'}</Text>{avatarDraft.badge && <Text style={styles.previewBadge}>{avatarAsset('badge', avatarDraft.badge)?.emoji ?? '◆'}</Text>}</View><View style={styles.avatarTabs}>{(['base','background','frame','badge'] as const).map(tab => <Pressable key={tab} style={[styles.avatarTab, avatarTab === tab && styles.avatarTabActive]} onPress={() => setAvatarTab(tab)}><Text style={[styles.avatarTabText, avatarTab === tab && styles.editLink]}>{tab === 'background' ? 'BG' : tab[0].toUpperCase()+tab.slice(1)}</Text></Pressable>)}</View><ScrollView contentContainerStyle={styles.optionGrid}>{avatarTab === 'badge' && <Pressable style={[styles.avatarOption, avatarDraft.badge === null && styles.optionSelected]} onPress={() => setAvatarDraft(d => d ? { ...d, badge: null } : d)}><Text style={styles.optionEmoji}>∅</Text><Text style={styles.optionName}>None</Text></Pressable>}{inventory[avatarTab].map(item => <Pressable key={item.id} style={[styles.avatarOption, avatarDraft[avatarTab] === item.id && styles.optionSelected]} onPress={() => setAvatarDraft(d => d ? { ...d, [avatarTab]: item.id } : d)}><View style={[styles.assetSwatch, item.assetData.color ? { backgroundColor: item.assetData.color } : null]}><Text style={styles.optionEmoji}>{item.assetData.emoji ?? (avatarTab === 'frame' ? '◯' : '◆')}</Text></View><Text style={styles.optionName} numberOfLines={2}>{item.name}</Text></Pressable>)}</ScrollView></>}
        </View>
      </Modal>
    </ScrollView>
  );
}

function ToggleRow({ icon, title, subtitle, value, onChange }: { icon: string; title: string; subtitle?: string; value: boolean; onChange: (value: boolean) => void }) {
  return <View style={styles.privacyRow}><Text style={styles.prefIcon}>{icon}</Text><View style={styles.flex}><Text style={styles.settingsTitle}>{title}</Text>{subtitle && <Text style={styles.helper}>{subtitle}</Text>}</View><Switch value={value} onValueChange={onChange} trackColor={{ false: 'rgba(242,239,232,0.08)', true: '#c4b5fd' }} thumbColor="#fff" /></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111009' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111009' },
  card: {
    backgroundColor: '#1a1810',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(242,239,232,0.08)',
    alignItems: 'center',
  },
  cardLeft: { alignItems: 'flex-start' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(196,181,253,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#c4b5fd',
  },
  avatarText: { fontSize: 32, color: '#c4b5fd', fontWeight: '800' },
  editAvatarBtn: { marginTop: 7, paddingHorizontal: 10, paddingVertical: 5 },
  editLink: { color: '#c4b5fd', fontSize: 13, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '800', color: '#f2efe8' },
  hypId: { color: '#7a7060', fontSize: 12, marginTop: 2 },
  store: { color: '#a89f90', fontSize: 13, marginTop: 6 },
  statsRow: { flexDirection: 'row', marginTop: 20, gap: 0, alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(242,239,232,0.08)' },
  statVal: { fontSize: 18, fontWeight: '800', color: '#f2efe8' },
  xpVal: { color: '#f4c542' },
  pointsVal: { color: '#c4b5fd' },
  statLabel: { color: '#7a7060', fontSize: 12, marginTop: 2 },
  sectionTitle: {
    color: '#f2efe8',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 4,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 24, marginBottom: 4 },
  sectionHeaderTitle: { color: '#f2efe8', fontSize: 16, fontWeight: '700' },
  flex: { flex: 1 },
  membershipRow: { flexDirection: 'row', alignItems: 'center' },
  membershipTier: { color: '#f2efe8', fontSize: 16, fontWeight: '700' },
  helper: { color: '#7a7060', fontSize: 12, marginTop: 3 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  statusActive: { backgroundColor: 'rgba(34,197,94,0.18)' },
  statusGrace: { backgroundColor: 'rgba(234,179,8,0.18)' },
  statusFree: { backgroundColor: 'rgba(148,163,184,0.18)' },
  statusText: { color: '#f2efe8', fontSize: 11, fontWeight: '700' },
  favoriteCard: { minHeight: 70, justifyContent: 'center' },
  gamePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gamePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(196,181,253,0.10)', borderWidth: 1, borderColor: 'rgba(196,181,253,0.25)' },
  gamePillText: { color: '#c4b5fd', fontSize: 12, fontWeight: '600' },
  addLink: { color: '#c4b5fd', fontSize: 13, fontWeight: '700', marginTop: 7 },
  settingsRow: { flexDirection: 'row', alignItems: 'center' },
  settingsTitle: { color: '#f2efe8', fontSize: 14, fontWeight: '600' },
  chevron: { color: '#7a7060', fontSize: 28 },
  referralRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  referralCode: {},
  referralCodeLabel: { color: '#7a7060', fontSize: 11, marginBottom: 2 },
  referralCodeText: { color: '#f4c542', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  shareBtn: {
    backgroundColor: 'rgba(196,181,253,0.12)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.25)',
  },
  shareBtnText: { color: '#c4b5fd', fontWeight: '700', fontSize: 13 },
  referralStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  refStat: { alignItems: 'center' },
  refStatVal: { fontSize: 20, fontWeight: '800', color: '#f2efe8' },
  xpColor: { color: '#f4c542' },
  refStatLabel: { color: '#7a7060', fontSize: 11, marginTop: 2 },
  referralHint: { color: '#7a7060', fontSize: 12, fontStyle: 'italic' },
  prefRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 10 },
  prefIcon: { fontSize: 18, marginRight: 10 },
  prefLabel: { flex: 1, color: '#a89f90', fontSize: 15 },
  signOutBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  signOutText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
  errorText: { color: '#ef4444', fontSize: 15 },
  dangerZone: {
    marginHorizontal: 16,
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239,68,68,0.2)',
  },
  dangerZoneTitle: {
    color: '#7a7060',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  deleteBtn: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    minHeight: 50,
    justifyContent: 'center',
  },
  deleteBtnDisabled: {
    opacity: 0.5,
  },
  deleteText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
  dangerZoneHint: {
    color: '#7a7060',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  modal: { flex: 1, backgroundColor: '#111009' },
  modalHeader: { height: 58, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(242,239,232,0.08)' },
  modalTitle: { color: '#f2efe8', fontSize: 17, fontWeight: '800' },
  modalAction: { color: '#c4b5fd', fontSize: 14, fontWeight: '700', minWidth: 52 },
  selectionCount: { color: '#7a7060', fontSize: 12, textAlign: 'center', marginTop: 14 },
  optionGrid: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 40 },
  gameOption: { width: '47%', minHeight: 70, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(242,239,232,0.08)', backgroundColor: '#1a1810', flexDirection: 'row', alignItems: 'center', padding: 12, gap: 9 },
  avatarOption: { width: '30%', minHeight: 100, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(242,239,232,0.08)', backgroundColor: '#1a1810', alignItems: 'center', justifyContent: 'center', padding: 8 },
  optionSelected: { borderColor: '#c4b5fd', backgroundColor: 'rgba(196,181,253,0.12)' },
  optionEmoji: { fontSize: 25 },
  optionName: { color: '#f2efe8', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  modalContent: { padding: 16, paddingBottom: 40 },
  modalSection: { color: '#a89f90', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 8 },
  privacyRow: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(242,239,232,0.08)' },
  radio: { color: '#c4b5fd', fontSize: 22 },
  avatarPreview: { width: 112, height: 112, borderRadius: 56, alignSelf: 'center', marginVertical: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#c4b5fd' },
  previewEmoji: { fontSize: 54 },
  previewBadge: { position: 'absolute', right: -3, bottom: 4, fontSize: 25 },
  avatarTabs: { flexDirection: 'row', marginHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(242,239,232,0.08)' },
  avatarTab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  avatarTabActive: { borderBottomWidth: 2, borderBottomColor: '#c4b5fd' },
  avatarTabText: { color: '#7a7060', fontSize: 13, fontWeight: '700' },
  assetSwatch: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
