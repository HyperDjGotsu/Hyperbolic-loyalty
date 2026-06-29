'use client';

import { useState, useEffect } from 'react';

interface Store {
  id: string;
  name: string;
  city: string;
  state: string;
  player_id_prefix: string;
  color: string;
}

interface Org {
  id: string;
  name: string;
  slug: string;
}

interface Qualifier {
  id: string;
  placement: number;
  has_bye: boolean;
  qualified_at: string;
  store_id: string;
  players: { id: string; display_name: string; player_id: string } | null;
  stores: { id: string; name: string; city: string; color: string; player_id_prefix: string } | null;
  events: { id: string; name: string; scheduled_at: string } | null;
}

const PLACEMENT_LABELS: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th' };

function PlacementBadge({ n }: { n: number }) {
  const colors: Record<number, string> = {
    1: '#FACC15', 2: '#C0C0C0', 3: '#CD7F32',
  };
  return (
    <span
      className="text-xs font-bold w-8 text-center flex-shrink-0"
      style={{ color: colors[n] || 'var(--text-tertiary)' }}
    >
      {PLACEMENT_LABELS[n] || `#${n}`}
    </span>
  );
}

function StoreTag({ store, qualifier }: { store: Store | null | undefined; qualifier: Qualifier }) {
  const s = store || qualifier.stores;
  if (!s) return null;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
      style={{ background: `${s.color}20`, color: s.color }}
    >
      {s.player_id_prefix}
    </span>
  );
}

export default function CircuitPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [qualifiers, setQualifiers] = useState<Qualifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'roster' | 'bystore'>('roster');

  useEffect(() => {
    async function load() {
      try {
        const [storesRes, qualsRes] = await Promise.all([
          fetch('/api/circuit/stores?org=ggc'),
          fetch('/api/circuit/qualifiers'),
        ]);
        const storesData = await storesRes.json();
        const qualsData = await qualsRes.json();
        setOrg(storesData.org || null);
        setStores(storesData.stores || []);
        setQualifiers(qualsData.qualifiers || []);
      } catch (e) {
        console.error('Circuit load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const storeMap = Object.fromEntries(stores.map(s => [s.id, s]));
  const totalQualified = qualifiers.length;
  const storesRepresented = new Set(qualifiers.map(q => q.store_id)).size;

  return (
    <div className="min-h-screen bg-base text-primary" style={{ fontFamily: 'var(--font-sans)' }}>

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border-token">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(196,181,253,0.07) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-4xl mx-auto px-5 py-12 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-5"
            style={{ border: '1px solid rgba(196,181,253,0.3)', background: 'rgba(196,181,253,0.08)', color: '#c4b5fd' }}
          >
            Gamers Guild Corp · Riftbound Circuit
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-primary mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            GGC Cup
          </h1>
          <p className="text-secondary text-base max-w-lg mx-auto mb-6">
            Championship finals at <span className="text-primary font-medium">Trade Emporium · Pittsburg, CA</span>
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{totalQualified}</div>
              <div className="text-xs text-tertiary uppercase tracking-wide">Qualified</div>
            </div>
            <div className="w-px h-8 bg-border-token" />
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{storesRepresented} <span className="text-sm text-tertiary font-normal">of 5</span></div>
              <div className="text-xs text-tertiary uppercase tracking-wide">Stores In</div>
            </div>
            <div className="w-px h-8 bg-border-token" />
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{qualifiers.filter(q => q.has_bye).length}</div>
              <div className="text-xs text-tertiary uppercase tracking-wide">R1 Byes</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 py-8">

        {/* View toggle */}
        <div className="flex gap-2 mb-6">
          {(['roster', 'bystore'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={view === v
                ? { background: 'var(--accent)', color: 'var(--accent-fg)' }
                : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-token)' }
              }
            >
              {v === 'roster' ? 'Full Roster' : 'By Store'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-24 text-tertiary">Loading…</div>
        ) : qualifiers.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border border-dashed border-border-token p-16 text-center">
            <div className="text-4xl mb-4">🏆</div>
            <div className="font-semibold text-primary mb-2">Qualifiers not yet announced</div>
            <p className="text-sm text-tertiary max-w-sm mx-auto">
              Store qualifier events are coming. Top finishers from each location will appear here with their Round 1 bye status.
            </p>
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
              {stores.map(s => (
                <div key={s.id} className="rounded-xl border border-border-token p-3 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <div>
                    <div className="text-xs font-medium text-primary">{s.name}</div>
                    <div className="text-xs text-tertiary">{s.city}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : view === 'roster' ? (
          /* Full roster — all qualifiers, sorted by store then placement */
          <div className="rounded-2xl border border-border-token overflow-hidden">
            <div className="px-5 py-3 border-b border-border-token bg-elevated flex items-center justify-between">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wide">Championship Roster</span>
              <span className="text-xs text-tertiary">{totalQualified} players · R1 Bye = qualified via store event</span>
            </div>
            {qualifiers
              .slice()
              .sort((a, b) => {
                const sa = storeMap[a.store_id]?.name || '';
                const sb = storeMap[b.store_id]?.name || '';
                return sa.localeCompare(sb) || a.placement - b.placement;
              })
              .map((q, i) => {
                const store = storeMap[q.store_id];
                return (
                  <div
                    key={q.id}
                    className="flex items-center gap-3 px-5 py-3 border-b border-border-token last:border-0 hover:bg-elevated transition-colors"
                  >
                    <PlacementBadge n={q.placement} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-primary truncate">
                        {q.players?.display_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-tertiary font-mono">{q.players?.player_id}</div>
                    </div>
                    <StoreTag store={store} qualifier={q} />
                    {q.has_bye && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-500/10 text-green-400 flex-shrink-0">
                        R1 Bye
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          /* By store */
          <div className="space-y-5">
            {stores.map(store => {
              const storeQuals = qualifiers
                .filter(q => q.store_id === store.id)
                .sort((a, b) => a.placement - b.placement);

              return (
                <div key={store.id} className="rounded-2xl border border-border-token overflow-hidden">
                  <div className="px-5 py-3 border-b border-border-token bg-elevated flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: store.color }} />
                    <div>
                      <span className="font-semibold text-primary text-sm">{store.name}</span>
                      <span className="text-xs text-tertiary ml-2">{store.city}, {store.state}</span>
                    </div>
                    <span className="ml-auto text-xs text-tertiary">
                      {storeQuals.length} qualifier{storeQuals.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {storeQuals.length === 0 ? (
                    <div className="px-5 py-6 text-sm text-tertiary text-center">
                      Qualifier event pending
                    </div>
                  ) : (
                    storeQuals.map((q, i) => (
                      <div
                        key={q.id}
                        className="flex items-center gap-3 px-5 py-3 border-b border-border-token last:border-0"
                      >
                        <PlacementBadge n={q.placement} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-primary truncate">
                            {q.players?.display_name || 'Unknown'}
                          </div>
                          <div className="text-xs text-tertiary font-mono">{q.players?.player_id}</div>
                        </div>
                        {q.has_bye && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-500/10 text-green-400">
                            R1 Bye
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-border-token text-center">
          <p className="text-xs text-tertiary">
            Gamers Guild Corp · Riftbound Circuit 2026 · Championship at Trade Emporium, Pittsburg CA
          </p>
        </div>
      </div>
    </div>
  );
}
