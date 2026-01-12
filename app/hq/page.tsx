'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

interface Player {
  id: string;
  player_id: string;
  display_name: string;
  email: string;
  is_staff: boolean;
  created_at: string;
}

interface GameXP {
  game_id: string;
  game_name: string;
  icon: string;
  xp: number;
  rank: string;
  xp_name: string;
}

interface PlayerDetails {
  player: Player;
  totalXp: number;
  gameXp: GameXP[];
  recentActivity: Array<{
    id: string;
    game_id: string;
    final_xp: number;
    description: string | null;
    created_at: string;
  }>;
}

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color_from: string;
  color_to: string;
  badge: string;
  is_active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
}

interface EmperorRanking {
  player_id: string;
  display_name: string;
  berries: number;
  bounty: string;
}

interface HallOfFameEntry {
  id: string;
  month: string;
  month_sort: string;
  player_name: string;
  player_id: string;
  monthly_xp: number;    // XP earned that month
  berries: number;       // Total lifetime berries at crowning
  bounty_display: string;
}

interface Game {
  id: string;
  name: string;
  icon: string;
  xp_name: string;
}

export default function HQPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState('players');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Player management state
  const [searchQuery, setSearchQuery] = useState('');
  const [playerDetails, setPlayerDetails] = useState<PlayerDetails | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState('');
  const [xpAmount, setXpAmount] = useState('');
  const [xpReason, setXpReason] = useState('');
  const [games, setGames] = useState<Game[]>([]);
  
  // Emperor state
  const [selectedMonth, setSelectedMonth] = useState('');
  const [monthlyRankings, setMonthlyRankings] = useState<EmperorRanking[]>([]);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>([]);
  const [emperorLoading, setEmperorLoading] = useState(false);
  
  // Banner state
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bannerLoading, setBannerLoading] = useState(false);

  // Check staff access
  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.push('/');
      return;
    }
    
    checkStaffAccess();
    loadGames();
  }, [isLoaded, user]);

  const checkStaffAccess = async () => {
    try {
      const res = await fetch('/api/hq/auth');
      const data = await res.json();
      
      if (!data.isStaff) {
        router.push('/dashboard');
        return;
      }
      
      setIsStaff(true);
      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/dashboard');
    }
  };

  const loadGames = async () => {
    try {
      const res = await fetch('/api/hq/games');
      const data = await res.json();
      setGames(data.games || []);
    } catch (error) {
      console.error('Failed to load games:', error);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Get month options for emperor system
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  };

  // Player search
  const searchPlayer = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    setPlayerDetails(null);
    
    try {
      const res = await fetch(`/api/hq/player?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        setPlayerDetails(data);
        if (data.gameXp?.length > 0) {
          setSelectedGame(data.gameXp[0].game_id);
        }
      }
    } catch (error) {
      showToast('Search failed', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  // Add XP
  const addXp = async (amount?: number) => {
    if (!playerDetails || !selectedGame) return;
    
    const xp = amount || parseInt(xpAmount);
    if (!xp || xp === 0) {
      showToast('Enter a valid XP amount', 'error');
      return;
    }
    
    try {
      const res = await fetch('/api/hq/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: playerDetails.player.id,
          gameId: selectedGame,
          amount: xp,
          reason: xpReason || (xp > 0 ? 'Admin adjustment' : 'Admin correction'),
        }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        showToast(`${xp > 0 ? '+' : ''}${xp} XP added!`, 'success');
        setXpAmount('');
        setXpReason('');
        // Refresh player data
        searchPlayer();
      }
    } catch (error) {
      showToast('Failed to add XP', 'error');
    }
  };

  // Load emperor rankings
  const loadEmperorRankings = async (month: string) => {
    setEmperorLoading(true);
    try {
      const res = await fetch(`/api/hq/emperors?month=${month}`);
      const data = await res.json();
      
      setMonthlyRankings(data.rankings || []);
      setHallOfFame(data.hallOfFame || []);
    } catch (error) {
      showToast('Failed to load emperor data', 'error');
    } finally {
      setEmperorLoading(false);
    }
  };

  // Crown emperor
  const crownEmperor = async () => {
    if (monthlyRankings.length === 0) return;
    
    const emperor = monthlyRankings[0];
    const monthLabel = getMonthOptions().find(m => m.value === selectedMonth)?.label || selectedMonth;
    
    if (!confirm(`Crown ${emperor.display_name} as the ${monthLabel} Emperor?\n\nMonthly XP Earned: ${emperor.berries.toLocaleString()} Berries\n\n(Total bounty will be calculated from their lifetime XP)`)) {
      return;
    }
    
    try {
      const res = await fetch('/api/hq/emperors/crown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: monthLabel,
          monthSort: selectedMonth,
          playerName: emperor.display_name,
          playerId: emperor.player_id,
          monthlyXp: emperor.berries, // This is actually monthly XP from rankings
        }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        showToast(`👑 ${emperor.display_name} crowned as ${monthLabel} Emperor! Bounty: ${data.bountyDisplay}`, 'success');
        loadEmperorRankings(selectedMonth);
      }
    } catch (error) {
      showToast('Failed to crown emperor', 'error');
    }
  };

  // Load banners
  const loadBanners = async () => {
    setBannerLoading(true);
    try {
      const res = await fetch('/api/hq/banners');
      const data = await res.json();
      setBanners(data.banners || []);
    } catch (error) {
      showToast('Failed to load banners', 'error');
    } finally {
      setBannerLoading(false);
    }
  };

  // Save banner
  const saveBanner = async (banner: Partial<Banner>) => {
    try {
      const res = await fetch('/api/hq/banners', {
        method: banner.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(banner),
      });
      
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        showToast('Banner saved!', 'success');
        setEditingBanner(null);
        loadBanners();
      }
    } catch (error) {
      showToast('Failed to save banner', 'error');
    }
  };

  // Delete banner
  const deleteBanner = async (id: string) => {
    if (!confirm('Delete this banner?')) return;
    
    try {
      const res = await fetch(`/api/hq/banners?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        showToast('Banner deleted', 'success');
        loadBanners();
      }
    } catch (error) {
      showToast('Failed to delete banner', 'error');
    }
  };

  // Tab change handlers
  useEffect(() => {
    if (activeTab === 'emperor' && !selectedMonth) {
      const months = getMonthOptions();
      setSelectedMonth(months[0].value);
      loadEmperorRankings(months[0].value);
    }
    if (activeTab === 'banners' && banners.length === 0) {
      loadBanners();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedMonth) {
      loadEmperorRankings(selectedMonth);
    }
  }, [selectedMonth]);

  if (loading || isStaff === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Verifying access...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-xl z-50 font-medium ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                HQ Command Center
              </h1>
              <p className="text-slate-500 text-sm">Staff Only</p>
            </div>
            <a href="/dashboard" className="text-slate-400 hover:text-white text-sm">
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-2 py-2">
            {[
              { id: 'players', label: '👤 Players', icon: '👤' },
              { id: 'emperor', label: '👑 Emperor', icon: '👑' },
              { id: 'banners', label: '🎨 Banners', icon: '🎨' },
              { id: 'events', label: '📅 Events', icon: '📅' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Players Tab */}
        {activeTab === 'players' && (
          <div className="space-y-6">
            {/* Search */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
                Search Player
              </h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchPlayer()}
                  placeholder="Enter Player ID (HYP-XXXXX) or name..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={searchPlayer}
                  disabled={searchLoading}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Player Result */}
            {playerDetails && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                {/* Player Header */}
                <div className="p-6 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{playerDetails.player.display_name}</h2>
                      <p className="text-cyan-400 font-mono">{playerDetails.player.player_id}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-cyan-400">
                        {playerDetails.totalXp.toLocaleString()}
                      </div>
                      <div className="text-slate-500 text-sm">Total XP</div>
                    </div>
                  </div>
                </div>

                {/* Game XP */}
                <div className="p-6 border-b border-slate-800">
                  <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
                    Game XP
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {playerDetails.gameXp.map(game => (
                      <div
                        key={game.game_id}
                        onClick={() => setSelectedGame(game.game_id)}
                        className={`p-4 rounded-lg cursor-pointer transition-all ${
                          selectedGame === game.game_id
                            ? 'bg-cyan-500/20 border-2 border-cyan-500'
                            : 'bg-slate-800 border-2 border-transparent hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{game.icon}</span>
                          <span className="font-medium">{game.game_name}</span>
                        </div>
                        <div className="text-cyan-400 font-bold">{game.xp.toLocaleString()} {game.xp_name}</div>
                        <div className="text-slate-500 text-sm">{game.rank}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* XP Management */}
                <div className="p-6 border-b border-slate-800">
                  <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
                    Add/Remove XP
                  </h3>
                  
                  {/* Game Selector */}
                  <div className="mb-4">
                    <label className="text-slate-400 text-sm mb-2 block">Game</label>
                    <select
                      value={selectedGame}
                      onChange={(e) => setSelectedGame(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                    >
                      {games.map(game => (
                        <option key={game.id} value={game.id}>
                          {game.icon} {game.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quick buttons */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[5, 10, 15, 20, 25, 30].map(amt => (
                      <button
                        key={amt}
                        onClick={() => addXp(amt)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium"
                      >
                        +{amt}
                      </button>
                    ))}
                    {[-5, -10, -25].map(amt => (
                      <button
                        key={amt}
                        onClick={() => addXp(amt)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>

                  {/* Custom amount */}
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={xpAmount}
                      onChange={(e) => setXpAmount(e.target.value)}
                      placeholder="Custom amount"
                      className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    <input
                      type="text"
                      value={xpReason}
                      onChange={(e) => setXpReason(e.target.value)}
                      placeholder="Reason (optional)"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      onClick={() => addXp()}
                      className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-medium hover:opacity-90"
                    >
                      Add XP
                    </button>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="p-6">
                  <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
                    Recent Activity
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {playerDetails.recentActivity.length > 0 ? (
                      playerDetails.recentActivity.map(activity => (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between p-3 bg-slate-800 rounded-lg"
                        >
                          <div>
                            <div className="text-white">{activity.description || 'XP adjustment'}</div>
                            <div className="text-slate-500 text-sm">
                              {activity.game_id} • {new Date(activity.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className={`font-bold ${activity.final_xp > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {activity.final_xp > 0 ? '+' : ''}{activity.final_xp}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 text-center py-4">No recent activity</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Emperor Tab */}
        {activeTab === 'emperor' && (
          <div className="space-y-6">
            {/* Month Selector */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">🏴‍☠️ One Piece Emperor Rankings</h2>
                  <p className="text-slate-500">Monthly bounty competition</p>
                </div>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  {getMonthOptions().map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Current Emperor */}
              <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
                  Current Leader
                </h3>
                {emperorLoading ? (
                  <div className="text-center py-8 text-slate-500">Loading...</div>
                ) : monthlyRankings.length > 0 ? (
                  <div className="text-center">
                    <div className="text-6xl mb-4">👑</div>
                    <div className="text-2xl font-bold">{monthlyRankings[0].display_name}</div>
                    <div className="text-cyan-400 font-bold text-xl">{monthlyRankings[0].berries.toLocaleString()} Berries</div>
                    <div className="text-slate-500">earned this month</div>
                    <button
                      onClick={crownEmperor}
                      className="mt-4 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg font-medium hover:opacity-90"
                    >
                      👑 Crown Emperor
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">🏴‍☠️</div>
                    <div className="text-slate-500">No One Piece activity this month</div>
                  </div>
                )}
              </div>

              {/* Rankings List */}
              <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
                  Monthly Rankings
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {monthlyRankings.map((player, index) => (
                    <div
                      key={player.player_id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        index === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-slate-800'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-slate-400 text-black' :
                        index === 2 ? 'bg-orange-600 text-white' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{player.display_name}</div>
                        <div className="text-slate-500 text-sm">{player.player_id}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-cyan-400 font-bold">{player.berries.toLocaleString()}</div>
                        <div className="text-slate-500 text-sm">this month</div>
                      </div>
                    </div>
                  ))}
                  {monthlyRankings.length === 0 && !emperorLoading && (
                    <div className="text-slate-500 text-center py-4">No rankings yet</div>
                  )}
                </div>
              </div>
            </div>

            {/* Hall of Fame */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
                🏆 Hall of Fame
              </h3>
              {hallOfFame.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {hallOfFame.map(emperor => (
                    <div
                      key={emperor.id}
                      className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-4 text-center"
                    >
                      <div className="text-slate-400 text-sm">{emperor.month}</div>
                      <div className="font-bold">{emperor.player_name}</div>
                      <div className="text-orange-400 font-bold">{emperor.bounty_display}</div>
                      <div className="text-slate-500 text-xs">+{emperor.monthly_xp?.toLocaleString()} that month</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🏆</div>
                  <div className="text-slate-500">No emperors crowned yet</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Banners Tab */}
        {activeTab === 'banners' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Home Page Banners</h2>
                <p className="text-slate-500">Manage the carousel on the dashboard</p>
              </div>
              <button
                onClick={() => setEditingBanner({
                  id: '',
                  title: '',
                  subtitle: '',
                  icon: '🎮',
                  color_from: '#8b5cf6',
                  color_to: '#ec4899',
                  badge: '',
                  is_active: true,
                  sort_order: banners.length,
                  starts_at: null,
                  ends_at: null,
                })}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-medium hover:opacity-90"
              >
                + New Banner
              </button>
            </div>

            {/* Banner List */}
            <div className="space-y-3">
              {banners.map(banner => (
                <div
                  key={banner.id}
                  className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
                >
                  <div
                    className="p-4"
                    style={{
                      background: `linear-gradient(135deg, ${banner.color_from}30, ${banner.color_to}30)`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{banner.icon}</span>
                        <div>
                          <div className="font-bold text-lg">{banner.title}</div>
                          <div className="text-slate-400">{banner.subtitle}</div>
                        </div>
                        {banner.badge && (
                          <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-bold">
                            {banner.badge}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          banner.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
                        }`}>
                          {banner.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => setEditingBanner(banner)}
                          className="p-2 hover:bg-white/10 rounded-lg"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteBanner(banner.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {banners.length === 0 && !bannerLoading && (
                <div className="bg-slate-900 rounded-xl p-8 border border-slate-800 text-center">
                  <div className="text-4xl mb-2">🎨</div>
                  <div className="text-slate-500">No banners yet. Create one!</div>
                </div>
              )}
            </div>

            {/* Banner Editor Modal */}
            {editingBanner && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-slate-900 rounded-xl w-full max-w-lg border border-slate-700">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold">{editingBanner.id ? 'Edit Banner' : 'New Banner'}</h3>
                    <button onClick={() => setEditingBanner(null)} className="text-slate-400">✕</button>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Preview */}
                    <div
                      className="p-4 rounded-xl"
                      style={{
                        background: `linear-gradient(135deg, ${editingBanner.color_from}, ${editingBanner.color_to})`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{editingBanner.icon}</span>
                        <div>
                          <div className="font-bold text-white">{editingBanner.title || 'Title'}</div>
                          <div className="text-white/80 text-sm">{editingBanner.subtitle || 'Subtitle'}</div>
                        </div>
                        {editingBanner.badge && (
                          <span className="ml-auto px-2 py-1 bg-white/20 rounded-full text-xs font-bold text-white">
                            {editingBanner.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-400 text-sm mb-1 block">Title</label>
                        <input
                          type="text"
                          value={editingBanner.title}
                          onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm mb-1 block">Subtitle</label>
                        <input
                          type="text"
                          value={editingBanner.subtitle}
                          onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm mb-1 block">Icon</label>
                        <input
                          type="text"
                          value={editingBanner.icon}
                          onChange={(e) => setEditingBanner({ ...editingBanner, icon: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm mb-1 block">Badge</label>
                        <input
                          type="text"
                          value={editingBanner.badge}
                          onChange={(e) => setEditingBanner({ ...editingBanner, badge: e.target.value })}
                          placeholder="e.g. LIVE SOON"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm mb-1 block">Color From</label>
                        <input
                          type="color"
                          value={editingBanner.color_from}
                          onChange={(e) => setEditingBanner({ ...editingBanner, color_from: e.target.value })}
                          className="w-full h-10 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm mb-1 block">Color To</label>
                        <input
                          type="color"
                          value={editingBanner.color_to}
                          onChange={(e) => setEditingBanner({ ...editingBanner, color_to: e.target.value })}
                          className="w-full h-10 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingBanner.is_active}
                          onChange={(e) => setEditingBanner({ ...editingBanner, is_active: e.target.checked })}
                          className="w-4 h-4 rounded"
                        />
                        <span>Active</span>
                      </label>
                    </div>
                  </div>
                  <div className="p-4 border-t border-slate-800 flex justify-end gap-3">
                    <button
                      onClick={() => setEditingBanner(null)}
                      className="px-4 py-2 text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveBanner(editingBanner)}
                      className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-medium hover:opacity-90"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-bold mb-2">Event Management</h2>
              <p className="text-slate-500 mb-4">
                Events sync from Google Calendar. Use the sync button on the Events page to pull updates.
              </p>
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="font-medium mb-2">📋 Calendar Format Guide</h3>
                <div className="text-slate-400 text-sm space-y-2">
                  <p><strong>Title:</strong> Include game name (One Piece, Gundam, MTG, etc.)</p>
                  <p><strong>Description:</strong> Add <code className="bg-slate-700 px-1 rounded">Price: $X</code> and <code className="bg-slate-700 px-1 rounded">Players: X</code></p>
                  <p><strong>Example:</strong></p>
                  <pre className="bg-slate-700 p-2 rounded mt-1">
{`Title: One Piece Monday Weekly
Description:
Price: $15
Players: 32
Come enjoy a night of One Piece!`}
                  </pre>
                </div>
              </div>
              <div className="mt-4">
                <a
                  href="/dashboard/events"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30"
                >
                  📅 Go to Events Page →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
