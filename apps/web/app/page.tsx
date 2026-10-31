import Image from 'next/image';
import Link from 'next/link';
import { LaneLink } from '@/components/LaneLink';
import { DoorsSwitch } from '@/components/DoorsSwitch';

const PLAYER_ART = ['pokemon', 'one_piece', 'riftbound'];

const STORE_TILES = [
  { label: 'Check-in', value: 'QR or NFC' },
  { label: 'Passes', value: '4 tiers' },
  { label: 'Prize Wall', value: 'Your catalog' },
];

function PlayerDoor() {
  return (
    <section className={`relative min-h-[400px] md:min-h-[430px] overflow-hidden rounded-[28px] text-white ring-1 ring-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.45)] `}>
      <div className="absolute inset-0 grid grid-cols-3">
        {PLAYER_ART.map((g) => (
          <div key={g} className="relative">
            <Image src={`/games/ggob/${g}.jpg`} alt="" fill sizes="(min-width: 768px) 20vw, 33vw" className="object-cover" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#141311]/25 via-[#141311]/85 to-[#141311]/95" />
      <div className="absolute inset-x-6 bottom-6 sm:inset-x-9 sm:bottom-9">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3ddc6a]">For players</p>
        <h2 className="font-display mt-2.5 text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[40px]">
          Show up. Climb.<br />Cash in.
        </h2>
        <p className="mt-3 mb-5 max-w-[26rem] text-[16px] leading-relaxed text-[#cfc8ba]">
          Earn XP at every event, rank up on every game&apos;s leaderboard, and redeem Prize Points at your store.
        </p>
        <div className="flex flex-wrap gap-3">
          <LaneLink lane="player" href="/sign-up" className="pp-press rounded-2xl bg-accent px-5 py-3 font-bold text-accent-fg">Create account</LaneLink>
          <LaneLink lane="player" href="/sign-in" className="pp-press rounded-2xl border border-white/35 px-5 py-3 font-bold">Sign in</LaneLink>
        </div>
      </div>
    </section>
  );
}

function StoreDoor() {
  return (
    <section className="relative flex min-h-[400px] md:min-h-[430px] flex-col justify-between gap-8 overflow-hidden rounded-[28px] text-white bg-gradient-to-br from-[#2c2b27] to-[#1c1b19] p-6 ring-1 ring-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:p-9">
      <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_80%_0%,rgba(77,141,255,0.18),transparent_70%)]" />
      <div className="relative grid grid-cols-3 gap-2.5">
        {STORE_TILES.map((t) => (
          <div key={t.label} className="rounded-[18px] border border-white/10 bg-white/10 p-3.5 backdrop-blur-xl sm:p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/60">{t.label}</p>
            <p className="mt-1.5 text-[15px] font-bold">{t.value}</p>
          </div>
        ))}
      </div>
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7fb0ff]">For stores</p>
        <h2 className="font-display mt-2.5 text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[40px]">
          Loyalty that runs<br />itself.
        </h2>
        <p className="mt-3 mb-5 max-w-[27rem] text-[16px] leading-relaxed text-[#cfc8ba]">
          Players check in, earn and come back. Your staff only run the events. No setup, no training.
        </p>
        <div className="flex flex-wrap gap-3">
          <LaneLink lane="store" href="/pitch" className="pp-press rounded-2xl bg-[#f2efe8] px-5 py-3 font-bold text-[#1f1e1b]">See how it works</LaneLink>
          <LaneLink lane="store" href="/demo" className="pp-press rounded-2xl border border-white/35 px-5 py-3 font-bold">Try the demo</LaneLink>
        </div>
      </div>
    </section>
  );
}

// Signed-in players never get here (middleware sends them to the dashboard), and signed-out visitors
// remembered as players are sent to sign-in. Everyone else sees both doors.
export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-base text-primary">
      <div className="pointer-events-none absolute inset-x-0 -top-52 h-[900px] bg-[radial-gradient(60%_60%_at_50%_30%,rgba(61,220,106,0.13),transparent_70%)]" />

      <header className="relative z-10 flex items-center justify-between border-b border-white/[0.08] bg-[color-mix(in_srgb,var(--bg-surface)_55%,transparent)] px-5 py-3.5 backdrop-blur-xl sm:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/brand/pp-mark.png" alt="" width={30} height={30} priority className="pp-mark-adaptive" />
          <span className="font-display text-xl font-extrabold tracking-[-0.02em]">Player Pass</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-secondary md:flex">
          <Link href="/pitch" className="transition-colors hover:text-primary">For stores</Link>
          <Link href="/demo" className="transition-colors hover:text-primary">Demo</Link>
        </nav>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <LaneLink lane="player" href="/sign-in" className="text-secondary transition-colors hover:text-primary">Sign in</LaneLink>
          <LaneLink lane="player" href="/sign-up" className="pp-press rounded-xl bg-accent px-4 py-2 text-accent-fg">Get started</LaneLink>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1180px] px-5 pb-14 pt-9 sm:px-10 md:pt-[72px]">
        <div className="mb-7 text-center md:mb-12">
          <h1 className="font-display text-[36px] font-black leading-[1.04] tracking-[-0.035em] sm:text-[68px]">
            Your game store,<br />now with a scoreboard.
          </h1>
          <p className="mx-auto mt-4 max-w-[35rem] text-[16px] leading-relaxed text-secondary sm:mt-5 sm:text-lg">
            Check in to events, earn XP, and spend Prize Points. Pick the door that fits you.
          </p>
        </div>

        <DoorsSwitch labels={['For players', 'For stores']}>
          <PlayerDoor />
          <StoreDoor />
        </DoorsSwitch>

        <p className="mt-6 text-center text-[13px] text-tertiary">
          <Link href="/privacy" className="hover:text-primary">Privacy</Link>
        </p>
      </main>
    </div>
  );
}
