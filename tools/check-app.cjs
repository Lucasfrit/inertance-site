// Browser check for the built app (app/index.html). Run after `python3 build_app.py`:
//   node tools/check-app.cjs
// Needs Playwright + Chrome. Set PLAYWRIGHT=/path/to/node_modules/playwright if the
// package is not resolvable from here. Screenshots go to tools/out/ (git-ignored).
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT, 'playwright',
    path.join(process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')];
  for (const c of candidates.filter(Boolean)) { try { return require(c); } catch {} }
  throw new Error('Playwright not found. npm i -D playwright, or set PLAYWRIGHT=/path/to/playwright');
}
const { chromium } = loadPlaywright();

const siteRoot = path.join(__dirname, '..');
const out = path.join(__dirname, 'out');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.svg': 'image/svg+xml', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(siteRoot, url.endsWith('/') ? url + 'index.html' : url);
  if (!file.startsWith(siteRoot) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/app/`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const idle = () => page.waitForFunction(() => window.circuitEditor && !circuitEditor.arranging, {}, { timeout: 90000 });

  await page.addInitScript(() => { if (!sessionStorage.getItem('check-cleared')) { localStorage.clear(); sessionStorage.setItem('check-cleared', '1'); } });
  await page.goto(base);
  await idle();
  assert.equal(await page.inputValue('#ed-converter'), 'buck', 'buck is the default circuit');
  assert.equal(await page.getAttribute('#ed-pipe', 'aria-pressed'), 'true', 'desktop Build starts in Connect');
  assert(await page.locator('#ed-pipe').isHidden(), 'redundant Connect button removed from canvas toolbar');
  assert.equal(await page.locator('[data-host=tool-select]').count(), 0, 'redundant Select button removed');
  assert(await page.locator('.app-head #ed-inspector-toggle').count() || await page.locator('header #ed-inspector-toggle').count(), 'Properties is in the menu bar');
  assert.equal(await page.locator('.setup-panel #ed-magnetic-mode').count(),1,'simulation appearance is in Simulation, not View');
  assert(await page.locator('[data-host=report-availability]').textContent(),'disabled teaching reference has an explanation');
  assert(await page.locator('.waveforms > header').evaluate(n=>n.clientHeight<=40),'waveform headline stays on one line');
  assert.equal(await page.locator('.waveforms > header .plot-controls').count(),1,'waveform controls use empty header space on desktop');
  assert(await page.evaluate(() => !!circuitEditor.model), 'buck simulates');
  assert.equal(await page.evaluate(() => circuitEditor.model.metadata.mode), 'ripple', 'fresh app defaults to Ripple');
  assert.match(await page.textContent('#ed-model-leakage'), /finite coupling/);
  assert.match(await page.textContent('[data-host=levels]'), /V̄/, 'level strip shows statistics');
  assert.match(await page.textContent('[data-host=build]'), /^Simulator: cwas \w+/, 'build stamp shown in Help');

  // hash selects a preset, also without reload
  await page.evaluate(() => { location.hash = '#forward'; });
  await page.waitForFunction(() => document.querySelector('#ed-converter').value === 'forward');
  await idle();
  assert(await page.evaluate(() => circuitEditor.document.components.some(c => c.type === 'coupled3')));
  await page.click('[data-host=setup-toggle]');
  assert(await page.locator('.builder').isVisible() && await page.locator('.setup-panel').isVisible(), 'builder and simulation setup coexist');
  assert(await page.locator('.setup-visual').getAttribute('open')!==null,'Simulation appearance is open by default');
  const panelHeights=await page.evaluate(()=>{const height=s=>document.querySelector(s).getBoundingClientRect().height;return {main:height('.main'),builder:height('.builder'),setup:height('.setup-panel')};});
  assert(Math.abs(panelHeights.main-panelHeights.builder)<2&&Math.abs(panelHeights.main-panelHeights.setup)<2,'side panels use full schematic/playback height');
  assert.equal(await page.locator('#ed-fit svg').count(),1,'schematic reset uses a home icon');
  const panels = await page.evaluate(() => { const a=document.querySelector('.builder').getBoundingClientRect(),b=document.querySelector('.setup-panel').getBoundingClientRect();return {builderRight:a.right,setupLeft:b.left}; });
  assert(panels.setupLeft >= panels.builderRight, 'simulation setup sits next to builder');
  const setupWidth=await page.locator('.setup-panel').evaluate(n=>n.clientWidth);
  await page.locator('[data-host=setup-resizer]').focus();await page.keyboard.press('ArrowRight');
  assert((await page.locator('.setup-panel').evaluate(n=>n.clientWidth))>setupWidth,'Simulation panel resizes');
  const setupGrip=await page.locator('[data-host=setup-resizer]').boundingBox();
  await page.mouse.move(setupGrip.x+setupGrip.width/2,setupGrip.y+40);await page.mouse.down();await page.mouse.move(setupGrip.x+setupGrip.width/2+18,setupGrip.y+40,{steps:3});await page.mouse.up();
  assert((await page.locator('.setup-panel').evaluate(n=>n.clientWidth))>setupWidth+12,'Simulation panel resizes by dragging');
  const builderWidth=await page.locator('.builder').evaluate(n=>n.clientWidth);
  await page.locator('[data-host=resizer]').focus();await page.keyboard.press('ArrowRight');
  assert((await page.locator('.builder').evaluate(n=>n.clientWidth))>builderWidth,'Builder resizes');
  await page.click('[data-host=builder-close]');
  assert(await page.locator('.builder').isHidden(),'Builder close button works');
  assert(await page.locator('[data-host=setup-resizer]').isVisible(),'Simulation can resize with Builder closed');
  await page.click('[data-host=builder-toggle]');
  await page.fill('[data-host=sim-duration]','60');
  await page.fill('[data-host=switch-frequency]','2');
  assert.equal(await page.inputValue('[data-host=sim-cycles]'),'120','cycle count tracks duration and selected frequency');
  await page.fill('[data-host=sim-cycles]','100');
  assert.equal(await page.inputValue('[data-host=sim-duration]'),'50','cycles convert back to physical run duration');
  await page.fill('[data-host=sim-duration]','60');
  await page.fill('[data-host=switch-duty]','40');
  await page.locator('[data-host=timing-form]').getByRole('button',{name:'Apply timing',exact:true}).click();
  assert.equal(await page.evaluate(()=>circuitEditor.document.settings.duration),.06,'total time saved');
  assert.equal(await page.evaluate(()=>circuitEditor.model.duration),.002,'four verified cycles displayed');
  assert(await page.evaluate(()=>circuitEditor.model.settling.solvedDuration>=.06),'settling honors initial horizon');
  assert.equal(await page.evaluate(()=>circuitEditor.document.components.find(c=>c.id==='Q1').pwm.frequency),2000,'PWM timing updated');
  await page.click('#ed-undo');
  await page.screenshot({ path: path.join(out, 'app-panels-desktop.png') });
  await page.locator('.model-details > summary').click();
  assert.equal(await page.locator('.model-details').evaluate(n => getComputedStyle(n).position), 'static', 'protection expands inline, not as an overlay');
  await page.click('[data-host=setup-close]');
  await page.locator('.app-head summary').filter({hasText:/^View$/}).click();
  await page.uncheck('[data-panel=playback]');
  assert(await page.locator('.transport').isHidden(), 'View customizes playback visibility');
  assert.equal(await page.evaluate(() => localStorage.getItem('inertance-panel-playback')), 'hidden', 'panel preference persists');
  await page.check('[data-panel=playback]');
  await page.locator('.app-head summary').filter({hasText:/^View$/}).click();

  // canvas fills its stage and refits when the builder hides
  const w0 = await page.locator('#ed-canvas').evaluate(n => n.clientWidth);
  const h0 = await page.locator('#ed-canvas').evaluate(n => n.clientHeight);
  assert(h0 >= 300, 'canvas fills the available height: ' + h0);
  await page.click('[data-host=builder-toggle]');
  await page.waitForTimeout(150);
  assert((await page.locator('#ed-canvas').evaluate(n => n.clientWidth)) > w0, 'hiding builder widens canvas');
  await page.click('[data-host=builder-toggle]');

  // builder arms placement; Select cancels it
  await page.click('[data-part=capacitor]');
  assert.equal(await page.getAttribute('#ed-add', 'aria-pressed'), 'true');
  assert.equal(await page.inputValue('#ed-palette'), 'capacitor');
  await page.locator('#ed-canvas').press('Escape');
  assert.equal(await page.getAttribute('#ed-add', 'aria-pressed'), 'false');
  await page.click('[data-host=builder-toggle]');
  await page.click('[data-host=builder-toggle]');
  assert.equal(await page.getAttribute('#ed-pipe', 'aria-pressed'), 'true');
  await page.locator('#ed-canvas').press('Escape');
  assert.equal(await page.getAttribute('#ed-pipe', 'aria-pressed'), 'false');

  // probe picker selects a component and updates card + levels
  await page.selectOption('[data-host=signal]', 'Lout');
  assert.deepEqual(await page.evaluate(() => circuitEditor.selection), { kind: 'component', id: 'Lout' });
  assert.match(await page.textContent('[data-host=card-name]'), /Lout/);
  assert.match(await page.textContent('[data-host=levels]'), /Lout/);
  assert.match(await page.textContent('[data-host=equation]'), /Inductance/);
  assert.match(await page.textContent('[data-host=equation]'), /v = L/);

  // Plot controls: full traces at t=0, symbolic references, zoom and all windings.
  assert((await page.locator('#ed-plots clipPath rect').first().getAttribute('width')) > 100, 'full waveform remains visible at time zero');
  assert(await page.locator('.reference-line').count() >= 4, 'measured extrema rendered');
  assert(await page.locator('.derived-level math').count() >= 2, 'circuit-derived symbolic peak expressions rendered');
  assert.equal(await page.locator('.plot-heading strong').first().textContent(), 'Lout · Voltage', 'plot title clearly identifies component and signal');
  assert(await page.locator('.plot-heading strong').first().evaluate(n => parseFloat(getComputedStyle(n).fontSize) >= 14 && +getComputedStyle(n).fontWeight >= 700), 'plot headers are prominent');
  await page.locator('.waveform-expressions summary').first().click();
  assert.match(await page.locator('.waveform-expressions').first().textContent(), /KVL/);
  assert(await page.locator('.waveform-expressions').first().locator('math').count() >= 2, 'both switching-state equations displayed');
  const trace = page.locator('#ed-plots .chart path[clip-path]').first();
  const originalTrace = await trace.getAttribute('d');
  await page.getByRole('button', { name: 'Zoom in Lout voltage', exact: true }).click();
  assert.notEqual(await trace.getAttribute('d'), originalTrace, 'zoom changes waveform scale');
  await page.getByRole('button', { name: 'Fit Lout voltage', exact: true }).click();
  assert.equal(await trace.getAttribute('d'), originalTrace, 'per-plot Fit restores default view');
  await page.getByRole('button', { name: 'Zoom in Lout voltage', exact: true }).click();
  await page.click('[data-host=plot-reset]');
  assert.equal(await trace.getAttribute('d'), originalTrace, 'reset restores original scale');
  const chartBounds = await page.locator('#ed-plots .chart').first().boundingBox();
  await page.mouse.move(chartBounds.x + chartBounds.width / 2, chartBounds.y + chartBounds.height / 2);
  await page.mouse.wheel(0, -300);
  await page.waitForFunction(original => document.querySelector('#ed-plots .chart path[clip-path]').getAttribute('d') !== original, originalTrace);
  const zoomedTrace = await trace.getAttribute('d');
  await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move(chartBounds.x + chartBounds.width / 2 + 40, chartBounds.y + chartBounds.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  assert.notEqual(await trace.getAttribute('d'), zoomedTrace, 'Shift-drag pans the zoomed plot');
  await page.click('[data-host=plot-reset]');
  await page.uncheck('[data-host=plot-guides]');
  assert.equal(await page.locator('.reference-line').count(), 0, 'reference toggle removes dotted lines');
  await page.check('[data-host=plot-guides]');
  await page.selectOption('[data-host=plot-scope]', 'all');
  assert(await page.locator('#ed-plots .plot').count() > 10, 'all components and windings have plots');
  await page.evaluate(() => window.scrollTo(0,document.querySelector('.waveforms').getBoundingClientRect().top+scrollY+10));await page.waitForTimeout(100);
  const leftPanels=await page.evaluate(()=>{const b=document.querySelector('.builder').getBoundingClientRect(),w=document.querySelector('.wave-sidebar').getBoundingClientRect(),h=document.querySelector('.waveforms>header').getBoundingClientRect();return {builderBottom:b.bottom,waveTop:w.top,headerTop:h.top,headerBottom:h.bottom};});
  assert(leftPanels.builderBottom<0,'upper Builder scrolls away');
  assert(leftPanels.headerTop>=45&&leftPanels.headerTop<48,'waveform controls stay at the top');
  assert(leftPanels.waveTop>=leftPanels.headerBottom-1,'waveform probe information does not overlap sticky header');
  await page.screenshot({path:path.join(out,'app-wave-sidebar-scroll.png')});
  await page.evaluate(() => window.scrollTo(0,document.documentElement.scrollHeight));
  assert(await page.locator('.transport').evaluate(n => n.getBoundingClientRect().bottom < 0), 'playback scrolls away with schematic');
  assert(await page.locator('.canvas-area').evaluate(n => n.getBoundingClientRect().bottom < 0), 'schematic scrolls away to make room for plots');
  await page.evaluate(() => window.scrollTo(0,0));
  await page.selectOption('[data-host=plot-columns]', '3');
  assert.equal(await page.locator('#ed-plots').evaluate(n => getComputedStyle(n).gridTemplateColumns.split(' ').length), 3);
  await page.selectOption('[data-host=plot-scope]', 'selected');
  await page.selectOption('[data-host=plot-columns]', '2');

  // properties panel edits the real document
  await page.evaluate(() => { const route=CircuitRouting.routeAll;window.propertyRoutes=0;CircuitRouting.routeAll=(...args)=>{window.propertyRoutes++;return route(...args)}; });
  await page.click('#ed-inspector-toggle');
  assert(await page.locator('#ed-inspector').isVisible());
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => window.propertyRoutes),0,'opening Properties does not reroute unchanged circuit');
  await page.fill('#ed-value', '2');
  await page.press('#ed-value', 'Enter');
  await page.locator('#ed-value').evaluate(n => n.dispatchEvent(new Event('change')));
  await page.waitForFunction(() => circuitEditor.document.components.find(c => c.id === 'Lout').value === 2);
  assert.match(await page.textContent('[data-host=card-values]'), /2 mH/);
  await page.screenshot({ path: path.join(out, 'app-desktop.png') });
  await page.click('[data-host=inspector-close]');
  assert(await page.locator('#ed-inspector').isHidden());

  // playback: speed select drives the editor; continuous loop wraps at the end
  await page.selectOption('[data-host=speed]', '100');
  assert.equal(await page.textContent('#ed-speed-label'), '10×');
  await page.click('#ed-play');
  await page.waitForTimeout(2200);
  const looped = await page.evaluate(() => ({ playing: circuitEditor.playing, t: circuitEditor.time, T: circuitEditor.model.duration }));
  assert(looped.playing && looped.t < looped.T, 'continuous loop keeps playing past the end ' + JSON.stringify(looped));
  await page.click('#ed-play');
  await page.selectOption('[data-host=loop]', '0');
  assert.equal(await page.evaluate(() => circuitEditor.loop), false);
  assert.equal(await page.inputValue('[data-host=loop-menu]'), '0', 'loop controls stay in sync');
  await page.click('#ed-reset');await page.click('#ed-play');await page.waitForTimeout(80);
  await page.locator('#ed-play').dispatchEvent('pointerdown',{button:0,pointerType:'mouse'});
  assert.equal(await page.evaluate(()=>circuitEditor.playing),false,'Pause stops on press, before click/release');
  const pressedPauseTime=await page.evaluate(()=>circuitEditor.time);await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>circuitEditor.time),pressedPauseTime,'held Pause freezes time');
  await page.locator('#ed-play').dispatchEvent('click');
  assert.equal(await page.evaluate(()=>circuitEditor.playing),false,'release does not restart playback');
  for(let i=0;i<3;i++){
    await page.click('#ed-reset');
    await page.click('#ed-play');await page.waitForTimeout(80);await page.click('#ed-play');
    const paused=await page.evaluate(() => circuitEditor.time);await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => circuitEditor.time),paused,'Pause freezes timeline repeatedly');
    assert.equal(await page.textContent('[data-dock=run]'),'Run','dock label follows pause');
  }
  await page.click('#ed-play');
  await page.waitForFunction(() => !circuitEditor.playing);
  assert.equal(await page.textContent('[data-dock=run]'),'Run','dock label follows automatic end of playback');

  // collapsing waveforms keeps plots measurable and gives the canvas room
  const hBefore = await page.locator('#ed-canvas').evaluate(n => n.clientHeight);
  await page.click('[data-host=wave-toggle]');
  await page.waitForTimeout(150);
  assert((await page.locator('#ed-canvas').evaluate(n => n.clientHeight)) > hBefore, 'collapsing waveforms grows canvas');
  await page.evaluate(() => circuitEditor.select('Co'));
  await page.click('[data-host=wave-toggle]');
  assert((await page.locator('#ed-plots .plot').first().evaluate(n => n.clientWidth)) > 200, 'plots keep their width while collapsed');

  // theme toggle persists
  await page.click('[data-host=theme]');
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.reload(); await idle();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme);
  await page.screenshot({ path: path.join(out, 'app-desktop-theme.png') });

  // phone: no horizontal overflow; dock opens the builder sheet
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal scroll on phone');
  assert(await page.locator('[data-host=plot-guides]').isVisible(), 'reference toggle available on phone');
  assert(await page.locator('[data-dock=run]').isHidden(),'compact dock does not duplicate Run/Pause');
  await page.click('[data-dock=simulation]');
  assert(await page.locator('.setup-panel').isVisible(),'narrow Simulation tab opens settings');
  assert(await page.locator('[data-dock=simulation]').evaluate(n=>n.classList.contains('active')),'Simulation tab is active');
  const mobilePlacement=await page.evaluate(()=>{const c=document.querySelector('.main').getBoundingClientRect(),s=document.querySelector('.setup-panel').getBoundingClientRect();return {circuitBottom:c.bottom,simulationTop:s.top};});
  assert(mobilePlacement.simulationTop>=mobilePlacement.circuitBottom-1,'Simulation settings appear beneath circuit and playback');
  await page.click('[data-host=setup-close]');
  await page.click('[data-dock=build]');
  assert(await page.locator('.builder').isVisible());
  assert.equal(await page.getAttribute('#ed-pipe', 'aria-pressed'), 'true', 'phone Build activates Connect');
  await page.screenshot({ path: path.join(out, 'app-phone-build.png') });
  await page.click('[data-part=resistor]');
  assert(await page.locator('.builder').isHidden(), 'choosing a part closes the sheet');
  await page.click('[data-dock=canvas]');
  assert.equal(await page.getAttribute('#ed-pipe', 'aria-pressed'), 'false', 'phone Canvas returns to selection');
  await page.screenshot({ path: path.join(out, 'app-phone.png'), fullPage: true });

  // Report reference: formulas annotate physical levels, without changing physics.
  await page.selectOption('#ed-converter', 'fullboost'); await idle();
  const documentBeforeReference = await page.evaluate(() => JSON.stringify(circuitEditor.document));
  const physicsBeforeReference = await page.evaluate(() => circuitEditor.model.metadata.mode);
  await page.selectOption('[data-host=signal]', 'T1');
  await page.selectOption('[data-host=plot-view]', 'report');
  assert(await page.locator('[data-host=plot-view-note]').isVisible());
  assert.equal(await page.evaluate(() => JSON.stringify(circuitEditor.document)), documentBeforeReference, 'plot reference does not edit the circuit');
  assert.equal(await page.evaluate(() => circuitEditor.model.metadata.mode), physicsBeforeReference, 'plot reference does not replace simulation');
  assert.equal(await page.locator('.symbolic-level math').count(), 6, 'primary voltage/current have three symbolic levels each');
  assert.equal(await page.locator('.symbolic-level mfrac').count(), 2, 'primary voltage shows positive and negative Vo/n fractions');
  assert.match(await page.textContent('[data-host=levels]'), /Ideal report reference/);
  await page.getByRole('button', { name: 'Zoom in T1 · W1 voltage', exact: true }).click();
  await page.click('[data-host=plot-reset]');
  await page.screenshot({ path: path.join(out, 'app-report-phone.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: path.join(out, 'app-report-desktop.png') });
  await page.selectOption('[data-host=plot-scope]', 'all');
  assert.equal(await page.locator('#ed-plots .plot').count(), 30, 'all report component and winding pairs shown');
  await page.uncheck('[data-host=plot-guides]');
  assert.equal(await page.locator('.symbolic-level').count(), 0, 'reference toggle hides symbolic line-end labels');
  await page.check('[data-host=plot-guides]');
  await page.selectOption('[data-host=plot-view]', 'simulation');
  assert.equal(await page.locator('.symbolic-level:not(.derived-level)').count(), 0, 'simulation view removes ideal report levels');
  assert(await page.locator('.derived-level math').count() >= 30, 'Ripple expressions available for every component and winding');
  await page.selectOption('[data-host=plot-scope]', 'selected');
  await page.selectOption('#ed-converter', 'buck'); await idle();
  await page.selectOption('[data-host=signal]', 'L1');
  await page.locator('.waveform-expressions summary').first().click();
  await page.screenshot({ path: path.join(out, 'app-expressions-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.locator('.waveform-expressions summary').first().click();
  assert(await page.locator('.waveform-expressions').first().getAttribute('open') !== null, 'phone equations expanded');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'expanded equations fit on phone');
  await page.screenshot({ path: path.join(out, 'app-expressions-phone.png'), fullPage: true });

  assert.deepEqual(errors, []);
  await browser.close(); server.close();
  console.log('App: default preset, hash presets, fill/refit, builder, tools, probe, properties, speed, loop, waveform collapse, theme and phone layout passed.');
})().catch(e => { console.error(e); process.exit(1); });
