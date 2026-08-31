#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import process from 'node:process';
import { snapshotsDiffer, stableJson } from './lib/snapshot-semantics.mjs';

const ROOT = process.cwd();
const ARTIFACT_DIR = resolve(ROOT, process.env.WATER_ARTIFACT_DIR || 'artifacts');
const BASELINE_PATH = resolve(ROOT, 'src/hydro/generated/groundwater-snapshot.json');
const CANDIDATE_PATH = resolve(ARTIFACT_DIR, 'groundwater-snapshot-candidate.json');
const HEALTH_PATH = resolve(ARTIFACT_DIR, 'primary-source-health.json');
const REPORT_PATH = resolve(ARTIFACT_DIR, 'daily-source-check.json');
const LOCK_PATH = resolve(ARTIFACT_DIR, 'daily-source-check.lock');

function publicPath(path) {
  return relative(ROOT, path).replaceAll('\\', '/');
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function runNode(script, args = [], environment = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [resolve(ROOT, script), ...args], {
      cwd: ROOT,
      env: { ...process.env, ...environment },
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', rejectRun);
    child.once('exit', (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${script} exited with code ${code}`));
    });
  });
}

function changedObjectKeys(baseline, candidate) {
  const keys = new Set([...Object.keys(baseline || {}), ...Object.keys(candidate || {})]);
  return [...keys].filter((key) => stableJson(baseline?.[key]) !== stableJson(candidate?.[key])).sort();
}

function narrativeReviewRequired(healthReport) {
  const narrative = healthReport.sources?.find(
    (source) => source.id === 'adwr-managed-area-designations',
  );
  if (!narrative || narrative.status === 'healthy') return false;
  const warnings = narrative.warnings || [];
  return warnings.some(
    (warning) => !warning.includes('HTTP 403 Forbidden'),
  );
}

async function writeReport(report) {
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function acquireLock() {
  try {
    await writeFile(
      LOCK_PATH,
      `${JSON.stringify({ pid: process.pid, startedAt })}\n`,
      { encoding: 'utf8', flag: 'wx' },
    );
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error(
        `Another daily source check is already running. If it is not, remove ${publicPath(LOCK_PATH)} and retry.`,
      );
    }
    throw error;
  }
}

const startedAt = new Date().toISOString();
await mkdir(ARTIFACT_DIR, { recursive: true });

try {
  await acquireLock();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

try {
  await runNode('scripts/check-primary-sources.mjs', [], {
    PRIMARY_SOURCE_REPORT_PATH: HEALTH_PATH,
  });
  await runNode('scripts/refresh-water-data.mjs', [], {
    WATER_SNAPSHOT_OUTPUT_PATH: CANDIDATE_PATH,
  });
  await runNode('scripts/validate-data.mjs', [CANDIDATE_PATH]);

  const [baselineText, candidateText, healthReport] = await Promise.all([
    readFile(BASELINE_PATH, 'utf8'),
    readFile(CANDIDATE_PATH, 'utf8'),
    readJson(HEALTH_PATH),
  ]);
  const baseline = JSON.parse(baselineText);
  const candidate = JSON.parse(candidateText);
  const changed = snapshotsDiffer(baseline, candidate);
  const requiresManualReview = narrativeReviewRequired(healthReport);
  const report = {
    schemaVersion: 1,
    project: 'Arizona Basin Monitor',
    status: changed ? 'changed' : 'unchanged',
    startedAt,
    completedAt: new Date().toISOString(),
    healthOverallStatus: healthReport.overallStatus,
    requiredSourceFailures: healthReport.summary?.failedChecks || 0,
    requiresManualReview,
    autoApplyEligible:
      changed &&
      healthReport.overallStatus !== 'failed' &&
      (healthReport.summary?.failedChecks || 0) === 0 &&
      !requiresManualReview,
    changedAreas: changedObjectKeys(baseline.basins, candidate.basins),
    changedSourceRecords: changedObjectKeys(
      Object.fromEntries((baseline.sources || []).map((source) => [source.id, source.recordsChecked])),
      Object.fromEntries((candidate.sources || []).map((source) => [source.id, source.recordsChecked])),
    ),
    baseline: publicPath(BASELINE_PATH),
    baselineSha256: digest(baselineText),
    candidate: publicPath(CANDIDATE_PATH),
    candidateSha256: digest(candidateText),
    healthReport: publicPath(HEALTH_PATH),
    note: 'Check-only timestamps are excluded from change detection. No tracked file, commit, push, or deployment was performed.',
  };
  await writeReport(report);
  console.log(`Daily source check: ${report.status}`);
  console.log(`- auto-apply eligible: ${report.autoApplyEligible}`);
  console.log(`- changed areas: ${report.changedAreas.length}`);
  console.log(`- report: ${REPORT_PATH}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  await writeReport({
    schemaVersion: 1,
    project: 'Arizona Basin Monitor',
    status: 'failed',
    startedAt,
    completedAt: new Date().toISOString(),
    error: message,
    autoApplyEligible: false,
    note: 'No tracked file, commit, push, or deployment was performed.',
  });
  console.error(`Daily source check failed: ${message}`);
  process.exitCode = 1;
} finally {
  await rm(LOCK_PATH, { force: true });
}
