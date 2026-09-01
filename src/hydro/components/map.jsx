import * as React from 'react';
import { ADWR_BASIN_GEOJSON_URL } from '../registry.js';

const AZ_BOUNDS = { minLon: -114.82, maxLon: -109.045, minLat: 31.33, maxLat: 37.0 };
const MAP_W = 1000;
const MAP_H = 1100;

function lonLatToXY(lon, lat) {
  const x = ((lon - AZ_BOUNDS.minLon) / (AZ_BOUNDS.maxLon - AZ_BOUNDS.minLon)) * MAP_W;
  const y = MAP_H - ((lat - AZ_BOUNDS.minLat) / (AZ_BOUNDS.maxLat - AZ_BOUNDS.minLat)) * MAP_H;
  return [x, y];
}

const AZ_OUTLINE = [
  [37.0, -114.05], [37.0, -109.045], [31.33, -109.045], [31.33, -111.07],
  [31.43, -111.42], [31.34, -113.33], [32.5, -114.81], [32.74, -114.72],
  [33.04, -114.52], [33.41, -114.53], [33.71, -114.5], [34.27, -114.13],
  [34.45, -114.36], [34.71, -114.47], [35.13, -114.62], [35.61, -114.69],
  [36.13, -114.05],
];

function ringToPath(ring) {
  return ring.map((point, index) => {
    const [x, y] = lonLatToXY(Number(point[0]), Number(point[1]));
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ') + ' Z';
}

function geometryToPath(geometry) {
  if (geometry?.type === 'Polygon') return geometry.coordinates.map(ringToPath).join(' ');
  if (geometry?.type === 'MultiPolygon') {
    return geometry.coordinates.flatMap((polygon) => polygon.map(ringToPath)).join(' ');
  }
  return '';
}

function outlineToPath() {
  return AZ_OUTLINE.map((point, index) => {
    const [x, y] = lonLatToXY(point[1], point[0]);
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ') + ' Z';
}

function stateFill(state, theme) {
  const colors = {
    Current: { dark: 'rgba(77,208,199,0.48)', light: 'rgba(45,110,106,0.46)', sepia: 'rgba(112,154,103,0.48)' },
    Dated: { dark: 'rgba(245,200,66,0.42)', light: 'rgba(161,123,19,0.42)', sepia: 'rgba(201,161,61,0.46)' },
    Stale: { dark: 'rgba(255,154,60,0.42)', light: 'rgba(194,93,17,0.42)', sepia: 'rgba(214,133,56,0.48)' },
    'No data': { dark: 'rgba(118,132,148,0.24)', light: 'rgba(91,104,116,0.22)', sepia: 'rgba(132,116,91,0.28)' },
  };
  const palette = colors[state] || colors['No data'];
  return palette[theme] || palette.dark;
}

function ArizonaMap({ basins, selectedId, onSelect, hoverId, setHoverId, theme }) {
  const byId = React.useMemo(() => Object.fromEntries(basins.map((basin) => [basin.id, basin])), [basins]);
  const byOfficialName = React.useMemo(() => Object.fromEntries(basins.map((basin) => [basin.officialName, basin])), [basins]);
  const outline = React.useMemo(outlineToPath, []);
  const [officialRegions, setOfficialRegions] = React.useState([]);
  const [geometryState, setGeometryState] = React.useState('LOADING');

  React.useEffect(() => {
    const controller = new AbortController();
    fetch(ADWR_BASIN_GEOJSON_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`ADWR geometry request failed: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        const regions = (data.features || []).map((feature) => {
          const basin = byOfficialName[String(feature.properties?.BASIN_NAME || '').trim()];
          if (!basin) return null;
          const path = geometryToPath(feature.geometry);
          return path ? { id: basin.id, d: path } : null;
        }).filter(Boolean);
        if (regions.length !== basins.length) throw new Error(`Expected ${basins.length} official regions; received ${regions.length}`);
        setOfficialRegions(regions);
        setGeometryState('OFFICIAL · LOADED');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setGeometryState('OFFICIAL · UNAVAILABLE');
      });
    return () => controller.abort();
  }, [basins.length, byOfficialName]);

  const selected = selectedId ? byId[selectedId] : null;

  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--line-2)" strokeWidth="0.6" opacity="0.5" />
        </pattern>
        <clipPath id="az-clip"><path d={outline} /></clipPath>
      </defs>

      <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="var(--bg-1)" />
      <g opacity="0.6">
        {[32, 33, 34, 35, 36].map((lat) => {
          const [, y] = lonLatToXY(-112, lat);
          return <line key={`lat-${lat}`} x1="0" x2={MAP_W} y1={y} y2={y} stroke="var(--grid)" strokeWidth="0.6" strokeDasharray="2 4" />;
        })}
        {[-114, -113, -112, -111, -110].map((lon) => {
          const [x] = lonLatToXY(lon, 33);
          return <line key={`lon-${lon}`} x1={x} x2={x} y1="0" y2={MAP_H} stroke="var(--grid)" strokeWidth="0.6" strokeDasharray="2 4" />;
        })}
      </g>

      <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="url(#hatch)" opacity="0.25" />
      <path d={outline} fill="var(--bg-1)" />
      <path d={outline} fill="none" stroke="var(--line-2)" strokeWidth="1.5" />

      <g clipPath="url(#az-clip)">
        {officialRegions.map((region) => {
          const basin = byId[region.id];
          const selectedRegion = selectedId === region.id;
          const hovered = hoverId === region.id;
          return (
            <path
              key={region.id}
              className="map-region"
              data-selected={selectedRegion}
              d={region.d}
              fill={stateFill(basin.dataState, theme)}
              fillRule="evenodd"
              stroke={selectedRegion ? 'var(--accent)' : hovered ? 'var(--fg-1)' : 'var(--line-2)'}
              strokeWidth={selectedRegion ? 2.2 : hovered ? 1.4 : 0.9}
              opacity={selectedRegion || !selectedId ? 1 : hovered ? 0.95 : 0.8}
              onClick={() => onSelect(region.id)}
              onMouseEnter={() => setHoverId(region.id)}
              onMouseLeave={() => setHoverId(null)}
            />
          );
        })}
      </g>

      <g>
        {basins.map((basin) => {
          const [x, y] = lonLatToXY(basin.lon, basin.lat);
          const isSelected = selectedId === basin.id;
          return (
            <g key={basin.id} transform={`translate(${x},${y})`} onClick={() => onSelect(basin.id)} style={{ cursor: 'pointer' }}>
              <circle r={isSelected ? 5 : 2.8} fill="var(--bg)" stroke={isSelected ? 'var(--accent)' : 'var(--fg-1)'} strokeWidth={isSelected ? 2 : 1} />
              {isSelected && (
                <g pointerEvents="none">
                  <line x1="-22" x2="-8" y1="0" y2="0" stroke="var(--accent)" strokeWidth="1.2" />
                  <line x1="8" x2="22" y1="0" y2="0" stroke="var(--accent)" strokeWidth="1.2" />
                  <line x1="0" x2="0" y1="-22" y2="-8" stroke="var(--accent)" strokeWidth="1.2" />
                  <line x1="0" x2="0" y1="8" y2="22" stroke="var(--accent)" strokeWidth="1.2" />
                </g>
              )}
            </g>
          );
        })}
      </g>

      {selected && (() => {
        const [x, y] = lonLatToXY(selected.lon, selected.lat);
        const labelX = x > 700 ? x - 220 : x + 18;
        const labelY = y > 900 ? y - 60 : y + 16;
        const reading = selected.latestObservation
          ? `${selected.dataState.toUpperCase()} · ${Number(selected.latestObservation.depthToWaterFt).toFixed(1)} ft BLS`
          : 'NO VERIFIED USGS READING';
        return (
          <g transform={`translate(${labelX},${labelY})`} pointerEvents="none">
            <rect x="0" y="-12" width="220" height="40" fill="var(--bg)" stroke="var(--accent)" strokeWidth="1" />
            <text x="8" y="3" fill="var(--accent)" fontSize="13" fontWeight="700" fontFamily="JetBrains Mono">{selected.name.toUpperCase()}</text>
            <text x="8" y="20" fill="var(--fg-1)" fontSize="11" fontFamily="JetBrains Mono">{reading}</text>
          </g>
        );
      })()}

      <g transform="translate(40,80)">
        <circle r="22" fill="var(--bg-2)" stroke="var(--line-2)" />
        <text textAnchor="middle" y="-26" fontSize="10" fill="var(--fg-2)" fontFamily="JetBrains Mono">N</text>
        <line x1="0" y1="14" x2="0" y2="-14" stroke="var(--accent)" strokeWidth="1.2" />
        <polygon points="0,-16 -4,-8 4,-8" fill="var(--accent)" />
      </g>
      <text x={MAP_W - 28} y={MAP_H - 26} textAnchor="end" fontSize="10" fill={geometryState.includes('UNAVAILABLE') ? 'var(--high)' : 'var(--fg-2)'} fontFamily="JetBrains Mono">
        ADWR 2025 GEOJSON · {geometryState}
      </text>
    </svg>
  );
}

export { ArizonaMap };
