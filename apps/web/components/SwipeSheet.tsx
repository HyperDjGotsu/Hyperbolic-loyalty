'use client';

import { useEffect, useRef, type ReactNode } from 'react';

// The sheet that slides up from the bottom of the screen (event details and similar). It closes three ways: tap
// outside it, the X, or swipe it down, which is what people expect from a sheet. While it is open the page behind
// does not scroll. Swiping down only closes it when the sheet's own content is scrolled to the top, so scrolling
// through a long sheet is not mistaken for closing it.
const CLOSE_DISTANCE = 110; // px dragged down before letting go closes it

export default function SwipeSheet({ onClose, className = '', children }: { onClose: () => void; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Keep the page behind from scrolling while the sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Native listeners (not React's) so we can cancel the touch and stop the page behind from scrolling or bouncing
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startY = 0;
    let startedAtTop = false;
    let dragging = 0;

    const onStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      startedAtTop = el.scrollTop <= 0;
      dragging = 0;
      el.style.transition = 'none';
    };
    const onMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - startY;
      const scrollable = el.scrollHeight > el.clientHeight + 1;
      if (startedAtTop && dy > 0) {
        e.preventDefault(); // we are moving the sheet, not scrolling anything
        dragging = dy;
        el.style.transform = `translateY(${dy}px)`;
      } else if (!scrollable) {
        e.preventDefault(); // nothing to scroll in the sheet, so do not let the page behind move either
      }
    };
    const onEnd = () => {
      el.style.transition = 'transform 180ms ease-out';
      if (dragging > CLOSE_DISTANCE) {
        el.style.transform = 'translateY(100%)';
        window.setTimeout(() => closeRef.current(), 160);
      } else {
        el.style.transform = '';
      }
      dragging = 0;
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  return (
    <div ref={ref} className={`${className} overscroll-contain`}>
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-2 z-10 h-1.5 w-10 -translate-x-1/2 rounded-full bg-white/50" />
      {children}
    </div>
  );
}
