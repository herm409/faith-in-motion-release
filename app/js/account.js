// Optional account: passwordless email-code sign-in (Neon Auth via our same-origin /api/auth proxy)
// and background sync. Works without an account; the local database stays the source of truth.
import * as db from './db.js';

const KEY = 'fim-account';
let jwt = null, jwtExp = 0, syncing = null, timer = null;
export const state = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const save = (s) => { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); dispatchEvent(new Event('fim-account')); };
const patch = (p) => { const s = state(); if (s) save({ ...s, ...p }); };
export const signedIn = () => Boolean(state()?.userId);

async function call(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (auth) headers.Authorization = `Bearer ${await token()}`;
  const r = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin', cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || `http-${r.status}`), { status: r.status, retryAfter: j.retryAfter });
  return j;
}
async function token() {
  if (jwt && Date.now() < jwtExp - 60000) return jwt;
  const { token: t } = await call('/api/auth/token');
  if (!t) { patch({ needsSignIn: true }); throw Object.assign(new Error('signed-out'), { status: 401 }); }
  jwt = t;
  try { jwtExp = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000; } catch { jwtExp = Date.now() + 5 * 60000; }
  return jwt;
}

export function sendCode(email) { return call('/api/auth/email-otp/send-verification-otp', { method: 'POST', body: { email } }); }
export async function verifyCode(email, otp) {
  const r = await call('/api/auth/sign-in/email-otp', { method: 'POST', body: { email, otp } });
  if (!r.user?.id) throw new Error('sign-in-failed');
  jwt = null;
  const prev = state();
  save({ userId: r.user.id, email: r.user.email, cursor: prev?.userId === r.user.id ? prev.cursor || 0 : 0, lastSyncAt: null, needsSignIn: false });
  const res = await syncNow();
  return { ...r.user, pulled: res?.pulled || 0, synced: !res?.error && !res?.skipped };
}
export async function signOut() {
  try { await call('/api/auth/sign-out', { method: 'POST', body: {} }); } catch { /* offline: the local sign-out still happens */ }
  jwt = null; save(null);
}
export async function deleteAccount({ eraseLocal }) {
  const r = await call('/api/account', { method: 'DELETE', auth: true });
  jwt = null; save(null);
  if (eraseLocal) await db.wipeAll();
  return r;
}
export function summary() { return call('/api/account', { auth: true }); }

// Push this device's newer fields, then pull everything newer from the account.
async function runSync() {
  {
    const s = state();
    if (!s?.userId || s.needsSignIn || !navigator.onLine) return { skipped: true };
    patch({ syncState: 'syncing' });
    try {
      await db.seedMeta();
      let pushed = 0, pulled = 0;
      for (let i = 0; i < 20; i++) {
        const items = await db.dirtyItems(400);
        if (!items.length) break;
        await call('/api/sync', { method: 'POST', body: { items }, auth: true });
        await db.markClean(items); pushed += items.length;
        if (items.length < 400) break;
      }
      let cursor = state()?.cursor || 0, more = true;
      while (more) {
        const r = await call(`/api/sync?since=${cursor}`, { auth: true });
        pulled += await db.applyRemote(r.items);
        cursor = r.cursor; more = r.more;
      }
      patch({ cursor, lastSyncAt: new Date().toISOString(), syncState: 'ok', syncError: null });
      if (pulled) dispatchEvent(new Event('fim-remote-change'));
      return { pushed, pulled };
    } catch (e) {
      patch({ syncState: 'error', syncError: e.status === 401 ? 'signed-out' : e.status === 429 ? 'busy' : navigator.onLine ? 'server' : 'offline' });
      if (e.status === 401) patch({ needsSignIn: true });
      return { error: e.message };
    }
  }
}
export async function syncNow() {
  if (syncing) return syncing;
  syncing = runSync();
  try { return await syncing; } finally { syncing = null; }
}
export function start() {
  const soon = () => { clearTimeout(timer); timer = setTimeout(syncNow, 2500); };
  addEventListener('fim-local-change', () => { if (signedIn()) soon(); });
  addEventListener('online', () => syncNow());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); });
  setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, 60000);
  syncNow();
}
