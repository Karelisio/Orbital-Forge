// Usage: node scripts/screenshot.mjs <url> <outDir> [actions...]
// Drives the web build in a phone-sized Chromium and captures screenshots (used for the README).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}

const url = process.argv[2] ?? 'http://localhost:4173/';
const out = process.argv[3] ?? 'docs/screenshots';
const mode = process.argv[4] ?? 'basic';
const saveFile = process.argv[5];
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'fr-FR',
});
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
if (saveFile) {
  const { readFileSync } = await import('node:fs');
  const save = readFileSync(saveFile, 'utf8');
  await page.addInitScript((text) => {
    if (!sessionStorage.getItem('of_demo_loaded')) {
      localStorage.setItem('CapacitorStorage.of_save_main', text);
      sessionStorage.setItem('of_demo_loaded', '1');
    }
  }, save);
}
await page.goto(url);
await page.waitForTimeout(2500);
for (const label of ['Récupérer', 'Collect']) {
  const btn = page.getByText(label, { exact: true });
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForTimeout(600);
  }
}

async function shot(name) {
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('saved', name);
}

if (mode === 'basic') {
  await shot('00-start');
  const ast = page.locator('[data-tut="asteroid"]');
  for (let i = 0; i < 30; i++) await ast.click({ position: { x: 200, y: 150 } });
  await page.waitForTimeout(300);
  await shot('01-tapped');
} else if (mode === 'tour') {
  // Relies on the debug menu being reachable through window hooks.
  for (const [tab, name] of [
    ['mine', '10-mine'],
    ['factory', '11-factory'],
    ['planets', '12-planets'],
    ['research', '13-research'],
    ['prestige', '14-prestige'],
    ['more', '15-more'],
  ]) {
    const btn = page.locator(`[data-tut="tab-${tab}"]`);
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(700);
      await shot(name);
    }
  }
  for (const [label, name] of [
    ['Missions', '16-missions'],
    ['Succès', '17-achievements'],
    ['Statistiques', '18-stats'],
    ['Réglages', '19-settings'],
  ]) {
    await page.locator('[data-tut="tab-more"]').click();
    const tile = page.getByText(label, { exact: true }).first();
    if (await tile.count()) {
      await tile.click();
      await page.waitForTimeout(600);
      await shot(name);
      await page.keyboard.press('Escape');
      const back = page.locator('button[aria-label="back"]');
      if (await back.count()) await back.first().click();
    }
  }
}
console.log(JSON.stringify({ errors }, null, 2));
await browser.close();
