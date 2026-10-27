#!/usr/bin/env python3
"""Bygger værktøjet til én HTML-fil: python3 build.py  -> index.html  (eller --ud FIL)
Templates ligger ikke i koden: værktøjet henter dem fra Drive via Apps Script, når det åbnes (se apps-script/).
src/data.json har klasser, variabler, inspiration, statistik og Best Stock-billeder. src/bricks.json har Bricks-opsætningen til preview."""
import sys, json, pathlib
root = pathlib.Path(__file__).resolve().parent; src = root / 'src'
args = sys.argv[1:]
out = pathlib.Path(args[args.index('--ud') + 1]) if '--ud' in args else root / 'index.html'
rd = lambda n: (src / n).read_text('utf-8')

data = json.loads(rd('data.json'))
bx = src / 'bricks.json'   # jeres Bricks-opsætning til preview (hentes med: python3 hent-bricks.py)
data['BRICKS'] = json.loads(bx.read_text('utf-8')) if bx.exists() else None
data_s = json.dumps(data, ensure_ascii=False).replace('<', '\\u003c')
eng = rd('engine.js').replace('</script', '<\\/script')
app = rd('app.js').replace('</script', '<\\/script')
html = rd('index.tpl.html').replace('/*DATA*/', data_s).replace('/*ENGINE*/', eng).replace('/*APP*/', app)
out.write_text(html, 'utf-8'); print('Skrev', out, round(len(html) / 1048576, 2), 'MB')
