// @ts-nocheck
import * as React from 'react';

const TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;max-height:calc(100vh - 32px);display:flex;flex-direction:column;background:rgba(250,249,247,.78);color:#29261b;-webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);border:.5px solid rgba(255,255,255,.6);border-radius:14px;box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;overflow-x:hidden;min-height:0;scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}.twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}.twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;border:2px solid transparent;background-clip:content-box}.twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}.twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;color:rgba(41,38,27,.72)}.twk-lbl>span:first-child{font-weight:500}.twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}
  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:rgba(41,38,27,.45);padding:10px 0 0}.twk-sect:first-child{padding-top:0}
  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;background:rgba(0,0,0,.06);user-select:none}.twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}.twk-seg.dragging .twk-seg-thumb{transition:none}.twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;overflow-wrap:anywhere}
`;

function useTweaks(defaults) {
  const [values, setValues] = React.useState(() => {
    try {
      const saved = window.localStorage.getItem('hydro-az:tweaks');
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch { return defaults; }
  });
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : { [keyOrEdits]: val };
    setValues((prev) => {
      const next = { ...prev, ...edits };
      try { window.localStorage.setItem('hydro-az:tweaks', JSON.stringify(next)); } catch { /* Storage is optional. */ }
      return next;
    });
  }, []);
  return [values, setTweak];
}

function TweaksPanel({ title = 'Tweaks', children }) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({ x: 16, y: 16 });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth, h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = { x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)), y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)) };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  const onDragStart = (e) => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const startRight = window.innerWidth - r.right, startBottom = window.innerHeight - r.bottom;
    const move = (ev) => {
      offsetRef.current = { x: startRight - (ev.clientX - sx), y: startBottom - (ev.clientY - sy) };
      clampToViewport();
    };
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  if (!open) return <button type="button" className="tweaks-bubble" onClick={() => setOpen(true)}>TWEAKS</button>;
  return (
    <><style>{TWEAKS_STYLE}</style><div ref={dragRef} className="twk-panel" data-noncommentable="" style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}>
      <div className="twk-hd" onMouseDown={onDragStart}><b>{title}</b><button className="twk-x" aria-label="Close tweaks" onMouseDown={(e) => e.stopPropagation()} onClick={() => setOpen(false)}>✕</button></div>
      <div className="twk-body">{children}</div>
    </div></>
  );
}

function TweakSection({ label, children }) { return <><div className="twk-sect">{label}</div>{children}</>; }

function TweakRow({ label, value, children, inline = false }) {
  return <div className={inline ? 'twk-row twk-row-h' : 'twk-row'}><div className="twk-lbl"><span>{label}</span>{value != null && <span className="twk-val">{value}</span>}</div>{children}</div>;
}

function TweakRadio({ label, value, options, onChange }) {
  const trackRef = React.useRef(null);
  const buttonRefs = React.useRef([]);
  const dragCleanupRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  const opts = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  const idx = Math.max(0, opts.findIndex((o) => o.value === value));
  const n = opts.length;
  const valueRef = React.useRef(value);
  valueRef.current = value;
  React.useEffect(() => () => { dragCleanupRef.current?.(); }, []);
  const select = (nextValue) => {
    if (nextValue === valueRef.current) return;
    valueRef.current = nextValue;
    onChange(nextValue);
  };
  const onKeyDown = (e, i) => {
    let next;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': next = (i + 1) % n; break;
      case 'ArrowLeft': case 'ArrowUp': next = (i - 1 + n) % n; break;
      case 'Home': next = 0; break;
      case 'End': next = n - 1; break;
      default: return;
    }
    e.preventDefault();
    e.stopPropagation();
    select(opts[next].value);
    buttonRefs.current[next]?.focus();
  };
  const segAt = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    const i = Math.floor(((clientX - r.left - 2) / (r.width - 4)) * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = (e) => {
    if (e.button !== 0 || e.isPrimary === false) return;
    dragCleanupRef.current?.();
    const pointerId = e.pointerId;
    setDragging(true);
    select(segAt(e.clientX));
    const move = (ev) => {
      if (ev.pointerId !== pointerId || !trackRef.current) return;
      select(segAt(ev.clientX));
    };
    const up = (ev) => {
      if (ev.pointerId !== pointerId) return;
      setDragging(false);
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      dragCleanupRef.current = null;
    };
    dragCleanupRef.current = cleanup;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  return (
    <TweakRow label={label}><div ref={trackRef} role="radiogroup" aria-label={label} onPointerDown={onPointerDown} className={dragging ? 'twk-seg dragging' : 'twk-seg'}>
      <div className="twk-seg-thumb" style={{ left: `calc(2px + ${idx} * (100% - 4px) / ${n})`, width: `calc((100% - 4px) / ${n})` }} />
      {opts.map((o, i) => <button key={o.value} ref={(node) => { buttonRefs.current[i] = node; }} type="button" role="radio" aria-checked={o.value === value} tabIndex={i === idx ? 0 : -1} onKeyDown={(e) => onKeyDown(e, i)} onClick={(e) => {
        // Native keyboard and assistive clicks have no pointer click count.
        // Pointer selection is already handled by dragging and must not reset here.
        if (e.detail === 0) select(o.value);
      }}>{o.label}</button>)}
    </div></TweakRow>
  );
}

export { useTweaks, TweaksPanel, TweakSection, TweakRow, TweakRadio };
