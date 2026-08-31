import * as React from 'react';

function fmtNum(value, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(digits);
}

function fmtSigned(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const formatted = n.toFixed(digits);
  return n > 0 ? `+${formatted}` : formatted;
}

function useResize(ref) {
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  React.useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

function UnavailablePanel({ title = 'UNAVAILABLE', children, link, linkLabel = 'OPEN PRIMARY SOURCE' }) {
  return (
    <div className="col" style={{ height: '100%', justifyContent: 'center', alignItems: 'center', padding: 18, textAlign: 'center' }}>
      <div className="num" style={{ color: 'var(--fg)', fontWeight: 700, letterSpacing: '0.08em' }}>{title}</div>
      <div className="sans" style={{ color: 'var(--fg-2)', fontSize: 11, lineHeight: 1.55, maxWidth: 440, marginTop: 7 }}>
        {children}
      </div>
      {link && (
        <a className="term" href={link} target="_blank" rel="noreferrer" style={{ marginTop: 12, textDecoration: 'none' }}>
          {linkLabel} ↗
        </a>
      )}
    </div>
  );
}

function DepthChart({ basin, type = 'area', focusYear, onFocusYear }) {
  const ref = React.useRef(null);
  const { w, h } = useResize(ref);
  const data = (basin.history || [])
    .map((item) => ({ ...item, timeMs: Date.parse(item.time) }))
    .filter((item) => Number.isFinite(item.timeMs) && Number.isFinite(Number(item.depthToWaterFt)))
    .sort((a, b) => a.timeMs - b.timeMs);

  if (data.length < 2) {
    return (
      <UnavailablePanel title="NO VERIFIED SERIES" link="https://api.waterdata.usgs.gov/docs/ogcapi/">
        No single USGS well in this monitored area has at least two static or unqualified field measurements in the bundled 2010–present window. The monitor does not generate a replacement curve.
      </UnavailablePanel>
    );
  }

  const margin = { l: 48, r: 14, t: 14, b: 28 };
  const innerW = Math.max(0, w - margin.l - margin.r);
  const innerH = Math.max(0, h - margin.t - margin.b);
  const depths = data.map((item) => Number(item.depthToWaterFt));
  const yMin = Math.min(...depths);
  const yMax = Math.max(...depths);
  const pad = Math.max(2, (yMax - yMin) * 0.1);
  const yLo = Math.max(0, yMin - pad);
  const yHi = yMax + pad;
  const xMin = data[0].timeMs;
  const xMax = data.at(-1).timeMs;
  const xSpan = Math.max(86_400_000, xMax - xMin);
  const X = (timeMs) => margin.l + ((timeMs - xMin) / xSpan) * innerW;
  const Y = (depth) => margin.t + ((depth - yLo) / Math.max(1, yHi - yLo)) * innerH;
  const linePoints = data.map((item) => `${X(item.timeMs).toFixed(1)},${Y(item.depthToWaterFt).toFixed(1)}`).join(' ');
  const areaPath = `M ${X(xMin)},${Y(yLo)} ${data.map((item) => `L ${X(item.timeMs).toFixed(1)},${Y(item.depthToWaterFt).toFixed(1)}`).join(' ')} L ${X(xMax)},${Y(yLo)} Z`;
  const yValues = Array.from({ length: 5 }, (_, index) => yLo + (yHi - yLo) * (index / 4));
  const timeTicks = Array.from({ length: 5 }, (_, index) => {
    const timeMs = xMin + xSpan * (index / 4);
    return { key: index, timeMs, label: new Date(timeMs).getUTCFullYear() };
  });
  const focusRecord = focusYear === null || focusYear === undefined
    ? null
    : [...data].reverse().find((item) => item.year === focusYear) || null;

  return (
    <div ref={ref} style={{ width: '100%', height: '100%' }}>
      {w > 0 && h > 0 && (
        <svg
          width={w}
          height={h}
          style={{ display: 'block' }}
          onMouseMove={(event) => {
            if (!onFocusYear || innerW <= 0) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left - margin.l) / innerW));
            const target = xMin + ratio * xSpan;
            const nearest = data.reduce((best, item) =>
              Math.abs(item.timeMs - target) < Math.abs(best.timeMs - target) ? item : best,
            );
            onFocusYear(nearest.year);
          }}
        >
          {yValues.map((value, index) => (
            <g key={`y-${index}`}>
              <line x1={margin.l} x2={margin.l + innerW} y1={Y(value)} y2={Y(value)} stroke="var(--grid)" strokeDasharray="2 4" />
              <text x={margin.l - 6} y={Y(value) + 3} textAnchor="end" fontSize="10" fill="var(--fg-2)" fontFamily="JetBrains Mono">{value.toFixed(0)}</text>
            </g>
          ))}
          {timeTicks.map((tick) => (
            <text key={tick.key} x={X(tick.timeMs)} y={margin.t + innerH + 16} textAnchor="middle" fontSize="10" fill="var(--fg-2)" fontFamily="JetBrains Mono">{tick.label}</text>
          ))}
          <text x={margin.l - 38} y={margin.t + innerH / 2} fontSize="9" fill="var(--fg-3)" fontFamily="JetBrains Mono" transform={`rotate(-90 ${margin.l - 38} ${margin.t + innerH / 2})`} textAnchor="middle">DEPTH (ft BLS)</text>

          {type === 'area' && <path d={areaPath} fill="var(--accent)" opacity="0.18" />}
          {type !== 'bar' && <polyline points={linePoints} fill="none" stroke="var(--accent)" strokeWidth="1.6" />}
          {type === 'bar' && data.map((item) => {
            const barWidth = Math.max(1, (innerW / data.length) * 0.72);
            const y = Y(item.depthToWaterFt);
            return <rect key={item.time} x={X(item.timeMs) - barWidth / 2} y={y} width={barWidth} height={Math.max(0, margin.t + innerH - y)} fill="var(--accent)" opacity="0.72" />;
          })}

          {focusRecord && (
            <g pointerEvents="none">
              <line x1={X(focusRecord.timeMs)} x2={X(focusRecord.timeMs)} y1={margin.t} y2={margin.t + innerH} stroke="var(--accent-2)" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={X(focusRecord.timeMs)} cy={Y(focusRecord.depthToWaterFt)} r="3" fill="var(--accent-2)" stroke="var(--bg)" strokeWidth="1.5" />
              <g transform={`translate(${Math.min(X(focusRecord.timeMs) + 8, margin.l + innerW - 158)}, ${margin.t + 4})`}>
                <rect width="150" height="42" fill="var(--bg-2)" stroke="var(--line-2)" />
                <text x="8" y="14" fontSize="10" fill="var(--fg-2)" fontFamily="JetBrains Mono">{focusRecord.time.slice(0, 10)}</text>
                <text x="8" y="29" fontSize="11" fill="var(--accent)" fontFamily="JetBrains Mono" fontWeight="700">{fmtNum(focusRecord.depthToWaterFt, 2)} ft BLS</text>
              </g>
            </g>
          )}
          <line x1={margin.l} y1={margin.t + innerH} x2={margin.l + innerW} y2={margin.t + innerH} stroke="var(--line)" />
          <line x1={margin.l} y1={margin.t} x2={margin.l} y2={margin.t + innerH} stroke="var(--line)" />
        </svg>
      )}
    </div>
  );
}

function FlowChart() {
  return (
    <UnavailablePanel title="NO UNIFORM BASIN SERIES" link="https://www.azwater.gov/supply-demand">
      ADWR publishes annual or assessment-period water budgets for some areas, but there is no comparable statewide daily withdrawal-versus-recharge feed. This panel stays unavailable until a sourced basin-specific adapter is present.
    </UnavailablePanel>
  );
}

function SourcesChart() {
  return (
    <UnavailablePanel title="SOURCE MIX NOT PUBLISHED UNIFORMLY" link="https://www.azwater.gov/supply-demand">
      Supply categories and reporting periods differ between AMA datasets and rural basin studies. Missing shares are not converted to zero or copied from another basin.
    </UnavailablePanel>
  );
}

function Sparkline({ history, w = 80, h = 18 }) {
  const data = (history || []).filter((item) => Number.isFinite(Number(item.depthToWaterFt)));
  if (data.length < 2) {
    return <span style={{ color: 'var(--fg-3)', fontSize: 10 }}>—</span>;
  }
  const values = data.map((item) => Number(item.depthToWaterFt));
  const yMin = Math.min(...values);
  const yMax = Math.max(...values);
  const X = (index) => (index / (data.length - 1)) * w;
  const Y = (value) => h - ((value - yMin) / (yMax - yMin || 1)) * h;
  const points = data.map((item, index) => `${X(index).toFixed(1)},${Y(item.depthToWaterFt).toFixed(1)}`).join(' ');
  const deeper = values.at(-1) > values[0];
  return (
    <svg width={w} height={h} style={{ display: 'block' }} aria-label="Representative well trend">
      <polyline points={points} fill="none" stroke={deeper ? 'var(--bear)' : 'var(--bull)'} strokeWidth="1.2" />
    </svg>
  );
}

export { DepthChart, FlowChart, SourcesChart, Sparkline, UnavailablePanel, fmtNum, fmtSigned };
