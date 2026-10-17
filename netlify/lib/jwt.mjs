// Verifies Neon Auth (Better Auth) JWTs: EdDSA / Ed25519 against the project's JWKS. No dependencies.
import { createPublicKey, verify as edVerify } from 'node:crypto';
import { env } from './http.mjs';
let cache = { at: 0, keys: [] };
async function jwks(force) {
  if (!force && cache.keys.length && Date.now() - cache.at < 10 * 60 * 1000) return cache.keys;
  const r = await fetch(`${env('FIM_STEPS_AUTH_URL')}/.well-known/jwks.json`);
  if (!r.ok) throw Object.assign(new Error('jwks-unavailable'), { status: 503 });
  cache = { at: Date.now(), keys: (await r.json()).keys || [] };
  return cache.keys;
}
const b64u = (s) => Buffer.from(s, 'base64url');
const bad = (code) => Object.assign(new Error(code), { status: 401, code });
export async function verifyBearer(req) {
  const m = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(req.headers.get('authorization') || '');
  if (!m) throw bad('no-token');
  const [h, p, s] = m[1].split('.');
  let header, payload;
  try { header = JSON.parse(b64u(h)); payload = JSON.parse(b64u(p)); } catch { throw bad('malformed'); }
  if (header.alg !== 'EdDSA') throw bad('bad-alg');
  let jwk = (await jwks()).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await jwks(true)).find((k) => k.kid === header.kid);
  if (!jwk || jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519') throw bad('unknown-key');
  const ok = edVerify(null, Buffer.from(`${h}.${p}`), createPublicKey({ key: jwk, format: 'jwk' }), b64u(s));
  if (!ok) throw bad('bad-signature');
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp < now - 30) throw bad('expired');
  if (typeof payload.nbf === 'number' && payload.nbf > now + 30) throw bad('not-yet-valid');
  const iss = new URL(env('FIM_STEPS_AUTH_URL')).origin;
  if (payload.iss !== iss) throw bad('bad-issuer');
  if (payload.aud !== undefined && ![].concat(payload.aud).includes(iss)) throw bad('bad-audience');
  const sub = payload.sub || payload.id;
  if (!/^[0-9a-f-]{36}$/i.test(sub || '')) throw bad('bad-subject');
  if (payload.banned) throw Object.assign(new Error('banned'), { status: 403, code: 'banned' });
  if (payload.emailVerified !== true) throw Object.assign(new Error('email-not-verified'), { status: 403, code: 'email-not-verified' });
  return { sub, email: payload.email };
}
