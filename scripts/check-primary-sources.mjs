#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const REPORT_SCHEMA_VERSION = 1;
const DEFAULT_TIMEOUT_MS = 25_000;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const CHECK_STARTED_AT = new Date().toISOString();
const REPORT_PATH = resolve(
  process.cwd(),
  process.env.PRIMARY_SOURCE_REPORT_PATH || 'artifacts/primary-source-health.json',
);

const USER_AGENT =
  'Arizona-Basin-Monitor-primary-source-health/1.0 (+https://github.com/anitacigawet/Water_Dashboard)';

const SOURCES = {
  adwrBasins: {
    id: 'adwr-groundwater-basins',
    agency: 'Arizona Department of Water Resources',
    layerUrl:
      'https://azwatermaps.azwater.gov/arcgis/rest/services/Groundwater_Basin_2025/FeatureServer/0',
    expectedLayerName: 'Groundwater_Basin',
    expectedGeometryType: 'esriGeometryPolygon',
    fields: ['BASIN_NAME', 'NAME_ABBR', 'BASIN_NAME_GWSI'],
    requiredTextField: 'BASIN_NAME',
    minimumRecordCount: 40,
    expectedManagedAreas: [
      ['PHOENIX AMA', 'PHX'],
      ['PINAL AMA', 'PIN'],
      ['PRESCOTT AMA', 'PRE'],
      ['TUCSON AMA', 'TUC'],
      ['SANTA CRUZ AMA', 'SCA'],
      ['DOUGLAS AMA', 'DOU'],
      ['WILLCOX AMA', 'WIL'],
      ['RANEGRAS PLAIN AMA', 'RAN'],
      ['HARQUAHALA INA', 'HAR'],
      ['JOSEPH CITY INA', 'JCI'],
      ['HUALAPAI VALLEY INA', 'HUA'],
    ],
  },
  adwrSubbasins: {
    id: 'adwr-groundwater-subbasins',
    agency: 'Arizona Department of Water Resources',
    layerUrl:
      'https://services.arcgis.com/C34zQ7veRS0V1t04/ArcGIS/rest/services/ADWR_Groundwater_Subbasin_2024/FeatureServer/0',
    expectedLayerName: 'Groundwater_Subbasin',
    expectedGeometryType: 'esriGeometryPolygon',
    fields: [
      'AMA_CODE',
      'SUBBASIN_CODE',
      'SUBBASIN_NAME',
      'NAME_ABBR',
      'SUBBASIN_NAME_GWSI',
    ],
    where: "SUBBASIN_NAME IS NOT NULL AND SUBBASIN_NAME <> ''",
    requiredTextField: 'SUBBASIN_NAME',
    minimumRecordCount: 60,
  },
  adwrGwsi: {
    id: 'adwr-groundwater-site-inventory',
    agency: 'Arizona Department of Water Resources',
    serviceUrl:
      'https://services.arcgis.com/C34zQ7veRS0V1t04/ArcGIS/rest/services/GWSI_Layers/FeatureServer',
    expectedLayers: [
      { id: 0, name: 'Drought_Index_Sites' },
      { id: 1, name: 'ADWR_Telemetry_Sites' },
      { id: 2, name: 'ADWR_Non-Telemetry_Sites' },
      { id: 3, name: 'Inactive_ADWR_Automated_Sites' },
      { id: 4, name: 'Non-ADWR_Automated_Sites' },
      { id: 5, name: 'Active_Index_Sites' },
      { id: 6, name: 'Inactive_Index_Sites' },
      { id: 7, name: 'ADWR_GWSI_Sites' },
    ],
    checkedLayers: [1, 2, 5, 7],
    requiredFields: [
      'OBJECTID',
      'SITE_ID',
      'WELL_TYPE',
      'WL_DTW',
      'WL_ELEV',
      'LASTWLDATE',
    ],
  },
  usgs: {
    id: 'usgs-water-data-ogc',
    agency: 'U.S. Geological Survey',
    apiRoot: 'https://api.waterdata.usgs.gov/ogcapi/v0',
    requiredCollections: [
      'field-measurements',
      'latest-continuous',
      'monitoring-locations',
      'time-series-metadata',
    ],
  },
  adwrDesignations: {
    id: 'adwr-managed-area-designations',
    agency: 'Arizona Department of Water Resources',
    required: false,
    pages: [
      {
        id: 'ama-overview',
        url: 'https://www.azwater.gov/ama/active-management-area-overview',
        requiredPhrases: [
          'Currently there are eight AMAs (Prescott, Phoenix, Pinal, Tucson, Santa Cruz, Douglas, Willcox, Ranegras Plain)',
        ],
      },
      {
        id: 'douglas-ama',
        url: 'https://www.azwater.gov/ama/douglas-ama',
        requiredPhrases: ['Douglas AMA', 'The AMA was designated on December 1, 2022'],
      },
      {
        id: 'willcox-ama',
        url: 'https://www.azwater.gov/ama/willcox-ama',
        requiredPhrases: [
          "Director's Order Creating the Willcox AMA",
          'The date of designation, as defined in A.R.S. § 45-402, is January 8, 2025',
          'PROHIBITION ON IRRIGATION OF NEW ACRES IS PERMANENTLY IN EFFECT',
        ],
      },
      {
        id: 'ranegras-plain-ama',
        url: 'https://www.azwater.gov/ranegras-plain-active-management-area',
        requiredPhrases: [
          "Director's Order Creating the Ranegras Plain AMA",
          'On January 9th , 2026, the Director issued a Findings, Decision and Order',
          'Prohibition On Irrigation Of New Acres Is Permanently In Effect',
        ],
      },
      {
        id: 'harquahala-ina',
        url: 'https://www.azwater.gov/ama/ina/harquahala-ina',
        requiredPhrases: ['Harquahala INA', 'The Harquahala INA was subsequently created in 1981'],
      },
      {
        id: 'joseph-city-ina',
        url: 'https://www.azwater.gov/ama/ina/joseph-city-ina',
        requiredPhrases: ['Joseph City INA', 'Douglas INA (now the Douglas AMA)'],
      },
      {
        id: 'hualapai-valley-ina',
        url: 'https://www.azwater.gov/ama/ina/hualapai-ina',
        requiredPhrases: [
          'Court of Appeals has stayed',
          'The stay will therefore remain in place while the special action remains pending',
          "Director's Final Order Designating the Hualapai Valley INA",
          'related statutory irrigation restrictions currently remain in place',
        ],
        status: 'INA_IN_FORCE_PENDING_APPEAL',
      },
    ],
  },
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function toIsoDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? new Date(value) : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function roundDuration(milliseconds) {
  return Math.round(milliseconds * 10) / 10;
}

function publicError(error) {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
    };
  }
  return { name: 'Error', message: String(error) };
}

async function fetchJson(url, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json, application/geo+json;q=0.9',
        'Cache-Control': 'no-cache',
        'User-Agent': USER_AGENT,
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
    }

    const text = await response.text();
    const responseBytes = Buffer.byteLength(text, 'utf8');
    if (responseBytes > MAX_RESPONSE_BYTES) {
      throw new Error(`Response exceeded ${MAX_RESPONSE_BYTES} bytes`);
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Source returned invalid JSON');
    }

    if (isObject(data) && isObject(data.error)) {
      const code = data.error.code ? ` ${data.error.code}` : '';
      throw new Error(`ArcGIS source error${code}`);
    }

    return {
      data,
      checkedAt: new Date().toISOString(),
      durationMs: roundDuration(performance.now() - started),
      httpResponseAt: toIsoDate(response.headers.get('date')),
      responseBytes,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs} ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
    const text = await response.text();
    const responseBytes = Buffer.byteLength(text, 'utf8');
    if (responseBytes > MAX_RESPONSE_BYTES) throw new Error(`Response exceeded ${MAX_RESPONSE_BYTES} bytes`);
    return {
      text,
      checkedAt: new Date().toISOString(),
      durationMs: roundDuration(performance.now() - started),
      httpResponseAt: toIsoDate(response.headers.get('date')),
      responseBytes,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs} ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizePageText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_match, code) =>
      String.fromCodePoint(code.toLowerCase().startsWith('x') ? Number.parseInt(code.slice(1), 16) : Number.parseInt(code, 10)),
    )
    .replace(/&nbsp;|&ensp;|&emsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function validateArcGisLayerMetadata(data, source) {
  assert(isObject(data), 'Layer metadata must be an object');
  assert(data.name === source.expectedLayerName, `Unexpected layer name: ${data.name}`);
  assert(
    data.geometryType === source.expectedGeometryType,
    `Unexpected geometry type: ${data.geometryType}`,
  );
  assert(Array.isArray(data.fields), 'Layer metadata is missing fields');

  const availableFields = new Set(data.fields.map((field) => field?.name));
  for (const field of source.fields) {
    assert(availableFields.has(field), `Layer metadata is missing field ${field}`);
  }

  const queryFormats = String(data.supportedQueryFormats || '').toLowerCase();
  assert(queryFormats.includes('json'), 'Layer does not advertise JSON query support');
}

function validateArcGisFeatureResponse(data, source) {
  assert(isObject(data), 'Feature response must be an object');
  assert(Array.isArray(data.features), 'Feature response is missing features');
  assert(
    data.features.length >= source.minimumRecordCount,
    `Feature count ${data.features.length} is below the safety floor ${source.minimumRecordCount}`,
  );
  assert(data.exceededTransferLimit !== true, 'Feature response was truncated');

  for (const [index, feature] of data.features.entries()) {
    assert(isObject(feature?.attributes), `Feature ${index} is missing attributes`);
    for (const field of source.fields) {
      assert(hasOwn(feature.attributes, field), `Feature ${index} is missing ${field}`);
    }
    const requiredText = feature.attributes[source.requiredTextField];
    assert(
      typeof requiredText === 'string' && requiredText.trim().length > 0,
      `Feature ${index} has an invalid ${source.requiredTextField}`,
    );
  }

  return data.features.length;
}

function validateManagedAreaSet(features, expectedManagedAreas) {
  if (!expectedManagedAreas) return null;
  const actual = features
    .map((feature) => [
      String(feature.attributes.BASIN_NAME || '').trim(),
      String(feature.attributes.NAME_ABBR || '').trim(),
    ])
    .filter(([name]) => name.endsWith(' AMA') || name.endsWith(' INA'));
  const actualKeys = actual.map(([name, abbreviation]) => `${name}|${abbreviation}`);
  const expectedKeys = expectedManagedAreas.map(([name, abbreviation]) => `${name}|${abbreviation}`);
  assert(new Set(actualKeys).size === actualKeys.length, 'Managed-area source contains duplicate names');
  assert(actualKeys.length === expectedKeys.length, `Expected ${expectedKeys.length} managed areas, found ${actualKeys.length}`);
  for (const expected of expectedKeys) {
    assert(actualKeys.includes(expected), `Managed-area source is missing or reclassified: ${expected}`);
  }
  return { count: actual.length, amaCount: actual.filter(([name]) => name.endsWith(' AMA')).length, inaCount: actual.filter(([name]) => name.endsWith(' INA')).length };
}

async function checkArcGisPolygonSource(source) {
  const metadataUrl = `${source.layerUrl}?f=json`;
  const query = new URL(`${source.layerUrl}/query`);
  query.search = new URLSearchParams({
    where: source.where || '1=1',
    outFields: source.fields.join(','),
    returnGeometry: 'false',
    f: 'json',
  }).toString();

  const [metadataResponse, featureResponse] = await Promise.all([
    fetchJson(metadataUrl),
    fetchJson(query.toString()),
  ]);

  validateArcGisLayerMetadata(metadataResponse.data, source);
  const recordCount = validateArcGisFeatureResponse(featureResponse.data, source);
  const managedAreaSet = validateManagedAreaSet(featureResponse.data.features, source.expectedManagedAreas);
  const sourceReportedUpdatedAt = toIsoDate(
    metadataResponse.data.editingInfo?.dataLastEditDate,
  );
  const warnings = sourceReportedUpdatedAt
    ? []
    : ['The source does not expose a data-last-edited timestamp.'];

  return {
    id: source.id,
    agency: source.agency,
    required: true,
    status: warnings.length > 0 ? 'warning' : 'healthy',
    endpoint: source.layerUrl,
    checkedAt: featureResponse.checkedAt,
    httpResponseAt: featureResponse.httpResponseAt,
    sourceReportedUpdatedAt,
    latestObservationAt: null,
    durationMs: roundDuration(
      metadataResponse.durationMs + featureResponse.durationMs,
    ),
    recordCount,
    managedAreaSet,
    schemaValidated: source.fields,
    warnings,
  };
}

async function checkAdwrDesignationPages(source) {
  const pages = [];
  for (const page of source.pages) {
    let response;
    try {
      response = await fetchText(page.url);
    } catch (error) {
      throw new Error(`${page.id}: ${publicError(error).message}`);
    }
    const text = normalizePageText(response.text);
    for (const phrase of page.requiredPhrases) {
      assert(text.includes(normalizePageText(phrase)), `${page.id} is missing required legal-status text: ${phrase}`);
    }

    pages.push({
      id: page.id,
      endpoint: page.url,
      checkedAt: response.checkedAt,
      httpResponseAt: response.httpResponseAt,
      durationMs: response.durationMs,
      requiredPhrasesValidated: page.requiredPhrases.length,
      status: page.status || null,
    });
  }

  return {
    id: source.id,
    agency: source.agency,
    required: true,
    status: 'healthy',
    endpoint: source.pages[0].url,
    checkedAt: pages.map((page) => page.checkedAt).sort().at(-1),
    httpResponseAt: pages.map((page) => page.httpResponseAt).filter(Boolean).sort().at(-1) || null,
    sourceReportedUpdatedAt: null,
    latestObservationAt: null,
    durationMs: roundDuration(pages.reduce((sum, page) => sum + page.durationMs, 0)),
    pages,
    warnings: [],
  };
}

function validateGwsiService(data, source) {
  assert(isObject(data), 'GWSI service metadata must be an object');
  assert(Array.isArray(data.layers), 'GWSI service metadata is missing layers');
  const actual = new Map(data.layers.map((layer) => [layer?.id, layer?.name]));

  for (const layer of source.expectedLayers) {
    assert(actual.get(layer.id) === layer.name, `Missing or renamed GWSI layer ${layer.id}`);
  }
}

function buildGwsiStatsUrl(layerUrl) {
  const outStatistics = JSON.stringify([
    {
      statisticType: 'count',
      onStatisticField: 'OBJECTID',
      outStatisticFieldName: 'record_count',
    },
    {
      statisticType: 'max',
      onStatisticField: 'LASTWLDATE',
      outStatisticFieldName: 'latest_observation_ms',
    },
  ]);
  const url = new URL(`${layerUrl}/query`);
  url.search = new URLSearchParams({
    where: '1=1',
    outStatistics,
    returnGeometry: 'false',
    f: 'json',
  }).toString();
  return url.toString();
}

async function checkGwsiLayer(source, layerId, expectedName) {
  const layerUrl = `${source.serviceUrl}/${layerId}`;
  const [metadataResponse, statsResponse] = await Promise.all([
    fetchJson(`${layerUrl}?f=json`),
    fetchJson(buildGwsiStatsUrl(layerUrl)),
  ]);

  const metadata = metadataResponse.data;
  assert(isObject(metadata), `GWSI layer ${layerId} metadata must be an object`);
  assert(metadata.name === expectedName, `Unexpected GWSI layer ${layerId} name`);
  assert(metadata.geometryType === 'esriGeometryPoint', `GWSI layer ${layerId} is not points`);
  assert(Array.isArray(metadata.fields), `GWSI layer ${layerId} is missing fields`);

  const availableFields = new Set(metadata.fields.map((field) => field?.name));
  for (const field of source.requiredFields) {
    assert(availableFields.has(field), `GWSI layer ${layerId} is missing ${field}`);
  }

  const stats = statsResponse.data;
  assert(Array.isArray(stats?.features), `GWSI layer ${layerId} stats are missing features`);
  assert(stats.features.length === 1, `GWSI layer ${layerId} stats returned an unexpected shape`);
  const attributes = stats.features[0]?.attributes;
  assert(isObject(attributes), `GWSI layer ${layerId} stats are missing attributes`);
  assert(
    Number.isFinite(Number(attributes.record_count)) && Number(attributes.record_count) >= 0,
    `GWSI layer ${layerId} returned an invalid record count`,
  );

  const latestObservationAt = toIsoDate(attributes.latest_observation_ms);
  const warnings = [];
  if (Number(attributes.record_count) > 0 && !latestObservationAt) {
    warnings.push('Records exist, but the source returned no valid latest observation date.');
  }

  return {
    layerId,
    name: expectedName,
    endpoint: layerUrl,
    checkedAt: statsResponse.checkedAt,
    httpResponseAt: statsResponse.httpResponseAt,
    sourceReportedUpdatedAt: toIsoDate(metadata.editingInfo?.dataLastEditDate),
    latestObservationAt,
    recordCount: Number(attributes.record_count),
    durationMs: roundDuration(metadataResponse.durationMs + statsResponse.durationMs),
    warnings,
  };
}

async function checkGwsiSource(source) {
  const serviceResponse = await fetchJson(`${source.serviceUrl}?f=json`);
  validateGwsiService(serviceResponse.data, source);
  const namesById = new Map(source.expectedLayers.map((layer) => [layer.id, layer.name]));

  const layers = await Promise.all(
    source.checkedLayers.map((layerId) =>
      checkGwsiLayer(source, layerId, namesById.get(layerId)),
    ),
  );
  const warnings = layers.flatMap((layer) =>
    layer.warnings.map((warning) => `${layer.name}: ${warning}`),
  );
  const sourceReportedUpdatedAt =
    layers
      .map((layer) => layer.sourceReportedUpdatedAt)
      .filter(Boolean)
      .sort()
      .at(-1) || null;

  return {
    id: source.id,
    agency: source.agency,
    required: true,
    status: warnings.length > 0 ? 'warning' : 'healthy',
    endpoint: source.serviceUrl,
    checkedAt: new Date().toISOString(),
    httpResponseAt: serviceResponse.httpResponseAt,
    sourceReportedUpdatedAt,
    latestObservationAt: layers
      .map((layer) => layer.latestObservationAt)
      .filter(Boolean)
      .sort()
      .at(-1) || null,
    durationMs: roundDuration(
      serviceResponse.durationMs + layers.reduce((sum, layer) => sum + layer.durationMs, 0),
    ),
    schemaValidated: source.requiredFields,
    layers: layers.map(({ warnings: _warnings, ...layer }) => layer),
    warnings,
  };
}

function validateUsgsCollections(data, requiredCollections) {
  assert(isObject(data), 'USGS collections response must be an object');
  assert(Array.isArray(data.collections), 'USGS response is missing collections');
  const available = new Set(data.collections.map((collection) => collection?.id));
  for (const collection of requiredCollections) {
    assert(available.has(collection), `USGS collection is missing: ${collection}`);
  }
}

function validateUsgsQueryables(data, expectedFields, collectionName) {
  assert(isObject(data), `${collectionName} queryables must be an object`);
  assert(isObject(data.properties), `${collectionName} queryables are missing properties`);
  for (const field of expectedFields) {
    assert(hasOwn(data.properties, field), `${collectionName} queryables are missing ${field}`);
  }
}

function validateUsgsFeatureCollection(data, expectedFields, { allowEmpty = false } = {}) {
  assert(isObject(data), 'USGS feature response must be an object');
  assert(data.type === 'FeatureCollection', 'USGS response is not a FeatureCollection');
  assert(Array.isArray(data.features), 'USGS response is missing features');
  if (!allowEmpty) assert(data.features.length > 0, 'USGS response returned no observations');

  for (const [index, feature] of data.features.entries()) {
    assert(isObject(feature?.properties), `USGS feature ${index} is missing properties`);
    for (const field of expectedFields) {
      assert(hasOwn(feature.properties, field), `USGS feature ${index} is missing ${field}`);
    }
    assert(
      String(feature.properties.parameter_code) === '72019',
      `USGS feature ${index} returned an unexpected parameter code`,
    );
    const qualifier = feature.properties.qualifier;
    assert(
      qualifier === null ||
        (Array.isArray(qualifier) && qualifier.every((item) => typeof item === 'string')),
      `USGS feature ${index} has an invalid qualifier value`,
    );
    assert(toIsoDate(feature.properties.time), `USGS feature ${index} has an invalid observation time`);
  }

  if (hasOwn(data, 'numberReturned') && data.numberReturned !== null) {
    assert(
      Number(data.numberReturned) === data.features.length,
      'USGS numberReturned does not match the feature count',
    );
  }
}

function summarizeUsgsObservations(features, checkedAt) {
  const observationTimes = features
    .map((feature) => toIsoDate(feature.properties.time))
    .filter(Boolean)
    .sort();
  const modifiedTimes = features
    .map((feature) => toIsoDate(feature.properties.last_modified))
    .filter(Boolean)
    .sort();
  const checkedMs = Date.parse(checkedAt);
  const agesInDays = observationTimes.map(
    (time) => (checkedMs - Date.parse(time)) / (24 * 60 * 60 * 1000),
  );

  return {
    recordCount: features.length,
    oldestObservationAt: observationTimes.at(0) || null,
    latestObservationAt: observationTimes.at(-1) || null,
    latestModifiedAt: modifiedTimes.at(-1) || null,
    observationsWithin1Day: agesInDays.filter((days) => days >= 0 && days <= 1).length,
    observationsWithin30Days: agesInDays.filter((days) => days >= 0 && days <= 30).length,
    observationsWithin365Days: agesInDays.filter((days) => days >= 0 && days <= 365).length,
    observationsOlderThan365Days: agesInDays.filter((days) => days > 365).length,
  };
}

function hasNextPage(data) {
  return Array.isArray(data?.links) && data.links.some((link) => link?.rel === 'next');
}

async function checkUsgsSource(source) {
  const collectionsUrl = `${source.apiRoot}/collections?f=json`;
  const fieldCollection = 'field-measurements';
  const latestCollection = 'latest-continuous';
  const commonFields = [
    'monitoring_location_id',
    'parameter_code',
    'time',
    'value',
    'unit_of_measure',
    'approval_status',
    'qualifier',
    'last_modified',
  ];

  const fieldQueryablesUrl = `${source.apiRoot}/collections/${fieldCollection}/queryables?f=json`;
  const latestQueryablesUrl = `${source.apiRoot}/collections/${latestCollection}/queryables?f=json`;
  const latestUrl = new URL(`${source.apiRoot}/collections/${latestCollection}/items`);
  latestUrl.search = new URLSearchParams({
    f: 'json',
    state_code: '04',
    parameter_code: '72019',
    limit: '1000',
  }).toString();
  const recentFieldUrl = new URL(`${source.apiRoot}/collections/${fieldCollection}/items`);
  const recentEnd = new Date();
  const recentStart = new Date(recentEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
  recentFieldUrl.search = new URLSearchParams({
    f: 'json',
    state_code: '04',
    parameter_code: '72019',
    datetime: `${recentStart.toISOString()}/${recentEnd.toISOString()}`,
    limit: '1000',
  }).toString();

  const [collections, fieldQueryables, latestQueryables, latest, recentField] =
    await Promise.all([
      fetchJson(collectionsUrl),
      fetchJson(fieldQueryablesUrl),
      fetchJson(latestQueryablesUrl),
      fetchJson(latestUrl.toString()),
      fetchJson(recentFieldUrl.toString()),
    ]);

  validateUsgsCollections(collections.data, source.requiredCollections);
  validateUsgsQueryables(fieldQueryables.data, commonFields, fieldCollection);
  validateUsgsQueryables(latestQueryables.data, commonFields, latestCollection);
  validateUsgsFeatureCollection(latest.data, commonFields);
  validateUsgsFeatureCollection(recentField.data, commonFields, { allowEmpty: true });

  const latestSummary = summarizeUsgsObservations(latest.data.features, latest.checkedAt);
  const recentFieldSummary = summarizeUsgsObservations(
    recentField.data.features,
    recentField.checkedAt,
  );
  const warnings = [];
  if (hasNextPage(latest.data)) {
    warnings.push('Latest-continuous results were truncated at 1,000 records.');
  }
  if (hasNextPage(recentField.data)) {
    warnings.push('Recent field-measurement results were truncated at 1,000 records.');
  }
  if (recentFieldSummary.recordCount === 0) {
    warnings.push('No Arizona 72019 field measurements were published in the last 30 days.');
  }

  return {
    id: source.id,
    agency: source.agency,
    required: true,
    status: warnings.length > 0 ? 'warning' : 'healthy',
    endpoint: source.apiRoot,
    checkedAt: new Date().toISOString(),
    httpResponseAt: collections.httpResponseAt,
    sourceReportedUpdatedAt: null,
    latestObservationAt: latestSummary.latestObservationAt,
    durationMs: roundDuration(
      collections.durationMs +
        fieldQueryables.durationMs +
        latestQueryables.durationMs +
        latest.durationMs +
        recentField.durationMs,
    ),
    schemaValidated: commonFields,
    collectionsValidated: source.requiredCollections,
    latestContinuousArizonaDepthToWater: latestSummary,
    fieldMeasurementsArizonaDepthToWaterLast30Days: recentFieldSummary,
    sourceResponseAt: toIsoDate(latest.data.timeStamp),
    warnings,
  };
}

async function runRequiredCheck(source, check) {
  const started = performance.now();
  const required = source.required !== false;
  try {
    return { ...(await check(source)), required };
  } catch (error) {
    const publicFailure = publicError(error);
    return {
      id: source.id,
      agency: source.agency,
      required,
      status: required ? 'failed' : 'warning',
      endpoint: source.layerUrl || source.serviceUrl || source.apiRoot || source.pages?.[0]?.url,
      checkedAt: new Date().toISOString(),
      httpResponseAt: null,
      sourceReportedUpdatedAt: null,
      latestObservationAt: null,
      durationMs: roundDuration(performance.now() - started),
      warnings: required ? [] : [`Optional narrative status check unavailable: ${publicFailure.message}`],
      error: required ? publicFailure : undefined,
    };
  }
}

async function writeReport(report) {
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function main() {
  const checks = await Promise.all([
    runRequiredCheck(SOURCES.adwrBasins, checkArcGisPolygonSource),
    runRequiredCheck(SOURCES.adwrSubbasins, checkArcGisPolygonSource),
    runRequiredCheck(SOURCES.adwrGwsi, checkGwsiSource),
    runRequiredCheck(SOURCES.usgs, checkUsgsSource),
    runRequiredCheck(SOURCES.adwrDesignations, checkAdwrDesignationPages),
  ]);

  const failedChecks = checks.filter((check) => check.status === 'failed');
  const warningChecks = checks.filter((check) => check.status === 'warning');
  const completedAt = new Date().toISOString();
  const overallStatus =
    failedChecks.length > 0 ? 'failed' : warningChecks.length > 0 ? 'warning' : 'healthy';
  const report = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    project: 'Arizona Basin Monitor',
    purpose: 'Availability and schema health for primary groundwater data sources',
    overallStatus,
    checkWindow: {
      startedAt: CHECK_STARTED_AT,
      completedAt,
    },
    dataPolicy: {
      rawAdwrDataWritten: false,
      statement:
        'This report contains only source health metadata, aggregate counts, timestamps, and schema results. Raw ADWR records and geometries are not persisted or uploaded.',
    },
    timeSemantics: {
      checkedAt: 'When this checker successfully received and validated a source response.',
      sourceReportedUpdatedAt: 'The source metadata timestamp, when the source provides one.',
      latestObservationAt: 'The newest observation timestamp found; it is not the check time.',
    },
    summary: {
      requiredChecks: checks.filter((check) => check.required).length,
      optionalChecks: checks.filter((check) => !check.required).length,
      healthyChecks: checks.filter((check) => check.status === 'healthy').length,
      warningChecks: warningChecks.length,
      failedChecks: failedChecks.length,
    },
    sources: checks,
  };

  await writeReport(report);

  console.log(`Primary-source health: ${overallStatus}`);
  for (const check of checks) {
    const observation = check.latestObservationAt
      ? `; latest observation ${check.latestObservationAt}`
      : '';
    console.log(`- ${check.id}: ${check.status}; checked ${check.checkedAt}${observation}`);
    if (check.error) console.error(`  ${check.error.name}: ${check.error.message}`);
    for (const warning of check.warnings || []) console.warn(`  Warning: ${warning}`);
  }
  console.log(`Health report: ${REPORT_PATH}`);

  if (failedChecks.length > 0) {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  const completedAt = new Date().toISOString();
  const failureReport = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    project: 'Arizona Basin Monitor',
    purpose: 'Availability and schema health for primary groundwater data sources',
    overallStatus: 'failed',
    checkWindow: { startedAt: CHECK_STARTED_AT, completedAt },
    dataPolicy: {
      rawAdwrDataWritten: false,
      statement: 'No raw ADWR records or geometries are written by this checker.',
    },
    fatalError: publicError(error),
    sources: [],
  };

  try {
    await writeReport(failureReport);
  } catch (writeError) {
    console.error(`Could not write failure report: ${publicError(writeError).message}`);
  }
  console.error(`Primary-source checker failed: ${publicError(error).message}`);
  process.exitCode = 1;
});
