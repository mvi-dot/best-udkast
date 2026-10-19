/* Adapter: Udkast kører helt uden Claude. Der er ingen API-nøgle, ingen proxy og ingen forbindelsesdialog.
   Appen kalder window.claude.use('sample' | 'db' | 'user' | 'downloads' | 'mcp'); her leveres de af browseren selv. */
(function () {
  if (window.claude) return;
  var ls = { get: function (k) { try { return localStorage.getItem(k) || ''; } catch (_) { return ''; } }, set: function (k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (_) { } } };

/* ---------- lokal "database" til feedback, bruger og download ---------- */
  var dbRead = function () { try { return JSON.parse(ls.get('bo-db') || '{}'); } catch (_) { return {}; } }, dbWrite = function (o) { ls.set('bo-db', JSON.stringify(o)); };
  var db = {
    doc: function (path) { return { get: async function () { var o = dbRead(); return { exists: path in o, data: function () { return o[path]; } }; }, set: async function (v) { var o = dbRead(); o[path] = v; dbWrite(o); } }; },
    collection: function (name) { return { get: async function () { var o = dbRead(); return { docs: Object.keys(o).filter(function (k) { return k.indexOf(name + '/') === 0; }).map(function (k) { return { id: k.slice(name.length + 1), data: function () { return o[k]; } }; }) }; } }; }
  };
  var downloads = { save: async function (f) { var blob = new Blob([typeof f.data === 'string' ? f.data : JSON.stringify(f.data, null, 2)], { type: 'application/json' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = f.filename; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); } };
  var noClaude = async function () { throw Object.assign(new Error('Ikke tilgængelig'), { code: 'local' }); };
  var mods = { sample: { json: noClaude }, db: db, user: { id: async function () { return 'lokal'; } }, downloads: downloads, mcp: null };
  window.claude = { use: async function (name) { return mods[name] || null; }, isLocal: true, mode: 'local' };
})();
