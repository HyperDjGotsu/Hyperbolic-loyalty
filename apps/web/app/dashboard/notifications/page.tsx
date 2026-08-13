'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, string> | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  event_share: '📅',
  event_announced: '📣',
  event_reminder: '⏰',
  event_recap: '✅',
  friend_request: '👋',
  xp_earned: '⭐',
  spin_ready: '🎰',
  achievement: '🏆',
  leaderboard: '📊',
  referral: '🎁',
  store: '🛍️',
  pass_expiring: '⏳',
  weekly_summary: '📊',
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=50');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleTap = async (notif: Notification) => {
    if (!notif.is_read) {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notif.id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n)
      );
    }

    const d = notif.data ?? {};
    if (notif.type === 'event_share' || notif.type === 'event_announced' || notif.type === 'event_reminder' || notif.type === 'event_recap') {
      router.push(d.event_id ? `/dashboard/events?event=${d.event_id}` : '/dashboard/events');
    } else if (notif.type === 'friend_request') {
      router.push('/dashboard/community');
    } else if (notif.type === 'store') {
      router.push('/dashboard/prize-wall');
    } else if (notif.type === 'leaderboard') {
      router.push('/dashboard/community');
    } else {
      router.push('/dashboard/profile');
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-base pb-24">
      <div className="sticky top-0 bg-surface border-b border-border-token px-4 py-4 flex items-center justify-between z-10">
        <h1 className="text-primary font-bold text-lg">Notifications</h1>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            disabled={markingAll}
            className="text-accent text-sm font-medium disabled:opacity-50"
          >
            {markingAll ? 'Clearing...' : 'Mark all read'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <div className="text-5xl mb-4">🔔</div>
          <div className="text-primary font-bold text-lg mb-2">All caught up!</div>
          <div className="text-secondary text-sm">New notifications will appear here as you earn XP, attend events, and connect with players.</div>
        </div>
      ) : (
        <div className="divide-y divide-border-token">
          {notifications.map((notif) => (
            <button
              key={notif.id}
              type="button"
              onClick={() => handleTap(notif)}
              className={`w-full text-left px-4 py-4 flex items-start gap-3 transition-colors hover:bg-elevated/30 ${
                notif.is_read ? 'opacity-60' : ''
              }`}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-elevated flex items-center justify-center text-xl mt-0.5">
                {TYPE_ICONS[notif.type] ?? '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-sm font-semibold leading-snug ${notif.is_read ? 'text-secondary' : 'text-primary'}`}>
                    {notif.title}
                  </span>
                  <span className="text-tertiary text-xs flex-shrink-0 mt-0.5">{timeAgo(notif.created_at)}</span>
                </div>
                <p className="text-secondary text-sm mt-0.5 leading-snug">{notif.message}</p>
              </div>
              {!notif.is_read && (
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-accent mt-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
