'use client';

import React from 'react';

const STORE_TIMEZONE = 'America/Los_Angeles';

interface SpecialEvent {
  id: string;
  name: string;
  description?: string | null;
  scheduledAt: string;
  game?: { id: string; name: string; icon: string; color: string } | null;
  entryFee?: string;
  isFree?: boolean;
  spots?: number | null;
  maxSpots?: number | null;
  prizing?: string[] | null;
}

// Special events can be months out, so show the year and a countdown
// instead of the "Sun, Jun 13" label the regular list uses.
function formatWhen(scheduledAt: string) {
  const d = new Date(scheduledAt);
  const date = d.toLocaleDateString('en-US', {
    timeZone: STORE_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-US', {
    timeZone: STORE_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
  });
  const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  let countdown: string | null = null;
  if (days > 60) countdown = `in ${Math.round(days / 30)} months`;
  else if (days > 14) countdown = `in ${Math.round(days / 7)} weeks`;
  else if (days > 1) countdown = `in ${days} days`;
  else if (days === 1) countdown = 'tomorrow';
  return { date, time, countdown };
}

export default function SpecialEvents({
  events,
  title = 'Special Events',
}: {
  events: SpecialEvent[];
  title?: string;
}) {
  if (!events || events.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-display text-xl font-bold text-primary">{title}</h2>
      </div>
      <div className="space-y-2">
        {events.map(event => {
          const { date, time, countdown } = formatWhen(event.scheduledAt);
          const facts: string[] = [];
          if (event.isFree) facts.push('Free');
          else if (event.entryFee) facts.push(event.entryFee);
          if (event.maxSpots) facts.push(`${event.maxSpots} spots`);
          if (event.prizing && event.prizing.length > 0) facts.push(event.prizing.join(', '));

          return (
            <a
              key={event.id}
              href={`/dashboard/events?event=${event.id}`}
              className="flex items-center gap-3 p-3 bg-elevated border border-accent/40 rounded-xl hover:border-accent transition-colors"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: `${event.game?.color || '#3b82f6'}20` }}
              >
                {event.game?.icon || '⭐'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-accent uppercase tracking-wide font-semibold mb-0.5">
                  Special{event.game ? ` · ${event.game.name}` : ''}
                </div>
                <div className="text-sm font-medium truncate">{event.name}</div>
                <div className="text-xs text-secondary">
                  {date} · {time}
                  {countdown && <span className="text-tertiary"> · {countdown}</span>}
                </div>
                {facts.length > 0 && (
                  <div className="text-xs text-tertiary mt-0.5 truncate">{facts.join(' · ')}</div>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
