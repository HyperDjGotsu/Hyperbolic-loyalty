'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';

interface EventInfo {
  id: string;
  name: string;
  attendanceXp: number;
  attendanceCount: number;
  game: { name: string; icon: string; color: string } | null;
}

type State = 'loading' | 'ready' | 'checking' | 'success' | 'already' | 'error' | 'no-event' | 'no-auth';

function CheckInContent() {
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const eventId = searchParams.get('event_id');

  const [state, setState] = useState<State>('loading');
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [prizePointsAwarded, setPrizePointsAwarded] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { setState('no-auth'); return; }
    if (!eventId) { setState('no-event'); return; }

    fetch('/api/events/active')
      .then(r => r.json())
      .then(data => {
        if (!data.event || data.event.id !== eventId) {
          setState('no-event');
        } else {
          setEvent(data.event);
          setState('ready');
        }
      })
      .catch(() => { setErrorMsg('Failed to load event'); setState('error'); });
  }, [isLoaded, user, eventId]);

  const handleCheckIn = async () => {
    if (!eventId || !event) return;
    setState('checking');

    try {
      const res = await fetch(`/api/events/${eventId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setXpAwarded(data.lifetimeXpAwarded ?? data.xpAwarded ?? 0);
        setPrizePointsAwarded(data.prizePointsAwarded ?? 0);
        setState('success');
      } else if (data.alreadyCheckedIn) {
        setState('already');
      } else {
        setErrorMsg(data.error || 'Check-in failed');
        setState('error');
      }
    } catch {
      setErrorMsg('Network error');
      setState('error');
    }
  };

  const gameColor = event?.game?.color || '#3b82f6';

  if (state === 'loading') return (
    <div className="min-h-screen bg-base flex items-center justify-center">
      <div className="text-secondary text-lg">Loading...</div>
    </div>
  );

  if (state === 'no-auth') {
    const returnUrl = typeof window !== 'undefined' ? window.location.href : '';
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="text-6xl">🔐</div>
        <h1 className="text-2xl font-bold text-primary">Sign In to Check In</h1>
        <p className="text-secondary">You need a Hyperbolic account to earn XP</p>
        <Link
          href={`/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`}
          className="px-8 py-4 bg-accent text-accent-fg font-bold rounded-2xl text-lg transition-opacity hover:opacity-90"
        >
          Sign In
        </Link>
        <Link href="/sign-up" className="text-tertiary hover:text-secondary text-sm transition-colors">
          New player? Create account →
        </Link>
      </div>
    );
  }

  if (state === 'no-event') return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="text-6xl">🎮</div>
      <h1 className="text-2xl font-bold text-primary">No Active Event</h1>
      <p className="text-secondary">This event has ended or hasn't started yet</p>
      <Link href="/dashboard" className="text-accent hover:opacity-80 transition-opacity">Go to Dashboard →</Link>
    </div>
  );

  if (state === 'success') return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="w-28 h-28 rounded-full bg-success/10 flex items-center justify-center">
        <span className="text-6xl">✅</span>
      </div>
      <h1 className="font-display text-3xl font-bold text-success">Checked In!</h1>
      {event && (
        <p className="text-secondary text-lg">{event.game?.icon} {event.name}</p>
      )}
      <div className="card-elevated rounded-2xl px-10 py-6 flex flex-col items-center gap-2">
        <div>
          <span className="xp-number text-5xl">+{xpAwarded}</span>
          <span className="text-secondary text-2xl ml-2">Guild Points</span>
        </div>
        {prizePointsAwarded > 0 && (
          <div>
            <span className="text-cyan-400 text-4xl font-bold">+{prizePointsAwarded}</span>
            <span className="text-secondary text-xl ml-2">Prize Points</span>
          </div>
        )}
      </div>
      <Link
        href="/dashboard"
        className="mt-2 px-8 py-4 bg-surface hover:bg-elevated text-primary font-bold rounded-2xl transition-colors border border-border-token"
      >
        View Dashboard →
      </Link>
    </div>
  );

  if (state === 'already') return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="w-28 h-28 rounded-full bg-warning/10 flex items-center justify-center">
        <span className="text-6xl">⏰</span>
      </div>
      <h1 className="font-display text-3xl font-bold text-warning">Already Checked In!</h1>
      <p className="text-secondary">You've already earned XP for this event</p>
      <Link href="/dashboard" className="px-8 py-4 bg-surface hover:bg-elevated text-primary font-bold rounded-2xl transition-colors border border-border-token">
        View Dashboard →
      </Link>
    </div>
  );

  if (state === 'error') return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="text-6xl">❌</div>
      <h1 className="text-2xl font-bold text-danger">Check-in Failed</h1>
      <p className="text-secondary">{errorMsg}</p>
      <button onClick={() => setState('ready')} className="px-8 py-4 bg-surface hover:bg-elevated text-primary font-bold rounded-2xl transition-colors border border-border-token">
        Try Again
      </button>
    </div>
  );

  // Ready state
  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="text-6xl">{event?.game?.icon || '🎮'}</div>
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">{event?.name}</h1>
        <p className="text-secondary mt-1">{event?.game?.name}</p>
      </div>
      <div
        className="px-6 py-3 rounded-xl text-lg font-bold"
        style={{ backgroundColor: `${gameColor}20`, color: gameColor }}
      >
        +{event?.attendanceXp} XP for showing up
      </div>
      <p className="text-tertiary text-sm">{event?.attendanceCount} players checked in</p>
      <button
        onClick={handleCheckIn}
        disabled={state === 'checking'}
        className="mt-2 w-full max-w-xs py-5 text-xl font-bold rounded-2xl transition-all disabled:opacity-60"
        style={{ backgroundColor: gameColor, color: '#0f172a' }}
      >
        {state === 'checking' ? 'Checking in...' : 'Check In'}
      </button>
      <Link href="/dashboard" className="text-tertiary hover:text-secondary text-sm transition-colors">
        Back to dashboard
      </Link>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-secondary">Loading...</div>
      </div>
    }>
      <CheckInContent />
    </Suspense>
  );
}
