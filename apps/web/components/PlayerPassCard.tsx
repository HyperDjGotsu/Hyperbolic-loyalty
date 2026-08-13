import Link from 'next/link';

export type PlayerPassTier = 'free' | 'bronze' | 'silver' | 'gold' | 'diamond';

interface PlayerPassCardProps {
  tier: PlayerPassTier;
  lifetimeXp: number;
  prizePoints: number;
  gatePts?: number;
}

const TIER_CONFIG: Record<PlayerPassTier, { badge: string; multiplier: string }> = {
  free: { badge: 'border-gray-500/40 bg-gray-500/15 text-gray-300', multiplier: '1x' },
  bronze: { badge: 'border-amber-700/50 bg-amber-700/15 text-amber-600', multiplier: '1.25x' },
  silver: { badge: 'border-slate-400/50 bg-slate-400/15 text-slate-300', multiplier: '1.5x' },
  gold: { badge: 'border-yellow-500/50 bg-yellow-500/15 text-yellow-400', multiplier: '2x' },
  diamond: { badge: 'border-cyan-400/50 bg-cyan-400/15 text-cyan-300', multiplier: '2x★' },
};

function formatValue(value: number): string {
  return value.toLocaleString('en-US');
}

export function PlayerPassCard({
  tier,
  lifetimeXp,
  prizePoints,
  gatePts = 720,
}: PlayerPassCardProps) {
  const config = TIER_CONFIG[tier];
  const safePrizePoints = Math.max(0, prizePoints);
  const safeGatePts = Math.max(0, gatePts);
  const progress = safeGatePts === 0 ? 100 : Math.min(100, (safePrizePoints / safeGatePts) * 100);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 text-white shadow-xl shadow-black/20">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Player Pass</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${config.badge}`}>
              {tier}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-zinc-300">
              {config.multiplier} XP
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-white/10">
        <div className="px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Guild Points</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">{formatValue(lifetimeXp)}</p>
          <p className="mt-1 text-xs text-zinc-500">Never decreases · Rank currency</p>
        </div>
        <div className="px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Prize Points</p>
          <p className={`mt-1 font-bold tabular-nums ${tier === 'free' ? 'text-2xl text-white' : 'text-3xl text-cyan-300'}`}>
            {formatValue(prizePoints)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Spendable at Prize Wall</p>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-4">
        {tier === 'free' ? (
          <div>
            <div
              className="h-2 overflow-hidden rounded-full bg-zinc-800"
              role="progressbar"
              aria-label="Prize Wall unlock progress"
              aria-valuemin={0}
              aria-valuemax={safeGatePts}
              aria-valuenow={Math.min(safePrizePoints, safeGatePts)}
            >
              <div className="h-full rounded-full bg-cyan-400 transition-[width] duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-sm font-medium text-zinc-300">
              {formatValue(prizePoints)} / {formatValue(gatePts)} pts to unlock Prize Wall
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">Available to spend</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-white">{formatValue(prizePoints)} pts</p>
            </div>
            <Link
              href="/dashboard/shop"
              className="rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
            >
              Spend at Prize Wall
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
