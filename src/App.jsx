import { useEffect, useMemo, useRef, useState } from 'react';
import { BASINS, SNAPSHOT_META, SOURCE_LOG } from './hydro/data.js';
import { useTweaks, TweaksPanel, TweakSection, TweakRadio } from './hydro/tweaks-panel.jsx';
import { ArizonaMap } from './hydro/components/map.jsx';
import { DepthChart, FlowChart, SourcesChart, fmtNum } from './hydro/components/charts.jsx';
import { BasinDirectory, DataStateDot, getVisibleBasins, KPI, Scrubber, SourceRail } from './hydro/components/panels.jsx';

const TWEAK_DEFAULTS = {
  theme: 'dark',
  density: 'compact',
  chartType: 'area',
};

const WATCHLIST_KEY = 'arizona-basin-monitor:watchlist:v2';
const LEGACY_WATCHLIST_KEY = 'hydro-az:watchlist';
const LEGACY_IDS = {
  'douglas-ina': 'douglas-ama',
  willcox: 'willcox-ama',
  'hualapai-ina': 'hualapai-valley-ina',
  coconino: 'coconino-plateau',
  'san-simon': 'san-simon-wash',
  'little-colorado': 'little-colorado-river-plateau',
};

const STATE_COLORS = {
  Current: 'var(--bull)',
  Dated: 'var(--mod)',
  Stale: 'var(--high)',
  'No data': 'var(--fg-3)',
};

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return time;
}

function formatClock(time) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())} ${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`;
}

function formatDate(value) {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toISOString().slice(0, 10);
}

function readWatchlist() {
  const validIds = new Set(BASINS.map((basin) => basin.id));
  try {
    const current = JSON.parse(window.localStorage.getItem(WATCHLIST_KEY) || 'null');
    const source = Array.isArray(current) ? current : JSON.parse(window.localStorage.getItem(LEGACY_WATCHLIST_KEY) || '[]');
    const ids = Array.isArray(source) ? source : [];
    return [...new Set(ids.map((id) => LEGACY_IDS[id] || id).filter((id) => validIds.has(id)))];
  } catch {
    return [];
  }
}

function App() {
  const basins = BASINS;
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const { theme, density, chartType } = tweaks;

  useEffect(() => {
    document.body.dataset.theme = theme;
    document.body.dataset.density = density;
  }, [theme, density]);

  const [selectedId, setSelectedId] = useState('pinal-ama');
  const [hoverId, setHoverId] = useState(null);
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [directorySort, setDirectorySort] = useState({ key: 'state', direction: -1 });
  const [tab, setTab] = useState('overview');
  const [focusYear, setFocusYear] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [watchedIds, setWatchedIds] = useState(readWatchlist);
  const watchlistChangedRef = useRef(false);
  const searchRef = useRef(null);

  const selected = useMemo(() => basins.find((basin) => basin.id === selectedId) || basins[0], [basins, selectedId]);
  const directoryBasins = useMemo(
    () => watchlistOnly ? basins.filter((basin) => watchedIds.includes(basin.id)) : basins,
    [basins, watchedIds, watchlistOnly],
  );
  const visibleBasins = useMemo(
    () => getVisibleBasins(directoryBasins, query, stateFilter, directorySort.key, directorySort.direction),
    [directoryBasins, query, stateFilter, directorySort],
  );

  useEffect(() => {
    // Only persist user changes, never a fallback returned by a failed startup read.
    if (!watchlistChangedRef.current) return;
    try {
      window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchedIds));
    } catch { /* Keep the session watchlist usable when browser storage is unavailable. */ }
    if (watchedIds.length === 0) setWatchlistOnly(false);
  }, [watchedIds]);

  const summary = useMemo(() => {
    const stateCounts = basins.reduce((counts, basin) => {
      counts[basin.dataState] = (counts[basin.dataState] || 0) + 1;
      return counts;
    }, { Current: 0, Dated: 0, Stale: 0, 'No data': 0 });
    return {
      total: basins.length,
      ama: basins.filter((basin) => basin.status === 'AMA').length,
      ina: basins.filter((basin) => basin.status === 'INA').length,
      withUsableReading: (stateCounts.Current || 0) + (stateCounts.Dated || 0),
      stateCounts,
    };
  }, [basins]);

  const toggleWatched = (id) => {
    watchlistChangedRef.current = true;
    setWatchedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const sortDirectoryBy = (key) => {
    setDirectorySort((current) => ({ key, direction: key === current.key ? -current.direction : -1 }));
  };

  const downloadCsv = () => {
    const fields = [
      'id', 'name', 'official_adwr_name', 'management_type', 'data_state', 'map_reference_latitude', 'map_reference_longitude',
      'latest_depth_ft_below_land_surface', 'observation_date', 'monitoring_location_id', 'approval_status', 'observation_source_url',
      'representative_series_site', 'representative_series_observations', 'adwr_telemetry_sites', 'usgs_latest_continuous_sites',
      'usgs_field_measurement_sites_since_2010', 'registry_source_url', 'snapshot_checked_at',
    ];
    const rows = basins.map((basin) => [
      basin.id,
      basin.name,
      basin.officialName,
      basin.status,
      basin.dataState,
      basin.lat,
      basin.lon,
      basin.latestObservation?.depthToWaterFt ?? '',
      basin.latestObservation?.time ?? '',
      basin.latestObservation?.siteId ?? '',
      basin.latestObservation?.approvalStatus ?? '',
      basin.latestObservation?.sourceUrl ?? '',
      basin.representativeSeries?.siteId ?? '',
      basin.history.length || '',
      basin.coverage.adwrTelemetrySites ?? '',
      basin.coverage.usgsLatestContinuousSites ?? '',
      basin.coverage.usgsFieldMeasurementSitesSince2010 ?? '',
      basin.registrySource.url,
      SNAPSHOT_META.generatedAt,
    ]);
    const escape = (value) => `"${String(value).replaceAll('"', '""')}"`;
    const csv = [fields, ...rows].map((row) => row.map(escape).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'arizona-basin-monitor-snapshot.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handler = (event) => {
      if (event.defaultPrevented) return;
      if (document.activeElement?.tagName === 'INPUT' && !event.key.startsWith('F')) return;
      if (['ArrowDown', 'j', 'ArrowUp', 'k'].includes(event.key)) {
        event.preventDefault();
        if (visibleBasins.length === 0) return;
        const forward = event.key === 'ArrowDown' || event.key === 'j';
        const index = visibleBasins.findIndex((basin) => basin.id === selectedId);
        const nextIndex = index === -1
          ? (forward ? 0 : visibleBasins.length - 1)
          : (index + (forward ? 1 : -1) + visibleBasins.length) % visibleBasins.length;
        setSelectedId(visibleBasins[nextIndex].id);
      } else if (event.key === '1' || event.key === 'F1') {
        event.preventDefault();
        setTab('overview');
      } else if (event.key === '2' || event.key === 'F2') {
        event.preventDefault();
        setTab('flows');
      } else if (event.key === '3' || event.key === 'F3') {
        event.preventDefault();
        setTab('report');
      } else if (event.key === 'F4') {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === 'F9') {
        event.preventDefault();
        downloadCsv();
      } else if (event.key === 'F10' && watchedIds.length > 0) {
        event.preventDefault();
        setWatchlistOnly((value) => !value);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visibleBasins, selectedId, watchedIds]);

  const clock = useClock();
  const latestYear = new Date(SNAPSHOT_META.generatedAt).getUTCFullYear();

  return (
    <div className="console">
      <div className="ribbon">
        <span className="brand">HYDRO/AZ<span className="brand-sub"> · OPS CONSOLE v1.0</span></span>
        <span className="sep">│</span>
        <span>MODE <span style={{ color: 'var(--fg)' }}>PUBLIC · READ ONLY</span></span>
        <span className="sep">│</span>
        <span>SET <span style={{ color: 'var(--fg)' }}>23 MONITORED AREAS</span></span>
        <div className="right">
          <span className="num">{formatClock(clock)}</span>
          <span style={{ color: 'var(--accent-2)' }}>● SOURCE-CHECKED SNAPSHOT<span className="blink"> _</span></span>
        </div>
      </div>

      <div className="fbar">
        <button className="fkey" data-active={tab === 'overview'} onClick={() => setTab('overview')}><span className="num">F1</span><span>OVERVIEW</span></button>
        <button className="fkey" data-active={tab === 'flows'} onClick={() => setTab('flows')}><span className="num">F2</span><span>FLOWS &amp; SOURCES</span></button>
        <button className="fkey" data-active={tab === 'report'} onClick={() => setTab('report')}><span className="num">F3</span><span>BASIN REPORT</span></button>
        <div style={{ flex: 1, borderRight: '1px solid var(--line)' }} />
        <button className="fkey" onClick={downloadCsv}><span className="num">F9</span><span>EXPORT CSV</span></button>
        <button
          className="fkey"
          disabled={watchedIds.length === 0}
          data-active={watchlistOnly}
          onClick={() => setWatchlistOnly((value) => !value)}
          style={watchedIds.length === 0 ? { opacity: 0.5, cursor: 'default' } : undefined}
        ><span className="num">F10</span><span>WATCHLIST [{watchedIds.length}]</span></button>
      </div>

      <div className="stage">
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 380px', gridTemplateRows: '1fr auto', height: '100%', gap: 0 }}>
          <div className="panel" style={{ borderRight: 0, borderBottom: 0 }}>
            <div className="panel-head"><span className="tag">[F4]</span><span>BASIN DIRECTORY</span><span className="meta">{basins.length} MONITORED</span></div>
            <BasinDirectory
              basins={visibleBasins}
              totalCount={directoryBasins.length}
              sortKey={directorySort.key}
              sortDir={directorySort.direction}
              onSort={sortDirectoryBy}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onInspect={(id) => { setSelectedId(id); setTab('report'); }}
              query={query}
              setQuery={setQuery}
              stateFilter={stateFilter}
              setStateFilter={setStateFilter}
              inputRef={searchRef}
            />
          </div>

          <div className="col" style={{ minWidth: 0 }}>
            <div className="row" style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-1)', minHeight: 64 }}>
              <KPI label="MONITORED AREAS" value={summary.total} sub="CURATED VIEW · NOT STATEWIDE TOTAL" />
              <KPI label="ACTIVE MGMT AREAS" value={summary.ama} sub="CURRENT ADWR CLASSIFICATION" sev="bull" />
              <KPI label="NON-EXPANSION AREAS" value={summary.ina} sub="CURRENT ADWR CLASSIFICATION" />
              <KPI label="OBSERVED ≤ 1 YEAR" value={summary.withUsableReading} sub={`OLDER ${summary.stateCounts.Stale || 0} · NONE ${summary.stateCounts['No data'] || 0}`} sev="mod" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', flex: 1, minHeight: 0 }}>
              <div className="panel" style={{ border: 'none', borderRight: '1px solid var(--line)' }}>
                <div className="panel-head"><span className="tag">[F5]</span><span>OFFICIAL BASIN MAP · {basins.length} AREAS</span><span className="meta">{hoverId ? basins.find((basin) => basin.id === hoverId)?.name.toUpperCase() : 'CLICK TO SELECT'}</span></div>
                <div className="panel-body" style={{ padding: 8 }}>
                  <ArizonaMap basins={basins} selectedId={selectedId} hoverId={hoverId} setHoverId={setHoverId} onSelect={setSelectedId} theme={theme} />
                </div>
              </div>

              <BasinDetailPanel
                basin={selected}
                tab={tab}
                chartType={chartType}
                focusYear={focusYear}
                watched={watchedIds.includes(selected.id)}
                onToggleWatched={() => toggleWatched(selected.id)}
              />
            </div>

            <div className="panel" style={{ border: 'none', borderTop: '1px solid var(--line)', height: 44 }}>
              <Scrubber minYear={2010} maxYear={latestYear} year={focusYear} setYear={setFocusYear} playing={playing} setPlaying={setPlaying} />
            </div>
          </div>

          <div className="panel" style={{ borderLeft: '1px solid var(--line)', borderRight: 0, borderTop: 0, borderBottom: 0 }}>
            <div className="panel-head"><span className="tag">[F6]</span><span>PRIMARY SOURCE LOG</span><span className="meta">{SOURCE_LOG.length} CHECKED</span></div>
            <SourceRail sources={SOURCE_LOG} />
          </div>
        </div>
      </div>

      <div className="statusbar">
        <span><span className="tick" /> SNAPSHOT CHECKED {formatDate(SNAPSHOT_META.generatedAt)}</span>
        <span className="sep" style={{ color: 'var(--line-2)' }}>│</span>
        <span>SEL: <span style={{ color: 'var(--accent)' }}>{selected.name.toUpperCase()}</span></span>
        <span className="sep" style={{ color: 'var(--line-2)' }}>│</span>
        <span>AGE: <span style={{ color: STATE_COLORS[selected.dataState] }}>{selected.dataState.toUpperCase()}</span></span>
        <span className="sep" style={{ color: 'var(--line-2)' }}>│</span>
        <span>YR: {focusYear !== null ? <span style={{ color: 'var(--accent-2)' }}>{focusYear}</span> : '----'}</span>
        <span className="sep" style={{ color: 'var(--line-2)' }}>│</span>
        <span>FILTER: {stateFilter}</span>
        <div className="right">
          <span style={{ color: 'var(--fg-3)' }}>↑↓ NAV · F1/F2/F3 TABS · F4 SEARCH · F9 CSV</span>
          <span className="sep" style={{ color: 'var(--line-2)' }}>│</span>
          <span style={{ color: 'var(--fg-2)' }}>ARIZONA BASIN MONITOR · POLYFORM NC 1.0.0</span>
        </div>
      </div>

      <TweaksPanel title="TWEAKS · HYDRO/AZ">
        <TweakSection label="THEME">
          <TweakRadio label="Palette" value={theme} onChange={(value) => setTweak('theme', value)} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'sepia', label: 'Sepia' }]} />
          <TweakRadio label="Density" value={density} onChange={(value) => setTweak('density', value)} options={[{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }]} />
        </TweakSection>
        <TweakSection label="CHARTS">
          <TweakRadio label="Well chart" value={chartType} onChange={(value) => setTweak('chartType', value)} options={[{ value: 'area', label: 'Area' }, { value: 'line', label: 'Line' }, { value: 'bar', label: 'Bar' }]} />
        </TweakSection>
        <TweakSection label="DATA">
          <div style={{ fontSize: 10.5, color: 'var(--fg-2)', lineHeight: 1.5 }}>
            {basins.length} monitored areas · USGS 72019 observations · checked {formatDate(SNAPSHOT_META.generatedAt)}. Missing basin-wide metrics remain unavailable.
          </div>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

function BasinDetailPanel({ basin, tab, chartType, focusYear, watched, onToggleWatched }) {
  const latest = basin.latestObservation;
  const fieldSites = basin.coverage.usgsFieldMeasurementSitesSince2010;
  const series = basin.representativeSeries;

  return (
    <div className="col" style={{ height: '100%', minHeight: 0 }}>
      <div className="panel-head" style={{ background: 'var(--bg-2)' }}>
        <span className="tag">[SEL]</span>
        <span style={{ color: 'var(--fg)' }}>{basin.name.toUpperCase()}</span>
        <span style={{ color: 'var(--fg-3)', margin: '0 6px' }}>·</span>
        <span style={{ color: 'var(--fg-1)' }}>{basin.id.toUpperCase()}</span>
        <button type="button" className="term" data-active={watched} onClick={onToggleWatched} style={{ marginLeft: 'auto', fontSize: 9 }}>{watched ? '★ WATCHED' : '☆ WATCH'}</button>
        <span className="meta" style={{ marginLeft: 0 }}>{basin.lat.toFixed(3)}°N {Math.abs(basin.lon).toFixed(3)}°W</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', borderBottom: '1px solid var(--line)' }}>
        <BasinMetricCell label="TYPE" big={basin.status.toUpperCase()} sub={basin.status === 'AMA' ? 'ACTIVE MANAGEMENT AREA' : basin.status === 'INA' ? 'IRRIGATION NON-EXPANSION AREA' : 'GROUNDWATER BASIN'} />
        <BasinMetricCell label="OBSERVATION AGE" big={basin.dataState.toUpperCase()} color={STATE_COLORS[basin.dataState]} sub={latest ? `OBSERVED ${formatDate(latest.time)}` : 'NO USGS 72019 READING FOUND'} />
        <BasinMetricCell label="LATEST WELL" big={latest ? fmtNum(latest.depthToWaterFt, 2) : '—'} sub={latest ? 'ft below land surface · one well' : 'Unavailable'} />
        <BasinMetricCell label="USGS FIELD WELLS" big={fieldSites ?? '—'} sub="WITH RECORDS SINCE 2010" />
      </div>

      {tab === 'overview' && (
        <>
          <div className="panel-head" style={{ background: 'var(--bg-1)' }}>
            <span className="tag">▸</span><span>REPRESENTATIVE WELL · {series?.siteId || 'UNAVAILABLE'}</span><span className="meta">SINGLE WELL · NOT BASIN AVERAGE</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}><DepthChart key={basin.id} basin={basin} type={chartType} focusYear={focusYear} /></div>
          <div className="panel-head" style={{ background: 'var(--bg-1)', borderTop: '1px solid var(--line)' }}><span className="tag">▸</span><span>SUPPLY MIX · SOURCE BOUNDARY</span></div>
          <div style={{ height: 152 }}><SourcesChart /></div>
        </>
      )}

      {tab === 'flows' && (
        <>
          <div className="panel-head" style={{ background: 'var(--bg-1)' }}><span className="tag">▸</span><span>WITHDRAWAL vs RECHARGE</span><span className="meta">NO UNIFORM STATEWIDE FEED</span></div>
          <div style={{ flex: 1, minHeight: 0 }}><FlowChart /></div>
          <div className="panel-head" style={{ background: 'var(--bg-1)', borderTop: '1px solid var(--line)' }}><span className="tag">▸</span><span>SUPPLY MIX</span></div>
          <div style={{ height: 152 }}><SourcesChart /></div>
        </>
      )}

      {tab === 'report' && <BasinReport basin={basin} focusYear={focusYear} />}
    </div>
  );
}

function BasinMetricCell({ label, big, sub, color = 'var(--fg)' }) {
  return (
    <div style={{ padding: '8px 12px', borderRight: '1px solid var(--grid)', borderBottom: '1px solid var(--grid)' }}>
      <div style={{ fontSize: 10, color: 'var(--fg-2)', letterSpacing: '0.06em' }}>{label}</div>
      <div className="num" style={{ fontSize: 16, fontWeight: 700, color, marginTop: 2 }}>{big}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--fg-2)', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function BasinReport({ basin, focusYear }) {
  const latest = basin.latestObservation;
  const series = basin.representativeSeries;
  const focus = focusYear === null ? null : [...basin.history].reverse().find((item) => item.year === focusYear);
  return (
    <div className="panel-body scroll" style={{ padding: 14 }}>
      <div className="sans" style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--fg-1)' }}>
        <p style={{ margin: '0 0 12px', color: 'var(--fg)' }}>
          <span style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>SUMMARY · </span>
          {basin.name} is listed by ADWR as {basin.status === 'AMA' ? 'an Active Management Area' : basin.status === 'INA' ? 'an Irrigation Non-Expansion Area' : 'a groundwater basin'}.
          {latest
            ? ` The newest bundled USGS depth-to-water reading is ${fmtNum(latest.depthToWaterFt, 2)} feet below land surface at ${latest.siteId}, observed ${formatDate(latest.time)}.`
            : ' No USGS 72019 depth-to-water reading was found for this monitored area in the bundled source window.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <ReportRow k="ADWR type" v={basin.status} />
          <ReportRow k="Official name" v={basin.officialName} />
          <ReportRow k="Map reference point" v={`${basin.lat.toFixed(3)} / ${basin.lon.toFixed(3)}`} />
          <ReportRow k="Observation age" v={basin.dataState} />
          <ReportRow k="Latest well depth" v={latest ? `${fmtNum(latest.depthToWaterFt, 2)} ft BLS` : 'Unavailable'} />
          <ReportRow k="Observation date" v={formatDate(latest?.time)} />
          <ReportRow k="Monitoring location" v={latest?.siteId || 'Unavailable'} />
          <ReportRow k="Approval status" v={latest?.approvalStatus || 'Unavailable'} />
          <ReportRow k="Representative series" v={series?.siteId || 'Unavailable'} />
          <ReportRow k="Series observations" v={series ? String(series.observations.length) : 'Unavailable'} />
          <ReportRow k="ADWR telemetry sites" v={basin.coverage.adwrTelemetrySites === null ? 'Unavailable' : String(basin.coverage.adwrTelemetrySites)} />
          <ReportRow k="USGS field wells" v={basin.coverage.usgsFieldMeasurementSitesSince2010 === null ? 'Unavailable' : String(basin.coverage.usgsFieldMeasurementSitesSince2010)} />
        </div>

        <div style={{ borderTop: '1px solid var(--grid)', paddingTop: 10, fontSize: 11 }}>
          <strong style={{ color: 'var(--fg-1)' }}>Source trail:</strong>
          <div className="col" style={{ gap: 5, marginTop: 7 }}>
            <SourceLink href={basin.registrySource.url}>ADWR Groundwater Basin 2025 · official name, type, and geometry</SourceLink>
            {latest && <SourceLink href={latest.sourceUrl}>USGS monitoring location {latest.siteId} · latest displayed observation</SourceLink>}
            {series && <SourceLink href={series.sourceUrl}>USGS monitoring location {series.siteId} · displayed historical series</SourceLink>}
          </div>
        </div>

        <div style={{ marginTop: 14, padding: 10, background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg-2)', fontSize: 11 }}>
          <strong style={{ color: 'var(--accent-2)' }}>DATA BOUNDARY · </strong>
          A well reading is not a basin average. Basin-wide deficit, percent depleted, storage capacity, recharge, withdrawal, and supply mix remain unavailable until a comparable primary source and method are wired for this area.
        </div>

        {focus && (
          <div style={{ marginTop: 14, padding: 10, background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
            <div className="num" style={{ fontSize: 10, color: 'var(--accent-2)', fontWeight: 700 }}>REPRESENTATIVE WELL · {focus.time.slice(0, 10)}</div>
            <div style={{ fontSize: 11, marginTop: 6 }}>Depth to water: <span className="mono" style={{ color: 'var(--fg)' }}>{fmtNum(focus.depthToWaterFt, 2)} ft below land surface</span>.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function SourceLink({ href, children }) {
  return <a href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-2)', textDecoration: 'none' }}>↗ {children}</a>;
}

function ReportRow({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, borderBottom: '1px dotted var(--grid)', padding: '4px 0' }}>
      <span style={{ color: 'var(--fg-2)', fontSize: 11 }}>{k}</span>
      <span className="mono" style={{ color: 'var(--fg)', fontSize: 11, fontWeight: 600, textAlign: 'right' }}>{v}</span>
    </div>
  );
}

export default App;
