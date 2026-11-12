// Renders a promo page frame by frame with Chrome: node promo/capture.mjs <page.html> <outDir> [frame,frame,...]
// The page exposes window.render(seconds), window.ready and window.DURATION (seconds, default 10). 30 fps.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire('/Users/fuhadsanin/.local/lib/node_modules/@playwright/cli/node_modules/');
const { chromium } = require('playwright-core');
const here = path.dirname(fileURLToPath(import.meta.url));
const [,, page, outDir, only] = process.argv;
const FPS = 30;
fs.mkdirSync(outDir, { recursive: true });
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
p.on('pageerror', e => console.log('pageerror', e.message));
await p.goto('file://' + path.join(here, page));
await p.evaluate(() => window.ready);
const dur = await p.evaluate(() => window.DURATION || 10);
const frames = only ? only.split(',').map(Number) : [...Array(Math.round(dur * FPS)).keys()];
for (const f of frames) {
  await p.evaluate(t => window.render(t), f / FPS);
  await p.screenshot({ path: `${outDir}/f${String(f).padStart(4, '0')}.png` });
}
await b.close();
