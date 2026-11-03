import { useState } from 'react';
import { Alert, Pressable, Share, View } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '@/lib/theme-context';
import { AppText } from '@/components/kit';
import { HOME_TOUR_KEY, PAGE_INTRO_KEY_PREFIX, WELCOME_KEY } from '@/lib/first-run';

// Pieces of the Profile tab that mirror the website's mobile profile page.

function useCard() {
  const { colors } = useTheme();
  return {
    colors,
    card: { backgroundColor: colors.bgSurface, borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderColor: colors.border } as const,
  };
}

export function SectionTitle({ children }: { children: string }) {
  return <AppText variant="title" style={{ marginHorizontal: 16, marginTop: 24, fontSize: 16 }}>{children}</AppText>;
}

export type ActivityEntry = { id: string; text: string; xp: number; date: string };

export function StatsStrip({ level, gamesPlayed, eventsAttended, eventsThisMonth, totalXp }: {
  level: number; gamesPlayed: number; eventsAttended: number; eventsThisMonth: number; totalXp: number;
}) {
  const { colors, card } = useCard();
  const tiles = [
    { label: 'Level', value: level, color: colors.textPrimary },
    { label: 'Games played', value: gamesPlayed, color: colors.accent },
    { label: 'Events attended', value: eventsAttended, color: '#4ade80' },
    { label: 'This month', value: eventsThisMonth, color: '#facc15' },
    { label: 'Total XP', value: totalXp, color: colors.xp },
  ];
  return (
    <View style={{ marginHorizontal: 16, marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {tiles.map(t => (
        <View key={t.label} style={[card, { marginHorizontal: 0, marginTop: 0, width: '48%', flexGrow: 1, alignItems: 'center', paddingVertical: 14 }]}>
          <AppText variant="display" style={{ color: t.color, fontSize: 26, lineHeight: 30, fontVariant: ['tabular-nums'] }}>{t.value.toLocaleString()}</AppText>
          <AppText variant="caption" tone="tertiary" style={{ marginTop: 2, textTransform: 'uppercase', fontSize: 11, fontWeight: '700' }}>{t.label}</AppText>
        </View>
      ))}
    </View>
  );
}

const MULTIPLIERS: Record<string, string> = { access: '1x', bronze: '1x', player: '1.5x', silver: '1.5x', all_access: '2x', gold: '2x', diamond: '2x' };

export function membershipStatusLabel(tier: string | null, status: string | null, free: boolean): { label: string; kind: 'active' | 'grace' | 'free' } {
  if (tier === 'shadow_vip') return { label: status === 'active' ? 'Active' : 'Shadow VIP', kind: status === 'active' ? 'active' : 'free' };
  if (free && status !== 'cancelled' && status !== 'expired') return { label: 'Free', kind: 'free' };
  if (status === 'active') return { label: 'Active', kind: 'active' };
  if (status === 'grace_period') return { label: 'Grace Period', kind: 'grace' };
  if (status === 'cancelled') return { label: 'Cancelled', kind: 'free' };
  if (status === 'expired') return { label: 'Expired', kind: 'free' };
  return { label: 'Free', kind: 'free' };
}

export function MembershipDetails({ passTier, passStatus, passExpiresAt, isTrial, currencyName }: {
  passTier: string | null; passStatus: string | null; passExpiresAt: string | null; isTrial: boolean; currencyName: string;
}) {
  const mult = passStatus === 'active' ? MULTIPLIERS[passTier ?? ''] : undefined;
  const date = passExpiresAt ? new Date(passExpiresAt) : null;
  const dateOk = date && !Number.isNaN(date.getTime());
  return (
    <View style={{ marginTop: 6, width: '100%' }}>
      {dateOk && passStatus === 'active' ? (
        <AppText variant="caption" tone="secondary">
          {isTrial ? 'Trial ends' : 'Renews'} {date!.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </AppText>
      ) : null}
      {mult ? <AppText variant="caption" tone="accent" style={{ fontWeight: '700', marginTop: 2 }}>{mult} {currencyName} at events</AppText> : null}
    </View>
  );
}

export function RecentActivity({ items }: { items: ActivityEntry[] }) {
  const { colors, card } = useCard();
  return (
    <>
      <SectionTitle>Recent Activity</SectionTitle>
      {items.length === 0 ? (
        <View style={card}><AppText variant="caption" tone="secondary">No activity yet. Check in to an event to start earning XP.</AppText></View>
      ) : (
        <View style={card}>
          {items.map((a, i) => (
            <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
              <View style={{ flex: 1 }}>
                <AppText variant="body" numberOfLines={1} style={{ textTransform: 'capitalize' }}>{a.text}</AppText>
                <AppText variant="caption" tone="tertiary">{a.date}</AppText>
              </View>
              <AppText variant="body" style={{ color: colors.xp, fontWeight: '800' }}>+{a.xp.toLocaleString()} XP</AppText>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

export type ReferralRow = { id: string; name: string; hasAttended: boolean; joinedAt: string };

// Share URL, how-it-works and the per-referral list. The code/stats header stays in the screen.
export function ReferralExtras({ shareUrl, referrals }: { shareUrl: string; referrals: ReferralRow[] }) {
  const { colors } = useCard();
  const [open, setOpen] = useState(false);
  async function share() {
    try { await Share.share({ message: `Join Player Pass with my referral link and earn bonus XP! ${shareUrl}`, url: shareUrl }); } catch { /* dismissed */ }
  }
  return (
    <View style={{ width: '100%', marginTop: 4 }}>
      <Pressable onPress={share} style={{ borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElevated, padding: 10 }}>
        <AppText variant="caption" tone="tertiary" numberOfLines={1}>{shareUrl}</AppText>
        <AppText variant="caption" tone="accent" style={{ fontWeight: '700', marginTop: 2 }}>Tap to share link</AppText>
      </Pressable>
      <View style={{ marginTop: 12, backgroundColor: colors.bgElevated, borderRadius: 10, padding: 12, gap: 6 }}>
        <AppText variant="caption" tone="secondary" style={{ fontWeight: '700' }}>How it works</AppText>
        <AppText variant="caption">✓ Friend signs up with your code: they get +30 XP</AppText>
        <AppText variant="caption">✓ They attend their first event: you get +50 XP + 10 Points</AppText>
      </View>
      {referrals.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Pressable onPress={() => setOpen(o => !o)} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="caption" tone="secondary">Your Referrals ({referrals.length})</AppText>
            <AppText variant="caption" tone="secondary">{open ? '▲' : '▼'}</AppText>
          </Pressable>
          {open && referrals.map(r => (
            <View key={r.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, backgroundColor: colors.bgElevated, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
              <AppText variant="body" numberOfLines={1} style={{ flex: 1 }}>{r.name}</AppText>
              <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: r.hasAttended ? 'rgba(34,197,94,0.18)' : 'rgba(249,115,22,0.18)' }}>
                <AppText variant="caption" style={{ color: r.hasAttended ? '#4ade80' : '#fb923c', fontSize: 11, fontWeight: '700' }}>{r.hasAttended ? 'Attended' : 'Pending'}</AppText>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const PROVIDER_NAMES: Record<string, string> = { google: 'Google', discord: 'Discord', apple: 'Apple', facebook: 'Facebook', github: 'GitHub' };

// Read-only list of the sign-in methods on the Clerk account (linking happens on the website).
export function SignInMethods() {
  const { user } = useUser();
  const { colors, card } = useCard();
  if (!user) return null;
  const accounts = user.externalAccounts ?? [];
  const email = user.primaryEmailAddress?.emailAddress;
  return (
    <>
      <SectionTitle>Sign-in methods</SectionTitle>
      <View style={card}>
        <AppText variant="caption" tone="tertiary" style={{ marginBottom: 6 }}>Ways you can log in to this account.</AppText>
        {email ? <Row label="Email" detail={email} /> : null}
        {accounts.map(a => (
          <Row key={a.id} label={PROVIDER_NAMES[String(a.provider)] ?? String(a.provider)} detail={a.emailAddress || a.username || 'Connected'} />
        ))}
        <AppText variant="caption" tone="tertiary" style={{ marginTop: 8, color: colors.textTertiary }}>To link Google or Discord, open Profile on the website.</AppText>
      </View>
    </>
  );
}

function Row({ label, detail }: { label: string; detail: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
      <AppText variant="body" style={{ fontWeight: '600' }}>{label}</AppText>
      <AppText variant="caption" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>{detail}</AppText>
    </View>
  );
}

async function clear(keys: string[]) {
  await Promise.all(keys.map(k => SecureStore.deleteItemAsync(k).catch(() => {})));
}

export function ReplayLinks() {
  const items = [
    { label: 'Replay welcome tour', run: async () => { await clear([WELCOME_KEY]); await SecureStore.setItemAsync(HOME_TOUR_KEY, 'true').catch(() => {}); Alert.alert('Welcome tour reset', 'It will play the next time you open the app.'); } },
    { label: 'Replay Home walkthrough', run: async () => { await clear([HOME_TOUR_KEY]); Alert.alert('Walkthrough reset', 'It will play the next time you open the app.'); } },
    { label: 'Replay page tips', run: async () => { await clear(['events', 'community', 'prize-wall', 'profile'].map(k => PAGE_INTRO_KEY_PREFIX + k)); Alert.alert('Page tips reset', 'Tips will show again when you open each tab.'); } },
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginHorizontal: 16, marginTop: 20 }}>
      {items.map(i => (
        <Pressable key={i.label} onPress={() => void i.run()} hitSlop={8}>
          <AppText variant="caption" tone="tertiary" style={{ textDecorationLine: 'underline' }}>{i.label}</AppText>
        </Pressable>
      ))}
    </View>
  );
}
