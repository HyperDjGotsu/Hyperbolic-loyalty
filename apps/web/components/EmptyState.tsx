import React from 'react';
import type { LucideIcon } from 'lucide-react';

// Muted icon tile + title + hint, for lists with nothing in them yet.
export function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-6">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-elevated text-secondary">
        <Icon size={26} strokeWidth={1.75} />
      </div>
      <div className="text-primary font-bold">{title}</div>
      {hint ? <div className="text-secondary text-sm mt-1">{hint}</div> : null}
    </div>
  );
}
