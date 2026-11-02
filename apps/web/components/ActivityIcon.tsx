import { CalendarDays, Megaphone, Sparkles, Trophy, UserCheck, Zap, type LucideIcon } from 'lucide-react';

// Feed rows send an icon key (not an emoji) so they match the rest of the app's line icons
const ICONS: Record<string, LucideIcon> = {
  checkin: UserCheck,
  xp: Zap,
  placement: Trophy,
  winner: Trophy,
  new_event: CalendarDays,
  broadcast: Megaphone,
};

export default function ActivityIcon({ name, className = 'h-4 w-4' }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={`${className} text-accent`} strokeWidth={2} aria-hidden />;
}
