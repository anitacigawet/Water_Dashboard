#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { copyFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const ARTIFACT_DIR = resolve(ROOT, process.env.WATER_ARTIFACT_DIR || 'artifacts');
const REPORT_PATH = resolve(ARTIFACT_DIR, 'daily-source-check.json');
const CANDIDATE_PATH = resolve(ARTIFACT_DIR, 'groundwater-snapshot-candidate.json');
const SNAPSHOT_PATH = resolve(ROOT, 'src/hydro/generated/groundwater-snapshot.json');

const [reportText, candidateText, snapshotText] = await Promise.all([
  readFile(REPORT_PATH, 'utf8'),
  readFile(CANDIDATE_PATH, 'utf8'),
  readFile(SNAPSHOT_PATH, 'utf8'),
]);
const report = JSON.parse(reportText);
const candidateSha256 = createHash('sha256').update(candidateText).digest('hex');
const baselineSha256 = createHash('sha256').update(snapshotText).digest('hex');

if (
  report.status !== 'changed' ||
  report.autoApplyEligible !== true ||
  report.requiresManualReview === true ||
  report.requiredSourceFailures !== 0 ||
  report.healthOverallStatus === 'failed'
) {
  throw new Error('The latest daily source check did not approve this candidate for automatic application.');
}
if (report.baselineSha256 !== baselineSha256) {
  throw new Error('The tracked snapshot changed after the source check; run the daily source check again.');
}
if (report.candidateSha256 !== candidateSha256) {
  throw new Error('The candidate changed after validation; run the daily source check again.');
}

await copyFile(CANDIDATE_PATH, SNAPSHOT_PATH);
console.log(`Applied validated snapshot candidate to ${SNAPSHOT_PATH}`);
