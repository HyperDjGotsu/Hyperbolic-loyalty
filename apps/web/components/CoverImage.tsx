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
