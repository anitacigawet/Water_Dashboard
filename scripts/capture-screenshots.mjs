import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = process.env.SCREENSHOT_BASE_URL || "http://127.0.0.1:3000";
const outputDir = resolve("docs/screenshots");

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});
const page = await context.newPage();

await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.screenshot({
  path: resolve(outputDir, "arizona-basin-monitor-overview.png"),
  fullPage: true,
});

await page.getByPlaceholder("Search basins...").fill("Hualapai");
await page.getByRole("button", { name: /Hualapai Valley INA/ }).click();
await page.waitForTimeout(500);
await page.screenshot({
  path: resolve(outputDir, "arizona-basin-monitor-basin-detail.png"),
  fullPage: true,
});

await browser.close();
