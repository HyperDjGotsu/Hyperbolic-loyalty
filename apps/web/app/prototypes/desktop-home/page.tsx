'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Variant1Sidebar from './Variant1Sidebar';
import Variant2TopBar from './Variant2TopBar';
import Variant3Column from './Variant3Column';

const VARIANTS = [
  { name: 'Sidebar', render: () => <Variant1Sidebar /> },
  { name: 'Top bar', render: () => <Variant2TopBar /> },
  { name: 'Phone column', render: () => <Variant3Column /> },
];

const PICKER_CSS = `
.proto-picker{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;align-items:center;gap:2px;padding:4px;border-radius:999px;background:rgba(10,10,10,.82);-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);box-shadow:0 0 0 1px rgba(255,255,255,.08) inset,0 8px 24px rgba(0,0,0,.24),0 2px 6px rgba(0,0,0,.12);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;line-height:1;-webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none}
.proto-picker-highlight{position:absolute;top:4px;left:0;height:28px;border-radius:999px;background:rgba(255,255,255,.12);will-change:transform}
.proto-picker[data-ready] .proto-picker-highlight{transition:transform 250ms cubic-bezier(.23,1,.32,1),width 250ms cubic-bezier(.23,1,.32,1)}
@media (prefers-reduced-motion:reduce){.proto-picker[data-ready] .proto-picker-highlight{transition:none}}
.proto-picker-item{position:relative;display:flex;align-items:center;height:28px;padding:0 12px;border:0;border-radius:999px;background:transparent;color:rgba(255,255,255,.55);font:inherit;cursor:pointer;transition:color 150ms ease-out}
.proto-picker-item:hover{color:rgba(255,255,255,.85)}
.proto-picker-item:active{transform:scale(.97)}
.proto-picker-item:focus-visible{outline:2px solid rgba(255,255,255,.4);outline-offset:2px}
.proto-picker-item[data-active]{color:#fff}
.proto-picker-divider{width:1px;height:16px;margin:0 4px;background:rgba(255,255,255,.12)}
.proto-picker-replay{padding:0 10px;font-size:14px}
`;

export default function DesktopHomePrototype() {
  const [current, setCurrent] = useState(0);
  const [mountKey, setMountKey] = useState(0);
  const [ready, setReady] = useState(false);
  const pickerRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = useCallback((i: number) => {
    if (i < 0 || i >= VARIANTS.length) return;
    setCurrent(i);
    setMountKey(k => k + 1);
    const url = new URL(window.location.href);
    url.searchParams.set('v', String(i + 1));
    window.history.replaceState(null, '', url);
  }, []);

  // Initial variant from ?v=, then enable the highlight slide only after first paint
  useEffect(() => {
    const v = parseInt(new URLSearchParams(window.location.search).get('v') ?? '', 10);
    if (v >= 1 && v <= VARIANTS.length) setCurrent(v - 1);
    requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
  }, []);

  const moveHighlight = useCallback(() => {
    const el = itemRefs.current[current];
    const hl = highlightRef.current;
    if (!el || !hl) return;
    hl.style.width = `${el.offsetWidth}px`;
    hl.style.transform = `translateX(${el.offsetLeft}px)`;
  }, [current]);

  useLayoutEffect(() => { moveHighlight(); }, [moveHighlight]);
  useEffect(() => { window.addEventListener('resize', moveHighlight); return () => window.removeEventListener('resize', moveHighlight); }, [moveHighlight]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= VARIANTS.length) select(num - 1);
      else if (e.key === 'ArrowRight') select((current + 1) % VARIANTS.length);
      else if (e.key === 'ArrowLeft') select((current - 1 + VARIANTS.length) % VARIANTS.length);
      else if (e.key === 'r' || e.key === 'R') setMountKey(k => k + 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [current, select]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PICKER_CSS }} />
      <div key={mountKey}>{VARIANTS[current].render()}</div>
      <nav ref={pickerRef} className="proto-picker" aria-label="Prototype variants" {...(ready ? { 'data-ready': '' } : {})}>
        <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
        {VARIANTS.map((v, i) => (
          <button
            key={v.name}
            ref={el => { itemRefs.current[i] = el; }}
            className="proto-picker-item"
            {...(i === current ? { 'data-active': '', 'aria-current': 'true' as const } : {})}
            onClick={() => select(i)}
          >
            {v.name}
          </button>
        ))}
      </nav>
    </>
  );
}
