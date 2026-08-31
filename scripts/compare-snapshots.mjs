#!/usr/bin/env node

import { appendFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const [, , baselineArgument, candidateArgument] = process.argv;

if (!baselineArgument || !candidateArgument) {
  console.error('Usage: node scripts/compare-snapshots.mjs <baseline.json> <candidate.json>');
  process.exit(2);
}

async function readJson(pathArgument) {
  const path = resolve(process.cwd(), pathArgument);
  return JSON.parse(await readFile(path, 'utf8'));
}

function semanticProjection(snapshot) {
  return {
    schemaVersion: snapshot.schemaVersion,
    parameter: snapshot.parameter,
    monitoringSet: snapshot.monitoringSet,
    dataPolicy: snapshot.dataPolicy,
    sources: (snapshot.sources || []).map(({ checkedAt: _checkedAt, sourceResponseAt: _sourceResponseAt, ...source }) => source),
    basins: snapshot.basins,
  };
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const [baseline, candidate] = await Promise.all([
  readJson(baselineArgument),
  readJson(candidateArgument),
]);

const changed = stableJson(semanticProjection(baseline)) !== stableJson(semanticProjection(candidate));
const result = changed ? 'changed' : 'unchanged';
console.log(`Semantic snapshot comparison: ${result}`);

if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`, 'utf8');
}
