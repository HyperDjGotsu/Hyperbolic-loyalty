import { useSignUp } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import LegalLinks from '@/components/LegalLinks';
import { AppText, Button } from '@/components/kit';
import { AuthShell, Divider, Field, FormError, SsoButtons, clerkError } from '@/components/AuthKit';

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSignUp() {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      await signUp.create({ emailAddress: email.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPending(true);
    } catch (e) {
      setError(clerkError(e, 'Sign up failed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!isLoaded) return;
    setError('');
    setResent(false);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setResent(true);
    } catch (e) {
      setError(clerkError(e, 'Could not resend code'));
    }
  }

  async function handleVerify() {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (e) {
      setError(clerkError(e, 'Verification failed'));
    } finally {
      setLoading(false);
    }
  }

  if (pending) {
    return (
      <AuthShell title="Check your email" subtitle={`Enter the 6-digit code sent to ${email}`}>
        <Field placeholder="000000" keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} style={{ textAlign: 'center', letterSpacing: 8, fontSize: 24 }} />
        <FormError message={error} />
        <Button label="Verify" onPress={handleVerify} loading={loading} disabled={code.length < 6} />
        <Pressable onPress={handleResend} disabled={loading}>
          <AppText variant="caption" tone="accent" style={{ textAlign: 'center', marginTop: 20, fontSize: 14 }}>{resent ? 'Code sent. Check your email' : 'Resend code'}</AppText>
        </Pressable>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create account" subtitle="Earn XP at every event">
      <SsoButtons onError={setError} />
      <Divider />
      <Field placeholder="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Field placeholder="Password" secureTextEntry autoComplete="new-password" value={password} onChangeText={setPassword} />
      <FormError message={error} />
      <Button label="Create account" onPress={handleSignUp} loading={loading} disabled={!email || !password} />
      <Link href="/(auth)/sign-in" asChild>
        <Pressable><AppText variant="caption" tone="accent" style={{ textAlign: 'center', marginTop: 20, fontSize: 14, fontWeight: '700' }}>Already have an account? Sign in</AppText></Pressable>
      </Link>
      <LegalLinks prefix="By creating an account you agree to our" />
    </AuthShell>
  );
}
