'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Loader } from '@/components/Loader';
import { EventCreditCard } from '@/components/EventCreditCard';

interface EventInfo {
  id: string;
  name: string;
  attendanceXp: number;
  attendanceCount: number;
  game: { name: string; icon: string; color: string } | null;
}

type State = 'loading' | 'ready' | 'checking' | 'success' | 'already' | 'error' | 'expired' | 'no-event' | 'no-auth' | 'renewal-opportunity' | 'requested' | 'confirmed' | 'dismissed' | 'disabled';

function CheckInContent() {
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const eventId = searchParams.get('event_id');
  const token = searchParams.get('t');
  // The printed sign carries the event only (mode=request, no token). It asks staff to confirm; it never checks anyone in by itself.
  // A link WITH a token (the rotating kiosk QR) behaves exactly as before.
  const requestMode = !token && searchParams.get('mode') === 'request';

  const [state, setState] = useState<State>('loading');
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [prizePointsAwarded, setPrizePointsAwarded] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [underReview, setUnderReview] = useState(false);
  const [askAgain, setAskAgain] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { setState('no-auth'); return; }
    if (!eventId) { setState('no-event'); return; }

    fetch(`/api/events/active?event_id=${encodeURIComponent(eventId)}`, { cache: 'no-store' })
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

  // Waiting for staff: ask for our own request status every few seconds until it is settled.
  useEffect(() => {
    if (state !== 'requested' || !eventId) return;
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/checkin-request`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (stopped) return;
        if (data.status === 'checked_in' || data.status === 'approved') setState('confirmed');
        else if (data.status === 'dismissed') setState('dismissed');
        else if (data.status === 'disabled') setState('disabled');
        // The event ended while we waited; if it is running again the player can ask once more (the server reopens an expired request safely)
        else if (data.status === 'expired') { setAskAgain(true); setState('ready'); }
        else setUnderReview(data.status === 'needs_review');
      } catch { /* keep waiting */ }
    };
    const t = setInterval(poll, 5000);
    return () => { stopped = true; clearInterval(t); };
  }, [state, eventId]);

  const handleRequest = async () => {
    if (!eventId || !event) return;
    setState('checking');
    try {
      const res = await fetch(`/api/events/${eventId}/checkin-request`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.status === 'checked_in' || data.status === 'approved') setState('already');
        else if (data.status === 'dismissed') setState('dismissed');
        else if (data.status === 'expired') { setAskAgain(true); setState('ready'); }
        else { setUnderReview(data.status === 'needs_review'); setAskAgain(false); setState('requested'); }
      } else if (data.code === 'feature_disabled') {
        setState('disabled');
      } else if (data.code === 'event_not_active') {
        setState('no-event');
      } else {
        setErrorMsg(data.error || 'Could not send the request');
        setState('error');
      }
    } catch {
      setErrorMsg('Network error');
      setState('error');
    }
  };

  const handleCheckIn = async () => {
    if (!eventId || !event) return;
    if (requestMode) { await handleRequest(); return; }
    setState('checking');

    try {
      const res = await fetch(`/api/events/${eventId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setXpAwarded(data.lifetimeXpAwarded ?? data.xpAwarded ?? 0);
        setPrizePointsAwarded(data.prizePointsAwarded ?? 0);
        setState('success');
      } else if (data.alreadyCheckedIn) {
        setState('already');
      } else if (data.renewalOpportunity) {
        setState('renewal-opportunity');
      } else if (data.code === 'checkin_token_invalid') {
        setState('expired');
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
      <Loader />
    </div>
  );

  if (state === 'no-auth') {
    const returnUrl = typeof window !== 'undefined' ? window.location.href : '';
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="text-6xl">🔐</div>
        <h1 className="text-2xl font-bold text-primary">Sign In to Check In</h1>
        <p className="text-secondary">You need a PlayerPass account to earn XP</p>
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
      <div className="w-full max-w-sm text-left"><EventCreditCard eventId={eventId ?? undefined} /></div>
      <Link
        href="/dashboard"
        className="mt-2 px-8 py-4 bg-surface hover:bg-elevated text-primary font-bold rounded-2xl transition-colors border border-border-token"
      >
        View Dashboard →
      </Link>
    </div>
  );

  if (state === 'disabled') return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="text-6xl">🪧</div>
      <h1 className="text-2xl font-bold text-primary">This check-in sign isn&apos;t active yet</h1>
      <p className="text-secondary max-w-sm">Please scan the code on the kiosk screen, or ask a staff member to check you in.</p>
      <Link href="/dashboard" className="px-8 py-4 bg-surface hover:bg-elevated text-primary font-bold rounded-2xl transition-colors border border-border-token">
        Back to Dashboard
      </Link>
    </div>
  );

  if (state === 'requested') return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="w-28 h-28 rounded-full bg-warning/10 flex items-center justify-center">
        <span className="text-6xl">🙋</span>
      </div>
      <h1 className="font-display text-3xl font-bold text-primary">Request sent</h1>
      {event && <p className="text-secondary text-lg">{event.game?.icon} {event.name}</p>}
      <p className="text-secondary max-w-sm">
        {underReview
          ? 'Staff are checking your check-in. Please see a staff member if it does not update soon.'
          : 'Staff will confirm you\u2019re here. Keep this page open, it updates by itself. You earn your points once staff approve it.'}
      </p>
      <Link href="/dashboard" className="text-tertiary hover:text-secondary text-sm transition-colors">Back to dashboard</Link>
    </div>
  );

  if (state === 'confirmed') return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="w-28 h-28 rounded-full bg-success/10 flex items-center justify-center">
        <span className="text-6xl">✅</span>
      </div>
      <h1 className="font-display text-3xl font-bold text-success">You&apos;re checked in!</h1>
      {event && <p className="text-secondary text-lg">{event.game?.icon} {event.name}</p>}
      <Link href="/dashboard" className="mt-2 px-8 py-4 bg-surface hover:bg-elevated text-primary font-bold rounded-2xl transition-colors border border-border-token">
        View Dashboard →
      </Link>
    </div>
  );

  if (state === 'dismissed') return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="text-6xl">🙅</div>
      <h1 className="text-2xl font-bold text-primary">Staff couldn&apos;t confirm you</h1>
      <p className="text-secondary max-w-sm">Please see a staff member at the counter. They can reopen your request or check you in.</p>
      <Link href="/dashboard" className="px-8 py-4 bg-surface hover:bg-elevated text-primary font-bold rounded-2xl transition-colors border border-border-token">
        Back to Dashboard
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

  if (state === 'expired') return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="text-6xl">📷</div>
      <h1 className="text-2xl font-bold text-primary">Scan the kiosk again</h1>
      <p className="text-secondary max-w-sm">
        This check-in code has expired. The QR code on the kiosk screen changes every couple of minutes.
        Scan it again, or ask a staff member to check you in.
      </p>
      <Link href="/dashboard" className="px-8 py-4 bg-surface hover:bg-elevated text-primary font-bold rounded-2xl transition-colors border border-border-token">
        Back to Dashboard
      </Link>
    </div>
  );

  if (state === 'error') return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-bold text-danger">Check-in Failed</h1>
      <p className="text-secondary">{errorMsg}</p>
      <button onClick={() => setState('ready')} className="px-8 py-4 bg-surface hover:bg-elevated text-primary font-bold rounded-2xl transition-colors border border-border-token">
        Try Again
      </button>
      <Link href="/dashboard" className="text-tertiary hover:text-secondary text-sm transition-colors">
        Back to Dashboard
      </Link>
    </div>
  );

  if (state === 'renewal-opportunity') return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="text-6xl">⚠️</div>
      <h1 className="text-2xl font-bold text-warning">PlayerPass Expired</h1>
      <p className="text-secondary max-w-sm">
        Your PlayerPass has expired. Please see a staff member at the check-in kiosk to renew or complete your check-in.
      </p>
      <Link href="/dashboard" className="px-8 py-4 bg-surface hover:bg-elevated text-primary font-bold rounded-2xl transition-colors border border-border-token">
        Back to Dashboard
      </Link>
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
      {requestMode && (
        <p className="text-secondary text-sm max-w-xs">
          {askAgain ? 'Your earlier request ended with the event. You can ask again now.' : 'Staff confirm you\u2019re here before points are added.'}
        </p>
      )}
      <button
        onClick={handleCheckIn}
        disabled={state === 'checking'}
        className="mt-2 w-full max-w-xs py-5 text-xl font-bold rounded-2xl transition-all disabled:opacity-60"
        style={{ backgroundColor: gameColor, color: '#0f172a' }}
      >
        {state === 'checking' ? (requestMode ? 'Sending...' : 'Checking in...') : (requestMode ? 'Request check-in' : 'Check In')}
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
        <Loader />
      </div>
    }>
      <CheckInContent />
    </Suspense>
  );
}
