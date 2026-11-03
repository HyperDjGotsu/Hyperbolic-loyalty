import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApi, errorMessage } from '@/lib/api';
import { API_BASE } from '@/lib/config';
import { useTheme } from '@/lib/theme-context';
import { AppText, Button } from '@/components/kit';

type Friend = { id: string; odid: string; name: string };

export function ShareEventSheet({ event, onClose, onDone }: {
  event: { id: string; name: string; date: string; time: string };
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const api = useApi();
  const { colors } = useTheme();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ friends: Friend[] }>('/api/community/friends')
      .then(d => setFriends(d.friends ?? []))
      .catch(() => setFriends([]));
  }, []);

  const url = `${API_BASE}/event/${event.id}`;

  async function shareLink() {
    try {
      await Share.share({ message: `Check out this Player Pass event: ${event.name} on ${event.date} @ ${event.time}\n${url}`, url });
    } catch { /* dismissed */ }
  }

  async function sendToFriends() {
    setSending(true);
    setError('');
    try {
      await api.post('/api/events/share', { eventId: event.id, friendIds: Array.from(picked) });
      onDone('Event shared!');
    } catch (e) {
      setError(errorMessage(e, 'Could not share. Try again.'));
    } finally {
      setSending(false);
    }
  }

  function toggle(id: string) {
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.bgSurface, borderColor: colors.border }]}>
        <View style={styles.head}>
          <AppText variant="title">Share event</AppText>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close"><Feather name="x" size={22} color={colors.textSecondary} /></Pressable>
        </View>
        <AppText variant="caption" tone="secondary" style={{ marginBottom: 12 }}>{event.name} · {event.date} @ {event.time}</AppText>

        <Button label="Share link" variant="secondary" onPress={shareLink} />

        <AppText variant="eyebrow" tone="tertiary" style={{ marginTop: 18, marginBottom: 8 }}>Send to friends</AppText>
        {friends === null ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />
        ) : friends.length === 0 ? (
          <AppText variant="body" tone="secondary">Add friends in Community to send them events.</AppText>
        ) : (
          <ScrollView style={{ maxHeight: 240 }}>
            {friends.map(f => {
              const on = picked.has(f.odid);
              return (
                <Pressable key={f.odid} onPress={() => toggle(f.odid)} style={[styles.friend, { borderColor: on ? colors.accent : colors.border, backgroundColor: colors.bgElevated }]}>
                  <AppText variant="body" style={{ flex: 1 }}>{f.name}</AppText>
                  {on && <Feather name="check" size={18} color={colors.accent} />}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        {error ? <AppText variant="caption" style={{ color: '#ef4444', marginTop: 8 }}>{error}</AppText> : null}
        {friends && friends.length > 0 && (
          <Button
            label={picked.size ? `Send to ${picked.size}` : 'Pick friends'}
            onPress={sendToFriends}
            disabled={picked.size === 0}
            loading={sending}
            style={{ marginTop: 12 }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { padding: 20, paddingBottom: 32, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  friend: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 6 },
});
