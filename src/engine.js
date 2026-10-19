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
const TYPE_ORDER = ['Header', 'Ydelser', 'Anmeldelser', 'Cases', 'Priser', 'FAQ', 'Content', 'Galleri', 'Kontakt sektion', 'Underside', 'Marketing', 'CTA'];
const PREFIX_TYPE = { hero: 'Header', ydelse: 'Ydelser', anmeldelse: 'Anmeldelser', cases: 'Cases', priser: 'Priser', faq: 'FAQ', content: 'Content', kontaktsektion: 'Kontakt sektion', kontakformular: 'CTA', underside: 'Underside', geo: 'Marketing', viden: 'Marketing', seo: 'Marketing', blog: 'Marketing', galleri: 'Galleri', medarbejdere: 'Galleri', cta: 'CTA' };
const WHOLE_PAGE = new Set(['Underside', 'Marketing', 'Menu', 'Footer']);                   // hele sider: kun hvis der bedes om det
const SHEET_ALIAS = { underside: 'underside-1', 'seo-underside': 'seo-blogindlg', 'seo-blogindlaeg': 'seo-blogindlg' };
let META = {}; let MISSING = []; let CATS = {}, TITLES = {}; let SHEETDATE = {};
function setMeta(LIB, rows) {
  META = {}; MISSING = []; CATS = {}; TITLES = {}; DESCS = {}; SHEETDATE = {}; for (const k of Object.keys(LIB)) { if (LIB[k].cat) CATS[k] = LIB[k].cat; if (LIB[k].title) TITLES[k] = LIB[k].title; if (LIB[k].desc && !LIB[k].group) DESCS[k] = LIB[k].desc; }
  (rows || []).forEach((o, ri) => { if (!o) return; let k0 = SHEET_ALIAS[o.s] || o.s; if (!LIB[k0]) k0 = Object.keys(LIB).find(k => k.startsWith(o.s + '-')) || null; const m = String(o.d || '').match(/^(\d{2})-(\d{2})-(\d{4})$/); if (k0 && LIB[k0] && m && !SHEETDATE[k0]) SHEETDATE[k0] = { d: `${m[3]}-${m[2]}-${m[1]}`, i: ri }; });
  for (const o of rows || []) {
    if (!o || /^(Menu|Footer)$/i.test(o.t)) continue;
    let key = SHEET_ALIAS[o.s] || o.s; if (!LIB[key]) key = Object.keys(LIB).find(k => k.startsWith(o.s + '-')) || null;
    if (key && LIB[key] && !META[key]) META[key] = { name: o.n, type: o.t, desc: o.b || '', date: o.d || '', link: o.u || '' }; else MISSING.push(o);
  }
  return { matched: Object.keys(META).length, missing: MISSING };
}
const getMissing = () => MISSING;
const prefixOf = k => k.split('-')[0];
function categoryOf(key) { if (String(key).startsWith('ai-')) return 'AI sektion'; if (String(key).startsWith('fri-')) return 'Ny sektion'; if (CATS[key]) return CATS[key]; if (META[key]) return META[key].type; const p = prefixOf(key); return PREFIX_TYPE[p] || (p.charAt(0).toUpperCase() + p.slice(1)); }
function displayName(key) { if (String(key).startsWith('ai-')) return 'AI sektion'; if (String(key).startsWith('fri-')) return 'Ny · ' + ((FRI_TYPES[key.slice(4)] || {}).name || key); if (META[key]) return META[key].name; if (TITLES[key] && !/^[a-z]+-\d+$/.test(key)) return TITLES[key]; const m = key.match(/^([a-zæøå]+)-(\d+)/i); return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1) + ' #' + m[2] : key; }
let DESCS = {};
const describeKey = key => (META[key] && META[key].desc) || DESCS[key] || '';
const EXCLUDED_CATS = new Set(['Marketing']);                                  // GEO, blog og viden bruges ikke her
const EXCLUDED_KEYS = new Set(['seo-blogindlg', 'blog-underside', 'geo-underside', 'viden-geo']);
const allowedKeys = (LIB, auto) => Object.keys(LIB).filter(k => !EXCLUDED_CATS.has(categoryOf(k)) && !EXCLUDED_KEYS.has(k) && (!auto || categoryOf(k) !== 'CTA')).sort((a, b) => a.localeCompare(b, 'da', { numeric: true }));
const variantsOf = (LIB, cat) => allowedKeys(LIB).filter(k => categoryOf(k) === cat);
function catList(LIB) { const have = new Set(allowedKeys(LIB).map(categoryOf)); return TYPE_ORDER.filter(c => have.has(c)).concat([...have].filter(c => !TYPE_ORDER.includes(c)).sort()); }
function nextVariant(LIB, tpl, used) {
  const list = variantsOf(LIB, categoryOf(tpl)).filter(k => categoryOf(k) !== 'CTA'); if (list.length < 2) return null;
  const i = list.indexOf(tpl); const order = i < 0 ? list : list.slice(i + 1).concat(list.slice(0, i));
  return order.find(k => !used.includes(k)) || order[0];
}

/* ---------- tekst (kun til import af kundens egne tekster – ellers rører vi ikke tekst) ---------- */
const TEXT_KINDS = new Set(['heading', 'text-basic', 'text', 'button', 'text-link']);
const dynTag = t => /\{[a-z_][a-z0-9_:]*\}/i.test(t || '');
function htmlToPlain(h) {
  return String(h || '').replace(/<\/p>\s*/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n').replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(ul|ol)>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}
function plainToHtml(t) {
  const inline = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return String(t).trim().split(/\n{2,}/).map(p => {
    const lines = p.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length && lines.every(l => /^[-•]\s+/.test(l))) return '<ul>' + lines.map(l => '<li>' + inline(l.replace(/^[-•]\s+/, '')) + '</li>').join('') + '</ul>';
    return '<p>' + lines.map(inline).join('<br>') + '</p>';
  }).join('');
}
function spanText(html, cls) { const m = String(html).match(new RegExp('<span[^>]*class="[^"]*' + cls + '[^"]*"[^>]*>([\\s\\S]*?)</span>')); return m ? stripTags(m[1]) : null; }
function getSlots(els) {
  const out = [];
  walk(els, e => {
    if (!TEXT_KINDS.has(e.name)) return;
    const s = e.settings || {}; if (typeof s.text !== 'string' || !s.text.trim() || dynTag(s.text)) return;
    const slot = { id: e.id, kind: e.name };
    if (e.name === 'button') { const d = spanText(s.text, 'btn-text-default'); slot.text = d != null ? d : stripTags(s.text); }
    else if (e.name === 'text') slot.text = htmlToPlain(s.text); else slot.text = stripTags(s.text);
    if (e.name === 'heading') slot.tag = s.tag || 'h3';
    slot.len = slot.text.length; out.push(slot);
  });
  return out;
}
function applyText(e, text, hover) {
  const s = e.settings || (e.settings = {}); const t = String(text == null ? '' : text);
  if (e.name === 'text') s.text = plainToHtml(t);
  else if (e.name === 'button') {
    if (/btn-text-default/.test(s.text || '')) {
      s.text = s.text.replace(/(<span[^>]*class="[^"]*btn-text-default[^"]*"[^>]*>)[\s\S]*?(<\/span>)/, (m, a, b) => a + esc(t) + b);
      if (hover != null) s.text = s.text.replace(/(<span[^>]*class="[^"]*btn-text-hover[^"]*"[^>]*>)[\s\S]*?(<\/span>)/, (m, a, b) => a + esc(hover) + b);
    } else s.text = esc(t);
  } else s.text = esc(t.replace(/<[^>]*>/g, ''));
}

/* ---------- telefon (eneste automatiske tekst-ændring) ---------- */
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
function imgSlots(els) {
  const out = [];
  walk(els, e => {
    const s = e.settings || {};
    if (e.name === 'image' && s.image && typeof s.image === 'object') out.push({ id: e.id, kind: 'img', file: (s.image.filename || '').slice(0, 40) });
    else if (s._background && typeof s._background === 'object' && s._background.image) out.push({ id: e.id, kind: 'bg', file: ((s._background.image || {}).filename || '').slice(0, 40) });
  });
  return out;
}
const fileOf = u => decodeURIComponent(String(u).split('?')[0].split('/').pop() || 'billede');
function imageObj(img) { return { url: img.src, full: img.src, filename: img.file ? img.file.split('/').pop() : fileOf(img.src), size: 'full', external: true }; }
function siteBlocks(site, pageIdx) { const p = (site.pages || [])[pageIdx || 0] || { blocks: [], images: [] }; return p.blocks || []; }
function siteImages(site, pageIdx) {
  const p = (site.pages || [])[pageIdx || 0]; const own = (p && p.images) || []; const all = site.images || [];
  const seen = new Set(own.map(i => i.src)); return own.concat(all.filter(i => !seen.has(i.src)));
}
function siteSummary(site, pageIdx) {
  const bl = siteBlocks(site, pageIdx); const heads = bl.filter(b => /^h[1-3]$/.test(b.t)).slice(0, 30).map(b => `${b.t}: ${String(b.text).slice(0, 70)}`);
  return `Kundens eksisterende side (${(site.pages[pageIdx || 0] || {}).url || site.url}): ${bl.length} tekstblokke, ${siteImages(site, pageIdx).length} billeder.\nOverskrifter i rækkefølge:\n${heads.map(h => '- ' + h).join('\n')}`;
}
function contentSlotsText(sec) {
  const t = getSlots(sec.els).map(s => `  - ${s.id} (${s.kind}${s.tag ? ' ' + s.tag : ''}, ~${s.len} tegn nu): ${JSON.stringify(s.text.slice(0, 60))}`);
  const im = imgSlots(sec.els).map(s => `  - ${s.id} (${s.kind === 'bg' ? 'baggrundsbillede' : 'billede'})`);
  return (t.length ? '  TEKSTFELTER:\n' + t.join('\n') : '') + (im.length ? '\n  BILLEDFELTER:\n' + im.join('\n') : '');
}
function applyContent(sections, mapping, site, pageIdx) {
  const bl = siteBlocks(site, pageIdx), imgs = siteImages(site, pageIdx); const st = { texts: 0, images: 0 };
  for (const sec of sections) {
    const r = mapping && mapping.sektioner && mapping.sektioner[sec.uid]; if (!r) continue; const m = mapOf(sec.els);
    for (const [id, ref] of Object.entries(r.tekst || {})) {
      const e = m[id]; if (!e || !TEXT_KINDS.has(e.name)) continue;
      const idx = (Array.isArray(ref) ? ref : [ref]).filter(i => Number.isInteger(i) && bl[i]);
      if (!idx.length) continue;
      let text;
      if (e.name === 'text') {
        const parts = []; let list = [];
        const flush = () => { if (list.length) { parts.push(list.map(x => '- ' + x).join('\n')); list = []; } };
        for (const i of idx) { const b = bl[i]; if (b.t === 'li') list.push(b.text); else { flush(); parts.push(b.text); } }
        flush(); text = parts.join('\n\n');
      } else text = bl[idx[0]].text;
      applyText(e, text); st.texts++;
    }
    for (const [id, ref] of Object.entries(r.billeder || {})) {
      const e = m[id]; const img = Number.isInteger(ref) ? imgs[ref] : null; if (!e || !img) continue;
      if (e.name === 'image') { e.settings.image = imageObj(img); st.images++; sec.usedImages = (sec.usedImages || []).concat([img]); }
      else if (e.settings._background && e.settings._background.image) { e.settings._background.image = imageObj(img); st.images++; sec.usedImages = (sec.usedImages || []).concat([img]); }
    }
    sec.hasContent = true;
  }
  return st;
}


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
function cycleFri(sec) { const f = sec.fri; if (f.fri === 'split') { if (f.layout === 'billede-hoejre') f.layout = 'billede-venstre'; else { f.layout = 'billede-hoejre'; f.stil = FRI_STIL[(FRI_STIL.indexOf(f.stil) + 1) % 4]; } } else f.stil = FRI_STIL[(FRI_STIL.indexOf(f.stil) + 1) % 4]; rebuildFri(sec); }
function resizeFri(sec, n) {
  const T = FRI_TYPES[sec.fri.fri]; if (!T.n) return { ok: false, msg: 'Antallet kan ikke ændres her.' }; const from = sec.fri.antal; const m = Math.max(T.min, Math.min(T.max, n));
  sec.fri.antal = friSnap(sec.fri.fri, m, from); const fixed = normFri(sec.fri); Object.assign(sec.fri, fixed); rebuildFri(sec); return { ok: true, changed: m !== from, from, to: m, warn: [] };
}
const friGroupInfo = sec => { const T = FRI_TYPES[sec.fri.fri]; return T.n ? { n: sec.fri.antal, label: T.label, adjustable: true } : null; };


/* ============================================================================
   AI FORSLAG: Claude designer sektionerne selv (struktur + scopet CSS).
   Motoren renser alt, hvad AI'en skriver, og bygger gyldige Bricks-elementer.
   ============================================================================ */
const AI_EL = new Set(['container', 'block', 'div', 'heading', 'text', 'button', 'image', 'icon', 'counter']);
const AI_LEAF = new Set(['heading', 'text', 'button', 'image', 'icon', 'counter']);
const AI_MAX_NODES = 70, AI_MAX_CSS = 9500; let AIN = 0;

/* tolerant JSON: AI'en glemmer nogle gange at escape linjeskift i strenge */
function looseJson(text) {
  let s = String(text || '').trim(); s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, ''); const a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a < 0 || b < a) throw new Error('ingen JSON'); s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch (_) { }
  let out = '', inStr = false, esc = false;
  for (const ch of s) { if (inStr) { if (esc) { out += ch; esc = false; } else if (ch === '\\') { out += ch; esc = true; } else if (ch === '"') { out += ch; inStr = false; } else if (ch === '\n') out += '\\n'; else if (ch === '\r') out += ''; else if (ch === '\t') out += '\\t'; else out += ch; } else { out += ch; if (ch === '"') inStr = true; } }
  return JSON.parse(out);
}

/* ---------- CSS-rensning ---------- */
function splitTop(s, sep) { const out = []; let d = 0, q = '', cur = ''; for (const ch of s) { if (q) { cur += ch; if (ch === q) q = ''; continue; } if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; } if (ch === '(') d++; if (ch === ')') d = Math.max(0, d - 1); if (ch === sep && d === 0) { out.push(cur); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur); return out; }
function cssBlocks(css) { const out = []; let i = 0; while (i < css.length) { const open = css.indexOf('{', i); if (open < 0) break; let d = 1, j = open + 1; while (j < css.length && d > 0) { if (css[j] === '{') d++; else if (css[j] === '}') d--; j++; } out.push({ head: css.slice(i, open).trim(), body: css.slice(open + 1, d === 0 ? j - 1 : j) }); i = j; } return out; }
function sanitizeAiCss(css, ctx) {
  const warns = []; const vars = ctx.vars || new Set(); const clsMap = ctx.clsMap || {}; const localVars = new Set(); const kf = {};
  css = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\r/g, '').slice(0, AI_MAX_CSS * 2);
  for (const m of css.matchAll(/@(?:-webkit-)?keyframes\s+([\w-]+)/g)) if (!m[1].startsWith('u-')) kf[m[1]] = 'u-' + m[1];
  const okVar = v => vars.has(v);                                   // egne CSS-variabler er ikke tilladt
  function decl(d) {
    const i = d.indexOf(':'); if (i < 1) return ''; let prop = d.slice(0, i).trim().toLowerCase(), val = d.slice(i + 1).trim(); if (!prop || !val || val.length > 420) return ''; if (prop.startsWith('--')) { warns.push('egen CSS-variabel fjernet'); return ''; }
    if (/^(behavior|-moz-binding)$/.test(prop)) return '';
    if (prop === 'position' && /fixed/i.test(val)) { warns.push('position:fixed fjernet'); return ''; }
    if (/expression\s*\(|javascript:|@import|vbscript:/i.test(val)) return '';
    if (/url\s*\(/i.test(val) && !/url\s*\(\s*["']?(data:image\/svg\+xml|#)/i.test(val)) { warns.push('ekstern url() fjernet'); return ''; }
    if (prop === 'z-index' && Math.abs(parseInt(val, 10)) > 20) val = '20';
    val = val.replace(/\b100vw\b/g, '100%');
    val = palCss(val).replace(/var\(\s*--(?:primary|secondary|tertiary)-(\d{1,2})\s*\)/g, (m, n) => `color-mix(in srgb, var(--cta) ${n}%, transparent)`).replace(/var\(\s*--shadow-(?:xs|s)\s*\)/g, '0 2px 8px rgba(0,0,0,.10)').replace(/var\(\s*--shadow-m\s*\)/g, '0 8px 24px rgba(0,0,0,.12)').replace(/var\(\s*--shadow-(?:l|xl)\s*\)/g, '0 16px 40px rgba(0,0,0,.16)');   // ældre navne oversættes
    for (const m of val.matchAll(/var\(\s*(--[\w-]+)\s*(,|\))/g)) if (!okVar(m[1]) && m[2] === ')') { warns.push('ukendt variabel ' + m[1] + ' fjernet'); return ''; }
    if (/animation/.test(prop)) for (const [o, n] of Object.entries(kf)) val = val.replace(new RegExp('(^|[\\s,])' + o.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '(?![\\w-])', 'g'), '$1' + n);
    return prop + ':' + val;
  }
  function rules(blocks, depth) {
    let out = '';
    for (const b of blocks) {
      const h = b.head; if (!h) continue;
      if (/^@(?:-webkit-)?keyframes/i.test(h)) { const nm = (h.match(/keyframes\s+([\w-]+)/i) || [])[1]; if (!nm) continue; const n2 = nm.startsWith('u-') ? nm : 'u-' + nm; const frames = cssBlocks(b.body).map(f => `${f.head.replace(/[^0-9a-z%.,\s]/gi, '')}{${splitTop(f.body, ';').map(decl).filter(Boolean).join(';')}}`).join(''); out += `@keyframes ${n2}{${frames}}\n`; continue; }
      if (/^@media/i.test(h)) { if (depth > 0) continue; const cond = h.replace(/^@media\s*/i, ''); if (!/^(?:(?:\(\s*(?:max|min)-(?:width|height)\s*:\s*[\d.]+(?:px|em|rem)\s*\)|\(\s*prefers-reduced-motion\s*:\s*(?:reduce|no-preference)\s*\)|\(\s*hover\s*:\s*(?:hover|none)\s*\)|\(\s*pointer\s*:\s*(?:fine|coarse)\s*\)|and|\s)+)$/i.test(cond)) { warns.push('@media fjernet'); continue; } const inner = rules(cssBlocks(b.body), depth + 1); if (inner.trim()) out += `@media ${cond}{${inner}}\n`; continue; }
      if (h.startsWith('@')) { warns.push(h.split(/\s/)[0] + ' fjernet'); continue; }
      let sels = splitTop(h, ',').map(x => x.trim()).filter(Boolean).map(x => { for (const [o, n] of Object.entries(clsMap)) x = x.replace(new RegExp('\\.' + o + '(?![\\w-])', 'g'), '.' + n); return x; });
      sels = sels.map(x => /^(?:html|body|:root|\*)\b/.test(x) ? '' : (x.startsWith('%root%') ? x : '%root% ' + x)).filter(Boolean); if (!sels.length) continue;
      const ds = splitTop(b.body, ';').map(decl).filter(Boolean); if (!ds.length) continue;
      out += `${sels.join(',')}{${ds.join(';')}}\n`;
    }
    return out;
  }
  let out = rules(cssBlocks(css), 0); if (out.length > AI_MAX_CSS) { out = out.slice(0, AI_MAX_CSS); out = out.slice(0, out.lastIndexOf('}\n') + 2); warns.push('CSS afkortet'); }
  return { css: out, warns };
}

/* ---------- spec -> normaliseret spec ---------- */
function normAi(raw, vars) {
  if (!raw || typeof raw !== 'object') return null; let tree = raw.tree; if (Array.isArray(tree)) tree = { el: 'container', cls: 'u-wrap', kids: tree }; if (!tree || typeof tree !== 'object') return null;
  const clsMap = {}, clsSet = new Set(); let count = 0, img = 0, texts = 0; const warns = [];
  const cleanCls = s => String(s || '').split(/\s+/).map(x => x.replace(/[^a-zA-Z0-9_-]/g, '')).filter(Boolean).slice(0, 3).map(x => { if (x.startsWith('u-')) { clsSet.add(x); return x; } const n = 'u-' + x; clsMap[x] = n; clsSet.add(n); return n; });
  const walk = (n, depth) => {
    if (!n || typeof n !== 'object' || count >= AI_MAX_NODES || depth > 9) return null; const el = String(n.el || '').toLowerCase(); if (!AI_EL.has(el)) return null; count++;
    const o = { el, cls: cleanCls(n.cls) };
    if (el === 'heading') { o.tag = /^h[1-6]$/i.test(n.tag) ? String(n.tag).toLowerCase() : 'h2'; o.text = fstr(n.text, 170); if (!o.text) return null; }
    else if (el === 'text') { o.tag = ['p', 'span', 'div'].includes(n.tag) ? n.tag : 'p'; o.text = fstr(n.text, 560); if (!o.text) return null; }
    else if (el === 'button') { o.text = fstr(n.text, 32) || 'Kontakt os'; o.style = ['primary', 'secondary', 'dark', 'light'].includes(n.style) ? n.style : 'primary'; o.size = { m: 'md', md: 'md', l: 'lg', lg: 'lg', xl: 'xl' }[n.size] || 'lg'; o.link = n.link === 'telefon' ? 'telefon' : 'kontakt'; }
    else if (el === 'image') { o.alt = fstr(n.alt, 90); o.idx = img++; if (img > 12) return null; }
    else if (el === 'icon') o.icon = friIcon(n.name || n.icon) ? 'fas fa-' + (friIcon(n.name || n.icon).replace('fas fa-', '')) : 'fas fa-check';
    else if (el === 'counter') { o.to = fstr(n.to, 8).replace(/[^0-9]/g, '') || '100'; o.suffix = fstr(n.suffix, 4); o.prefix = fstr(n.prefix, 4); }
    else { o.tag = ['ul', 'ol', 'li', 'article', 'header', 'footer', 'blockquote'].includes(n.tag) ? n.tag : ''; o.kids = (Array.isArray(n.kids) ? n.kids : []).map(k => walk(k, depth + 1)).filter(Boolean); }
    return o;
  };
  const root = walk(tree, 0); if (!root || (root.el !== 'container' && root.el !== 'block' && root.el !== 'div')) return null;
  const countText = n => (n.el === 'heading' || n.el === 'text') ? 1 : (n.kids || []).reduce((s, k) => s + countText(k), 0); if (countText(root) < 1) return null;
  const cs = sanitizeAiCss(raw.css, { vars, clsMap }); cs.warns.forEach(w => warns.push(w));
  return { navn: fstr(raw.navn, 60) || 'AI sektion', tree: root, css: cs.css, warns, nodes: count };
}

/* ---------- spec -> Bricks-elementer ---------- */
const AI_BASE_CSS = `%root%{position:relative;overflow:hidden;overflow:clip;padding:var(--space-2xl) 0;background:var(--white);color:var(--font)}
%root% .u-wrap{width:min(1200px,90%);max-width:none;margin-left:auto;margin-right:auto;padding:0;position:relative}
%root% h1,%root% h2,%root% h3,%root% h4,%root% h5,%root% h6,%root% p{margin:0}
%root% img,%root% figure{display:block;max-width:100%;margin:0}
%root% ul,%root% ol{margin:0;padding:0;list-style:none}
`;
function aiNode(n) {
  const cls = n.cls.join(' '); const base = cls ? { _cssClasses: cls } : {};
  if (n.el === 'heading') return NODE('heading', Object.assign({ text: n.text, tag: n.tag }, base));
  if (n.el === 'text') return NODE('text-basic', Object.assign({ text: n.text, tag: n.tag }, base));
  if (n.el === 'image') return NODE('image', Object.assign({ tag: 'figure', _objectFit: 'cover', image: FRI_IMG[n.idx % FRI_IMG.length] }, base));
  if (n.el === 'icon') return NODE('icon', Object.assign({ icon: { library: 'fontawesomeSolid', icon: n.icon } }, base));
  if (n.el === 'counter') return NODE('counter', Object.assign({ countTo: n.to, suffix: n.suffix }, n.prefix ? { prefix: n.prefix } : {}, base));
  if (n.el === 'button') {
    const tel = n.link === 'telefon'; const gid = friClassId(FRI_BTN_CLASS); const st = Object.assign({ text: `<span class="btn-text-default">${esc(n.text)}</span> <span class="btn-text-hover">${esc(tel ? 'Ring nu' : 'Klik her')}</span>`, style: n.style, size: n.size, icon: { library: 'fontawesomeSolid', icon: tel ? 'fas fa-mobile-screen' : 'fas fa-arrow-right-long' }, iconPosition: 'right', link: tel ? { type: 'external', url: 'tel:+4588888888' } : { type: 'internal', url: '#' } }, base);
    if (gid) st._cssGlobalClasses = [gid]; return NODE('button', st);
  }
  const s = Object.assign({}, base); if (n.tag) s.tag = n.tag; return NODE(n.el, s, (n.kids || []).map(aiNode));
}
function buildAiRaw(spec) {
  let tree = spec.tree; if (!(tree.el === 'container')) tree = { el: 'container', cls: ['u-wrap'], kids: [tree] };
  const root = NODE('section', { _cssClasses: 'u u-ai', _cssCustom: AI_BASE_CSS + spec.css }, [aiNode(tree)], spec.navn);
  return friFlatten(root);
}
function buildAi(spec) { return natRegister(nativize(buildAiRaw(spec), spec.navn, 'sek')); }
function makeAi(raw, plan, vars) {
  const spec = normAi(raw, vars); if (!spec) return null;
  return { uid: 's' + (++UID) + Math.random().toString(36).slice(2, 5), tpl: 'ai-' + (++AIN), ai: { spec, plan: plan || {}, issues: [] }, why: (plan && (plan['formål'] || plan.formaal)) || '', part: 1, parts: 1, els: buildAi(spec) };
}
function rebuildAi(sec, raw, vars) { const spec = normAi(raw, vars); if (!spec) return false; sec.ai.spec = spec; sec.els = buildAi(spec); return true; }
const secTitle = sec => sec.ai ? 'AI · ' + sec.ai.spec.navn : displayName(sec.tpl);



/* ---------- AI FORSLAG: layoutgreb pr. sektionstype, valgt tilfældigt af motoren, så siderne ikke ligner hinanden ---------- */
const AI_ARCH = {
  hero: [
    ['h-split', 'Delt hero: tekst og knap på en stor farveflade til venstre, en høj billedflade til højre, der går helt ud til kanten.'],
    ['h-poster', 'Plakat: ét enormt ord eller en kort sætning i overskriften over hele bredden, lille intro og knap nederst, ingen billede.'],
    ['h-overlap', 'Tekstboks i brandfarven, der overlapper en stor billedflade (boksen starter midt i billedet og stikker ud over kanten).'],
    ['h-band', 'Hero med et bredt farvebånd tværs over midten, hvor overskriften står, og billedet fylder over og under båndet.'],
    ['h-card', 'Tekst til venstre og et løst "tilbudskort" til højre med tre korte punkter og en knap. Kortet har skygge og hælder en smule.'],
    ['h-dark', 'Helt mørk hero med tynde linjer som rammer, overskrift i store versaler, nøgletal i en række nederst.'],
    ['h-center', 'Centreret hero med en stor cirkel- eller bueform bag teksten (kun CSS) og to knapper under hinanden.'],
    ['h-stack', 'Overskriften i tre linjer, hvor hver linje har sin egen farve eller vægt; billedet som smal lodret strimmel i siden.'],
  ],
  services: [
    ['s-asym', 'Asymmetrisk 1+3: ét stort fremhævet kort til venstre (ca. halvdelen af bredden) og tre mindre kort stablet til højre.'],
    ['s-twocol', 'Tekstliste i to kolonner med tynde skillelinjer. Hver ydelse er overskrift, to linjers tekst og et lille tekstlink. Ingen ikoner.'],
    ['s-overlap', 'Brandfarvet flade i toppen af sektionen, hvor hvide kort ligger delvist henover kanten (negativ margin) i en række.'],
    ['s-mosaic', 'Mosaik med 2x2 flader i forskellig højde og skiftende baggrund (lys, mørk, brand, grå), titlen nederst i hver flade.'],
    ['s-iconsq', 'Fire brede bokse side om side med et stort ikon i en firkant, titel og tekst. Boksene har farvet top-kant.'],
    ['s-bigword', 'Typografisk: ydelserne som store ord i forskellig størrelse efter hinanden, med en lille forklaring under hvert ord.'],
    ['s-imgleft', 'Stor billedflade til venstre og en lodret liste til højre, hvor hver ydelse har et check-ikon, titel og én linje.'],
    ['s-alt', 'Kort der skiftende er lyse og mørke, med en lille nummer-chip i hjørnet og en pil nederst.'],
    ['s-table', 'Tabel-agtig liste: ydelsens navn til venstre, kort beskrivelse i midten, en pil til højre, og rækken skifter baggrund ved hover.'],
    ['s-rows', 'Nummererede rækker adskilt af tynde linjer med store tal i venstre kolonne.'],
  ],
  process: [
    ['p-hline', 'Vandret tidslinje: en tynd linje med firkantede markører og et trin under hver markør.'],
    ['p-vline', 'Lodret tidslinje med trin der skifter side (venstre/højre) om en midterlinje.'],
    ['p-stairs', 'Trappe: fire brede kort, hvor hvert kort ligger lidt længere nede og til højre end det forrige.'],
    ['p-cols', 'Fire kolonner med tynd top-linje, stort trin-nummer i brandfarven, overskrift og kort tekst.'],
    ['p-bands', 'Tre brede bånd under hinanden (før, under, efter) med skiftende baggrundsfarve og tekst i to kolonner.'],
    ['p-box', 'Intro til venstre og en stor boks til højre med trinene som en afkrydsningsliste.'],
    ['p-flow', 'Typografisk forløb: trinene som én lang sætning med store ord ("Først… så… derefter…") og små forklaringer.'],
    ['p-sticky', 'Venstre kolonne med titel er sticky, højre kolonne ruller trin for trin.'],
  ],
  proof: [
    ['f-four', 'Fire tal eller fakta i brede bokse med tynd ramme, stort tal og en kort label.'],
    ['f-strip', 'Smalt bånd med fire tillidspunkter og ikoner, adskilt af lodrette streger, i brandfarven.'],
    ['f-quote', 'Stor citat-flade med et kæmpe anførselstegn som grafik og afsender nederst.'],
    ['f-split', 'Todelt: stor påstand til venstre, tre faktabokse stablet til højre.'],
    ['f-badges', 'Række af runde mærker (garanti, tilbud, erfaring) med kort tekst under hvert.'],
    ['f-ladder', 'Tre fremhævede løfter i trappeform med store ord og en lille forklaring til hvert.'],
    ['f-marks', 'Overskrift til venstre og en række neutrale mærkater til højre (garantier eller medlemskaber som pladsholdere).'],
  ],
  about: [
    ['a-facts', 'Tekst og en lille historie til venstre, tre faktabokse i en række under.'],
    ['a-imgquote', 'Billedflade med en citatboks, der overlapper nederst, og teksten ved siden af.'],
    ['a-timeline', 'Kort tidslinje over firmaets vej med fire punkter.'],
    ['a-team', 'Fire personkort (billedflade, navn, titel) i en række med lidt forskudt placering.'],
    ['a-split', 'Fladen er delt skråt: tekst på den ene side og en stor billedflade på den anden.'],
  ],
  gallery: [
    ['g-masonry', 'Murstensgitter med billedflader i forskellige højder og en lille billedtekst.'],
    ['g-feature', 'Ét stort billede og fire små, med en tekstboks der overlapper det store.'],
    ['g-strip', 'Vandret række af billeder med scroll-snap, hvor kanten af næste billede ses.'],
    ['g-cards', 'Cases som kort med billede, titel, sted og en lille mærkat.'],
  ],
  cta: [
    ['c-flat', 'Stor farveflade med én kort sætning, en knap og et telefonnummer ved siden af.'],
    ['c-split', 'Tekst til venstre og kontaktkort til højre med telefon, mail og åbningstider.'],
    ['c-frame', 'Opfordringen i en ramme med tyk kant midt i sektionen, og stor luft omkring.'],
    ['c-ribbon', 'Smalt bånd i brandfarven med opfordringen til venstre og knappen til højre i én linje.'],
    ['c-poster', 'Stor mørk plakat med opfordringen i enorm skrift, en knap og en tynd ramme rundt.'],
    ['c-steps', 'Tre små kort (Ring, Skriv, Kom forbi) med kontaktoplysninger og en knap under.'],
  ],
  generic: [
    ['x-textimg', 'Tekst og billedflade side om side, hvor billedet er forskudt lodret i forhold til teksten.'],
    ['x-cards3', 'Tre kort i forskellig højde med en farvet markering.'],
    ['x-statement', 'Én stor sætning som hovedelement over hele bredden med lille tekst under.'],
    ['x-bento', 'Bento-gitter med fem celler i forskellige størrelser og indhold.'],
    ['x-list', 'Overskrift til venstre og en lodret liste af punkter til højre med tynde linjer.'],
    ['x-banner', 'Bred farveflade med en kort påstand og to små fakta ved siden af.'],
  ],
};
const AI_REGISTER = {
  hjoerner: ['kantede hjørner (radius none) overalt', 'bløde hjørner (--radius-m) på alle flader', 'store runde hjørner (--radius-xl) på kort og knapper', 'blandet: skarpe flader og enkelte helt runde accenter'],
  typo: ['fed og stram overskrift (font-weight 800, line-height 1)', 'let og luftig overskrift (font-weight 300, bredt linjeafstand)', 'versaler med bred letterspacing på små overskrifter og labels', 'stor størrelsesforskel: meget stor overskrift og meget lille brødtekst'],
  taethed: ['meget luft og få elementer', 'tæt og informationsrigt med små afstande', 'skiftende: luftige sektioner afbrudt af tætte'],
  farve: ['lys side med én kraftig brandfarveflade', 'mørk side (--dark) med brandfarven som accent', 'brandfarven som hovedflade i flere sektioner', 'næsten monokrom (sort, hvid, grå) med brandfarven kun på knapper og detaljer'],
};
function archPurpose(plan, idx) {
  const t = ((plan && plan.navn) || '') + ' ' + ((plan && plan['formål']) || ''); const s = t.toLowerCase();
  if (idx === 0 || /\bhero\b/.test(s)) return 'hero'; if (/ydelse|service|tilbyder|løsning|opgave|specialer/.test(s)) return 'services'; if (/proces|trin|sådan|forløb|fremgang|arbejdsgang/.test(s)) return 'process';
  if (/tal|bevis|tillid|erfaring|garanti|fordel|hvorfor|løfte|resultat/.test(s)) return 'proof'; if (/om os|historie|team|medarbejder|vi er|firmaet/.test(s)) return 'about'; if (/galleri|case|projekt|reference|billeder/.test(s)) return 'gallery'; if (/kontakt|opfordring|book|ring|tilbud/.test(s)) return 'cta'; return 'generic';
}
/* vælger ét layoutgreb pr. AI-sektion: aldrig samme greb to gange i samme udkast, og undgår dem, der blev brugt for nylig */
function pickArchetypes(plans, recent) {
  const used = new Set(), out = []; const rec = new Set(recent || []);
  plans.forEach((pl, idx) => {
    const purpose = archPurpose(pl, idx); const pool = (AI_ARCH[purpose] || []).concat(AI_ARCH.generic.filter(() => purpose !== 'generic' && Math.random() < 0.25));
    let cand = pool.filter(a => !used.has(a[0]) && !rec.has(a[0])); if (!cand.length) cand = pool.filter(a => !used.has(a[0])); if (!cand.length) cand = pool;
    const a = cand[Math.floor(Math.random() * cand.length)]; used.add(a[0]); out.push({ id: a[0], navn: a[0], beskrivelse: a[1], purpose });
  });
  return out;
}
function pickRegister() { const r = {}; for (const [k, v] of Object.entries(AI_REGISTER)) r[k] = v[Math.floor(Math.random() * v.length)]; return r; }

/* ---------- AI FORSLAG: variationsbibliotek og prompts ---------- */
const AI_DIRECTIONS = [
  ['Redaktionel typografi', 'Gigantiske overskrifter (clamp op til ca. 14vw), stram linjehøjde og stærk kontrast mellem fed og let vægt. Teksten ER grafikken.'],
  ['Asymmetrisk grid', '12-kolonne-grid med bevidst skæve placeringer. Tomrum er et designelement, og enkelte elementer brækker gitteret.'],
  ['Overlappende lag', 'Billeder, kort og tekst overlapper hinanden og sektionsgrænser. Negative marginer, z-index og dybde.'],
  ['Gigantiske tal', 'Store outline-tal, årstal eller trin bag indholdet som grafisk rygrad.'],
  ['Løbende bånd', 'Et bredt tekstbånd (CSS-animation) med nøgleord, brugt som skillelinje eller nederst i heroen.'],
  ['Sticky fortælling', 'To kolonner, hvor den ene er sticky, mens den anden scroller trin for trin.'],
  ['Rolig luksus', 'Meget luft, små versaler med bred letterspacing, tynde linjer, afdæmpede flader og store billeder.'],
  ['Brutalistisk', 'Hårde kanter, tykke streger, høj kontrast, store flader og uventede farveblokke.'],
  ['Blød og organisk', 'Store runde former, bløde blobs bygget af border-radius og gradienter, venlig tone.'],
  ['Bento-grid', 'Gitter med celler i forskellige størrelser, hvor hver celle har sit eget lille indhold. Gitteret skal gå op uden huller.'],
  ['Split-screen', '50/50-flader med skarpt skift i farve og indhold, gerne spejlet fra sektion til sektion.'],
  ['Diagonale skæringer', 'Skrå flader og clip-path-overgange mellem sektionerne.'],
  ['Blueprint-linjer', 'Tynde linjer, mål, nummerering og koordinater i en teknisk tegnings æstetik.'],
  ['Mørk glød', 'Mørk baggrund med bløde gradient-glød og glas-effekt (backdrop-filter), skarp hvid tekst.'],
  ['Før og efter', 'Layoutet fortæller kontrast: før/efter eller problem/løsning i to tydeligt forskellige halvdele.'],
  ['Tidslinje', 'Lodret tidslinje med knudepunkter og skiftende sider, som forløb eller historie.'],
  ['Manifest', 'En enkelt stor, modig sætning som sektionens hovedelement, uden pynt.'],
  ['Hover-afsløring', 'Kort og flader, der afslører mere indhold ved hover (og er fuldt læsbare uden hover).'],
  ['Mikro-labels', 'Små labels, tags, nummer-chips og tynde linjer som gennemgående rytme.'],
  ['Billedmasker', 'Billeder i uventede former (bue, pille, cirkel, afskåret hjørne) via border-radius og clip-path.'],
  ['Bånd gennem hero', 'Et bredt farvebånd, hvor teksten går ud over billedkanten.'],
  ['Kolonne-rytme', 'Siden skifter mellem 1, 2 og 3 kolonner, så rytmen aldrig bliver ens.'],
  ['Statement-flade', 'En helt mørk eller helt primær sektion midt på siden som bevidst kontrast til de lyse.'],
  ['Lag-på-lag dybde', 'Kort med bløde skygger og forskudte lag, der skaber fysisk dybde.'],
];
const AI_CONSTRAINTS = [
  'Ingen kort med ikon i en cirkel.', 'Højst to farver ud over de neutrale (hvid, sort, grå).', 'Heroen har kun én handling (én knap).',
  'Mindst én sektion bruger et gigantisk tal, bogstav eller ord som grafik.', 'Mindst én sektion brækker gitteret ved overlap.',
  'Overskrifterne i én sektion står i versaler med bred letterspacing.', 'Ingen centrerede overskrifter i heroen.',
  'Mindst én sektion bruger vandret scroll med scroll-snap på mobil.', 'En tynd linje-detalje går igen i alle sektioner.',
  'Siden har en uventet rækkefølge (fx proces før ydelser).', 'Mindst én sektion har bevidst meget luft og kun få elementer.',
  'Brug mindst to helt forskellige kolonneopdelinger.', 'Ingen billeder i heroen: tekst og form bærer den.', 'Én sektion er næsten sort, resten er lyse.',
];
const AI_CLICHES = ['tre ens kort med ikon i en cirkel i en række', 'centreret overskrift + undertekst + én blå knap som hero', 'floskler som "Velkommen til", "vi brænder for" og "din lokale partner"', 'alle sektioner centrerede og lige høje', 'baggrunden skifter bare mellem hvid og lysegrå uden andre greb'];
function pickCreative(nDir, nCon) { const sh = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]); return { dirs: sh(AI_DIRECTIONS).slice(0, nDir || 3), cons: sh(AI_CONSTRAINTS).slice(0, nCon || 2) }; }

function themeDoc() {
  return `Du må KUN bruge disse variabler. De findes på alle kundens sites; alt andet giver tomme flader og forsvundne farver.
Farver: --cta (kundens brandfarve og primære knapfarve; den er rød hos nogle kunder og blå hos andre, så design aldrig ud fra en bestemt nuance), --links (kundens mørkere sekundære brandfarve), --heading (overskrifter, næsten sort), --font (brødtekst, mørkegrå), --white (hvid), --dark (sort) og --light (hvid) med gennemsigtige nuancer --dark-5, --dark-10 … --dark-90 og --light-5, --light-10 … --light-90.
Lysegrå flader laves med --dark-5 eller --dark-10 (sort med lav dækning), og tynde linjer med --dark-10 eller --dark-20. Der findes INGEN --primary, --secondary, --bg-…, kantfarve- eller skygge-variabler: skriv skygger selv med rgba(0,0,0,.12).
Nuancer af brandfarven laves med color-mix(in srgb, var(--cta) 20%, transparent).
Skrift (flydende clamp-størrelser): --text-xs, --text-s, --text-m (brødtekst), --text-l, --text-xl, --text-2xl, --text-3xl, --text-4xl (store overskrifter). Til meget store overskrifter må du skrive egne clamp()-værdier.
Afstande: --space-4xs, --space-3xs, --space-2xs, --space-xs, --space-s, --space-m, --space-l, --space-xl, --space-2xl, --space-3xl, --space-4xl.
Radius: --radius-none, --radius-xs, --radius-s, --radius-m, --radius-l, --radius-xl, --radius-full.
Kundens theme: overskrifter er Montserrat (fed), brødtekst er Open Sans i 15px, og knapper har kantede hjørner (radius 0) med små paddings. Skal en knap eller overskrift se anderledes ud, så skriv det selv. Sæt ikke font-family.`;
}

const AI_RULES = `FORMAT: svar KUN med ét JSON-objekt (ingen forklaring, ingen markdown): {"navn":"kort navn","tree":{…},"css":"…"}. "css" er én JSON-streng; brug \\n til linjeskift og undgå dobbelte anførselstegn i CSS (brug enkelte).

TRÆET ("tree"). Rodnoden er normalt {"el":"container","cls":"u-wrap","kids":[…]} (u-wrap giver centreret indhold på 90% af bredden op til 1200px; udelad u-wrap, hvis sektionen bevidst går kant til kant). Tilladte elementer ("el"):
- container: yderste layoutboks. Felter: cls, kids.
- block: layoutboks. I Bricks er den som standard display:flex, flex-direction:column og width:100%. Felter: cls, kids, tag (valgfri: "ul","ol","li","article","header","footer","blockquote").
- div: neutral boks. Felter: cls, kids.
- heading: overskrift. Felter: text, tag ("h1" til "h6"), cls.
- text: afsnit eller span. Felter: text, tag ("p","span","div"), cls.
- button: knap. Felter: text, style ("primary","secondary","dark","light"), size ("md","lg","xl"), link ("kontakt" eller "telefon"), cls.
- image: billede (pladsholder, som brugeren selv udskifter). Felter: alt, cls.
- icon: ikon. Felter: name (fx "shield-halved","clock","hammer","check","star","location-dot","phone","leaf","bolt","heart","award","users","handshake","wrench","paint-roller","house","lightbulb","gear","gem","lock","truck","fire","droplet","sun"), cls.
- counter: tal der tæller op. Felter: to (heltal), suffix, cls.
Alle "cls" skal starte med "u-" (fx "u-hero-title"), højst 3 klasser pr. element. Ingen andre elementer eller felter. Maks 60 elementer. Overskrifter og tekster må ikke være tomme.

STRUKTUR (jeres Bricks-standard; sektionen omsættes automatisk til globale klasser med Bricks' egne indstillinger)
- Hierarki: section → container → block → div. Rodnoden er den ene container; alt indhold ligger i block-elementer (og div inde i dem). Brug aldrig en container inde i en container.
- Brug flex til layout. Brug kun grid, hvor flex ikke kan det (fx gitre med ens celler eller bento).
- Ingen egne CSS-variabler (--u-…). Brug kun temaets variabler.
- Alt der ændrer sig med skærmstørrelse skrives som @media (max-width:…) med PRÆCIS disse breakpoints (de bliver Bricks' egne): 1199px (liggende iPad), 991px (stående iPad), 767px (mobil liggende) og 478px (mobil). Brug ingen andre bredder og ingen min-width.
- Skriv hver klasses regler samlet i ÉN regel (%root% .u-x{…}) og brug simple selektorer. Sammensatte selektorer, :hover og ::before/::after må kun bruges til det, der ikke kan skrives som almindelig egenskab.
- Hold dig til egenskaber, Bricks kan sætte direkte: display, flex-direction, flex-wrap, align-items, justify-content, gap, grid-template-columns, width/min/max, height/min/max, padding, margin, background-color, color, font-size, font-weight, line-height, letter-spacing, text-transform, text-align, border, border-radius, position, top/right/bottom/left, z-index, overflow, opacity, aspect-ratio, object-fit, transform (kun rotate, translateX/Y, scale). Det Bricks ikke kan (gradient, clip-path, box-shadow, animation, text-stroke, backdrop-filter, ::before) skriver du sparsomt, og det lægges i klassens egen CSS.
- Giv hver klasse sin egen fulde styling. Undgå, at to klasser på samme element sætter samme egenskab (fx en basisklasse og en modifikatorklasse, der begge sætter top eller width). Brug i stedet ét element-specifikt klassenavn.

CSS-REGLER
1. Alle selektorer starter med %root% (sektionen). Eksempel: %root% .u-card{…}. Skriv aldrig regler uden %root%. Sektionens egen baggrund og padding sættes med %root%{…}.
2. Brug kun variablerne i TEMA til farver, størrelser, afstande og radius. Egne farvekoder er forbudt; brug color-mix(in srgb, var(--cta) 20%, transparent), gradienter af temaets variabler og rgba af hvid/sort. Skygger skrives med rgba.
3. Bricks sætter som standard container/block til display:flex; flex-direction:column; width:100%. Sæt derfor selv display, flex-direction eller grid-template-columns, gap, width og align-items eksplicit på hver layoutboks, du bruger. Brug minmax(0,1fr) i grids, så indhold ikke sprænger kolonnerne.
4. Responsivt er et krav og skal virke fra 360px til 1920px, med breakpointsene ovenfor. På mobil skal alt stakke til én kolonne (undtagen bevidst vandret scroll med scroll-snap) uden vandret overflow. Store typografistørrelser skal bruge clamp(). Brug aldrig vw til bredder; brug %. Ingen faste bredder, der kan blive bredere end skærmen. Gitre skal gå op: ingen tomme celler, medmindre det er bevidst.
5. Læsbarhed: kontrast mindst 4,5:1 mellem tekst og baggrund. Ligger tekst over et billede eller en farveflade, skal du selv sætte en mørk eller lys overlay-flade bagved. Brødtekst mindst var(--text-s).
6. Billeder: brug image-elementet og style det med %root% .u-x img{width:100%;height:100%;object-fit:cover}. Giv billedboksen en fast aspect-ratio eller højde. Skal tekst ligge over et billede, så læg billedet som absolut lag (position:absolute;inset:0;z-index:0) bag en overlay og indholdet med position:relative;z-index:2.
7. Bevægelse: kun CSS (transition, @keyframes, hover). Hold den rolig, og indhold må aldrig ligge skjult uden bevægelse. @keyframes skal hedde u-… Ingen JavaScript.
8. Forbudt: position:fixed, @import, @font-face, eksterne url(), z-index over 20, selektorer til body, html eller :root.
9. Knapper har temaets egen styling. Skal en knap se anderledes ud, så sæt reglerne på %root% .u-din-klasse og brug !important på de egenskaber, temaet ellers vinder over.
10. Overskrifter og afsnit har margin:0 fra start; styr afstande med gap og padding.
11. Sticky: position:sticky virker kun, hvis sektionen har %root%{overflow:clip} (aldrig overflow:hidden) og ingen forælder klipper. Giv den sticky kolonne align-self:start og et top-mål.
12. Lange ord: i smalle kolonner skal store overskrifter kunne ombrydes eller være små nok. Brug overflow-wrap:anywhere og hyphens:auto, eller clamp() med en rimelig øvre grænse, så ord som "kontaktperson" aldrig er bredere end kolonnen.
13. Intet indhold må ligge helt eller delvist skjult bag andre elementer. Når kort eller flader overlapper, skal teksten ligge i det øverste lag (z-index), og labels skal være frit synlige.

DESIGNKRAV
- Sektionen skal se designet ud og ikke som en skabelon: bevidst typografi (stor størrelsesforskel, vægt, versaler, linjehøjde), tydeligt hierarki, rytme af luft og tæthed, og ét gennemgående detalje-motiv fra konceptet.
- Brug konceptets retninger og begrænsninger konkret. Sektionen må ikke ligne en standardblok.
- Skriv ægte, konkret dansk tekst tilpasset kundens branche. Opfind aldrig fakta (antal år, priser, certifikater, kundenavne, rigtige citater). Tal er pladsholdere.
- Layoutet skal matche beskrivelsen i planen, ikke en gennemsnitlig version af den.
- Sektionen skal se flot ud UDEN fotos: billeder er grå pladsholdere, som kunden udskifter senere. Lad aldrig effekten afhænge af billeder, og brug ikke :has(), billedskift ved hover eller andre skrøbelige tricks.
- Vælg få, stærke greb pr. sektion (typografi, farveflade, form, rytme) frem for mange små effekter. Det skal se bevidst og rent ud i en rigtig Bricks-side, ikke fyldt med dekoration.
- Flader og former skal have en tydelig farve (--cta, --dark eller --light med nuance), så de også er synlige på sider med en anden brandfarve.

SELVTJEK FØR DU SVARER: alle cls starter med u-; alle selektorer starter med %root%; hver layoutboks har eksplicit display og retning; mobil er stakket uden overflow; kontrasten er høj nok; ingen tekst er skjult bag andre elementer eller bredere end sin kolonne; sticky-sektioner bruger overflow:clip; ingen opfundne fakta (heller ikke byer eller årstal); JSON er gyldig.

EKSEMPEL (viser kun FORMATET. Lav dit eget layout, din egen stil og dit eget greb):
{"navn":"Kort navn","tree":{"el":"container","cls":"u-wrap u-box","kids":[{"el":"heading","tag":"h2","text":"Overskrift","cls":"u-h"},{"el":"text","text":"Kort tekst.","cls":"u-p"},{"el":"button","text":"Kontakt os","link":"kontakt","style":"primary","cls":"u-btn"}]},"css":"%root%{background:var(--white);color:var(--font)}\n%root% .u-box{display:flex;flex-direction:column;gap:var(--space-s);align-items:flex-start}\n%root% .u-h{font-size:var(--text-3xl);color:var(--heading)}\n%root% .u-p{font-size:var(--text-m);line-height:1.6}"}`;

function aiConceptPrompt(b, LIB, USE, SITES, VARS, cr, recent, outline, reg) {
  const fn = new Set(['Header', 'Kontakt sektion', 'FAQ', 'Anmeldelser']);
  const cat = catalog(LIB, USE).split('\n').filter(l => fn.has(categoryOf(l.split(' | ')[0]))).join('\n');
  const insp = inspirationText(SITES, b.branche, b.sidetype, 8);
  return `Du er art director og senior webdesigner. Du skal finde på et vildt, unikt og gennemført designkoncept til et udkast til en hjemmeside, som bagefter bygges som sektioner i Bricks Builder. Målet er, at en kollega kigger på siden og siger: "wow, det her ligner ikke de andre". Siden skal være modig og tydelig, men stadig brugbar for kundens kunder.

OPGAVE
${briefText(b)}
${SIDETYPE_RULES[b.sidetype] || SIDETYPE_RULES['Forside']}
${outline && outline.length ? '\nKUNDENS NUVÆRENDE SIDE (sektioner i rækkefølge; brug den kun til at forstå emnerne, og lav gerne en meget bedre opbygning):\n' + outlineText(outline, LIB, USE) + '\n' : ''}
TEMA (siden bruger kundens tema)
${themeDoc()}

KREATIVE RETNINGER TIL DETTE UDKAST (kombinér og tolk dem, så de passer til kunden og branchen; giv dem gerne dit eget navn)
${cr.dirs.map(d => `- ${d[0]}: ${d[1]}`).join('\n')}

BEGRÆNSNINGER (skal overholdes)
${cr.cons.map(c => '- ' + c).join('\n')}

STILREGISTER FOR DETTE UDKAST (følg det på tværs af hele siden)
${reg ? Object.entries({ Hjørner: reg.hjoerner, Typografi: reg.typo, Tæthed: reg.taethed, Farve: reg.farve }).map(([k, v]) => `- ${k}: ${v}`).join('\n') : '- frit'}

UNDGÅ (klichéer og standardløsninger, medmindre konceptet direkte kræver dem)
${AI_CLICHES.map(c => '- ' + c).join('\n')}
- vandret løbende tekstbånd, store outline-tal i rækker og sticky venstre kolonne med trin (de er brugt til udmattelse)
${recent && recent.length ? '\nUNDGÅ AT LIGNE DE SENESTE KONCEPTER (de er allerede brugt)\n' + recent.map(r => '- ' + r).join('\n') + '\n' : ''}${insp ? '\n' + insp.replace('INSPIRATION:', 'INSPIRATION (kun til at forstå branchen; kopiér dem ikke):') + '\n' : ''}
SÅDAN ARBEJDER DU
1. Find ÉN stor idé, der binder siden sammen (en visuel metafor, et gennemgående greb eller en tone), og som passer til kundens branche og personlighed.
2. Beslut sektionerne i rækkefølge. Hold dig til antallet i sidetype-reglen, og højst 9 sektioner.
3. Sektionerne skal skabe rytme: veksl mellem tæt og luftig, lys og mørk, stor og lille typografi. To nabosektioner må ikke have samme opbygning.
4. For hver sektion skriver du formål, indhold og et KORT layoutforslag (højst 25 ord). Selve layoutgrebet bliver valgt bagefter, så vær ikke bundet af en bestemt opbygning, og beskriv ikke bånd, sticky kolonner eller store tal som standard.
5. Skriv den konkrete danske tekst til sektionen (overskrifter, afsnit, knapper, korte punkter). Tonen skal passe til branchen. Opfind aldrig fakta (antal år, priser, certifikater, kundenavne). Tal er pladsholdere.
6. Brug en færdig template (type "tpl") KUN, hvor funktion er nødvendig: kontakt med formular, FAQ med harmonika, anmeldelser og en hero med formular. Alt andet bygges som type "ai".
7. Første sektion er heroen og indeholder den ene H1.

KATALOG OVER FÆRDIGE TEMPLATES (kun de funktionelle; brug nøglen præcis som skrevet)
${cat}

SVAR KUN MED JSON:
{"koncept":{"navn":"kort navn på idéen","idé":"2-3 sætninger om den store idé","visuelt_sprog":"konkret: typografi, former, farveanvendelse, billedbrug og bevægelse","rytme":"hvordan siden veksler mellem lys/mørk og tæt/luftig","uforglemmeligt":"det ene, man husker"},"sektioner":[{"type":"ai","navn":"kort navn","formål":"hvad sektionen skal opnå","layout":"kort layoutforslag, højst 25 ord","indhold":"den konkrete danske tekst og elementer","stil":"lys|graa|primaer|moerk|billede"},{"type":"tpl","tpl":"kontaktsektion-2","navn":"Kontakt","hvorfor":"max 12 ord"}]}`;
}

function aiSectionPrompt(b, concept, plan, idx, plans, VARS, prev, instruktion, arch, reg) {
  const names = plans.map((p, i) => `${i + 1}. ${p.navn || p.tpl || '?'}${p.stil ? ' (' + p.stil + ')' : ''}${i === idx ? '  ← DEN DU SKAL BYGGE' : ''}`).join('\n'); const k = concept.koncept || {};
  return `Du er senior front-end-designer og bygger ÉN sektion til et udkast til en hjemmeside i Bricks Builder. Du får designkonceptet og planen for sektionen, og du leverer sektionens struktur og CSS som JSON.

KUNDE OG SIDE
${briefText(b)}

DESIGNKONCEPT (hele siden følger det)
Navn: ${k.navn || ''}
Idé: ${k['idé'] || ''}
Visuelt sprog: ${k.visuelt_sprog || ''}
Rytme: ${k.rytme || ''}
Det uforglemmelige: ${k.uforglemmeligt || ''}

SIDENS SEKTIONER I RÆKKEFØLGE
${names}

DIN SEKTION (nr. ${idx + 1} af ${plans.length})
Navn: ${plan.navn || ''}
Formål: ${plan['formål'] || ''}
Layoutforslag fra planen (kun inspiration): ${plan.layout || ''}
Indhold og tekst: ${plan.indhold || ''}
Stil: ${plan.stil || ''}
${arch ? `\nLAYOUTGREB DU SKAL BRUGE (overstyrer planens layoutforslag; tilpas det til indholdet, men grundgrebet skal tydeligt kunne genkendes): ${arch.beskrivelse}\n` : ''}${reg ? `STILREGISTER (hele siden følger det): hjørner ${reg.hjoerner}; typografi ${reg.typo}; tæthed ${reg.taethed}; farve ${reg.farve}.\n` : ''}${idx === 0 ? 'Dette er sidens hero: den indeholder sidens ENESTE H1.' : 'Brug ikke H1 (brug h2 til sektionsoverskriften).'}
${prev ? `\nFORRIGE VERSION (lav en tydeligt anderledes opbygning og et andet layoutgreb, men samme formål, og behold den gode tekst):\n${JSON.stringify(prev).slice(0, 5000)}\n` : ''}${instruktion ? `\nÆNDRING DER ØNSKES (har forrang): ${instruktion}\n` : ''}
TEMA
${themeDoc()}

${AI_RULES}`;
}

function aiRepairPrompt(b, raw, issues, VARS) {
  return `Du er senior front-end-designer. En sektion, du har bygget, er blevet tjekket automatisk i en browser, og tjekket fandt problemer. Ret KUN det, der er nødvendigt for at løse problemerne. Behold idé, layout, tekst og stil, så langt det er muligt.

PROBLEMER
${issues.map(i => '- ' + i).join('\n')}

SEKTIONEN (JSON)
${JSON.stringify(raw).slice(0, 9000)}

TEMA
${themeDoc()}

${AI_RULES}

Svar med den rettede sektion som ét JSON-objekt i samme format.`;
}


/* ============================================================================
   NATIVISERING: omsætter sektionens CSS til jeres struktur.
   Styling lægges i globale klasser med Bricks' egne indstillinger (_display, _padding, _typography …),
   media queries bliver til Bricks' breakpoints, og kun det Bricks ikke kan natively ligger i klassens egen CSS.
   Hierarki: section → container → block → div.
   ============================================================================ */

/* Portable tokens fra jeres Bricks-palette (findes på både templates-sitet og stock-sites): --cta (brand, rød/blå), --links, --heading, --font, --white
   plus --dark/--light med nuancer og jeres space-/text-/radius-variabler. Ældre navne (--primary osv.) oversættes automatisk. */
const TOKEN_MAP = { '--primary': 'var(--cta)', '--secondary': 'var(--links)', '--tertiary': 'var(--links)', '--text-title': 'var(--heading)', '--text-body': 'var(--font)', '--bg-surface': 'var(--white)', '--bg-body': 'var(--dark-5)', '--border-primary': 'var(--dark-20)', '--success': 'var(--cta)', '--error': 'var(--cta)' };
const palCss = s => String(s).replace(/var\(\s*(--[\w-]+)\s*\)/g, (m, n) => TOKEN_MAP[n] || m);
const colObj = v => ({ raw: palCss(String(v).trim()) });
const AI_SAFE_VARS = new Set([...['4xs', '3xs', '2xs', 'xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'].map(x => '--space-' + x), ...['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'].map(x => '--text-' + x), '--radius-none', '--radius-xs', '--radius-s', '--radius-m', '--radius-l', '--radius-xl', '--radius-full', '--dark', '--light', ...[5, 10, 20, 30, 40, 50, 60, 70, 80, 90].flatMap(n => ['--dark-' + n, '--light-' + n]), '--cta', '--links', '--heading', '--font', '--white']);
function aiVarNames() { return AI_SAFE_VARS; }
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
function makeSections(LIB, tpl, why, tlf) {
  const parts = WHOLE_PAGE.has(categoryOf(tpl)) ? [LIB[tpl].els] : splitParts(LIB[tpl].els);
  return parts.map((els, i) => { const s = { uid: 's' + (++UID) + Math.random().toString(36).slice(2, 5), tpl, why: i === 0 ? (why || '') : '', els: clone(els), part: i + 1, parts: parts.length }; if (tlf) applyPhone(s.els, tlf); if (isSiteOnline(LIB, tpl)) { onlineClean(s.els); loremify(s.els, true); stockify(s.els, true); } else { loremify(s.els); stockify(s.els); } return s; });
}
function makeSection(LIB, tpl, why, tlf) { const s = { uid: 's' + (++UID) + Math.random().toString(36).slice(2, 5), tpl, why: why || '', els: clone(LIB[tpl].els) }; if (tlf) applyPhone(s.els, tlf); if (isSiteOnline(LIB, tpl)) { onlineClean(s.els); loremify(s.els, true); stockify(s.els, true); } else { loremify(s.els); stockify(s.els); } return s; }




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
const natNum = k => { const m = String(k).match(/(\d+)/g); return m ? +m[m.length - 1] : 0; };
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
function guessBranche(name, msg, SITES) {
  const nm = String(name || '').toLowerCase(), mg = String(msg || '').toLowerCase(); const score = {};
  for (const [b, re] of BRANCH_KW) { let s = 0; if (re.test(mg)) s += 4; if (re.test(nm)) s += 3; if (s) score[b] = s; }
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0]; if (best) return { b: best[0], via: re_test(BRANCH_KW, best[0], mg) ? 'konteksten' : 'navnet' };
  const words = nm.split(/[^a-zæøå0-9]+/).filter(w => w.length >= 3); const pool = (SITES || []).filter(s => s.b && !/uklar/i.test(s.b));
  const hit = pool.filter(s => words.some(w => String(s.n).toLowerCase().includes(w))); if (hit.length) return { b: hit[Math.floor(Math.random() * hit.length)].b, via: 'navnet (ligner et kendt site)' };
  const all = pool.map(s => s.b); return all.length ? { b: all[Math.floor(Math.random() * all.length)], via: 'tilfældigt' } : { b: '', via: 'tilfældigt' };
}
const re_test = (kw, b, text) => { const x = kw.find(k => k[0] === b); return !!(x && x[1].test(text)); };
function siteInfo(LIB, k) { const t = LIB && LIB[k]; return t && t.site ? { site: t.site, url: t.url || '', branche: t.branche || '', added: t.added || '' } : null; }
function localPlan(b, LIB, n, existing, SITES) {
  const keys = allowedKeys(LIB, true); const used = new Set([].concat(...(existing || []))); const msg = String((b && b.msg) || '').toLowerCase(); const type = (b && b.sidetype) || 'Forside'; const has = re => re.test(msg);
  const gb = b && b.branche ? { b: b.branche, via: 'dit valg' } : guessBranche(b && b.navn, b && b.msg, SITES); const team = has(/medarbejder|team|folk/);
  const DEF = type === 'Hero' ? ['Header'] : type === 'Menu' ? ['Menu'] : type === 'Underside' ? ['Header', 'Content', 'Ydelser', 'FAQ', 'Kontakt sektion'] : ['Header', 'Ydelser', 'Content', 'Anmeldelser', 'FAQ', 'Kontakt sektion'];
  const OK = new Set(['Header', 'Ydelser', 'Content', 'Anmeldelser', 'FAQ', 'Kontakt sektion', 'Galleri', 'Cases', 'Priser']);
  const sameSites = type === 'Forside' ? (SITES || []).filter(s => s.b === gb.b && Array.isArray(s.c) && s.c.length >= 4) : [];
  const names = ['Klassisk', 'Rolig', 'Luftig', 'Kraftig', 'Enkel']; const base = (existing || []).length; const forslag = []; const usedSites = new Set();
  for (let i = 0; i < n; i++) {
    let cats = DEF.slice(), basis = '';
    if (sameSites.length) { const fresh = sameSites.filter(s => !usedSites.has(s.n)); const s = (fresh.length ? fresh : sameSites)[Math.floor(Math.random() * (fresh.length ? fresh : sameSites).length)]; usedSites.add(s.n);
      let c = s.c.filter(x => OK.has(x)); const out = []; for (const x of c) { if (out[out.length - 1] !== x) out.push(x); } while (out.length > 8) out.splice(1 + Math.floor(Math.random() * (out.length - 2)), 1);
      if (out.length >= 4) { if (out[0] !== 'Header') out.unshift('Header'); if (out[out.length - 1] !== 'Kontakt sektion') out.push('Kontakt sektion'); cats = out; basis = s.n; } }
    if (type !== 'Hero' && type !== 'Menu') {
      const add = (cat, after) => { if (!cats.includes(cat)) { const k = cats.indexOf(after); cats.splice(k < 0 ? cats.length - 1 : k + 1, 0, cat); } };
      if (has(/pris|abonnement/)) add('Priser', 'Ydelser'); if (has(/\bcase|projekt|reference/)) add('Cases', 'Content'); if (has(/galleri|billeder|fotos/) || team) add('Galleri', 'Content');
      if (has(/uden faq|ingen faq/)) cats = cats.filter(c => c !== 'FAQ'); if (has(/uden anmeld|ingen anmeld/)) cats = cats.filter(c => c !== 'Anmeldelser');
    }
    const mine = new Set(); const sek = [];
    for (const c of cats) {
      let pool = keys.filter(k => categoryOf(k) === c); if (c === 'Galleri') pool = pool.filter(k => (team ? /^medarbejdere/ : /^galleri/).test(k) || (LIB[k] && LIB[k].group === 'Live sektioner'));
      if (!pool.length) continue; let fresh = pool.filter(k => !used.has(k) && !mine.has(k)); if (!fresh.length) fresh = pool.filter(k => !mine.has(k)); if (!fresh.length) fresh = pool;
      const wts = fresh.map(k => { const t = LIB[k] || {}; return t.group === 'Live sektioner' && t.site ? (t.branche && t.branche === gb.b ? 4 : 1.8) : 1; }); const tot = wts.reduce((a, x) => a + x, 0); let r = Math.random() * tot, pick = fresh[0];
      for (let q = 0; q < fresh.length; q++) { r -= wts[q]; if (r <= 0) { pick = fresh[q]; break; } }
      mine.add(pick); sek.push({ tpl: pick, hvorfor: LIB[pick] && LIB[pick].site ? 'Rigtig sektion fra ' + LIB[pick].site : 'Standardopbygning' });
    }
    mine.forEach(k => used.add(k));
    forslag.push({ navn: names[(base + i) % names.length], note: 'Lavet uden Claude · branche gættet: ' + (gb.b || 'ukendt') + ' (ud fra ' + gb.via + ')' + (basis ? ' · opbygning som ' + basis : ''), sektioner: sek, gaet: gb });
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
    const e = clone(m[oid]); e.id = idMap[oid]; e.parent = oid === rootId ? m[oid].parent : idMap[m[oid].parent]; e.children = (e.children || []).map(c => idMap[c]);
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
const groupSize = els => { const g = primaryGroup(els); return g ? g.items.length : 0; };
function fixExtraH1(sections) { let seen = false, n = 0; for (const s of sections) for (const e of s.els) if (e.name === 'heading' && (e.settings || {}).tag === 'h1') { if (!seen) seen = true; else { e.settings.tag = 'h2'; n++; } } return n; }
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
const rootCount = els => rootsOf(els).filter(e => e.name !== 'code').length;
function featsOf(LIB, key) {
  const els = LIB[key].els; const c = n => els.filter(e => e.name === n).length; const gi = groupInfo(els, key);
  const bg = els.filter(e => e.settings && e.settings._background && e.settings._background.image).length;
  return { cat: categoryOf(key), n: gi && gi.adjustable ? gi.n : 0, i: c('image') + bg * 0.5, b: c('button'), t: c('text') + c('text-basic'), k: c('counter'), form: els.some(e => e.name === 'form' || (e.name === 'template' && String(e.settings.template) === '1699')), list: c('list') + els.filter(e => e.name === 'text' && /<ul/i.test((e.settings || {}).text || '')).length };
}
function suggestForOutline(o, LIB, used, USE) {
  const cat = o.c; if (!cat || cat === 'CTA' || WHOLE_PAGE.has(cat)) return [];
  const list = variantsOf(LIB, cat).filter(k => rootCount(LIB[k].els) === 1);
  const sc = list.map(k => {
    const f = featsOf(LIB, k); let s = 0;
    if (o.f) s += f.form ? 3 : -1; else if (f.form) s -= 0.6;
    if (o.n > 0) { if (f.n === o.n) s += 3; else if (f.n > 0) s += 1 - 0.25 * Math.abs(f.n - o.n); else s -= 1; } else if (f.n >= 3 && cat === 'Content') s -= 0.8;
    s -= 0.5 * Math.abs(f.i - Math.min(o.i || 0, 6)); s -= 0.4 * Math.abs(f.b - Math.min(o.b || 0, 3));
    if (o.l > 0) s += f.list ? 1.2 : -0.3;
    if (f.k > 0) s += o.k > 0 ? 1.2 : -1.8;                                   // tællere kun hvis siden har tællere
    if (typeof o.p === 'number') s -= 0.2 * Math.abs(f.t - Math.min(o.p + 1, 6));
    s -= 1.5 * used.filter(u => u === k).length; if (USE && USE[k]) s += Math.min(USE[k][0], 20) * 0.03;
    return [k, s];
  }).sort((a, b) => b[1] - a[1]);
  return sc.map(x => x[0]);
}
function mirrorSections(outline, LIB, tlf, USE) {
  const used = [], out = [];
  for (const o of outline || []) {
    if (!o || !o.c || o.c === 'CTA') continue; const cand = suggestForOutline(o, LIB, used, USE); if (!cand.length) continue;
    const key = cand[0]; used.push(key); const secs = makeSections(LIB, key, `Spejler «${String(o.h || o.c).slice(0, 40)}»`, tlf);
    if (o.n > 0) { const gi = groupInfo(secs[0].els, key); if (gi && gi.adjustable && gi.n !== o.n) { const r = resizeGroup(secs[0], o.n, ENV.CLASSES); if (r.ok) secs[0].warns = r.warn; } }
    out.push(...secs);
  }
  return out;
}
function outlineText(outline, LIB, USE) {
  const used = [];
  return (outline || []).map((o, i) => {
    if (!o) return ''; const sug = suggestForOutline(o, LIB, used, USE).slice(0, 3); if (sug[0]) used.push(sug[0]);
    const bits = []; if (o.f) bits.push('formular'); if (o.n) bits.push(o.n + ' kort/elementer'); if (o.l) bits.push(o.l + ' punkter i liste'); if (o.k) bits.push(o.k + ' tællere'); if (typeof o.p === 'number') bits.push(o.p + ' afsnit'); bits.push((o.i || 0) + ' billeder'); bits.push((o.b || 0) + ' knapper');
    return `${i + 1}. ${o.c}${o.h ? ' – «' + String(o.h).slice(0, 50) + '»' : ''} – ${bits.join(', ')}${sug.length ? ' → foreslåede templates: ' + sug.join(', ') : (o.c === 'CTA' ? ' → (CTA, udelades)' : '')}`;
  }).filter(Boolean).join('\n');
}
function findSite(SITES, name) {
  if (!name) return null; const q = name.toLowerCase().trim();
  return SITES.find(x => x.n.toLowerCase() === q) || SITES.find(x => x.n.toLowerCase().includes(q) || x.u.toLowerCase().includes(q)) || null;
}
function outlineFromImport(site, pageIdx) {
  const bl = siteBlocks(site, pageIdx); const imgs = (site.pages[pageIdx || 0] || {}).images || []; const segs = []; let cur = null;
  bl.forEach((b, idx) => { if (b.t === 'h1' || b.t === 'h2' || !cur) { cur = { start: idx, h: (b.t === 'h1' || b.t === 'h2') ? b.text : '', blocks: [] }; segs.push(cur); } cur.blocks.push(b); });
  return segs.map((s, i) => {
    const next = segs[i + 1] ? segs[i + 1].start : bl.length; const t = s.blocks; const n = t.filter(b => b.t === 'h3' || b.t === 'h4').length; const li = t.filter(b => b.t === 'li').length;
    const btn = t.filter(b => b.t === 'btn').length; const par = t.filter(b => b.t === 'p').length; const im = imgs.filter(x => typeof x.at === 'number' && x.at >= s.start && x.at < next).length; const txt = t.map(b => b.text).join(' ').toLowerCase();
    let c = 'Content'; const last = i >= segs.length - 2;
    if (i === 0) c = 'Header'; else if (/\bfaq\b|ofte stillede|spørgsmål/.test(txt)) c = 'FAQ'; else if (/anmeld|udtalelser|trustpilot|kunderne siger|siger om os/.test(txt)) c = 'Anmeldelser'; else if (n >= 2 && /\bpris|pakke/.test(txt)) c = 'Priser';
    else if (/\bcase|projekter|referenc|vores arbejde/.test(s.h.toLowerCase()) && im >= 3) c = 'Cases'; else if (last && /kontakt/.test(s.h.toLowerCase()) && par <= 2) c = 'Kontakt sektion'; else if (n >= 3) c = 'Ydelser'; else if (par === 0 && btn >= 1 && t.length <= 3) c = 'CTA';
    return { c, h: s.h, n: c === 'Ydelser' || c === 'Cases' || c === 'Priser' ? n : 0, i: im, b: btn, f: false, l: n ? 0 : li, p: par, k: 0 };
  });
}

/* ---------- operationer (AI-redigering) ---------- */
const SETTING_WHITELIST = new Set(['_background', '_typography', '_padding', '_margin', '_direction', '_alignItems', '_justifyContent', '_width', '_widthMax', '_widthMin', '_heightMin', '_height', '_rowGap', '_columnGap', '_border', '_flexWrap', '_gradient']);
function applyOps(state, ops, LIB, tlf, CLASSES) {
  const log = [], added = [], warns = [];
  const secs = state.sections; const at = i => (Number.isInteger(i) && i >= 1 && i <= secs.length) ? secs[i - 1] : null;
  const okFor = op => !!LIB[op.tpl] && (op.manual || categoryOf(op.tpl) !== 'CTA');
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
      const old = e.id; e.id = idMap[old];
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
const vh = v => String(v).replace(/(\d+(?:\.\d+)?)vh/g, (m, n) => Math.round(parseFloat(n) * 6.4) + 'px');
const px = v => { if (v === undefined || v === null || v === '') return null; if (typeof v === 'number') return v + 'px'; v = String(v).trim(); if (/^-?\d+(\.\d+)?$/.test(v)) return v + 'px'; return vh(v); };
const colorOf = c => { if (!c) return null; if (typeof c === 'string') return c; return c.raw || c.rgb || c.hsl || c.hex || null; };
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
    if (bg.image || bg.videoUrl) { layers.push(`url("${stockPrev(bg.image)}")`); set('background-size', bg.size || 'cover'); set('background-position', bg.position || 'center'); set('background-repeat', 'no-repeat'); }
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

const BASE_CSS = `
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
`;
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
        case 'rating': return `<div ${attr}>${'★'.repeat(Math.max(1, Math.min(5, parseInt(s.rating, 10) || 5)))}</div>`;
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
const KIND_DESC = { hero: 'Hero/topsektion', ydelse: 'Ydelser/tjenester', anmeldelse: 'Anmeldelser', cases: 'Cases/referencer', faq: 'FAQ', kontaktsektion: 'Kontaktsektion', kontakformular: 'Kontaktformular', priser: 'Priser', content: 'Indholdssektion', underside: 'HEL underside (flere sektioner)', geo: 'GEO-lokationsside (hel side)', seo: 'SEO-blogindlæg (hel side)', blog: 'Blog-oversigt (hel side)', viden: 'Viden/GEO-hub (hel side)' };
function catalog(LIB, USE) {
  return allowedKeys(LIB, true).map(k => {
    const els = LIB[k].els; const roots = rootsOf(els).filter(e => e.name !== 'code').length; const cnt = n => els.filter(e => e.name === n).length;
    const u = USE[k] || [0, 0]; const cat = categoryOf(k);
    const bits = [`${displayName(k)} · type ${cat}${WHOLE_PAGE.has(cat) ? ' (HEL side)' : ''}`, roots > 1 ? roots + ' sektioner' : '1 sektion'];
    if (cnt('button')) bits.push(cnt('button') + ' knap(per)'); if (cnt('image')) bits.push(cnt('image') + ' billede(r)');
    const gi = groupInfo(els, k); if (gi && gi.adjustable) bits.push('har ' + gi.n + ' ' + gi.label + ' (antal kan ændres)'); if (cnt('form') || cnt('template')) bits.push('indeholder formular');
    const d = describeKey(k);
    return `${k} | ${bits.join(', ')}${d ? ' | beskrivelse: ' + d : ''} | brugt af ${u[0]} sites (sikker, klasse) / ${u[1]} (usikker, struktur)`;
  }).join('\n');
}
function refSites(SITES, branche) {
  let list = SITES.filter(s => s.b === branche);
  if (list.length < 5) list = list.concat(SITES.filter(s => s.b !== branche && s.k.length).sort((a, b) => b.k.length - a.k.length).slice(0, 8));
  return list.filter(s => (s.c && s.c.length) || s.k.length || s.s.length).slice(0, 12).map(s => (s.c && s.c.length) ? `- ${s.n} (${s.b}): sektioner i rækkefølge [${s.c.join(' → ')}]` : `- ${s.n} (${s.b}): klasse-templates [${s.k.filter(k => categoryOf(k) !== 'CTA').join(', ')}] · sektionsrækkefølge [${s.s.filter(k => categoryOf(k) !== 'CTA').join(' → ')}]`).join('\n');
}
const briefText = b => `Kunde: ${b.navn || '(ikke angivet)'}\nSidetype: ${b.sidetype || 'Forside'}\nFrihed: ${FRIHED_LABEL[b.frihed || 'mix']}${b.branche ? '\nBranche: ' + b.branche : ''}\nBrugerens ønske (fritekst, skrevet som til en kollega):\n${b.msg || '(intet – vælg selv en fornuftig forside)'}`;

function typicalOrder(SITES) {
  const have = SITES.filter(s => Array.isArray(s.c) && s.c.length >= 3); if (have.length < 30) return '';
  const pos = {}; for (const s of have) { const n = s.c.length; s.c.forEach((c, i) => { (pos[c] = pos[c] || []).push(i / (n - 1 || 1)); }); }
  const avg = Object.entries(pos).map(([c, a]) => [c, a.reduce((x, y) => x + y, 0) / a.length, a.length]).filter(x => x[2] >= have.length * 0.15).sort((a, b) => a[1] - b[1]);
  return `FAKTISK TYPISK RÆKKEFØLGE på jeres ${have.length} sites (andel der har sektionen): ${avg.map(x => `${x[0]} (${Math.round(x[2] * 100 / have.length)}%)`).join(' → ')}`;
}

/* ---------- undersider fra jeres sites (kontakt-, pris- og ydelsessider) ---------- */
function pickSubpage(site, sidetype) {
  if (!site) return null; const pages = []; if (site.o && site.o.length) pages.push({ u: '/', t: 'Forside', o: site.o }); for (const p of site.u2 || []) pages.push(p); if (!pages.length) return null;
  const cat = SECTION_ONLY[sidetype]; if (cat) return pages.find(p => p.o.some(s => s.c === cat)) || null;
  if (sidetype === 'Kontaktside') return pages.find(p => p.t === 'Kontakt') || null;
  if (sidetype === 'Om os-side') return pages.find(p => p.t === 'Om os') || null;
  if (sidetype === 'Ydelsesoversigt') return pages.find(p => p.t !== 'Forside' && p.o.some(s => s.c === 'Ydelser')) || null;
  if (sidetype === 'Underside') return pages.find(p => p.t === 'Ydelse') || null;
  return null;
}
function subpageRefs(SITES, branche, sidetype, limit) {
  const rows = []; for (const s of SITES) { const p = pickSubpage(s, sidetype); if (p) rows.push({ s, p, same: s.b === branche }); }
  rows.sort((a, b) => (b.same ? 1 : 0) - (a.same ? 1 : 0));
  return rows.slice(0, limit || 10).map(r => `- ${r.s.n} (${r.s.b}) ${r.p.u}: [${r.p.o.filter(x => x.c !== 'CTA').map(x => x.c + (x.n ? '(' + x.n + ')' : '')).join(' → ')}]`).join('\n');
}

function refSiteText(SITES, name) {
  if (!name) return ''; const q = name.toLowerCase().trim(); const s = SITES.find(x => x.n.toLowerCase() === q) || SITES.find(x => x.n.toLowerCase().includes(q) || x.u.toLowerCase().includes(q)); if (!s) return '';
  const seq = (s.c && s.c.length) ? `Sektioner på siden i rækkefølge: [${s.c.join(' → ')}].` : `Template-genkendelse på siden: klasse [${s.k.filter(k => categoryOf(k) !== 'CTA').join(', ') || 'ingen'}], sektionsrækkefølge [${s.s.filter(k => categoryOf(k) !== 'CTA').join(' → ') || 'ukendt'}] (usikker).`;
  return `BRUGEREN VIL HAVE NOGET I STIL MED DETTE SITE: ${s.n} (${s.u}), branche ${s.b}. ${seq} Brug det som inspiration til opbygning og rækkefølge, men lav det med Best Templates. Tekst er pladsholdertekst og farver kommer fra temaet, så intet af det gamle sites udseende tages med.`;
}
function sanitizePlan(list, LIB) {
  const out = []; const count = {};
  for (const x of list || []) {
    if (x && x.fri && FRI_TYPES[x.fri]) { if (normFri(x)) out.push(x); continue; }
    if (!x || !LIB[x.tpl] || categoryOf(x.tpl) === 'CTA') continue;
    if (out.length && out[out.length - 1].tpl === x.tpl) continue;                        // ingen to ens lige efter hinanden
    count[x.tpl] = (count[x.tpl] || 0) + 1; if (count[x.tpl] > 2) continue; out.push(x);
  }
  return out.slice(0, 12);
}
const SIDETYPE_RULES = {
  'Forside': '- Forside: 5-8 sektioner. Én hero (Header) som nr. 1. Afslut med en Kontakt sektion, medmindre brugeren siger andet.',
  'Underside': '- Underside (fx en ydelse eller en by): en enkel Header først, derefter Content-sektioner (gerne med billede), evt. Ydelser, Anmeldelser og FAQ, og til sidst en Kontakt sektion. 4-6 sektioner. Hele sider (Underside/Marketing-templates) kun hvis brugeren beder om det.',
  'Ydelsesoversigt': '- Ydelsesoversigt: en kort Header, derefter en Ydelser-sektion med et kort pr. ydelse (gerne 6, medmindre brugeren siger andet), evt. en Content-sektion med kort tekst, og til sidst en Kontakt sektion. 3-5 sektioner.',
  'Om os-side': '- Om os-side: en enkel Header, Content-sektioner med tekst og billede (gerne en med tællere), evt. Anmeldelser, og til sidst en Kontakt sektion. Vi har ingen medarbejder-skabeloner endnu. 4-6 sektioner.',
  'Kontaktside': '- Kontaktside: KUN en kort Header og en Kontakt sektion med formular (evt. et lille Content-afsnit). Højst 3 sektioner. Ingen ydelser, anmeldelser eller FAQ.',
  'Pris-sektion': '- Pris-sektion: byg KUN pris-sektioner (type Priser), evt. efterfulgt af en FAQ. Højst 2 sektioner. Ingen hero og ingen kontakt sektion.',
  'Cases-sektion': '- Cases-sektion: byg KUN sektioner af typen Cases, evt. en kort Header først. Højst 3 sektioner. Ingen kontakt sektion.',
  'Anmeldelses-sektion': '- Anmeldelses-sektion: byg KUN sektioner af typen Anmeldelser (gerne flere varianter at vælge imellem), evt. en kort Header først. Højst 3 sektioner.',
  'Hero': '- Hero: byg KUN heroes (type Header), præcis én hero pr. udkast. Vælg en ANDEN hero-skabelon til hvert udkast, så de er forskellige. Ingen andre sektioner.',
  'Menu': '- Menu: byg KUN en menu (type Menu), præcis én pr. udkast, og vælg forskellige menu-skabeloner til hvert udkast. Ingen andre sektioner.',
  'FAQ-sektion': '- FAQ-sektion: byg KUN FAQ-sektioner (type FAQ), evt. en kort Header først. Højst 2 sektioner.',
};
const SECTION_ONLY = { 'Hero': 'Header', 'Menu': 'Menu', 'Pris-sektion': 'Priser', 'Cases-sektion': 'Cases', 'Anmeldelses-sektion': 'Anmeldelser', 'FAQ-sektion': 'FAQ' };
const refLabel = t => t === 'Kontaktside' ? 'KONTAKTSIDER' : t === 'Om os-side' ? 'OM OS-SIDER' : t === 'Ydelsesoversigt' ? 'YDELSESOVERSIGTER' : SECTION_ONLY[t] ? 'SIDER MED ' + SECTION_ONLY[t].toUpperCase() : 'UNDERSIDER';

/* ---------- inspiration fra de crawlede sites (bruges af planlæggeren, ikke som facit) ---------- */
function inspirationText(SITES, branche, sidetype, limit) {
  limit = limit || 10;
  if (sidetype && sidetype !== 'Forside') { const t = subpageRefs(SITES, branche, sidetype, limit); return t ? `INSPIRATION: ${refLabel(sidetype).toLowerCase()} på jeres sites (samme branche først; sektioner i rækkefølge):\n${t}` : ''; }
  const all = SITES.filter(s => s.o && s.o.length).sort(() => Math.random() - 0.5); const same = all.filter(s => s.b === branche), other = all.filter(s => s.b !== branche);
  const rows = [...same, ...other].slice(0, limit).map(s => `- ${s.n} (${s.b}): ${s.o.filter(x => x.c !== 'CTA').map(x => x.c + (x.n ? '(' + x.n + ')' : '')).join(' → ')}`);
  return rows.length ? `INSPIRATION: opbygning af forsider på jeres sites (samme branche først):\n${rows.join('\n')}` : '';
}

const FRIHED_LABEL = { templates: 'kun jeres templates', mix: 'mix: templates og nye sektioner', ai: 'AI forslag' };
function friDocs(b) {
  const mode = b.frihed || 'mix'; if (mode === 'templates') return '';
  const only = b.sidetype && (SECTION_ONLY[b.sidetype] || b.sidetype === 'Kontaktside');
  return `\nNYE SEKTIONER (frie sektioner, bygget af temaets farver og størrelser). Du kan bruge dem ved siden af templates. I "sektioner" skriver du en ny sektion som {"fri":"<type>", …felter, "hvorfor":"max 12 ord"} i stedet for {"tpl":…}.
Typer og felter (alle tekster på dansk):
- intro: eyebrow, overskrift, tekst, knapper, stil
- split (tekst + billede): eyebrow, overskrift, tekst, tekst2, punkter (3-5 korte), knapper, layout ("billede-hoejre" eller "billede-venstre"), stil
- cards: eyebrow, overskrift, tekst, kort [{ikon,titel,tekst}] (2-8), stil
- features (fordele): eyebrow, overskrift, tekst, kort [{ikon,titel,tekst}] (2-8), knapper, stil
- steps: eyebrow, overskrift, tekst, trin [{titel,tekst}] (2-6), stil
- stats (tal): eyebrow, overskrift, tal [{tal,suffix,label}] (2-4), stil ("primaer" eller "moerk")
- trust (tillidsbånd): kort [{ikon,titel}] (2-5, meget korte titler som "Gratis tilbud")
- quote: eyebrow, citat {tekst,navn,titel}
- gallery: eyebrow, overskrift, tekst, antal (3-9)
stil: "lys" | "graa" | "primaer" | "moerk". Variér stilen fra sektion til sektion, så siden får rytme. Mørke og primære bånd bruges sparsomt (højst to).
ikon: præcis en af ${FRI_ICONS.map(i => i.replace('fas fa-', '')).join(', ')}.
knapper: [{"tekst":"Kontakt os","type":"kontakt"},{"type":"telefon"}] (højst 2).
SKRIV tekst som en dygtig tekstforfatter: korte, stærke overskrifter og 1-2 sætninger pr. tekst, tilpasset kundens branche. Opfind ALDRIG fakta: ingen antal år, priser, certifikater, kundenavne eller rigtige citater. Tal i "tal" er pladsholdere (brug fx 100), og citater er eksempeltekst skrevet neutralt.
MIX: Brug templates, hvor de er stærke (hero, kontakt med formular, FAQ, anmeldelser), og lav mindst to nye sektioner, hvor de løfter siden (fx et tillidsbånd efter hero, tal som bevis, trin, fordele, et galleri).
${only ? 'Denne sidetype er snæver: brug kun nye sektioner, hvis de passer direkte til typen (fx quote til anmeldelser, gallery eller cards til cases).' : ''}
`;
}
function planPrompt(b, LIB, USE, SITES, n, existing, siteInfo, outline) {
  return `Du er hjemmeside-planlægger hos Best One, et dansk webbureau der bygger i Bricks Builder. Brugeren beskriver kort hvad der skal laves, som til en kollega. Du vælger hvilke sektion-templates fra Best Templates en ny kundeside skal bygges af, og i hvilken rækkefølge. ${(b.frihed || 'mix') === 'templates' ? 'Du skriver INGEN tekster; teksten er pladsholdertekst fra templaterne.' : 'Templates har pladsholdertekst. Til NYE sektioner skriver du selv kort, konkret dansk tekst.'}

${briefText(b)}
${siteInfo ? '\n' + siteInfo + '\n' : ''}
${outline && outline.length ? 'KUNDENS NUVÆRENDE SIDE (sektioner i rækkefølge):\n' + outlineText(outline, LIB, USE) + '\n\n' : ''}${typicalOrder(SITES) ? typicalOrder(SITES) + '\n\n' : ''}${inspirationText(SITES, b.branche, b.sidetype) ? inspirationText(SITES, b.branche, b.sidetype) + '\n' : ''}${friDocs(b)}

TEMPLATE-KATALOG (nøgle | beskrivelse | brug):
${catalog(LIB, USE)}
${existing && existing.length ? '\nALLEREDE LAVEDE FORSLAG (lav noget tydeligt anderledes):\n' + existing.map((e, i) => `${i + 1}. ${e.join(' → ')}`).join('\n') + '\n' : ''}
OPGAVE: Lav ${n} ${n === 1 ? 'forslag' : 'FORSKELLIGE forslag'}.

REGLER
- Brug KUN nøgler fra kataloget, præcis som skrevet. Der findes ingen CTA-sektioner; vælg aldrig noget der starter med cta-.
- Følg brugerens ønsker om sektioner og rækkefølge PRÆCIST, hvis de er nævnt.
${SIDETYPE_RULES[b.sidetype] || SIDETYPE_RULES['Forside']}
${outline && outline.length ? '- Kunden har en eksisterende side (se "KUNDENS NUVÆRENDE SIDE"). Brug den til at forstå, hvilke emner og hvor mange kort der skal med, men lav gerne en bedre og mere varieret opbygning end den gamle.\n' : ''}- HELE sider (underside-*) bruges kun hvis brugeren beder om en hel underside.
- Samme template højst to gange pr. forslag.
${b.branche ? `- Kundens branche er \"${b.branche}\". Lad sites i samme branche under INSPIRATION give idéer til, hvad der virker, men kopiér dem ikke.\n` : ''}
KREATIVITET
- Lav noget, der føles gennemtænkt og anderledes, ikke bare gennemsnittet af jeres sites. Brug INSPIRATION som idébank: lån gode greb (fx tællere som bevis, en process-sektion, cases tidligt, en hero med formular) og kombinér dem på en måde, der passer til kunden og branchen.
- Vælg varianter med omtanke. Brug forskellige templates, hvor det giver mening, og undgå den samme standardopskrift hver gang.
- Opfind ikke sektioner, der ikke findes i kataloget. Brug kun nøgler fra kataloget.

SAMMENHÆNG (så siden hænger sammen og ikke får mærkelige opstillinger)
- Typisk rækkefølge hos os: Header (hero) → Ydelser eller Content (hvad vi laver) → bevis (Anmeldelser, Cases, tællere) → uddybning (Content) → FAQ → Kontakt sektion til sidst.
- Højst én hero, én FAQ og én Kontakt sektion pr. side. Ingen to ens sektioner lige efter hinanden. Stak ikke flere tunge billedmosaikker i træk.
- Bevis (anmeldelser, cases) kommer efter, at siden har fortalt hvad virksomheden laver.
- Brug feltet "beskrivelse" i kataloget til at forstå hvad en template kan, og hold dig til brugerens eksplicitte ønsker.
- Nævner brugeren et antal (fx "6 ydelser", "3 anmeldelser"), sæt "antal" på den sektion. Programmet tilføjer eller fjerner selv kort og gør layoutet responsivt. Udelad "antal" ellers.
${n > 1 ? '- Forslagene skal adskille sig tydeligt: brug forskellige varianter af hero og ydelser (andre nøgler), ikke bare omrokering. Alle følger stadig brugerens eksplicitte ønsker.\n' : ''}${siteInfo ? '- Kunden har en eksisterende side. Lad dens struktur inspirere valget af sektioner.\n' : ''}
Svar KUN med JSON:
{"forslag":[{"navn":"kort navn på forslaget","note":"1 sætning om valget","sektioner":[{"tpl":"hero-4","hvorfor":"max 12 ord"},{"tpl":"ydelse-1","antal":6,"hvorfor":"kunden har 6 ydelser"}${(b.frihed || 'mix') === 'templates' ? '' : ',{"fri":"trust","kort":[{"ikon":"shield-halved","titel":"Fast pris"},{"ikon":"clock","titel":"Hurtig opstart"}],"hvorfor":"tillid lige efter hero"}'}]}]}`;
}
function contentPrompt(b, sections, allSections, site, pageIdx, usedBlocks) {
  const bl = siteBlocks(site, pageIdx); const imgs = siteImages(site, pageIdx);
  const blocks = bl.map((x, i) => `[${i}] ${x.t}: ${String(x.text).slice(0, 150).replace(/\n/g, ' ')}${x.text.length > 150 ? '…' : ''} (${x.text.length} tegn)`).join('\n');
  const images = imgs.map((x, i) => `[${i}] ${x.w && x.h ? x.w + 'x' + x.h : '?'} · ${x.role || ''} · alt: ${JSON.stringify((x.alt || '').slice(0, 60))} · ${x.file ? x.file.split('/').pop() : fileOf(x.src)}`).join('\n');
  const body = sections.map((s, i) => `SEKTION id "${s.uid}" · template ${s.tpl}\n${contentSlotsText(s)}`).join('\n\n');
  return `Du placerer kundens EKSISTERENDE indhold i en ny Bricks-side. Du skriver ikke selv noget: du peger kun på hvilke af kundens tekstblokke og billeder der skal i hvilke felter. Programmet kopierer teksten ordret.

${briefText(b)}

SIDENS SEKTIONER (rækkefølge): ${allSections.map((s, i) => `${i + 1}. ${s.tpl}`).join(' → ')}
${usedBlocks && usedBlocks.length ? 'Allerede brugte tekstblokke i andre sektioner (undgå dem): ' + usedBlocks.join(', ') + '\n' : ''}
KUNDENS TEKSTBLOKKE (nummer, type, tekst):
${blocks}

KUNDENS BILLEDER (nummer, størrelse, rolle, alt, filnavn):
${images}

FELTER DER SKAL UDFYLDES:
${body}

REGLER
- Placér blokkene i naturlig læserækkefølge: kundens h1 og første afsnit til hero, derefter sektion for sektion. Brug hver tekstblok højst én gang.
- Overskrifts- og knapfelter får én blok. Et tekstfelt (text) kan få flere blokke, fx [4,5,6] (afsnit/punkter i rækkefølge). Passer en blok ikke i feltet (fx for lang til en overskrift), brug en anden eller lad feltet stå tomt.
- Lad et felt stå ude af svaret, hvis kundens indhold ikke har noget der passer. Opfind og omskriv ikke.
- Billeder: vælg billeder der passer til feltet (store og brede til hero/baggrund, ensartede til kort og gallerier). Brug hvert billede højst én gang. Logoer, ikoner og små billeder bruges ikke som motiv.

Svar KUN med JSON:
{"sektioner":{"s1":{"tekst":{"abc123":4,"def456":[5,6]},"billeder":{"ghi789":2}}}}`;
}
function editPrompt(b, state, LIB, USE, request) {
  const cur = state.sections.map((s, i) => `${i + 1}. ${s.tpl} (${displayName(s.tpl)}, ${categoryOf(s.tpl)}${s.parts > 1 ? `, del ${s.part} af ${s.parts}` : ''})`).join('\n');
  return `Du redigerer et udkast til en Bricks-side hos Best One efter brugerens ønske. Svar med en liste af operationer, som et program udfører. Du skriver ingen tekster.

${briefText(b)}

NUVÆRENDE SIDE (nummereret):
${cur}

TEMPLATE-KATALOG:
${catalog(LIB, USE)}

BRUGERENS ØNSKE:
${request}

TILLADTE OPERATIONER (index er sektionens nummer i listen ovenfor, startende ved 1):
{"op":"remove","index":3}
{"op":"move","index":4,"to":2}
{"op":"add","tpl":"faq-1","at":5,"hvorfor":"…"}
{"op":"swap","index":2,"tpl":"ydelse-4","hvorfor":"…"}
{"op":"count","index":2,"antal":6}                    (ændrer antal gentagne kort/elementer i sektionen; layoutet tilpasses selv)\n{"op":"redesign","index":3,"instruktion":"gør layoutet mere asymmetrisk"}   (kun for sektioner, der hedder "AI · …": AI laver sektionen om efter instruktionen)\n{"op":"add","at":3,"fri":{"fri":"stats","tal":[{"tal":"100","suffix":"+","label":"Tilfredse kunder"}],"stil":"primaer"}}   (ny fri sektion; typer: intro, split, cards, features, steps, stats, trust, quote, gallery)
{"op":"setting","index":1,"key":"_background","value":{"color":{"raw":"var(--dark)"}}}      (id udeladt = sektionen selv; ellers "id":"abc123")

REGLER
- Brug kun nøgler fra kataloget (ingen cta-). Foretræk et skift af template frem for indstillinger.
- "setting" kun hvis ønsket ikke kan løses med templates. Tilladte nøgler: ${[...SETTING_WHITELIST].join(', ')} (evt. med breakpoint-suffix som ":mobile_portrait"). Brug variabler som var(--dark), var(--light), var(--cta), var(--space-m). Ingen egen CSS. Bliver baggrunden mørk, skal tekstfarven i sektionen også ændres.
- Ændr kun det der er bedt om.

Svar KUN med JSON: {"ops":[…],"svar":"1-2 sætninger på dansk om hvad du gjorde, eller hvorfor du ikke kunne"}`;
}

const API = { clone, esc, stripTags, mapOf, rootsOf, walk, getSlots, applyText, makeSection, applyOps, applyPhone, applyContent, imgSlots, buildExport, validate, renderSections, catalog, buildAiRaw, buildFri, nativize, natRegister, pickArchetypes, pickRegister, archPurpose, AI_ARCH, setStock, stockify, videoify, sortKeys, localPlan, guessBranche, siteInfo, onlineClean, BS_VIDEO, loremify, loremText, fixH1, newestKeys, groupKeys, STOCK_BASE, makeAi, rebuildAi, normAi, pickCreative, aiConceptPrompt, aiSectionPrompt, aiRepairPrompt, themeDoc, AI_DIRECTIONS, looseJson, sanitizeAiCss, secTitle, aiVarNames, fixExtraH1, planPrompt, contentPrompt, inspirationText, makeFri, normFri, cycleFri, groupInfoSec, setFriClasses, FRI_TYPES, FRI_STIL, SECTION_ONLY, pickSubpage, subpageRefs, makeSections, splitParts, mirrorSections, suggestForOutline, outlineText, outlineFromImport, findSite, featsOf, parsePhone, classPrefix, setEnv, editPrompt, removeSubtree, categoryOf, displayName, describeKey, setMeta, getMissing, variantsOf, nextVariant, allowedKeys, catList, sanitizePlan, TYPE_ORDER, WHOLE_PAGE, cleanSettings, resizeGroup, groupSize, groupInfo, getGroups, siteSummary, siteBlocks, siteImages, FORM_ID, PH_URL, plainToHtml, htmlToPlain, unitFix };
if (typeof module !== 'undefined') module.exports = API;
