import React from 'react';

// One page header for every screen: same title font/size, with the Player Pass mark
// sitting in a row underneath. `sub` is the page's own context (store pill, count, tagline)
// shown right next to the mark.
export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-[36px] leading-none font-extrabold tracking-tight text-primary">{children}</h1>
      <div className="mt-2 flex items-center gap-2.5 min-h-8">
        <img src="/brand/pp-mark.png" alt="Player Pass" className="h-8 w-auto flex-none" />
        {sub}
      </div>
    </div>
  );
}

export function SubText({ children }: { children: React.ReactNode }) {
  return <span className="text-[13px] font-semibold text-secondary">{children}</span>;
}
