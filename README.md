# inertance.org

Public site for **Inertance** — an interactive simulator that shows switching power
conversion as a hydraulic circuit.

- `index.html` — landing page
- `lab/index.html` — the buck converter demo, **generated, do not edit by hand**
- `build.py` — regenerates `lab/index.html` from the private simulator source
- `CNAME` — custom domain for GitHub Pages

## Rebuilding the demo

The simulator source lives in the private `hydraulic-circuit-lab` repo, expected as a
sibling directory:

```
dev/
  cwas/                 ← private source (hydraulic-circuit-lab)
  inertance-site/       ← this repo
```

After changing the simulator:

```sh
python3 build.py
git commit -am "Rebuild buck demo"
git push
```

`build.py` wraps `circuit-lab.fragment.html` in a standalone document, supplies the
design tokens and utility classes the fragment expects from its authoring harness, and
restricts the topology picker to the buck converter.

## Note

This repo is public and contains only the built demo. Simulator source, market research
and roadmap stay private.

## Licence

The simulator code served from `lab/index.html` is licensed **AGPL-3.0-or-later**.
Copyright © 2026 Lucas Wybrandt.

Note that the demo is client-side JavaScript, so the code is readable via View Source by
design — the licence is what governs reuse, not obscurity. AGPL was chosen over MIT
specifically because it requires anyone who hosts a modified copy to publish their
changes.

Copyright is retained solely by the author, which leaves the option of granting a
commercial exception later.
