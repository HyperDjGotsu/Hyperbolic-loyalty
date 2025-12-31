'use client';

import React from 'react';
import { StreamButtons } from '@/components/ui';
import type { GameEvent } from '@/lib/types';

const mockEvents: GameEvent[] = [
  {
    id: 1,
    name: 'One Piece Weekly',
    date: 'Today',
    time: '6:00 PM',
    spots: 8,
    maxSpots: 16,
    entry: '$5',
    icon: '🏴‍☠️',
    color: '#E63946',
    hasStream: true,
    streamStarting: true,
  },
  {
    id: 2,
    name: 'Gundam Build Night',
    date: 'Tomorrow',
    time: '5:00 PM',
    spots: 4,
    maxSpots: 12,
    entry: 'Free',
    icon: '🤖',
    color: '#3B82F6',
    hasStream: true,
  },
  {
    id: 3,
    name: 'Pokémon League',
    date: 'Saturday',
    time: '1:00 PM',
    spots: 12,
    maxSpots: 24,
    entry: '$10',
    icon: '⚡',
    color: '#FACC15',
    hasStream: false,
  },
  {
    id: 4,
    name: 'MTG Commander Night',
    date: 'Saturday',
    time: '6:00 PM',
    spots: 20,
    maxSpots: 32,
    entry: 'Free',
    icon: '✨',
    color: '#8B5CF6',
    hasStream: false,
  },
  {
    id: 5,
    name: 'Lorcana Tournament',
    date: 'Sunday',
    time: '2:00 PM',
    spots: 6,
    maxSpots: 16,
    entry: '$15',
    icon: '🪄',
    color: '#EC4899',
    hasStream: true,
  },
];

export default function EventsPage() {
  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white font-orbitron">Events</h1>
        <p className="text-slate-500 text-sm">Tap to register • Watch live!</p>
      </div>

      {/* Events List */}
      <div className="p-4 space-y-3">
        {mockEvents.map((event) => (
          <div
            key={event.id}
            className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/30 transition-colors cursor-pointer"
          >
            <div className="p-4 border-l-4" style={{ borderLeftColor: event.color }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${event.color}30` }}
                >
                  {event.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">{event.name}</h3>
                  <div className="text-slate-400 text-sm">
                    {event.date} @ {event.time}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-700/50">
                <div className="flex gap-4 text-sm text-slate-400">
                  <span>💰 {event.entry}</span>
                  <span className={event.spots < 5 ? 'text-red-400' : 'text-cyan-400'}>
                    {event.spots}/{event.maxSpots} spots
                  </span>
                </div>
                {event.hasStream && (
                  <StreamButtons hasStream={event.hasStream} streamStarting={event.streamStarting} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Calendar Preview */}
      <div className="p-4 border-t border-slate-800">
        <h2 className="font-bold text-white flex items-center gap-2 mb-3">
          <span className="text-xl">📆</span> This Week
        </h2>
        <div className="grid grid-cols-7 gap-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-center text-slate-500 text-xs py-1">
              {day}
            </div>
          ))}
          {[...Array(7)].map((_, i) => {
            const hasEvent = [0, 1, 5, 6].includes(i);
            const isToday = i === 0;
            return (
              <div
                key={i}
                className={`aspect-square rounded-lg flex items-center justify-center text-sm ${
                  isToday
                    ? 'bg-cyan-500 text-white'
                    : hasEvent
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-slate-800/50 text-slate-400'
                }`}
              >
                {22 + i}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
