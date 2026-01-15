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
    <div className="w-full max-w-md mx-auto h-screen bg-slate-950 flex flex-col overflow-hidden md:rounded-3xl md:shadow-2xl md:border md:border-slate-700 md:my-4">
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
  );
}
