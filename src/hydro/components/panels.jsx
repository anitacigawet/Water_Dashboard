import * as React from 'react';
import { Sparkline } from './charts.jsx';

const STATE_COLORS = {
  Current: 'var(--bull)',
  Dated: 'var(--mod)',
  Stale: 'var(--high)',
  'No data': 'var(--fg-3)',
};

function DataStateDot({ state }) {
  return <span className="dot" style={{ background: STATE_COLORS[state] || STATE_COLORS['No data'] }} />;
}

function KPI({ label, value, unit = null, sub = null, sev = null }) {
  return (
    <div className="col" style={{ gap: 2, padding: '8px 12px', borderRight: '1px solid var(--line)', minWidth: 0, flex: 1, overflow: 'hidden' }}>
      <div style={{ fontSize: 10, color: 'var(--fg-2)', letterSpacing: '0.06em' }}>{label}</div>
      <div className="row" style={{ alignItems: 'baseline', gap: 4 }}>
        <div className="num" style={{ fontSize: 22, fontWeight: 700, color: sev ? `var(--${sev})` : 'var(--fg)', letterSpacing: '-0.02em' }}>{value}</div>
        {unit && <div style={{ fontSize: 10, color: 'var(--fg-2)' }}>{unit}</div>}
      </div>
      {sub && <div style={{ fontSize: 10, color: 'var(--fg-2)' }}>{sub}</div>}
    </div>
  );
}

function BasinDirectory({ basins, selectedId, onSelect, onInspect, query, setQuery, stateFilter, setStateFilter, inputRef }) {
  const [sortKey, setSortKey] = React.useState('state');
  const [sortDir, setSortDir] = React.useState(-1);
  const stateRank = { Current: 4, Dated: 3, Stale: 2, 'No data': 1 };

  const filtered = basins
    .filter((basin) => !query || basin.name.toLowerCase().includes(query.toLowerCase()) || basin.status.toLowerCase().includes(query.toLowerCase()))
    .filter((basin) => stateFilter === 'ALL' || basin.dataState === stateFilter);

  const sortValue = (basin) => {
    if (sortKey === 'state') return stateRank[basin.dataState] || 0;
    if (sortKey === 'type') return basin.status;
    if (sortKey === 'date') return basin.latestObservation?.time || null;
    if (sortKey === 'sites') return basin.coverage.usgsFieldMeasurementSitesSince2010 ?? -1;
    return basin.name;
  };

  const sorted = [...filtered].sort((a, b) => {
    const aValue = sortValue(a);
    const bValue = sortValue(b);
    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return 1;
    if (bValue === null) return -1;
    if (aValue < bValue) return -1 * sortDir;
    if (aValue > bValue) return 1 * sortDir;
    return a.name.localeCompare(b.name);
  });

  const sortBy = (key) => {
    if (key === sortKey) setSortDir((direction) => -direction);
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  };
  const indicator = (key) => sortKey === key ? (sortDir === -1 ? ' ▼' : ' ▲') : '';

  return (
    <div className="col" style={{ height: '100%', minHeight: 0 }}>
      <div className="col" style={{ padding: 8, gap: 6, borderBottom: '1px solid var(--line)' }}>
        <div className="row" style={{ gap: 6 }}>
          <span style={{ color: 'var(--accent)' }}>›</span>
          <input ref={inputRef} className="term" placeholder="QUERY BASIN…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
          {['ALL', 'Current', 'Dated', 'Stale', 'No data'].map((state) => (
            <button key={state} className="term" data-active={stateFilter === state} onClick={() => setStateFilter(state)} style={{ fontSize: 10 }}>
              {state !== 'ALL' && <DataStateDot state={state} />}
              {state.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-body scroll" style={{ flex: 1 }}>
        <table className="dense">
          <thead>
            <tr>
              <th onClick={() => sortBy('name')} style={{ cursor: 'pointer' }}>AREA{indicator('name')}</th>
              <th onClick={() => sortBy('type')} style={{ cursor: 'pointer' }}>TYPE{indicator('type')}</th>
              <th onClick={() => sortBy('state')} style={{ cursor: 'pointer' }}>OBS AGE{indicator('state')}</th>
              <th onClick={() => sortBy('date')} style={{ cursor: 'pointer' }}>OBS DATE{indicator('date')}</th>
              <th className="num" onClick={() => sortBy('sites')} style={{ cursor: 'pointer', textAlign: 'right' }}>WELLS{indicator('sites')}</th>
              <th>TREND</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((basin) => (
              <tr key={basin.id} className={selectedId === basin.id ? 'selected' : ''} onClick={() => onSelect(basin.id)}>
                <td>
                  <span style={{ color: selectedId === basin.id ? 'var(--accent)' : 'var(--fg)', fontWeight: selectedId === basin.id ? 700 : 500 }}>
                    {basin.name}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); onInspect(basin.id); }}
                    aria-label={`Open basin report for ${basin.name}`}
                    title={`Open basin report — ${basin.name}`}
                    className="holo-info"
                  >!</button>
                </td>
                <td style={{ color: 'var(--fg-2)' }}>{basin.status}</td>
                <td><DataStateDot state={basin.dataState} /> <span style={{ color: STATE_COLORS[basin.dataState], fontSize: 10, fontWeight: 600 }}>{basin.dataState}</span></td>
                <td className="num">{basin.latestObservation?.time?.slice(0, 10) || '—'}</td>
                <td className="num">{basin.coverage.usgsFieldMeasurementSitesSince2010 ?? '—'}</td>
                <td><Sparkline history={basin.history} /></td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--fg-2)' }}>No matching monitored areas</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '4px 10px', borderTop: '1px solid var(--line)', fontSize: 10, color: 'var(--fg-2)', display: 'flex', justifyContent: 'space-between' }}>
        <span>{sorted.length}/{basins.length} AREAS</span>
        <span>SORT: {sortKey.toUpperCase()} {sortDir === -1 ? 'DESC' : 'ASC'}</span>
      </div>
    </div>
  );
}

function SourceRail({ sources }) {
  return (
    <div className="panel-body scroll" style={{ height: '100%', padding: '8px 0' }}>
      {sources.map((source) => (
        <a
          key={source.id}
          href={source.url}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'block', padding: '10px 12px', borderLeft: '2px solid transparent', borderBottom: '1px solid var(--grid)', color: 'inherit', textDecoration: 'none' }}
        >
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--bull)' }}>● {source.status.toUpperCase()}</span>
            <span style={{ fontSize: 9, color: 'var(--fg-3)' }}>OPEN ↗</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg)', letterSpacing: '0.03em' }}>{source.title.toUpperCase()}</div>
          <div className="sans" style={{ fontSize: 11, color: 'var(--fg-1)', marginTop: 4, lineHeight: 1.4 }}>{source.use}</div>
          <div className="num" style={{ fontSize: 9, color: 'var(--fg-2)', marginTop: 6 }}>
            {source.recordsChecked} RECORDS · CHECK {source.checkedAt.slice(0, 10)}
          </div>
        </a>
      ))}
    </div>
  );
}

function Scrubber({ minYear, maxYear, year, setYear, playing, setPlaying }) {
  const ref = React.useRef(null);
  const drag = React.useRef(false);

  const handle = (event) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setYear(Math.round(minYear + ratio * (maxYear - minYear)));
  };

  React.useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => {
      setYear((current) => {
        const next = (current ?? minYear - 1) + 1;
        if (next > maxYear) {
          setPlaying(false);
          return maxYear;
        }
        return next;
      });
    }, 420);
    return () => clearInterval(timer);
  }, [playing, minYear, maxYear, setYear, setPlaying]);

  const percentage = year !== null ? ((year - minYear) / (maxYear - minYear)) * 100 : 0;
  const labelYears = [...new Set([minYear, Math.ceil(minYear / 5) * 5, 2015, 2020, 2025, maxYear])]
    .filter((item) => item >= minYear && item <= maxYear);

  return (
    <div className="row" style={{ gap: 10, padding: '6px 12px', height: '100%' }}>
      <button className="term" onClick={() => setPlaying((value) => !value)} style={{ minWidth: 40 }}>{playing ? '■ STOP' : '▶ PLAY'}</button>
      <button className="term" onClick={() => { setYear(minYear); setPlaying(false); }}>⏮</button>
      <button className="term" onClick={() => setYear((value) => Math.max(minYear, (value ?? minYear) - 1))}>◀</button>
      <button className="term" onClick={() => setYear((value) => Math.min(maxYear, (value ?? minYear) + 1))}>▶</button>
      <div
        ref={ref}
        onMouseDown={(event) => { drag.current = true; handle(event); }}
        onMouseMove={(event) => { if (drag.current) handle(event); }}
        onMouseUp={() => { drag.current = false; }}
        onMouseLeave={() => { drag.current = false; }}
        style={{ flex: 1, height: 22, position: 'relative', cursor: 'pointer', background: 'var(--bg)', border: '1px solid var(--line)' }}
      >
        {Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index).map((tickYear) => {
          const major = tickYear % 5 === 0;
          const left = ((tickYear - minYear) / (maxYear - minYear)) * 100;
          return <div key={tickYear} style={{ position: 'absolute', top: 0, bottom: 0, left: `${left}%`, width: 1, background: major ? 'var(--line-2)' : 'var(--line)', opacity: major ? 0.7 : 0.35, pointerEvents: 'none' }} />;
        })}
        {labelYears.map((labelYear) => {
          const left = ((labelYear - minYear) / (maxYear - minYear)) * 100;
          return <div key={labelYear} style={{ position: 'absolute', top: 4, left: `calc(${left}% + 2px)`, fontSize: 9, color: 'var(--fg-2)', pointerEvents: 'none' }}>{labelYear}</div>;
        })}
        {year !== null && <div style={{ position: 'absolute', top: -2, bottom: -2, left: `${percentage}%`, width: 2, background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)', transform: 'translateX(-1px)', pointerEvents: 'none' }} />}
      </div>
      <div className="num" style={{ minWidth: 80, textAlign: 'right', color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>{year !== null ? `YR ${year}` : 'YR ----'}</div>
    </div>
  );
}

export { DataStateDot, KPI, BasinDirectory, SourceRail, Scrubber };
