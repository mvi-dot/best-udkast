/* ===== UI v2 ===== */
(function () {
  const $ = id => document.getElementById(id);
  const E = window.GEN;
  const D = JSON.parse($('data').textContent);
  const { LIB, CLASSES, VARS, SITES, USE, SHEET, STOCK } = D;
  const SHEET_ID = '1k5mrxRSsp5OG5XlsZOvlN52R_sG3GUIf_zYKzD5Ec5g';
  E.setMeta(LIB, SHEET); E.setEnv({ CLASSES }); E.setStock(STOCK); let sheetNote = `Skabelonliste: indbygget udgave af arket (${SHEET.length} rækker, 14. okt 2026)`;
  const BRANCHER = [...new Set(SITES.map(s => s.b))].filter(b => b !== 'Uklar - tjek').sort((a, b) => a.localeCompare(b, 'da'));
  const DEVICES = { desktop: 1600, laptop: 1440, ipadl: 1180, ipadp: 820, mobil: 390 };      // matcher jeres breakpoints: over 1440 · max 1440 · max 1199 · max 991 · max 478
  const MAX_PROPOSALS = 5;

  let state = { brief: {}, proposals: [], active: 0 };
  let site = null, pageIdx = 0, useSite = true;
  let selUid = null; let lastHas = false; let lastUids = new Set(); let pendingAnim = null;
  let hist = [], exp = null, device = 'desktop', sample = null, ctl = null, busy = false;
  const cur = () => state.proposals[state.active] || null;

  /* ---------- opsætning ---------- */
  const root = $('pvHost').attachShadow({ mode: 'open' });
  root.innerHTML = '<style id="pvStyle"></style><div id="frame"><div id="pvContent"></div></div>';
  const frame = root.getElementById('frame'), pvContent = root.getElementById('pvContent'), pvStyle = root.getElementById('pvStyle');
  (async () => { try { sample = window.claude ? await window.claude.use('sample') : null; } catch (_) { sample = null; } if (!sample) $('banner').hidden = false; })();

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
  const errCopy = e => ({
    local: 'Det kræver Claude. Tryk "Claude-forbindelse" nederst til højre for at forbinde.', not_granted: 'Du skal tillade at siden bruger Claude, før den kan arbejde.', rate_limited: 'For mange kald lige nu. Vent et øjeblik og prøv igen.',
    invalid_json: 'Claude svarede ikke i det rigtige format. Prøv igen, eller skriv ønsket lidt mere konkret.', cancelled: '', aborted: '',
  })[e && e.code] ?? ('Noget gik galt: ' + ((e && e.message) || e));
  function setBusy(on, label, quiet) { busy = on; $('busy').hidden = !on || !!quiet; $('busyText').textContent = label || ''; for (const el of document.querySelectorAll('[data-lock]')) el.disabled = on; }
  const ASK_MSG = {
    plan: ['Blader igennem jeres templates…', 'Finder de rigtige sektioner til siden…', 'Sætter hero, ydelser og kontakt på plads…', 'Vælger varianter, der passer sammen…', 'Skriver overskrifter, der sælger…', 'Lægger rækkefølgen til rette…', 'Leder efter det helt rigtige hero…', 'Giver teksterne lidt personlighed…', 'Tjekker, at siden hænger sammen…', 'Pudser de sidste detaljer af…'],
    edit: ['Læser dit ønske…', 'Finder ud af, hvad der skal ændres…', 'Retter i udkastet…', 'Flytter lidt rundt…', 'Skruer på detaljerne…'],
    place: ['Henter kundens tekster…', 'Placerer teksterne i skabelonerne…', 'Sætter tekst og billeder sammen…'],
    gen: ['Tænker over en god bestilling…', 'Skriver en prompt til dig…', 'Finder de rigtige ord…'],
  };
  let retryLocal = false;
  const localMode = () => !!(window.claude && window.claude.mode === 'local');
  async function ask(prompt, label) {
    if (localMode()) throw { code: 'local' };
    ctl = new AbortController(); const pool = /udkast/i.test(label || '') ? ASK_MSG.plan : /Forst/i.test(label || '') ? ASK_MSG.edit : /Placerer|indhold/i.test(label || '') ? ASK_MSG.place : ASK_MSG.gen; let n = 0;
    const next = () => { $('busyText').textContent = pool[n % pool.length]; n++; }; setBusy(true, ''); next(); const timer = setInterval(next, 2600);
    try { return await sample.json(prompt, { modelTier: 'default', cache: false, signal: ctl.signal }); }
    finally { clearInterval(timer); ctl = null; }
  }
  const snap = () => JSON.stringify({ brief: state.brief, proposals: state.proposals, active: state.active });
  const pushHist = () => { hist.push(snap()); if (hist.length > 8) hist.shift(); };
  const tlf = () => '';                                   // telefonnummer er droppet: templates beholder deres pladsholder

  /* ---------- brief ---------- */
  function readBrief() { return { navn: $('navn').value.trim(), branche: ($('branche') && $('branche').value) || '', msg: $('msg').value.trim(), sidetype: (document.querySelector('input[name=sidetype]:checked') || {}).value || 'Forside', frihed: $('frihed').value || 'templates', prefix: $('prefix').value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') }; }
  const EXAMPLES = {
    'Hero': ['Hero med formular og tre fordele', 'Hero med stort billede og to knapper', 'Enkel hero med stor overskrift og tællere'],
    'Menu': ['Menu med logo til venstre og knap til højre', 'Enkel menu med telefonnummer'],
    'Forside': [
      'Forside med hero med formular, ydelser, tre anmeldelser, FAQ og en kontaktsektion til sidst.',
      'Enkel forside: hero, 4 ydelser og kontakt. Ingen FAQ.',
      'Forside med stor hero, 6 ydelser, cases og anmeldelser. Slut med kontakt.',
      'One-pager: hero, ydelser, hvorfor vælge os med tællere, anmeldelser og kontakt.',
      'Forside med fokus på tillid: anmeldelser tidligt, tællere, cases, FAQ og kontakt.',
      'Hero uden formular, 5 ydelser, en process-sektion og kontakt.',
      'Forside til en håndværker: hero, ydelser som billedkort, cases, anmeldelser og kontakt.',
      'Noget luftigt: hero, to tekstsektioner med billede, ydelser og FAQ med 6 spørgsmål.',
      'Forside med 3 ydelser, priser, anmeldelser og kontakt.',
      'Kort forside til mobil: hero, ydelser og kontakt, mere ikke.',
    ],
    'Underside': [
      'Ydelsesside: kort hero, tekst med billede, 3 anmeldelser og FAQ.',
      'Underside om én ydelse: hero, tekst med billede, process med 4 trin og kontakt.',
      'Underside til en by: kort hero, to tekstsektioner med billede, FAQ og kontakt.',
      'Enkel underside: hero, tekst med billede og kontaktsektion til sidst.',
      'Underside med fordele: hero, tekst med billede, tællere, anmeldelser og kontakt.',
      'Ydelsesside med 4 undertyper som kort, derefter FAQ og kontakt.',
    ],
    'Kontaktside': [
      'Kort hero og en kontaktsektion med formular.',
      'Kontaktside med formular, telefon og åbningstider.',
      'Enkel kontaktside: kontaktsektion med formular og en lille tekst over.',
    ],
    'Ydelsesoversigt': ['Ydelsesoversigt med kort hero, 6 ydelser og kontakt.', 'Oversigt over alle ydelser: 8 kort, en kort tekst under og kontakt.', 'Ydelsesoversigt med 4 store kort og en FAQ til sidst.'],
    'Om os-side': ['Om os-side: kort hero, tekst med billede, tællere og kontakt.', 'Om os med historien bag firmaet, tællere, anmeldelser og kontakt.', 'Enkel om os-side med to tekstsektioner med billede og kontakt.'],
    'Cases-sektion': ['En cases-sektion med 6 projekter.', 'Cases med billede og kort tekst, gerne 3 stk.', 'Vis udvalgte projekter som kort med før/efter-billeder.'],
    'Anmeldelses-sektion': ['Anmeldelser som slider med 3 udtalelser.', 'En anmeldelses-sektion med fokus på 5 stjerner og Google.', 'Anmeldelser med én fremhævet udtalelse ad gangen.'],
    'FAQ-sektion': ['FAQ med 6 spørgsmål.', 'En enkel FAQ med 4 spørgsmål og en kort intro.'],
    'Pris-sektion': [
      'Tre prispakker, hvor den midterste er fremhævet.',
      'En enkel prissektion med en FAQ under.',
      'Prissektion med 3 pakker og en kort forklaring af, hvad der er inkluderet.',
    ],
  };
  const PLACEHOLDERS = {
    'Hero': 'Uddyb, hvordan heroen skal være, fx med formular, billede eller tællere. Skriver du ikke noget, finder jeg selv på noget.',
    'Menu': 'Uddyb, hvordan menuen skal være. Skriver du ikke noget, finder jeg selv på noget.',
    'Forside': 'Uddyb, hvad du gerne vil have mig til at lave, fx hvilke sektioner og hvor mange ydelser. Skriver du ikke noget, finder jeg selv på noget.',
    'Underside': 'Uddyb, hvad siden skal handle om (fx en ydelse eller en by) og hvilke sektioner der skal med. Skriver du ikke noget, finder jeg selv på noget.',
    'Kontaktside': 'Uddyb, hvad kontaktsiden skal indeholde, fx formular, telefon og åbningstider. Skriver du ikke noget, finder jeg selv på noget.',
    'Ydelsesoversigt': 'Uddyb, hvor mange ydelser der skal vises, og hvad der skal stå på siden udover dem. Skriver du ikke noget, finder jeg selv på noget.',
    'Om os-side': 'Uddyb, hvad om os-siden skal fortælle (fx historie, tal, team) og hvilke sektioner der skal med. Skriver du ikke noget, finder jeg selv på noget.',
    'Cases-sektion': 'Uddyb, hvor mange cases der skal vises, og hvordan. Skriver du ikke noget, finder jeg selv på noget.',
    'Anmeldelses-sektion': 'Uddyb, hvor mange anmeldelser der skal vises, og i hvilken stil. Skriver du ikke noget, finder jeg selv på noget.',
    'FAQ-sektion': 'Uddyb, hvor mange spørgsmål der skal være. Skriver du ikke noget, finder jeg selv på noget.',
    'Pris-sektion': 'Uddyb, hvordan priserne skal vises, fx antal pakker og hvad der skal stå om hver. Skriver du ikke noget, finder jeg selv på noget.',
  };
  let lastExample = '';
  if (Object.keys(LIB).some(k => E.categoryOf(k) === 'Menu')) $('sidetype').insertAdjacentHTML('beforeend', '<label><input type="radio" name="sidetype" value="Menu"> Menu</label>');
  const curType = () => (document.querySelector('input[name=sidetype]:checked') || {}).value || 'Forside';
  function pickExample(type) { const list = EXAMPLES[type] || EXAMPLES.Forside; let i; do { i = Math.floor(Math.random() * list.length); } while (list.length > 1 && list[i] === lastExample); return list[i]; }
  function typeChanged() {
    const t = curType();
    if ($('msg').value.trim() && $('msg').value === lastExample) { lastExample = pickExample(t); $('msg').value = lastExample; }   // erstat et automatisk eksempel med et der passer til den nye type
  }
  for (const r of document.querySelectorAll('input[name=sidetype]')) r.addEventListener('change', typeChanged);
  const TYPE_HINT = { 'Forside': 'en forside (hero, ydelser, anmeldelser, cases, FAQ, kontakt m.m.)', 'Underside': 'en underside til en ydelse eller en by', 'Ydelsesoversigt': 'en oversigt over alle kundens ydelser', 'Om os-side': 'en om os-side', 'Kontaktside': 'en kontaktside', 'Pris-sektion': 'en pris-sektion', 'Cases-sektion': 'en cases-sektion', 'Anmeldelses-sektion': 'en anmeldelses-sektion', 'FAQ-sektion': 'en FAQ-sektion' };
  $('exampleBtn').onclick = async () => {                                   // skriver en prompt; er der valgt et site, bliver det "lav den som dét site"
    const type = curType(), btn = $('exampleBtn'), old = btn.textContent; const b = readBrief(); let out = '';
    if (sample) {
      btn.disabled = true; btn.textContent = 'Tænker…';
      try {
        const ex = (EXAMPLES[type] || []).slice().sort(() => Math.random() - 0.5).slice(0, 3).map(x => '- ' + x).join('\n');
        const prompt = `Du skriver en kort bestilling til et værktøj, der bygger udkast til hjemmesider af skabeloner (Header/hero, Ydelser, Anmeldelser, Cases, Priser, FAQ, Content med tekst og billede, tællere eller process-trin, og Kontakt sektion).\nSkriv EN kort, konkret bestilling på dansk: højst 35 ord, uformelt, uden citationstegn.\nTypen er ${TYPE_HINT[type] || type}.${b.branche ? ' Kunden er i branchen ' + b.branche + '.' : ' Branchen er ikke oplyst: nævn hverken en branche eller en bestemt type virksomhed.'}\nNævn konkrete sektioner i den rækkefølge de skal komme, og gerne antal (fx 6 ydelser). Opfind ikke priser, navne eller andre fakta.\nEksempler på stilen:\n${ex}\n${lastExample ? 'Skriv noget andet end: ' + lastExample + '\n' : ''}Svar KUN med selve bestillingen.`;
        const res = await sample(prompt, { modelTier: 'quick', cache: false }); out = String(res.text || '').trim().replace(/^["“„'\s]+|["”'\s]+$/g, '');
      } catch (_) { out = ''; }
      btn.disabled = false; btn.textContent = old;
    }
    if (out.length < 8) out = pickExample(type);
    lastExample = out; $('msg').value = out; $('msg').focus();
  };

  /* ---------- kundens navn → klasse-præfiks og telefon ---------- */
  let prefixTouched = false;
  const syncPrefix = () => { $('prefixShow').textContent = readBrief().prefix || 'kundens-navn'; };
  $('prefixEdit').onclick = () => { $('prefix').hidden = !$('prefix').hidden; if (!$('prefix').hidden) $('prefix').focus(); };
  $('prefix').addEventListener('input', () => { prefixTouched = $('prefix').value.trim() !== ''; syncPrefix(); });
  $('prefix').addEventListener('change', () => { if (cur()) render(); });                       // ændres præfikset bagefter, opdateres JSON'en
  $('navn').addEventListener('input', () => { if (!prefixTouched) { $('prefix').value = E.classPrefix($('navn').value); syncPrefix(); if (cur()) render(); } });

  /* ---------- import af kundens eksisterende site ---------- */
  async function importSiteFile(f) {
    if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (!j || !Array.isArray(j.pages) || !j.pages.length) throw new Error('Filen ligner ikke en site-indhold.json fra hent_site.py');
      site = j; pageIdx = 0; useSite = true; $('siteCard').open = true; setStatus(`Importerede ${j.pages.length} side(r) fra ${j.url}.`, 'ok');
    } catch (e) { site = null; setStatus(String(e.message || e), 'err'); }
    renderSite();
  }
  for (const id of ['siteFile']) $(id).addEventListener('change', async ev => { const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; await importSiteFile(f); });
  $('sitePage').onchange = () => { pageIdx = +$('sitePage').value; renderSite(); };
  $('siteUse').onchange = () => { useSite = $('siteUse').checked; };
  $('siteClear').onclick = () => { site = null; $('siteCard').open = false; renderSite(); };
  const cmdFor = raw => { let u = String(raw || '').trim().replace(/\s+/g, ''); if (!u) u = 'best-one.dk'; if (!/^https?:\/\//i.test(u)) u = 'https://' + u; return `python3 ~/crawler/hent_site.py '${u.replace(/'/g, '')}'`; };
  $('siteUrl').addEventListener('input', () => { $('siteCmd').textContent = cmdFor($('siteUrl').value); });
  $('cmdCopy').onclick = async () => { const txt = $('siteCmd').textContent; let ok = false; try { await navigator.clipboard.writeText(txt); ok = true; } catch (_) { try { const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch (_) { } } const b = $('cmdCopy'); b.textContent = ok ? '✓ Kopieret' : 'Markér selv'; setTimeout(() => { b.textContent = 'Kopiér'; }, 2000); if (!ok) { const r = document.createRange(); r.selectNodeContents($('siteCmd')); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } };
  function renderSite() {
    $('siteInfo').hidden = !site; $('siteEmpty').hidden = !!site;
    if (!site) return;
    $('sitePage').innerHTML = site.pages.map((p, i) => `<option value="${i}">${E.esc(p.title || p.url)}${i === 0 ? ' (forside)' : ''}</option>`).join(''); $('sitePage').value = pageIdx;
    $('siteSummary').textContent = `${site.url} · ${E.siteBlocks(site, pageIdx).length} tekstblokke · ${E.siteImages(site, pageIdx).length} billeder`; $('siteUse').checked = useSite;
  }

  /* ---------- AI: udkast ---------- */
  const planToSections = f => E.sanitizePlan(f.sektioner, LIB).flatMap(x => { if (x.fri) { const fs = E.makeFri(x, tlf()); return fs ? [fs] : []; } const secs = E.makeSections(LIB, x.tpl, x.hvorfor, tlf()); const n = parseInt(x.antal, 10); if (n > 0) { const r = E.resizeGroup(secs[0], n, CLASSES); if (r.ok) secs[0].warns = r.warn; } return secs; });
  /* ---------- AI forslag: Claude designer sektionerne selv ---------- */
  const VARNAMES = E.aiVarNames(VARS);
  const recentGet = () => { try { return JSON.parse(localStorage.getItem('bo-ai-recent') || '[]'); } catch (_) { return []; } };
  const archGet = () => { try { return JSON.parse(localStorage.getItem('bo-ai-arch') || '[]'); } catch (_) { return []; } };
  const archAdd = ids => { try { localStorage.setItem('bo-ai-arch', JSON.stringify([...ids, ...archGet()].slice(0, 16))); } catch (_) { } };
  const recentAdd = s => { try { localStorage.setItem('bo-ai-recent', JSON.stringify([s, ...recentGet()].slice(0, 8))); } catch (_) { } };
  const setProg = t => { $('busyText').textContent = t; };
  const isFatal = e => !!e && (e.code === 'aborted' || e.code === 'cancelled' || e.name === 'AbortError' || e.code === 'not_granted' || e.code === 'rate_limited');
  async function aiText(prompt, tier) { if (!ctl) ctl = new AbortController(); const r = await sample(prompt, { modelTier: tier, cache: false, signal: ctl.signal }); return r.text; }
  async function aiJson(prompt, tier, tries) { let last; for (let i = 0; i < (tries || 2); i++) { try { return E.looseJson(await aiText(prompt, tier)); } catch (e) { last = e; if (isFatal(e)) throw e; } } throw last || { code: 'invalid_json' }; }
  async function pool(tasks, k) { let i = 0; const run = async () => { while (i < tasks.length) { const my = i++; await tasks[my](); } }; await Promise.all(Array.from({ length: Math.min(k, tasks.length) }, run)); }

  /* automatisk tjek: sektionen vises skjult i 390 og 1440 px og måles */
  /*QA-START*/
  const qaMeasure = (sh, css, html) => {
    const parseCol = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (m) { const v = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; } const s = String(c).match(/color\(srgb\s+([\d.\s/-]+)\)/); if (s) { const v = s[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return { r: v[0] * 255, g: v[1] * 255, b: v[2] * 255, a: v.length > 3 ? v[3] : 1 }; } return null; };
    const lum = o => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(o.r) + 0.7152 * f(o.g) + 0.0722 * f(o.b); };
    const ratio = (x, y) => { const l1 = lum(x), l2 = lum(y); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
    const bgOf = (el, stop) => { for (let n = el; n && n !== stop.parentNode; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; const c = parseCol(cs.backgroundColor); if (c && c.a > 0.95) return c; } return { r: 230, g: 230, b: 230, a: 1 }; };
    const ownText = el => [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    const clipped = (el, root) => { for (let n = el.parentElement; n && n !== root; n = n.parentElement) if (getComputedStyle(n).overflowX !== 'visible') return true; return false; };   // bevidst bånd/slider
    const unit = (el, root) => { for (let n = el; n && n !== root; n = n.parentElement) if (getComputedStyle(n).position !== 'static') return n; return root; };
    const zOf = u => { const z = parseInt(getComputedStyle(u).zIndex, 10); return Number.isFinite(z) ? z : 0; };
    const issues = [];
    for (const W of [390, 1440]) {
      const label = W < 600 ? 'mobil' : 'desktop'; sh.innerHTML = `<style>${css}</style><div id="f" style="width:${W}px;container-type:inline-size;background:var(--bg-body,#fff)">${html}</div>`;
      const root = sh.querySelector('[data-sec]'); if (!root) { issues.push('sektionen kunne ikke vises'); continue; } const rr = root.getBoundingClientRect();
      if (rr.height < 60) issues.push(`${label}: sektionen er næsten tom (${Math.round(rr.height)} px høj)`);
      if (rr.height > (W < 600 ? 5600 : 2800)) issues.push(`${label}: sektionen er meget høj (${Math.round(rr.height)} px)`);
      for (const el of root.querySelectorAll('*')) { const cs = getComputedStyle(el); if (cs.position === 'absolute' || cs.display === 'none') continue; const b = el.getBoundingClientRect(); if (b.width > 0 && b.right > rr.right + 2 && !clipped(el, root)) { issues.push(`${label}: indhold løber ud til højre (${(el.getAttribute('class') || el.tagName).split(' ').find(c => c.startsWith('u-')) || el.tagName})`); break; } }
      const texts = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,li,div,a')].filter(el => ownText(el)); let bad = 0, wide = 0, hid = 0;
      const layers = [...root.querySelectorAll('*')].filter(n => getComputedStyle(n).position !== 'static');
      for (const el of texts) {
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity < 0.3 || cs.display === 'none') continue; const own = ownText(el);
        const fg = parseCol(cs.color); if (fg && fg.a >= 0.3) { const bg = bgOf(el, root); if (bg) { const f2 = fg.a < 1 ? { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) } : fg; if (ratio(f2, bg) < 3) { bad++; if (bad === 1) issues.push(`${label}: for lav kontrast på «${own.slice(0, 30)}»`); } } }
        if (cs.display !== 'inline' && cs.whiteSpace !== 'nowrap' && cs.overflowX === 'visible' && cs.position !== 'absolute' && !clipped(el, root) && el.scrollWidth > el.clientWidth + 2) { wide++; if (wide === 1) issues.push(`${label}: teksten «${own.slice(0, 30)}» er bredere end sin boks (lange ord skal kunne ombrydes)`); }
        const rg = document.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect(); if (r.width >= 4 && r.height >= 4 && !(fg && fg.a < 0.3)) { const cx = r.left + r.width / 2, cy = r.top + r.height / 2, u = unit(el, root), zu = zOf(u);
          for (const o of layers) { if (o === el || o.contains(el) || el.contains(o) || u.contains(o) || o.contains(u)) continue; const oc = getComputedStyle(o); const bc = parseCol(oc.backgroundColor); if (!((bc && bc.a > 0.9) || (oc.backgroundImage && oc.backgroundImage !== 'none'))) continue; const b = o.getBoundingClientRect(); if (cx < b.left || cx > b.right || cy < b.top || cy > b.bottom) continue; const zo = zOf(o); if (zo > zu || (zo === zu && (u.compareDocumentPosition(o) & Node.DOCUMENT_POSITION_FOLLOWING))) { hid++; if (hid === 1) issues.push(`${label}: «${own.slice(0, 30)}» ligger skjult bag et andet element (tjek z-index og overlap)`); break; } } }
      }
    }
    return [...new Set(issues)].slice(0, 6);
  };
  /*QA-END*/
  function qaSection(sec) {
    const host = document.createElement('div'); host.style.cssText = 'position:absolute;left:-14000px;top:0;visibility:hidden;pointer-events:none'; document.body.appendChild(host); const sh = host.attachShadow({ mode: 'open' }); let issues;
    try { const r = E.renderSections([sec], CLASSES, VARS); issues = qaMeasure(sh, r.css, r.html); } catch (e) { issues = ['kunne ikke tjekkes: ' + ((e && e.message) || e)]; }
    host.remove(); return issues;
  }

  /* ---------- byggepanel: live fremdrift med varierede beskeder, estimat og preview, der vokser frem ---------- */
  const MSG = {
    concept: ['Læser kundens branche…', 'Leder efter en vinkel, ingen andre har brugt…', 'Skitserer idéen på et stykke papir…', 'Vælger tone og typografi…', 'Bestemmer rytmen på siden…', 'Sorterer de kedelige idéer fra…', 'Finder ud af, hvad siden skal huskes for…', 'Blander lys og mørke, tæt og luftigt…'],
    hero: ['Tegner heroen…', 'Sætter første indtryk i scene…', 'Finder det rigtige greb til toppen af siden…', 'Giver overskriften noget at stå på…'],
    work: ['Tegner «{n}»…', 'Finder luft og rytme i «{n}»…', 'Sætter typografien i «{n}»…', 'Skriver teksterne til «{n}»…', 'Lægger farver og former i «{n}»…', 'Pudser kanterne af «{n}»…', 'Bygger layoutet til «{n}»…', 'Giver «{n}» lidt personlighed…'],
    check: ['Tjekker «{n}» på mobil…', 'Måler kontrast og afstande i «{n}»…', 'Kigger «{n}» efter i sømmene…'],
    fix: ['Retter en detalje i «{n}»…', 'Finpudser «{n}»…', 'Flytter lidt rundt i «{n}»…'],
    done: ['«{n}» sidder lige i skabet.', '«{n}» er på plads.', 'Så er «{n}» klar.', '«{n}» ser godt ud.', 'Næste! «{n}» er færdig.'],
    finish: ['Samler siden…', 'Gør klar til Bricks…', 'Lægger sidste hånd på værket…'],
    regen: ['Tegner en ny version…', 'Prøver en helt anden vinkel…', 'Vender layoutet på hovedet…', 'Finder på noget andet…'],
  };
  const SHORT = { wait: 'venter', check: 'tjekker mobil…', fix: 'retter…', done: 'klar' }; const WORKING = ['tegner…', 'skriver…', 'former…', 'sætter typografi…'];
  let building = null, tickT = null;
  const pick = (arr, prev) => { let m; let g = 0; do { m = arr[Math.floor(Math.random() * arr.length)]; g++; } while (arr.length > 1 && m === prev && g < 8); return m; };
  const fmtEta = s => { if (s < 12) return 'næsten færdig'; if (s < 55) return 'ca. ' + Math.max(15, Math.round(s / 5) * 5) + ' sek. tilbage'; let m = Math.floor(s / 60), r = Math.round((s % 60) / 10) * 10; if (r === 60) { m++; r = 0; } return 'ca. ' + (m || 1) + ' min' + (r && m ? ' ' + r + ' sek.' : '') + ' tilbage'; };
  function buildEta() {
    const b = building, now = Date.now(); const restDraft = (b.n - b.draft - 1) * (b.conceptSec + Math.ceil(6 / 3) * b.avg);
    if (b.phase === 'concept') return Math.max(5, b.conceptSec - (now - b.tPhase) / 1000) + Math.ceil(6 / 3) * b.avg + restDraft;
    const ai = b.items.filter(x => x.ai && x.state !== 'done'); if (!ai.length) return 4 + restDraft;
    let tot = 0; for (const it of ai) tot += it.state === 'wait' ? b.avg : Math.max(8, b.avg - (now - it.tStart) / 1000) + (it.state === 'fix' ? 10 : 0);
    return tot / Math.min(3, ai.length) + restDraft;
  }
  function buildPct() {
    const b = building, per = 1 / b.n; let share;
    if (b.phase === 'concept') share = 0.12 * Math.min(1, (Date.now() - b.tPhase) / 1000 / Math.max(10, b.conceptSec));
    else { const its = b.items; const tot = its.reduce((s, x) => s + (x.ai ? 1 : 0.15), 0) || 1; const got = its.reduce((s, x) => s + (x.ai ? (x.state === 'done' ? 1 : x.state === 'wait' ? 0 : x.state === 'work' ? Math.min(0.6, (Date.now() - x.tStart) / 1000 / b.avg * 0.6) : x.state === 'check' ? 0.75 : 0.85) : (x.state === 'done' ? 0.15 : 0)), 0); share = 0.12 + 0.88 * (got / tot); }
    return Math.min(0.99, b.draft * per + per * share);
  }
  function drawPanel() {
    const b = building; if (!b) return; const pct = Math.round(buildPct() * 100);
    $('bpMsg').textContent = b.msg; $('bpFill').style.width = pct + '%'; $('bpPct').textContent = pct + ' %'; $('bpEta').textContent = b.phase === 'finish' ? 'gør klar…' : fmtEta(buildEta()); $('bpBar').setAttribute('aria-valuenow', pct);
    $('bpIdea').hidden = !b.concept; if (b.concept) $('bpIdea').innerHTML = `<b>${E.esc(b.concept.navn || 'Idé')}</b>${b.concept['idé'] ? ' · ' + E.esc(String(b.concept['idé']).slice(0, 170)) : ''}`;
    $('bpList').innerHTML = b.items.map(it => `<li data-s="${it.state}"><span class="ic" aria-hidden="true">${it.state === 'done' ? '✓' : it.state === 'wait' ? '○' : it.state === 'fix' ? '✎' : ''}</span><span class="nm">${E.esc(it.name)}</span><span class="st">${it.state === 'work' ? it.working : SHORT[it.state] || ''}</span></li>`).join('');
  }
  function announce(it) { const b = building; if (!b || b.phase !== 'build') return; const pool = it.state === 'work' ? (it.idx === 0 ? MSG.hero : MSG.work) : it.state === 'check' ? MSG.check : it.state === 'fix' ? MSG.fix : it.state === 'done' ? MSG.done : null; if (!pool) return; b.msg = pick(pool, b.msg).replace('{n}', it.name); b.msgAt = Date.now(); }
  function tickBuild() {
    const b = building; if (!b) return; const now = Date.now();
    if (now - b.msgAt > 3300) {
      b.msgAt = now; let m;
      if (b.phase === 'concept') m = pick(MSG.concept, b.msg); else if (b.phase === 'finish') m = pick(MSG.finish, b.msg);
      else { const act = b.items.filter(x => x.ai && x.state !== 'done' && x.state !== 'wait'); const it = act.length ? act[Math.floor(Math.random() * act.length)] : null; if (!it) m = pick(MSG.finish, b.msg); else { const pool = it.state === 'check' ? MSG.check : it.state === 'fix' ? MSG.fix : (it.idx === 0 ? MSG.hero.concat(MSG.work) : MSG.work); m = pick(pool, b.msg).replace('{n}', it.name); } }
      b.msg = m; for (const it of b.items) if (it.state === 'work' && Math.random() < 0.5) it.working = pick(WORKING, it.working);
    }
    drawPanel();
  }
  function startBuild(n) { building = { t0: Date.now(), n, draft: 0, phase: 'concept', items: [], concept: null, msg: pick(MSG.concept), msgAt: Date.now(), avg: 45, conceptSec: 25, tPhase: Date.now() }; $('buildPanel').hidden = false; clearInterval(tickT); tickT = setInterval(tickBuild, 800); drawPanel(); drawBuild(); }
  function endBuild() { clearInterval(tickT); tickT = null; building = null; $('buildPanel').hidden = true; }
  const BSK_CSS = `.bsk{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;box-sizing:border-box;padding:28px;text-align:center;font:600 15px/1.35 system-ui,sans-serif;color:#5b6670;background:linear-gradient(100deg,#eceff1 30%,#f8f9fa 50%,#eceff1 70%);background-size:300% 100%;animation:bskShine 1.7s linear infinite;border-bottom:1px solid #dde2e6}
.bsk small{display:block;margin-top:5px;font-weight:500;opacity:.85}.bsk.wait{animation:none;background:#f2f4f5;color:#9aa4ac}.bsk.dark{background:linear-gradient(100deg,#232a30 30%,#2f373e 50%,#232a30 70%);background-size:300% 100%;color:#b8c2ca;border-bottom-color:#11161a}.bsk.dark.wait{animation:none;background:#2a3238;color:#7e8a94}
.bsk i{display:inline-block;width:9px;height:9px;border-radius:50%;background:#2e8b57;margin-right:9px;vertical-align:middle;animation:bskPulse 1s ease-in-out infinite}
.bdone.fresh{animation:bskIn .7s ease both}@keyframes bskShine{from{background-position:100% 0}to{background-position:-100% 0}}@keyframes bskPulse{50%{transform:scale(1.5);opacity:.5}}@keyframes bskIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.bsk,.bsk i,.bdone.fresh{animation:none!important}}`;
  let drawQ = false;
  function drawBuild(full) {
    const b = building; if (!b) return; document.body.classList.remove('home'); $('empty').hidden = true; $('pvOuter').hidden = false; $('tabs').hidden = true; $('tabrow').hidden = true; $('valWrap').hidden = true; $('listCard').hidden = true; $('editCard').hidden = true; $('notesCard').hidden = true; $('fbCard').hidden = true; $('imgCard').hidden = true;
    if (!b.items.length) { pvStyle.textContent = '#frame{overflow:hidden}' + BSK_CSS; pvContent.innerHTML = `<div class="bsk" style="min-height:360px"><div><i></i>Siden tegnes…<small>${E.esc(b.msg)}</small></div></div>`; fit(); return; }
    const done = b.items.flatMap(x => x.secs || []); const css = done.length ? E.renderSections(done, CLASSES, VARS).css : '';
    pvStyle.textContent = '#frame{overflow:hidden}' + css + BSK_CSS;
    pvContent.innerHTML = b.items.map((it, i) => { if (it.secs) { const fr = it.fresh && !it.freshShown; if (fr) it.freshShown = true; return `<div class="bdone${fr ? ' fresh' : ''}">${E.renderSections(it.secs, CLASSES, VARS).html}</div>`; } const dark = it.plan && (it.plan.stil === 'moerk' || it.plan.stil === 'primaer'); const h = i === 0 ? 380 : /bånd|band|ticker|marquee/i.test(it.name) ? 120 : 260; return `<div class="bsk ${it.state === 'wait' ? 'wait' : ''}${dark ? ' dark' : ''}" style="min-height:${h}px"><div>${it.state === 'wait' ? '' : '<i></i>'}${E.esc(it.name)}<small>${it.state === 'wait' ? 'venter på tur' : it.state === 'check' ? 'tjekker mobil…' : it.state === 'fix' ? 'retter en detalje…' : it.working}</small></div></div>`; }).join('');
    fit(); faApply(pvContent, root);
  }
  const queueDraw = () => { if (drawQ) return; drawQ = true; requestAnimationFrame(() => { drawQ = false; drawBuild(); drawPanel(); }); };

  let aiFailed = [];
  async function buildAiSection(plan, idx, plans, concept, brief, prev, instruktion, item) {
    let raw = null, sec = null;
    const arch = (item && item.arch) || null; const live = !!(item && building); for (let t = 0; t < 2 && !sec; t++) { try { raw = await aiJson(E.aiSectionPrompt(brief, concept, plan, idx, plans, VARS, prev, instruktion, arch, concept && concept.reg), 'default', 1); sec = E.makeAi(raw, plan, VARNAMES); } catch (e) { if (isFatal(e)) throw e; } }
    if (!sec) { const fb = E.makeFri({ fri: 'intro', overskrift: plan.navn || 'Sektion', tekst: String(plan.indhold || '').slice(0, 300) }, ''); fb.why = 'AI-sektionen «' + (plan.navn || '') + '» kunne ikke bygges, en enkel erstatning er brugt'; aiFailed.push(plan.navn || 'sektion'); return fb; }
    sec.ai.raw = raw; sec.ai.arch = arch;
    for (let r = 0; r < 2; r++) {
      if (live) { item.state = 'check'; announce(item); queueDraw(); } const issues = qaSection(sec); if (!issues.length) break; if (live) { item.state = 'fix'; announce(item); queueDraw(); } else setProg(pick(MSG.fix).replace('{n}', plan.navn || 'sektionen'));
      try { const fixed = await aiJson(E.aiRepairPrompt(brief, raw, issues, VARS), 'default', 1); const keep = sec.ai.plan; if (E.rebuildAi(sec, fixed, VARNAMES)) { sec.ai.raw = raw = fixed; sec.ai.plan = keep; } else break; } catch (e) { if (isFatal(e)) throw e; break; }
    }
    sec.ai.issues = qaSection(sec); return sec;
  }
  async function generateAi(brief, n, outline) {
    const out = []; startBuild(n);
    for (let i = 0; i < n; i++) {
      const b = building; b.draft = i; b.phase = 'concept'; b.tPhase = Date.now(); b.items = []; b.concept = null; b.msg = pick(MSG.concept); b.msgAt = Date.now(); drawPanel(); drawBuild();
      const reg = E.pickRegister(); const cp = E.aiConceptPrompt(brief, LIB, USE, SITES, VARS, E.pickCreative(3, 2), recentGet(), outline, reg); let concept;
      try { concept = await aiJson(cp, 'complex', 1); } catch (e) { if (isFatal(e)) throw e; concept = await aiJson(cp, 'default', 2); }       // den kraftigste model først, ellers standard
      b.conceptSec = Math.max(8, Math.round(0.5 * b.conceptSec + 0.5 * (Date.now() - b.tPhase) / 1000));
      const plans = (Array.isArray(concept.sektioner) ? concept.sektioner : []).filter(x => x && typeof x === 'object').slice(0, 9); if (!plans.length) throw { code: 'invalid_json' };
      const k = concept.koncept || {}; if (k.navn) recentAdd(`${k.navn}: ${String(k.visuelt_sprog || '').slice(0, 110)}`);
      concept.reg = reg; const archs = E.pickArchetypes(plans, archGet()); aiFailed = []; b.concept = k; b.phase = 'build'; b.msg = pick(MSG.hero); b.msgAt = Date.now();
      b.items = plans.map((pl, idx) => { const tplOk = pl.type === 'tpl' && LIB[pl.tpl] && E.categoryOf(pl.tpl) !== 'CTA'; return { plan: pl, idx, arch: archs[idx], ai: !tplOk, state: 'wait', secs: null, name: String(pl.navn || (tplOk ? E.displayName(pl.tpl) : 'Sektion')).slice(0, 42), working: pick(WORKING) }; });
      for (const it of b.items) if (!it.ai) { it.secs = E.makeSections(LIB, it.plan.tpl, it.plan.hvorfor || it.plan.navn || '', ''); it.state = 'done'; }
      queueDraw();
      await pool(b.items.filter(it => it.ai).map(it => async () => {
        it.state = 'work'; it.tStart = Date.now(); announce(it); queueDraw();
        const sec = await buildAiSection(it.plan, it.idx, plans, concept, brief, undefined, undefined, it);
        it.secs = [sec]; it.state = 'done'; announce(it); it.fresh = true; b.avg = Math.max(15, Math.round(0.6 * b.avg + 0.4 * (Date.now() - it.tStart) / 1000)); queueDraw(); setTimeout(() => { it.fresh = false; queueDraw(); }, 1500);
      }), 3);
      archAdd(b.items.filter(it => it.ai && it.arch).map(it => it.arch.id));
      const sections = b.items.flatMap(it => it.secs || []).filter(Boolean); if (!sections.length) throw { code: 'invalid_json' };
      out.push({ id: 'p' + Date.now() + i + 'a', name: String(k.navn || 'Udkast ' + (i + 1)).slice(0, 40), note: [k['idé'], k.uforglemmeligt ? 'Det man husker: ' + k.uforglemmeligt : ''].filter(Boolean).join(' '), sections, usedBlocks: [], concept: { koncept: k, plans, reg } });
    }
    building.phase = 'finish'; building.msg = pick(MSG.finish); drawPanel();
    return out;
  }
  async function regenAi(sec, instruktion, inFlow) {
    const p = cur(); if (!p || (busy && !inFlow)) return; const plan = (sec.ai && sec.ai.plan) || {}; const concept = p.concept || { koncept: {}, plans: [plan] }; const plans = concept.plans || [plan]; const idx = Math.max(0, plans.findIndex(x => x === plan || (x.navn && x.navn === plan.navn)));
    let rot = null; if (!inFlow) { pushHist(); setBusy(true, pick(MSG.regen)); rot = setInterval(() => { $('busyText').textContent = pick(MSG.regen, $('busyText').textContent); }, 3000); } else setProg(pick(MSG.regen)); ctl = new AbortController(); aiFailed = [];
    const prevArch = sec.ai && sec.ai.arch; const newArch = E.pickArchetypes(plans.length ? plans : [plan], [...archGet(), prevArch ? prevArch.id : ''])[Math.min(idx, Math.max(0, plans.length - 1))]; const fake = { arch: instruktion ? prevArch : newArch };
    try { const ns = await buildAiSection(plan, idx, plans, concept, state.brief, sec.ai && sec.ai.raw, instruktion, fake); if (ns && ns.ai) { sec.ai = ns.ai; sec.els = ns.els; } else setStatus('Kunne ikke lave en ny version. Prøv igen.', 'warn'); }
    catch (e) { clearInterval(rot); if (!inFlow) hist.pop(); ctl = null; const m = errCopy(e); if (m) setStatus(m, 'err'); if (inFlow) throw e; }
    clearInterval(rot); ctl = null; if (!inFlow) { setBusy(false); render(); }
  }

  async function generate(more) {
    if (!sample) return;
    const b = readBrief();
    if (!more) { if (!b.navn) { setStatus('Skriv kundens navn først.', 'warn'); return; } state.brief = b; } else b.navn = state.brief.navn;
    const brief = more ? state.brief : b; const n = more ? 1 : +$('count').value;
    setStatus(''); pushHist();
    try {
      const made = []; let guessNote = ''; const outline = site && useSite ? E.outlineFromImport(site, pageIdx) : null;
      if (brief.frihed === 'ai') { setBusy(true, '', true); ctl = new AbortController(); try { made.push(...await generateAi(brief, n, outline && outline.length >= 2 ? outline : null)); } finally { ctl = null; endBuild(); } }
      else {
      const existing = (more ? state.proposals : made).map(p => p.sections.map(s => s.tpl));
      let res; if (localMode()) { setBusy(true, 'Sætter siden sammen ud fra jeres templates…'); await new Promise(r => setTimeout(r, 700)); res = E.localPlan(brief, LIB, n, existing, SITES); guessNote = res.branche && res.branche.b ? (res.branche.via === 'dit valg' ? ` Branche: ${res.branche.b}.` : ` Branche gættet: ${res.branche.b}${res.branche.via === 'tilfældigt' ? ' (tilfældigt – vælg Branche ved Designforslag, hvis du vil styre det)' : ''}.`) : ''; }
      else res = await ask(E.planPrompt(brief, LIB, USE, SITES, n, existing, site && useSite ? E.siteSummary(site, pageIdx) : null, outline && outline.length >= 2 ? outline : null), 'Laver udkast');
      made.push(...(res.forslag || []).slice(0, n).map((f, i) => ({ id: 'p' + Date.now() + i + 'x', name: f.navn || ('Udkast ' + (state.proposals.length + made.length + i + 1)), note: f.note || '', sections: planToSections(f), usedBlocks: [] })).filter(p => p.sections.length));
      }
      if (!made.length) throw { code: 'invalid_json' };
      if (!more) state.proposals = made; else state.proposals.push(...made);
      state.active = more ? state.proposals.length - 1 : 0;
      if (site && useSite) await applySite(cur());
      setStatus((made.length > 1 ? `${made.length} udkast klar.` : 'Udkast klar.') + guessNote, 'ok');
    } catch (e) { hist.pop(); ctl = null; if (e && e.code === 'local' && !retryLocal) { retryLocal = true; setBusy(false); try { return await generate(more); } finally { retryLocal = false; } } const m = errCopy(e); if (m) setStatus(m, 'err'); }
    setBusy(false); render();
  }
  function burst(btn, e) {
    const r = btn.getBoundingClientRect(); const x = (e && e.clientX ? e.clientX : r.left + r.width / 2) - r.left, y = (e && e.clientY ? e.clientY : r.top + r.height / 2) - r.top;
    const rip = document.createElement('span'); rip.className = 'ripple'; rip.style.cssText = `left:${x}px;top:${y}px`; btn.querySelector('.fx').appendChild(rip); setTimeout(() => rip.remove(), 800);
    const cols = ['#d97757', '#f0b9a4', '#ffffff', '#e8c07a', '#c15f3c'];
    for (let i = 0; i < 18; i++) { const p = document.createElement('span'); p.className = 'spark'; const an = Math.random() * Math.PI * 2, d = 38 + Math.random() * 70;
      p.style.cssText = `left:${x}px;top:${y}px;--dx:${Math.cos(an) * d}px;--dy:${Math.sin(an) * d}px;--s:${4 + Math.random() * 6}px;background:${cols[i % cols.length]};animation-delay:${Math.random() * 70}ms`; btn.appendChild(p); setTimeout(() => p.remove(), 1000); }
    btn.classList.remove('go'); void btn.offsetWidth; btn.classList.add('go'); setTimeout(() => btn.classList.remove('go'), 1600);
  }
  $('genBtn').onclick = e => { burst($('genBtn'), e); generate(false); };
  $('stopBtn').onclick = () => { if (ctl) ctl.abort(); };
  $('bpStop').onclick = () => { if (ctl) ctl.abort(); };



  /* ---------- feedback: 👍/👎 og tre tekstfelter, gemt i fælles database så teamet kan udvikle på det ---------- */
  let db = null, uid = null, userNs = null;
  (async () => { try { if (window.claude) { db = await window.claude.use('db'); userNs = await window.claude.use('user'); uid = userNs && userNs.id ? await userNs.id() : null; } } catch (_) { db = null; } })();
  const plog = p => p.log || (p.log = { removed: [], added: [], copied: false });
  const fbOf = p => p.fb || (p.fb = { up: null, ok: '', bad: '', miss: '', id: '', sent: false });
  function renderFb(p) {
    if (!p) return; const f = fbOf(p);
    $('fbUp').setAttribute('aria-pressed', String(f.up === true)); $('fbDown').setAttribute('aria-pressed', String(f.up === false));
    $('fbForm').hidden = f.up === null; if ($('fbOk') !== document.activeElement) $('fbOk').value = f.ok; if ($('fbBad') !== document.activeElement) $('fbBad').value = f.bad; if ($('fbMiss') !== document.activeElement) $('fbMiss').value = f.miss;
    $('fbSend').textContent = f.sent ? 'Opdatér feedback' : 'Send feedback'; $('fbMsg').textContent = f.sent ? '✓ Tak! Feedbacken er gemt. Du kan rette den og sende igen.' : '';
  }
  for (const [id, v] of [['fbUp', true], ['fbDown', false]]) $(id).onclick = () => { const p = cur(); if (!p) return; fbOf(p).up = v; renderFb(p); if (!$('fbOk').value && !$('fbBad').value && !$('fbMiss').value) (v ? $('fbOk') : $('fbBad')).focus({ preventScroll: true }); };
  for (const [id, k] of [['fbOk', 'ok'], ['fbBad', 'bad'], ['fbMiss', 'miss']]) $(id).addEventListener('input', () => { const p = cur(); if (p) fbOf(p)[k] = $(id).value; });
  const fbContext = p => ({ sidetype: (state.brief || {}).sidetype || 'Forside', frihed: (state.brief || {}).frihed || 'mix', branche: (state.brief || {}).branche || '', prompt: String((state.brief || {}).msg || '').slice(0, 400), udkast: p.name, antal_udkast: state.proposals.length, sektioner: p.sections.map(s => s.ai ? 'ai:' + s.ai.spec.navn : s.fri ? 'fri:' + s.fri.fri : s.tpl), fjernet: plog(p).removed, tilfoejet: plog(p).added, kopieret: !!plog(p).copied });
  const fbText = e => `${e.up ? '👍' : '👎'} ${e.ctx.sidetype} · ${e.ctx.frihed}${e.ctx.branche ? ' · ' + e.ctx.branche : ''}\nSektioner: ${e.ctx.sektioner.join(' → ')}${e.ctx.fjernet.length ? '\nFjernet bagefter: ' + e.ctx.fjernet.join(', ') : ''}${e.ctx.tilfoejet.length ? '\nTilføjet bagefter: ' + e.ctx.tilfoejet.join(', ') : ''}${e.ctx.kopieret ? '\nJSON blev kopieret (brugt)' : ''}\nHvad virkede: ${e.ok || '-'}\nHvad virkede ikke: ${e.bad || '-'}\nHvad manglede: ${e.miss || '-'}`;
  async function saveFeedback(entry) {
    if (!db || !uid) throw { code: 'no_db' };
    const ref = db.doc('feedback/' + uid); const snap = await ref.get(); const items = (snap.exists && snap.data().items) || [];
    await ref.set({ items: [...items.filter(x => x.id !== entry.id), entry].slice(-120), opdateret: new Date().toISOString() });
  }
  $('fbSend').onclick = async () => {
    const p = cur(); if (!p) return; const f = fbOf(p); if (f.up === null) return; if (!f.id) f.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const entry = { id: f.id, ts: new Date().toISOString(), up: f.up, ok: f.ok.trim().slice(0, 1500), bad: f.bad.trim().slice(0, 1500), miss: f.miss.trim().slice(0, 1500), ctx: fbContext(p) };
    $('fbSend').disabled = true;
    try { await saveFeedback(entry); f.sent = true; renderFb(p); }
    catch (_) {
      try { await navigator.clipboard.writeText(fbText(entry)); $('fbMsg').textContent = 'Kunne ikke gemme i den fælles database (du har måske kun læseadgang). Feedbacken er kopieret, så du kan sende den til teamet.'; }
      catch (__) { $('fbMsg').textContent = 'Kunne ikke gemme feedbacken her. Markér og kopiér den selv fra felterne.'; }
    }
    $('fbSend').disabled = false;
  };
  /* oversigt over al feedback */
  let fbAll = [], fbFilter = 'alle';
  async function loadFeedback() {
    $('fbList').innerHTML = '<p class="hint">Henter…</p>';
    if (!db) { $('fbList').innerHTML = '<p class="hint">Feedback-oversigten kræver adgang til den fælles database i claude.ai.</p>'; return; }
    try {
      const qs = await db.collection('feedback').get(); const rows = []; const uids = [];
      for (const d of qs.docs) { const items = (d.data() || {}).items || []; if (items.length) uids.push(d.id); for (const it of items) rows.push(Object.assign({}, it, { uid: d.id })); }
      let names = {}; try { if (userNs && userNs.profiles && uids.length) names = await userNs.profiles(uids); } catch (_) { }
      rows.forEach(r => { r.navn = (names[r.uid] && names[r.uid].name) || 'Kollega'; }); rows.sort((x, y) => String(y.ts).localeCompare(String(x.ts))); fbAll = rows;
    } catch (e) { $('fbList').innerHTML = '<p class="hint">Kunne ikke hente feedback: ' + E.esc((e && e.message) || e) + '</p>'; return; }
    renderFbList();
  }
  function renderFbList() {
    const rows = fbAll.filter(r => fbFilter === 'alle' || (fbFilter === 'op' && r.up) || (fbFilter === 'ned' && !r.up) || (fbFilter === 'tekst' && (r.ok || r.bad || r.miss)));
    const up = fbAll.filter(r => r.up).length, down = fbAll.length - up; const cnt = (key, f) => { const m = {}; fbAll.forEach(r => (f(r) || []).forEach(k => { m[k] = (m[k] || 0) + 1; })); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${E.esc(k)} ×${n}`).join(', ') || '–'; };
    const used = fbAll.filter(r => r.ctx && r.ctx.kopieret).length;
    $('fbSummary').innerHTML = `<b>${fbAll.length}</b> svar · 👍 ${up} · 👎 ${down} · JSON kopieret i ${used}<br><small>Oftest fjernet bagefter: ${cnt('f', r => r.ctx && r.ctx.fjernet)}<br>Oftest tilføjet bagefter: ${cnt('t', r => r.ctx && r.ctx.tilfoejet)}</small>`;
    for (const b of document.querySelectorAll('#fbFilters button')) b.setAttribute('aria-pressed', String(b.dataset.f === fbFilter));
    $('fbList').innerHTML = rows.length ? rows.map(r => `<article class="fbitem"><header><span>${r.up ? '👍' : '👎'}</span><b>${E.esc(r.navn)}</b><small>${E.esc(String(r.ts).slice(0, 10))} · ${E.esc(r.ctx.sidetype)} · ${E.esc(r.ctx.frihed)}${r.ctx.branche ? ' · ' + E.esc(r.ctx.branche) : ''}${r.ctx.kopieret ? ' · brugt' : ''}</small></header>${r.ok ? `<p><b>Virkede:</b> ${E.esc(r.ok)}</p>` : ''}${r.bad ? `<p><b>Virkede ikke:</b> ${E.esc(r.bad)}</p>` : ''}${r.miss ? `<p><b>Manglede:</b> ${E.esc(r.miss)}</p>` : ''}<small class="fbsec">${E.esc((r.ctx.sektioner || []).join(' → '))}${(r.ctx.fjernet || []).length ? '<br>Fjernet: ' + E.esc(r.ctx.fjernet.join(', ')) : ''}${(r.ctx.tilfoejet || []).length ? '<br>Tilføjet: ' + E.esc(r.ctx.tilfoejet.join(', ')) : ''}${r.ctx.prompt ? '<br>Prompt: ' + E.esc(r.ctx.prompt) : ''}</small></article>`).join('') : '<p class="hint">Ingen feedback endnu.</p>';
  }
  $('fbOpen').onclick = () => { $('fbDialog').hidden = false; loadFeedback(); };
  $('fbClose').onclick = () => { $('fbDialog').hidden = true; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('fbDialog').hidden) $('fbDialog').hidden = true; });
  $('fbFilters').addEventListener('click', e => { const b = e.target.closest('button[data-f]'); if (b) { fbFilter = b.dataset.f; renderFbList(); } });
  const fbAllText = () => fbAll.map(r => `${r.navn} · ${String(r.ts).slice(0, 10)}\n${fbText(r)}`).join('\n\n---\n\n');
  $('fbCopyAll').onclick = async () => { try { await navigator.clipboard.writeText(fbAllText()); $('fbCopyAll').textContent = '✓ Kopieret'; } catch (_) { $('fbCopyAll').textContent = 'Kunne ikke kopiere'; } setTimeout(() => { $('fbCopyAll').textContent = 'Kopiér alt som tekst'; }, 2000); };
  $('fbCsv').onclick = () => { const q = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; const head = ['dato', 'person', 'tommel', 'type', 'frihed', 'branche', 'kopieret', 'virkede', 'virkede_ikke', 'manglede', 'sektioner', 'fjernet', 'tilfoejet', 'prompt']; const lines = fbAll.map(r => [String(r.ts).slice(0, 10), r.navn, r.up ? 'op' : 'ned', r.ctx.sidetype, r.ctx.frihed, r.ctx.branche, r.ctx.kopieret ? 'ja' : 'nej', r.ok, r.bad, r.miss, (r.ctx.sektioner || []).join(' > '), (r.ctx.fjernet || []).join(' '), (r.ctx.tilfoejet || []).join(' '), r.ctx.prompt].map(q).join(';')); save('feedback-ai-udkast.csv', '\ufeff' + head.join(';') + '\n' + lines.join('\n')); };


  /* ---------- lås: "Kundens nuværende" og feedback åbnes med en kode. Låses igen ved refresh og Start forfra ---------- */
  const ADMIN_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
  let unlocked = false;
  async function sha256hex(s) { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch (_) { return ''; } }
  function applyLock() {
    $('soonBody').hidden = !unlocked; $('fbOpen').hidden = !unlocked; $('unlockShow').hidden = unlocked;
    if (!unlocked) { $('siteCard').open = false; $('unlockOv').hidden = true; $('unlockCode').value = ''; $('unlockMsg').textContent = ''; $('fbDialog').hidden = true; $('frihed').value = 'templates'; }
    $('fbCard').hidden = !(unlocked && !!cur());
  }
  const openUnlock = () => { $('unlockOv').hidden = false; $('unlockMsg').textContent = ''; $('unlockCode').value = ''; setTimeout(() => $('unlockCode').focus(), 30); };
  const closeUnlock = () => { $('unlockOv').hidden = true; };
  $('unlockShow').onclick = openUnlock; $('unlockClose').onclick = closeUnlock;
  $('unlockOv').addEventListener('mousedown', e => { if (e.target === $('unlockOv')) closeUnlock(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('unlockOv').hidden) closeUnlock(); else if (e.key === 'Escape' && selUid && $('picker').hidden) { selUid = null; render(); } });
  document.addEventListener('click', e => { if (!selUid || !$('picker').hidden || !$('unlockOv').hidden) return; const path = e.composedPath ? e.composedPath() : []; if (path.some(n => n && n.nodeType === 1 && (n.id === 'list' || n.id === 'pvOuter' || n.id === 'picker' || /^(BUTTON|INPUT|TEXTAREA|SELECT|SUMMARY|LABEL|A|DIALOG)$/.test(n.tagName) || (n.classList && n.classList.contains('ov'))))) return; selUid = null; render(); });
  $('unlockRow').addEventListener('submit', async e => {
    e.preventDefault(); const v = $('unlockCode').value.trim().toLowerCase(); const h = await sha256hex(v);
    if (h ? h === ADMIN_HASH : v === 'admin') { unlocked = true; closeUnlock(); applyLock(); setStatus('', 'ok'); }
    else { $('unlockMsg').textContent = 'Det er ikke den rigtige kode'; const bx = document.querySelector('.ovbox'); bx.classList.remove('shake'); void bx.offsetWidth; bx.classList.add('shake'); $('unlockCode').select(); }
  });
  /* ---------- frihed: hjælpetekst og maks. antal udkast ---------- */
  const MODE_HINT = { templates: 'Bruger kun jeres Best Templates.', mix: 'Templates, hvor de er stærke, og nye sektioner bygget af temaets farver og størrelser. Teksten til de nye sektioner skrives af AI.', ai: 'AI designer sektionerne selv: idé, layout, CSS og tekst. Tager 1-3 minutter pr. udkast, og du kan følge med live, mens siden bygges. Bruger mere af dit Claude-forbrug. Max 2 udkast ad gangen.' };
  const syncCount = () => { for (const r of document.querySelectorAll('input[name=cnt]')) { r.checked = r.value === $('count').value; r.disabled = $('frihed').value === 'ai' && +r.value > 2; r.parentElement.classList.toggle('on', +r.value <= +$('count').value); } };
  for (const r of document.querySelectorAll('input[name=cnt]')) r.addEventListener('change', () => { $('count').value = r.value; syncCount(); });
  const hovCount = n => { for (const r of document.querySelectorAll('input[name=cnt]')) r.parentElement.classList.toggle('hov', n > 0 && +r.value <= n && !r.disabled); };
  for (const r of document.querySelectorAll('input[name=cnt]')) { r.parentElement.addEventListener('mouseenter', () => { if (!r.disabled) hovCount(+r.value); }); r.parentElement.addEventListener('mouseleave', () => hovCount(0)); r.addEventListener('focus', () => { if (!r.disabled) hovCount(+r.value); }); r.addEventListener('blur', () => hovCount(0)); }
  function modeUI() { const m = $('frihed').value; $('frihedHint').textContent = MODE_HINT[m] || ''; const c = $('count'); for (const o of c.options) o.disabled = m === 'ai' && +o.value > 2; if (m === 'ai' && +c.value > 2) c.value = '2'; syncCount(); }
  $('frihed').addEventListener('change', modeUI);

  const THEME_ICON = { dark: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>', light: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>' };
  function setTheme(th, save) { document.documentElement.dataset.theme = th; for (const id of ['themeBtn', 'themeHome']) $(id).innerHTML = THEME_ICON[th === 'dark' ? 'dark' : 'light'];  }
  { const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null; setTheme(mq && mq.matches ? 'dark' : 'light', false); if (mq) { const f = e => setTheme(e.matches ? 'dark' : 'light', false); if (mq.addEventListener) mq.addEventListener('change', f); else if (mq.addListener) mq.addListener(f); } }
  for (const id of ['themeBtn', 'themeHome']) $(id).onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', false);
  { const sel = $('branche'); if (sel) sel.insertAdjacentHTML('beforeend', [...new Set(SITES.map(s => s.b))].filter(b => b && !/uklar/i.test(b)).sort((x, y) => x.localeCompare(y, 'da')).map(b => `<option>${E.esc(b)}</option>`).join('')); }
  const greet = () => { const h = new Date().getHours(); const g = h >= 23 || h < 5 ? 'Sent oppe? ' : h < 10 ? 'God morgen. ' : h < 17 ? '' : 'God aften. '; $('hi').textContent = g + (g && h >= 10 && h < 17 ? '' : '') + 'Hvem skal have en ny hjemmeside?'; };
  greet(); syncCount(); if (!matchMedia('(pointer: coarse)').matches) setTimeout(() => { try { $('navn').focus({ preventScroll: true }); } catch (_) { } }, 700);

  /* ---------- start forfra ---------- */
  let resetT = null;
  function doReset() {
    state = { brief: {}, proposals: [], active: 0 }; site = null; useSite = true; pageIdx = 0; hist = []; selUid = null; exp = null; lastHas = false; prefixTouched = false;
    for (const id of ['navn', 'prefix', 'msg', 'siteUrl']) $(id).value = ''; $('count').value = '1'; if ($('branche')) $('branche').value = ''; $('frihed').value = 'templates'; syncCount(); unlocked = false; modeUI(); applyLock(); const f = document.querySelector('input[name=sidetype][value=Forside]'); if (f) f.checked = true;
    $('siteCmd').textContent = cmdFor(''); $('siteCard').open = false; $('briefCard').open = true; $('editText').value = '';
    syncPrefix(); $('prefix').hidden = true; setStatus('Startet forfra.', 'ok'); window.scrollTo({ top: 0 }); render();
  }
  $('resetBtn').onclick = () => {
    const dirty = state.proposals.length || $('navn').value || $('msg').value || site;
    if (!dirty) { doReset(); return; }
    if (resetT) { clearTimeout(resetT); resetT = null; $('resetBtn').textContent = 'Start forfra'; $('resetBtn').classList.remove('warn'); doReset(); return; }
    $('resetBtn').textContent = 'Slet alt? Klik igen'; $('resetBtn').classList.add('warn');
    resetT = setTimeout(() => { resetT = null; $('resetBtn').textContent = 'Start forfra'; $('resetBtn').classList.remove('warn'); }, 3500);
  };

  /* ---------- AI: placér kundens indhold ---------- */
  async function applySite(p, onlyUids) {
    if (!site || !p) return;
    const secs = p.sections.filter(s => !s.fri && !s.ai && !s.hasContent && (!onlyUids || onlyUids.includes(s.uid))); if (!secs.length || localMode()) return;
    const res = await ask(E.contentPrompt(state.brief, secs, p.sections, site, pageIdx, p.usedBlocks), 'Placerer kundens indhold');
    const st = E.applyContent(secs, res, site, pageIdx);
    for (const sec of secs) { const r = res && res.sektioner && res.sektioner[sec.uid]; if (r) for (const v of Object.values(r.tekst || {})) (Array.isArray(v) ? v : [v]).forEach(i => { if (Number.isInteger(i) && !p.usedBlocks.includes(i)) p.usedBlocks.push(i); }); sec.hasContent = true; }
    p.contentNote = `${st.texts} tekstfelter og ${st.images} billeder kommer fra kundens site; resten er pladsholdertekst.`;
  }

  /* ---------- redigér ---------- */
  $('editBtn').onclick = async () => {
    const p = cur(); if (!sample || !p) return; const req = $('editText').value.trim(); if (!req) return;
    if (localMode()) { setStatus('Fritekst-ønsker kræver Claude. Brug knapperne ved hver sektion, eller tryk "Claude-forbindelse" nederst til højre.', 'warn'); return; }
    setStatus(''); pushHist();
    try {
      const res = await ask(E.editPrompt(state.brief, p, LIB, USE, req), 'Forstår ønsket');
      const redo = (res.ops || []).filter(o => o && o.op === 'redesign'); const out = E.applyOps(p, (res.ops || []).filter(o => !(o && o.op === 'redesign')), LIB, tlf(), CLASSES);
      for (const o of redo) { const t = p.sections[(o.index | 0) - 1]; if (t && t.ai) await regenAi(t, String(o.instruktion || '').slice(0, 400), true); }
      if (site && useSite && out.added.length) await applySite(p, out.added);
      $('editText').value = ''; const warn = out.log.filter(l => l.startsWith('⚠'));
      setStatus([res.svar, ...warn].filter(Boolean).join(' '), warn.length ? 'warn' : 'ok');
    } catch (e) { hist.pop(); ctl = null; const m = errCopy(e); if (m) setStatus(m, 'err'); }
    setBusy(false); render();
  };
  $('editText').addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') $('editBtn').click(); });
  $('undoBtn').onclick = () => { if (!hist.length) return; state = JSON.parse(hist.pop()); setStatus('Fortrudt.', 'ok'); render(); };

  /* ---------- sektionsliste: rækkefølge, variant, vælg, fjern ---------- */
  async function swapTo(index, tpl) {
    const p = cur(); pushHist(); const out = E.applyOps(p, [{ op: 'swap', index, tpl, manual: true }], LIB, tlf(), CLASSES);
    try { if (site && useSite && out.added.length) await applySite(p, out.added); } catch (e) { const m = errCopy(e); if (m) setStatus(m, 'err'); }
    setBusy(false); render();
  }
  $('list').addEventListener('click', ev => {
    const b = ev.target.closest('button[data-a]');
    if (!b) { const li = ev.target.closest('li[data-uid]'); if (li) { if (selUid === li.dataset.uid) { selUid = null; render(); return; } selUid = li.dataset.uid; render(); const el = root.querySelector(`[data-sec="${li.dataset.uid}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
    if (busy) return; const i = +b.dataset.i, a = b.dataset.a, p = cur(), s = p.sections[i - 1];
    pendingAnim = { i: a === 'up' ? i - 1 : a === 'down' ? i + 1 : i, a };
    if (a === 'copy') { copySection(s, b); return; }
    if (a === 'inc' || a === 'dec') { const n = (E.groupInfoSec(s) || { n: 0 }).n + (a === 'inc' ? 1 : -1); pushHist(); const r = E.resizeGroup(s, n, CLASSES); if (r.ok) s.warns = r.warn; else setStatus(r.msg, 'warn'); render(); return; }
    if (a === 'variant' && s.ai) { regenAi(s); return; }
    if (a === 'variant' && s.fri) { pushHist(); E.cycleFri(s); render(); return; }
    if (a === 'variant') { const used = p.sections.map(x => x.tpl); const nx = E.nextVariant(LIB, s.tpl, used); if (nx) swapTo(i, nx); return; }
    if (a === 'pick') { openPicker({ mode: 'swap', index: i, cat: E.categoryOf(s.tpl) }); return; }
    if (a === 'del') plog(p).removed.push(s.tpl);
    pushHist();
    E.applyOps(p, [a === 'up' ? { op: 'move', index: i, to: i - 1 } : a === 'down' ? { op: 'move', index: i, to: i + 1 } : { op: 'remove', index: i }], LIB, tlf(), CLASSES); render();
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
  function closePicker() { $('picker').hidden = true; $('pkGrid').innerHTML = ''; pk = null; }
  $('pkClose').onclick = closePicker;
  $('picker').addEventListener('click', e => { if (e.target === $('picker')) closePicker(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('picker').hidden) closePicker(); });
  const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (_) { return 'online'; } };
  let pkSortPref = 'nyeste';
  const SORTS = [['nyeste', 'Nyeste først'], ['aeldste', 'Ældste først'], ['navn', 'Navn A–Å'], ['brugt', 'Mest brugt']];
  function renderPicker() {
    $('pkTitle').textContent = pk.mode === 'swap' ? `Vælg anden variant af sektion ${pk.index}` : 'Tilføj sektion';
    $('pkCats').innerHTML = [...(pk.mode === 'swap' ? [] : ['Nyeste', ...(E.groupKeys(LIB, 'Live sektioner').length ? ['Live sektioner'] : [])]), ...E.catList(LIB)].map(n => `<button class="chip" aria-pressed="${n === pk.cat}" data-cat="${n}">${n}</button>`).join('');
    if (pk.cat === 'Nye sektioner') { renderFriGrid(); return; }
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
      const host = card.querySelector('.pkprev'); const sh = host.attachShadow({ mode: 'open' });
      const r = E.renderSections([E.makeSection(LIB, k)], CLASSES, VARS);
      sh.innerHTML = `<style>${r.css}#f{width:1280px;transform:scale(.234);transform-origin:top left;container-type:inline-size;background:var(--bg-body,#fff)}</style><div id="f">${r.html}</div>`;
      faApply(sh.getElementById('f'), sh);
    }
  }
  const FRI_DEMO = { intro: { eyebrow: 'Klar til at komme i gang?', overskrift: 'Få et uforpligtende tilbud', tekst: 'Ring eller skriv, så vender vi tilbage hurtigst muligt.', knapper: [{ tekst: 'Kontakt os', type: 'kontakt' }], stil: 'primaer' }, split: { eyebrow: 'Om os', overskrift: 'Overskrift til tekst og billede', tekst: 'Kort tekst, der forklarer, hvad siden handler om.', punkter: ['Første punkt', 'Andet punkt', 'Tredje punkt'], knapper: [{ tekst: 'Kontakt os', type: 'kontakt' }] }, cards: { eyebrow: 'Ydelser', overskrift: 'Overskrift til kort' }, features: { eyebrow: 'Hvorfor os', overskrift: 'Overskrift til fordele', stil: 'graa' }, steps: { eyebrow: 'Sådan foregår det', overskrift: 'Fra første kontakt til resultat' }, stats: { tal: [{ tal: '100', suffix: '+', label: 'Kunder' }, { tal: '100', suffix: '%', label: 'Fast pris' }, { tal: '24', suffix: 't', label: 'Svar inden' }] }, trust: { kort: [{ ikon: 'shield-halved', titel: 'Fast pris' }, { ikon: 'clock', titel: 'Hurtig opstart' }, { ikon: 'hammer', titel: 'Fagligt håndværk' }, { ikon: 'location-dot', titel: 'Lokal' }] }, quote: { eyebrow: 'Kundernes ord' }, gallery: { eyebrow: 'Udvalgte projekter', overskrift: 'Se noget af vores arbejde', antal: 6 } };
  const FRI_DESC = { intro: 'Kort intro med overskrift og knapper.', split: 'Tekst og billede side om side, med punkter og knapper.', cards: 'Kort i et gitter med ikon, overskrift og tekst.', features: 'Fordele med ikoner ved siden af en overskrift.', steps: 'Nummererede trin, fx "sådan foregår det".', stats: 'Store tal som bevis (fx kunder, svartid).', trust: 'Smalt tillidsbånd med korte løfter og ikoner.', quote: 'Stort citat med stjerner.', gallery: 'Billedgalleri i et pænt gitter.' };
  function renderFriGrid() {
    const grid = $('pkGrid'); grid.innerHTML = '';
    for (const t of Object.keys(E.FRI_TYPES)) {
      const card = document.createElement('button'); card.className = 'pkcard'; card.dataset.fri = t;
      card.innerHTML = `<div class="pkprev"></div><div class="pkmeta"><b>Ny · ${E.esc(E.FRI_TYPES[t].name)}</b><small>Bygget af temaets farver og størrelser</small><span class="pkdesc">${E.esc(FRI_DESC[t] || '')}</span></div>`;
      grid.appendChild(card);
      const sh = card.querySelector('.pkprev').attachShadow({ mode: 'open' }); const r = E.renderSections([E.makeFri(Object.assign({ fri: t }, FRI_DEMO[t]), '')], CLASSES, VARS);
      sh.innerHTML = `<style>${r.css}#f{width:1280px;transform:scale(.234);transform-origin:top left;container-type:inline-size;background:var(--bg-body,#fff)}</style><div id="f">${r.html}</div>`; faApply(sh.getElementById('f'), sh);
    }
  }
  if ($('pkSort')) $('pkSort').addEventListener('change', e => { if (pk) { pk.sort = pkSortPref = e.target.value; renderPicker(); } });
  $('pkCats').addEventListener('click', e => { const sb = e.target.closest('[data-sub]'); if (sb && pk) { pk.sub = sb.dataset.sub === 'Alle' ? '' : sb.dataset.sub; renderPicker(); return; }
     const b = e.target.closest('[data-cat]'); if (b) { pk.cat = b.dataset.cat; renderPicker(); } });
  $('pkGrid').addEventListener('click', async e => {
    const lk = e.target.closest('.pklink'); if (lk) { e.stopPropagation(); window.open(lk.dataset.url, '_blank', 'noopener'); return; }
    const c = e.target.closest('.pkcard'); if (!c || !pk) return;
    if (c.dataset.fri) { closePicker(); const p = cur(); pushHist(); plog(p).added.push('fri:' + c.dataset.fri); E.applyOps(p, [{ op: 'add', fri: Object.assign({ fri: c.dataset.fri }, FRI_DEMO[c.dataset.fri]) }], LIB, tlf(), CLASSES); render(); return; }
    const k = c.dataset.k, o = pk; closePicker();
    if (o.mode === 'swap') { await swapTo(o.index, k); return; }
    const p = cur(); pushHist(); plog(p).added.push(k); const cat = E.categoryOf(k); const addOp = { op: 'add', tpl: k, manual: true }; if (cat === 'Menu') addOp.at = 1; else if (p.sections.length && E.categoryOf(p.sections[p.sections.length - 1].tpl) === 'Footer' && cat !== 'Footer') addOp.at = p.sections.length; const out = E.applyOps(p, [addOp], LIB, tlf(), CLASSES);
    try { if (site && useSite && out.added.length) await applySite(p, out.added); } catch (er) { const m = errCopy(er); if (m) setStatus(m, 'err'); }
    setBusy(false); render();
  });


  /* ---------- skabelonliste fra Google-arket ---------- */
  function renderPkFoot() {
    const miss = E.getMissing().filter(o => !/^(Menu|Footer)$/i.test(o.t));
    $('pkSheet').textContent = sheetNote;
    $('pkMissing').innerHTML = ''; $('pkMissing').hidden = true; if (false) $('pkMissing').innerHTML = miss.length ? `<summary>${miss.length} skabeloner i arket har ingen JSON endnu</summary><p class="hint" style="margin:6px 0">Eksportér dem fra Bricks og tilføj dem til biblioteket, så kan de bruges her: ${miss.map(o => E.esc(o.n)).join(', ')}.</p>` : '';
  }
  function parseCsv(txt) {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < txt.length; i++) {
      const c = txt[i];
      if (q) { if (c === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); } return rows;
  }
  async function syncSheet() {
    const btn = $('pkSync'); btn.disabled = true; const old = btn.textContent; btn.textContent = 'Henter…';
    try {
      const mcp = window.claude ? await window.claude.use('mcp') : null;
      if (!mcp) throw { code: 'unavailable' };
      const r = await mcp.callTool('Google Drive', 'download_file_content', { fileId: SHEET_ID, exportMimeType: 'text/csv' });
      let pl = r && r.payload; if (typeof pl === 'string') { try { pl = JSON.parse(pl); } catch (_) { } }
      const b64 = pl && pl.content; if (!b64) throw { code: 'format' };
      const bin = atob(b64); const bytes = Uint8Array.from(bin, c => c.charCodeAt(0)); const txt = new TextDecoder('utf-8').decode(bytes);
      const rows = parseCsv(txt); const h = rows.findIndex(x => x[1] === 'Navn'); if (h < 0) throw { code: 'format' };
      const out = []; for (const x of rows.slice(h + 1)) { if (!x[1] || !x[1].trim()) continue; const u = (x[4] || '').trim(); out.push({ n: x[1].trim(), t: (x[2] || '').trim(), d: (x[3] || '').trim(), s: u.replace(/\/$/, '').split('/').pop(), u, b: (x[5] || '').trim() }); }
      if (!out.length) throw { code: 'format' };
      const res = E.setMeta(LIB, out); sheetNote = `Skabelonliste: hentet fra arket lige nu (${out.length} rækker, ${res.matched} med JSON)`;
      setStatus(`Hentede ${out.length} skabeloner fra arket.`, 'ok'); renderPicker(); render();
    } catch (e) {
      const m = { server_not_connected: 'Google Drive er ikke tilføjet. Tilføj det under Indstillinger → Connectors i Claude.', needs_reauth: 'Google Drive skal logges ind igen under Indstillinger → Connectors.', not_in_manifest: 'Du har ikke givet siden lov til at læse fra Google Drive.', approval_required: 'Siden skal have din godkendelse til at læse arket.', unavailable: 'Kan ikke læse arket her. Åbn siden i claude.ai.', format: 'Arket havde ikke det forventede format.', tool_error: 'Google Drive kunne ikke læse arket (har du adgang til det?).' }[e && e.code];
      setStatus(m || 'Kunne ikke hente arket lige nu. Den indbyggede liste bruges.', 'warn');
    } finally { btn.disabled = false; btn.textContent = old; }
  }
  $('pkSync').onclick = syncSheet;

  /* ---------- faner (udkast) ---------- */
  $('tabs').addEventListener('click', async e => {
    if (e.target.closest('#moreBtn')) { if (!busy) generate(true); return; }
    const b = e.target.closest('[data-tab]'); if (!b || busy) return; state.active = +b.dataset.tab; const p = cur();
    render();
    if (site && useSite && p.sections.some(s => !s.hasContent)) { try { await applySite(p); } catch (er) { const m = errCopy(er); if (m) setStatus(m, 'err'); } setBusy(false); render(); }
  });


  /* ---------- eksport ---------- */
  let flashT = null;
  function flashCopied() { const b = $('copyBtn'); if (!b.dataset.label) b.dataset.label = b.textContent; b.textContent = '✓ Kopieret'; b.classList.add('done'); clearTimeout(flashT); flashT = setTimeout(() => { b.textContent = b.dataset.label; b.classList.remove('done'); }, 2400); }
  async function copyJson() {
    const text = JSON.stringify(exp.json); if (cur()) plog(cur()).copied = true;
    try { await navigator.clipboard.writeText(text); flashCopied(); setStatus('JSON kopieret. Indsæt i Bricks med Ctrl/Cmd + V.', 'ok'); return; } catch (_) { }
    try { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); if (ok) { flashCopied(); setStatus('JSON kopieret. Indsæt i Bricks med Ctrl/Cmd + V.', 'ok'); return; } } catch (_) { }
    $('cfText').value = text; $('copyFallback').hidden = false; $('cfText').focus(); $('cfText').select(); setStatus('Browseren blokerer kopiering her. JSON er markeret, tryk Ctrl/Cmd + C.', 'warn');
  }
  $('copyBtn').onclick = () => { if (exp) copyJson(); };
  const CHECK_SVG = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  async function copySection(s, btn) {
    const ex = E.buildExport(Object.assign({}, cur(), { sections: [s] }), CLASSES, { prefix: readBrief().prefix, h1: 'hero' }); const text = JSON.stringify(ex.json); let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (_) { try { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch (_) { } }
    if (ok) { const old = btn.innerHTML; btn.innerHTML = CHECK_SVG; btn.classList.add('done'); setTimeout(() => { btn.innerHTML = old; btn.classList.remove('done'); }, 1800); setStatus('Sektionens JSON er kopieret. Indsæt i Bricks med Ctrl/Cmd + V.', 'ok'); }
    else { $('cfText').value = text; $('copyFallback').hidden = false; $('cfText').focus(); $('cfText').select(); setStatus('Browseren blokerer kopiering her. JSON er markeret, tryk Ctrl/Cmd + C.', 'warn'); }
  }
  async function save(name, data) {
    try { const dl = await window.claude.use('downloads'); if (!dl) throw 0; await dl.save({ filename: name, data }); setStatus('Fil gemt.', 'ok'); }
    catch (e) { if (!e || e.code !== 'declined') setStatus('Kunne ikke gemme som fil her. Brug Kopiér JSON i stedet.', 'warn'); }
  }
  const slug = () => (state.brief.navn || 'udkast').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'udkast';
  $('imgCsv').onclick = () => {
    if (!exp || !exp.imageUse.length) return; const q = v => '"' + String(v).replace(/"/g, '""') + '"';
    save(`billeder-${slug()}.csv`, '\ufeffSektion;Template;Fil (i mappen billeder/);Original-URL\n' + exp.imageUse.map(x => [x.section, x.tpl, x.file, x.src].map(q).join(';')).join('\n'));
  };
  $('cfClose').onclick = () => { $('copyFallback').hidden = true; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('copyFallback').hidden) $('copyFallback').hidden = true; });

  /* ---------- visning ---------- */
  if (window.matchMedia && window.matchMedia('(max-width:700px)').matches) device = 'mobil';                  // på en telefon vises mobilversionen som standard
  const BRANDS = { templates: { cta: '#225581', links: '#1a4061' }, stock: { cta: '#e60c16', links: '#ae0911' } };
  $('brandSel').onchange = () => { const br = BRANDS[$('brandSel').value] || BRANDS.templates; for (const v of VARS) if (v[0] === 'cta' || v[0] === 'links') v[1] = br[v[0]]; render(); };
  for (const x of document.querySelectorAll('#devices button')) x.setAttribute('aria-pressed', String(x.dataset.d === device));
  for (const b of document.querySelectorAll('#devices button')) b.onclick = () => { device = b.dataset.d; for (const x of document.querySelectorAll('#devices button')) x.setAttribute('aria-pressed', x === b); fit(); };
  function fit() {
    const w = DEVICES[device]; const outer = $('pvOuter'); const avail = $('canvas').clientWidth || 900;
    const scale = Math.min(1, avail / w); frame.style.cssText = `width:${w}px;transform:scale(${scale});transform-origin:top left;container-type:inline-size;background:var(--bg-body,#fff);`;
    outer.style.width = Math.round(w * scale) + 'px'; outer.style.height = Math.round(frame.offsetHeight * scale) + 'px';
  }
  new ResizeObserver(() => { if (cur()) fit(); }).observe($('canvas'));

  function render() {
    if (building) { drawBuild(); return; }
    const p = cur(); const has = !!p; document.body.classList.toggle('home', !has);
    $('empty').hidden = has; $('pvOuter').hidden = !has; $('listCard').hidden = !has; $('editCard').hidden = !has; $('notesCard').hidden = !has; $('fbCard').hidden = !(has && unlocked); $('tabs').hidden = !has; $('tabrow').hidden = !has; $('chromeUrl').textContent = ((state.brief || {}).navn || 'Udkast') + ' · ' + ((state.brief || {}).sidetype || 'Forside');
    $('undoBtn').disabled = !hist.length; $('copyBtn').disabled = !has;
    if (has !== lastHas) { $('briefCard').open = !has; lastHas = has; } renderSite();
    if (!has) { exp = null; $('valWrap').hidden = true; $('imgCard').hidden = true; $('tabs').innerHTML = ''; $('size').textContent = ''; return; }
    $('tabs').innerHTML = state.proposals.map((x, i) => `<button class="tab" data-tab="${i}" aria-pressed="${i === state.active}" aria-label="Udkast ${i + 1}">Udkast ${i + 1}</button>`).join('');
    if (state.proposals.length < MAX_PROPOSALS) $('tabs').insertAdjacentHTML('beforeend', `<button class="tab more" id="moreBtn" data-lock>+ Et udkast mere (${state.proposals.length}/${MAX_PROPOSALS})</button>`);
    exp = E.buildExport(p, CLASSES, { prefix: readBrief().prefix }); renderFb(p); const val = E.validate(exp); const fails = val.filter(v => !v.pass);
    const pageLike = !E.SECTION_ONLY[(state.brief || {}).sidetype]; const h1n = exp.json.content.filter(e => e.name === 'heading' && (e.settings || {}).tag === 'h1').length; const h1bad = pageLike && h1n !== 1; const h1msg = h1n === 0 ? 'Siden har ingen H1. Der bør være præcis én (typisk hero-overskriften).' : `Siden har ${h1n} H1-overskrifter. Der bør kun være én.`;
    $('valWrap').hidden = !fails.length; const vb = $('valBadge'); vb.dataset.ok = fails.length ? 'no' : 'yes'; vb.textContent = (fails.length ? `⚠ ${fails.length} tjek fejler` : `✓ Klar til Bricks · ${val.length}/${val.length} tjek`) + (h1bad ? ' · ⚠ H1' : '');
    $('valList').innerHTML = val.map(v => `<li data-p="${v.pass}"><span>${v.pass ? '✓' : '✗'}</span> ${E.esc(v.name)}${v.pass ? '' : ' – ' + E.esc(v.detail)}</li>`).join('') + (pageLike ? `<li data-p="${!h1bad}"><span>${h1bad ? '⚠' : '✓'}</span> Præcis én H1 (SEO)${h1bad ? ' – ' + E.esc(h1msg) : ''}</li>` : '');
    const prevUids = lastUids; lastUids = new Set(p.sections.map(s => s.uid));
    $('list').innerHTML = p.sections.map((s, i) => `<li draggable="true" data-i="${i + 1}" data-uid="${s.uid}" class="${s.uid === selUid ? 'sel ' : ''}${s.part > 1 ? 'cont ' : ''}${prevUids.has(s.uid) ? '' : 'new'}"><span class="grip" aria-hidden="true">⠿</span><span class="n">${i + 1}</span><div class="t"><b>${E.esc(E.secTitle(s))}${s.parts > 1 ? ` <em class="part" title="${E.esc(E.displayName(s.tpl))} består af ${s.parts} sektioner i Bricks. De kan flyttes eller fjernes hver for sig.">sektion ${s.part} af ${s.parts}</em>` : ''}</b><small>${E.esc(s.tpl)} · ${E.esc(E.categoryOf(s.tpl) || '')}</small>${(LIB[s.tpl] && LIB[s.tpl].url) ? `<small class="srcl"><a href="${E.esc(LIB[s.tpl].url)}" target="_blank" rel="noopener" title="Åbn den rigtige side">↗ ${E.esc(hostOf(LIB[s.tpl].url))}</a></small>` : ''}${s.why ? `<small class="why">${E.esc(s.why)}</small>` : ''}${(() => { const gi = E.groupInfoSec(s); return gi && gi.adjustable ? `<span class="cnt" title="Antal ${gi.label} i sektionen. Layoutet tilpasser sig selv"><button data-a="dec" data-i="${i + 1}" data-lock aria-label="Et færre">−</button><b>${gi.n}</b><button data-a="inc" data-i="${i + 1}" data-lock aria-label="Et mere">+</button><em>${gi.label}</em></span>` : ''; })()}</div><div class="ac">
      <button data-a="up" data-i="${i + 1}" ${i === 0 ? 'disabled' : ''} data-lock aria-label="Flyt op" title="Flyt op"><svg viewBox="0 0 24 24"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg></button><button data-a="down" data-i="${i + 1}" ${i === p.sections.length - 1 ? 'disabled' : ''} data-lock aria-label="Flyt ned" title="Flyt ned"><svg viewBox="0 0 24 24"><path d="M12 5v14M5.5 12.5 12 19l6.5-6.5"/></svg></button>
      <button data-a="variant" data-i="${i + 1}" data-lock ${s.part > 1 ? 'disabled' : ''} aria-label="Prøv en anden variant" title="${s.ai ? 'Ny version (AI laver sektionen om)' : s.fri ? 'Skift stil og layout' : s.part > 1 ? 'Er en del af ' + E.esc(E.displayName(s.tpl)) + '. Skift på del 1.' : 'Prøv næste variant (fx en anden hero)'}"><svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.3-4.6L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.6L20 15.5M20 20v-4.5h-4.5"/></svg></button><button data-a="pick" data-i="${i + 1}" data-lock ${s.part > 1 || s.fri || s.ai ? 'disabled' : ''} aria-label="Vælg variant" title="${s.part > 1 ? 'Er en del af ' + E.esc(E.displayName(s.tpl)) + '. Skift på del 1.' : 'Vælg variant med billeder'}"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.8"/><rect x="13" y="13" width="7" height="7" rx="1.8"/></svg></button><button data-a="copy" data-i="${i + 1}" aria-label="Kopiér sektionens JSON" title="Kopiér denne sektions JSON"><svg viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M15.5 8.5V6.7a2.2 2.2 0 0 0-2.2-2.2H6.7a2.2 2.2 0 0 0-2.2 2.2v6.6a2.2 2.2 0 0 0 2.2 2.2h1.8"/></svg></button><span class="gap"></span><button data-a="del" data-i="${i + 1}" data-lock aria-label="Fjern" title="Fjern sektion"><svg viewBox="0 0 24 24"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7M10 11v6M14 11v6"/></svg></button></div></li>`).join('');
    if (pendingAnim) { const pa = pendingAnim; pendingAnim = null; const li = $('list').querySelector(`li[data-i="${pa.i}"]`); if (li) { if (pa.a === 'up' || pa.a === 'down') li.classList.add('moved'); const bt = li.querySelector(`button[data-a="${pa.a}"]`); if (bt && (pa.a === 'variant' || pa.a === 'pick')) bt.classList.add('spin'); } }
    $('planNote').textContent = ''; $('planNote').hidden = true;
    // billeder fra kundens site
    $('imgCard').hidden = !(exp.imageUse && exp.imageUse.length);
    $('imgList').innerHTML = (exp.imageUse || []).map(x => `<li><b>Sektion ${x.section}</b> · ${E.esc(x.tpl)}<br><small>${E.esc(x.file)}</small></li>`).join('');
    const secWarns = p.sections.flatMap((s, i) => (s.warns || []).map(w => `Sektion ${i + 1} (${s.tpl}): ${w}`));
    const aiN = p.sections.filter(s => s.ai).length; const aiIssues = p.sections.filter(s => s.ai && s.ai.issues && s.ai.issues.length).map(s => `Tjek «${s.ai.spec.navn}»: ${s.ai.issues.join('; ')}`); const aiFailN = p.sections.filter(s => !s.ai && /kunne ikke bygges/.test(s.why || '')).length; const friN = p.sections.filter(s => s.fri).length; const notes = [...(exp.h1Fixed ? [`H1 rettet automatisk: ${exp.h1Fixed} ekstra H1 er lavet om til H2, så siden kun har én H1, og den ligger i heroen.`] : []), ...(h1bad ? [h1n === 0 ? 'Siden mangler en H1-overskrift (typisk i hero).' : `Siden har ${h1n} H1-overskrifter. Der bør kun være én pr. side.`] : []), ...(aiN ? [`${aiN} ${aiN === 1 ? 'AI-designet sektion' : 'AI-designede sektioner'}: layout, CSS og tekst er skrevet af AI. Tjek dem på mobil og i Bricks, og ret teksten før brug. Tal og citater er pladsholdere, og billeder er pladsholdere. Styling ligger i globale klasser med Bricks' egne indstillinger og breakpoints; kun det, Bricks ikke kan natively (gradient, clip-path, ::before, animation), ligger i klassens egen CSS.`] : []), ...aiIssues, ...(aiFailN ? [`${aiFailN} AI-sektion kunne ikke bygges og er erstattet af en enkel intro. Brug "Ret med AI" eller tilføj en sektion selv.`] : []), ...(h1bad ? [h1msg] : []), ...(friN ? [`${friN} ${friN === 1 ? 'ny sektion' : 'nye sektioner'}: teksten er skrevet af AI som forslag, og tal under "Tal" og citater er pladsholdere. Læs det igennem og ret, før det bruges. Billeder er pladsholdere. Sektionerne bruger temaets farver og størrelser, så tjek dem på det rigtige site.`] : []), ...(p.contentNote ? [p.contentNote] : []), ...(exp.renamed ? [`Klasserne er omdøbt med præfikset «${exp.prefix}-» (${exp.renamed} klasser). CSS og kode følger med, så alt virker som før.`] : []), ...secWarns, ...exp.flags]; if (exp.imageUse && exp.imageUse.length) notes.push('Billederne peger på kundens gamle site (external URL) og forsvinder når det site lukker. Upload billederne fra mappen billeder/ til mediebiblioteket og vælg dem i Bricks – ikke testet i Bricks endnu.');
    $('notes').innerHTML = notes.map(n => `<li class="flag">⚠ ${E.esc(n)}</li>`).join('') +
      `<li>🔗 <b>Links</b> – tjek at links er korrekte</li><li>📝 <b>Tekst</b> – pladsholdertekst skal udskiftes med rigtig tekst</li><li>🎨 <b>Design</b> – 1:1 med skabelonen (tjek alle skærmstørrelser)</li><li>🖼️ <b>Billeder</b> – samme som skabelonen, skift selv ud</li>` + (exp.formCount ? `<li>📨 <b>Formular</b> – tjek at form-ID er ${E.FORM_ID} efter paste</li>` : '');
    const r = E.renderSections(p.sections, CLASSES, VARS, { h1: 'page' }); const selCss = '[data-sec]{scroll-margin-top:130px}' + (selUid && p.sections.some(x => x.uid === selUid) ? `[data-sec="${selUid}"]{outline:4px solid #d97757;outline-offset:-4px;position:relative;z-index:1}` : ''); pvStyle.textContent = '#frame{overflow:hidden}' + r.css + selCss; pvContent.innerHTML = r.html;
    fit(); faApply(pvContent, root); setTimeout(fit, 50);
    const kb = Math.round(JSON.stringify(exp.json).length / 1024), rawKb = Math.round(JSON.stringify(E.buildExport(p, CLASSES, { raw: true }).json).length / 1024);
    
  }

  /* ---------- træk i bredden på venstre side (som i Bricks) ---------- */
  (function () {
    const app = document.querySelector('.app'), rz = $('resizer'); const MIN = 300, MAX = 780;
    const apply = w => { w = Math.max(MIN, Math.min(MAX, Math.min(w, window.innerWidth - 480))); app.style.setProperty('--side-w', w + 'px'); return w; };
    try { const v = parseInt(localStorage.getItem('bo-side-w'), 10); if (v) apply(v); } catch (_) { }
    let w0 = 0; const save = w => { try { localStorage.setItem('bo-side-w', String(Math.round(w))); } catch (_) { } };
    const move = e => { const left = app.getBoundingClientRect().left + parseFloat(getComputedStyle(app).paddingLeft || 0); w0 = apply(e.clientX - left - 7); };
    const end = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); rz.classList.remove('drag'); document.body.classList.remove('resizing'); if (w0) save(w0); };
    rz.addEventListener('pointerdown', e => { e.preventDefault(); rz.classList.add('drag'); document.body.classList.add('resizing'); window.addEventListener('pointermove', move); window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end); });
    rz.addEventListener('dblclick', () => { app.style.removeProperty('--side-w'); try { localStorage.removeItem('bo-side-w'); } catch (_) { } });
    rz.addEventListener('keydown', e => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); const cur = parseFloat(getComputedStyle(app).getPropertyValue('--side-w')) || 420; const w = apply(cur + (e.key === 'ArrowRight' ? 20 : -20)); save(w); });
  })();

  modeUI(); applyLock();
  render();
})();
