import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApi } from '@/lib/api';
import { useTheme } from '@/lib/theme-context';
import { WELCOME_KEY, emitWelcomeClosed, getFlag, onReplay, setFlag } from '@/lib/first-run';
import { AppText, Button } from '@/components/kit';

type StoreConfig = { store_name: string; shop_title: string; currency_name: string };
const DEFAULTS: StoreConfig = { store_name: 'Player Pass', shop_title: 'Prize Wall', currency_name: 'Points' };

function buildSlides(c: StoreConfig) {
  return [
    { title: `Welcome to ${c.store_name}`, body: "You just joined your store's loyalty system. Every time you show up, play, and compete, you earn XP and climb the leaderboard." },
    { title: 'Earn XP Every Visit', body: 'Check in at events to earn XP. Win matches for bonus XP. The more you play, the higher you rank.' },
    { title: 'Daily Bonus', body: `Open the app every day for a free bonus. It resets at midnight, so don't leave ${c.currency_name} on the table.` },
    { title: c.shop_title, body: `Everyone earns ${c.currency_name} at events. Spend them on prizes from the store. A pass unlocks spending.` },
    { title: 'Passes', body: 'Bronze, Silver, Gold and Diamond passes let you spend your points and earn them faster. Staff can start one for you in the store.' },
    { title: 'Your Player Profile', body: 'Your Player Pass profile travels with you across the network. Your progress, Guild Points, and rewards are always there. Staff and check-in kiosks can identify you through your profile QR.', cta: "Let's go" },
  ] as Array<{ title: string; body: string; cta?: string }>;
}

export function WelcomeOverlay() {
  const api = useApi();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);
  const [cfg, setCfg] = useState<StoreConfig>(DEFAULTS);

  useEffect(() => {
    let alive = true;
    const show = () => {
      api.get<Partial<StoreConfig>>('/api/store-config')
        .then(d => { if (alive && d) setCfg({ ...DEFAULTS, ...d }); })
        .catch(() => {});
      if (alive) { setSlide(0); setVisible(true); }
    };
    (async () => {
      if (await getFlag(WELCOME_KEY)) return;
      show();
    })();
    const off = onReplay('welcome', show);
    return () => { alive = false; off(); };
  }, []);

  async function dismiss() {
    setVisible(false);
    await setFlag(WELCOME_KEY);
    emitWelcomeClosed();
  }

  if (!visible) return null;
  const slides = buildSlides(cfg);
  const cur = slides[slide];
  const last = slide === slides.length - 1;

  return (
    <Modal animationType="fade" onRequestClose={dismiss}>
      <View style={{ flex: 1, backgroundColor: colors.bgBase, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
        <View style={{ alignItems: 'flex-end', padding: 16 }}>
          <Pressable onPress={dismiss} hitSlop={12}><AppText variant="caption" tone="tertiary" style={{ fontSize: 14 }}>Skip</AppText></Pressable>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <AppText variant="display" tone="accent" style={{ marginBottom: 16, fontSize: 56, lineHeight: 60 }}>{slide + 1}</AppText>
          <AppText variant="title" style={{ textAlign: 'center', fontSize: 26, lineHeight: 32, marginBottom: 12 }}>{cur.title}</AppText>
          <AppText variant="body" tone="secondary" style={{ textAlign: 'center', fontSize: 16, lineHeight: 24 }}>{cur.body}</AppText>
        </View>
        <View style={{ paddingHorizontal: 24, gap: 24, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {slides.map((_, i) => (
              <Pressable key={i} onPress={() => setSlide(i)} hitSlop={6}>
                <View style={{ height: 8, width: i === slide ? 24 : 8, borderRadius: 4, backgroundColor: i === slide ? colors.accent : colors.borderStrong }} />
              </Pressable>
            ))}
          </View>
          <Button label={cur.cta ?? 'Next →'} onPress={() => (last ? dismiss() : setSlide(slide + 1))} style={{ alignSelf: 'stretch' }} />
        </View>
      </View>
    </Modal>
  );
}
