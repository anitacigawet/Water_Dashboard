#!/usr/bin/env node

import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

const baseUrl = process.env.CONSOLE_BASE_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  acceptDownloads: true,
  colorScheme: 'dark',
});
const page = await context.newPage();
const pageErrors = [];
const requestFailures = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('requestfailed', (request) => {
  const errorText = request.failure()?.errorText;
  const strictModeAbort = errorText === 'net::ERR_ABORTED' && request.url().includes('Groundwater_Basin_2025');
  if (!strictModeAbort) requestFailures.push(`${request.method()} ${request.url()} · ${errorText}`);
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByText('23 MONITORED', { exact: false }).first().waitFor();
  await page.getByText('ADWR 2025 GEOJSON · OFFICIAL · LOADED', { exact: true }).waitFor({ timeout: 20_000 });

  const rows = await page.locator('table.dense tbody tr').count();
  assert(rows === 23, `Expected 23 monitored-area rows, found ${rows}`);
  const bodyText = await page.locator('body').innerText();
  for (const forbidden of ['STATE TOTAL DEFICIT', 'CAPACITY DEPLETED', 'LIVE FEED', 'CRITICAL RISK']) {
    assert(!bodyText.includes(forbidden), `Unsupported claim remains: ${forbidden}`);
  }

  const search = page.getByPlaceholder('QUERY BASIN…');
  await search.fill('Hualapai');
  assert(await page.locator('table.dense tbody tr').count() === 1, 'Search did not narrow to one Hualapai row');
  await page.locator('table.dense tbody tr').click();
  await page.keyboard.press('F3');
  await page.getByText('Hualapai Valley INA is listed by ADWR', { exact: false }).waitFor();
  await page.getByRole('link', { name: /ADWR Groundwater Basin 2025/ }).waitFor();

  await page.getByRole('button', { name: '☆ WATCH' }).click();
  await page.keyboard.press('F10');
  await search.fill('');
  assert(await page.locator('table.dense tbody tr').count() === 1, 'Watchlist did not retain exactly one selected area');

  await page.keyboard.press('F10');
  await search.fill('Douglas');
  const douglasRow = page.locator('table.dense tbody tr');
  assert(await douglasRow.count() === 1, 'Search did not narrow to one Douglas row');
  assert((await douglasRow.locator('td').nth(4).innerText()).trim() === '0', 'Verified zero field-well coverage rendered as unavailable');
  await search.fill('');

  const downloadPromise = page.waitForEvent('download');
  await page.keyboard.press('F9');
  const download = await downloadPromise;
  assert(download.suggestedFilename() === 'arizona-basin-monitor-snapshot.csv', 'Unexpected CSV filename');
  const csvPath = await download.path();
  assert(csvPath, 'CSV download did not produce a readable file');
  const csvRows = (await readFile(csvPath, 'utf8')).trim().split('\n').map((line) =>
    line.split(',').map((field) => field.slice(1, -1).replaceAll('""', '"')),
  );
  const csvHeader = csvRows[0];
  const douglasCsv = csvRows.find((row) => row[0] === 'douglas-ama');
  assert(douglasCsv, 'CSV export is missing Douglas AMA');
  for (const field of ['usgs_latest_continuous_sites', 'usgs_field_measurement_sites_since_2010']) {
    assert(douglasCsv[csvHeader.indexOf(field)] === '0', `CSV did not retain verified zero for ${field}`);
  }

  await page.getByRole('button', { name: 'TWEAKS' }).click();
  await page.getByRole('radio', { name: 'Sepia' }).click();
  assert(await page.locator('body').getAttribute('data-theme') === 'sepia', 'Theme control did not apply sepia');

  assert(pageErrors.length === 0, `Browser page errors:\n${pageErrors.join('\n')}`);
  assert(requestFailures.length === 0, `Browser request failures:\n${requestFailures.join('\n')}`);
  console.log('Console verification passed');
  console.log(`- directory rows: ${rows}`);
  console.log('- official ADWR geometry: loaded');
  console.log('- search, report, watchlist, CSV export, and theme controls: passed');
  console.log('- unsupported-claim scan: passed');
  console.log('- browser errors and request failures: 0');
} finally {
  await browser.close();
}
