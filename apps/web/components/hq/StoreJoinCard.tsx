'use client';

import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface JoinInfo { code: string; rotatedAt: string; storeName: string; joinUrl: string }

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

// Shows a store's player join code with a QR players scan to join (and prove they belong to the store).
export default function StoreJoinCard({ storeId }: { storeId: string | null }) {
  const [info, setInfo] = useState<JoinInfo | null>(null);
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const apply = useCallback(async (next: JoinInfo) => {
    setInfo(next);
    try {
      setQr(await QRCode.toDataURL(next.joinUrl, { width: 480, margin: 2, errorCorrectionLevel: 'M' }));
    } catch {
      setQr('');
    }
  }, []);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    setInfo(null); setQr(''); setError('');
    fetch(`/api/hq/join-code?storeId=${encodeURIComponent(storeId)}`)
      .then(async r => ({ ok: r.ok, data: await r.json().catch(() => ({})) }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (ok) apply(data as JoinInfo); else setError(data.error || 'Could not load the join code.');
      })
      .catch(() => { if (!cancelled) setError('Could not load the join code.'); });
    return () => { cancelled = true; };
  }, [storeId, apply]);

  async function rotate() {
    if (!storeId || busy) return;
    if (!window.confirm('Make a new code? The old code and printed QR signs stop working right away.')) return;
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/hq/join-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) await apply(data as JoinInfo); else setError(data.error || 'Could not make a new code.');
    } catch {
      setError('Could not make a new code.');
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!info) return;
    try { await navigator.clipboard.writeText(info.joinUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  function printSign() {
    if (!info || !qr) return;
    const w = window.open('', '_blank', 'width=720,height=900');
    if (!w) return;
    w.document.write(`<!doctype html><title>Join ${escapeHtml(info.storeName)}</title>
<style>body{font-family:system-ui,sans-serif;text-align:center;padding:48px}h1{font-size:40px;margin:0 0 8px}
p{font-size:20px;margin:6px 0}img{width:420px;height:420px;margin:24px 0}.code{font-size:44px;letter-spacing:10px;font-weight:700}</style>
<h1>Join ${escapeHtml(info.storeName)}</h1><p>Scan with your phone camera to join on Player Pass</p>
<img src="${qr}" alt="Join QR code"><p>Or enter this code in the app</p><p class="code">${escapeHtml(info.code)}</p>
<script>window.onload=function(){window.print()}</script>`);
    w.document.close();
  }

  return (
    <div className="bg-surface rounded-xl p-6 border border-border-token">
      <h2 className="font-semibold text-primary mb-1">Player join code</h2>
      <p className="text-xs text-tertiary mb-5">
        Players scan this QR (or type the code) to join your store. Print it and put it at the counter. Anyone who joins without it stays unverified until they check in at an event.
      </p>

      {error && <p className="text-xs text-danger mb-3">{error}</p>}
      {!info && !error && <p className="text-sm text-secondary">Loading…</p>}

      {info && (
        <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
          {qr && <img src={qr} alt="Join QR code" width={160} height={160} className="rounded-lg bg-white p-1" />}
          <div className="flex-1 w-full">
            <div className="text-xs text-tertiary mb-1">Code</div>
            <div className="font-mono text-2xl tracking-[0.3em] text-primary mb-4">{info.code}</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={copyLink} className="px-3 py-2 rounded-lg border border-border-strong text-sm text-primary">
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <button onClick={printSign} disabled={!qr} className="px-3 py-2 rounded-lg border border-border-strong text-sm text-primary disabled:opacity-50">
                Print sign
              </button>
              <button onClick={rotate} disabled={busy} className="px-3 py-2 rounded-lg border border-border-strong text-sm text-secondary disabled:opacity-50">
                {busy ? 'Working…' : 'New code'}
              </button>
            </div>
            <p className="text-xs text-tertiary mt-3">Only store managers can make a new code.</p>
          </div>
        </div>
      )}
    </div>
  );
}
