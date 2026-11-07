import { useState } from 'react';
import { Alert, Pressable, Share, View } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/lib/theme-context';
import { AppText } from '@/components/kit';
import { useRouter } from 'expo-router';
import { HOME_TOUR_KEY, requestReplay } from '@/lib/first-run';

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
    try { await Share.share({ message: `Join PlayerPass with my referral link and earn bonus XP! ${shareUrl}`, url: shareUrl }); } catch { /* dismissed */ }
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

type Provider = { id: 'google' | 'discord'; strategy: 'oauth_google' | 'oauth_discord'; label: string };
const PROVIDERS: Provider[] = [
  { id: 'google', strategy: 'oauth_google', label: 'Google' },
  { id: 'discord', strategy: 'oauth_discord', label: 'Discord' },
];

function clerkError(e: unknown, fallback: string): string {
  const err = (e as { errors?: Array<{ longMessage?: string; message?: string }> } | null)?.errors?.[0];
  return err?.longMessage || err?.message || fallback;
}

// "Sign-in methods": link Google or Discord for one-tap login, same as the website. Same account either way.
export function SignInMethods() {
  const { user } = useUser();
  const { colors, card } = useCard();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  if (!user) return null;
  const accounts = user.externalAccounts ?? [];
  const email = user.primaryEmailAddress?.emailAddress;
  const accountFor = (p: Provider) => accounts.find(a => String(a.provider) === p.id || String(a.provider) === p.strategy);
  const signInMethods = accounts.length + (user.passwordEnabled ? 1 : 0);

  async function connect(p: Provider) {
    if (!user || busy) return;
    setBusy(p.id);
    setError('');
    try {
      const redirectUrl = Linking.createURL('/profile');
      const res = await user.createExternalAccount({ strategy: p.strategy, redirectUrl });
      const url = res.verification?.externalVerificationRedirectURL;
      if (!url) { setError(`Could not start the ${p.label} connection. Try again.`); return; }
      await WebBrowser.openAuthSessionAsync(url.toString(), redirectUrl);
      await user.reload();
      const linked = (user.externalAccounts ?? []).some(a => String(a.provider) === p.id || String(a.provider) === p.strategy);
      if (!linked) setError(`${p.label} was not connected. Try again.`);
    } catch (e) {
      setError(clerkError(e, `Could not connect ${p.label}. Try again.`));
    } finally { setBusy(null); }
  }

  function confirmDisconnect(p: Provider) {
    Alert.alert(`Disconnect ${p.label}?`, 'You will no longer be able to sign in with it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => void disconnect(p) },
    ]);
  }

  async function disconnect(p: Provider) {
    const acct = accountFor(p);
    if (!user || !acct || busy) return;
    setBusy(p.id);
    setError('');
    try {
      await acct.destroy();
      await user.reload();
    } catch (e) {
      setError(clerkError(e, `Could not disconnect ${p.label}. Try again.`));
    } finally { setBusy(null); }
  }

  const other = accounts.filter(a => !PROVIDERS.some(p => String(a.provider) === p.id || String(a.provider) === p.strategy));
  return (
    <>
      <SectionTitle>Sign-in methods</SectionTitle>
      <View style={card}>
        <AppText variant="caption" tone="tertiary" style={{ marginBottom: 6 }}>Connect Google or Discord to sign in with one tap. It is the same account either way.</AppText>
        {email ? <Row label="Email" detail={email} /> : null}
        {PROVIDERS.map(p => {
          const acct = accountFor(p);
          const lastOne = !!acct && signInMethods <= 1;
          const working = busy === p.id;
          return (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
              <View style={{ flex: 1 }}>
                <AppText variant="body" style={{ fontWeight: '600' }}>{p.label}</AppText>
                <AppText variant="caption" tone="tertiary" numberOfLines={1}>{acct ? (acct.username || acct.emailAddress || 'Connected') : 'Not connected'}</AppText>
              </View>
              {acct ? (
                <Pressable disabled={busy !== null || lastOne} onPress={() => confirmDisconnect(p)} hitSlop={8} style={{ opacity: busy !== null || lastOne ? 0.4 : 1 }}>
                  <AppText variant="caption" tone="secondary" style={{ fontWeight: '700' }}>{working ? '...' : lastOne ? 'Only sign-in' : 'Disconnect'}</AppText>
                </Pressable>
              ) : (
                <Pressable disabled={busy !== null} onPress={() => void connect(p)} style={{ opacity: busy !== null ? 0.5 : 1, backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <AppText variant="caption" style={{ color: colors.accentFg, fontWeight: '800' }}>{working ? '...' : 'Connect'}</AppText>
                </Pressable>
              )}
            </View>
          );
        })}
        {other.map(a => <Row key={a.id} label={String(a.provider)} detail={a.emailAddress || a.username || 'Connected'} />)}
        {error ? <AppText variant="caption" style={{ marginTop: 8, color: colors.danger }}>{error}</AppText> : null}
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
  const router = useRouter();
  const goHome = () => { try { router.navigate('/(tabs)'); } catch { /* stay put */ } };
  const items = [
    // Welcome slides first; the Home walkthrough follows them on its own.
    { label: 'Replay welcome tour', run: async () => { await clear([HOME_TOUR_KEY]); goHome(); requestReplay('welcome'); } },
    { label: 'Replay Home walkthrough', run: async () => { await clear([HOME_TOUR_KEY]); goHome(); requestReplay('tour'); } },
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
