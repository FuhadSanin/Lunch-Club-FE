const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const routes = (process.env.ROUTES || '/,/pick,/order,/new,/settings').split(',');
  const errs = [];
  for (const [label, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['iphone15', devices['iPhone 15']]]) {
    const ctx = await b.newContext(opts);
    const p = await ctx.newPage();
    p.on('console', (m) => (m.type() === 'error' || m.type() === 'warning' || m.text().includes('Assertion')) && errs.push(`${label} console ${m.type()}: ${m.text()}`));
    p.on('pageerror', (e) => errs.push(`${label} pageerror: ${e.message}`));
    p.on('requestfailed', (r) => errs.push(`${label} requestfailed: ${r.url()}`));
    p.on('response', (r) => r.status() >= 400 && errs.push(`${label} ${r.status()}: ${r.url()}`));
    await p.goto('http://localhost:4173/#/signin');
    await p.evaluate(() => localStorage.clear());
    await p.goto('http://localhost:4173/');
    await p.screenshot({ path: `/home/claude/lunchboard/shots/${label}-signin.png`, fullPage: true });
    await p.getByRole('button', { name: 'Continue with Google' }).click();
    for (const r of routes) {
      await p.goto('http://localhost:4173/#' + r);
      await p.waitForTimeout(300);
      await p.screenshot({ path: `/home/claude/lunchboard/shots/${label}${r.replace(/\//g, '-') || '-home'}.png`, fullPage: true });
    }
    const fonts = await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.weight));
    errs.push(`${label} fonts loaded: ${fonts.join(', ')}`);
    await ctx.close();
  }
  await b.close();
  console.log(errs.join('\n') || 'no errors');
})();
