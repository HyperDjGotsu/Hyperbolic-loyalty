import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useApi } from '@/lib/api';

type FriendRequest = {
  friendshipId: string;
  id: string;
  odid: string;
  name: string;
  avatar: {
    type: 'emoji' | 'photo';
    base: string;
    photoUrl: string | null;
    background: string;
    frame: string;
    badge: string | null;
  };
  timestamp: string;
};

type AlertsCtx = {
  badgeCount: number;
  friendRequests: FriendRequest[];
  refreshBadge: () => void;
  removeFriendRequest: (friendshipId: string) => void;
};

const AlertsContext = createContext<AlertsCtx>({
  badgeCount: 0,
  friendRequests: [],
  refreshBadge: () => {},
  removeFriendRequest: () => {},
});

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const api = useApi();
  const [badgeCount, setBadgeCount] = useState(0);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [notifData, requestData] = await Promise.all([
        api.get<{ notifications: Array<{ is_read: boolean }> }>('/api/notifications').catch(() => ({ notifications: [] })),
        api.get<{ requests: FriendRequest[] }>('/api/community/friend-requests').catch(() => ({ requests: [] })),
      ]);
      const unread = notifData.notifications?.filter(n => !n.is_read).length ?? 0;
      const pending = requestData.requests ?? [];
      setFriendRequests(pending);
      setBadgeCount(unread + pending.length);
    } catch { /* silent — badge just stays as-is */ }
  }, []);

  useEffect(() => { refresh(); }, []);

  const removeFriendRequest = useCallback((friendshipId: string) => {
    setFriendRequests(prev => {
      const next = prev.filter(r => r.friendshipId !== friendshipId);
      setBadgeCount(count => Math.max(0, count - 1));
      return next;
    });
  }, []);

  return (
    <AlertsContext.Provider value={{ badgeCount, friendRequests, refreshBadge: refresh, removeFriendRequest }}>
      {children}
    </AlertsContext.Provider>
  );
}

export const useAlertsContext = () => useContext(AlertsContext);
