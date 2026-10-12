# Inertance web app — compact hybrid shell

The 11 October combined local build retains the current shell and all integrated
memristor, custom Save/Rename/Discard, mode, import, layout and analytics work.
It remains uncommitted and unpublished. Its integration repairs add the fixed
memristor preset event, correct an open-switch memory voltage annotation, and
refresh/extend cross-feature validation. The default pipeline has 18 model/storage
checks and seven browser suites; --full adds three development-browser checks.
See sibling `cwas/docs/INTEGRATION-2026-10-11.md` for source provenance, snapshots,
test/visual evidence, deferred prototypes and the exact release sequence.

Updated 11 October 2026. `app/` is the working circuit simulator for the
website: the **real** editor and solver from the private `cwas` repo, running
inside the *Compact hybrid* layout (concept 6 in `designs/`). It is not a mockup:
every circuit on screen is simulated, drawn and plotted by the editor code.

## Published status — 7 October 2026

Both [inertance.org](https://inertance.org/) and
[hydraulicanalogy.com](https://hydraulicanalogy.com/) open `/app/` directly over
HTTPS; both have valid apex/www certificates and HTTPS enforcement. The current
app stamp is `cwas d0bba0c`. This release adds experimental KiCad/LTspice
netlist import, verified steady-state Ripple with advanced transient controls,
curated course-style example layouts and reset, merged particle streams, and
optional consent-based Umami analytics. Private
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
| `app-src/analytics/` | Optional Umami/PostHog consent adapter, styling and public tracking configuration | yes |
| `assets/analytics/` | Generated analytics assets shared by app and About | no |
| `build_app.py` | Inlines CSS, shell, the editor modules and host.js into `app/index.html`; copies assets | rarely |
| `update_from_simulator.py` | One command: cwas dev pages + checks, both site builds, both browser checks | rarely |
| `app/` | **Generated.** Never edit by hand | no |
| `tools/check-app.cjs` | Headless-Chrome regression check of the built app | yes |
| `tools/check-analytics.cjs` | Consent and data filtering checks with all requests intercepted | yes |
| `../cwas/simulator/editor-*.js` | Editor, solver, routing, layout (private) | only for physics/editor behavior |

Build and check:

```sh
python3 build_app.py
node tools/check-app.cjs     # needs Playwright + Chrome; see header of the file
node tools/check-analytics.cjs # never sends test events to providers
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

### Optional usage analytics (PostHog addition, 10 October 2026)

Umami Cloud Hobby is already published; the additional PostHog integration is
local and awaits the normal coordinated release. Both projects use EU regions.
`app-src/analytics/config.json` holds the public Umami website UUID and PostHog
`phc_` project token/ingestion host. Blank either token to disable that provider,
or both to disable collection. `build_app.py` validates the UUID, public token
prefix and official ingestion host, then produces
`assets/analytics/{config.js,analytics.js,analytics.css}`. The mirror's existing
`assets/` allowlist copies them. Private API keys and credentials never belong
in these files.

No cloud SDK runs on the website. The local adapter uses Umami's documented
[`POST /api/send`](https://docs.umami.is/docs/api/sending-stats) and PostHog's
[`POST /i/v0/e/`](https://posthog.com/docs/api/capture) public endpoints directly.
An OPTIONS-only check confirmed the EU PostHog endpoint accepts Inertance's
JSON POST. Production ingestion still needs verification after publication.

Collection runs only over HTTPS on the four production apex/www hostnames, on
`/app/` and `/about/`, after an explicit Allow choice. Localhost, previews, root
redirects and the older lab are excluded. Help and About have Analytics settings.
Allow/decline choices use version 2 local storage for 180 days per origin. Old
Umami-only acceptance requires a fresh choice; a valid version 1 decline stays
off without another prompt. Missing, invalid, future-dated or expired choices
keep collection off. DNT/GPC override acceptance. Withdrawal aborts in-flight
requests to both providers, stops future requests and clears memory-only IDs,
including in other same-origin tabs. Delivered requests cannot be recalled.

Umami receives `type: event` and `{website, hostname, url}`, plus an optional
allowlisted `name`. PostHog receives the public token, `$pageview` or the same
fixed name, a random anonymous `distinct_id`, and only these properties:
`$current_url`, `$host`, `$pathname`, `$session_id`, `$process_person_profile:
false`, `$is_identified: false` and `$geoip_disable: true`. URLs are reconstructed
from the approved production host and path, with no query/hash. IDs are generated
only after consent and held in page memory, never cookies/local/session storage.
Reloading, another tab or renewed consent creates fresh IDs. UUIDv7 sessions
rotate after 30 minutes without a captured action or 24 hours. This intentionally
cannot measure returning people or cross-page unique users reliably.

No circuit data, titles, referrers, identities, arbitrary event properties,
automatic click capture, performance reporting or replay are sent. Normal IP and
User-Agent headers reach both providers; Umami uses them for approximate visitor,
device and location statistics. PostHog location enrichment and person profiles
are disabled. Response identifiers are ignored. Requests omit credentials and
referrers, reject redirects, time out after five seconds, and are never retried
or queued. Limits are 60 captured actions/minute, 300/page and eight concurrent
requests across both providers. One provider's failure does not suppress the
other or affect the simulator.

The shared editor emits `circuit-editor:action` with only `detail.name`.
Standalone pages do not load the adapter. The website listens after initial
preset setup. `simulation_started` and `circuit_edited` are sent once per consent
period within a page. Other fixed names are `preset_<approved key>`,
`mode_ideal|ripple|leakage|transients|fallback`, `arrange_completed`,
`default_view_reset`, `export_json_copy|download` and
`import_<json|spice|kicad|unknown>_<preview_success|preview_failed|applied|apply_failed>`.
No event records opening/cancelling a dialog, the default preset or automatic
arrangement. Preview and apply outcomes remain distinct. The new adapter needs
no additional simulator hooks.

The privacy notice is in `about/index.html`. Umami Hobby retains six months;
PostHog's free plan includes one million analytics events/month and one-year
retention ([pricing](https://posthog.com/pricing)). Counts exclude visitors who
decline or block requests. Dashboards remain private. The PostHog project is
[300801 in the EU account](https://eu.posthog.com/project/300801).

The PostHog plugin connection was verified on 10 October: Codex can read the
`inertance.org` organization and project 300801 directly, and its public tracking
token matches this configuration. The project reports no ingested events yet.
That private read connection is separate from the public tracking token; no
private API key was added to the website.
After a coordinated publication, verify one real consenting visit in the
PostHog dashboard before relying on reports. The HTTP response alone does not
prove an event was ingested. Do not bulk-send synthetic production events.

### Editor DOM contract (ids that must exist)

Header/menus: `ed-converter ed-new ed-load ed-save ed-preset ed-freewheel
ed-hydraulic-review ed-arrange ed-default-view ed-undo ed-redo ed-magnetic-mode ed-pressure-scale
ed-pressure-gain ed-pressure-gain-label ed-reference ed-travel ed-pressure-range`.
Builder: `ed-palette ed-add` (visually hidden; the part buttons drive them).
Canvas: `ed-canvas ed-pipe ed-minus ed-plus ed-fit ed-status ed-inspector-toggle
ed-schematic-name ed-save-checkpoint ed-autosave-status`,
browser saving: `ed-save-browser ed-browser-save-status`,
JSON dialog `ed-transfer ed-json ed-copy ed-download ed-import ed-browse
ed-close-transfer ed-transfer-status ed-file`.
External import dialog: `ed-external-open ed-external-dialog ed-external-close
ed-external-format ed-external-browse ed-external-file ed-external-text
ed-external-preview ed-external-apply ed-external-report`.
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
Import: `await previewImport(text, {format})` (`auto`, `spice`, `kicad`) returns
diagnostics and a validated, arranged document without changing editor state;
`importDocument(document)` preflights and applies it in one undoable operation.
Event: `circuit-editor:change` on `#circuit-editor` after every status update
(edits, selection, simulation, tool changes, arrangement). host.js `refresh()` runs
on it; keep that handler cheap (it can fire during drags).

## What the shell implements

Local 7 October addition: **File → Import KiCad / LTspice · Experimental…**.
Choose a UTF-8 netlist or paste text, Preview, review diagnostics, then Apply.
The bounded subset is literal R/L/C/constant voltage and disjoint 2–4-winding
coupling groups, or native KiCad exported S-expression `.net` with supported
Device symbols. Direct `.kicad_sch`/`.asc`, parameters, semiconductors and models
are rejected with guidance. Source references/nets/ground/polarity survive JSON
save/load; the imported graph stays editable and requests zero-energy startup.
Preview uses the same CWAS solver and layout code as the standalone shell.
Fixtures, native CLI validation and exact semantics are documented in the sibling
`cwas/docs/CIRCUIT-IMPORT.md`; this addition has not been publicly deployed.

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
  hydraulic canvas follows the theme, including labels and crossing halos. Pressure colors keep their physical meaning. Other stored prefs: builder width/visibility, speed, loop, waveform
  collapse (all `inertance-*`, try/catch guarded).
- **Phones (≤ 760 px):** stacked page with a bottom dock (Canvas, Build, Inspect,
  Run, Signals). Build and Properties open as bottom sheets; choosing a part closes
  the sheet so the next tap places it.

## Deliberately not implemented (prototype features without physics behind them)

- **Multi-signal overlay picker** (V/I checkboxes per part). The editor plots one
  probe at a time; overlaying needs an editor plot API (series list + shared axes).
- Worker/background simulation. Settling is bounded but remains synchronous; difficult edits can pause the interface.
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

## Selected physics modes (original implementation, 1 October 2026)

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

## Mode UX update — 7 October 2026 (controls revised 10 October)

The primary fidelity buttons are Ideal, Ripple and Leakage · Experimental.
Ripple defaults to four verified steady-state cycles from the actual finite-L/C
solver. `ed-model-view` is a Transients checkbox; selecting `ed-model-leakage`
enables Startup with the existing guarded flyback/forward finite-coupling RC
equivalent. Unvalidated leakage remains disabled. Controls are flat and short;
the info controls contain explanations and diagnostic details.
Reduced Ideal locks Transients; general Ideal retains its startup dynamics.
Explicit saved/legacy Startup and imported circuits retain that requested view,
and the main Ripple button restores periodic view. JSON and undo/redo preserve it.

The editor owns bounded settling in `editor-settling.js`; the host adds no physics.
The requested Total time is the initial settling horizon, which may extend within
512 cycles / 350,000 steps per final solve. When Transients is enabled it is the
full startup duration. Four cycles must pass state and ripple-relative phase
verification. Single pulses, manual switching, mismatched frequencies, no periodic
excitation and failed convergence report unavailable steady state and clear
playback/plots. The current half bridge fails this budget; use Transients.

`model.duration` is the displayed window; `metadata.windowStart`,
`sample.sourceTime` and `metadata.settling` describe the solved physical clock.
Manual intervention uses sourceTime and selects Transients. Solver information
shows the actual horizon and convergence residuals. Both-shell browser mode
checks cover these contracts. The pipeline includes `check-editor-settling.cjs`.
See sibling cwas SIMULATION-MODES.md for the equations, tolerances and limitations.

## Curated default example views (7 October 2026)

All ten converter/AC presets and the three File examples now load hand-designed
course-style drawings without automatically arranging them. Explicit Auto arrange
remains in the header. The geometry-only `resetDefaultView()` API restores
positions, orientation and pipe bends, preserving values/settings/playback.
It is undoable and requires matching parts/connections. On 10 October the visible
button changed to **Discard changes**; see below. Loaded JSON and imported
drawings retain their supplied geometry.
The playback button is separately labeled **Reset time**.

`window.circuitEditor.defaultExampleView` reports availability and the reason;
`resetDefaultView()` performs the editor-owned action. No host document mutation
is involved. See `../cwas/docs/DEFAULT-LAYOUTS.md` for source references, layout
adaptations, reset matching rules and checks. The default update pipeline includes
the unit and both-shell browser checks; screenshots/contact sheets are under
`tools/out/default-layouts/`. Local review is `/app/#fullbuck`; no publication is
part of this implementation.

Validation on 7 October: update_from_simulator.py --skip-lab completed 12 simulator checks, the app contract build and four browser checks (app, both-shell modes, imports and curated layout/reset). The lower-memory mode-browser fixture also passed separately after the pipeline. Local review remains at http://localhost:4180/app/; no publication was performed.

### Memristor component and example — local, 10 October 2026

Both the Build palette and example selector include Memristor. The compact
`#memristor` comparison drives a native M1 and fixed Rref with a slow 0.5 Hz sine.
The default/selected M1 probe has voltage, current (with dashed Rref comparison),
resistance, plug state and I–V views. Properties exposes Roff/Ron in Ω, QD in C,
x0, hard/Biolek window and p, plus a larger live mechanism. Source units stay
explicit; no unmodeled comparator, threshold or pulse source is implied.

Physics is in cwas, using coupled state/conductance MNA and memory-aware periodic
verification. Host `sample.memristors[id]` exposes x/resistance/window/power;
`signal.samples` adds resistance/state to the existing voltage/current probe.
JSON preserves configured x0 rather than playback memory; replay starts the
selected solved window. Transients starts at x0. Transients shows history, Ripple verifies periodic memory and
can honestly fail; Ideal keeps the same memory equations. Automatic magnetic
Leakage combinations are disabled. External device/subcircuit imports are rejected
rather than converted to a resistor. Details/evidence: cwas docs/MEMRISTOR.md.

Source edits are limited to shell palette, host descriptions/equations/readouts,
build_app.py's dynamic-ID list and pipeline tests. Modules are loaded through
the shared manifest. No publication or commit/push is part of this integration.

Validation: full `python3 update_from_simulator.py` passed 13 numerical suites,
app/lab builds and six browser suites, including memristor sample/paint/editing/
JSON/history/stop-slip/wiring tests in both shells at 1440 and 390 px. Final text
was rebuilt and the memristor browser suite passed again. Desktop and phone
screenshots were inspected; see cwas `tmp/memristor-integration/`. Local review:
http://localhost:4180/app/?probe=M1#memristor. Build stamp is `cwas 6e6a484 +
uncommitted changes`; publishing remains a separate action.

### Compact Simulation controls — 10 October 2026

The primary mode choices are Ideal, Ripple and Leakage · Experimental. Selecting
Leakage enables Transients by default; explicit saved views still load unchanged.
The existing finite-k/RC support for recognized flyback/reset-forward remains
limited and experimental; general leakage is not implemented.

Simulation setup has flat groups and choice buttons, with short visible labels.
Backing select IDs remain for the shared editor/host integration contract but are
hidden; buttons update the same values and events. Timing's dynamic switch list
also uses these buttons. Long mode/device/timing/appearance explanations, support
reasons, solved details and effective JSON are in info popovers, available by
hover, keyboard focus or click. Escape/outside click dismisses them. Startup,
Steady state, Periodic and Unavailable are the compact visible status labels.
Action-menu explanatory notes also use info controls. File/View/Help actions
retain their existing navigation.

Both editor shells are rebuilt from the shared source. Mode browser checks cover
the new controls, Leakage's Startup default, existing solved-state/history
invariants and desktop/phone widths. No deployment is included.

## Custom schematics and Discard changes (10 October 2026)

**Discard changes** beside zoom restores the whole schematic, including values,
settings, deleted/added parts, connections and layout. Examples return to the
selected example's initial document; imports/JSON return to their loaded version.
Custom workspaces return to their last explicit **Save** checkpoint (also available
through **File → Save in browser…**).
Discard cancels tools/arrangement, fits, recalculates the restored mode and
resets playback to its beginning. Undo/Redo recovers
edits and the previous viewport. The old layout-only API remains available.

**Make custom schematic…** is the final topology dropdown option. Browser-saved
workspaces appear under **My schematics · this browser**. Completed edits autosave
an independent draft; explicit Save names the workspace and sets its checkpoint.
Reload resumes the last custom draft unless a recognized hash selects another
circuit. Browser storage uses localStorage (`inertance-schematics-v1`), not cookies,
and is specific to this browser/profile/origin. Clearing site data removes it;
Save JSON gives a portable backup. Storage failures are shown and do not falsely
confirm a save or replace the previous checkpoint.

Save / Saving… / Saved appears beside Discard changes (`ed-save-checkpoint`).
Editing an example or import creates Custom schematic 1, 2, etc. with its original
baseline retained. The clickable project name (`ed-schematic-name`) renames it
without changing its saved checkpoint. `ed-autosave-status` distinguishes a saved
working draft from the explicit checkpoint. Autosaves wait 200 ms, then write
locally; pending drafts flush before workspace/history changes, explicit saves,
page hide and backgrounding. The canvas toolbar wraps on smaller screens and the
host observes its height to keep it above the drawing.

Blocked/full browser storage changes the control to Allow cookies to save and
opens settings guidance, Try again and Save JSON. This uses functional local
storage independently of optional analytics consent; it cannot change browser
permissions. Both shells retain `ed-save-browser` and `ed-browser-save-status`.
The editor API adds `schematic`, `resumeSchematicId`, `discardChanges()`
and `makeCustomSchematic()`. The host reads state for title/hash/startup; it never
mutates documents. See sibling cwas docs/CUSTOM-SCHEMATICS.md for history, storage
failure and multi-tab behavior. The default update pipeline runs the storage unit
check and both-shell desktop/phone custom/discard browser check. Screenshots are
under tools/out/schematics/. This follow-up is local, with no public deployment.

### Loss/reference labeling follow-up — 10 October 2026

Device losses is a checkbox beside Transients (off=ideal switch/diode conduction,
on=configured component losses), backed by the same hidden ed-model-losses select
and saved loss setting. The new ed-device-losses ID mirrors the effective setting
and guards: Ideal locks off; full-bridge boost Ripple locks on. No solver behavior
was added. Compare ideal replaces the simulation Reference label and has its own
info explanation for the dashed course-reference overlay. Appearance uses Color
zero to distinguish its voltage/color origin. Info circles are 14 px with a larger
invisible pointer target. The shared build checks the new ID in both shells.

## Combined follow-up — 11–12 October 2026

Community and Feedback are restored as separate in-app panels, with phone dock
entries, a resizable desktop slot, previews/search/download/open, local contribution
drafts/review and feedback preparation. Current editor load/history supplies the
workspace; no older solver is included. Browser-local contact data never enters
gallery/download exports. There is no shared service or live submission inbox.
Sources: app-src/community.js, community.css and shell; build_app.py packages only
static seed JSON in app/community. See cwas COMMUNITY-EXPLORATION.md for provenance.

The dedicated Playback menu/panel is removed. Run/Pause, scrub, physical time and
Reset time remain in a compact strip; viewing speed/loop are native dropdowns beside Run/Pause (restored on 12 October).
Properties and explicit undoable Auto arrange live inside Builder. Clicking a
component opens Properties; dragging enters Builder while preserving capture and
focus, and canvas panning stays separate. Phones reveal Builder after the drag.

The real native macOS schematic select is retained at the user's request on
12 October, with Converters, Examples, Memristor and custom groups. OS popup
positioning remains an explicit limitation. Inline name edits support Enter/blur
commit and Escape cancel. Unsaved example-derived customs retain their origin,
so Discard restores the original example name/selection without deleting drafts.
Explicit custom checkpoints retain their saved identity; undo/redo includes names.

Leakage is selectable independently of physical support and enables Transients by
default. Unsupported effects/parameters stay disabled and explained. Native memory
retains its MNA/state/plot contracts with the reviewed enlarged wheel, right-edge
outlet and wet-pocket tracers. Coupled water geometry scales with winding radii.
Pipes, water and particles share unique flow-chain geometry for merges/branches.
The update pipeline includes the both-shell follow-up interaction/geometry suite,
with desktop/phone, themes, native groups, name/history/origin, guard, component
click/drag, restored panels, extreme turns and gap/rotation coverage.

### 12 October interface follow-up

Editing opens Builder and hides Simulation, while clicking a component still opens Properties. Timing/model changes remain in Simulation. Speed and loop are native dropdowns in the Run/Pause strip. Waveform details uses labeled statistics cards and SI units. Delete beside Save deletes the current browser schematic with Undo/Redo recovery. Community's contribution control is at the top. Feedback sends privately through FormSubmit with optional Reply-To and no app character limits; direct GitHub reporting and existing-issues links remain available. Consent can be dismissed by Allow even in previews, where collection stays disabled. The native circuit dropdown includes three editable memristor demonstrations using the shared solver.

### Direct private feedback — 12 October

Send feedback replaces the local draft/download flow. It posts privately to `lucas@wybrandt.dk` via FormSubmit, with optional Reply-To and no app-imposed character limits or truncation. The recipient confirmed the required inbox activation. See [FEEDBACK.md](FEEDBACK.md) for delivery behavior and tests. Error and activation responses retain the form text and never claim success. The independent GitHub bug-report and existing-issues links remain available.

## Release licensing and portable sources — 12 October 2026

Visitor Help, About and old lab link to /source/ and /changelog/. Software keeps
AGPL-3.0-or-later with qualified authorship, existing embedded-art grants and full
d3 dependency notices. Only teaching/memory-and-circuits.md has the additional
CC BY-SA grant. Community saves local drafts under versioned proposed future
terms; old terms are not rewritten and contact stays out of exports. Feedback
remains private message delivery, not contribution licensing/intake.

`tools/package-source.py` exports explicit committed simulator modules and lab
inputs beside committed app-src/build/assets/gallery files. It rebuilds in a
clean temporary directory and compares generated app/lab/analytics/gallery bytes.
No Git history, research, course PDFs or browser data is exported. Without Git,
release-input.json freezes the source stamp/date. INERTANCE_BUILD_DATE allows
deterministic stamping in normal builds. Original hashes, portable changes,
input revisions and ZIP hashes are published. Input and deployment commits are
separate to avoid circular revision claims. The full pipeline rejects source
changes that occur after release preflight.
