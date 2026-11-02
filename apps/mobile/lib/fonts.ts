import { Fraunces_700Bold, Fraunces_900Black } from '@expo-google-fonts/fraunces';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';

// Same pairing as the web: Fraunces for headings, Plus Jakarta Sans for everything else (numerals too).
export const FONT = {
  display: 'Fraunces_700Bold',
  displayHeavy: 'Fraunces_900Black',
  sans: 'PlusJakartaSans_400Regular',
  sansMedium: 'PlusJakartaSans_500Medium',
  sansSemi: 'PlusJakartaSans_600SemiBold',
  sansBold: 'PlusJakartaSans_700Bold',
} as const;

export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Fraunces_700Bold,
    Fraunces_900Black,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  // If a font fails to load the app still opens, with system fonts
  return loaded || !!error;
}
