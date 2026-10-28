import React from 'react';

// Player Pass loader: the two logo chevrons (green, then blue) pulse upward in sequence.
export function Loader({ label, size = 44, className = '' }: { label?: string; size?: number; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status" aria-label={label || 'Loading'}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path className="pp-chevron pp-chevron-a" d="M10 36 L24 22 L38 36" stroke="#3ddc6a" />
        <path className="pp-chevron pp-chevron-b" d="M10 22 L24 8 L38 22" stroke="#4d8dff" />
      </svg>
      {label ? <div className="text-secondary text-sm">{label}</div> : null}
    </div>
  );
}

// Full-height centered loader for pages that have no skeleton.
export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader label={label} />
    </div>
  );
}
