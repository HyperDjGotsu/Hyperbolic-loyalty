'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ui';

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
    label: 'Shop',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
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

function MobileNavItem({ item, pathname }: { item: typeof navItems[0]; pathname: string }) {
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      className={`flex flex-col items-center gap-1 py-2 px-3 flex-1 transition-colors
        ${isActive ? 'text-primary' : 'text-tertiary hover:text-secondary'}`}
    >
      {item.icon}
      <span className="text-[10px] font-medium">{item.label}</span>
      {isActive && <span className="absolute bottom-0 h-0.5 w-6 bg-accent rounded-full" />}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-base text-primary">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-56 bg-surface border-r border-border-token z-30">
        <div className="px-4 py-5 border-b border-border-token flex items-center justify-between">
          <span className="font-display font-bold text-lg text-primary">Hyperbolic XP</span>
          <ThemeToggle />
        </div>
        <nav className="flex-1 px-2 py-4 flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
        <div className="p-4 border-t border-border-token">
          <Link
            href="/hq"
            className="text-xs text-tertiary hover:text-secondary transition-colors"
          >
            Staff HQ →
          </Link>
        </div>
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
            <MobileNavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      </nav>
    </div>
  );
}
