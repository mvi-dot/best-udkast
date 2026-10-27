#!/usr/bin/env python3
"""Bygger værktøjet til én HTML-fil.
   python3 build.py                       -> index.html (GitHub Pages / egen hosting)
   python3 build.py artifact              -> dist/udkast-artifact.html (claude.ai, uden adapter)
   python3 build.py github --ud F         (egen fil, bruges til test)
Templates ligger ikke i koden: værktøjet henter dem fra Drive via Apps Script, når det åbnes (se apps-script/).
src/data.json har resten: klasser, variabler, inspiration, statistik og Best Stock-billeder. src/bricks.json har Bricks-opsætningen til preview."""
import sys, json, pathlib
root = pathlib.Path(__file__).resolve().parent; src = root / 'src'
args = sys.argv[1:]; opt = {}
for k in ('--ud', '--dump'):
    if k in args: i = args.index(k); opt[k] = args[i + 1]; del args[i:i + 2]
target = args[0] if args else 'github'
rd = lambda n: (src / n).read_text('utf-8')

data = json.loads(rd('data.json'))
bx = src / 'bricks.json'   # jeres Bricks-opsætning til preview (hentes med: python3 hent-bricks.py)
data['BRICKS'] = json.loads(bx.read_text('utf-8')) if bx.exists() else None
if '--dump' in opt: pathlib.Path(opt['--dump']).write_text(json.dumps(data, ensure_ascii=False), 'utf-8')
data_s = json.dumps(data, ensure_ascii=False).replace('<', '\\u003c')
eng = rd('engine.js').replace('</script', '<\\/script')
app = rd('app.js').replace('</script', '<\\/script')
html = rd('index.tpl.html').replace('/*DATA*/', data_s).replace('/*ENGINE*/', eng).replace('/*APP*/', app)
if target == 'github':
    shim = rd('github-shim.js').replace('</script', '<\\/script')
    assert '<head>' in html, 'mangler <head> i skabelonen'
    html = html.replace('<head>', '<head>\n<script src="config.js"></script>\n<script>' + shim + '</script>', 1)
    out = pathlib.Path(opt['--ud']) if '--ud' in opt else root / 'index.html'
else:
    (root / 'dist').mkdir(exist_ok=True); out = pathlib.Path(opt['--ud']) if '--ud' in opt else root / 'dist' / 'udkast-artifact.html'
out.write_text(html, 'utf-8'); print('Skrev', out, round(len(html) / 1048576, 2), 'MB')
