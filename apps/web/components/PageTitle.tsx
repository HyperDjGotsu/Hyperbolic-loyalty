import React from 'react';

// One page title for every screen: same font, size, weight and spacing everywhere.
// logo: 'chevrons' (green/blue arrows), 'pp' (the PP letters), or 'none'.
export function PageTitle({ children, logo = 'none' }: { children: React.ReactNode; logo?: 'chevrons' | 'pp' | 'none' }) {
  return (
    <div className="flex items-center gap-3">
      {logo === 'chevrons' && <img src="/brand/pp-chevrons.png" alt="Player Pass" className="h-8 w-auto flex-none" />}
      {logo === 'pp' && <img src="/brand/pp-mark.png" alt="Player Pass" className="h-9 w-auto flex-none" />}
      <h1 className="font-display text-[36px] leading-none font-extrabold tracking-tight text-primary">{children}</h1>
    </div>
  );
}
