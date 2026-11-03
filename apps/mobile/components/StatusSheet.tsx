import { useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { useApi, errorMessage } from '@/lib/api';
import { useTheme } from '@/lib/theme-context';
import { AppText, Button } from '@/components/kit';

const PRESETS = [
  '🎮 Looking for games', '👑 Grinding for Points', '🃏 Down to play anything', '⚔️ Tournament ready',
  '📚 Teaching newbies', '🔧 Building decks', '😴 Taking a break', '😎 Just vibing',
];

export function StatusSheet({ current, onClose, onSaved }: { current: string | null; onClose: () => void; onSaved: (s: string | null) => void }) {
  const api = useApi();
  const { colors } = useTheme();
  const [value, setValue] = useState(current ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(next: string | null) {
    setBusy(true);
    setError('');
    try {
      await api.post('/api/player/status', { status: next });
      onSaved(next);
    } catch (e) {
      setError(errorMessage(e, 'Could not save status.'));
    } finally { setBusy(false); }
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }} onPress={onClose} />
      <View style={{ backgroundColor: colors.bgSurface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20, paddingBottom: 32, gap: 12 }}>
        <AppText variant="title">Set your status</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PRESETS.map(p => (
            <Pressable key={p} onPress={() => setValue(p)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: value === p ? colors.accent : colors.border, backgroundColor: colors.bgElevated }}>
              <AppText variant="caption" tone={value === p ? 'accent' : 'primary'} style={{ fontSize: 13 }}>{p}</AppText>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={value}
          onChangeText={t => setValue(t.slice(0, 50))}
          placeholder="Or write your own (50 characters)"
          placeholderTextColor={colors.textTertiary}
          style={{ color: colors.textPrimary, backgroundColor: colors.bgInput, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, fontSize: 15 }}
        />
        {error ? <AppText variant="caption" style={{ color: '#ef4444' }}>{error}</AppText> : null}
        <Button label="Save" loading={busy} disabled={!value.trim()} onPress={() => save(value.trim())} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {current ? <Button label="Clear status" variant="secondary" disabled={busy} onPress={() => save(null)} style={{ flex: 1 }} /> : null}
          <Button label="Cancel" variant="secondary" disabled={busy} onPress={onClose} style={{ flex: 1 }} />
        </View>
      </View>
    </Modal>
  );
}
