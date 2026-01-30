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

interface COTDCard {
  id?: string;
  variantId?: string | null;
  name: string;
  game: string;
  gameId: string;
  gameDisplay: string;
  set: string;
  number: string;
  rarity: string;
  printing?: string | null;
  condition?: string | null;
  language?: string;
  tcgplayerId: string;
  price: number | null;
  priceChange7d: number | null;
  priceChange30d: number | null;
}

interface ScheduledCard {
  id: string;
  featured_date: string;
  game_id: string;
  game_display: string;
  card_number: string;
  card_name: string;
  card_data: COTDCard;
  source: string;
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

  // Match recording state
  const [matches, setMatches] = useState<any[]>([]);
  const [recordingMatch, setRecordingMatch] = useState(false);
  const [matchWinner, setMatchWinner] = useState('');
  const [matchLoser, setMatchLoser] = useState('');
  const [matchType, setMatchType] = useState('');
  const [matchRound, setMatchRound] = useState(1);
  // Card of the Day state
  const [cotdSearchQuery, setCotdSearchQuery] = useState('');
  const [cotdSearchNumber, setCotdSearchNumber] = useState(''); // Card number filter
  const [cotdSearchGame, setCotdSearchGame] = useState('one-piece-card-game');
  const [cotdSearchResults, setCotdSearchResults] = useState<COTDCard[]>([]);
  const [cotdSearchLoading, setCotdSearchLoading] = useState(false);
  const [cotdSelectedCard, setCotdSelectedCard] = useState<COTDCard | null>(null);
  const [cotdSelectedDate, setCotdSelectedDate] = useState('');
  const [cotdUpcoming, setCotdUpcoming] = useState<ScheduledCard[]>([]);
  const [cotdSaving, setCotdSaving] = useState(false);
  // Voting pool state
  const [cotdVotingPools, setCotdVotingPools] = useState<Record<string, any[]>>({});
  const [cotdVotingDate, setCotdVotingDate] = useState('');
  const [cotdAddingToPool, setCotdAddingToPool] = useState(false);
  const [cotdFinalizingVote, setCotdFinalizingVote] = useState(false);


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

  // Load COTD data when tab changes
  useEffect(() => {
    if (activeTab === 'cotd') {
      loadUpcomingCOTD();
      loadVotingPools();
    }
  }, [activeTab]);

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
        
        // Also load matches for this event
        const matchRes = await fetch(`/api/hq/bounty-hunter/matches?event_id=${data.event.id}`);
        if (matchRes.ok) {
          const matchData = await matchRes.json();
          setMatches(matchData.matches || []);
        }
      } else {
        setBountyEvent(null);
        setBountyWanted([]);
        setBountyHunters([]);
        setMatches([]);
      }
    } catch (error) {
      console.error('Failed to load bounty data:', error);
    } finally {
      setBountyLoading(false);
    }
  };

  // Record a match
  const recordMatch = async () => {
    if (!bountyEvent || !matchWinner || !matchLoser || !matchType) {
      showToast('Please select winner, loser, and match type', 'error');
      return;
    }
    
    if (matchWinner === matchLoser) {
      showToast('Winner and loser cannot be the same', 'error');
      return;
    }
    
    setRecordingMatch(true);
    try {
      const res = await fetch('/api/hq/bounty-hunter/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: bountyEvent.id,
          winner_id: matchWinner,
          loser_id: matchLoser,
          match_type: matchType,
          round: matchRound,
        }),
      });
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        showToast(data.message || 'Match recorded!', 'success');
        // Reset form
        setMatchWinner('');
        setMatchLoser('');
        setMatchType('');
        // Reload matches
        loadBountyData();
      }
    } catch (error) {
      showToast('Failed to record match', 'error');
    } finally {
      setRecordingMatch(false);
    }
  };

  // Delete a match
  const deleteMatch = async (matchId: string) => {
    if (!confirm('Delete this match? XP will be reversed.')) return;
    
    try {
      const res = await fetch(`/api/hq/bounty-hunter/matches?id=${matchId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        showToast(data.message || 'Match deleted', 'success');
        loadBountyData();
      }
    } catch (error) {
      showToast('Failed to delete match', 'error');
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


  // ========== CARD OF THE DAY FUNCTIONS ==========
  
  const loadUpcomingCOTD = async () => {
    try {
      const res = await fetch('/api/hq/cotd?action=upcoming');
      const data = await res.json();
      setCotdUpcoming(data.cards || []);
    } catch (error) {
      console.error('Failed to load upcoming COTD:', error);
    }
  };

  const searchCOTDCards = async () => {
    if (!cotdSearchQuery.trim()) return;
    
    setCotdSearchLoading(true);
    setCotdSearchResults([]);
    
    try {
      // Build URL with optional number parameter
      let url = `/api/hq/cotd?action=search&q=${encodeURIComponent(cotdSearchQuery)}&game=${cotdSearchGame}`;
      if (cotdSearchNumber.trim()) {
        url += `&number=${encodeURIComponent(cotdSearchNumber.trim())}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        setCotdSearchResults(data.cards || []);
        if (data.cards?.length === 0) {
          showToast('No cards found', 'error');
        }
      }
    } catch (error) {
      showToast('Search failed', 'error');
    } finally {
      setCotdSearchLoading(false);
    }
  };

  const setCOTDCard = async () => {
    if (!cotdSelectedCard || !cotdSelectedDate) {
      showToast('Select a card and date', 'error');
      return;
    }
    
    setCotdSaving(true);
    
    try {
      const res = await fetch('/api/hq/cotd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set',
          card: cotdSelectedCard,
          date: cotdSelectedDate,
        }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        showToast(`Card set for ${cotdSelectedDate}!`, 'success');
        setCotdSelectedCard(null);
        setCotdSelectedDate('');
        setCotdSearchResults([]);
        setCotdSearchQuery('');
        loadUpcomingCOTD();
      }
    } catch (error) {
      showToast('Failed to set card', 'error');
    } finally {
      setCotdSaving(false);
    }
  };

  const deleteCOTDCard = async (date: string) => {
    if (!confirm(`Remove Card of the Day for ${date}?`)) return;
    
    try {
      const res = await fetch('/api/hq/cotd', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        showToast('Card removed', 'success');
        loadUpcomingCOTD();
      }
    } catch (error) {
      showToast('Failed to remove card', 'error');
    }
  };

  const formatCOTDPrice = (price: number | null) => {
    if (price === null) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  const getCOTDDateOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const value = date.toISOString().split('T')[0];
      const label = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      const isScheduled = cotdUpcoming.some(c => c.featured_date === value);
      options.push({ value, label, isScheduled });
    }
    return options;
  };

  // ========== VOTING POOL FUNCTIONS ==========

  const loadVotingPools = async () => {
    try {
      const res = await fetch('/api/hq/cotd?action=all_pools');
      const data = await res.json();
      setCotdVotingPools(data.pools || {});
    } catch (error) {
      console.error('Failed to load voting pools:', error);
    }
  };

  const addToVotingPool = async () => {
    if (!cotdSelectedCard || !cotdVotingDate) {
      showToast('Select a card and date', 'error');
      return;
    }
    
    setCotdAddingToPool(true);
    
    try {
      const res = await fetch('/api/hq/cotd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_to_pool',
          card: cotdSelectedCard,
          voteDate: cotdVotingDate,
        }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        showToast(`Added to voting pool for ${cotdVotingDate}!`, 'success');
        setCotdSelectedCard(null);
        setCotdSearchResults([]);
        setCotdSearchQuery('');
        loadVotingPools();
      }
    } catch (error) {
      showToast('Failed to add to pool', 'error');
    } finally {
      setCotdAddingToPool(false);
    }
  };

  const removeFromVotingPool = async (poolCardId: string) => {
    if (!confirm('Remove this card from the voting pool?')) return;
    
    try {
      const res = await fetch('/api/hq/cotd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_from_pool',
          poolCardId,
        }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        showToast('Removed from pool', 'success');
        loadVotingPools();
      }
    } catch (error) {
      showToast('Failed to remove', 'error');
    }
  };

  const finalizeVoting = async (voteDate: string) => {
    const pool = cotdVotingPools[voteDate] || [];
    const totalVotes = pool.reduce((sum: number, c: any) => sum + (c.votes_count || 0), 0);
    
    if (totalVotes === 0) {
      if (!confirm('No votes cast yet. Finalize anyway? The first card will win.')) return;
    } else {
      const winner = pool[0];
      if (!confirm(`Finalize voting? "${winner.card_name}" will win with ${winner.votes_count} votes.`)) return;
    }
    
    setCotdFinalizingVote(true);
    
    try {
      const res = await fetch('/api/hq/cotd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'finalize_voting',
          voteDate,
        }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        showToast(`🎉 ${data.winner.name} wins! ${data.winnersAwarded} players awarded +10 XP`, 'success');
        loadVotingPools();
        loadUpcomingCOTD();
      }
    } catch (error) {
      showToast('Failed to finalize', 'error');
    } finally {
      setCotdFinalizingVote(false);
    }
  };

  const getVotingDateOptions = () => {
    const options = [];
    const today = new Date();
    // Start from tomorrow (vote today for tomorrow's card)
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const value = date.toISOString().split('T')[0];
      const label = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      const hasPool = cotdVotingPools[value]?.length > 0;
      options.push({ value, label, hasPool });
    }
    return options;
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
              { id: 'cotd', label: '🃏 Card of Day', icon: '🃏' },
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

                {/* Match Recording - Only show when event is active */}
                {bountyEvent?.status === 'active' && (
                  <div className="bg-gradient-to-r from-orange-900/30 to-slate-900 rounded-xl p-6 border border-orange-500/30">
                    <h3 className="text-lg font-bold text-orange-400 mb-4">⚔️ Record Match Result</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Winner */}
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Winner</label>
                        <select
                          value={matchWinner}
                          onChange={(e) => setMatchWinner(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                        >
                          <option value="">Select winner...</option>
                          <optgroup label="🎯 WANTED">
                            {bountyWanted.map(p => (
                              <option key={p.player_id} value={p.player_id}>
                                {p.display_name} ({p.xp.toLocaleString()})
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="🏹 Hunters">
                            {bountyHunters.map(p => (
                              <option key={p.player_id} value={p.player_id}>
                                {p.display_name} ({p.xp.toLocaleString()})
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      {/* Loser */}
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Loser</label>
                        <select
                          value={matchLoser}
                          onChange={(e) => setMatchLoser(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                        >
                          <option value="">Select loser...</option>
                          <optgroup label="🎯 WANTED">
                            {bountyWanted.map(p => (
                              <option key={p.player_id} value={p.player_id}>
                                {p.display_name} ({p.xp.toLocaleString()})
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="🏹 Hunters">
                            {bountyHunters.map(p => (
                              <option key={p.player_id} value={p.player_id}>
                                {p.display_name} ({p.xp.toLocaleString()})
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Match Type */}
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Match Type</label>
                        <select
                          value={matchType}
                          onChange={(e) => setMatchType(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                        >
                          <option value="">Select type...</option>
                          <option value="hunter_upsets_wanted">🏹 Hunter upsets WANTED (+30/-25)</option>
                          <option value="wanted_defends">🎯 WANTED defends (+15/-20)</option>
                          <option value="hunter_vs_hunter">🏹 Hunter vs Hunter (+15/-15)</option>
                          <option value="wanted_vs_wanted">🎯 WANTED vs WANTED (+20/-20)</option>
                        </select>
                      </div>

                      {/* Round */}
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Round</label>
                        <select
                          value={matchRound}
                          onChange={(e) => setMatchRound(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                        >
                          <option value={1}>Round 1 (Bounty Round)</option>
                          <option value={2}>Round 2</option>
                          <option value={3}>Round 3</option>
                          <option value={4}>Round 4</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={recordMatch}
                      disabled={recordingMatch || !matchWinner || !matchLoser || !matchType}
                      className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {recordingMatch ? 'Recording...' : '⚔️ Record Match'}
                    </button>
                  </div>
                )}

                {/* Match History */}
                {matches.length > 0 && (
                  <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                    <h3 className="text-lg font-bold text-slate-300 mb-4">📜 Match History ({matches.length})</h3>
                    <div className="space-y-2 max-h-96 overflow-auto">
                      {matches.map((match: any) => (
                        <div key={match.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-green-400 font-medium">{match.winner_name}</span>
                              <span className="text-slate-500">defeated</span>
                              <span className="text-red-400 font-medium">{match.loser_name}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {match.match_type.replace(/_/g, ' ')} • Round {match.round}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-green-400 text-sm">+{match.winner_points}</div>
                            <div className="text-red-400 text-sm">{match.loser_points}</div>
                          </div>
                          <button
                            onClick={() => deleteMatch(match.id)}
                            className="text-slate-500 hover:text-red-400 p-1"
                            title="Delete match"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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


        {/* Card of the Day Tab */}
        {activeTab === 'cotd' && (
          <div className="space-y-6">
            {/* Search Section */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-bold mb-4">🃏 Set Card of the Day</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Game</label>
                  <select
                    value={cotdSearchGame}
                    onChange={(e) => setCotdSearchGame(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="one-piece-card-game">One Piece</option>
                    <option value="pokemon">Pokémon</option>
                    <option value="magic-the-gathering">Magic: The Gathering</option>
                    <option value="disney-lorcana">Disney Lorcana</option>
                    <option value="digimon-card-game">Digimon</option>
                    <option value="dragon-ball-super-fusion-world">Dragon Ball Super</option>
                    <option value="yugioh">Yu-Gi-Oh!</option>
                    <option value="star-wars-unlimited">Star Wars Unlimited</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Card Name</label>
                  <input
                    type="text"
                    value={cotdSearchQuery}
                    onChange={(e) => setCotdSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchCOTDCards()}
                    placeholder="e.g. Monkey.D.Luffy"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1">Card # <span className="text-slate-500">(optional)</span></label>
                  <input
                    type="text"
                    value={cotdSearchNumber}
                    onChange={(e) => setCotdSearchNumber(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchCOTDCards()}
                    placeholder="e.g. 012"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={searchCOTDCards}
                    disabled={cotdSearchLoading || !cotdSearchQuery.trim()}
                    className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 rounded-lg font-medium transition-colors"
                  >
                    {cotdSearchLoading ? 'Searching...' : '🔍 Search'}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-500 mt-2">💡 Tip: Add card number for precise results (API returns max 20)</p>

              {cotdSearchResults.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm text-slate-400 mb-2">Found {cotdSearchResults.length} card variants</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-auto">
                    {cotdSearchResults.map((card, idx) => (
                      <button
                        key={`${card.id}-${card.variantId || idx}`}
                        onClick={() => setCotdSelectedCard(card)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          cotdSelectedCard?.variantId === card.variantId && cotdSelectedCard?.id === card.id
                            ? 'bg-cyan-500/20 border-cyan-500'
                            : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <div className="font-medium text-sm truncate">{card.name}</div>
                        <div className="text-xs text-slate-400 mt-1">{card.set} • {card.rarity}</div>
                        {card.printing && card.printing !== 'Standard' && (
                          <div className="text-xs text-purple-400 mt-1 font-medium">✨ {card.printing}</div>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-slate-500">#{card.number}</span>
                          <span className="text-xs text-cyan-400 font-medium">{formatCOTDPrice(card.price)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {cotdSelectedCard && (
                <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-cyan-500/30">
                  <h3 className="text-sm text-cyan-400 mb-3">Selected Card</h3>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="text-lg font-bold">{cotdSelectedCard.name}</div>
                      <div className="text-slate-400 text-sm mt-1">
                        {cotdSelectedCard.set} • {cotdSelectedCard.rarity} • #{cotdSelectedCard.number}
                      </div>
                      {cotdSelectedCard.printing && cotdSelectedCard.printing !== 'Standard' && (
                        <div className="text-purple-400 text-sm mt-1 font-medium">
                          ✨ {cotdSelectedCard.printing}
                        </div>
                      )}
                      <div className="text-slate-300 mt-2">
                        Price: {formatCOTDPrice(cotdSelectedCard.price)}
                        {cotdSelectedCard.priceChange7d && (
                          <span className={`ml-2 text-sm ${cotdSelectedCard.priceChange7d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {cotdSelectedCard.priceChange7d >= 0 ? '+' : ''}{cotdSelectedCard.priceChange7d.toFixed(1)}% 7d
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setCotdSelectedCard(null)} className="text-slate-500 hover:text-red-400">✕</button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <label className="block text-sm text-slate-400 mb-2">Feature on Date</label>
                    <div className="flex flex-wrap gap-2">
                      {getCOTDDateOptions().map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setCotdSelectedDate(opt.value)}
                          disabled={opt.isScheduled}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            cotdSelectedDate === opt.value
                              ? 'bg-cyan-500 text-white'
                              : opt.isScheduled
                              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {opt.label}{opt.isScheduled && ' ✓'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={setCOTDCard}
                    disabled={cotdSaving || !cotdSelectedDate}
                    className="mt-4 w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {cotdSaving ? 'Saving...' : '✨ Set as Card of the Day'}
                  </button>
                </div>
              )}
            </div>

            {/* Upcoming Schedule */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h2 className="text-xl font-bold mb-4">📅 Upcoming Schedule</h2>
              
              {cotdUpcoming.length === 0 ? (
                <div className="text-slate-500 text-center py-8">
                  <div className="text-4xl mb-2">🃏</div>
                  <p>No cards scheduled yet</p>
                  <p className="text-sm mt-1">Search and select a card above to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cotdUpcoming.map(card => (
                    <div key={card.id} className="flex items-center gap-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
                      <div className="text-center min-w-[80px]">
                        <div className="text-xs text-slate-500 uppercase">
                          {new Date(card.featured_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className="text-lg font-bold">
                          {new Date(card.featured_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{card.card_name}</div>
                        <div className="text-sm text-slate-400">{card.game_display} • #{card.card_number}</div>
                        {card.card_data?.printing && card.card_data.printing !== 'Standard' && (
                          <div className="text-xs text-purple-400 mt-0.5">✨ {card.card_data.printing}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatCOTDPrice(card.card_data?.price)}</div>
                        <div className={`text-xs px-2 py-0.5 rounded ${
                          card.source === 'staff_pick' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-400'
                        }`}>
                          {card.source === 'staff_pick' ? '👤 Staff' : card.source === 'community_vote' ? '🗳️ Vote' : '🤖 Auto'}
                        </div>
                      </div>
                      <button onClick={() => deleteCOTDCard(card.featured_date)} className="text-slate-500 hover:text-red-400 p-2">🗑️</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Voting Pool Management */}
            <div className="bg-slate-900 rounded-xl p-6 border border-purple-500/30">
              <h2 className="text-xl font-bold mb-4">🗳️ Community Voting Pools</h2>
              <p className="text-slate-400 text-sm mb-4">
                Add 3-4 cards to a voting pool. Players vote and the winner becomes Card of the Day. Voters who pick the winner get <span className="text-cyan-400">+10 XP</span>!
              </p>

              {/* Add to Pool Section */}
              {cotdSelectedCard && (
                <div className="mb-6 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <h3 className="text-sm text-purple-400 mb-3">Add to Voting Pool</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1">
                      <div className="font-medium">{cotdSelectedCard.name}</div>
                      <div className="text-sm text-slate-400">
                        #{cotdSelectedCard.number}
                        {cotdSelectedCard.printing && cotdSelectedCard.printing !== 'Standard' && (
                          <span className="text-purple-400 ml-1">✨ {cotdSelectedCard.printing}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-cyan-400 font-medium">{formatCOTDPrice(cotdSelectedCard.price)}</div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <select
                      value={cotdVotingDate}
                      onChange={(e) => setCotdVotingDate(e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="">Select voting date...</option>
                      {getVotingDateOptions().map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} {opt.hasPool ? `(${cotdVotingPools[opt.value]?.length || 0} cards)` : '(empty)'}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={addToVotingPool}
                      disabled={cotdAddingToPool || !cotdVotingDate}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 rounded-lg font-medium text-sm"
                    >
                      {cotdAddingToPool ? 'Adding...' : '+ Add to Pool'}
                    </button>
                  </div>
                </div>
              )}

              {/* Existing Pools */}
              {Object.keys(cotdVotingPools).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(cotdVotingPools)
                    .filter(([date]) => date !== 'unscheduled')
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, cards]) => {
                      const totalVotes = cards.reduce((sum: number, c: any) => sum + (c.votes_count || 0), 0);
                      const dateObj = new Date(date + 'T12:00:00');
                      const isToday = date === new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const isTomorrow = date === tomorrow.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
                      
                      return (
                        <div key={date} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="font-medium">
                                {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </span>
                              {isTomorrow && <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">Voting Now</span>}
                              {isToday && <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Today</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-400">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
                              <button
                                onClick={() => finalizeVoting(date)}
                                disabled={cotdFinalizingVote || cards.length < 2}
                                className="px-3 py-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded text-sm font-medium"
                                title={cards.length < 2 ? 'Need at least 2 cards to vote' : 'Finalize voting and pick winner'}
                              >
                                {cotdFinalizingVote ? '...' : '✓ Finalize'}
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {cards.map((card: any) => (
                              <div key={card.id} className="flex items-center gap-3 p-2 bg-slate-900/50 rounded">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{card.card_name}</div>
                                  <div className="text-xs text-slate-400">
                                    {card.game_display} • #{card.card_number}
                                    {card.card_data?.printing && card.card_data.printing !== 'Standard' && (
                                      <span className="text-purple-400 ml-1">✨ {card.card_data.printing}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-cyan-400">{card.votes_count || 0} votes</div>
                                  {totalVotes > 0 && (
                                    <div className="text-xs text-slate-500">
                                      {Math.round((card.votes_count || 0) / totalVotes * 100)}%
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => removeFromVotingPool(card.id)}
                                  className="text-slate-500 hover:text-red-400 p-1"
                                >
                                  🗑️
                                </button>
                              </div>
                            ))}
                          </div>
                          
                          {cards.length < 2 && (
                            <p className="text-xs text-yellow-400 mt-2">⚠️ Add at least 2 cards to enable voting</p>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">
                  <div className="text-3xl mb-2">🗳️</div>
                  <p>No voting pools yet</p>
                  <p className="text-sm mt-1">Search for cards above, select one, then add it to a voting pool</p>
                </div>
              )}
            </div>

            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <h3 className="font-medium text-slate-300 mb-2">💡 How it works</h3>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• <strong>Staff Picks:</strong> Set a card directly for any date (overrides voting)</li>
                <li>• <strong>Community Voting:</strong> Add 3-4 cards to a pool, players vote, winner is featured</li>
                <li>• Players who vote for the winning card earn <span className="text-cyan-400">+10 XP</span></li>
                <li>• Voting for tomorrow&apos;s card happens today</li>
              </ul>
            </div>
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
