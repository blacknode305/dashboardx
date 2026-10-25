/**
 * DashboardX owner-only AI gateway. Standalone Node 22+ service.
 * No dependency on the public static DashboardX site or its localStorage.
 * OpenAI API key is held ONLY in server process memory, unless provisioned
 * separately through the server's secret environment variable.
 */
import http from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

function tokenMatches(provided, expected) {
  if (!expected || expected.length < 32 || !provided) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

function extractText(payload) {
  // REST Responses API exposes output[].content[] (output_text convenience
  // property belongs to some SDKs and is not assumed here).
  const pieces = [];
  for (const item of payload?.output ?? []) {
    if (item?.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part?.type === 'output_text' && typeof part.text === 'string') pieces.push(part.text);
    }
  }
  return pieces.join('\n');
}
export function createAiGateway({ env = process.env, fetchImpl = fetch } = {}) {
  let apiKey = (env.OPENAI_API_KEY || '').trim();
  const ownerToken = env.DASHBOARDX_OWNER_TOKEN || '';
  const allowedOrigin = (env.DASHBOARDX_SITE_ORIGIN || '').trim().replace(/\/$/, '');
  const model = env.OPENAI_MODEL || 'gpt-4.1-mini';
  const maxPerHour = Math.max(1, Math.min(120, Number(env.AI_REQUESTS_PER_HOUR) || 20));
  let windowStart = Date.now(), used = 0, busy = false;

  return http.createServer(async (req, res) => {
    const origin = req.headers.origin || '';
    const originAllowed = !origin || (Boolean(allowedOrigin) && origin === allowedOrigin);
    const cors = origin && originAllowed ? { 'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, POST, OPTIONS',
      'Access-Control-Max-Age': '600', Vary: 'Origin' } : { Vary: 'Origin' };
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...cors };
    const json = (status, data) => {
      res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    };
    if (!originAllowed) return json(403, { error: 'Origin not permitted' });
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    if (req.method === 'OPTIONS') {
      if (!origin) return json(403, { error: 'Origin required' });
      res.writeHead(204, headers); return res.end();
    }
    if (pathname === '/health' && req.method === 'GET') return json(200, { ok: true });
    if (!pathname.startsWith('/api/ai/')) return json(404, { error: 'Not found' });
    if (ownerToken.length < 32) return json(503, { error: 'Owner credentials not configured' });
    const authorization = req.headers.authorization || '';
    const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!tokenMatches(supplied, ownerToken)) return json(401, { error: 'Unauthorized' });

    if (pathname === '/api/ai/status' && req.method === 'GET') {
      return json(200, { authenticated: true, enabled: Boolean(apiKey), model,
        requestsRemaining: Math.max(0, maxPerHour - (Date.now()-windowStart < 3600000 ? used : 0)) });
    }
    if (pathname === '/api/ai/key' && req.method === 'DELETE') {
      apiKey = '';
      return json(200, { enabled: false });
    }
    if (pathname !== '/api/ai/key' && pathname !== '/api/ai/chat') {
      return json(404, { error: 'Not found' });
    }
    if ((pathname === '/api/ai/key' && req.method !== 'PUT') ||
        (pathname === '/api/ai/chat' && req.method !== 'POST')) {
      return json(405, { error: 'Method not allowed' });
    }
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
      return json(415, { error: 'JSON required' });
    }
    let body;
    try {
      let raw = '';
      for await (const chunk of req) {
        raw += chunk.toString('utf8');
        if (Buffer.byteLength(raw) > 12000) throw new Error('Payload too large');
      }
      body = JSON.parse(raw);
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid JSON');
    } catch {
      return json(400, { error: 'Invalid or oversized JSON' });
    }

    if (pathname === '/api/ai/key') {
      if (typeof body.apiKey !== 'string' || body.apiKey.length > 512 ||
          !/^sk-[A-Za-z0-9_-]{20,}$/.test(body.apiKey.trim())) {
        return json(400, { error: 'Expected a valid OpenAI project API key' });
      }
      apiKey = body.apiKey.trim(); // Never logged, stored in browser, or persisted to disk.
      return json(200, { enabled: true, stored: 'process-memory' });
    }

    if (!apiKey) return json(503, { error: 'OpenAI key not configured' });
    if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 4000)
      return json(400, { error: 'Message must be 1–4000 characters' });
    if (Date.now() - windowStart >= 3600000) { windowStart = Date.now(); used = 0; }
    if (used >= maxPerHour) return json(429, { error: 'AI hourly request limit reached' });
    if (busy) return json(429, { error: 'One request at a time' });
    used++; busy = true;
    try {
      const upstream = await fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input: body.message.trim(), max_output_tokens: 600, store: false }),
        signal: AbortSignal.timeout(30000)
      });
      if (!upstream.ok) return json(502, { error: 'OpenAI request failed', upstreamStatus: upstream.status });
      const result = await upstream.json();
      const reply = extractText(result);
      if (!reply) return json(502, { error: 'OpenAI returned no text' });
      return json(200, { reply, model, usage: result.usage || null });
    } catch {
      return json(502, { error: 'AI service temporarily unavailable' });
    } finally { busy = false; }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = Number(process.env.PORT || 3001);
  createAiGateway().listen(port, process.env.HOST || '0.0.0.0',
    () => console.info('DashboardX owner-only AI Gateway listening on port ' + port));
}
