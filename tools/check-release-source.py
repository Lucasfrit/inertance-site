#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Verify delivered source archives, hashes, licence scope and visitor links."""
from pathlib import Path
import hashlib,json,zipfile,re
site=Path(__file__).resolve().parent.parent
for day in ['07','12']:
 name=f'inertance-2026-10-{day}-source'
 archive=site/'source'/f'{name}.zip';data=archive.read_bytes()
 assert hashlib.sha256(data).hexdigest()==(site/'source'/f'{name}.sha256').read_text().split()[0]
 manifest=json.loads((site/'source'/f'{name}.manifest.json').read_text())
 assert manifest['rebuild']['result']=='byte-for-byte PASS'
 with zipfile.ZipFile(archive) as z:
  for file,h in manifest['files_sha256'].items():
   assert hashlib.sha256(z.read(name+'/'+file)).hexdigest()==h,file
  assert len(manifest['modules'])==(21 if day=='07' else 24)
  assert not any(re.search(r'(^|/)(\.git|\.env|tmp|designs|docs|\.claude)(/|$)|\.(pdf|pptx)$',p) for p in z.namelist())
  assert 'GNU AFFERO GENERAL PUBLIC LICENSE' in z.read(name+'/cwas/LICENSE').decode()
  notices=z.read(name+'/inertance-site/assets/vendor/d3.BUNDLE-NOTICES.txt').decode()
  for credit in ['Vladimir Agafonkin','Mapbox','InternMap'.lower(),'robust-predicates','Mike Bostock']:assert credit.lower() in notices.lower()
for path in ['app/index.html','lab/index.html','about/index.html','source/index.html','changelog/index.html']:
 text=(site/path).read_text()
 for href in re.findall(r'href="([^"]+)"',text):
  if href.startswith(('http:','https:','#','mailto:','data:')):continue
  target=(site/path).parent/href.split('#')[0].split('?')[0]
  assert target.exists(),(path,href)
assert 'only' in (site/'CONTENT-LICENSE.md').read_text().lower()
assert 'retained solely' not in (site/'README.md').read_text()
assert 'uncommitted changes' not in (site/'app/index.html').read_text()
print('Source archive checks passed: both ZIPs, hashes, 21/24 modules, scoped licences, full dependency notices and visitor links.')
