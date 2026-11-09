'use client';

import FriendsFab from '@/components/FriendsFab';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useClerk } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/ui';
import { StoreSwitcherModal } from '@/components/StoreSwitcherModal';
import PushNotificationPrompt from '@/components/PushNotificationPrompt';
import ResumeRefresh from '@/components/ResumeRefresh';
import { SW_URL } from '@/lib/sw-url';

const navItems = [
  {
    href: '/dashboard',
    label: 'Home',
    exact: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/events',
    label: 'Events',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/community',
    label: 'Community',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/prize-wall',
    label: 'Prize Wall',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/notifications',
    label: 'Alerts',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/profile',
    label: 'Profile',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

function MobileNavItem({
  item,
  pathname,
  unreadCount,
}: {
  item: typeof navItems[0];
  pathname: string;
  unreadCount: number;
}) {
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  const showBadge = item.href === '/dashboard/notifications' && unreadCount > 0;
  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={`flex flex-col items-center gap-0.5 py-2 px-1 flex-1 min-w-0 rounded-[22px] transition-colors relative
        ${isActive ? 'text-accent bg-white/10' : 'text-secondary hover:text-primary'}`}
    >
      <div className="relative">
        {item.icon}
        {showBadge && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedStoreName, setSelectedStoreName] = useState<string | null>(null);
  const [homeStoreId, setHomeStoreId] = useState<string | null>(null);
  const [showStoreSwitcher, setShowStoreSwitcher] = useState(false);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/notifications?unread=true&limit=1');
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount ?? 0);
        }
      } catch {
        // silently ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch('/api/player/by-clerk')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        // Only redirect to onboarding on an explicit linked:false — not on API errors
        if (d && d.linked === false) {
          router.replace('/onboarding');
          return;
        }
        if (!d) return;
        if (d.homeStore?.id) setHomeStoreId(d.homeStore.id);

        // Seed store from localStorage; fall back to homeStore
        const savedId = localStorage.getItem('ggc_selected_store_id');
        const savedName = localStorage.getItem('ggc_selected_store_name');
        if (savedId && savedName) {
          setSelectedStoreId(savedId);
          setSelectedStoreName(savedName);
        } else if (d.homeStore) {
          localStorage.setItem('ggc_selected_store_id', d.homeStore.id);
          localStorage.setItem('ggc_selected_store_name', d.homeStore.name);
          setSelectedStoreId(d.homeStore.id);
          setSelectedStoreName(d.homeStore.name);
        }
      })
      .catch(() => {});
  }, []);

  // Clear badge when visiting notifications page
  useEffect(() => {
    if (pathname === '/dashboard/notifications') setUnreadCount(0);
  }, [pathname]);

  // Keep the notifications worker on the current release (only for devices that allowed notifications)
  useEffect(() => {
    try {
      if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
        navigator.serviceWorker.register(SW_URL).catch(() => {});
      }
    } catch { /* not supported */ }
  }, []);

  // Tapping a push: the service worker leaves a note of where to go (iPhone ignores the link itself when it launches
  // a Home Screen app). Read it when the app opens or comes back to the front, and go there once.
  useEffect(() => {
    const goToPending = async () => {
      try {
        if (!('caches' in window)) return;
        const cache = await caches.open('pp-nav');
        const res = await cache.match('/pp-pending-nav');
        if (!res) return;
        await cache.delete('/pp-pending-nav');
        const note = (await res.json()) as { url?: string; at?: number };
        const fresh = typeof note.at === 'number' && Date.now() - note.at < 2 * 60_000;
        if (fresh && typeof note.url === 'string' && note.url.startsWith('/') && note.url !== window.location.pathname + window.location.search) {
          window.location.assign(note.url);
        }
      } catch { /* nothing pending */ }
    };
    goToPending();
    const onVisible = () => { if (document.visibilityState === 'visible') goToPending(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('pageshow', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('pageshow', onVisible);
    };
  }, []);

  // Tapping a push while the app is already open: the service worker sends the destination and we go there
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; url?: string } | null;
      if (d?.type === 'pp-navigate' && typeof d.url === 'string' && d.url.startsWith('/')) window.location.assign(d.url);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  // Keep the number on the Home Screen icon in step with the unread count (where the phone supports it)
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    try {
      if (unreadCount > 0) nav.setAppBadge?.(unreadCount)?.catch(() => {});
      else nav.clearAppBadge?.()?.catch(() => {});
    } catch { /* badges not supported */ }
  }, [unreadCount]);

  return (
    <div className="min-h-screen bg-base text-primary">
      {/* Desktop top bar */}
      <header className="hidden lg:flex sticky top-0 z-30 h-16 items-center justify-between border-b border-white/[0.08] bg-[color-mix(in_srgb,var(--bg-surface)_70%,transparent)] px-8 backdrop-blur-xl">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <img src="/brand/pp-mark.png" alt="" className="pp-mark-adaptive h-8 w-8" />
          <span className="font-display text-lg font-extrabold tracking-[-0.02em]">PlayerPass</span>
        </Link>
        <nav className="flex items-center gap-1 rounded-full bg-elevated p-1" aria-label="Main">
          {navItems.filter((i) => i.href !== '/dashboard/notifications').map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`pp-press rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${isActive ? 'bg-accent text-accent-fg' : 'text-secondary hover:text-primary'}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowStoreSwitcher(true)}
            className="group flex items-center gap-2 rounded-full border border-border-token bg-elevated py-1.5 pl-3 pr-3 text-left"
            title="Switch store"
          >
            <span className="max-w-[180px] truncate text-[13px] font-semibold leading-tight text-secondary">{selectedStoreName ?? 'PlayerPass'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-tertiary transition-colors group-hover:text-secondary"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <ThemeToggle />
          <Link href="/dashboard/notifications" aria-label="Alerts" className="pp-press relative grid h-9 w-9 place-items-center rounded-full bg-elevated text-secondary transition-colors hover:text-primary">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </Link>
          <div className="relative">
            <button onClick={() => setShowAccountMenu(v => !v)} aria-label="Account menu" aria-expanded={showAccountMenu} className="pp-press grid h-9 w-9 place-items-center rounded-full bg-elevated text-secondary transition-colors hover:text-primary">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
            {showAccountMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAccountMenu(false)} />
                <div className="pp-pop absolute right-0 top-11 z-50 w-44 overflow-hidden rounded-2xl border border-border-token bg-surface p-1.5 shadow-2xl">
                  <Link href="/dashboard/profile" onClick={() => setShowAccountMenu(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold hover:bg-elevated">Profile</Link>
                  <button onClick={() => signOut({ redirectUrl: '/' })} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-secondary hover:bg-elevated hover:text-red-400">Sign out</button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pb-44 lg:pb-24">
        <div className="lg:mx-auto lg:max-w-[1320px] min-[1700px]:max-w-[1920px] min-[1700px]:px-10 lg:px-6">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-3 pointer-events-none" style={{ paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="pointer-events-auto flex items-center gap-0.5 p-1.5 rounded-[30px] border border-white/10 bg-[color-mix(in_srgb,var(--bg-surface)_72%,transparent)] backdrop-blur-xl backdrop-saturate-150 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
          {/* Alerts live on the Home avatar badge, not in the bar */}
          {navItems.filter((i) => i.href !== '/dashboard/notifications').map((item) => (
            <MobileNavItem
              key={item.href}
              item={item}
              pathname={pathname}
              unreadCount={unreadCount}
            />
          ))}
        </div>
      </nav>

      <FriendsFab />
      <PushNotificationPrompt />
      <ResumeRefresh />
      {showStoreSwitcher && (
        <StoreSwitcherModal
          currentStoreId={selectedStoreId}
          homeStoreId={homeStoreId}
          onSwitch={(store) => {
            localStorage.setItem('ggc_selected_store_id', store.id);
            localStorage.setItem('ggc_selected_store_name', store.name);
            setSelectedStoreId(store.id);
            setSelectedStoreName(store.name);
            setShowStoreSwitcher(false);
            window.location.reload();
          }}
          onClose={() => setShowStoreSwitcher(false)}
        />
      )}
    </div>
  );
}
