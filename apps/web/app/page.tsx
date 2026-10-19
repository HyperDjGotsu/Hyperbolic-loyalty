import Image from 'next/image';
import Link from 'next/link';

const SAMPLE_ACTIVITY = [
  { label: 'Friday Night Magic', detail: 'Attended', xp: '+10' },
  { label: 'Draft Night', detail: '2 match wins', xp: '+10' },
  { label: 'Welcome back', detail: 'Returning player', xp: '+5' },
];

const STEPS = [
  {
    title: 'Show up',
    body: 'Check in at your store with a QR scan. Events, match wins, and first visits all count.',
  },
  {
    title: 'Climb',
    body: 'XP builds your rank and puts you on the weekly and monthly leaderboards for every game you play.',
  },
  {
    title: 'Cash in',
    body: 'Spend Prize Points on the Prize Wall at your store, and see what your friends are up to.',
  },
];

function PassPreview() {
  return (
    <div
      aria-hidden="true"
      className="card w-full max-w-sm p-5 shadow-2xl shadow-black/40"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-tertiary">
            Your pass
          </p>
          <p className="xp-number mt-1 text-3xl tabular-nums">1,240 XP</p>
        </div>
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-fg">
          Example
        </span>
      </div>

      <div className="mt-5">
        <div className="flex justify-between text-xs text-secondary">
          <span>Next rank</span>
          <span>260 XP to go</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-elevated">
          <div className="h-full w-[83%] rounded-full bg-accent" />
        </div>
      </div>

      <ul className="mt-5 divide-y divide-border-token border-t border-border-token">
        {SAMPLE_ACTIVITY.map((row) => (
          <li key={row.label} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-primary">{row.label}</p>
              <p className="text-xs text-tertiary">{row.detail}</p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-accent">{row.xp} XP</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-base text-primary flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border-token">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={32}
            height={32}
            className="rounded-lg"
            priority
          />
          <span className="font-display text-xl font-bold tracking-tight">Player Pass</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-secondary hover:text-primary transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm font-medium bg-accent text-accent-fg px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-14 md:py-24 grid gap-12 md:grid-cols-2 md:items-center">
        <div>
          <h1 className="font-display text-5xl md:text-5xl lg:text-6xl font-black leading-[1.05] mb-6">
            Your game store,
            <br />
            now with a scoreboard.
          </h1>

          <p className="text-lg text-secondary max-w-md mb-8">
            Check in to events, earn XP for showing up and winning, and redeem Prize Points at
            your local game store.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-md">
            <Link
              href="/sign-up"
              className="flex-1 text-center whitespace-nowrap bg-accent text-accent-fg font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Create account
            </Link>
            <Link
              href="/sign-in"
              className="flex-1 text-center border border-border-strong text-primary font-semibold px-6 py-3 rounded-lg hover:bg-elevated transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="flex md:justify-end">
          <PassPreview />
        </div>
      </main>

      {/* How it works */}
      <section className="border-t border-border-token py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-bold mb-8">How it works</h2>
          <dl className="divide-y divide-border-token border-y border-border-token">
            {STEPS.map((s) => (
              <div key={s.title} className="grid gap-1 py-5 sm:grid-cols-[10rem_1fr] sm:gap-6">
                <dt className="font-semibold text-primary">{s.title}</dt>
                <dd className="text-secondary">{s.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-token py-6 px-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-between max-w-5xl mx-auto w-full">
        <p className="text-xs text-tertiary">© 2026 Hyperbolic Creative. All rights reserved.</p>
        <Link href="/privacy" className="text-xs text-tertiary hover:text-primary transition-colors">
          Privacy
        </Link>
      </footer>
    </div>
  );
}
