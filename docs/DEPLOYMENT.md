# Hosting, HTTPS and publishing runbook

Verified 7 October 2026. This is the current configuration; the release history
below records the work that established it.

## Current app release — 7 October 2026

The latest app is built from private simulator commit `d0bba0c`. It includes
experimental native KiCad/SPICE netlist import, steady-state Ripple with advanced
Transients/Leakage controls, curated example layouts/reset and merged particle
streams. Optional Umami collection requires consent and respects DNT/GPC;
production smoke checks opt out and generate no usage events. Half-bridge
steady-state convergence remains limited; Transients is available for inspection.
The original deployment snapshots below describe the earlier runtime.

## Current status

| Item | inertance.org | hydraulicanalogy.com |
| --- | --- | --- |
| Simulator | https://inertance.org/app/ | https://hydraulicanalogy.com/app/ |
| Root address | Automatically opens `/app/` | Automatically opens `/app/` |
| Public repository | [Lucasfrit/inertance-site](https://github.com/Lucasfrit/inertance-site) | [Lucasfrit/hydraulicanalogy-site](https://github.com/Lucasfrit/hydraulicanalogy-site) |
| Pages publishing | Deploy from branch: `main`, `/` | GitHub Actions: `.github/workflows/pages.yml` |
| Pages custom domain | `inertance.org` | `hydraulicanalogy.com` |
| HTTPS enforcement | Enabled | Enabled |
| Certificate names | Apex and `www` | Apex and `www` |
| Certificate | GitHub-managed Let's Encrypt YR2, approved | GitHub-managed Let's Encrypt YR2, approved |
| Observed certificate expiry | 5 January 2027 | 5 January 2027 |
| DTU network | DNS points to DTU block server; unresolved | Direct access worked with normal DNS |

HTTP is redirected to HTTPS, and `www` is redirected to the corresponding apex.
At `/`, a small HTML entry page then opens the simulator. JavaScript preserves
query parameters and preset hashes with `location.replace`; a no-JavaScript
refresh and visible link provide fallbacks. `/app/#fullboost`, `/lab/` and
`/about/` remain direct entry points. The domains serve independent copies:
neither redirects visitors to the other domain.

Example: `http://www.inertance.org/?entry=check#fullboost` reaches
`https://inertance.org/app/?entry=check#fullboost` when the network resolves the
public site correctly. DTU interception occurs before these site redirects.

The initial published app Help/source stamp was `cwas 763d364 · built 2026-10-07`.
That private documentation revision has the same simulator runtime as
`91e6c45d5d134743116d1f381464a1d8baca4831`. A later documentation-only private
commit does not mean the live runtime is out of date. Before this runbook update,
the primary public revision was `a7fff50f5f171546bdc22edaa9deb2602c968985` and
the mirror repository revision was `5dffcb1ed209df7080203b7393c7324724a01d5e`.
The mirror's [release.json](https://hydraulicanalogy.com/release.json) identified
that same primary revision. These are dated snapshots, not hashes for future releases.

## Porkbun configuration

Both domains were registered at Porkbun on 13 September 2026, with registration
expiry 13 September 2027. Domain registration renewal is separate from TLS
certificate renewal. Nameservers remain:

```text
curitiba.ns.porkbun.com
fortaleza.ns.porkbun.com
maceio.ns.porkbun.com
salvador.ns.porkbun.com
```

The website records below were verified through public DNS-over-HTTPS. `@` means
the apex; Porkbun's Host field can be blank for this. TTL is 600 seconds. In a
CNAME answer enter a hostname, without `https://`, a path or a repository name.

| Type | Host | inertance.org answer | hydraulicanalogy.com answer |
| --- | --- | --- | --- |
| A | @ | `185.199.108.153` | `185.199.108.153` |
| A | @ | `185.199.109.153` | `185.199.109.153` |
| A | @ | `185.199.110.153` | `185.199.110.153` |
| A | @ | `185.199.111.153` | `185.199.111.153` |
| AAAA | @ | None observed | `2606:50c0:8000::153` |
| AAAA | @ | None observed | `2606:50c0:8001::153` |
| AAAA | @ | None observed | `2606:50c0:8002::153` |
| AAAA | @ | None observed | `2606:50c0:8003::153` |
| CNAME | www | `lucasfrit.github.io` | `lucasfrit.github.io` |

**inertance.org:** public DNS was already correct. No Porkbun DNS, nameserver or
forwarding changes were needed for this domain. GitHub Pages certificate
provisioning was repaired separately.

**hydraulicanalogy.com:** it previously used Porkbun's wildcard 301 URL forwarding
to `https://inertance.org`, preserving paths. That made the second domain lead
back into the DTU block. The forwarding service used addresses
`207.207.210.23`, `207.207.210.36`, `207.207.210.50` and `uixie.porkbun.com`.
The old forwarding rule and its managed DNS entries were removed through Porkbun
Domain Management → URL Forwarding. In DNS management, Quick Setup → GitHub
installed the four A and four AAAA records; `www` CNAME was added separately.
Do not recreate the old forwarding rule for this independent mirror.

The secondary domain's existing email/verification records were preserved:

| Type | Host | Answer | Priority |
| --- | --- | --- | --- |
| MX | @ | `fwd1.porkbun.com` | 10 |
| MX | @ | `fwd2.porkbun.com` | 20 |
| TXT | @ | `v=spf1 include:_spf.porkbun.com ~all` | — |
| TXT | _acme-challenge | Two existing ACME challenge values retained | — |

There were 14 secondary DNS records after cutover. Challenge token values are
not repeated here; they are verification data, not app settings. Account
privacy, domain lock and auto-renew settings were left unchanged. No paid
hosting, purchased certificate or registrar API key was added.

## GitHub Pages and certificates

For the primary repository, Settings → Pages uses **Deploy from a branch**, `main`,
`/ (root)`. The root `CNAME` file contains `inertance.org`; `.nojekyll` keeps the
already-generated static files from being processed by Jekyll. Pushing the
public branch triggers Pages publication; GitHub does not build from private cwas.

For the secondary repository, Settings → Pages uses **GitHub Actions**, custom
domain `hydraulicanalogy.com`. The custom domain was set before the registrar
cutover. The workflow builds and deploys a Pages artifact. With this publishing
method the custom domain is a Pages setting; a repository CNAME is not required.

The missing primary certificate was recovered by removing and re-saving the
Pages custom domain. Secondary issuance was similarly retriggered after its DNS
was correct. GitHub issued the certificates; no certificate/private key was
uploaded. HTTPS enforcement was enabled after issuance. Both certificates cover
apex and `www`, and both validated with TLS 1.3 / TLS_AES_128_GCM_SHA256 during
checks. There was no meaningful certificate-quality difference between domains.

GitHub manages Pages certificate issuance and renewal. Keep DNS and custom-domain
settings correct, and check renewal if browsers report a certificate problem.
The expiry above is a snapshot, not an instruction to buy or manually replace
these certificates. Routine app releases require no DNS or certificate edits.

Read settings with an authenticated owner account:

```sh
gh api repos/Lucasfrit/inertance-site/pages
gh api repos/Lucasfrit/hydraulicanalogy-site/pages
```

Expected fields: correct `cname`, certificate state `approved`, correct apex/www
`domains`, and `https_enforced: true`. The primary also reports `status: built`.
The Actions-hosted site's `status` can be null; check its successful deployment
and live response rather than treating null as a failure.

The owner can enable enforcement in Settings → Pages or with:

```sh
gh api --method PUT repos/Lucasfrit/inertance-site/pages -F https_enforced=true
gh api --method PUT repos/Lucasfrit/hydraulicanalogy-site/pages -F https_enforced=true
```

The mirror workflow has `contents: read`; deployment has `pages: write` and
`id-token: write`. It uses GitHub's temporary token and verifies HTTPS is enabled.
That token cannot administer Pages settings: an attempted automatic setting
change returned 403 after deployment, so the owner enabled enforcement and the
workflow now checks it. If this check fails, inspect the live site too: an
artifact can already have deployed before the final check fails.

## How an app update reaches both domains

Three sibling checkouts are used locally:

```text
dev/cwas/                  private Lucasfrit/hydraulic-circuit-lab
dev/inertance-site/        public Lucasfrit/inertance-site
dev/hydraulicanalogy-site/ public Lucasfrit/hydraulicanalogy-site
```

1. Change physics/editor modules in `cwas/simulator/`, or website presentation in
   `inertance-site/app-src/`. Never hand-edit generated `app/index.html` or
   `lab/index.html`. Coordinate writes with other work in these shared checkouts.
2. Run focused checks, then commit and push the relevant simulator sources to
   private `main`. Stage explicit files so unrelated experiments stay local.
   Record the simulator short revision for the release.
3. From `inertance-site`, run `python3 update_from_simulator.py --release`.
   It rebuilds dev pages and both site apps, checks the shell/API contract,
   runs nine simulator checks and two site browser checks, and refuses dirty
   imported simulator sources. It never commits, pushes or deploys. Do not use
   `--quick` for final validation. `--full` additionally rewrites cwas review PNGs.
4. Review the generated app at `http://localhost:4180/app/` using
   `python3 -m http.server 4180` in the site checkout. Include desktop, 390 px
   phone and both themes. Preview `/app/` directly: the root entry intentionally
   redirects to the public HTTPS site even on a local server.
5. Review `git diff`; commit relevant site sources, assets and generated outputs
   together. Push public `main` only when ready to publish:
   `git push origin main`. This publishes **inertance.org**. A private cwas push
   alone does not publish, and Pages does not run the local simulator pipeline.
6. Wait for the primary Pages deployment, confirm its revision and run the live
   checks below. For documentation-only edits no app rebuild is needed.
7. Update the independent mirror immediately with:
   `gh workflow run pages.yml --repo Lucasfrit/hydraulicanalogy-site`.
   This is optional if waiting for the hourly sync is acceptable. Check its
   successful Actions run and `/release.json` against the primary public commit.

The private `cwas/docs/WEBSITE-WORKFLOW.md` gives the
change-type/DOM/API guide in the sibling local checkout. It is not a public web
link. Public build architecture is documented in [APP.md](APP.md).

### Mirror synchronization

The mirror workflow checks out this repository's public `main`, copies only
`index.html`, `app/`, `lab/`, `about/`, `assets/`, `robots.txt`, `sitemap.xml` and
`LICENSE`, rewrites absolute `https://inertance.org` URLs for the second domain,
and replaces the root with its own `entry.html`. It adds `.nojekyll` and
`release.json`. No private source access, additional runtime compilation or
permanent secret is needed. Both apps use the same runtime and presets.

Triggers are a push to mirror `main`, manual dispatch, or UTC cron `17 * * * *`
(minute 17 each hour). A primary push does not instantly trigger the other repo.
GitHub schedules can be delayed and are disabled after 60 days of public-repo
inactivity. If the copy stops updating, inspect Actions, re-enable the scheduled
workflow if necessary, and dispatch it manually. A successful deploy must be
verified against the expected upstream revision; a green old run is not enough.

```sh
gh run list --repo Lucasfrit/inertance-site --limit 5
gh run list --repo Lucasfrit/hydraulicanalogy-site --workflow pages.yml --limit 5
curl -fsS https://hydraulicanalogy.com/release.json
```

## Verification and the DTU block

The full release pipeline passed. Generated app/lab HTML reproduced byte-for-byte
from clean committed private/public trees. Extra waveform checks evaluated 714
expressions. Production browser checks covered actual buck playback, fullboost
hash navigation, both themes, desktop/phone, old lab, About/source/privacy,
canonical URLs, sitemap, same-origin runtime scripts and zero resource/browser
errors. All four HTTP/HTTPS apex/www entry variants reached the app on each
public host; the query/hash preservation example above also passed.

For a future release, set `SOURCE_REV` to the build's simulator revision, not
necessarily the latest documentation-only private HEAD. From `inertance-site`:

```sh
# On this Mac/DTU network, route only this diagnostic browser to verified Pages.
PAGES_IP=185.199.108.153 SOURCE_REV=763d364 node tools/check-live.cjs
# The independent mirror works through normal DNS.
SITE_ORIGIN=https://hydraulicanalogy.com SOURCE_REV=763d364 node tools/check-live.cjs
# A direct primary response with normal certificate validation:
curl --resolve inertance.org:443:185.199.108.153 -fsS https://inertance.org/app/ -o /tmp/inertance-live.html
```

`PAGES_IP` maps the chosen hostname/www inside the test browser only. It retains
TLS validation and does not edit the Mac's DNS, hosts file or browser preferences.
`CANONICAL_ORIGIN` can override the canonical URL expected for local tests;
`HOME_OPENS_APP=0` supports the former landing-page entry, while direct app entry
is now the default. Screenshots are written under ignored `tools/out/`.

On the release Mac, Tailscale's `100.100.100.100` resolver and direct DTU DNS
servers `10.11.12.13` / `10.11.12.12` return `192.38.84.55` for inertance.org/www,
and the apex AAAA answer is `::1`. The DTU server presents `*.ait.dtu.dk`, not
an inertance.org certificate, and serves the DTU block notice. This explains the
browser's hostname warning before the DTU page becomes visible. Passing the
warning once can store a browser exception; it does not repair the certificate.

Public DNS-over-HTTPS returns the correct Pages records. Even a UDP `dig` query
explicitly addressed to a public authoritative server returned the substituted
DTU answer on this network on 7 October: changing `dig`'s target alone is not a
reliable independent check here. Use public HTTPS DNS services and Pages health
checks for corroboration. Do not change correct Porkbun records to match the
DTU answers, and do not disable TLS verification.

A website redirect cannot run before DNS/TLS reach its server, so an inertance.org
redirect cannot overcome this DTU block. Access through the second domain worked;
mobile data provides another independent check. No Mac DNS/hosts/VPN settings
were changed and no browser warning was bypassed by this work. The lasting
campus fix needs AIT review. A request is drafted privately in
`cwas/docs/DTU-ACCESS.md`; no support/vendor request has been sent. The vendor and
classification reason are unknown. No blanket `.org` restriction or independent
browser malware/reputation flag was established.

## Site identity, dependencies and public files

The release added `/about/` with the educational purpose, author Lucas Wybrandt,
public GitHub contact, AGPL license and browser-data/privacy explanation. App Help
and the old lab link to it. Visitor pages have author/canonical metadata,
robots.txt and sitemap.xml. The former landing page also had WebApplication
metadata; it has since been replaced by direct simulator entry.

Both apps now load pinned, unmodified **d3 7.9.0** from
`assets/vendor/d3.v7.9.0.min.js`, with its ISC license/provenance. SHA-256:
`f2094bbf6141b359722c4fe454eb6c4b0f0e42cc10cc7af921fc158fceb86539`.
This removed the runtime script CDN dependency. The old lab still requests Google
Fonts. GitHub repository description, homepage and education topics were updated.
These changes help reviewers understand the site; DTU acceptance was not achieved
or promised, and a paid OV/EV certificate was not needed for valid HTTPS.

The primary branch-root site publicly serves tracked `app-src/`, `tools/` and
`docs/` files. Robots exclusions control crawler indexing, not access. Keep
private planning/research and credentials out of the public repository. The mirror
artifact excludes these folders. Generated simulator JavaScript is intentionally
public and AGPL-3.0-or-later; keeping its development repository private does not
make browser-delivered runtime code secret.

Known simulator limitations remain: early version, experimental Leakage, and
complex-SVG rendering performance. Hosting publication does not mean all visual
or physics decisions have been accepted. Promotion/outreach was outside this work.

## Release history and evidence — 7 October 2026

| Change | Revision / validation |
| --- | --- |
| Commit current simulator privately | `91e6c45d5d134743116d1f381464a1d8baca4831` |
| Publish app/old lab, repair HTTPS issuance | Primary `767d4bde904776f624fe6ecd596c84adfb7087d3`; [Pages run](https://github.com/Lucasfrit/inertance-site/actions/runs/37596856175) |
| Favicons and current Simulation-panel browser selectors | Primary `0a72c14fb5e4cc7b18b9d7cd96bdb85fb16e4f52`; [Pages run](https://github.com/Lucasfrit/inertance-site/actions/runs/37597050421) |
| About/privacy/identity and local d3 | Primary `e13dfb8640eed3076eda39a775b05a1aff47e217`; [Pages run](https://github.com/Lucasfrit/inertance-site/actions/runs/37599659834); clean rebuild and expanded smoke check passed |
| Independent secondary Pages site and Porkbun cutover | [First mirror run](https://github.com/Lucasfrit/hydraulicanalogy-site/actions/runs/37602653177), reading primary `5b81ec9590509a8683ca2ae373cdd9c0218c7ace` |
| Mirror token attempted admin setting change | [403 run](https://github.com/Lucasfrit/hydraulicanalogy-site/actions/runs/37603571540); owner enabled HTTPS; workflow changed to read-only verification |
| Corrected mirror HTTPS verification | [Successful run](https://github.com/Lucasfrit/hydraulicanalogy-site/actions/runs/37603701360) |
| Secondary root opens app directly | Mirror `5dffcb1ed209df7080203b7393c7324724a01d5e`; [Pages run](https://github.com/Lucasfrit/hydraulicanalogy-site/actions/runs/37604261211) |
| Primary root opens app directly | Primary `a7fff50f5f171546bdc22edaa9deb2602c968985`; [Pages run](https://github.com/Lucasfrit/inertance-site/actions/runs/37614936939) |
| Mirror synced primary direct-entry release | [Successful run](https://github.com/Lucasfrit/hydraulicanalogy-site/actions/runs/37614996792); live release.json confirmed primary `a7fff50` |

## Recovery after a failed update

- If the local release pipeline fails, fix the reported input/check and rerun
  before pushing. `--release` does not ensure that every unrelated untracked
  file is committed; review the actual staged inputs and generated outputs.
- If Pages fails, inspect the new deployment run before concluding a DNS problem.
  Existing live content may still be the prior successful release. Compare the
  deployment revision with the intended public commit.
- If a published app needs rollback, revert the faulty primary release commit(s)
  together with their generated outputs/assets, review and verify the resulting
  tree, then push the revert and sync the mirror. Preserve unrelated work; a
  public rollback does not automatically revert private simulator development.
- If only the mirror is old, dispatch its workflow and verify release.json.
  If only DTU access fails with the AIT certificate, use the diagnosis above;
  changing the correct public DNS or app release will not resolve that block.

## Official operating references

- [GitHub custom domains and DNS records](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [GitHub Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
- [Scheduled Actions behavior and inactivity](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
