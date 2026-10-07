const layouts = ['workbench', 'studio', 'guided', 'analysis', 'focus', 'compact'];
const fidelity = [
  ['Ideal', 'No leakage, switching loss, or recovery. Best for understanding topology.'],
  ['Teaching', 'Adds winding resistance, diode drop, switch resistance, and capacitor ESR.'],
  ['Realistic', 'Exposes leakage and non-ideal controls where the current solver supports them.']
];

function showLayout(name) {
  const layout = layouts.includes(name) ? name : 'workbench';
  document.body.dataset.layoutMode = layout;
  document.querySelectorAll('[data-concept]').forEach(el => el.classList.toggle('active', el.dataset.concept === layout));
  document.querySelectorAll('[data-layout]').forEach(el => el.classList.toggle('active', el.dataset.layout === layout));
  history.replaceState(null, '', `#${layout}`);
  document.title = `Inertance · ${document.querySelector(`[data-layout="${layout}"] span`).textContent}`;
}

document.addEventListener('click', event => {
  const layoutButton = event.target.closest('[data-layout]');
  if (layoutButton) return showLayout(layoutButton.dataset.layout);

  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'new') document.querySelector('#new-dialog').showModal();
  if (action === 'notes') document.querySelector('#notes-dialog').showModal();
  if (action === 'run') {
    const button = event.target.closest('button');
    button.classList.toggle('running');
    const running = button.classList.contains('running');
    button.textContent = running ? 'Ⅱ Pause' : (button.classList.contains('big-run') ? '▶ Run one cycle' : '▶ Run');
    document.querySelectorAll('[data-run-label]').forEach(el => el.textContent = running ? 'Simulation running' : 'Run simulation');
  }
  if (action === 'panel') document.querySelector('.signal-drawer').classList.toggle('hidden');
  if (action === 'sheet') document.querySelector('.bottom-sheet').classList.toggle('open');
  if (action === 'fidelity') document.querySelector('.fidelity-card').classList.toggle('collapsed');
  if (action === 'advanced') alert('Advanced settings would open as a focused side sheet: solver, timestep, initial conditions, losses, pressure mapping, and visual amplification.');
  if (action === 'theme') {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('inertance-theme', next);
    event.target.closest('button').textContent = next === 'dark' ? 'Light mode' : 'Dark mode';
  }
  if (action === 'builder-toggle') {
    const workspace = document.querySelector('.compact-workspace');
    const hidden = workspace.classList.toggle('builder-hidden');
    const button = event.target.closest('button');
    button.classList.toggle('active', !hidden);
    button.setAttribute('aria-pressed', String(!hidden));
  }

  const modelButton = event.target.closest('[data-model]');
  if (modelButton) modelButton.parentElement.querySelectorAll('button').forEach(el => el.classList.toggle('active', el === modelButton));

  const component = event.target.closest('[data-component]')?.dataset.component;
  if (component) document.querySelectorAll('[data-selected-name]').forEach(el => el.textContent = `${component} · new`);

  const tab = event.target.closest('[data-tab]')?.dataset.tab;
  if (tab) {
    document.querySelectorAll('[data-tab]').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
    document.querySelectorAll('[data-pane]').forEach(el => el.classList.toggle('active', el.dataset.pane === tab));
  }
});

document.querySelector('[data-fidelity]').addEventListener('input', event => {
  const [label, copy] = fidelity[Number(event.target.value)];
  document.querySelector('[data-fidelity-label]').textContent = label;
  document.querySelector('[data-fidelity-copy]').textContent = copy;
});

document.querySelector('.mobile-dock').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  document.querySelectorAll('.mobile-dock button').forEach(el => el.classList.toggle('active', el === button));
});

const compactWorkspace = document.querySelector('.compact-workspace');
const builderResizer = document.querySelector('.panel-resizer');
let resizingBuilder = false;
builderResizer.addEventListener('pointerdown', event => {
  resizingBuilder = true;
  builderResizer.setPointerCapture(event.pointerId);
});
builderResizer.addEventListener('pointermove', event => {
  if (!resizingBuilder) return;
  const left = compactWorkspace.getBoundingClientRect().left;
  const width = Math.max(150, Math.min(360, event.clientX - left));
  compactWorkspace.style.setProperty('--builder-width', `${width}px`);
});
builderResizer.addEventListener('pointerup', event => {
  resizingBuilder = false;
  builderResizer.releasePointerCapture(event.pointerId);
});
builderResizer.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const current = parseFloat(getComputedStyle(compactWorkspace).getPropertyValue('--builder-width')) || 210;
  const width = Math.max(150, Math.min(360, current + (event.key === 'ArrowRight' ? 12 : -12)));
  compactWorkspace.style.setProperty('--builder-width', `${width}px`);
});

window.addEventListener('hashchange', () => showLayout(location.hash.slice(1)));
const savedTheme = localStorage.getItem('inertance-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.dataset.theme = savedTheme;
document.querySelectorAll('[data-action="theme"]').forEach(button => button.textContent = savedTheme === 'dark' ? 'Light mode' : 'Dark mode');
showLayout(location.hash.slice(1));
