import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useApi } from '@/lib/api';
import { C } from '@/lib/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

type Store = { id: string; name: string; city: string; is_flagship: boolean };
type Mode = 'choice' | 'link' | 'create';
type Step = 'profile' | 'store';

// ─── Data ────────────────────────────────────────────────────────────────────

const GAMES = [
  { id: 'one_piece',          name: 'One Piece',             icon: '🏴‍☠️' },
  { id: 'pokemon',            name: 'Pokémon',               icon: '⚡' },
  { id: 'mtg',                name: 'Magic: The Gathering',  icon: '✨' },
  { id: 'gundam',             name: 'Gundam',                icon: '🤖' },
  { id: 'lorcana',            name: 'Lorcana',               icon: '🪄' },
  { id: 'star_wars',          name: 'Star Wars Unlimited',   icon: '🌟' },
  { id: 'vanguard',           name: 'Vanguard',              icon: '⚔️' },
  { id: 'yugioh',             name: 'Yu-Gi-Oh!',            icon: '🃏' },
  { id: 'digimon',            name: 'Digimon',               icon: '🦖' },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const api = useApi();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('create');
  const [step, setStep] = useState<Step>('profile');

  // Link existing
  const [hypId, setHypId] = useState('');

  // Create new — profile step
  const [displayName, setDisplayName]       = useState('');
  const [referralCode, setReferralCode]     = useState('');
  const [referralValid, setReferralValid]   = useState<boolean | null>(null);
  const [referralChecking, setReferralChecking] = useState(false);
  const [discordUsername, setDiscordUsername] = useState('');
  const [phone, setPhone]                   = useState('');
  const [primaryGame, setPrimaryGame]       = useState('');

  // Create new — store step
  const [stores, setStores]         = useState<Store[]>([]);
  const [homeStoreId, setHomeStoreId] = useState('');
  const [storesLoading, setStoresLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Load stores on mount
  useEffect(() => {
    setStoresLoading(true);
    api.get<{ stores: Store[] }>('/api/stores')
      .then(d => setStores(d.stores ?? []))
      .catch(() => {})
      .finally(() => setStoresLoading(false));
  }, []);

  // Referral code validation with debounce
  useEffect(() => {
    if (!referralCode || referralCode.length < 5) { setReferralValid(null); return; }
    setReferralChecking(true);
    const t = setTimeout(async () => {
      try {
        const d = await api.get<{ valid: boolean }>(
          `/api/referral/validate?code=${encodeURIComponent(referralCode)}`
        );
        setReferralValid(d.valid);
      } catch {
        setReferralValid(false);
      } finally {
        setReferralChecking(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [referralCode]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handleLinkExisting() {
    if (!hypId.trim()) { setError('Please enter your HYP-ID'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/api/player/link', {
        action: 'link_existing',
        hypId: hypId.trim().toUpperCase(),
      });
      router.replace('/(tabs)' as never);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to link card');
    } finally {
      setLoading(false);
    }
  }

  function handleProfileNext() {
    if (!displayName.trim()) { setError('Please enter a display name'); return; }
    setError('');
    setStep('store');
  }

  async function handleCreateNew() {
    if (!homeStoreId) { setError('Please select your home store'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/api/player/link', {
        action: 'create_new',
        displayName: displayName.trim(),
        discordUsername: discordUsername.trim() || null,
        phone: phone.trim() || null,
        primaryGame: primaryGame || null,
        referralCode: referralCode.trim().toUpperCase() || null,
        homeStoreId,
      });
      router.replace('/(tabs)' as never);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  }

  function reset() { setError(''); setMode('choice'); setStep('profile'); }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>PLAYER PASS</Text>
          <Text style={styles.brandSub}>— LEVEL UP YOUR COMMUNITY —</Text>
        </View>

        {/* Error banner */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Choice screen ─────────────────────────────────────────────────── */}
        {mode === 'choice' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Welcome 👋</Text>
            <Text style={styles.sectionBody}>
              Let's get you set up with your player profile.
            </Text>

            <Pressable style={styles.choiceCard} onPress={() => { setError(''); setMode('link'); }}>
              <Text style={styles.choiceIcon}>💳</Text>
              <View style={styles.choiceText}>
                <Text style={styles.choiceTitle}>I have a card</Text>
                <Text style={styles.choiceDesc}>Link your existing HYP-ID to this account</Text>
              </View>
            </Pressable>

            <Pressable style={styles.choiceCard} onPress={() => { setError(''); setMode('create'); }}>
              <Text style={styles.choiceIcon}>✨</Text>
              <View style={styles.choiceText}>
                <Text style={styles.choiceTitle}>I'm new here</Text>
                <Text style={styles.choiceDesc}>Create a new player profile</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* ── Link existing ─────────────────────────────────────────────────── */}
        {mode === 'link' && (
          <View style={styles.section}>
            <Pressable onPress={reset} style={styles.back}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>

            <Text style={styles.sectionTitle}>Link Your Card</Text>
            <Text style={styles.sectionBody}>
              Enter the HYP-ID from your NFC card or receipt.
            </Text>

            <Text style={styles.label}>HYP-ID</Text>
            <TextInput
              style={styles.input}
              placeholder="HYP-XXXXXX"
              placeholderTextColor={C.textTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              value={hypId}
              onChangeText={v => setHypId(v.toUpperCase())}
            />

            <Pressable
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLinkExisting}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={C.accentFg} />
                : <Text style={styles.btnText}>Link My Card</Text>}
            </Pressable>

            <Text style={styles.hint}>Can't find your ID? Ask staff at the store for help.</Text>
          </View>
        )}

        {/* ── Create — Profile step ─────────────────────────────────────────── */}
        {mode === 'create' && step === 'profile' && (
          <View style={styles.section}>
            <Pressable onPress={reset} style={styles.back}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>

            <Text style={styles.sectionTitle}>Create Profile</Text>
            <Text style={styles.sectionBody}>Set up your player profile to start earning XP.</Text>

            {/* Display name */}
            <Text style={styles.label}>Display Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Your gamer tag"
              placeholderTextColor={C.textTertiary}
              maxLength={30}
              autoFocus
              value={displayName}
              onChangeText={setDisplayName}
            />

            {/* Referral code */}
            <Text style={styles.label}>
              Referral Code <Text style={styles.optional}>(optional)</Text>
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex,
                  referralValid === true  && styles.inputValid,
                  referralValid === false && styles.inputInvalid,
                ]}
                placeholder="REF-XXXXXXXX"
                placeholderTextColor={C.textTertiary}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={20}
                value={referralCode}
                onChangeText={v => setReferralCode(v.toUpperCase())}
              />
              {referralChecking && (
                <ActivityIndicator color={C.accent} style={styles.inputSuffix} />
              )}
              {!referralChecking && referralValid === true && (
                <Text style={[styles.inputSuffix, { color: C.success }]}>✓</Text>
              )}
              {!referralChecking && referralValid === false && referralCode.length > 0 && (
                <Text style={[styles.inputSuffix, { color: C.danger }]}>✗</Text>
              )}
            </View>
            {referralValid === true && (
              <Text style={[styles.hint, { color: C.success }]}>✨ Valid code! You'll get +30 XP bonus</Text>
            )}
            {referralValid === false && referralCode.length > 0 && (
              <Text style={[styles.hint, { color: C.danger }]}>Invalid referral code</Text>
            )}

            {/* Discord */}
            <Text style={styles.label}>
              Discord Username <Text style={styles.optional}>(optional)</Text>
            </Text>
            <View style={styles.discordRow}>
              <Text style={styles.discordAt}>@</Text>
              <TextInput
                style={[styles.input, styles.inputFlex, { paddingLeft: 32 }]}
                placeholder="username"
                placeholderTextColor={C.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={32}
                value={discordUsername}
                onChangeText={v => setDiscordUsername(v.replace('@', ''))}
              />
            </View>
            <Text style={styles.hint}>For tournament announcements &amp; community</Text>

            {/* Phone */}
            <Text style={styles.label}>
              Phone Number <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="(555) 123-4567"
              placeholderTextColor={C.textTertiary}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <Text style={styles.hint}>For event reminders (we won't spam you)</Text>

            {/* Primary game */}
            <Text style={[styles.label, { marginTop: 8 }]}>Primary Game <Text style={styles.optional}>(optional)</Text></Text>
            <View style={styles.gameGrid}>
              {GAMES.map(g => (
                <Pressable
                  key={g.id}
                  style={[styles.gameCell, primaryGame === g.id && styles.gameCellActive]}
                  onPress={() => setPrimaryGame(primaryGame === g.id ? '' : g.id)}
                >
                  <Text style={styles.gameIcon}>{g.icon}</Text>
                  <Text style={[styles.gameName, primaryGame === g.id && styles.gameNameActive]} numberOfLines={2}>
                    {g.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.btn, !displayName.trim() && styles.btnDisabled]}
              onPress={handleProfileNext}
              disabled={!displayName.trim()}
            >
              <Text style={styles.btnText}>Next →</Text>
            </Pressable>

            <Text style={styles.hint}>You can pick up an NFC card at your next store visit!</Text>
          </View>
        )}

        {/* ── Create — Store step ───────────────────────────────────────────── */}
        {mode === 'create' && step === 'store' && (
          <View style={styles.section}>
            <Pressable onPress={() => { setStep('profile'); setError(''); }} style={styles.back}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>

            <Text style={styles.sectionTitle}>Your Home Store</Text>
            <Text style={styles.sectionBody}>
              This is where your leaderboard ranking lives. You can still earn points and attend events at any store in the network.
            </Text>

            {storesLoading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
            ) : (
              stores.map(store => (
                <Pressable
                  key={store.id}
                  style={[styles.storeCard, homeStoreId === store.id && styles.storeCardActive]}
                  onPress={() => setHomeStoreId(store.id)}
                >
                  <View style={styles.storeInfo}>
                    <View style={styles.storeNameRow}>
                      <Text style={styles.storeName}>{store.name}</Text>
                      {store.is_flagship && (
                        <View style={styles.flagshipBadge}>
                          <Text style={styles.flagshipText}>Flagship</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.storeCity}>{store.city}, CA</Text>
                  </View>
                  {homeStoreId === store.id && (
                    <Text style={styles.storeCheck}>✓</Text>
                  )}
                </Pressable>
              ))
            )}

            <Pressable
              style={[styles.btn, (loading || !homeStoreId) && styles.btnDisabled, { marginTop: 8 }]}
              onPress={handleCreateNew}
              disabled={loading || !homeStoreId}
            >
              {loading
                ? <ActivityIndicator color={C.accentFg} />
                : <Text style={styles.btnText}>Join the Network</Text>}
            </Pressable>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bgBase },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },

  // Header
  header:    { alignItems: 'center', marginBottom: 32 },
  brand:     { fontSize: 28, fontWeight: '900', color: C.accent, letterSpacing: 2 },
  brandSub:  { fontSize: 11, color: C.textTertiary, fontWeight: '600', letterSpacing: 4, marginTop: 4 },

  // Error
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: C.danger, fontSize: 13, textAlign: 'center' },

  // Section
  section:      { gap: 4 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  sectionBody:  { fontSize: 14, color: C.textSecondary, marginBottom: 20, lineHeight: 20 },

  // Back
  back:     { marginBottom: 16 },
  backText: { color: C.textSecondary, fontSize: 14 },

  // Choice cards
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: C.bgSurface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  choiceIcon:  { fontSize: 36 },
  choiceText:  { flex: 1 },
  choiceTitle: { fontSize: 17, fontWeight: '700', color: C.textPrimary, marginBottom: 2 },
  choiceDesc:  { fontSize: 13, color: C.textSecondary },

  // Form
  label:    { fontSize: 13, color: C.textSecondary, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  required: { color: C.danger },
  optional: { color: C.textTertiary, fontWeight: '400' },
  hint:     { fontSize: 11, color: C.textTertiary, marginTop: 4, marginBottom: 4 },

  input: {
    backgroundColor: C.bgInput,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    color: C.textPrimary,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputFlex:    { flex: 1 },
  inputValid:   { borderColor: C.success },
  inputInvalid: { borderColor: C.danger },
  inputRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputSuffix:  { fontSize: 18, width: 24, textAlign: 'center' },

  discordRow: { flexDirection: 'row', alignItems: 'center' },
  discordAt:  {
    position: 'absolute',
    left: 14,
    zIndex: 1,
    color: C.textTertiary,
    fontSize: 16,
  },

  // Game grid
  gameGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  gameCell: {
    width: '30%',
    backgroundColor: C.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    alignItems: 'center',
  },
  gameCellActive: {
    backgroundColor: 'rgba(196,181,253,0.1)',
    borderColor: C.accent,
  },
  gameIcon:     { fontSize: 22, marginBottom: 4 },
  gameName:     { fontSize: 10, color: C.textSecondary, textAlign: 'center' },
  gameNameActive: { color: C.accent },

  // Store picker
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.bgInput,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    padding: 16,
    marginBottom: 10,
  },
  storeCardActive: { backgroundColor: 'rgba(196,181,253,0.08)', borderColor: C.accent },
  storeInfo:    { flex: 1 },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  storeName:    { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  storeCity:    { fontSize: 13, color: C.textSecondary },
  storeCheck:   { color: C.accent, fontSize: 20, fontWeight: '700' },
  flagshipBadge: {
    backgroundColor: 'rgba(234,179,8,0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  flagshipText: { color: '#eab308', fontSize: 10, fontWeight: '700' },

  // CTA button
  btn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: C.accentFg, fontSize: 16, fontWeight: '800' },
});
