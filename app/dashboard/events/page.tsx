'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { FloatingParticles, Avatar, GlowButton } from '@/components/ui';

interface GameInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Event {
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

export default function EventsPage() {
  const { user, isLoaded } = useUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [togglingInterest, setTogglingInterest] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events?status=${filter}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const toggleInterest = async (eventId: string) => {
    if (!user) {
      alert('Please sign in to mark interest');
      return;
    }

    setTogglingInterest(eventId);
    try {
      const res = await fetch('/api/events/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update local state
        setEvents(prev => prev.map(e => 
          e.id === eventId 
            ? { 
                ...e, 
                isInterested: data.isInterested,
                interestedCount: e.interestedCount + (data.isInterested ? 1 : -1)
              }
            : e
        ));
        // Update selected event if open
        if (selectedEvent?.id === eventId) {
          setSelectedEvent(prev => prev ? {
            ...prev,
            isInterested: data.isInterested,
            interestedCount: prev.interestedCount + (data.isInterested ? 1 : -1)
          } : null);
        }
      }
    } catch (error) {
      console.error('Error toggling interest:', error);
    } finally {
      setTogglingInterest(null);
    }
  };

  const StreamButtons = ({ event }: { event: Event }) => {
    if (!event.hasStream) return null;
    return (
      <div className="flex gap-2">
        {event.twitchUrl && (
          <a 
            href={event.twitchUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-500"
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
            className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-500"
          >
            ▶️ YouTube
          </a>
        )}
      </div>
    );
  };

  const EventCard = ({ event }: { event: Event }) => (
    <div 
      onClick={() => setSelectedEvent(event)}
      className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700/50 cursor-pointer hover:border-cyan-500/30 transition-colors"
    >
      <div 
        className="p-4 border-l-4" 
        style={{ borderLeftColor: event.game?.color || '#3b82f6' }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${event.game?.color || '#3b82f6'}30` }}
            >
              {event.game?.icon || '🎮'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white">{event.name}</h3>
                {event.isLive && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">
                    LIVE
                  </span>
                )}
                {event.isStartingSoon && !event.isLive && (
                  <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                    SOON
                  </span>
                )}
              </div>
              <div className="text-slate-400 text-sm">{event.date} @ {event.time}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-700/50">
          <div className="flex gap-4 text-sm">
            <span className="text-slate-400">
              💰 {event.entryFee}
              {event.passFreeEntry && <span className="text-yellow-400 ml-1">👑</span>}
            </span>
            {event.maxSpots && (
              <span className={event.spots === 0 ? 'text-red-400' : 'text-cyan-400'}>
                {event.spots === 0 ? 'FULL' : `${event.spots}/${event.maxSpots} spots`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm">
              {event.interestedCount} interested
            </span>
            <StreamButtons event={event} />
          </div>
        </div>
      </div>
    </div>
  );

  const EventDetailModal = ({ event }: { event: Event }) => (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <button onClick={() => setSelectedEvent(null)} className="text-slate-400">
          ← Back
        </button>
        <h2 className="text-white font-bold">Event Details</h2>
        <div className="w-12" />
      </div>
      
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div 
          className="relative p-6"
          style={{ 
            background: `linear-gradient(135deg, ${event.game?.color || '#3b82f6'}40, transparent)` 
          }}
        >
          <FloatingParticles />
          <div className="relative">
            <div className="flex items-center gap-4 mb-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl"
                style={{ backgroundColor: `${event.game?.color || '#3b82f6'}30` }}
              >
                {event.game?.icon || '🎮'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{event.name}</h1>
                {event.game && (
                  <div className="text-slate-400">{event.game.name}</div>
                )}
              </div>
            </div>

            {event.isLive && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500 text-white rounded-full text-sm animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full" />
                LIVE NOW
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="p-4 space-y-4">
          {/* Date & Time */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <div>
                <div className="text-white font-bold">{event.date}</div>
                <div className="text-slate-400">{event.time}</div>
              </div>
            </div>
          </div>

          {/* Entry & Spots */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-slate-500 text-xs mb-1">Entry Fee</div>
              <div className="text-white font-bold text-lg">{event.entryFee}</div>
              {event.passFreeEntry && (
                <div className="text-yellow-400 text-xs mt-1">👑 Free with Battle Pass</div>
              )}
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-slate-500 text-xs mb-1">Spots</div>
              {event.maxSpots ? (
                <>
                  <div className={`font-bold text-lg ${event.spots === 0 ? 'text-red-400' : 'text-white'}`}>
                    {event.spots === 0 ? 'FULL' : `${event.spots} left`}
                  </div>
                  <div className="text-slate-500 text-xs mt-1">of {event.maxSpots} total</div>
                </>
              ) : (
                <div className="text-white font-bold text-lg">Unlimited</div>
              )}
            </div>
          </div>

          {/* XP Rewards */}
          <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl p-4 border border-cyan-500/30">
            <div className="text-white font-bold mb-2">⚡ XP Rewards</div>
            <div className="flex gap-4">
              <div>
                <span className="text-cyan-400 font-bold">+{event.attendanceXp}</span>
                <span className="text-slate-400 text-sm ml-1">attendance</span>
              </div>
              <div>
                <span className="text-purple-400 font-bold">+{event.winXp}</span>
                <span className="text-slate-400 text-sm ml-1">per win</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-white font-bold mb-2">📋 Details</div>
              <div className="text-slate-300 text-sm whitespace-pre-wrap">{event.description}</div>
            </div>
          )}

          {/* Stream Links */}
          {event.hasStream && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-white font-bold mb-3">📺 Watch Live</div>
              <div className="flex gap-3">
                {event.twitchUrl && (
                  <a 
                    href={event.twitchUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-500"
                  >
                    📺 Twitch
                  </a>
                )}
                {event.youtubeUrl && (
                  <a 
                    href={event.youtubeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-500"
                  >
                    ▶️ YouTube
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Interested count */}
          <div className="text-center text-slate-500">
            👥 {event.interestedCount} player{event.interestedCount !== 1 ? 's' : ''} interested
          </div>
        </div>
      </div>

      {/* Interest Button */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => toggleInterest(event.id)}
          disabled={togglingInterest === event.id}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            event.isInterested
              ? 'bg-green-500/20 text-green-400 border-2 border-green-500'
              : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
          } disabled:opacity-50`}
        >
          {togglingInterest === event.id 
            ? '...' 
            : event.isInterested 
              ? '✓ Interested' 
              : '⭐ I\'m Interested!'
          }
        </button>
        <p className="text-center text-slate-500 text-xs mt-2">
          Register in-store to secure your spot
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-slate-900 via-purple-900/30 to-slate-900 p-4 border-b border-slate-800">
        <FloatingParticles />
        <div className="relative">
          <h1 className="text-xl font-bold text-white flex items-center gap-2 font-orbitron">
            <span>📅</span> Events
          </h1>
          <p className="text-slate-400 text-sm">Tap to view details • Register in-store</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-4">
          {[
            { id: 'upcoming' as const, label: 'Upcoming' },
            { id: 'past' as const, label: 'Past' },
            { id: 'all' as const, label: 'All' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === tab.id
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4 animate-bounce">📅</div>
            <div className="text-slate-400">Loading events...</div>
          </div>
        ) : events.length > 0 ? (
          events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📅</div>
            <div className="text-white font-bold">
              {filter === 'upcoming' ? 'No upcoming events' : 
               filter === 'past' ? 'No past events' : 'No events yet'}
            </div>
            <div className="text-slate-500 text-sm">Check back soon!</div>
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && <EventDetailModal event={selectedEvent} />}
    </div>
  );
}
