# GitHub Pages release — 7 October 2026

- Canonical site: https://inertance.org/
- Working simulator: https://inertance.org/app/
- Older fixed buck demo: https://inertance.org/lab/
- Public repository: Lucasfrit/inertance-site, `main`, repository root.
- Private simulator source revision: `91e6c45d5d134743116d1f381464a1d8baca4831`
  in Lucasfrit/hydraulic-circuit-lab. The Help menu cites `cwas 91e6c45`.
- Release includes the current compact app shell, ten editable presets, selected
  simulation modes, waveform expressions and the landing-page simulator link.

## Hosting

GitHub Pages uses branch publishing. `.nojekyll` serves the generated static
files directly. `CNAME` is `inertance.org`; HTTPS is enforced. Certificate
provisioning was restarted on 7 October because the old configuration had no
certificate. GitHub issued a certificate covering the apex and www domains.
HTTP and www redirect to https://inertance.org/.

Public DNS was checked using Google and Cloudflare DNS-over-HTTPS and GitHub's
Pages health API: the apex has the four GitHub Pages A records
185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153;
www CNAME points to lucasfrit.github.io. No apex AAAA or CAA records were returned.
Registrar nameservers are Porkbun. No registrar changes were needed.

The release computer's system DNS instead returned 192.38.84.55 and ::1.
Verification uses the publicly confirmed Pages address where needed; it keeps
normal TLS certificate validation enabled. This is a local DNS limitation,
not a reason to change the correct public records.

## Validation

`python3 update_from_simulator.py --release` validates committed simulator
sources, rebuilds both applications and runs model, mode, general Ideal,
full-bridge Ideal, coupled, RC, RLC, layout and older lab model checks, plus
`tools/check-app.cjs` and `tools/check-modes.cjs`. The mode browser check was
updated to open the current Simulation panel on desktop and phone.

Additional simulator checks: `check-editor-waveform-reference.cjs` and
`check-editor-waveform-expressions.cjs` (714 evaluated circuit expressions).
Desktop and 390 px phone layouts and both app themes were reviewed. Both
`app/` and `lab/` reproduced byte-for-byte in a clean temporary directory from
the committed private source and the staged public release tree.

## Live verification

The application release is public commit
`767d4bde904776f624fe6ecd596c84adfb7087d3`; site icon/resource-check fixes are
`0a72c14fb5e4cc7b18b9d7cd96bdb85fb16e4f52`. Both Pages runs succeeded:
- https://github.com/Lucasfrit/inertance-site/actions/runs/37596856175
- https://github.com/Lucasfrit/inertance-site/actions/runs/37597050421

After deployment, `PAGES_IP=185.199.108.153 SOURCE_REV=91e6c45 node tools/check-live.cjs` passed: HTTPS landing-page entry, exact clean source stamp,
real buck playback, fullboost hash navigation, both themes, 390 px phone
Simulation controls, old lab loading and zero browser/resource errors. The first
live check found the browser's default favicon request returning 404; explicit
SVG icons were added to both the landing page and the lab build.

HTTP redirects to HTTPS; www redirects to the apex with a valid certificate.
The live landing/app HTML matched the local generated files byte-for-byte.
Both final apps reproduced byte-for-byte from clean committed checkouts.
This final documentation update changes no runtime code.

## Remaining limitations

This publishes the current early version. Leakage is experimental, browser
rendering can be slow on complex circuits, and d3 is loaded from jsDelivr.
The app therefore requires access to that CDN. Research, private planning,
local design experiments and review screenshots are excluded from this release.

## Repeat a release

Commit and push relevant simulator sources privately, run the release pipeline,
review the generated app, then commit and push relevant public site files.
Confirm the Pages build revision and run `node tools/check-live.cjs` against
production. Set `PAGES_IP=185.199.108.153` only when local DNS is incorrect;
set `SOURCE_REV` to the expected simulator short revision.

Official setup references:
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https
