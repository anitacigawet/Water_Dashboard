#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { BASIN_REGISTRY } from '../src/hydro/registry.js';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  process.argv[2] || process.env.WATER_SNAPSHOT_PATH || 'src/hydro/generated/groundwater-snapshot.json',
);
const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertExactKeys(value, allowedKeys, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  const unexpected = Object.keys(value).filter((key) => !allowedKeys.includes(key));
  assert(unexpected.length === 0, `${label} contains unexpected fields: ${unexpected.join(', ')}`);
}

assertExactKeys(
  snapshot,
  ['schemaVersion', 'generatedAt', 'parameter', 'monitoringSet', 'dataPolicy', 'sources', 'basins'],
  'Snapshot',
);
assertExactKeys(snapshot.parameter, ['code', 'name', 'unit'], 'Snapshot parameter');
assertExactKeys(snapshot.monitoringSet, ['count', 'statement'], 'Snapshot monitoring set');
assertExactKeys(snapshot.dataPolicy, ['rawAdwrDataStored', 'statement'], 'Snapshot data policy');
assert(Array.isArray(snapshot.sources), 'Snapshot sources must be an array');
for (const [index, source] of snapshot.sources.entries()) {
  assertExactKeys(
    source,
    ['id', 'agency', 'title', 'url', 'checkedAt', 'sourceResponseAt', 'recordsChecked', 'use'],
    `Snapshot source ${index}`,
  );
}

assert(BASIN_REGISTRY.length === 23, `Expected 23 registry entries, found ${BASIN_REGISTRY.length}`);
assert(new Set(BASIN_REGISTRY.map((entry) => entry.id)).size === 23, 'Registry IDs must be unique');
assert(new Set(BASIN_REGISTRY.map((entry) => entry.officialName)).size === 23, 'Official ADWR names must be unique');

const typeCounts = BASIN_REGISTRY.reduce((counts, entry) => {
  counts[entry.type] = (counts[entry.type] || 0) + 1;
  return counts;
}, {});
assert(typeCounts.AMA === 8, `Expected 8 AMAs, found ${typeCounts.AMA || 0}`);
assert(typeCounts.INA === 3, `Expected 3 INAs, found ${typeCounts.INA || 0}`);
assert(typeCounts.Basin === 12, `Expected 12 additional basins, found ${typeCounts.Basin || 0}`);

assert(snapshot.schemaVersion === 1, 'Unsupported snapshot schema version');
assert(snapshot.monitoringSet?.count === 23, 'Snapshot monitoring-set count must be 23');
assert(snapshot.dataPolicy?.rawAdwrDataStored === false, 'Snapshot must not claim raw ADWR storage');
assert(Object.keys(snapshot.basins || {}).length === 23, 'Snapshot must contain 23 basin records');

for (const registryEntry of BASIN_REGISTRY) {
  const basin = snapshot.basins[registryEntry.id];
  assert(basin, `Snapshot is missing ${registryEntry.id}`);
  assertExactKeys(
    basin,
    ['officialName', 'center', 'dataState', 'latestObservation', 'representativeSeries', 'coverage'],
    `Basin ${registryEntry.id}`,
  );
  assertExactKeys(basin.center, ['lat', 'lon'], `Center for ${registryEntry.id}`);
  assert(basin.officialName === registryEntry.officialName, `Official-name mismatch for ${registryEntry.id}`);
  assert(['Current', 'Dated', 'Stale', 'No data'].includes(basin.dataState), `Invalid data state for ${registryEntry.id}`);
  assert(Number.isFinite(Number(basin.center?.lat)), `Invalid map latitude for ${registryEntry.id}`);
  assert(Number.isFinite(Number(basin.center?.lon)), `Invalid map longitude for ${registryEntry.id}`);
  assert(!('geometry' in basin), `Raw geometry must not be stored for ${registryEntry.id}`);

  const coverageFields = [
    'adwrTelemetrySites',
    'usgsLatestContinuousSites',
    'usgsFieldMeasurementSitesSince2010',
  ];
  assert(basin.coverage && typeof basin.coverage === 'object', `Missing coverage for ${registryEntry.id}`);
  assertExactKeys(basin.coverage, coverageFields, `Coverage for ${registryEntry.id}`);
  for (const field of coverageFields) {
    const value = basin.coverage[field];
    assert(Number.isInteger(value) && value >= 0, `Invalid coverage.${field} for ${registryEntry.id}`);
  }

  if (basin.latestObservation) {
    assertExactKeys(
      basin.latestObservation,
      ['siteId', 'time', 'depthToWaterFt', 'unit', 'approvalStatus', 'sourceKind', 'sourceUrl', 'meaning'],
      `Latest observation for ${registryEntry.id}`,
    );
    assert(Number.isFinite(Number(basin.latestObservation.depthToWaterFt)), `Invalid latest depth for ${registryEntry.id}`);
    assert(!Number.isNaN(Date.parse(basin.latestObservation.time)), `Invalid observation date for ${registryEntry.id}`);
    assert(String(basin.latestObservation.sourceUrl).startsWith('https://waterdata.usgs.gov/'), `Latest source must be USGS for ${registryEntry.id}`);
  }

  if (basin.representativeSeries) {
    assertExactKeys(
      basin.representativeSeries,
      ['siteId', 'sourceUrl', 'selectionMethod', 'observations'],
      `Representative series for ${registryEntry.id}`,
    );
    assert(basin.representativeSeries.observations.length >= 2, `Representative series is too short for ${registryEntry.id}`);
    for (const [index, observation] of basin.representativeSeries.observations.entries()) {
      assertExactKeys(
        observation,
        ['time', 'year', 'depthToWaterFt', 'unit', 'approvalStatus', 'qualifier'],
        `Historical observation ${index} for ${registryEntry.id}`,
      );
      assert(Number.isFinite(Number(observation.depthToWaterFt)), `Invalid historical depth for ${registryEntry.id}`);
      assert(!Number.isNaN(Date.parse(observation.time)), `Invalid historical date for ${registryEntry.id}`);
      assert(
        Array.isArray(observation.qualifier) && observation.qualifier.every((qualifier) => typeof qualifier === 'string'),
        `Invalid historical qualifier for ${registryEntry.id}`,
      );
    }
  }
}

console.log('Data validation passed');
console.log(`- file: ${SNAPSHOT_PATH}`);
console.log('- registry: 23 unique monitored areas (8 AMA, 3 INA, 12 Basin)');
console.log('- snapshot: 23 records, valid source-linked observations, no raw ADWR geometry');
