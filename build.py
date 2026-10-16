#!/usr/bin/env python3
"""Bygger værktøjet til én HTML-fil.
   python3 build.py                       -> index.html (GitHub Pages / egen hosting)
   python3 build.py artifact              -> dist/udkast-artifact.html (claude.ai, uden adapter)
   python3 build.py github --sektioner D --ud F   (egen mappe/fil, bruges til test)
Mappen sektioner/ læses hver gang: hver .json-fil dér bliver til sektioner under "Online hjemmesider"."""
import sys, re, json, glob, hashlib, datetime, pathlib, copy, collections
from urllib.parse import urlparse
root = pathlib.Path(__file__).resolve().parent; src = root / 'src'
args = sys.argv[1:]; opt = {}
for k in ('--sektioner', '--ud', '--dump'):
    if k in args: i = args.index(k); opt[k] = args[i + 1]; del args[i:i + 2]
target = args[0] if args else 'github'
rd = lambda n: (src / n).read_text('utf-8')

BRANCH_KW = [('Tømrer / Snedker', r'tømrer|snedker|træ|tag\b|carport|terrasse'), ('Murer / Entreprise', r'murer|entrepr|beton|facade|mursten'), ('VVS / Kloak / Blik', r'vvs|kloak|blik|rør|varme|vand|installatør'),
  ('El / Teknik', r'\bel\b|elektr|solcelle|batteri|ladestander'), ('Maler', r'maler|male|farve|spartel'), ('Auto', r'\bauto|bil\b|dæk|værksted'), ('Anlæg / Have / Skov', r'anlæg|have\b|skov|træfæld|landskab|brolægn'),
  ('Klinik / Sundhed', r'klinik|læge|tand|sundhed|fysio|psykiatri|behandl'), ('Service / Rengøring / Ejendom', r'rengør|ejendom|facility|vinduespoler'), ('Køreskole', r'køreskole|kørekort'),
  ('Skønhed / Fitness', r'frisør|skønhed|fitness|salon|kosmetik|massage'), ('Gulv / Beton', r'gulv|parket|epoxy|slibning'), ('Rådgivning / Virksomhed', r'rådgiv|advokat|revisor|konsulent|regnskab'),
  ('Udlejning / Logistik', r'udlej|logistik|transport|kran|lift')]

def strip(h): return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', str(h))).strip()
def texts(els):
    out = []
    for e in els:
        s = e.get('settings')
        if not isinstance(s, dict): continue
        for k, v in s.items():
            if isinstance(v, str) and re.match(r'^(text|title|label|description|content|buttonText)', k.split(':')[0]): out.append(strip(v))
            elif isinstance(v, list):
                for it in v:
                    if isinstance(it, dict):
                        for kk in ('title', 'text', 'content', 'label'):
                            if isinstance(it.get(kk), str): out.append(strip(it[kk]))
    return ' '.join(out).lower()

def classify(els, label=''):
    names = collections.Counter(e['name'] for e in els); labs = ' '.join([str(label)] + [str(e.get('label', '')) for e in els]).lower(); txt = texts(els)
    has = lambda p, s: re.search(p, s) is not None
    if has(r'footer', labs) : return 'Footer'
    if has(r'\bmenu\b|navigation', str(label).lower()) or (names['nav-menu'] + names['nav-nested'] + names['offcanvas'] and not names['heading']): return 'Menu'
    if names['accordion'] + names['accordion-nested'] or has(r'faq|ofte stillede|spørgsmål', str(label).lower()): return 'FAQ'
    for cat, pat in (('Header', r'hero|header|forside intro'), ('Anmeldelser', r'anmeld|testimonial|review|trustpilot'), ('Kontakt sektion', r'kontakt'), ('Ydelser', r'ydelse|service|slider'), ('Priser', r'pris'), ('Cases', r'case|projekt|reference'), ('Galleri', r'galleri|gallery|medarbejder|team')):
        if has(pat, str(label).lower()): return cat
    if names['form'] and has(r'kontakt|tilbud|besked|ring|skriv', txt) and not any(e['name'] == 'heading' and (e.get('settings') or {}).get('tag') == 'h1' for e in els): return 'Kontakt sektion'
    if any(e['name'] == 'heading' and isinstance(e.get('settings'), dict) and e['settings'].get('tag') == 'h1' for e in els): return 'Header'
    if names['rating'] >= 2 or has(r'anmeld|trustpilot|stjerner|kunderne siger|glade kunder', txt): return 'Anmeldelser'
    if names['image-gallery'] or has(r'medarbejder|vores team|mød teamet', txt): return 'Galleri'
    if has(r'\bpris(er)?\b|fra \d+ ?kr|kr\.', txt) and names['button'] >= 2: return 'Priser'
    if has(r'ofte stillede|faq|spørgsmål', txt): return 'FAQ'
    if has(r'\bcases?\b|vores projekter|referencer', txt): return 'Cases'
    if names['slider-nested'] or has(r'vores ydelser|ydelser|vi tilbyder|hvad kan vi hjælpe', txt): return 'Ydelser'
    if names['form'] or has(r'kontakt os|ring til os|tlf|telefon|skriv til os', txt) and names['heading'] <= 3: return 'Kontakt sektion'
    return 'Content'
SHORT = {'Header': 'hero', 'Ydelser': 'ydelser', 'Anmeldelser': 'anmeldelser', 'FAQ': 'faq', 'Kontakt sektion': 'kontakt', 'Content': 'content', 'Galleri': 'galleri', 'Cases': 'cases', 'Priser': 'priser', 'Menu': 'menu', 'Footer': 'footer'}
SHOWN = {'Header': 'Hero', 'Kontakt sektion': 'Kontakt'}
def nice(s): return ' '.join(w.upper() if len(w) <= 2 else w.capitalize() for w in s.split())
def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower().replace('æ', 'ae').replace('ø', 'oe').replace('å', 'aa')).strip('-')

def ingest(data, folder):
    L, C, S = data['LIB'], data['CLASSES'], data['SITES']; added = []; skipped = []
    internal = re.compile(r'best-template\.test-one\.dk|beststock\.kinsta\.cloud|localhost|test-one\.dk')
    for f in sorted(glob.glob(str(folder / '*.json'))):
        p = pathlib.Path(f)
        try: d = json.loads(p.read_text('utf-8'))
        except Exception as e: skipped.append((p.name, 'ugyldig JSON')); continue
        els = d.get('content') if isinstance(d, dict) else None
        if not isinstance(els, list) or not els: skipped.append((p.name, 'ingen "content"')); continue
        gcs = d.get('globalClasses') or d.get('global_classes') or []
        for c in gcs:
            if isinstance(c, dict) and c.get('id') not in C: e = dict(c); e['_exists'] = False; C[c['id']] = e
        stem = p.stem; pre = stem.split('--')[0].strip(); su = str(d.get('sourceUrl') or ''); url = ''
        if su and not internal.search(su): url = su
        elif re.search(r'[a-z0-9-]+\.[a-z]{2,}$', pre, re.I): url = 'https://' + pre
        host = (urlparse(url).hostname or '').replace('www.', '') if url else ''
        match = next((s for s in S if host and host in str(s.get('u', ''))), None)
        name = (match or {}).get('n') or (nice(re.sub(r'\.[a-z]{2,}$', '', host).replace('-', ' ')) if host else nice(re.sub(r'[-_]+', ' ', pre)) or 'Online')
        branche = (match or {}).get('b') or ''
        by = {e['id']: e for e in els}; roots = [e for e in els if e.get('parent') in (0, '0') and e['name'] != 'code']
        if not branche:
            full = texts(els); branche = next((b for b, pat in BRANCH_KW if re.search(pat, full)), '')
        day = datetime.date.fromtimestamp(p.stat().st_mtime).isoformat()
        for r in roots:
            ids = []
            def go(i):
                if i in by and i not in ids:
                    ids.append(i)
                    for c in by[i].get('children', []): go(c)
            go(r['id']); sub = copy.deepcopy([by[i] for i in ids])
            cat = classify(sub, r.get('label', ''))
            h = hashlib.md5(json.dumps(sub, sort_keys=True).encode()).hexdigest()[:6]; key = f'online-{slug(name)[:22]}-{SHORT.get(cat, "content")}-{h}'
            L[key] = {'kind': 'content', 'title': f'{SHOWN.get(cat, cat)} · {name}', 'els': sub, 'cat': cat, 'group': 'Online hjemmesider', 'added': day, 'site': name, 'url': url, 'branche': branche,
                      'desc': 'Fra ' + (host or name) + (' · ' + branche if branche else '')}
            added.append((key, cat, name))
    return added, skipped

data = json.loads(rd('data.json'))
fold = pathlib.Path(opt.get('--sektioner') or (root / 'sektioner'))
if fold.is_dir():
    added, skipped = ingest(data, fold)
    for k, c, n in added: print(f'  + {k:46s} {c:16s} {n}')
    for n, why in skipped: print(f'  ! sprunget over: {n} ({why})')
    print(f'Online sektioner: {len(added)} tilføjet fra {fold.name}/')
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
