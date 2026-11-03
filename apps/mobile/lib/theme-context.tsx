import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { DEFAULT_TONE, TONES, type Palette, type ThemeMode, type ToneKey } from '@/lib/tokens';

const TONE_KEY = 'pp_theme_tone'; // last dark tone, or the saved tone from older versions
const LIGHT_TONE_KEY = 'pp_theme_tone_light';
const PREF_KEY = 'pp_theme_pref';

export type ModePref = 'system' | 'light' | 'dark';
const DEFAULT_LIGHT: ToneKey = 'paper'; // same pairing as the website's light/dark switch (paper / warm)

type ThemeValue = {
  tone: ToneKey;
  mode: ThemeMode;
  colors: Palette;
  pref: ModePref;
  setTone: (tone: ToneKey) => void;
  setPref: (pref: ModePref) => void;
};

const ThemeContext = createContext<ThemeValue>({
  tone: DEFAULT_TONE,
  mode: TONES[DEFAULT_TONE].mode,
  colors: TONES[DEFAULT_TONE].palette,
  pref: 'dark',
  setTone: () => {},
  setPref: () => {},
});

const isTone = (v: string | null): v is ToneKey => !!v && v in TONES;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [darkTone, setDarkTone] = useState<ToneKey>(DEFAULT_TONE);
  const [lightTone, setLightTone] = useState<ToneKey>(DEFAULT_LIGHT);
  const [pref, setPrefState] = useState<ModePref>('dark');

  useEffect(() => {
    Promise.all([
      SecureStore.getItemAsync(TONE_KEY), SecureStore.getItemAsync(LIGHT_TONE_KEY), SecureStore.getItemAsync(PREF_KEY),
    ]).then(([saved, savedLight, savedPref]) => {
      let d: ToneKey = DEFAULT_TONE;
      let l: ToneKey = DEFAULT_LIGHT;
      let p: ModePref = 'dark';
      if (isTone(saved)) {
        // Older versions saved one tone of either mode; keep that look.
        if (TONES[saved].mode === 'light') { l = saved; p = 'light'; } else d = saved;
      }
      if (isTone(savedLight) && TONES[savedLight].mode === 'light') l = savedLight;
      if (savedPref === 'system' || savedPref === 'light' || savedPref === 'dark') p = savedPref;
      setDarkTone(d); setLightTone(l); setPrefState(p);
    }).catch(() => {});
  }, []);

  const effective: ThemeMode = pref === 'system' ? (system === 'light' ? 'light' : 'dark') : pref;
  const tone = effective === 'light' ? lightTone : darkTone;

  const setPref = useCallback((next: ModePref) => {
    setPrefState(next);
    SecureStore.setItemAsync(PREF_KEY, next).catch(() => {});
  }, []);

  const setTone = useCallback((next: ToneKey) => {
    const m = TONES[next].mode;
    if (m === 'light') { setLightTone(next); SecureStore.setItemAsync(LIGHT_TONE_KEY, next).catch(() => {}); }
    else { setDarkTone(next); SecureStore.setItemAsync(TONE_KEY, next).catch(() => {}); }
    // Picking a tone of the other mode switches to that mode so the choice is visible.
    if (m !== effective) setPref(m);
  }, [effective, setPref]);

  const value = useMemo<ThemeValue>(
    () => ({ tone, mode: TONES[tone].mode, colors: TONES[tone].palette, pref, setTone, setPref }),
    [tone, pref, setTone, setPref]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
