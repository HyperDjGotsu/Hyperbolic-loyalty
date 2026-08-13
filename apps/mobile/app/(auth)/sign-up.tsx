import { useSignUp } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sign up failed');
    } finally {
      setLoading(false);
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>PLAYER PASS</Text>
        <Text style={styles.logoSub}>— LEVEL UP YOUR COMMUNITY —</Text>
        <Text style={styles.subtitle}>
          {pendingVerification ? 'Check your email' : 'Create Account'}
        </Text>

        {!pendingVerification ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#7a7060"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#7a7060"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
            </Pressable>
            <Link href="/(auth)/sign-in" style={styles.link}>
              Already have an account? Sign in
            </Link>
          </>
        ) : (
          <>
            <Text style={styles.hint}>Enter the 6-digit code sent to {email}</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="000000"
              placeholderTextColor="#7a7060"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111009' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logo: { fontFamily: 'Georgia', fontSize: 28, fontWeight: '900', color: '#f2efe8', textAlign: 'center' },
  logoSub: { fontSize: 11, letterSpacing: 4, color: '#f97316', fontWeight: '700', textAlign: 'center', marginBottom: 8, marginTop: 6 },
  subtitle: { fontSize: 14, color: '#7a7060', textAlign: 'center', marginBottom: 40 },
  hint: { color: '#a89f90', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  input: {
    backgroundColor: '#1e1c14',
    borderWidth: 1,
    borderColor: 'rgba(242,239,232,0.08)',
    borderRadius: 10,
    color: '#f2efe8',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontSize: 24 },
  error: { color: '#ef4444', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  button: {
    backgroundColor: '#c4b5fd',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#111009', fontSize: 16, fontWeight: '700' },
  link: { color: '#c4b5fd', textAlign: 'center', marginTop: 24, fontSize: 14 },
});
