#!/usr/bin/env python3
"""Build the public buck-converter demo from the private simulator source.

Reads  ../cwas/simulator/circuit-lab.fragment.html
Writes ./lab/index.html

The fragment is authored for an embedding harness that supplies design tokens and
Bootstrap-ish utility classes. This script wraps it in a standalone document and
supplies those itself, then restricts the topology picker to the buck converter.
"""
from pathlib import Path
import sys

HERE = Path(__file__).parent
SRC = HERE.parent / "cwas" / "simulator" / "circuit-lab.fragment.html"

if not SRC.exists():
    sys.exit(f"source not found: {SRC}")

fragment = SRC.read_text()

SHIM = """
:root{
  color-scheme: light dark;
  --background:#ffffff; --foreground:#16232b;
  --border:#d3dfe6; --muted:#5d7480;
  --popover:#16232b; --popover-foreground:#f2f7f9;
  --viz-series-1:#0c6c9e; --accent:#0c6c9e;
}
@media (prefers-color-scheme: dark){
  :root{
    --background:#0c151a; --foreground:#e3eef3;
    --border:#273941; --muted:#8ba2ac;
    --popover:#e3eef3; --popover-foreground:#0c151a;
    --viz-series-1:#57b4e4; --accent:#57b4e4;
  }
}
*{box-sizing:border-box}
body{
  margin:0; background:var(--background); color:var(--foreground);
  font-family:"IBM Plex Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  font-size:15px; line-height:1.55;
}
.page{max-width:1180px;margin:0 auto;padding-inline:20px;padding-block:24px 64px}

/* utility classes the fragment expects from its host harness */
.btn{
  font:inherit; padding:6px 14px; border:1px solid var(--border);
  background:var(--background); color:var(--foreground); border-radius:3px; cursor:pointer;
}
.btn:hover{border-color:var(--accent);color:var(--accent)}
.form-control,.form-select{
  font:inherit; padding:5px 8px; border:1px solid var(--border); border-radius:3px;
  background:var(--background); color:var(--foreground); max-width:100%;
}
.form-range{width:100%;accent-color:var(--accent)}
.form-check{display:flex;align-items:center;gap:7px;margin:5px 0}
.form-check-input{accent-color:var(--accent);width:15px;height:15px}
.text-small{font-size:13px;color:var(--muted)}
.tabular-nums{font-variant-numeric:tabular-nums}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
label{display:block;font-size:13px}
summary{cursor:pointer}
a{color:var(--accent)}

/* buck-only demo: the topology picker is removed */
#cl-type{display:none}
#cl-type-label{display:none}

.masthead{border-bottom:1px solid var(--border);margin-bottom:22px;padding-bottom:16px;
  display:flex;flex-wrap:wrap;gap:10px 20px;align-items:baseline;justify-content:space-between}
.masthead h1{font-size:20px;margin:0;font-weight:600;letter-spacing:-.01em}
.masthead .sub{font-size:13.5px;color:var(--muted);margin:3px 0 0}
.masthead a.home{font-size:13px;text-decoration:none}
.masthead a.home:hover{text-decoration:underline}
.caveat{
  margin-top:32px;padding:14px 16px;border:1px solid var(--border);border-left:3px solid var(--accent);
  font-size:13.5px;color:var(--muted);max-width:74ch;border-radius:0 3px 3px 0;
}
.caveat strong{color:var(--foreground);font-weight:600}
"""

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Buck converter, as water — Inertance</title>
<meta name="description" content="An interactive buck converter shown as a hydraulic circuit: pressure is voltage, flow is current, inertia is inductance. Live waveforms alongside.">
<meta name="author" content="Lucas Wybrandt">
<link rel="canonical" href="https://inertance.org/lab/">
<link rel="icon" type="image/svg+xml" href="../app/assets/inertance-pipe-mark.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<script src="../assets/vendor/d3.v7.9.0.min.js"></script>
<style>%s</style>
</head>
<body>
<div class="page">
<header class="masthead">
  <div>
    <h1>Buck converter, as water</h1>
    <p class="sub">Pressure is voltage · flow is current · inertia is inductance · the spring-loaded piston is capacitance</p>
  </div>
  <a class="home" href="../">← Inertance</a>
</header>
""" % SHIM

FOOT = """
<p><a href="../about/">About, contact &amp; privacy</a></p>
<div class="caveat">
  <strong>Where this analogy lies to you.</strong>
  Hydraulic resistance is genuinely nonlinear — real pipe flow shifts between laminar and
  turbulent, while an electrical resistor stays linear. The water carries the energy here;
  in a real circuit most of it travels in the fields <em>outside</em> the conductor. And the
  analogy has nothing honest to say about semiconductor behaviour. It is a lens for
  building intuition about energy storage and transfer, not a model of how electricity works.
  The schematic and the numbers are the authority.
</div>
</div>

<script>
/* Buck-only build: drop the other topologies from the picker and hide it.
   'buck' is first in CircuitModel.names, so it is already the selected default. */
(function(){
  var sel = document.getElementById('cl-type');
  if (!sel) return;
  Array.prototype.slice.call(sel.options).forEach(function(o){
    if (o.value !== 'buck') o.remove();
  });
  sel.value = 'buck';
  var label = sel.closest('label');
  if (label) label.style.display = 'none';
})();
</script>
</body>
</html>
"""

# The fragment declares its own d3 <script src>; we load d3 in <head> instead.
body = fragment.replace(
    '<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>', ''
)

out = HEAD + body + FOOT
dest = HERE / "lab" / "index.html"
dest.write_text(out)
print(f"built {dest}  ({len(out):,} bytes)")
