'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDefaultConfig, type PitchConfig, type StoreConfig, type LeaderboardEntry } from '../configs';
import { PITCH_STORAGE_KEY } from '../PitchContent';

/* ── helpers ── */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-secondary uppercase tracking-wide mb-1">{label}</label>
      {hint && <p className="text-xs text-tertiary mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl px-3 py-2.5 text-sm text-primary border border-border-token bg-input outline-none focus:border-accent transition-colors"
      style={mono ? { fontFamily: 'monospace' } : {}}
    />
  );
}

function Textarea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      className="w-full rounded-xl px-3 py-2.5 text-sm text-primary border border-border-token bg-input outline-none focus:border-accent transition-colors resize-none"
    />
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => { const n = parseInt(e.target.value); if (!isNaN(n)) onChange(n); }}
      className="w-full rounded-xl px-3 py-2.5 text-sm text-primary border border-border-token bg-input outline-none focus:border-accent transition-colors"
    />
  );
}

function CardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border-token bg-elevated mb-6">
      <div className="px-5 py-4 border-b border-border-token">
        <h3 className="font-semibold text-primary text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const STORE_COLORS = ['#c4b5fd', '#60a5fa', '#34d399', '#fb923c', '#f472b6', '#facc15', '#a78bfa', '#38bdf8'];

export default function PitchEditPage() {
  const [cfg, setCfg] = useState<PitchConfig>(getDefaultConfig());
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PITCH_STORAGE_KEY);
      if (stored) setCfg(JSON.parse(stored));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  const save = useCallback((next: PitchConfig) => {
    localStorage.setItem(PITCH_STORAGE_KEY, JSON.stringify(next));
    setCfg(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const update = useCallback((patch: Partial<PitchConfig>) => {
    setCfg(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(PITCH_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateStore = useCallback((idx: number, patch: Partial<StoreConfig>) => {
    setCfg(prev => {
      const stores = prev.stores.map((s, i) => i === idx ? { ...s, ...patch } : s);
      const next = { ...prev, stores };
      localStorage.setItem(PITCH_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const addStore = () => {
    const newStore: StoreConfig = {
      id: `store_${Date.now()}`,
      name: 'New Store',
      city: 'City',
      state: 'CA',
      prefix: 'NEW',
      color: STORE_COLORS[cfg.stores.length % STORE_COLORS.length],
      players: 50,
      weekCheckins: 15,
      topPlayer: { name: 'Player', xp: 1000 },
      events: 2,
      redemptions: 5,
    };
    update({ stores: [...cfg.stores, newStore] });
  };

  const removeStore = (idx: number) => {
    if (cfg.stores.length <= 1) return;
    update({ stores: cfg.stores.filter((_, i) => i !== idx) });
  };

  const updateLeaderboard = (idx: number, patch: Partial<LeaderboardEntry>) => {
    const leaderboard = cfg.leaderboard.map((e, i) => i === idx ? { ...e, ...patch } : e);
    update({ leaderboard });
  };

  const resetToDefaults = () => {
    const defaults = getDefaultConfig();
    localStorage.removeItem(PITCH_STORAGE_KEY);
    setCfg(defaults);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!loaded) return null;

  return (
    <div className="min-h-screen bg-base text-primary" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-border-token bg-surface">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="font-bold text-primary text-sm">Pitch Editor</div>
            <div className="text-xs text-tertiary">Changes auto-save and show instantly on /pitch</div>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-green-400 font-medium">✓ Saved</span>
            )}
            <button
              onClick={resetToDefaults}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-tertiary border border-border-token hover:text-secondary hover:bg-elevated transition-colors"
            >
              Reset to defaults
            </button>
            <a
              href="/pitch"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              Preview pitch ↗
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-8">

        {/* ── Badge / Label ── */}
        <CardSection title="Badge & Identity">
          <Field label="Badge label" hint="Shows at top of hero section (e.g. 'Gamers Guild Corp · Private Demo')">
            <Input value={cfg.label} onChange={v => update({ label: v })} placeholder="Client Name · Private Demo" />
          </Field>
          <Field label="Company name" hint="Used in leaderboard header and company overview section">
            <Input value={cfg.companyName} onChange={v => update({ companyName: v })} />
          </Field>
        </CardSection>

        {/* ── Hero copy ── */}
        <CardSection title="Hero Section">
          <Field label="Main headline">
            <Textarea value={cfg.heroHeadline} onChange={v => update({ heroHeadline: v })} rows={2} />
          </Field>
          <Field label="Subheadline">
            <Textarea value={cfg.heroSub} onChange={v => update({ heroSub: v })} rows={3} />
          </Field>
          <Field label="Tagline" hint="Small text below the subheadline">
            <Input value={cfg.heroTagline} onChange={v => update({ heroTagline: v })} />
          </Field>
        </CardSection>

        {/* ── HQ mock ── */}
        <CardSection title="HQ Mock (Staff Tools section)">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Store name shown in HQ">
              <Input value={cfg.hqStoreName} onChange={v => update({ hqStoreName: v })} />
            </Field>
            <Field label="City, State">
              <Input value={cfg.hqCity} onChange={v => update({ hqCity: v })} placeholder="Pittsburg, CA" />
            </Field>
            <Field label="Player ID prefix" hint="2–5 uppercase letters">
              <Input
                value={cfg.hqPrefix}
                onChange={v => update({ hqPrefix: v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) })}
                mono
                placeholder="TEM"
              />
            </Field>
            <Field label="Accent color" hint="Hex color for this store">
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={cfg.hqColor}
                  onChange={e => update({ hqColor: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-border-token bg-input"
                />
                <Input value={cfg.hqColor} onChange={v => update({ hqColor: v })} mono />
              </div>
            </Field>
          </div>
        </CardSection>

        {/* ── Stores ── */}
        <CardSection title={`Stores (${cfg.stores.length})`}>
          <div className="space-y-4">
            {cfg.stores.map((store, idx) => (
              <div key={store.id} className="rounded-xl border border-border-token p-4 bg-base">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: store.color }} />
                    <span className="font-semibold text-sm text-primary">{store.name || 'Unnamed store'}</span>
                    <span className="text-xs text-tertiary font-mono">{store.prefix}</span>
                  </div>
                  <button
                    onClick={() => removeStore(idx)}
                    className="text-xs text-tertiary hover:text-red-400 transition-colors"
                    disabled={cfg.stores.length <= 1}
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Store name">
                    <Input value={store.name} onChange={v => updateStore(idx, { name: v })} />
                  </Field>
                  <Field label="City">
                    <Input value={store.city} onChange={v => updateStore(idx, { city: v })} />
                  </Field>
                  <Field label="State">
                    <Input value={store.state} onChange={v => updateStore(idx, { state: v })} />
                  </Field>
                  <Field label="ID Prefix (2–5 letters)">
                    <Input
                      value={store.prefix}
                      onChange={v => updateStore(idx, { prefix: v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) })}
                      mono
                    />
                  </Field>
                  <Field label="Active players">
                    <NumberInput value={store.players} onChange={v => updateStore(idx, { players: v })} />
                  </Field>
                  <Field label="Check-ins this week">
                    <NumberInput value={store.weekCheckins} onChange={v => updateStore(idx, { weekCheckins: v })} />
                  </Field>
                  <Field label="Events running">
                    <NumberInput value={store.events} onChange={v => updateStore(idx, { events: v })} />
                  </Field>
                  <Field label="Prize redemptions">
                    <NumberInput value={store.redemptions} onChange={v => updateStore(idx, { redemptions: v })} />
                  </Field>
                  <Field label="Top player name">
                    <Input value={store.topPlayer.name} onChange={v => updateStore(idx, { topPlayer: { ...store.topPlayer, name: v } })} />
                  </Field>
                  <Field label="Top player XP">
                    <NumberInput value={store.topPlayer.xp} onChange={v => updateStore(idx, { topPlayer: { ...store.topPlayer, xp: v } })} />
                  </Field>
                  <Field label="Color">
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={store.color}
                        onChange={e => updateStore(idx, { color: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-border-token bg-input"
                      />
                      <Input value={store.color} onChange={v => updateStore(idx, { color: v })} mono />
                    </div>
                  </Field>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addStore}
            className="mt-4 w-full py-3 rounded-xl border border-dashed border-border-token text-sm text-tertiary hover:text-secondary hover:border-accent/40 transition-colors"
          >
            + Add store
          </button>
        </CardSection>

        {/* ── Company leaderboard ── */}
        <CardSection title="Company Leaderboard (top 5)">
          <div className="space-y-3">
            {cfg.leaderboard.map((entry, idx) => (
              <div key={idx} className="grid grid-cols-[40px_1fr_1fr_120px_40px] gap-2 items-center">
                <div className="text-xs font-bold text-tertiary text-center">#{idx + 1}</div>
                <Input value={entry.name} onChange={v => updateLeaderboard(idx, { name: v })} placeholder="Player name" />
                <Input value={entry.store} onChange={v => updateLeaderboard(idx, { store: v })} placeholder="Store name" />
                <NumberInput value={entry.xp} onChange={v => updateLeaderboard(idx, { xp: v })} />
                <input
                  type="color"
                  value={entry.color}
                  onChange={e => updateLeaderboard(idx, { color: e.target.value })}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-border-token bg-input"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-tertiary mt-3">Color should match the player&apos;s home store color.</p>
        </CardSection>

        {/* ── CTA ── */}
        <CardSection title="CTA Section (bottom)">
          <Field label="Headline">
            <Input value={cfg.ctaHeadline} onChange={v => update({ ctaHeadline: v })} />
          </Field>
          <Field label="Body text">
            <Textarea value={cfg.ctaBody} onChange={v => update({ ctaBody: v })} rows={3} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Primary button label">
              <Input value={cfg.ctaPrimaryLabel} onChange={v => update({ ctaPrimaryLabel: v })} />
            </Field>
            <Field label="Primary button URL">
              <Input value={cfg.ctaPrimaryHref} onChange={v => update({ ctaPrimaryHref: v })} mono />
            </Field>
            <Field label="Secondary button label">
              <Input value={cfg.ctaSecondaryLabel} onChange={v => update({ ctaSecondaryLabel: v })} />
            </Field>
            <Field label="Secondary button URL">
              <Input value={cfg.ctaSecondaryHref} onChange={v => update({ ctaSecondaryHref: v })} mono />
            </Field>
          </div>
          <Field label="Byline" hint="Small text at the very bottom">
            <Input value={cfg.ctaByline} onChange={v => update({ ctaByline: v })} />
          </Field>
        </CardSection>

        {/* ── Save button ── */}
        <div className="flex items-center gap-3 pt-2 pb-16">
          <button
            onClick={() => save(cfg)}
            className="flex-1 py-4 rounded-xl font-bold text-base transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            {saved ? '✓ Saved!' : 'Save & preview'}
          </button>
          <a
            href="/pitch"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-4 rounded-xl font-bold text-sm transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#f2efe8', border: '1px solid rgba(255,255,255,0.18)' }}
          >
            Open pitch ↗
          </a>
        </div>
      </div>
    </div>
  );
}
