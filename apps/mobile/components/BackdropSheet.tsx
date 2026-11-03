import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApi, errorMessage } from '@/lib/api';
import { API_BASE } from '@/lib/config';
import { useAuth } from '@clerk/clerk-expo';
import { SELECTABLE_GAMES } from '@/lib/games';
import { useTheme } from '@/lib/theme-context';
import { AppText, Button } from '@/components/kit';
import { EventCover } from '@/components/EventCover';

// Picks the art behind the profile and Home card: a game's cover art, or the player's own picture.
export function BackdropSheet({ current, storeId, onClose, onSaved }: {
  current: string | null; storeId: string | null; onClose: () => void; onSaved: (value: string | null) => void;
}) {
  const api = useApi();
  const { getToken } = useAuth();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);

  async function saveGame(gameId: string | null) {
    setBusy(true);
    try {
      const d = await api.post<{ heroBackdrop: string | null }>('/api/player/backdrop', { gameId });
      onSaved(d.heroBackdrop ?? null);
    } catch (e) {
      Alert.alert('Could not save', errorMessage(e, 'Please try again.'));
    } finally { setBusy(false); }
  }

  async function upload() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to pick a picture.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', { uri: asset.uri, name: 'backdrop.jpg', type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);
      const token = await getToken();
      const r = await fetch(`${API_BASE}/api/player/backdrop`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
      const d = await r.json();
      if (!r.ok) { Alert.alert('Could not save', d.error ?? 'Please try again.'); return; }
      onSaved(d.heroBackdrop ?? null);
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally { setBusy(false); }
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }} onPress={() => !busy && onClose()} />
      <View style={{ maxHeight: '85%', backgroundColor: colors.bgSurface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20 }}>
        <AppText variant="title">Backdrop</AppText>
        <AppText variant="caption" tone="secondary" style={{ marginBottom: 12 }}>Pick the art behind your profile and Home card.</AppText>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <Pressable disabled={busy} onPress={() => saveGame(null)} style={{ padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 12, borderColor: !current ? colors.accent : colors.border }}>
            <AppText variant="body" tone={!current ? 'accent' : 'primary'} style={{ fontWeight: '700' }}>Default <AppText variant="caption" tone="secondary">(your first favorite game)</AppText></AppText>
          </Pressable>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {SELECTABLE_GAMES.map(g => (
              <Pressable key={g.id} disabled={busy} onPress={() => saveGame(g.id)} style={{ width: '48%', borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: current === `game:${g.id}` ? colors.accent : 'transparent' }}>
                <EventCover gameId={g.id} storeId={storeId} color={g.color} style={{ height: 90, justifyContent: 'flex-end', padding: 8 }}>
                  <AppText variant="caption" style={{ color: '#fff', fontWeight: '800' }}>{g.name}</AppText>
                </EventCover>
              </Pressable>
            ))}
          </View>
          <View style={{ marginTop: 20, borderRadius: 16, padding: 16, backgroundColor: colors.bgElevated }}>
            <AppText variant="body" style={{ fontWeight: '700' }}>Use your own picture</AppText>
            <AppText variant="caption" tone="secondary" style={{ marginVertical: 6 }}>Shows on your Home card. Only you see it. JPG, PNG or WebP, up to 3 MB.</AppText>
            <Button label={busy ? 'Saving…' : 'Upload'} onPress={upload} disabled={busy} style={{ alignSelf: 'flex-start', paddingVertical: 10 }} />
          </View>
        </ScrollView>
        <Button label="Close" variant="secondary" onPress={onClose} disabled={busy} />
      </View>
    </Modal>
  );
}
