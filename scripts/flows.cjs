const { chromium, devices } = require('playwright');
const B = 'http://localhost:4173/';
(async () => {
  const b = await chromium.launch();
  const out = []; const ok = (m) => out.push('PASS ' + m); const bad = (m) => out.push('FAIL ' + m);
  const check = async (cond, m) => ((await cond) ? ok(m) : bad(m));
  for (const [label, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['iphone15', devices['iPhone 15']]]) {
    const ctx = await b.newContext(opts); const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('console', (m) => (m.type() === 'error' || /Assertion/.test(m.text())) && errs.push(m.text()));
    p.on('response', (r) => r.status() >= 400 && errs.push(r.status() + ' ' + r.url()));
    await p.goto(B); await p.evaluate(() => localStorage.clear()); await p.goto(B);
    await p.getByRole('button', { name: 'Continue with Google' }).click();
    await check(p.getByRole('heading', { level: 1 }).textContent().then((t) => t.includes('Platform team')), `${label}: sign in lands on Today's lunch`);
    // live board filters + search
    await p.getByRole('button', { name: /^To pick/ }).click();
    await check(p.locator('.rows .row').count().then((n) => n === 6), `${label}: "To pick" filter shows 6 people`);
    await p.getByRole('button', { name: /^Everyone/ }).click();
    await p.getByLabel('Find a person').fill('meera');
    await check(p.locator('.rows .row').count().then((n) => n === 1), `${label}: search finds one person`);
    await p.getByLabel('Find a person').fill('');
    await p.getByRole('button', { name: 'Show all 35' }).click();
    await check(p.locator('.panel .rows .row').count().then((n) => n === 35), `${label}: show all lists 35`);
    // pick
    await p.goto(B + '#/pick');
    await p.getByRole('tab', { name: 'Bektash' }).click();
    await p.getByRole('button', { name: 'Add Fresh Lime' }).click();
    await p.getByRole('button', { name: 'One more Fresh Lime' }).click();
    await p.getByLabel('Note for the restaurant').fill('No ice');
    await p.getByRole('button', { name: 'Save my pick' }).click();
    await check(p.getByText('Saved. The host sees it on the live board.').isVisible(), `${label}: save pick`);
    await p.goto(B + '#/');
    await check(p.getByText('No ice').first().isVisible(), `${label}: saved pick shows on the board`);
    await p.goto(B + '#/pick');
    await p.getByRole('button', { name: 'Skip today' }).click();
    await check(p.getByText('You are skipping today.').first().isVisible(), `${label}: skip today`);
    // veg only toggle
    await p.getByRole('tab', { name: 'Thaal Kitchen' }).click();
    await p.getByLabel('Veg only').check({ force: true });
    await check(p.getByText('Chicken Tikka Biriyani').count().then((n) => n === 0), `${label}: veg only hides non-veg`);
    // host flow
    await p.goto(B + '#/order');
    await p.getByRole('button', { name: 'Lock picks now' }).click();
    await p.getByRole('button', { name: 'Reopen picks' }).click();
    await p.getByRole('button', { name: 'Lock picks now' }).click();
    await p.getByRole('button', { name: 'Confirm and place order' }).click();
    await check(p.getByRole('dialog').isVisible(), `${label}: confirm dialog opens`);
    await p.keyboard.press('Escape');
    await check(p.getByRole('dialog').count().then((n) => n === 0), `${label}: Escape closes dialog`);
    await p.getByRole('button', { name: 'Confirm and place order' }).click();
    await p.getByRole('button', { name: 'Place the order' }).click();
    await p.getByText(/#1842209731/).first().waitFor({ timeout: 8000 });
    ok(`${label}: order bot finishes and shows the order number`);
    await p.getByRole('button', { name: 'Mark as arrived' }).click();
    await p.getByLabel(/Handed out to/).first().check();
    await check(p.getByText(/^1\/\d+$/).first().isVisible(), `${label}: hand-out counter updates`);
    // new lunch
    await p.goto(B + '#/new');
    await p.getByLabel('Picks close at').fill('13:00');
    await p.getByRole('button', { name: 'Start the lunch' }).click();
    await check(p.getByText('Lunch started. Share this link with the team').isVisible(), `${label}: start a lunch`);
    // settings
    await p.goto(B + '#/settings');
    await p.getByLabel('Team name').fill('Design team');
    await p.getByRole('button', { name: 'Save company' }).click();
    await check(p.getByText('Saved', { exact: true }).isVisible(), `${label}: save company`);
    await p.getByLabel('Email addresses').fill('asha@company.com, bad-email');
    await p.getByRole('button', { name: 'Add invites' }).click();
    await check(p.getByText('1 invite added.').isVisible(), `${label}: add invites (invalid email skipped)`);
    await p.getByLabel('Add an address').fill('Annexe 2, Kakkanad');
    await p.getByRole('button', { name: 'Add', exact: true }).click();
    await check(p.getByText('Annexe 2, Kakkanad').isVisible(), `${label}: add address`);
    await p.getByRole('button', { name: 'Reset the demo' }).click();
    await p.getByRole('dialog').getByRole('button', { name: 'Reset the demo' }).click(); await p.waitForTimeout(300);
    await check(p.getByRole('heading', { level: 1 }).textContent().then((t) => t.includes('Platform team')), `${label}: reset demo`);
    // role switch + nav (phone: open menu)
    if (label === 'iphone15') await p.getByRole('button', { name: 'Open menu' }).click();
    await p.getByLabel('View the demo as').selectOption('member');
    await check(p.getByRole('link', { name: /Review and order/ }).count().then((n) => n === 0), `${label}: member view hides host pages`);
    await p.getByLabel('View the demo as').selectOption('host');
    await p.getByRole('button', { name: 'Sign out' }).click();
    await check(p.getByRole('button', { name: 'Continue with Google' }).isVisible(), `${label}: sign out`);
    // keyboard: tab to first control
    await p.keyboard.press('Tab');
    await check(p.evaluate(() => document.activeElement?.textContent?.includes('Continue with Google')), `${label}: keyboard reaches sign-in button`);
    // overflow
    await p.goto(B + '?demo=signed-in#/');
    for (const r of ['/', '/pick', '/order', '/new', '/settings']) {
      await p.goto(B + '?demo=signed-in#' + r); await p.waitForTimeout(200);
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ov > 1 ? bad(`${label}: ${r} overflows sideways by ${ov}px`) : ok(`${label}: ${r} no sideways scroll`);
    }
    errs.length ? bad(`${label}: console/network errors: ${errs.join(' | ')}`) : ok(`${label}: no console or network errors`);
    await ctx.close();
  }
  await b.close();
  console.log(out.join('\n'));
})();
