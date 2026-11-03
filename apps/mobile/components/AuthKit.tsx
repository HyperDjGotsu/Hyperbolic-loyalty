import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View, type TextInputProps } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useSSO } from '@clerk/clerk-expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT } from '@/lib/fonts';
import { useTheme } from '@/lib/theme-context';
import { AppText, Button } from '@/components/kit';

WebBrowser.maybeCompleteAuthSession();

// Shared frame for sign-in, sign-up and reset: brand header, then the form.
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bgBase }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
      >
        <AppText variant="eyebrow" tone="accent" style={{ textAlign: 'center' }}>Player Pass</AppText>
        <AppText variant="display" style={{ textAlign: 'center', marginTop: 6 }}>{title}</AppText>
        {subtitle ? <AppText variant="body" tone="secondary" style={{ textAlign: 'center', marginTop: 6, marginBottom: 24 }}>{subtitle}</AppText> : <View style={{ height: 24 }} />}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Field(props: TextInputProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.textTertiary}
      {...props}
      style={[{
        backgroundColor: colors.bgInput, borderColor: colors.border, borderWidth: 1, borderRadius: 12,
        color: colors.textPrimary, fontFamily: FONT.sans, fontSize: 16, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12,
      }, props.style]}
    />
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return <AppText variant="caption" style={{ color: '#ef4444', textAlign: 'center', marginBottom: 12, fontSize: 13 }}>{message}</AppText>;
}

// Clerk errors carry a readable longMessage; fall back to the plain message.
export function clerkError(e: unknown, fallback: string): string {
  const err = e as { errors?: Array<{ longMessage?: string; message?: string }>; message?: string } | undefined;
  return err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? (e instanceof Error ? e.message : fallback);
}

export function Divider() {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <AppText variant="caption" tone="tertiary">or</AppText>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );
}

// Google and Apple sign-in through Clerk. Apple is required by App Store rule 4.8 whenever Google is offered.
export function SsoButtons({ onError }: { onError: (message: string) => void }) {
  const { startSSOFlow } = useSSO();
  const [busy, setBusy] = useState<'oauth_google' | 'oauth_apple' | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);

  async function run(strategy: 'oauth_google' | 'oauth_apple') {
    setBusy(strategy);
    onError('');
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy,
        redirectUrl: AuthSession.makeRedirectUri({ scheme: 'playerpass', path: 'sso-callback' }),
      });
      if (createdSessionId && setActive) await setActive({ session: createdSessionId });
    } catch (e) {
      onError(clerkError(e, 'Sign in was cancelled or failed. Try again.'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ gap: 10 }}>
      <Button label="Continue with Google" variant="secondary" loading={busy === 'oauth_google'} disabled={busy !== null} onPress={() => run('oauth_google')} />
      <Button label="Continue with Apple" variant="secondary" loading={busy === 'oauth_apple'} disabled={busy !== null} onPress={() => run('oauth_apple')} />
    </View>
  );
}
