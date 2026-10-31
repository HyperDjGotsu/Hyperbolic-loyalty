'use client';

import { Children, useRef, useState, type ReactNode } from 'react';

// Phones: the two landing doors sit in a swipe row that snaps one at a time, with the next door peeking in at the edge
// and dots below. md and up: a plain two-column grid.
export function DoorsCarousel({ children, labels }: { children: ReactNode; labels: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const items = Children.toArray(children);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setActive(max > 0 ? Math.round((el.scrollLeft / max) * (items.length - 1)) : 0);
  };

  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: (el.scrollWidth - el.clientWidth) * (i / (items.length - 1)), behavior: 'smooth' });
  };

  return (
    <div>
      <div
        ref={ref}
        onScroll={onScroll}
        className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-2 md:gap-7 md:overflow-visible md:px-0 md:pb-0"
      >
        {items.map((child, i) => (
          <div key={i} className="flex w-[86%] shrink-0 snap-center md:w-auto [&>*]:w-full">{child}</div>
        ))}
      </div>
      <div className="mt-4 flex justify-center gap-2 md:hidden" role="tablist" aria-label="Choose a door">
        {labels.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={active === i}
            aria-label={label}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all duration-200 ${active === i ? 'w-6 bg-accent' : 'w-2 bg-border-strong'}`}
          />
        ))}
      </div>
    </div>
  );
}
