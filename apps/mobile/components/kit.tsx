import { useEffect, useRef, type ReactNode } from 'react';
import {
  ActivityIndicator, Animated, Pressable, StyleSheet, Text, View,
  type StyleProp, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { FONT } from '@/lib/fonts';
import { useTheme } from '@/lib/theme-context';

// Shared building blocks for the redesigned screens. They read the active tone, so light and dark both work.

type Variant = 'display' | 'title' | 'body' | 'caption' | 'eyebrow' | 'numeral';
type Tone = 'primary' | 'secondary' | 'tertiary' | 'accent';

const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontFamily: FONT.displayHeavy, fontSize: 32, lineHeight: 36 },
  title: { fontFamily: FONT.display, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: FONT.sans, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: FONT.sansMedium, fontSize: 12, lineHeight: 16 },
  eyebrow: { fontFamily: FONT.sansBold, fontSize: 11, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase' },
  // Numbers use Plus Jakarta with tabular figures so counters don't jitter
  numeral: { fontFamily: FONT.sansBold, fontSize: 22, lineHeight: 26, fontVariant: ['tabular-nums'] },
};

export function AppText({
  variant = 'body', tone = 'primary', style, ...rest
}: TextProps & { variant?: Variant; tone?: Tone }) {
  const { colors } = useTheme();
  const color = tone === 'accent' ? colors.accent
    : tone === 'secondary' ? colors.textSecondary
    : tone === 'tertiary' ? colors.textTertiary
    : colors.textPrimary;
  return <Text {...rest} style={[VARIANTS[variant], { color }, style]} />;
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const { colors } = useTheme();
  const base: ViewStyle = { backgroundColor: colors.bgSurface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 16 };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

export function Button({
  label, onPress, variant = 'primary', loading, disabled, style,
}: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const off = disabled || loading;
  const bg = variant === 'primary' ? colors.accent : variant === 'secondary' ? colors.bgElevated : 'transparent';
  const fg = variant === 'primary' ? colors.accentFg : colors.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: variant === 'primary' ? bg : colors.borderStrong, borderWidth: variant === 'ghost' ? 0 : 1 },
        off && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

// Placeholder block shown while data loads, so screens keep their shape instead of showing a spinner.
export function Skeleton({ width = '100%', height = 16, radius = 8, style }: {
  width?: number | `${number}%`; height?: number; radius?: number; style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.bgElevated, opacity: pulse }, style]} />;
}

const styles = StyleSheet.create({
  button: { borderRadius: 12, paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: FONT.sansBold, fontSize: 16 },
});
