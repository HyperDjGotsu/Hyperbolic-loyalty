'use client';

import React, { useState, useEffect } from 'react';
import { FloatingParticles, StreamButtons } from '@/components/ui';
import type { Banner } from '@/lib/types';

interface BannerCarouselProps {
  banners: Banner[];
}

export const BannerCarousel = ({ banners }: BannerCarouselProps) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const banner = banners[current];

  return (
    <div className="relative mx-4 rounded-2xl overflow-hidden shadow-lg">
      <div className={`absolute inset-0 bg-gradient-to-r ${banner.color}`}>
        <FloatingParticles />
      </div>
      <div className="relative p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="text-4xl animate-bounce">{banner.icon}</div>
            <div>
              <div className="font-black text-white text-lg">{banner.title}</div>
              <div className="text-white/80 text-sm">{banner.subtitle}</div>
            </div>
          </div>
          <div className="bg-white/20 px-3 py-1 rounded-full">
            <span className="text-white text-xs font-bold">{banner.badge}</span>
          </div>
        </div>
        {banner.hasStream && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
            <span className="text-white/70 text-sm">Watch:</span>
            <StreamButtons hasStream={banner.hasStream} streamStarting={banner.badge === 'LIVE SOON'} />
          </div>
        )}
      </div>
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
