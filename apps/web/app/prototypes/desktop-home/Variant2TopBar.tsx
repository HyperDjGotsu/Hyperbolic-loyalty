import { PLAYER, GAMES, EVENTS, ACTIVITY, CARD, NAV, art } from './mock';

// Axis: top navigation and a single-screen bento. Everything a player needs fits in one viewport, no scrolling.
export default function Variant2TopBar() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base text-primary">
      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[color-mix(in_srgb,var(--bg-surface)_60%,transparent)] px-8 backdrop-blur-xl">
        <div className="flex items-center gap-2.5"><img src="/brand/pp-mark.png" alt="" className="h-8 w-8" /><span className="font-display text-lg font-extrabold tracking-[-0.02em]">Player Pass</span></div>
        <nav className="flex items-center gap-1 rounded-full bg-elevated p-1">
          {NAV.map((n, i) => (<span key={n} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${i === 0 ? 'bg-accent text-accent-fg' : 'text-secondary'}`}>{n}</span>))}
        </nav>
        <div className="flex items-center gap-3 text-sm"><span className="hidden text-secondary xl:block">{PLAYER.store}</span><div className="grid h-9 w-9 place-items-center rounded-full bg-xp">😎</div></div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[1fr_1fr_340px] grid-rows-[auto_1fr] gap-5 p-6">
        {/* Hero */}
        <section className="relative col-span-2 flex items-center gap-6 overflow-hidden rounded-[28px] border border-white/10 p-6">
          <img src={art('riftbound')} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
          <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-3xl border-[3px] border-accent bg-xp text-[40px]">😎</div>
          <div className="relative min-w-0 flex-1">
            <div className="flex items-baseline gap-3"><h1 className="font-display text-[34px] font-extrabold leading-none tracking-[-0.03em] text-white">{PLAYER.name}</h1><span className="rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 px-2.5 py-0.5 text-xs font-bold text-white">Level {PLAYER.level}</span></div>
            <div className="mt-3 h-2.5 max-w-[360px] overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-accent" style={{ width: `${(PLAYER.xp / PLAYER.nextLevelXp) * 100}%` }} /></div>
            <div className="mt-1.5 text-xs text-white/70">{PLAYER.xp.toLocaleString()} / {PLAYER.nextLevelXp.toLocaleString()} XP</div>
          </div>
          {[{ v: PLAYER.gamesPlayed, l: 'Games' }, { v: PLAYER.xp.toLocaleString(), l: 'Total XP' }, { v: PLAYER.prizePoints, l: 'Points' }].map(s => (
            <div key={s.l} className="relative min-w-[96px] rounded-[20px] border border-white/15 bg-black/30 px-5 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl"><div className="font-display text-[26px] font-extrabold text-white">{s.v}</div><div className="text-[10px] uppercase tracking-wide text-white/70">{s.l}</div></div>
          ))}
        </section>

        {/* Right column: card of the day + events */}
        <aside className="row-span-2 flex min-h-0 flex-col gap-5">
          <section className="rounded-[22px] border border-border-token bg-surface p-4">
            <div className="flex items-center justify-between text-sm font-bold"><span>Card of the Day</span><span className="text-xs text-[#E63946]">{CARD.game}</span></div>
            <div className="mt-3 flex gap-3 rounded-2xl bg-[#3a2a22] p-3">
              <div className="grid h-[104px] w-[74px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#E63946] to-[#7a1d24] text-[10px] font-bold text-white">SAMPLE</div>
              <div className="min-w-0"><div className="font-display text-lg font-bold leading-tight">{CARD.name}</div><div className="mt-0.5 text-xs text-secondary">{CARD.set}</div><div className="mt-2 text-2xl font-extrabold">{CARD.price}</div><span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[11px] font-bold text-accent">{CARD.change}</span></div>
            </div>
          </section>
          <section className="min-h-0 flex-1 rounded-[22px] border border-border-token bg-surface p-4">
            <h3 className="font-display mb-3 text-lg font-bold tracking-[-0.02em]">This week</h3>
            <div className="flex flex-col gap-2.5">
              {EVENTS.map(e => (
                <div key={e.id} className="flex items-center gap-3 rounded-2xl bg-elevated p-2.5">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-base"><img src={art(e.game)} alt="" className="h-full w-full object-cover" onError={(ev) => ev.currentTarget.remove()} /></div>
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5 truncate text-sm font-bold">{e.name}{e.live && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}</div><div className="truncate text-xs text-secondary">{e.when}</div></div>
                  <span className={`text-xs font-bold ${e.fee === 'Free' ? 'text-accent' : ''}`}>{e.fee}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* Games */}
        <section className="flex min-h-0 flex-col rounded-[22px] border border-border-token bg-surface p-4">
          <div className="mb-3 flex items-baseline justify-between"><h3 className="font-display text-lg font-bold tracking-[-0.02em]">My Games</h3><span className="text-xs font-semibold text-accent">View all (8) →</span></div>
          <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-3">
            {GAMES.map(g => (
              <article key={g.id} className="relative min-h-0 overflow-hidden rounded-2xl">
                <img src={art(g.id)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute inset-x-3 bottom-2"><div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: g.color }}>{g.name}</div><div className="flex items-baseline gap-1"><span className="font-display text-xl font-extrabold leading-none text-white">{g.value}</span><span className="text-[10px] text-white/70">{g.unit}</span></div><div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full" style={{ width: `${g.progress}%`, background: g.color }} /></div></div>
              </article>
            ))}
          </div>
        </section>

        {/* Activity */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-border-token bg-surface p-4">
          <div className="mb-1 flex items-center justify-between"><h3 className="font-display text-lg font-bold tracking-[-0.02em]">Recent Activity</h3><span className="text-xs font-semibold text-accent">View all →</span></div>
          <ul className="flex flex-1 flex-col justify-between divide-y divide-border-token">
            {ACTIVITY.map(a => (<li key={a.label + a.when} className="flex flex-1 items-center justify-between"><div><div className="text-sm font-medium">{a.label}</div><div className="text-xs text-tertiary">{a.when}</div></div><span className="text-sm font-bold text-accent">{a.xp}</span></li>))}
          </ul>
        </section>
      </main>
    </div>
  );
}
