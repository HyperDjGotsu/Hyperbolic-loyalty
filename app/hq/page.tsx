'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

// ── Icon Picker ────────────────────────────────────────────────────────────────

const ICON_GROUPS = [
  {
    label: 'Currency & Value',
    icons: ['🪙','💰','💎','💵','💴','💶','💷','💸','🏅','🥇','🥈','🥉','🎖️','🏆'],
  },
  {
    label: 'Stars & Magic',
    icons: ['⭐','🌟','💫','✨','🔮','🪄','🔆','☀️','🌙','🌠','💜','🌀','💠','🔷'],
  },
  {
    label: 'Games & Cards',
    icons: ['🎮','🕹️','🎲','🃏','🎯','🎳','♟️','🎭','🎪','🎰','🀄','🎴'],
  },
  {
    label: 'Power & Elements',
    icons: ['⚡','🔥','💧','🌿','❄️','⚗️','🧪','🌀','💥','🌊','🌪️','🌋'],
  },
  {
    label: 'Combat & Adventure',
    icons: ['⚔️','🛡️','🗡️','🏹','🔱','⚜️','🧨','🔑','💡','🗝️','🧿','🪬'],
  },
  {
    label: 'Celebration',
    icons: ['🎉','🎊','🎈','🎁','🎀','🎗️','🥂','🍾','👑','🌈','🍀','🦋'],
  },
  {
    label: 'Creatures',
    icons: ['🐉','🦁','🐺','🦊','🐲','🦄','🦅','🦋','🐾','🔯','🌟','⚡'],
  },
];

function IconRenderer({ value, className }: { value: string; className?: string }) {
  if (value.startsWith('http')) {
    return <img src={value} alt="icon" className={className || 'w-6 h-6 object-contain'} />;
  }
  return <span className={className}>{value}</span>;
}

function IconPicker({
  current,
  onSelect,
  onClose,
}: {
  current: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'emoji' | 'upload'>('emoji');
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
    setUploadError('');
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      const res = await fetch('/api/hq/upload-icon', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onSelect(data.url);
      onClose();
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      ref={ref}
      className="absolute z-50 left-0 top-full mt-2 w-80 bg-surface border border-border-token rounded-xl shadow-xl overflow-hidden"
    >
      {/* Tabs */}
      <div className="flex border-b border-border-token">
        {(['emoji', 'upload'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 text-xs font-medium py-2.5 transition-colors ${
              tab === t ? 'text-accent border-b-2 border-accent' : 'text-secondary'
            }`}
          >
            {t === 'emoji' ? '😊 Emoji' : '📤 Upload Image'}
          </button>
        ))}
      </div>

      {tab === 'emoji' && (
        <div className="max-h-72 overflow-y-auto p-3 space-y-3">
          {ICON_GROUPS.map(group => (
            <div key={group.label}>
              <div className="text-[10px] text-tertiary uppercase tracking-wide mb-1.5">{group.label}</div>
              <div className="flex flex-wrap gap-1">
                {group.icons.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => { onSelect(icon); onClose(); }}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all hover:bg-elevated hover:scale-110 ${
                      current === icon ? 'bg-accent/20 ring-1 ring-accent' : ''
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'upload' && (
        <div className="p-4 space-y-3">
          <p className="text-xs text-tertiary">PNG, JPG, WebP, SVG — max 500 KB. Will replace emoji with your image.</p>
          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border-token rounded-xl cursor-pointer hover:border-accent transition-colors bg-elevated/30">
            {uploadPreview ? (
              <img src={uploadPreview} alt="preview" className="h-20 w-20 object-contain rounded-lg" />
            ) : (
              <>
                <span className="text-3xl mb-1">📤</span>
                <span className="text-xs text-secondary">Click to choose file</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </label>
          {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
          <button
            type="button"
            onClick={handleUpload}
            disabled={!uploadFile || uploading}
            className="w-full bg-accent text-accent-fg text-sm font-medium py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {uploading ? 'Uploading…' : 'Upload & Use'}
          </button>
        </div>
      )}
    </div>
  );
}

interface Player {
  id: string;
  player_id: string;
  display_name: string;
  email: string;
  is_staff: boolean;
  created_at: string;
  favorite_games?: string[];
  pass_tier: string | null;
  pass_status: string | null;
  pass_expires_at: string | null;
  pass_started_at: string | null;
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

interface HQEvent {
  id: string;
  name: string;
  game_id: string | null;
  scheduled_at: string;
  status: string;
  attendance_xp: number;
  game?: { name: string; icon: string } | null;
  attendanceCount?: number;
}

interface HQShopItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  rarity: string;
  asset_data: Record<string, string>;
  is_default: boolean;
  active: boolean;
  created_at: string;
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
  const [dangerAction, setDangerAction] = useState<null | 'suspend' | 'delete'>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [dangerLoading, setDangerLoading] = useState(false);
  const [assignPassOpen, setAssignPassOpen] = useState(false);
  const [assignPassTier, setAssignPassTier] = useState<'player' | 'none'>('player');
  const [assignPassExpiry, setAssignPassExpiry] = useState('');
  const [assigningPass, setAssigningPass] = useState(false);
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

  // Event management state
  const [hqEvents, setHqEvents] = useState<HQEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [activatingEventId, setActivatingEventId] = useState<string | null>(null);

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

  // Shop management state
  const [shopItems, setShopItems] = useState<HQShopItem[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopSaving, setShopSaving] = useState(false);
  const [shopCategoryFilter, setShopCategoryFilter] = useState('all');
  const [shopForm, setShopForm] = useState({
    name: '',
    description: '',
    category: 'base',
    price: '',
    rarity: 'common',
    asset_emoji: '',
    asset_color: '#6366f1',
    asset_frame: 'silver',
    asset_title: '',
  });
  const [shopFormOpen, setShopFormOpen] = useState(false);
  const [shopDeleteConfirm, setShopDeleteConfirm] = useState<string | null>(null);

  // Store settings state
  const [storeConfig, setStoreConfig] = useState({
    currency_name: 'Points',
    currency_icon: '⭐',
    store_name: 'Hyperbolic XP',
    shop_title: 'Prize Wall',
    shop_description: 'avatar cosmetics',
    player_id_prefix: 'HYP',
    shop_categories: [
      { id: 'base', name: 'Base', icon: '😎', enabled: true },
      { id: 'background', name: 'Background', icon: '🎨', enabled: true },
      { id: 'frame', name: 'Frame', icon: '✨', enabled: true },
      { id: 'badge', name: 'Badge', icon: '🏷️', enabled: true },
      { id: 'title', name: 'Title', icon: '📛', enabled: true },
    ] as Array<{ id: string; name: string; icon: string; enabled: boolean }>,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  // null = closed, 'currency' = currency icon, number = category index
  const [iconPickerTarget, setIconPickerTarget] = useState<null | 'currency' | number>(null);

  // Circuit state
  const [circuitStores, setCircuitStores] = useState<Array<{ id: string; name: string; city: string; color: string; player_id_prefix: string }>>([]);
  const [circuitQualifiers, setCircuitQualifiers] = useState<any[]>([]);
  const [circuitLoading, setCircuitLoading] = useState(false);
  const [circuitCreating, setCircuitCreating] = useState(false);
  const [circuitEventForm, setCircuitEventForm] = useState({
    name: 'GGC Circuit Qualifier',
    store_id: '',
    game_id: '',
    scheduled_at: '',
    max_players: '32',
    entry_fee: '15',
    attendance_xp: '30',
    event_type: 'circuit_qualifier' as 'circuit_qualifier' | 'championship',
  });
  const [qualifierEventId, setQualifierEventId] = useState('');
  const [standings, setStandings] = useState<Array<{ player_id: string; display_name: string; player_display_id: string; placement: number }>>([]);
  const [standingsSearch, setStandingsSearch] = useState('');
  const [standingsSearchResults, setStandingsSearchResults] = useState<any[]>([]);
  const [standingsSearching, setStandingsSearching] = useState(false);
  const [savingQualifiers, setSavingQualifiers] = useState(false);
  const [qualifyCount, setQualifyCount] = useState(5);

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
    if (activeTab === 'events') {
      loadHQEvents();
    }
    if (activeTab === 'circuit') {
      loadCircuitData();
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

  const loadCircuitData = async () => {
    setCircuitLoading(true);
    try {
      const [storesRes, qualRes] = await Promise.all([
        fetch('/api/circuit/stores?org=ggc'),
        fetch('/api/circuit/qualifiers'),
      ]);
      const storesData = await storesRes.json();
      const qualData = await qualRes.json();
      setCircuitStores(storesData.stores || []);
      setCircuitQualifiers(qualData.qualifiers || []);
    } catch (e) {
      console.error('Circuit load error:', e);
    } finally {
      setCircuitLoading(false);
    }
  };

  const createCircuitEvent = async () => {
    if (!circuitEventForm.name || !circuitEventForm.scheduled_at || !circuitEventForm.store_id) return;
    setCircuitCreating(true);
    try {
      const res = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: circuitEventForm.name,
          event_type: circuitEventForm.event_type,
          store_id: circuitEventForm.store_id,
          game_id: circuitEventForm.game_id || null,
          scheduled_at: new Date(circuitEventForm.scheduled_at).toISOString(),
          max_players: parseInt(circuitEventForm.max_players) || null,
          entry_fee: parseFloat(circuitEventForm.entry_fee) || null,
          attendance_xp: parseInt(circuitEventForm.attendance_xp) || 30,
        }),
      });
      const data = await res.json();
      if (data.event) {
        showToast('Event created! Use Events tab to activate it.', 'success');
        setQualifierEventId(data.event.id);
      } else {
        showToast('Failed to create event', 'error');
      }
    } catch {
      showToast('Error creating event', 'error');
    } finally {
      setCircuitCreating(false);
    }
  };

  const searchForStandings = async (query: string) => {
    if (query.length < 2) { setStandingsSearchResults([]); return; }
    setStandingsSearching(true);
    try {
      const res = await fetch(`/api/hq/players?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setStandingsSearchResults(data.players || []);
    } catch { /* ignore */ } finally {
      setStandingsSearching(false);
    }
  };

  const addToStandings = (player: any) => {
    if (standings.find(s => s.player_id === player.id)) return;
    const next = [...standings, {
      player_id: player.id,
      display_name: player.display_name,
      player_display_id: player.player_id,
      placement: standings.length + 1,
    }];
    setStandings(next);
    setStandingsSearch('');
    setStandingsSearchResults([]);
  };

  const saveQualifiers = async () => {
    if (!qualifierEventId || standings.length === 0) return;
    const store = circuitStores.find(s => s.id === circuitEventForm.store_id);
    if (!store) { showToast('Select a store first', 'error'); return; }
    setSavingQualifiers(true);
    try {
      const res = await fetch('/api/circuit/qualifiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qualifier_event_id: qualifierEventId,
          store_id: store.id,
          qualify_count: qualifyCount,
          standings: standings.map(s => ({ player_id: s.player_id, placement: s.placement })),
        }),
      });
      const data = await res.json();
      if (data.qualifiers) {
        showToast(`${data.count} player${data.count !== 1 ? 's' : ''} qualified for the championship!`, 'success');
        setStandings([]);
        setQualifierEventId('');
        loadCircuitData();
      } else {
        showToast('Failed to save qualifiers', 'error');
      }
    } catch {
      showToast('Error saving qualifiers', 'error');
    } finally {
      setSavingQualifiers(false);
    }
  };

  const loadHQEvents = async () => {
    setEventsLoading(true);
    try {
      // Load upcoming + active events for the next 48 hours
      const [eventsRes, activeRes] = await Promise.all([
        fetch('/api/events?status=upcoming&limit=20'),
        fetch('/api/events/active'),
      ]);
      const eventsData = await eventsRes.json();
      const activeData = await activeRes.json();

      const events: HQEvent[] = (eventsData.events || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        game_id: e.game?.id || null,
        scheduled_at: e.scheduledAt,
        status: e.status,
        attendance_xp: e.attendanceXp || 20,
        game: e.game ? { name: e.game.name, icon: e.game.icon } : null,
      }));

      // Also include any active event that may not appear in "upcoming"
      if (activeData.event) {
        const activeId = activeData.event.id;
        const exists = events.find(e => e.id === activeId);
        if (!exists) {
          events.unshift({
            id: activeData.event.id,
            name: activeData.event.name,
            game_id: activeData.event.gameId,
            scheduled_at: activeData.event.scheduledAt,
            status: 'active',
            attendance_xp: activeData.event.attendanceXp,
            game: activeData.event.game,
            attendanceCount: activeData.event.attendanceCount,
          });
        } else {
          exists.status = 'active';
          exists.attendanceCount = activeData.event.attendanceCount;
        }
      }

      setHqEvents(events);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setEventsLoading(false);
    }
  };

  const activateEvent = async (eventId: string, action: 'start' | 'end') => {
    setActivatingEventId(eventId);
    try {
      const res = await fetch(`/api/events/${eventId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(action === 'start' ? 'Event started!' : 'Event ended', 'success');
        loadHQEvents();
      } else {
        showToast(data.error || 'Failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setActivatingEventId(null);
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
    if (activeTab === 'shop') {
      loadShopItems();
    }
    if (activeTab === 'settings') {
      loadStoreConfig();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedMonth) {
      loadEmperorRankings(selectedMonth);
    }
  }, [selectedMonth]);

  // Store settings functions
  const loadStoreConfig = async () => {
    try {
      const res = await fetch(`/api/store-config?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setStoreConfig(prev => ({ ...prev, ...data, shop_categories: data.shop_categories ?? prev.shop_categories }));
      }
    } catch { /* use defaults */ }
  };

  const saveStoreConfig = async () => {
    setSettingsSaving(true);
    try {
      const res = await fetch('/api/hq/store-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeConfig),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showToast('Settings saved', 'success');
    } catch {
      showToast('Failed to save settings', 'error');
    } finally {
      setSettingsSaving(false);
    }
  };

  // Assign / remove pass
  const assignPass = async () => {
    if (!playerDetails) return;
    setAssigningPass(true);
    try {
      const expiresAt = assignPassTier === 'player'
        ? (assignPassExpiry
            ? new Date(assignPassExpiry).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        : null;
      const body = {
        pass_tier: assignPassTier,
        pass_status: assignPassTier === 'none' ? 'cancelled' : 'active',
        pass_started_at: assignPassTier === 'player' ? new Date().toISOString() : null,
        pass_expires_at: expiresAt,
      };
      const res = await fetch(`/api/hq/player/${playerDetails.player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlayerDetails(prev => prev ? {
        ...prev,
        player: { ...prev.player, pass_tier: data.pass_tier, pass_status: data.pass_status, pass_expires_at: data.pass_expires_at, pass_started_at: data.pass_started_at },
      } : prev);
      showToast(
        assignPassTier === 'none'
          ? 'Pass removed — player reverted to free tier'
          : `Player Pass assigned${expiresAt ? ` — renews ${new Date(expiresAt).toLocaleDateString()}` : ''}`,
        'success'
      );
      setAssignPassOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to assign pass', 'error');
    } finally {
      setAssigningPass(false);
    }
  };

  // Player account actions
  const suspendPlayer = async () => {
    if (!playerDetails) return;
    setDangerLoading(true);
    try {
      const res = await fetch(`/api/hq/player/${playerDetails.player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pass_tier: 'none', pass_status: 'inactive', is_staff: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlayerDetails(prev => prev ? { ...prev, player: { ...prev.player, is_staff: false } } : prev);
      showToast(`${playerDetails.player.display_name}'s subscription removed`, 'success');
      setDangerAction(null);
    } catch (err: any) {
      showToast(err.message || 'Failed', 'error');
    } finally {
      setDangerLoading(false);
    }
  };

  const deletePlayer = async () => {
    if (!playerDetails || deleteConfirmText !== playerDetails.player.display_name) return;
    setDangerLoading(true);
    try {
      const res = await fetch(`/api/hq/player/${playerDetails.player.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`${playerDetails.player.display_name} deleted`, 'success');
      setPlayerDetails(null);
      setSearchQuery('');
      setDangerAction(null);
      setDeleteConfirmText('');
    } catch (err: any) {
      showToast(err.message || 'Failed', 'error');
    } finally {
      setDangerLoading(false);
    }
  };

  // Shop management functions
  const loadShopItems = async () => {
    setShopLoading(true);
    try {
      const res = await fetch('/api/hq/shop');
      const data = await res.json();
      setShopItems(data.items || []);
    } catch {
      showToast('Failed to load shop items', 'error');
    } finally {
      setShopLoading(false);
    }
  };

  const buildAssetData = () => {
    const { category, asset_emoji, asset_color, asset_frame, asset_title } = shopForm;
    if (category === 'base' || category === 'badge' || category === 'effect') return { emoji: asset_emoji };
    if (category === 'background') return { color: asset_color };
    if (category === 'frame') return { style: asset_frame };
    if (category === 'title') return { text: asset_title };
    return { emoji: asset_emoji };
  };

  const saveShopItem = async () => {
    if (!shopForm.name || !shopForm.price) {
      showToast('Name and price are required', 'error');
      return;
    }
    setShopSaving(true);
    try {
      const res = await fetch('/api/hq/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: shopForm.name,
          description: shopForm.description || null,
          category: shopForm.category,
          price: Number(shopForm.price),
          rarity: shopForm.rarity,
          asset_data: buildAssetData(),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setShopItems(prev => [...prev, data.item]);
      setShopForm({ name: '', description: '', category: 'base', price: '', rarity: 'common', asset_emoji: '', asset_color: '#6366f1', asset_frame: 'silver', asset_title: '' });
      setShopFormOpen(false);
      showToast('Item added to shop', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save item', 'error');
    } finally {
      setShopSaving(false);
    }
  };

  const toggleShopItemActive = async (item: HQShopItem) => {
    try {
      const res = await fetch('/api/hq/shop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, active: !item.active }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setShopItems(prev => prev.map(i => i.id === item.id ? data.item : i));
      showToast(`Item ${!item.active ? 'activated' : 'deactivated'}`, 'success');
    } catch {
      showToast('Failed to update item', 'error');
    }
  };

  const deleteShopItem = async (id: string) => {
    try {
      const res = await fetch(`/api/hq/shop?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.deleted) {
        setShopItems(prev => prev.filter(i => i.id !== id));
        showToast('Item removed from shop', 'success');
      } else {
        // Was owned by players — just deactivated
        setShopItems(prev => prev.map(i => i.id === id ? data.item : i));
        showToast('Item is owned by players — deactivated instead of deleted', 'success');
      }
    } catch {
      showToast('Failed to remove item', 'error');
    } finally {
      setShopDeleteConfirm(null);
    }
  };

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
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-accent text-xl">Verifying access...</div>
      </div>
    );
  }

  const filteredGames = getFilteredGames();

  return (
    <div className="min-h-screen bg-base text-primary">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-xl z-50 font-medium ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border-token bg-surface/50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-accent">
                HQ Command Center
              </h1>
              <p className="text-secondary text-sm">Staff Only</p>
            </div>
            <a href="/dashboard" className="text-secondary hover:text-primary text-sm">
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-token">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-2 py-2">
            {[
              { id: 'players', label: '👤 Players', icon: '👤' },
              { id: 'emperor', label: '👑 Emperor', icon: '👑' },
              { id: 'bounty', label: '🎯 Bounty', icon: '🎯' },
              { id: 'banners', label: '🎨 Banners', icon: '🎨' },
              { id: 'cotd', label: '🃏 Card of Day', icon: '🃏' },
              { id: 'events', label: '📅 Events', icon: '📅' },
              { id: 'shop', label: '🛒 Shop', icon: '🛒' },
              { id: 'circuit', label: '🏆 Circuit', icon: '🏆' },
              { id: 'settings', label: '⚙️ Settings', icon: '⚙️' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-accent/10 text-accent border border-accent/30'
                    : 'text-secondary hover:text-primary hover:bg-elevated'
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
            <div className="bg-surface rounded-xl p-6 border border-border-token">
              <h2 className="text-sm font-medium text-secondary uppercase tracking-wider mb-4">
                Search Player
              </h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchPlayer()}
                  placeholder="Enter Player ID (HYP-XXXXX) or name..."
                  className="flex-1 bg-elevated border border-border-token rounded-lg px-4 py-3 text-primary placeholder:text-secondary focus:outline-none focus:border-accent"
                />
                <button
                  onClick={searchPlayer}
                  disabled={searchLoading}
                  className="px-6 py-3 bg-accent rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Player Result */}
            {playerDetails && (
              <div className="bg-surface rounded-xl border border-border-token overflow-hidden">
                {/* Player Header */}
                <div className="p-6 bg-elevated/50 border-b border-border-token">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{playerDetails.player.display_name}</h2>
                      <p className="text-accent font-mono">{playerDetails.player.player_id}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-accent">
                        {playerDetails.totalXp.toLocaleString()}
                      </div>
                      <div className="text-secondary text-sm">Total XP</div>
                    </div>
                  </div>
                </div>

                {/* Game XP Section - REDESIGNED */}
                <div className="p-6 border-b border-border-token">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-secondary uppercase tracking-wider">
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
                      className="bg-elevated border border-border-token rounded-lg px-3 py-2 text-primary text-sm focus:outline-none focus:border-accent"
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
                          <div className="flex-1 p-5 rounded-xl bg-accent/10 border-2 border-accent">
                            <div className="flex items-center gap-4">
                              <span className="text-4xl">{game.icon}</span>
                              <div className="flex-1">
                                <div className="font-bold text-lg">{game.game_name}</div>
                                <div className="text-accent text-sm">{game.rank}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-3xl font-bold text-accent">
                                  {game.xp.toLocaleString()}
                                </div>
                                <div className="text-secondary text-sm">{game.xp_name}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      <button
                        onClick={() => setGameFilter(getFavoritesCount() > 0 ? 'favorites' : 'with_xp')}
                        className="px-3 py-2 text-secondary hover:text-primary hover:bg-elevated rounded-lg text-sm"
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
                                  ? 'bg-accent/20 border-2 border-accent'
                                  : game.xp > 0
                                    ? 'bg-elevated border-2 border-transparent hover:border-border-token'
                                    : 'bg-elevated/50 border-2 border-transparent hover:border-border-token opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{game.icon}</span>
                                <span className="font-medium text-sm truncate">{game.game_name}</span>
                              </div>
                              <div className={`text-xl font-bold ${game.xp > 0 ? 'text-accent' : 'text-secondary'}`}>
                                {game.xp.toLocaleString()}
                              </div>
                              <div className="text-secondary text-xs">{game.xp_name}</div>
                              {game.xp > 0 && (
                                <div className="mt-1 text-xs text-accent">{game.rank}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-secondary">
                          No games match the current filter
                        </div>
                      )}
                      
                      {/* Quick stats when filter is active */}
                      {gameFilter === 'with_xp' && playerDetails.gameXp.filter(g => g.xp === 0).length > 0 && (
                        <p className="text-secondary text-xs mt-3">
                          +{playerDetails.gameXp.filter(g => g.xp === 0).length} more games with 0 XP • 
                          <button 
                            onClick={() => setGameFilter('all')}
                            className="text-accent hover:underline ml-1"
                          >
                            Show all
                          </button>
                        </p>
                      )}
                      {gameFilter === 'favorites' && (
                        <p className="text-secondary text-xs mt-3">
                          ⭐ Showing player&apos;s favorite games • 
                          <button 
                            onClick={() => setGameFilter('all')}
                            className="text-accent hover:underline ml-1"
                          >
                            Show all {playerDetails.gameXp.length} games
                          </button>
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* XP Management - Multi-select Tiles */}
                <div className="p-6 border-b border-border-token">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-secondary uppercase tracking-wider">
                      Award XP
                    </h3>
                    {/* Game selector for XP */}
                    <select
                      value={selectedGame}
                      onChange={(e) => setSelectedGame(e.target.value)}
                      className="bg-elevated border border-border-token rounded-lg px-3 py-2 text-primary text-sm focus:outline-none focus:border-accent"
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
                    <div className="text-xs font-medium text-accent uppercase tracking-wider mb-2">📅 Event Entry</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => toggleTile('Attended', 10)}
                        className={`flex flex-col items-center px-4 py-3 rounded-lg transition-all border-2 ${
                          isTileSelected('Attended')
                            ? 'bg-purple-500/20 border-purple-500 text-primary'
                            : 'bg-elevated border-border-token hover:border-purple-500 hover:bg-purple-500/10'
                        }`}
                      >
                        <span className="font-medium">Attended</span>
                        <span className="text-xs text-accent">+10 XP</span>
                      </button>
                    </div>
                  </div>

                  {/* Match Wins */}
                  <div className="mb-4">
                    <div className="text-xs font-medium text-green-400 uppercase tracking-wider mb-2">🏆 Match Wins</div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: '1 Win', xp: 5 },
                        { label: '2 Wins', xp: 10 },
                        { label: '3 Wins', xp: 15 },
                        { label: '4 Wins', xp: 20 },
                        { label: 'Undefeated', xp: 5 },
                      ].map(item => (
                        <button
                          key={item.label}
                          onClick={() => toggleTile(item.label, item.xp)}
                          className={`flex flex-col items-center px-4 py-3 rounded-lg transition-all border-2 ${
                            isTileSelected(item.label)
                              ? 'bg-green-500/20 border-green-500 text-primary'
                              : 'bg-elevated border-border-token hover:border-green-500 hover:bg-green-500/10'
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
                              ? 'bg-orange-500/20 border-orange-500 text-primary'
                              : 'bg-elevated border-border-token hover:border-orange-500 hover:bg-orange-500/10'
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
                    <div className="mb-4 p-4 bg-elevated rounded-xl border border-accent/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-secondary">Selected:</div>
                        <button
                          onClick={() => setSelectedTiles([])}
                          className="text-xs text-secondary hover:text-primary"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {selectedTiles.map(tile => (
                          <span
                            key={tile.label}
                            className="px-2 py-1 bg-accent/10 text-accent rounded text-sm"
                          >
                            {tile.label} (+{tile.xp})
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-accent">
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
                    <div className="text-xs font-medium text-accent uppercase tracking-wider mb-2">✨ Custom (+ or -)</div>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        value={xpAmount}
                        onChange={(e) => setXpAmount(e.target.value)}
                        placeholder="+/- XP"
                        className="w-24 bg-elevated border border-border-token rounded-lg px-3 py-2 text-primary placeholder:text-secondary focus:outline-none focus:border-accent text-center"
                      />
                      <input
                        type="text"
                        value={xpReason}
                        onChange={(e) => setXpReason(e.target.value)}
                        placeholder="Reason (e.g., Prize payout, Correction)"
                        className="flex-1 bg-elevated border border-border-token rounded-lg px-3 py-2 text-primary placeholder:text-secondary focus:outline-none focus:border-accent"
                      />
                      <button
                        onClick={addCustomXp}
                        className="px-5 py-2 bg-accent rounded-lg font-medium hover:opacity-90"
                      >
                        Apply
                      </button>
                    </div>
                    <p className="text-xs text-secondary mt-2">Use negative numbers to remove XP (e.g., -25)</p>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="p-6">
                  <h3 className="text-sm font-medium text-secondary uppercase tracking-wider mb-4">
                    Recent Activity
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {playerDetails.recentActivity.length > 0 ? (
                      playerDetails.recentActivity.map(activity => (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between p-3 bg-elevated rounded-lg"
                        >
                          <div>
                            <div className="text-primary">{activity.description || 'XP adjustment'}</div>
                            <div className="text-secondary text-sm">
                              {activity.game_id} • {new Date(activity.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className={`font-bold ${activity.final_xp > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {activity.final_xp > 0 ? '+' : ''}{activity.final_xp}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-secondary text-center py-4">No recent activity</div>
                    )}
                  </div>
                </div>

                {/* Account Management */}
                <div className="p-6 border-t border-border-token space-y-6">
                  {/* Pass Status */}
                  <div>
                    <h3 className="text-sm font-medium text-secondary uppercase tracking-wider mb-3">
                      Player Pass
                    </h3>
                    <div className="bg-elevated rounded-xl p-4 border border-border-token mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-primary">
                          {playerDetails.player.pass_tier === 'player' ? 'Player Pass' :
                           playerDetails.player.pass_tier === 'all_access' ? 'All Access Pass' :
                           playerDetails.player.pass_tier === 'shadow_vip' ? 'Shadow VIP' :
                           'Free Member'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          playerDetails.player.pass_status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : playerDetails.player.pass_status === 'grace_period'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : playerDetails.player.pass_status === 'cancelled'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-surface text-secondary'
                        }`}>
                          {playerDetails.player.pass_status === 'active' ? 'Active' :
                           playerDetails.player.pass_status === 'grace_period' ? 'Grace Period' :
                           playerDetails.player.pass_status === 'cancelled' ? 'Cancelled' :
                           playerDetails.player.pass_status === 'expired' ? 'Expired' :
                           'None'}
                        </span>
                      </div>
                      {playerDetails.player.pass_expires_at && (
                        <p className="text-xs text-secondary">
                          Renews {new Date(playerDetails.player.pass_expires_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                      {playerDetails.player.pass_started_at && (
                        <p className="text-xs text-tertiary mt-0.5">
                          Started {new Date(playerDetails.player.pass_started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>

                    {/* Assign Pass toggle */}
                    {!assignPassOpen && (
                      <button
                        type="button"
                        onClick={() => { setAssignPassOpen(true); setAssignPassTier('player'); setAssignPassExpiry(''); }}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 transition-colors"
                      >
                        Assign / Change Pass
                      </button>
                    )}

                    {assignPassOpen && (
                      <div className="bg-elevated border border-border-strong rounded-xl p-4 space-y-3">
                        <p className="text-sm font-medium text-primary">Assign Pass</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setAssignPassTier('player')}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                              assignPassTier === 'player'
                                ? 'bg-accent/20 text-accent border-accent/50'
                                : 'bg-surface text-secondary border-border-token hover:border-border-strong'
                            }`}
                          >
                            Player Pass
                          </button>
                          <button
                            type="button"
                            onClick={() => setAssignPassTier('none')}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                              assignPassTier === 'none'
                                ? 'bg-surface text-primary border-border-strong'
                                : 'bg-surface text-secondary border-border-token hover:border-border-strong'
                            }`}
                          >
                            Free Member
                          </button>
                        </div>
                        {assignPassTier === 'player' && (
                          <div>
                            <label className="text-xs text-secondary block mb-1">Renewal Date (leave blank for 30 days)</label>
                            <input
                              type="date"
                              value={assignPassExpiry}
                              onChange={e => setAssignPassExpiry(e.target.value)}
                              className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
                            />
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={assignPass}
                            disabled={assigningPass}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/80 transition-colors disabled:opacity-50"
                          >
                            {assigningPass ? 'Saving…' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAssignPassOpen(false)}
                            className="px-4 py-2 text-sm text-secondary hover:text-primary rounded-lg hover:bg-surface transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Danger Zone */}
                  <div>
                    <h3 className="text-sm font-medium text-secondary uppercase tracking-wider mb-3">
                      Danger Zone
                    </h3>

                    {dangerAction === null && (
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setDangerAction('suspend')}
                          className="px-4 py-2 text-sm font-medium rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 transition-colors"
                        >
                          Remove Subscription
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDangerAction('delete'); setDeleteConfirmText(''); }}
                          className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                        >
                          Delete Account
                        </button>
                      </div>
                    )}

                    {dangerAction === 'suspend' && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                        <p className="text-sm text-yellow-300 mb-1 font-medium">Remove Subscription</p>
                        <p className="text-xs text-secondary mb-4">
                          This will set {playerDetails.player.display_name}&apos;s pass to inactive, revoke staff access, and remove any subscription permissions. Their XP and data stay intact.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={suspendPlayer}
                            disabled={dangerLoading}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-yellow-500 text-black hover:bg-yellow-400 transition-colors disabled:opacity-50"
                          >
                            {dangerLoading ? 'Removing…' : 'Confirm Remove'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDangerAction(null)}
                            className="px-4 py-2 text-sm text-secondary hover:text-primary rounded-lg hover:bg-elevated transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {dangerAction === 'delete' && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                        <p className="text-sm text-red-400 mb-1 font-medium">Delete Account — Irreversible</p>
                        <p className="text-xs text-secondary mb-3">
                          Permanently removes {playerDetails.player.display_name} and all their XP, inventory, attendance, and activity records. This cannot be undone.
                        </p>
                        <p className="text-xs text-secondary mb-2">
                          Type <span className="text-red-400 font-mono">{playerDetails.player.display_name}</span> to confirm:
                        </p>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={e => setDeleteConfirmText(e.target.value)}
                          placeholder={playerDetails.player.display_name}
                          className="w-full bg-input border border-red-500/40 rounded-lg px-3 py-2 text-sm text-primary mb-3 focus:outline-none focus:border-red-400"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={deletePlayer}
                            disabled={dangerLoading || deleteConfirmText !== playerDetails.player.display_name}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-40"
                          >
                            {dangerLoading ? 'Deleting…' : 'Delete Forever'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDangerAction(null); setDeleteConfirmText(''); }}
                            className="px-4 py-2 text-sm text-secondary hover:text-primary rounded-lg hover:bg-elevated transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
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
            <div className="bg-surface rounded-xl p-6 border border-border-token">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">🏴‍☠️ One Piece Emperor Rankings</h2>
                  <p className="text-secondary">Monthly bounty competition</p>
                </div>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-elevated border border-border-token rounded-lg px-4 py-2 text-primary focus:outline-none focus:border-accent"
                >
                  {getMonthOptions().map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Current Emperor */}
              <div className="bg-surface rounded-xl p-6 border border-border-token">
                <h3 className="text-sm font-medium text-secondary uppercase tracking-wider mb-4">
                  Monthly Rankings
                </h3>
                {emperorLoading ? (
                  <div className="text-center py-8 text-secondary">Loading...</div>
                ) : monthlyRankings.length > 0 ? (
                  <div className="space-y-3">
                    {monthlyRankings.slice(0, 10).map((player, index) => (
                      <div
                        key={player.player_id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          index === 0 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-elevated'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? 'bg-yellow-500 text-black' :
                            index === 1 ? 'bg-secondary text-base' :
                            index === 2 ? 'bg-amber-600 text-black' :
                            "bg-elevated"
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{player.display_name}</div>
                            <div className="text-secondary text-sm">{player.bounty}</div>
                          </div>
                        </div>
                        <div className="text-accent font-bold">
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
                  <div className="text-center py-8 text-secondary">
                    No rankings for this month
                  </div>
                )}
              </div>

              {/* Hall of Fame */}
              <div className="bg-surface rounded-xl p-6 border border-border-token">
                <h3 className="text-sm font-medium text-secondary uppercase tracking-wider mb-4">
                  Hall of Fame
                </h3>
                {hallOfFame.length > 0 ? (
                  <div className="space-y-3">
                    {hallOfFame.map((emperor) => (
                      <div
                        key={emperor.id}
                        className="flex items-center justify-between p-3 bg-elevated/50 rounded-lg border border-purple-500/20"
                      >
                        <div>
                          <div className="font-medium">👑 {emperor.player_name}</div>
                          <div className="text-secondary text-sm">{emperor.month}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-accent font-bold">{emperor.bounty_display}</div>
                          <div className="text-secondary text-xs">+{emperor.monthly_xp.toLocaleString()} that month</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-secondary">
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
                className="px-4 py-2 bg-accent rounded-lg font-medium hover:opacity-90"
              >
                + New Banner
              </button>
            </div>

            {bannerLoading ? (
              <div className="text-center py-8 text-secondary">Loading banners...</div>
            ) : (
              <div className="grid gap-4">
                {banners.map(banner => (
                  <div
                    key={banner.id}
                    className="bg-surface rounded-xl border border-border-token overflow-hidden"
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
                    <div className="p-3 flex items-center justify-between bg-elevated/50">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${banner.is_active ? 'bg-green-500' : 'bg-elevated'}`}></span>
                        <span className="text-secondary text-sm">
                          {banner.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingBanner(banner)}
                          className="px-3 py-1 text-accent hover:bg-accent/10 rounded"
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
                <div className="bg-surface rounded-xl border border-border-token max-w-lg w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-4 border-b border-border-token">
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
                        <label className="text-secondary text-sm mb-1 block">Title</label>
                        <input
                          type="text"
                          value={editingBanner.title}
                          onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                          className="w-full bg-elevated border border-border-token rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="text-secondary text-sm mb-1 block">Subtitle</label>
                        <input
                          type="text"
                          value={editingBanner.subtitle}
                          onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                          className="w-full bg-elevated border border-border-token rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="text-secondary text-sm mb-1 block">Icon</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="w-full bg-elevated border border-border-token rounded-lg px-3 py-2 text-primary focus:outline-none focus:border-accent text-left flex items-center justify-between"
                          >
                            <span className="text-2xl">{editingBanner.icon || '🎮'}</span>
                            <span className="text-secondary text-sm">Click to change</span>
                          </button>
                          {showEmojiPicker && (
                            <div className="absolute top-full left-0 mt-2 p-3 bg-elevated border border-border-token rounded-lg shadow-xl z-10 w-64">
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
                                    className="text-2xl hover:bg-elevated rounded p-1 transition-colors"
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
                        <label className="text-secondary text-sm mb-1 block">Badge</label>
                        <input
                          type="text"
                          value={editingBanner.badge}
                          onChange={(e) => setEditingBanner({ ...editingBanner, badge: e.target.value })}
                          placeholder="e.g. LIVE SOON"
                          className="w-full bg-elevated border border-border-token rounded-lg px-3 py-2 text-primary placeholder:text-secondary focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="text-secondary text-sm mb-1 block">Color From</label>
                        <input
                          type="color"
                          value={editingBanner.color_from}
                          onChange={(e) => setEditingBanner({ ...editingBanner, color_from: e.target.value })}
                          className="w-full h-10 bg-elevated border border-border-token rounded-lg cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-secondary text-sm mb-1 block">Color To</label>
                        <input
                          type="color"
                          value={editingBanner.color_to}
                          onChange={(e) => setEditingBanner({ ...editingBanner, color_to: e.target.value })}
                          className="w-full h-10 bg-elevated border border-border-token rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Stream URLs */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-secondary text-sm mb-1 block">📺 Twitch URL</label>
                        <input
                          type="url"
                          value={editingBanner.twitch_url || ''}
                          onChange={(e) => setEditingBanner({ ...editingBanner, twitch_url: e.target.value || null })}
                          placeholder="https://twitch.tv/..."
                          className="w-full bg-elevated border border-border-token rounded-lg px-3 py-2 text-primary placeholder:text-secondary focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-secondary text-sm mb-1 block">▶️ YouTube URL</label>
                        <input
                          type="url"
                          value={editingBanner.youtube_url || ''}
                          onChange={(e) => setEditingBanner({ ...editingBanner, youtube_url: e.target.value || null })}
                          placeholder="https://youtube.com/..."
                          className="w-full bg-elevated border border-border-token rounded-lg px-3 py-2 text-primary placeholder:text-secondary focus:outline-none focus:border-red-500"
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
                  <div className="p-4 border-t border-border-token flex justify-end gap-3">
                    <button
                      onClick={() => setEditingBanner(null)}
                      className="px-4 py-2 text-secondary hover:text-primary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveBanner(editingBanner)}
                      className="px-6 py-2 bg-accent rounded-lg font-medium hover:opacity-90"
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
              <div className="text-center py-12 text-secondary">Loading...</div>
            ) : bountyEvent ? (
              <>
                {/* Current Event */}
                <div className="bg-gradient-to-r from-red-900/30 to-slate-900 rounded-xl p-6 border border-red-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-red-400">🎯 Current Bounty Hunter Event</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      bountyEvent.status === 'opt_in_open' ? 'bg-green-500/20 text-green-400' :
                      bountyEvent.status === 'active' ? 'bg-orange-500/20 text-orange-400' :
                      bountyEvent.status === 'completed' ? 'bg-elevated/50 text-secondary' :
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
                          <label className="block text-sm text-secondary mb-1">Event Date</label>
                          <input
                            type="date"
                            value={newEventDate}
                            onChange={(e) => setNewEventDate(e.target.value)}
                            className="w-full bg-elevated border border-border-token rounded-lg px-4 py-2 text-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-secondary mb-1">Opt-In Opens</label>
                          <input
                            type="datetime-local"
                            value={newOptInOpens}
                            onChange={(e) => setNewOptInOpens(e.target.value)}
                            className="w-full bg-elevated border border-border-token rounded-lg px-4 py-2 text-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-secondary mb-1">Opt-In Closes</label>
                          <input
                            type="datetime-local"
                            value={newOptInCloses}
                            onChange={(e) => setNewOptInCloses(e.target.value)}
                            className="w-full bg-elevated border border-border-token rounded-lg px-4 py-2 text-primary"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={saveEditedEvent}
                          disabled={creatingEvent}
                          className="px-4 py-2 bg-accent rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                        >
                          {creatingEvent ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={cancelEditingEvent}
                          className="px-4 py-2 bg-elevated text-primary rounded-lg hover:bg-elevated/80"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display View */
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-elevated/50 rounded-lg p-3">
                          <div className="text-secondary text-xs">Event Date</div>
                          <div className="text-primary font-medium">{bountyEvent.event_date}</div>
                        </div>
                        <div className="bg-elevated/50 rounded-lg p-3">
                          <div className="text-secondary text-xs">Month</div>
                          <div className="text-primary font-medium">{bountyEvent.month_key}</div>
                        </div>
                        <div className="bg-elevated/50 rounded-lg p-3">
                          <div className="text-secondary text-xs">Opt-In Opens</div>
                          <div className="text-primary font-medium text-sm">{new Date(bountyEvent.opt_in_opens_at).toLocaleDateString()}</div>
                        </div>
                        <div className="bg-elevated/50 rounded-lg p-3">
                          <div className="text-secondary text-xs">Opt-In Closes</div>
                          <div className="text-primary font-medium text-sm">{new Date(bountyEvent.opt_in_closes_at).toLocaleDateString()}</div>
                        </div>
                      </div>

                      {/* Status Controls */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="text-secondary text-sm mr-2">Change Status:</span>
                        {['upcoming', 'opt_in_open', 'active', 'completed'].map(status => (
                          <button
                            key={status}
                            onClick={() => updateEventStatus(status)}
                            disabled={bountyEvent.status === status}
                            className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                              bountyEvent.status === status
                                ? 'bg-accent text-accent-fg'
                                : 'bg-elevated text-primary hover:bg-elevated/80'
                            }`}
                          >
                            {status.replace('_', ' ')}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-4">
                        <button
                          onClick={startEditingEvent}
                          className="text-accent hover:opacity-80 text-sm"
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
                <div className="bg-surface rounded-xl p-6 border border-border-token">
                  <h3 className="text-lg font-bold text-red-400 mb-4">🏴‍☠️ WANTED (Top 5 Auto-Added)</h3>
                  {bountyWanted.length > 0 ? (
                    <div className="space-y-2">
                      {bountyWanted.map((player, i) => (
                        <div key={player.player_id} className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                          <span className="text-red-400 font-bold w-8">#{i + 1}</span>
                          <span className="text-primary flex-1">{player.display_name}</span>
                          <span className="text-red-400">{player.xp.toLocaleString()} Berries</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-secondary">No WANTED players yet (Top 5 One Piece leaderboard)</p>
                  )}
                </div>

                {/* Hunters List */}
                <div className="bg-surface rounded-xl p-6 border border-border-token">
                  <h3 className="text-lg font-bold text-green-400 mb-4">🏹 Registered Hunters ({bountyHunters.length})</h3>
                  {bountyHunters.length > 0 ? (
                    <div className="grid gap-2">
                      {bountyHunters.map(hunter => (
                        <div key={hunter.player_id} className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                          <span className="text-green-400">🏹</span>
                          <span className="text-primary flex-1">{hunter.display_name}</span>
                          <span className="text-secondary">{hunter.xp.toLocaleString()} Berries</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-secondary">No hunters registered yet</p>
                  )}
                </div>

                {/* Match Recording - Only show when event is active */}
                {bountyEvent?.status === 'active' && (
                  <div className="bg-gradient-to-r from-orange-900/30 to-slate-900 rounded-xl p-6 border border-orange-500/30">
                    <h3 className="text-lg font-bold text-orange-400 mb-4">⚔️ Record Match Result</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Winner */}
                      <div>
                        <label className="block text-sm text-secondary mb-1">Winner</label>
                        <select
                          value={matchWinner}
                          onChange={(e) => setMatchWinner(e.target.value)}
                          className="w-full bg-elevated border border-border-token rounded-lg px-4 py-2 text-primary"
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
                        <label className="block text-sm text-secondary mb-1">Loser</label>
                        <select
                          value={matchLoser}
                          onChange={(e) => setMatchLoser(e.target.value)}
                          className="w-full bg-elevated border border-border-token rounded-lg px-4 py-2 text-primary"
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
                        <label className="block text-sm text-secondary mb-1">Match Type</label>
                        <select
                          value={matchType}
                          onChange={(e) => setMatchType(e.target.value)}
                          className="w-full bg-elevated border border-border-token rounded-lg px-4 py-2 text-primary"
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
                        <label className="block text-sm text-secondary mb-1">Round</label>
                        <select
                          value={matchRound}
                          onChange={(e) => setMatchRound(Number(e.target.value))}
                          className="w-full bg-elevated border border-border-token rounded-lg px-4 py-2 text-primary"
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
                  <div className="bg-surface rounded-xl p-6 border border-border-token">
                    <h3 className="text-lg font-bold text-primary mb-4">📜 Match History ({matches.length})</h3>
                    <div className="space-y-2 max-h-96 overflow-auto">
                      {matches.map((match: any) => (
                        <div key={match.id} className="flex items-center gap-3 p-3 bg-elevated/50 rounded-lg border border-border-token/50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-green-400 font-medium">{match.winner_name}</span>
                              <span className="text-secondary">defeated</span>
                              <span className="text-red-400 font-medium">{match.loser_name}</span>
                            </div>
                            <div className="text-xs text-secondary mt-1">
                              {match.match_type.replace(/_/g, ' ')} • Round {match.round}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-green-400 text-sm">+{match.winner_points}</div>
                            <div className="text-red-400 text-sm">{match.loser_points}</div>
                          </div>
                          <button
                            onClick={() => deleteMatch(match.id)}
                            className="text-secondary hover:text-red-400 p-1"
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
              <div className="bg-surface rounded-xl p-6 border border-border-token">
                <h2 className="text-xl font-bold mb-4">🎯 Create Bounty Hunter Event</h2>
                <p className="text-secondary mb-6">No event scheduled for this month. Create one below.</p>
                
                <div className="grid gap-4 max-w-md">
                  <div>
                    <label className="block text-sm text-secondary mb-1">Event Date</label>
                    <input
                      type="date"
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      className="w-full bg-elevated border border-border-token rounded-lg px-4 py-2 text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-1">Opt-In Opens</label>
                    <input
                      type="datetime-local"
                      value={newOptInOpens}
                      onChange={(e) => setNewOptInOpens(e.target.value)}
                      className="w-full bg-elevated border border-border-token rounded-lg px-4 py-2 text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-secondary mb-1">Opt-In Closes</label>
                    <input
                      type="datetime-local"
                      value={newOptInCloses}
                      onChange={(e) => setNewOptInCloses(e.target.value)}
                      className="w-full bg-elevated border border-border-token rounded-lg px-4 py-2 text-primary"
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

                <div className="mt-6 p-4 bg-elevated/50 rounded-lg">
                  <h4 className="font-medium text-primary mb-2">💡 How it works</h4>
                  <ul className="text-sm text-secondary space-y-1">
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
            <div className="bg-surface rounded-xl p-6 border border-border-token">
              <h2 className="text-xl font-bold mb-4">🃏 Set Card of the Day</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-secondary mb-1">Game</label>
                  <select
                    value={cotdSearchGame}
                    onChange={(e) => setCotdSearchGame(e.target.value)}
                    className="w-full bg-elevated border border-border-token rounded-lg px-4 py-2 text-primary"
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
                  <label className="block text-sm text-secondary mb-1">Card Name</label>
                  <input
                    type="text"
                    value={cotdSearchQuery}
                    onChange={(e) => setCotdSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchCOTDCards()}
                    placeholder="e.g. Monkey.D.Luffy"
                    className="w-full bg-elevated border border-border-token rounded-lg px-4 py-2 text-primary placeholder:text-secondary"
                  />
                </div>

                <div>
                  <label className="block text-sm text-secondary mb-1">Card # <span className="text-secondary">(optional)</span></label>
                  <input
                    type="text"
                    value={cotdSearchNumber}
                    onChange={(e) => setCotdSearchNumber(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchCOTDCards()}
                    placeholder="e.g. 012"
                    className="w-full bg-elevated border border-border-token rounded-lg px-4 py-2 text-primary placeholder:text-secondary"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={searchCOTDCards}
                    disabled={cotdSearchLoading || !cotdSearchQuery.trim()}
                    className="w-full px-4 py-2 bg-accent hover:opacity-90 disabled:opacity-50 rounded-lg font-medium transition-colors"
                  >
                    {cotdSearchLoading ? 'Searching...' : '🔍 Search'}
                  </button>
                </div>
              </div>

              <p className="text-xs text-secondary mt-2">💡 Tip: Add card number for precise results (API returns max 20)</p>

              {cotdSearchResults.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm text-secondary mb-2">Found {cotdSearchResults.length} card variants</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-auto">
                    {cotdSearchResults.map((card, idx) => (
                      <button
                        key={`${card.id}-${card.variantId || idx}`}
                        onClick={() => setCotdSelectedCard(card)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          cotdSelectedCard?.variantId === card.variantId && cotdSelectedCard?.id === card.id
                            ? 'bg-accent/10 border-accent'
                            : 'bg-elevated border-border-token hover:border-border-token'
                        }`}
                      >
                        <div className="font-medium text-sm truncate">{card.name}</div>
                        <div className="text-xs text-secondary mt-1">{card.set} • {card.rarity}</div>
                        {card.printing && card.printing !== 'Standard' && (
                          <div className="text-xs text-accent mt-1 font-medium">✨ {card.printing}</div>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-secondary">#{card.number}</span>
                          <span className="text-xs text-accent font-medium">{formatCOTDPrice(card.price)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {cotdSelectedCard && (
                <div className="mt-6 p-4 bg-elevated rounded-lg border border-accent/30">
                  <h3 className="text-sm text-accent mb-3">Selected Card</h3>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="text-lg font-bold">{cotdSelectedCard.name}</div>
                      <div className="text-secondary text-sm mt-1">
                        {cotdSelectedCard.set} • {cotdSelectedCard.rarity} • #{cotdSelectedCard.number}
                      </div>
                      {cotdSelectedCard.printing && cotdSelectedCard.printing !== 'Standard' && (
                        <div className="text-accent text-sm mt-1 font-medium">
                          ✨ {cotdSelectedCard.printing}
                        </div>
                      )}
                      <div className="text-primary mt-2">
                        Price: {formatCOTDPrice(cotdSelectedCard.price)}
                        {cotdSelectedCard.priceChange7d && (
                          <span className={`ml-2 text-sm ${cotdSelectedCard.priceChange7d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {cotdSelectedCard.priceChange7d >= 0 ? '+' : ''}{cotdSelectedCard.priceChange7d.toFixed(1)}% 7d
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setCotdSelectedCard(null)} className="text-secondary hover:text-red-400">✕</button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border-token">
                    <label className="block text-sm text-secondary mb-2">Feature on Date</label>
                    <div className="flex flex-wrap gap-2">
                      {getCOTDDateOptions().map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setCotdSelectedDate(opt.value)}
                          disabled={opt.isScheduled}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            cotdSelectedDate === opt.value
                              ? 'bg-accent text-accent-fg'
                              : opt.isScheduled
                              ? 'bg-elevated text-tertiary cursor-not-allowed'
                              : 'bg-elevated text-primary hover:bg-elevated/80'
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
                    className="mt-4 w-full px-4 py-3 bg-accent rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {cotdSaving ? 'Saving...' : '✨ Set as Card of the Day'}
                  </button>
                </div>
              )}
            </div>

            {/* Upcoming Schedule */}
            <div className="bg-surface rounded-xl p-6 border border-border-token">
              <h2 className="text-xl font-bold mb-4">📅 Upcoming Schedule</h2>
              
              {cotdUpcoming.length === 0 ? (
                <div className="text-secondary text-center py-8">
                  <div className="text-4xl mb-2">🃏</div>
                  <p>No cards scheduled yet</p>
                  <p className="text-sm mt-1">Search and select a card above to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cotdUpcoming.map(card => (
                    <div key={card.id} className="flex items-center gap-4 p-4 bg-elevated rounded-lg border border-border-token">
                      <div className="text-center min-w-[80px]">
                        <div className="text-xs text-secondary uppercase">
                          {new Date(card.featured_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className="text-lg font-bold">
                          {new Date(card.featured_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{card.card_name}</div>
                        <div className="text-sm text-secondary">{card.game_display} • #{card.card_number}</div>
                        {card.card_data?.printing && card.card_data.printing !== 'Standard' && (
                          <div className="text-xs text-accent mt-0.5">✨ {card.card_data.printing}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatCOTDPrice(card.card_data?.price)}</div>
                        <div className={`text-xs px-2 py-0.5 rounded ${
                          card.source === 'staff_pick' ? 'bg-purple-500/20 text-accent' : 'bg-elevated text-secondary'
                        }`}>
                          {card.source === 'staff_pick' ? '👤 Staff' : card.source === 'community_vote' ? '🗳️ Vote' : '🤖 Auto'}
                        </div>
                      </div>
                      <button onClick={() => deleteCOTDCard(card.featured_date)} className="text-secondary hover:text-red-400 p-2">🗑️</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Voting Pool Management */}
            <div className="bg-surface rounded-xl p-6 border border-purple-500/30">
              <h2 className="text-xl font-bold mb-4">🗳️ Community Voting Pools</h2>
              <p className="text-secondary text-sm mb-4">
                Add 3-4 cards to a voting pool. Players vote and the winner becomes Card of the Day. Voters who pick the winner get <span className="text-accent">+10 XP</span>!
              </p>

              {/* Add to Pool Section */}
              {cotdSelectedCard && (
                <div className="mb-6 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <h3 className="text-sm text-accent mb-3">Add to Voting Pool</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1">
                      <div className="font-medium">{cotdSelectedCard.name}</div>
                      <div className="text-sm text-secondary">
                        #{cotdSelectedCard.number}
                        {cotdSelectedCard.printing && cotdSelectedCard.printing !== 'Standard' && (
                          <span className="text-accent ml-1">✨ {cotdSelectedCard.printing}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-accent font-medium">{formatCOTDPrice(cotdSelectedCard.price)}</div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <select
                      value={cotdVotingDate}
                      onChange={(e) => setCotdVotingDate(e.target.value)}
                      className="flex-1 bg-elevated border border-border-token rounded-lg px-3 py-2 text-primary text-sm"
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
                        <div key={date} className="p-4 bg-elevated rounded-lg border border-border-token">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="font-medium">
                                {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </span>
                              {isTomorrow && <span className="ml-2 text-xs bg-purple-500/20 text-accent px-2 py-0.5 rounded">Voting Now</span>}
                              {isToday && <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Today</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-secondary">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
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
                              <div key={card.id} className="flex items-center gap-3 p-2 bg-surface/50 rounded">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{card.card_name}</div>
                                  <div className="text-xs text-secondary">
                                    {card.game_display} • #{card.card_number}
                                    {card.card_data?.printing && card.card_data.printing !== 'Standard' && (
                                      <span className="text-accent ml-1">✨ {card.card_data.printing}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-accent">{card.votes_count || 0} votes</div>
                                  {totalVotes > 0 && (
                                    <div className="text-xs text-secondary">
                                      {Math.round((card.votes_count || 0) / totalVotes * 100)}%
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => removeFromVotingPool(card.id)}
                                  className="text-secondary hover:text-red-400 p-1"
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
                <div className="text-center py-6 text-secondary">
                  <div className="text-3xl mb-2">🗳️</div>
                  <p>No voting pools yet</p>
                  <p className="text-sm mt-1">Search for cards above, select one, then add it to a voting pool</p>
                </div>
              )}
            </div>

            <div className="bg-surface rounded-xl p-6 border border-border-token">
              <h3 className="font-medium text-primary mb-2">💡 How it works</h3>
              <ul className="text-sm text-secondary space-y-1">
                <li>• <strong>Staff Picks:</strong> Set a card directly for any date (overrides voting)</li>
                <li>• <strong>Community Voting:</strong> Add 3-4 cards to a pool, players vote, winner is featured</li>
                <li>• Players who vote for the winning card earn <span className="text-accent">+10 XP</span></li>
                <li>• Voting for tomorrow&apos;s card happens today</li>
              </ul>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            {/* Kiosk link */}
            <div className="bg-surface rounded-xl p-4 border border-border-token flex items-center justify-between">
              <div>
                <div className="font-semibold text-primary">Door Kiosk</div>
                <div className="text-secondary text-sm">Open on the Android device at the door</div>
              </div>
              <a
                href="/kiosk"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 text-sm font-medium"
              >
                Open Kiosk →
              </a>
            </div>

            {/* Event list */}
            <div className="bg-surface rounded-xl p-6 border border-border-token">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Upcoming Events</h2>
                <button
                  onClick={loadHQEvents}
                  disabled={eventsLoading}
                  className="text-secondary hover:text-primary text-sm px-3 py-1 rounded-lg hover:bg-elevated transition-colors"
                >
                  {eventsLoading ? 'Loading...' : '↻ Refresh'}
                </button>
              </div>

              {eventsLoading && hqEvents.length === 0 ? (
                <p className="text-tertiary text-center py-8">Loading events...</p>
              ) : hqEvents.length === 0 ? (
                <p className="text-tertiary text-center py-8">No upcoming events. Sync from the Events page first.</p>
              ) : (
                <div className="space-y-3">
                  {hqEvents.map(event => {
                    const isActive = event.status === 'active';
                    const isActivating = activatingEventId === event.id;
                    const eventTime = new Date(event.scheduled_at).toLocaleString('en-US', {
                      timeZone: 'America/Los_Angeles',
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={event.id}
                        className={`rounded-xl p-4 border flex items-center justify-between gap-4 ${
                          isActive
                            ? 'bg-emerald-950/40 border-emerald-500/40'
                            : 'bg-elevated border-border-token'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isActive && (
                              <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                LIVE
                              </span>
                            )}
                            <span className="text-xs text-secondary">{event.game?.icon} {event.game?.name}</span>
                          </div>
                          <div className="font-semibold text-primary truncate">{event.name}</div>
                          <div className="text-secondary text-xs mt-0.5">{eventTime} · +{event.attendance_xp} XP</div>
                          {isActive && event.attendanceCount !== undefined && (
                            <div className="text-emerald-400 text-xs mt-1">{event.attendanceCount} checked in</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isActive ? (
                            <>
                              <a
                                href={`/checkin?event_id=${event.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-elevated text-secondary rounded-lg text-xs hover:bg-elevated/80 transition-colors"
                              >
                                QR Preview
                              </a>
                              <button
                                onClick={() => activateEvent(event.id, 'end')}
                                disabled={isActivating}
                                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50"
                              >
                                {isActivating ? '...' : 'End Event'}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => activateEvent(event.id, 'start')}
                              disabled={isActivating}
                              className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-semibold hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                            >
                              {isActivating ? '...' : 'Start Event'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Calendar sync reminder */}
            <div className="bg-surface rounded-xl p-4 border border-border-token">
              <p className="text-tertiary text-sm">
                Events sync from Google Calendar.{' '}
                <a href="/dashboard/events" className="text-accent hover:text-accent">
                  Go to Events page →
                </a>{' '}
                to pull updates.
              </p>
            </div>
          </div>
        )}

        {/* Shop Tab */}
        {activeTab === 'shop' && (
          <div className="space-y-6">

            {/* Pricing Formula Reference */}
            <div className="bg-surface rounded-xl p-6 border border-border-token">
              <h2 className="text-sm font-medium text-secondary uppercase tracking-wider mb-1">Pricing Formula</h2>
              <p className="text-xs text-tertiary mb-4">Upper management sets the item spec — staff enters it here. Use these ranges as your guide.</p>
              <div className="grid grid-cols-5 gap-3 mb-4">
                {[
                  { rarity: 'Common', range: '100–250', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', desc: 'Basic cosmetics, accessible to most players' },
                  { rarity: 'Uncommon', range: '300–600', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', desc: 'Takes a few events to earn' },
                  { rarity: 'Rare', range: '750–1,200', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', desc: 'Dedicated players, ~2 weeks of play' },
                  { rarity: 'Epic', range: '1,500–2,500', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', desc: 'Monthly milestone feel' },
                  { rarity: 'Legendary', range: '3,000+', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', desc: 'Top earners only — prestige tier' },
                ].map(r => (
                  <div key={r.rarity} className={`rounded-lg p-3 border ${r.bg}`}>
                    <div className={`text-xs font-bold ${r.color} mb-1`}>{r.rarity}</div>
                    <div className="text-sm font-mono font-semibold text-primary">{r.range} <span className="text-xs text-tertiary">pts</span></div>
                    <div className="text-xs text-tertiary mt-1 leading-tight">{r.desc}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border-token pt-4">
                <div className="text-xs font-medium text-secondary mb-2">Category Guide</div>
                <div className="grid grid-cols-3 gap-2 text-xs text-tertiary">
                  <div><span className="text-primary font-medium">Base</span> — Avatar body emoji (e.g. 🧙 🤖 🦊)</div>
                  <div><span className="text-primary font-medium">Background</span> — Color behind avatar (hex code)</div>
                  <div><span className="text-primary font-medium">Frame</span> — Border style around avatar</div>
                  <div><span className="text-primary font-medium">Badge</span> — Small emoji shown on profile (e.g. ⭐ 💎)</div>
                  <div><span className="text-primary font-medium">Title</span> — Text under player name (e.g. "The Collector")</div>
                  <div><span className="text-primary font-medium">Effect</span> — Special visual effect emoji or key</div>
                </div>
              </div>
            </div>

            {/* Item List */}
            <div className="bg-surface rounded-xl border border-border-token overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border-token">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-primary">Shop Items</h2>
                  <span className="text-xs text-tertiary bg-elevated px-2 py-0.5 rounded-full">
                    {shopItems.filter(i => i.active).length} active / {shopItems.length} total
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={shopCategoryFilter}
                    onChange={e => setShopCategoryFilter(e.target.value)}
                    className="text-sm bg-elevated border border-border-token rounded-lg px-3 py-1.5 text-primary"
                  >
                    <option value="all">All categories</option>
                    <option value="base">Base</option>
                    <option value="background">Background</option>
                    <option value="frame">Frame</option>
                    <option value="badge">Badge</option>
                    <option value="title">Title</option>
                    <option value="effect">Effect</option>
                  </select>
                  <button
                    onClick={() => setShopFormOpen(true)}
                    className="bg-accent text-accent-fg text-sm font-medium px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    + Add Item
                  </button>
                </div>
              </div>

              {shopLoading ? (
                <div className="p-8 text-center text-tertiary text-sm">Loading items…</div>
              ) : shopItems.filter(i => shopCategoryFilter === 'all' || i.category === shopCategoryFilter).length === 0 ? (
                <div className="p-8 text-center text-tertiary text-sm">No items found.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-token text-left">
                      <th className="px-6 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Item</th>
                      <th className="px-4 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Rarity</th>
                      <th className="px-4 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Price</th>
                      <th className="px-4 py-3 text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {shopItems
                      .filter(i => shopCategoryFilter === 'all' || i.category === shopCategoryFilter)
                      .map(item => {
                        const rarityColor: Record<string, string> = {
                          common: 'text-slate-400', uncommon: 'text-green-400',
                          rare: 'text-blue-400', epic: 'text-purple-400', legendary: 'text-yellow-400',
                        };
                        return (
                          <tr key={item.id} className={`hover:bg-elevated/50 transition-colors ${!item.active ? 'opacity-50' : ''}`}>
                            <td className="px-6 py-3">
                              <div className="font-medium text-primary">{item.name}</div>
                              {item.description && <div className="text-xs text-tertiary mt-0.5">{item.description}</div>}
                            </td>
                            <td className="px-4 py-3 text-secondary capitalize">{item.category}</td>
                            <td className="px-4 py-3">
                              <span className={`capitalize font-medium ${rarityColor[item.rarity] || 'text-secondary'}`}>
                                {item.rarity}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-primary font-mono">{item.price.toLocaleString()} pts</td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => toggleShopItemActive(item)}
                                disabled={item.is_default}
                                className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                                  item.is_default ? 'bg-elevated text-tertiary cursor-not-allowed' :
                                  item.active ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25' :
                                  'bg-elevated text-tertiary hover:bg-elevated'
                                }`}
                              >
                                {item.is_default ? 'Default' : item.active ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {!item.is_default && (
                                shopDeleteConfirm === item.id ? (
                                  <div className="flex items-center gap-2 justify-end">
                                    <span className="text-xs text-tertiary">Remove?</span>
                                    <button onClick={() => deleteShopItem(item.id)} className="text-xs text-red-400 hover:text-red-300 font-medium">Yes</button>
                                    <button onClick={() => setShopDeleteConfirm(null)} className="text-xs text-secondary hover:text-primary">Cancel</button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setShopDeleteConfirm(item.id)}
                                    className="text-xs text-tertiary hover:text-red-400 transition-colors"
                                  >
                                    Remove
                                  </button>
                                )
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Add Item Form */}
            {shopFormOpen && (
              <div className="bg-surface rounded-xl p-6 border border-accent/30">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-primary">New Shop Item</h3>
                  <button onClick={() => setShopFormOpen(false)} className="text-secondary hover:text-primary text-sm">Cancel</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-secondary block mb-1">Item Name *</label>
                    <input
                      type="text"
                      value={shopForm.name}
                      onChange={e => setShopForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Golden Dragon Frame"
                      className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary placeholder-tertiary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-secondary block mb-1">Description</label>
                    <input
                      type="text"
                      value={shopForm.description}
                      onChange={e => setShopForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Optional short description"
                      className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary placeholder-tertiary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-secondary block mb-1">Category *</label>
                    <select
                      value={shopForm.category}
                      onChange={e => setShopForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary"
                    >
                      <option value="base">Base — avatar body emoji</option>
                      <option value="background">Background — color behind avatar</option>
                      <option value="frame">Frame — border style</option>
                      <option value="badge">Badge — small emoji on profile</option>
                      <option value="title">Title — text under name</option>
                      <option value="effect">Effect — visual effect</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-secondary block mb-1">Rarity *</label>
                    <select
                      value={shopForm.rarity}
                      onChange={e => setShopForm(f => ({ ...f, rarity: e.target.value }))}
                      className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary"
                    >
                      <option value="common">Common (100–250 pts)</option>
                      <option value="uncommon">Uncommon (300–600 pts)</option>
                      <option value="rare">Rare (750–1,200 pts)</option>
                      <option value="epic">Epic (1,500–2,500 pts)</option>
                      <option value="legendary">Legendary (3,000+ pts)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-secondary block mb-1">
                      Price (points) *
                      <span className="ml-2 text-tertiary font-normal">
                        {shopForm.rarity === 'common' ? '100–250' : shopForm.rarity === 'uncommon' ? '300–600' : shopForm.rarity === 'rare' ? '750–1,200' : shopForm.rarity === 'epic' ? '1,500–2,500' : '3,000+'}
                      </span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={shopForm.price}
                      onChange={e => setShopForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="e.g. 500"
                      className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary placeholder-tertiary"
                    />
                  </div>

                  {/* Asset data — context-sensitive by category */}
                  {(shopForm.category === 'base' || shopForm.category === 'badge' || shopForm.category === 'effect') && (
                    <div>
                      <label className="text-xs font-medium text-secondary block mb-1">Emoji *</label>
                      <input
                        type="text"
                        value={shopForm.asset_emoji}
                        onChange={e => setShopForm(f => ({ ...f, asset_emoji: e.target.value }))}
                        placeholder="e.g. 🧙"
                        className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary placeholder-tertiary"
                      />
                    </div>
                  )}
                  {shopForm.category === 'background' && (
                    <div>
                      <label className="text-xs font-medium text-secondary block mb-1">Color *</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={shopForm.asset_color}
                          onChange={e => setShopForm(f => ({ ...f, asset_color: e.target.value }))}
                          className="w-10 h-9 rounded border border-border-token bg-input cursor-pointer"
                        />
                        <input
                          type="text"
                          value={shopForm.asset_color}
                          onChange={e => setShopForm(f => ({ ...f, asset_color: e.target.value }))}
                          placeholder="#6366f1"
                          className="flex-1 bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary placeholder-tertiary"
                        />
                      </div>
                    </div>
                  )}
                  {shopForm.category === 'frame' && (
                    <div>
                      <label className="text-xs font-medium text-secondary block mb-1">Frame Style *</label>
                      <select
                        value={shopForm.asset_frame}
                        onChange={e => setShopForm(f => ({ ...f, asset_frame: e.target.value }))}
                        className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary"
                      >
                        <option value="silver">Silver</option>
                        <option value="gold">Gold</option>
                        <option value="diamond">Diamond</option>
                        <option value="fire">Fire</option>
                        <option value="pirate">Pirate</option>
                        <option value="electric">Electric</option>
                        <option value="legendary">Legendary</option>
                      </select>
                    </div>
                  )}
                  {shopForm.category === 'title' && (
                    <div>
                      <label className="text-xs font-medium text-secondary block mb-1">Title Text *</label>
                      <input
                        type="text"
                        value={shopForm.asset_title}
                        onChange={e => setShopForm(f => ({ ...f, asset_title: e.target.value }))}
                        placeholder="e.g. The Collector"
                        className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary placeholder-tertiary"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-border-token">
                  <button
                    onClick={() => setShopFormOpen(false)}
                    className="text-sm text-secondary hover:text-primary px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveShopItem}
                    disabled={shopSaving}
                    className="bg-accent text-accent-fg text-sm font-medium px-6 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {shopSaving ? 'Saving…' : 'Add to Shop'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Settings Tab */}
        {activeTab === 'circuit' && (
          <div className="space-y-6 max-w-3xl">

            {/* Qualifiers board */}
            <div className="bg-surface rounded-xl p-6 border border-border-token">
              <h2 className="font-semibold text-primary mb-1">GGC Circuit — Championship Roster</h2>
              <p className="text-xs text-tertiary mb-4">Players who have qualified for the championship finals at Trade Emporium.</p>
              {circuitLoading ? (
                <div className="text-sm text-tertiary py-4 text-center">Loading…</div>
              ) : circuitQualifiers.length === 0 ? (
                <div className="text-sm text-tertiary py-6 text-center rounded-xl border border-dashed border-border-token">
                  No qualifiers recorded yet. Run a qualifier event at each store and record standings below.
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Group by store */}
                  {circuitStores.map(store => {
                    const storeQuals = circuitQualifiers.filter(q => q.store_id === store.id);
                    if (storeQuals.length === 0) return null;
                    return (
                      <div key={store.id}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: store.color }} />
                          <span className="text-xs font-semibold text-secondary uppercase tracking-wide">{store.name}</span>
                          <span className="text-xs text-tertiary">{store.city}</span>
                        </div>
                        <div className="rounded-xl border border-border-token overflow-hidden mb-3">
                          {storeQuals.sort((a, b) => a.placement - b.placement).map((q: any, i: number) => (
                            <div key={q.id} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-border-token' : ''}`}>
                              <span className="text-xs font-bold text-tertiary w-5">#{q.placement}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-primary">{q.players?.display_name || 'Unknown'}</div>
                                <div className="text-xs text-tertiary font-mono">{q.players?.player_id}</div>
                              </div>
                              {q.has_bye && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${store.color}20`, color: store.color }}>
                                  R1 Bye
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create qualifier event */}
            <div className="bg-surface rounded-xl p-6 border border-border-token">
              <h2 className="font-semibold text-primary mb-1">Create Qualifier Event</h2>
              <p className="text-xs text-tertiary mb-5">Creates a circuit_qualifier event in the system. Then activate it from the Events tab and check players in normally.</p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-secondary block mb-1">Event Name</label>
                  <input
                    type="text"
                    value={circuitEventForm.name}
                    onChange={e => setCircuitEventForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-secondary block mb-1">Store</label>
                  <select
                    value={circuitEventForm.store_id}
                    onChange={e => setCircuitEventForm(f => ({ ...f, store_id: e.target.value }))}
                    className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary"
                  >
                    <option value="">— Select store —</option>
                    {circuitStores.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-secondary block mb-1">Event Type</label>
                  <select
                    value={circuitEventForm.event_type}
                    onChange={e => setCircuitEventForm(f => ({ ...f, event_type: e.target.value as any }))}
                    className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary"
                  >
                    <option value="circuit_qualifier">Circuit Qualifier</option>
                    <option value="championship">Championship Finals</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-secondary block mb-1">Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    value={circuitEventForm.scheduled_at}
                    onChange={e => setCircuitEventForm(f => ({ ...f, scheduled_at: e.target.value }))}
                    className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-secondary block mb-1">Max Players</label>
                  <input
                    type="number"
                    value={circuitEventForm.max_players}
                    onChange={e => setCircuitEventForm(f => ({ ...f, max_players: e.target.value }))}
                    className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-secondary block mb-1">Entry Fee ($)</label>
                  <input
                    type="number"
                    value={circuitEventForm.entry_fee}
                    onChange={e => setCircuitEventForm(f => ({ ...f, entry_fee: e.target.value }))}
                    className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-secondary block mb-1">Attendance XP</label>
                  <input
                    type="number"
                    value={circuitEventForm.attendance_xp}
                    onChange={e => setCircuitEventForm(f => ({ ...f, attendance_xp: e.target.value }))}
                    className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary"
                  />
                </div>
              </div>

              <button
                onClick={createCircuitEvent}
                disabled={circuitCreating || !circuitEventForm.store_id || !circuitEventForm.scheduled_at}
                className="bg-accent text-accent-fg text-sm font-medium px-6 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {circuitCreating ? 'Creating…' : 'Create Event'}
              </button>

              {qualifierEventId && (
                <p className="text-xs text-green-400 mt-3">
                  ✓ Event created (ID: <span className="font-mono">{qualifierEventId}</span>). Activate it in the Events tab, run your bracket, then record standings below.
                </p>
              )}
            </div>

            {/* Record standings */}
            <div className="bg-surface rounded-xl p-6 border border-border-token">
              <h2 className="font-semibold text-primary mb-1">Record Final Standings</h2>
              <p className="text-xs text-tertiary mb-4">After the qualifier event ends, add players in finish order. Top {qualifyCount} earn a Round 1 bye at the championship.</p>

              <div className="flex items-center gap-3 mb-4">
                <label className="text-xs font-medium text-secondary whitespace-nowrap">Qualify top</label>
                <input
                  type="number"
                  value={qualifyCount}
                  min={1} max={16}
                  onChange={e => { const n = parseInt(e.target.value); if (!isNaN(n)) setQualifyCount(n); }}
                  className="w-16 bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary"
                />
                <label className="text-xs font-medium text-secondary">players per store</label>
              </div>

              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={standingsSearch}
                    onChange={e => { setStandingsSearch(e.target.value); searchForStandings(e.target.value); }}
                    placeholder="Search player by name or HYP-ID…"
                    className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary"
                  />
                  {standingsSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-token rounded-xl shadow-xl z-20 overflow-hidden">
                      {standingsSearchResults.slice(0, 6).map((p: any) => (
                        <button
                          key={p.id}
                          onClick={() => addToStandings(p)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-elevated transition-colors border-b border-border-token last:border-0"
                        >
                          <div>
                            <div className="text-sm font-medium text-primary">{p.display_name}</div>
                            <div className="text-xs text-tertiary font-mono">{p.player_id}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {standings.length > 0 && (
                <div className="rounded-xl border border-border-token overflow-hidden mb-4">
                  {standings.map((s, i) => (
                    <div key={s.player_id} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-border-token' : ''}`}>
                      <span className="text-xs font-bold text-tertiary w-5">#{s.placement}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-primary">{s.display_name}</div>
                        <div className="text-xs text-tertiary font-mono">{s.player_display_id}</div>
                      </div>
                      {s.placement <= qualifyCount && (
                        <span className="text-xs text-green-400 font-medium">Qualifies ✓</span>
                      )}
                      <button
                        onClick={() => setStandings(prev => prev.filter(x => x.player_id !== s.player_id).map((x, idx) => ({ ...x, placement: idx + 1 })))}
                        className="text-xs text-tertiary hover:text-red-400 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {standings.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-secondary block mb-1">Qualifier Event ID</label>
                    <input
                      type="text"
                      value={qualifierEventId}
                      onChange={e => setQualifierEventId(e.target.value)}
                      placeholder="Event UUID from Events tab"
                      className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary font-mono"
                    />
                  </div>
                  <div className="pt-5">
                    <button
                      onClick={saveQualifiers}
                      disabled={savingQualifiers || !qualifierEventId || !circuitEventForm.store_id}
                      className="bg-accent text-accent-fg text-sm font-medium px-6 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {savingQualifiers ? 'Saving…' : `Save ${Math.min(standings.length, qualifyCount)} qualifiers`}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-xl">

            {/* Currency */}
            <div className="bg-surface rounded-xl p-6 border border-border-token">
              <h2 className="font-semibold text-primary mb-1">Currency</h2>
              <p className="text-xs text-tertiary mb-5">What players earn throughout the app.</p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-secondary block mb-1">Store Name</label>
                  <input
                    type="text"
                    value={storeConfig.store_name}
                    onChange={e => setStoreConfig(c => ({ ...c, store_name: e.target.value }))}
                    className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-secondary block mb-1">
                    Currency Name
                    <span className="ml-2 font-normal text-tertiary">What players earn and spend</span>
                  </label>
                  <input
                    type="text"
                    value={storeConfig.currency_name}
                    onChange={e => setStoreConfig(c => ({ ...c, currency_name: e.target.value }))}
                    placeholder="Points"
                    className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary"
                  />
                  <p className="text-xs text-tertiary mt-1">
                    Examples: Points, Credits, Gold, Marks, Flux, Fragments
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-secondary block mb-1">
                    Currency Icon
                    <span className="ml-2 font-normal text-tertiary">Emoji or image shown next to balance</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIconPickerTarget(t => t === 'currency' ? null : 'currency')}
                        className="w-14 h-14 rounded-xl bg-elevated border-2 border-border-token hover:border-accent transition-colors flex items-center justify-center text-2xl"
                      >
                        <IconRenderer value={storeConfig.currency_icon} className="w-8 h-8 object-contain" />
                      </button>
                      {iconPickerTarget === 'currency' && (
                        <IconPicker
                          current={storeConfig.currency_icon}
                          onSelect={v => setStoreConfig(c => ({ ...c, currency_icon: v }))}
                          onClose={() => setIconPickerTarget(null)}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 bg-elevated px-4 py-2 rounded-full text-sm">
                      <IconRenderer value={storeConfig.currency_icon} className="w-5 h-5 object-contain" />
                      <span className="font-bold text-primary">1,250</span>
                      <span className="text-secondary">{storeConfig.currency_name}</span>
                    </div>
                    <span className="text-xs text-tertiary">← preview</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shop Page */}
            <div className="bg-surface rounded-xl p-6 border border-border-token">
              <h2 className="font-semibold text-primary mb-1">Shop Page</h2>
              <p className="text-xs text-tertiary mb-5">
                Controls the player-facing Prize Wall — title, redemption copy, and which filters appear.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-secondary block mb-1">Page Title</label>
                  <input
                    type="text"
                    value={storeConfig.shop_title}
                    onChange={e => setStoreConfig(c => ({ ...c, shop_title: e.target.value }))}
                    placeholder="Prize Wall"
                    className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-secondary block mb-1">
                    Redemption Description
                    <span className="ml-2 font-normal text-tertiary">
                      Fills in: "Spend your {storeConfig.currency_name} on ___"
                    </span>
                  </label>
                  <input
                    type="text"
                    value={storeConfig.shop_description}
                    onChange={e => setStoreConfig(c => ({ ...c, shop_description: e.target.value }))}
                    placeholder="avatar cosmetics"
                    className="w-full bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary"
                  />
                  <p className="text-xs text-tertiary mt-1">
                    Preview: &ldquo;Spend your {storeConfig.currency_name} on {storeConfig.shop_description || '…'}&rdquo;
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-secondary block mb-3">
                    Category Filters
                    <span className="ml-2 font-normal text-tertiary">Toggle and rename each filter tab</span>
                  </label>
                  <div className="space-y-2">
                    {storeConfig.shop_categories.map((cat, i) => (
                      <div key={cat.id} className="flex items-center gap-3 bg-elevated/50 rounded-lg px-3 py-2">
                        {/* Enable/disable toggle */}
                        <button
                          type="button"
                          onClick={() => setStoreConfig(c => ({
                            ...c,
                            shop_categories: c.shop_categories.map((x, j) =>
                              j === i ? { ...x, enabled: !x.enabled } : x
                            ),
                          }))}
                          className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                            cat.enabled ? 'bg-accent' : 'bg-elevated'
                          }`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                            cat.enabled ? 'left-4' : 'left-0.5'
                          }`} />
                        </button>
                        {/* Icon picker */}
                        <div className="relative flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setIconPickerTarget(t => t === i ? null : i)}
                            className="w-8 h-8 rounded-lg bg-elevated hover:border hover:border-accent transition-all flex items-center justify-center text-base"
                            title="Change icon"
                          >
                            <IconRenderer value={cat.icon} className="w-5 h-5 object-contain" />
                          </button>
                          {iconPickerTarget === i && (
                            <IconPicker
                              current={cat.icon}
                              onSelect={v => setStoreConfig(c => ({
                                ...c,
                                shop_categories: c.shop_categories.map((x, j) =>
                                  j === i ? { ...x, icon: v } : x
                                ),
                              }))}
                              onClose={() => setIconPickerTarget(null)}
                            />
                          )}
                        </div>
                        {/* Name input */}
                        <input
                          type="text"
                          value={cat.name}
                          onChange={e => setStoreConfig(c => ({
                            ...c,
                            shop_categories: c.shop_categories.map((x, j) =>
                              j === i ? { ...x, name: e.target.value } : x
                            ),
                          }))}
                          className="flex-1 bg-transparent text-sm text-primary border-b border-border-token focus:border-accent outline-none py-0.5"
                        />
                        <span className={`text-xs ${cat.enabled ? 'text-accent' : 'text-tertiary'}`}>
                          {cat.enabled ? 'visible' : 'hidden'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Player ID */}
            <div className="bg-surface rounded-xl p-6 border border-border-token">
              <h2 className="font-semibold text-primary mb-1">Player ID Prefix</h2>
              <p className="text-xs text-tertiary mb-5">
                The tag at the start of every player's ID. Keep it short and unique to your store.
              </p>
              <div>
                <label className="text-xs font-medium text-secondary block mb-1">
                  Prefix
                  <span className="ml-2 font-normal text-tertiary">2–5 letters, uppercase</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={storeConfig.player_id_prefix}
                    onChange={e => setStoreConfig(c => ({
                      ...c,
                      player_id_prefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5),
                    }))}
                    placeholder="HYP"
                    maxLength={5}
                    className="w-28 bg-input border border-border-token rounded-lg px-3 py-2 text-sm text-primary font-mono tracking-widest"
                  />
                  <span className="text-secondary text-sm font-mono">
                    {storeConfig.player_id_prefix || 'HYP'}-XXXXXX
                  </span>
                </div>
                <p className="text-xs text-tertiary mt-2">
                  Examples: HYP, GOM, MTG, GAM, TCG — shown in the welcome flow and on player profiles.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={saveStoreConfig}
                disabled={settingsSaving}
                className="bg-accent text-accent-fg text-sm font-medium px-6 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {settingsSaving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
