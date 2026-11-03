import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/config';

// Store branding from /api/store-config (public). Currency and store names must never be hardcoded.
export type StoreConfig = { currency_name: string; currency_icon: string; store_name: string };
const DEFAULTS: StoreConfig = { currency_name: 'Points', currency_icon: '💎', store_name: 'Player Pass' };
let cache: StoreConfig | null = null;

export function useStoreConfig(): StoreConfig {
  const [cfg, setCfg] = useState<StoreConfig>(cache ?? DEFAULTS);
  useEffect(() => {
    if (cache) return;
    fetch(`${API_BASE}/api/store-config`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) { const next = { ...DEFAULTS, ...d }; cache = next; setCfg(next); } })
      .catch(() => {});
  }, []);
  return cfg;
}
