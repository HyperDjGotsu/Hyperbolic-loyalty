import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '@/lib/theme-context';
import { AppText, Card } from '@/components/kit';

const DISMISSED = 'pp_started_dismissed';

type Item = { key: string; label: string; done: boolean; storeKey?: string; onPress?: () => void };

// New-player checklist. Hides itself once dismissed or everything is done.
export function GettingStarted({ items }: { items: Item[] }) {
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(true);
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        if (await SecureStore.getItemAsync(DISMISSED)) return;
        const next: Record<string, boolean> = {};
        for (const i of items) if (i.storeKey && (await SecureStore.getItemAsync(i.storeKey))) next[i.key] = true;
        setFlags(next);
        setHidden(false);
      } catch { setHidden(false); }
    })();
  }, []);

  const rows = items.map(i => ({ ...i, done: i.done || !!flags[i.key] }));
  if (hidden || rows.every(r => r.done)) return null;
  const doneCount = rows.filter(r => r.done).length;

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <AppText variant="title">Getting started <AppText variant="caption" tone="secondary">{doneCount}/{rows.length}</AppText></AppText>
        <Pressable hitSlop={10} onPress={() => { SecureStore.setItemAsync(DISMISSED, '1').catch(() => {}); setHidden(true); }}>
          <Feather name="x" size={18} color={colors.textTertiary} />
        </Pressable>
      </View>
      {rows.map(r => (
        <Pressable key={r.key} onPress={r.onPress} disabled={!r.onPress || r.done} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
          <Feather name={r.done ? 'check-circle' : 'circle'} size={20} color={r.done ? colors.accent : colors.textTertiary} />
          <AppText variant="body" tone={r.done ? 'tertiary' : 'primary'} style={r.done ? { textDecorationLine: 'line-through' } : undefined}>{r.label}</AppText>
        </Pressable>
      ))}
    </Card>
  );
}
