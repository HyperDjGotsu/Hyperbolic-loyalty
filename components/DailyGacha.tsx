'use client';

import { useState, useRef } from 'react';
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

function CardBack({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      width: CARD_W, height: CARD_H, borderRadius: 10,
      background: 'linear-gradient(155deg, #111122 0%, #0a0a14 100%)',
      border: '1px solid rgba(0,200,234,0.22)',
      boxShadow: 'inset 0 1px 0 rgba(0,200,234,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      ...style,
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
  const isLegendary = prize.rarity === 'legendary';

  return (
    <div
      className={isLegendary ? 'holo-card' : ''}
      style={{
        width: CARD_W, height: CARD_H, borderRadius: 10,
        background: 'linear-gradient(155deg, #0f0f1a 0%, #0a0a14 100%)',
        border: `1px solid ${t.glow}`,
        boxShadow: `0 0 20px ${t.glow}, inset 0 1px 0 ${t.color}22`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{
        fontFamily: 'var(--font-orbitron)', fontWeight: 900,
        color: t.color, fontSize: 42, lineHeight: 1,
      }}>
        +{prize.xp}
      </div>
      <div style={{
        fontFamily: 'var(--font-orbitron)',
        color: `${t.color}65`, fontSize: 9,
        letterSpacing: '0.35em', marginTop: 5,
      }}>
        XP
      </div>
      <div style={{
        color: `${t.color}60`, fontSize: 8,
        letterSpacing: '0.22em', textTransform: 'uppercase',
        fontFamily: 'var(--font-orbitron)', marginTop: 14,
      }}>
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

  const topCardRef   = useRef<HTMLDivElement>(null);
  const cardInnerRef = useRef<HTMLDivElement>(null);
  const deckCard2Ref = useRef<HTMLDivElement>(null);
  const deckCard3Ref = useRef<HTMLDivElement>(null);

  const resetDeck = () => {
    if (topCardRef.current)
      gsap.to(topCardRef.current, { y: 0, rotation: 0, scale: 1, duration: 0.3, ease: 'power2.out' });
    gsap.to([deckCard2Ref.current, deckCard3Ref.current], { opacity: 1, duration: 0.3 });
  };

  const spin = async () => {
    if (!topCardRef.current || !cardInnerRef.current) return;
    setPhase('spinning');

    // Step 1: fade out bottom cards, lift top card
    gsap.to([deckCard2Ref.current, deckCard3Ref.current], { opacity: 0, duration: 0.2 });
    gsap.to(topCardRef.current, { y: -46, rotation: 4, scale: 1.07, duration: 0.24, ease: 'power2.out' });

    // Fire API immediately, in parallel with animation
    const apiPromise = fetch('/api/xp/daily-spin', { method: 'POST' }).then(r => r.json());

    // Step 2: brief hold at peak (lift completes at ~240ms, pause until 380ms)
    await new Promise(r => setTimeout(r, 380));

    let data: Record<string, unknown>;
    try {
      data = await apiPromise;
    } catch {
      resetDeck();
      setErrorMessage('Network error — try again');
      setPhase('error');
      return;
    }

    if (data.alreadySpun) {
      resetDeck();
      setErrorMessage('Already spun today!');
      setPhase('error');
      return;
    }
    if (!data.success) {
      resetDeck();
      setErrorMessage((data.error as string) || 'Spin failed — try again');
      setPhase('error');
      return;
    }

    const p = data.prize as SpinPrize;
    setPrize(p);
    setNewTotalXp(data.newTotalXp as number);
    setNextSpinAt(data.nextSpinAt as string);

    // Wait one frame for React to render CardFace content before flipping
    await new Promise(r => requestAnimationFrame(r));

    // Step 3: straighten + flip simultaneously
    gsap.to(topCardRef.current, { rotation: 0, scale: 1, duration: 0.34, ease: 'power2.inOut' });
    gsap.to(cardInnerRef.current, {
      rotateY: 180,
      duration: 0.34,
      ease: 'power2.inOut',
      onComplete: () => setPhase('result'),
    });
  };

  const formatNextSpin = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit',
      timeZone: 'America/Los_Angeles', timeZoneName: 'short',
    });

  const pt = prize ? TIER_STYLE[prize.rarity] : null;
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
            {phase === 'ready'   && 'Daily Reward'}
            {phase === 'spinning' && 'Rolling'}
            {phase === 'result'  && pt?.label}
            {phase === 'error'   && 'Error'}
          </p>
          <h2 className="font-orbitron font-black text-2xl text-white tracking-tight">
            {phase === 'ready'   && 'DAILY SPIN'}
            {phase === 'spinning' && 'SPINNING'}
            {phase === 'result'  && prize && `+${prize.xp} XP`}
            {phase === 'error'   && 'FAILED'}
          </h2>
        </div>

        {/* Deck */}
        {showDeck && (
          <div className="flex justify-center mb-8" style={{ perspective: '900px' }}>
            <div className="relative" style={{ width: CARD_W, height: CARD_H }}>

              {/* Card 3 — deepest */}
              <div ref={deckCard3Ref} className="absolute inset-0"
                style={{ transform: 'translate(-6px, 7px) rotate(-4deg)', zIndex: 1 }}>
                <CardBack />
              </div>

              {/* Card 2 */}
              <div ref={deckCard2Ref} className="absolute inset-0"
                style={{ transform: 'translate(-3px, 3.5px) rotate(-2deg)', zIndex: 2 }}>
                <CardBack />
              </div>

              {/* Top card — GSAP target */}
              <div ref={topCardRef} className="absolute inset-0" style={{ zIndex: 3 }}>
                <div
                  ref={cardInnerRef}
                  style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
                >
                  {/* Back face */}
                  <div style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}>
                    <CardBack />
                  </div>
                  {/* Front face (starts rotated away) */}
                  <div style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    position: 'absolute', inset: 0,
                  }}>
                    <CardFace prize={prize} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Result stats — appear after flip */}
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
            style={{
              background: pt?.color ?? '#00c8ea',
              color: '#080810',
            }}
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
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 10px;
          background: linear-gradient(
            135deg,
            rgba(251,191,36,0.12) 0%,
            rgba(168,85,247,0.10) 20%,
            rgba(59,130,246,0.10) 40%,
            rgba(34,197,94,0.08) 60%,
            rgba(251,191,36,0.12) 80%,
            rgba(192,132,252,0.10) 100%
          );
          background-size: 400% 400%;
          animation: holo-sweep 3s ease infinite;
          pointer-events: none;
        }
        @keyframes holo-sweep {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};
