// AES-256-GCM for journal fields at rest. Key: FIM_STEPS_DATA_KEY (32 random bytes, base64), server-side only.
import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'node:crypto';
import { env } from './http.mjs';
function key() {
  const k = Buffer.from(env('FIM_STEPS_DATA_KEY') || '', 'base64');
  if (k.length !== 32) throw Object.assign(new Error('key-not-configured'), { status: 503 });
  return k;
}
// The AAD binds each ciphertext to its owner and slot, so rows cannot be swapped between users or fields.
export function seal(value, aad) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv); c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(JSON.stringify(value), 'utf8'), c.final(), c.getAuthTag()]);
  return { iv: iv.toString('base64'), ct: ct.toString('base64') };
}
export function open(iv, ct, aad) {
  const buf = Buffer.from(ct, 'base64');
  const d = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64')); d.setAAD(Buffer.from(aad));
  d.setAuthTag(buf.subarray(buf.length - 16));
  return JSON.parse(Buffer.concat([d.update(buf.subarray(0, buf.length - 16)), d.final()]).toString('utf8'));
}
// Keyed hash for rate-limit buckets, so raw IPs and emails are never stored.
export function bucket(kind, value) { return `${kind}:${createHmac('sha256', key()).update(`${kind}\n${value}`).digest('hex').slice(0, 32)}`; }
