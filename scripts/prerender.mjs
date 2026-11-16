// Makes the pre-rendered copy of the landing page that the built index.html carries (src/landing/prerendered.html),
// so search engines, link previews and the first paint see the real page, not an empty <div>.
//   npm run prerender        (needs Google Chrome and the Playwright the promo scripts use)
// It builds the site, opens it in Chrome, scrolls the whole page so every section has shown itself, saves the
// page's HTML, and builds again with it inside. Run it again after the landing page's words or layout change.
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire('/Users/fuhadsanin/.local/lib/node_modules/@playwright/cli/node_modules/');
const { chromium } = require('playwright-core');
const out = path.join(root, 'src', 'landing', 'prerendered.html');
const PORT = 4190;
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit' });

fs.rmSync(out, { force: true }); // build once without a snapshot, so the page it captures is the live one
run('npm', ['run', 'build']);
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' });
try {
  await new Promise((ok) => setTimeout(ok, 3500));
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })).newPage();
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('h1#hero-title', { timeout: 20000 });
  await page.waitForTimeout(1500);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 500) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(150); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  const html = await page.evaluate(() => {
    const root = document.getElementById('root').cloneNode(true);
    root.querySelectorAll('script, [data-sonner-toaster], section[aria-label^="Notifications"]').forEach((e) => e.remove());
    root.querySelectorAll('video').forEach((v) => v.removeAttribute('controls'));
    return root.innerHTML;
  });
  await browser.close();
  const hidden = (html.match(/opacity: 0;/g) || []).length;
  fs.writeFileSync(out, html);
  console.log(`pre-rendered ${(html.length / 1024).toFixed(0)} KB, ${hidden} element(s) still at opacity 0`);
} finally {
  preview.kill();
}
run('npm', ['run', 'build']);
