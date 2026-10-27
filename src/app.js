/* ===== UI v2 ===== */
/* ===== Data: templates fra Drive via Apps Script ===== */
// Værktøjet vises inde i Apps Script-siden (Shell.html), som står for login og data. Uden den får værktøjet ingen templates.
const IN_GAS = (() => { try { return window.parent !== window && new URLSearchParams(location.search).get('host') === 'gas'; } catch (_) { return false; } })();
const gas = (() => {
  let n = 0; const wait = {};
  addEventListener('message', ev => {
    const d = ev.data || {}; if (d.udkastApi !== 1 || !wait[d.id] || ev.source !== window.parent) return;
    let host = ''; try { host = new URL(ev.origin).hostname; } catch (_) { } if (!/\.googleusercontent\.com$/.test(host)) return;   // kun svar fra Apps Script
    const w = wait[d.id]; delete wait[d.id]; d.ok ? w.res(d.value) : w.rej(new Error(d.value));
  });
  return (name, ...args) => new Promise((res, rej) => {
    const id = 'c' + (++n) + Math.random().toString(36).slice(2, 7); wait[id] = { res, rej };
    window.parent.postMessage({ udkastApi: 1, id, name, args }, '*');
    setTimeout(() => { if (wait[id]) { delete wait[id]; rej(new Error('Apps Script svarede ikke')); } }, 120000);
  });
})();
const TPL_CACHE = 'udkast-templates-v1';
// kunder og navn hentes med det samme, samtidig med templates (ClickUp er et par sekunder om at svare)
const EARLY = IN_GAS ? { customers: gas('customers').catch(() => null), me: gas('me').catch(() => null) } : {};
const CUST_CACHE = 'udkast-kunder-v1';
async function loadTemplates(msg) {
  let cache = {}; try { cache = (JSON.parse(localStorage.getItem(TPL_CACHE) || '{}').files) || {}; } catch (_) { }
  if (!IN_GAS) {   // lokal test: .claude/dev-templates.json (ligger ikke i repoet)
    try { const r = await fetch('.claude/dev-templates.json', { cache: 'no-store' }); if (r.ok) return { files: await r.json(), source: 'dev' }; } catch (_) { }
    return { files: [], source: 'none' };
  }
  try {
    msg('Loader templates\nTjekker for nye templates…'); const idx = await gas('templateIndex');
    const need = idx.filter(f => !cache[f.id] || cache[f.id].modified !== f.modified).map(f => f.id); 
    // alle pakker på én gang (Apps Script henter dem parallelt fra Drive)
    let got = 0; const packs = []; for (let i = 0; i < need.length; i += 25) packs.push(need.slice(i, i + 25));   // 25: virker også med en ældre Code.gs
    if (need.length) msg(`Loader templates\n0/${need.length}`);
    await Promise.all(packs.map(async ids => { for (const g of await gas('templateFiles', ids)) cache[g.id] = g; got += ids.length; msg(`Loader templates\n${got}/${need.length}`); }));
    const ids = new Set(idx.map(f => f.id)); for (const id of Object.keys(cache)) if (!ids.has(id)) delete cache[id];
    try { localStorage.setItem(TPL_CACHE, JSON.stringify({ files: cache })); } catch (_) { }
    return { files: Object.values(cache), source: 'drive', changed: need.length };
  } catch (e) {   // Drive/Apps Script svarer ikke: brug den sidst hentede udgave
    const files = Object.values(cache); if (!files.length) throw e;
    return { files, source: 'cache', error: e.message };
  }
}

(async function () {
  const $ = id => document.getElementById(id);
  const E = window.GEN;
  const D = JSON.parse($('data').textContent);
  // templates fra Drive -> LIB, klasser og skabelonliste
  // skærm mens templates hentes: hvidt b, evt. overskrift (første linje før \n), animation og status. done = ingen animation (fejl/besked)
  const bootMsg = (t, done) => { const b = $('boot'); if (!b) return; b.hidden = false; b.classList.toggle('done', !!done);
    const lg = b.querySelector('.bootlogo'), mk = document.querySelector('.bmark'); if (lg && mk && !lg.src) lg.src = mk.src;
    const [h, ...r] = String(t).split('\n'); b.querySelector('.boot-t').textContent = r.length ? h : ''; b.querySelector('.boot-s').textContent = r.length ? r.join(' ') : h; };
  // typerne fra regnearket "Best Templates" hentes samtidig (lokalt: .claude/dev-sheet.json)
  const sheetP = (IN_GAS ? gas('templateSheet') : fetch('.claude/dev-sheet.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null)).catch(() => null);
  let T; try { T = await loadTemplates(bootMsg); } catch (e) { bootMsg('Kunne ikke hente templates: ' + e.message, true); return; }
  if (!T.files.length) { bootMsg(IN_GAS ? 'Der er ingen templates i Drive-mappen.' : 'Åbn værktøjet via Apps Script-linket. Der hentes templates og kunder, når man er logget ind med best-one.dk.', true); return; }
  { const conv = E.libFromExports(T.files, D.CLASSES); D.LIB = conv.LIB; D.CLASSES = conv.CLASSES; { const rows = await sheetP; D.SHEET = Array.isArray(rows) && rows.length ? rows : conv.SHEET; D.SHEET_SRC = Array.isArray(rows) && rows.length ? 'ark' : ''; } D.TPL = T; D.TPL.bad = conv.bad;
    // statistikken fra før bruger gamle template-navne (fx cta-1-double-text) – peg dem på de nye
    const al = E.keyAlias(Object.keys(D.USE || {}), D.LIB); const U = {};
    for (const [k, v] of Object.entries(D.USE || {})) { const nk = al[k] || k; U[nk] = U[nk] ? [U[nk][0] + v[0], U[nk][1] + v[1]] : v; } D.USE = U; }
  $('boot').hidden = true;
  const { LIB, CLASSES, VARS, USE, SHEET, STOCK } = D;
  E.setMeta(LIB, SHEET); E.setEnv({ CLASSES }); E.setStock(STOCK); E.setBricks(D.BRICKS, LIB);
  const BRICKS_OK = !!(D.BRICKS && D.BRICKS.links && D.BRICKS.links.css.length);   // preview med jeres rigtige Bricks-CSS (src/bricks.json)
  let sheetNote = `Templates: ${Object.keys(LIB).length} fra ${D.TPL.source === 'drive' ? 'Drive' : D.TPL.source === 'cache' ? 'Drive (gemt udgave – Drive svarede ikke)' : 'lokal testfil'}${D.TPL.bad.length ? ' · ' + D.TPL.bad.length + ' filer kunne ikke læses' : ''}`;
  const DEVICES = { desktop: 1600, laptop: 1440, ipadl: 1024, ipadp: 768, mobil: 390 };      // matcher jeres breakpoints: base · max 1470 · max 1024 · max 768 · max 478
  const DEVICE_H = { desktop: 900, laptop: 900, ipadl: 768, ipadp: 1024, mobil: 844 };      // skærmhøjde (bruges til vh-enheder i preview)

  let state = { brief: {}, proposals: [], active: 0 };
  let selUid = null; let lastHas = false; let lastUids = new Set(); let pendingAnim = null;
  let hist = [], exp = null, device = 'desktop';
  const cur = () => state.proposals[state.active] || null;

  /* ---------- opsætning ---------- */
  const root = $('pvHost').attachShadow({ mode: 'open' });
  root.innerHTML = '<style id="pvStyle"></style><div id="frame"><div id="pvContent"></div></div>';
  const frame = root.getElementById('frame'), pvContent = root.getElementById('pvContent'), pvStyle = root.getElementById('pvStyle');
  /* ---------- preview i iframe: Bricks' markup med stocksitets CSS/JS. Genindlæses kun, når siden ændrer sig ---------- */
  const pvFrame = $('pvFrame'); let pvDoc = '', pvH = 600;
  const useFrame = on => { $('pvHost').hidden = on; pvFrame.hidden = !on; };
  const selFrame = () => { if (pvFrame.contentWindow) pvFrame.contentWindow.postMessage({ udkast: 'sel', uid: selUid || '' }, '*'); };
  function showFrame(p) {
    const doc = E.bricksDoc(E.renderBricks(p.sections, CLASSES, { h1: 'page' }), { frameId: 'main', vh: DEVICE_H[device] });
    useFrame(true); if (doc !== pvDoc) { pvDoc = doc; pvFrame.srcdoc = doc; } else selFrame(); fit();
  }
  const scrollBox = el => { for (let n = el.parentElement; n; n = n.parentElement) { const o = getComputedStyle(n).overflowY; if (/(auto|scroll)/.test(o) && n.scrollHeight > n.clientHeight) return n; } return document.scrollingElement; };
  addEventListener('message', ev => {
    if (ev.source !== pvFrame.contentWindow) return; const d = ev.data || {};
    if (d.udkast === 'h') { if (d.h > 0 && Math.abs(d.h - pvH) > 1) { pvH = d.h; fit(); } }
    else if (d.udkast === 'ready') selFrame();
    else if (d.udkast === 'sel') { selUid = selUid === d.uid ? null : d.uid; render(); }
    else if (d.udkast === 'top') { const box = scrollBox(pvFrame); const sc = pvFrame.getBoundingClientRect().width / (DEVICES[device] || 1); const y = pvFrame.getBoundingClientRect().top + d.top * sc - 130; if (box === document.scrollingElement) scrollBy({ top: y, behavior: 'smooth' }); else box.scrollBy({ top: y - box.getBoundingClientRect().top, behavior: 'smooth' }); }
  });

  /* ---------- ikoner (Font Awesome som script – ellers vises enkle tegn) ---------- */
  function faApply(el, shadow, tries) {
    try {
      const FA = window.FontAwesome;
      if (!FA || !FA.dom) { if ((tries || 0) < 12) setTimeout(() => faApply(el, shadow, (tries || 0) + 1), 500); return; }
      if (!shadow.__fa) { const st = document.createElement('style'); st.textContent = FA.dom.css(); shadow.prepend(st); shadow.__fa = true; }
      FA.dom.i2svg({ node: el });
    } catch (_) { }
  }

  /* ---------- hjælpere ---------- */
  const setStatus = (t, kind) => { const el = $('status'); el.textContent = t || ''; el.dataset.kind = kind || ''; };
  const errCopy = e => 'Noget gik galt: ' + ((e && e.message) || e);
  const snap = () => JSON.stringify({ brief: state.brief, proposals: state.proposals, active: state.active, guess: state.guess || null });
  const pushHist = () => { hist.push(snap()); if (hist.length > 8) hist.shift(); };
  const tlf = () => '';                                   // telefonnummer er droppet: templates beholder deres pladsholder

  /* ---------- brief ---------- */
  function readBrief() { return { navn: $('navn').value.trim(), branche: (selCust && selCust.branche) || '', kunde: selCust ? { id: selCust.id, name: selCust.name, website: selCust.website } : null, msg: '', want: [...document.querySelectorAll('#wants input:checked')].map(x => x.value), h2: +((document.querySelector('input[name=h2]:checked') || {}).value || 3), heroForm: (v => v === 'form' ? true : v === 'noform' ? false : null)((document.querySelector('input[name=hero]:checked') || {}).value), sidetype: (document.querySelector('input[name=sidetype]:checked') || {}).value || 'Forside', prefix: $('prefix').value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') }; }

  /* ---------- kunde fra ClickUp (Opstarter: to-do, afventer, i gang, på ugen – med HOS/HOS+/RE/RE+) ----------
     Uden ClickUp (lokalt, eller hvis det fejler) skriver man bare kundens navn. */
  let CUST = null, selCust = null, custHi = -1, custClosed = false;
  const sortCust = l => Array.isArray(l) && l.length ? l.slice().sort((x, y) => String(x.name).localeCompare(String(y.name), 'da')) : null;
  let custLoading = IN_GAS;
  if (IN_GAS) { try { CUST = sortCust(JSON.parse(localStorage.getItem(CUST_CACHE) || 'null')); } catch (_) { } }   // sidste liste vises med det samme, den friske kommer bagefter
  const custP = (IN_GAS ? EARLY.customers : fetch('.claude/dev-customers.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null)).then(l => { const x = sortCust(l); if (x) { CUST = x; if (IN_GAS) try { localStorage.setItem(CUST_CACHE, JSON.stringify(x)); } catch (_) { } } custLoading = false; if (!CUST) return null; if (document.activeElement === $('navn')) renderCust(); return CUST; }).catch(() => { custLoading = false; return CUST; });   // lokal test: .claude/dev-customers.json (ligger ikke i repoet)
  custP.then(l => { if (!l) { $('navn').placeholder = 'Kundens navn, fx Best Renovering ApS'; $('navn').setAttribute('aria-label', 'Kundens navn'); renderCust(); } else if (document.activeElement === $('navn')) renderCust(); });
  const custHits = () => { const q = $('navn').value.trim().toLowerCase(); if (!CUST) return []; return (q && !(selCust && selCust.name.toLowerCase() === q) ? CUST.filter(c => (c.name + ' ' + (c.branche || '') + ' ' + (c.website || '')).toLowerCase().includes(q)) : CUST).slice(0, 80); };
  function renderCust() {
    const ul = $('custList'); const open = (!!CUST || custLoading) && document.activeElement === $('navn') && !custClosed; ul.hidden = !open; $('navn').setAttribute('aria-expanded', String(open)); if (!open) return;
    if (!CUST) { ul.innerHTML = '<li class="cempty">Henter kunder fra ClickUp…</li>'; return; }
    const hits = custHits(); if (custHi >= hits.length) custHi = hits.length - 1;
    ul.innerHTML = hits.length ? hits.map((c, i) => `<li role="option" data-id="${E.esc(c.id)}" aria-selected="${i === custHi}"><b>${E.esc(c.name)}</b><small>${E.esc(c.branche || 'Branche ikke angivet')}</small></li>`).join('') : '<li class="cempty">Ingen kunder i Opstarter matcher. Skriv bare navnet.</li>';
    const a = ul.querySelector('[aria-selected=true]'); if (a) a.scrollIntoView({ block: 'nearest' });
  }
  const hostOfUrl = u => { try { return new URL(/^https?:/i.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, ''); } catch (_) { return u; } };
  function renderCustInfo() {
    const el = $('custInfo'), c = selCust; el.hidden = !c; if (!c) { el.innerHTML = ''; return; }
    const href = c.website ? (/^https?:/i.test(c.website) ? c.website : 'https://' + c.website) : '';
    el.innerHTML = `<div class="crow"><span>Domæne: ${href ? `<a href="${E.esc(href)}" target="_blank" rel="noopener">${E.esc(hostOfUrl(c.website))}</a>` : '<b>ikke angivet</b>'}</span>${c.url ? `<span>ClickUp: <a href="${E.esc(c.url)}" target="_blank" rel="noopener">Link</a></span>` : ''}</div>`;
  }
  function pickCust(c) { selCust = c; custHi = -1; $('navn').value = c.name; $('navn').dispatchEvent(new Event('input')); $('custList').hidden = true; $('navn').setAttribute('aria-expanded', 'false'); renderCustInfo(); }
  $('navn').addEventListener('input', () => { if (selCust && $('navn').value.trim() !== selCust.name) { selCust = null; renderCustInfo(); } custHi = -1; custClosed = false; renderCust(); });
  $('navn').addEventListener('focus', renderCust);
  // klik i feltet: fold listen ud eller sammen. Man kan stadig skrive for at søge (så foldes den ud igen)
  $('navn').addEventListener('mousedown', () => { if (document.activeElement !== $('navn')) { custClosed = false; return; } custClosed = !$('custList').hidden; if (custClosed) { $('custList').hidden = true; $('navn').setAttribute('aria-expanded', 'false'); } else renderCust(); });
  $('navn').addEventListener('blur', () => setTimeout(() => { $('custList').hidden = true; $('navn').setAttribute('aria-expanded', 'false'); }, 120));
  $('custList').addEventListener('mousedown', e => { const li = e.target.closest('li[data-id]'); if (!li) return; e.preventDefault(); const c = (CUST || []).find(x => x.id === li.dataset.id); if (c) pickCust(c); });
  $('navn').addEventListener('keydown', e => {
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && $('custList').hidden && CUST) { custClosed = false; renderCust(); }
    const open = !$('custList').hidden, hits = open ? custHits() : [];
    if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && hits.length) { e.preventDefault(); custHi = (custHi + (e.key === 'ArrowDown' ? 1 : hits.length - 1)) % hits.length; renderCust(); return; }
    if (e.key === 'Escape' && open) { $('custList').hidden = true; return; }
    if (e.key === 'Enter' && !e.isComposing && !e.shiftKey) { e.preventDefault(); if (open && custHi >= 0 && hits[custHi]) { pickCust(hits[custHi]); return; } $('genBtn').click(); }
  });

  // hilsen med fornavn, når man er logget ind (navnet kommer fra ClickUp)
  if (IN_GAS) EARLY.me.then(m => { const first = String((m && m.name) || '').trim().split(/\s+/)[0]; if (first) $('hi').innerHTML = `Hej <b>${E.esc(first)}</b> 👋<br>Lad os bygge dit udkast`; }).catch(() => { });

  /* ---------- tjekliste: hvilke typer skal med (alle typer fra templates, undtagen hero og Content, der altid er med) ---------- */
  for (const r of document.querySelectorAll('input[name=hero]')) r.addEventListener('change', () => { $('heroBox').classList.remove('need'); if (/header/i.test($('status').textContent)) setStatus(''); });
  $('wants').innerHTML = [...E.catList(LIB).filter(c => c !== 'Header' && c !== 'Content'), ...(Object.keys(LIB).some(E.isCtaText) ? ['CTA sektion'] : [])].map(c => `<label><input type="checkbox" value="${E.esc(c)}"> ${E.esc(c)}</label>`).join('');   // CTA sektion: kontaktsektioner uden formular

  /* ---------- kundens navn → klasse-præfiks og telefon ---------- */
  let prefixTouched = false;
  const syncPrefix = () => { $('prefixShow').textContent = readBrief().prefix || 'kundens-navn'; };
  $('prefixEdit').onclick = () => { $('prefix').hidden = !$('prefix').hidden; if (!$('prefix').hidden) $('prefix').focus(); };
  $('prefix').addEventListener('input', () => { prefixTouched = $('prefix').value.trim() !== ''; syncPrefix(); });
  $('prefix').addEventListener('change', () => { if (cur()) render(); });                       // ændres præfikset bagefter, opdateres JSON'en
  // classes-præfikset følger kunden: med kundeliste først når en kunde vælges (eller feltet forlades med et frit navn), ellers mens man skriver
  const prefixFromName = () => { if (prefixTouched) return; $('prefix').value = E.classPrefix($('navn').value); syncPrefix(); if (cur()) render(); };
  $('navn').addEventListener('input', () => { if (!CUST || selCust) prefixFromName(); });
  $('navn').addEventListener('change', prefixFromName);

  /* ---------- udkast ud fra templates ---------- */
  const planToSections = f => E.sanitizePlan(f.sektioner, LIB).flatMap(x => { const secs = E.makeSections(LIB, x.tpl, x.hvorfor, tlf()); const n = parseInt(x.antal, 10); if (n > 0) { const r = E.resizeGroup(secs[0], n, CLASSES); if (r.ok) secs[0].warns = r.warn; } return secs; });
  async function generate(more) {
    const b = readBrief();
    if (!more) { if (!b.navn) { setStatus('Vælg din kunde først.', 'warn'); return; } if (b.heroForm === null) { $('heroBox').classList.add('need'); setStatus('Vælg header: med eller uden kontaktformular.', 'warn'); return; } state.brief = b; } else b.navn = state.brief.navn;
    const brief = more ? state.brief : b; const n = more ? 1 : +$('count').value;
    setStatus(''); pushHist(); genBusy(true); const t0 = Date.now();
    try {
      const existing = more && cur() ? [cur().sections.map(s => s.tpl)] : [];   // nyt udkast: undgå det nuværendes templates
      const insp = await inspirationFor(brief, n, more);
      const res = insp ? E.localPlan(Object.assign({}, brief, { branche: insp.gb.b }), LIB, n, existing, insp.sites) : E.localPlan(more && state.guess && !brief.branche ? Object.assign({}, brief, { branche: state.guess.b }) : brief, LIB, n, existing, []);
      if (insp) res.branche = insp.gb; else if (more && state.guess && !brief.branche) res.branche = state.guess; if (res.branche && res.branche.via === 'dit valg' && brief.kunde) res.branche = Object.assign({}, res.branche, { via: 'fra ClickUp' }); if (!more) state.guess = res.branche || null;
      const guessNote = res.branche && res.branche.b ? (res.branche.via === 'dit valg' || res.branche.via === 'fra ClickUp' ? ` Branche: ${res.branche.b} (${res.branche.via}).` : ` Branche gættet: ${res.branche.b}${res.branche.via === 'tilfældigt' ? ' (tilfældigt – vælg Branche ved Designforslag, hvis du vil styre det)' : ''}.`) : '';
      const made = (res.forslag || []).slice(0, n).map((f, i) => ({ id: 'p' + Date.now() + i + 'x', name: f.navn || ('Udkast ' + (state.proposals.length + i + 1)), note: f.note || '', sections: planToSections(f) })).filter(p => p.sections.length);
      if (!made.length) throw new Error('Kunne ikke sætte et udkast sammen af templates.');
      state.proposals = made; state.active = 0;   // ét udkast ad gangen; Fortryd giver det forrige tilbage
      setStatus((more ? 'Nyt udkast klar.' : 'Udkast klar.') + guessNote, 'ok');
    } catch (e) { hist.pop(); setStatus(errCopy(e), 'err'); }
    await new Promise(r => setTimeout(r, Math.max(0, 450 - (Date.now() - t0))));   // vis cirklen et øjeblik, så man ser, at der sker noget
    genBusy(false); render();
  }
  function burst(btn, e) {
    const r = btn.getBoundingClientRect(); const x = (e && e.clientX ? e.clientX : r.left + r.width / 2) - r.left, y = (e && e.clientY ? e.clientY : r.top + r.height / 2) - r.top;
    const rip = document.createElement('span'); rip.className = 'ripple'; rip.style.cssText = `left:${x}px;top:${y}px`; btn.querySelector('.fx').appendChild(rip); setTimeout(() => rip.remove(), 800);
    const cols = ['#225581', '#5b8fbd', '#ffffff', '#a9c6e0', '#1a4061'];
    for (let i = 0; i < 0; i++) { const p = document.createElement('span'); p.className = 'spark'; const an = Math.random() * Math.PI * 2, d = 38 + Math.random() * 70;
      p.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(an) * d}px;--dy:${Math.sin(an) * d}px;--s:${4 + Math.random() * 6}px;background:${cols[i % cols.length]};animation-delay:${Math.random() * 70}ms`; btn.appendChild(p); setTimeout(() => p.remove(), 1000); }
    btn.classList.remove('go'); void btn.offsetWidth; btn.classList.add('go'); setTimeout(() => btn.classList.remove('go'), 1600);
  }
  // knappen viser en drejende cirkel, mens udkastet laves
  function genBusy(on) { const b = $('genBtn'); b.disabled = on; b.classList.toggle('loading', on); b.querySelector('.gtxt').textContent = on ? 'Genererer udkast…' : 'Generer udkast'; const m = $('moreBtn'); if (m) m.disabled = on; }
  $('genBtn').onclick = e => { if ($('genBtn').disabled) return; burst($('genBtn'), e); generate(false); };
  // små stjerner fra tryllestaven, mens man holder musen over knappen
  { const btn = $('genBtn'); let tw = null;
    const sparkle = () => { const w = btn.querySelector('.wand'); if (!w || btn.disabled) return; const b = btn.getBoundingClientRect(), r = w.getBoundingClientRect();
      for (let i = 0; i < 1; i++) { const s = document.createElement('span'); s.className = 'twk'; s.textContent = Math.random() < 0.5 ? '✦' : '✧'; const an = -Math.PI / 2 + (Math.random() - 0.2) * 1.2, d = 10 + Math.random() * 10;
        s.style.cssText = `left:${r.left - b.left + r.width * 0.75}px;top:${r.top - b.top + r.height * 0.1}px;--dx:${Math.cos(an) * d}px;--dy:${Math.sin(an) * d}px;--s:${6 + Math.random() * 3}px`; btn.appendChild(s); setTimeout(() => s.remove(), 1200); } };
    btn.addEventListener('mouseenter', () => { sparkle(); clearInterval(tw); tw = setInterval(sparkle, 650); });
    btn.addEventListener('mouseleave', () => { clearInterval(tw); tw = null; }); }



  /* ---------- beskrivelse (resumé når der er et udkast) ---------- */
  const VIA = { 'navnet': 'gættet ud fra navnet', 'konteksten': 'gættet ud fra dine ønsker', 'navnet (ligner et kendt site)': 'gættet: navnet ligner et kendt site', 'tilfældigt': 'gættet tilfældigt', 'dit valg': 'dit valg', 'fra ClickUp': 'fra ClickUp' };
  function renderBriefSum() {
    const el = $('briefSum'); const b = state.brief || {}; const has = !!cur(); el.hidden = !has; if (!has) return;
    const g = state.guess; const side = b.sidetype && b.sidetype !== 'Forside' ? b.sidetype : 'Forside'; const antal = state.proposals.length;
    const bran = g && g.b ? `<span class="bchip">${E.esc(g.b)}</span><small>${E.esc(VIA[g.via] || g.via || '')}</small>` : b.branche ? `<span class="bchip">${E.esc(b.branche)}</span><small>${b.kunde ? 'fra ClickUp' : 'dit valg'}</small>` : '<small>gættes ud fra navnet</small>';
    el.innerHTML = `<div class="bsum-h"><b>Info</b></div><dl class="bsum-l"><div><dt>Kunde</dt><dd>${E.esc(b.navn || '')}</dd></div><div><dt>Branche</dt><dd>${bran}</dd></div><div><dt>Class-name</dt><dd><code>${E.esc($('prefixShow').textContent || '')}</code></dd></div></dl>`;
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && selUid && $('picker').hidden) { selUid = null; render(); } });
  document.addEventListener('click', e => { if (!selUid || !$('picker').hidden) return; const path = e.composedPath ? e.composedPath() : []; if (path.some(n => n && n.nodeType === 1 && (n.id === 'list' || n.id === 'pvOuter' || n.id === 'picker' || /^(BUTTON|INPUT|TEXTAREA|SELECT|SUMMARY|LABEL|A|DIALOG)$/.test(n.tagName)))) return; selUid = null; render(); });
  /* ---------- antal udkast ---------- */
  const syncCount = () => { for (const r of document.querySelectorAll('input[name=cnt]')) { r.checked = r.value === $('count').value; r.parentElement.classList.toggle('on', +r.value <= +$('count').value); } };
  for (const r of document.querySelectorAll('input[name=cnt]')) r.addEventListener('change', () => { $('count').value = r.value; syncCount(); });
  const hovCount = n => { for (const r of document.querySelectorAll('input[name=cnt]')) r.parentElement.classList.toggle('hov', n > 0 && +r.value <= n && !r.disabled); };
  for (const r of document.querySelectorAll('input[name=cnt]')) { r.parentElement.addEventListener('mouseenter', () => { if (!r.disabled) hovCount(+r.value); }); r.parentElement.addEventListener('mouseleave', () => hovCount(0)); r.addEventListener('focus', () => { if (!r.disabled) hovCount(+r.value); }); r.addEventListener('blur', () => hovCount(0)); }

  /* ---------- inspiration: HOS-kunder fra ClickUp. Værktøjet ser selv på deres forsider og finder de templates, sektionerne ligner ----------
     Uden ClickUp (lokalt, eller hvis det fejler) vælges sektionerne ud fra standardopbygningen. */
  const inspP = IN_GAS ? gas('inspiration').then(l => { const x = (l || []).map(i => ({ n: i.name, u: i.website, b: i.branche })).filter(i => i.u && i.b); return x.length ? x : null; }).catch(() => null) : Promise.resolve(null);
  const SITE_CACHE = 'udkast-sites-v1', SITE_DAYS = 7;
  const siteCache = () => { try { return JSON.parse(localStorage.getItem(SITE_CACHE) || '{}'); } catch (_) { return {}; } };
  async function siteMatch(x) {
    const host = String(x.u).replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[\/?#]/)[0].toLowerCase(); const c = siteCache(); const hit = c[host];
    if (hit && Date.now() - hit.t < SITE_DAYS * 864e5) return hit.m;
    try { const m = E.analyzeSite(await gas('siteHtml', x.u), LIB, CLASSES).map(r => ({ k: r.k, c: r.c })); c[host] = { t: Date.now(), m }; try { localStorage.setItem(SITE_CACHE, JSON.stringify(c)); } catch (_) { } return m; }
    catch (_) { return null; }   // siden svarer ikke: spring den over
  }
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  async function inspirationFor(brief, n, more) {
    const list = await inspP; if (!list) return null;
    const gb = brief.branche ? { b: brief.branche, via: brief.kunde ? 'fra ClickUp' : 'dit valg' } : more && state.guess ? state.guess : E.guessBranche(brief.navn, brief.msg, list);
    const own = brief.kunde && brief.kunde.website ? hostOfUrl(brief.kunde.website) : '';
    const same = shuffle(list.filter(x => x.b === gb.b && (!own || hostOfUrl(x.u) !== own))).slice(0, n + 2); if (!same.length) return { gb, sites: [] };
    setStatus(`Kigger på ${same.length} HOS-${same.length === 1 ? 'side' : 'sider'} i branchen ${gb.b}…`);
    const ms = await Promise.all(same.map(siteMatch));
    return { gb, sites: same.map((x, i) => ms[i] && ms[i].length >= 3 ? Object.assign({}, x, { m: ms[i], c: ms[i].map(y => y.c) }) : null).filter(Boolean) };
  }
  syncCount(); if (!matchMedia('(pointer: coarse)').matches) setTimeout(() => { try { custClosed = true; $('navn').focus({ preventScroll: true }); } catch (_) { } }, 700);   // markøren står klar, men listen åbner først ved klik eller skrivning

  /* ---------- start forfra ---------- */
  let resetT = null;
  function doReset() {
    state = { brief: {}, proposals: [], active: 0, guess: null }; hist = []; selUid = null; exp = null; lastHas = false; prefixTouched = false;
    selCust = null; renderCustInfo(); for (const id of ['navn', 'prefix']) $(id).value = ''; for (const x of document.querySelectorAll('#wants input, input[name=hero]')) x.checked = false; { const d = document.querySelector('input[name=h2][value="3"]'); if (d) d.checked = true; } $('heroBox').classList.remove('need'); $('count').value = '1'; if ($('branche')) $('branche').value = ''; syncCount(); const f = document.querySelector('input[name=sidetype][value=Forside]'); if (f) f.checked = true;
    $('briefCard').open = true;
    syncPrefix(); $('prefix').hidden = true; setStatus('Startet forfra.', 'ok'); window.scrollTo({ top: 0 }); render();
  }
  const resetLbl = t => { $('resetBtn').querySelector('.blbl').textContent = t; };
  $('resetBtn').onclick = () => {
    const dirty = state.proposals.length || $('navn').value || document.querySelector('#wants input:checked');
    if (!dirty) { doReset(); return; }
    if (resetT) { clearTimeout(resetT); resetT = null; resetLbl('Start forfra'); $('resetBtn').classList.remove('warn'); doReset(); return; }
    resetLbl('Er du sikker?'); $('resetBtn').classList.add('warn');
    resetT = setTimeout(() => { resetT = null; resetLbl('Start forfra'); $('resetBtn').classList.remove('warn'); }, 3500);
  };

  /* ---------- fortryd ---------- */
  const undo = () => { if (!hist.length) return; state = JSON.parse(hist.pop()); setStatus('Fortrudt.', 'ok'); render(); };
  document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '') && hist.length) { e.preventDefault(); undo(); } });   // Cmd/Ctrl + Z fortryder

  /* ---------- sektionsliste: rækkefølge, variant, vælg, fjern ---------- */
  function swapTo(index, tpl) {
    pushHist(); E.applyOps(cur(), [{ op: 'swap', index, tpl, manual: true }], LIB, tlf(), CLASSES); render();
  }
  let delArm = null, delT = null;
  $('list').addEventListener('click', ev => {
    const b = ev.target.closest('button[data-a]');
    if (!b) { const li = ev.target.closest('li[data-uid]'); if (li) { if (selUid === li.dataset.uid) { selUid = null; render(); return; } selUid = li.dataset.uid; render(); if (!pvFrame.hidden) { if (pvFrame.contentWindow) pvFrame.contentWindow.postMessage({ udkast: 'where', uid: li.dataset.uid }, '*'); } else { const el = root.querySelector(`[data-sec="${li.dataset.uid}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } } return; }
    let i = +b.dataset.i; const a = b.dataset.a, p = cur(); let s = p.sections[i - 1];
    if ((a === 'variant' || a === 'pick') && s.part > 1) { let j = i - 1; while (j > 0 && !(p.sections[j - 1].tpl === s.tpl && p.sections[j - 1].part === 1)) j--; if (j > 0) { i = j; s = p.sections[j - 1]; } }   // del 2 af en template: skift hele templaten
    pendingAnim = { i, a };
    if (a === 'copy') { copySection(s, b); return; }
    if (a === 'inc' || a === 'dec') { const n = (E.groupInfoSec(s) || { n: 0 }).n + (a === 'inc' ? 1 : -1); pushHist(); const r = E.resizeGroup(s, n, CLASSES); if (r.ok) s.warns = r.warn; else setStatus(r.msg, 'warn'); render(); return; }
    if (a === 'variant') { const used = p.sections.map(x => x.tpl); const hf = (state.brief || {}).heroForm; let nx = E.nextVariant(LIB, s.tpl, used);
      if (E.categoryOf(s.tpl) === 'Header' && typeof hf === 'boolean') for (let g = 0; nx && g < 40 && E.hasForm(LIB, nx) !== hf; g++) nx = E.nextVariant(LIB, nx, used);   // heroen bliver med/uden kontaktformular, som valgt
      if (nx && nx !== s.tpl) swapTo(i, nx); return; }
    if (a === 'pick') { openPicker({ mode: 'swap', index: i, cat: E.categoryOf(s.tpl) }); return; }
    if (a === 'del') {   // første klik: "Er du sikker?", andet klik fjerner
      if (delArm !== s.uid) { delArm = s.uid; clearTimeout(delT); delT = setTimeout(() => { delArm = null; render(); }, 3500); render(); return; }
      delArm = null; clearTimeout(delT); pushHist(); E.applyOps(p, [{ op: 'remove', index: i }], LIB, tlf(), CLASSES); render(); return; }
  });
  let dragFrom = null;
  $('list').addEventListener('dragstart', ev => { const li = ev.target.closest('li[data-i]'); if (!li) return; dragFrom = +li.dataset.i; li.classList.add('drag'); ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', String(dragFrom)); } catch (_) { } });
  $('list').addEventListener('dragend', () => { dragFrom = null; for (const l of document.querySelectorAll('#list li')) l.classList.remove('drag', 'over'); });
  $('list').addEventListener('dragover', ev => { const li = ev.target.closest('li[data-i]'); if (!li || dragFrom == null) return; ev.preventDefault(); for (const l of document.querySelectorAll('#list li')) l.classList.toggle('over', l === li); });
  $('list').addEventListener('drop', ev => {
    const li = ev.target.closest('li[data-i]'); if (!li || dragFrom == null) return; ev.preventDefault(); const to = +li.dataset.i; const from = dragFrom; dragFrom = null;
    if (to !== from) { pushHist(); E.applyOps(cur(), [{ op: 'move', index: from, to }], LIB, tlf(), CLASSES); } render();
  });
  $('addBtn').onclick = () => openPicker({ mode: 'add', cat: 'Nyeste' });

  /* ---------- vælger med live-miniaturer ---------- */
  let pk = null;
  function openPicker(opts) { pk = opts; $('picker').hidden = false; $('pkClose').focus(); renderPicker(); }
  // miniaturer: Bricks-preview i en lille iframe (uden JS), tegnes først når kortet kommer i syne
  const thumbIO = new IntersectionObserver(ents => { for (const en of ents) { if (!en.isIntersecting) continue; const host = en.target; thumbIO.unobserve(host); if (host.firstChild) continue;
    const f = document.createElement('iframe'); f.setAttribute('sandbox', ''); f.setAttribute('loading', 'lazy'); f.setAttribute('tabindex', '-1'); f.title = 'Miniature';
    const sc = (host.clientWidth || 300) / 1280; f.style.cssText = `width:1280px;height:${Math.ceil((host.clientHeight || 200) / sc)}px;border:0;transform:scale(${sc});transform-origin:top left;pointer-events:none;background:#fff`;
    f.srcdoc = E.bricksDoc(E.renderBricks([E.makeSection(LIB, host.dataset.k)], CLASSES), { scripts: false, vh: 800 }); host.appendChild(f); } }, { rootMargin: '200px' });
  function closePicker() { $('picker').hidden = true; $('pkGrid').innerHTML = ''; pk = null; }
  $('pkClose').onclick = closePicker;
  $('picker').addEventListener('click', e => { if (e.target === $('picker')) closePicker(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('picker').hidden) closePicker(); });
  const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (_) { return 'online'; } };
  let pkSortPref = 'nyeste';
  const SORTS = [['nyeste', 'Nyeste først'], ['aeldste', 'Ældste først'], ['navn', 'Navn A–Å'], ['brugt', 'Mest brugt']];
  function renderPicker() {
    $('pkTitle').textContent = pk.mode === 'swap' ? `Vælg anden variant af sektion ${pk.index}` : 'Tilføj sektion';
    $('pkCats').innerHTML = [...['Nyeste', ...(E.groupKeys(LIB, 'Live sektioner').length ? ['Live sektioner'] : [])], ...E.catList(LIB)].map(n => `<button class="chip" aria-pressed="${n === pk.cat}" data-cat="${n}">${n}</button>`).join('');
    pk.sort = pk.sort || pkSortPref; { const so = $('pkSort'); if (so) { so.hidden = pk.cat === 'Nyeste'; so.value = pk.sort; } }
    renderPkFoot();
    let keys = pk.cat === 'Nyeste' ? E.newestKeys(LIB, 10) : pk.cat === 'Live sektioner' ? E.groupKeys(LIB, 'Live sektioner') : E.variantsOf(LIB, pk.cat); const grid = $('pkGrid'); grid.innerHTML = '';
    if (pk.cat !== 'Nyeste' && pk.cat !== 'Live sektioner' && pk.mode !== 'swap') keys = keys.filter(k => !(LIB[k] && LIB[k].group));      // live sektioner har deres egen fane
    if (pk.cat !== 'Nyeste') keys = E.sortKeys(LIB, keys, pk.sort || 'nyeste', k => (USE[k] || [0])[0]);
    if (pk.cat === 'Live sektioner') { const subs = [...new Set(keys.map(k => E.categoryOf(k)))]; if (pk.sub && subs.includes(pk.sub)) keys = keys.filter(k => E.categoryOf(k) === pk.sub);
      $('pkCats').insertAdjacentHTML('beforeend', '<div class="pksub" style="flex-basis:100%;display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">' + ['Alle', ...subs].map(sb => `<button class="chip sm" data-sub="${E.esc(sb)}" aria-pressed="${(pk.sub || 'Alle') === sb}">${E.esc(sb)}</button>`).join('') + '</div>'); }
    const p = cur(); const curTpl = pk.mode === 'swap' && p ? p.sections[pk.index - 1].tpl : null;
    for (const k of keys) {
      const card = document.createElement('button'); card.className = 'pkcard'; card.dataset.k = k;
      const u = USE[k] || [0, 0];
      card.innerHTML = `<div class="pkprev"></div><div class="pkmeta"><b>${E.esc(E.displayName(k))}</b>${(LIB[k] && LIB[k].group === 'Live sektioner') ? (LIB[k].url ? `<small>${E.esc(hostOf(LIB[k].url))}${k === curTpl ? ' · nuværende' : ''}</small>` : (k === curTpl ? '<small>nuværende</small>' : '')) : `<small>${E.esc(k)}${k === curTpl ? ' · nuværende' : ''}${u[0] ? ' · bruges af ' + u[0] + ' sites' : ''}</small>`}${(LIB[k] && LIB[k].url) ? `<span class="pklink" role="link" tabindex="0" data-url="${E.esc(LIB[k].url)}">↗ Åbn siden</span>` : ''}${E.describeKey(k) ? `<span class="pkdesc">${E.esc(E.describeKey(k))}</span>` : ''}</div>`;
      grid.appendChild(card);
      const host = card.querySelector('.pkprev');
      if (BRICKS_OK) { host.dataset.k = k; thumbIO.observe(host); continue; }
      const sh = host.attachShadow({ mode: 'open' });
      const r = E.renderSections([E.makeSection(LIB, k)], CLASSES, VARS);
      sh.innerHTML = `<style>${r.css}#f{width:1280px;transform:scale(.234);transform-origin:top left;container-type:inline-size;background:var(--bg-body,#fff)}</style><div id="f">${r.html}</div>`;
      faApply(sh.getElementById('f'), sh);
    }
  }
  if ($('pkSort')) $('pkSort').addEventListener('change', e => { if (pk) { pk.sort = pkSortPref = e.target.value; renderPicker(); } });
  $('pkCats').addEventListener('click', e => { const sb = e.target.closest('[data-sub]'); if (sb && pk) { pk.sub = sb.dataset.sub === 'Alle' ? '' : sb.dataset.sub; renderPicker(); return; }
     const b = e.target.closest('[data-cat]'); if (b) { pk.cat = b.dataset.cat; renderPicker(); } });
  $('pkGrid').addEventListener('click', e => {
    const lk = e.target.closest('.pklink'); if (lk) { e.stopPropagation(); window.open(lk.dataset.url, '_blank', 'noopener'); return; }
    const c = e.target.closest('.pkcard'); if (!c || !pk) return;
    const k = c.dataset.k, o = pk; closePicker();
    if (o.mode === 'swap') { swapTo(o.index, k); return; }
    const p = cur(); pushHist(); const cat = E.categoryOf(k); const addOp = { op: 'add', tpl: k, manual: true }; if (cat === 'Menu') addOp.at = 1; else if (p.sections.length && E.categoryOf(p.sections[p.sections.length - 1].tpl) === 'Footer' && cat !== 'Footer') addOp.at = p.sections.length; E.applyOps(p, [addOp], LIB, tlf(), CLASSES); render();
  });


  function renderPkFoot() { $('pkSheet').textContent = sheetNote; }

  /* ---------- faner (udkast) ---------- */
  $('tabs').addEventListener('click', e => {
    if (e.target.closest('#moreBtn')) { generate(true); return; }
    const b = e.target.closest('[data-tab]'); if (!b) return; state.active = +b.dataset.tab;
    render();
  });


  /* ---------- eksport ---------- */
  let flashT = null;
  function flashCopied() { const b = $('copyBtn'), l = b.querySelector('.blbl'); l.textContent = '✓ Kopieret'; b.classList.add('done'); clearTimeout(flashT); flashT = setTimeout(() => { l.textContent = 'Kopiér JSON'; b.classList.remove('done'); }, 2400); }
  async function copyJson() {
    const text = JSON.stringify(exp.json);
    try { await navigator.clipboard.writeText(text); flashCopied(); setStatus('JSON kopieret. Indsæt i Bricks med Ctrl/Cmd + V.', 'ok'); return; } catch (_) { }
    try { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); if (ok) { flashCopied(); setStatus('JSON kopieret. Indsæt i Bricks med Ctrl/Cmd + V.', 'ok'); return; } } catch (_) { }
    $('cfText').value = text; $('copyFallback').hidden = false; $('cfText').focus(); $('cfText').select(); setStatus('Browseren blokerer kopiering her. JSON er markeret, tryk Ctrl/Cmd + C.', 'warn');
  }
  $('copyBtn').onclick = () => { if (exp) copyJson(); };
  const CHECK_SVG = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  // heroens H1 er kundens navn (H1 i heroen, ellers heroens første overskrift)
  function nameH1(p) {
    const navn = String((state.brief || {}).navn || '').trim(); const hero = p && p.sections.find(s => E.categoryOf(s.tpl) === 'Header'); if (!navn || !hero) return;
    const hs = hero.els.filter(e => e.name === 'heading'); const h = hs.find(e => (e.settings || {}).tag === 'h1') || hs[0]; if (!h) return;
    h.settings = Object.assign({}, h.settings, { text: navn });
  }
  async function copySection(s, btn) {
    const ex = E.buildExport(Object.assign({}, cur(), { sections: [s] }), CLASSES, { prefix: readBrief().prefix, h1: 'hero' }); const text = JSON.stringify(ex.json); let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (_) { try { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch (_) { } }
    if (ok) { const old = btn.innerHTML; btn.innerHTML = CHECK_SVG + 'Kopieret'; btn.classList.add('done'); setTimeout(() => { btn.innerHTML = old; btn.classList.remove('done'); }, 1800); setStatus('Sektionens JSON er kopieret. Indsæt i Bricks med Ctrl/Cmd + V.', 'ok'); }
    else { $('cfText').value = text; $('copyFallback').hidden = false; $('cfText').focus(); $('cfText').select(); setStatus('Browseren blokerer kopiering her. JSON er markeret, tryk Ctrl/Cmd + C.', 'warn'); }
  }
  $('cfClose').onclick = () => { $('copyFallback').hidden = true; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('copyFallback').hidden) $('copyFallback').hidden = true; });

  /* ---------- visning ---------- */
  if (window.matchMedia && window.matchMedia('(max-width:700px)').matches) device = 'mobil';                  // på en telefon vises mobilversionen som standard
  const BRANDS = { templates: { cta: '#225581', links: '#1a4061' }, stock: { cta: '#e60c16', links: '#ae0911' } };
  $('brandSel').onchange = () => { const br = BRANDS[$('brandSel').value] || BRANDS.templates; for (const v of VARS) if (v[0] === 'cta' || v[0] === 'links') v[1] = br[v[0]]; render(); };
  for (const x of document.querySelectorAll('#devices button')) x.setAttribute('aria-pressed', String(x.dataset.d === device));
  for (const b of document.querySelectorAll('#devices button')) b.onclick = () => { device = b.dataset.d; for (const x of document.querySelectorAll('#devices button')) x.setAttribute('aria-pressed', x === b); if (BRICKS_OK && cur()) showFrame(cur()); else fit(); };
  function fit() {
    const w = DEVICES[device]; const outer = $('pvOuter'); const avail = $('canvas').clientWidth || 900;
    if (!pvFrame.hidden) { const sc = Math.min(1, avail / w); const ch = outer.querySelector('.chrome'); pvFrame.style.cssText = `width:${w}px;height:${pvH}px;transform:scale(${sc});transform-origin:top left;border:0;display:block;background:#fff`; outer.style.width = Math.round(w * sc) + 'px'; outer.style.height = Math.round(pvH * sc + (ch ? ch.offsetHeight : 0)) + 'px'; return; }
    const scale = Math.min(1, avail / w); frame.style.cssText = `width:${w}px;transform:scale(${scale});transform-origin:top left;container-type:inline-size;background:var(--bg-body,#fff);`;
    outer.style.width = Math.round(w * scale) + 'px'; outer.style.height = Math.round(frame.offsetHeight * scale) + 'px';
  }
  { const ro = new ResizeObserver(() => { if (cur()) fit(); }); ro.observe($('canvas')); ro.observe(document.documentElement); }
  addEventListener('resize', () => { if (cur()) requestAnimationFrame(fit); });   // preview zoomer ud, så den altid passer i pladsen

  function render() {
    const p = cur(); const has = !!p; document.body.classList.toggle('home', !has);
    $('empty').hidden = has; $('pvOuter').hidden = !has; $('listCard').hidden = !has; $('tabs').hidden = !has; $('tabrow').hidden = !has; $('chromeUrl').textContent = ((state.brief || {}).navn || 'Udkast') + ' · ' + ((state.brief || {}).sidetype || 'Forside');
    $('copyBtn').disabled = !has;
    if (has !== lastHas) { $('briefCard').open = true; lastHas = has; } $('briefCard').hidden = has; renderBriefSum();
    if (!has) { exp = null; $('valWrap').hidden = true; $('tabs').innerHTML = ''; $('size').textContent = ''; return; }
    $('tabs').innerHTML = `<span class="tab name" aria-pressed="true">Udkast til ${E.esc((state.brief || {}).navn || 'kunden')}</span><button class="tab more" id="moreBtn" type="button" data-lock title="Laver et nyt udkast med samme kunde og valg. Fortryd giver det forrige tilbage"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.6L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.6L20 15.5M20 20v-4.5h-4.5"/></svg>Generer nyt udkast på samme indstillinger</button>`;
    nameH1(p); exp = E.buildExport(p, CLASSES, { prefix: readBrief().prefix }); const val = E.validate(exp); const fails = val.filter(v => !v.pass);
    const pageLike = !E.SECTION_ONLY[(state.brief || {}).sidetype]; const h1n = exp.json.content.filter(e => e.name === 'heading' && (e.settings || {}).tag === 'h1').length; const h1bad = pageLike && h1n !== 1; const h1msg = h1n === 0 ? 'Siden har ingen H1. Der bør være præcis én (typisk hero-overskriften).' : `Siden har ${h1n} H1-overskrifter. Der bør kun være én.`;
    $('valWrap').hidden = !fails.length; const vb = $('valBadge'); vb.dataset.ok = fails.length ? 'no' : 'yes'; vb.textContent = (fails.length ? `⚠ ${fails.length} tjek fejler` : `✓ Klar til Bricks · ${val.length}/${val.length} tjek`) + (h1bad ? ' · ⚠ H1' : '');
    $('valList').innerHTML = val.map(v => `<li data-p="${v.pass}"><span>${v.pass ? '✓' : '✗'}</span> ${E.esc(v.name)}${v.pass ? '' : ' – ' + E.esc(v.detail)}</li>`).join('') + (pageLike ? `<li data-p="${!h1bad}"><span>${h1bad ? '⚠' : '✓'}</span> Præcis én H1 (SEO)${h1bad ? ' – ' + E.esc(h1msg) : ''}</li>` : '');
    const prevUids = lastUids; lastUids = new Set(p.sections.map(s => s.uid));
    $('list').innerHTML = p.sections.map((s, i) => `<li draggable="true" data-i="${i + 1}" data-uid="${s.uid}" class="${s.uid === selUid ? 'sel ' : ''}${s.part > 1 ? 'cont ' : ''}${prevUids.has(s.uid) ? '' : 'new'}"><span class="grip" aria-hidden="true">⠿</span><span class="n">${i + 1}</span><div class="t"><b>${(t => { const m = t.match(/^(.*?)\s*(#\s*\d+.*)$/); return m ? `${E.esc(m[1])} <span class="num">${E.esc(m[2])}</span>` : E.esc(t); })(E.secTitle(s))}${s.parts > 1 ? ` <em class="part" title="${E.esc(E.displayName(s.tpl))} består af ${s.parts} sektioner i Bricks. De kan flyttes eller fjernes hver for sig.">sektion ${s.part} af ${s.parts}</em>` : ''}</b>${/^Erstatning/.test(s.why || '') ? `<small class="secwarn" title="${E.esc(s.why.replace(/^Erstatning: /, ''))}">⚠ Erstatning – der manglede en ledig template til tekstafsnittet</small>` : ''}${s.part > 1 || E.categoryOf(s.tpl) === 'Header' ? '' : E.hasForm(LIB, s.tpl) ? '<small class="secwarn">⚠ Tjek formular-ID efter paste</small>' : ''}${(() => { const gi = E.groupInfoSec(s); return gi && gi.adjustable ? `<span class="cnt" title="Antal ${gi.label} i sektionen. Layoutet tilpasser sig selv"><button data-a="dec" data-i="${i + 1}" data-lock aria-label="Et færre">−</button><b>${gi.n}</b><button data-a="inc" data-i="${i + 1}" data-lock aria-label="Et mere">+</button><em>${gi.label}</em></span>` : ''; })()}</div><div class="ac">
      <button class="lbl" data-a="variant" data-i="${i + 1}" data-lock aria-label="Prøv en anden variant" title="${s.part > 1 ? 'Prøv næste variant af hele ' + E.esc(E.displayName(s.tpl)) : 'Prøv næste variant (fx en anden hero)'}"><svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.3-4.6L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.6L20 15.5M20 20v-4.5h-4.5"/></svg>Ny variant</button><button class="lbl" data-a="pick" data-i="${i + 1}" data-lock aria-label="Vælg variant" title="${s.part > 1 ? 'Vælg en anden variant af hele ' + E.esc(E.displayName(s.tpl)) : 'Vælg variant med billeder'}"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.8"/><rect x="13" y="13" width="7" height="7" rx="1.8"/></svg>Vælg selv</button><button class="lbl" data-a="copy" data-i="${i + 1}" aria-label="Kopiér sektionens JSON" title="Kopiér denne sektions JSON"><svg viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M15.5 8.5V6.7a2.2 2.2 0 0 0-2.2-2.2H6.7a2.2 2.2 0 0 0-2.2 2.2v6.6a2.2 2.2 0 0 0 2.2 2.2h1.8"/></svg>Kopiér</button><button data-a="del" data-i="${i + 1}" data-lock aria-label="Fjern" title="Fjern sektion"${delArm === s.uid ? ' class="arm"' : ''}>${delArm === s.uid ? '<span class="blbl">Er du sikker?</span>' : ''}<svg viewBox="0 0 24 24"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7M10 11v6M14 11v6"/></svg></button></div></li>`).join('');
    if (pendingAnim) { const pa = pendingAnim; pendingAnim = null; const li = $('list').querySelector(`li[data-i="${pa.i}"]`); if (li) { if (pa.a === 'up' || pa.a === 'down') li.classList.add('moved');  } }
    $('planNote').textContent = ''; $('planNote').hidden = true;
    if (BRICKS_OK) showFrame(p); else { useFrame(false);
    const r = E.renderSections(p.sections, CLASSES, VARS, { h1: 'page' }); const selCss = '[data-sec]{scroll-margin-top:130px}' + (selUid && p.sections.some(x => x.uid === selUid) ? `[data-sec="${selUid}"]{outline:4px solid #3a7cc0;outline-offset:-4px;position:relative;z-index:1}` : ''); pvStyle.textContent = '#frame{overflow:hidden}' + r.css + selCss; pvContent.innerHTML = r.html;
    fit(); faApply(pvContent, root); setTimeout(fit, 50); }
    const kb = Math.round(JSON.stringify(exp.json).length / 1024), rawKb = Math.round(JSON.stringify(E.buildExport(p, CLASSES, { raw: true }).json).length / 1024);
    
  }


  render();
})();
