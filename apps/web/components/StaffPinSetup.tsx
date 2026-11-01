'use client';

import { useEffect, useState } from 'react';

// First HQ visit: staff pick a 4-6 digit PIN. It is asked for when leaving kiosk mode.
export default function StaffPinSetup() {
  const [needsPin, setNeedsPin] = useState(false);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/hq/pin', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && d.hasPin === false) setNeedsPin(true); })
      .catch(() => {});
  }, []);

  if (!needsPin) return null;

  const save = async () => {
    setError('');
    if (!/^\d{4,6}$/.test(pin)) { setError('Use 4 to 6 digits.'); return; }
    if (pin !== confirm) { setError('The two PINs do not match.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/hq/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', pin }),
      });
      if (res.ok || res.status === 409) setNeedsPin(false);
      else setError('Could not save your PIN. Try again.');
    } catch { setError('Could not save your PIN. Try again.'); } finally { setSaving(false); }
  };

  const field = 'w-full px-4 py-3 rounded-xl bg-elevated border border-border-token text-primary text-center text-2xl tracking-[0.4em] outline-none focus:border-accent';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
      <div className="bg-surface border border-border-token rounded-2xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold text-primary mb-1">Set your staff PIN</h2>
        <p className="text-sm text-secondary mb-4">
          You will enter this PIN to leave the check-in kiosk. Pick 4 to 6 digits and don&apos;t share it.
        </p>
        <div className="space-y-3">
          <input inputMode="numeric" type="password" autoComplete="off" maxLength={6} placeholder="PIN"
            value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} className={field} />
          <input inputMode="numeric" type="password" autoComplete="off" maxLength={6} placeholder="Confirm PIN"
            value={confirm} onChange={e => setConfirm(e.target.value.replace(/\D/g, ''))} className={field} />
        </div>
        {error && <p className="text-danger text-sm mt-3">{error}</p>}
        <button onClick={save} disabled={saving}
          className="w-full mt-4 py-3 rounded-xl bg-accent text-white font-bold disabled:opacity-50">
          {saving ? 'Saving…' : 'Save PIN'}
        </button>
      </div>
    </div>
  );
}
