// Netlify Forms posting with an IndexedDB outbox. Never caches POSTs; never posts to FormSubmit.
import * as db from './db.js';
const MAX_TRIES = 5;
let flushing = false;

async function post(fields) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields).toString(), signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return true;
  } finally { clearTimeout(t); }
}
// Returns 'sent' | 'queued' | 'dropped'
export async function submit(form, fields) {
  if (fields._honey) return 'dropped'; // honeypot filled: behave like success, send nothing
  const clean = Object.fromEntries(Object.entries({ 'form-name': form, ...fields }).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  if (navigator.onLine !== false) {
    try { await post(clean); return 'sent'; } catch (e) { await queue(form, clean, String(e.message || e)); return 'queued'; }
  }
  await queue(form, clean, 'offline');
  return 'queued';
}
async function queue(form, fields, lastError) {
  const id = `${form}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await db.put('outbox', { id, form, fields, createdAt: new Date().toISOString(), tries: 1, lastError });
}
export async function pending() { return db.all('outbox'); }
export async function flush(force = false) {
  if (flushing || navigator.onLine === false) return;
  flushing = true;
  try {
    for (const item of await db.all('outbox')) {
      if (item.tries >= MAX_TRIES && !force) continue;
      try { await post(item.fields); await db.del('outbox', item.id); }
      catch (e) { item.tries += 1; item.lastError = String(e.message || e); await db.put('outbox', item); }
    }
  } finally { flushing = false; }
}
export function startRetries() {
  addEventListener('online', () => flush());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') flush(); });
  flush();
}
