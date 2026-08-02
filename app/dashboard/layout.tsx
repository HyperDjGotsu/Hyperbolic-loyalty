'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/ui';
import { StoreSwitcherModal } from '@/components/StoreSwitcherModal';

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
    href: '/dashboard/shop',
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

// Desktop sidebar items (no Alerts tab — bell is already in DesktopDashboard header)
const desktopNavItems = navItems.filter((i) => i.href !== '/dashboard/notifications');

function NavItem({ item, pathname }: { item: typeof navItems[0]; pathname: string }) {
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
        ${isActive
          ? 'bg-elevated text-primary border-l-2 border-accent pl-[10px]'
          : 'text-secondary hover:text-primary hover:bg-elevated/50'
        }`}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

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
      className={`flex flex-col items-center gap-1 py-2 px-3 flex-1 transition-colors relative
        ${isActive ? 'text-primary' : 'text-tertiary hover:text-secondary'}`}
    >
      <div className="relative">
        {item.icon}
        {showBadge && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium">{item.label}</span>
      {isActive && <span className="absolute bottom-0 h-0.5 w-6 bg-accent rounded-full" />}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isStaff, setIsStaff] = useState(false);
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
        if (!d) return;
        if (d.isStaff) setIsStaff(true);
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

  return (
    <div className="min-h-screen bg-base text-primary">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-56 bg-surface border-r border-border-token z-30">
        <div className="px-4 py-5 border-b border-border-token flex items-center justify-between">
          <button
            onClick={() => setShowStoreSwitcher(true)}
            className="flex items-center gap-1.5 min-w-0 group text-left"
            title="Switch store"
          >
            <span className="font-display font-bold text-sm text-primary truncate leading-tight">
              {selectedStoreName ?? 'Hyperbolic XP'}
            </span>
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className="flex-shrink-0 text-tertiary group-hover:text-secondary transition-colors"
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <ThemeToggle />
        </div>
        <nav className="flex-1 px-2 py-4 flex flex-col gap-0.5">
          {desktopNavItems.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
        {isStaff && (
          <div className="p-4 border-t border-border-token">
            <Link
              href="/hq"
              className="text-xs text-tertiary hover:text-secondary transition-colors"
            >
              Staff HQ →
            </Link>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="lg:ml-56 pb-20 lg:pb-0">
        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-border-token sticky top-0 bg-base/95 backdrop-blur-sm z-20">
          <h1 className="text-base font-semibold text-primary capitalize">
            {pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
          </h1>
        </div>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border-token z-30">
        <div className="flex items-center relative">
          {navItems.map((item) => (
            <MobileNavItem
              key={item.href}
              item={item}
              pathname={pathname}
              unreadCount={unreadCount}
            />
          ))}
        </div>
      </nav>

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
