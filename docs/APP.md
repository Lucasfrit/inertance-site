# Inertance web app — compact hybrid shell

Updated 7 October 2026. `app/` is the working circuit simulator for the
website: the **real** editor and solver from the private `cwas` repo, running
inside the *Compact hybrid* layout (concept 6 in `designs/`). It is not a mockup:
every circuit on screen is simulated, drawn and plotted by the editor code.

## Published status — 7 October 2026

Both [inertance.org](https://inertance.org/) and
[hydraulicanalogy.com](https://hydraulicanalogy.com/) open `/app/` directly over
HTTPS; both have valid apex/www certificates and HTTPS enforcement. The current
app stamp is `cwas 763d364`, containing runtime released at `91e6c45`. Private
source commits alone do not update either site: build/check locally, push the
primary generated app, then sync the independent mirror hourly or manually.
Inertance remains blocked by DTU DNS; the second domain worked normally.

[DEPLOYMENT.md](DEPLOYMENT.md) records the current hosting/Porkbun settings,
certificate work, deployment evidence, remaining blocker and publishing steps.
The historical local-only implementation notes are superseded by this release.

## Local development

Open it locally:

```sh
python3 -m http.server 4180 --directory .    # from inertance-site/
# then http://localhost:4180/app/   (or /app/#forward, #flyback, #fullbuck …)
```

## Files

| Path | Role | Edit? |
| --- | --- | --- |
| `app-src/shell.html` | Layout markup. Contains every `#ed-*` element the editor needs | yes |
| `app-src/app.css` | All shell styling: tokens, grid, header, builder, transport, waveforms, phone sheets | yes |
| `app-src/host.js` | Glue: shell widgets ⇄ editor controls and `window.circuitEditor` API | yes |
| `app-src/assets/` | Logo SVGs and `water-symbols.svg` (designs' detailed set + tee, hose, connector) | yes |
| `build_app.py` | Inlines CSS, shell, the editor modules and host.js into `app/index.html`; copies assets | rarely |
| `update_from_simulator.py` | One command: cwas dev pages + checks, both site builds, both browser checks | rarely |
| `app/` | **Generated.** Never edit by hand | no |
| `tools/check-app.cjs` | Headless-Chrome regression check of the built app | yes |
| `../cwas/simulator/editor-*.js` | Editor, solver, routing, layout (private) | only for physics/editor behavior |

Build and check:

```sh
python3 build_app.py
node tools/check-app.cjs     # needs Playwright + Chrome; see header of the file
```

`build_app.py` fails loudly if the shell is missing an id the editor looks up, has
a duplicate, lacks the `.work` element, or if host.js uses a `window.circuitEditor`
member the editor doesn't provide. It reads the module list from
`../cwas/simulator/editor-modules.json` and stamps the simulator commit into
`<meta name="inertance-simulator">` (shown under Help).

**After simulator changes** run `python3 update_from_simulator.py` (all builds and
checks, both repos; `--quick`, `--release`, `--full`). The full workflow and a
"what else does my change need" table: `../cwas/docs/WEBSITE-WORKFLOW.md`. Screenshots from the check land in
`tools/out/` (git-ignored).

## How it fits together

```
app/index.html
 ├─ <style>  app-src/app.css
 ├─ d3 7.9.0 (local assets/vendor/d3.v7.9.0.min.js)
 ├─ app-src/shell.html          #circuit-editor root + all #ed-* controls
 ├─ <script> cwas editor modules, unchanged, same order as cwas build-editor.py
 │           → editor-ui.js binds to #ed-* ids and exposes window.circuitEditor
 └─ <script> app-src/host.js    reads the API, drives #ed-* controls, owns shell state
```

Ownership rule: **the editor owns circuit state** (document, selection, history,
physics, drawing, plots, playback time). host.js never edits the circuit document.
It changes circuit state only the way a user would — setting an editor control's
value and dispatching `change`/`input`/`click` — or through API methods the editor
provides. If the shell needs new circuit behavior, add it to the editor and its API
in `cwas`, then rebuild.

### Editor DOM contract (ids that must exist)

Header/menus: `ed-converter ed-new ed-load ed-save ed-preset ed-freewheel
ed-hydraulic-review ed-arrange ed-undo ed-redo ed-magnetic-mode ed-pressure-scale
ed-pressure-gain ed-pressure-gain-label ed-reference ed-travel ed-pressure-range`.
Builder: `ed-palette ed-add` (visually hidden; the part buttons drive them).
Canvas: `ed-canvas ed-pipe ed-minus ed-plus ed-fit ed-status ed-inspector-toggle`,
JSON dialog `ed-transfer ed-json ed-copy ed-download ed-import ed-browse
ed-close-transfer ed-transfer-status ed-file`.
Transport: `ed-play ed-time ed-scrub ed-reset ed-speed ed-speed-label` (speed range
hidden, driven by the Speed select). Waveforms: `ed-plots ed-calcs`.
Properties: `ed-inspector ed-selection ed-fields ed-rotate ed-lock ed-delete`.
Misc: `ed-tip ed-announce`, plus an element with class `work` (the editor toggles
`inspector-hidden` on it). The editor also sets text on `ed-play`, `ed-arrange`,
`ed-time`, `ed-status`, `ed-selection` and rebuilds `ed-fields`/`ed-plots`; style
them, don't fill them.

Styling notes: the SVG canvas height is forced by CSS (`height:100%!important`) so
it fills `.stage`; the editor refits on stage width *and* height changes. Charts use
`--ed-text`/`--ed-border` and a height from `data-chart-height` on the root (150).
Charts are sized from their container width when drawn, so collapse the waveform
panel with `height:0` (as now), never `display:none`.

### `window.circuitEditor` host API (from `cwas/simulator/editor-ui.js`)

Read: `document` (deep copy), `model`, `time`, `playing`, `selection`, `viewport`
(`{zoom, pan}`), `routes`, `arranging`, `layoutReport`, `probe` (`{id, kind, type,
winding}` — cheap), `signal` (probe + `samples:[{t, voltage, current}]` — copies
every sample; call only when `probe`/`model` changed).
Write: `loop = true|false`, `select(id)` (component or wire id), `load(json)`.
Event: `circuit-editor:change` on `#circuit-editor` after every status update
(edits, selection, simulation, tool changes, arrangement). host.js `refresh()` runs
on it; keep that handler cheap (it can fire during drags).

## What the shell implements

- **Header:** logo → site home; circuit picker (10 editable presets; URL hash
  `#buck` etc. selects one, also live); File (new, open/save JSON, three examples);
  Builder toggle; Playback (start state — fixed to zero energy — and loop); Display
  (pressure view, color scale/contrast, color reference, visual travel); Help
  (editing gestures and model assumptions); Auto arrange; Undo/Redo; theme.
- **Builder (left, resizable 150–360 px, hideable):** 15 part buttons with water
  symbols and a text filter. Clicking arms placement; the canvas click places.
- **Canvas:** floating Select / Connect / zoom / Fit tools; selection card (name +
  key values) with **Properties**, which opens the editor inspector as a right
  column; status line; JSON dialog. Bands above/below the drawing keep Fit from
  hiding parts under the floating tools.
- **Transport:** Run/Pause/Replay, physical time + switch states, scrubber,
  duration, speed 0.01×–10× (default 0.1×), loop (default continuous), reset.
- **Waveforms:** collapsible; *Probe* picker selects which part is plotted; level
  strip with mean / max / min / RMS for V and I (time-weighted) and the part's
  constitutive equation; editor charts; values & calculations text.
- **Theme:** light/dark shell, stored in `localStorage['inertance-theme']`. The
  hydraulic drawing stays black-on-paper in both themes on purpose (pressure color
  semantics). Other stored prefs: builder width/visibility, speed, loop, waveform
  collapse (all `inertance-*`, try/catch guarded).
- **Phones (≤ 760 px):** stacked page with a bottom dock (Canvas, Build, Inspect,
  Run, Signals). Build and Properties open as bottom sheets; choosing a part closes
  the sheet so the next tap places it.

## Deliberately not implemented (prototype features without physics behind them)

- **Multi-signal overlay picker** (V/I checkboxes per part). The editor plots one
  probe at a time; overlaying needs an editor plot API (series list + shared axes).
- **Automatic settling and a duration control.** Settled view checks a solved
  run and reports non-convergence. Duration remains in circuit JSON.
- **Dark drawing.** A CSS invert (as the prototype image used) flips "darker blue
  = higher pressure". Needs a designed dark palette inside the editor.

## Known limitations / next candidates

- Frame rate is bound by editor SVG painting (~1,000–1,900 nodes). Headless
  software-rendered Chrome: buck ~24 fps, full-bridge boost ~12 fps (the original
  editor page measures 23 and 5.7 fps under the same conditions). GPU browsers are
  faster; worker simulation and fewer nodes are editor work in `cwas`.
- d3 7.9.0 is served from local `assets/vendor/` with its ISC license.
  No service worker or offline installation is provided.
- The phone header wraps to three rows; a compact overflow menu would reclaim space.
- Keyboard: editor shortcuts (R, Esc, Delete, ⌘Z) work after interacting with the
  app; menus are `<details>` without arrow-key navigation. Needs an a11y pass.
- The landing page links to `/app/`. See [DEPLOYMENT.md](DEPLOYMENT.md) for the
  released revision, verification and hosting configuration.

## Selected physics modes (1 October 2026)

The compact strip exposes editor-owned Ideal / Ripple / Leakage, separate device
losses, startup/settled view, optional periodic course overlay, and explicit k/RC/
minimum-step parameters. Controls are `ed-model-ideal`, `ed-model-ripple`,
`ed-model-leakage`, `ed-model-losses`, `ed-model-view`, `ed-model-overlay`,
`ed-model-coupling`, `ed-model-cap`, `ed-model-resistance`, `ed-model-steps`;
editor-owned labels are `ed-model-note`, `ed-model-support`, `ed-model-equivalent`,
`ed-model-json`. Both shells expose these ids. No host physics is added.

The editor's API adds `sample`, `modelConfiguration`, `modeSupport`, `setModel`.
`signal.metadata` labels the selected model/measurement window. Level statistics
include peak-to-peak ripple, and the equation card describes averaged laws in
Ideal. Plots keep future traces faint and elapsed traces solid. Reference overlay
is dashed, separately labeled/statistical, and never supplies animation state.

Ideal is steady-state-only: buck/boost/inverting CCM, flyback CCM/DCM and valid
forward CCM references; storage/reset ramps remain. Leakage is validated only
for recognized flyback/forward with an inspectable derived primary series RC
snubber. Unsupported circuits/regimes explicitly fall back to Ripple with a
reason. All general switched preset paths are checked; current-fed full bridge
requires configured losses because ideal conduction constraints are redundant.
Mode settings persist in JSON/undo without adding permanent circuit parts.
Declared buck/inverting/forward filter presets now use 4.7 mH; loaded values stay.

See `../cwas/docs/SIMULATION-MODES.md` for the full equations, limits and evidence.
`node tools/check-modes.cjs` checks both shells, actual sampled charge vs painted
wall, actual winding voltage vs painted pressure, overlays/guards, undo/JSON,
playback cost, desktop and 390 px phone. `update_from_simulator.py` includes it
and the new `check-editor-modes.cjs` physics check. Screenshots are in `tools/out/`.
