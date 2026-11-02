'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui';
import ActivityIcon from './ActivityIcon';

type Activity = { icon: string; headline: string; subtext?: string };
type Friend = { id: string; name: string; level?: number; status?: string | null; avatar: any };

// Small two-tab panel: what friends are doing, and who they are (with their status).
export function FriendsMini({ activity, limit = 3 }: { activity: Activity[]; limit?: number }) {
  const router = useRouter();
  const [tab, setTab] = useState<'activity' | 'friends'>('activity');
  const [friends, setFriends] = useState<Friend[] | null>(null);

  useEffect(() => {
    if (tab !== 'friends' || friends !== null) return;
    let cancelled = false;
    fetch('/api/community/friends')
      .then(r => (r.ok ? r.json() : { friends: [] }))
      .then(d => { if (!cancelled) setFriends(d.friends || []); })
      .catch(() => { if (!cancelled) setFriends([]); });
    return () => { cancelled = true; };
  }, [tab, friends]);

  const pill = (id: 'activity' | 'friends', label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`pp-press rounded-full px-3 py-1 text-xs font-semibold ${tab === id ? 'bg-accent/15 text-accent' : 'text-secondary hover:text-primary'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex gap-1">{pill('activity', 'Activity')}{pill('friends', 'Friends')}</div>
      {tab === 'activity' ? (
        activity.length === 0 ? (
          <div className="grid flex-1 place-items-center px-2 text-center text-xs text-tertiary">Add friends to see what they are playing.</div>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            {activity.slice(0, limit).map((f, i) => (
              <li key={i} className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-elevated text-sm"><ActivityIcon name={f.icon} /></span>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{f.headline}</div>{f.subtext && <div className="truncate text-xs text-secondary">{f.subtext}</div>}</div>
              </li>
            ))}
          </ul>
        )
      ) : friends === null ? (
        <div className="grid flex-1 place-items-center text-xs text-tertiary">Loading…</div>
      ) : friends.length === 0 ? (
        <div className="grid flex-1 place-items-center px-2 text-center text-xs text-tertiary">No friends yet. Find players in Community.</div>
      ) : (
        <ul className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {friends.slice(0, limit + 3).map(f => (
            <li key={f.id} className="flex cursor-pointer items-center gap-2.5" onClick={() => router.push('/dashboard/community')}>
              <div className="shrink-0 scale-75 origin-left -mr-2.5"><Avatar avatar={f.avatar} size="sm" /></div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{f.name}</div>
                <div className="truncate text-xs text-secondary">{f.status || (f.level ? `Level ${f.level}` : '')}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
