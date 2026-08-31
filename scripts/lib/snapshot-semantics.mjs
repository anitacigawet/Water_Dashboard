export function semanticProjection(snapshot) {
  return {
    schemaVersion: snapshot.schemaVersion,
    parameter: snapshot.parameter,
    monitoringSet: snapshot.monitoringSet,
    dataPolicy: snapshot.dataPolicy,
    sources: (snapshot.sources || []).map(
      ({ checkedAt: _checkedAt, sourceResponseAt: _sourceResponseAt, ...source }) => source,
    ),
    basins: snapshot.basins,
  };
}

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function snapshotsDiffer(baseline, candidate) {
  return stableJson(semanticProjection(baseline)) !== stableJson(semanticProjection(candidate));
}
