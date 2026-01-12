'use client';

import React, { useState, useEffect } from 'react';
import { FloatingParticles } from '@/components/ui';

interface GameInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
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
  isStartingSoon: boolean;
  isLive: boolean;
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

export default function EventsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [togglingInterest, setTogglingInterest] = useState<string | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/events?status=upcoming&limit=50');
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
  }, [selectedGame]);

  // Sync from Google Calendar
  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    
    try {
      const res = await fetch('/api/events/sync', { method: 'POST' });
      const data = await res.json();
      
      if (res.ok) {
        setSyncMessage(`✅ ${data.message}`);
        // Reload events after sync
        await loadEvents();
      } else {
        setSyncMessage(`❌ ${data.error || 'Sync failed'}`);
      }
    } catch (err) {
      setSyncMessage('❌ Sync failed - check console');
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
      // Clear message after 5 seconds
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
        // Update local state
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
        
        // Also update selected event if open
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
            📺 Stream TBD
          </span>
        )}
      </div>
    );
  };

  const EventCard = ({ event }: { event: CalendarEvent }) => (
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
            style={{ backgroundColor: `${event.game?.color || '#64748b'}30` }}
          >
            {event.game?.icon || '🎮'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white truncate">{event.name}</h3>
              {event.isLive && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">
                  LIVE
                </span>
              )}
              {event.isStartingSoon && !event.isLive && (
                <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs rounded-full">
                  SOON
                </span>
              )}
            </div>
            <div className="text-slate-400 text-sm">{event.time}</div>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-700/50">
          <div className="flex gap-4 text-sm text-slate-400">
            <span>💰 {event.entryFee}</span>
            {event.maxSpots && (
              <span className={event.spots === 0 ? 'text-red-400' : 'text-cyan-400'}>
                👥 {event.spots !== null ? `${event.spots}/${event.maxSpots}` : event.maxSpots}
              </span>
            )}
            {event.interestedCount > 0 && (
              <span className="text-purple-400">⭐ {event.interestedCount}</span>
            )}
          </div>
          <StreamButtons event={event} />
        </div>
      </div>
    </div>
  );

  const EventDetailModal = ({ event, onClose }: { event: CalendarEvent; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <button onClick={onClose} className="text-slate-400">← Back</button>
        <h2 className="text-white font-bold">Event Details</h2>
        <div className="w-12" />
      </div>
      
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div 
          className="relative p-6"
          style={{ background: `linear-gradient(135deg, ${event.game?.color || '#64748b'}40, transparent)` }}
        >
          <FloatingParticles />
          <div className="relative text-center">
            <div className="text-5xl mb-4">{event.game?.icon || '🎮'}</div>
            <h1 className="text-2xl font-bold text-white">{event.name}</h1>
            <div className="text-slate-300 mt-2">{event.game?.name || 'General'}</div>
            {event.isLive && (
              <div className="mt-3 inline-block px-4 py-1 bg-red-500 text-white rounded-full animate-pulse">
                🔴 LIVE NOW
              </div>
            )}
          </div>
        </div>
        
        {/* Details */}
        <div className="p-4 space-y-4">
          {/* Date & Time */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center text-2xl">
                📅
              </div>
              <div>
                <div className="text-white font-bold">{event.date}</div>
                <div className="text-slate-400">{event.time}</div>
              </div>
            </div>
          </div>
          
          {/* Entry & Spots */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
              <div className="text-2xl mb-1">💰</div>
              <div className="text-slate-500 text-xs">Entry Fee</div>
              <div className="text-white font-bold text-lg">{event.entryFee}</div>
              {event.passFreeEntry && (
                <div className="text-yellow-400 text-xs mt-1">👑 Free with Pass</div>
              )}
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
              <div className="text-2xl mb-1">👥</div>
              <div className="text-slate-500 text-xs">Players</div>
              <div className="text-white font-bold text-lg">
                {event.maxSpots ? `${event.currentPlayers}/${event.maxSpots}` : 'Open'}
              </div>
              {event.spots === 0 && <div className="text-red-400 text-xs mt-1">FULL</div>}
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
          
          {/* Description */}
          {event.description && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-slate-500 text-xs mb-2">DESCRIPTION</div>
              <div className="text-slate-300 text-sm whitespace-pre-wrap">
                {event.description}
              </div>
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
          
          {/* Interest count */}
          {event.interestedCount > 0 && (
            <div className="text-center text-slate-500 text-sm">
              ⭐ {event.interestedCount} player{event.interestedCount !== 1 ? 's' : ''} interested
            </div>
          )}
        </div>
        
        {/* Action Button */}
        <div className="p-4">
          <button 
            onClick={() => toggleInterest(event.id)}
            disabled={togglingInterest === event.id}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              event.isInterested
                ? 'bg-slate-700 text-slate-300 border-2 border-slate-600'
                : 'text-white'
            }`}
            style={!event.isInterested ? { 
              background: `linear-gradient(135deg, ${event.game?.color || '#3b82f6'}, ${event.game?.color || '#3b82f6'}cc)`,
            } : undefined}
          >
            {togglingInterest === event.id 
              ? '...' 
              : event.isInterested 
                ? '✓ Interested' 
                : '⭐ I\'m Interested'
            }
          </button>
          <p className="text-slate-500 text-xs text-center mt-2">
            Registration handled in-store
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Events</h1>
              <p className="text-slate-400 text-sm">Tap to see details</p>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 disabled:opacity-50"
            >
              {syncing ? '🔄 Syncing...' : '🔄 Sync'}
            </button>
          </div>
          
          {/* Sync message */}
          {syncMessage && (
            <div className={`mt-2 p-2 rounded-lg text-sm ${
              syncMessage.startsWith('✅') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {syncMessage}
            </div>
          )}
        </div>
        
        {/* Game Filter */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
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

      {/* Content */}
      <div className="p-4">
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
            <button 
              onClick={() => loadEvents()}
              className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <div className="text-white font-bold">No upcoming events</div>
            <div className="text-slate-500 text-sm mt-2">
              {selectedGame !== 'all' 
                ? 'Try selecting "All Games" to see more events'
                : 'Tap Sync to pull from Google Calendar'
              }
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
          <div className="space-y-6">
            {Object.entries(groupedEvents).map(([date, dateEvents]) => (
              <div key={date}>
                <h2 className="text-slate-400 text-sm font-medium mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
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

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
        />
      )}
    </div>
  );
}
