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
  dismissible?: boolean; // with required: also allow closing (used when changing or verifying an existing home store)
}

export function StoreSwitcherModal({
  currentStoreId,
  homeStoreId,
  onSwitch,
  onClose,
  required = false,
  dismissible = false,
}: Props) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Required (home store) path: the player must prove they belong to the store with its join code
  const [pending, setPending] = useState<Store | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

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
      // Home store needs the store's join code; ask for it before saving
      setPending(store);
      setCode('');
      setError('');
    } else {
      // Normal browsing-context switch — no DB write
      onSwitch(store);
    }
  }

  async function submitCode() {
    if (!pending || saving) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/player/home-store', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: pending.id, code }),
      });
      if (res.ok) {
        onSwitch(pending);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'That code did not work. Check it with the store.');
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={required && !dismissible ? undefined : onClose}
    >
      <div
        className="w-full max-w-lg bg-gray-900 rounded-t-2xl border-t border-gray-700 p-4 pb-8 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {(!required || dismissible) && <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />}
        <h2 className="text-white font-bold text-lg mb-1">
          {required ? 'Choose Your Home Store' : 'Browse a Store'}
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          {required
            ? 'Pick the store you play at most. This sets your local notifications and default dashboard.'
            : "Switch which store's events, leaderboard, and prizes you're viewing. Your home store is not changed."}
        </p>

        {required && pending ? (
          <div className="space-y-3">
            <div className="text-white font-medium text-sm">{pending.name}</div>
            <p className="text-gray-400 text-xs">
              Enter the join code from the store's QR sign or ask a staff member. You can also scan the QR code with your phone camera.
            </p>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={12}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="JOIN CODE"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-3 text-white text-center tracking-widest text-lg"
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setPending(null); setError(''); }}
                disabled={saving}
                className="flex-1 py-3 rounded-lg border border-gray-600 text-gray-300 text-sm"
              >
                Back
              </button>
              <button
                onClick={submitCode}
                disabled={saving || code.trim().length < 6}
                className="flex-1 py-3 rounded-lg bg-accent text-accent-fg text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Checking…' : 'Join store'}
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
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
                      ? 'border-accent bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: store.color ?? '#3ddc6a' }}
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
                      <span className="text-accent text-xs font-semibold">
                        {required ? 'Selected' : 'Viewing'}
                      </span>
                    )}
                    {saving && store.id === currentStoreId && (
                      <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </button>
              );
            })}
            {required && dismissible && (
              <button
                onClick={onClose}
                className="w-full mt-2 py-3 rounded-lg border border-gray-600 text-gray-300 text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
