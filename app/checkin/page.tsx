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
        setXpAwarded(data.xpAwarded);
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-500 text-lg">Loading...</div>
    </div>
  );

  if (state === 'no-auth') {
    const returnUrl = typeof window !== 'undefined' ? window.location.href : '';
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="text-6xl">🔐</div>
        <h1 className="text-2xl font-bold text-white">Sign In to Check In</h1>
        <p className="text-slate-400">You need a Hyperbolic account to earn XP</p>
        <Link
          href={`/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`}
          className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-2xl text-lg transition-colors"
        >
          Sign In
        </Link>
        <Link href="/sign-up" className="text-slate-600 hover:text-slate-400 text-sm transition-colors">
          New player? Create account →
        </Link>
      </div>
    );
  }

  if (state === 'no-event') return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="text-6xl">🎮</div>
      <h1 className="text-2xl font-bold text-white">No Active Event</h1>
      <p className="text-slate-400">This event has ended or hasn't started yet</p>
      <Link href="/dashboard" className="text-cyan-400 hover:text-cyan-300 transition-colors">Go to Dashboard →</Link>
    </div>
  );

  if (state === 'success') return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="w-28 h-28 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <span className="text-6xl">✅</span>
      </div>
      <h1 className="text-3xl font-bold text-emerald-400">Checked In!</h1>
      {event && (
        <p className="text-slate-400 text-lg">{event.game?.icon} {event.name}</p>
      )}
      <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-2xl px-10 py-6">
        <span className="text-5xl font-black text-cyan-400">+{xpAwarded}</span>
        <span className="text-cyan-400/60 text-2xl ml-2">XP</span>
      </div>
      <Link
        href="/dashboard"
        className="mt-2 px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-colors"
      >
        View Dashboard →
      </Link>
    </div>
  );

  if (state === 'already') return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="w-28 h-28 rounded-full bg-amber-500/20 flex items-center justify-center">
        <span className="text-6xl">⏰</span>
      </div>
      <h1 className="text-3xl font-bold text-amber-400">Already Checked In!</h1>
      <p className="text-slate-400">You've already earned XP for this event</p>
      <Link href="/dashboard" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-colors">
        View Dashboard →
      </Link>
    </div>
  );

  if (state === 'error') return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="text-6xl">❌</div>
      <h1 className="text-2xl font-bold text-red-400">Check-in Failed</h1>
      <p className="text-slate-400">{errorMsg}</p>
      <button onClick={() => setState('ready')} className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-colors">
        Try Again
      </button>
    </div>
  );

  // Ready state
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="text-6xl">{event?.game?.icon || '🎮'}</div>
      <div>
        <h1 className="text-3xl font-bold text-white">{event?.name}</h1>
        <p className="text-slate-400 mt-1">{event?.game?.name}</p>
      </div>
      <div
        className="px-6 py-3 rounded-xl text-lg font-bold"
        style={{ backgroundColor: `${gameColor}20`, color: gameColor }}
      >
        +{event?.attendanceXp} XP for showing up
      </div>
      <p className="text-slate-600 text-sm">{event?.attendanceCount} players checked in</p>
      <button
        onClick={handleCheckIn}
        disabled={state === 'checking'}
        className="mt-2 w-full max-w-xs py-5 text-xl font-bold rounded-2xl transition-all disabled:opacity-60"
        style={{ backgroundColor: gameColor, color: '#0f172a' }}
      >
        {state === 'checking' ? 'Checking in...' : 'Check In'}
      </button>
      <Link href="/dashboard" className="text-slate-700 hover:text-slate-500 text-sm transition-colors">
        Back to dashboard
      </Link>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    }>
      <CheckInContent />
    </Suspense>
  );
}
