'use client';

import { useState, useRef, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';

type Tier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface SpinPrize {
  xp: number;
  label: string;
  rarity: Tier;
}

interface DailyGachaProps {
  onComplete: () => void;
  onClose: () => void;
}

const TIER_STYLE = {
  common:    { color: '#94a3b8', glow: 'rgba(148,163,184,0.28)', pulse: 'rgba(148,163,184,0.12)', label: 'Common'    },
  uncommon:  { color: '#bae6fd', glow: 'rgba(186,230,253,0.42)', pulse: 'rgba(186,230,253,0.16)', label: 'Uncommon'  },
  rare:      { color: '#60a5fa', glow: 'rgba(96,165,250,0.55)',  pulse: 'rgba(96,165,250,0.20)',  label: 'Rare'      },
  epic:      { color: '#c084fc', glow: 'rgba(192,132,252,0.55)', pulse: 'rgba(192,132,252,0.20)', label: 'Epic'      },
  legendary: { color: '#fbbf24', glow: 'rgba(251,191,36,0.65)',  pulse: 'rgba(251,191,36,0.25)',  label: 'Legendary' },
} as const;

const CARD_W = 112;
const CARD_H  = 157;

// 6 shuffle cards laid out in 3 depth-pairs so the deck looks like a 3-card fan.
// Indices 0,1 = deepest pair | 2,3 = mid pair | 4,5 = top pair
// Split: top half (high z) = [3,4,5] go left — bottom half (low z) = [0,1,2] go right
// Interleave drop order: T5, B2, T4, B1, T3, B0
const INIT_POS = [
  { x: -5,   y: 6,   rotation: -3.5, zIndex: 1 }, // 0 — deep, left pair
  { x: -5,   y: 6,   rotation: -3.5, zIndex: 2 }, // 1 — deep, right pair
  { x: -2.5, y: 3,   rotation: -2,   zIndex: 3 }, // 2 — mid, left pair
  { x: -2.5, y: 3,   rotation: -2,   zIndex: 4 }, // 3 — mid, right pair
  { x:  0,   y: 0,   rotation:  0,   zIndex: 5 }, // 4 — top, left pair
  { x:  0,   y: 0,   rotation:  0,   zIndex: 6 }, // 5 — top, right pair
] as const;

// Sound hook placeholders (wire up later)
// const playRiffle  = () => { /* TODO: riffle .mp3 */ };
// const playThud    = () => { /* TODO: thud .mp3   */ };
// const playShing   = () => { /* TODO: shing .mp3  — legendary only */ };

function CardBack() {
  return (
    <div style={{
      width: CARD_W, height: CARD_H, borderRadius: 10,
      background: 'linear-gradient(155deg, #111122 0%, #0a0a14 100%)',
      border: '1px solid rgba(0,200,234,0.22)',
      boxShadow: 'inset 0 1px 0 rgba(0,200,234,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{
        fontFamily: 'var(--font-orbitron)', fontWeight: 900,
        color: 'rgba(0,200,234,0.32)', fontSize: 30, letterSpacing: 2,
      }}>H</span>
    </div>
  );
}

function CardFace({ prize }: { prize: SpinPrize | null }) {
  if (!prize) return <div style={{ width: CARD_W, height: CARD_H }} />;
  const t = TIER_STYLE[prize.rarity];
  return (
    <div
      className={prize.rarity === 'legendary' ? 'holo-card' : ''}
      style={{
        width: CARD_W, height: CARD_H, borderRadius: 10,
        background: 'linear-gradient(155deg, #0f0f1a 0%, #0a0a14 100%)',
        border: `1px solid ${t.glow}`,
        boxShadow: `0 0 20px ${t.glow}, inset 0 1px 0 ${t.color}22`,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ fontFamily: 'var(--font-orbitron)', fontWeight: 900, color: t.color, fontSize: 42, lineHeight: 1 }}>
        +{prize.xp}
      </div>
      <div style={{ fontFamily: 'var(--font-orbitron)', color: `${t.color}65`, fontSize: 9, letterSpacing: '0.35em', marginTop: 5 }}>
        XP
      </div>
      <div style={{ color: `${t.color}60`, fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'var(--font-orbitron)', marginTop: 14 }}>
        {t.label}
      </div>
    </div>
  );
}

export const DailyGacha = ({ onComplete, onClose }: DailyGachaProps) => {
  const [phase, setPhase]           = useState<'ready' | 'spinning' | 'result' | 'error'>('ready');
  const [prize, setPrize]           = useState<SpinPrize | null>(null);
  const [newTotalXp, setNewTotalXp] = useState<number | null>(null);
  const [nextSpinAt, setNextSpinAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // 6 shuffle cards + the drawn card
  const shuffleRefs  = useRef<(HTMLDivElement | null)[]>(Array(6).fill(null));
  const topCardRef   = useRef<HTMLDivElement>(null);
  const cardInnerRef = useRef<HTMLDivElement>(null);

  // Set initial deck positions via GSAP (avoids CSS transform conflicts)
  useLayoutEffect(() => {
    shuffleRefs.current.forEach((card, i) => {
      if (card) gsap.set(card, INIT_POS[i]);
    });
    if (topCardRef.current)   gsap.set(topCardRef.current,   { zIndex: 10, x: 0, y: 0, rotation: 0, scale: 1 });
    if (cardInnerRef.current) gsap.set(cardInnerRef.current, { rotateY: 0 });
  }, []);

  const spin = async () => {
    if (!topCardRef.current || !cardInnerRef.current) return;
    setPhase('spinning');

    // API fires immediately — will be awaited after the shuffle sequence
    const apiPromise = fetch('/api/xp/daily-spin', { method: 'POST' }).then(r => r.json());

    const all6       = shuffleRefs.current.filter(Boolean) as HTMLDivElement[];
    const topHalf    = [3, 4, 5].map(i => shuffleRefs.current[i]).filter(Boolean) as HTMLDivElement[];
    const bottomHalf = [0, 1, 2].map(i => shuffleRefs.current[i]).filter(Boolean) as HTMLDivElement[];

    // ── Phase 1: Settle — "hand placed on deck" (200ms) ─────────────────
    await gsap.to([...all6, topCardRef.current], { y: '+=3', duration: 0.10, ease: 'power1.in' });
    await gsap.to([...all6, topCardRef.current], { y: '-=3', duration: 0.10, ease: 'power1.out' });

    // ── Phase 1.5: Top card separates (120ms) ────────────────────────────
    // Card rises slightly, distancing itself from the deck before the riffle
    await gsap.to(topCardRef.current, { y: '-=10', duration: 0.12, ease: 'power2.out' });

    // ── Phase 2a: Split (120ms) ──────────────────────────────────────────
    // Top half (high-z) lifts left; bottom half drops right
    await Promise.all([
      gsap.to(topHalf,    { x: -22, y: -5, rotation: -3, duration: 0.12, ease: 'power2.out' }),
      gsap.to(bottomHalf, { x:  22, y:  5, rotation:  3, duration: 0.12, ease: 'power2.out' }),
    ]);

    // ── Phase 2b: Bridge hold — "fingers ready" (60ms) ──────────────────
    await new Promise(r => setTimeout(r, 60));

    // ── Phase 2c: Interleave — alternating drop (≈295ms) ─────────────────
    // Drop order: T5, B2, T4, B1, T3, B0  — alternating top/bottom halves
    const DROP_ORDER  = [5, 2, 4, 1, 3, 0];
    const STAGGER_S   = 0.042; // 42ms between each card
    const dropTl = gsap.timeline();
    DROP_ORDER.forEach((cardIdx, i) => {
      const card = shuffleRefs.current[cardIdx];
      if (!card) return;
      dropTl
        .set(card, { zIndex: 6 - i },                                              i * STAGGER_S)
        .to(card,  { x: 0, y: 0, rotation: 0, duration: 0.085, ease: 'power3.in' }, i * STAGGER_S);
    });
    await dropTl;

    // ── Phase 2d: Deck settle — "thud" (90ms) ────────────────────────────
    // playThud();
    await gsap.to(all6, { y: '+=2', scale: 1.02, duration: 0.045, ease: 'power2.in' });
    await gsap.to(all6, { y: '-=2', scale: 1.00, duration: 0.045, ease: 'power2.out' });

    // ── Phase 3: Held breath (150ms) ─────────────────────────────────────
    // Pure stillness. Yugi closes his eyes.
    await new Promise(r => setTimeout(r, 150));

    // ── Await API result — should be resolved long before this point ─────
    let data: Record<string, unknown>;
    try {
      data = await apiPromise;
    } catch {
      setErrorMessage('Network error — try again');
      setPhase('error');
      return;
    }

    if (data.alreadySpun) {
      setErrorMessage('Already spun today!');
      setPhase('error');
      return;
    }
    if (!data.success) {
      setErrorMessage((data.error as string) || 'Spin failed — try again');
      setPhase('error');
      return;
    }

    const p = data.prize as SpinPrize;
    setPrize(p);
    setNewTotalXp(data.newTotalXp as number);
    setNextSpinAt(data.nextSpinAt as string);

    // One frame for React to render CardFace content into the front face
    await new Promise(r => requestAnimationFrame(r));

    // ── Phase 4a: Draw (240ms) ────────────────────────────────────────────
    // topCard is at y:-10 from the separation in Phase 1.5
    // y:-46 absolute = 36px additional lift from current position
    gsap.to(topCardRef.current, { y: -46, rotation: 4, scale: 1.07, duration: 0.24, ease: 'power2.out' });
    await new Promise(r => setTimeout(r, 240)); // wait for lift

    // ── Legendary hover hold + wobble (400ms extra) ───────────────────────
    if (p.rarity === 'legendary') {
      // playShing();
      // Card trembles at the peak — card knows what it is
      await gsap.to(topCardRef.current, { rotation: 5.5, duration: 0.08, ease: 'sine.inOut' });
      await gsap.to(topCardRef.current, { rotation: 2.5, duration: 0.08, ease: 'sine.inOut' });
      await gsap.to(topCardRef.current, { rotation: 5.5, duration: 0.08, ease: 'sine.inOut' });
      await gsap.to(topCardRef.current, { rotation: 2.5, duration: 0.08, ease: 'sine.inOut' });
      await gsap.to(topCardRef.current, { rotation: 4,   duration: 0.08, ease: 'sine.inOut' });
      // Final stillness before the flip
      await new Promise(r => setTimeout(r, 200));
    }

    // ── Phase 4b: Flip (340ms) ────────────────────────────────────────────
    gsap.to(topCardRef.current,   { rotation: 0, scale: 1, duration: 0.34, ease: 'power2.inOut' });
    await gsap.to(cardInnerRef.current, { rotateY: 180, duration: 0.34, ease: 'power2.inOut' });

    setPhase('result');
  };

  const formatNextSpin = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit',
      timeZone: 'America/Los_Angeles', timeZoneName: 'short',
    });

  const pt       = prize ? TIER_STYLE[prize.rarity] : null;
  const showDeck = phase === 'ready' || phase === 'spinning' || phase === 'result';

  return (
    <div className="fixed inset-0 bg-[#080810] flex items-center justify-center z-50">

      {phase === 'result' && pt && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 40%, ${pt.pulse} 0%, transparent 62%)` }} />
      )}

      <div className="relative w-full max-w-xs mx-4 text-center">

        {/* Header */}
        <div className="mb-10">
          <p className="font-orbitron text-[10px] tracking-[0.3em] uppercase mb-2 transition-colors duration-300"
            style={{ color: pt ? `${pt.color}75` : 'rgba(0,200,234,0.5)' }}>
            {phase === 'ready'    && 'Daily Reward'}
            {phase === 'spinning' && 'Rolling'}
            {phase === 'result'   && pt?.label}
            {phase === 'error'    && 'Error'}
          </p>
          <h2 className="font-orbitron font-black text-2xl text-white tracking-tight">
            {phase === 'ready'    && 'DAILY SPIN'}
            {phase === 'spinning' && 'SPINNING'}
            {phase === 'result'   && prize && `+${prize.xp} XP`}
            {phase === 'error'    && 'FAILED'}
          </h2>
        </div>

        {/* Deck — stays mounted through ready/spinning/result so GSAP positions survive */}
        {showDeck && (
          <div className="flex justify-center mb-8" style={{ perspective: '900px' }}>
            <div className="relative" style={{ width: CARD_W, height: CARD_H }}>

              {/* 6 shuffle cards (positions set by GSAP in useLayoutEffect) */}
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  ref={el => { shuffleRefs.current[i] = el; }}
                  style={{ position: 'absolute', inset: 0 }}
                >
                  <CardBack />
                </div>
              ))}

              {/* Drawn card — the face-flipper (z:10, always on top) */}
              <div ref={topCardRef} style={{ position: 'absolute', inset: 0 }}>
                <div
                  ref={cardInnerRef}
                  style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
                >
                  {/* Back face */}
                  <div style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}>
                    <CardBack />
                  </div>
                  {/* Front face — hidden at rotateY(180) until GSAP flips the inner container */}
                  <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', inset: 0 }}>
                    <CardFace prize={prize} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Result stats */}
        {phase === 'result' && prize && pt && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mb-8 space-y-1"
          >
            {newTotalXp !== null && (
              <p className="text-white/25 text-xs font-mono">
                Total XP <span style={{ color: `${pt.color}80` }}>{newTotalXp.toLocaleString()}</span>
              </p>
            )}
            {nextSpinAt && (
              <p className="text-white/20 text-[11px]">Next spin at {formatNextSpin(nextSpinAt)}</p>
            )}
          </motion.div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div className="mb-8">
            <div className="bg-red-500/[0.07] border border-red-500/20 rounded-xl p-5 mb-4">
              <p className="text-red-400 text-sm">{errorMessage}</p>
            </div>
            <button onClick={onClose} className="text-white/30 text-sm hover:text-white/60 transition-colors">
              Close
            </button>
          </div>
        )}

        {/* Actions */}
        {phase === 'ready' && (
          <div className="space-y-3">
            <button
              onClick={spin}
              className="w-full bg-[#00c8ea] text-[#080810] font-orbitron font-bold uppercase tracking-wider py-4 rounded-xl hover:bg-[#00f0ff] active:scale-[0.98] transition-all"
            >
              Spin
            </button>
            <button onClick={onClose} className="w-full text-white/30 text-sm hover:text-white/60 transition-colors py-2">
              Cancel
            </button>
          </div>
        )}

        {phase === 'result' && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => { onComplete(); onClose(); }}
            className="w-full font-orbitron font-bold uppercase tracking-wider py-4 rounded-xl active:scale-[0.98] transition-all"
            style={{ background: pt?.color ?? '#00c8ea', color: '#080810' }}
          >
            Claim
          </motion.button>
        )}

        {phase === 'spinning' && (
          <p className="text-white/15 text-[11px] font-mono animate-pulse">Drawing your card...</p>
        )}
      </div>

      <style>{`
        .holo-card::after {
          content: ''; position: absolute; inset: 0; border-radius: 10px;
          background: linear-gradient(135deg,
            rgba(251,191,36,0.12) 0%,  rgba(168,85,247,0.10) 20%,
            rgba(59,130,246,0.10) 40%, rgba(34,197,94,0.08)  60%,
            rgba(251,191,36,0.12) 80%, rgba(192,132,252,0.10) 100%
          );
          background-size: 400% 400%;
          animation: holo-sweep 3s ease infinite;
          pointer-events: none;
        }
        @keyframes holo-sweep {
          0%   { background-position: 0%   50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0%   50%; }
        }
      `}</style>
    </div>
  );
};
