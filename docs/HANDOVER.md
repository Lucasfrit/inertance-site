# Handover — continue the web design of the working app

Written 30 September 2026 at the end of the session that built `app/`.

## 7 October 2026 publication update

The working app is now committed and deployed on inertance.org and the independent
hydraulicanalogy.com mirror. Both roots open `/app/` directly, HTTP/www normalize
to HTTPS, and valid apex/www certificates are enforced. Inertance's remaining DTU
block is a network DNS issue; the second domain worked normally. See
[DEPLOYMENT.md](DEPLOYMENT.md) for exact configuration and publishing steps, and
[APP.md](APP.md) for the current shell contract. The local-only/no-publication
statements below are dated history. The community-gallery prototype remains in the private repository, separate
from the production app; publication does not establish visual or physics acceptance.

## 1 October 2026 update — historical

Modes are now implemented locally in the editor and working shell. Read
`APP.md` and `../cwas/docs/SIMULATION-MODES.md` for current contracts, supported
combinations and review instructions. The state and open questions below record
the earlier design handover; their “modes absent” descriptions are historical.
The default update pipeline now runs mode physics and both-shell mode browser
checks. Nothing has been committed, pushed or deployed.

## State at the original handover

- `app/index.html` is a **working** simulator page in the *Compact hybrid* layout:
  the real editor/solver from `../cwas/simulator` running inside a new shell.
  Built from `app-src/` by `python3 build_app.py`. Read [APP.md](APP.md) first.
- `node tools/check-app.cjs` passes (preset loading, hash presets, canvas fill and
  refit, builder placement, tools, probe picker, properties editing, speed, loop,
  waveform collapse, theme persistence, phone layout, zero console errors).
- **Nothing is committed or pushed** in either repo. `inertance-site` is public and
  deploys from GitHub Pages, so a push publishes. The earlier uncommitted work
  (`designs/`, README line) is untouched.
- Changes made in `cwas` (private) for this:
  - `simulator/editor-ui.js`: additive host hooks only — `circuit-editor:change`
    event, refit on stage height changes, optional continuous loop,
    `data-chart-height`, and API members `playing`, `loop`, `probe`, `signal`,
    `select(id)`. The existing editor behaves as before.
  - `simulator/refresh-standalone.py` (new): re-embeds the rebuilt fragment into
    `circuit-editor.html` so the browser checks test current code.
  - Rebuilt `circuit-editor.fragment.html` and `circuit-editor.html`.
  - `.claude/launch.json`: preview server `inertance-site` on port 4180.
  - Docs: DEVELOPMENT.md entry, WEB-UI.md and ARCHITECTURE.md sections.
- `cwas` checks run this session: model, coupled, layout, RC, RLC, web-ui,
  slow-playback, review-defaults all pass. `check-editor-ui`, `-interactions` and
  `-instruments` fail **before and after** this change: they click example
  buttons that the 21 Sept shell moved into a collapsed Examples menu.

## Ground rules for the design chat

1. Edit `app-src/*`, then `python3 build_app.py`. Never edit `app/` by hand.
   When simulator code changed, use `python3 update_from_simulator.py` instead
   (see `../cwas/docs/WEBSITE-WORKFLOW.md`).
2. Keep every `#ed-*` id (the build refuses otherwise). Move, restyle or hide them
   freely; don't duplicate them and don't fill editor-owned elements.
3. The shell must not change circuit state itself — use editor controls or the API.
   Need something new (overlay signals, fidelity presets)? Add it to the editor in
   `cwas/simulator/editor-ui.js`, expose it on `window.circuitEditor`, rebuild both.
4. Keep accepted editor decisions: default speed 0.1×, travel 1.8×, supply-relative
   color, visible particles and gears, black-on-paper drawing. The hydraulic
   component graphics are reviewed separately (cwas docs/COMPONENTS.md).
5. Brand: the pipe/inductor logo is chosen; the wider palette is **not approved**
   (`cwas/assets/brand/README.md`). The shell currently uses the compact concept's
   neutral tokens with a teal accent.
6. Don't commit/push the site without the user's go-ahead.

## Open design questions (good first topics)

1. Model chips (Ideal / Ripple / Leakage): what should each change physically?
2. Should Properties open automatically on selection on desktop, or stay on demand?
3. Signal picker: single probe (now) vs. multi-trace overlay (needs editor API).
4. Phone header: collapse File/Playback/Display/Help into one menu?
5. Dark mode for the drawing: keep paper, or design a dark pressure palette?
6. Landing page → app entry point and naming (`/app/` vs `/lab/` replacement).
7. First-run experience: explain pressure = voltage, flow = current in-place.

## Starter prompt for the next chat

> Continue the Inertance web design. Work in `/Users/lucaswybrandt/dev/inertance-site`
> (public site repo; sibling `/Users/lucaswybrandt/dev/cwas` is the private simulator
> source). Read `docs/HANDOVER.md` and `docs/APP.md` first. The working app is
> `app/` built from `app-src/` with `python3 build_app.py`; verify with
> `node tools/check-app.cjs` and by viewing `http://localhost:4180/app/` (preview
> server `inertance-site` in `cwas/.claude/launch.json`). Keep the `#ed-*` DOM
> contract and the ownership rule; put any new circuit behavior in
> `cwas/simulator/editor-ui.js` and its `window.circuitEditor` API. Don't commit or
> push without asking. First task: <describe>.
