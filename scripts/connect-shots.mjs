// The four example screens on the Connect page (src/screens/connect/what-to-say.ts): the real app in demo mode, in light
// and dark, cropped and saved as WebP in public/connect/. Run `npm run dev -- --port 4181` first (with no API_URL, so it shows the demo), then:
//   node scripts/connect-shots.mjs [outDir]      (BASE=<address> to use another port; needs cwebp: brew install webp)
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire('/Users/fuhadsanin/.local/lib/node_modules/@playwright/cli/node_modules/');
const { chromium } = require('playwright-core');
const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE ?? 'http://localhost:4181'; // the app with no API behind it: its demo data
const OUT = process.argv[2] ?? path.join(here, '..', 'public', 'connect');
const S = fs.mkdtempSync(path.join(process.env.TMPDIR ?? '/tmp', 'connect-shots-'));
fs.mkdirSync(OUT, { recursive: true });
const br = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const SHOTS = [
  { name: 'start', status: 'open', hash: '#/new', clip: { x: 272, y: 40, width: 984, height: 490 } },
  { name: 'pick', status: 'open', hash: '#/pick', clip: { x: 272, y: 224, width: 984, height: 622 } },
  { name: 'review', status: 'locked', hash: '#/review', clip: { x: 272, y: 40, width: 984, height: 570 } },
  { name: 'collect', status: 'placed', hash: '#/collect', clip: { x: 272, y: 40, width: 984, height: 440 }, click: 'Mark as arrived' },
];
for (const theme of ['light', 'dark']) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5, reducedMotion: 'reduce', colorScheme: theme });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/?demo=signed-in#/`); await p.waitForTimeout(1200);
  for (const s of SHOTS) {
    await p.evaluate((status) => { const k = 'lunchboard-demo-v2'; const v = JSON.parse(localStorage.getItem(k)); v.session.status = status; v.session.arrived = {}; v.session.handedOut = {}; localStorage.setItem(k, JSON.stringify(v)); }, s.status);
    await p.goto(`${BASE}/?demo=signed-in` + s.hash); await p.reload(); await p.waitForTimeout(1600);
    if (theme === 'dark') await p.evaluate(() => document.documentElement.classList.add('dark'));
    if (s.name === 'start') await p.evaluate(() => { for (const i of document.querySelectorAll('input')) if (i.value.includes('localhost')) i.value = 'https://tiffmate.vercel.app/#/pick'; });
    if (s.click) { await p.getByRole('button', { name: s.click }).first().click(); await p.waitForTimeout(1500); }
    await p.waitForTimeout(400);
    const png = `${S}/${s.name}-${theme}.png`;
    await p.screenshot({ path: png, clip: s.clip });
    execFileSync('cwebp', ['-q', '80', '-m', '6', png, '-o', `${OUT}/${s.name}-${theme}.webp`], { stdio: 'ignore' });
  }
  await ctx.close();
}
await br.close();
