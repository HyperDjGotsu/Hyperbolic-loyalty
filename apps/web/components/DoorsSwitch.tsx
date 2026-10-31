'use client';

import { Children, useState, type ReactNode } from 'react';

// Phones: a sliding two-way picker ("For players" / "For stores") sits above the doors and shows one door at a time.
// md and up: no picker, both doors side by side.
export function DoorsSwitch({ children, labels }: { children: ReactNode; labels: [string, string] }) {
  const [view, setView] = useState(0);
  const items = Children.toArray(children);

  return (
    <div>
      <div className="relative mx-auto mb-5 flex w-full max-w-xs rounded-full bg-elevated p-1 md:hidden" role="tablist" aria-label="Choose a door">
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-accent transition-transform duration-[250ms]"
          style={{ transform: `translateX(${view === 0 ? '0%' : '100%'})`, transitionTimingFunction: 'var(--ease-drawer)' }}
        />
        {labels.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={view === i}
            onClick={() => setView(i)}
            className={`relative z-10 flex-1 rounded-full py-2 text-sm font-bold transition-colors duration-200 ${view === i ? 'text-accent-fg' : 'text-secondary'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-7">
        {items.map((child, i) => (
          <div key={i} className={`${view === i ? 'pp-slide block' : 'hidden'} md:block`}>{child}</div>
        ))}
      </div>
    </div>
  );
}
