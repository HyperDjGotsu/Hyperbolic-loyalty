import { useRouter } from 'expo-router';
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
import { useApi } from '@/lib/api';

export default function OnboardingScreen() {
  const api = useApi();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!displayName.trim()) {
      setError('Please enter a display name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/api/player/link', {
        action: 'create_new',
        displayName: displayName.trim(),
      });
      router.replace('/(tabs)/index');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create player');
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
        <Text style={styles.title}>Welcome to GSHC Player Pass</Text>
        <Text style={styles.subtitle}>Choose your display name to get started</Text>

        <TextInput
          style={styles.input}
          placeholder="Display name"
          placeholderTextColor="#666"
          autoFocus
          maxLength={32}
          value={displayName}
          onChangeText={setDisplayName}
          onSubmitEditing={handleCreate}
          returnKeyType="done"
        />
        <Text style={styles.hint}>This is what other players will see. You can change it later.</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create My Account</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 40 },
  input: {
    backgroundColor: '#16161f',
    borderWidth: 1,
    borderColor: '#2d2d3d',
    borderRadius: 12,
    color: '#fff',
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  hint: { color: '#4b5563', fontSize: 12, marginBottom: 24 },
  error: { color: '#f87171', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  button: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
