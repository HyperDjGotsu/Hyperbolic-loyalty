'use client';

import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'idle' | 'awakened' | 'shuffle' | 'spread' | 'reveal' | 'error' | 'already_spun';
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface SpinPrize {
  xp: number;
  label: string;
  rarity: Rarity;
}

interface DailyGachaProps {
  onComplete: () => void;
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_W = 112;
const CARD_H = 157;

const INIT_POS = [
  { x: -5,   y: 6,   rotation: -3.5, zIndex: 1 },
  { x: -5,   y: 6,   rotation: -3.5, zIndex: 2 },
  { x: -2.5, y: 3,   rotation: -2,   zIndex: 3 },
  { x: -2.5, y: 3,   rotation: -2,   zIndex: 4 },
  { x:  0,   y: 0,   rotation:  0,   zIndex: 5 },
  { x:  0,   y: 0,   rotation:  0,   zIndex: 6 },
] as const;

const SPREAD_POS = [
  { x: -120, y: 20,  rotation: -18 },
  { x:    0, y: -15, rotation:   0 },
  { x:  120, y: 20,  rotation:  18 },
] as const;

const TIER: Record<Rarity, { color: string; bg: string; border: string; glow: string; pulse: string; label: string }> = {
  common:    { color: '#8899bb', bg: '#111120', border: '#2a2a48', glow: 'rgba(136,153,187,0.28)', pulse: 'rgba(136,153,187,0.10)', label: 'Common'    },
  uncommon:  { color: '#52a8c0', bg: '#09141e', border: '#164455', glow: 'rgba(82,168,192,0.38)',  pulse: 'rgba(82,168,192,0.12)',  label: 'Uncommon'  },
  rare:      { color: '#4878c8', bg: '#08101c', border: '#0c2e82', glow: 'rgba(72,120,200,0.45)',  pulse: 'rgba(72,120,200,0.14)',  label: 'Rare'      },
  epic:      { color: '#8838b8', bg: '#0e0818', border: '#320666', glow: 'rgba(136,56,184,0.48)',  pulse: 'rgba(136,56,184,0.14)',  label: 'Epic'      },
  legendary: { color: '#c89e1a', bg: '#160e00', border: '#5c3e00', glow: 'rgba(200,158,26,0.55)',  pulse: 'rgba(200,158,26,0.18)',  label: 'Legendary' },
};

// ─── CardBack — sacred geometry on navy ──────────────────────────────────────

function CardBack({ shimmer = false }: { shimmer?: boolean }) {
  return (
    <div style={{
      width: CARD_W, height: CARD_H,
      background: '#0e0e1c',
      border: '1px solid rgba(0,200,234,0.24)',
      borderRadius: 10,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      position: 'relative', overflow: 'hidden', userSelect: 'none',
    }}>
      <div style={{ position: 'absolute', inset: 5, border: '1px solid rgba(0,200,234,0.09)', borderRadius: 6 }} />
      {([[9,9],[9,CARD_H-14],[CARD_W-14,9],[CARD_W-14,CARD_H-14]] as [number,number][]).map(([lx,ly],i) => (
        <div key={i} style={{ position: 'absolute', left: lx, top: ly, width: 5, height: 5, background: 'rgba(0,200,234,0.38)', transform: 'rotate(45deg)' }} />
      ))}
      <svg width={84} height={84} viewBox="0 0 84 84"
        style={{ position: 'absolute', left: (CARD_W-84)/2, top: (CARD_H-84)/2, overflow: 'visible' }}>
        <polygon points="42,3 76,21.5 76,62.5 42,81 8,62.5 8,21.5"
          fill="none" stroke="rgba(0,200,234,0.26)" strokeWidth="0.9" />
        <circle cx="34" cy="42" r="15" fill="none" stroke="rgba(0,200,234,0.26)" strokeWidth="0.9" />
        <circle cx="50" cy="42" r="15" fill="none" stroke="rgba(0,200,234,0.26)" strokeWidth="0.9" />
        <circle cx="42" cy="42" r="1.8" fill="rgba(0,200,234,0.48)" />
      </svg>
      {shimmer && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, transparent 20%, rgba(200,158,26,0.12) 50%, transparent 80%)',
          animation: 'legBack 2.5s ease-in-out infinite',
        }} />
      )}
    </div>
  );
}

// ─── CardFace ─────────────────────────────────────────────────────────────────

function CardFace({ prize }: { prize: SpinPrize }) {
  const t = TIER[prize.rarity];
  return (
    <div style={{
      width: CARD_W, height: CARD_H,
      background: t.bg,
      border: `1px solid ${t.border}`,
      borderRadius: 10,
      boxShadow: `0 0 ${prize.rarity === 'legendary' ? 20 : 8}px ${t.glow}, inset 0 1px 0 ${t.color}20`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', gap: 3,
    }}>
      <div style={{ color: `${t.color}55`, fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'var(--font-orbitron)' }}>
        {t.label}
      </div>
      <div style={{ color: t.color, fontSize: 42, fontWeight: 900, lineHeight: 1, fontFamily: 'var(--font-orbitron)' }}>
        +{prize.xp}
      </div>
      <div style={{ color: `${t.color}60`, fontSize: 9, letterSpacing: '0.35em', fontFamily: 'var(--font-orbitron)' }}>XP</div>
      <div style={{ color: `${t.color}80`, fontSize: 10, textAlign: 'center', padding: '0 10px', fontFamily: 'var(--font-rajdhani)', fontWeight: 600, marginTop: 4 }}>
        {prize.label}
      </div>
      {prize.rarity === 'legendary' && (
        <div className="holo-card" style={{ position: 'absolute', inset: 0, borderRadius: 10, pointerEvents: 'none' }} />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const DailyGacha = ({ onComplete, onClose }: DailyGachaProps) => {
  const [phase,       _setPhase]    = useState<Phase>('loading');
  const [prize,       setPrize]     = useState<SpinPrize | null>(null);
  const [nextSpinAt,  setNextSpinAt]  = useState<string | null>(null);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [countdown,   setCountdown]   = useState('');
  const [errorMsg,    setErrorMsg]    = useState('');

  // Synchronous refs — bypass stale closure issues in async animation callbacks
  const phaseRef = useRef<Phase>('loading');
  const prizeRef = useRef<SpinPrize | null>(null);
  const busyRef  = useRef(false);

  function setPhase(p: Phase) { phaseRef.current = p; _setPhase(p); }

  // Card element refs
  const shuffleRefs = useRef<(HTMLDivElement | null)[]>(Array(6).fill(null));
  const spreadRefs  = useRef<(HTMLDivElement | null)[]>(Array(3).fill(null));
  const innerRefs   = useRef<(HTMLDivElement | null)[]>(Array(3).fill(null));

  // Swipe gesture state
  const gestureRef = useRef({ active: false, startX: 0, dx: 0 });

  // GSAP quickTo handles (created when phase becomes 'awakened')
  const qX   = useRef<((v: number) => void) | null>(null);
  const qRot = useRef<((v: number) => void) | null>(null);

  // Float tween kill handle
  const floatRef = useRef<gsap.core.Tween | null>(null);

  const reducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const tutorialSeen = useRef(
    typeof window !== 'undefined' && localStorage.getItem('hgx_gacha_tutorial_seen') === '1'
  );

  // ── Initial card positions ─────────────────────────────────────────────────

  useLayoutEffect(() => {
    INIT_POS.forEach((pos, i) => { const el = shuffleRefs.current[i]; if (el) gsap.set(el, pos); });
    spreadRefs.current.forEach(el => { if (el) gsap.set(el, { x: 0, y: 0, rotation: 0, opacity: 0, scale: 0.88 }); });
    innerRefs.current.forEach(el => { if (el) gsap.set(el, { rotateY: 0 }); });
  }, []);

  // ── GET on mount ───────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/xp/daily-spin')
      .then(r => r.json())
      .then(d => {
        if (d.canSpin) { setPhase('idle'); }
        else { setNextSpinAt(d.nextSpinAt); setPhase('already_spun'); }
      })
      .catch(() => { setErrorMsg('Could not connect. Please try again.'); setPhase('error'); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Countdown timer ────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'already_spun' || !nextSpinAt) return;
    const tick = () => {
      const ms = Math.max(0, new Date(nextSpinAt).getTime() - Date.now());
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setCountdown(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, nextSpinAt]);

  // ── Float animation when awakened ─────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'awakened') return;
    const topCard = shuffleRefs.current[5];
    if (!topCard) return;
    qX.current   = gsap.quickTo(topCard, 'x',        { duration: 0.08, ease: 'none' });
    qRot.current = gsap.quickTo(topCard, 'rotation', { duration: 0.08, ease: 'none' });
    floatRef.current = gsap.to(shuffleRefs.current.slice(0, 5), {
      y: '-=3', duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.06,
    });
    return () => { floatRef.current?.kill(); };
  }, [phase]);

  // ── POST ───────────────────────────────────────────────────────────────────

  async function firePost(): Promise<boolean> {
    try {
      const res  = await fetch('/api/xp/daily-spin', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        if (data.alreadySpun) { setNextSpinAt(data.nextSpinAt); setPhase('already_spun'); return false; }
        throw new Error(data.error || 'Spin failed');
      }
      const p: SpinPrize = { xp: data.prize.xp, label: data.prize.label, rarity: data.prize.rarity };
      prizeRef.current = p;
      setPrize(p);
      setNextSpinAt(data.nextSpinAt);
      return true;
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please retry.');
      setPhase('error');
      return false;
    }
  }

  // ── Animation helpers ─────────────────────────────────────────────────────

  async function runShuffle() {
    if (reducedMotion) return;
    const cards      = shuffleRefs.current.filter(Boolean) as HTMLDivElement[];
    const topHalf    = [3,4,5].map(i => shuffleRefs.current[i]).filter(Boolean) as HTMLDivElement[];
    const bottomHalf = [0,1,2].map(i => shuffleRefs.current[i]).filter(Boolean) as HTMLDivElement[];

    await gsap.to(cards, { x: 0, y: 0, rotation: 0, duration: 0.20, ease: 'power2.out', stagger: 0.022 });
    await Promise.all([
      gsap.to(topHalf,    { x: -24, y: -5, rotation: -3, duration: 0.13, ease: 'power2.out' }),
      gsap.to(bottomHalf, { x:  24, y:  5, rotation:  3, duration: 0.13, ease: 'power2.out' }),
    ]);
    await new Promise(r => setTimeout(r, 55));

    const tl = gsap.timeline();
    [5, 2, 4, 1, 3, 0].forEach((ci, i) => {
      const el = shuffleRefs.current[ci];
      if (!el) return;
      tl.set(el, { zIndex: 6 - i },                                               i * 0.07)
        .to(el,  { x: 0, y: 0, rotation: 0, duration: 0.09, ease: 'power3.in' }, i * 0.07);
    });
    await tl;

    await gsap.to(cards, { y: '+=2', scale: 1.02, duration: 0.04, ease: 'power2.in' });
    await gsap.to(cards, { y:    0,  scale: 1.00, duration: 0.04, ease: 'power2.out' });
    await new Promise(r => setTimeout(r, 110));
  }

  async function runSpread() {
    if (reducedMotion) {
      SPREAD_POS.forEach((pos, i) => { const el = spreadRefs.current[i]; if (el) gsap.set(el, { ...pos, opacity: 1, scale: 1 }); });
      gsap.set(shuffleRefs.current, { opacity: 0.2, scale: 0.9 });
      return;
    }
    gsap.to(shuffleRefs.current, { opacity: 0.22, scale: 0.88, duration: 0.28, ease: 'power2.out', stagger: 0.018 });
    const tl = gsap.timeline();
    SPREAD_POS.forEach((pos, i) => {
      tl.to(spreadRefs.current[i], { ...pos, opacity: 1, scale: 1, duration: 0.46, ease: 'back.out(1.8)' }, i * 0.09);
    });
    await tl;
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  async function handleTap() {
    if (phaseRef.current !== 'idle' || busyRef.current) return;
    busyRef.current = true;
    if (!reducedMotion) {
      gsap.to(shuffleRefs.current.slice(3), { scale: 1.03, duration: 0.11, yoyo: true, repeat: 1, ease: 'power2.out' });
      await gsap.to(shuffleRefs.current[5], { y: -8, duration: 0.26, ease: 'back.out(2.5)' });
    }
    setPhase('awakened');
    localStorage.setItem('hgx_gacha_tutorial_seen', '1');
    tutorialSeen.current = true;
    busyRef.current = false;
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (phaseRef.current !== 'awakened') return;
    gestureRef.current = { active: true, startX: e.clientX, dx: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!gestureRef.current.active || phaseRef.current !== 'awakened') return;
    const dx = e.clientX - gestureRef.current.startX;
    gestureRef.current.dx = dx;
    qX.current?.(Math.max(-18, Math.min(18, dx)));
    qRot.current?.(Math.max(-4, Math.min(4, dx * (4 / 18))));
    const topCard = shuffleRefs.current[5];
    if (topCard) gsap.set(topCard, { y: -8 - Math.min(1, Math.abs(dx) / 80) * 4 });
  }

  function handlePointerUp() {
    if (!gestureRef.current.active) return;
    gestureRef.current.active = false;
    const { dx } = gestureRef.current;
    if (Math.abs(dx) >= 80) { commitSwipe(dx); } else { snapBack(); }
  }

  function snapBack() {
    gsap.to(shuffleRefs.current[5], { x: 0, rotation: 0, y: -8, duration: 0.44, ease: 'back.out(2)' });
  }

  async function commitSwipe(dx: number) {
    if (busyRef.current) return;
    busyRef.current = true;
    setPhase('shuffle');
    floatRef.current?.kill();
    gsap.killTweensOf(shuffleRefs.current);

    if (!reducedMotion) {
      await gsap.to(shuffleRefs.current[5], {
        x: dx > 0 ? 24 : -24, rotation: dx > 0 ? 4 : -4, y: -12,
        duration: 0.10, ease: 'power2.out',
      });
    }

    const postPromise = firePost();
    await runShuffle();
    const ok = await postPromise;
    if (!ok) { busyRef.current = false; return; }

    // Give React one frame to render CardFace into the hidden front faces
    await new Promise(r => requestAnimationFrame(r));

    await runSpread();
    setPhase('spread');
    busyRef.current = false;
  }

  async function handlePick(index: number) {
    if (phaseRef.current !== 'spread' || !prizeRef.current || busyRef.current) return;
    busyRef.current = true;
    setPickedIndex(index);
    setPhase('reveal');
    const p = prizeRef.current;

    if (!reducedMotion) {
      spreadRefs.current.forEach((el, i) => {
        if (i !== index && el) gsap.to(el, { opacity: 0, scale: 0.84, duration: 0.25, ease: 'power2.in' });
      });
      await gsap.to(spreadRefs.current[index], { x: 0, y: -22, rotation: 0, duration: 0.36, ease: 'back.out(1.5)' });
      if (p.rarity === 'legendary') await new Promise(r => setTimeout(r, 650));
      gsap.to(spreadRefs.current[index], { rotation: 3, duration: 0.14, ease: 'power2.out' });
      await gsap.to(innerRefs.current[index], { rotateY: 180, duration: 0.34, ease: 'power2.inOut' });
      gsap.to(spreadRefs.current[index], { rotation: 0, duration: 0.16, ease: 'power2.out' });
    } else {
      const el = innerRefs.current[index];
      if (el) gsap.set(el, { rotateY: 180 });
    }
    busyRef.current = false;
  }

  async function handleSkip() {
    if (phaseRef.current !== 'idle' || busyRef.current) return;
    busyRef.current = true;
    setPhase('shuffle');
    const ok = await firePost();
    if (!ok) { busyRef.current = false; return; }
    await new Promise(r => requestAnimationFrame(r));
    const el = spreadRefs.current[1];
    if (el) gsap.set(el, { x: 0, y: -22, rotation: 0, opacity: 1, scale: 1 });
    const inner = innerRefs.current[1];
    if (inner) gsap.set(inner, { rotateY: 180 });
    setPickedIndex(1);
    setPhase('reveal');
    busyRef.current = false;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const t = prize ? TIER[prize.rarity] : null;
  const showRitual = ['idle','awakened','shuffle','spread','reveal'].includes(phase);

  return (
    <div className="fixed inset-0 bg-[#080810] flex flex-col items-center justify-center z-50 select-none">

      {phase === 'reveal' && t && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 45%, ${t.pulse} 0%, transparent 62%)` }} />
      )}

      <button onClick={onClose}
        className="absolute top-4 right-4 text-white/20 hover:text-white/50 transition-colors p-2 leading-none"
        style={{ fontSize: 22 }} aria-label="Close">
        ×
      </button>

      {/* ── Loading ── */}
      {phase === 'loading' && (
        <div className="text-white/20 text-xs font-mono animate-pulse tracking-widest">LOADING</div>
      )}

      {/* ── Already spun ── */}
      {phase === 'already_spun' && (
        <div className="text-center">
          <p className="font-orbitron text-[10px] tracking-[0.3em] uppercase text-white/25 mb-3">Next spin in</p>
          <p className="font-orbitron font-black text-4xl text-[#00c8ea] tabular-nums tracking-tight">{countdown}</p>
          <button onClick={onClose}
            className="mt-10 text-white/20 text-sm hover:text-white/45 transition-colors">
            Close
          </button>
        </div>
      )}

      {/* ── Ritual ── */}
      {showRitual && (
        <div className="relative w-full max-w-xs mx-4 flex flex-col items-center">

          {/* Prompt */}
          <div className="mb-6 h-8 flex items-center justify-center">
            <p className="font-orbitron uppercase transition-all duration-300"
              style={{
                fontSize:      phase === 'reveal' ? 18 : 10,
                fontWeight:    phase === 'reveal' ? 900 : 400,
                color:         phase === 'reveal' && t ? t.color : 'rgba(255,255,255,0.28)',
                letterSpacing: phase === 'reveal' ? '0.05em' : '0.25em',
              }}>
              {phase === 'idle'    && 'Tap the deck'}
              {phase === 'awakened'&& 'Swipe to shuffle'}
              {phase === 'shuffle' && '· · ·'}
              {phase === 'spread'  && 'Choose a card'}
              {phase === 'reveal'  && prize && `+${prize.xp} XP`}
            </p>
          </div>

          {/* Swipe arrow */}
          {phase === 'awakened' && (
            <div className="absolute font-orbitron text-[10px] tracking-[0.2em] text-[#00c8ea]/55"
              style={{ top: 28, animation: 'swipeArrow 1.4s ease-in-out infinite' }}>
              ← swipe →
            </div>
          )}

          {/* Card interaction area */}
          <div style={{ position: 'relative', width: 380, height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

            {/* Deck — tap target in idle, swipe target in awakened */}
            <div
              onPointerDown={e => {
                if (phaseRef.current === 'idle') handleTap();
                else if (phaseRef.current === 'awakened') handlePointerDown(e);
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              role="button"
              tabIndex={phase === 'idle' || phase === 'awakened' ? 0 : -1}
              aria-label={phase === 'idle' ? 'Tap to begin daily spin' : 'Swipe to shuffle the deck'}
              onKeyDown={e => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                if (phase === 'idle') handleTap();
                else if (phase === 'awakened') commitSwipe(80);
              }}
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                width: CARD_W, height: CARD_H,
                marginLeft: -CARD_W / 2, marginTop: -CARD_H / 2,
                touchAction: 'none',
                cursor: phase === 'idle' ? 'pointer' : phase === 'awakened' ? 'grab' : 'default',
                zIndex: phase === 'idle' || phase === 'awakened' ? 20 : 2,
              }}
            >
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} ref={el => { shuffleRefs.current[i] = el; }}
                  style={{ position: 'absolute', inset: 0, willChange: 'transform' }}>
                  <CardBack />
                </div>
              ))}
            </div>

            {/* 3 spread cards — face-down, all carry the same prize */}
            {[0, 1, 2].map(i => (
              <div
                key={`s${i}`}
                ref={el => { spreadRefs.current[i] = el; }}
                onClick={() => { if (phase === 'spread') handlePick(i); }}
                role={phase === 'spread' ? 'button' : undefined}
                tabIndex={phase === 'spread' ? 0 : -1}
                aria-label={phase === 'spread' ? `Choose card ${i + 1}` : undefined}
                onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && phase === 'spread') handlePick(i); }}
                style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  marginLeft: -CARD_W / 2, marginTop: -CARD_H / 2,
                  cursor: phase === 'spread' ? 'pointer' : 'default',
                  willChange: 'transform, opacity',
                  zIndex: 10,
                  perspective: 900,
                }}
              >
                <div ref={el => { innerRefs.current[i] = el; }}
                  style={{ width: CARD_W, height: CARD_H, transformStyle: 'preserve-3d', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                    <CardBack shimmer={prize?.rarity === 'legendary'} />
                  </div>
                  <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    {prize && <CardFace prize={prize} />}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reveal claim */}
          {phase === 'reveal' && prize && t && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="mt-4 w-full space-y-3"
            >
              <button
                onClick={() => { onComplete(); onClose(); }}
                className="w-full font-orbitron font-bold uppercase tracking-wider py-4 rounded-xl active:scale-[0.98] transition-all"
                style={{ background: t.border, color: t.color, border: `1px solid ${t.color}50` }}
              >
                Claim +{prize.xp} XP
              </button>
              {nextSpinAt && (
                <p className="text-center text-white/20 text-[11px]">
                  Next spin at {new Date(nextSpinAt).toLocaleTimeString('en-US', {
                    hour: 'numeric', minute: '2-digit',
                    timeZone: 'America/Los_Angeles', timeZoneName: 'short',
                  })}
                </p>
              )}
            </motion.div>
          )}

          {/* Skip (only after first session) */}
          {phase === 'idle' && tutorialSeen.current && (
            <button onClick={handleSkip}
              className="mt-5 text-white/20 text-[11px] hover:text-white/40 transition-colors">
              Skip animation
            </button>
          )}

          {/* Shuffle loading hint */}
          {phase === 'shuffle' && (
            <p className="mt-5 text-white/15 text-[11px] font-mono animate-pulse">Drawing fate…</p>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {phase === 'error' && (
        <div className="text-center max-w-xs mx-4">
          <div className="bg-red-500/[0.07] border border-red-500/20 rounded-xl p-5 mb-4">
            <p className="text-red-400 text-sm">{errorMsg}</p>
          </div>
          <button onClick={() => { setErrorMsg(''); setPhase('idle'); }}
            className="text-white/30 text-sm hover:text-white/60 transition-colors">
            Retry
          </button>
        </div>
      )}

      <style>{`
        @keyframes swipeArrow {
          0%,100% { opacity: 0.3; transform: translateX(-8px); }
          50%      { opacity: 0.85; transform: translateX(8px); }
        }
        @keyframes legBack {
          0%,100% { opacity: 0.35; }
          50%      { opacity: 1; }
        }
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
