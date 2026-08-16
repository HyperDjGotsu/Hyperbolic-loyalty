'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export interface DashboardStore {
  id: string;
  name: string;
  city: string;
  slug: string;
  is_flagship: boolean;
  color: string | null;
}

export interface StoreConfig {
  store_name: string;
  currency_name: string;
  currency_icon: string;
}

export interface DashboardSpinState {
  hasSpunToday: boolean;
  isSpinning: boolean;
  message: string | null;
}

export type DashboardPassTier = 'free' | 'bronze' | 'silver' | 'gold' | 'diamond';

export interface DashboardPassStatus {
  tier: DashboardPassTier;
  lifetimeXp: number;
  prizePoints: number;
  multiplier: number;
}

export interface DashboardData {
  loading: boolean;
  player: any | null;
  homeStore: DashboardStore | null;
  selectedStore: DashboardStore | null;
  selectStore: (store: DashboardStore) => void;
  refreshPlayer: () => void;
  storeConfig: StoreConfig;
  banners: any[];
  passStatus: DashboardPassStatus | null;
  favoriteGameIds: string[];
  gameStats: Record<string, any>;
  upcomingEvents: any[];
  storeUpdates: any[];
  friendActivity: any[];
  prizeHighlights: any[];
  recentActivity: any[];
  spin: DashboardSpinState;
  claimDailySpin: () => Promise<void>;
}

const DEFAULT_STORE_CONFIG: StoreConfig = {
  store_name: 'Player Pass',
  currency_name: 'Points',
  currency_icon: '⭐',
};

export function useDashboardData(): DashboardData {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [playerLoadTrigger, setPlayerLoadTrigger] = useState(0);
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<any | null>(null);
  const [homeStore, setHomeStore] = useState<DashboardStore | null>(null);
  const [selectedStore, setSelectedStore] = useState<DashboardStore | null>(null);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(DEFAULT_STORE_CONFIG);
  const [banners, setBanners] = useState<any[]>([]);
  const [passStatus, setPassStatus] = useState<DashboardPassStatus | null>(null);
  const [favoriteGameIds, setFavoriteGameIds] = useState<string[]>([]);
  const [gameStats, setGameStats] = useState<Record<string, any>>({});
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [storeUpdates, setStoreUpdates] = useState<any[]>([]);
  const [friendActivity, setFriendActivity] = useState<any[]>([]);
  const [prizeHighlights, setPrizeHighlights] = useState<any[]>([]);
  const spinningRef = useRef(false);
  const [spin, setSpin] = useState<DashboardSpinState>({
    hasSpunToday: false,
    isSpinning: false,
    message: null,
  });

  const selectStore = useCallback((store: DashboardStore) => {
    setSelectedStore(store);
    try {
      localStorage.setItem('ggc_selected_store_id', store.id);
      localStorage.setItem('ggc_selected_store_name', store.name);
    } catch {
      /* ignore */
    }
  }, []);

  // Load player + resolve home/selected store
  useEffect(() => {
    let cancelled = false;

    async function loadPlayer() {
      if (!isLoaded) return;

      if (user) {
        try {
          const response = await fetch('/api/player/by-clerk');
          if (response.status === 401) {
            if (!cancelled) router.replace('/onboarding');
            return;
          }
          const data = await response.json();

          if (cancelled) return;

          if (data.linked) {
            try {
              localStorage.setItem('hyperbolic_player_id', data.player_id);
              localStorage.setItem('hyperbolic_player_uuid', data.id);
            } catch { /* ignore */ }

            setPlayer(data);
            const homeStoreFromDb: DashboardStore | null = data.homeStore ?? null;
            setHomeStore(homeStoreFromDb);

            const savedStoreId = (() => { try { return localStorage.getItem('ggc_selected_store_id'); } catch { return null; } })();
            const savedStoreName = (() => { try { return localStorage.getItem('ggc_selected_store_name'); } catch { return null; } })();

            if (savedStoreId && savedStoreName) {
              try {
                const storesRes = await fetch('/api/stores');
                if (storesRes.ok) {
                  const storesData = await storesRes.json();
                  const activeStores: DashboardStore[] = storesData.stores || [];
                  const matched = activeStores.find((s) => s.id === savedStoreId);
                  if (matched) {
                    if (cancelled) return;
                    setSelectedStore(matched);
                    try { localStorage.setItem('ggc_selected_store_name', matched.name); } catch { /* ignore */ }
                  } else {
                    if (cancelled) return;
                    setSelectedStore(homeStoreFromDb);
                    if (homeStoreFromDb) {
                      try {
                        localStorage.setItem('ggc_selected_store_id', homeStoreFromDb.id);
                        localStorage.setItem('ggc_selected_store_name', homeStoreFromDb.name);
                      } catch { /* ignore */ }
                    } else {
                      try {
                        localStorage.removeItem('ggc_selected_store_id');
                        localStorage.removeItem('ggc_selected_store_name');
                      } catch { /* ignore */ }
                    }
                  }
                } else {
                  if (cancelled) return;
                  setSelectedStore(homeStoreFromDb);
                }
              } catch {
                if (cancelled) return;
                setSelectedStore(homeStoreFromDb);
              }
            } else if (homeStoreFromDb) {
              setSelectedStore(homeStoreFromDb);
              try {
                localStorage.setItem('ggc_selected_store_id', homeStoreFromDb.id);
                localStorage.setItem('ggc_selected_store_name', homeStoreFromDb.name);
              } catch { /* ignore */ }
            } else {
              setSelectedStore(null);
            }

            setLoading(false);
            return;
          } else {
            router.replace('/onboarding');
            return;
          }
        } catch (error) {
          console.error('Error loading player via Clerk:', error);
        }
      }

      // Fallback: localStorage player id
      let playerId: string | null = null;
      try { playerId = localStorage.getItem('hyperbolic_player_id'); } catch { /* ignore */ }

      if (!playerId) {
        router.replace(user ? '/onboarding' : '/sign-in');
        return;
      }

      try {
        const response = await fetch(`/api/player/${playerId}`);
        const data = await response.json();

        if (cancelled) return;

        if (response.ok && !data.error) {
          setPlayer(data);
        } else {
          try {
            localStorage.removeItem('hyperbolic_player_id');
            localStorage.removeItem('hyperbolic_player_uuid');
          } catch { /* ignore */ }
          router.replace(user ? '/onboarding' : '/sign-in');
        }
      } catch (error) {
        console.error('Error loading player:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPlayer();
    return () => { cancelled = true; };
  }, [isLoaded, user, router, playerLoadTrigger]);

  // Store config
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/store-config?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setStoreConfig({
              store_name: data.store_name ?? DEFAULT_STORE_CONFIG.store_name,
              currency_name: data.currency_name ?? DEFAULT_STORE_CONFIG.currency_name,
              currency_icon: data.currency_icon ?? DEFAULT_STORE_CONFIG.currency_icon,
            });
          }
        }
      } catch (error) {
        console.error('Error loading store config:', error);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Pass status
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch('/api/player/pass-status')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && !cancelled) setPassStatus(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  // Favorite games
  useEffect(() => {
    if (!isLoaded || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/player/favorite-games');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.favorites && data.favorites.length > 0) {
            setFavoriteGameIds(data.favorites);
          }
        }
      } catch (error) {
        console.error('Error loading favorite games:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [isLoaded, user]);

  // Daily spin status
  useEffect(() => {
    if (!player || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/xp/daily-spin');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setSpin(prev => ({ ...prev, hasSpunToday: !data.canSpin }));
          }
        }
      } catch (error) {
        console.error('Error loading spin status:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [player, user]);

  // Game stats
  useEffect(() => {
    if (!player || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/player/game-stats');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.success && data.stats) {
            const map: Record<string, any> = {};
            for (const stat of data.stats) {
              map[stat.gameId] = stat;
            }
            setGameStats(map);
          }
        }
      } catch (error) {
        console.error('Error loading game stats:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [player, user]);

  // Banners (store-scoped)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = selectedStore
          ? `/api/banners?store_id=${selectedStore.id}`
          : '/api/banners';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const transformed = (data.banners || []).map((b: any) => ({
            id: b.id,
            title: b.title,
            subtitle: b.subtitle || '',
            colorFrom: b.colorFrom || '#8b5cf6',
            colorTo: b.colorTo || '#ec4899',
            icon: b.icon || '🎮',
            badge: b.badge || '',
            hasStream: b.hasStream || false,
            twitchUrl: b.twitchUrl,
            youtubeUrl: b.youtubeUrl,
            backgroundImage: b.backgroundImage || b.background_image || null,
            bgSize: b.bgSize || 'cover',
            bgPosition: b.bgPosition || 'center',
            textColor: b.textColor || '#ffffff',
          }));
          if (!cancelled) setBanners(transformed);
        }
      } catch (error) {
        console.error('Error loading banners:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedStore?.id]);

  // Upcoming events (store-scoped) — wait for selectedStore; no localStorage fallback to avoid double fetch
  useEffect(() => {
    if (!selectedStore?.id) return;
    let cancelled = false;
    fetch(`/api/events?status=upcoming&limit=3&store_id=${selectedStore.id}`)
      .then(r => r.ok ? r.json() : { events: [] })
      .then(d => { if (!cancelled) setUpcomingEvents(d.events || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedStore?.id]);

  // Store updates (store-scoped) — wait for selectedStore; no localStorage fallback to avoid double fetch
  useEffect(() => {
    if (!selectedStore?.id) return;
    let cancelled = false;
    fetch(`/api/store-updates?store_id=${selectedStore.id}`)
      .then(r => r.ok ? r.json() : { updates: [] })
      .then(d => { if (!cancelled) setStoreUpdates(d.updates || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedStore?.id]);

  // Friend activity
  useEffect(() => {
    let cancelled = false;
    fetch('/api/friends-activity')
      .then(r => r.ok ? r.json() : { activity: [] })
      .then(d => { if (!cancelled) setFriendActivity(d.activity || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Prize highlights (store-scoped)
  useEffect(() => {
    if (!selectedStore?.id) return;
    let cancelled = false;
    fetch(`/api/prize-wall?storeId=${selectedStore.id}`)
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => { if (!cancelled) setPrizeHighlights((d.items || []).slice(0, 4)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedStore?.id]);

  const claimDailySpin = useCallback(async () => {
    if (spin.hasSpunToday || spin.isSpinning || spinningRef.current) return;
    spinningRef.current = true;
    setSpin(prev => ({ ...prev, isSpinning: true }));
    try {
      const res = await fetch('/api/xp/daily-spin', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSpin({ hasSpunToday: true, isSpinning: false, message: `+${data.prize.xp} XP — ${data.prize.label}` });
        setTimeout(() => setSpin(prev => ({ ...prev, message: null })), 3000);
        return;
      }
      setSpin(prev => ({ ...prev, isSpinning: false }));
    } catch {
      setSpin(prev => ({ ...prev, isSpinning: false }));
    } finally {
      spinningRef.current = false;
    }
  }, [spin.hasSpunToday, spin.isSpinning]);

  const refreshPlayer = useCallback(() => {
    setPlayerLoadTrigger(t => t + 1);
  }, []);

  const recentActivity = (player?.recentActivity || []) as any[];

  return {
    loading,
    player,
    homeStore,
    selectedStore,
    selectStore,
    refreshPlayer,
    storeConfig,
    banners,
    passStatus,
    favoriteGameIds,
    gameStats,
    upcomingEvents,
    storeUpdates,
    friendActivity,
    prizeHighlights,
    recentActivity,
    spin,
    claimDailySpin,
  };
}
