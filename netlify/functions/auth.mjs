// Same-origin proxy to Neon Auth (managed Better Auth). Only passwordless email-code sign-in is exposed.
// Keeps the session cookie first-party (works with Safari ITP) and adds our own sign-in rate limits.
import { guard, json, env, log, clientIp, readJson } from '../lib/http.mjs';
import { hit } from '../lib/rate.mjs';

const ROUTES = {
  'email-otp/send-verification-otp': 'POST',
  'sign-in/email-otp': 'POST',
  'get-session': 'GET',
  token: 'GET',
  'sign-out': 'POST',
};
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const LIMITS = {
  'email-otp/send-verification-otp': { ip: [10, 600], email: [5, 600] },
  'sign-in/email-otp': { ip: [20, 600], email: [8, 600] },
};

export default async (req, context) => {
  const route = new URL(req.url).pathname.replace(/^\/api\/auth\/?/, '');
  const method = ROUTES[route];
  if (!method) return json(404, { error: 'not-found' }, null);
  const stop = guard(req, [method, 'OPTIONS']);
  if (stop) return stop;
  const origin = req.headers.get('origin');
  try {
    let body;
    if (method === 'POST') {
      const raw = await readJson(req, 4096);
      if (route === 'email-otp/send-verification-otp') {
        const email = String(raw.email || '').trim().toLowerCase();
        if (!EMAIL.test(email)) return json(400, { error: 'bad-email' }, origin);
        body = { email, type: 'sign-in' };
      } else if (route === 'sign-in/email-otp') {
        const email = String(raw.email || '').trim().toLowerCase(); const otp = String(raw.otp || '').trim();
        if (!EMAIL.test(email) || !/^\d{4,10}$/.test(otp)) return json(400, { error: 'bad-code' }, origin);
        body = { email, otp };
      } else body = {};
      const lim = LIMITS[route];
      if (lim) {
        const ip = clientIp(req, context);
        for (const [kind, value, [n, win]] of [[`${route}:ip`, ip, lim.ip], [`${route}:email`, body.email, lim.email]]) {
          const r = await hit(kind, value, n, win);
          if (!r.ok) { log('auth.rate_limited', { route: route.split('/')[0] }); return json(429, { error: 'rate-limited', retryAfter: r.retryAfter }, origin, { 'Retry-After': String(r.retryAfter) }); }
        }
      }
    }
    const headers = { Accept: 'application/json', Origin: origin || new URL(req.url).origin, 'User-Agent': req.headers.get('user-agent') || 'fim-steps' };
    const cookie = req.headers.get('cookie'); if (cookie) headers.Cookie = cookie;
    if (body) headers['Content-Type'] = 'application/json';
    const ip = clientIp(req, context); if (ip !== 'unknown') headers['X-Forwarded-For'] = ip;
    const up = await fetch(`${env('FIM_STEPS_AUTH_URL')}/${route}`, { method, headers, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
    const data = await up.json().catch(() => null);
    const out = new Headers();
    for (const c of up.headers.getSetCookie?.() || []) out.append('Set-Cookie', c.replace(/;\s*Domain=[^;]*/i, ''));
    let payload;
    // Never hand the raw session token to page JavaScript; the HttpOnly cookie carries it.
    if (!up.ok) payload = { error: data?.code || data?.message?.slice?.(0, 60) || 'auth-error' };
    else if (route === 'sign-in/email-otp' || route === 'get-session') payload = data?.user ? { user: { id: data.user.id, email: data.user.email } } : { user: null };
    else if (route === 'token') payload = { token: data?.token || null };
    else payload = { ok: true };
    log('auth', { route: route.split('/')[0], status: up.status });
    const res = json(up.status, payload, origin);
    for (const c of out.getSetCookie()) res.headers.append('Set-Cookie', c);
    return res;
  } catch (e) {
    log('auth.error', { code: e.code || e.message, status: e.status || 500 });
    return json(e.status || 500, { error: e.status === 413 ? 'too-large' : 'server-error' }, origin);
  }
};
export const config = { path: '/api/auth/*' };
