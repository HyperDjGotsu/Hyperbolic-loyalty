'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CalendarDays, Megaphone, Clock, CheckCircle2, UserPlus, Sparkles, RotateCw, Trophy, BarChart3, Gift, ShoppingBag, Hourglass, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Loader } from '@/components/Loader';
import { PageTitle, SubText } from '@/components/PageTitle';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, string> | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  event_share: CalendarDays,
  event_announced: Megaphone,
  event_reminder: Clock,
  event_recap: CheckCircle2,
  friend_request: UserPlus,
  xp_earned: Sparkles,
  spin_ready: RotateCw,
  achievement: Trophy,
  leaderboard: BarChart3,
  referral: Gift,
  store: ShoppingBag,
  pass_expiring: Hourglass,
  weekly_summary: BarChart3,
};

// Picture when the notification carries one (own uploads or /games art); icon tile otherwise or if it fails to load.
function NotifThumb({ notif }: { notif: Notification }) {
  const [failed, setFailed] = useState(false);
  const url = notif.data?.image_url;
  if (url && !failed && (url.startsWith('/games/') || /^https:\/\//.test(url))) {
    return <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} className="flex-shrink-0 w-12 h-12 rounded-2xl object-cover mt-0.5 bg-elevated" />;
  }
  return (
    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-elevated flex items-center justify-center text-secondary mt-0.5">
      {React.createElement(TYPE_ICONS[notif.type] ?? Bell, { size: 22, strokeWidth: 1.75 })}
    </div>
  );
}

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
      <div className="sticky top-0 bg-base/90 backdrop-blur-xl px-4 pt-5 pb-3 flex items-end justify-between z-10">
        <PageTitle sub={<SubText>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</SubText>}>Alerts</PageTitle>
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
          <Loader />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-elevated text-secondary"><Bell size={26} strokeWidth={1.75} /></div>
          <div className="text-primary font-bold text-lg mb-2">All caught up!</div>
          <div className="text-secondary text-sm">New notifications will appear here as you earn XP, attend events, and connect with players.</div>
        </div>
      ) : (
        <div className="mx-4 mt-2 rounded-[26px] bg-surface border border-border-token overflow-hidden divide-y divide-border-token">
          {notifications.map((notif) => (
            <button
              key={notif.id}
              type="button"
              onClick={() => handleTap(notif)}
              className={`w-full text-left px-4 py-4 flex items-start gap-3 transition-colors hover:bg-elevated/30 ${
                notif.is_read ? 'opacity-60' : ''
              }`}
            >
              <NotifThumb notif={notif} />
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
