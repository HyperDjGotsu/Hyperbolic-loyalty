import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useApi, errorMessage } from '@/lib/api';
import { useTheme } from '@/lib/theme-context';
import { AppText } from '@/components/kit';

type Friend = { id: string; odid: string; name: string };

// Share one of your own wins (a ledger row) with a friend. No text, no points move.
export function ShareWinSheet({ ledgerId, onClose }: { ledgerId: string | null; onClose: () => void }) {
  const api = useApi();
  const { colors } = useTheme();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ledgerId) return;
    setStatus('');
    if (friends === null) {
      api.get<{ friends: Friend[] }>('/api/community/friends').then(d => setFriends(d.friends ?? [])).catch(() => setFriends([]));
    }
  }, [ledgerId]);

  async function send(f: Friend) {
    if (!ledgerId || busy) return;
    setBusy(true);
    setStatus('');
    try {
      await api.post('/api/friend-shares', { ledger_id: ledgerId, friend_id: f.odid });
      setStatus(`Sent to ${f.name}`);
    } catch (e) {
      setStatus(errorMessage(e, 'Could not share'));
    } finally { setBusy(false); }
  }

  return (
    <Modal visible={!!ledgerId} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable onPress={() => {}} style={{ maxHeight: '70%', backgroundColor: colors.bgSurface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40 }}>
          <AppText variant="title" style={{ marginBottom: 8 }}>Share with a friend</AppText>
          {friends === null ? (
            <AppText variant="body" tone="secondary" style={{ paddingVertical: 24, textAlign: 'center' }}>Loading…</AppText>
          ) : friends.length === 0 ? (
            <AppText variant="body" tone="secondary" style={{ paddingVertical: 24, textAlign: 'center' }}>No friends yet. Find players in Community.</AppText>
          ) : (
            <ScrollView>
              {friends.map(f => (
                <Pressable key={f.odid} disabled={busy} onPress={() => send(f)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, opacity: busy ? 0.5 : 1 }}>
                  <AppText variant="body" numberOfLines={1} style={{ flex: 1, fontWeight: '700' }}>{f.name}</AppText>
                  <AppText variant="caption" tone="accent" style={{ fontWeight: '800' }}>Send</AppText>
                </Pressable>
              ))}
            </ScrollView>
          )}
          {status ? <AppText variant="body" tone="secondary" style={{ textAlign: 'center', marginTop: 8, fontWeight: '700' }}>{status}</AppText> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
