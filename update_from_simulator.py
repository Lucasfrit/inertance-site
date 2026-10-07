#!/usr/bin/env python3
"""Bring simulator changes from ../cwas into the website, with checks.

    python3 update_from_simulator.py            # everyday: build + checks
    python3 update_from_simulator.py --quick    # no browser checks (fast iteration)
    python3 update_from_simulator.py --release  # before committing the site: simulator must be committed
    python3 update_from_simulator.py --full     # also run cwas browser checks (rewrites cwas review PNGs)

Steps, stopping at the first failure:
  1. preflight   locate both repos, report simulator commit and uncommitted changes
  2. dev pages   cwas build-editor.py + refresh-standalone.py (editor page), build-lab.py (lab fragment)
  3. sim checks  cwas node checks: editor model, coupled, RC, RLC, layout, circuit-lab model
  4. site build  build_app.py (app/) and build.py (lab/), including contract checks
  5. site check  tools/check-app.cjs in headless Chrome
  6. summary     what changed in app/ and lab/, and the next steps

The script never commits, pushes or deploys. Workflow and change-type guide:
../cwas/docs/WEBSITE-WORKFLOW.md
"""
from pathlib import Path
import argparse
import json
import subprocess
import sys
import time

SITE = Path(__file__).resolve().parent
CWAS = SITE.parent / "cwas"
SIM = CWAS / "simulator"

SIM_CHECKS = [
    "check-editor-model.cjs",
    "check-editor-modes.cjs",
    "check-editor-general-ideal.cjs",
    "check-editor-fullboost-ideal.cjs",
    "check-editor-coupled.cjs",
    "check-editor-rc.cjs",
    "check-editor-rlc.cjs",
    "check-editor-layout.cjs",   # also rewrites simulator/editor-layout-report.json
    "check-lab-model.cjs",       # older fixed-topology lab behind lab/
]
# Browser checks in cwas; they save review screenshots into cwas/simulator/.
SIM_BROWSER_CHECKS = [
    "check-editor-web-ui.cjs",
    "check-editor-slow-playback.cjs",
    "check-editor-review-defaults.cjs",
]


def step(title):
    print(f"\n=== {title}", flush=True)


def run(cmd, cwd, label=None):
    start = time.time()
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    lines = (result.stdout + result.stderr).strip().splitlines()
    name = label or " ".join(str(c) for c in cmd)
    if result.returncode:
        print(f"  FAIL  {name}")
        print("\n".join("        " + l for l in lines[-25:]))
        sys.exit(f"\nStopped: {name} failed. Fix it (or see WEBSITE-WORKFLOW.md → Troubleshooting) and rerun.")
    last = lines[-1] if lines else ""
    print(f"  ok    {name}  ({time.time() - start:.0f}s)  {last[:110]}")
    return result.stdout


def git(repo, *args):
    r = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True)
    return r.stdout.rstrip() if r.returncode == 0 else ""


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--quick", action="store_true", help="skip all browser checks")
    ap.add_argument("--full", action="store_true", help="also run cwas browser checks (rewrites review PNGs)")
    ap.add_argument("--release", action="store_true", help="fail if simulator sources are uncommitted")
    ap.add_argument("--skip-lab", action="store_true", help="do not rebuild the circuit-lab fragment or lab/ (older buck demo)")
    args = ap.parse_args()
    if args.quick and args.full:
        sys.exit("--quick and --full contradict each other")

    step("1 preflight")
    if not (SIM / "editor-modules.json").exists():
        sys.exit(f"cwas simulator not found at {SIM} (expected as a sibling of this repo)")
    modules = json.loads((SIM / "editor-modules.json").read_text())["modules"]
    sources = [f"simulator/{m}" for m in modules] + [
        "simulator/editor-modules.json", "simulator/editor-shell.html", "simulator/circuit-lab.fragment.html",
        "simulator/lab-*", "simulator/build-lab.py", "simulator/boost-preview.fragment.html"]
    commit = git(CWAS, "rev-parse", "--short", "HEAD") or "unknown"
    dirty = git(CWAS, "status", "--porcelain", "--", *sources)
    print(f"  simulator  cwas {commit}" + ("  (uncommitted simulator changes)" if dirty else "  (clean)"))
    if dirty:
        print("\n".join("             " + l for l in dirty.splitlines()[:12]))
    print(f"  site       inertance-site {git(SITE, 'rev-parse', '--short', 'HEAD') or 'unknown'}")
    if args.release and dirty:
        sys.exit("\n--release: commit the simulator changes in cwas first, so the site build "
                 "is stamped with a commit that contains them.")

    step("2 cwas dev pages")
    run([sys.executable, "build-editor.py"], SIM, "build-editor.py")
    run([sys.executable, "refresh-standalone.py"], SIM, "refresh-standalone.py")
    if not args.skip_lab:
        run([sys.executable, "build-lab.py"], SIM, "build-lab.py (circuit-lab fragment behind lab/)")

    step("3 simulator checks")
    for check in SIM_CHECKS:
        run(["node", check], SIM, check)
    if args.full:
        for check in SIM_BROWSER_CHECKS:
            run(["node", check], SIM, check)

    step("4 site build")
    run([sys.executable, "build_app.py"], SITE, "build_app.py")
    if not args.skip_lab:
        run([sys.executable, "build.py"], SITE, "build.py (lab/)")

    step("5 site check")
    if args.quick:
        print("  skip  tools/check-app.cjs (--quick)")
    else:
        run(["node", "tools/check-app.cjs"], SITE, "tools/check-app.cjs")
        run(["node", "tools/check-modes.cjs"], SITE, "tools/check-modes.cjs")

    step("6 summary")
    changed = git(SITE, "status", "--porcelain", "--", "app", "lab")
    print("  site output changes:" if changed else "  site output: no changes versus the last site commit")
    if changed:
        print("\n".join("    " + l for l in changed.splitlines()[:20]))
    print("""
  Next:
    1. Look at it: python3 -m http.server 4180 --directory .  → http://localhost:4180/app/
    2. Commit the simulator change in cwas (private).
    3. Rerun with --release so the site is stamped with that commit.
    4. Commit app-src/ + app/ (+ lab/) in inertance-site. Pushing publishes the site.""")
    if dirty and not args.release:
        print("\n  Note: this build contains uncommitted simulator changes; fine for local review, not for publishing.")


if __name__ == "__main__":
    main()
