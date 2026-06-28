import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-base text-primary flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border-token">
        <span className="font-display text-xl font-bold tracking-tight">Hyperbolic XP</span>
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
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-2xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 bg-accent/10 text-accent text-xs font-medium px-3 py-1 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Now live at Games of Martinez
        </div>

        <h1 className="font-display text-5xl font-black leading-tight mb-6">
          Earn XP.<br />
          Climb the ranks.<br />
          Own your game.
        </h1>

        <p className="text-lg text-secondary max-w-md mb-10">
          Hyperbolic XP rewards you for every event, match, and purchase. Track your progress, compete on the leaderboard, and unlock rewards.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs mx-auto">
          <Link
            href="/sign-up"
            className="flex-1 text-center bg-accent text-accent-fg font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            Create account
          </Link>
          <Link
            href="/sign-in"
            className="flex-1 text-center border border-strong text-primary font-semibold px-6 py-3 rounded-lg hover:bg-elevated transition-colors"
          >
            Sign in
          </Link>
        </div>
      </main>

      {/* Features */}
      <section className="border-t border-border-token py-16 px-6">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: '🏆', title: 'Earn XP', body: 'Every event, match win, and purchase earns you points toward your rank.' },
            { icon: '📊', title: 'Leaderboards', body: 'Compete weekly and monthly. See where you stand in every game.' },
            { icon: '🎁', title: 'Rewards', body: 'Unlock cosmetics, badges, and store perks as you level up.' },
          ].map((f) => (
            <div key={f.title} className="card p-5">
              <span className="text-2xl mb-3 block">{f.icon}</span>
              <h3 className="font-semibold text-primary mb-1">{f.title}</h3>
              <p className="text-sm text-secondary">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-token py-6 px-6 text-center">
        <p className="text-xs text-tertiary">© 2026 Hyperbolic Creative. All rights reserved.</p>
      </footer>
    </div>
  );
}
