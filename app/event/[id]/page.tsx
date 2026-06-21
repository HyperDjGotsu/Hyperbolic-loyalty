'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface GameInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface PublicEvent {
  id: string;
  name: string;
  description: string | null;
  date: string;
  time: string;
  scheduledAt: string;
  endsAt: string | null;
  game: GameInfo;
  entryFee: string;
  isFree: boolean;
  maxSpots: number | null;
  hasStream: boolean;
  twitchUrl: string | null;
  youtubeUrl: string | null;
  interestedCount: number;
  attendanceXp: number;
  winXp: number;
  prizing: string[];
  location: string;
  address: string;
}

export default function PublicEventPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadEvent() {
      try {
        // Add cache busting to ensure fresh data
        const res = await fetch(`/api/events/${params.id}/public?t=${Date.now()}`, {
          cache: 'no-store'
        });
        const data = await res.json();

        if (res.ok) {
          setEvent(data.event);
        } else {
          setError(data.error || 'Event not found');
        }
      } catch (err) {
        console.error('Error loading event:', err);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadEvent();
    }
  }, [params.id]);

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.name,
          text: `Check out this event at Games of Martinez: ${event?.name}`,
          url: url,
        });
      } catch (err) {
        // User cancelled or error - fall back to copy
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">📅</div>
          <div className="text-secondary">Loading event...</div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-primary mb-2">Event Not Found</h1>
          <p className="text-secondary mb-6">{error || "This event doesn't exist or has been removed."}</p>
          <Link
            href="/"
            className="px-6 py-3 bg-accent text-accent-fg font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const isUpcoming = new Date(event.scheduledAt) > new Date();

  return (
    <div className="min-h-screen bg-base">
      {/* Header */}
      <header className="bg-surface border-b border-border-token sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🎮</span>
            <span className="font-display font-bold text-primary">
              HYPERBOLIC
            </span>
          </Link>
          <Link
            href="/onboarding"
            className="px-4 py-2 bg-accent text-accent-fg text-sm font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            Join Free
          </Link>
        </div>
      </header>

      {/* Event Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Game Badge */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${event.game.color}20` }}
          >
            {event.game.icon}
          </div>
          <div>
            <div className="text-secondary text-sm">{event.game.name}</div>
            <div className="flex items-center gap-2">
              {event.isFree ? (
                <span className="text-success text-sm font-bold">FREE</span>
              ) : (
                <span className="text-accent text-sm font-bold">{event.entryFee}</span>
              )}
              {event.hasStream && (
                <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-full">
                  📺 Streamed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Event Title */}
        <h1 className="font-display text-3xl font-bold text-primary mb-2">{event.name}</h1>

        {/* Date & Time */}
        <div className="flex items-center gap-4 text-secondary mb-6">
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span>{event.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🕐</span>
            <span>{event.time}</span>
          </div>
        </div>

        {/* Status Badge */}
        {isUpcoming ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-full mb-6">
            <span className="w-2 h-2 bg-success rounded-full"></span>
            <span className="font-medium">Upcoming Event</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface text-secondary rounded-full mb-6">
            <span>This event has ended</span>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card p-4">
            <div className="text-secondary text-sm mb-1">Location</div>
            <div className="text-primary font-medium">{event.location}</div>
            <div className="text-secondary text-sm">{event.address}</div>
          </div>
          <div className="card p-4">
            <div className="text-secondary text-sm mb-1">Interested</div>
            <div className="text-primary font-bold text-4xl">{event.interestedCount}</div>
          </div>
        </div>

        {/* XP Rewards */}
        <div className="card-elevated rounded-xl p-4 mb-6">
          <div className="text-primary font-bold mb-3">🎁 XP Rewards</div>
          <div className="flex gap-6">
            <div>
              <div className="xp-number text-xl">+{event.attendanceXp}</div>
              <div className="text-secondary text-sm">Attendance</div>
            </div>
            <div>
              <div className="xp-number text-xl">+{event.winXp}</div>
              <div className="text-secondary text-sm">Per Win</div>
            </div>
          </div>
        </div>

        {/* Prizing Structure */}
        {event.prizing && event.prizing.length > 0 && (
          <div className="card-elevated rounded-xl p-4 mb-6">
            <div className="text-primary font-bold mb-3">🏆 Prizes</div>
            <div className="space-y-3">
              {event.prizing.map((prize, index) => {
                // Map prize codes to display info
                const prizeInfo: Record<string, { icon: string; title: string; description: string }> = {
                  'pack-per-win': {
                    icon: '🎁',
                    title: 'Pack Per Win',
                    description: 'Win a booster pack for each match victory'
                  },
                  'packperwin': {
                    icon: '🎁',
                    title: 'Pack Per Win',
                    description: 'Win a booster pack for each match victory'
                  },
                  '1-3-5': {
                    icon: '🏆',
                    title: '1-3-5 Packs',
                    description: '1 win = 1 pack • 2 wins = 3 packs • 3 wins = 5 packs'
                  },
                  'promo': {
                    icon: '🌟',
                    title: 'Promo Card',
                    description: 'All participants receive a promo card (while supplies last)'
                  },
                };

                const info = prizeInfo[prize.toLowerCase().replace(/\s+/g, '')] || {
                  icon: '🎁',
                  title: prize,
                  description: ''
                };

                return (
                  <div key={index} className="flex items-start gap-3">
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <div className="text-primary font-medium">{info.title}</div>
                      {info.description && (
                        <div className="text-secondary text-sm">{info.description}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="mb-6">
            <div className="text-secondary text-sm mb-2">About this event</div>
            <div className="text-secondary whitespace-pre-wrap">{event.description}</div>
          </div>
        )}

        {/* Stream Links */}
        {event.hasStream && (event.twitchUrl || event.youtubeUrl) && (
          <div className="card-elevated rounded-xl p-4 mb-6">
            <div className="text-primary font-bold mb-3">📺 Watch Live</div>
            <div className="flex gap-3">
              {event.twitchUrl && (
                <a
                  href={event.twitchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-fg rounded-lg hover:opacity-90 transition-opacity"
                >
                  📺 Twitch
                </a>
              )}
              {event.youtubeUrl && (
                <a
                  href={event.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-danger text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  ▶️ YouTube
                </a>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={handleShare}
            className="flex-1 py-4 bg-surface text-primary font-bold rounded-xl hover:bg-elevated transition-colors flex items-center justify-center gap-2 border border-border-token"
          >
            {copied ? '✅ Copied!' : '📤 Share Event'}
          </button>
          <Link
            href="/onboarding"
            className="flex-1 py-4 bg-accent text-accent-fg font-bold rounded-xl hover:opacity-90 transition-opacity text-center"
          >
            Join to Track
          </Link>
        </div>

        {/* CTA Section */}
        <div className="card p-6 text-center">
          <div className="text-4xl mb-4">🎮</div>
          <h2 className="font-display text-xl font-bold text-primary mb-2">Join Games of Martinez</h2>
          <p className="text-secondary mb-4">
            Track your XP, compete on leaderboards, and never miss an event!
          </p>
          <Link
            href="/onboarding"
            className="inline-block px-8 py-3 bg-accent text-accent-fg font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            Create Free Account
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-border-token mt-12">
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <div className="text-secondary text-sm mb-2">
            Games of Martinez • 1155 Arnold Dr Ste E & F, Martinez, CA
          </div>
          <div className="text-tertiary text-xs">
            Powered by Hyperbolic XP
          </div>
        </div>
      </footer>
    </div>
  );
}
