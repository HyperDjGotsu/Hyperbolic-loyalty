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
  favorite_games?: string[]; // Player's favorite game IDs
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
  twitch_url: string | null;
  youtube_url: string | null;
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

interface BountyHunterEvent {
  id: string;
  event_date: string;
  month_key: string;
  opt_in_opens_at: string;
  opt_in_closes_at: string;
  status: 'upcoming' | 'opt_in_open' | 'active' | 'completed';
  created_at: string;
}

interface BountyParticipant {
  id: string;
  player_id: string;
  display_name: string;
  role: 'wanted' | 'hunter';
  xp: number;
  rank?: number;
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
  const [gameFilter, setGameFilter] = useState('with_xp'); // 'all', 'with_xp', or specific game_id
  const [selectedTiles, setSelectedTiles] = useState<Array<{ label: string; xp: number }>>([]); // Multi-select XP tiles
  
  // Emperor state
  const [selectedMonth, setSelectedMonth] = useState('');
  const [monthlyRankings, setMonthlyRankings] = useState<EmperorRanking[]>([]);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>([]);
  const [emperorLoading, setEmperorLoading] = useState(false);
  
  // Banner state
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Bounty Hunter state
  const [bountyEvent, setBountyEvent] = useState<BountyHunterEvent | null>(null);
  const [bountyWanted, setBountyWanted] = useState<BountyParticipant[]>([]);
  const [bountyHunters, setBountyHunters] = useState<BountyParticipant[]>([]);
  const [bountyLoading, setBountyLoading] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState(false);
  const [newEventDate, setNewEventDate] = useState('');
  const [newOptInOpens, setNewOptInOpens] = useState('');
  const [newOptInCloses, setNewOptInCloses] = useState('');

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
        // Default to favorites if player has them, otherwise show games with XP
        if (data.player?.favorite_games?.length > 0) {
          setGameFilter('favorites');
        } else {
          setGameFilter('with_xp');
        }
      }
    } catch (error) {
      showToast('Search failed', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  // Filter games based on dropdown selection
  const getFilteredGames = (): GameXP[] => {
    if (!playerDetails) return [];
    
    if (gameFilter === 'all') {
      return playerDetails.gameXp;
    } else if (gameFilter === 'with_xp') {
      return playerDetails.gameXp.filter(g => g.xp > 0);
    } else if (gameFilter === 'favorites') {
      const favIds = playerDetails.player.favorite_games || [];
      return playerDetails.gameXp.filter(g => favIds.includes(g.game_id));
    } else {
      // Specific game selected
      return playerDetails.gameXp.filter(g => g.game_id === gameFilter);
    }
  };

  // Get count of favorites
  const getFavoritesCount = () => {
    return playerDetails?.player?.favorite_games?.length || 0;
  };

  // Toggle tile selection for multi-select
  const toggleTile = (label: string, xp: number) => {
    setSelectedTiles(prev => {
      const exists = prev.find(t => t.label === label);
      if (exists) {
        return prev.filter(t => t.label !== label);
      } else {
        return [...prev, { label, xp }];
      }
    });
  };

  // Check if a tile is selected
  const isTileSelected = (label: string) => {
    return selectedTiles.some(t => t.label === label);
  };

  // Get total XP from selected tiles
  const getSelectedTotal = () => {
    return selectedTiles.reduce((sum, t) => sum + t.xp, 0);
  };

  // Award all selected XP tiles
  const awardSelectedXp = async () => {
    if (!playerDetails || !selectedGame) return;
    
    const totalXp = getSelectedTotal();
    if (totalXp === 0 && selectedTiles.length === 0) {
      showToast('Select at least one XP tile', 'error');
      return;
    }
    
    // Build reason from selected tile labels
    const reason = selectedTiles.map(t => t.label).join(', ');
    
    try {
      const res = await fetch('/api/hq/xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: playerDetails.player.id,
          gameId: selectedGame,
          amount: totalXp,
          reason: reason,
        }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        // Check if bonus was awarded
        if (data.bonusAwarded) {
          showToast(`🏴 ${data.achievementName} unlocked! +${totalXp} XP + ${data.bonusXp} bonus!`, 'success');
        } else {
          showToast(`${totalXp > 0 ? '+' : ''}${totalXp} XP awarded! (${reason})`, 'success');
        }
        setSelectedTiles([]); // Clear selections
        // Refresh player data
        searchPlayer();
      }
    } catch (error) {
      showToast('Failed to add XP', 'error');
    }
  };

  // Add custom XP (positive or negative)
  const addCustomXp = async () => {
    if (!playerDetails || !selectedGame) return;
    
    const xp = parseInt(xpAmount);
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
          reason: xpReason || (xp > 0 ? 'Custom bonus' : 'Custom correction'),
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
    if (activeTab === 'bounty') {
      loadBountyData();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedMonth) {
      loadEmperorRankings(selectedMonth);
    }
  }, [selectedMonth]);

  // Load Bounty Hunter data
  const loadBountyData = async () => {
    setBountyLoading(true);
    try {
      const res = await fetch('/api/hq/bounty-hunter');
      const data = await res.json();
      
      if (data.event) {
        setBountyEvent(data.event);
        setBountyWanted(data.wanted || []);
        setBountyHunters(data.hunters || []);
      } else {
        setBountyEvent(null);
        setBountyWanted([]);
        setBountyHunters([]);
      }
    } catch (error) {
      console.error('Failed to load bounty data:', error);
    } finally {
      setBountyLoading(false);
    }
  };

  // Create Bounty Hunter Event
  const createBountyEvent = async () => {
    if (!newEventDate || !newOptInOpens || !newOptInCloses) {
      showToast('Please fill all fields', 'error');
      return;
    }
    
    setCreatingEvent(true);
    try {
      const res = await fetch('/api/hq/bounty-hunter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_date: newEventDate,
          opt_in_opens_at: newOptInOpens,
          opt_in_closes_at: newOptInCloses,
        }),
      });
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        showToast('Bounty Hunter event created!', 'success');
        setNewEventDate('');
        setNewOptInOpens('');
        setNewOptInCloses('');
        loadBountyData();
      }
    } catch (error) {
      showToast('Failed to create event', 'error');
    } finally {
      setCreatingEvent(false);
    }
  };

  // Update event status
  const updateEventStatus = async (status: string) => {
    if (!bountyEvent) return;
    
    try {
      const res = await fetch('/api/hq/bounty-hunter', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: bountyEvent.id,
          status,
        }),
      });
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        showToast(`Status updated to ${status}`, 'success');
        loadBountyData();
      }
    } catch (error) {
      showToast('Failed to update status', 'error');
    }
  };

  // Delete event
  const deleteBountyEvent = async () => {
    if (!bountyEvent) return;
    if (!confirm('Delete this Bounty Hunter event? This cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/hq/bounty-hunter?id=${bountyEvent.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        showToast('Event deleted', 'success');
        loadBountyData();
      }
    } catch (error) {
      showToast('Failed to delete event', 'error');
    }
  };

  // Start editing event - populate form fields
  const startEditingEvent = () => {
    if (!bountyEvent) return;
    setNewEventDate(bountyEvent.event_date);
    // Convert ISO dates to datetime-local format
    const opensDate = new Date(bountyEvent.opt_in_opens_at);
    const closesDate = new Date(bountyEvent.opt_in_closes_at);
    setNewOptInOpens(opensDate.toISOString().slice(0, 16));
    setNewOptInCloses(closesDate.toISOString().slice(0, 16));
    setEditingEvent(true);
  };

  // Save edited event
  const saveEditedEvent = async () => {
    if (!bountyEvent || !newEventDate || !newOptInOpens || !newOptInCloses) {
      showToast('Please fill all fields', 'error');
      return;
    }
    
    setCreatingEvent(true);
    try {
      const res = await fetch('/api/hq/bounty-hunter', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: bountyEvent.id,
          event_date: newEventDate,
          opt_in_opens_at: new Date(newOptInOpens).toISOString(),
          opt_in_closes_at: new Date(newOptInCloses).toISOString(),
        }),
      });
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        showToast('Event updated!', 'success');
        setEditingEvent(false);
        loadBountyData();
      }
    } catch (error) {
      showToast('Failed to update event', 'error');
    } finally {
      setCreatingEvent(false);
    }
  };

  // Cancel editing
  const cancelEditingEvent = () => {
    setEditingEvent(false);
    setNewEventDate('');
    setNewOptInOpens('');
    setNewOptInCloses('');
  };

  if (loading || isStaff === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Verifying access...</div>
      </div>
    );
  }

  const filteredGames = getFilteredGames();

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
              { id: 'bounty', label: '🎯 Bounty', icon: '🎯' },
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

                {/* Game XP Section - REDESIGNED */}
                <div className="p-6 border-b border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                      Game XP
                    </h3>
                    {/* Game Filter Dropdown */}
                    <select
                      value={gameFilter}
                      onChange={(e) => {
                        setGameFilter(e.target.value);
                        // If selecting a specific game, also set it as selectedGame for XP management
                        if (e.target.value !== 'all' && e.target.value !== 'with_xp' && e.target.value !== 'favorites') {
                          setSelectedGame(e.target.value);
                        }
                      }}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                    >
                      {getFavoritesCount() > 0 && (
                        <option value="favorites">⭐ Favorites ({getFavoritesCount()})</option>
                      )}
                      <option value="with_xp">Games with XP ({playerDetails.gameXp.filter(g => g.xp > 0).length})</option>
                      <option value="all">All Games ({playerDetails.gameXp.length})</option>
                      <optgroup label="Individual Games">
                        {playerDetails.gameXp.map(game => (
                          <option key={game.game_id} value={game.game_id}>
                            {game.icon} {game.game_name} ({game.xp.toLocaleString()})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  
                  {/* Game Tiles - Collapse to single when specific game selected */}
                  {gameFilter !== 'all' && gameFilter !== 'with_xp' && gameFilter !== 'favorites' ? (
                    // Single game selected - show expanded card
                    <div className="flex items-center gap-4">
                      {(() => {
                        const game = playerDetails.gameXp.find(g => g.game_id === gameFilter);
                        if (!game) return null;
                        return (
                          <div className="flex-1 p-5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-2 border-cyan-500">
                            <div className="flex items-center gap-4">
                              <span className="text-4xl">{game.icon}</span>
                              <div className="flex-1">
                                <div className="font-bold text-lg">{game.game_name}</div>
                                <div className="text-purple-400 text-sm">{game.rank}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-3xl font-bold text-cyan-400">
                                  {game.xp.toLocaleString()}
                                </div>
                                <div className="text-slate-400 text-sm">{game.xp_name}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      <button
                        onClick={() => setGameFilter(getFavoritesCount() > 0 ? 'favorites' : 'with_xp')}
                        className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-sm"
                      >
                        Show All
                      </button>
                    </div>
                  ) : (
                    // Multiple games - show grid
                    <>
                      {filteredGames.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {filteredGames.map(game => (
                            <div
                              key={game.game_id}
                              onClick={() => {
                                setSelectedGame(game.game_id);
                                setGameFilter(game.game_id); // Collapse to this game
                              }}
                              className={`p-4 rounded-xl cursor-pointer transition-all ${
                                selectedGame === game.game_id
                                  ? 'bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border-2 border-cyan-500 shadow-lg shadow-cyan-500/20'
                                  : game.xp > 0
                                    ? 'bg-slate-800 border-2 border-transparent hover:border-slate-600'
                                    : 'bg-slate-800/50 border-2 border-transparent hover:border-slate-700 opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{game.icon}</span>
                                <span className="font-medium text-sm truncate">{game.game_name}</span>
                              </div>
                              <div className={`text-xl font-bold ${game.xp > 0 ? 'text-cyan-400' : 'text-slate-500'}`}>
                                {game.xp.toLocaleString()}
                              </div>
                              <div className="text-slate-500 text-xs">{game.xp_name}</div>
                              {game.xp > 0 && (
                                <div className="mt-1 text-xs text-purple-400">{game.rank}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          No games match the current filter
                        </div>
                      )}
                      
                      {/* Quick stats when filter is active */}
                      {gameFilter === 'with_xp' && playerDetails.gameXp.filter(g => g.xp === 0).length > 0 && (
                        <p className="text-slate-500 text-xs mt-3">
                          +{playerDetails.gameXp.filter(g => g.xp === 0).length} more games with 0 XP • 
                          <button 
                            onClick={() => setGameFilter('all')}
                            className="text-cyan-400 hover:underline ml-1"
                          >
                            Show all
                          </button>
                        </p>
                      )}
                      {gameFilter === 'favorites' && (
                        <p className="text-slate-500 text-xs mt-3">
                          ⭐ Showing player&apos;s favorite games • 
                          <button 
                            onClick={() => setGameFilter('all')}
                            className="text-cyan-400 hover:underline ml-1"
                          >
                            Show all {playerDetails.gameXp.length} games
                          </button>
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* XP Management - Multi-select Tiles */}
                <div className="p-6 border-b border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                      Award XP
                    </h3>
                    {/* Game selector for XP */}
                    <select
                      value={selectedGame}
                      onChange={(e) => setSelectedGame(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                    >
                      {games.map(game => (
                        <option key={game.id} value={game.id}>
                          {game.icon} {game.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Event Entry */}
                  <div className="mb-4">
                    <div className="text-xs font-medium text-purple-400 uppercase tracking-wider mb-2">📅 Event Entry</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => toggleTile('Attended', 10)}
                        className={`flex flex-col items-center px-4 py-3 rounded-lg transition-all border-2 ${
                          isTileSelected('Attended')
                            ? 'bg-purple-500/20 border-purple-500 text-white'
                            : 'bg-slate-800 border-slate-700 hover:border-purple-500 hover:bg-purple-500/10'
                        }`}
                      >
                        <span className="font-medium">Attended</span>
                        <span className="text-xs text-purple-400">+10 XP</span>
                      </button>
                    </div>
                  </div>

                  {/* Match Wins */}
                  <div className="mb-4">
                    <div className="text-xs font-medium text-green-400 uppercase tracking-wider mb-2">🏆 Match Wins</div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: '1 Win', xp: 10 },
                        { label: '2 Wins', xp: 20 },
                        { label: '3 Wins', xp: 30 },
                        { label: '4 Wins', xp: 40 },
                        { label: 'Undefeated', xp: 10 },
                      ].map(item => (
                        <button
                          key={item.label}
                          onClick={() => toggleTile(item.label, item.xp)}
                          className={`flex flex-col items-center px-4 py-3 rounded-lg transition-all border-2 ${
                            isTileSelected(item.label)
                              ? 'bg-green-500/20 border-green-500 text-white'
                              : 'bg-slate-800 border-slate-700 hover:border-green-500 hover:bg-green-500/10'
                          }`}
                        >
                          <span className="font-medium">{item.label}</span>
                          <span className="text-xs text-green-400">+{item.xp} XP</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Community */}
                  <div className="mb-4">
                    <div className="text-xs font-medium text-orange-400 uppercase tracking-wider mb-2">👥 Community</div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'First Timer', xp: 25 },
                        { label: 'Returner', xp: 25 },
                        { label: 'Signed Up', xp: 50 },
                        { label: 'Taught Player', xp: 20 },
                      ].map(item => (
                        <button
                          key={item.label}
                          onClick={() => toggleTile(item.label, item.xp)}
                          className={`flex flex-col items-center px-4 py-3 rounded-lg transition-all border-2 ${
                            isTileSelected(item.label)
                              ? 'bg-orange-500/20 border-orange-500 text-white'
                              : 'bg-slate-800 border-slate-700 hover:border-orange-500 hover:bg-orange-500/10'
                          }`}
                        >
                          <span className="font-medium">{item.label}</span>
                          <span className="text-xs text-orange-400">+{item.xp} XP</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Summary & Award Button */}
                  {selectedTiles.length > 0 && (
                    <div className="mb-4 p-4 bg-slate-800 rounded-xl border border-cyan-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-slate-400">Selected:</div>
                        <button
                          onClick={() => setSelectedTiles([])}
                          className="text-xs text-slate-500 hover:text-white"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {selectedTiles.map(tile => (
                          <span
                            key={tile.label}
                            className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-sm"
                          >
                            {tile.label} (+{tile.xp})
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-cyan-400">
                          Total: +{getSelectedTotal()} XP
                        </div>
                        <button
                          onClick={awardSelectedXp}
                          className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg font-bold text-white hover:opacity-90"
                        >
                          ⚡ Award XP
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Custom Award/Remove */}
                  <div>
                    <div className="text-xs font-medium text-cyan-400 uppercase tracking-wider mb-2">✨ Custom (+ or -)</div>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        value={xpAmount}
                        onChange={(e) => setXpAmount(e.target.value)}
                        placeholder="+/- XP"
                        className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-center"
                      />
                      <input
                        type="text"
                        value={xpReason}
                        onChange={(e) => setXpReason(e.target.value)}
                        placeholder="Reason (e.g., Prize payout, Correction)"
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={addCustomXp}
                        className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-medium hover:opacity-90"
                      >
                        Apply
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Use negative numbers to remove XP (e.g., -25)</p>
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
                  Monthly Rankings
                </h3>
                {emperorLoading ? (
                  <div className="text-center py-8 text-slate-500">Loading...</div>
                ) : monthlyRankings.length > 0 ? (
                  <div className="space-y-3">
                    {monthlyRankings.slice(0, 10).map((player, index) => (
                      <div
                        key={player.player_id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? 'bg-yellow-500 text-black' :
                            index === 1 ? 'bg-slate-400 text-black' :
                            index === 2 ? 'bg-amber-600 text-black' :
                            'bg-slate-700'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{player.display_name}</div>
                            <div className="text-slate-500 text-sm">{player.bounty}</div>
                          </div>
                        </div>
                        <div className="text-cyan-400 font-bold">
                          {player.berries.toLocaleString()}
                        </div>
                      </div>
                    ))}
                    
                    {/* Crown button */}
                    <button
                      onClick={crownEmperor}
                      className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-lg font-bold text-black hover:opacity-90"
                    >
                      👑 Crown {monthlyRankings[0]?.display_name} as Emperor
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No rankings for this month
                  </div>
                )}
              </div>

              {/* Hall of Fame */}
              <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
                  Hall of Fame
                </h3>
                {hallOfFame.length > 0 ? (
                  <div className="space-y-3">
                    {hallOfFame.map((emperor) => (
                      <div
                        key={emperor.id}
                        className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-lg border border-purple-500/20"
                      >
                        <div>
                          <div className="font-medium">👑 {emperor.player_name}</div>
                          <div className="text-slate-500 text-sm">{emperor.month}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-cyan-400 font-bold">{emperor.bounty_display}</div>
                          <div className="text-slate-500 text-xs">+{emperor.monthly_xp.toLocaleString()} that month</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No emperors crowned yet
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Banners Tab */}
        {activeTab === 'banners' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Banner Management</h2>
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
                  twitch_url: null,
                  youtube_url: null,
                })}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-medium hover:opacity-90"
              >
                + New Banner
              </button>
            </div>

            {bannerLoading ? (
              <div className="text-center py-8 text-slate-500">Loading banners...</div>
            ) : (
              <div className="grid gap-4">
                {banners.map(banner => (
                  <div
                    key={banner.id}
                    className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
                  >
                    <div
                      className="p-4"
                      style={{
                        background: `linear-gradient(135deg, ${banner.color_from}, ${banner.color_to})`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{banner.icon}</span>
                        <div className="flex-1">
                          <div className="font-bold text-white">{banner.title}</div>
                          <div className="text-white/80 text-sm">{banner.subtitle}</div>
                        </div>
                        {banner.badge && (
                          <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-bold text-white">
                            {banner.badge}
                          </span>
                        )}
                        {(banner.twitch_url || banner.youtube_url) && (
                          <div className="flex gap-1">
                            {banner.twitch_url && <span className="text-white">📺</span>}
                            {banner.youtube_url && <span className="text-white">▶️</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-3 flex items-center justify-between bg-slate-800/50">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${banner.is_active ? 'bg-green-500' : 'bg-slate-500'}`}></span>
                        <span className="text-slate-400 text-sm">
                          {banner.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingBanner(banner)}
                          className="px-3 py-1 text-cyan-400 hover:bg-cyan-500/20 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteBanner(banner.id)}
                          className="px-3 py-1 text-red-400 hover:bg-red-500/20 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Banner Editor Modal */}
            {editingBanner && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-slate-900 rounded-xl border border-slate-800 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-4 border-b border-slate-800">
                    <h3 className="text-lg font-bold">
                      {editingBanner.id ? 'Edit Banner' : 'New Banner'}
                    </h3>
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
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-left flex items-center justify-between"
                          >
                            <span className="text-2xl">{editingBanner.icon || '🎮'}</span>
                            <span className="text-slate-500 text-sm">Click to change</span>
                          </button>
                          {showEmojiPicker && (
                            <div className="absolute top-full left-0 mt-2 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 w-64">
                              <div className="grid grid-cols-8 gap-1">
                                {['🎮', '🎲', '🎯', '🏆', '👑', '⭐', '🔥', '⚡',
                                  '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎸', '🎹',
                                  '🏴‍☠️', '⚔️', '🛡️', '🗡️', '🎴', '🃏', '♠️', '♦️',
                                  '🤖', '👾', '🦊', '🐉', '🦁', '🦅', '🐺', '🦖',
                                  '✨', '💎', '💰', '🎁', '🎟️', '🎫', '📦', '🛒',
                                  '🚀', '💫', '🌟', '⚡', '❄️', '🔮', '🪄', '✨'].map(emoji => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                      setEditingBanner(prev => prev ? { ...prev, icon: emoji } : prev);
                                      setShowEmojiPicker(false);
                                    }}
                                    className="text-2xl hover:bg-slate-700 rounded p-1 transition-colors"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
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

                    {/* Stream URLs */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-400 text-sm mb-1 block">📺 Twitch URL</label>
                        <input
                          type="url"
                          value={editingBanner.twitch_url || ''}
                          onChange={(e) => setEditingBanner({ ...editingBanner, twitch_url: e.target.value || null })}
                          placeholder="https://twitch.tv/..."
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm mb-1 block">▶️ YouTube URL</label>
                        <input
                          type="url"
                          value={editingBanner.youtube_url || ''}
                          onChange={(e) => setEditingBanner({ ...editingBanner, youtube_url: e.target.value || null })}
                          placeholder="https://youtube.com/..."
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
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

        {/* Bounty Hunter Tab */}
        {activeTab === 'bounty' && (
          <div className="space-y-6">
            {bountyLoading ? (
              <div className="text-center py-12 text-slate-400">Loading...</div>
            ) : bountyEvent ? (
              <>
                {/* Current Event */}
                <div className="bg-gradient-to-r from-red-900/30 to-slate-900 rounded-xl p-6 border border-red-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-red-400">🎯 Current Bounty Hunter Event</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      bountyEvent.status === 'opt_in_open' ? 'bg-green-500/20 text-green-400' :
                      bountyEvent.status === 'active' ? 'bg-orange-500/20 text-orange-400' :
                      bountyEvent.status === 'completed' ? 'bg-slate-500/20 text-slate-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {bountyEvent.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  {editingEvent ? (
                    /* Edit Form */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm text-slate-400 mb-1">Event Date</label>
                          <input
                            type="date"
                            value={newEventDate}
                            onChange={(e) => setNewEventDate(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-1">Opt-In Opens</label>
                          <input
                            type="datetime-local"
                            value={newOptInOpens}
                            onChange={(e) => setNewOptInOpens(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-1">Opt-In Closes</label>
                          <input
                            type="datetime-local"
                            value={newOptInCloses}
                            onChange={(e) => setNewOptInCloses(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={saveEditedEvent}
                          disabled={creatingEvent}
                          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                        >
                          {creatingEvent ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={cancelEditingEvent}
                          className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display View */
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs">Event Date</div>
                          <div className="text-white font-medium">{bountyEvent.event_date}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs">Month</div>
                          <div className="text-white font-medium">{bountyEvent.month_key}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs">Opt-In Opens</div>
                          <div className="text-white font-medium text-sm">{new Date(bountyEvent.opt_in_opens_at).toLocaleDateString()}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs">Opt-In Closes</div>
                          <div className="text-white font-medium text-sm">{new Date(bountyEvent.opt_in_closes_at).toLocaleDateString()}</div>
                        </div>
                      </div>

                      {/* Status Controls */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="text-slate-400 text-sm mr-2">Change Status:</span>
                        {['upcoming', 'opt_in_open', 'active', 'completed'].map(status => (
                          <button
                            key={status}
                            onClick={() => updateEventStatus(status)}
                            disabled={bountyEvent.status === status}
                            className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                              bountyEvent.status === status
                                ? 'bg-cyan-500 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            {status.replace('_', ' ')}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-4">
                        <button
                          onClick={startEditingEvent}
                          className="text-cyan-400 hover:text-cyan-300 text-sm"
                        >
                          ✏️ Edit Event
                        </button>
                        <button
                          onClick={deleteBountyEvent}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          🗑️ Delete Event
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* WANTED List */}
                <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                  <h3 className="text-lg font-bold text-red-400 mb-4">🏴‍☠️ WANTED (Top 5 Auto-Added)</h3>
                  {bountyWanted.length > 0 ? (
                    <div className="space-y-2">
                      {bountyWanted.map((player, i) => (
                        <div key={player.player_id} className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                          <span className="text-red-400 font-bold w-8">#{i + 1}</span>
                          <span className="text-white flex-1">{player.display_name}</span>
                          <span className="text-red-400">{player.xp.toLocaleString()} Berries</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">No WANTED players yet (Top 5 One Piece leaderboard)</p>
                  )}
                </div>

                {/* Hunters List */}
                <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                  <h3 className="text-lg font-bold text-green-400 mb-4">🏹 Registered Hunters ({bountyHunters.length})</h3>
                  {bountyHunters.length > 0 ? (
                    <div className="grid gap-2">
                      {bountyHunters.map(hunter => (
                        <div key={hunter.player_id} className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                          <span className="text-green-400">🏹</span>
                          <span className="text-white flex-1">{hunter.display_name}</span>
                          <span className="text-slate-400">{hunter.xp.toLocaleString()} Berries</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">No hunters registered yet</p>
                  )}
                </div>
              </>
            ) : (
              /* No Current Event - Create New */
              <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                <h2 className="text-xl font-bold mb-4">🎯 Create Bounty Hunter Event</h2>
                <p className="text-slate-400 mb-6">No event scheduled for this month. Create one below.</p>
                
                <div className="grid gap-4 max-w-md">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Event Date</label>
                    <input
                      type="date"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Opt-In Opens</label>
                    <input
                      type="datetime-local"
                      value={newOptInOpens}
                      onChange={(e) => setNewOptInOpens(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Opt-In Closes</label>
                    <input
                      type="datetime-local"
                      value={newOptInCloses}
                      onChange={(e) => setNewOptInCloses(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <button
                    onClick={createBountyEvent}
                    disabled={creatingEvent}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {creatingEvent ? 'Creating...' : '🎯 Create Event'}
                  </button>
                </div>

                <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
                  <h4 className="font-medium text-slate-300 mb-2">💡 How it works</h4>
                  <ul className="text-sm text-slate-400 space-y-1">
                    <li>• Top 5 One Piece players are auto-WANTED (can&apos;t opt out)</li>
                    <li>• Other players can opt-in as Hunters during the opt-in window</li>
                    <li>• On event night, Hunters try to claim WANTED bounties</li>
                    <li>• Point stakes apply to Round 1 bounty matches</li>
                  </ul>
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
