'use client';

import { useCallback, useEffect, useState } from 'react';

interface TitleInfo { key: string; label: string; xp: number; blurb: string; count: number }
interface Grant { titleKey: string; grantedAt: string; playerName: string; playerId: string }
interface Settings { autoFounding: boolean; foundingCap: number }

// Network admins only: hand out or take back titles, and control the automatic Founding Member window.
export default function TitlesCard() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [titles, setTitles] = useState<TitleInfo[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [playerId, setPlayerId] = useState('');
  const [titleKey, setTitleKey] = useState('beta_tester');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/hq/titles', { cache: 'no-store' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not load titles');
      setSettings(d.settings);
      setTitles(d.titles ?? []);
      setGrants(d.grants ?? []);
      setTitleKey(k => (d.titles ?? []).some((t: TitleInfo) => t.key === k) ? k : (d.titles?.[0]?.key ?? k));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not load titles' });
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const act = async (action: 'grant' | 'revoke') => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/hq/titles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, playerId, titleKey }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Something went wrong');
      const label = titles.find(t => t.key === titleKey)?.label ?? titleKey;
      setMsg({
        ok: true,
        text: action === 'revoke'
          ? `Removed ${label} from ${d.playerName}.`
          : d.granted ? `${d.playerName} now has the ${label} title.` : `${d.playerName} already has ${label}.`,
      });
      setPlayerId('');
      await load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Something went wrong' });
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/hq/titles', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not save');
      setSettings(d.settings);
      setMsg({ ok: true, text: 'Saved.' });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not save' });
    } finally {
      setBusy(false);
    }
  };

  const labelOf = (key: string) => titles.find(t => t.key === key)?.label ?? key;
  const founding = titles.find(t => t.key === 'founding_member');

  return (
    <div className="bg-surface rounded-xl p-5 border border-yellow-500/30 space-y-4">
      <div>
        <h3 className="font-semibold text-primary">🏅 Titles</h3>
        <p className="text-xs text-secondary mt-1">
          Network admins only. A title shows on the player&apos;s profile, on leaderboards and at the kiosk, and gives a one-time XP bonus the first time it is awarded.
        </p>
      </div>

      {settings && (
        <div className="space-y-3 rounded-lg bg-elevated/50 p-3">
          <label className="flex items-start gap-2 text-sm text-primary">
            <input type="checkbox" className="mt-1" checked={settings.autoFounding} onChange={e => setSettings({ ...settings, autoFounding: e.target.checked })} />
            <span>Give <b>Founding Member</b> automatically to each new player when they get verified for a store, until the limit below.</span>
          </label>
          <label className="block text-sm text-primary">
            Stop after this many Founding Members
            <input
              type="number" min={0} max={100000} inputMode="numeric" value={settings.foundingCap}
              onChange={e => setSettings({ ...settings, foundingCap: Number(e.target.value) })}
              className="mt-1 w-full bg-elevated border border-border-token rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {founding && <span className="text-xs text-tertiary">{founding.count} so far.</span>}
          </label>
          <div className="flex justify-end">
            <button onClick={saveSettings} disabled={busy} className="px-4 py-2 bg-accent text-accent-fg rounded-lg text-sm font-semibold disabled:opacity-50">Save</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-sm font-semibold text-primary">Give or remove a title</div>
        <input
          value={playerId}
          onChange={e => setPlayerId(e.target.value)}
          placeholder="Player ID, like GGOB-ABC123"
          className="w-full bg-elevated border border-border-token rounded-lg px-3 py-2 text-sm text-primary font-mono focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <select value={titleKey} onChange={e => setTitleKey(e.target.value)} className="w-full bg-elevated border border-border-token rounded-lg px-3 py-2 text-sm text-primary">
          {titles.map(t => <option key={t.key} value={t.key}>{t.label}{t.xp > 0 ? ` (+${t.xp} XP)` : ''}</option>)}
        </select>
        <div className="flex gap-2">
          <button onClick={() => act('grant')} disabled={busy || playerId.trim().length < 5} className="flex-1 px-4 py-2 bg-accent text-accent-fg rounded-lg text-sm font-semibold disabled:opacity-50">Give title</button>
          <button
            onClick={() => { if (confirm('Remove this title? Any XP bonus already paid stays.')) void act('revoke'); }}
            disabled={busy || playerId.trim().length < 5}
            className="flex-1 px-4 py-2 border border-border-token text-secondary rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            Remove title
          </button>
        </div>
        {msg && <p className={`text-sm ${msg.ok ? 'text-success' : 'text-danger'}`}>{msg.text}</p>}
      </div>

      {titles.length > 0 && (
        <div className="text-xs text-secondary">{titles.map(t => `${t.label}: ${t.count}`).join(' · ')}</div>
      )}

      {grants.length > 0 && (
        <div className="space-y-1">
          <div className="text-sm font-semibold text-primary">Latest</div>
          {grants.slice(0, 10).map((g, i) => (
            <div key={i} className="flex justify-between gap-2 text-xs text-secondary">
              <span className="truncate">{g.playerName} <span className="font-mono text-tertiary">{g.playerId}</span></span>
              <span className="whitespace-nowrap">{labelOf(g.titleKey)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
