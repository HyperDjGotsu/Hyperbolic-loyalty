'use client';

import { usePathname, useRouter } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import NotificationBell from '@/components/NotificationBell';

const navItems = [
  { id: 'home', path: '/dashboard', icon: '🏠', label: 'Home' },
  { id: 'events', path: '/dashboard/events', icon: '📅', label: 'Events' },
  { id: 'shop', path: '/dashboard/shop', icon: '🛒', label: 'Shop' },
  { id: 'community', path: '/dashboard/community', icon: '👥', label: 'Community' },
  { id: 'profile', path: '/dashboard/profile', icon: '👤', label: 'Profile' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* ============ MOBILE LAYOUT (below lg) ============ */}
      <div className="lg:hidden w-full max-w-md mx-auto h-screen bg-slate-950 flex flex-col overflow-hidden">
        {/* Status Bar (mock) */}
        <div className="bg-slate-900 text-white text-xs py-2 px-4 flex justify-between items-center border-b border-slate-800">
          <span className="font-mono">9:41</span>
          <div className="flex gap-2 items-center">
            <NotificationBell />
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-7 h-7"
                }
              }}
            />
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>

        {/* Bottom Navigation */}
        <nav className="bg-slate-900 border-t border-slate-800 py-2 px-2 flex justify-around items-center safe-area-inset-bottom">
          {navItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => router.push(tab.path)}
              className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all ${
                isActive(tab.path)
                  ? 'text-cyan-400 bg-cyan-500/10'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs mt-0.5">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ============ DESKTOP LAYOUT (lg and above) ============ */}
      <div className="hidden lg:flex min-h-screen bg-slate-950">
        {/* Desktop Sidebar */}
        <aside className="flex flex-col w-64 fixed inset-y-0 bg-slate-900 border-r border-slate-800">
          {/* Logo */}
          <div className="p-6 border-b border-slate-800">
            <div className="text-2xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-orbitron">
              HYPERBOLIC
            </div>
            <div className="text-orange-400 text-xs font-bold tracking-widest mt-1">— GAMES —</div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive(item.path)
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-white border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
                {isActive(item.path) && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-cyan-400" />
                )}
              </button>
            ))}
          </nav>

          {/* User section at bottom */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50">
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10"
                  }
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">Account</div>
                <div className="text-slate-500 text-xs">Manage profile</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col ml-64">
          {/* Desktop Header */}
          <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 py-4 px-8 sticky top-0 z-40 flex items-center justify-between">
            <div>
              <h1 className="text-white text-xl font-bold">
                {navItems.find(item => isActive(item.path))?.label || 'Dashboard'}
              </h1>
              <p className="text-slate-500 text-sm">Welcome back to Hyperbolic Games</p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <UserButton 
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9"
                  }
                }}
              />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
