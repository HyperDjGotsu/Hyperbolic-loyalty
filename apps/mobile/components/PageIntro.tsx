import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme-context';
import { PAGE_INTRO_KEY_PREFIX, getFlag, setFlag } from '@/lib/first-run';
import { AppText, Button } from '@/components/kit';

const INTROS = {
  events: { title: 'Events', text: "What's happening at your store. Tap the star to say you're interested, and check in when you get there. Earn XP just for showing up." },
  community: { title: 'Community', text: 'Leaderboards and your friends. See who is climbing in each game, find players, and add friends.' },
  'prize-wall': { title: 'Prize Wall', text: 'Spend your Prize Points here on rewards from the store. Points come from playing and showing up, and a Player Pass lets you spend them.' },
} as const;

// One short "what is this page" card the first time a player opens a tab.
export function PageIntro({ page }: { page: keyof typeof INTROS }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [show, setShow] = useState(false);
  const intro = INTROS[page];

  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout> | undefined;
    getFlag(PAGE_INTRO_KEY_PREFIX + page).then(seen => {
      if (!seen && alive) t = setTimeout(() => alive && setShow(true), 700);
    });
    return () => { alive = false; if (t) clearTimeout(t); };
  }, [page]);

  function dismiss() {
    setShow(false);
    void setFlag(PAGE_INTRO_KEY_PREFIX + page);
  }

  if (!show) return null;
  return (
    <Modal transparent animationType="slide" onRequestClose={dismiss}>
      <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={dismiss}>
        <View style={{ margin: 16, marginBottom: insets.bottom + 16, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.bgSurface }}>
          <AppText variant="eyebrow" tone="accent">About this page</AppText>
          <AppText variant="title" style={{ marginTop: 2 }}>{intro.title}</AppText>
          <AppText variant="body" tone="secondary" style={{ marginTop: 4 }}>{intro.text}</AppText>
          <Button label="Got it" onPress={dismiss} style={{ marginTop: 12, paddingVertical: 11 }} />
        </View>
      </Pressable>
    </Modal>
  );
}
