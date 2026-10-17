// Tiny promise wrapper over IndexedDB "fim-steps" v2. No library.
// v2 adds "syncmeta": a per-field edit time and dirty flag, used only when the reader signs in to sync.
// The local database stays the source of truth; sync merges field by field, last write wins.
const DB_NAME = 'fim-steps';
const STORES = { profile: null, stopProgress: 'stopId', steps: 'id', motionChecks: 'month', outbox: 'id', syncmeta: null };
export const SYNC_STORES = ['profile', 'stopProgress', 'steps', 'motionChecks']; // never the form outbox
const PROFILE_LOCAL_ONLY = new Set(['installPromptDismissedAt', 'iosBannerDismissedAt', 'schemaVersion']); // per-device
let dbp;
export function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [name, keyPath] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, keyPath ? { keyPath } : undefined);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}
async function tx(store, fn) {
  const db = await open();
  const t = db.transaction(store, 'readwrite');
  const r = fn(t.objectStore(store));
  return new Promise((resolve, reject) => { t.oncomplete = () => resolve(r.result); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error); });
}
const req2p = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
export async function get(store, key) { const db = await open(); return req2p(db.transaction(store).objectStore(store).get(key)); }
export async function all(store) { const db = await open(); return req2p(db.transaction(store).objectStore(store).getAll()); }
export async function allKeys(store) { const db = await open(); return req2p(db.transaction(store).objectStore(store).getAllKeys()); }
// ---------- sync bookkeeping ----------
const SEP = '\u0001';
const mkey = (store, key, field) => [store, key, field].join(SEP);
const keyOf = (store, value, key) => (store === 'profile' ? 'me' : key ?? value?.[STORES[store]]);
// Field granularity: whole records for steps and motion checks; each top-level field (and each
// screen's answers) for a stop; each top-level field of the profile except per-device ones.
export function fieldsOf(store, value) {
  const out = {};
  if (value == null) return out;
  if (store === 'steps' || store === 'motionChecks') { out[''] = value; return out; }
  for (const [k, v] of Object.entries(value)) {
    if (store === 'profile' && PROFILE_LOCAL_ONLY.has(k)) continue;
    if (store === 'stopProgress' && k === 'stopId') continue;
    if (store === 'stopProgress' && k === 'answers' && v && typeof v === 'object') { for (const [a, av] of Object.entries(v)) out[`answers.${a}`] = av; continue; }
    out[k] = v;
  }
  return out;
}
let lastT = 0;
const stamp = () => (lastT = Math.max(Date.now(), lastT + 1));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Defaults (empty strings, empty lists, false, null) carry the oldest possible edit time, so a fresh
// record on a new device never overwrites real answers that already exist on the account.
export const isBlank = (v) => v == null || v === '' || v === false || (Array.isArray(v) ? v.every(isBlank) : typeof v === 'object' && Object.values(v).every(isBlank));
function notify() { try { dispatchEvent(new Event('fim-local-change')); } catch { /* not in a window */ } }
async function writeTracked(store, value, key, deleting) {
  const db = await open();
  const k = keyOf(store, value, key);
  const t = db.transaction([store, 'syncmeta'], 'readwrite');
  const os = t.objectStore(store), ms = t.objectStore('syncmeta');
  const old = await req2p(os.get(k));
  const now = stamp();
  if (deleting) {
    os.delete(k);
    for (const f of Object.keys(fieldsOf(store, old) || {}).concat(store === 'steps' || store === 'motionChecks' ? [''] : [])) ms.put({ t: now, dirty: 1, deleted: true }, mkey(store, k, f));
  } else {
    if (store === 'profile') os.put(value, 'me'); else if (key === undefined) os.put(value); else os.put(value, key);
    const a = fieldsOf(store, old), b = fieldsOf(store, value);
    for (const f of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(f in b)) ms.put({ t: now, dirty: 1, deleted: true }, mkey(store, k, f));
      else if (!(f in a) || !same(a[f], b[f])) ms.put({ t: !(f in a) && isBlank(b[f]) ? 1 : now, dirty: 1 }, mkey(store, k, f));
    }
  }
  await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
  notify();
}
export function put(store, value, key) {
  if (SYNC_STORES.includes(store)) return writeTracked(store, value, key, false);
  return tx(store, (s) => (key === undefined ? s.put(value) : s.put(value, key)));
}
export function del(store, key) {
  if (SYNC_STORES.includes(store)) return writeTracked(store, null, key, true);
  return tx(store, (s) => s.delete(key));
}
// Gives untracked local fields (data saved before sync existed) an edit time from the record itself.
export async function seedMeta() {
  const db = await open();
  for (const store of SYNC_STORES) {
    const keys = store === 'profile' ? ['me'] : await allKeys(store);
    for (const k of keys) {
      const rec = await get(store, k); if (!rec) continue;
      const base = Date.parse(rec.updatedAt || rec.doneAt || rec.startedAt || rec.createdAt || '') || 1;
      const t = db.transaction('syncmeta', 'readwrite'); const ms = t.objectStore('syncmeta');
      for (const [f, v] of Object.entries(fieldsOf(store, rec))) { const mk = mkey(store, k, f); const m = await req2p(ms.get(mk)); if (!m) ms.put({ t: isBlank(v) ? 1 : base, dirty: 1 }, mk); }
      await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
    }
  }
}
function getField(store, rec, field) {
  if (field === '') return rec;
  if (field.startsWith('answers.')) return rec?.answers?.[field.slice(8)];
  return rec?.[field];
}
export async function dirtyItems(limit = 400) {
  const db = await open();
  const t = db.transaction(['syncmeta', ...SYNC_STORES]);
  const ms = t.objectStore('syncmeta');
  const [keys, vals] = await Promise.all([req2p(ms.getAllKeys()), req2p(ms.getAll())]);
  const items = []; const cache = {};
  for (let i = 0; i < keys.length && items.length < limit; i++) {
    const m = vals[i]; if (!m.dirty) continue;
    const [store, key, field] = keys[i].split(SEP);
    if (m.deleted) { items.push({ store, key, field, t: m.t, deleted: true }); continue; }
    const ck = store + SEP + key;
    if (!(ck in cache)) cache[ck] = await req2p(t.objectStore(store).get(key));
    const v = getField(store, cache[ck], field);
    items.push(v === undefined ? { store, key, field, t: m.t, deleted: true } : { store, key, field, t: m.t, value: v });
  }
  return items;
}
export async function markClean(items) {
  const db = await open();
  const t = db.transaction('syncmeta', 'readwrite'); const ms = t.objectStore('syncmeta');
  for (const it of items) { const mk = mkey(it.store, it.key, it.field); const m = await req2p(ms.get(mk)); if (m && m.t === it.t) ms.put({ ...m, dirty: 0 }, mk); }
  await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
}
// Merges server items into this device. A field changes only if the server copy is newer.
export async function applyRemote(items) {
  if (!items.length) return 0;
  const db = await open();
  const t = db.transaction(['syncmeta', ...SYNC_STORES], 'readwrite'); const ms = t.objectStore('syncmeta');
  let changed = 0;
  for (const it of items) {
    if (!SYNC_STORES.includes(it.store)) continue;
    const mk = mkey(it.store, it.key, it.field); const m = await req2p(ms.get(mk));
    if (m && m.t >= it.t) continue;
    const os = t.objectStore(it.store); const k = it.key;
    if (it.field === '') {
      if (it.deleted) os.delete(k);
      else if (it.value && typeof it.value === 'object' && !Array.isArray(it.value)) os.put({ ...it.value, [STORES[it.store]]: k }); // key always matches the slot
      else continue;
    } else {
      let rec = await req2p(os.get(k));
      if (!rec) rec = it.store === 'profile' ? { schemaVersion: 1 } : { ...blankProgress(k), startedAt: null };
      if (it.field.startsWith('answers.')) { rec.answers = rec.answers || {}; if (it.deleted) delete rec.answers[it.field.slice(8)]; else rec.answers[it.field.slice(8)] = it.value; }
      else if (it.deleted) delete rec[it.field]; else rec[it.field] = it.value;
      if (it.store === 'profile') os.put(rec, 'me'); else os.put(rec);
    }
    ms.put({ t: it.t, dirty: 0, ...(it.deleted ? { deleted: true } : {}) }, mk);
    changed++;
  }
  await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
  return changed;
}
export async function wipeAll() {
  const db = await open();
  const names = [...SYNC_STORES, 'syncmeta', 'outbox'];
  const t = db.transaction(names, 'readwrite'); for (const n of names) t.objectStore(n).clear();
  await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
}
export function clear(store) { return tx(store, (s) => s.clear()); }

// Profile helpers
export async function profile() {
  return (await get('profile', 'me')) || null;
}
export async function saveProfile(patch) {
  const cur = (await profile()) || { schemaVersion: 1, door: null, createdAt: new Date().toISOString(), lastStopId: null, lastScreen: null, installPromptDismissedAt: null, iosBannerDismissedAt: null, sundayIcsOffered: false };
  const next = { ...cur, ...patch };
  await put('profile', next, 'me');
  return next;
}
export function blankProgress(stopId) {
  return { stopId, startedAt: new Date().toISOString(), readAt: null,
    answers: { nameIt: [], build: { step: '', dueDate: '', stopDoing: '', partner: '', extra: [] }, help: { choice: '', believerNote: '', answers: [] }, pray: { blanks: [], answers: [] } },
    move: { checks: [], doneAt: null, missedAt: null, newDate: null }, review: { verdict: null, reviewedAt: null, answers: [] }, finishedAt: null };
}
export async function progress(stopId) {
  return (await get('stopProgress', stopId)) || blankProgress(stopId);
}
// A screen holds the record it loaded. Before writing, carry over any field it does not know about (added since by
// another device, a newer app, or another part of this app), so a save never drops it. Only adds; never overwrites.
export async function saveProgress(p) {
  const cur = await get('stopProgress', p.stopId);
  if (cur) {
    for (const k of Object.keys(cur)) if (!(k in p)) p[k] = cur[k];
    if (cur.answers && typeof cur.answers === 'object') { p.answers = p.answers || {}; for (const k of Object.keys(cur.answers)) if (!(k in p.answers)) p.answers[k] = cur.answers[k]; }
  }
  await put('stopProgress', p); return p;
}

export async function exportAll() {
  const [p, sp, st, mc] = await Promise.all([profile(), all('stopProgress'), all('steps'), all('motionChecks')]);
  return { profile: p, stopProgress: sp, steps: st, motionChecks: mc };
}
export async function replaceAll(data) {
  // A restore is a set of ordinary edits, so it syncs like any other change.
  for (const store of ['stopProgress', 'steps', 'motionChecks']) {
    const incoming = new Set((data[store] || []).map((r) => r[STORES[store]]));
    for (const k of await allKeys(store)) if (!incoming.has(k)) await del(store, k);
    for (const r of data[store] || []) await put(store, r);
  }
  if (data.profile) await put('profile', data.profile, 'me');
}
