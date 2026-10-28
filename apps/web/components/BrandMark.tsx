import React from 'react';

// Player Pass chevrons (the logo without the letters), shown beside every page title.
export function BrandMark({ className = "h-9" }: { className?: string }) {
  return <img src="/brand/pp-chevrons.png" alt="Player Pass" className={`${className} w-auto flex-none`} />;
}
