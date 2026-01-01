'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

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

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [mode, setMode] = useState<'choice' | 'link' | 'create'>('choice');
  const [hypId, setHypId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [primaryGame, setPrimaryGame] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingLink, setCheckingLink] = useState(true);

  // Check if user already has a linked player
  useEffect(() => {
    async function checkExistingLink() {
      if (!isLoaded || !user) return;
      
      try {
        const response = await fetch('/api/player/by-clerk');
        const data = await response.json();
        
        if (data.linked) {
          // User already has a linked player, go to dashboard
          localStorage.setItem('hyperbolic_player_id', data.hyp_id);
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
    }
    
    checkExistingLink();
  }, [isLoaded, user, router]);

  const handleLinkExisting = async () => {
    if (!hypId.trim()) {
      setError('Please enter your HYP-ID');
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
          hypId: hypId.trim().toUpperCase() 
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

  const handleCreateNew = async () => {
    if (!displayName.trim()) {
      setError('Please enter a display name');
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create player');
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

  if (!isLoaded || checkingLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-3xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-orbitron">
            HYPERBOLIC
          </div>
          <div className="text-orange-400 text-sm font-bold tracking-widest mt-1">— GAMES —</div>
        </div>

        {/* Welcome */}
        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 mb-6">
          <h1 className="text-xl font-bold text-white mb-2">
            Welcome{user?.firstName ? `, ${user.firstName}` : ''}! 👋
          </h1>
          <p className="text-slate-400">
            Let's get you set up with your player profile.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {mode === 'choice' && (
          <div className="space-y-4">
            {/* Already have a card */}
            <button
              onClick={() => setMode('link')}
              className="w-full bg-slate-900 rounded-2xl border border-slate-700 p-6 text-left hover:border-cyan-500/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl flex items-center justify-center text-3xl">
                  💳
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">I have a card</h3>
                  <p className="text-slate-400 text-sm">Link your existing HYP-ID to this account</p>
                </div>
              </div>
            </button>

            {/* New player */}
            <button
              onClick={() => setMode('create')}
              className="w-full bg-slate-900 rounded-2xl border border-slate-700 p-6 text-left hover:border-purple-500/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center text-3xl">
                  ✨
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">I'm new here</h3>
                  <p className="text-slate-400 text-sm">Create a new player profile</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {mode === 'link' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6">
            <button
              onClick={() => { setMode('choice'); setError(''); }}
              className="text-slate-400 text-sm mb-4 hover:text-white"
            >
              ← Back
            </button>
            
            <h2 className="text-xl font-bold text-white mb-2">Link Your Card</h2>
            <p className="text-slate-400 text-sm mb-6">
              Enter the HYP-ID from your NFC card or receipt.
            </p>

            <div className="mb-6">
              <label className="block text-slate-400 text-sm mb-2">HYP-ID</label>
              <input
                type="text"
                value={hypId}
                onChange={(e) => setHypId(e.target.value.toUpperCase())}
                placeholder="HYP-XXXXXX"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-lg tracking-wider"
                maxLength={10}
              />
            </div>

            <button
              onClick={handleLinkExisting}
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold py-4 rounded-xl disabled:opacity-50 hover:from-cyan-400 hover:to-purple-400 transition-all"
            >
              {loading ? 'Linking...' : 'Link My Card'}
            </button>

            <p className="text-slate-500 text-xs text-center mt-4">
              Can't find your ID? Ask staff at the store for help.
            </p>
          </div>
        )}

        {mode === 'create' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6">
            <button
              onClick={() => { setMode('choice'); setError(''); }}
              className="text-slate-400 text-sm mb-4 hover:text-white"
            >
              ← Back
            </button>
            
            <h2 className="text-xl font-bold text-white mb-2">Create Profile</h2>
            <p className="text-slate-400 text-sm mb-6">
              Set up your player profile to start earning XP.
            </p>

            {/* Display Name */}
            <div className="mb-4">
              <label className="block text-slate-400 text-sm mb-2">Display Name *</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your gamer tag"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                maxLength={30}
              />
            </div>

            {/* Discord Username */}
            <div className="mb-4">
              <label className="block text-slate-400 text-sm mb-2">
                Discord Username
                <span className="text-slate-600 ml-2">(recommended)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">@</span>
                <input
                  type="text"
                  value={discordUsername}
                  onChange={(e) => setDiscordUsername(e.target.value.replace('@', ''))}
                  placeholder="username"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 pl-9 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  maxLength={32}
                />
              </div>
              <p className="text-slate-600 text-xs mt-1">For tournament announcements & community</p>
            </div>

            {/* Phone Number */}
            <div className="mb-4">
              <label className="block text-slate-400 text-sm mb-2">
                Phone Number
                <span className="text-slate-600 ml-2">(optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <p className="text-slate-600 text-xs mt-1">For event reminders (we won't spam you)</p>
            </div>

            {/* Primary Game */}
            <div className="mb-6">
              <label className="block text-slate-400 text-sm mb-2">Primary Game (optional)</label>
              <div className="grid grid-cols-3 gap-2">
                {GAME_OPTIONS.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => setPrimaryGame(primaryGame === game.id ? '' : game.id)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      primaryGame === game.id
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-xl mb-1">{game.icon}</div>
                    <div className="text-xs truncate">{game.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateNew}
              disabled={loading || !displayName.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 rounded-xl disabled:opacity-50 hover:from-purple-400 hover:to-pink-400 transition-all"
            >
              {loading ? 'Creating...' : 'Create Profile'}
            </button>

            <p className="text-slate-500 text-xs text-center mt-4">
              You can pick up an NFC card at your next store visit!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
