import React from 'react';

// Player Pass mark, shown beside every page title.
export function BrandMark({ className = 'h-11' }: { className?: string }) {
  return <img src="/brand/pp-mark.png" alt="Player Pass" className={`${className} w-auto flex-none`} />;
}
