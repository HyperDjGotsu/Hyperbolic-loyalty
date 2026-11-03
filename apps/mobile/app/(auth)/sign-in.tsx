import { useSignIn } from '@clerk/clerk-expo';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import LegalLinks from '@/components/LegalLinks';
import { AppText, Button } from '@/components/kit';
import { AuthShell, Divider, Field, FormError, SsoButtons, beginSecondFactor, clerkError, secondFactorHint, type SecondFactorStrategy } from '@/components/AuthKit';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [factor, setFactor] = useState<SecondFactorStrategy | null>(null);
  const [code, setCode] = useState('');

  async function handleSignIn() {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.create({ identifier: email.trim(), password });
      if (result.status === 'complete') await setActive({ session: result.createdSessionId });
      else if ((result.status as string) === 'needs_second_factor' || (result.status as string) === 'needs_client_trust') {
        const strategy = await beginSecondFactor(signIn as never);
        if (strategy) setFactor(strategy);
        else setError('This account needs a verification method the app does not support yet. Contact support.');
      } else setError('Sign in could not be completed. Please try again.');
    } catch (e) {
      setError(clerkError(e, 'Sign in failed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!isLoaded || !factor) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.attemptSecondFactor({ strategy: factor, code: code.trim() });
      if (result.status === 'complete') await setActive({ session: result.createdSessionId });
      else setError('Verification could not be completed. Please try again.');
    } catch (e) {
      setError(clerkError(e, 'That code did not work'));
    } finally {
      setLoading(false);
    }
  }

  if (factor) {
    return (
      <AuthShell title="Verify it's you" subtitle={secondFactorHint(factor)}>
        <Field placeholder="Code" keyboardType="number-pad" autoComplete="one-time-code" maxLength={8} value={code} onChangeText={setCode} />
        <FormError message={error} />
        <Button label="Verify" onPress={handleVerify} loading={loading} disabled={code.trim().length < 6} />
        <Pressable onPress={() => { setFactor(null); setCode(''); setError(''); }}>
          <AppText variant="caption" tone="secondary" style={{ textAlign: 'center', marginTop: 20, fontSize: 14 }}>Back to sign in</AppText>
        </Pressable>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Welcome back" subtitle="Level up your community">
      <SsoButtons onError={setError} />
      <Divider />
      <Field placeholder="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Field placeholder="Password" secureTextEntry autoComplete="password" value={password} onChangeText={setPassword} />
      <FormError message={error} />
      <Button label="Sign in" onPress={handleSignIn} loading={loading} disabled={!email || !password} />
      <Link href={"/(auth)/forgot-password" as never} asChild>
        <Pressable><AppText variant="caption" tone="secondary" style={{ textAlign: 'center', marginTop: 20, fontSize: 14 }}>Forgot password?</AppText></Pressable>
      </Link>
      <Link href="/(auth)/sign-up" asChild>
        <Pressable><AppText variant="caption" tone="accent" style={{ textAlign: 'center', marginTop: 14, fontSize: 14, fontWeight: '700' }}>New player? Create account</AppText></Pressable>
      </Link>
      <LegalLinks prefix="By signing in you agree to our" />
    </AuthShell>
  );
}
