'use client';
// PREVIEW ONLY — visual approval before DailyGacha integration
// Route: /dev/gacha-preview

import React from 'react';

// ─── Dimensions ───────────────────────────────────────────────────────────────

const CW = 168;   // card face width  (inner, border adds ~16px)
const CH = 235;   // card face height (inner, border adds ~16px)
const CX = CW / 2;   // 84
const CY = CH / 2;   // 117.5

// ─── Types / data ─────────────────────────────────────────────────────────────

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const PRIZES: Record<Rarity, { xp: number; label: string }> = {
  common:    { xp: 5,   label: 'Rusty Anchor'    },
  uncommon:  { xp: 10,  label: "Navigator's Log" },
  rare:      { xp: 25,  label: 'Rare Find'        },
  epic:      { xp: 50,  label: 'Treasure Chest'   },
  legendary: { xp: 100, label: 'JACKPOT'          },
};

interface TierDef {
  color: string; bg: string; holo: number;
  glow: string;  aura: string | null;
  label: string; stroke: string;
  borderGrad: string;
}

const TIERS: Record<Rarity, TierDef> = {
  common: {
    color: '#9ab0c8',  stroke: '#9ab0c8',   label: 'COMMON',
    bg:    'radial-gradient(ellipse at 50% 35%, #4a5568 0%, #1a1a2e 100%)',
    holo: 0.08, glow: 'rgba(154,176,200,0.28)', aura: null,
    borderGrad: 'linear-gradient(135deg, #00b4d8 0%, #9ab0c8 50%, #00b4d8 100%)',
  },
  uncommon: {
    color: '#00c8ea',  stroke: '#00c8ea',   label: 'UNCOMMON',
    bg:    'radial-gradient(ellipse at 50% 35%, #0094b0 0%, #023047 100%)',
    holo: 0.15, glow: 'rgba(0,200,234,0.45)', aura: 'rgba(0,200,234,0.18)',
    borderGrad: 'linear-gradient(135deg, #00b4d8 0%, #00c8ea 50%, #00b4d8 100%)',
  },
  rare: {
    color: '#5a9eff',  stroke: '#5a9eff',   label: 'RARE',
    bg:    'radial-gradient(ellipse at 50% 35%, #2a6ed8 0%, #001845 100%)',
    holo: 0.25, glow: 'rgba(90,158,255,0.50)', aura: 'rgba(58,134,255,0.28)',
    borderGrad: 'linear-gradient(135deg, #00b4d8 0%, #3a86ff 50%, #00b4d8 100%)',
  },
  epic: {
    color: '#c77dff',  stroke: '#c77dff',   label: 'EPIC',
    bg:    'radial-gradient(ellipse at 50% 35%, #7b2ecc 0%, #240046 100%)',
    holo: 0.35, glow: 'rgba(199,125,255,0.55)', aura: 'rgba(157,78,221,0.32)',
    borderGrad: 'linear-gradient(135deg, #00b4d8 0%, #9d4edd 50%, #00b4d8 100%)',
  },
  legendary: {
    color: '#ffd166',  stroke: '#ffd166',   label: 'LEGENDARY',
    bg:    'radial-gradient(ellipse at 50% 35%, #cc8800 0%, #4a1c00 100%)',
    holo: 0.60, glow: 'rgba(255,209,102,0.65)', aura: 'rgba(255,183,0,0.40)',
    borderGrad: 'linear-gradient(135deg, #ffb700 0%, #ff6b00 40%, #ffb700 70%, #ffd700 100%)',
  },
};

// ─── Keyframes ────────────────────────────────────────────────────────────────

const KEYFRAMES = `
  @keyframes borderHue {
    0%, 100% { filter: hue-rotate(0deg); }
    50%       { filter: hue-rotate(36deg); }
  }
  @keyframes gemPulse {
    0%, 100% { opacity: 0.55; }
    50%       { opacity: 1.00; }
  }
  @keyframes holoSpin {
    from { transform: rotate(0deg);   }
    to   { transform: rotate(360deg); }
  }
  @keyframes legendaryWave {
    0%   { background-position: 0%   0%;   }
    100% { background-position: 100% 100%; }
  }
  @keyframes auraBreathe {
    0%, 100% { opacity: 0.55; transform: translate(-50%,-50%) scale(1.00); }
    50%       { opacity: 1.00; transform: translate(-50%,-50%) scale(1.15); }
  }
`;

// ─── Holographic foil ─────────────────────────────────────────────────────────

function HoloOverlay({ opacity, speed = 8, legendary = false }: {
  opacity: number; speed?: number; legendary?: boolean;
}) {
  if (legendary) {
    return (
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 8,
        background: 'linear-gradient(135deg, rgba(0,200,234,1) 0%, rgba(200,80,192,1) 25%, rgba(255,183,0,1) 50%, rgba(34,197,94,1) 75%, rgba(0,200,234,1) 100%)',
        backgroundSize: '200% 200%',
        opacity, pointerEvents: 'none',
        mixBlendMode: 'screen',
        animation: `legendaryWave ${speed}s linear infinite`,
        willChange: 'background-position',
      } as React.CSSProperties}/>
    );
  }
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 8,
      background: 'conic-gradient(from 0deg at 50% 50%, rgba(0,180,216,1), rgba(157,78,221,1), rgba(255,183,0,1), rgba(34,197,94,1), rgba(0,180,216,1))',
      opacity, pointerEvents: 'none',
      mixBlendMode: 'screen',
      animation: `holoSpin ${speed}s linear infinite`,
      willChange: 'transform',
    } as React.CSSProperties}/>
  );
}

// ─── Grain texture ────────────────────────────────────────────────────────────

function GrainOverlay() {
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 8,
      opacity: 0.035, pointerEvents: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundSize: '200px 200px',
    }}/>
  );
}

// ─── SVG geometry — hexagon + Vesica Piscis + corner diamonds ────────────────
//
// Hexagon (flat-top, R=60, center CX=84 CY=117.5):
//   144,117.5  114,169.5  54,169.5  24,117.5  54,65.5  114,65.5
//
// Vesica Piscis: two circles cx=62/106 cy=117.5 r=32
//
// Corner diamonds: 7px half-size at (14,18) (154,18) (14,217) (154,217)

function GeometrySVG({ uid, strokeColor }: { uid: string; strokeColor?: string }) {
  const geoId  = `geo-${uid}`;
  const gemId  = `gem-${uid}`;
  const glowId = `cglow-${uid}`;
  const filtId = `gf-${uid}`;
  const strokeRef = strokeColor ?? `url(#${geoId})`;
  const gemFill   = strokeColor ?? `url(#${gemId})`;
  const glowColor = strokeColor ?? '#00c8ea';

  const corners: [number, number][] = [[14, 18], [154, 18], [14, 217], [154, 217]];

  return (
    <svg
      width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <defs>
        {/* Cyan → magenta diagonal gradient for geometry strokes */}
        <linearGradient id={geoId} gradientUnits="userSpaceOnUse"
          x1="24" y1="65.5" x2="144" y2="169.5">
          <stop offset="0%"   stopColor="#00c8ea"/>
          <stop offset="100%" stopColor="#c850c0"/>
        </linearGradient>

        {/* Gemstone pip radial gradient */}
        <radialGradient id={gemId} cx="35%" cy="28%" r="70%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#aaf4ff"/>
          <stop offset="55%"  stopColor="#0090b8"/>
          <stop offset="100%" stopColor="#003050"/>
        </radialGradient>

        {/* Center bloom gradient */}
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor={glowColor} stopOpacity="0.50"/>
          <stop offset="100%" stopColor={glowColor} stopOpacity="0"/>
        </radialGradient>

        {/* Soft glow filter */}
        <filter id={filtId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5"/>
        </filter>
      </defs>

      {/* Center bloom behind geometry */}
      <ellipse cx={CX} cy={CY} rx="42" ry="42" fill={`url(#${glowId})`}/>

      {/* Hexagon glow pass (blurred, behind) */}
      <polygon
        points="144,117.5 114,169.5 54,169.5 24,117.5 54,65.5 114,65.5"
        fill="none" stroke={glowColor} strokeWidth="7" opacity="0.12"
        filter={`url(#${filtId})`}
      />

      {/* Hexagon */}
      <polygon
        points="144,117.5 114,169.5 54,169.5 24,117.5 54,65.5 114,65.5"
        fill="none" stroke={strokeRef} strokeWidth="1.8" opacity="0.85"
      />

      {/* Vesica Piscis — left */}
      <circle cx="62" cy={CY} r="32" fill="none" stroke={strokeRef} strokeWidth="1.6" opacity="0.85"/>
      {/* Vesica Piscis — right */}
      <circle cx="106" cy={CY} r="32" fill="none" stroke={strokeRef} strokeWidth="1.6" opacity="0.85"/>

      {/* Corner diamond pips */}
      {corners.map(([px, py], i) => (
        <polygon
          key={i}
          points={`${px},${py - 7} ${px + 7},${py} ${px},${py + 7} ${px - 7},${py}`}
          fill={gemFill}
          style={{
            animation: `gemPulse ${2.8 + i * 0.35}s ease-in-out ${i * 0.4}s infinite`,
            filter: `drop-shadow(0 0 5px ${glowColor})`,
          }}
        />
      ))}

      {/* Center mark — glow ring */}
      <circle cx={CX} cy={CY} r="7" fill={glowColor} opacity="0.18" filter={`url(#${filtId})`}/>
      {/* Center mark — solid dot */}
      <circle cx={CX} cy={CY} r="2.5" fill={glowColor} opacity="0.95"/>
    </svg>
  );
}

// ─── Border system: white edge → gradient border → inner frame ────────────────

function CardBorder({ children, aura, borderGrad }: {
  children: React.ReactNode;
  aura?: string | null;
  borderGrad: string;
}) {
  return (
    // Outermost: white edge catching light
    <div style={{
      display: 'inline-block', padding: 1, borderRadius: 15,
      background: 'rgba(255,255,255,0.24)',
      boxShadow: aura
        ? `0 0 50px 16px ${aura}, 0 0 100px 40px ${aura}55`
        : '0 0 20px 6px rgba(0,180,216,0.18)',
    }}>
      {/* Outer gradient border — animated hue shift */}
      <div style={{
        padding: 1, borderRadius: 14,
        background: borderGrad,
        animation: 'borderHue 15s ease-in-out infinite',
        willChange: 'filter',
      }}>
        {/* Inner frame — depth shadow gives weight */}
        <div style={{
          padding: 6, borderRadius: 13,
          background: 'linear-gradient(145deg, rgba(0,80,120,0.95) 0%, rgba(55,0,90,0.95) 50%, rgba(0,80,120,0.95) 100%)',
          boxShadow: 'inset 0 2px 14px rgba(0,0,0,0.90), inset 0 -1px 6px rgba(0,0,0,0.60)',
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Card Back ────────────────────────────────────────────────────────────────

function CardBack({ uid }: { uid: string }) {
  return (
    <CardBorder
      borderGrad="linear-gradient(135deg, #00b4d8 0%, #9d4edd 50%, #00b4d8 100%)"
      aura={null}
    >
      <div style={{
        width: CW, height: CH,
        background: 'radial-gradient(ellipse at 50% 40%, #2d1b69 0%, #0a0a1f 100%)',
        borderRadius: 8, position: 'relative', overflow: 'hidden', userSelect: 'none',
      }}>
        <HoloOverlay opacity={0.18} speed={8}/>
        <GeometrySVG uid={uid}/>
        <GrainOverlay/>
      </div>
    </CardBorder>
  );
}

// ─── Prize Card ───────────────────────────────────────────────────────────────

function PrizeCard({ rarity, uid }: { rarity: Rarity; uid: string }) {
  const t = TIERS[rarity];
  const p = PRIZES[rarity];
  const isLeg = rarity === 'legendary';

  return (
    <CardBorder borderGrad={t.borderGrad} aura={t.aura}>
      <div style={{
        width: CW, height: CH, background: t.bg,
        borderRadius: 8, position: 'relative', overflow: 'hidden', userSelect: 'none',
      }}>
        <HoloOverlay opacity={t.holo} speed={isLeg ? 1.5 : 6} legendary={isLeg}/>
        <GeometrySVG uid={uid} strokeColor={t.stroke}/>
        <GrainOverlay/>

        {/* Tier label — top of card */}
        <div style={{
          position: 'absolute', top: 14, left: 0, right: 0,
          textAlign: 'center', zIndex: 2,
        }}>
          <span style={{
            fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase',
            color: t.color, fontFamily: 'var(--font-orbitron, monospace)', fontWeight: 700,
          }}>
            ◆ {t.label} ◆
          </span>
        </div>

        {/* XP + prize name — center */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 0,
        }}>
          {/* Massive XP number */}
          <div style={{
            lineHeight: 1,
            fontFamily: 'var(--font-orbitron, monospace)',
            fontWeight: 900,
          }}>
            <span style={{
              fontSize: 34, color: t.color,
              textShadow: `0 0 18px ${t.glow}`,
              verticalAlign: 'middle',
            }}>+</span>
            <span style={{
              fontSize: 62, color: 'white',
              textShadow: `0 0 28px ${t.glow}, 0 4px 20px rgba(0,0,0,0.90)`,
              verticalAlign: 'middle',
            }}>{p.xp}</span>
          </div>

          {/* XP unit */}
          <div style={{
            fontSize: 9, letterSpacing: '0.32em',
            color: t.color + '88',
            fontFamily: 'var(--font-orbitron, monospace)',
            marginTop: 3,
          }}>XP</div>

          {/* Prize name */}
          <div style={{
            fontSize: 11, letterSpacing: '0.06em',
            color: t.color + 'cc',
            fontFamily: 'var(--font-rajdhani, sans-serif)',
            fontWeight: 600, marginTop: 8,
            textAlign: 'center', padding: '0 14px',
          }}>
            {p.label}
          </div>
        </div>

        {/* Bottom accent line */}
        <div style={{
          position: 'absolute', bottom: 14, left: 20, right: 20,
          height: 1, zIndex: 2,
          background: `linear-gradient(90deg, transparent, ${t.color}70, transparent)`,
        }}/>
      </div>
    </CardBorder>
  );
}

// ─── Backdrop atmosphere preview ──────────────────────────────────────────────

function BackdropPreview() {
  return (
    <div style={{
      width: '100%', height: 440,
      position: 'relative', overflow: 'hidden', borderRadius: 16,
      // Layer 1: deep radial gradient anchored at deck position
      background: 'radial-gradient(ellipse at 50% 55%, #1a0a3e 0%, #050510 100%)',
    }}>
      {/* Layer 2: breathing cyan aura around deck */}
      <div style={{
        position: 'absolute', width: 380, height: 380,
        left: '50%', top: '50%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,200,234,0.28) 0%, transparent 70%)',
        animation: 'auraBreathe 3s ease-in-out infinite',
        filter: 'blur(30px)', pointerEvents: 'none',
        willChange: 'transform, opacity',
      } as React.CSSProperties}/>

      {/* Vignette — pulls eye to center */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 50%, transparent 28%, rgba(3,3,12,0.78) 100%)',
      }}/>

      {/* Card centered */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)', zIndex: 1,
      }}>
        <CardBack uid="backdrop-main"/>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GachaPreviewPage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#030308', color: 'white',
      padding: '40px 32px',
    }}>
      <style>{KEYFRAMES}</style>

      {/* Header */}
      <div style={{ marginBottom: 6, fontSize: 10, color: '#00c8ea', letterSpacing: '0.18em', fontFamily: 'monospace' }}>
        PREVIEW — NOT INTEGRATED INTO LIVE FLOW
      </div>
      <h1 style={{
        fontSize: 18, fontWeight: 700, marginBottom: 48, letterSpacing: '0.06em',
        color: 'white', fontFamily: 'var(--font-orbitron, monospace)',
      }}>
        Daily Gacha — Visual Approval
      </h1>

      {/* A. Card Back */}
      <section style={{ marginBottom: 64 }}>
        <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.18em', marginBottom: 24, fontFamily: 'monospace', textTransform: 'uppercase' }}>
          A. Card Back — Idle
        </div>
        <CardBack uid="preview-back"/>
      </section>

      {/* B. Prize Tiers */}
      <section style={{ marginBottom: 64 }}>
        <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.18em', marginBottom: 24, fontFamily: 'monospace', textTransform: 'uppercase' }}>
          B. Prize Tiers — All Five Rarities
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {RARITIES.map(r => (
            <div key={r}>
              <PrizeCard rarity={r} uid={`prize-${r}`}/>
              <div style={{
                fontSize: 9, color: '#444', textAlign: 'center',
                marginTop: 10, letterSpacing: '0.12em', fontFamily: 'monospace',
              }}>
                {TIERS[r].label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* C. Backdrop */}
      <section>
        <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.18em', marginBottom: 24, fontFamily: 'monospace', textTransform: 'uppercase' }}>
          C. Backdrop Atmosphere
        </div>
        <BackdropPreview/>
      </section>
    </div>
  );
}
