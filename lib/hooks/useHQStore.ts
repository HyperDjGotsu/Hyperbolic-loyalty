'use client';

import { useState, useEffect } from 'react';

export type StaffStore = {
  id: string;
  name: string;
  role: string;
};

export type UseHQStoreReturn = {
  activeStore: StaffStore | null;
  activeStoreId: string | null;
  setActiveStoreId: (storeId: string) => void;
  availableStores: StaffStore[];
  canSwitchStores: boolean;
  isInitialized: boolean;
};

type StaffContextInput = {
  stores: StaffStore[];
  primaryStoreId: string | null;
  isNetworkAdmin: boolean;
} | null;

const STORAGE_KEY = 'ggc_hq_selected_store_id';

export function useHQStore(staffContext: StaffContextInput): UseHQStoreReturn {
  const [activeStoreId, setActiveStoreIdState] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const availableStores = staffContext?.stores ?? [];
  const activeStore = availableStores.find(s => s.id === activeStoreId) ?? null;

  useEffect(() => {
    if (!staffContext) {
      setActiveStoreIdState(null);
      setIsInitialized(false);
      return;
    }

    const stores = staffContext.stores;

    if (stores.length === 0) {
      setActiveStoreIdState(null);
      setIsInitialized(true);
      return;
    }

    const saved = typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null;
    const isValid = saved !== null && stores.some(s => s.id === saved);

    if (saved !== null && !isValid) {
      localStorage.removeItem(STORAGE_KEY);
    }

    let resolved: string;
    if (isValid && saved) {
      resolved = saved;
    } else if (stores.length === 1) {
      resolved = stores[0].id;
    } else {
      resolved = staffContext.primaryStoreId ?? stores[0].id;
    }

    setActiveStoreIdState(resolved);
    setIsInitialized(true);
  }, [staffContext]);

  function setActiveStoreId(id: string): void {
    if (!availableStores.some(s => s.id === id)) return;
    setActiveStoreIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }

  return {
    activeStore,
    activeStoreId,
    setActiveStoreId,
    availableStores,
    canSwitchStores: availableStores.length > 1,
    isInitialized,
  };
}
