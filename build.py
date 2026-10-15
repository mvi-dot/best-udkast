#!/usr/bin/env python3
"""Bygger værktøjet til én HTML-fil.
   python3 build.py            -> index.html (til GitHub Pages / egen hosting)
   python3 build.py artifact   -> dist/udkast-artifact.html (til claude.ai, uden adapter)"""
import sys, pathlib
root = pathlib.Path(__file__).resolve().parent; src = root / 'src'
target = sys.argv[1] if len(sys.argv) > 1 else 'github'
rd = lambda n: (src / n).read_text('utf-8')
data = rd('data.json').replace('<', '\\u003c')
eng = rd('engine.js').replace('</script', '<\\/script')
app = rd('app.js').replace('</script', '<\\/script')
html = rd('index.tpl.html').replace('/*DATA*/', data).replace('/*ENGINE*/', eng).replace('/*APP*/', app)
if target == 'github':
    shim = rd('github-shim.js').replace('</script', '<\\/script')
    assert '<head>' in html, 'mangler <head> i skabelonen'
    html = html.replace('<head>', '<head>\n<script src="config.js"></script>\n<script>' + shim + '</script>', 1)
    out = root / 'index.html'
else:
    (root / 'dist').mkdir(exist_ok=True); out = root / 'dist' / 'udkast-artifact.html'
out.write_text(html, 'utf-8'); print('Skrev', out.relative_to(root), round(len(html) / 1048576, 2), 'MB')
