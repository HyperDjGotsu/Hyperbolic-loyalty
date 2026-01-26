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
      className="w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 border-slate-800"
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
    <div className="flex items-center gap-2">
      {friends.length > 0 && (
        <div className="flex -space-x-2">
          {friends.slice(0, 3).map(friend => (
            <MiniAvatar key={friend.id} avatar={friend.avatar} name={friend.name} />
          ))}
        </div>
      )}
      <span className="text-slate-400 text-xs">{text}</span>
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

  const handleShare = async () => {
    if (selectedFriends.size === 0) return;
    setSharing(true);
    await onShare(Array.from(selectedFriends));
    setSharing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-slate-900 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden border border-slate-700">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Share Event</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
          </div>
          <div className="mt-2 p-3 bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-xl">{event.game?.icon || '🎮'}</span>
              <div>
                <div className="text-white font-medium text-sm">{event.name}</div>
                <div className="text-slate-400 text-xs">{event.date} @ {event.time}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading friends...</div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">👥</div>
              <div className="text-slate-400">No friends yet</div>
              <div className="text-slate-500 text-sm">Add friends in the Community tab</div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-slate-400 text-xs mb-3">Select friends to share with:</div>
              {friends.map(friend => (
                <button
                  key={friend.odid}
                  onClick={() => toggleFriend(friend.odid)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                    selectedFriends.has(friend.odid)
                      ? 'bg-cyan-500/20 border border-cyan-500/50'
                      : 'bg-slate-800 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <MiniAvatar avatar={friend.avatar} name={friend.name} />
                  <span className="text-white flex-1 text-left">{friend.name}</span>
                  {selectedFriends.has(friend.odid) && (
                    <span className="text-cyan-400">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleShare}
            disabled={selectedFriends.size === 0 || sharing}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sharing ? 'Sharing...' : `Share with ${selectedFriends.size} friend${selectedFriends.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// Mini Calendar component for desktop
const MiniCalendar = ({ 
  events,
  selectedDate,
  onSelectDate 
}: { 
  events: CalendarEvent[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Get events for each day
  const getEventsForDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return events.filter(e => e.date === dateStr || e.date.includes(`${monthNames[currentMonth.getMonth()].slice(0,3)} ${day}`));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && 
           today.getMonth() === currentMonth.getMonth() && 
           today.getFullYear() === currentMonth.getFullYear();
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return selectedDate.getDate() === day && 
           selectedDate.getMonth() === currentMonth.getMonth() && 
           selectedDate.getFullYear() === currentMonth.getFullYear();
  };

  return (
    <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
        >
          ←
        </button>
        <h3 className="text-white font-bold">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button 
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
        >
          →
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-slate-500 text-xs font-medium py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before the 1st */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        
        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayEvents = getEventsForDay(day);
          const hasEvents = dayEvents.length > 0;
          
          return (
            <button
              key={day}
              onClick={() => {
                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                onSelectDate(isSelected(day) ? null : date);
              }}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all relative ${
                isSelected(day)
                  ? 'bg-cyan-500 text-white'
                  : isToday(day)
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                  : hasEvents
                  ? 'bg-slate-800 text-white hover:bg-slate-700'
                  : 'text-slate-500 hover:bg-slate-800/50'
              }`}
            >
              {day}
              {hasEvents && !isSelected(day) && (
                <div className="absolute bottom-1 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((e, idx) => (
                    <div 
                      key={idx}
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: e.game?.color || '#64748b' }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Clear filter button */}
      {selectedDate && (
        <button
          onClick={() => onSelectDate(null)}
          className="w-full mt-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          Clear date filter
        </button>
      )}
    </div>
  );
};

// Stream buttons component
const StreamButtons = ({ event }: { event: CalendarEvent }) => {
  if (!event.hasStream) return null;
  
  return (
    <div className="flex gap-2">
      {event.twitchUrl && (
        <a 
          href={event.twitchUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 text-white rounded-lg"
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
          className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded-lg"
          onClick={(e) => e.stopPropagation()}
        >
          ▶️ YouTube
        </a>
      )}
      {!event.twitchUrl && !event.youtubeUrl && (
        <span className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded-lg">
          📺 Stream
        </span>
      )}
    </div>
  );
};

function EventsPageContent() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [togglingInterest, setTogglingInterest] = useState<string | null>(null);
  const [shareEvent, setShareEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const searchParams = useSearchParams();

  // Check for desktop
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Check for event ID in URL params
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
      const res = await fetch('/api/events?status=upcoming&limit=50');
      const data = await res.json();
      
      if (res.ok) {
        setEvents(data.events || []);
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
  }, []);

  // Sync from Google Calendar
  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    
    try {
      const res = await fetch('/api/events/sync', { method: 'POST' });
      const data = await res.json();
      
      if (res.ok) {
        setSyncMessage(`✅ ${data.message}`);
        await loadEvents();
      } else {
        setSyncMessage(`❌ ${data.error || 'Sync failed'}`);
      }
    } catch (err) {
      setSyncMessage('❌ Sync failed - check console');
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
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

  // Filter events
  const filteredEvents = events.filter(event => {
    // Game filter
    if (selectedGame !== 'all' && event.game?.id !== selectedGame) {
      return false;
    }
    // Date filter
    if (selectedDate) {
      const eventDate = new Date(event.scheduledAt);
      if (eventDate.toDateString() !== selectedDate.toDateString()) {
        return false;
      }
    }
    return true;
  });

  // Group events by date
  const groupedEvents = filteredEvents.reduce((groups, event) => {
    const date = event.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {} as Record<string, CalendarEvent[]>);

  // Desktop Event Card (wider, more info)
  const DesktopEventCard = ({ event }: { event: CalendarEvent }) => (
    <div 
      onClick={() => setSelectedEvent(event)}
      className={`bg-[#0d0d14] rounded-xl overflow-hidden border cursor-pointer hover:border-slate-600 transition-all ${
        event.isLive ? 'border-red-500/50' : event.isStartingSoon ? 'border-yellow-500/50' : 'border-[#1e1e2e]'
      }`}
    >
      <div 
        className="p-4 border-l-4" 
        style={{ borderLeftColor: event.game?.color || '#64748b' }}
      >
        <div className="flex items-center gap-4">
          {/* Game Icon */}
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ backgroundColor: `${event.game?.color || '#64748b'}20` }}
          >
            {event.game?.icon || '🎮'}
          </div>
          
          {/* Event Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-bold text-lg">{event.name}</span>
              {event.isLive && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">LIVE</span>
              )}
              {event.isStartingSoon && !event.isLive && (
                <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs rounded-full">SOON</span>
              )}
              {event.hasStream && <StreamButtons event={event} />}
            </div>
            <div className="text-slate-400 text-sm">{event.time}</div>
            
            {/* Friends interested - inline on desktop */}
            {(event.interestedFriends?.length > 0 || event.interestedCount > 0) && (
              <div className="mt-2">
                <FriendsInterested 
                  friends={event.interestedFriends || []} 
                  totalCount={event.interestedCount} 
                />
              </div>
            )}
          </div>
          
          {/* Price & Actions */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className={`font-bold text-lg ${event.isFree ? 'text-green-400' : 'text-cyan-400'}`}>
                {event.entryFee}
              </div>
              {event.hasStream && <div className="text-purple-400 text-xs">📺 Streamed</div>}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleInterest(event.id);
                }}
                disabled={togglingInterest === event.id}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  event.isInterested
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {togglingInterest === event.id ? '...' : event.isInterested ? '✓ Interested' : '⭐ Interested?'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShareEvent(event);
                }}
                className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600"
              >
                📤 Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile Event Card (original)
  const MobileEventCard = ({ event }: { event: CalendarEvent }) => (
    <div 
      onClick={() => setSelectedEvent(event)}
      className={`bg-slate-800/50 rounded-xl overflow-hidden border cursor-pointer hover:border-slate-600 transition-all ${
        event.isLive ? 'border-red-500/50' : event.isStartingSoon ? 'border-yellow-500/50' : 'border-slate-700/50'
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
            <div className="flex items-center gap-2">
              <span className="text-white font-bold truncate">{event.name}</span>
              {event.isLive && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">LIVE</span>
              )}
              {event.isStartingSoon && !event.isLive && (
                <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs rounded-full">SOON</span>
              )}
            </div>
            <div className="text-slate-400 text-sm">{event.time}</div>
            
            <FriendsInterested 
              friends={event.interestedFriends || []} 
              totalCount={event.interestedCount} 
            />
          </div>
          <div className="text-right">
            <div className="text-cyan-400 font-bold">{event.entryFee}</div>
            {event.hasStream && <div className="text-purple-400 text-xs mt-1">📺 Stream</div>}
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleInterest(event.id);
            }}
            disabled={togglingInterest === event.id}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              event.isInterested
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {togglingInterest === event.id ? '...' : event.isInterested ? '✓ Interested' : '⭐ Interested?'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShareEvent(event);
            }}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600"
          >
            📤 Share
          </button>
        </div>
      </div>
    </div>
  );

  // Event Detail Modal (same for both)
  const EventDetailModal = ({ event, onClose }: { event: CalendarEvent; onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        {/* Header */}
        <div 
          className="relative p-6 pb-4"
          style={{ background: `linear-gradient(135deg, ${event.game?.color || '#3b82f6'}40, transparent)` }}
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-slate-800/80 rounded-full flex items-center justify-center text-slate-400 hover:text-white"
          >
            ×
          </button>
          
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
              style={{ backgroundColor: `${event.game?.color || '#64748b'}30` }}
            >
              {event.game?.icon || '🎮'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{event.name}</h2>
              <div className="text-slate-300">{event.game?.name || 'General Event'}</div>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Date & Time */}
          <div className="flex gap-4">
            <div className="flex-1 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-slate-500 text-xs mb-1">DATE</div>
              <div className="text-white font-bold">{event.date}</div>
            </div>
            <div className="flex-1 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-slate-500 text-xs mb-1">TIME</div>
              <div className="text-white font-bold">{event.time}</div>
            </div>
          </div>
          
          {/* Entry Fee & Spots */}
          <div className="flex gap-4">
            <div className="flex-1 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl p-4 border border-cyan-500/20">
              <div className="text-slate-500 text-xs mb-1">ENTRY FEE</div>
              <div className={`text-xl font-bold ${event.isFree ? 'text-green-400' : 'text-cyan-400'}`}>
                {event.entryFee}
              </div>
            </div>
            <div className="flex-1 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-slate-500 text-xs mb-1">SPOTS</div>
              <div className="text-white font-bold text-lg">{event.maxSpots || 'Open'}</div>
            </div>
          </div>
          
          {/* XP Rewards */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl p-4 border border-cyan-500/20">
            <div className="text-slate-400 text-xs mb-2">XP REWARDS</div>
            <div className="flex justify-around">
              <div className="text-center">
                <div className="text-cyan-400 font-bold text-xl">+{event.attendanceXp}</div>
                <div className="text-slate-500 text-xs">Attendance</div>
              </div>
              <div className="text-center">
                <div className="text-purple-400 font-bold text-xl">+{event.winXp}</div>
                <div className="text-slate-500 text-xs">Per Win</div>
              </div>
            </div>
          </div>
          
          {/* Friends interested */}
          {(event.interestedFriends?.length > 0 || event.interestedCount > 0) && (
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
              <div className="text-purple-400 font-bold mb-2">⭐ {event.interestedCount} Interested</div>
              {event.interestedFriends?.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {event.interestedFriends.slice(0, 5).map(friend => (
                      <MiniAvatar key={friend.id} avatar={friend.avatar} name={friend.name} />
                    ))}
                  </div>
                  <span className="text-slate-400 text-sm">
                    {event.interestedFriends.map(f => f.name).join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Description */}
          {event.description && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-slate-500 text-xs mb-2">DESCRIPTION</div>
              <div className="text-slate-300 text-sm whitespace-pre-wrap">{event.description}</div>
            </div>
          )}
          
          {/* Stream */}
          {event.hasStream && (
            <div className="bg-gradient-to-r from-purple-600/20 to-red-600/20 rounded-xl p-4 border border-purple-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-bold">Watch Live!</div>
                  <div className="text-slate-400 text-sm">This event will be streamed</div>
                </div>
                <StreamButtons event={event} />
              </div>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex gap-2">
            <button 
              onClick={() => toggleInterest(event.id)}
              disabled={togglingInterest === event.id}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                event.isInterested
                  ? 'bg-slate-700 text-slate-300 border-2 border-slate-600'
                  : 'text-white'
              }`}
              style={!event.isInterested ? { 
                background: `linear-gradient(135deg, ${event.game?.color || '#3b82f6'}, ${event.game?.color || '#3b82f6'}cc)`,
              } : undefined}
            >
              {togglingInterest === event.id ? '...' : event.isInterested ? '✓ Interested' : '⭐ I\'m Interested'}
            </button>
            <button
              onClick={() => setShareEvent(event)}
              className="px-6 py-3 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600"
            >
              📤
            </button>
          </div>
          <p className="text-slate-500 text-xs text-center mt-2">Registration handled in-store</p>
        </div>
      </div>
    </div>
  );

  // Render
  return (
    <div className="min-h-screen bg-[#07070b]">
      {/* Header */}
      <div className="border-b border-[#1e1e2e] bg-[#07070b]/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Events</h1>
              <p className="text-slate-400 text-sm">Tap to see details</p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2"
            >
              {syncing ? '🔄 Syncing...' : '🔄 Sync'}
            </button>
          </div>
          
          {syncMessage && (
            <div className={`mb-4 p-2 rounded-lg text-sm ${
              syncMessage.startsWith('✅') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {syncMessage}
            </div>
          )}
          
          {/* Game Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-wrap lg:overflow-visible">
            {GAME_FILTERS.map(game => (
              <button
                key={game.id}
                onClick={() => setSelectedGame(game.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
                  selectedGame === game.id
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <span>{game.icon}</span>
                <span>{game.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4 animate-bounce">📅</div>
            <div className="text-slate-400">Loading events...</div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">❌</div>
            <div className="text-white font-bold">Failed to load events</div>
            <div className="text-slate-500 text-sm mt-2">{error}</div>
            <button onClick={() => loadEvents()} className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded-lg">
              Retry
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <div className="text-white font-bold">No upcoming events</div>
            <div className="text-slate-500 text-sm mt-2">
              Tap Sync to pull from Google Calendar
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded-lg disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : '🔄 Sync from Calendar'}
            </button>
          </div>
        ) : (
          <div className={`${isDesktop ? 'flex gap-6' : ''}`}>
            {/* Calendar sidebar - desktop only */}
            {isDesktop && (
              <div className="w-80 shrink-0">
                <div className="sticky top-32">
                  <MiniCalendar 
                    events={events} 
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                  />
                  
                  {/* Quick stats */}
                  <div className="mt-4 bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-4">
                    <h3 className="text-white font-bold mb-3">This Week</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-cyan-400">{events.length}</div>
                        <div className="text-slate-500 text-xs">Events</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          {events.filter(e => e.isInterested).length}
                        </div>
                        <div className="text-slate-500 text-xs">Interested</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Events list */}
            <div className="flex-1 space-y-6">
              {Object.entries(groupedEvents).length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🔍</div>
                  <div className="text-white font-bold">No events match your filters</div>
                  <div className="text-slate-500 text-sm mt-2">
                    Try selecting a different game or clearing the date filter
                  </div>
                </div>
              ) : (
                Object.entries(groupedEvents).map(([date, dateEvents]) => (
                  <div key={date}>
                    <h2 className="text-slate-400 text-sm font-medium mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                      {date}
                    </h2>
                    <div className="space-y-3">
                      {dateEvents.map(event => (
                        isDesktop 
                          ? <DesktopEventCard key={event.id} event={event} />
                          : <MobileEventCard key={event.id} event={event} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      {shareEvent && <ShareModal event={shareEvent} onClose={() => setShareEvent(null)} onShare={handleShareEvent} />}
    </div>
  );
}

// Loading fallback
function EventsLoading() {
  return (
    <div className="min-h-screen bg-[#07070b] p-4">
      <div className="animate-pulse max-w-7xl mx-auto">
        <div className="h-8 bg-slate-800 rounded w-48 mb-4"></div>
        <div className="h-10 bg-slate-800 rounded mb-4"></div>
        <div className="flex gap-6">
          <div className="w-80 h-96 bg-slate-800 rounded-2xl hidden lg:block"></div>
          <div className="flex-1 space-y-4">
            <div className="h-24 bg-slate-800 rounded-xl"></div>
            <div className="h-24 bg-slate-800 rounded-xl"></div>
            <div className="h-24 bg-slate-800 rounded-xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap in Suspense
export default function EventsPage() {
  return (
    <Suspense fallback={<EventsLoading />}>
      <EventsPageContent />
    </Suspense>
  );
}
