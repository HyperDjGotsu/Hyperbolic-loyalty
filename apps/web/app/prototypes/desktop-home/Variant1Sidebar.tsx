import { PLAYER, GAMES, EVENTS, ACTIVITY, CARD, NAV, art } from './mock';

// Axis: persistent left navigation. Home is a two-column page: a main column of picture tiles, a right rail for the daily bits.
export default function Variant1Sidebar() {
  return (
    <div className="flex min-h-screen bg-base text-primary">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border-token bg-surface/60 p-4 lg:flex">
        <div className="mb-6 flex items-center gap-2.5 px-2 pt-1">
          <img src="/brand/pp-mark.png" alt="" className="h-8 w-8" />
          <span className="font-display text-lg font-extrabold tracking-[-0.02em]">Player Pass</span>
        </div>
        <button className="mb-5 flex items-center justify-between rounded-xl border border-border-token bg-elevated px-3 py-2.5 text-left text-sm font-semibold">
          <span className="truncate">{PLAYER.store}</span><span className="text-tertiary">⌄</span>
        </button>
        <nav className="flex flex-col gap-1">
          {NAV.map((n, i) => (
            <span key={n} className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${i === 0 ? 'bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-accent' : 'text-secondary'}`}>{n}</span>
          ))}
        </nav>
        <span className="mt-auto px-3 text-xs text-tertiary">Sign out</span>
      </aside>

      <main className="min-w-0 flex-1 px-8 pb-24 pt-8">
        <div className="mx-auto max-w-[1180px]">
          <h1 className="font-display text-[40px] font-extrabold tracking-[-0.03em]">Home</h1>

          {/* Hero */}
          <section className="relative mt-5 overflow-hidden rounded-[30px] border border-white/10 p-8">
            <img src={art('riftbound')} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/30" />
            <div className="relative flex items-center gap-7">
              <div className="relative">
                <div className="grid h-[100px] w-[100px] place-items-center rounded-3xl border-[3px] border-accent bg-xp text-[50px]">😎</div>
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 px-3.5 py-1 text-xs font-bold text-white">Level {PLAYER.level}</span>
              </div>
              <div className="flex-1">
                <h2 className="font-display text-[38px] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">{PLAYER.name}</h2>
                <div className="mt-2 max-w-[380px]">
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-accent" style={{ width: `${(PLAYER.xp / PLAYER.nextLevelXp) * 100}%` }} /></div>
                  <div className="mt-1.5 flex justify-between text-xs text-white/70"><span>XP to next level</span><span>{PLAYER.xp.toLocaleString()} / {PLAYER.nextLevelXp.toLocaleString()}</span></div>
                </div>
              </div>
              {[{ v: PLAYER.gamesPlayed, l: 'Games' }, { v: PLAYER.xp.toLocaleString(), l: 'Total XP' }, { v: PLAYER.prizePoints, l: 'Points' }].map(s => (
                <div key={s.l} className="min-w-[110px] rounded-[22px] border border-white/15 bg-black/30 px-6 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl">
                  <div className="font-display text-[30px] font-extrabold text-white">{s.v}</div>
                  <div className="text-[11px] uppercase tracking-wide text-white/70">{s.l}</div>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
            <div className="min-w-0">
              {/* Picture tiles */}
              <div className="mb-3 flex items-baseline justify-between"><h3 className="font-display text-xl font-bold tracking-[-0.02em]">My Games</h3><span className="text-sm font-semibold text-accent">View all (8) →</span></div>
              <div className="grid grid-cols-3 gap-4">
                {GAMES.map(g => (
                  <article key={g.id} className="relative h-[190px] overflow-hidden rounded-[22px] border border-border-token transition-transform duration-200 ease-out hover:-translate-y-0.5">
                    <img src={art(g.id)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/5" />
                    <div className="absolute inset-x-4 bottom-3.5">
                      <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: g.color }}>{g.name}</div>
                      <div className="mt-0.5 flex items-baseline gap-1.5"><span className="font-display text-[30px] font-extrabold leading-none text-white">{g.value}</span><span className="text-xs text-white/70">{g.unit}</span></div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full" style={{ width: `${g.progress}%`, background: g.color }} /></div>
                      <div className="mt-1.5 flex justify-between text-[11px] text-white/70"><span>{g.rank}</span><span>{g.left}</span></div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Events */}
              <h3 className="font-display mb-3 mt-7 text-xl font-bold tracking-[-0.02em]">This week</h3>
              <div className="grid grid-cols-3 gap-4">
                {EVENTS.map(e => (
                  <div key={e.id} className="flex items-center gap-3 rounded-[20px] border border-border-token bg-surface p-2.5">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[14px] bg-elevated"><img src={art(e.game)} alt="" className="h-full w-full object-cover" onError={(ev) => ev.currentTarget.remove()} /></div>
                    <div className="min-w-0 flex-1"><div className="truncate text-[15px] font-bold">{e.name}</div><div className="truncate text-xs text-secondary">{e.when}</div></div>
                    <span className={`text-xs font-bold ${e.fee === 'Free' ? 'text-accent' : ''}`}>{e.fee}</span>
                  </div>
                ))}
              </div>
            </div>

            <aside className="flex flex-col gap-6">
              <section className="overflow-hidden rounded-[22px] border border-border-token bg-surface">
                <div className="flex items-center justify-between px-4 pt-4 text-sm font-bold"><span>Card of the Day</span><span className="text-xs text-[#E63946]">{CARD.game}</span></div>
                <div className="m-4 flex gap-3 rounded-2xl bg-[#3a2a22] p-3">
                  <div className="grid h-[104px] w-[74px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#E63946] to-[#7a1d24] text-center text-[10px] font-bold text-white">SAMPLE</div>
                  <div className="min-w-0"><div className="font-display text-lg font-bold leading-tight">{CARD.name}</div><div className="mt-0.5 text-xs text-secondary">{CARD.set} · {CARD.rarity}</div><div className="mt-2 text-2xl font-extrabold">{CARD.price}</div><span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[11px] font-bold text-accent">{CARD.change}</span></div>
                </div>
              </section>
              <section className="rounded-[22px] border border-border-token bg-surface p-4">
                <div className="mb-2 flex items-center justify-between"><h3 className="font-display text-lg font-bold tracking-[-0.02em]">Recent Activity</h3><span className="text-xs font-semibold text-accent">View all →</span></div>
                <ul className="divide-y divide-border-token">
                  {ACTIVITY.map(a => (
                    <li key={a.label + a.when} className="flex items-center justify-between py-2.5"><div><div className="text-sm font-medium">{a.label}</div><div className="text-xs text-tertiary">{a.when}</div></div><span className="text-sm font-bold text-accent">{a.xp}</span></li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
