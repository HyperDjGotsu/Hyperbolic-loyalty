'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface ActiveEvent {
  id: string;
  name: string;
  gameId: string;
  attendanceXp: number;
  scheduledAt: string;
  game: { name: string; icon: string; color: string } | null;
  attendanceCount: number;
  recentCheckIns: Array<{
    playerName: string;
    playerId: string;
    xpAwarded: number;
    checkedInAt: string;
  }>;
}

interface Feedback {
  type: 'success' | 'error' | 'already';
  playerName: string;
  xpAwarded?: number;
  message: string;
}

interface RenewalOpportunity {
  playerName: string;
  playerId: string;
  shortPlayerId: string;
  expiredTier: string;
  expiredAt: string | null;
  mutationId: string;
  isProcessing: boolean;
  error: string | null;
}

export default function KioskPage() {
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [renewal, setRenewal] = useState<RenewalOpportunity | null>(null);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [origin, setOrigin] = useState('');
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const fetchActiveEvent = useCallback(async () => {
    try {
      const res = await fetch('/api/events/active');
      const data = await res.json();
      setActiveEvent(data.event);
    } catch {
      // silently ignore poll failures
    }
  }, []);

  // Poll for active event: 30s baseline, 10s when event is live
  useEffect(() => {
    fetchActiveEvent();
    const interval = setInterval(fetchActiveEvent, activeEvent ? 10000 : 30000);
    return () => clearInterval(interval);
  }, [fetchActiveEvent, !!activeEvent]);

  const showFeedback = (fb: Feedback) => {
    setFeedback(fb);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => {
      setFeedback(null);
      processingRef.current = false;
    }, 4000);
  };

  const checkInByPlayerId = useCallback(async (playerId: string) => {
    if (!activeEvent || processingRef.current) return;
    processingRef.current = true;

    try {
      const res = await fetch(`/api/events/${activeEvent.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showFeedback({ type: 'success', playerName: data.playerName, xpAwarded: data.xpAwarded, message: 'Welcome!' });
        fetchActiveEvent();
      } else if (data.alreadyCheckedIn) {
        showFeedback({ type: 'already', playerName: data.playerName || playerId, message: 'Already checked in!' });
      } else if (data.renewalOpportunity) {
        // Persistent renewal interstitial — does not auto-dismiss.
        // processingRef stays true until staff resolves the prompt.
        setRenewal({
          playerName: data.playerName,
          playerId: data.playerId,
          shortPlayerId: playerId,
          expiredTier: data.expiredTier ?? 'unknown',
          expiredAt: data.expiredAt ?? null,
          mutationId: crypto.randomUUID(),
          isProcessing: false,
          error: null,
        });
      } else {
        showFeedback({ type: 'error', playerName: playerId, message: data.error || 'Check-in failed' });
      }
    } catch {
      showFeedback({ type: 'error', playerName: '', message: 'Network error — try QR code' });
    }
  }, [activeEvent, fetchActiveEvent]);

  const dismissRenewal = () => {
    setRenewal(null);
    processingRef.current = false;
  };

  const handleConfirmRenewal = useCallback(async () => {
    if (!renewal || !activeEvent) return;
    setRenewal(r => r ? { ...r, isProcessing: true, error: null } : r);

    // expires_at computed client-side as now + 30 days.
    // TODO: move duration ownership server-side when membership_restore adds p_duration_days support.
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    try {
      const restoreRes = await fetch('/api/hq/membership/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: renewal.playerId,
          tier: renewal.expiredTier,
          expires_at: expiresAt,
          mutation_id: renewal.mutationId,
          payment_confirmed: true,
          notes: 'Staff confirmed manual Square payment at event check-in',
        }),
      });

      if (!restoreRes.ok) {
        const restoreData = await restoreRes.json().catch(() => ({}));
        const errorMsg = restoreRes.status === 403
          ? 'Renewal requires a store manager. Use "Check In Without Renewal" or ask a manager.'
          : restoreData.error || `Renewal failed (${restoreRes.status}) — use Check In Without Renewal`;
        setRenewal(r => r ? { ...r, isProcessing: false, error: errorMsg } : r);
        return;
      }

      // Restore succeeded — auto-complete check-in. Pass is now active; renewal gate won't fire.
      const checkInRes = await fetch(`/api/events/${activeEvent.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: renewal.shortPlayerId }),
      });
      const checkInData = await checkInRes.json();

      dismissRenewal();

      if (checkInRes.ok && checkInData.success) {
        showFeedback({ type: 'success', playerName: renewal.playerName, xpAwarded: checkInData.xp_awarded, message: 'Renewed & checked in!' });
        fetchActiveEvent();
      } else if (checkInData.alreadyCheckedIn) {
        // Edge case: already checked in between restore and retry
        showFeedback({ type: 'already', playerName: renewal.playerName, message: 'Already checked in!' });
      } else {
        // Membership is renewed but check-in failed — instruct staff to rescan
        showFeedback({ type: 'error', playerName: renewal.playerName, message: 'Membership renewed. Rescan card to complete check-in.' });
      }
    } catch {
      setRenewal(r => r ? { ...r, isProcessing: false, error: 'Network error — try again or use Check In Without Renewal' } : r);
    }
  }, [renewal, activeEvent, fetchActiveEvent]);

  const handleSkipRenewal = useCallback(async () => {
    if (!renewal || !activeEvent) return;
    setRenewal(r => r ? { ...r, isProcessing: true, error: null } : r);

    try {
      const res = await fetch(`/api/events/${activeEvent.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: renewal.shortPlayerId, skip_renewal_opportunity: true }),
      });
      const data = await res.json();

      dismissRenewal();

      if (res.ok && data.success) {
        showFeedback({ type: 'success', playerName: renewal.playerName, xpAwarded: data.xp_awarded, message: 'Checked in (pass expired)' });
        fetchActiveEvent();
      } else {
        showFeedback({ type: 'error', playerName: renewal.playerName, message: data.error || 'Check-in failed' });
      }
    } catch {
      setRenewal(r => r ? { ...r, isProcessing: false, error: 'Network error — try again or dismiss to rescan' } : r);
      // Auto-dismiss after 30s so the kiosk doesn't stay frozen if staff walks away.
      setTimeout(dismissRenewal, 30_000);
    }
  }, [renewal, activeEvent, fetchActiveEvent]);

  // Web NFC — reads Player ID from card text record OR extracts player_id from URL record
  // Accepts both legacy HYP- prefix cards and new GGC- prefix cards for backward compat
  useEffect(() => {
    if (!('NDEFReader' in window)) return;

    let reader: any;
    const startNFC = async () => {
      try {
        reader = new (window as any).NDEFReader();
        await reader.scan();
        setNfcEnabled(true);

        reader.onreading = (event: any) => {
          for (const record of event.message.records) {
            let detectedId = '';

            if (record.recordType === 'text') {
              const decoder = new TextDecoder(record.encoding || 'utf-8');
              const text = decoder.decode(record.data).trim();
              // Accept HYP- (legacy cards) and GGC- (new cards), or any PREFIX-ALPHANUM pattern
              if (/^[A-Z]+-[A-Z0-9]+$/.test(text)) detectedId = text;
            } else if (record.recordType === 'url') {
              const decoder = new TextDecoder();
              const url = decoder.decode(record.data);
              // Accept player_id or hyp_id param, any PREFIX-ALPHANUM value
              const match = url.match(/[?&](?:player_id|hyp_id)=([A-Z]+-[A-Z0-9]+)/);
              if (match) detectedId = match[1];
            }

            if (detectedId) {
              checkInByPlayerId(detectedId);
              break;
            }
          }
        };
      } catch {
        setNfcEnabled(false);
      }
    };

    startNFC();
  }, [checkInByPlayerId]);

  const gameColor = activeEvent?.game?.color || '#3b82f6';
  const checkinUrl = activeEvent ? `${origin}/checkin?event_id=${activeEvent.id}` : '';
  const qrUrl = checkinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(checkinUrl)}&bgcolor=111009&color=c4b5fd&margin=3`
    : '';

  return (
    <div className="min-h-screen bg-base text-primary select-none overflow-hidden">
      {/* Renewal opportunity interstitial — persistent, requires staff action */}
      {renewal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-surface rounded-3xl p-10 text-center shadow-2xl border-2 border-amber-500 max-w-md w-full mx-4">
            <div className="text-6xl mb-4">⚠️</div>
            <div className="text-3xl font-bold text-amber-400 mb-1">{renewal.playerName}</div>
            <div className="text-secondary text-lg mb-1 capitalize">{renewal.expiredTier} Player Pass expired</div>
            {renewal.expiredAt && (
              <div className="text-tertiary text-sm mb-6">
                {new Date(renewal.expiredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
            <p className="text-primary text-lg font-semibold mb-6">Has this player renewed their membership?</p>
            {renewal.error && (
              <p className="text-red-400 text-sm mb-4 bg-red-500/10 rounded-xl px-4 py-2">{renewal.error}</p>
            )}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirmRenewal}
                disabled={renewal.isProcessing}
                className="w-full py-4 text-lg font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
              >
                {renewal.isProcessing ? 'Processing...' : 'Confirm Renewal'}
              </button>
              <button
                onClick={handleSkipRenewal}
                disabled={renewal.isProcessing}
                className="w-full py-4 text-lg font-bold rounded-2xl bg-surface border border-border-token hover:bg-elevated text-primary transition-colors disabled:opacity-50"
              >
                Check In Without Renewal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback overlay */}
      {feedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className={`rounded-3xl p-12 text-center shadow-2xl border-2 max-w-md w-full mx-4 ${
            feedback.type === 'success' ? 'bg-surface border-emerald-500' :
            feedback.type === 'already' ? 'bg-surface border-amber-500' :
            'bg-surface border-red-500'
          }`}>
            <div className="text-8xl mb-4">
              {feedback.type === 'success' ? '✅' : feedback.type === 'already' ? '⏰' : '❌'}
            </div>
            <div className={`text-3xl font-bold mb-2 ${
              feedback.type === 'success' ? 'text-emerald-400' :
              feedback.type === 'already' ? 'text-amber-400' : 'text-red-400'
            }`}>
              {feedback.playerName || 'Player'}
            </div>
            {feedback.type === 'success' && feedback.xpAwarded && (
              <div className="text-6xl font-black text-accent my-4">+{feedback.xpAwarded} XP</div>
            )}
            <div className="text-secondary text-xl">{feedback.message}</div>
          </div>
        </div>
      )}

      {!activeEvent ? (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-8">
          <div className="text-8xl opacity-30">🎮</div>
          <h1 className="text-4xl font-bold text-secondary">No Active Event</h1>
          <p className="text-tertiary text-xl">Staff: open HQ → Events tab → Start Event</p>
          {nfcEnabled && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm mt-8">
              <span className="w-2 h-2 bg-emerald-600 rounded-full"></span>
              NFC ready
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-screen flex flex-col p-8 gap-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xl font-bold" style={{ color: gameColor }}>
                {activeEvent.game?.icon} {activeEvent.game?.name || 'Event'}
              </div>
              <h1 className="text-5xl font-black text-primary mt-1 leading-tight">{activeEvent.name}</h1>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-7xl font-black leading-none" style={{ color: gameColor }}>
                {activeEvent.attendanceCount}
              </div>
              <div className="text-secondary text-lg">checked in</div>
            </div>
          </div>

          {/* Main 3-column layout */}
          <div className="flex-1 flex gap-8 items-center">
            {/* Left: QR code */}
            <div className="flex flex-col items-center gap-4 w-64 flex-shrink-0">
              <div className="bg-surface rounded-2xl p-3 border border-border">
                {qrUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrUrl} alt="Check-in QR code" width={220} height={220} className="rounded-xl" />
                )}
              </div>
              <p className="text-secondary text-center text-base">Scan with your phone</p>
            </div>

            {/* Center: Tap prompt */}
            <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
              <div
                className="w-44 h-44 rounded-full flex items-center justify-center border-4 border-dashed animate-pulse"
                style={{ borderColor: gameColor, backgroundColor: `${gameColor}12` }}
              >
                <span className="text-8xl">📡</span>
              </div>
              <h2 className="text-5xl font-black text-primary">Tap Your Card</h2>
              <div
                className="px-8 py-4 rounded-2xl text-2xl font-black"
                style={{ backgroundColor: `${gameColor}20`, color: gameColor }}
              >
                +{activeEvent.attendanceXp} XP
              </div>
              <p className="text-tertiary text-lg">or scan the QR code →</p>
              <div className={`flex items-center gap-2 text-sm ${nfcEnabled ? 'text-emerald-500' : 'text-tertiary'}`}>
                <span className={`w-2 h-2 rounded-full ${nfcEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-tertiary'}`} />
                {nfcEnabled ? 'NFC Active' : 'NFC unavailable — use QR code'}
              </div>
            </div>

            {/* Right: Recent check-ins */}
            <div className="w-64 flex-shrink-0">
              <h3 className="text-tertiary text-sm font-semibold uppercase tracking-widest mb-4">Recent</h3>
              <div className="space-y-3">
                {activeEvent.recentCheckIns.length === 0 ? (
                  <p className="text-tertiary text-center py-8 text-sm">Be the first to check in!</p>
                ) : (
                  activeEvent.recentCheckIns.map((ci, i) => (
                    <div key={i} className="bg-surface rounded-xl p-4 border border-border flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-primary text-sm truncate">{ci.playerName}</div>
                        <div className="text-tertiary text-xs">{ci.playerId}</div>
                      </div>
                      <div className="text-accent font-bold text-sm flex-shrink-0">+{ci.xpAwarded}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
