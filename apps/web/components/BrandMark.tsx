import React from 'react';

// PlayerPass chevrons (the logo without the letters), shown beside every page title.
export function BrandMark({ className = "h-9" }: { className?: string }) {
  return <img src="/brand/pp-chevrons.png" alt="PlayerPass" className={`${className} w-auto flex-none`} />;
}
