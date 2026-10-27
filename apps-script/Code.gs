/* Udkast – Best One · Apps Script
   Står for login (kun best-one.dk) og data. Selve værktøjet ligger på GitHub Pages og vises inde i denne side.
   Værktøjet beder om data via postMessage; siden her henter dem og svarer kun værktøjets egen adresse.

   Data:
   - Templates:  Drive-mappen "Best Templates" (Bricks-eksporter, .json)
   - Kunder:     ClickUp → Produktionen → Opstarter: hovedopgaver i to-do, afventer, i gang eller på ugen, med HOS, HOS+, RE eller RE+
   - Inspiration: ClickUp → Produktionen → Kunder med HOS, HOS+, RE eller RE+ i "Produkter" (kun hovedopgaver)
   - HOS-sidernes opbygning: henter forsiden af et inspirationssite (kun dem fra listen ovenfor), så værktøjet kan se, hvilke templates den ligner

   ClickUp bruges KUN til at læse. Der er ingen kald her, der opretter, retter eller sletter noget.
   Nøglen sættes i Projektindstillinger → Script-egenskaber som CLICKUP_TOKEN (gerne fra en gæst med "Kan se"-adgang). */

const CFG = {
  APP_URL: 'https://mvi-dot.github.io/best-udkast/',
  APP_ORIGIN: 'https://mvi-dot.github.io',
  DOMAIN: 'best-one.dk',
  TEMPLATE_FOLDER: '1sANGowevyCg9iJqpqipx_MdTFwI5VLJ9',
  TEMPLATE_SHEET: '1k5mrxRSsp5OG5XlsZOvlN52R_sG3GUIf_zYKzD5Ec5g',   // regnearket "Best Templates": navn, type, dato, link og beskrivelse pr. template
  CLICKUP: {
    OPSTARTER: '900800029466',
    OPSTARTER_STATUS: ['to-do', 'afventer', 'i gang', 'på ugen'],   // kun kunder i disse statusser kan vælges ("på ugen 🔥" tæller med)
    KUNDER: '900800029468',
    F_PRODUKTER: 'a98fb65b-50a1-4dad-a5e1-b36bbd6615ce',
    HOS: ['f2f35750-7945-47e9-9586-03360e061572', 'dc76a526-a1e3-4915-b3a1-81d22ca8e1bc', 'c71b80c5-7558-45af-bd9b-43d6eb27996f', '505b8c0a-a3ed-4a11-a88f-eb8b488612d5'],   // HOS, HOS+, RE, RE+ (ikke H0S)
    F_BRANCHE: '75762c06-2936-49a6-8915-f1780ddc20e0',
    F_HJEMMESIDE: 'd8f36f07-cf17-48dd-aab6-bb6974a7cbcc',
  },
};

/* ---------- siden ---------- */
function doGet() {
  const t = HtmlService.createTemplateFromFile('Shell');
  t.appUrl = CFG.APP_URL; t.appOrigin = CFG.APP_ORIGIN;
  return t.evaluate().setTitle('Udkast – Best One').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ---------- API (kaldes fra Shell.html via google.script.run) ---------- */
const API = { me, templateIndex, templateFiles, templateSheet, customers, inspiration, siteHtml };
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
// Hvem er logget ind: e-mail fra Google, fornavn fra ClickUp (Google-login giver kun e-mailen)
function me() {
  const email = requireBestOne_(); let name = '';
  try { name = memberNames_()[email] || ''; } catch (e) { }
  return { email, name };
}
function memberNames_() {
  const cache = CacheService.getScriptCache(); const hit = cache.get('members'); if (hit) return JSON.parse(hit);
  const out = {}; for (const t of clickupGet_('/team').teams || []) for (const m of t.members || []) { const u = m.user || {}; if (u.email && u.username) out[String(u.email).toLowerCase()] = String(u.username); }
  try { cache.put('members', JSON.stringify(out), 21600); } catch (e) { }
  return out;
}

/* ---------- templates fra Drive ----------
   Hurtigt: listen og filerne hentes med Drive-API'et, filerne parallelt (UrlFetchApp.fetchAll), og hver fil gemmes i scriptets cache i 6 timer,
   så næste kollega slipper for Drive. Virker API'et ikke, bruges DriveApp som før (langsommere, men samme resultat). */
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const FILE_TTL = 21600;   // 6 timer (max for CacheService)
const authHeader_ = () => ({ Authorization: 'Bearer ' + ScriptApp.getOAuthToken() });
// Liste over alle .json-filer (også i undermapper) med id og ændringstid – værktøjet henter kun dem, der er nye eller ændret
function templateIndex() {
  const cache = CacheService.getScriptCache(); const hit = cache.get('tplIndex'); if (hit) return JSON.parse(hit);
  let out; try { out = indexApi_(); } catch (e) { out = indexDriveApp_(); }
  try { cache.put('tplIndex', JSON.stringify(out), 120); } catch (e) { }   // cachen tager max 100 KB pr. nøgle
  return out;
}
function indexApi_() {
  const out = []; const walk = (folderId, path) => {
    let token = '';
    do {
      const q = encodeURIComponent("'" + folderId + "' in parents and trashed = false");
      const r = UrlFetchApp.fetch(DRIVE_API + '?q=' + q + '&pageSize=1000&fields=' + encodeURIComponent('nextPageToken,files(id,name,mimeType,modifiedTime,size)') + (token ? '&pageToken=' + token : '') + '&supportsAllDrives=true&includeItemsFromAllDrives=true', { headers: authHeader_(), muteHttpExceptions: true });
      if (r.getResponseCode() !== 200) throw new Error('Drive svarede ' + r.getResponseCode());
      const j = JSON.parse(r.getContentText()); token = j.nextPageToken || '';
      for (const f of j.files || []) {
        if (f.mimeType === 'application/vnd.google-apps.folder') walk(f.id, path ? path + '/' + f.name : f.name);
        else if (/\.json$/i.test(f.name)) out.push({ id: f.id, name: f.name, folder: path, modified: Date.parse(f.modifiedTime), size: +f.size || 0 });
      }
    } while (token);
  };
  walk(CFG.TEMPLATE_FOLDER, ''); return out;
}
function indexDriveApp_() {
  const out = []; const walk = (folder, path) => {
    const files = folder.getFiles();
    while (files.hasNext()) { const f = files.next(); if (!/\.json$/i.test(f.getName())) continue; out.push({ id: f.getId(), name: f.getName(), folder: path, modified: f.getLastUpdated().getTime(), size: f.getSize() }); }
    const subs = folder.getFolders(); while (subs.hasNext()) { const s = subs.next(); walk(s, path ? path + '/' + s.getName() : s.getName()); }
  };
  walk(DriveApp.getFolderById(CFG.TEMPLATE_FOLDER), ''); return out;
}
// Indholdet af op til 25 filer ad gangen (kun filer fra template-mappen)
function templateFiles(ids) {
  const byId = {}; for (const f of templateIndex()) byId[f.id] = f;
  const want = (ids || []).slice(0, 25).filter(id => byId[id]); if (!want.length) return [];
  const cache = CacheService.getScriptCache(); const key = id => 'f:' + id + ':' + byId[id].modified;   // ny nøgle, når filen ændres
  const hit = cache.getAll(want.map(key)); const out = []; const miss = [];
  for (const id of want) { const t = hit[key(id)]; if (t != null) out.push({ id, name: byId[id].name, modified: byId[id].modified, text: t }); else miss.push(id); }
  if (miss.length) {
    let texts; try {
      const res = UrlFetchApp.fetchAll(miss.map(id => ({ url: DRIVE_API + '/' + id + '?alt=media&supportsAllDrives=true', headers: authHeader_(), muteHttpExceptions: true })));
      texts = res.map((r, i) => r.getResponseCode() === 200 ? r.getContentText('UTF-8') : DriveApp.getFileById(miss[i]).getBlob().getDataAsString('UTF-8'));
    } catch (e) { texts = miss.map(id => DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8')); }
    const put = {};
    miss.forEach((id, i) => { out.push({ id, name: byId[id].name, modified: byId[id].modified, text: texts[i] }); if (texts[i].length < 95000) put[key(id)] = texts[i]; });
    try { cache.putAll(put, FILE_TTL); } catch (e) { }
  }
  return out;
}

// Regnearket "Best Templates" (første ark) – typen her bestemmer, hvilken gruppe en template hører til
function templateSheet() {
  const cache = CacheService.getScriptCache(); const hit = cache.get('tplSheet'); if (hit) return JSON.parse(hit);
  const r = UrlFetchApp.fetch(DRIVE_API + '/' + CFG.TEMPLATE_SHEET + '/export?mimeType=text%2Fcsv', { headers: authHeader_(), muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('Regnearket svarede ' + r.getResponseCode());
  const rows = Utilities.parseCsv(r.getContentText('UTF-8')); const h = rows.findIndex(x => String(x[1]).trim() === 'Navn'); if (h < 0) return [];
  const out = rows.slice(h + 1).filter(x => x[1] && String(x[1]).trim()).map(x => { const u = String(x[4] || '').trim(); return { n: String(x[1]).trim(), t: String(x[2] || '').trim(), d: String(x[3] || '').trim(), u, s: u.replace(/\/+$/, '').split('/').pop(), b: String(x[5] || '').trim() }; });
  try { cache.put('tplSheet', JSON.stringify(out), 120); } catch (e) { }
  return out;
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
const hasHos_ = t => { const p = field_(t, CFG.CLICKUP.F_PRODUKTER); return !!(p && Array.isArray(p.value) && p.value.some(v => CFG.CLICKUP.HOS.indexOf(v && v.id ? v.id : v) >= 0)); };
const statusName_ = t => String((t.status && t.status.status) || '').toLowerCase().replace(/[^a-zæøå -]/g, '').trim();   // "på ugen 🔥" -> "på ugen"
const textOf_ = f => (f && f.value !== undefined && f.value !== null) ? String(f.value) : '';
function customer_(t) {   // kun det, værktøjet viser og bruger
  const C = CFG.CLICKUP;
  return { id: t.id, name: t.name, url: t.url, website: textOf_(field_(t, C.F_HJEMMESIDE)), branche: dropdownName_(field_(t, C.F_BRANCHE)) };
}
// Kunder der skal laves udkast til
function customers() {
  const cache = CacheService.getScriptCache(); const hit = cache.get('customers'); if (hit) return JSON.parse(hit);
  const C = CFG.CLICKUP; const filter = JSON.stringify([{ field_id: C.F_PRODUKTER, operator: 'ANY', value: C.HOS }]);
  const out = listTasks_(C.OPSTARTER, { custom_fields: filter }).filter(t => C.OPSTARTER_STATUS.indexOf(statusName_(t)) >= 0).filter(hasHos_)
    .map(customer_).sort((a, b) => a.name.localeCompare(b.name, 'da'));
  try { cache.put('customers', JSON.stringify(out), 600); } catch (e) { }   // 10 min: nye kunder i Opstarter dukker op inden for 10 minutter
  return out;
}
// Sider der er online og må bruges som inspiration (kun navn, domæne og branche)
function inspiration() {
  const cache = CacheService.getScriptCache(); const hit = cache.get('inspiration'); if (hit) return JSON.parse(hit);
  const C = CFG.CLICKUP; const filter = JSON.stringify([{ field_id: C.F_PRODUKTER, operator: 'ANY', value: C.HOS }]);
  const out = listTasks_(C.KUNDER, { custom_fields: filter })   // kun åbne opgaver: "nedlukket" og "afsluttet" er ikke online
    .filter(t => !(t.status && /^(done|closed)$/.test(t.status.type)))   // "nedlukket" (done) og "afsluttet" (closed) er ikke online
    .filter(hasHos_)
    .map(t => ({ name: t.name, website: textOf_(field_(t, C.F_HJEMMESIDE)), branche: dropdownName_(field_(t, C.F_BRANCHE)) })).filter(x => x.website);
  try { cache.put('inspiration', JSON.stringify(out), 3600); } catch (e) { }
  return out;
}

/* ---------- opbygningen af en HOS-side ---------- */
// Kun sites fra inspiration() – så scriptet ikke kan bruges til at hente vilkårlige adresser.
// Svarer med et skelet af sidens <main>: tags og klasser, uden tekst, scripts og billeder (det er nok til at genkende templates).
function siteHtml(url) {
  const host = hostOf_(url); if (!host) throw new Error('Ugyldig adresse');
  if (!inspiration().some(x => hostOf_(x.website) === host)) throw new Error('Siden er ikke en HOS-kunde i ClickUp');
  const cache = CacheService.getScriptCache(); const key = 'site:' + host; const hit = cache.get(key); if (hit !== null) return hit;
  const res = UrlFetchApp.fetch('https://' + host + '/', { followRedirects: true, muteHttpExceptions: true, headers: { 'User-Agent': 'BestOne-Udkast (internt værktøj)' } });
  if (res.getResponseCode() !== 200) throw new Error(host + ' svarede ' + res.getResponseCode());
  let h = res.getContentText(); const a = h.search(/<main[\s>]/i), b = h.search(/<\/main>/i); if (a >= 0 && b > a) h = h.slice(a, b + 7);
  h = skeleton_(h);
  try { cache.put(key, h, 21600); } catch (e) { }   // 6 timer (max 100 KB)
  return h;
}
function skeleton_(h) {
  return String(h).replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|svg|noscript|template|iframe)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi, (m, t, at) => { const c = at.match(/\sclass\s*=\s*"([^"]*)"/i); return '<' + t + (c ? ' class="' + c[1] + '"' : '') + '>'; })   // kun tag og klasse
    .replace(/>[^<]+</g, '><');
}
function hostOf_(u) { const m = String(u || '').trim().match(/^(?:https?:\/\/)?([^\/?#:]+)/i); return m ? m[1].toLowerCase().replace(/^www\./, '') : ''; }
