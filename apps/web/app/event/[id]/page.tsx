'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CoverImage } from '@/components/CoverImage';

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
  status: string;
  storeId: string | null;
  imageUrl: string | null;
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
          text: `Check out this event at ${event?.location ?? 'Player Pass'}: ${event?.name}`,
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

  const now = Date.now();
  const startsAt = new Date(event.scheduledAt).getTime();
  const endedByTime = now > (event.endsAt ? new Date(event.endsAt).getTime() : startsAt + 4 * 60 * 60 * 1000);
  const isLive = event.status === 'active';
  const isEnded = event.status === 'completed' || event.status === 'cancelled' || (!isLive && endedByTime);

  return (
    <div className="min-h-screen bg-base pb-28">
      {/* Header */}
      <header className="bg-base/90 backdrop-blur border-b border-border-token sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/brand/pp-mark.png" alt="Player Pass" className="h-8 w-auto flex-none" />
            <span className="font-display font-extrabold text-primary">Player Pass</span>
          </Link>
          <Link
            href="/onboarding"
            className="px-4 py-2 bg-accent text-accent-fg text-sm font-bold rounded-full hover:opacity-90 transition-opacity"
          >
            Join Free
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4">
        {/* Cover */}
        <CoverImage
          gameId={event.game.id}
          storeId={event.storeId}
          src={event.imageUrl}
          color={event.game.color}
          className="h-60 rounded-[28px]"
        >
          <div className="absolute left-4 top-4 flex items-center gap-2">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-extrabold tracking-wide text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE NOW
              </span>
            ) : isEnded ? (
              <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white/80 backdrop-blur">ENDED</span>
            ) : (
              <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white backdrop-blur">UPCOMING</span>
            )}
            {event.hasStream && (
              <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white backdrop-blur">STREAMED</span>
            )}
          </div>
          <div className="absolute inset-x-5 bottom-4">
            <div className="text-sm font-semibold text-white/80">{event.game.name}</div>
            <h1 className="font-display text-[32px] leading-[1.05] font-extrabold tracking-tight text-white">{event.name}</h1>
          </div>
        </CoverImage>

        {/* When + price */}
        <div className="mt-4 flex items-center justify-between gap-3 px-1">
          <div>
            <div className="font-bold text-primary">{event.date}</div>
            <div className="text-secondary">{event.time}</div>
          </div>
          <div className={`rounded-full px-4 py-1.5 text-sm font-extrabold ${event.isFree ? 'bg-success/15 text-success' : 'bg-accent/15 text-accent'}`}>
            {event.isFree ? 'FREE' : event.entryFee}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="card !rounded-[22px] p-4">
            <div className="text-secondary text-sm mb-1">Location</div>
            <div className="text-primary font-semibold">{event.location}</div>
            <div className="text-secondary text-sm">{event.address}</div>
          </div>
          <div className="card !rounded-[22px] p-4">
            <div className="text-secondary text-sm mb-1">Interested</div>
            <div className="xp-number text-primary text-4xl">{event.interestedCount}</div>
          </div>
        </div>

        {/* XP Rewards */}
        <div className="card-elevated !rounded-[22px] p-4 mb-6">
          <div className="text-primary font-bold mb-3">XP Rewards</div>
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
          <div className="card-elevated !rounded-[22px] p-4 mb-6">
            <div className="text-primary font-bold mb-3">Prizes</div>
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
          <div className="card-elevated !rounded-[22px] p-4 mb-6">
            <div className="text-primary font-bold mb-3">Watch Live</div>
            <div className="flex gap-3">
              {event.twitchUrl && (
                <a
                  href={event.twitchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-fg rounded-lg hover:opacity-90 transition-opacity"
                >
                  Twitch
                </a>
              )}
              {event.youtubeUrl && (
                <a
                  href={event.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-danger text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  YouTube
                </a>
              )}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="card !rounded-[22px] p-6 text-center mb-4">
          <h2 className="font-display text-xl font-extrabold text-primary mb-2">Join {event?.location ?? 'Player Pass'}</h2>
          <p className="text-secondary mb-4">
            Track your XP, compete on leaderboards, and never miss an event!
          </p>
          <Link
            href="/onboarding"
            className="inline-block px-8 py-3 bg-accent text-accent-fg font-bold rounded-full hover:opacity-90 transition-opacity"
          >
            Create Free Account
          </Link>
        </div>
      </main>

      {/* Sticky actions */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-token bg-base/90 backdrop-blur">
        <div className="max-w-2xl mx-auto flex gap-3 px-4 py-3">
          <button
            onClick={handleShare}
            className="flex-1 py-3.5 bg-surface text-primary font-bold rounded-full hover:bg-elevated transition-colors border border-border-token"
          >
            {copied ? '✅ Copied!' : 'Share'}
          </button>
          <Link
            href="/onboarding"
            className="flex-[2] py-3.5 bg-accent text-accent-fg font-bold rounded-full hover:opacity-90 transition-opacity text-center"
          >
            Join to Track
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-6">
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <div className="text-secondary text-sm mb-2">
            {event.location}{event.address ? ` • ${event.address}` : ''}
          </div>
          <div className="text-tertiary text-xs">
            Powered by Player Pass
          </div>
        </div>
      </footer>
    </div>
  );
}
