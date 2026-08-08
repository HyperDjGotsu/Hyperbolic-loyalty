import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  homeStore: { id: string; name: string; city: string | null } | null;
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

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const api = useApi();
  const [player, setPlayer] = useState<Player | null>(null);
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [referral, setReferral] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function load() {
    try {
      const [playerData, prefData] = await Promise.all([
        api.get<Player>('/api/player/by-clerk'),
        api.get<{ prefs: NotifPrefs }>('/api/player/notification-preferences'),
      ]);
      setPlayer(playerData);
      setPrefs({ ...DEFAULT_PREFS, ...prefData.prefs });
      // Referral stats — non-critical, load separately
      api.get<ReferralStats>('/api/referral/stats')
        .then(data => setReferral(data))
        .catch(() => {});
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function togglePref(key: keyof NotifPrefs, value: boolean) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setSaving(true);
    try {
      await api.post('/api/player/notification-preferences', updated);
    } catch {
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  }

  async function shareReferral() {
    if (!referral) return;
    await Share.share({
      message: `Join Player Pass with my referral link and earn bonus XP! ${referral.shareUrl}`,
      url: referral.shareUrl,
    });
  }

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
    <ScrollView style={styles.container}>
      {/* Player card */}
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{player.displayName[0]?.toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{player.displayName}</Text>
        <Text style={styles.hypId}>{player.hyp_id}</Text>
        {player.homeStore ? (
          <Text style={styles.store}>📍 {player.homeStore.name}</Text>
        ) : null}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statVal, styles.xpVal]}>{player.xp.toLocaleString()}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statVal, styles.pointsVal]}>{player.gems}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{(player.passTier ?? 'FREE').toUpperCase()}</Text>
            <Text style={styles.statLabel}>Pass</Text>
          </View>
        </View>
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
              onValueChange={v => togglePref(key, v)}
              trackColor={{ false: 'rgba(242,239,232,0.08)', true: '#c4b5fd' }}
              thumbColor="#fff"
            />
          </View>
        ))}
      </View>

      <Pressable style={styles.signOutBtn} onPress={() => signOut()}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
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
});
