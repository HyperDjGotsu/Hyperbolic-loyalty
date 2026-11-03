import { useSignIn } from '@clerk/clerk-expo';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import LegalLinks from '@/components/LegalLinks';
import { AppText, Button } from '@/components/kit';
import { AuthShell, Divider, Field, FormError, SsoButtons, clerkError } from '@/components/AuthKit';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.create({ identifier: email.trim(), password });
      if (result.status === 'complete') await setActive({ session: result.createdSessionId });
      else setError('Additional verification required. Please use the web app.');
    } catch (e) {
      setError(clerkError(e, 'Sign in failed'));
    } finally {
      setLoading(false);
    }
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
