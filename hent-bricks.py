#!/usr/bin/env python3
"""Henter jeres Bricks-opsætning, så preview tegner med den rigtige CSS.  Kør: python3 hent-bricks.py
   Skriver src/bricks.json:
   - links:     Bricks' CSS/JS-filer fra stocksitet (preview indlæser dem direkte derfra)
   - theme:     variabler + theme styles fra stocksitet (inline CSS uden element-regler)
   - bp:        breakpoints (nøgle -> max-width)
   - classes:   CSS for globale klasser, præcis som Bricks har lavet den (stocksitet vinder over templatesitet)
   - elements:  CSS for hvert template-element, nøglet 'template:element-id' (bruges når elementets styling er uændret)
   - html:      færdig HTML for elementer Bricks bygger ud fra databasen (menuer, templates, shortcodes)
   - bricksData: opsætning til Bricks' JavaScript (slidere, accordions, faner, mobilmenu)"""
import re, json, time, pathlib, subprocess, concurrent.futures
from html.parser import HTMLParser

STOCK = 'https://beststock.kinsta.cloud/'
root = pathlib.Path(__file__).resolve().parent
data = json.loads((root / 'src' / 'data.json').read_text('utf-8'))
LIB, CLASSES = data['LIB'], data['CLASSES']
CLASS_NAMES = {c['name'] for c in CLASSES.values() if isinstance(c, dict) and c.get('name')}

def get(url):  # curl i stedet for urllib: macOS' indbyggede Python har for gammel SSL til templatesitet
    r = subprocess.run(['curl', '-sSL', '--max-time', '40', '-A', 'Mozilla/5.0 (udkast preview)', url], capture_output=True)
    if r.returncode: raise RuntimeError(r.stderr.decode('utf-8', 'replace').strip())
    return r.stdout.decode('utf-8', 'replace')

def style(h, sid):
    m = re.search(r'<style id="' + re.escape(sid) + r'"[^>]*>(.*?)</style>', h, re.S)
    return re.sub(r'/\*# sourceURL=[^*]*\*/', '', m.group(1)) if m else ''

def rules(css):
    """CSS -> [(media, selector, body)]. media er '' eller fx '(max-width: 768px)'. @keyframes o.l. beholdes som hele blokke."""
    out = []; i = 0; n = len(css)
    def block(j):  # j peger på '{' -> index efter matchende '}'
        d = 0
        for k in range(j, n):
            if css[k] == '{': d += 1
            elif css[k] == '}':
                d -= 1
                if d == 0: return k + 1
        return n
    while i < n:
        j = css.find('{', i)
        if j < 0: break
        head = re.sub(r'/\*.*?\*/', '', css[i:j], flags=re.S).strip(); end = block(j)
        if head.startswith('@media'):
            inner = css[j + 1:end - 1]; cond = head[6:].strip()
            for m2, sel, body in rules(inner): out.append((cond, sel, body))
        elif head.startswith('@'): out.append(('', head, css[j + 1:end - 1]))
        elif head: out.append(('', head, css[j + 1:end - 1].strip()))
        i = end
    return out

def emit(rs):
    return ''.join(f'@media {m} {{{s} {{{b}}}}}' if m else f'{s} {{{b}}}' for m, s, b in rs)

class Outer(HTMLParser):
    """Finder den fulde HTML for elementet med det givne HTML-id (inkl. børn)."""
    VOID = {'img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'area', 'col', 'embed', 'param', 'track', 'wbr'}
    def __init__(self, h, eid):
        super().__init__(convert_charrefs=False); self.h = h; self.eid = eid; self.start = None; self.depth = 0; self.end = None
        self.lines = [0]
        for ln in h.split('\n'): self.lines.append(self.lines[-1] + len(ln) + 1)
    def pos(self): l, c = self.getpos(); return self.lines[l - 1] + c
    def handle_starttag(self, tag, attrs):
        if self.end is not None: return
        if self.start is None:
            if dict(attrs).get('id') == self.eid:
                self.start = self.pos()
                if tag in self.VOID: self.end = self.start + len(self.get_starttag_text())
                else: self.depth = 1; self.tag = tag
        elif tag not in self.VOID: self.depth += 1
    def handle_endtag(self, tag):
        if self.start is None or self.end is not None or tag in self.VOID: return
        self.depth -= 1
        if self.depth == 0: self.end = self.pos() + len(f'</{tag}>')
def outer_html(h, eid):
    p = Outer(h, eid)
    try: p.feed(h)
    except Exception: pass
    return h[p.start:p.end] if p.start is not None and p.end else ''

# elementets HTML-id: Bricks bruger _cssId (fx "top-mobile-logo") i stedet for brxe-<id>, hvis det er sat
own = lambda sel, hid: re.search('#' + re.escape(hid) + r'(?![\w-])', sel) is not None
hid_of = lambda e: str((e.get('settings') or {}).get('_cssId') or '').strip() or 'brxe-' + e['id']

# ---------- stocksitet: links, theme, klasser, bricksData ----------
home = get(STOCK)
links = {'css': [], 'js': []}
for m in re.finditer(r"<link[^>]+rel=['\"]stylesheet['\"][^>]*href=['\"]([^'\"]+)['\"]", home): links['css'].append(m.group(1).replace('&#038;', '&'))
for m in re.finditer(r"<script[^>]+src=['\"]([^'\"]+)['\"]", home):
    u = m.group(1)
    if '/themes/bricks/' in u: links['js'].append(u)
for extra in ('libs/splide.min.js',):  # bruges kun på sider med slider, så den mangler måske på forsiden
    u = STOCK + 'wp-content/themes/bricks/assets/js/' + extra
    if not any(extra in x for x in links['js']): links['js'].insert(0, u)
for extra in ('libs/splide.min.css',):
    u = STOCK + 'wp-content/themes/bricks/assets/css/' + extra
    if not any(extra in x for x in links['css']): links['css'].append(u)
# bricks.min.js skal komme sidst (den starter slidere osv.)
links['js'].sort(key=lambda u: 'bricks.min.js' in u)
theme_rs = [r for r in rules(style(home, 'bricks-frontend-inline-inline-css')) if '#brxe-' not in r[1] and '#brx-' not in r[1]]
theme = emit(theme_rs) + style(home, 'global-styles-inline-css')
bd = re.search(r'var bricksData = (\{.*?\});', home, re.S)
bricks_data = json.loads(bd.group(1)) if bd else {}
for k in ('nonce', 'formNonce', 'wpRestNonce', 'postId'): bricks_data.pop(k, None)

classes = {}      # navn -> CSS
def add_classes(rs, prefer):
    by = {}
    for m, s, b in rs:
        if '#brxe-' in s or s.startswith('@'): continue
        names = [x for x in re.findall(r'\.([A-Za-z_][\w-]*)', s) if x in CLASS_NAMES]
        if not names: continue
        by.setdefault(names[0], []).append((m, s, b))
    for name, rr in by.items():
        if prefer or name not in classes: classes[name] = emit(rr)
add_classes(rules(style(home, 'bricks-global-classes-inline-inline-css')), True)

# ---------- templatesitet: element-CSS, klasser og færdig HTML ----------
# template-nøgle -> side på templatesitet. Navnene er ikke altid ens (cta-1 / cta-1-double-text, seo-blogindlaeg / seo-blogindlg)
pages = {}
norm = lambda x: re.sub(r'ae|oe|aa|[^a-z0-9]', '', x.lower())
sheet = {}
for s in data['SHEET']: sheet.setdefault(s['s'], s['u'])
for k, u in sheet.items():
    if k in LIB: pages[k] = u
for k, u in sheet.items():
    if k in LIB: continue
    cand = [x for x in LIB if x not in pages and not x.startswith('online-') and (x.startswith(k + '-') or norm(x) == norm(k))]
    if len(cand) == 1: pages[cand[0]] = u
base = re.match(r'https?://[^/]+/template/', next(iter(sheet.values()), '')) if sheet else None
for x in LIB:   # resten: prøv /template/<nøgle>/
    if x not in pages and not x.startswith('online-') and base: pages[x] = base.group(0) + x + '/'
def fetch(item):
    k, u = item
    for n in range(4):   # templatesitet svarer 429 (for mange forespørgsler), hvis vi henter for hurtigt – prøv igen lidt senere
        try: h = get(u)
        except Exception as e: print('  ! kunne ikke hente', u, e); return k, ''
        if '429 Too Many Requests' not in h[:2000]: return k, h
        time.sleep(3 * (n + 1))
    print('  ! templatesitet afviste', u, '(429)'); return k, ''
with concurrent.futures.ThreadPoolExecutor(3) as ex: got = dict(ex.map(fetch, pages.items()))

elements, html = {}, {}
# elementer som Bricks bygger ud fra WordPress (menuer, templates, indlægsdata) – her gemmes Bricks' færdige HTML
DYNAMIC = {'nav-menu', 'template', 'shortcode', 'post-toc', 'form', 'post-meta', 'post-title', 'post-content', 'post-excerpt', 'post-taxonomy', 'post-author', 'posts', 'related-posts', 'breadcrumbs', 'pagination', 'search', 'sidebar', 'wordpress'}
ok_pages = set()   # kun sider, hvor templatens elementer faktisk findes (ikke 404-sider)
for k, h in sorted(got.items()):
    if not h or not any(('id="' + hid_of(e) + '"') in h for e in LIB[k]['els']): continue
    ok_pages.add(k)
    # alle Bricks' styleblokke: elementer, klasser, templates (dynamic-data) og formularens skjulte spam-felt (unavngivet blok)
    blocks = [m.group(2) for m in re.finditer(r'<style([^>]*)>(.*?)</style>', h, re.S) if not re.search(r'id="(wp-|classic-|global-styles)', m.group(1))]
    rs = [r for b in blocks for r in rules(re.sub(r'/\*# sourceURL=[^*]*\*/', '', b))]
    add_classes(rs, False)
    for e in LIB[k]['els']:
        eid = e['id']; hid = hid_of(e)
        if ('id="' + hid + '"') not in h: continue
        mine = [(m, re.sub('#' + re.escape(hid) + r'(?![\w-])', '#%SEL%', s), b) for m, s, b in rs if own(s, hid)]
        if mine: elements[k + ':' + eid] = emit(mine)
        n = e['name']; st = e.get('settings') or {}
        if n in DYNAMIC:
            oh = outer_html(h, hid)
            if not oh: continue
            inner_ids = set(re.findall(r'id="([^"]+)"', oh)) - {hid}
            fields = set(re.findall(r'id="(form-field-[a-z0-9]+)"', oh))   # fx honeypot-feltet, som Bricks skjuler med div.form-group:has(input#form-field-…)
            css = emit([r for r in rs if any(own(r[1], i) for i in inner_ids) or any(f in r[1] for f in fields)])
            item = {'html': oh.replace('id="' + hid + '"', 'id="%SEL%"', 1), 'css': css}
            html[n + ':' + k + ':' + eid] = item          # præcis dette element
            if n in ('nav-menu', 'template'): html.setdefault(('menu:' + str(st.get('menu', ''))) if n == 'nav-menu' else 'template:' + str(st.get('template', '')), item)

out = {'source': STOCK, 'bp': {'tablet_portrait': 1470, 'tablet_landscape': 1024, 'mobile_landscape': 768, 'mobile_portrait': 478},
       'pages': sorted(ok_pages), 'links': links, 'theme': theme, 'classes': classes, 'elements': elements, 'html': html, 'bricksData': bricks_data}
p = root / 'src' / 'bricks.json'; p.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), 'utf-8')
print(f'Skrev {p.name}: {len(links["css"])} CSS-filer, {len(links["js"])} JS-filer, {len(classes)} klasser, {len(elements)} elementer, '
      f'{len(html)} færdige HTML-blokke, {round(p.stat().st_size / 1024)} KB')
