'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { SignIn, SignUp } from '@clerk/nextjs';

// Sign-in / sign-up screen. Clerk keeps the security and every step (codes, errors, Google and Discord redirects);
// this file only re-skins it and builds the page around it: the store's game art fills the screen and the form
// floats on top. On a phone the form sits in the vertical middle, the brand above it and the promise below.
export type Mode = 'sign-up' | 'sign-in';

// Clerk works out its own shades from these, so they must be real colors. Read from the active theme and
// re-read when the theme or tone changes, so light, dark and every tone stay in step with the page.
type Palette = { accent: string; input: string; text: string; muted: string };
const DARK: Palette = { accent: '#3ddc6a', input: '#2b2a26', text: '#f2efe8', muted: '#a89f90' };

function usePalette(): Palette {
  const [pal, setPal] = useState<Palette>(DARK);
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const v = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
      setPal({ accent: v('--accent', DARK.accent), input: v('--bg-input', DARK.input), text: v('--text-primary', DARK.text), muted: v('--text-secondary', DARK.muted) });
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-tone'] });
    return () => mo.disconnect();
  }, []);
  return pal;
}

export function clerkAppearance(opts: { headerCentered?: boolean; compactHeader?: boolean } = {}, pal: Palette = DARK) {
  const { headerCentered = false, compactHeader = false } = opts;
  return {
    variables: {
      colorPrimary: pal.accent,
      colorBackground: 'transparent',
      colorInput: pal.input,
      colorInputForeground: pal.text,
      colorForeground: pal.text,
      colorMutedForeground: pal.muted,
      borderRadius: '16px',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
    },
    // The page already shows the Player Pass mark above the card; hide Clerk's own copy of it here
    layout: { logoPlacement: 'none' },
    elements: {
      rootBox: '!w-full',
      cardBox: '!w-full !shadow-none !border-0 !bg-transparent',
      card: '!w-full !p-0 !gap-5 !shadow-none !border-0 !bg-transparent',
      header: headerCentered ? '!text-center !items-center' : '',
      headerTitle: compactHeader
        ? '!font-display !text-xl !font-extrabold !tracking-tight !text-primary'
        : '!font-display !text-[30px] !leading-[1.05] !font-extrabold !tracking-tight !text-primary',
      headerSubtitle: '!text-sm !text-secondary',
      socialButtonsBlockButton:
        '!h-12 !rounded-2xl !border !border-border-token !bg-elevated !text-primary !shadow-none hover:!bg-surface transition-colors',
      socialButtonsBlockButtonText: '!font-semibold !text-primary',
      dividerLine: '!bg-border',
      dividerText: '!text-xs !uppercase !tracking-widest !text-tertiary',
      formFieldLabel: '!text-xs !font-semibold !uppercase !tracking-wider !text-secondary',
      formFieldInput:
        '!h-12 !rounded-2xl !border !border-border-token !bg-input !text-primary !shadow-none focus:!border-accent',
      formFieldInputShowPasswordButton: '!text-secondary hover:!text-primary',
      formButtonPrimary:
        '!h-12 !rounded-2xl !bg-accent !text-accent-fg !text-sm !font-bold !shadow-none hover:!opacity-90 active:!scale-[0.98] transition',
      footer: '!bg-transparent !bg-none',
      footerAction: '!hidden',
      footerActionLink: '!text-accent',
      identityPreview: '!rounded-2xl !border !border-border-token !bg-elevated',
      identityPreviewText: '!text-primary',
      identityPreviewEditButton: '!text-accent',
      otpCodeFieldInput: '!rounded-xl !border !border-border-token !bg-input !text-primary',
      formResendCodeLink: '!text-accent',
      alert: '!rounded-2xl',
      backLink: '!text-secondary',
    },
  };
}


const ART = ['pokemon', 'one_piece', 'riftbound', 'azuki', 'gundam', 'lorcana'];
const FORM_OPTS = { compactHeader: true };

function ModeTabs({ mode }: { mode: Mode }) {
  const tab = (m: Mode, href: string, label: string) => (
    <Link
      href={href}
      aria-current={mode === m ? 'page' : undefined}
      className={`pp-press grid h-10 flex-1 place-items-center rounded-xl text-sm font-bold transition-colors ${
        mode === m ? 'bg-accent text-accent-fg' : 'text-secondary hover:text-primary'
      }`}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Account" className="mb-5 flex gap-1 rounded-2xl border border-border-token bg-surface p-1">
      {tab('sign-up', '/sign-up', 'Create account')}
      {tab('sign-in', '/sign-in', 'Sign in')}
    </nav>
  );
}

function Legal({ className = '', extra }: { className?: string; extra?: ReactNode }) {
  return (
    <div className={`text-xs text-white/55 ${className}`}>
      <p>
        © 2026 Hyperbolic Creative · <Link href="/privacy" className="underline underline-offset-2 hover:text-white/80">Privacy</Link> · <Link href="/terms" className="underline underline-offset-2 hover:text-white/80">Terms</Link>
      </p>
      {extra && <p className="mt-1.5">{extra}</p>}
    </div>
  );
}

export default function AuthShell({ mode, extra }: { mode: Mode; extra?: ReactNode }) {
  const appearance = clerkAppearance(FORM_OPTS, usePalette()) as any;
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#141311] text-white">
      <div aria-hidden="true" className="absolute inset-0 grid grid-cols-3 grid-rows-2">
        {ART.map(g => (
          <img key={g} src={`/games/ggob/${g}.jpg`} alt="" className="h-full w-full object-cover" />
        ))}
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/80" />

      <div className="relative z-10 flex min-h-screen flex-col px-5 pb-8 pt-7 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:px-16 lg:pb-10 lg:pt-10">
        <header className="pp-pop flex flex-col items-center lg:max-w-2xl lg:flex-1 lg:items-start">
          <img src="/brand/pp-lockup.png" alt="Player Pass" className="h-[88px] w-auto drop-shadow-[0_6px_20px_rgba(0,0,0,0.5)] lg:h-36" />
          <div className="hidden lg:block">
            <p className="mt-10 text-[15px] font-semibold text-white/70">Your store. Your games. Your rank.</p>
            <h1 className="font-display mt-2.5 text-[52px] font-extrabold leading-[1.06] tracking-[-0.03em]">
              Show Up,<br />Climb the Leaderboard,<br />Win Prizes
            </h1>
            <p className="mt-3 max-w-md text-[16px] leading-relaxed text-white/85">
              Earn XP at every event, rank up on every game&apos;s leaderboard, and spend Prize Points at your store.
            </p>
          </div>
        </header>

        <div className="pp-pop-slow my-auto w-full max-w-[420px] self-center rounded-[28px] border border-white/15 bg-base/85 p-5 text-primary shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:my-0 lg:self-auto lg:p-7">
          <ModeTabs mode={mode} />
          {mode === 'sign-up' ? (
            <SignUp forceRedirectUrl="/onboarding" appearance={appearance} />
          ) : (
            <SignIn fallbackRedirectUrl="/dashboard" appearance={appearance} />
          )}
        </div>

        <footer className="mt-6 text-center lg:hidden">
          <p className="font-display text-[21px] font-extrabold leading-tight tracking-tight">
            Show Up, Climb the Leaderboard,<br />Win Prizes
          </p>
          <Legal className="mt-2" extra={extra} />
        </footer>
      </div>

      <Legal className="absolute bottom-5 left-16 z-10 hidden lg:block" extra={extra} />
    </div>
  );
}
