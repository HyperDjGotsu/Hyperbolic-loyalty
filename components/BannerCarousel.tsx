'use client';

import React, { useState, useEffect } from 'react';
import { FloatingParticles } from '@/components/ui';
import type { Banner } from '@/lib/types';

interface BannerCarouselProps {
  banners: Banner[];
}

const StreamButtons = ({ twitchUrl, youtubeUrl, isLive }: { twitchUrl?: string; youtubeUrl?: string; isLive?: boolean }) => {
  if (!twitchUrl && !youtubeUrl) return null;
  
  return (
    <div className="flex gap-2">
      {twitchUrl && (
        <a 
          href={twitchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
        >
          📺 Twitch
          {isLive && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
        </a>
      )}
      {youtubeUrl && (
        <a 
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
        >
          ▶️ YouTube
        </a>
      )}
    </div>
  );
};

export const BannerCarousel = ({ banners }: BannerCarouselProps) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const banner = banners[current];

  // Check for background image
  const hasBackgroundImage = banner.backgroundImage;

  // Support both old format (color class) and new format (colorFrom/colorTo)
  const gradientStyle = banner.colorFrom && banner.colorTo
    ? { background: `linear-gradient(to right, ${banner.colorFrom}, ${banner.colorTo})` }
    : undefined;

  const gradientClass = !gradientStyle && banner.color
    ? `bg-gradient-to-r ${banner.color}`
    : '';

  const hasStream = banner.twitchUrl || banner.youtubeUrl;
  const isLive = banner.badge === 'LIVE' || banner.badge === 'LIVE NOW' || banner.badge === 'LIVE SOON';

  return (
    <div className="relative mx-4 rounded-2xl overflow-hidden shadow-lg">
      {/* Background - either image or gradient */}
      {hasBackgroundImage ? (
        <>
          {/* Background image with overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${banner.backgroundImage})` }}
          />
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-black/40" />
          {/* Optional gradient overlay for brand colors */}
          {gradientStyle && (
            <div 
              className="absolute inset-0 opacity-30"
              style={gradientStyle}
            />
          )}
        </>
      ) : (
        <div 
          className={`absolute inset-0 ${gradientClass}`}
          style={gradientStyle}
        >
          <FloatingParticles />
        </div>
      )}
      
      {/* Content */}
      <div className="relative p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="text-4xl animate-bounce">{banner.icon}</div>
            <div>
              <div className="font-black text-white text-lg drop-shadow-lg">{banner.title}</div>
              <div className="text-white/90 text-sm drop-shadow">{banner.subtitle}</div>
            </div>
          </div>
          {banner.badge && (
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
              <span className="text-white text-xs font-bold">{banner.badge}</span>
            </div>
          )}
        </div>
        {hasStream && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
            <span className="text-white/70 text-sm">Watch:</span>
            <StreamButtons 
              twitchUrl={banner.twitchUrl} 
              youtubeUrl={banner.youtubeUrl}
              isLive={isLive}
            />
          </div>
        )}
      </div>
      
      {/* Dot indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
        {banners.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all ${
              i === current ? 'bg-white w-4' : 'bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
