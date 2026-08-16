'use client';

import { useState, useEffect, Suspense } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';

const GAME_OPTIONS = [
  { id: 'one_piece', name: 'One Piece', icon: '🏴‍☠️' },
  { id: 'pokemon', name: 'Pokémon', icon: '⚡' },
  { id: 'mtg', name: 'Magic: The Gathering', icon: '✨' },
  { id: 'gundam', name: 'Gundam', icon: '🤖' },
  { id: 'lorcana', name: 'Lorcana', icon: '🪄' },
  { id: 'star_wars', name: 'Star Wars Unlimited', icon: '🌟' },
  { id: 'vanguard', name: 'Vanguard', icon: '⚔️' },
  { id: 'yugioh', name: 'Yu-Gi-Oh!', icon: '🃏' },
  { id: 'digimon', name: 'Digimon', icon: '🦖' },
];

// Inner component that uses useSearchParams
interface Store {
  id: string;
  name: string;
  city: string;
  slug: string;
  is_flagship: boolean;
  color: string | null;
}

function OnboardingContent() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'choice' | 'link' | 'create'>('create');
  const [step, setStep] = useState<'profile' | 'store'>('profile');
  const [playerId, setPlayerId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [primaryGame, setPrimaryGame] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referralChecking, setReferralChecking] = useState(false);
  const [staffInviteCode, setStaffInviteCode] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [homeStoreId, setHomeStoreId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingLink, setCheckingLink] = useState(true);

  // Check if user already has a linked player
  useEffect(() => {
    async function checkExistingLink() {
      if (!isLoaded || !user) return;

      try {
        const response = await fetch('/api/player/by-clerk');
        if (!response.ok) {
          setCheckingLink(false);
          return;
        }
        const data = await response.json();

        if (data.linked) {
          // User already has a linked player, go to dashboard
          localStorage.setItem('hyperbolic_player_id', data.player_id);
          localStorage.setItem('hyperbolic_player_uuid', data.id);
          router.push('/dashboard');
          return;
        }
      } catch (err) {
        console.error('Error checking link:', err);
      }

      setCheckingLink(false);
      // Pre-fill display name from Clerk
      if (user.firstName) {
        setDisplayName(user.firstName);
      } else if (user.username) {
        setDisplayName(user.username);
      }

      const refParam = searchParams.get('ref');
      if (refParam) {
        setReferralCode(refParam.toUpperCase());
        validateReferralCode(refParam.toUpperCase());
      }

      const staffParam = searchParams.get('staff');
      if (staffParam) {
        setStaffInviteCode(staffParam);
        setMode('create');
      }

      // Load stores for picker
      fetch('/api/stores')
        .then(r => r.json())
        .then(data => {
          if (data.stores) {
            setStores(data.stores);
            // Pre-select store from URL param (?store=trade-emporium)
            const storeParam = searchParams.get('store');
            if (storeParam) {
              const match = data.stores.find((s: Store) => s.slug === storeParam);
              if (match) setHomeStoreId(match.id);
            }
          }
        })
        .catch(() => {});
    }

    checkExistingLink();
  }, [isLoaded, user, router, searchParams]);

  // Validate referral code with debounce
  const validateReferralCode = async (code: string) => {
    if (!code || code.length < 5) {
      setReferralValid(null);
      return;
    }

    setReferralChecking(true);
    try {
      const response = await fetch(`/api/referral/validate?code=${encodeURIComponent(code)}`);
      const data = await response.json();
      setReferralValid(data.valid);
    } catch (err) {
      setReferralValid(false);
    } finally {
      setReferralChecking(false);
    }
  };

  // Debounced referral code validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (referralCode) {
        validateReferralCode(referralCode);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [referralCode]);

  const handleLinkExisting = async () => {
    if (!playerId.trim()) {
      setError('Please enter your Player ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/player/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link_existing',
          playerId: playerId.trim().toUpperCase()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to link player');
        return;
      }

      // Success! Store locally and redirect
      localStorage.setItem('hyperbolic_player_id', data.player_id);
      router.push('/dashboard');
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileNext = () => {
    if (!displayName.trim()) {
      setError('Please enter a display name');
      return;
    }
    setError('');
    setStep('store');
  };

  const handleCreateNew = async () => {
    if (!homeStoreId) {
      setError('Please select your home store');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/player/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_new',
          displayName: displayName.trim(),
          discordUsername: discordUsername.trim() || null,
          phone: phone.trim() || null,
          primaryGame: primaryGame || null,
          referralCode: referralCode.trim().toUpperCase() || null,
          staffInviteCode: staffInviteCode || null,
          homeStoreId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create player');
        return;
      }

      localStorage.setItem('hyperbolic_player_id', data.player_id);
      // Seed store picker to home store so dashboard doesn't show a stale previous selection
      const homeStore = stores.find((s) => s.id === homeStoreId);
      if (homeStore) {
        localStorage.setItem('ggc_selected_store_id', homeStore.id);
        localStorage.setItem('ggc_selected_store_name', homeStore.name);
      }
      router.push('/dashboard');
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || checkingLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="font-display text-3xl font-black text-accent">
            PLAYER PASS
          </div>
        </div>

        {/* Welcome */}
        <div className="card p-6 mb-6">
          <h1 className="text-xl font-bold text-primary mb-2">
            Welcome{user?.firstName ? `, ${user.firstName}` : ''}! 👋
          </h1>
          <p className="text-secondary">
            Let's get you set up with your player profile.
          </p>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 mb-6">
            <p className="text-danger text-sm">{error}</p>
          </div>
        )}


        {mode === 'link' && (
          <div className="card p-6">
            <button
              onClick={() => { setMode('choice'); setError(''); }}
              className="text-secondary text-sm mb-4 hover:text-primary"
            >
              ← Back
            </button>

            <h2 className="text-xl font-bold text-primary mb-2">Link Your Card</h2>
            <p className="text-secondary text-sm mb-6">
              Enter the Player ID from your NFC card or receipt.
            </p>

            <div className="mb-6">
              <label className="block text-secondary text-sm mb-2">Player ID</label>
              <input
                type="text"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value.toUpperCase())}
                placeholder="GGC-XXXXXX"
                className="w-full bg-input border border-border-token rounded-xl py-3 px-4 text-primary placeholder-tertiary focus:outline-none focus:border-accent font-mono text-lg tracking-wider"
                maxLength={10}
              />
            </div>

            <button
              onClick={handleLinkExisting}
              disabled={loading}
              className="w-full bg-accent text-accent-fg font-bold py-4 rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {loading ? 'Linking...' : 'Link My Card'}
            </button>

            <p className="text-tertiary text-xs text-center mt-4">
              Can't find your ID? Ask staff at the store for help.
            </p>
          </div>
        )}

        {mode === 'create' && (
          <div className="card p-6">
            <button
              onClick={() => { setMode('choice'); setError(''); }}
              className="text-secondary text-sm mb-4 hover:text-primary"
            >
              ← Back
            </button>

            <h2 className="text-xl font-bold text-primary mb-2">Create Profile</h2>
            <p className="text-secondary text-sm mb-6">
              Set up your player profile to start earning XP.
            </p>

            {/* Display Name */}
            <div className="mb-4">
              <label className="block text-secondary text-sm mb-2">Display Name *</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your gamer tag"
                className="w-full bg-input border border-border-token rounded-xl py-3 px-4 text-primary placeholder-tertiary focus:outline-none focus:border-accent"
                maxLength={30}
              />
            </div>

            {/* Referral Code */}
            <div className="mb-4">
              <label className="block text-secondary text-sm mb-2">
                Referral Code
                <span className="text-tertiary ml-2">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="REF-XXXXXXXX"
                  className={`w-full bg-input border rounded-xl py-3 px-4 pr-10 text-primary placeholder-tertiary focus:outline-none font-mono tracking-wider ${
                    referralValid === true
                      ? 'border-success focus:border-success'
                      : referralValid === false
                      ? 'border-danger focus:border-danger'
                      : 'border-border-token focus:border-accent'
                  }`}
                  maxLength={20}
                />
                {/* Validation indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {referralChecking ? (
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                  ) : referralValid === true ? (
                    <span className="text-success text-lg">✓</span>
                  ) : referralValid === false ? (
                    <span className="text-danger text-lg">✗</span>
                  ) : null}
                </div>
              </div>
              {referralValid === true && (
                <p className="text-success text-xs mt-1">✨ Valid code! You'll get +30 XP bonus</p>
              )}
              {referralValid === false && referralCode && (
                <p className="text-danger text-xs mt-1">Invalid referral code</p>
              )}
              {!referralCode && (
                <p className="text-tertiary text-xs mt-1">Got a friend's code? Enter it for bonus XP!</p>
              )}
            </div>

            {/* Discord Username */}
            <div className="mb-4">
              <label className="block text-secondary text-sm mb-2">
                Discord Username
                <span className="text-tertiary ml-2">(recommended)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary">@</span>
                <input
                  type="text"
                  value={discordUsername}
                  onChange={(e) => setDiscordUsername(e.target.value.replace('@', ''))}
                  placeholder="username"
                  className="w-full bg-input border border-border-token rounded-xl py-3 px-4 pl-9 text-primary placeholder-tertiary focus:outline-none focus:border-accent"
                  maxLength={32}
                />
              </div>
              <p className="text-tertiary text-xs mt-1">For tournament announcements & community</p>
            </div>

            {/* Phone Number */}
            <div className="mb-4">
              <label className="block text-secondary text-sm mb-2">
                Phone Number
                <span className="text-tertiary ml-2">(optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full bg-input border border-border-token rounded-xl py-3 px-4 text-primary placeholder-tertiary focus:outline-none focus:border-accent"
              />
              <p className="text-tertiary text-xs mt-1">For event reminders (we won't spam you)</p>
            </div>

            {/* Primary Game */}
            <div className="mb-6">
              <label className="block text-secondary text-sm mb-2">Primary Game (optional)</label>
              <div className="grid grid-cols-3 gap-2">
                {GAME_OPTIONS.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => setPrimaryGame(primaryGame === game.id ? '' : game.id)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      primaryGame === game.id
                        ? 'bg-accent/10 border-accent text-accent'
                        : 'bg-input border-border-token text-secondary hover:border-border-strong'
                    }`}
                  >
                    <div className="text-xl mb-1">{game.icon}</div>
                    <div className="text-xs truncate">{game.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleProfileNext}
              disabled={!displayName.trim()}
              className="w-full bg-accent text-accent-fg font-bold py-4 rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              Next →
            </button>

            <p className="text-tertiary text-xs text-center mt-4">
              You can pick up an NFC card at your next store visit!
            </p>
          </div>
        )}

        {/* Store picker step */}
        {mode === 'create' && step === 'store' && (
          <div>
            <button
              onClick={() => setStep('profile')}
              className="text-secondary text-sm mb-6 flex items-center gap-1 hover:text-primary transition-colors"
            >
              ← Back
            </button>

            <h2 className="text-primary text-xl font-bold mb-2">Your Home Store</h2>
            <p className="text-secondary text-sm mb-6">
              This is where your leaderboard ranking lives. You can still earn points and attend events at any store in the network.
            </p>

            <div className="space-y-3 mb-6">
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => setHomeStoreId(store.id)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                    homeStoreId === store.id
                      ? 'bg-accent/10 border-accent'
                      : 'bg-input border-border-token hover:border-border-strong'
                  }`}
                >
                  <div>
                    <div className="text-primary font-semibold flex items-center gap-2">
                      {store.name}
                      {store.is_flagship && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-medium">
                          Flagship
                        </span>
                      )}
                    </div>
                    <div className="text-secondary text-sm">{store.city}, CA</div>
                  </div>
                  {homeStoreId === store.id && (
                    <span className="text-accent text-lg">✓</span>
                  )}
                </button>
              ))}
            </div>

            {error && (
              <p className="text-danger text-sm mb-4">{error}</p>
            )}

            <button
              onClick={handleCreateNew}
              disabled={loading || !homeStoreId}
              className="w-full bg-accent text-accent-fg font-bold py-4 rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {loading ? 'Creating your profile...' : 'Join the Network'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function OnboardingLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-secondary">Loading...</p>
      </div>
    </div>
  );
}

// Main export with Suspense wrapper
export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingLoading />}>
      <OnboardingContent />
    </Suspense>
  );
}
