'use client';

import { FlaskConical, Star } from 'lucide-react';
import { TITLES, sortTitles, type TitleKey } from '@/lib/titles';

const ICONS: Record<TitleKey, typeof Star> = { founding_member: Star, beta_tester: FlaskConical };

// A player's titles (Founding Member, Beta Tester...). Full chips on profiles and the kiosk, icon only on leaderboard rows.
export function TitleChips({
  titles,
  iconOnly = false,
  className = '',
}: {
  titles?: readonly string[] | null;
  iconOnly?: boolean;
  className?: string;
}) {
  const keys = sortTitles(titles ?? []);
  if (keys.length === 0) return null;

  return (
    <span className={`inline-flex flex-wrap items-center justify-center gap-1.5 ${className}`}>
      {keys.map(key => {
        const def = TITLES[key];
        const Icon = ICONS[key];
        if (iconOnly) {
          return (
            <span key={key} title={def.label} aria-label={def.label} className="inline-flex align-middle" style={{ color: def.color }}>
              <Icon size={13} strokeWidth={2.5} />
            </span>
          );
        }
        return (
          <span
            key={key}
            title={def.blurb}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold"
            style={{ color: def.color, borderColor: `${def.color}66`, backgroundColor: `${def.color}1f` }}
          >
            <Icon size={12} strokeWidth={2.5} />
            {def.label}
          </span>
        );
      })}
    </span>
  );
}
