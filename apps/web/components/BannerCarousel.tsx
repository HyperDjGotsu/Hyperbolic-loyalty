'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Banner } from '@/lib/types';

interface BannerCarouselProps {
  banners: Banner[];
}

const StreamButtons = ({ twitchUrl, youtubeUrl, isLive }: { twitchUrl?: string; youtubeUrl?: string; isLive?: boolean }) => {
  if (!twitchUrl && !youtubeUrl) return null;
  
  return (
    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
      {twitchUrl && (
        <a 
          href={twitchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
        >
          Twitch
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

const AUTO_ADVANCE_MS = 4000;
const PAUSE_AFTER_TOUCH_MS = 10000;

export const eventLinkFor = (banner: Banner): string | null =>
  banner.eventId ? `/dashboard/events?event=${banner.eventId}` : null;

export const BannerCarousel = ({ banners }: BannerCarouselProps) => {
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const pausedUntil = useRef(0);
  const currentRef = useRef(0);
  const count = banners.length;

  const scrollToIndex = useCallback((i: number, smooth = true) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Keep the dots in step with whatever slide the player has swiped to.
  const onScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== currentRef.current) {
      currentRef.current = i;
      setCurrent(i);
    }
  };

  const pauseAuto = () => { pausedUntil.current = Date.now() + PAUSE_AFTER_TOUCH_MS; };

  useEffect(() => {
    if (count <= 1) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      scrollToIndex((currentRef.current + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [count, scrollToIndex]);

  // If the banner list shrinks under the current slide, snap back to the start.
  useEffect(() => {
    if (currentRef.current >= count) {
      currentRef.current = 0;
      setCurrent(0);
      scrollToIndex(0, false);
    }
  }, [count, scrollToIndex]);

  if (count === 0) return null;

  return (
    <div className="relative mx-4 rounded-2xl overflow-hidden shadow-lg">
      <div
        ref={trackRef}
        onScroll={onScroll}
        onTouchStart={pauseAuto}
        onPointerDown={pauseAuto}
        onWheel={pauseAuto}
        className="flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ overscrollBehaviorX: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        {banners.map((banner) => {
          const href = eventLinkFor(banner);
          const hasBackgroundImage = banner.backgroundImage;
          const gradientStyle = banner.colorFrom && banner.colorTo
            ? { background: `linear-gradient(to right, ${banner.colorFrom}, ${banner.colorTo})` }
            : undefined;
          const gradientClass = !gradientStyle && banner.color ? `bg-gradient-to-r ${banner.color}` : '';
          const hasStream = banner.twitchUrl || banner.youtubeUrl;
          const isLive = banner.badge === 'LIVE' || banner.badge === 'LIVE NOW' || banner.badge === 'LIVE SOON';
          const textColor = banner.textColor || '#ffffff';
          const go = () => { if (href) router.push(href); };

          return (
            <div
              key={banner.id}
              className={`relative w-full shrink-0 snap-center ${href ? 'cursor-pointer' : ''}`}
              role={href ? 'link' : undefined}
              tabIndex={href ? 0 : undefined}
              aria-label={href ? `${banner.title}: view event` : undefined}
              onClick={go}
              onKeyDown={(e) => { if (href && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(); } }}
            >
              {hasBackgroundImage ? (
                <>
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${banner.backgroundImage})`,
                      backgroundSize: banner.bgSize || 'cover',
                      backgroundPosition: banner.bgPosition || 'center',
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30" />
                </>
              ) : (
                <div className={`absolute inset-0 ${gradientClass}`} style={gradientStyle} />
              )}

              <div className="relative p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl animate-bounce">{banner.icon}</div>
                    <div>
                      <div className="font-black text-lg drop-shadow-lg" style={{ color: textColor }}>{banner.title}</div>
                      <div className="text-sm drop-shadow opacity-90" style={{ color: textColor }}>{banner.subtitle}</div>
                    </div>
                  </div>
                  {banner.badge && (
                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="text-xs font-bold" style={{ color: textColor }}>{banner.badge}</span>
                    </div>
                  )}
                </div>
                {hasStream && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
                    <span className="text-white/70 text-sm">Watch:</span>
                    <StreamButtons twitchUrl={banner.twitchUrl} youtubeUrl={banner.youtubeUrl} isLive={isLive} />
                  </div>
                )}
                {href && (
                  <div className="mt-2 text-xs font-semibold drop-shadow" style={{ color: textColor, opacity: 0.85 }}>
                    View event ›
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`Show banner ${i + 1}`}
              onClick={(e) => { e.stopPropagation(); pauseAuto(); scrollToIndex(i); }}
              className={`h-2 rounded-full transition-all ${i === current ? 'bg-white w-4' : 'bg-white/40 w-2'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
