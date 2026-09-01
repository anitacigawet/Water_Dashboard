import snapshot from './generated/groundwater-snapshot.json';
import { BASIN_REGISTRY, REGISTRY_COUNTS } from './registry.js';

const unavailableCoverage = {
  adwrTelemetrySites: null,
  usgsLatestContinuousSites: null,
  usgsFieldMeasurementSitesSince2010: null,
};

export const BASINS = BASIN_REGISTRY.map((registryEntry) => {
  const observed = snapshot.basins[registryEntry.id] || {};
  const center = observed.center || { lat: registryEntry.lat, lon: registryEntry.lon };
  const representativeSeries = observed.representativeSeries || null;

  return {
    ...registryEntry,
    status: registryEntry.type,
    lat: center.lat,
    lon: center.lon,
    dataState: observed.dataState || 'No data',
    latestObservation: observed.latestObservation || null,
    representativeSeries,
    history: representativeSeries?.observations || [],
    coverage: observed.coverage || unavailableCoverage,
  };
});

export const SNAPSHOT_META = {
  generatedAt: snapshot.generatedAt,
  parameter: snapshot.parameter,
  monitoringSet: snapshot.monitoringSet,
  dataPolicy: snapshot.dataPolicy,
  registryCounts: REGISTRY_COUNTS,
};

export const SOURCE_LOG = snapshot.sources.map((source) => ({
  ...source,
  status: 'Checked',
}));
