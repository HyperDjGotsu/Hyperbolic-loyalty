import { useEffect, useState } from 'react';
import { Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme-context';
import { HOME_TOUR_KEY, WELCOME_KEY, getFlag, onReplay, onWelcomeClosed, setFlag } from '@/lib/first-run';
import { AppText, Button } from '@/components/kit';

const STOPS = [
  { title: 'This is you', text: 'Your level fills up as you earn XP. Prize Points are what you spend on the Prize Wall.' },
  { title: 'Your PlayerPass', text: 'Your pass sets how fast you earn. Tap it any time to compare passes.' },
  { title: "What's up next at the store", text: 'These are the events happening at the store. You can find more on the Events tab, but this is a quick snapshot.' },
  { title: 'Your games', text: 'Track your progress in each game you play. Each game has its own rank, and all your points combine for your store and network rank in that game.' },
  { title: 'Card of the Day', text: 'A new card every day. Come back daily to see it and vote.' },
  { title: 'Prize Wall', text: 'Spend your Prize Points here on rewards from the store.' },
  { title: 'Your activity', text: 'Every XP you earn shows up here, so you can see where it came from.' },
  { title: 'Friends', text: 'See what your friends are up to. Find players in Community.' },
];

// A short card walkthrough of Home. It starts after the welcome slides, and only once.
export function HomeTour() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    let alive = true;
    const begin = async () => {
      if (await getFlag(HOME_TOUR_KEY)) return;
      if (alive) { setI(0); setActive(true); }
    };
    (async () => {
      if (await getFlag(HOME_TOUR_KEY)) return;
      if (await getFlag(WELCOME_KEY)) void begin();
    })();
    const off = onWelcomeClosed(() => { void begin(); });
    const offReplay = onReplay('tour', () => { if (alive) { setI(0); setActive(true); } });
    return () => { alive = false; off(); offReplay(); };
  }, []);

  async function finish() {
    setActive(false);
    await setFlag(HOME_TOUR_KEY);
  }

  if (!active) return null;
  const stop = STOPS[i];
  const last = i === STOPS.length - 1;
  return (
    <Modal transparent animationType="fade" onRequestClose={finish}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end', padding: 16, paddingBottom: insets.bottom + 16 }}>
        <View style={{ backgroundColor: colors.bgSurface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <AppText variant="eyebrow" tone="tertiary">{i + 1} of {STOPS.length}</AppText>
            <AppText variant="eyebrow" tone="tertiary" onPress={finish}>Skip</AppText>
          </View>
          <AppText variant="title">{stop.title}</AppText>
          <AppText variant="body" tone="secondary" style={{ marginTop: 4 }}>{stop.text}</AppText>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            {i > 0 && <Button label="Back" variant="secondary" onPress={() => setI(n => n - 1)} style={{ flex: 1, paddingVertical: 11 }} />}
            <Button label={last ? 'Done' : 'Next'} onPress={() => (last ? finish() : setI(n => n + 1))} style={{ flex: 1, paddingVertical: 11 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
