/* Inertance app host — glue between the compact hybrid shell and the real editor.

   The editor (editor-ui.js, private repo) owns the circuit document, physics, SVG
   drawing, the #ed-* controls, plots and history. This file only:
     - drives editor controls from shell-specific widgets (part buttons, speed and
       loop selects, dock buttons), by setting their values and dispatching events;
     - reads window.circuitEditor (public host API) to fill shell readouts:
       title, selection card, zoom, duration, probe list and level strip;
     - owns shell-only state: theme, builder width/visibility, sheets on phones.
   It never mutates the circuit document directly. Keep it that way: anything that
   needs to change circuit state belongs in the editor and its API. */
(() => {
'use strict';
const root = document.getElementById('circuit-editor');
const E = window.circuitEditor;
const D = window.CircuitDocument;
const $ = s => root.querySelector(s);
const $$ = s => [...root.querySelectorAll(s)];
const host = name => root.querySelector(`[data-host="${name}"]`);
const work = $('.work');
const phone = matchMedia('(max-width: 760px)');
const store = {
  get(key) { try { return localStorage.getItem('inertance-' + key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem('inertance-' + key, value); } catch {} }
};
const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
const escapeKey = () => $('#ed-canvas').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
const activateConnect = () => { if ($('#ed-pipe').getAttribute('aria-pressed') !== 'true') $('#ed-pipe').click(); };
const fmt = (v, digits = 3) => {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  return (a !== 0 && (a < 1e-3 || a >= 1e4)) ? v.toExponential(2) : Number(v.toFixed(digits)).toString();
};

/* ---------- theme ---------- */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  host('theme').textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
}
applyTheme(store.get('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
host('theme').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next); store.set('theme', next);
});

/* ---------- simulator build stamp (written by build_app.py) ---------- */
host('build').textContent = 'Simulator: ' + (document.querySelector('meta[name="inertance-simulator"]')?.content || 'development build');

/* ---------- header menus: one open at a time, close on outside click ---------- */
const menus = $$('[data-menu]');
menus.forEach(menu => menu.addEventListener('toggle', () => {
  if (menu.open) menus.forEach(other => { if (other !== menu) other.open = false; });
}));
document.addEventListener('pointerdown', e => {
  menus.forEach(menu => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
});
$$('.menu-body > button').forEach(b => b.addEventListener('click', () => { b.closest('details').open = false; }));

/* ---------- circuit title + URL ---------- */
const converter = $('#ed-converter');
let title = 'Capacitor buffer';
function setTitle(text) { title = text; host('title').textContent = text; document.title = `${text} · Inertance`; }
converter.addEventListener('change', () => {
  if (!converter.value) return;
  setTitle(converter.selectedOptions[0].textContent);
  host('title').textContent = ''; // the circuit picker already names a preset
  history.replaceState(null, '', '#' + converter.value);
});
const examples = { 'ed-preset': 'Capacitor buffer', 'ed-freewheel': 'Inductor + diode', 'ed-hydraulic-review': 'Load + meters', 'ed-new': 'Untitled circuit' };
for (const [id, name] of Object.entries(examples)) $('#' + id).addEventListener('click', () => {
  converter.value = ''; setTitle(name); history.replaceState(null, '', location.pathname + location.search);
});
$('#ed-import').addEventListener('click', () => { if ($('#ed-transfer').hidden) { converter.value = ''; setTitle('Imported circuit'); } });
$('#ed-file').addEventListener('change', () => { converter.value = ''; setTitle('Imported circuit'); });

/* ---------- builder ---------- */
const palette = $('#ed-palette');
const parts = $$('[data-part]');
host('part-count').textContent = parts.length + ' parts';
parts.forEach(button => button.addEventListener('click', () => {
  palette.value = button.dataset.part;
  fire(palette, 'change');            // editor: armPlacement()
  if (phone.matches) { root.dataset.dockFocus='canvas';setSheet(null); } // give the canvas back so the user can tap to place
}));
host('part-search').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  parts.forEach(b => { b.hidden = !!q && !(b.textContent + ' ' + b.dataset.keywords).toLowerCase().includes(q); });
});
host('builder-toggle').addEventListener('click', e => {
  const hidden = work.classList.toggle('builder-hidden');
  e.currentTarget.classList.toggle('active', !hidden);
  e.currentTarget.setAttribute('aria-pressed', String(!hidden));
  store.set('builder', hidden ? 'hidden' : 'shown');
  if (hidden) escapeKey(); else activateConnect();
});
if (store.get('builder') === 'hidden') host('builder-toggle').click();

host('builder-close').addEventListener('click',()=>{if(phone.matches)setSheet(null,false);else if(!work.classList.contains('builder-hidden'))host('builder-toggle').click();});
function bindPanelResize(handle,panel,key,min,max){
 const setWidth=value=>{const width=Math.max(min,Math.min(max,value));work.style.setProperty('--'+key,width+'px');store.set(key,width);};
 if(+store.get(key))setWidth(+store.get(key));let drag=null;
 handle.addEventListener('pointerdown',e=>{drag={x:e.clientX,width:panel.getBoundingClientRect().width};handle.setPointerCapture(e.pointerId);e.preventDefault();});
 handle.addEventListener('pointermove',e=>{if(drag)setWidth(drag.width+e.clientX-drag.x);});
 for(const event of ['pointerup','pointercancel'])handle.addEventListener(event,e=>{drag=null;if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);});
 handle.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();setWidth(panel.getBoundingClientRect().width+(e.key==='ArrowRight'?12:-12));});
}
bindPanelResize(host('resizer'),$('.builder'),'builder-width',160,420);
bindPanelResize(host('setup-resizer'),$('.setup-panel'),'setup-width',220,420);
new ResizeObserver(entries=>{if(phone.matches)return;const height=Math.round(entries[0].contentRect.height);if(height>0&&work.style.getPropertyValue('--upper-panel-height')!==height+'px')work.style.setProperty('--upper-panel-height',height+'px');}).observe($('.main'));
function positionWaveControls(){host('waveforms').querySelector('header').append($('.plot-controls'));}

/* ---------- canvas tools ---------- */
for (const id of ['ed-plus', 'ed-minus', 'ed-fit']) $('#' + id).addEventListener('click', () => requestAnimationFrame(refreshZoom));
function refreshZoom() { host('zoom').textContent = Math.round(E.viewport.zoom * 100) + '%'; }
function refreshTools() {
  const pipe = $('#ed-pipe').getAttribute('aria-pressed') === 'true';
  const placing = $('#ed-add').getAttribute('aria-pressed') === 'true';
  host('builder-toggle').title = pipe ? 'Connect active · close Build or press Escape to select components' : placing ? 'Place a component · Escape returns to selection' : 'Open Build to connect pipes or choose components';
  parts.forEach(b => b.classList.toggle('active', placing && b.dataset.part === palette.value));
}

/* ---------- properties panel ---------- */
host('inspector-close').addEventListener('click', () => { if (!$('#ed-inspector').hidden) $('#ed-inspector-toggle').click(); });
$('#ed-inspector-toggle').addEventListener('click', () => {
  $('#ed-inspector-toggle').classList.toggle('active', !$('#ed-inspector').hidden);
  if (!$('#ed-inspector').hidden && ($('#ed-pipe').getAttribute('aria-pressed') === 'true' || $('#ed-add').getAttribute('aria-pressed') === 'true')) escapeKey();
  store.set('panel-properties', $('#ed-inspector').hidden ? 'hidden' : 'shown');
  if (phone.matches && !$('#ed-inspector').hidden) setSheet('inspect', false);
  requestAnimationFrame(refreshDock);
});

function setSetup(shown) {
  if(phone.matches)root.dataset.dockFocus=shown?'simulation':'canvas';
  work.classList.toggle('setup-hidden', !shown);
  host('setup-toggle').classList.toggle('active', shown);
  host('setup-toggle').setAttribute('aria-pressed', String(shown));
  store.set('panel-setup', shown ? 'shown' : 'hidden');
  syncPanelChecks();
  refreshDock();
}
function syncPanelChecks() {
  const values = {builder:phone.matches ? root.dataset.sheet === 'build' : !work.classList.contains('builder-hidden'),setup:!work.classList.contains('setup-hidden'),properties:!$('#ed-inspector').hidden,playback:!$('.transport').hidden,waveforms:!host('waveforms').classList.contains('collapsed')};
  $$('[data-panel]').forEach(input => input.checked = values[input.dataset.panel]);
}
host('setup-toggle').addEventListener('click', () => setSetup(work.classList.contains('setup-hidden')));
host('setup-close').addEventListener('click', () => setSetup(false));
$$('[data-panel]').forEach(input => input.addEventListener('change', () => {
  const shown=input.checked;
  switch(input.dataset.panel) {
    case 'builder': if(phone.matches) setSheet(shown?'build':null,false); else if(shown===work.classList.contains('builder-hidden')) host('builder-toggle').click(); break;
    case 'setup': setSetup(shown); break;
    case 'properties': if(shown===$('#ed-inspector').hidden) $('#ed-inspector-toggle').click(); break;
    case 'playback': $('.transport').hidden=!shown; store.set('panel-playback',shown?'shown':'hidden'); break;
    case 'waveforms': if(shown===host('waveforms').classList.contains('collapsed')) host('wave-toggle').click(); break;
  }
  syncPanelChecks();
}));

/* Timing is edited through the editor API, with undo and validation. */
let timingKey='';
function updateCycles(fromCycles=false){const c=E.document.components.find(c=>c.id===host('timing-switch').value&&c.pwm),frequency=+host('switch-frequency').value;const input=host('sim-cycles');host('cycles-label').hidden=!c;input.disabled=!c||host('sim-duration').disabled;input.required=!!c&&!input.disabled;if(!c||!(frequency>0))return;host('cycles-label').firstChild.textContent='Cycles · '+c.id;if(fromCycles){const cycles=+input.value;if(cycles>0)host('sim-duration').value=fmt(cycles/frequency,6);}else input.value=fmt(+host('sim-duration').value*frequency,6);}
function populateSwitchTiming(doc=E.document){const c=doc.components.find(c=>c.id===host('timing-switch').value&&c.type==='switch');const pwm=!!c?.pwm;host('pwm-timing').hidden=!pwm;host('pulse-timing').hidden=pwm||!c;
 for(const [name,key,scale]of [['switch-frequency','frequency',.001],['switch-duty','duty',100],['switch-phase','phase',100]]){const input=host(name);input.disabled=!pwm;input.required=pwm;if(pwm)input.value=(c.pwm[key]||0)*scale;}
 host('switch-pulse').disabled=!c||pwm;host('switch-pulse').required=!!c&&!pwm;if(c&&!pwm)host('switch-pulse').value=c.value;
 updateCycles();
}
function refreshTiming(doc,model){const switches=doc.components.filter(c=>c.type==='switch'),key=JSON.stringify([doc.settings,switches.map(c=>[c.id,c.value,c.pwm]),model?modelStamp(model):null]);if(key===timingKey)return;timingKey=key;
 const select=host('timing-switch'),previous=select.value;select.replaceChildren(...switches.map(c=>new Option(c.id+(c.pwm?' · PWM':' · pulse'),c.id)));if(switches.some(c=>c.id===previous))select.value=previous;select.disabled=!switches.length;
 host('sim-duration').value=fmt((doc.settings.duration||model?.duration||.04)*1000,6);host('pulse-start').value=fmt(doc.settings.loadOn*1000,6);host('pulse-start').closest('label').hidden=!switches.some(c=>!c.pwm);host('pulse-start').disabled=!switches.some(c=>!c.pwm);populateSwitchTiming(doc);
 host('sim-duration').disabled=!!model?.metadata?.reduced;
 updateCycles();
 host('timing-note').textContent=(model?.metadata?.reduced?'Ideal reduction: fixed four-cycle display. ':model?.metadata?.view==='settled'?'Ripple: four verified cycles are displayed. Total time is the initial settling horizon; the bounded solve may extend it. Enable advanced Transients to show the full run. ':'Transients: total time sets the startup run. Cycles use the selected PWM switch. Apply timing to rerun. ')+(doc.settings.manualEvents?.length?'Manual overrides remain active; restore automatic pulse in Properties.':'');
}
host('sim-duration').addEventListener('input',()=>updateCycles());
host('sim-cycles').addEventListener('input',()=>updateCycles(true));
host('switch-frequency').addEventListener('input',()=>updateCycles());
host('timing-switch').addEventListener('change',()=>populateSwitchTiming());
host('timing-form').addEventListener('submit',e=>{e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;const value={loadOn:+host('pulse-start').value/1000};if(!host('sim-duration').disabled)value.duration=+host('sim-duration').value/1000;
 const c=E.document.components.find(c=>c.id===host('timing-switch').value&&c.type==='switch');if(c)value.switch=c.pwm?{id:c.id,pwm:{frequency:+host('switch-frequency').value*1000,duty:+host('switch-duty').value/100,phase:+host('switch-phase').value/100}}:{id:c.id,value:+host('switch-pulse').value};
 try{E.setTiming(value);}catch(error){host('timing-note').textContent=error.message;}
});

/* ---------- transport ---------- */
const speed = $('#ed-speed');
function setSpeed(value) { speed.value = value; fire(speed, 'input'); host('speed').value = value; store.set('speed', value); }
host('speed').addEventListener('change', e => setSpeed(e.target.value));
if (store.get('speed') && [...host('speed').options].some(o => o.value === store.get('speed'))) setSpeed(store.get('speed'));
function setLoop(on) { E.loop = on; host('loop').value = host('loop-menu').value = on ? '1' : '0'; store.set('loop', on ? '1' : '0'); }
host('loop').addEventListener('change', e => setLoop(e.target.value === '1'));
host('loop-menu').addEventListener('change', e => setLoop(e.target.value === '1'));
setLoop(store.get('loop') !== '0');

/* ---------- waveforms ---------- */
const waveforms = host('waveforms');
host('wave-toggle').addEventListener('click', e => {
  const collapsed = waveforms.classList.toggle('collapsed');
  e.currentTarget.setAttribute('aria-expanded', String(!collapsed));
  store.set('waveforms', collapsed ? 'collapsed' : 'open');
  applyPageScroll();
});
function applyPageScroll(){const open=!waveforms.classList.contains('collapsed');root.classList.toggle('wave-open',open);document.body.classList.toggle('page-scroll',open);syncPanelChecks();}
if (store.get('waveforms') === 'collapsed') host('wave-toggle').click();
host('signal').addEventListener('change', e => E.select(e.target.value || null));

const plotScope = host('plot-scope');
const plotView = host('plot-view');
plotView.value = new URLSearchParams(location.search).get('wave') === 'report' ? 'report' : 'simulation';
const plotColumns = host('plot-columns');
const plotGuides = host('plot-guides');
plotScope.value = store.get('plot-scope') || 'selected';
plotColumns.value = store.get('plot-columns') || '2';
plotGuides.checked = store.get('plot-guides') !== 'off';
function applyPlotOptions() {
  host('waveforms').style.setProperty('--plot-columns', plotColumns.value);
  E.setPlotOptions({ scope: plotScope.value, references: plotGuides.checked, view: plotView.value });
  store.set('plot-scope', plotScope.value);
  store.set('plot-columns', plotColumns.value);
  store.set('plot-guides', plotGuides.checked ? 'on' : 'off');
  refresh();
}
plotScope.addEventListener('change', applyPlotOptions);
plotView.addEventListener('change', applyPlotOptions);
plotColumns.addEventListener('change', applyPlotOptions);
plotGuides.addEventListener('change', applyPlotOptions);
host('plot-reset').addEventListener('click', () => E.resetPlotZoom());

const equations = {
  source: ['Source', '<i>v</i> = <i>V</i><sub>s</sub>', 'Imposed supply voltage'],
  resistor: ['Resistance', '<i>v</i> = <i>R i</i>', 'Pressure drop follows flow'],
  capacitor: ['Capacitance', '<i>i</i> = <i>C</i> <span class="frac"><span>d<i>v</i></span><span>d<i>t</i></span></span>', 'Stored volume follows voltage'],
  inductor: ['Inductance', '<i>v</i> = <i>L</i> <span class="frac"><span>d<i>i</i></span><span>d<i>t</i></span></span>', 'Flow inertia'],
  diode: ['Diode', '<i>i</i> ≥ 0, &nbsp;<i>v</i> ≈ <i>V</i><sub>f</sub>', 'One-way flow when conducting'],
  switch: ['Switch', 'on: <i>v</i> = <i>R</i><sub>on</sub><i>i</i> &nbsp;·&nbsp; off: <i>i</i> = 0', 'Controlled valve'],
  junction: ['Junction', 'Σ <i>i</i> = 0', 'Flow is conserved'],
  coupled: ['Coupled inductors', '<b>v</b> = <b>L</b> <span class="frac"><span>d<b>i</b></span><span>d<i>t</i></span></span>', 'Mutual inductance included'],
  coupled3: ['Coupled inductors', '<b>v</b> = <b>L</b> <span class="frac"><span>d<b>i</b></span><span>d<i>t</i></span></span>', 'Mutual inductance included'],
  coupled4: ['Coupled inductors', '<b>v</b> = <b>L</b> <span class="frac"><span>d<b>i</b></span><span>d<i>t</i></span></span>', 'Mutual inductance included'],
  load: ['Load', '<i>i</i> = <span class="frac"><span><i>v</i></span><span><i>R</i></span></span>', 'Resistive load'],
  flowmeter: ['Flow meter', '<i>v</i> = 0', 'Ideal series measurement'],
  pressuremeter: ['Pressure meter', '<i>i</i> = 0', 'Ideal differential measurement'],
  input: ['Input', '<i>v</i> = 0', 'Ideal through connection'], output: ['Output', '<i>v</i> = 0', 'Ideal through connection']
};
function stats(samples, key) {
  let min = Infinity, max = -Infinity, area = 0, square = 0;
  for (let j = 0; j < samples.length; j++) {
    const v = samples[j][key];
    if (v < min) min = v; if (v > max) max = v;
    if (j) { const a = samples[j - 1], dt = samples[j].t - a.t; area += dt * (v + a[key]) / 2; square += dt * (v * v + a[key] * a[key]) / 2; }
  }
  const T = samples.length > 1 ? samples[samples.length - 1].t - samples[0].t : 0;
  return { min, max, mean: T ? area / T : samples[0]?.[key] ?? 0, rms: T ? Math.sqrt(square / T) : Math.abs(samples[0]?.[key] ?? 0) };
}
function renderLevels(signal, doc) {
  const strip = host('levels');
  const card = host('equation');
  const report = plotView.value === 'report' ? window.EditorWaveformReference.create(doc) : null;
  if (report?.available) {
    strip.textContent = `Ideal report reference · Vi ${fmt(report.vin)} V · Vo ${fmt(report.vo)} V · Ii ${fmt(report.ii)} A · Io ${fmt(report.io)} A · n ${fmt(report.n)} · overlap D ${fmt(report.D)} · no startup`;
    card.hidden = false;
    card.innerHTML = '<span class="eq-name">Full-bridge boost</span><span class="eq-math"><math><msub><mi>V</mi><mi>o</mi></msub><mo>=</mo><mfrac><mrow><mi>n</mi><msub><mi>V</mi><mi>i</mi></msub></mrow><mrow><mn>1</mn><mo>−</mo><mi>D</mi></mrow></mfrac><mo>,</mo><mspace width="1em"/><msub><mi>I</mi><mi>i</mi></msub><mo>=</mo><mfrac><mrow><msub><mi>V</mi><mi>o</mi></msub><msub><mi>I</mi><mi>o</mi></msub></mrow><msub><mi>V</mi><mi>i</mi></msub></mfrac></math></span><span class="eq-note">D = 2dgate − 1 · n = Ns/Np</span>';
    return;
  }
  if (!signal || !signal.samples.length) { strip.innerHTML = '<span class="hint">No simulation yet — complete the circuit to see signals.</span>'; card.hidden = true; return; }
  const c = doc.components.find(c => c.id === signal.id);
  const name = signal.id + (signal.winding !== null ? ` · W${signal.winding + 1}` : '');
  const parts = [`<b>${name}</b>`, `<span>${signal.metadata?.label||'Ripple'} · ${signal.metadata?.window||'Startup'}</span>`];
  const keys = signal.kind === 'wire' || c?.type === 'junction' ? [['voltage', 'V', 'v']] : [['voltage', 'V', 'v'], ['current', 'A', 'a']];
  for (const [key, unit, cls] of keys) {
    const s = stats(signal.samples, key), sym = unit === 'V' ? 'V' : 'I';
    parts.push(`<span class="${cls}"><i></i>${unit}</span><code>${sym}̄ ${fmt(s.mean)}</code><code>${sym}max ${fmt(s.max)}</code><code>${sym}min ${fmt(s.min)}</code><code>${sym}rms ${fmt(s.rms)}</code><code>Δ${sym} ${fmt(s.max-s.min)} ${unit}</code>`);
  }
  strip.innerHTML = parts.join(' ');
  const eq = signal.kind === 'wire' ? ['Pipe voltage', '<i>v</i> = <i>V</i><sub>node</sub> − <i>V</i><sub>ref</sub>', 'One electrical node'] : equations[c?.type];
  if (eq && signal.metadata?.mode==='ideal') { card.hidden=false; card.textContent=!signal.metadata.reduced?'Ideal components · Finite L/C dynamics retained. No validated ripple-neglected reduction for this circuit; see Model & protection.':signal.metadata.topology==='fullboost'?'Report course reference · Q=CV fixed; capacitor path current alternates with zero cycle mean. Filter ripple and transformer excitation omitted; symmetric overlap sharing.':'Periodic course reference · Q=CV, capacitor i=0 cycle-averaged; filter v=L di/dt ripple omitted; flyback storage and forward reset ramps retained.'; }
  else if (eq) { card.hidden = false; card.innerHTML = `<span class="eq-name">${eq[0]}</span><span class="eq-math">${eq[1]}</span><span class="eq-note">${eq[2]}</span>`; }
  else card.hidden = true;
}

/* ---------- selection card ---------- */
function describe(c) {
  const type = D.types[c.type] || {};
  const bits = [];
  if (c.type === 'switch') bits.push(c.pwm ? `PWM ${fmt(c.pwm.frequency / 1000)} kHz · D ${fmt(c.pwm.duty * 100, 1)} %` : `${fmt(c.value)} ms pulse`);
  else if (c.type === 'source') bits.push(c.waveform === 'sine' ? `${fmt(c.value)} V peak · ${fmt(c.frequency ?? 50)} Hz` : `${fmt(c.value)} V`);
  else if (c.type.startsWith('coupled')) {
    bits.push(`${fmt(c.value)} mH`);
    const n = Object.keys(type.ports || {}).length / 2;
    bits.push((c.turns || Array(n).fill(1)).map(v => fmt(v, 2)).join(':'));
    bits.push(`k = ${fmt(c.coupling ?? 1)}`);
  } else if (!['junction', 'flowmeter', 'pressuremeter', 'input', 'output'].includes(c.type)) bits.push(`${fmt(c.value)} ${(type.unit || '').replace(/ ·.*/, '')}`.trim());
  if (c.bodyDiode) bits.push('integrated diode');
  if (c.locked) bits.push('locked');
  return bits.filter(Boolean).join(' · ');
}

/* ---------- refresh on every editor change ---------- */
let signalKey = '';
function refresh() {
  const doc = E.document, sel = E.selection, model = E.model;
  const report = window.EditorWaveformReference.create(doc);
  plotView.querySelector('[value=report]').disabled = !report.available;
  host('report-availability').textContent = report.available ? 'Teaching reference: ideal, periodic full-bridge boost waveforms. This is a plot source, not a simulation mode.' : 'Teaching reference unavailable: '+report.reason;
  if(!report.available && plotView.value==='report'){plotView.value='simulation';E.setPlotOptions({view:'simulation'});}
  const viewNote = host('plot-view-note');
  viewNote.hidden = plotView.value !== 'report';
  viewNote.textContent = report.available ? report.note : report.reason;
  refreshTools(); refreshZoom();refreshTiming(doc,model);
  // selection card
  const c = sel?.kind === 'component' ? doc.components.find(c => c.id === sel.id) : null;
  const w = sel?.kind === 'wire' ? doc.wires.find(w => w.id === sel.id) : null;
  host('card-name').textContent = c ? `${(D.types[c.type]?.label || c.type).replace(/ ·.*/, '')} ${c.id}` : w ? `Pipe ${w.id}` : 'Nothing selected';
  host('card-values').textContent = c ? describe(c) || 'No adjustable value' : w ? `${w.from.component}.${w.from.port} → ${w.to.component}.${w.to.port}` : 'Click a part or pipe to probe it';
  // duration
  host('duration').textContent = model ? `/ ${fmt(model.duration * 1000)} ms` : '';
  // probe list
  const current = sel?.id || '';
  const ids = doc.components.map(c => c.id).join('|') + '#' + current;
  const select = host('signal');
  if (select.dataset.ids !== ids) {
    select.dataset.ids = ids;
    select.replaceChildren(new Option(model ? 'Default probe' : '—', ''));
    for (const comp of doc.components) select.add(new Option(`${comp.id} · ${(D.types[comp.type]?.label || comp.type).replace(/ ·.*/, '')}`, comp.id));
    if (w) select.add(new Option(`Pipe ${w.id}`, w.id));
  }
  select.value = current;
  // level strip: recompute only when the model, the probed item or the winding changes
  const probe = E.probe;
  const key = model ? `${modelStamp(model)}:${probe.kind}:${probe.id}:${probe.winding}:${plotView.value}` : 'none';
  if (key !== signalKey) { signalKey = key; renderLevels(model ? E.signal : null, doc); }
  refreshDock();
}
const stamps = new WeakMap(); let stampCounter = 0;
function modelStamp(model) { if (!stamps.has(model)) stamps.set(model, ++stampCounter); return stamps.get(model); }
root.addEventListener('circuit-editor:change', refresh);
root.addEventListener('change', e => { if (e.target.closest('#ed-fields')) requestAnimationFrame(refresh); }); // winding picker changes probe without status()

/* ---------- phone dock + sheets ---------- */
function setSheet(name, toggle = true) {
  const next = toggle && root.dataset.sheet === name ? null : name;
  if (next) root.dataset.sheet = next; else delete root.dataset.sheet;
  if (next !== 'inspect' && !$('#ed-inspector').hidden && phone.matches) $('#ed-inspector-toggle').click();
  if (next === 'build') { work.classList.remove('builder-hidden'); activateConnect(); }
  refreshDock();
}
function refreshDock() {
  const inspecting = !$('#ed-inspector').hidden;
  const mode = root.dataset.sheet === 'build' ? 'build' : inspecting ? 'inspect' : root.dataset.dockFocus==='simulation'&&!work.classList.contains('setup-hidden') ? 'simulation' : root.dataset.dockFocus==='signals' ? 'signals' : null;
  $$('[data-dock]').forEach(b => b.classList.toggle('active', b.dataset.dock === (mode || 'canvas')));
  const run = root.querySelector('[data-dock="run"]');
  run.textContent = E.playing ? 'Pause' : 'Run';
  run.disabled = !E.model;
  syncPanelChecks();
}
root.addEventListener('circuit-editor:playback', refreshDock);
root.querySelector('.mobile-dock').addEventListener('click', e => {
  const b = e.target.closest('[data-dock]'); if (!b) return;
  const mode = b.dataset.dock;
  if (mode === 'canvas') { root.dataset.dockFocus='canvas';escapeKey(); setSheet(null); $('.canvas-area').scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  if (mode === 'build') { setSheet('build'); if (root.dataset.sheet !== 'build') escapeKey(); }
  if (mode === 'inspect') { delete root.dataset.sheet; $('#ed-inspector-toggle').click(); }
  if (mode === 'simulation') {
    const shown=work.classList.contains('setup-hidden');
    setSheet(null,false);setSetup(shown);
    if(shown)requestAnimationFrame(()=>$('.setup-panel').scrollIntoView({block:'start',behavior:'smooth'}));
  }
  if (mode === 'run') { $('#ed-play').click(); requestAnimationFrame(refreshDock); }
  if (mode === 'signals') {
    root.dataset.dockFocus='signals';
    setSheet(null);
    if (waveforms.classList.contains('collapsed')) host('wave-toggle').click();
    waveforms.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
});
$('#ed-play').addEventListener('click', () => requestAnimationFrame(refreshDock));
phone.addEventListener('change', () => { delete root.dataset.sheet; $('.wave-probe').open=!phone.matches;positionWaveControls();refreshDock(); });

/* ---------- start-up circuit: #<preset> in the URL, buck by default ---------- */
const presetFromHash = () => { const wanted = location.hash.slice(1); return wanted && [...converter.options].some(o => o.value === wanted) ? wanted : null; };
converter.value = presetFromHash() || 'buck'; fire(converter, 'change');
window.addEventListener('hashchange', () => { const next = presetFromHash(); if (next && next !== converter.value) { converter.value = next; fire(converter, 'change'); } });
applyPlotOptions();
const requestedProbe = new URLSearchParams(location.search).get('probe');
if (requestedProbe) E.select(requestedProbe);
setSetup(store.get('panel-setup') === 'shown');
$('.transport').hidden=store.get('panel-playback') === 'hidden';
if(store.get('panel-properties') === 'shown' && $('#ed-inspector').hidden) $('#ed-inspector-toggle').click();
applyPageScroll();
$('.wave-probe').open=!phone.matches;positionWaveControls();
if (!phone.matches && !work.classList.contains('builder-hidden')) activateConnect();
refresh();
})();
