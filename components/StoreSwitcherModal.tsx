'use client';

import { useState, useEffect } from 'react';

interface Store {
  id: string;
  name: string;
  city: string;
  slug: string;
  is_flagship: boolean;
  color: string | null;
}

interface Props {
  currentStoreId: string | null;   // currently selected (browsing context)
  homeStoreId: string | null;      // DB-persisted home store (display only)
  onSwitch: (store: Store) => void;
  onClose: () => void;
  required?: boolean; // true during null-home-store onboarding: backdrop does not dismiss
}

export function StoreSwitcherModal({
  currentStoreId,
  homeStoreId,
  onSwitch,
  onClose,
  required = false,
}: Props) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/stores')
      .then(r => r.json())
      .then(data => setStores(data.stores || data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSelect(store: Store) {
    if (store.id === currentStoreId || saving) return;

    if (required) {
      // Null-home-store onboarding path: persist to DB
      setSaving(true);
      try {
        const res = await fetch('/api/player/home-store', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ store_id: store.id }),
        });
        if (res.ok) onSwitch(store);
      } catch {
        // stay open on error
      } finally {
        setSaving(false);
      }
    } else {
      // Normal browsing-context switch — no DB write
      onSwitch(store);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={required ? undefined : onClose}
    >
      <div
        className="w-full max-w-lg bg-gray-900 rounded-t-2xl border-t border-gray-700 p-4 pb-8 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {!required && <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />}
        <h2 className="text-white font-bold text-lg mb-1">
          {required ? 'Choose Your Home Store' : 'Browse a Store'}
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          {required
            ? 'Pick the store you play at most. This sets your local notifications and default dashboard.'
            : "Switch which store's events, leaderboard, and prizes you're viewing. Your home store is not changed."}
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {stores.map(store => {
              const isCurrent = store.id === currentStoreId;
              const isHome = store.id === homeStoreId;
              return (
                <button
                  key={store.id}
                  onClick={() => handleSelect(store)}
                  disabled={isCurrent || saving}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                    isCurrent
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: store.color ?? '#7c3aed' }}
                    />
                    <div>
                      <div className="text-white font-medium text-sm">{store.name}</div>
                      <div className="text-gray-400 text-xs">{store.city}</div>
                    </div>
                    {store.is_flagship && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded">
                        Flagship
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isHome && !isCurrent && (
                      <span className="text-gray-500 text-xs">Home</span>
                    )}
                    {isCurrent && (
                      <span className="text-purple-400 text-xs font-semibold">
                        {required ? 'Selected' : 'Viewing'}
                      </span>
                    )}
                    {saving && store.id === currentStoreId && (
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
