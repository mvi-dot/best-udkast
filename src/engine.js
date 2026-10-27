/* ===== Best One – Bricks side-generator v2: motor (ren logik, ingen DOM) ===== */
'use strict';

const FORM_ID = '2e0eed';
const BRICKS_VERSION = '2.3.13';
const SOURCE_URL = 'https://best-template.test-one.dk/';
const BP = {
  desktop_large: ['min', 1921], macbook_1440: ['max', 1440], tablet_landscape: ['max', 1199],
  tablet_portrait: ['max', 991], mobile_landscape: ['max', 767], mobile_portrait: ['max', 478],
};
const BP_ORDER = ['desktop_large', 'macbook_1440', 'tablet_landscape', 'tablet_portrait', 'mobile_landscape', 'mobile_portrait'];
const VALID_NAMES = new Set(['section', 'container', 'block', 'div', 'heading', 'text-basic', 'text', 'button', 'image', 'icon', 'svg', 'code', 'template', 'divider', 'icon-box', 'rating', 'counter', 'logo', 'text-link', 'list', 'social-icons', 'image-gallery', 'offcanvas', 'shortcode', 'video', 'form', 'nav-menu', 'nav-nested', 'dropdown', 'toggle', 'slider-nested', 'tabs-nested', 'accordion', 'accordion-nested', 'posts', 'post-meta', 'post-toc']);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stripTags = h => String(h == null ? '' : h).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const clone = o => JSON.parse(JSON.stringify(o));

/* ---------- træ ---------- */
const mapOf = els => { const m = {}; for (const e of els) m[e.id] = e; return m; };
const rootsOf = els => els.filter(e => e.parent === 0 || e.parent === '0');
function walk(els, fn) {
  const m = mapOf(els);
  const go = (id, depth) => { const e = m[id]; if (!e) return; fn(e, depth); for (const c of e.children || []) go(c, depth + 1); };
  for (const r of rootsOf(els)) go(r.id, 0);
}
function removeSubtree(els, id) {
  const m = mapOf(els); const kill = new Set();
  const go = i => { kill.add(i); for (const c of (m[i] && m[i].children) || []) go(c); };
  if (!m[id]) return els;
  go(id);
  const par = m[m[id].parent]; if (par) par.children = (par.children || []).filter(c => c !== id);
  return els.filter(e => !kill.has(e.id));
}

/* ---------- kategorier / varianter (navne som i skabelon-arket) + meta fra arket ---------- */
const TYPE_ORDER = ['Header', 'Ydelser', 'Anmeldelser', 'Cases', 'Priser', 'FAQ', 'Content', 'Galleri', 'Medarbejdere', 'Kontakt sektion', 'Underside', 'Marketing', 'CTA sektion'];
const PREFIX_TYPE = { hero: 'Header', ydelse: 'Ydelser', anmeldelse: 'Anmeldelser', cases: 'Cases', priser: 'Priser', faq: 'FAQ', content: 'Content', kontaktsektion: 'Kontakt sektion', kontakformular: 'Kontaktformular', kontaktformular: 'Kontaktformular', kontakt: 'Kontakt side', knapper: 'Knapper', underside: 'Underside', geo: 'Marketing', viden: 'Marketing', seo: 'Marketing', blog: 'Marketing', galleri: 'Galleri', medarbejdere: 'Medarbejdere', cta: 'CTA sektion' };
const WHOLE_PAGE = new Set(['Underside', 'Marketing', 'Menu', 'Footer']);                   // hele sider: kun hvis der bedes om det
const SHEET_ALIAS = { underside: 'underside-1', 'seo-blogindlaeg': 'seo-blogindlg', 'menu-10': 'menu-10-mega-menu' };
let META = {}; let MISSING = []; let CATS = {}, TITLES = {}; let SHEETDATE = {};
function setMeta(LIB, rows) {
  META = {}; MISSING = []; CATS = {}; TITLES = {}; DESCS = {}; SHEETDATE = {}; for (const k of Object.keys(LIB)) { if (LIB[k].cat) CATS[k] = LIB[k].cat; if (LIB[k].title) TITLES[k] = LIB[k].title; if (LIB[k].desc && !LIB[k].group) DESCS[k] = LIB[k].desc; }
  (rows || []).forEach((o, ri) => { if (!o) return; let k0 = SHEET_ALIAS[o.s] || o.s; if (!LIB[k0]) k0 = Object.keys(LIB).find(k => k.startsWith(o.s + '-')) || null; const m = String(o.d || '').match(/^(\d{2})-(\d{2})-(\d{4})$/); if (k0 && LIB[k0] && m && !SHEETDATE[k0]) SHEETDATE[k0] = { d: `${m[3]}-${m[2]}-${m[1]}`, i: ri }; });
  for (const o of rows || []) {
    if (!o || /^(Menu|Footer)$/i.test(o.t)) continue;
    let key = SHEET_ALIAS[o.s] || o.s; if (!LIB[key]) key = Object.keys(LIB).find(k => k.startsWith(o.s + '-')) || null;
    if (key && LIB[key] && !META[key]) META[key] = { name: o.n, type: /^cta$/i.test(String(o.t).trim()) ? 'CTA sektion' : String(o.t).trim(), desc: o.b || '', date: o.d || '', link: o.u || '' }; else MISSING.push(o);
  }
  return { matched: Object.keys(META).length, missing: MISSING };
}
const prefixOf = k => k.split('-')[0];
function categoryOf(key) { if (String(key).startsWith('ai-')) return 'AI sektion'; if (String(key).startsWith('fri-')) return 'Ny sektion'; if (CATS[key]) return CATS[key]; if (META[key]) return META[key].type; const p = prefixOf(key); return PREFIX_TYPE[p] || (p.charAt(0).toUpperCase() + p.slice(1)); }
function displayName(key) { if (String(key).startsWith('ai-')) return 'AI sektion'; if (String(key).startsWith('fri-')) return 'Ny · ' + ((FRI_TYPES[key.slice(4)] || {}).name || key); if (META[key]) return META[key].name; if (TITLES[key] && !/^[a-z]+-\d+$/.test(key)) return TITLES[key]; const m = key.match(/^([a-zæøå]+)-(\d+)/i); return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1) + ' #' + m[2] : key; }
let DESCS = {};
const describeKey = key => (META[key] && META[key].desc) || DESCS[key] || '';
const EXCLUDED_CATS = new Set(['Menu', 'Footer', 'Marketing', 'Underside', 'Knapper', 'Kontakt side', 'Kontaktformular']);   // basisregel: bruges ALDRIG (hverken i udkast eller i "Tilføj sektion")
const EXCLUDED_KEYS = new Set(['seo-blogindlg', 'seo-blogindlaeg', 'blog-underside', 'geo-underside', 'viden-geo']);
const EXCLUDED_RE = /^kontakt?formular/;                                          // basisregel: kontaktformularerne bruges ALDRIG (begge stavemåder)
const isExcluded = k => EXCLUDED_KEYS.has(k) || EXCLUDED_RE.test(k);
const allowedKeys = (LIB, auto) => Object.keys(LIB).filter(k => !EXCLUDED_CATS.has(categoryOf(k)) && !isExcluded(k) && (!auto || categoryOf(k) !== 'CTA sektion')).sort((a, b) => a.localeCompare(b, 'da', { numeric: true }));
const variantsOf = (LIB, cat) => allowedKeys(LIB).filter(k => categoryOf(k) === cat);
function catList(LIB) { const have = new Set(allowedKeys(LIB).map(categoryOf)); return TYPE_ORDER.filter(c => have.has(c)).concat([...have].filter(c => !TYPE_ORDER.includes(c)).sort()); }
function nextVariant(LIB, tpl, used) {
  const list = variantsOf(LIB, categoryOf(tpl)).filter(k => categoryOf(k) !== 'CTA sektion'); if (list.length < 2) return null;
  const i = list.indexOf(tpl); const order = i < 0 ? list : list.slice(i + 1).concat(list.slice(0, i));
  return order.find(k => !used.includes(k)) || order[0];
}

/* ---------- tekst (kun til import af kundens egne tekster – ellers rører vi ikke tekst) ---------- */
const TEXT_KINDS = new Set(['heading', 'text-basic', 'text', 'button', 'text-link']);
function parsePhone(raw) {
  const s = String(raw || '').trim(); if (!s) return null; let d = s.replace(/\D/g, ''); const compact = s.replace(/\s/g, '');
  if (/^(\+45|0045)/.test(compact)) d = d.replace(/^(0045|45)/, ''); else if (d.length === 10 && d.startsWith('45')) d = d.slice(2);
  if (d.length === 8) return { shown: d.replace(/(\d{2})(?=\d)/g, '$1 '), href: 'tel:+45' + d };
  if (s.startsWith('+') && d.length >= 7) return { shown: s, href: 'tel:+' + d };
  return d.length >= 6 ? { shown: s, href: 'tel:' + d } : null;
}
function applyPhone(els, tlf) {
  const ph = parsePhone(tlf); if (!ph) return 0; const shown = ph.shown, href = ph.href; let n = 0;
  for (const e of els) {
    if (!e.settings) continue; const before = JSON.stringify(e.settings);
    const after = before.replace(/tel:\+?45\s?88\s?88\s?88\s?88/g, href).replace(/88 88 88 88/g, shown.replace(/"/g, ''));
    if (after !== before) { e.settings = JSON.parse(after); n++; }
  }
  return n;
}

/* ---------- billeder / import af kundens eksisterende site ---------- */
const fileOf = u => decodeURIComponent(String(u).split('?')[0].split('/').pop() || 'billede');
let ENV = { CLASSES: {} }; const setEnv = o => { ENV = Object.assign(ENV, o); if (o && o.CLASSES) setFriClasses(o.CLASSES); };


/* ============================================================================
   NYE SEKTIONER ("fri"): bygget af temaets variabler, med egen scopet CSS.
   AI'en vælger type og skriver kort tekst; motoren bygger gyldige Bricks-elementer.
   ============================================================================ */
const FRI_TYPES = {
  intro: { name: 'Intro', n: 0 }, split: { name: 'Tekst + billede', n: 0 },
  cards: { name: 'Kort', n: 3, min: 2, max: 8, label: 'kort' }, features: { name: 'Fordele', n: 4, min: 2, max: 8, label: 'punkter' },
  steps: { name: 'Trin', n: 4, min: 2, max: 6, label: 'trin' }, stats: { name: 'Tal', n: 3, min: 2, max: 4, label: 'tal' },
  trust: { name: 'Tillidsbånd', n: 4, min: 2, max: 5, label: 'punkter' }, quote: { name: 'Citat', n: 0 },
  gallery: { name: 'Galleri', n: 6, min: 3, max: 9, label: 'billeder' },
};
const FRI_STIL = ['lys', 'graa', 'primaer', 'moerk'];
const FRI_ICONS = ['fas fa-check', 'fas fa-shield-halved', 'fas fa-star', 'fas fa-clock', 'fas fa-hammer', 'fas fa-house', 'fas fa-leaf', 'fas fa-bolt', 'fas fa-heart', 'fas fa-phone', 'fas fa-location-dot', 'fas fa-award', 'fas fa-users', 'fas fa-handshake', 'fas fa-wrench', 'fas fa-paint-roller', 'fas fa-truck', 'fas fa-sun', 'fas fa-lightbulb', 'fas fa-thumbs-up', 'fas fa-calendar-check', 'fas fa-ruler-combined', 'fas fa-tree', 'fas fa-droplet', 'fas fa-fire', 'fas fa-gear', 'fas fa-comments', 'fas fa-gem', 'fas fa-lock', 'fas fa-circle-check'];
const FRI_IMG = ['0U2A7949.jpg', '0U2A2561.jpg', '0U2A4711.jpg', '0U2A9311.jpg'].map((f, i) => { const id = [1958, 1928, 1941, 1961][i]; const u = 'https://best-template.test-one.dk/wp-content/uploads/2025/05/' + f; return { id, filename: f, size: 'full', full: u, url: u }; });
const FRI_BTN_CLASS = 'button-hover';                        // jeres eksisterende klasse til knap-hover
const FRI_USED = new Set(); let FRI_CLASSES = {};
const setFriClasses = C => { FRI_CLASSES = C || {}; };
const friClassId = name => Object.keys(FRI_CLASSES).find(k => FRI_CLASSES[k].name === name);
const friIcon = v => { const x = fstr(v, 40).replace(/^fas fa-/, '').replace(/^fa-/, ''); const full = 'fas fa-' + x; return FRI_ICONS.includes(full) ? full : ''; };
const fstr = (v, n) => String(v == null ? '' : v).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const fnum = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };

function normFri(s) {
  const type = s && (s.fri || s.type); if (!FRI_TYPES[type]) return null; const T = FRI_TYPES[type];
  const o = { fri: type, stil: FRI_STIL.includes(s.stil) ? s.stil : (type === 'stats' || type === 'trust' ? 'primaer' : type === 'quote' ? 'graa' : 'lys'), layout: s.layout === 'billede-venstre' ? 'billede-venstre' : 'billede-hoejre',
    eyebrow: fstr(s.eyebrow, 40), overskrift: fstr(s.overskrift, 90), tekst: fstr(s.tekst, 420), tekst2: fstr(s.tekst2, 320), punkter: (Array.isArray(s.punkter) ? s.punkter : []).map(x => fstr(x, 70)).filter(Boolean).slice(0, 8),
    knapper: (Array.isArray(s.knapper) ? s.knapper : []).map(k => typeof k === 'string' ? { tekst: fstr(k, 28), type: 'kontakt' } : { tekst: fstr(k && k.tekst, 28), type: ['telefon', 'kontakt', 'link'].includes(k && k.type) ? k.type : 'kontakt' }).filter(k => k.tekst || k.type === 'telefon').slice(0, 2),
    kort: (Array.isArray(s.kort) ? s.kort : []).map(k => ({ ikon: friIcon(k && k.ikon), titel: fstr(k && k.titel, 60), tekst: fstr(k && k.tekst, 200) })).filter(k => k.titel || k.tekst),
    trin: (Array.isArray(s.trin) ? s.trin : []).map(k => ({ titel: fstr(k && k.titel, 60), tekst: fstr(k && k.tekst, 200) })).filter(k => k.titel || k.tekst),
    tal: (Array.isArray(s.tal) ? s.tal : []).map(k => ({ tal: fstr(k && k.tal, 8).replace(/[^0-9]/g, '') || '100', suffix: fstr(k && k.suffix, 4), label: fstr(k && k.label, 40) })),
    citat: { tekst: fstr(s.citat && s.citat.tekst, 320), navn: fstr(s.citat && s.citat.navn, 40), titel: fstr(s.citat && s.citat.titel, 50) } };
  if (T.n) o.antal = friSnap(type, Math.max(T.min, Math.min(T.max, fnum(s.antal, 0) || (o.kort.length || o.trin.length || o.tal.length || o.punkter.length || T.n))), 0);
  if (type === 'cards' || type === 'trust') o.kort = friFill(o.kort, o.antal, i => ({ ikon: FRI_ICONS[(i * 3) % FRI_ICONS.length], titel: 'Overskrift', tekst: 'Kort tekst om punktet.' }));
  if (type === 'features') o.kort = friFill(o.kort, o.antal, i => ({ ikon: FRI_ICONS[(i * 3) % FRI_ICONS.length], titel: 'Fordel', tekst: 'Kort forklaring.' }));
  if (type === 'steps') o.trin = friFill(o.trin, o.antal, i => ({ titel: 'Trin ' + (i + 1), tekst: 'Kort forklaring af trinnet.' }));
  if (type === 'stats') o.tal = friFill(o.tal, o.antal, () => ({ tal: '100', suffix: '+', label: 'Tekst' }));
  if (type === 'quote' && !o.citat.tekst) o.citat.tekst = 'Her står kundens ord om samarbejdet.';
  if (!o.overskrift && ['intro', 'split', 'cards', 'features', 'steps'].includes(type)) o.overskrift = 'Overskrift';
  if (type === 'split' && !o.tekst) o.tekst = 'Kort tekst, der forklarer, hvad siden handler om.';
  return o;
}
const GAL_OK = [3, 4, 5, 6, 8, 9];
const friSnap = (type, n, from) => { if (type !== 'gallery') return n; if (GAL_OK.includes(n)) return n; return n > (from || 0) ? GAL_OK.find(x => x >= n) || 9 : [...GAL_OK].reverse().find(x => x <= n) || 3; };
const friFill = (arr, n, mk) => { const out = arr.slice(0, n); while (out.length < n) out.push(mk(out.length)); return out; };

const FRI_THEME = {
  lys: { bg: 'var(--white)', fg: 'var(--font)', hd: 'var(--heading)', card: 'var(--dark-5)', line: 'var(--dark-10)', icbg: 'var(--cta)', icfg: 'var(--light)', eye: 'var(--cta)' },
  graa: { bg: 'var(--dark-5)', fg: 'var(--font)', hd: 'var(--heading)', card: 'var(--white)', line: 'var(--dark-10)', icbg: 'var(--cta)', icfg: 'var(--light)', eye: 'var(--cta)' },
  primaer: { bg: 'var(--cta)', fg: 'var(--light-90)', hd: 'var(--light)', card: 'var(--light-10)', line: 'var(--light-20)', icbg: 'var(--light)', icfg: 'var(--cta)', eye: 'var(--light-70)' },
  moerk: { bg: 'var(--dark)', fg: 'var(--light-80)', hd: 'var(--light)', card: 'var(--light-10)', line: 'var(--light-20)', icbg: 'var(--cta)', icfg: 'var(--light)', eye: 'var(--light-60)' },
};
function friCss(s, extra) {
  const t = FRI_THEME[s.stil]; const dark = s.stil === 'primaer' || s.stil === 'moerk';
  const pad = s.fri === 'trust' ? 'var(--space-l)' : 'var(--space-2xl)';
  return `%root%{background:${t.bg};color:${t.fg};padding:${pad} 0;overflow:hidden}
%root% .fri-wrap{width:min(1200px,90%);max-width:none;margin:0 auto;padding:0;display:flex;flex-direction:column;gap:var(--space-l)}
%root% .fri-stack{display:flex;flex-direction:column;gap:var(--space-s);align-items:flex-start}
%root% .fri-center{align-items:center;text-align:center;margin:0 auto;max-width:780px}
%root% .fri-eyebrow{margin:0;font-size:var(--text-xs);font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${t.eye}}
%root% .fri-h{margin:0;font-size:var(--text-2xl);line-height:1.08;color:${t.hd}}
%root% .fri-p{margin:0;font-size:var(--text-m);line-height:1.65;color:${t.fg}}
%root% .fri-btns{display:flex;flex-direction:row;flex-wrap:wrap;gap:var(--space-xs);margin-top:var(--space-xs);width:auto;max-width:100%}
%root% .fri-stack>*{max-width:100%}
%root% .fri-center .fri-btns{justify-content:center}
%root% .fri-grid{display:grid;gap:var(--space-m);list-style:none;margin:0;padding:0}
%root% .fri-card{display:flex;flex-direction:column;gap:var(--space-xs);padding:var(--space-m);background:${t.card};border:1px solid ${t.line};border-radius:var(--radius-m);${dark ? '' : 'box-shadow:0 2px 8px rgba(0,0,0,.08);'}transition:transform .25s,box-shadow .25s}
%root% .fri-card:hover{transform:translateY(-4px)${dark ? '' : ';box-shadow:0 14px 34px rgba(0,0,0,.14)'}}
%root% .fri-card h3,%root% .fri-item h3,%root% .fri-step h3{margin:0;font-size:var(--text-l);line-height:1.2;color:${t.hd}}
%root% .fri-card p,%root% .fri-item p,%root% .fri-step p{margin:0;font-size:var(--text-s);line-height:1.6;color:${t.fg}}
%root% .fri-ico{display:grid;place-items:center;flex:none;width:5.6rem;height:5.6rem;border-radius:var(--radius-full);background:${t.icbg};color:${t.icfg};font-size:2.2rem}
%root% .fri-ico i,%root% .fri-ico svg{color:inherit;fill:currentColor}
${extra || ''}
@media (max-width:991px){%root%{padding:var(--space-xl) 0}}`;
}
const NODE = (name, settings, kids, label) => ({ name, settings: settings || {}, kids: kids || [], label });
function friFlatten(root) {
  const els = []; const go = (n, parent) => { const id = makeId(FRI_USED); const e = { id, name: n.name, parent, children: [], settings: n.settings }; if (n.label) e.label = n.label; els.push(e); for (const k of n.kids) e.children.push(go(k, id)); return id; };
  go(root, 0); return els;
}
const fHead = (s, center) => { const k = []; if (s.eyebrow) k.push(NODE('text-basic', { text: s.eyebrow, tag: 'p', _cssClasses: 'fri-eyebrow' })); if (s.overskrift) k.push(NODE('heading', { text: s.overskrift, tag: 'h2', _cssClasses: 'fri-h' })); if (s.tekst) k.push(NODE('text-basic', { text: s.tekst, tag: 'p', _cssClasses: 'fri-p' })); return k; };
function fBtns(s) {
  if (!s.knapper.length) return [];
  const dark = s.stil === 'primaer' || s.stil === 'moerk'; const gid = friClassId(FRI_BTN_CLASS);
  return [NODE('div', { _cssClasses: 'fri-btns' }, s.knapper.map((k, i) => {
    const tel = k.type === 'telefon'; const txt = tel ? '88 88 88 88' : k.tekst; const hov = tel ? 'Ring nu' : (k.type === 'kontakt' ? 'Klik her' : 'Læs mere');
    const st = { text: `<span class="btn-text-default">${esc(txt)}</span> <span class="btn-text-hover">${esc(hov)}</span>`, style: i === 0 ? (dark ? 'light' : 'primary') : (dark ? 'secondary' : 'dark'), size: 'xl', icon: { library: 'fontawesomeSolid', icon: tel ? 'fas fa-mobile-screen' : 'fas fa-arrow-right-long' }, iconPosition: 'right', link: tel ? { type: 'external', url: 'tel:+4588888888' } : { type: 'internal', url: '#' } };
    if (gid) st._cssGlobalClasses = [gid]; return NODE('button', st);
  }))];
}
const fIcon = ic => NODE('div', { _cssClasses: 'fri-ico' }, [NODE('icon', { icon: { library: 'fontawesomeSolid', icon: ic } })]);
const fImg = i => NODE('image', { tag: 'figure', _objectFit: 'cover', image: FRI_IMG[i % FRI_IMG.length], _cssClasses: 'fri-img' });
const colsFor = (n, max) => n <= 4 ? n : (n % 3 === 0 || n === 5 || n === 7 ? 3 : 4);

function buildFri(s) {
  const t = s.fri; let css = '', body = [];
  if (t === 'intro') {
    body = [NODE('block', { _cssClasses: 'fri-stack fri-center' }, [...fHead(s), ...fBtns(s)])];
    css = friCss(s);
  } else if (t === 'split') {
    const copy = [...fHead(s)]; if (s.tekst2) copy.push(NODE('text-basic', { text: s.tekst2, tag: 'p', _cssClasses: 'fri-p' }));
    if (s.punkter.length) copy.push(NODE('block', { tag: 'ul', _cssClasses: 'fri-checks' }, s.punkter.map(p => NODE('block', { tag: 'li', _cssClasses: 'fri-check' }, [NODE('icon', { icon: { library: 'fontawesomeSolid', icon: 'fas fa-circle-check' } }), NODE('text-basic', { text: p, tag: 'span' })]))));
    copy.push(...fBtns(s));
    body = [NODE('div', { _cssClasses: 'fri-split' + (s.layout === 'billede-venstre' ? ' fri-rev' : '') }, [NODE('block', { _cssClasses: 'fri-stack fri-copy' }, copy), NODE('block', { _cssClasses: 'fri-media' }, [fImg(0)])])];
    const t2 = FRI_THEME[s.stil];
    css = friCss(s, `%root% .fri-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--space-xl);align-items:center}
%root% .fri-rev .fri-media{order:-1}
%root% .fri-media{position:relative}
%root% .fri-media::before{content:"";position:absolute;inset:var(--space-xs) calc(var(--space-xs) * -1) calc(var(--space-xs) * -1) var(--space-xs);border-radius:var(--radius-l);background:${t2.icbg};opacity:.14}
%root% .fri-rev .fri-media::before{inset:var(--space-xs) var(--space-xs) calc(var(--space-xs) * -1) calc(var(--space-xs) * -1)}
%root% .fri-media figure,%root% .fri-media img{position:relative;display:block;width:100%;max-width:100%;margin:0}
%root% .fri-split>*,%root% .fri-feat>*{min-width:0}
%root% .fri-media img{aspect-ratio:4/3;object-fit:cover;border-radius:var(--radius-l);box-shadow:0 14px 34px rgba(0,0,0,.14)}
%root% .fri-checks{list-style:none;margin:0;padding:0;display:grid;gap:var(--space-2xs)}
%root% .fri-check{display:flex;flex-direction:row;gap:var(--space-xs);align-items:flex-start;font-size:var(--text-m);color:${t2.fg}}
%root% .fri-check i,%root% .fri-check svg{color:${t2.icbg === 'var(--light)' ? 'var(--light)' : 'var(--cta)'};margin-top:.35rem;flex:none}
@media (max-width:991px){%root% .fri-split{grid-template-columns:minmax(0,1fr);gap:var(--space-l)}%root% .fri-rev .fri-media{order:0}}`);
  } else if (t === 'cards') {
    const head = (s.eyebrow || s.overskrift || s.tekst) ? [NODE('block', { _cssClasses: 'fri-stack fri-center' }, fHead(s))] : [];
    const cols = colsFor(s.antal);
    body = [...head, NODE('block', { tag: 'ul', _cssClasses: 'fri-grid fri-cardgrid' }, s.kort.map(k => NODE('block', { tag: 'li', _cssClasses: 'fri-card' }, [...(k.ikon ? [fIcon(k.ikon)] : []), NODE('heading', { text: k.titel, tag: 'h3' }), ...(k.tekst ? [NODE('text-basic', { text: k.tekst, tag: 'p' })] : [])]))), ...(s.knapper.length ? [NODE('block', { _cssClasses: 'fri-stack fri-center' }, fBtns(s))] : [])];
    css = friCss(s, `%root% .fri-cardgrid{grid-template-columns:repeat(${cols},minmax(0,1fr))}
@media (max-width:991px){%root% .fri-cardgrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:767px){%root% .fri-cardgrid{grid-template-columns:minmax(0,1fr)}}`);
  } else if (t === 'features') {
    const cols = s.antal >= 4 ? 2 : 1; const left = [...fHead(s), ...fBtns(s)];
    body = [NODE('div', { _cssClasses: 'fri-feat' }, [NODE('block', { _cssClasses: 'fri-stack' }, left), NODE('block', { tag: 'ul', _cssClasses: 'fri-grid fri-featgrid' }, s.kort.map(k => NODE('block', { tag: 'li', _cssClasses: 'fri-item' }, [fIcon(k.ikon || 'fas fa-check'), NODE('block', { _cssClasses: 'fri-itemtxt' }, [NODE('heading', { text: k.titel, tag: 'h3' }), ...(k.tekst ? [NODE('text-basic', { text: k.tekst, tag: 'p' })] : [])])])))])];
    css = friCss(s, `%root% .fri-feat{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:var(--space-xl);align-items:start}
%root% .fri-featgrid{grid-template-columns:repeat(${cols},minmax(0,1fr))}
%root% .fri-item{display:flex;flex-direction:row;gap:var(--space-s);align-items:flex-start}
%root% .fri-itemtxt{display:flex;flex-direction:column;gap:var(--space-3xs)}
@media (max-width:991px){%root% .fri-feat{grid-template-columns:minmax(0,1fr);gap:var(--space-l)}%root% .fri-featgrid{grid-template-columns:minmax(0,1fr)}}`);
  } else if (t === 'steps') {
    const cols = Math.min(s.antal, 4); const head = (s.eyebrow || s.overskrift || s.tekst) ? [NODE('block', { _cssClasses: 'fri-stack fri-center' }, fHead(s))] : [];
    body = [...head, NODE('block', { tag: 'ul', _cssClasses: 'fri-grid fri-steps' }, s.trin.map((k, i) => NODE('block', { tag: 'li', _cssClasses: 'fri-step' }, [NODE('text-basic', { text: String(i + 1), tag: 'span', _cssClasses: 'fri-no' }), NODE('heading', { text: k.titel, tag: 'h3' }), ...(k.tekst ? [NODE('text-basic', { text: k.tekst, tag: 'p' })] : [])]))), ...(s.knapper.length ? [NODE('block', { _cssClasses: 'fri-stack fri-center' }, fBtns(s))] : [])];
    const t2 = FRI_THEME[s.stil];
    css = friCss(s, `%root% .fri-steps{grid-template-columns:repeat(${cols},minmax(0,1fr))}
%root% .fri-step{position:relative;display:flex;flex-direction:column;gap:var(--space-2xs);padding-top:var(--space-s)}
%root% .fri-no{display:grid;place-items:center;width:5.2rem;height:5.2rem;border-radius:var(--radius-full);background:${t2.icbg};color:${t2.icfg};font-size:var(--text-m);font-weight:800;margin-bottom:var(--space-2xs)}
%root% .fri-step::before{content:"";position:absolute;top:calc(var(--space-s) + 2.6rem);left:6.4rem;right:calc(var(--space-m) * -1);height:2px;background:${t2.line}}
%root% .fri-step:last-child::before{display:none}
@media (max-width:991px){%root% .fri-step::before{display:none}%root% .fri-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:767px){%root% .fri-steps{grid-template-columns:minmax(0,1fr)}}`);
  } else if (t === 'stats') {
    const head = (s.eyebrow || s.overskrift) ? [NODE('block', { _cssClasses: 'fri-stack fri-center' }, fHead(s))] : [];
    body = [...head, NODE('block', { tag: 'ul', _cssClasses: 'fri-grid fri-stats' }, s.tal.map(k => NODE('block', { tag: 'li', _cssClasses: 'fri-stat' }, [NODE('counter', { countTo: k.tal, suffix: k.suffix, _cssClasses: 'fri-num' }), NODE('text-basic', { text: k.label, tag: 'p', _cssClasses: 'fri-label' })])))];
    const t2 = FRI_THEME[s.stil];
    css = friCss(s, `%root% .fri-stats{grid-template-columns:repeat(${s.antal},minmax(0,1fr))}
%root% .fri-stat{display:flex;flex-direction:column;align-items:center;text-align:center;gap:var(--space-3xs);padding:var(--space-s) var(--space-xs);border-left:1px solid ${t2.line}}
%root% .fri-stat:first-child{border-left:0}
%root% .fri-num{display:flex;justify-content:center;font-size:var(--text-3xl);font-weight:800;line-height:1;color:${t2.hd}}
%root% .fri-label{margin:0;font-size:var(--text-s);letter-spacing:.04em;text-transform:uppercase;color:${t2.fg}}
@media (max-width:991px){%root% .fri-stats{grid-template-columns:repeat(2,minmax(0,1fr))}%root% .fri-stat:nth-child(odd){border-left:0}}
@media (max-width:767px){%root% .fri-stats{grid-template-columns:minmax(0,1fr)}%root% .fri-stat{border-left:0;border-top:1px solid ${t2.line}}%root% .fri-stat:first-child{border-top:0}}`);
  } else if (t === 'trust') {
    body = [NODE('block', { tag: 'ul', _cssClasses: 'fri-trust' }, s.kort.map(k => NODE('block', { tag: 'li', _cssClasses: 'fri-trusti' }, [NODE('icon', { icon: { library: 'fontawesomeSolid', icon: k.ikon || 'fas fa-check' } }), NODE('text-basic', { text: k.titel, tag: 'span' })])))];
    const t2 = FRI_THEME[s.stil];
    css = friCss(s, `%root% .fri-trust{list-style:none;margin:0;padding:0;display:flex;flex-direction:row;flex-wrap:wrap;justify-content:center;gap:var(--space-xs) var(--space-l)}
%root% .fri-trusti{display:flex;flex-direction:row;width:auto;flex:0 0 auto;align-items:center;gap:var(--space-2xs);font-size:var(--text-m);font-weight:700;color:${t2.hd}}
%root% .fri-trusti i,%root% .fri-trusti svg{color:${t2.icbg === 'var(--light)' ? 'var(--light)' : 'var(--cta)'};font-size:1.15em}`);
  } else if (t === 'quote') {
    const stars = [0, 1, 2, 3, 4].map(() => NODE('icon', { icon: { library: 'fontawesomeSolid', icon: 'fas fa-star' } }));
    body = [NODE('block', { _cssClasses: 'fri-quote' }, [...(s.eyebrow ? [NODE('text-basic', { text: s.eyebrow, tag: 'p', _cssClasses: 'fri-eyebrow' })] : []), NODE('div', { _cssClasses: 'fri-stars' }, stars), NODE('text-basic', { text: s.citat.tekst, tag: 'p', _cssClasses: 'fri-q' }), NODE('block', { _cssClasses: 'fri-who' }, [NODE('text-basic', { text: s.citat.navn || 'Navn Navnesen', tag: 'span', _cssClasses: 'fri-name' }), ...(s.citat.titel ? [NODE('text-basic', { text: s.citat.titel, tag: 'span', _cssClasses: 'fri-role' })] : [])])])];
    const t2 = FRI_THEME[s.stil];
    css = friCss(s, `%root% .fri-quote{max-width:860px;margin:0 auto;text-align:center;display:flex;flex-direction:column;align-items:center;gap:var(--space-s)}
%root% .fri-stars{display:flex;gap:.4rem;color:#f5b301;font-size:var(--text-m)}
%root% .fri-q{margin:0;font-size:var(--text-xl);line-height:1.3;font-weight:600;color:${t2.hd}}
%root% .fri-who{display:flex;flex-direction:column;gap:.2rem}
%root% .fri-name{font-weight:700;color:${t2.hd}}%root% .fri-role{font-size:var(--text-s);color:${t2.fg}}`);
  } else if (t === 'gallery') {
    const head = (s.eyebrow || s.overskrift || s.tekst) ? [NODE('block', { _cssClasses: 'fri-stack fri-center' }, fHead(s))] : [];
    const big = s.antal === 5; const cols = big ? 4 : (s.antal === 4 || s.antal === 8) ? 4 : 3;
    body = [...head, NODE('block', { _cssClasses: 'fri-gal' + (big ? ' fri-gal-big' : '') }, Array.from({ length: s.antal }, (_, i) => NODE('block', { _cssClasses: 'fri-gi' }, [fImg(i)])))];
    css = friCss(s, `%root% .fri-gal{display:grid;gap:var(--space-xs);grid-template-columns:repeat(${cols},minmax(0,1fr));grid-auto-rows:clamp(15rem,17vw,26rem)}
%root% .fri-gal-big .fri-gi:first-child{grid-column:span 2;grid-row:span 2}
%root% .fri-gi{overflow:hidden;border-radius:var(--radius-m)}
%root% .fri-gi figure,%root% .fri-gi img{display:block;width:100%;height:100%;margin:0;object-fit:cover}
%root% .fri-gi img{transition:transform .5s}%root% .fri-gi:hover img{transform:scale(1.06)}
@media (max-width:991px){%root% .fri-gal{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:767px){%root% .fri-gal-big .fri-gi:first-child{grid-column:span 2;grid-row:span 1}}`);
  }
  const root = NODE('section', { _cssClasses: 'fri fri-t-' + t, _cssCustom: css }, [NODE('container', { _cssClasses: 'fri-wrap' }, body)], FRI_TYPES[t].name);
  return friFlatten(root);
}
function buildFriN(s) { return natRegister(nativize(buildFri(s), s.fri, 'sek')); }
function makeFri(raw, tlf) {
  const s = normFri(raw); if (!s) return null;
  const sec = { uid: 's' + (++UID) + Math.random().toString(36).slice(2, 5), tpl: 'fri-' + s.fri, fri: s, why: (raw && raw.hvorfor) || '', part: 1, parts: 1, els: buildFriN(s) };
  if (tlf) applyPhone(sec.els, tlf); return sec;
}
function rebuildFri(sec) { sec.els = buildFriN(sec.fri); }
function resizeFri(sec, n) {
  const T = FRI_TYPES[sec.fri.fri]; if (!T.n) return { ok: false, msg: 'Antallet kan ikke ændres her.' }; const from = sec.fri.antal; const m = Math.max(T.min, Math.min(T.max, n));
  sec.fri.antal = friSnap(sec.fri.fri, m, from); const fixed = normFri(sec.fri); Object.assign(sec.fri, fixed); rebuildFri(sec); return { ok: true, changed: m !== from, from, to: m, warn: [] };
}
const friGroupInfo = sec => { const T = FRI_TYPES[sec.fri.fri]; return T.n ? { n: sec.fri.antal, label: T.label, adjustable: true } : null; };


/* ============================================================================
   AI FORSLAG: Claude designer sektionerne selv (struktur + scopet CSS).
   Motoren renser alt, hvad AI'en skriver, og bygger gyldige Bricks-elementer.
   ============================================================================ */
function splitTop(s, sep) { const out = []; let d = 0, q = '', cur = ''; for (const ch of s) { if (q) { cur += ch; if (ch === q) q = ''; continue; } if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; } if (ch === '(') d++; if (ch === ')') d = Math.max(0, d - 1); if (ch === sep && d === 0) { out.push(cur); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur); return out; }
function cssBlocks(css) { const out = []; let i = 0; while (i < css.length) { const open = css.indexOf('{', i); if (open < 0) break; let d = 1, j = open + 1; while (j < css.length && d > 0) { if (css[j] === '{') d++; else if (css[j] === '}') d--; j++; } out.push({ head: css.slice(i, open).trim(), body: css.slice(open + 1, d === 0 ? j - 1 : j) }); i = j; } return out; }
const secTitle = sec => sec.ai ? 'AI · ' + sec.ai.spec.navn : displayName(sec.tpl);



/* ---------- AI FORSLAG: layoutgreb pr. sektionstype, valgt tilfældigt af motoren, så siderne ikke ligner hinanden ---------- */
const TOKEN_MAP = { '--primary': 'var(--cta)', '--secondary': 'var(--links)', '--tertiary': 'var(--links)', '--text-title': 'var(--heading)', '--text-body': 'var(--font)', '--bg-surface': 'var(--white)', '--bg-body': 'var(--dark-5)', '--border-primary': 'var(--dark-20)', '--success': 'var(--cta)', '--error': 'var(--cta)' };
const palCss = s => String(s).replace(/var\(\s*(--[\w-]+)\s*\)/g, (m, n) => TOKEN_MAP[n] || m);
const colObj = v => ({ raw: palCss(String(v).trim()) });
const NAT_SLUGS = new Set(); const NAT_IDS = new Set();
const natSlug = base => { const s = String(base || 'sektion').toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 26) || 'sektion'; let out = s, i = 1; while (NAT_SLUGS.has(out)) out = s + '-' + (++i); NAT_SLUGS.add(out); return out; };
const bpOf = n => { n = +n; return n <= 478 ? 'mobile_portrait' : n <= 767 ? 'mobile_landscape' : n <= 991 ? 'tablet_portrait' : n <= 1199 ? 'tablet_landscape' : null; };
const splitSp = v => { const out = []; let d = 0, cur = ''; for (const ch of String(v).trim()) { if (ch === '(') d++; if (ch === ')') d = Math.max(0, d - 1); if (/\s/.test(ch) && d === 0) { if (cur) out.push(cur); cur = ''; } else cur += ch; } if (cur) out.push(cur); return out; };
const uPx = v => String(v).trim().replace(/^(-?\d*\.?\d+)px$/i, '$1');
const isCol = v => /^(var\(|#[0-9a-f]{3,8}$|rgba?\(|hsla?\(|color-mix\(|transparent$|currentcolor$|white$|black$)/i.test(String(v).trim());
const box4 = v => { const p = splitSp(v).map(uPx); if (!p.length || p.length > 4) return null; const [a, b = a, c = a, d = b] = p; return { top: a, right: b, bottom: c, left: d }; };
const natMerge = (t, patch, suf) => { for (const [k, v] of Object.entries(patch)) { const key = k + suf; if (v && typeof v === 'object' && !Array.isArray(v)) { t[key] = t[key] && typeof t[key] === 'object' ? t[key] : {}; natMerge2(t[key], v); } else t[key] = v; } };
const natMerge2 = (t, v) => { for (const [k, x] of Object.entries(v)) { if (x && typeof x === 'object' && !Array.isArray(x)) { t[k] = t[k] && typeof t[k] === 'object' ? t[k] : {}; natMerge2(t[k], x); } else if (x === '0~') { if (t[k] === undefined) t[k] = '0'; } else t[k] = x; } };
function mapTransform(v) {
  const fns = [...v.matchAll(/(\w+)\(([^)]*)\)/g)]; if (!fns.length || fns.map(m => m[0]).join(' ').replace(/\s+/g, '') !== v.replace(/\s+/g, '')) return null; const t = {};
  for (const [, f, a0] of fns) { const a = a0.trim(); if (f === 'rotate' && /^-?\d*\.?\d+deg$/.test(a)) t.rotateZ = a.replace('deg', ''); else if ((f === 'translateX' || f === 'translateY') && /^-?\d*\.?\d+(px)?$/.test(a)) t[f] = a.replace('px', ''); else if (f === 'scale' && /^-?\d*\.?\d+$/.test(a)) t.scale = a; else return null; }
  return { _transform: t };
}
function mapDecl(prop, raw, cx) {
  const v = String(raw).trim(); if (!v || /!important\s*$/i.test(v)) return null; const sides = { top: 'top', right: 'right', bottom: 'bottom', left: 'left' };
  switch (prop) {
    case 'display': return ['block', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'none', 'contents'].includes(v) ? { _display: v } : null;
    case 'flex-direction': return ['row', 'column', 'row-reverse', 'column-reverse'].includes(v) ? { _direction: v } : null;
    case 'flex-wrap': return ['wrap', 'nowrap', 'wrap-reverse'].includes(v) ? { _flexWrap: v } : null;
    case 'align-items': return ['flex-start', 'center', 'flex-end', 'stretch', 'baseline', 'start', 'end'].includes(v) ? (cx.isGrid ? { _alignItemsGrid: v } : { _alignItems: v }) : null;
    case 'justify-content': return ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly', 'start', 'end'].includes(v) ? { _justifyContent: v } : null;
    case 'align-self': return ['flex-start', 'center', 'flex-end', 'stretch', 'baseline', 'start', 'end', 'auto'].includes(v) ? { _alignSelf: v } : null;
    case 'gap': { const p = splitSp(v); return p.length === 1 ? { _columnGap: uPx(p[0]), _rowGap: uPx(p[0]) } : p.length === 2 ? { _rowGap: uPx(p[0]), _columnGap: uPx(p[1]) } : null; }
    case 'column-gap': return { _columnGap: uPx(v) }; case 'row-gap': return { _rowGap: uPx(v) };
    case 'grid-template-columns': return { _gridTemplateColumns: v }; case 'grid-template-rows': return { _gridTemplateRows: v };
    case 'grid-column': return /^\d+\s*\/\s*\d+$/.test(v) ? { _gridItemColumnSpan: v } : null; case 'grid-row': return /^\d+\s*\/\s*\d+$/.test(v) ? { _gridItemRowSpan: v } : null;
    case 'width': return { _width: uPx(v) }; case 'min-width': return { _widthMin: uPx(v) }; case 'max-width': return { _widthMax: uPx(v) };
    case 'height': return { _height: uPx(v) }; case 'min-height': return { _heightMin: uPx(v) }; case 'max-height': return { _heightMax: uPx(v) };
    case 'padding': { const b = box4(v); return b ? { _padding: b } : null; } case 'margin': { const b = box4(v); return b ? { _margin: b } : null; }
    case 'padding-top': case 'padding-right': case 'padding-bottom': case 'padding-left': return { _padding: { [sides[prop.slice(8)]]: uPx(v) } };
    case 'margin-top': case 'margin-right': case 'margin-bottom': case 'margin-left': return { _margin: { [sides[prop.slice(7)]]: uPx(v) } };
    case 'padding-inline': { const p = splitSp(v).map(uPx); return p.length === 1 ? { _padding: { left: p[0], right: p[0] } } : p.length === 2 ? { _padding: { left: p[0], right: p[1] } } : null; }
    case 'padding-block': { const p = splitSp(v).map(uPx); return p.length === 1 ? { _padding: { top: p[0], bottom: p[0] } } : p.length === 2 ? { _padding: { top: p[0], bottom: p[1] } } : null; }
    case 'margin-inline': { const p = splitSp(v).map(uPx); return p.length === 1 ? { _margin: { left: p[0], right: p[0] } } : p.length === 2 ? { _margin: { left: p[0], right: p[1] } } : null; }
    case 'margin-block': { const p = splitSp(v).map(uPx); return p.length === 1 ? { _margin: { top: p[0], bottom: p[0] } } : p.length === 2 ? { _margin: { top: p[0], bottom: p[1] } } : null; }
    case 'background': case 'background-color': return isCol(v) ? { _background: { color: colObj(v) } } : null;
    case 'color': return isCol(v) ? { _typography: { color: colObj(v) } } : null;
    case 'font-size': case 'font-weight': case 'line-height': case 'letter-spacing': case 'text-transform': case 'text-align': case 'font-style': case 'text-decoration': return { _typography: { [prop]: v } };
    case 'border-radius': { if (v.includes('/')) return null; const b = box4(v); return b ? { _border: { radius: b } } : null; }
    case 'border': case 'border-top': case 'border-right': case 'border-bottom': case 'border-left': {
      if (v === 'none' || v === '0') return null; const p = splitSp(v); const w = p.find(x => /^-?\d*\.?\d+(px)?$/.test(x)); const st = p.find(x => ['solid', 'dashed', 'dotted', 'double'].includes(x)); const c = p.find(x => isCol(x)); if (!w || !st || !c || p.length !== 3) return null;
      const width = prop === 'border' ? { top: uPx(w), right: uPx(w), bottom: uPx(w), left: uPx(w) } : { top: '0~', right: '0~', bottom: '0~', left: '0~', [prop.slice(7)]: uPx(w) }; return { _border: { width, style: st, color: colObj(c) } };
    }
    case 'opacity': return /^[\d.]+$/.test(v) ? { _opacity: v } : null;
    case 'overflow': return ['visible', 'hidden', 'auto', 'scroll'].includes(v) ? { _overflow: v } : null;
    case 'position': return ['relative', 'absolute', 'fixed', 'sticky', 'static'].includes(v) ? { _position: v } : null;
    case 'top': return { _top: uPx(v) }; case 'right': return { _right: uPx(v) }; case 'bottom': return { _bottom: uPx(v) }; case 'left': return { _left: uPx(v) };
    case 'inset': { const b = box4(v); return b ? { _top: b.top, _right: b.right, _bottom: b.bottom, _left: b.left } : null; }
    case 'z-index': return /^-?\d+$/.test(v) ? { _zIndex: v } : null;
    case 'aspect-ratio': return { _aspectRatio: v }; case 'object-fit': return { _objectFit: v }; case 'object-position': return { _objectPosition: v };
    case 'order': return /^-?\d+$/.test(v) ? { _order: v } : null;
    case 'flex-shrink': return { _flexShrink: v }; case 'flex-grow': return { _flexGrow: v }; case 'flex-basis': return { _flexBasis: uPx(v) };
    case 'flex': { const p = splitSp(v); if (v === 'none') return { _flexGrow: '0', _flexShrink: '0' }; if (p.length === 1 && /^\d+$/.test(p[0])) return { _flexGrow: p[0], _flexShrink: '1' }; if (p.length === 3) return { _flexGrow: p[0], _flexShrink: p[1], _flexBasis: uPx(p[2]) }; return null; }
    case 'transform': return mapTransform(v);
    case 'cursor': return { _cursor: v }; case 'isolation': return { _isolation: v };
    default: return null;
  }
}
const parseDecls = body => splitTop(body, ';').map(d => { const i = d.indexOf(':'); return i < 1 ? null : [d.slice(0, i).trim().toLowerCase(), d.slice(i + 1).trim()]; }).filter(x => x && x[0] && x[1] && !x[0].startsWith('--'));
const ROOT_TOK = '@root'; const LIST_TAGS = new Set(['ul', 'ol']);
function nativize(els, baseName, kind, opt) {
  const slug = natSlug(baseName); const root = els.find(e => e.parent === 0); if (!root) return { els, classes: [], stats: {} };
  const rawCss = String((root.settings || {})._cssCustom || '').replace(/\/\*[\s\S]*?\*\//g, ''); delete root.settings._cssCustom;
  const kf = {}; for (const m of rawCss.matchAll(/@(?:-webkit-)?keyframes\s+([\w-]+)/g)) kf[m[1]] = `${slug}-${m[1].replace(/^(u|fri)-/, '')}`;
  const tokensOf = e => String((e.settings || {})._cssClasses || '').split(/\s+/).filter(Boolean);
  const used = new Set(); for (const e of els) tokensOf(e).forEach(t => used.add(t));
  const gname = tok => tok === ROOT_TOK ? `sek-${slug}` : `sek-${slug}__${tok.replace(/^(u|fri)-/, '')}`;
  const reg = {};                                           // tok -> {decls:{key:{prop:[val,media]}}, custom:[], isGrid}
  const cls = tok => reg[tok] || (reg[tok] = { decls: {}, custom: [], isGrid: false, hover: {} });
  const rewriteSel = s => s.replace(/%root%/g, '.' + gname(ROOT_TOK)).replace(/\.([\w-]+)/g, (m, t) => (used.has(t) ? '.' + gname(t) : m));
  const addCustom = (tok, text) => cls(tok).custom.push(text);
  const rules = []; const keyframes = [];
  for (const b of cssBlocks(rawCss)) {
    if (/^@(?:-webkit-)?keyframes/i.test(b.head)) { keyframes.push(`@keyframes ${kf[(b.head.match(/keyframes\s+([\w-]+)/i) || [])[1]] || (b.head.match(/keyframes\s+([\w-]+)/i) || [])[1]}{${b.body}}`); continue; }
    if (/^@media/i.test(b.head)) { const cond = b.head.replace(/^@media\s*/i, '').trim(); const m = cond.match(/^\(\s*max-width\s*:\s*([\d.]+)px\s*\)$/i); for (const r of cssBlocks(b.body)) rules.push({ sel: r.head, decls: parseDecls(r.body), bp: m ? bpOf(m[1]) : null, media: cond }); continue; }
    rules.push({ sel: b.head, decls: parseDecls(b.body), bp: null, media: null });
  }
  let RI = 0;
  const fixKf = v => { for (const [o, n] of Object.entries(kf)) v = v.replace(new RegExp('(^|[\\s,])' + o.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '(?![\\w-])', 'g'), '$1' + n); return v; };
  for (const r of rules) {
    RI++;
    for (const s0 of splitTop(r.sel, ',')) {
      const s = s0.trim(); if (!s) continue; let m;
      if (/^%root%(\s+(h[1-6]|p|img|figure|ul|ol|li)\s*)?$/.test(s) && s !== '%root%') continue;               // base-nulstillinger håndteres pr. element
      let tok = null, state = null;
      if (s === '%root%') tok = ROOT_TOK; else if ((m = s.match(/^%root%\s+\.([\w-]+)$/))) tok = m[1]; else if ((m = s.match(/^%root%\s+\.([\w-]+):hover$/))) { tok = m[1]; state = 'hover'; }
      if (tok && tok !== ROOT_TOK && !used.has(tok)) continue;
      if (tok && !(r.media && !r.bp) && !(state && r.bp)) { const c = cls(tok); for (const [p, val] of r.decls) { const key = state ? 'hover' : (r.bp || 'base'); (c.decls[key] = c.decls[key] || {})[p] = [fixKf(val), r.media, RI]; if (p === 'display' && /grid/.test(val)) c.isGrid = true; } continue; }
      // sammensat selektor, pseudo-element, ugyldig media eller hover+breakpoint: egen CSS i klassen
      const first = (s.match(/\.([\w-]+)/) || [])[1]; const owner = tok || (first && used.has(first) ? first : ROOT_TOK);
      const body = r.decls.map(([p, val]) => `${p}:${fixKf(val)}`).join(';'); if (!body) continue; const rule = `${rewriteSel(s)}{${body}}`; addCustom(owner, r.media ? `@media ${r.media}{${rule}}` : rule);
    }
  }
  // klasser, ids og indstillinger
  const taken = new Set([...Object.keys(ENV.CLASSES || {}), ...NAT_IDS]); const classes = []; const idOf = {}; let custom = 0;
  const need = [...used].filter(t => reg[t]); if (reg[ROOT_TOK]) need.unshift(ROOT_TOK);
  for (const tok of need) {
    const c = reg[tok]; const settings = {};
    for (const [key, props] of Object.entries(c.decls)) for (const [p, [val, media]] of Object.entries(props)) {
      const patch = mapDecl(p, val, c); const suf = key === 'base' ? '' : ':' + key;
      if (patch) natMerge(settings, patch, suf); else { const rule = `.${gname(tok)}${key === 'hover' ? ':hover' : ''}{${p}:${val}}`; c.custom.push(media ? `@media ${media}{${rule}}` : rule); }
    }
    const merged = []; const grouped = {}; const loose = [];
    for (const x of c.custom) { const m = x.match(/^(@media [^{]+)\{(\.[\w-]+(?::hover)?)\{([^}]*)\}\}$/); if (m) { (grouped[m[1] + '|' + m[2]] = grouped[m[1] + '|' + m[2]] || { mq: m[1], sel: m[2], d: [] }).d.push(m[3]); } else { const b = x.match(/^(\.[\w-]+(?::hover)?)\{([^}]*)\}$/); if (b) { (grouped['|' + b[1]] = grouped['|' + b[1]] || { mq: '', sel: b[1], d: [] }).d.push(b[2]); } else loose.push(x); } }
    for (const g of Object.values(grouped)) { const r = `${g.sel}{${g.d.join(';')}}`; merged.push(g.mq ? `${g.mq}{${r}}` : r); }
    merged.push(...loose); if (tok === ROOT_TOK && keyframes.length) merged.push(...keyframes);
    if (merged.length) { settings._cssCustom = palCss(merged.join('\n')); custom += merged.length; }
    const id = makeId(taken); NAT_IDS.add(id); idOf[tok] = id; classes.push({ id, name: gname(tok), settings });
  }
  // elementer: hierarki, klasser, labels
  const byId = new Map(els.map(e => [e.id, e])); const fix = (e, pName) => { for (const cid of e.children || []) { const c = byId.get(cid); if (!c) continue; if (c.name === 'container' && pName !== 'section') c.name = 'block'; else if (c.name === 'div' && pName === 'container') c.name = 'block'; fix(c, c.name); } }; fix(root, root.name);
  const wide = !!(opt && opt.hooks);
  const codeAll = els.map(e => { const s = e.settings || {}; if (!wide) return e.name === 'code' ? String(s.code || '') : ''; return (e.name === 'code' ? [s.code, s.cssCode, s.javascriptCode].join('\n') : String(s._cssCustom || '')) + '\n' + (s._cssGlobalClasses || []).map(id => String(((ENV.CLASSES || {})[id] || { settings: {} }).settings && ((ENV.CLASSES || {})[id] || { settings: {} }).settings._cssCustom || '')).join('\n'); }).join('\n');       // klasser, som et script i sektionen bruger som hook, bevares
  const clsById = Object.fromEntries(classes.map(c => [c.id, c])); const tokMap = new Map(els.map(e => [e, tokensOf(e)]));
  for (const e of els) {
    const toks = tokensOf(e); const ids = toks.map(t => idOf[t]).filter(Boolean); if (e === root && idOf[ROOT_TOK]) ids.unshift(idOf[ROOT_TOK]);
    { const rest = toks.filter(t => !idOf[t] && new RegExp('\\.' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])|[\'"]' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\'"]').test(codeAll)); if (rest.length) e.settings._cssClasses = rest.join(' '); else delete e.settings._cssClasses; }       // klasser uden egen styling (fx hooks til scripts) bevares
    if (ids.length) e.settings._cssGlobalClasses = [...new Set([...(e.settings._cssGlobalClasses || []), ...ids])];
    const first = ids.length ? clsById[ids[0]] : null; const role = toks.find(t => idOf[t]) || '';
    if (e !== root && role && !e.label) e.label = role.replace(/^(u|fri)-/, '').replace(/[-_]+/g, ' ').replace(/^\w/, ch => ch.toUpperCase());
    if ((e.name === 'heading' || (e.name === 'text-basic' && (e.settings.tag || 'p') === 'p')) && first) { const mg = first.settings._margin = first.settings._margin || {}; if (mg.top === undefined) mg.top = '0'; if (mg.bottom === undefined) mg.bottom = '0'; }
    if (LIST_TAGS.has(e.settings.tag) && first) { const lc = '.' + first.name + '{list-style:none}'; if (!(first.settings._cssCustom || '').includes('list-style')) first.settings._cssCustom = ((first.settings._cssCustom || '') + '\n' + lc).trim(); const pd = first.settings._padding = first.settings._padding || {}; ['top', 'right', 'bottom', 'left'].forEach(s => { if (pd[s] === undefined) pd[s] = '0'; }); const mg = first.settings._margin = first.settings._margin || {}; ['top', 'right', 'bottom', 'left'].forEach(s => { if (mg[s] === undefined) mg[s] = '0'; }); }
  }
  // konflikter mellem flere klasser på samme element (fx basisklasse + modifikator): slutresultatet lægges på elementet
  const CTX = ['base', 'tablet_landscape', 'tablet_portrait', 'mobile_landscape', 'mobile_portrait']; let resolved = 0;
  for (const e of els) {
    const toks = (tokMap.get(e) || []).filter(t => reg[t] && Object.keys(reg[t].decls).length); if (e === root) toks.unshift(ROOT_TOK); const own = [...new Set(toks.filter(t => reg[t]))]; if (own.length < 2) continue;
    const byProp = {}; for (const t of own) for (const [key, props] of Object.entries(reg[t].decls)) { if (key === 'hover') continue; for (const [p, [val, , ri]] of Object.entries(props)) (byProp[p] = byProp[p] || []).push({ t, key, val, ri }); }
    const cx = { isGrid: own.some(t => reg[t].isGrid) };
    for (const [p, list] of Object.entries(byProp)) {
      if (new Set(list.map(x => x.t)).size < 2) continue; let prev = null;
      CTX.forEach((c, ci) => { const app = list.filter(x => x.key === 'base' || CTX.indexOf(x.key) <= ci); if (!app.length) return; const win = app.reduce((a, b) => (b.ri > a.ri ? b : a)); if (win.val === prev && c !== 'base') return; prev = win.val; const patch = mapDecl(p, win.val, cx); if (patch) { natMerge(e.settings, patch, c === 'base' ? '' : ':' + c); resolved++; } });
    }
  }
  return { els, classes, stats: { classes: classes.length, custom, resolved } };
}
const natRegister = res => { for (const c of res.classes) if (ENV.CLASSES) ENV.CLASSES[c.id] = c; return stockify(res.els); };

/* ---------- tilstand ---------- */
let UID = 0;
function splitParts(els) {
  const roots = rootsOf(els); if (roots.length < 2) return [els];
  const groups = []; for (const r of roots) { if (r.name === 'section' || !groups.length) groups.push([r]); else groups[groups.length - 1].push(r); }
  if (groups.length < 2) return [els];
  const m = mapOf(els); const collect = id => { const out = [m[id]]; for (const c of m[id].children || []) out.push(...collect(c)); return out; };
  return groups.map(gr => gr.flatMap(r => collect(r.id)));
}
// Nogle templates har en demo-sektion ("Slet denne sektion, det er blot til illustration") – den skal ikke med i udkastet
const DEMO_RE = /slet denne sektion|blot til illustration/i;
function dropDemo(els) {
  let out = els; const m = mapOf(els);
  for (const r of rootsOf(els)) { const txt = []; const go = id => { const e = m[id]; if (!e) return; txt.push(JSON.stringify(e.settings || {})); (e.children || []).forEach(go); }; go(r.id); if (DEMO_RE.test(txt.join(' '))) out = removeSubtree(out, r.id); }
  return rootsOf(out).length ? out : els;
}
function makeSections(LIB, tpl, why, tlf) {
  const src = dropDemo(LIB[tpl].els); const parts = WHOLE_PAGE.has(categoryOf(tpl)) ? [src] : splitParts(src);
  return parts.map((els, i) => { const s = { uid: 's' + (++UID) + Math.random().toString(36).slice(2, 5), tpl, why: i === 0 ? (why || '') : '', els: clone(els), part: i + 1, parts: parts.length }; if (tlf) applyPhone(s.els, tlf); if (isSiteOnline(LIB, tpl)) { onlineClean(s.els); loremify(s.els, true); stockify(s.els, true); } else { loremify(s.els); stockify(s.els); } return s; });
}
function makeSection(LIB, tpl, why, tlf) { const s = { uid: 's' + (++UID) + Math.random().toString(36).slice(2, 5), tpl, why: why || '', els: clone(dropDemo(LIB[tpl].els)) }; if (tlf) applyPhone(s.els, tlf); if (isSiteOnline(LIB, tpl)) { onlineClean(s.els); loremify(s.els, true); stockify(s.els, true); } else { loremify(s.els); stockify(s.els); } return s; }




/* ---------- Lorem ipsum: al tekst i udkast er pladsholder, undtagen kontakt-ting, formularfelter og knaptekster ---------- */
const LOREM_POOL = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat'.split(' ');
const DANISH_RE = /[æøåÆØÅ]|\b(og|vi|vores|jeres|du|dig|din|dit|er|har|med|til|for|af|på|fra|som|den|det|de|en|et|ikke|hvad|hvor|hvordan|sådan|glade|kunder|kunde|anmeldelser|anmeldelse|erfaring|projekter|baseret|stolte|gode|scorer|trin|tilfredse|over|hurtigst|muligt|processen|foregår|ydelse|ydelser|indholdsfortegnelse|vigtigt|info|artikel|denne|alle|flere|mange|overskrift|indhold)\b/i;
const KEEP_RE = /^(trin|step|skridt)\s*\d+$|^(før|efter)$|kontakt|\bring\b|tilbud|indhent|telefon|mail|@|\d[\d ]{4,}|FIRMA|CVR|åbningstid|mandag|fredag|weekend|^send\b|^navn|besked|adresse|postnummer|\bby\b|filer|spam|facebook|linkedin|instagram|google|trustpilot|cookies|privatliv|læs mere|se case|se alle|se flere|klik her|vender tilbage|^\+|^kr\.?$|[{}]|^menu$|forside|underside|^faq$/i;
function loremText(t) {
  let i = 0, prevEnd = true;
  return t.split(/(\s+)/).map(tok => { if (!/[A-Za-zÆØÅæøå]/.test(tok)) return tok; const m = tok.match(/^([^A-Za-zÆØÅæøå]*)([A-Za-zÆØÅæøå][\wÆØÅæøå'’-]*)(.*)$/); if (!m) return tok; let w = LOREM_POOL[i++ % LOREM_POOL.length]; if (prevEnd || /^[A-ZÆØÅ]/.test(m[2])) w = w.charAt(0).toUpperCase() + w.slice(1); prevEnd = /[.!?]$/.test(m[3]); return m[1] + w + m[3]; }).join('');
}
let LOREM_ALL = false;
const loremNode = t => { const plain = t.replace(/&nbsp;/g, ' ').trim(); if (!plain || !/[A-Za-zÆØÅæøå]/.test(plain) || KEEP_RE.test(plain) || (!LOREM_ALL && !DANISH_RE.test(plain))) return t; return loremText(t); };
const loremHtml = h => (typeof h === 'string' ? h.replace(/(^|>)([^<]+)(?=<|$)/g, (m, a, t) => a + loremNode(t)) : h);
function loremify(els, all) {
  LOREM_ALL = !!all;
  for (const e of els) {
    const s = e.settings; if (!s || typeof s !== 'object') continue;
    if (typeof s.text === 'string' && ['heading', 'text-basic', 'text', 'button', 'text-link'].includes(e.name)) s.text = loremHtml(s.text);
    if (Array.isArray(s.items)) s.items = s.items.map(it => (it && typeof it.title === 'string' ? Object.assign({}, it, { title: loremHtml(it.title) }) : it));
    if (Array.isArray(s.accordions)) s.accordions = s.accordions.map(it => (it && typeof it === 'object' ? Object.assign({}, it, typeof it.title === 'string' ? { title: loremHtml(it.title) } : {}, typeof it.content === 'string' ? { content: loremHtml(it.content) } : {}) : it));
    if (typeof s.content === 'string' && e.name === 'icon-box') s.content = loremHtml(s.content);
  }
  LOREM_ALL = false; return els;
}


/* ---------- video: alle videoer i templates bruger Best Stocks video, indtil man selv skifter den ---------- */
const BS_VIDEO = 'https://beststock.kinsta.cloud/wp-content/uploads/2025/06/Beststock-video.mp4';
function videoify(els) {
  const fix = o => { if (!o || typeof o !== 'object') return; for (const k of Object.keys(o)) { const v = o[k];
      if (typeof v === 'string') { if (k === 'videoUrl' || (/\.mp4(\?|$)/i.test(v) && !/youtu|vimeo/i.test(v))) o[k] = BS_VIDEO; else if (k === 'url' && o.type === 'lightboxVideo') o[k] = BS_VIDEO; }
      else if (v && typeof v === 'object') fix(v); } };
  for (const e of els) if (e.settings && typeof e.settings === 'object') fix(e.settings);
  return els;
}


/* ---------- rigtige sektioner fra online sider: neutraliser kundens billeder, links og kontaktdata ---------- */
const PHONE_RE = /(?:\+?45[\s-]?)?(?:\d{2}[\s.-]?){3}\d{2}(?!\d)/g, MAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
function onlineClean(els) {
  const fix = o => { if (!o || typeof o !== 'object') return; for (const k of Object.keys(o)) { const v = o[k];
      if (typeof v === 'string') {
        if (k === 'url' && /^https?:/i.test(v) && !/beststock\.kinsta\.cloud|youtu|vimeo/i.test(v) && !/\.(jpe?g|png|webp|svg|mp4)(\?|$)/i.test(v)) o[k] = '#';
        else if (/^tel:/i.test(v)) o[k] = 'tel:+4588888888'; else if (/^mailto:/i.test(v)) o[k] = 'mailto:FIRMA@MAIL.DK';
        else if (/^(text|title|label|description|ariaLabel|altText|placeholder)$/.test(k) && v.length < 600) o[k] = v.replace(MAIL_RE, 'FIRMA@MAIL.DK').replace(PHONE_RE, '88 88 88 88');
      } else fix(v); } };
  for (const e of els) if (e.settings && typeof e.settings === 'object' && !Array.isArray(e.settings)) fix(e.settings);
  return els;
}
const isSiteOnline = (LIB, tpl) => !!(LIB && LIB[tpl] && LIB[tpl].group === 'Live sektioner' && LIB[tpl].site);

/* ---------- Best Stock-billeder: templates bruger altid disse fotos (ikke pladsholdere eller billeder fra andre sites) ---------- */
let STOCK = [], STOCK_I = 0; const STOCK_BASE = 'https://beststock.kinsta.cloud/wp-content/uploads/2025/05/';
function setStock(list) { STOCK = list || []; STOCK_I = Math.floor(Math.random() * Math.max(1, STOCK.length)); }
const stockUrl = it => STOCK_BASE + it.n + '.jpg';
const stockObj = it => ({ url: stockUrl(it), full: stockUrl(it), filename: it.n + '.jpg', size: 'full' });
const nextStock = () => (STOCK.length ? STOCK[STOCK_I++ % STOCK.length] : null);
let STOCK_ALL = false;
const isLibPhoto = o => !!o && typeof o === 'object' && !o.external && ((STOCK_ALL && (o.url || o.full) && !/\.svg(\?|$)|logo|icon|avatar|person-placeholder|placeholder-logo|stars|favicon/i.test(String(o.filename || fileOf(o.url || o.full || '')))) || o.isPlaceholder === true || /^(0U2A\d+(-\d+x\d+)?|img-placeholder[\w-]*|placeholder-image[\w-]*)\.(jpe?g|png|webp)$/i.test(String(o.filename || fileOf(o.url || o.full || ''))));
function stockify(els, all) {
  videoify(els); if (!STOCK.length) return els; STOCK_ALL = !!all; try {
  for (const e of els) {
    const s = e.settings; if (!s) continue;
    if (e.name === 'image' && isLibPhoto(s.image)) s.image = stockObj(nextStock());
    let pick = null; for (const k of Object.keys(s)) if (k === '_background' || k.startsWith('_background:')) { const bg = s[k]; if (bg && typeof bg === 'object' && isLibPhoto(bg.image)) { pick = pick || nextStock(); bg.image = stockObj(pick); } }
    if (e.name === 'image-gallery' && s.items && Array.isArray(s.items.images)) s.items.images = s.items.images.map(im => isLibPhoto(im) ? stockObj(nextStock()) : im);
  }
  } finally { STOCK_ALL = false; }
  return els;
}
const stockPrev = o => { if (!o || typeof o !== 'object') return PH_URL; const nm = String(o.filename || fileOf(o.url || o.full || '')).replace(/\.\w+$/, ''); const it = STOCK.find(x => x.n === nm); return it ? it.d : PH_URL; };


/* ---------- picker: nyeste templates og grupper ---------- */
const dateKey = (LIB, k) => (SHEETDATE[k] && SHEETDATE[k].d) || (LIB[k] && LIB[k].added) || '';
function sortKeys(LIB, keys, mode, useFn) {
  const ord = {}; Object.keys(LIB).forEach((k, i) => ord[k] = i); const idx = k => (SHEETDATE[k] ? SHEETDATE[k].i : 1e6 + ord[k]);
  const byNew = (a, b) => dateKey(LIB, b).localeCompare(dateKey(LIB, a)) || idx(a) - idx(b);
  const by = { nyeste: byNew, aeldste: (a, b) => byNew(b, a), navn: (a, b) => displayName(a).localeCompare(displayName(b), 'da', { numeric: true }), brugt: (a, b) => ((useFn && useFn(b)) || 0) - ((useFn && useFn(a)) || 0) || byNew(a, b) };
  return keys.slice().sort(by[mode] || by.nyeste);
}
function newestKeys(LIB, n) { const keys = allowedKeys(LIB).filter(k => !(LIB[k] && (LIB[k].helper || LIB[k].group)) && (SHEETDATE[k] || (LIB[k] && LIB[k].added))); const idx = k => (SHEETDATE[k] ? SHEETDATE[k].i : -1); return keys.sort((a, b) => dateKey(LIB, b).localeCompare(dateKey(LIB, a)) || idx(a) - idx(b)).slice(0, n || 10); }
const groupKeys = (LIB, g) => allowedKeys(LIB).filter(k => LIB[k] && LIB[k].group === g);
/* ---------- præcis én H1 pr. side: i heroen. Øvrige H1 bliver H2 ---------- */
function fixH1(secs, mode) {
  mode = mode || 'page'; if (mode === 'off') return { sections: secs, fixed: 0, promoted: 0 };
  const isHero = s => categoryOf(s.tpl) === 'Header'; const heroIdx = mode === 'page' ? secs.findIndex(isHero) : -1;
  if (mode === 'page' && heroIdx < 0) return { sections: secs, fixed: 0, promoted: 0 };
  let fixed = 0, promoted = 0;
  const out = secs.map((s, i) => {
    const keep = mode === 'page' ? i === heroIdx : isHero(s); const h1s = []; let first = null;
    walk(s.els, e => { if (e.name === 'heading' && e.settings && !Array.isArray(e.settings)) { if (!first) first = e; if (e.settings.tag === 'h1') h1s.push(e); } });
    const down = keep ? h1s.slice(1) : h1s; const up = keep && mode === 'page' && !h1s.length ? first : null;
    if (!down.length && !up) return s;
    const ns = Object.assign({}, s, { els: clone(s.els) }); const m = mapOf(ns.els);
    for (const e of down) { m[e.id].settings.tag = 'h2'; fixed++; }
    if (up) { m[up.id].settings.tag = 'h1'; promoted++; }
    return ns;
  });
  return { sections: out, fixed, promoted };
}


/* ---------- planlægning uden Claude: gæt branche, kopiér opbygning fra en rigtig side, brug templates og online-sektioner ---------- */
const BRANCH_KW = [
  ['Tømrer / Snedker', /tømrer|snedker|træ|tag|byg\b|carport|terrasse|vindue|dør/], ['Murer / Entreprise', /murer|entrepr|beton|facade|mursten|totalenterpr|byggefirma/],
  ['VVS / Kloak / Blik', /vvs|kloak|blik|rør|varme|vand|installatør|sanitet/], ['El / Teknik', /\bel\b|el-|elektr|teknik|solcelle|batteri|ladestander|data/],
  ['Maler', /maler|male|farve|spartel|facademaling/], ['Auto', /auto|bil|dæk|værksted|motor|lakering|autoværksted/],
  ['Anlæg / Have / Skov', /anlæg|have|skov|træfæld|landskab|brolægn|græs|hegn/], ['Klinik / Sundhed', /klinik|læge|tand|sundhed|fysio|psykiatri|kiropraktor|zone|behandl/],
  ['Service / Rengøring / Ejendom', /rengør|service|ejendom|facility|vinduespoler|rens|vagt/], ['Køreskole', /køre|køreskole|kørekort|trafik/],
  ['Skønhed / Fitness', /frisør|skønhed|fitness|salon|kosmetik|massage|spa|neg/], ['Gulv / Beton', /gulv|parket|epoxy|slibning|beton/],
  ['Specialhåndværk / Overflade', /overflade|lak|pulver|sandblæs|special|metal|smed/], ['B2B / Industri / Produkter', /industri|produkt|maskin|b2b|fabrik|grossist|automation/],
  ['Detail / Mad / Event / Rejse', /restaurant|café|cafe|mad|event|rejse|butik|bager|kro/], ['Udlejning / Logistik', /udlej|logistik|transport|kran|lift|container|fragt/],
  ['Rådgivning / Virksomhed', /rådgiv|advokat|revisor|konsulent|bureau|regnskab|ejendomsmægler/], ['Terapi / Coaching', /terapi|coach|psykolog|mindful|samtale/]
];
// søgeord ud fra selve branchenavnet, til brancher der ikke står i BRANCH_KW (ClickUps navne)
const kwFor = b => { const w = String(b).toLowerCase().split(/[^a-zæøå]+/).filter(x => x.length >= 3 && x !== 'andet' && x !== 'og'); const st = w.flatMap(x => x.length <= 4 ? ['\\b' + x + '\\b'] : x.length >= 8 ? [x.slice(0, x.length - 3), x.slice(0, 4)] : [x.slice(0, Math.max(4, x.length - 2))]); return st.length ? new RegExp(st.join('|')) : null; };
function guessBranche(name, msg, SITES) {
  const nm = String(name || '').toLowerCase(), mg = String(msg || '').toLowerCase(); const score = {};
  const have = [...new Set((SITES || []).map(s => s.b).filter(Boolean))]; const known = new Set(BRANCH_KW.map(x => x[0]));
  const KW = have.length && !have.some(b => known.has(b)) ? have.map(b => [b, kwFor(b)]).filter(x => x[1]) : BRANCH_KW;
  for (const [b, re] of KW) { let s = 0; if (re.test(mg)) s += 4; if (re.test(nm)) s += 3; if (s) score[b] = s; }
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0]; if (best) return { b: best[0], via: re_test(KW, best[0], mg) ? 'konteksten' : 'navnet' };
  const words = nm.split(/[^a-zæøå0-9]+/).filter(w => w.length >= 3); const pool = (SITES || []).filter(s => s.b && !/uklar/i.test(s.b));
  const hit = pool.filter(s => words.some(w => String(s.n).toLowerCase().includes(w))); if (hit.length) return { b: hit[Math.floor(Math.random() * hit.length)].b, via: 'navnet (ligner et kendt site)' };
  const all = pool.map(s => s.b); return all.length ? { b: all[Math.floor(Math.random() * all.length)], via: 'tilfældigt' } : { b: '', via: 'tilfældigt' };
}
const re_test = (kw, b, text) => { const x = kw.find(k => k[0] === b); return !!(x && x[1].test(text)); };
/* ---------- inspiration: hvilke templates ligner sektionerne på en HOS-side? ----------
   Hver sektion i sidens <main> sammenlignes med alle templates: først på templatens egne klasser (overlever ofte på siden, evt. med kundens præfiks),
   ellers på opbygningen (hvor mange overskrifter, billeder, kort, formular, accordion osv.). Resultatet behøver ikke være 1:1 – det er det nærmeste bud. */
const FP_STRONG = new Set(['form', 'accordion', 'accordion-nested', 'slider', 'slider-nested', 'carousel', 'counter', 'rating', 'map', 'video', 'tabs', 'tabs-nested', 'pricing-tables']);
const FP_SKIP_CATS = new Set(['Menu', 'Footer', 'Underside', 'Marketing', 'CTA sektion', 'Knapper', 'Kontakt side', 'Kontaktformular']);
function fpOf(root) {
  const v = {}; let rep = 0;
  for (const el of [root, ...root.querySelectorAll('*')]) {
    const m = String(el.getAttribute('class') || '').match(/\bbrxe-([a-z-]+)/); if (m && el !== root) v[m[1]] = (v[m[1]] || 0) + 1;
    if (el.children.length > 1) { const cnt = {}; for (const k of el.children) { const sg = k.tagName + (String(k.getAttribute('class') || '').match(/\bbrxe-[a-z-]+/) || [''])[0]; cnt[sg] = (cnt[sg] || 0) + 1; } rep = Math.max(rep, ...Object.values(cnt)); }
  }
  return { v, rep, cls: new Set([root, ...root.querySelectorAll('[class]')].flatMap(el => String(el.getAttribute('class') || '').split(/\s+/)).filter(c => c && !/^(brxe-|brx-|bricks-|fa-|ti-|ion-)/.test(c))) };
}
function fpDist(a, b) {
  let d = 0; for (const t of new Set([...Object.keys(a.v), ...Object.keys(b.v)])) d += (FP_STRONG.has(t) ? 3 : 1) * Math.abs(Math.log1p(a.v[t] || 0) - Math.log1p(b.v[t] || 0));
  return d + 0.8 * Math.abs(Math.log1p(a.rep) - Math.log1p(b.rep));
}
let TPL_FP = null;
function templatePrints(LIB, CLASSES) {
  if (TPL_FP && TPL_FP.lib === LIB) return TPL_FP;
  const keys = Object.keys(LIB).filter(k => !FP_SKIP_CATS.has(categoryOf(k)) && !isExcluded(k) && !(LIB[k] && LIB[k].group)); const prints = {}; const owners = {};
  for (const k of keys) {
    let html = ''; try { html = renderBricks([makeSection(LIB, k)], CLASSES).html; } catch (_) { continue; }
    const doc = new DOMParser().parseFromString('<main>' + html + '</main>', 'text/html'); const secs = [...doc.querySelectorAll('main > section')]; if (!secs.length) continue;
    prints[k] = secs.map(fpOf); for (const f of prints[k]) for (const c of f.cls) (owners[c] = owners[c] || new Set()).add(k);
  }
  const own = {}; for (const [c, ks] of Object.entries(owners)) if (ks.size === 1 && c.length >= 6) own[c] = [...ks][0];   // klasser, der kun findes i én template
  return TPL_FP = { lib: LIB, prints, own };
}
function matchSection(fp, T, only) {
  const hits = {};
  for (const c of fp.cls) { let k = T.own[c]; if (!k) { const i = c.indexOf('-'); for (let j = i; j > 0 && !k; j = c.indexOf('-', j + 1)) k = T.own[c.slice(j + 1)]; } if (k) hits[k] = (hits[k] || 0) + 1; }   // også med kundens præfiks foran
  const best = Object.entries(hits).sort((a, b) => b[1] - a[1])[0]; if (best && best[1] >= 2) return { k: best[0], how: 'klasser' };
  let bk = null, bd = 1e9; for (const [k, fs] of Object.entries(T.prints)) { if (!only(categoryOf(k))) continue; const d = fpDist(fp, fs[0]); if (d < bd) { bd = d; bk = k; } }
  return bk && bd <= FP_MAX ? { k: bk, how: 'opbygning', d: Math.round(bd * 10) / 10 } : null;   // for langt fra alle templates: hellere intet bud end et dårligt
}
const FP_MAX = 5;
// html: sidens HTML (eller et skelet af den). Svar: [{ k: template, c: kategori, how }] i sidens rækkefølge
function analyzeSite(html, LIB, CLASSES) {
  const T = templatePrints(LIB, CLASSES); const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
  const main = doc.querySelector('main') || doc.body; if (!main) return [];
  const secs = [...main.querySelectorAll('section.brxe-section')].filter(s => !s.parentElement.closest('section.brxe-section'));
  return secs.map((sec, i) => { const fp = fpOf(sec); if (!Object.keys(fp.v).length) return null;
    const m = matchSection(fp, T, c => i === 0 ? c === 'Header' : c !== 'Header');   // kun den første sektion er en hero
    return m && Object.assign(m, { c: categoryOf(m.k) }); }).filter(Boolean);
}
// hero med kontaktformular: formularen ligger direkte i templaten eller i en indlejret Bricks-template (kendes fra templatesitet)
const hasForm = (LIB, k) => !!(LIB[k] && (LIB[k].els || []).some(e => e.name === 'form')) || Object.keys(BX.html || {}).some(x => x.startsWith('form:' + k + ':'));
// tekstafsnit: Content med H2 og et tekstfelt med brødtekst (min. 40 ord) · afsluttende CTA-afsnit: CTA/kontakt med H2 og kort tekst (8–60 ord)
const CTA_TEXT = 'CTA-afsnit';
const textStats = k => { let h2 = 0, words = 0, longest = 0; for (const e of (BX_LIB[k] || {}).els || []) { const st = e.settings || {}; if (e.name === 'heading' && (st.tag || 'h3') === 'h2') h2++; if (/^(text|text-basic|rich-text)$/.test(e.name)) { const w = String(st.text || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length; words += w; longest = Math.max(longest, w); } } return { h2, words, longest }; };
const isBodyH2 = k => { if (categoryOf(k) !== 'Content') return false; const t = textStats(k); return t.h2 >= 1 && t.longest >= 40; };   // ét rigtigt tekstfelt, ikke mange små
const isCtaText = k => { if (isExcluded(k) || !['CTA sektion', 'Kontakt sektion'].includes(categoryOf(k))) return false; const t = textStats(k); return t.h2 >= 1 && t.words >= 8 && t.words <= 60; };
const WANT_ORDER = ['Ydelser', 'Anmeldelser', 'Cases', 'Priser', 'Galleri', 'Medarbejdere', 'FAQ', 'CTA sektion', 'Kontakt sektion'];
function localPlan(b, LIB, n, existing, SITES) {
  const keys = allowedKeys(LIB, true), keysAll = allowedKeys(LIB); const want = Array.isArray(b && b.want) ? b.want.filter(c => c && c !== 'Header' && c !== 'Content' && !EXCLUDED_CATS.has(c)) : []; const used = new Set([].concat(...(existing || []))); const msg = String((b && b.msg) || '').toLowerCase(); const type = (b && b.sidetype) || 'Forside'; const has = re => re.test(msg);
  const gb = b && b.branche ? { b: b.branche, via: 'dit valg' } : guessBranche(b && b.navn, b && b.msg, SITES); const team = has(/medarbejder|team|folk/);
  const DEF = type === 'Hero' ? ['Header'] : type === 'Menu' ? ['Menu'] : type === 'Underside' ? ['Header', 'Content', 'Ydelser', 'FAQ', 'Kontakt sektion'] : ['Header', 'Ydelser', 'Content', 'Anmeldelser', 'FAQ', 'Kontakt sektion'];
  const OK = new Set(['Header', 'Ydelser', 'Content', 'Anmeldelser', 'FAQ', 'Kontakt sektion', 'Galleri', 'Cases', 'Priser']);
  const sameSites = type === 'Forside' ? (SITES || []).filter(s => s.b === gb.b && Array.isArray(s.c) && s.c.length >= 4) : [];
  const names = ['Klassisk', 'Rolig', 'Luftig', 'Kraftig', 'Enkel']; const base = (existing || []).length; const forslag = []; const usedSites = new Set();
  for (let i = 0; i < n; i++) {
    let cats = DEF.slice(), basis = '', pref = {};
    if (sameSites.length) { const fresh = sameSites.filter(s => !usedSites.has(s.n)); const s = (fresh.length ? fresh : sameSites)[Math.floor(Math.random() * (fresh.length ? fresh : sameSites).length)]; usedSites.add(s.n);
      let c = s.c.filter(x => OK.has(x)); const out = []; for (const x of c) { if (out[out.length - 1] !== x) out.push(x); } while (out.length > 8) out.splice(1 + Math.floor(Math.random() * (out.length - 2)), 1);
      if (out.length >= 4) { if (out[0] !== 'Header') out.unshift('Header'); if (out[out.length - 1] !== 'Kontakt sektion') out.push('Kontakt sektion'); cats = out; basis = s.n; }
      pref = {}; for (const k of (s.m || []).map(x => x.k).concat(s.k || [], s.s || [])) { const c2 = categoryOf(k); (pref[c2] = pref[c2] || []).push(k); } }   // templates sitet ligner (s.m: fundet nu, s.k/s.s: Mortens liste)
    if (type !== 'Hero' && type !== 'Menu') {
      const add = (cat, after) => { if (!cats.includes(cat)) { const k = cats.indexOf(after); cats.splice(k < 0 ? cats.length - 1 : k + 1, 0, cat); } };
      if (has(/pris|abonnement/)) add('Priser', 'Ydelser'); if (has(/\bcase|projekt|reference/)) add('Cases', 'Content'); if (has(/galleri|billeder|fotos/) || team) add('Galleri', 'Content');
      if (has(/uden faq|ingen faq/)) cats = cats.filter(c => c !== 'FAQ'); if (has(/uden anmeld|ingen anmeld/)) cats = cats.filter(c => c !== 'Anmeldelser');
    }
    if (type !== 'Hero' && type !== 'Menu') { cats = cats.filter(c => c !== 'Header'); cats.unshift('Header'); }          // altid præcis 1 hero, og den er først
    if (want.length && type !== 'Hero' && type !== 'Menu') {   // tjeklisten: præcis de valgte typer (i forbilledets rækkefølge, ellers standard), kontakt sidst
      const W = new Set(want); const seq = [];
      for (const c of cats) if (W.has(c) && !seq.includes(c)) seq.push(c);
      for (const c of WANT_ORDER.concat(want)) if (W.has(c) && !seq.includes(c)) seq.push(c);
      if (seq.includes('Kontakt sektion')) { seq.splice(seq.indexOf('Kontakt sektion'), 1); seq.push('Kontakt sektion'); }
      cats = ['Header', ...seq];
    }
    { let sawRev = false; cats = cats.filter(c => c !== 'Anmeldelser' || (!sawRev && (sawRev = true))); }          // kun 1 anmeldelses-sektion pr. udkast
    if (type !== 'Hero' && type !== 'Menu') {   // basisregel: tekstafsnit (H2) = (antal − 1) Content med brødtekst + 1 afsluttende CTA-afsnit. Standard 3 → 2 Content
      const nH2 = Math.max(2, Math.min(5, parseInt(b && b.h2, 10) || 3)), nC = nH2 - 1;
      let nc = 0; cats = cats.filter(c => c !== 'Content' || ++nc <= nC);
      while (cats.filter(c => c === 'Content').length < nC) { const k = cats.lastIndexOf('Content'); cats.splice(k < 0 ? Math.min(2, Math.max(1, cats.length - 1)) : Math.min(k + 2, Math.max(k + 1, cats.length - 1)), 0, 'Content'); }
      if (cats[cats.length - 1] !== 'Kontakt sektion') cats.push(CTA_TEXT);   // står kontakt sidst, er den det afsluttende afsnit
    }
    const mine = new Set(); const sek = [];
    for (const c of cats) {
      let pool = c === CTA_TEXT ? keysAll.filter(isCtaText) : (want.includes(c) ? keysAll : keys).filter(k => categoryOf(k) === c);   // en valgt type må gerne være en, der ellers ikke bruges automatisk (fx CTA)
      if (c === 'Header' && b && typeof b.heroForm === 'boolean') { const f = pool.filter(k => hasForm(LIB, k) === b.heroForm); if (f.length) pool = f; }   // med eller uden kontaktformular
      if (c === 'Kontakt sektion' && cats.indexOf(CTA_TEXT) < 0 && cats.lastIndexOf('Kontakt sektion') === cats.length - 1) { const f = pool.filter(isCtaText); if (f.length) pool = f; }   // kontakt sidst er det afsluttende tekstafsnit
      let sub = '';
      if (c === 'Content' || c === CTA_TEXT) {   // tekstafsnit må aldrig mangle: bedste ledige template i prioriteret rækkefølge
        const hasH2 = k => { const t = textStats(k); return t.h2 >= 1 && t.words >= 8; };
        const tiers = c === 'Content'
          ? [keysAll.filter(isBodyH2), keysAll.filter(k => categoryOf(k) === 'Content'), keysAll.filter(hasH2)]
          : [keysAll.filter(isCtaText), keysAll.filter(k => ['CTA sektion', 'Kontakt sektion'].includes(categoryOf(k)) && hasH2(k)), keysAll.filter(isBodyH2), keysAll.filter(hasH2)];
        const ti = tiers.findIndex(t => t.some(k => !mine.has(k))); pool = ti >= 0 ? tiers[ti] : pool; if (ti > 0) sub = c === 'Content' ? 'Erstatning: ingen ledig Content med H2 og brødtekst' : 'Erstatning: intet ledigt kort CTA-afsnit med H2';
      }
      if (!pool.length) continue; let fresh = pool.filter(k => !used.has(k) && !mine.has(k)); if (!fresh.length) fresh = pool.filter(k => !mine.has(k)); if (!fresh.length) continue;   // aldrig samme template to gange i ét udkast
      const wts = fresh.map(k => { const t = LIB[k] || {}; return t.group === 'Live sektioner' && t.site ? (t.branche && t.branche === gb.b ? 4 : 1.8) : 1; }); const tot = wts.reduce((a, x) => a + x, 0); let r = Math.random() * tot, pick = fresh[0];
      for (let q = 0; q < fresh.length; q++) { r -= wts[q]; if (r <= 0) { pick = fresh[q]; break; } }
      const like = (pref[c] || []).find(k => fresh.includes(k)); if (like) { pick = like; pref[c] = pref[c].filter(k => k !== like); }
      mine.add(pick); sek.push({ tpl: pick, hvorfor: sub ? sub : like ? 'Ligner sektionen på ' + basis : LIB[pick] && LIB[pick].site ? 'Rigtig sektion fra ' + LIB[pick].site : 'Standardopbygning' });
    }
    mine.forEach(k => used.add(k));
    forslag.push({ navn: names[(base + i) % names.length], note: 'Branche: ' + (gb.b || 'ukendt') + ' (' + gb.via + ')' + (basis ? ' · opbygning og templates som ' + basis : ''), sektioner: sek, gaet: gb });
  }
  return { forslag, branche: gb };
}
/* ---------- gentagne blokke ---------- */
function getGroups(els) {
  const m = mapOf(els); const sig = id => { const e = m[id]; return e ? e.name + '(' + (e.children || []).map(sig).join(',') + ')' : ''; };
  const hasText = id => { const e = m[id]; if (!e) return false; if (TEXT_KINDS.has(e.name) && typeof (e.settings || {}).text === 'string') return true; return (e.children || []).some(hasText); };
  const groups = [];
  const go = id => {
    const e = m[id]; if (!e) return; const kids = e.children || [];
    if (kids.length >= 2) {
      const sg = kids.map(sig); const top = {}; sg.forEach(x => top[x] = (top[x] || 0) + 1);
      const best = Object.keys(top).sort((a, b) => top[b] - top[a])[0];
      if (top[best] >= 2 && kids.some(k => sig(k) === best && hasText(k))) {
        const items = kids.filter(k => sig(k) === best);
        groups.push({ id: e.id, items }); const rest = kids.filter(k => sig(k) !== best); rest.forEach(go); go(items[0]); return;
      }
    }
    kids.forEach(go);
  };
  rootsOf(els).forEach(r => go(r.id));
  return groups;
}


/* ---------- enheder låst til grid-rækker (fx process-trin: ikon-kolonne + kort) ---------- */
const ROW_RE = /grid-row\s*:\s*(\d+)\b/;
function rowUnits(els) {
  const m = mapOf(els);
  for (const par of els) {
    const kids = (par.children || []).map(id => m[id]).filter(Boolean); const byRow = {};
    for (const k of kids) { const css = (k.settings || {})._cssCustom; const mm = typeof css === 'string' && css.match(ROW_RE); if (mm) (byRow[mm[1]] = byRow[mm[1]] || []).push(k.id); }
    const rows = Object.keys(byRow).map(Number).sort((a, b) => a - b);
    if (rows.length >= 2 && rows.every((r, i) => r === i + 1) && new Set(rows.map(r => byRow[r].length)).size === 1) return { parentId: par.id, units: rows.map(r => byRow[r]) };
  }
  return null;
}
const renumber = (s, from, to) => String(s).replace(/(\b(?:Trin|Step|Skridt)\s*)(\d+)/gi, (mm, a, d) => (+d === from ? a + to : mm));
function resizeUnits(sec, n) {
  const ru = rowUnits(sec.els); const cur = ru.units.length; if (n === cur) return { ok: true, changed: false, from: cur, to: cur, warn: [] };
  const m = mapOf(sec.els); const parent = m[ru.parentId]; const used = new Set(sec.els.map(e => e.id));
  if (n < cur) { for (const u of ru.units.slice(n)) for (const id of u) sec.els = removeSubtree(sec.els, id); return { ok: true, changed: true, from: cur, to: n, warn: [] }; }
  let last = ru.units[cur - 1][ru.units[cur - 1].length - 1];
  for (let row = cur + 1; row <= n; row++) {
    const prev = row - 1; const tmpl = ru.units[cur - 1];                                  // kopiér sidste enhed
    for (const id of tmpl) {
      const sub = cloneSubtree(sec.els, id, used);
      for (const e of sub.els) {
        if (typeof (e.settings || {})._cssCustom === 'string') e.settings._cssCustom = e.settings._cssCustom.replace(/grid-row\s*:\s*\d+/, 'grid-row: ' + row);
        if (typeof (e.settings || {}).text === 'string') e.settings.text = renumber(e.settings.text, cur, row);
        if (e.label) e.label = renumber(e.label, cur, row);
      }
      const ch = parent.children; ch.splice(ch.indexOf(last) + 1, 0, sub.rootId); sec.els.push(...sub.els); last = sub.rootId;
    }
  }
  return { ok: true, changed: true, from: cur, to: n, warn: [] };
}

/* ---------- antal gentagne elementer (fx 4 → 6 ydelser) med responsivt layout ---------- */
function primaryGroup(els) {
  const gs = getGroups(els); if (!gs.length) return null; const m = mapOf(els);
  const depth = id => { let d = 0, e = m[id]; while (e && e.parent && m[e.parent]) { d++; e = m[e.parent]; } return d; };
  const hasHeading = id => { const e = m[id]; return !!e && (e.name === 'heading' || (e.children || []).some(hasHeading)); };
  const cards = gs.filter(g => g.items.some(hasHeading));                       // kort med overskrift er det brugeren tænker på
  if (cards.length) return cards.reduce((a, g) => (depth(g.id) < depth(a.id) || (depth(g.id) === depth(a.id) && g.items.length > a.items.length)) ? g : a, cards[0]);
  return gs.reduce((a, g) => g.items.length > a.items.length ? g : a, gs[0]);
}
function cloneSubtree(els, rootId, used) {
  const m = mapOf(els); const idMap = {};
  const collect = id => { idMap[id] = makeId(used); for (const c of (m[id] && m[id].children) || []) collect(c); };
  collect(rootId); const old = Object.keys(idMap); const out = [];
  for (const oid of old) {
    const e = clone(m[oid]); e._src = m[oid]._src || oid; e.id = idMap[oid]; e.parent = oid === rootId ? m[oid].parent : idMap[m[oid].parent]; e.children = (e.children || []).map(c => idMap[c]);
    let str = JSON.stringify(e.settings || {}); if (str.indexOf('brxe-') !== -1) { for (const o of old) str = str.replace(new RegExp('brxe-' + o + '(?![a-z0-9])', 'g'), 'brxe-' + idMap[o]); }
    e.settings = JSON.parse(str); out.push(e);
  }
  return { els: out, rootId: idMap[rootId] };
}
const effSettings = (e, CLASSES) => { const out = {}; for (const c of (e.settings || {})._cssGlobalClasses || []) { const st = CLASSES[c] && CLASSES[c].settings; if (st && !Array.isArray(st)) Object.assign(out, st); } return Object.assign(out, e.settings || {}); };
function splitTracks(v) { const out = []; let d = 0, cur = ''; for (const ch of String(v).trim()) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ' ' && d === 0) { if (cur) out.push(cur); cur = ''; } else cur += ch; } if (cur) out.push(cur); return out; }
function colCount(v) { const m = String(v).trim().match(/^repeat\(\s*(\d+)\s*,\s*(.+)\)$/); if (m) return { n: +m[1], track: m[2].trim(), uniform: true }; const t = splitTracks(v); return { n: t.length, track: t[0], uniform: t.length > 0 && t.every(x => x === t[0]) }; }
function bestCols(n, cMax) { let best = 1, bs = 1e9; for (let c = 1; c <= Math.max(1, cMax); c++) { const rows = Math.ceil(n / c), empty = rows * c - n; const sc = empty * 1.5 + rows * 0.6 + (c === 1 && n > 1 ? 5 : 0); if (sc < bs - 1e-9) { bs = sc; best = c; } } return best; }
function fitGrid(parent, items, oldN, newN, CLASSES) {
  const warn = []; const eff = effSettings(parent, CLASSES); const s = parent.settings || (parent.settings = {});
  const colKeys = Object.keys(eff).filter(k => /^_gridTemplateColumns(:|$)/.test(k));
  const isGrid = eff._display === 'grid' || colKeys.length;
  if (!isGrid) {
    if (['slider-nested', 'accordion-nested', 'tabs-nested', 'accordion'].includes(parent.name)) return warn;
    const dir = eff._direction || (parent.name === 'div' ? 'row' : 'column');
    if (/^row/.test(dir)) { if (!eff._flexWrap) s._flexWrap = 'wrap'; warn.push('Layoutet er flex i en række: tjek bredden på de nye elementer i Bricks.'); }
    return warn;
  }
  const itemSet = new Set(items); const special = (parent.children || []).filter(c => !itemSet.has(c));
  for (const k of Object.keys(eff).filter(k => /^_gridTemplateRows(:|$)/.test(k))) s[k] = 'none';          // lad rækker vokse af sig selv
  if (special.length) { warn.push('Mosaik-layout (store felter): tjek at det ser rigtigt ud i alle størrelser.'); return warn; }
  for (const k of colKeys) {
    const cc = colCount(eff[k]); if (!cc.uniform) { warn.push('Ujævne kolonner (' + k.replace('_gridTemplateColumns', 'kolonner') + '): tjek layoutet.'); continue; }
    const base = k === '_gridTemplateColumns';
    if (!base && oldN > cc.n) continue;                      // flere rækker i forvejen ved denne bredde: lad den være
    const nc = bestCols(newN, base ? Math.max(4, cc.n) : cc.n); if (nc !== cc.n) s[k] = `repeat(${nc}, ${cc.track})`;
  }
  return warn;
}
function resizeGroup(sec, n, CLASSES) {
  if (sec.ai) return { ok: false, msg: 'Antallet kan ikke ændres i en AI-sektion. Brug "Ny version" eller Ret med AI.' };
  if (sec.fri) return resizeFri(sec, n);
  n = Math.max(1, Math.min(24, parseInt(n, 10) || 0)); if (rowUnits(sec.els)) return resizeUnits(sec, n); const g = primaryGroup(sec.els);
  if (!g) return { ok: false, msg: 'Der er ingen gentagne elementer i denne sektion.' };
  const gi = groupInfo(sec.els, sec.tpl); if (gi && !gi.adjustable) return { ok: false, msg: 'Antallet kan ikke ændres i denne sektion.' };
  { const mm = mapOf(sec.els); let pos = false; const go = id => { const e = mm[id]; if (e && typeof (e.settings || {})._cssCustom === 'string' && /grid-(row|column)\s*:|nth-(child|of-type)/i.test(e.settings._cssCustom)) pos = true; (e && e.children || []).forEach(go); }; g.items.forEach(go); if (pos && n > g.items.length) return { ok: false, msg: 'Elementerne er låst til faste placeringer og kan ikke kopieres.' }; }
  const cur = g.items.length; if (n === cur) return { ok: true, changed: false, from: cur, to: cur, warn: [] };
  if (n > cur && g.items.some(id => { const m = mapOf(sec.els); let bad = false; const go = i => { if (m[i].name === 'form') bad = true; (m[i].children || []).forEach(go); }; go(id); return bad; })) return { ok: false, msg: 'Elementerne indeholder en formular og kan ikke kopieres.' };
  const used = new Set(sec.els.map(e => e.id)); const parent = mapOf(sec.els)[g.id]; const oldKids = new Set(parent.children || []);
  if (n > cur) { let last = g.items[g.items.length - 1]; const tmpl = last;
    for (let i = cur; i < n; i++) { const sub = cloneSubtree(sec.els, tmpl, used); const ch = parent.children; ch.splice(ch.indexOf(last) + 1, 0, sub.rootId); sec.els.push(...sub.els); last = sub.rootId; } }
  else for (const id of g.items.slice(n)) sec.els = removeSubtree(sec.els, id);
  const fin = n > cur ? (mapOf(sec.els)[g.id].children || []).filter(c => g.items.includes(c) || !oldKids.has(c)) : g.items.slice(0, n);
  const warn = fitGrid(mapOf(sec.els)[g.id], fin, cur, n, CLASSES);
  return { ok: true, changed: true, from: cur, to: n, warn };
}
function groupInfoSec(sec) { return sec && sec.ai ? null : sec && sec.fri ? friGroupInfo(sec) : groupInfo(sec.els, sec.tpl); }
function groupInfo(els, tpl) {
  const ru = rowUnits(els); if (ru) return { n: ru.units.length, label: 'trin', adjustable: true, rows: true };
  const g = primaryGroup(els); if (!g) return null; const m = mapOf(els); const kinds = new Set();
  const go = id => { kinds.add(m[id].name); (m[id].children || []).forEach(go); }; go(g.items[0]);
  const cat = categoryOf(tpl || ''); let label = 'elementer';
  if (kinds.has('counter')) label = 'tællere';
  else if (kinds.has('button') && !kinds.has('heading') && !kinds.has('image') && !kinds.has('text')) label = 'knapper';
  else if (cat === 'Ydelser') label = 'ydelser'; else if (cat === 'Anmeldelser') label = 'anmeldelser'; else if (cat === 'FAQ') label = 'spørgsmål'; else if (cat === 'Priser') label = 'pakker'; else if (cat === 'Cases') label = 'cases';
  else if (kinds.has('heading') || kinds.has('image')) label = 'kort';
  return { n: g.items.length, label, adjustable: label !== 'knapper' && cat !== 'Priser' };
}


/* ---------- spejl et sites opbygning: sektion for sektion ---------- */
const SETTING_WHITELIST = new Set(['_background', '_typography', '_padding', '_margin', '_direction', '_alignItems', '_justifyContent', '_width', '_widthMax', '_widthMin', '_heightMin', '_height', '_rowGap', '_columnGap', '_border', '_flexWrap', '_gradient']);
function applyOps(state, ops, LIB, tlf, CLASSES) {
  const log = [], added = [], warns = [];
  const secs = state.sections; const at = i => (Number.isInteger(i) && i >= 1 && i <= secs.length) ? secs[i - 1] : null;
  const okFor = op => !!LIB[op.tpl] && (op.manual || categoryOf(op.tpl) !== 'CTA sektion');
  for (const op of ops || []) {
    try {
      if (op.op === 'remove') { const s = at(op.index); if (!s) throw 0; secs.splice(secs.indexOf(s), 1); log.push(`Fjernede sektion ${op.index} (${s.tpl})`); }
      else if (op.op === 'move') { const s = at(op.index); const to = Math.max(1, Math.min(secs.length, op.to | 0)); if (!s) throw 0; secs.splice(secs.indexOf(s), 1); secs.splice(to - 1, 0, s); log.push(`Flyttede ${s.tpl} til plads ${to}`); }
      else if (op.op === 'add' && op.fri) { const fs = makeFri(op.fri, tlf); if (!fs) throw 0; const pos = Math.max(1, Math.min(secs.length + 1, (op.at | 0) || secs.length + 1)); secs.splice(pos - 1, 0, fs); added.push(fs.uid); log.push(`Tilføjede ny sektion (${fs.fri.fri}) på plads ${pos}`); }
      else if (op.op === 'swap' && op.fri) { const s = at(op.index); const fs = makeFri(op.fri, tlf); if (!s || !fs) throw 0; secs.splice(secs.indexOf(s), 1, fs); added.push(fs.uid); log.push(`Skiftede ${s.tpl} til ny sektion (${fs.fri.fri})`); }
      else if (op.op === 'add') { if (!okFor(op)) throw 0; const ps = makeSections(LIB, op.tpl, op.hvorfor, tlf); const pos = Math.max(1, Math.min(secs.length + 1, (op.at | 0) || secs.length + 1)); secs.splice(pos - 1, 0, ...ps); added.push(...ps.map(x => x.uid)); log.push(`Tilføjede ${op.tpl} på plads ${pos}`); }
      else if (op.op === 'swap') { const s = at(op.index); if (!s || !okFor(op)) throw 0; const ps = makeSections(LIB, op.tpl, op.hvorfor, tlf); secs.splice(secs.indexOf(s), 1, ...ps); added.push(...ps.map(x => x.uid)); log.push(`Skiftede ${s.tpl} til ${op.tpl}`); }
      else if (op.op === 'count') { const s = at(op.index); if (!s) throw 0; const r = resizeGroup(s, op.antal, CLASSES || {}); if (!r.ok) { log.push('⚠ ' + r.msg); continue; } log.push(r.changed ? `Sektion ${op.index}: ${r.from} → ${r.to} elementer` : `Sektion ${op.index} har allerede ${r.to}`); s.warns = r.warn; warns.push(...r.warn); }
      else if (op.op === 'removeEl') { const s = at(op.index); const e = s && s.els.find(x => x.id === op.id); if (!e || e.parent === 0) throw 0; s.els = removeSubtree(s.els, op.id); log.push(`Fjernede et element i sektion ${op.index}`); }
      else if (op.op === 'setting') {
        const s = at(op.index); if (!s) throw 0; const e = op.id ? s.els.find(x => x.id === op.id) : rootsOf(s.els)[0]; const base = String(op.key || '').split(':')[0];
        if (!e || !SETTING_WHITELIST.has(base) || op.value === undefined) throw 0; (e.settings || (e.settings = {}))[op.key] = op.value; log.push(`Ændrede ${op.key} i sektion ${op.index}`);
      } else throw 0;
    } catch (_) { log.push(`⚠ Kunne ikke udføre: ${JSON.stringify(op).slice(0, 90)}`); }
  }
  return { log, added, warns };
}


/* ---------- ren kode: fjern ting der ikke gør noget ---------- */
const JUNK_KEYS = new Set(['_color', '_fontSize', '_fontWeight', '_textTransform', '_letterSpacing', '_lineHeight', '_minHeight', '_borderColor', '_borderWidth', '_gap', '_flexDirection', '_flex', '_listStyle', '_hideElementBuilder', '_hideElementFrontend', 'taxonomies']);
function cleanVal(v) {
  if (v === null || v === undefined || v === '') return undefined;
  if (Array.isArray(v)) { const a = v.map(cleanVal).filter(x => x !== undefined); return a.length ? a : undefined; }
  if (typeof v === 'object') { const o = {}; for (const k in v) { const c = cleanVal(v[k]); if (c !== undefined) o[k] = c; } return Object.keys(o).length ? o : undefined; }
  return v;
}
const stripCssComments = css => String(css).replace(/\/\*[\s\S]*?\*\//g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{2,}/g, '\n').trim();
const NATIVE_KEEP = new Set(['_gap', '_flexDirection']);       // gyldige i Bricks-skabeloner (fx accordion), men ugyldigt "affald" fra AI-sektioner
function cleanSettings(s, native) {
  const out = {}; if (!s || Array.isArray(s)) return out;
  for (const k of Object.keys(s)) {
    const base = k.split(':')[0]; if (JUNK_KEYS.has(base) && !(native && NATIVE_KEEP.has(base))) continue; if (base === 'query' && !s.hasLoop) continue;
    let v = cleanVal(s[k]); if (v === undefined) continue; if (base === '_cssCustom' && typeof v === 'string') { v = stripCssComments(v); if (!v) continue; } out[k] = v;
  }
  return out;
}


/* ---------- klasser får kundens præfiks (CSS og kode følger med, så alt virker som før) ---------- */
function classPrefix(name) {
  const s = String(name || '').toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa').replace(/&/g, ' ').replace(/\bv\/.*$/, ' ').replace(/\b(aps|a\/s|ivs|i\/s|k\/s|as)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  const ws = s.split(' ').filter(Boolean).slice(0, 3); let out = ws.join('-'); while (out.length > 30 && ws.length > 1) { ws.pop(); out = ws.join('-'); } return out.slice(0, 30).replace(/-+$/, '');
}
function mapStrings(v, fn) { if (typeof v === 'string') return fn(v); if (Array.isArray(v)) return v.map(x => mapStrings(x, fn)); if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = mapStrings(v[k], fn); return o; } return v; }
function renameClasses(content, classes, prefix) {
  if (!prefix || !classes.length) return 0;
  const used = new Set(classes.map(c => c.id)); const nameMap = {}, idMap = {};
  for (const c of classes) { nameMap[c.name] = prefix + '-' + c.name; idMap[c.id] = makeId(used); }
  const names = Object.keys(nameMap).sort((a, b) => b.length - a.length).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp('(?<![\\w-])(?:' + names.join('|') + ')(?![\\w-])', 'g'); const sub = str => str.replace(re, m => nameMap[m] || m);
  for (const e of content) {
    if (!e.settings) continue;
    if (Array.isArray(e.settings._cssGlobalClasses)) e.settings._cssGlobalClasses = e.settings._cssGlobalClasses.map(i => idMap[i] || i);
    e.settings = mapStrings(e.settings, sub);
  }
  for (const c of classes) { c.settings = mapStrings(c.settings, sub); c.name = nameMap[c.name]; c.id = idMap[c.id]; }
  return classes.length;
}

/* ---------- eksport ---------- */
const ALPH = 'abcdefghijklmnopqrstuvwxyz0123456789';
function makeId(used) { let id; do { id = ALPH[Math.floor(Math.random() * 26)]; for (let i = 0; i < 5; i++) id += ALPH[Math.floor(Math.random() * 36)]; } while (used.has(id) || id === FORM_ID); used.add(id); return id; }
function buildExport(state, CLASSES, opts) {
  const exp_clean = !(opts && opts.raw); const h1r = (opts && opts.raw) ? { sections: state.sections, fixed: 0, promoted: 0 } : fixH1(state.sections, (opts && opts.h1) || 'page'); state = Object.assign({}, state, { sections: h1r.sections });
  const used = new Set(); const content = []; const flags = []; const classIds = new Set(); let formSeen = 0; const imageUse = [];
  state.sections.forEach((sec, si) => {
    let els = clone(sec.els); const idMap = {};
    if (els.some(e => e.settings && (e.settings._cssClasses || String(e.settings._cssCustom || '').includes('%root%')))) { const nr = nativize(els, sec.tpl || 'sektion', 'sek', { hooks: !(sec.ai || sec.fri) }); for (const c of nr.classes) CLASSES[c.id] = c; els = nr.els; }       // sikkerhedsnet: aldrig rå CSS i eksporten
    for (const e of els) {
      if (e.name === 'form') { formSeen++; if (formSeen === 1) { idMap[e.id] = FORM_ID; used.add(FORM_ID); if (e.id !== FORM_ID) flags.push(`Formularen havde ID ${e.id} i biblioteket og er rettet til ${FORM_ID}.`); } else { idMap[e.id] = makeId(used); flags.push('Siden har mere end én formular – kun den første kan have ID ' + FORM_ID + '.'); } }
      else idMap[e.id] = makeId(used);
    }
    const oldIds = Object.keys(idMap);
    for (const e of els) {
      const old = e.id; e.id = idMap[old]; delete e._src;
      e.parent = (e.parent === 0 || e.parent === '0') ? 0 : (idMap[e.parent] || 0);
      e.children = (e.children || []).map(c => idMap[c]).filter(Boolean);
      e.settings = exp_clean ? cleanSettings(e.settings, !(sec.ai || sec.fri)) : (e.settings || {});
      if ('themeStyles' in e) { const ts = cleanVal(e.themeStyles); if (ts === undefined) delete e.themeStyles; else e.themeStyles = ts; }
      let str = JSON.stringify(e.settings);
      if (str.indexOf('brxe-') !== -1) { for (const o of oldIds) str = str.replace(new RegExp('brxe-' + o + '(?![a-z0-9])', 'g'), 'brxe-' + idMap[o]); e.settings = JSON.parse(str); }
      for (const c of e.settings._cssGlobalClasses || []) classIds.add(c);
      content.push(e);
    }
    for (const img of sec.usedImages || []) imageUse.push({ section: si + 1, tpl: sec.tpl, file: img.file || fileOf(img.src), src: img.src });
  });
  const allIds = new Set(content.map(e => e.id));
  for (const e of content) { const refs = (JSON.stringify(e.settings).match(/brxe-([a-z0-9]{6})/g) || []).map(x => x.slice(5)).filter(x => !allIds.has(x)); if (refs.length) flags.push(`Et ${e.name}-element${e.label ? ' ("' + e.label + '")' : ''} refererer til element-ID ${[...new Set(refs)].join(', ')}, som ikke findes i templaten. Tjek scriptet efter paste.`); }
  const globalClasses = []; const missing = [];
  for (const id of classIds) { if (CLASSES[id]) { const c = clone(CLASSES[id]); if (exp_clean) c.settings = cleanSettings(c.settings, true); globalClasses.push(c); } else missing.push(id); }
  const renamed = (opts && opts.prefix) ? renameClasses(content, globalClasses, opts.prefix) : 0;
  return { json: { content, source: 'bricksCopiedElements', sourceUrl: SOURCE_URL, version: BRICKS_VERSION, globalClasses }, flags, missingClasses: missing, formCount: formSeen, imageUse, renamed, prefix: renamed ? opts.prefix : '', h1Fixed: h1r.fixed, h1Promoted: h1r.promoted };
}
function validate(exp) {
  const res = []; const ok = (name, pass, detail) => res.push({ name, pass, detail: pass ? '' : detail });
  const c = exp.json.content; const ids = c.map(e => e.id);
  ok('Alle ID’er er præcis 6 tegn', ids.every(i => /^[a-z0-9]{6}$/.test(i)), 'Et eller flere ID’er har forkert format');
  ok('Alle ID’er er unikke', new Set(ids).size === ids.length, 'Dublerede ID’er');
  const idset = new Set(ids);
  ok('Alle børne-ID’er findes', c.every(e => (e.children || []).every(x => idset.has(x))), 'Et barn peger på et element der ikke findes');
  ok('Alle forældre findes (eller er 0)', c.every(e => e.parent === 0 || idset.has(e.parent)), 'Et element har ugyldig parent');
  ok('Ingen element er sin egen parent', c.every(e => e.parent !== e.id), 'Selv-refererende parent');
  ok('Kun gyldige element-navne', c.every(e => VALID_NAMES.has(e.name)), 'Ukendt element-navn: ' + [...new Set(c.filter(e => !VALID_NAMES.has(e.name)).map(e => e.name))].join(', '));
  const forms = c.filter(e => e.name === 'form');
  ok(`Formular har ID ${FORM_ID}${forms.length ? '' : ' (ingen formular på siden)'}`, forms.every(f => f.id === FORM_ID) && forms.length <= 1, 'Formular-ID er forkert eller der er flere');
  ok('themeStyles er aldrig tomt objekt {}', c.every(e => !('themeStyles' in e) || Array.isArray(e.themeStyles) || (e.themeStyles && Object.keys(e.themeStyles).length)), 'Tomt themeStyles-objekt');
  ok('Rod-elementer er sektioner (eller scripts/formular-container fra templaten)', c.filter(e => e.parent === 0).every(e => ['section', 'code', 'container', 'offcanvas', 'template'].includes(e.name)), 'Rod-element af uventet type');
  ok('Versionsfelt er sat (' + exp.json.version + ')', !!exp.json.version, 'Mangler version');
  ok('Alle brugte klasser er med i globalClasses', exp.missingClasses.length === 0, exp.missingClasses.length + ' klasser mangler definition');
  let reparse = true; try { JSON.parse(JSON.stringify(exp.json)); } catch (_) { reparse = false; }
  ok('JSON kan læses igen', reparse, 'Ugyldig JSON');
  return res;
}

/* ---------- preview: Bricks → HTML + CSS ---------- */
// Jeres variabler er skrevet i rem (rod = 62,5 %) og vw. I preview: rem → 10px og vw → cqw (rammens bredde).
const unitFix = css => String(css).replace(/(-?\d*\.?\d+)rem\b/g, (m, n) => (parseFloat(n) * 10) + 'px').replace(/(-?\d*\.?\d+)vw\b/g, '$1cqw');
let PV_RAW = false;   // true = rå enheder (iframe-preview med rigtig viewport): vh omregnes ikke
const vh = v => PV_RAW ? String(v) : String(v).replace(/(\d+(?:\.\d+)?)vh/g, (m, n) => Math.round(parseFloat(n) * 6.4) + 'px');
const px = v => { if (v === undefined || v === null || v === '') return null; if (typeof v === 'number') return v + 'px'; v = String(v).trim(); if (/^-?\d+(\.\d+)?$/.test(v)) return v + 'px'; return vh(v); };
// Bricks gemmer farvens værdi (light/hex) ved siden af variablen: bruges som reserve, hvis variablen ikke findes i preview
const colorOf = c => { if (!c) return null; if (typeof c === 'string') return c; const fb = c.light || c.hex || c.rgb || c.hsl; if (c.raw && fb && /^var\(--[\w-]+\)$/.test(c.raw.trim())) return c.raw.trim().slice(0, -1) + ',' + fb + ')'; return c.raw || c.rgb || c.hsl || c.hex || null; };
const boxDecl = (o, p) => { const d = []; if (o && typeof o === 'object') for (const s of ['top', 'right', 'bottom', 'left']) { const v = px(o[s]); if (v !== null) d.push(`${p}-${s}:${v}`); } return d; };
const PLAIN = { _display: 'display', _direction: 'flex-direction', _flexDirection: 'flex-direction', _alignItems: 'align-items', _justifyContent: 'justify-content', _alignSelf: 'align-self', _flexWrap: 'flex-wrap', _objectFit: 'object-fit', _objectPosition: 'object-position', _aspectRatio: 'aspect-ratio', _position: 'position', _zIndex: 'z-index', _overflow: 'overflow', _opacity: 'opacity', _isolation: 'isolation', _gridTemplateColumns: 'grid-template-columns', _gridTemplateRows: 'grid-template-rows', _gridAutoFlow: 'grid-auto-flow', _order: 'order', _flexGrow: 'flex-grow', _flexShrink: 'flex-shrink', _flexBasis: 'flex-basis' };
const PX = { _gap: 'gap', _rowGap: 'row-gap', _columnGap: 'column-gap', _gridGap: 'gap', _width: 'width', _widthMin: 'min-width', _widthMax: 'max-width', _height: 'height', _heightMin: 'min-height', _heightMax: 'max-height', _top: 'top', _right: 'right', _bottom: 'bottom', _left: 'left' };
const PH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#aab5c2"/><stop offset="1" stop-color="#7b8a9c"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><g fill="#fff" fill-opacity=".38"><circle cx="590" cy="190" r="48"/><path d="M0 600V430l190-170 170 150 120-90 320 200v80z"/></g></svg>`;
const PH_URL = 'data:image/svg+xml,' + encodeURIComponent(PH_SVG);

function declsFor(s, bp) {
  const g = k => s[bp ? k + ':' + bp : k]; const d = []; const set = (p, v) => { if (v !== undefined && v !== null && v !== '' && v !== false) d.push(p + ':' + v); };
  for (const k in PLAIN) set(PLAIN[k], g(k));
  for (const k in PX) { const v = g(k); if (typeof v === 'object' && v) continue; set(PX[k], px(v)); }
  d.push(...boxDecl(g('_padding'), 'padding'), ...boxDecl(g('_margin'), 'margin'));
  const span = v => { v = String(v).trim(); return /^\d+$/.test(v) ? 'span ' + v : v; };
  if (g('_gridItemColumnSpan')) set('grid-column', span(g('_gridItemColumnSpan')));
  if (g('_gridItemRowSpan')) set('grid-row', span(g('_gridItemRowSpan')));
  set('align-items', g('_alignItemsGrid')); set('align-content', g('_alignContentGrid')); set('justify-content', g('_justifyContentGrid'));
  const tf = g('_transform');
  if (tf && typeof tf === 'object') {
    const t = []; const u = (v, unit) => /^-?[\d.]+$/.test(String(v)) ? v + unit : v;
    if (tf.translateX !== undefined || tf.translateY !== undefined) t.push(`translate(${u(tf.translateX || 0, 'px')},${u(tf.translateY || 0, 'px')})`);
    if (tf.rotateX) t.push(`rotateX(${u(tf.rotateX, 'deg')})`); if (tf.rotateY) t.push(`rotateY(${u(tf.rotateY, 'deg')})`); if (tf.rotateZ || tf.rotate) t.push(`rotate(${u(tf.rotateZ || tf.rotate, 'deg')})`);
    if (tf.scaleX !== undefined || tf.scaleY !== undefined) t.push(`scale(${tf.scaleX !== undefined ? tf.scaleX : 1},${tf.scaleY !== undefined ? tf.scaleY : 1})`); else if (tf.scale) t.push(`scale(${tf.scale})`);
    if (tf.skewX) t.push(`skewX(${u(tf.skewX, 'deg')})`); if (tf.skewY) t.push(`skewY(${u(tf.skewY, 'deg')})`);
    if (t.length) set('transform', t.join(' '));
  }
  { const h = g('_hidden'); if (h === true || h === 'true') d.push('display:none'); }
  const ty = g('_typography');
  if (ty && typeof ty === 'object') {
    set('font-size', px(ty['font-size'])); set('font-weight', ty['font-weight']); set('line-height', ty['line-height']); set('color', colorOf(ty.color));
    set('text-align', ty['text-align']); set('text-transform', ty['text-transform']); set('letter-spacing', px(ty['letter-spacing'])); set('font-style', ty['font-style']); set('text-decoration', ty['text-decoration']);
    if (ty['font-family']) set('font-family', `"${String(ty['font-family']).replace(/"/g, '')}",system-ui,sans-serif`);
  }
  const bg = g('_background'); const gr = g('_gradient'); const layers = [];
  if (gr && typeof gr === 'object' && gr.applyTo !== 'overlay' && Array.isArray(gr.colors) && gr.colors.length) {
    const cs = gr.colors.map(x => colorOf(x.color)).filter(Boolean);
    if (cs.length) layers.push(`linear-gradient(${cs.length === 1 ? cs[0] + ',' + cs[0] : (gr.angle ? gr.angle + 'deg,' : '') + cs.join(',')})`);
  }
  if (bg && typeof bg === 'object') {
    set('background-color', colorOf(bg.color));
    if (bg.image || bg.videoUrl) { layers.push(`url("${PV_RAW ? bxImgSrc(bg.image) : stockPrev(bg.image)}")`); set('background-size', bg.size || 'cover'); set('background-position', bg.position || 'center'); set('background-repeat', 'no-repeat'); }
    if (bg.blendMode && (bg.image || bg.videoUrl)) set('background-blend-mode', bg.blendMode);
  }
  if (layers.length) d.push('background-image:' + layers.join(','));
  const bd = g('_border');
  if (bd && typeof bd === 'object') {
    if (bd.width) d.push(...boxDecl(bd.width, 'border').map(x => x.replace(/^(border-\w+):/, '$1-width:')));
    set('border-style', bd.style || (bd.width ? 'solid' : null)); set('border-color', colorOf(bd.color));
    if (bd.radius && typeof bd.radius === 'object') { const r = bd.radius; set('border-top-left-radius', px(r.top)); set('border-top-right-radius', px(r.right)); set('border-bottom-right-radius', px(r.bottom)); set('border-bottom-left-radius', px(r.left)); }
  }
  const sh = g('_boxShadow'); if (sh && sh.values) set('box-shadow', `${px(sh.values.offsetX || 0)} ${px(sh.values.offsetY || 0)} ${px(sh.values.blur || 0)} ${px(sh.values.spread || 0)} ${colorOf(sh.color) || 'rgba(0,0,0,.15)'}`);
  if (g('_gridTemplateColumns') && !g('_display') && !bp) d.push('display:grid');
  // Bricks gør en div til flex, så snart den får flex-indstillinger (retning, justering, wrap)
  else if (!g('_display') && !s._display && !s._gridTemplateColumns && ['_direction', '_flexDirection', '_alignItems', '_justifyContent', '_flexWrap'].some(k => g(k))) d.push('display:flex');
  return d;
}
function overlayCss(sel, s, bp) {
  const gr = s[bp ? '_gradient:' + bp : '_gradient']; if (!gr || typeof gr !== 'object' || gr.applyTo !== 'overlay' || !Array.isArray(gr.colors)) return '';
  const cs = gr.colors.map(x => colorOf(x.color)).filter(Boolean); if (!cs.length) return '';
  const g = `linear-gradient(${cs.length === 1 ? cs[0] + ',' + cs[0] : (gr.angle ? gr.angle + 'deg,' : '') + cs.join(',')})`;
  return `:where(${sel}){position:relative}${sel}{isolation:isolate}${sel}::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background-image:${g}}`;
}
function accordionCss(sel, s) {
  let o = ''; const w = (k, cls) => { const d = s[k] && typeof s[k] === 'object' ? boxDecl(s[k], 'padding') : []; if (d.length) o += `${sel} .${cls}{${d.join(';')}}`; };
  w('titlePadding', 'accordion-title-wrapper'); w('contentPadding', 'accordion-content-wrapper');
  const r = s.titleBorder && s.titleBorder.radius; if (r && typeof r === 'object') { const d = boxDecl({ top: r.top, right: r.right, bottom: r.bottom, left: r.left }, 'border-radius'); if (d.length) o += `${sel} .accordion-title-wrapper{${d.join(';')}}`; }
  const cf = s.contentTypography && s.contentTypography['font-size']; if (cf) o += `${sel} .accordion-content-wrapper{font-size:${cf}}`;
  return o;
}
function cssForSettings(sel, s) {
  let out = ''; const base = declsFor(s, ''); if (base.length) out += `${sel}{${base.join(';')}}`; out += overlayCss(sel, s, ''); out += accordionCss(sel, s);
  for (const bp of BP_ORDER) { const d = declsFor(s, bp); const o = overlayCss(sel, s, bp); if (d.length || o) out += `@container (${BP[bp][0]}-width:${BP[bp][1]}px){${d.length ? `${sel}{${d.join(';')}}` : ''}${o}}`; }
  return out;
}
function customCss(css, sel, oldId) {
  let c = String(css || '');
  if (oldId) c = c.replace(new RegExp('#brxe-' + oldId + '(?![a-z0-9])', 'g'), sel);
  return c.replace(/%root%/g, sel).replace(/@media\s+(?:screen\s+and\s+)?(?=\()/g, '@container ').replace(/:root\b/g, ':host');
}

// Grundstilen får nul specificitet (:where), så templatens klasser og elementindstillinger altid vinder – ligesom i Bricks
const zeroSpec = css => css.replace(/(^|[{}])(\s*)([^{}@]+?)\{/g, (m, pre, ws, sel) => /^\s*:host/.test(sel) ? m : pre + ws + sel.split(',').map(s => { const t = s.trim(); const i = t.indexOf('::'); return i < 0 ? `:where(${t})` : `:where(${t.slice(0, i)})${t.slice(i)}`; }).join(',') + '{');
const BASE_CSS = zeroSpec(`
:host{font-size:16px;--f-head:"Montserrat",system-ui,sans-serif;--f-body:"Open Sans",system-ui,sans-serif}
.b-section{display:flex;flex-direction:column;align-items:center;width:100%;padding:100px 0;box-sizing:border-box}
@container (max-width:1199px){.b-section{padding:50px 0}}
.b-container{display:flex;flex-direction:column;width:80%;max-width:100%;box-sizing:border-box}
@container (max-width:1199px){.b-container{width:90%}}
.b-block{display:flex;flex-direction:column;width:100%;box-sizing:border-box}
.b-div{box-sizing:border-box}
.b-text,.b-text-basic{margin:0;box-sizing:border-box}.b-heading{box-sizing:border-box}
h1:where(.b-heading),h2:where(.b-heading),h3:where(.b-heading),h4:where(.b-heading){margin:0 0 .35em;line-height:1.2;color:var(--heading,#111);font-family:var(--f-head);font-weight:700}
h1:where(.b-heading){font-size:75px;line-height:1}h2:where(.b-heading){font-size:32px;line-height:1.3}h3:where(.b-heading){font-size:26px;line-height:1.3}h4:where(.b-heading){font-size:20px}
@container (max-width:991px){h2:where(.b-heading){font-size:28px}h3:where(.b-heading){font-size:25px}h1:where(.b-heading){font-size:55px}}
@container (max-width:478px){h1:where(.b-heading){font-size:35px}h2:where(.b-heading){font-size:25px}h3:where(.b-heading){font-size:22px}}
.b-text,.b-text-basic{font-size:15px;line-height:1.5}
.b-text p{margin:0 0 .8em}.b-text p:last-child{margin-bottom:0}.b-text ul,.b-text ol{margin:.4em 0;padding-left:1.3em}
.b-button{width:fit-content;display:inline-flex;align-items:center;justify-content:center;gap:.6em;padding:6px 10px;border-radius:0;text-decoration:none;font-weight:700;font-family:var(--f-head);font-size:15px;box-sizing:border-box;border:2px solid transparent;line-height:1.2;max-width:100%}
.b-button.st-primary{background:var(--cta,#225581);color:var(--white,#fff)}
.b-button.st-secondary{background:var(--links,#1a4061);color:var(--white,#fff)}
.b-button.st-light{background:var(--white,#fff);color:var(--font,#333)}
.b-button.st-dark{background:var(--font,#333);color:var(--white,#fff)}
.b-button.st-info,.b-button.st-success,.b-button.st-warning,.b-button.st-danger{background:var(--cta,#225581);color:#fff}
.b-button.sz-xl{padding:10px 16px}.b-button.sz-lg{padding:8px 14px}.b-button.sz-md{padding:6px 10px}.b-button.sz-sm{padding:5px 7px}
.b-button.outline{background:transparent;border-color:currentColor}
.b-text-link{width:fit-content;text-decoration:underline;color:var(--links,#1a4061)}
figure.b-image{margin:0;display:block;max-width:100%;overflow:hidden}
figure.b-image img{display:block;width:100%;height:100%;object-fit:inherit;min-height:0}
.b-icon{display:inline-flex;align-items:center;justify-content:center;line-height:1}
.b-ic::before{content:attr(data-g);font-style:normal;font-family:system-ui,sans-serif}
svg.svg-inline--fa{height:1em;width:1.1em;vertical-align:-.125em;display:inline-block;overflow:visible}
.b-counter{display:flex;gap:.1em;line-height:1}.b-rating{color:#f2b01e;letter-spacing:.1em;line-height:1}
.b-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.6em}.b-list li{display:flex;gap:.6em;align-items:center}
.b-slider-nested{display:flex;flex-direction:row;gap:var(--space-m,20px);overflow:hidden;width:100%}
.b-slider-nested>*{flex:0 0 calc((100% - 2*var(--space-m,20px))/3);min-width:0}
@container (max-width:767px){.b-slider-nested>*{flex-basis:100%}}
.b-accordion-nested,.b-tabs-nested{display:flex;flex-direction:column;width:100%}
.accordion-content-wrapper{display:none}.b-accordion-nested>*:first-child .accordion-content-wrapper{display:block}
.b-acc{width:100%;border-top:1px solid rgba(128,128,128,.35)}.b-acc div{padding:.9em 0;border-bottom:1px solid rgba(128,128,128,.35);font-size:var(--text-m,16px)}
.b-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%}.b-gallery img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
.ph-box{border:2px dashed #9aa6b2;color:#5b6773;background:rgba(150,160,170,.12);font:12px/1.3 system-ui,sans-serif;padding:14px;text-align:center;width:100%;box-sizing:border-box}
.ph-form{display:flex;flex-direction:column;gap:10px;width:100%;box-sizing:border-box;font:14px system-ui,sans-serif}
.ph-form i{display:block;font-style:normal;background:rgba(255,255,255,.92);color:#6b7480;border:1px solid rgba(0,0,0,.15);border-radius:6px;padding:11px 12px;font-size:14px}
.ph-form i.t{min-height:84px}.ph-form b{display:block;text-align:center;background:var(--cta,#225581);color:#fff;border-radius:6px;padding:12px;font-weight:600}
hr.b-divider{width:100%;border:0;border-top:1px solid rgba(128,128,128,.4);margin:0}
`);
const GLYPH = { 'fa-building': '▮', 'fa-circle-check': '✔', 'fa-arrow-right': '→', 'fa-arrow-right-long': '⟶', 'fa-arrow-left': '←', 'fa-mobile-screen': '▯', 'fa-plus': '+', 'fa-location-dot': '⌖', 'fa-circle-minus': '−', 'fa-quote-right': '❞', 'fa-star': '★', 'fa-comments': '✉', 'fa-heart': '♥', 'fa-envelope': '✉', 'fa-clock': '◷', 'fa-circle-play': '▶', 'fa-broom': '✦', 'fa-bath': '▭', 'fa-face-grin-beam': '☺',
  'ion-md-phone-portrait': '▯', 'ion-ios-phone-portrait': '▯', 'ion-md-star': '★', 'ion-ios-star': '★', 'ion-md-arrow-forward': '→', 'ion-md-arrow-round-forward': '→', 'ion-ios-arrow-forward': '›', 'ion-ios-paper-plane': '➤', 'ion-md-build': '✦', 'ion-ios-construct': '✦', 'ion-ios-heart': '♥', 'ion-ios-chatbubbles': '✉', 'ion-ios-mail': '✉', 'ion-ios-time': '◷', 'ion-ios-information-circle': 'ⓘ', 'ion-md-information-circle-outline': 'ⓘ', 'ion-ios-flash': '⚡', 'ion-md-pin': '⌖', 'ion-ios-home': '⌂', 'ti-arrow-top-right': '↗', 'ti-arrow-right': '→' };
const iconHtml = ic => {
  if (!ic || typeof ic !== 'object' || !ic.icon) return '';
  const cls = String(ic.icon); const key = cls.split(/\s+/).pop(); const fa = /^(fas|far|fab|fa-solid|fa-regular|fa-brands)\b/.test(cls) || /fontawesome/i.test(ic.library || '');
  return `<i class="b-ic ${fa ? esc(cls) : ''}" data-g="${esc(GLYPH[key] || '●')}"></i>`;
};
const sanitizeHtml = h => String(h || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '').replace(/javascript:/gi, '');
const tagOr = (s, ok, dflt) => (typeof s.tag === 'string' && ok.test(s.tag)) ? s.tag : dflt;
const fauxForm = `<div class="ph-form"><i>Navn</i><i>E-mail</i><i>Telefon</i><i class="t">Besked</i><b>Send</b></div>`;

function renderSections(sections, CLASSES, VARS, ropts) {
  if (ropts && ropts.h1) sections = fixH1(sections, ropts.h1).sections;
  let html = '', css = ':host{display:block;color:var(--font,#333);font-family:"Open Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.5;font-size:15px;';
  css += VARS.map(([n, v]) => `--${n}:${v}`).join(';') + '}' + BASE_CSS;
  const usedClasses = new Set(); let elCss = '';
  for (const sec of sections) {
    const sEls = sec.els; const m = mapOf(sEls);
    const r = id => {
      const e = m[id]; if (!e) return ''; const s = e.settings || {}; const n = e.name;
      const cls = ['b-' + n];
      for (const c of s._cssGlobalClasses || []) { if (CLASSES[c]) { usedClasses.add(c); cls.push(CLASSES[c].name); } }
      if (typeof s._cssClasses === 'string') cls.push(...s._cssClasses.split(/\s+/).filter(Boolean));
      if (s._hidden && typeof s._hidden === 'object' && typeof s._hidden._cssClasses === 'string') cls.push(...s._hidden._cssClasses.split(/\s+/).filter(Boolean));
      if (n === 'button') { cls.push('st-' + (s.style || 'primary'), 'sz-' + (s.size || 'md')); if (s.outline) cls.push('outline'); }
      const attr = `data-e="${e.id}" class="${esc(cls.join(' '))}"`;
      elCss += cssForSettings(`[data-e="${e.id}"]`, s);
      if (n === 'icon') { const ds = []; if (s.iconSize) ds.push('font-size:' + px(s.iconSize)); const ic = colorOf(s.iconColor); if (ic) ds.push('color:' + ic); if (ds.length) elCss += `[data-e="${e.id}"]{${ds.join(';')}}`; }
      if (n === 'counter') { const ct = {}; for (const k in s) if (/^countTypography(:|$)/.test(k)) ct[k.replace('countTypography', '_typography')] = s[k]; elCss += cssForSettings(`[data-e="${e.id}"]`, ct); }
      if (typeof s._cssCustom === 'string' && s._cssCustom.trim()) elCss += customCss(s._cssCustom, `[data-e="${e.id}"]`, e.id);
      const kids = (e.children || []).map(r).join('');
      switch (n) {
        case 'section': return `<section ${attr}>${kids}</section>`;
        case 'heading': { const t = tagOr(s, /^h[1-6]$/, 'h3'); return `<${t} ${attr}>${sanitizeHtml(s.text)}</${t}>`; }
        case 'text-basic': { const t = tagOr(s, /^(div|p|span|h[1-6])$/, 'div'); return `<${t} ${attr}>${sanitizeHtml(s.text)}</${t}>`; }
        case 'text': return `<div ${attr}>${sanitizeHtml(s.text)}</div>`;
        case 'button': { const ic = iconHtml(s.icon); const left = s.iconPosition === 'left'; return `<a ${attr}>${left ? ic : ''}${sanitizeHtml(s.text)}${left ? '' : ic}</a>`; }
        case 'text-link': return `<a ${attr}>${sanitizeHtml(s.text)}</a>`;
        case 'image': return `<figure ${attr}><img src="${stockPrev(s.image)}" alt=""></figure>`;
        case 'icon': return `<span ${attr}>${iconHtml(s.icon)}</span>`;
        case 'icon-box': return `<div ${attr}><div class="b-icon" style="font-size:40px;margin-bottom:.4em">${iconHtml(s.icon)}</div>${sanitizeHtml(s.content)}</div>`;
        case 'divider': return `<hr ${attr.replace('class="', 'class="b-divider ')}>`;
        case 'template': return (String(s.template) === '1699' || /kontakt|form/i.test((e.label || ''))) ? `<div data-e="${e.id}" style="width:100%">${fauxForm}</div>` : `<div class="ph-box" data-e="${e.id}">Template: ${esc(e.label || s.template || '')}</div>`;
        case 'code': return '';
        case 'form': return `<div data-e="${e.id}" style="width:100%">${fauxForm}</div>`;
        case 'counter': return `<div ${attr}><span>${esc(s.prefix || '')}</span><span>${esc(String(s.countTo || '0').trim())}</span><span>${esc(s.suffix || '')}</span></div>`;
        case 'rating': return `<div ${attr}>${'★'.repeat(Math.max(1, Math.min(5, Math.round(parseFloat(s.rating)) || 5)))}</div>`;
        case 'list': return `<ul ${attr}>${(Array.isArray(s.items) ? s.items : []).map(i => `<li>${iconHtml(i.icon)}<span>${esc(stripTags(i.title || ''))}</span></li>`).join('')}</ul>`;
        case 'accordion': return `<div ${attr.replace('class="', 'class="b-acc ')}>${(Array.isArray(s.accordions) ? s.accordions : []).slice(0, 4).map(a => `<div><b>${esc(stripTags(a.title || ''))}</b></div>`).join('')}</div>`;
        case 'image-gallery': { const c = Math.min(6, Math.max(3, ((s.items && s.items.images) || []).length || 3)); const gi = ((s.items && s.items.images) || []).slice(0, 6).map(im => `<img src="${stockPrev(im)}" alt="">`).join(''); return `<div ${attr.replace('class="', 'class="b-gallery ')}>${gi || `<img src="${PH_URL}" alt="">`.repeat(c)}</div>`; }
        case 'slider-nested': return `<div ${attr}>${kids}</div>`;
        case 'social-icons': return `<div ${attr} style="display:flex;gap:10px">${'<span class="b-icon" style="width:36px;height:36px;border-radius:50%;background:rgba(128,128,128,.35)"></span>'.repeat(3)}</div>`;
        case 'posts': return `<div class="ph-box" data-e="${e.id}">Indlæg (dynamisk liste)</div>`;
        case 'post-toc': return `<div class="ph-box" data-e="${e.id}">Indholdsfortegnelse</div>`;
        case 'post-meta': return `<div class="b-text-basic" data-e="${e.id}" style="font-size:14px;opacity:.7">Dato / Kategori</div>`;
        case 'nav-menu': case 'nav-nested': case 'dropdown': case 'toggle': case 'logo': case 'svg': return `<div class="ph-box" data-e="${e.id}">${esc(n)}</div>`;
        default: return `<div ${attr}>${kids}</div>`;
      }
    };
    const rt = rootsOf(sEls).filter(x => x.name !== 'code');
    rt.forEach((root, i) => { const out = r(root.id); html += i === 0 ? out.replace(/^<(\w+)/, `<$1 data-sec="${sec.uid}"`) : out; });
  }
  let clsCss = '';
  for (const id of usedClasses) {
    const c = CLASSES[id]; const sel = '.' + c.name.replace(/[^a-zA-Z0-9_-]/g, '\\$&'); const st = c.settings && !Array.isArray(c.settings) ? c.settings : {};
    clsCss += cssForSettings(sel, st);
    if (st.iconSize || st.iconColor) clsCss += `${sel}{${[st.iconSize ? 'font-size:' + px(st.iconSize) : '', colorOf(st.iconColor) ? 'color:' + colorOf(st.iconColor) : ''].filter(Boolean).join(';')}}`;
    if (typeof st._cssCustom === 'string') clsCss += customCss(st._cssCustom, sel, null);
  }
  return { html, css: unitFix(css + clsCss + elCss) };
}

/* ---------- prompts ---------- */
function sanitizePlan(list, LIB) {
  const out = []; const count = {};
  for (const x of list || []) {
    if (x && x.fri && FRI_TYPES[x.fri]) { if (normFri(x)) out.push(x); continue; }
    if (!x || !LIB[x.tpl] || categoryOf(x.tpl) === 'CTA sektion') continue;
    if (out.length && out[out.length - 1].tpl === x.tpl) continue;                        // ingen to ens lige efter hinanden
    if (categoryOf(x.tpl) === 'Header' && out.some(o => o.tpl && categoryOf(o.tpl) === 'Header')) continue;   // kun 1 hero pr. side
    if (categoryOf(x.tpl) === 'Anmeldelser' && out.some(o => o.tpl && categoryOf(o.tpl) === 'Anmeldelser')) continue;   // kun 1 anmeldelses-sektion pr. side
    count[x.tpl] = (count[x.tpl] || 0) + 1; if (count[x.tpl] > 2) continue; out.push(x);
  }
  { const hi = out.findIndex(o => o.tpl && categoryOf(o.tpl) === 'Header'); if (hi > 0) out.unshift(out.splice(hi, 1)[0]); }   // hero altid som første sektion
  return out.slice(0, 12);
}
const SECTION_ONLY = { 'Hero': 'Header', 'Menu': 'Menu', 'Pris-sektion': 'Priser', 'Cases-sektion': 'Cases', 'Anmeldelses-sektion': 'Anmeldelser', 'FAQ-sektion': 'FAQ' };
const tplKeyOf = (d, file) => { const n = String((d && d.name) || '').trim().toLowerCase(); if (/^[a-z0-9-]+$/.test(n)) return n;
  return String(file || '').toLowerCase().replace(/\.json$/, '').replace(/^templates?-/, '').replace(/-?\d{4}-\d{2}-\d{2}$/, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, ''); };
function libFromExports(files, baseClasses) {
  const LIB = {}, CLASSES = Object.assign({}, baseClasses || {}), SHEET = [], bad = [];
  for (const f of files || []) {
    let d; try { d = typeof f.text === 'string' ? JSON.parse(f.text) : f.json; } catch (_) { bad.push(f.name + ' (ugyldig JSON)'); continue; }
    if (!d || typeof d !== 'object') { bad.push(f.name); continue; }
    const type = d.templateType || d.type || 'content';
    const els = [d[type], d.content, d.header, d.footer].find(x => Array.isArray(x) && x.length);   // eksport (content/header/footer) eller kopieret JSON (content)
    if (!els) { bad.push(f.name + ' (ingen elementer)'); continue; }
    const key = tplKeyOf(d, f.name); if (!key) { bad.push(f.name + ' (intet navn)'); continue; }
    const cat = type === 'header' ? 'Menu' : type === 'footer' ? 'Footer' : (PREFIX_TYPE[prefixOf(key)] ? null : (Array.isArray(d.bundles) && d.bundles[0] ? String(d.bundles[0]).charAt(0).toUpperCase() + String(d.bundles[0]).slice(1) : null));
    const date = String(d.date || '').slice(0, 10);
    const prev = LIB[key]; if (prev && (prev.modified || 0) > (f.modified || 0)) continue;   // samme template to gange: nyeste fil vinder
    LIB[key] = Object.assign({ kind: type, title: d.title || key, els, added: date, page: d.permalink || '', thumb: d.thumbnail || '', modified: f.modified || 0, file: f.name }, cat ? { cat } : {});
    for (const c of d.global_classes || d.globalClasses || []) if (c && c.id && c.name) CLASSES[c.id] = c;
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    SHEET.push({ n: d.title || key, t: cat || categoryOf(key), d: m ? `${m[3]}-${m[2]}-${m[1]}` : '', s: key, u: d.permalink || '', b: '' });
  }
  return { LIB, CLASSES, SHEET, bad };
}
// Gamle nøgler (fx cta-1-double-text) peger på de nye (cta-1) – bruges til statistik og inspirationsdata fra før
function keyAlias(oldKeys, LIB) {
  const norm = x => String(x).replace(/ae|oe|aa|[^a-z0-9]/g, ''); const keys = Object.keys(LIB); const out = {};
  for (const o of oldKeys) { if (LIB[o]) { out[o] = o; continue; } const k = keys.find(k => o.startsWith(k + '-') && !keys.includes(o)) || keys.find(k => norm(k) === norm(o)); if (k) out[o] = k; }
  return out;
}

/* ---------- preview v3: Bricks' egen markup, tegnet med jeres rigtige CSS (src/bricks.json fra hent-bricks.py) ----------
   HTML'en laves som Bricks selv gør (brxe-klasser, #brxe-id, samme tags) og vises i en iframe med stocksitets CSS og JS.
   Element-CSS: Bricks' egen (hentet fra templatesitet), når elementets styling er uændret – ellers genereres den. */
let BX = { bp: {}, links: { css: [], js: [] }, theme: '', classes: {}, elements: {}, html: {}, pages: [], bricksData: {} };
let BX_LIB = {}, BX_PAGES = new Set();
function setBricks(b, LIB) { if (b) { BX = b; BX_PAGES = new Set(b.pages || []); } if (LIB) BX_LIB = LIB; }
const BX_BP = () => Object.entries(BX.bp || {}).sort((a, b) => b[1] - a[1]);          // [['tablet_portrait',1470], …] – kun jeres aktive breakpoints
// Indstillinger der kun ændrer indhold (HTML) og ikke CSS – de må gerne være ændret, uden at Bricks' CSS bliver forkert
const BX_CONTENT = new Set(['text', 'content', 'title', 'subtitle', 'link', 'url', 'image', 'items', 'icon', 'iconPosition', 'tag', 'customTag', 'label', 'altText', 'logo', 'logoInverse', 'logoText', 'logoUrl', 'fields', 'countTo', 'countFrom', 'prefix', 'suffix', 'rating', 'accordions', 'icons', 'youTubeId', 'vimeoId', 'videoType', 'submitButtonText', 'placeholder', 'caption', 'description', 'meta', 'code', 'javascriptCode', 'cssCode', 'shortcode', 'template', 'menu', '_attributes', '_interactions']);
const bxHid = e => String(((e && e.settings) || {})._cssId || '').trim() || 'brxe-' + (e && e.id);   // elementets HTML-id i Bricks
const bxOrig = (sec, e) => { const L = sec && BX_LIB[sec.tpl]; if (!L) return null; const id = e._src || e.id; return L.els.find(x => x.id === id && x.name === e.name) || null; };
const bxUrls = (o, out) => { if (typeof o === 'string') { if (/^https?:\/\//.test(o)) out.push(o); } else if (o && typeof o === 'object') for (const k in o) bxUrls(o[k], out); return out; };
// Bricks' egen CSS for elementet (med udskiftede billed-URL'er), eller null hvis stylingen er ændret / ikke hentet
function bxHarvestCss(sec, e, hid) {
  const o = bxOrig(sec, e); if (!o || !BX_PAGES.has(sec.tpl)) return null;
  const a = o.settings || {}, b = e.settings || {}; let out = BX.elements[sec.tpl + ':' + bxHid(o)] || '';
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (BX_CONTENT.has(k.split(':')[0])) continue;
    if (JSON.stringify(a[k]) === JSON.stringify(b[k])) continue;
    const strip = v => JSON.stringify(v).replace(/https?:\/\/[^"]+/g, '');
    if (/^_background/.test(k) && a[k] && b[k] && strip(a[k]) === strip(b[k])) { const u1 = bxUrls(a[k], []), u2 = bxUrls(b[k], []); u1.forEach((u, i) => { if (u2[i]) out = out.split(u).join(u2[i]); }); continue; }
    return null;
  }
  return out.replace(/%SEL%/g, hid);
}
// Genereret CSS (når Bricks' egen ikke kan bruges) – samme selektorer og breakpoints som Bricks
function bxGenCss(sel, s, oldId) {
  PV_RAW = true;
  try {
    let out = ''; const base = declsFor(s, ''); if (base.length) out += `${sel}{${base.join(';')}}`; out += overlayCss(sel, s, '');
    for (const [bp, w] of BX_BP()) { const d = declsFor(s, bp); const o = overlayCss(sel, s, bp); if (d.length || o) out += `@media (max-width: ${w}px){${d.length ? `${sel}{${d.join(';')}}` : ''}${o}}`; }
    const ic = [s.iconSize ? 'font-size:' + px(s.iconSize) : '', colorOf(s.iconColor) ? 'color:' + colorOf(s.iconColor) : ''].filter(Boolean);
    if (ic.length) out += `${sel} .icon,${sel}.brxe-icon{${ic.join(';')}}`;
    if (typeof s._cssCustom === 'string' && s._cssCustom.trim()) { let c = s._cssCustom.replace(/%root%/g, sel); if (oldId) c = c.replace(new RegExp('#brxe-' + oldId + '(?![a-z0-9])', 'g'), sel); out += c; }
    return out;
  } finally { PV_RAW = false; }
}
const bxLink = l => { if (!l || typeof l !== 'object') return null; if (l.type === 'external' && l.url) return l.url; if (l.type === 'internal') return '#'; if (l.url && /^(tel:|mailto:|https?:|#|\/)/.test(l.url)) return l.url; return null; };
const bxIcon = (ic, extra) => { if (!ic || typeof ic !== 'object') return ''; if (ic.icon) return `<i class="${esc(ic.icon)}${extra ? ' ' + extra : ''}"></i>`; if (ic.svg && ic.svg.url) return `<img class="${extra || ''}" src="${esc(ic.svg.url)}" alt="" style="width:1em;height:1em">`; return ''; };
const BX_STAR = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M480 208H308L256 48l-52 160H32l140 96-54 160 138-100 138 100-54-160z" fill="currentColor" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/></svg>';
const BX_CARET = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none"><path d="M1.50002 4L6.00002 8L10.5 4" stroke-width="1.5" stroke="currentcolor"></path></svg>';
const bxImgSrc = im => (im && typeof im === 'object' && (im.url || im.full)) || PH_URL;
// Slider-indstillinger som Bricks skriver dem i data-splide (autoplay er altid slået fra i preview)
function bxSplide(s) {
  PV_RAW = true;
  try {
    const num = v => (v === undefined || v === '' ? undefined : (isNaN(+v) ? v : +v));
    const one = bp => { const g = k => s[bp ? k + ':' + bp : k]; const o = {}; if (g('type')) o.type = g('type'); if (g('height')) o.height = px(g('height')); if (g('gap') !== undefined) o.gap = px(g('gap')); if (g('perPage')) o.perPage = num(g('perPage')); if (g('perMove')) o.perMove = num(g('perMove')); if (g('focus') !== undefined) o.focus = num(g('focus')); return o; };
    const base = Object.assign({ type: 'slide', direction: 'ltr', keyboard: 'global', height: 'auto', gap: '0px', start: 0, perPage: 1, perMove: 1, speed: +s.speed || 400, interval: +s.interval || 3000, autoHeight: false, autoplay: false, pauseOnHover: false, pauseOnFocus: false, arrows: !!s.arrows, pagination: !!s.pagination, mediaQuery: 'max' }, one(''));
    const bps = { 1920: one('') }; for (const [bp, w] of BX_BP()) { const o = one(bp); if (Object.keys(o).length) bps[w] = o; }
    base.breakpoints = bps; return base;
  } finally { PV_RAW = false; }
}
// Sektioner -> { html, css } med Bricks' markup
function renderBricks(sections, CLASSES, ropts) {
  if (ropts && ropts.h1) sections = fixH1(sections, ropts.h1).sections;
  let html = '', css = ''; const usedClasses = new Set();
  for (const sec of sections) {
    const m = mapOf(sec.els);
    // ctx: add = ekstra klasser, tag = tvunget tag, kid = (barn-id, index) -> ctx for børnene, li = menupunkt i nav-nested
    const r = (id, ctx) => {
      const e = m[id]; if (!e) return ''; const s = e.settings || {}; const n = e.name; ctx = ctx || {};
      const hid = String(s._cssId || '').trim() || 'brxe-' + e.id;   // Bricks bruger elementets eget HTML-id, hvis det har et
      if (ctx.li && n !== 'dropdown') return `<li class="menu-item">${r(id, Object.assign({}, ctx, { li: false }))}</li>`;
      const cls = ['brxe-' + n];
      for (const c of s._cssGlobalClasses || []) if (CLASSES[c]) { usedClasses.add(c); cls.push(CLASSES[c].name); }
      if (typeof s._cssClasses === 'string') cls.push(...s._cssClasses.split(/\s+/).filter(Boolean));
      if (ctx.add) cls.push(...ctx.add);
      { const c = bxHarvestCss(sec, e, hid); css += c !== null ? c : bxGenCss('#' + hid, s, (bxOrig(sec, e) || e).id); }
      let at = ''; for (const a of Array.isArray(s._attributes) ? s._attributes : []) if (a && a.name && /^[\w-]+$/.test(a.name)) at += ` ${a.name}="${esc(a.value || '')}"`;
      const A = extra => `id="${esc(hid)}" class="${esc(cls.join(' '))}"${extra || ''}${at}`;
      const kidIds = e.children || []; const kids = fn => kidIds.map((k, i) => r(k, fn ? fn(k, i) : null)).join('');
      const href = bxLink(s.link); const H = href ? ` href="${esc(href)}"` : '';
      const tagOf = dflt => { if (href) return 'a'; const t = s.tag === 'custom' ? s.customTag : s.tag; return /^[a-z][a-z0-9-]*$/i.test(t || '') ? t : dflt; };
      switch (n) {
        case 'section': case 'container': case 'block': case 'div': {
          if (n === 'container' && (s._display === 'grid' || s._gridTemplateColumns)) cls.push('brx-grid');
          const t = ctx.tag || tagOf(n === 'section' ? 'section' : 'div');
          return `<${t} ${A(t === 'a' ? H : '')}>${kids(ctx.kid)}</${t}>`; }
        case 'heading': { const t = href ? 'a' : (/^(h[1-6]|div|p|span)$/.test(s.tag || '') ? s.tag : s.tag === 'custom' && s.customTag ? s.customTag : 'h2'); return `<${t} ${A(H)}>${sanitizeHtml(s.text)}</${t}>`; }
        case 'text-basic': { const t = tagOf('div'); return `<${t} ${A(H)}>${sanitizeHtml(s.text)}</${t}>`; }
        case 'text': return `<div ${A()}>${sanitizeHtml(s.text)}</div>`;
        case 'button': {
          cls.push('bricks-button'); if (s.size) cls.push(s.size); if (s.outline) cls.push('outline'); if (s.circle) cls.push('circle'); if (s.block) cls.push('block');
          if (s.style) cls.push((s.outline ? 'bricks-color-' : 'bricks-background-') + s.style);
          const ic = bxIcon(s.icon); const left = s.iconPosition === 'left'; const t = href ? 'a' : 'span';
          return `<${t} ${A(H)}>${left ? ic : ''}${sanitizeHtml(s.text)}${left ? '' : ic}</${t}>`; }
        case 'text-link': { const t = href ? 'a' : 'span'; const ic = bxIcon(s.icon); const right = s.iconPosition === 'right'; return `<${t} ${A(H)}>${right ? '' : ic}${s.icon ? `<span>${sanitizeHtml(s.text)}</span>` : sanitizeHtml(s.text)}${right ? ic : ''}</${t}>`; }
        case 'image': {
          const im = s.image || {}; const size = 'size-' + (im.size || 'full'); const src = esc(bxImgSrc(im));
          // billedets link er en tekst: lightbox/media (åbner billedet) eller url (bruger s.url)
          const ih = s.link === 'lightbox' || s.link === 'media' ? bxImgSrc(im) : s.link === 'url' ? bxLink(s.url) : null; if (s.link === 'lightbox') cls.push('bricks-lightbox');
          if (s.tag === 'figure' || ih) { cls.push('tag'); const t = ih ? 'a' : 'figure'; return `<${t} ${A(ih ? ` href="${esc(ih)}"` : '')}><img src="${src}" class="css-filter ${size}" alt=""></${t}>`; }
          cls.push('css-filter', size); return `<img ${A()} src="${src}" alt="">`; }
        case 'icon': { const ii = `<i id="${esc(hid)}" class="${esc([String((s.icon && s.icon.icon) || ''), ...cls].filter(Boolean).join(' '))}"${at}></i>`; return href ? `<a href="${esc(href)}">${ii}</a>` : ii; }
        case 'icon-box': return `<div ${A()}><div class="icon">${bxIcon(s.icon)}</div><div class="content">${sanitizeHtml(s.content)}</div></div>`;
        case 'list': return `<ul ${A()}>${(Array.isArray(s.items) ? s.items : []).map(it => {
          const h2 = bxLink(it.link); const ti = `<span class="title">${sanitizeHtml(it.title || '')}</span>`; const ic = bxIcon(it.icon && it.icon.icon ? it.icon : s.icon);
          return `<li><div class="content">${ic ? `<span class="icon">${ic}</span>` : ''}${h2 ? `<a href="${esc(h2)}">${ti}</a>` : ti}${it.meta ? `<span class="separator"></span><span class="meta">${sanitizeHtml(it.meta)}</span>` : ''}</div>${it.description ? `<div class="description">${sanitizeHtml(it.description)}</div>` : ''}</li>`; }).join('')}</ul>`;
        case 'rating': { const max = +s.maxRating || 5; const v = Math.round(parseFloat(s.rating) || max); const ic = s.icon && s.icon.icon ? bxIcon(s.icon) : BX_STAR; let o = ''; for (let i = 0; i < max; i++) o += `<div class="icon ${i < v ? 'full' : 'empty'}-color" aria-hidden="true">${ic}</div>`; return `<div ${A(` role="img" aria-label="Bedømt til ${v} ud af ${max}"`)}>${o}</div>`; }
        case 'counter': return `<div ${A()}>${s.prefix ? `<span class="prefix">${esc(s.prefix)}</span>` : ''}<span class="count">${esc(String(s.countTo || '0').trim())}</span>${s.suffix ? `<span class="suffix">${esc(s.suffix)}</span>` : ''}</div>`;
        case 'divider': cls.push(s.direction === 'vertical' ? 'vertical' : 'horizontal'); return `<div ${A()}><div class="line"></div>${s.icon ? `<div class="icon">${bxIcon(s.icon)}</div><div class="line"></div>` : ''}</div>`;
        case 'social-icons': return `<ul ${A()}>${(Array.isArray(s.icons) ? s.icons : []).map(it => { const h2 = bxLink(it.link); const inner = `${bxIcon(it.icon, 'icon')}${it.label ? `<span>${esc(it.label)}</span>` : ''}`; return `<li class="repeater-item${h2 ? ' has-link' : ''}">${h2 ? `<a href="${esc(h2)}">${inner}</a>` : inner}</li>`; }).join('')}</ul>`;
        case 'logo': { const lg = s.logo && (s.logo.url || s.logo.full); return `<a ${A(' href="#"')}>${lg ? `<img src="${esc(lg)}" class="bricks-site-logo css-filter" alt="${esc(s.logoText || '')}">` : esc(s.logoText || 'Logo')}</a>`; }
        case 'video': { const yt = String(s.youTubeId || '').match(/(?:v=|youtu\.be\/|embed\/)?([\w-]{11})(?:[&?#]|$)/); return `<div ${A()}>${yt ? `<iframe src="https://www.youtube.com/embed/${yt[1]}?rel=0&mute=1" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin"></iframe>` : ''}</div>`; }
        case 'code':   // uden "Execute code" viser Bricks koden som tekst – det gør preview også, så man opdager det
          if (!s.executeCode) return s.code ? `<div ${A(` data-script-id="${e.id}"`)}><pre id="${esc(hid)}" class="brxe-code">${esc(s.code)}</pre></div>` : `<div ${A()}></div>`;
          return `<div ${A()}>${String(s.code || '') + (s.cssCode ? `<style>${s.cssCode}</style>` : '') + (s.javascriptCode ? `<script>${s.javascriptCode}<\/script>` : '')}</div>`;
        case 'form': {
          const hv = BX.html['form:' + sec.tpl + ':' + bxHid(bxOrig(sec, e) || e)]; if (hv) { css += hv.css || ''; return hv.html.replace('%SEL%', hid); }
          const f = (Array.isArray(s.fields) ? s.fields : []).filter(x => !x.isHoneypot).map(x => { const ph = esc((x.placeholder || x.label || '') + (x.required ? ' *' : ''));
            const opts = String(x.options || '').split('\n').map(o => o.trim()).filter(Boolean);
            const inp = x.type === 'textarea' ? `<textarea placeholder="${ph}"></textarea>` : x.type === 'select' ? `<select><option value="" class="placeholder">${ph}</option>${opts.map(o => `<option>${esc(o)}</option>`).join('')}</select>`
              : x.type === 'checkbox' || x.type === 'radio' ? `<ul class="options-wrapper">${(opts.length ? opts : [x.label || '']).map(o => `<li><input type="${x.type}"><label>${esc(o)}</label></li>`).join('')}</ul>`
              : x.type === 'file' ? `<input type="file" style="display:none"><label class="choose-files">${esc(x.fileUploadButtonText || 'Vælg filer')}</label>`
              : `<input type="${/^(email|tel|number|url|date)$/.test(x.type) ? x.type : 'text'}" placeholder="${ph}">`;
            return `<div class="form-group${x.type === 'file' ? ' file' : ''}" role="group"${x.width ? ` style="width:${esc(x.width)}"` : ''}>${inp}</div>`; }).join('');
          return `<form ${A(' method="post"')}>${f}<div class="form-group submit-button-wrapper"><button type="submit" class="bricks-button bricks-background-primary ${esc(s.submitButtonSize || 'md')}"><span class="text">${esc(s.submitButtonText || 'Send')}</span></button></div></form>`; }
        case 'template': case 'nav-menu': case 'shortcode': case 'post-toc': case 'post-meta': case 'post-title': case 'post-content': case 'post-excerpt': case 'post-taxonomy': case 'post-author': case 'posts': case 'related-posts': case 'breadcrumbs': case 'pagination': case 'search': case 'sidebar': case 'wordpress': {   // bygges af WordPress: Bricks' færdige HTML fra templatesitet
          const o = bxOrig(sec, e) || e; const hv = BX.html[n + ':' + sec.tpl + ':' + bxHid(o)] || BX.html[n === 'template' ? 'template:' + s.template : 'menu:' + s.menu];
          if (hv) { css += hv.css || ''; return hv.html.replace('%SEL%', hid); }
          return n === 'template' ? `<div ${A()}><div style="padding:24px;border:2px dashed #9aa6b2;text-align:center;font:13px system-ui;color:#5b6773">Bricks-template ${esc(s.template || '')}</div></div>` : `<div ${A()}></div>`; }
        case 'slider-nested': cls.push('splide'); return `<div ${A(` data-script-id="${e.id}" data-splide="${esc(JSON.stringify(bxSplide(s)))}"`)}><div class="splide__track"><div class="splide__list">${kids()}</div></div></div>`;
        case 'tabs-nested': {   // første barn = fanebladene, andet = indholdet; første fane er åben
          const sub = (cl) => (k, j) => ({ add: j === 0 ? [cl, 'brx-open'] : [cl] });
          return `<div ${A(` data-script-id="${e.id}" data-open-tab="0"`)}>${kids((k, i) => i === 0 ? { add: ['tab-menu'], kid: sub('tab-title') } : { add: ['tab-content'], kid: sub('tab-pane') })}</div>`; }
        case 'accordion-nested': {   // hvert punkt: første barn = titel, andet = indhold
          const open = s.expandItem !== undefined && s.expandItem !== '' ? String(s.expandItem) : '';
          return `<div ${A(` data-script-id="${e.id}" data-expand-item="${esc(open)}"`)}>${kids((k, i) => ({ add: String(i) === open ? ['brx-open'] : [], kid: (k2, j) => ({ add: [j === 0 ? 'accordion-title-wrapper' : 'accordion-content-wrapper'] }) }))}</div>`; }
        case 'accordion': { const tt = /^(h[1-6]|div)$/.test(s.titleTag || '') ? s.titleTag : 'h5'; const open = String(s.expandItem !== undefined ? s.expandItem : '');
          return `<ul ${A(` data-script-id="${e.id}" data-expand-item="${esc(open)}"`)}>${(Array.isArray(s.accordions) ? s.accordions : []).map((a, i) => `<li class="accordion-item${open === String(i) ? ' brx-open' : ''}"><div class="accordion-title-wrapper"><div class="accordion-title"><${tt} class="title">${sanitizeHtml(a.title || '')}</${tt}>${bxIcon(s.iconExpanded || { icon: 'fas fa-minus' }, 'icon expanded')}${bxIcon(s.icon || { icon: 'fas fa-plus' }, 'icon')}</div>${a.subtitle ? `<span class="accordion-subtitle">${esc(a.subtitle)}</span>` : ''}</div><div class="accordion-content-wrapper">${sanitizeHtml(a.content || '')}</div></li>`).join('')}</ul>`; }
        case 'image-gallery': { cls.push('bricks-layout-wrapper'); const ims = (s.items && s.items.images) || []; return `<ul ${A(` data-layout="${esc(s.layout || 'grid')}"`)}>${ims.map(im => `<li class="bricks-layout-item"><figure><img src="${esc(bxImgSrc(im))}" class="image bricks-layout-inner css-filter" alt=""></figure></li>`).join('')}</ul>`; }
        case 'nav-nested': return `<nav ${A(` data-script-id="${e.id}" aria-label="Menu" data-toggle="${esc(s.mobileMenu || 'mobile_portrait')}"`)}>${kids(k => (m[k] && m[k].name === 'block') ? { add: ['brx-nav-nested-items'], tag: 'ul', kid: () => ({ li: true }) } : null)}</nav>`;
        case 'dropdown': { const t = ctx.li ? 'li' : 'div'; if (s.megaMenu) cls.push('brx-has-megamenu'); return `<${t} ${A(` data-script-id="${e.id}"`)}><div class="brx-submenu-toggle"><span>${sanitizeHtml(s.text || '')}</span><button aria-expanded="false" aria-label="Åbn/luk dropdown">${BX_CARET}</button></div>${kids(() => ({ add: ['brx-dropdown-content'] }))}</${t}>`; }
        case 'toggle': if (s.animation) cls.push('brxa--' + s.animation); return `<button ${A(` data-script-id="${e.id}" aria-label="Åbn" aria-expanded="false"`)}>${s.icon ? bxIcon(s.icon) : '<span class="brxa-wrap"><span class="brxa-inner"></span></span>'}</button>`;
        case 'offcanvas': return `<div ${A(` data-script-id="${e.id}" aria-label="Offcanvas" data-direction="${esc(s.direction || 'left')}" data-effect="${esc(s.effect || 'slide')}"`)}>${kids(() => ({ add: ['brx-offcanvas-inner'] }))}<div class="brx-offcanvas-backdrop"></div></div>`;
        case 'svg': { const u = s.file && (s.file.url || s.file.full); return u ? `<img ${A()} src="${esc(u)}" alt="">` : `<svg ${A()}></svg>`; }
        default: return `<div ${A()}>${kids()}</div>`;
      }
    };
    rootsOf(sec.els).forEach((root, i) => { const out = r(root.id); html += i === 0 ? out.replace(/^<(\w+)/, `<$1 data-sec="${sec.uid}"`) : out; });
  }
  let clsCss = '';
  for (const id of usedClasses) { const c = CLASSES[id]; clsCss += BX.classes[c.name] !== undefined ? BX.classes[c.name] : bxGenCss('.' + c.name.replace(/[^a-zA-Z0-9_-]/g, '\\$&'), c.settings && !Array.isArray(c.settings) ? c.settings : {}); }
  return { html, css: clsCss + css };
}
// Hele iframe-dokumentet: jeres CSS/JS fra stocksitet + udkastets HTML/CSS. Iframen melder sin højde og klik tilbage med postMessage.
function bricksDoc(r, opts) {
  const o = opts || {}; const L = o.links || BX.links || { css: [], js: [] }; const fid = JSON.stringify(String(o.frameId || ''));
  // vh regnes om til enhedens skærmhøjde – iframen er lige så høj som indholdet, så 100vh ville ellers vokse med den
  const V = t => o.vh ? String(t).replace(/(-?\d*\.?\d+)[sdl]?vh\b/g, (x, n) => Math.round(parseFloat(n) * o.vh) / 100 + 'px') : String(t);
  const sel = `.udk-sel{outline:4px solid #225581!important;outline-offset:-4px;position:relative;z-index:2}${o.vh ? `:root{--bricks-vh:${o.vh / 100}px}` : ''}`;
  return `<!doctype html><html lang="da" data-brx-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${L.css.map(u => `<link rel="stylesheet" href="${esc(u)}">`).join('\n')}
<style>${V(o.theme !== undefined ? o.theme : BX.theme || '')}</style><style>${V(r.css)}</style>
<style>html{overflow:hidden}body{margin:0;overflow:visible!important}[data-sec]{cursor:pointer}${sel}${o.extraCss || ''}</style>
</head><body class="wp-singular page wp-theme-bricks wp-child-theme-bricks-child brx-body bricks-is-frontend">
<main id="brx-content">${V(r.html)}</main>
<script>window.bricksData=${JSON.stringify(BX.bricksData || {}).replace(/</g, '\\u003c')};
/* iframen er isoleret (sandbox uden same-origin), så localStorage er blokeret – Bricks' JS får en hukommelses-udgave i stedet */
(function(){var ok=true;try{window.localStorage.getItem('x')}catch(e){ok=false}if(ok)return;var m={},st={getItem:function(k){return k in m?m[k]:null},setItem:function(k,v){m[k]=String(v)},removeItem:function(k){delete m[k]},clear:function(){m={}},key:function(i){return Object.keys(m)[i]||null},get length(){return Object.keys(m).length}};
try{Object.defineProperty(window,'localStorage',{value:st,configurable:true});Object.defineProperty(window,'sessionStorage',{value:st,configurable:true})}catch(e){}})();<\/script>
${(o.scripts === false ? [] : L.js).map(u => `<script src="${esc(u)}"><\/script>`).join('\n')}
<script>(function(){var id=${fid},post=function(m){m.id=id;parent.postMessage(m,'*')};
var send=function(){post({udkast:'h',h:document.documentElement.scrollHeight})};
new ResizeObserver(send).observe(document.body);addEventListener('load',send);setTimeout(send,400);setTimeout(send,1500);
document.addEventListener('click',function(ev){if(ev.target.closest('a,button,input,textarea,select'))ev.preventDefault();var s=ev.target.closest('[data-sec]');if(s)post({udkast:'sel',uid:s.getAttribute('data-sec')})},true);
document.addEventListener('submit',function(ev){ev.preventDefault()},true);
addEventListener('message',function(ev){var d=ev.data||{};
if(d.udkast==='where'){var s=document.querySelector('[data-sec="'+d.uid+'"]');if(s)post({udkast:'top',uid:d.uid,top:s.getBoundingClientRect().top+scrollY})}
if(d.udkast==='sel'){[].forEach.call(document.querySelectorAll('.udk-sel'),function(x){x.classList.remove('udk-sel')});if(d.uid){var t=document.querySelector('[data-sec="'+d.uid+'"]');if(t)t.classList.add('udk-sel')}}});
addEventListener('load',function(){post({udkast:'ready'})});})();<\/script>
</body></html>`;
}

const API = { isBodyH2, isCtaText, hasForm, analyzeSite, guessBranche, renderBricks, bricksDoc, setBricks, libFromExports, keyAlias, clone, esc, stripTags, mapOf, rootsOf, walk, makeSection, applyOps, applyPhone, buildExport, validate, renderSections, buildFri, nativize, natRegister, setStock, stockify, videoify, sortKeys, localPlan, guessBranche, onlineClean, BS_VIDEO, loremify, loremText, fixH1, newestKeys, groupKeys, STOCK_BASE, secTitle, makeFri, normFri, groupInfoSec, setFriClasses, FRI_TYPES, FRI_STIL, SECTION_ONLY, makeSections, splitParts, parsePhone, classPrefix, setEnv, removeSubtree, categoryOf, displayName, describeKey, setMeta, variantsOf, nextVariant, allowedKeys, catList, sanitizePlan, TYPE_ORDER, WHOLE_PAGE, cleanSettings, resizeGroup, groupInfo, getGroups, FORM_ID, PH_URL, unitFix };
if (typeof module !== 'undefined') module.exports = API;
