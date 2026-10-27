/* Udkast – Best One · Apps Script
   Står for login (kun best-one.dk) og data. Selve værktøjet ligger på GitHub Pages og vises inde i denne side.
   Værktøjet beder om data via postMessage; siden her henter dem og svarer kun værktøjets egen adresse.

   Data:
   - Templates:  Drive-mappen "Best Templates" (Bricks-eksporter, .json)
   - Kunder:     ClickUp → Produktionen → Opstarter (kun hovedopgaver)
   - Inspiration: ClickUp → Produktionen → Kunder med HOS, HOS+, RE eller RE+ i "Produkter" (kun hovedopgaver)

   ClickUp bruges KUN til at læse. Der er ingen kald her, der opretter, retter eller sletter noget.
   Nøglen sættes i Projektindstillinger → Script-egenskaber som CLICKUP_TOKEN (gerne fra en gæst med "Kan se"-adgang). */

const CFG = {
  APP_URL: 'https://mvi-dot.github.io/best-udkast/',
  APP_ORIGIN: 'https://mvi-dot.github.io',
  DOMAIN: 'best-one.dk',
  TEMPLATE_FOLDER: '1sANGowevyCg9iJqpqipx_MdTFwI5VLJ9',
  CLICKUP: {
    OPSTARTER: '900800029466',
    KUNDER: '900800029468',
    F_PRODUKTER: 'a98fb65b-50a1-4dad-a5e1-b36bbd6615ce',
    HOS: ['f2f35750-7945-47e9-9586-03360e061572', 'dc76a526-a1e3-4915-b3a1-81d22ca8e1bc', 'c71b80c5-7558-45af-bd9b-43d6eb27996f', '505b8c0a-a3ed-4a11-a88f-eb8b488612d5'],   // HOS, HOS+, RE, RE+ (ikke H0S)
    F_BRANCHE: '75762c06-2936-49a6-8915-f1780ddc20e0',
    F_HJEMMESIDE: 'd8f36f07-cf17-48dd-aab6-bb6974a7cbcc',
    F_DESCRIPTION: '705f6e43-1597-4947-9eed-0ba2a07b2fb7',
    F_SAELGER: '6d1d0348-5ce2-44b3-81ff-58755fe3a01e',
    F_POSTNUMMER: '3a9f4f94-4659-4505-8b87-7ca1a1def514',
  },
};

/* ---------- siden ---------- */
function doGet() {
  const t = HtmlService.createTemplateFromFile('Shell');
  t.appUrl = CFG.APP_URL; t.appOrigin = CFG.APP_ORIGIN;
  return t.evaluate().setTitle('Udkast – Best One').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ---------- API (kaldes fra Shell.html via google.script.run) ---------- */
const API = { me, templateIndex, templateFiles, customers, inspiration };
function api(name, args) {
  requireBestOne_();
  if (!Object.prototype.hasOwnProperty.call(API, name)) throw new Error('Ukendt kald: ' + name);
  return API[name].apply(null, args || []);
}
function requireBestOne_() {
  const mail = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!mail.endsWith('@' + CFG.DOMAIN)) throw new Error('Kun for Best One-medarbejdere.');
  return mail;
}
function me() { return { email: requireBestOne_() }; }

/* ---------- templates fra Drive ---------- */
// Liste over alle .json-filer (også i undermapper) med id og ændringstid – værktøjet henter kun dem, der er nye eller ændret
function templateIndex() {
  const cache = CacheService.getScriptCache(); const hit = cache.get('tplIndex'); if (hit) return JSON.parse(hit);
  const out = []; const walk = (folder, path) => {
    const files = folder.getFiles();
    while (files.hasNext()) { const f = files.next(); if (!/\.json$/i.test(f.getName())) continue; out.push({ id: f.getId(), name: f.getName(), folder: path, modified: f.getLastUpdated().getTime(), size: f.getSize() }); }
    const subs = folder.getFolders(); while (subs.hasNext()) { const s = subs.next(); walk(s, path ? path + '/' + s.getName() : s.getName()); }
  };
  walk(DriveApp.getFolderById(CFG.TEMPLATE_FOLDER), '');
  try { cache.put('tplIndex', JSON.stringify(out), 120); } catch (e) { }   // cachen tager max 100 KB pr. nøgle
  return out;
}
// Indholdet af op til 25 filer ad gangen (kun filer fra template-mappen)
function templateFiles(ids) {
  const allowed = new Set(templateIndex().map(f => f.id));
  return (ids || []).slice(0, 25).filter(id => allowed.has(id)).map(id => {
    const f = DriveApp.getFileById(id);
    return { id, name: f.getName(), modified: f.getLastUpdated().getTime(), text: f.getBlob().getDataAsString('UTF-8') };
  });
}

/* ---------- ClickUp (kun læsning) ---------- */
function clickupGet_(path, query) {
  const token = PropertiesService.getScriptProperties().getProperty('CLICKUP_TOKEN');
  if (!token) throw new Error('ClickUp er ikke sat op endnu (mangler CLICKUP_TOKEN i script-egenskaber).');
  const qs = Object.keys(query || {}).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(query[k])).join('&');
  const res = UrlFetchApp.fetch('https://api.clickup.com/api/v2' + path + (qs ? '?' + qs : ''), { method: 'get', headers: { Authorization: token }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('ClickUp svarede ' + res.getResponseCode());
  return JSON.parse(res.getContentText());
}
// Alle hovedopgaver i en liste (ClickUp giver 100 ad gangen)
function listTasks_(listId, extra) {
  const out = [];
  for (let page = 0; page < 30; page++) {
    const r = clickupGet_('/list/' + listId + '/task', Object.assign({ page: page, subtasks: 'false', include_closed: 'false' }, extra || {}));
    out.push.apply(out, (r.tasks || []).filter(t => !t.parent));
    if (r.last_page || !(r.tasks || []).length) break;
  }
  return out;
}
const field_ = (t, id) => (t.custom_fields || []).find(f => f.id === id);
function dropdownName_(f) {
  if (!f || f.value === undefined || f.value === null) return '';
  const opts = (f.type_config && f.type_config.options) || [];
  const o = opts.find(x => x.id === f.value || x.orderindex === f.value || String(x.orderindex) === String(f.value));
  return o ? (o.name || o.label || '') : '';
}
const textOf_ = f => (f && f.value !== undefined && f.value !== null) ? String(f.value) : '';
function customer_(t) {
  const C = CFG.CLICKUP; const s = field_(t, C.F_SAELGER);
  return { id: t.id, name: t.name, url: t.url, status: t.status && t.status.status, website: textOf_(field_(t, C.F_HJEMMESIDE)), branche: dropdownName_(field_(t, C.F_BRANCHE)),
    postnummer: textOf_(field_(t, C.F_POSTNUMMER)), seller: s && Array.isArray(s.value) && s.value[0] ? (s.value[0].username || s.value[0].email || '') : '',
    note: textOf_(field_(t, C.F_DESCRIPTION)), description: String(t.text_content || t.description || '').slice(0, 4000), updated: +t.date_updated || 0 };
}
// Kunder der skal laves udkast til
function customers() {
  const cache = CacheService.getScriptCache(); const hit = cache.get('customers'); if (hit) return JSON.parse(hit);
  const out = listTasks_(CFG.CLICKUP.OPSTARTER).map(customer_).sort((a, b) => b.updated - a.updated);
  try { cache.put('customers', JSON.stringify(out), 120); } catch (e) { }
  return out;
}
// Sider der er online og må bruges som inspiration (kun navn, domæne og branche)
function inspiration() {
  const cache = CacheService.getScriptCache(); const hit = cache.get('inspiration'); if (hit) return JSON.parse(hit);
  const C = CFG.CLICKUP; const filter = JSON.stringify([{ field_id: C.F_PRODUKTER, operator: 'ANY', value: C.HOS }]);
  const out = listTasks_(C.KUNDER, { custom_fields: filter })   // kun åbne opgaver: "nedlukket" og "afsluttet" er ikke online
    .filter(t => { const p = field_(t, C.F_PRODUKTER); return p && Array.isArray(p.value) && p.value.some(v => C.HOS.indexOf(v) >= 0); })
    .map(t => ({ name: t.name, website: textOf_(field_(t, C.F_HJEMMESIDE)), branche: dropdownName_(field_(t, C.F_BRANCHE)) })).filter(x => x.website);
  try { cache.put('inspiration', JSON.stringify(out), 3600); } catch (e) { }
  return out;
}
