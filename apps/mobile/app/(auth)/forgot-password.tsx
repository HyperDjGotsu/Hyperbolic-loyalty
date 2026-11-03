import { useSignIn } from '@clerk/clerk-expo';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { AppText, Button } from '@/components/kit';
import { AuthShell, Field, FormError, beginSecondFactor, clerkError, secondFactorHint, type SecondFactorStrategy } from '@/components/AuthKit';

export default function ForgotPasswordScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [factor, setFactor] = useState<SecondFactorStrategy | null>(null);
  const [code2, setCode2] = useState('');

  async function sendCode() {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: email.trim() });
      setSent(true);
    } catch (e) {
      setError(clerkError(e, 'Could not send a reset code'));
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.attemptFirstFactor({ strategy: 'reset_password_email_code', code, password });
      if (result.status === 'complete') await setActive({ session: result.createdSessionId });
      else if (result.status === 'needs_second_factor') {
        const strategy = await beginSecondFactor(signIn as never);
        if (strategy) setFactor(strategy);
        else setError('This account needs a verification method the app does not support yet. Contact support.');
      } else setError('Could not finish resetting your password. Please try again.');
    } catch (e) {
      setError(clerkError(e, 'Could not reset your password'));
    } finally {
      setLoading(false);
    }
  }

  async function verifySecondFactor() {
    if (!isLoaded || !factor) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn.attemptSecondFactor({ strategy: factor, code: code2.trim() });
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
        <Field placeholder="Code" keyboardType="number-pad" autoComplete="one-time-code" maxLength={8} value={code2} onChangeText={setCode2} />
        <FormError message={error} />
        <Button label="Verify" onPress={verifySecondFactor} loading={loading} disabled={code2.trim().length < 6} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset password" subtitle={sent ? `Enter the code we emailed to ${email} and a new password` : 'We will email you a code'}>
      {!sent ? (
        <>
          <Field placeholder="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <FormError message={error} />
          <Button label="Send code" onPress={sendCode} loading={loading} disabled={!email} />
        </>
      ) : (
        <>
          <Field placeholder="Code" keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} />
          <Field placeholder="New password" secureTextEntry autoComplete="new-password" value={password} onChangeText={setPassword} />
          <FormError message={error} />
          <Button label="Reset password" onPress={resetPassword} loading={loading} disabled={code.length < 6 || !password} />
        </>
      )}
      <Link href="/(auth)/sign-in" asChild>
        <Pressable><AppText variant="caption" tone="secondary" style={{ textAlign: 'center', marginTop: 20, fontSize: 14 }}>Back to sign in</AppText></Pressable>
      </Link>
    </AuthShell>
  );
}
