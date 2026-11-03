import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApi } from '@/lib/api';
import { useTheme } from '@/lib/theme-context';
import { fetchActiveEvent, isSafeEventId, runCheckin, type ActiveEventInfo } from '@/lib/checkin';
import { AppText, Button, Skeleton } from '@/components/kit';
import { CheckinStateView, type CheckinView } from '@/components/CheckinStateView';

// Landing for the kiosk QR (https://playerpass.gg/checkin?event_id=<id>) and for the in-app Check In button.
// Shows who and what you are checking in to, then submits only when the player taps Check In.
export default function CheckinPreviewScreen() {
  const { event_id } = useLocalSearchParams<{ event_id?: string }>();
  const router = useRouter();
  const api = useApi();
  const { colors } = useTheme();
  const eventId = isSafeEventId(event_id) ? event_id : null;

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<ActiveEventInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<CheckinView | null>(null);

  const load = useCallback(async () => {
    if (!eventId) { setView({ kind: 'noEvent' }); setLoading(false); return; }
    setLoading(true);
    try {
      const info = await fetchActiveEvent(api.get, eventId);
      if (info) setEvent(info); else setView({ kind: 'noEvent' });
    } catch {
      setView({ kind: 'error', message: 'Failed to load event. Check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  }, [eventId]);
  useEffect(() => { void load(); }, [load]);

  function leave() {
    if (router.canGoBack()) router.back(); else router.replace('/(tabs)' as never);
  }

  async function submit() {
    if (!eventId || submitting) return;
    setSubmitting(true);
    try {
      const out = await runCheckin(api.post, eventId);
      if (out.kind === 'success') setView({ kind: 'success', xp: out.xp, prizePoints: out.prizePoints });
      else if (out.kind === 'already') setView({ kind: 'already' });
      else if (out.kind === 'renewal') setView({ kind: 'renewal' });
      else setView({ kind: 'error', message: out.message });
    } finally {
      setSubmitting(false);
    }
  }

  if (view) {
    return (
      <CheckinStateView
        view={view}
        doneLabel={eventId && view.kind !== 'noEvent' ? 'Done' : 'Go Home'}
        onDone={leave}
        onRetry={view.kind === 'error' ? () => { setView(null); void load(); } : undefined}
      />
    );
  }

  if (loading || !event) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgBase, padding: 24, justifyContent: 'center', gap: 14 }}>
        <Skeleton height={120} radius={24} />
        <Skeleton height={48} radius={12} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: event.game?.color ?? colors.accent, alignItems: 'center', justifyContent: 'center' }}>
        <AppText style={{ fontSize: 44, lineHeight: 52 }}>{event.game?.icon ?? '🎮'}</AppText>
      </View>
      <AppText variant="eyebrow" tone="tertiary">Check in to</AppText>
      <AppText variant="display" style={{ textAlign: 'center', fontSize: 28, lineHeight: 32 }}>{event.name}</AppText>
      {event.game?.name ? <AppText variant="body" tone="secondary">{event.game.name}</AppText> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Feather name="zap" size={16} color={colors.xp} />
        <AppText variant="body" tone="accent" style={{ fontWeight: '700' }}>+{event.attendanceXp} XP for attending</AppText>
      </View>
      {event.attendanceCount > 0 && (
        <AppText variant="caption" tone="secondary">{event.attendanceCount} {event.attendanceCount === 1 ? 'player' : 'players'} checked in</AppText>
      )}
      <Button label="Check In" onPress={submit} loading={submitting} style={{ alignSelf: 'stretch', marginTop: 12 }} />
      <Button label="Scan QR Code Instead" variant="secondary" onPress={() => router.replace(`/checkin/${eventId}` as never)} style={{ alignSelf: 'stretch' }} />
      <Button label="Cancel" variant="ghost" onPress={leave} />
    </View>
  );
}
