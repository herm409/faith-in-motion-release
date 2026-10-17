// Shared HTTP helpers for the Steps API. HTTPS only, CORS locked to the preview and production origins.
export const ORIGINS = new Set([
  'https://steps-preview--faithinmotionbook.netlify.app',
  'https://faithinmotionbook.com',
  'https://www.faithinmotionbook.com',
]);
const env = (k) => (globalThis.Netlify?.env?.get?.(k) ?? process.env[k]);
export { env };
const devOrigin = () => env('FIM_DEV_ORIGIN') || null; // set only by the local test server, never on Netlify

export function originOf(req) {
  const o = req.headers.get('origin');
  if (!o) return null;
  if (ORIGINS.has(o) || (devOrigin() && o === devOrigin())) return o;
  return false;
}
export function isHttps(req) {
  const u = new URL(req.url);
  if (u.protocol === 'https:') return true;
  const xf = req.headers.get('x-forwarded-proto');
  if (xf && xf.split(',')[0].trim() === 'https') return true;
  return Boolean(devOrigin()) && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
}
export function baseHeaders(origin) {
  const h = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Strict-Transport-Security': 'max-age=31536000',
    Vary: 'Origin',
  };
  if (origin) Object.assign(h, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true' });
  return h;
}
export function json(status, body, origin, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...baseHeaders(origin), ...extra } });
}
// Returns a Response to send immediately, or null when the request may proceed.
export function guard(req, methods) {
  const origin = originOf(req);
  if (!isHttps(req)) return json(403, { error: 'https-required' }, null);
  if (origin === false) return json(403, { error: 'origin-not-allowed' }, null);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...baseHeaders(origin), 'Access-Control-Allow-Methods': methods.join(', '), 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '600' } });
  }
  if (!methods.includes(req.method)) return json(405, { error: 'method-not-allowed' }, origin);
  // State-changing requests must come from an allowed page (CSRF defence for the cookie-based auth proxy).
  if (req.method !== 'GET' && !origin) return json(403, { error: 'origin-required' }, null);
  return null;
}
export function clientIp(req, context) {
  return context?.ip || req.headers.get('x-nf-client-connection-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}
// Logs never include request bodies, emails, tokens, or journal text: only an event name and short codes.
export function log(event, info = {}) {
  const safe = {};
  for (const [k, v] of Object.entries(info)) if (typeof v === 'number' || typeof v === 'boolean' || (typeof v === 'string' && /^[a-z0-9_.:-]{0,40}$/i.test(v))) safe[k] = v;
  console.log(JSON.stringify({ event, ...safe }));
}
export async function readJson(req, maxBytes) {
  const len = Number(req.headers.get('content-length') || 0);
  if (len > maxBytes) throw Object.assign(new Error('too-large'), { status: 413 });
  const text = await req.text();
  if (text.length > maxBytes) throw Object.assign(new Error('too-large'), { status: 413 });
  try { return JSON.parse(text || '{}'); } catch { throw Object.assign(new Error('bad-json'), { status: 400 }); }
}
