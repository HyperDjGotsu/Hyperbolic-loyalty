import { PLAYER, GAMES, EVENTS, ACTIVITY, CARD, NAV, BONUS, LIVE_EVENT, STORE_UPDATES, PASS, MONTHLY, FRIENDS, art } from './mock';

export const PANEL = 'rounded-[22px] border border-border-token bg-surface';

export function TopBar() {
  return (
    <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[color-mix(in_srgb,var(--bg-surface)_60%,transparent)] px-8 backdrop-blur-xl">
      <div className="flex items-center gap-2.5"><img src="/brand/pp-mark.png" alt="" className="h-8 w-8" /><span className="font-display text-lg font-extrabold tracking-[-0.02em]">Player Pass</span></div>
      <nav className="flex items-center gap-1 rounded-full bg-elevated p-1">
        {NAV.map((n, i) => (<span key={n} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${i === 0 ? 'bg-accent text-accent-fg' : 'text-secondary'}`}>{n}</span>))}
      </nav>
      <div className="flex items-center gap-3 text-sm"><span className="hidden text-secondary xl:block">{PLAYER.store}</span><div className="grid h-9 w-9 place-items-center rounded-full bg-xp">😎</div></div>
    </header>
  );
}

export function Stat({ v, l, small = false }: { v: string | number; l: string; small?: boolean }) {
  return (
    <div className={`relative rounded-[20px] border border-white/15 bg-black/30 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl ${small ? 'min-w-[84px] px-4 py-2.5' : 'min-w-[96px] px-5 py-3'}`}>
      <div className={`font-display font-extrabold text-white ${small ? 'text-[22px]' : 'text-[26px]'}`}>{v}</div>
      <div className="text-[10px] uppercase tracking-wide text-white/70">{l}</div>
    </div>
  );
}

export function Hero({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  return (
    <section className={`relative flex items-center gap-5 overflow-hidden rounded-[28px] border border-white/10 ${compact ? 'p-4' : 'p-6'} ${className}`}>
      <img src={art('riftbound')} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
      <div className={`relative grid shrink-0 place-items-center rounded-3xl border-[3px] border-accent bg-xp ${compact ? 'h-14 w-14 text-[28px]' : 'h-20 w-20 text-[40px]'}`}>😎</div>
      <div className="relative min-w-0 flex-1">
        <div className="flex items-baseline gap-3"><h1 className={`font-display font-extrabold leading-none tracking-[-0.03em] text-white ${compact ? 'text-[26px]' : 'text-[34px]'}`}>{PLAYER.name}</h1><span className="rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 px-2.5 py-0.5 text-xs font-bold text-white">Level {PLAYER.level}</span></div>
        <div className={`h-2.5 max-w-[340px] overflow-hidden rounded-full bg-white/20 ${compact ? 'mt-2' : 'mt-3'}`}><div className="h-full rounded-full bg-accent" style={{ width: `${(PLAYER.xp / PLAYER.nextLevelXp) * 100}%` }} /></div>
        <div className="mt-1 text-xs text-white/70">{PLAYER.xp.toLocaleString()} / {PLAYER.nextLevelXp.toLocaleString()} XP</div>
      </div>
      <Stat v={PLAYER.gamesPlayed} l="Games" small={compact} /><Stat v={PLAYER.xp.toLocaleString()} l="Total XP" small={compact} /><Stat v={PLAYER.prizePoints} l="Points" small={compact} />
    </section>
  );
}

export function GameTile({ g, className = '' }: { g: (typeof GAMES)[number]; className?: string }) {
  return (
    <article className={`relative min-h-0 overflow-hidden rounded-2xl ${className}`}>
      <img src={art(g.id)} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      <div className="absolute inset-x-3 bottom-2.5"><div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: g.color }}>{g.name}</div><div className="flex items-baseline gap-1"><span className="font-display text-xl font-extrabold leading-none text-white">{g.value}</span><span className="text-[10px] text-white/70">{g.unit}</span></div><div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full" style={{ width: `${g.progress}%`, background: g.color }} /></div></div>
    </article>
  );
}

export function GamesPanel({ cols = 3, className = '' }: { cols?: 2 | 3 | 6; className?: string }) {
  const grid = cols === 6 ? 'grid-cols-6 grid-rows-1' : cols === 3 ? 'grid-cols-3 grid-rows-2' : 'grid-cols-2 grid-rows-3';
  return (
    <section className={`flex min-h-0 flex-col p-4 ${PANEL} ${className}`}>
      <div className="mb-3 flex items-baseline justify-between"><h3 className="font-display text-lg font-bold tracking-[-0.02em]">My Games</h3><span className="text-xs font-semibold text-accent">View all (8) →</span></div>
      <div className={`grid min-h-0 flex-1 gap-3 ${grid}`}>{GAMES.map(g => <GameTile key={g.id} g={g} />)}</div>
    </section>
  );
}

export function EventRows({ limit = 3, className = '' }: { limit?: number; className?: string }) {
  return (
    <section className={`flex min-h-0 flex-col overflow-hidden p-4 ${PANEL} ${className}`}>
      <h3 className="font-display mb-3 text-lg font-bold tracking-[-0.02em]">This week</h3>
      <div className="flex flex-1 flex-col justify-between gap-2.5">
        {EVENTS.slice(0, limit).map(e => (
          <div key={e.id} className="flex items-center gap-3 rounded-2xl bg-elevated p-2.5">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-base"><img src={art(e.game)} alt="" className="h-full w-full object-cover" onError={(ev) => ev.currentTarget.remove()} /></div>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5 truncate text-sm font-bold">{e.name}{e.live && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}</div><div className="truncate text-xs text-secondary">{e.when}</div></div>
            <span className={`text-xs font-bold ${e.fee === 'Free' ? 'text-accent' : ''}`}>{e.fee}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ActivityPanel({ limit = 5, className = '' }: { limit?: number; className?: string }) {
  return (
    <section className={`flex min-h-0 flex-col overflow-hidden p-4 ${PANEL} ${className}`}>
      <div className="mb-1 flex items-center justify-between"><h3 className="font-display text-lg font-bold tracking-[-0.02em]">Recent Activity</h3><span className="text-xs font-semibold text-accent">View all →</span></div>
      <ul className="flex flex-1 flex-col justify-between divide-y divide-border-token">
        {ACTIVITY.slice(0, limit).map(a => (<li key={a.label + a.when} className="flex flex-1 items-center justify-between"><div><div className="text-sm font-medium">{a.label}</div><div className="text-xs text-tertiary">{a.when}</div></div><span className="text-sm font-bold text-accent">{a.xp}</span></li>))}
      </ul>
    </section>
  );
}

export function CardOfDay({ className = '' }: { className?: string }) {
  return (
    <section className={`p-4 ${PANEL} ${className}`}>
      <div className="flex items-center justify-between text-sm font-bold"><span>Card of the Day</span><span className="text-xs text-[#E63946]">{CARD.game}</span></div>
      <div className="mt-3 flex gap-3 rounded-2xl bg-[#3a2a22] p-3">
        <div className="grid h-[92px] w-[66px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#E63946] to-[#7a1d24] text-[10px] font-bold text-white">SAMPLE</div>
        <div className="min-w-0"><div className="font-display text-lg font-bold leading-tight">{CARD.name}</div><div className="mt-0.5 text-xs text-secondary">{CARD.set}</div><div className="mt-1.5 text-2xl font-extrabold">{CARD.price}</div><span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[11px] font-bold text-accent">{CARD.change}</span></div>
      </div>
    </section>
  );
}

export function PassCard({ className = '' }: { className?: string }) {
  return (
    <section className={`relative overflow-hidden p-4 ${PANEL} ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(80%_100%_at_100%_0%,rgba(143,220,247,0.18),transparent_70%)]" />
      <div className="relative flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 shadow-lg" style={{ background: 'linear-gradient(135deg,#d9f6ff,#5cc8f0 55%,#8f7bff)', clipPath: 'polygon(50% 0,100% 38%,50% 100%,0 38%)' }} />
        <div className="min-w-0 flex-1"><div className="text-[11px] font-bold uppercase tracking-wide text-secondary">Your pass</div><div className="font-display text-xl font-extrabold leading-tight tracking-[-0.02em]">{PASS.tier}</div></div>
        <div className="text-right"><div className="font-display text-2xl font-extrabold text-accent">{PASS.multiplier}</div><div className="text-[10px] uppercase tracking-wide text-secondary">Prize Points</div></div>
      </div>
      <div className="relative mt-3 flex items-center justify-between rounded-xl bg-elevated px-3 py-2.5"><div><div className="text-sm font-bold">{PASS.credit}</div><div className="text-xs text-secondary">Renews {PASS.renews}</div></div><span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-fg">Redeem</span></div>
    </section>
  );
}

export function BonusCard({ className = '' }: { className?: string }) {
  return (
    <section className={`flex items-center gap-4 p-4 ${PANEL} ${className}`}>
      <div className="font-display text-5xl font-extrabold leading-none text-accent">+{BONUS.points}</div>
      <div className="min-w-0 flex-1"><div className="text-sm font-bold">Daily bonus ready</div><div className="text-xs text-secondary">Resets at midnight</div></div>
      <span className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-fg">Claim</span>
    </section>
  );
}

export function MonthlyCard({ className = '' }: { className?: string }) {
  return (
    <section className={`p-4 ${PANEL} ${className}`}>
      <div className="flex items-center justify-between"><div><div className="text-[11px] font-bold uppercase tracking-wide text-secondary">{MONTHLY.month} achievement</div><div className="font-display text-lg font-bold tracking-[-0.02em]">{MONTHLY.name}</div></div><span className="text-sm font-bold tabular-nums">{MONTHLY.done}/{MONTHLY.goal}</span></div>
      <div className="mt-3 flex gap-1.5">{Array.from({ length: MONTHLY.goal }).map((_, i) => (<span key={i} className={`h-2 flex-1 rounded-full ${i < MONTHLY.done ? 'bg-accent' : 'bg-elevated'}`} />))}</div>
      <div className="mt-2 text-xs text-secondary">{MONTHLY.goal - MONTHLY.done} more events this month</div>
    </section>
  );
}

export function FriendsPanel({ className = '' }: { className?: string }) {
  return (
    <section className={`flex min-h-0 flex-col overflow-hidden p-4 ${PANEL} ${className}`}>
      <h3 className="font-display mb-2 text-lg font-bold tracking-[-0.02em]">Friends</h3>
      <ul className="flex flex-1 flex-col justify-between">
        {FRIENDS.map(f => (<li key={f.id} className="flex items-center gap-2.5"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-elevated text-xs font-bold">{f.who[0]}</div><div className="min-w-0 flex-1 text-sm"><span className="font-bold">{f.who}</span> <span className="text-secondary">{f.what}</span></div><span className="text-xs text-tertiary">{f.when}</span></li>))}
      </ul>
    </section>
  );
}

export function StoreUpdates({ limit = 3, className = '' }: { limit?: number; className?: string }) {
  return (
    <section className={`flex min-h-0 flex-col p-4 ${PANEL} ${className}`}>
      <h3 className="font-display mb-2 text-lg font-bold tracking-[-0.02em]">From the store</h3>
      <ul className="flex flex-1 flex-col justify-between divide-y divide-border-token">
        {STORE_UPDATES.slice(0, limit).map(u => (<li key={u.id} className="flex flex-1 items-center justify-between gap-3"><span className="text-sm font-medium">{u.title}</span><span className="shrink-0 text-xs text-tertiary">{u.when}</span></li>))}
      </ul>
    </section>
  );
}

export function LiveBanner({ className = '', big = false }: { className?: string; big?: boolean }) {
  return (
    <section className={`relative flex items-end overflow-hidden rounded-[28px] border border-white/10 ${big ? 'p-8' : 'p-5'} ${className}`}>
      <img src={art(LIVE_EVENT.game)} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
      <div className="relative flex w-full items-end justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />LIVE</span>
          <h2 className={`font-display mt-3 font-extrabold leading-none tracking-[-0.03em] text-white ${big ? 'text-[44px]' : 'text-[30px]'}`}>{LIVE_EVENT.name}</h2>
          <div className="mt-2 text-sm text-white/75">{LIVE_EVENT.when} · {LIVE_EVENT.checkedIn} of {LIVE_EVENT.spots} checked in</div>
        </div>
        <span className="shrink-0 rounded-2xl bg-accent px-6 py-3 text-sm font-bold text-accent-fg">Check in · +{LIVE_EVENT.xp} XP</span>
      </div>
    </section>
  );
}

export function NextActionCard({ className = '' }: { className?: string }) {
  return (
    <section className={`relative flex flex-col justify-between overflow-hidden rounded-[28px] border border-accent/40 p-6 ${className}`}>
      <img src={art(LIVE_EVENT.game)} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/25" />
      <div className="relative"><span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />Live at your store</span></div>
      <div className="relative">
        <div className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Do this next</div>
        <h2 className="font-display mt-2 text-[38px] font-extrabold leading-[1.02] tracking-[-0.03em] text-white">Check in to {LIVE_EVENT.name}</h2>
        <p className="mt-2 text-sm text-white/75">{LIVE_EVENT.checkedIn} players are already in. Earn +{LIVE_EVENT.xp} XP just for showing up.</p>
        <div className="mt-4 flex gap-3"><span className="rounded-2xl bg-accent px-6 py-3 text-sm font-bold text-accent-fg">Check in now</span><span className="rounded-2xl border border-white/35 px-5 py-3 text-sm font-bold text-white">Not here yet</span></div>
      </div>
    </section>
  );
}
