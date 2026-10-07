// Production smoke check. Never disables TLS verification.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT || path.join(process.env.HOME,
  '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async () => {
  const args = process.env.PAGES_IP ? [
    `--host-resolver-rules=MAP inertance.org ${process.env.PAGES_IP},MAP www.inertance.org ${process.env.PAGES_IP}`
  ] : [];
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text() + " " + m.location().url); });
    const home = await page.goto('https://inertance.org/');
    assert.equal(home.status(), 200);
    await page.getByRole('link', { name: 'Open circuit simulator' }).click();
    assert.equal(new URL(page.url()).pathname, '/app/');
    const idle = () => page.waitForFunction(() => window.circuitEditor &&
      !circuitEditor.arranging && circuitEditor.model, {}, { timeout: 90000 });
    await idle();
    const stamp = await page.locator('meta[name=inertance-simulator]').getAttribute('content');
    assert(!stamp.includes('uncommitted'), stamp);
    if (process.env.SOURCE_REV) assert(stamp.startsWith(`cwas ${process.env.SOURCE_REV} ·`), stamp);
    assert.equal(await page.inputValue('#ed-converter'), 'buck');
    assert.equal(await page.evaluate(() => circuitEditor.model.metadata.mode), 'ripple');
    await page.click('#ed-play');
    await page.waitForFunction(() => circuitEditor.time > 0);
    await page.click('#ed-play');
    assert(await page.evaluate(() => Number.isFinite(circuitEditor.sample.state.currents.V1)));
    const out = path.join(__dirname, 'out'); fs.mkdirSync(out, { recursive: true });
    await page.screenshot({ path: path.join(out, 'live-desktop.png') });
    await page.click('[data-host=theme]');
    await page.screenshot({ path: path.join(out, 'live-desktop-theme.png') });
    await page.evaluate(() => { location.hash = 'fullboost'; });
    await page.waitForFunction(() => document.querySelector('#ed-converter').value === 'fullboost');
    await idle();
    assert(await page.evaluate(() => circuitEditor.document.components.some(c => c.type === 'coupled3')));
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.click('[data-dock=simulation]');
    assert(await page.locator('#ed-model-ripple').isVisible());
    await page.screenshot({ path: path.join(out, 'live-phone.png'), fullPage: true });
    const demo = await page.goto('https://inertance.org/lab/');
    assert.equal(demo.status(), 200);
    await page.waitForFunction(() => typeof d3 !== 'undefined');
    assert.deepEqual(errors, []);
    console.log('Production: landing link, committed source stamp, buck playback, fullboost hash, themes, phone, lab and zero browser errors passed. ' + stamp);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
