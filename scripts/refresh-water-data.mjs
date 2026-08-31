#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { BASIN_REGISTRY, ADWR_BASIN_GEOJSON_URL } from '../src/hydro/registry.js';

const OUTPUT_PATH = resolve('src/hydro/generated/groundwater-snapshot.json');
const WINDOW_START = '2010-01-01';
const PARAMETER_CODE = '72019';
const ADWR_GWSI_URL =
  'https://services.arcgis.com/C34zQ7veRS0V1t04/ArcGIS/rest/services/GWSI_Layers/FeatureServer/1/query?where=1%3D1&outFields=SITE_ID%2CLASTWLDATE&returnGeometry=true&outSR=4326&f=geojson';
const USGS_LATEST_URL =
  `https://api.waterdata.usgs.gov/ogcapi/v0/collections/latest-continuous/items?f=json&state_code=04&parameter_code=${PARAMETER_CODE}&limit=10000`;
const USGS_HISTORY_URL =
  `https://api.waterdata.usgs.gov/ogcapi/v0/collections/field-measurements/items?f=json&state_code=04&parameter_code=${PARAMETER_CODE}&datetime=${WINDOW_START}%2F..&limit=50000`;

const SOURCE_URLS = {
  adwrBasins: 'https://azwatermaps.azwater.gov/arcgis/rest/services/Groundwater_Basin_2025/FeatureServer/0',
  adwrGwsi: 'https://services.arcgis.com/C34zQ7veRS0V1t04/ArcGIS/rest/services/GWSI_Layers/FeatureServer',
  usgs: 'https://api.waterdata.usgs.gov/docs/ogcapi/',
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json, application/geo+json;q=0.9',
      'User-Agent': 'Arizona-Basin-Monitor-data-refresh/1.0 (+https://github.com/anitacigawet/Water_Dashboard)',
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} from ${url}`);
  const data = await response.json();
  if (data?.error) throw new Error(`Source error from ${url}`);
  return data;
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validPoint(feature) {
  const coordinates = feature?.geometry?.coordinates;
  return feature?.geometry?.type === 'Point' &&
    Array.isArray(coordinates) &&
    Number.isFinite(Number(coordinates[0])) &&
    Number.isFinite(Number(coordinates[1]));
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = Number(ring[i][0]);
    const yi = Number(ring[i][1]);
    const xj = Number(ring[j][0]);
    const yj = Number(ring[j][1]);
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, rings) {
  if (!rings?.length || !pointInRing(point, rings[0])) return false;
  return !rings.slice(1).some((hole) => pointInRing(point, hole));
}

function pointInGeometry(point, geometry) {
  if (geometry?.type === 'Polygon') return pointInPolygon(point, geometry.coordinates);
  if (geometry?.type === 'MultiPolygon') {
    return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
  }
  return false;
}

function allCoordinates(geometry) {
  if (geometry?.type === 'Polygon') return geometry.coordinates.flat();
  if (geometry?.type === 'MultiPolygon') return geometry.coordinates.flat(2);
  return [];
}

function geometryCenter(geometry) {
  const coordinates = allCoordinates(geometry);
  const longitudes = coordinates.map((point) => Number(point[0])).filter(Number.isFinite);
  const latitudes = coordinates.map((point) => Number(point[1])).filter(Number.isFinite);
  if (!longitudes.length || !latitudes.length) return null;
  return {
    lon: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    lat: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
  };
}

function isoTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function newestByTime(records) {
  return [...records].sort((a, b) => Date.parse(b.time) - Date.parse(a.time))[0] || null;
}

function dataState(time, checkedAt) {
  if (!time) return 'No data';
  const ageDays = (Date.parse(checkedAt) - Date.parse(time)) / 86_400_000;
  if (ageDays <= 30) return 'Current';
  if (ageDays <= 365) return 'Dated';
  return 'Stale';
}

function siteUrl(siteId) {
  return `https://waterdata.usgs.gov/monitoring-location/${encodeURIComponent(siteId)}/`;
}

function normalizeUsgsObservation(feature, kind) {
  if (!validPoint(feature)) return null;
  const properties = feature.properties || {};
  assert(
    properties.qualifier === null ||
      (Array.isArray(properties.qualifier) && properties.qualifier.every((qualifier) => typeof qualifier === 'string')),
    `USGS ${kind} record has an invalid qualifier value`,
  );
  const value = finiteNumber(properties.value);
  const time = isoTime(properties.time);
  if (value === null || !time || String(properties.parameter_code) !== PARAMETER_CODE) return null;
  const siteId = String(properties.monitoring_location_id || '').trim();
  if (!siteId) return null;
  return {
    siteId,
    time,
    value,
    unit: properties.unit_of_measure || 'ft',
    approvalStatus: properties.approval_status || null,
    qualifier: Array.isArray(properties.qualifier) ? properties.qualifier : [],
    sourceKind: kind,
    sourceUrl: siteUrl(siteId),
    coordinates: feature.geometry.coordinates.map(Number),
  };
}

function selectRepresentativeSeries(records) {
  const staticRecords = records.filter((record) =>
    record.qualifier.length === 0 || record.qualifier.includes('Static'),
  );
  const bySite = new Map();
  for (const record of staticRecords) {
    if (!bySite.has(record.siteId)) bySite.set(record.siteId, []);
    bySite.get(record.siteId).push(record);
  }

  const candidates = [...bySite.entries()]
    .map(([siteId, observations]) => {
      const deduped = [...new Map(observations.map((item) => [item.time, item])).values()]
        .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
      return { siteId, observations: deduped, newest: deduped.at(-1)?.time || '' };
    })
    .filter((candidate) => candidate.observations.length >= 2)
    .sort((a, b) => b.observations.length - a.observations.length || b.newest.localeCompare(a.newest));

  const selected = candidates[0];
  if (!selected) return null;
  return {
    siteId: selected.siteId,
    sourceUrl: siteUrl(selected.siteId),
    selectionMethod: 'USGS site with the most static or unqualified field measurements in this basin since 2010; not a basin-wide average',
    observations: selected.observations.map(({ time, value, unit, approvalStatus, qualifier }) => ({
      time,
      year: new Date(time).getUTCFullYear(),
      depthToWaterFt: value,
      unit,
      approvalStatus,
      qualifier,
    })),
  };
}

async function main() {
  const checkedAt = new Date().toISOString();
  const [basinGeoJson, adwrGwsi, usgsLatestRaw, usgsHistoryRaw] = await Promise.all([
    fetchJson(ADWR_BASIN_GEOJSON_URL),
    fetchJson(ADWR_GWSI_URL),
    fetchJson(USGS_LATEST_URL),
    fetchJson(USGS_HISTORY_URL),
  ]);

  assert(basinGeoJson.type === 'FeatureCollection', 'ADWR basin response is not GeoJSON');
  assert(Array.isArray(basinGeoJson.features), 'ADWR basin response has no features');
  assert(adwrGwsi.type === 'FeatureCollection', 'ADWR GWSI response is not GeoJSON');
  assert(usgsLatestRaw.type === 'FeatureCollection', 'USGS latest response is not GeoJSON');
  assert(usgsHistoryRaw.type === 'FeatureCollection', 'USGS history response is not GeoJSON');
  assert(!usgsLatestRaw.links?.some((link) => link.rel === 'next'), 'USGS latest response was truncated');
  assert(!usgsHistoryRaw.links?.some((link) => link.rel === 'next'), 'USGS history response was truncated');

  const officialByName = new Map(
    basinGeoJson.features.map((feature) => [String(feature.properties?.BASIN_NAME || '').trim(), feature]),
  );
  const officialFeatures = BASIN_REGISTRY.map((entry) => {
    const feature = officialByName.get(entry.officialName);
    assert(feature?.geometry, `No official ADWR geometry for ${entry.officialName}`);
    return { entry, feature };
  });

  const basinForPoint = (point) =>
    officialFeatures.find(({ feature }) => pointInGeometry(point, feature.geometry))?.entry.id || null;

  const latest = usgsLatestRaw.features
    .map((feature) => normalizeUsgsObservation(feature, 'continuous'))
    .filter(Boolean);
  const history = usgsHistoryRaw.features
    .map((feature) => normalizeUsgsObservation(feature, 'field'))
    .filter(Boolean);

  const latestByBasin = new Map(BASIN_REGISTRY.map((entry) => [entry.id, []]));
  const historyByBasin = new Map(BASIN_REGISTRY.map((entry) => [entry.id, []]));
  const adwrSitesByBasin = new Map(BASIN_REGISTRY.map((entry) => [entry.id, new Set()]));

  for (const record of latest) {
    const basinId = basinForPoint(record.coordinates);
    if (basinId) latestByBasin.get(basinId).push(record);
  }
  for (const record of history) {
    const basinId = basinForPoint(record.coordinates);
    if (basinId) historyByBasin.get(basinId).push(record);
  }
  for (const feature of adwrGwsi.features.filter(validPoint)) {
    const basinId = basinForPoint(feature.geometry.coordinates.map(Number));
    const siteId = String(feature.properties?.SITE_ID || '').trim();
    if (basinId && siteId) adwrSitesByBasin.get(basinId).add(siteId);
  }

  const basins = Object.fromEntries(BASIN_REGISTRY.map((entry) => {
    const officialFeature = officialByName.get(entry.officialName);
    const latestRecords = latestByBasin.get(entry.id);
    const historyRecords = historyByBasin.get(entry.id);
    const newestLatest = newestByTime(latestRecords);
    const newestField = newestByTime(historyRecords);
    const latestObservation = newestByTime([newestLatest, newestField].filter(Boolean));
    const representativeSeries = selectRepresentativeSeries(historyRecords);
    const center = geometryCenter(officialFeature.geometry) || { lat: entry.lat, lon: entry.lon };

    return [entry.id, {
      officialName: entry.officialName,
      center,
      dataState: dataState(latestObservation?.time, checkedAt),
      latestObservation: latestObservation ? {
        siteId: latestObservation.siteId,
        time: latestObservation.time,
        depthToWaterFt: latestObservation.value,
        unit: latestObservation.unit,
        approvalStatus: latestObservation.approvalStatus,
        sourceKind: latestObservation.sourceKind,
        sourceUrl: latestObservation.sourceUrl,
        meaning: 'Depth below land surface at one monitoring well; not a basin-wide average',
      } : null,
      representativeSeries,
      coverage: {
        adwrTelemetrySites: adwrSitesByBasin.get(entry.id).size,
        usgsLatestContinuousSites: new Set(latestRecords.map((record) => record.siteId)).size,
        usgsFieldMeasurementSitesSince2010: new Set(historyRecords.map((record) => record.siteId)).size,
      },
    }];
  }));

  const snapshot = {
    schemaVersion: 1,
    generatedAt: checkedAt,
    parameter: {
      code: PARAMETER_CODE,
      name: 'Depth below land surface',
      unit: 'ft',
    },
    monitoringSet: {
      count: BASIN_REGISTRY.length,
      statement: 'Curated Arizona monitoring set; not the total number of groundwater basins recognized by ADWR.',
    },
    dataPolicy: {
      rawAdwrDataStored: false,
      statement: 'Official ADWR geometry is used transiently for validation and spatial joins. The snapshot stores only derived centers and aggregate site counts. Displayed numeric observations come from USGS.',
    },
    sources: [
      {
        id: 'adwr-groundwater-basins',
        agency: 'Arizona Department of Water Resources',
        title: 'Groundwater Basin 2025',
        url: SOURCE_URLS.adwrBasins,
        checkedAt,
        recordsChecked: basinGeoJson.features.length,
        use: 'Official names, classifications, geometry validation, and spatial joins',
      },
      {
        id: 'adwr-gwsi-telemetry',
        agency: 'Arizona Department of Water Resources',
        title: 'Groundwater Site Inventory telemetry layer',
        url: SOURCE_URLS.adwrGwsi,
        checkedAt,
        recordsChecked: adwrGwsi.features.length,
        use: 'Aggregate monitoring-site coverage only; raw records are not stored',
      },
      {
        id: 'usgs-latest-continuous',
        agency: 'U.S. Geological Survey',
        title: 'Latest continuous groundwater depth observations',
        url: SOURCE_URLS.usgs,
        checkedAt,
        sourceResponseAt: isoTime(usgsLatestRaw.timeStamp),
        recordsChecked: latest.length,
        use: 'Latest well-level observations where available',
      },
      {
        id: 'usgs-field-measurements',
        agency: 'U.S. Geological Survey',
        title: `Groundwater field measurements since ${WINDOW_START}`,
        url: SOURCE_URLS.usgs,
        checkedAt,
        sourceResponseAt: isoTime(usgsHistoryRaw.timeStamp),
        recordsChecked: history.length,
        use: 'Single-well historical series; never aggregated as a basin trend',
      },
    ],
    basins,
  };

  assert(Object.keys(snapshot.basins).length === 23, 'Snapshot must contain exactly 23 monitored areas');
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  const states = Object.values(basins).reduce((counts, basin) => {
    counts[basin.dataState] = (counts[basin.dataState] || 0) + 1;
    return counts;
  }, {});
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`23 monitored areas; ${latest.length} USGS latest records; ${history.length} USGS field measurements`);
  console.log(`Observation state: ${JSON.stringify(states)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
