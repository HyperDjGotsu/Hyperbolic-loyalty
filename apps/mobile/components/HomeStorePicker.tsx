import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApi, errorMessage } from '@/lib/api';
import { useTheme } from '@/lib/theme-context';
import { AppText } from '@/components/kit';

export type PickerStore = { id: string; name: string; city: string | null; is_flagship: boolean; color: string | null };

// Store switcher. In `required` mode (player has no home store yet) it cannot be dismissed and
// the chosen store is saved as the home store (PATCH /api/player/home-store).
export function HomeStorePicker({ visible, stores, currentId, homeId, required, onPick, onClose }: {
  visible: boolean; stores: PickerStore[]; currentId: string | null; homeId: string | null; required: boolean;
  onPick: (store: PickerStore) => void; onClose: () => void;
}) {
  const api = useApi();
  const { colors } = useTheme();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function pick(st: PickerStore) {
    if (busy) return;
    if (required) {
      setBusy(st.id);
      setError('');
      try {
        await api.patch('/api/player/home-store', { store_id: st.id });
        onPick(st);
      } catch (e) {
        setError(errorMessage(e, 'Could not save your store. Try again.'));
      } finally { setBusy(null); }
    } else {
      onPick(st);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!required) onClose(); }}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={() => { if (!required) onClose(); }}>
        <Pressable onPress={() => {}} style={{ maxHeight: '80%', backgroundColor: colors.bgSurface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40 }}>
          <AppText variant="title">{required ? 'Pick your home store' : 'Switch store'}</AppText>
          <AppText variant="caption" tone="secondary" style={{ marginBottom: 12 }}>
            {required ? 'Choose the store you play at most. You can still browse others later.' : 'Choose which store you are browsing'}
          </AppText>
          <ScrollView>
            {stores.map(st => {
              const isSelected = currentId === st.id;
              return (
                <Pressable
                  key={st.id}
                  disabled={!!busy}
                  onPress={() => pick(st)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 6, borderRadius: 14, borderWidth: 1, borderColor: isSelected ? colors.accent : colors.border, backgroundColor: colors.bgElevated, opacity: busy && busy !== st.id ? 0.5 : 1 }}
                >
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: st.color ?? colors.textTertiary }} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" style={{ fontWeight: '700' }}>{st.name}{st.is_flagship ? '  ★' : ''}</AppText>
                    <AppText variant="caption" tone="secondary">
                      {[st.city, st.id === homeId ? 'Home' : null, isSelected && st.id !== homeId ? 'Viewing' : null].filter(Boolean).join(' · ')}
                    </AppText>
                  </View>
                  {busy === st.id ? <AppText variant="caption" tone="secondary">Saving…</AppText> : isSelected ? <Feather name="check" size={16} color={colors.accent} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          {error ? <AppText variant="caption" style={{ color: '#ef4444', marginTop: 6 }}>{error}</AppText> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
