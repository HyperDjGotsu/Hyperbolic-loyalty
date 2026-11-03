import { useCallback, useEffect, useState } from 'react';
import { Modal, View } from 'react-native';
import { useApi, errorMessage } from '@/lib/api';
import { useTheme } from '@/lib/theme-context';
import { AppText, Button } from '@/components/kit';

type Credit = {
  eligible: boolean;
  monthKey: string;
  amountCents: number;
  redeemedAt: string | null;
  status: 'pending' | 'confirmed' | null;
  confirmedAt: string | null;
  confirmedByName: string | null;
  name: string;
  playerId: string;
};
type Step = 'idle' | 'confirm' | 'sure' | 'ticket';

const PACIFIC = 'America/Los_Angeles';
const dollars = (c: number) => `$${Math.round(c / 100)}`;
const monthName = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('en-US', { month: 'long' });
const when = (iso: string) => new Date(iso).toLocaleString('en-US', { timeZone: PACIFIC, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// Diamond members only; hidden for everyone else. The server decides eligibility and allows one use a month.
export function EventCreditCard() {
  const api = useApi();
  const { colors } = useTheme();
  const [credit, setCredit] = useState<Credit | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setCredit(await api.get<Credit>('/api/player/event-credit')); } catch { /* stay hidden */ }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const waiting = credit?.status === 'pending';
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => { void load(); }, 5000);
    return () => clearInterval(t);
  }, [waiting, load]);

  async function redeem() {
    setBusy(true);
    setError('');
    try {
      const d = await api.post<{ success: boolean; redeemedAt: string; name: string; playerId: string }>('/api/player/event-credit', {});
      setCredit(p => p ? { ...p, redeemedAt: d.redeemedAt, status: 'pending', confirmedAt: null, confirmedByName: null, name: d.name, playerId: d.playerId } : p);
      setStep('ticket');
    } catch (e) {
      if (e instanceof Error && e.message.includes('→ 409')) { await load(); setStep('idle'); }
      else { setError(errorMessage(e, 'Could not redeem')); setStep('idle'); }
    } finally {
      setBusy(false);
    }
  }

  if (!credit?.eligible) return null;
  const amount = dollars(credit.amountCents);
  const month = monthName(credit.monthKey);
  const used = credit.redeemedAt !== null;

  return (
    <>
      <View style={{ marginTop: 12, backgroundColor: colors.bgElevated, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="body" style={{ fontWeight: '700' }}>Event Credit · {amount}</AppText>
          <AppText variant="caption" tone="secondary">{used ? (waiting ? 'Waiting for staff to confirm' : `Used for ${month}`) : 'For events only · 1 per month'}</AppText>
          {error ? <AppText variant="caption" style={{ color: '#ef4444' }}>{error}</AppText> : null}
        </View>
        {used
          ? <Button label="View" variant="secondary" onPress={() => setStep('ticket')} style={{ paddingVertical: 8, paddingHorizontal: 16 }} />
          : <Button label="Redeem" onPress={() => { setError(''); setStep('confirm'); }} style={{ paddingVertical: 8, paddingHorizontal: 16 }} />}
      </View>

      {(step === 'confirm' || step === 'sure') && (
        <Modal transparent animationType="fade" onRequestClose={() => setStep('idle')}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <View style={{ width: '100%', maxWidth: 380, backgroundColor: colors.bgSurface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 8 }}>
              <AppText variant="title" style={{ textAlign: 'center' }}>{step === 'confirm' ? `Redeem your ${amount} Event Credit?` : 'Are you sure?'}</AppText>
              <AppText variant="body" tone="secondary" style={{ textAlign: 'center' }}>
                {step === 'confirm' ? "Only tap this when you're at the counter with a staff member." : `This uses your Event Credit for ${month}. It can't be undone, even if you change your mind at the counter.`}
              </AppText>
              <Button label={step === 'confirm' ? 'Continue' : 'Yes, show to staff'} loading={busy} onPress={() => (step === 'confirm' ? setStep('sure') : void redeem())} style={{ marginTop: 12 }} />
              <Button label={step === 'confirm' ? 'Not now' : 'Go back'} variant="secondary" disabled={busy} onPress={() => setStep(step === 'confirm' ? 'idle' : 'confirm')} />
            </View>
          </View>
        </Modal>
      )}

      {step === 'ticket' && credit.redeemedAt && <Ticket credit={credit} amount={amount} month={month} onClose={() => setStep('idle')} />}
    </>
  );
}

function Ticket({ credit, amount, month, onClose }: { credit: Credit; amount: string; month: string; onClose: () => void }) {
  const { colors } = useTheme();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const rows: Array<[string, string]> = [
    ['Name', credit.name],
    ['Player ID', credit.playerId],
    ['Redeemed', credit.redeemedAt ? when(credit.redeemedAt) : ''],
    ...(credit.confirmedAt ? [['Confirmed', when(credit.confirmedAt)] as [string, string]] : []),
    ['Right now', now.toLocaleTimeString('en-US', { timeZone: PACIFIC, hour: 'numeric', minute: '2-digit', second: '2-digit' })],
  ];
  return (
    <Modal animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#09090b', justifyContent: 'center', padding: 16 }}>
        <View style={{ borderRadius: 28, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.accent, backgroundColor: colors.bgSurface, padding: 24 }}>
          <AppText variant="eyebrow" tone="secondary" style={{ textAlign: 'center' }}>Event Credit</AppText>
          <AppText variant="display" tone="accent" style={{ textAlign: 'center', fontSize: 56, lineHeight: 64 }}>{amount}</AppText>
          <AppText variant="caption" tone="secondary" style={{ textAlign: 'center' }}>Events only · Used for {month}</AppText>
          <View style={{ marginTop: 12, borderRadius: 12, padding: 10, backgroundColor: colors.bgElevated }}>
            <AppText variant="body" tone={credit.status === 'pending' ? 'secondary' : 'accent'} style={{ textAlign: 'center', fontWeight: '700' }}>
              {credit.status === 'pending' ? 'Waiting for staff to confirm…' : `Confirmed${credit.confirmedByName ? ` by ${credit.confirmedByName}` : ''}`}
            </AppText>
          </View>
          <View style={{ marginTop: 16 }}>
            {rows.map(([l, v]) => (
              <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <AppText variant="body" tone="secondary">{l}</AppText>
                <AppText variant="body" style={{ fontWeight: '700' }}>{v}</AppText>
              </View>
            ))}
          </View>
        </View>
        <AppText variant="caption" tone="secondary" style={{ textAlign: 'center', marginTop: 12 }}>
          {credit.status === 'pending' ? 'Show this screen to staff. They will confirm it on their side.' : 'Show this screen to staff.'}
        </AppText>
        <Button label="Close" variant="secondary" onPress={onClose} style={{ marginTop: 16 }} />
      </View>
    </Modal>
  );
}
