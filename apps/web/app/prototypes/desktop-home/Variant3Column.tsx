import { PLAYER, GAMES, EVENTS, ACTIVITY, NAV, art } from './mock';

// A decorative QR-style pattern for the mock (not a real code). Seeded so it never changes between renders.
function FakeQr() {
  const n = 21;
  const cells: boolean[] = [];
  let seed = 7;
  for (let i = 0; i < n * n; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; cells.push((seed >> 16) % 2 === 0); }
  const finder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const finderOn = (r: number, c: number) => {
    const lr = r < 7 ? r : r - (n - 7);
    const lc = c < 7 ? c : c - (n - 7);
    return lr === 0 || lr === 6 || lc === 0 || lc === 6 || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
  };
  return (
    <div className="grid rounded-xl bg-white p-3" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, width: 168, height: 168 }}>
      {cells.map((on, i) => { const r = Math.floor(i / n), c = i % n; const v = finder(r, c) ? finderOn(r, c) : on; return <span key={i} className={v ? 'bg-black' : 'bg-white'} />; })}
    </div>
  );
}

// Axis: interaction model. Desktop players get the phone experience in a centered column, with a "use it on your phone" card beside it.
export default function Variant3Column() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-base text-primary">
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-[800px] bg-[radial-gradient(60%_60%_at_50%_30%,rgba(61,220,106,0.12),transparent_70%)]" />
      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1240px] grid-cols-[1fr_430px_1fr] items-center gap-10 px-8 py-8">
        {/* Left: get on your phone */}
        <section className="justify-self-end">
          <img src="/brand/pp-mark.png" alt="" className="mb-5 h-10 w-10" />
          <h1 className="font-display max-w-[300px] text-[40px] font-extrabold leading-[1.04] tracking-[-0.035em]">Player Pass is built for your phone.</h1>
          <p className="mt-3 max-w-[300px] text-[15px] leading-relaxed text-secondary">Scan to open it on your phone and add it to your home screen. This window works too.</p>
          <div className="mt-6 inline-block rounded-[24px] border border-border-token bg-surface p-4"><FakeQr /><div className="mt-3 text-center text-xs font-semibold text-secondary">playerpass.gg</div></div>
        </section>

        {/* Center: the phone column */}
        <div className="relative h-[740px] overflow-hidden rounded-[44px] border border-white/10 bg-base shadow-[0_40px_100px_rgba(0,0,0,0.55)]">
          <div className="h-full overflow-y-auto px-5 pb-28 pt-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center justify-between"><h2 className="font-display text-[30px] font-extrabold tracking-[-0.03em]">Home</h2><div className="grid h-9 w-9 place-items-center rounded-full bg-xp">😎</div></div>
            <section className="relative mt-4 overflow-hidden rounded-[26px] border border-white/10 p-5">
              <img src={art('riftbound')} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/65" />
              <div className="relative">
                <div className="flex items-center gap-4"><div className="grid h-16 w-16 place-items-center rounded-2xl border-[3px] border-accent bg-xp text-3xl">😎</div><div><div className="font-display text-[26px] font-extrabold leading-none tracking-[-0.03em] text-white">{PLAYER.name}</div><div className="mt-1 text-xs font-bold text-yellow-400">Level {PLAYER.level}</div></div></div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-accent" style={{ width: '98%' }} /></div>
                <div className="mt-3 grid grid-cols-3 text-center">{[{ v: PLAYER.gamesPlayed, l: 'Games' }, { v: PLAYER.xp.toLocaleString(), l: 'Total XP' }, { v: PLAYER.prizePoints, l: 'Points' }].map(s => (<div key={s.l}><div className="font-display text-xl font-extrabold text-white">{s.v}</div><div className="text-[10px] uppercase tracking-wide text-white/70">{s.l}</div></div>))}</div>
              </div>
            </section>
            <h3 className="font-display mb-2.5 mt-6 text-lg font-bold tracking-[-0.02em]">My Games</h3>
            <div className="grid grid-cols-2 gap-3">
              {GAMES.map(g => (
                <article key={g.id} className="relative h-[132px] overflow-hidden rounded-[20px]"><img src={art(g.id)} alt="" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" /><div className="absolute inset-x-3 bottom-2.5"><div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: g.color }}>{g.name}</div><div className="font-display text-2xl font-extrabold leading-none text-white">{g.value}</div><div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full" style={{ width: `${g.progress}%`, background: g.color }} /></div></div></article>
              ))}
            </div>
            <h3 className="font-display mb-2.5 mt-6 text-lg font-bold tracking-[-0.02em]">Recent Activity</h3>
            <ul className="divide-y divide-border-token rounded-2xl border border-border-token bg-surface px-4">{ACTIVITY.slice(0, 4).map(a => (<li key={a.label + a.when} className="flex items-center justify-between py-3"><div><div className="text-sm font-medium">{a.label}</div><div className="text-xs text-tertiary">{a.when}</div></div><span className="text-sm font-bold text-accent">{a.xp}</span></li>))}</ul>
          </div>
          <nav className="absolute inset-x-3 bottom-3 flex items-center gap-0.5 rounded-[30px] border border-white/10 bg-[color-mix(in_srgb,var(--bg-surface)_72%,transparent)] p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            {NAV.map((n, i) => (<span key={n} className={`flex-1 rounded-[24px] py-2.5 text-center text-[11px] font-semibold ${i === 0 ? 'bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-accent' : 'text-secondary'}`}>{n}</span>))}
          </nav>
        </div>

        {/* Right: today at the store */}
        <section className="justify-self-start">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-tertiary">At {PLAYER.store}</div>
          <h2 className="font-display mt-2 text-[28px] font-extrabold leading-tight tracking-[-0.03em]">This week</h2>
          <div className="mt-4 flex w-[290px] flex-col gap-2.5">
            {EVENTS.map(e => (<div key={e.id} className="flex items-center gap-3 rounded-[20px] border border-border-token bg-surface p-2.5"><div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-elevated"><img src={art(e.game)} alt="" className="h-full w-full object-cover" onError={(ev) => ev.currentTarget.remove()} /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{e.name}</div><div className="truncate text-xs text-secondary">{e.when}</div></div><span className={`text-xs font-bold ${e.fee === 'Free' ? 'text-accent' : ''}`}>{e.fee}</span></div>))}
          </div>
        </section>
      </div>
    </div>
  );
}
