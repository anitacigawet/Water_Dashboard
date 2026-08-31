#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { snapshotsDiffer } from './lib/snapshot-semantics.mjs';

const [, , baselineArgument, candidateArgument] = process.argv;

if (!baselineArgument || !candidateArgument) {
  console.error('Usage: node scripts/compare-snapshots.mjs <baseline.json> <candidate.json>');
  process.exit(2);
}

async function readJson(pathArgument) {
  const path = resolve(process.cwd(), pathArgument);
  return JSON.parse(await readFile(path, 'utf8'));
}

const [baseline, candidate] = await Promise.all([
  readJson(baselineArgument),
  readJson(candidateArgument),
]);

const changed = snapshotsDiffer(baseline, candidate);
const result = changed ? 'changed' : 'unchanged';
console.log(`Semantic snapshot comparison: ${result}`);
