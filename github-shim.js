/* Adapter: gør at værktøjet også virker uden for claude.ai.
   Appen kalder window.claude.use('sample' | 'db' | 'user' | 'downloads' | 'mcp'); her leveres de af browseren selv.
   Claude-kald går enten via en proxy (anbefalet til teams, se worker/) eller direkte med brugerens egen API-nøgle. */
(function () {
  if (window.claude) return;
  var CFG = Object.assign({ proxyUrl: '', model: 'claude-sonnet-4-6', maxTokens: 8000 }, window.UDKAST_CONFIG || {});
  var ls = { get: function (k) { try { return localStorage.getItem(k) || ''; } catch (_) { return ''; } }, set: function (k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (_) { } } };
  var $ = function (h) { var d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; };

  /* ---------- indstillinger (API-nøgle / proxy) ---------- */
  var waiting = [];
  function hasConn() { return !!(CFG.proxyUrl || ls.get('bo-proxy') || ls.get('bo-key')); }
  function openSettings() {
    return new Promise(function (resolve, reject) {
      waiting.push({ resolve: resolve, reject: reject });
      if (document.getElementById('cxOv')) return;
      var ov = $('<div class="ov" id="cxOv"><div class="ovbox" role="dialog" aria-modal="true" aria-labelledby="cxT" style="width:min(460px,100%);text-align:left">' +
        '<button class="ovx" id="cxX" type="button" aria-label="Luk">×</button><h3 id="cxT" style="text-align:center">Forbind Claude (valgfrit)</h3>' +
        '<p style="text-align:center">Udkast virker allerede uden Claude. Forbind Claude, hvis du vil have udkast, der tager højde for kontekst-feltet, og kunne bede om ændringer i fritekst.</p>' +
        '<label style="font-weight:600;font-size:13px">Proxy-URL (anbefalet til teamet)</label><input type="text" id="cxProxy" placeholder="https://udkast-proxy.dit-navn.workers.dev" style="width:100%;margin:4px 0 8px">' +
        '<label style="font-weight:600;font-size:13px">Adgangskode til proxyen (hvis den kræver en)</label><input type="password" id="cxCode" autocomplete="off" style="width:100%;margin:4px 0 12px">' +
        '<label style="font-weight:600;font-size:13px">…eller din egen Anthropic API-nøgle</label><input type="password" id="cxKey" placeholder="sk-ant-…" autocomplete="off" style="width:100%;margin:4px 0 6px">' +
        '<p style="font-size:12px;margin:0 0 14px;color:var(--muted)">Gemmes kun i din egen browser (localStorage) og sendes aldrig andre steder hen end til Anthropic eller din proxy.</p>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="cxClear" type="button" style="margin-right:auto">Fjern forbindelse</button><button class="btn" id="cxCancel" type="button">Annullér</button><button class="btn primary" id="cxSave" type="button">Gem</button></div></div></div>');
      document.body.appendChild(ov);
      document.getElementById('cxProxy').value = ls.get('bo-proxy'); document.getElementById('cxCode').value = ls.get('bo-code'); document.getElementById('cxKey').value = ls.get('bo-key');
      var close = function (ok) { ov.remove(); refreshLink(); var w = waiting; waiting = []; w.forEach(function (x) { ok ? x.resolve() : x.reject(Object.assign(new Error('Afbrudt'), { name: 'AbortError' })); }); };
      document.getElementById('cxClear').onclick = function () { ls.set('bo-proxy', ''); ls.set('bo-code', ''); ls.set('bo-key', ''); close(false); };
      document.getElementById('cxSave').onclick = function () {
        ls.set('bo-proxy', document.getElementById('cxProxy').value.trim()); ls.set('bo-code', document.getElementById('cxCode').value.trim()); ls.set('bo-key', document.getElementById('cxKey').value.trim());
        if (hasConn()) close(true); else document.getElementById('cxProxy').focus();
      };
      document.getElementById('cxCancel').onclick = document.getElementById('cxX').onclick = function () { close(false); };
      ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(false); });
      setTimeout(function () { document.getElementById('cxProxy').focus(); }, 30);
    });
  }
  function refreshLink() { var l = document.getElementById('cxLink'); if (l) l.textContent = hasConn() ? 'Claude er forbundet · ændr' : 'Forbind Claude (valgfrit)'; }
  window.addEventListener('DOMContentLoaded', function () {
    var b = $('<button type="button" id="cxLink" style="position:fixed;right:14px;bottom:12px;z-index:20;border:0;background:transparent;color:var(--muted);font-size:12px;cursor:pointer;text-decoration:underline;padding:4px">Claude-forbindelse</button>');
    b.onclick = function () { openSettings().catch(function () { }); }; document.body.appendChild(b); refreshLink();
  });

  /* ---------- Claude ---------- */
  function parseJson(txt) {
    var t = String(txt || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    try { return JSON.parse(t); } catch (_) { }
    var a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (_) { } }
    throw new Error('Claude svarede ikke med gyldig JSON');
  }
  async function callClaude(prompt, opts) {
    if (!hasConn()) throw Object.assign(new Error('Kræver Claude'), { code: 'local' });
    var proxy = CFG.proxyUrl || ls.get('bo-proxy'); var key = ls.get('bo-key'); var code = ls.get('bo-code');
    var body = { model: CFG.model, max_tokens: CFG.maxTokens, messages: [{ role: 'user', content: String(prompt) + '\n\nSvar KUN med gyldig JSON. Ingen forklaring, ingen markdown.' }] };
    var headers = { 'content-type': 'application/json' };
    if (proxy) { if (code) headers['x-access-code'] = code; } else { headers['x-api-key'] = key; headers['anthropic-version'] = '2023-06-01'; headers['anthropic-dangerous-direct-browser-access'] = 'true'; }
    var res = await fetch(proxy || 'https://api.anthropic.com/v1/messages', { method: 'POST', headers: headers, body: JSON.stringify(body), signal: opts && opts.signal });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) { if (res.status === 401 || res.status === 403) { ls.set('bo-key', ''); } throw new Error((data && data.error && (data.error.message || data.error)) || ('Fejl ' + res.status)); }
    var text = (data.content || []).filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('');
    return parseJson(text);
  }

  /* ---------- lokal "database" til feedback, bruger og download ---------- */
  var dbRead = function () { try { return JSON.parse(ls.get('bo-db') || '{}'); } catch (_) { return {}; } }, dbWrite = function (o) { ls.set('bo-db', JSON.stringify(o)); };
  var db = {
    doc: function (path) { return { get: async function () { var o = dbRead(); return { exists: path in o, data: function () { return o[path]; } }; }, set: async function (v) { var o = dbRead(); o[path] = v; dbWrite(o); } }; },
    collection: function (name) { return { get: async function () { var o = dbRead(); return { docs: Object.keys(o).filter(function (k) { return k.indexOf(name + '/') === 0; }).map(function (k) { return { id: k.slice(name.length + 1), data: function () { return o[k]; } }; }) }; } }; }
  };
  var downloads = { save: async function (f) { var blob = new Blob([typeof f.data === 'string' ? f.data : JSON.stringify(f.data, null, 2)], { type: 'application/json' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = f.filename; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); } };
  var mods = { sample: { json: callClaude }, db: db, user: { id: async function () { return 'lokal'; } }, downloads: downloads, mcp: null };
  window.claude = { use: async function (name) { return mods[name] || null; }, isLocal: true };
  Object.defineProperty(window.claude, 'mode', { get: function () { return hasConn() ? 'claude' : 'local'; } });
})();
