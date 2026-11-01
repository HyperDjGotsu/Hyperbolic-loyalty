import { Star, UserCheck } from 'lucide-react';

// Social proof for event cards: how many are interested and how many have checked in.
// Zero counts stay hidden so an empty event never advertises an empty room.
export default function EventCounts({ interested, checkedIn, className = '' }: {
  interested: number;
  checkedIn: number;
  className?: string;
}) {
  if (interested <= 0 && checkedIn <= 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold ${className}`}>
      {checkedIn > 0 && (
        <span className="inline-flex items-center gap-1 text-emerald-400">
          <UserCheck size={13} /> {checkedIn} checked in
        </span>
      )}
      {interested > 0 && (
        <span className="inline-flex items-center gap-1 text-accent">
          <Star size={13} /> {interested} interested
        </span>
      )}
    </div>
  );
}
