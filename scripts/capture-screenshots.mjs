import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseUrl = process.env.SCREENSHOT_BASE_URL || 'http://127.0.0.1:3000';
const outputDir = resolve('docs/screenshots');

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: 'dark',
});
const page = await context.newPage();

await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.getByText('ADWR 2025 GEOJSON · OFFICIAL · LOADED', { exact: true }).waitFor({ timeout: 20_000 });
await page.screenshot({
  path: resolve(outputDir, 'arizona-basin-monitor-console-overview.png'),
  fullPage: true,
});

const search = page.getByPlaceholder('QUERY BASIN…');
await search.fill('Hualapai');
await page.locator('table.dense tbody tr').click();
await page.getByRole('button', { name: '☆ WATCH' }).click();
await page.screenshot({
  path: resolve(outputDir, 'arizona-basin-monitor-basin-directory.png'),
  fullPage: true,
});

await page.keyboard.press('F3');
await page.getByText('Hualapai Valley INA is listed by ADWR', { exact: false }).waitFor();
await page.screenshot({
  path: resolve(outputDir, 'arizona-basin-monitor-source-details.png'),
  fullPage: true,
});

await browser.close();
console.log(`Wrote README screenshots to ${outputDir}`);
