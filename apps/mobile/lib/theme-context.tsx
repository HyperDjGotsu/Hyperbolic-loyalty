import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_TONE, TONES, type Palette, type ThemeMode, type ToneKey } from '@/lib/tokens';

const TONE_KEY = 'pp_theme_tone';

type ThemeValue = {
  tone: ToneKey;
  mode: ThemeMode;
  colors: Palette;
  setTone: (tone: ToneKey) => void;
};

const ThemeContext = createContext<ThemeValue>({
  tone: DEFAULT_TONE,
  mode: TONES[DEFAULT_TONE].mode,
  colors: TONES[DEFAULT_TONE].palette,
  setTone: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tone, setToneState] = useState<ToneKey>(DEFAULT_TONE);

  useEffect(() => {
    SecureStore.getItemAsync(TONE_KEY)
      .then(saved => { if (saved && saved in TONES) setToneState(saved as ToneKey); })
      .catch(() => {});
  }, []);

  const setTone = useCallback((next: ToneKey) => {
    setToneState(next);
    SecureStore.setItemAsync(TONE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({ tone, mode: TONES[tone].mode, colors: TONES[tone].palette, setTone }),
    [tone, setTone]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
