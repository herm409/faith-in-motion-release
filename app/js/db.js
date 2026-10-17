// Tiny promise wrapper over IndexedDB "fim-steps" v1. No library.
const DB_NAME = 'fim-steps';
const STORES = { profile: null, stopProgress: 'stopId', steps: 'id', motionChecks: 'month', outbox: 'id' };
let dbp;
export function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
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
export function put(store, value, key) { return tx(store, (s) => (key === undefined ? s.put(value) : s.put(value, key))); }
export function del(store, key) { return tx(store, (s) => s.delete(key)); }
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
export async function saveProgress(p) { await put('stopProgress', p); return p; }

export async function exportAll() {
  const [p, sp, st, mc] = await Promise.all([profile(), all('stopProgress'), all('steps'), all('motionChecks')]);
  return { profile: p, stopProgress: sp, steps: st, motionChecks: mc };
}
export async function replaceAll(data) {
  const db = await open();
  await new Promise((resolve, reject) => {
    const t = db.transaction(['profile', 'stopProgress', 'steps', 'motionChecks'], 'readwrite');
    t.objectStore('profile').clear(); t.objectStore('stopProgress').clear(); t.objectStore('steps').clear(); t.objectStore('motionChecks').clear();
    if (data.profile) t.objectStore('profile').put(data.profile, 'me');
    for (const r of data.stopProgress || []) t.objectStore('stopProgress').put(r);
    for (const r of data.steps || []) t.objectStore('steps').put(r);
    for (const r of data.motionChecks || []) t.objectStore('motionChecks').put(r);
    t.oncomplete = resolve; t.onerror = () => reject(t.error);
  });
}
