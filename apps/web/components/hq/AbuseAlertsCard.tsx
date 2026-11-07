'use client';

import { useCallback, useEffect, useState } from 'react';

interface Settings { referralsPer24h: number; signupsPerHour: number; verifiedPerStorePer24h: number; xpPerPlayerPer24h: number }
interface Alert { rule: keyof Settings; title: string; detail: string; count: number; threshold: number }

const FIELDS: { key: keyof Settings; label: string; hint: string }[] = [
  { key: 'referralsPer24h', label: 'Referral sign-ups per referrer, 24 hours', hint: 'Alert when one player is credited with this many sign-ups.' },
  { key: 'signupsPerHour', label: 'New accounts per hour (whole network)', hint: 'Alert on a sudden burst of sign-ups.' },
  { key: 'verifiedPerStorePer24h', label: 'Players verified per store, 24 hours', hint: 'A leaked join code shows up here. Change the store code if it is not expected.' },
  { key: 'xpPerPlayerPer24h', label: 'XP earned by one player, 24 hours', hint: 'Alert when one player earns more than this in a day.' },
];

// Network admins only: shows anything that trips a misuse threshold and lets them change the thresholds.
export default function AbuseAlertsCard() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [checkedAt, setCheckedAt] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/hq/abuse-alerts', { cache: 'no-store' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not load');
      setSettings(d.settings);
      setAlerts(d.alerts ?? []);
      setCheckedAt(d.checkedAt ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load alerts');
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!settings) return;
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/hq/abuse-alerts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not save');
      setSettings(d.settings);
      setSaved(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface rounded-xl p-5 border border-yellow-500/30 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-primary">🚨 Misuse alerts</h3>
          <p className="text-xs text-secondary mt-1">Network admins only. Checked when you open this page, not in the background. Set the numbers below; anything over them shows here.</p>
        </div>
        <button onClick={load} disabled={busy} className="px-3 py-1.5 bg-elevated text-secondary rounded-lg text-xs disabled:opacity-50">Recheck</button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {alerts.length === 0 && !error && settings && (
        <p className="text-sm text-secondary">Nothing unusual right now.{checkedAt ? ` Checked ${new Date(checkedAt).toLocaleTimeString()}.` : ''}</p>
      )}
      {alerts.map((a, i) => (
        <div key={i} className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
          <div className="text-sm font-semibold text-primary">{a.title}</div>
          <div className="text-sm text-secondary mt-0.5">{a.detail}</div>
          <div className="text-xs text-tertiary mt-1">Limit is {a.threshold}.</div>
        </div>
      ))}

      {settings && (
        <div className="space-y-3 pt-1">
          {FIELDS.map(f => (
            <label key={f.key} className="block">
              <span className="text-sm text-primary">{f.label}</span>
              <input
                type="number" min={1} max={100000} inputMode="numeric"
                value={settings[f.key]}
                onChange={e => { setSaved(false); setSettings(s => (s ? { ...s, [f.key]: Number(e.target.value) } : s)); }}
                className="mt-1 w-full bg-elevated border border-border-token rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <span className="text-xs text-tertiary">{f.hint}</span>
            </label>
          ))}
          <div className="flex items-center justify-end gap-3">
            {saved && <span className="text-xs text-success">Saved</span>}
            <button onClick={save} disabled={busy} className="px-4 py-2 bg-accent text-accent-fg rounded-lg text-sm font-semibold disabled:opacity-50">Save limits</button>
          </div>
        </div>
      )}
    </div>
  );
}
