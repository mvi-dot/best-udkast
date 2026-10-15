/* Lille proxy til Anthropic API (Cloudflare Worker).
   Gør at teamet kan bruge værktøjet uden hver især at have en API-nøgle, og at nøglen aldrig ligger i browseren eller i repoet.
   Hemmeligheder sættes i Cloudflare (ikke i koden):
     ANTHROPIC_API_KEY   din nøgle
     ALLOWED_ORIGINS     fx https://dit-navn.github.io  (komma-separeret)
     ACCESS_CODE         valgfri fælles adgangskode, som brugerne skriver i "Claude-forbindelse"
*/
const MODELS = ['claude-sonnet-4-6', 'claude-sonnet-5-5', 'claude-haiku-5-5'];
export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const okOrigin = !allowed.length || allowed.includes(origin);
    const cors = { 'Access-Control-Allow-Origin': okOrigin && origin ? origin : (allowed[0] || '*'), 'Access-Control-Allow-Headers': 'content-type, x-access-code', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' };
    const fail = (status, msg) => new Response(JSON.stringify({ error: { message: msg } }), { status, headers: { ...cors, 'content-type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return fail(405, 'Brug POST');
    if (!okOrigin) return fail(403, 'Denne side må ikke bruge proxyen');
    if (env.ACCESS_CODE && req.headers.get('x-access-code') !== env.ACCESS_CODE) return fail(401, 'Forkert adgangskode');
    let body; try { body = await req.json(); } catch (_) { return fail(400, 'Ugyldig JSON'); }
    if (!MODELS.includes(body.model)) return fail(400, 'Model ikke tilladt');
    body.max_tokens = Math.min(+body.max_tokens || 4000, 8000);
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: body.model, max_tokens: body.max_tokens, messages: body.messages }) });
    return new Response(r.body, { status: r.status, headers: { ...cors, 'content-type': 'application/json' } });
  }
};
