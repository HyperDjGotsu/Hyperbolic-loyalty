import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme-context';
import { useStoreConfig } from '@/lib/store-config';
import { AppText, Button } from '@/components/kit';
import { EventCreditCard } from '@/components/EventCreditCard';

export type CheckinView =
  | { kind: 'success'; xp: number; prizePoints: number }
  | { kind: 'already' }
  | { kind: 'renewal' }
  | { kind: 'noEvent' }
  | { kind: 'error'; message: string };

// Full-screen result for a check-in attempt: success with awarded rewards, already checked in, pass renewal, no live event, or error.
export function CheckinStateView({ view, onDone, doneLabel = 'Back to Event', onRetry }: {
  view: CheckinView; onDone: () => void; doneLabel?: string; onRetry?: () => void;
}) {
  const { colors } = useTheme();
  const cfg = useStoreConfig();
  const icon = view.kind === 'success' ? 'check-circle' : view.kind === 'already' ? 'check' : view.kind === 'renewal' ? 'clock' : view.kind === 'noEvent' ? 'calendar' : 'alert-circle';
  const tint = view.kind === 'success' ? colors.success : view.kind === 'error' ? colors.danger : view.kind === 'already' ? colors.accent : colors.textSecondary;
  const title = view.kind === 'success' ? 'Checked In!'
    : view.kind === 'already' ? 'Already Checked In'
    : view.kind === 'renewal' ? 'Pass Expired'
    : view.kind === 'noEvent' ? 'No Active Event'
    : 'Check-in Failed';
  const body = view.kind === 'success' ? "You're in. Have fun!"
    : view.kind === 'already' ? "You're all set. You've already checked in to this event."
    : view.kind === 'renewal' ? 'Your Player Pass has expired. See a staff member at the check-in kiosk to renew or finish checking in.'
    : view.kind === 'noEvent' ? "This event has ended, was cancelled, or hasn't started yet."
    : view.message;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
      <Feather name={icon} size={64} color={tint} />
      <AppText variant="display" style={{ color: tint, textAlign: 'center', fontSize: 28, lineHeight: 32 }}>{title}</AppText>
      <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>{body}</AppText>
      {view.kind === 'success' && (view.xp > 0 || view.prizePoints > 0) && (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {view.xp > 0 && (
            <View style={{ backgroundColor: colors.bgElevated, borderColor: colors.border, borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' }}>
              <AppText variant="numeral" tone="accent">+{view.xp}</AppText>
              <AppText variant="caption" tone="secondary">XP</AppText>
            </View>
          )}
          {view.prizePoints > 0 && (
            <View style={{ backgroundColor: colors.bgElevated, borderColor: colors.border, borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' }}>
              <AppText variant="numeral" tone="accent">+{view.prizePoints}</AppText>
              <AppText variant="caption" tone="secondary">Prize {cfg.currency_name}</AppText>
            </View>
          )}
        </View>
      )}
      {(view.kind === 'success' || view.kind === 'already') && <View style={{ alignSelf: 'stretch' }}><EventCreditCard /></View>}
      <Button label={doneLabel} onPress={onDone} style={{ alignSelf: 'stretch', marginTop: 8 }} />
      {onRetry && (view.kind === 'error') && <Button label="Try Again" variant="secondary" onPress={onRetry} style={{ alignSelf: 'stretch' }} />}
    </View>
  );
}
