'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface GameInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface FriendInterest {
  id: string;
  name: string;
  avatar: any;
}

interface CalendarEvent {
  id: string;
  name: string;
  description: string | null;
  date: string;
  time: string;
  scheduledAt: string;
  endsAt: string | null;
  game: GameInfo | null;
  spots: number | null;
  maxSpots: number | null;
  currentPlayers: number;
  entryFee: string;
  isFree: boolean;
  passFreeEntry: boolean;
  status: string;
  hasStream: boolean;
  twitchUrl: string | null;
  youtubeUrl: string | null;
  attendanceXp: number;
  winXp: number;
  interestedCount: number;
  isInterested: boolean;
  interestedFriends: FriendInterest[];
  isStartingSoon: boolean;
  isLive: boolean;
  prizing: string[] | null;
  isNetworkEvent: boolean;
}

interface Friend {
  id: string;
  odid: string;
  name: string;
  avatar: any;
}

// Game filter options
const GAME_FILTERS = [
  { id: 'all', name: 'All Games', icon: '🎮' },
  { id: 'one_piece', name: 'One Piece', icon: '🏴‍☠️' },
  { id: 'gundam', name: 'Gundam', icon: '🤖' },
  { id: 'pokemon', name: 'Pokémon', icon: '⚡' },
  { id: 'mtg', name: 'Magic', icon: '✨' },
  { id: 'star_wars_unlimited', name: 'Star Wars', icon: '🌟' },
  { id: 'vanguard', name: 'Vanguard', icon: '⚔️' },
  { id: 'lorcana', name: 'Lorcana', icon: '🪄' },
  { id: 'hololive', name: 'Hololive', icon: '🎤' },
  { id: 'riftbound', name: 'Riftbound', icon: '🌀' },
  { id: 'uvs', name: 'UVS', icon: '👊' },
  { id: 'warhammer', name: 'Warhammer', icon: '⚔️' },
  { id: 'sw_legion', name: 'Legion', icon: '🎖️' },
];

// Mini avatar component
const MiniAvatar = ({ avatar, name }: { avatar: any; name: string }) => {
  const bg = avatar?.background || '#3b82f6';
  const emoji = avatar?.base || '😎';
  const photoUrl = avatar?.photo_url || avatar?.photoUrl;
  
  return (
    <div 
      className="w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 border-border-token"
      style={{ backgroundColor: bg }}
      title={name}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={name} className="w-full h-full rounded-full object-cover" />
      ) : (
        emoji
      )}
    </div>
  );
};

// Friends interested display
const FriendsInterested = ({ friends, totalCount }: { friends: FriendInterest[]; totalCount: number }) => {
  if (friends.length === 0 && totalCount === 0) return null;
  
  const otherCount = totalCount - friends.length;
  
  // Build display text
  let text = '';
  if (friends.length === 1) {
    text = friends[0].name;
  } else if (friends.length === 2) {
    text = `${friends[0].name} & ${friends[1].name}`;
  } else if (friends.length > 2) {
    text = `${friends[0].name}, ${friends[1].name}`;
  }
  
  if (otherCount > 0 && friends.length > 0) {
    text += ` + ${otherCount} other${otherCount > 1 ? 's' : ''}`;
  } else if (otherCount > 0 && friends.length === 0) {
    text = `${totalCount} interested`;
  }
  
  return (
    <div className="flex items-center gap-2 mt-2">
      {/* Friend avatars (max 3) */}
      {friends.length > 0 && (
        <div className="flex -space-x-2">
          {friends.slice(0, 3).map(friend => (
            <MiniAvatar key={friend.id} avatar={friend.avatar} name={friend.name} />
          ))}
        </div>
      )}
      <span className="text-secondary text-xs">{text}</span>
    </div>
  );
};

// Share modal component
const ShareModal = ({ 
  event, 
  onClose,
  onShare,
}: { 
  event: CalendarEvent; 
  onClose: () => void;
  onShare: (friendIds: string[]) => void;
}) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'friends'>('link');

  const publicUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/event/${event.id}`
    : '';

  useEffect(() => {
    async function loadFriends() {
      try {
        const res = await fetch('/api/community/friends');
        if (res.ok) {
          const data = await res.json();
          setFriends(data.friends || []);
        }
      } catch (error) {
        console.error('Error loading friends:', error);
      } finally {
        setLoading(false);
      }
    }
    loadFriends();
  }, []);

  const toggleFriend = (odid: string) => {
    setSelectedFriends(prev => {
      const next = new Set(prev);
      if (next.has(odid)) {
        next.delete(odid);
      } else {
        next.add(odid);
      }
      return next;
    });
  };

  const handleShareWithFriends = async () => {
    if (selectedFriends.size === 0) return;
    setSharing(true);
    await onShare(Array.from(selectedFriends));
    setSharing(false);
    onClose();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.name,
          text: `Check out this event at Games of Martinez: ${event.name} on ${event.date} @ ${event.time}`,
          url: publicUrl,
        });
      } catch (err) {
        // User cancelled - do nothing
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden border border-border-token">
        {/* Header */}
        <div className="p-4 border-b border-border-token">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-primary">Share Event</h3>
            <button onClick={onClose} className="text-secondary hover:text-primary text-2xl">×</button>
          </div>
          <div className="mt-2 p-3 bg-elevated rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-xl">{event.game?.icon || '🎮'}</span>
              <div>
                <div className="text-primary font-medium text-sm">{event.name}</div>
                <div className="text-secondary text-xs">{event.date} @ {event.time}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-token">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'link'
                ? 'text-accent border-b-2 border-cyan-400'
                : 'text-secondary hover:text-primary'
            }`}
          >
            🔗 Share Link
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'friends'
                ? 'text-accent border-b-2 border-cyan-400'
                : 'text-secondary hover:text-primary'
            }`}
          >
            👥 Share with Friends
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'link' ? (
          <div className="p-4">
            <div className="text-secondary text-sm mb-3">Share this event with anyone:</div>
            
            {/* Link preview */}
            <div className="bg-elevated rounded-lg p-3 mb-4">
              <div className="text-secondary text-xs mb-1">Public Link</div>
              <div className="text-primary text-sm break-all font-mono">{publicUrl}</div>
            </div>

            {/* Share buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 py-3 bg-elevated text-primary font-medium rounded-xl hover:bg-elevated transition-colors"
              >
                {copied ? '✅ Copied!' : '📋 Copy Link'}
              </button>
              <button
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-2 py-3 bg-accent text-accent-fg font-medium rounded-xl hover:opacity-90 transition-opacity"
              >
                📤 Share
              </button>
            </div>

            {/* Social hints */}
            <div className="mt-4 text-center text-secondary text-xs">
              Share via text, social media, or any app!
            </div>
          </div>
        ) : (
          <>
            {/* Friend list */}
            <div className="p-4 overflow-y-auto max-h-[40vh]">
              {loading ? (
                <div className="text-center py-8 text-secondary">Loading friends...</div>
              ) : friends.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">👥</div>
                  <div className="text-secondary">No friends yet</div>
                  <div className="text-secondary text-sm">Add friends in the Community tab</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-secondary text-xs mb-3">Select friends to notify:</div>
                  {friends.map(friend => (
                    <button
                      key={friend.odid}
                      onClick={() => toggleFriend(friend.odid)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                        selectedFriends.has(friend.odid)
                          ? 'bg-accent/10 border border-accent/50'
                          : 'bg-elevated border border-border-token hover:border-border-token'
                      }`}
                    >
                      <MiniAvatar avatar={friend.avatar} name={friend.name} />
                      <span className="text-primary flex-1 text-left">{friend.name}</span>
                      {selectedFriends.has(friend.odid) && (
                        <span className="text-accent">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-border-token">
              <button
                onClick={handleShareWithFriends}
                disabled={selectedFriends.size === 0 || sharing}
                className="w-full py-3 bg-accent text-accent-fg font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sharing ? 'Sharing...' : `Share with ${selectedFriends.size} friend${selectedFriends.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

function EventsPageContent() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarScope, setCalendarScope] = useState<'store' | 'network'>('store');
  const [selectedGame, setSelectedGame] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [togglingInterest, setTogglingInterest] = useState<string | null>(null);
  const [shareEvent, setShareEvent] = useState<CalendarEvent | null>(null);
  const searchParams = useSearchParams();

  // Check for event ID in URL params (from notification click)
  useEffect(() => {
    const eventId = searchParams.get('event');
    if (eventId && events.length > 0) {
      const event = events.find(e => e.id === eventId);
      if (event) {
        setSelectedEvent(event);
      }
    }
  }, [searchParams, events]);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const networkParam = calendarScope === 'network' ? '&network=true' : '';
      const storeId = calendarScope === 'store' ? localStorage.getItem('ggc_selected_store_id') : null;
      const storeParam = storeId ? `&store_id=${storeId}` : '';
      const res = await fetch(`/api/events?status=upcoming&limit=50${storeParam}${networkParam}`);
      const data = await res.json();
      
      if (res.ok) {
        let filteredEvents = data.events || [];
        
        // Client-side game filter
        if (selectedGame !== 'all') {
          filteredEvents = filteredEvents.filter(
            (e: CalendarEvent) => e.game?.id === selectedGame
          );
        }
        
        setEvents(filteredEvents);
      } else {
        setError(data.error || 'Failed to load events');
      }
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [selectedGame, calendarScope]);

  // Sync from Google Calendar
  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      await loadEvents();
      setSyncMessage('✅ Events refreshed');
    } catch (err) {
      setSyncMessage('❌ Refresh failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 3000);
    }
  };

  // Toggle interest in event
  const toggleInterest = async (eventId: string) => {
    setTogglingInterest(eventId);
    
    try {
      const res = await fetch('/api/events/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      
      if (res.ok) {
        setEvents(prev => prev.map(e => {
          if (e.id === eventId) {
            return {
              ...e,
              isInterested: !e.isInterested,
              interestedCount: e.isInterested ? e.interestedCount - 1 : e.interestedCount + 1,
            };
          }
          return e;
        }));
        
        if (selectedEvent?.id === eventId) {
          setSelectedEvent(prev => prev ? {
            ...prev,
            isInterested: !prev.isInterested,
            interestedCount: prev.isInterested ? prev.interestedCount - 1 : prev.interestedCount + 1,
          } : null);
        }
      }
    } catch (err) {
      console.error('Error toggling interest:', err);
    } finally {
      setTogglingInterest(null);
    }
  };

  // Share event with friends
  const handleShareEvent = async (friendIds: string[]) => {
    if (!shareEvent) return;
    
    try {
      const res = await fetch('/api/events/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventId: shareEvent.id,
          friendIds,
        }),
      });
      
      if (res.ok) {
        setSyncMessage('✅ Event shared!');
        setTimeout(() => setSyncMessage(null), 3000);
      } else {
        setSyncMessage('❌ Failed to share event');
        setTimeout(() => setSyncMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error sharing event:', err);
      setSyncMessage('❌ Failed to share event');
      setTimeout(() => setSyncMessage(null), 3000);
    }
  };

  // Group events by date
  const groupedEvents = events.reduce((groups, event) => {
    const date = event.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {} as Record<string, CalendarEvent[]>);

  const StreamButtons = ({ event }: { event: CalendarEvent }) => {
    if (!event.hasStream) return null;
    
    return (
      <div className="flex gap-2">
        {event.twitchUrl && (
          <a 
            href={event.twitchUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 text-primary rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            📺 Twitch
            {event.isLive && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
          </a>
        )}
        {event.youtubeUrl && (
          <a 
            href={event.youtubeUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-primary rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            ▶️ YouTube
          </a>
        )}
        {!event.twitchUrl && !event.youtubeUrl && (
          <span className="flex items-center gap-1 px-2 py-1 text-xs bg-elevated text-primary rounded-lg">
            📺 Stream TBD
          </span>
        )}
      </div>
    );
  };

  const EventCard = ({ event }: { event: CalendarEvent }) => (
    <div 
      onClick={() => setSelectedEvent(event)}
      className={`bg-elevated/50 rounded-xl overflow-hidden border cursor-pointer hover:border-border-token transition-all ${
        event.isLive ? 'border-red-500/50' : event.isStartingSoon ? 'border-yellow-500/50' : 'border-border-token'
      }`}
    >
      <div 
        className="p-4 border-l-4" 
        style={{ borderLeftColor: event.game?.color || '#64748b' }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${event.game?.color || '#64748b'}20` }}
          >
            {event.game?.icon || '🎮'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-primary font-bold truncate">{event.name}</span>
              {event.isNetworkEvent && (
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30 whitespace-nowrap">🌐 GGC Network</span>
              )}
              {event.isLive && (
                <span className="px-2 py-0.5 bg-red-500 text-primary text-xs rounded-full animate-pulse">LIVE</span>
              )}
              {event.isStartingSoon && !event.isLive && (
                <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs rounded-full">SOON</span>
              )}
            </div>
            <div className="text-secondary text-sm">{event.time}</div>
            
            {/* Friends interested */}
            <FriendsInterested 
              friends={event.interestedFriends || []} 
              totalCount={event.interestedCount} 
            />
          </div>
          <div className="text-right">
            <div className="text-accent font-bold">{event.entryFee}</div>
            {event.hasStream && <div className="text-purple-400 text-xs mt-1">📺 Stream</div>}
          </div>
        </div>
        
        {/* Quick action buttons */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-token">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleInterest(event.id);
            }}
            disabled={togglingInterest === event.id}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              event.isInterested
                ? 'bg-accent/10 text-accent border border-accent/50'
                : 'bg-elevated text-primary hover:bg-elevated'
            }`}
          >
            {togglingInterest === event.id ? '...' : event.isInterested ? '✓ Interested' : '⭐ Interested?'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShareEvent(event);
            }}
            className="px-4 py-2 bg-elevated text-primary rounded-lg text-sm hover:bg-elevated"
          >
            📤 Share
          </button>
        </div>
      </div>
    </div>
  );

  const EventDetailModal = ({ event, onClose }: { event: CalendarEvent; onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-surface rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="relative p-6 pb-4">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-elevated/80 rounded-full flex items-center justify-center text-secondary hover:text-primary"
          >
            ×
          </button>
          
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ backgroundColor: `${event.game?.color || '#3b82f6'}30` }}
            >
              {event.game?.icon || '🎮'}
            </div>
            <div>
              <div className="text-primary font-bold text-xl">{event.name}</div>
              <div className="text-secondary">{event.game?.name || 'General'}</div>
              {event.isLive && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-red-500 text-primary text-xs rounded-full animate-pulse">
                  🔴 LIVE NOW
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Details */}
        <div className="p-4 space-y-4">
          {/* Date & Time */}
          <div className="bg-elevated/50 rounded-xl p-4 border border-border-token">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-2xl">📅</div>
              <div>
                <div className="text-primary font-bold">{event.date}</div>
                <div className="text-secondary">{event.time}</div>
              </div>
            </div>
          </div>
          
          {/* Entry & Spots */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-elevated/50 rounded-xl p-4 border border-border-token text-center">
              <div className="text-2xl mb-1">💰</div>
              <div className="text-secondary text-xs">Entry Fee</div>
              <div className="text-primary font-bold text-lg">{event.entryFee}</div>
              {event.passFreeEntry && (
                <div className="text-yellow-400 text-xs mt-1">👑 Free with Pass</div>
              )}
            </div>
            <div className="bg-elevated/50 rounded-xl p-4 border border-border-token text-center">
              <div className="text-2xl mb-1">👥</div>
              <div className="text-secondary text-xs">Capacity</div>
              <div className="text-primary font-bold text-lg">{event.maxSpots || 'Open'}</div>
            </div>
          </div>
          
          {/* Friends interested */}
          {(event.interestedFriends?.length > 0 || event.interestedCount > 0) && (
            <div className="bg-elevated/50 rounded-xl p-4 border border-border-token">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⭐</span>
                <div className="flex-1">
                  <div className="text-purple-400 font-bold">{event.interestedCount} Interested</div>
                  {event.interestedFriends?.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex -space-x-2">
                        {event.interestedFriends.slice(0, 5).map(friend => (
                          <MiniAvatar key={friend.id} avatar={friend.avatar} name={friend.name} />
                        ))}
                      </div>
                      <span className="text-secondary text-sm">
                        {event.interestedFriends.map(f => f.name).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* XP Rewards */}
          <div className="bg-elevated/50 rounded-xl p-4 border border-border-token">
            <div className="text-secondary text-xs mb-2">XP REWARDS</div>
            <div className="flex justify-around">
              <div className="text-center">
                <div className="text-accent font-bold text-xl">+{event.attendanceXp}</div>
                <div className="text-secondary text-xs">Attendance</div>
              </div>
              <div className="text-center">
                <div className="text-purple-400 font-bold text-xl">+{event.winXp}</div>
                <div className="text-secondary text-xs">Per Win</div>
              </div>
            </div>
          </div>
          
          {/* Prizing */}
          {event.prizing && event.prizing.length > 0 && (
            <div className="bg-elevated/50 rounded-xl p-4 border border-yellow-500/20">
              <div className="text-secondary text-xs mb-2">PRIZES</div>
              <div className="space-y-2">
                {event.prizing.map((prize, index) => {
                  const prizeInfo: Record<string, { icon: string; title: string; desc: string }> = {
                    'pack-per-win': { icon: '🎁', title: 'Pack Per Win', desc: 'Win a booster pack for each match victory' },
                    'packperwin': { icon: '🎁', title: 'Pack Per Win', desc: 'Win a booster pack for each match victory' },
                    '1-3-5': { icon: '🏆', title: '1-3-5 Packs', desc: '1 win = 1 pack • 2 wins = 3 packs • 3 wins = 5 packs' },
                    'promo': { icon: '🌟', title: 'Promo Card', desc: 'All participants receive a promo card' },
                  };
                  const info = prizeInfo[prize.toLowerCase()] || { icon: '🎁', title: prize, desc: '' };
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-xl">{info.icon}</span>
                      <div>
                        <div className="text-primary font-medium text-sm">{info.title}</div>
                        {info.desc && <div className="text-secondary text-xs">{info.desc}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Description */}
          {event.description && (
            <div className="bg-elevated/50 rounded-xl p-4 border border-border-token">
              <div className="text-secondary text-xs mb-2">DESCRIPTION</div>
              <div className="text-primary text-sm whitespace-pre-wrap">{event.description}</div>
            </div>
          )}
          
          {/* Stream */}
          {event.hasStream && (
            <div className="bg-elevated/50 rounded-xl p-4 border border-border-token">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-primary font-bold">Watch Live!</div>
                  <div className="text-secondary text-sm">This event will be streamed</div>
                </div>
                <StreamButtons event={event} />
              </div>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="p-4 space-y-2">
          <div className="flex gap-2">
            <button 
              onClick={() => toggleInterest(event.id)}
              disabled={togglingInterest === event.id}
              className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                event.isInterested
                  ? 'bg-elevated text-primary border-2 border-border-token'
                  : 'bg-accent text-accent-fg'
              }`}
            >
              {togglingInterest === event.id ? '...' : event.isInterested ? '✓ Interested' : '⭐ I\'m Interested'}
            </button>
            <button
              onClick={() => setShareEvent(event)}
              className="px-6 py-4 bg-elevated text-primary rounded-xl font-bold hover:bg-elevated"
            >
              📤
            </button>
          </div>
          <p className="text-secondary text-xs text-center">Registration handled in-store</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-sm border-b border-border-token">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-primary">Events</h1>
              <p className="text-secondary text-sm">Tap to see details</p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-3 py-1.5 bg-elevated text-primary rounded-lg text-sm hover:bg-elevated disabled:opacity-50"
            >
              {syncing ? '🔄 Syncing...' : '🔄 Sync'}
            </button>
          </div>
          
          {syncMessage && (
            <div className={`mt-2 p-2 rounded-lg text-sm ${
              syncMessage.startsWith('✅') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {syncMessage}
            </div>
          )}

          {/* Store / Network tabs */}
          <div className="flex gap-1 mt-3 bg-elevated rounded-lg p-1">
            <button
              onClick={() => setCalendarScope('store')}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                calendarScope === 'store' ? 'bg-surface text-primary shadow-sm' : 'text-tertiary hover:text-secondary'
              }`}
            >
              My Store
            </button>
            <button
              onClick={() => setCalendarScope('network')}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                calendarScope === 'network' ? 'bg-surface text-primary shadow-sm' : 'text-tertiary hover:text-secondary'
              }`}
            >
              Network
            </button>
          </div>
        </div>

        {/* Game Filter */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {GAME_FILTERS.map(game => (
            <button
              key={game.id}
              onClick={() => setSelectedGame(game.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
                selectedGame === game.id
                  ? 'bg-accent text-accent-fg'
                  : 'bg-elevated text-secondary hover:bg-elevated'
              }`}
            >
              <span>{game.icon}</span>
              <span>{game.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4 animate-bounce">📅</div>
            <div className="text-secondary">Loading events...</div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">❌</div>
            <div className="text-primary font-bold">Failed to load events</div>
            <div className="text-secondary text-sm mt-2">{error}</div>
            <button onClick={() => loadEvents()} className="mt-4 px-4 py-2 bg-accent text-primary rounded-lg">
              Retry
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <div className="text-primary font-bold">No upcoming events</div>
            <div className="text-secondary text-sm mt-2">
              {selectedGame !== 'all' ? 'Try selecting "All Games" to see more events' : calendarScope === 'network' ? 'No company events scheduled yet' : 'Tap Sync to pull from Google Calendar'}
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="mt-4 px-4 py-2 bg-accent text-primary rounded-lg disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : '🔄 Sync from Calendar'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedEvents).map(([date, dateEvents]) => (
              <div key={date}>
                <h2 className="text-secondary text-sm font-medium mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-accent rounded-full"></span>
                  {date}
                </h2>
                <div className="space-y-3">
                  {dateEvents.map(event => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      {shareEvent && <ShareModal event={shareEvent} onClose={() => setShareEvent(null)} onShare={handleShareEvent} />}
    </div>
  );
}

// Loading fallback for Suspense
function EventsLoading() {
  return (
    <div className="min-h-screen bg-base p-4">
      <div className="animate-pulse">
        <div className="h-8 bg-elevated rounded w-48 mb-4"></div>
        <div className="h-32 bg-elevated rounded mb-4"></div>
        <div className="h-32 bg-elevated rounded mb-4"></div>
        <div className="h-32 bg-elevated rounded"></div>
      </div>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function MobileEvents() {
  return (
    <Suspense fallback={<EventsLoading />}>
      <EventsPageContent />
    </Suspense>
  );
}
