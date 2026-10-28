'use client';

import React, { useState } from 'react';
import { gameArtUrl } from '@/lib/games';

// Picture-led card top. Shows the game's cover art; until the art exists (or if it fails to
// load) it falls back to a gradient in the game's color so cards never look empty.
export function CoverImage({
  gameId,
  color = '#3b82f6',
  src,
  className = '',
  children,
}: {
  gameId?: string | null;
  color?: string;
  src?: string | null;
  className?: string;
  children?: React.ReactNode;
}) {
  const url = src || gameArtUrl(gameId);
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 35%, #000))` }}
    >
      {!failed && (
        <img
          src={url}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
      {children}
    </div>
  );
}

// Full-bleed art behind a hero card. Put `isolate` on the parent; this sits at -z-10 under its content.
// Dark scrim keeps white text readable on any image; gradient shows until the art exists.
export function HeroBackdrop({ gameId, src, color }: { gameId?: string | null; src?: string | null; color?: string }) {
  const [failed, setFailed] = useState(false);
  const base = color || 'var(--accent)';
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10"
      style={{ backgroundImage: `linear-gradient(135deg, ${base}, color-mix(in srgb, ${base} 30%, #0b1220))` }}
    >
      {!failed && (
        <img
          src={src || gameArtUrl(gameId)}
          alt=""
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/80" />
    </div>
  );
}

// First real favorite game (the system 'overall' entry doesn't count).
export function pickBackdropGame(favorites: string[] | undefined | null): string | undefined {
  return (favorites || []).find(id => id && id !== 'overall');
}
