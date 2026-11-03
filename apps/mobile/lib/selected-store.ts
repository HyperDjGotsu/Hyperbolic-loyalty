import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

// The store a player is browsing, shared by every tab (the website keeps this in localStorage as ggc_selected_store_id).
// Null means "use the home store".
const KEY = 'pp_selected_store_id';
let current: string | null = null;
let loaded = false;
const listeners = new Set<(id: string | null) => void>();

async function load() {
  if (loaded) return;
  loaded = true;
  try { current = await SecureStore.getItemAsync(KEY); } catch { current = null; }
  listeners.forEach(l => l(current));
}

export async function setSelectedStoreId(id: string | null) {
  current = id;
  listeners.forEach(l => l(id));
  try {
    if (id) await SecureStore.setItemAsync(KEY, id); else await SecureStore.deleteItemAsync(KEY);
  } catch { /* in-memory choice still applies */ }
}

export function useSelectedStoreId(): [string | null, (id: string | null) => void] {
  const [id, setId] = useState<string | null>(current);
  useEffect(() => {
    listeners.add(setId);
    void load().then(() => setId(current));
    return () => { listeners.delete(setId); };
  }, []);
  const set = useCallback((next: string | null) => { void setSelectedStoreId(next); }, []);
  return [id, set];
}
