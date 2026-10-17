// steps-five: derived views over the reader's own answers (echoes, recap, plan, patterns, seasons) and
// the data-model upgrade. Pure functions over plain records so they run the same in the app and in Node tests.
// DATA RULES: every new field is additive and lives in a store that already syncs (stopProgress top-level
// fields, answers.<new key>, profile). Old fields are never rewritten or removed. Old records are read as-is.
export const DATA_VERSION = 2; // 1 = production 439d9a2. Kept in profile.schemaVersion, which is per-device (never synced).

const s = (v) => (typeof v === 'string' ? v.trim() : '');
const ans = (p, screen) => (p && p.answers && Array.isArray(p.answers[screen]) ? p.answers[screen] : []);
const stopOf = (c, id) => c.stops.find((x) => x.id === id);
const idx = (prompts, re) => (prompts || []).findIndex((x) => re.test(x));

// ---------- Stop 11 Rule of Motion ----------
// v1 saved Stop 11 Build through the generic step form: prompt 0 went to build.step (140 characters),
// prompts 1 to 3 to build.extra[1..3], the "hold me" prompt to build.partner, plus a dueDate and a step record.
// v2 saves the five lines as a set in answers.rule. Reading falls back to the v1 shape, so nothing is lost and
// nothing has to be rewritten. The v1 fields and the step record stay exactly as they were.
export function ruleOf(p) {
  const r = p && p.answers && p.answers.rule;
  if (r && Array.isArray(r.lines) && (r.lines.some((x) => s(x)) || s(r.partner))) return { lines: [0, 1, 2, 3].map((i) => r.lines[i] || ''), partner: r.partner || '', source: 'rule', savedAt: r.savedAt || null };
  const b = p && p.answers && p.answers.build;
  if (!b) return null;
  const ex = Array.isArray(b.extra) ? b.extra : [];
  const lines = [b.step || '', ex[1] || '', ex[2] || '', ex[3] || ''];
  if (!lines.some((x) => s(x)) && !s(b.partner)) return null;
  return { lines, partner: b.partner || '', source: 'v1-build', dueDate: b.dueDate || '' };
}
// What v2 writes for Stop 11. It also mirrors the lines into the v1 build fields so an older app shows them.
export function ruleWrite(p, lines, partner, now = new Date().toISOString()) {
  p.answers = p.answers || {};
  p.answers.rule = { lines: lines.slice(0, 4), partner, savedAt: now };
  const b = p.answers.build = { step: '', dueDate: '', stopDoing: '', partner: '', extra: [], ...(p.answers.build || {}) };
  b.step = lines[0] || ''; b.extra = Array.isArray(b.extra) ? b.extra.slice() : []; b.extra[1] = lines[1] || ''; b.extra[2] = lines[2] || ''; b.extra[3] = lines[3] || ''; b.partner = partner;
  return p;
}

// ---------- Echoes (item 1) ----------
export function standstill0(byStop) { return s(ans(byStop.s0, 'nameIt')[1]); }
export function standstill11(byStop) { return s(ans(byStop.s11, 'pulse')[0]); }
// The line a stop's Review asks the reader to carry forward: the "carrying" prompt if the stop has one, else its last Review prompt.
export function carryPrompt(stop) {
  const pr = stop.screens.review.prompts; const rest = pr.slice(1);
  let i = rest.findIndex((x) => /carrying/i.test(x)); if (i < 0) i = rest.length - 1;
  return { prompt: rest[i], index: i };
}
export function carriedInto(c, byStop, stop) {
  const i = c.stops.indexOf(stop); const prev = c.stops[i - 1]; if (!prev) return null;
  const { prompt, index } = carryPrompt(prev);
  const text = s(byStop[prev.id]?.review?.answers?.[index]);
  return text ? { from: prev, prompt, text } : null;
}
export function buildStep(p) { const b = p?.answers?.build; return b && s(b.step) ? { text: s(b.step), dueDate: b.dueDate || '' } : null; }

// ---------- Recap: "Your stop, in your words" (item 5). Private, never a share card. ----------
export function namedSentence(stop, p) {
  const pr = stop.screens.nameIt.prompts; const a = ans(p, 'nameIt');
  const k = idx(pr, /one (honest )?sentence|plainly|real name/i);
  if (k >= 0 && s(a[k])) return { prompt: pr[k], text: s(a[k]) };
  const j = a.findIndex((x) => s(x)); return j >= 0 ? { prompt: pr[j], text: s(a[j]) } : null;
}
export const VERDICT = { traded: 'Traded', buried: 'Buried', 'holy-wait': 'Holy wait' };
export function recap(c, stop, p, steps) {
  if (!p) return null;
  const st = (steps || []).filter((x) => x.stopId === stop.id).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
  const step = stop.id === 's11' ? null : buildStep(p) || (st ? { text: s(st.text), dueDate: st.dueDate || '' } : null);
  const rule = stop.id === 's11' ? ruleOf(p) : null;
  const verdict = p.review?.verdict || st?.outcome || null;
  const happened = s(p.review?.answers?.[0]);
  const named = namedSentence(stop, p);
  const ref = stop.screens.review.bookRef || stop.screens.read.bookRef;
  if (!named && !step && !rule && !verdict && !happened) return null;
  return { stop, named, step, rule, verdict, verdictLabel: verdict ? VERDICT[verdict] : null, happened, reread: ref ? `${ref.chapter}, ${ref.section}` : '' };
}

// ---------- Close the loop (item 2) ----------
export function overdue(step, today) { return !!(step && !step.doneAt && !step.outcome && step.dueDate && step.dueDate < today); }

// ---------- Words come back (A) ----------
// The reader's own earlier lines on fear, newest stop first: any Pulse, Name it or Build prompt about fear.
export function fearLines(c, byStop) {
  const out = [];
  for (const stop of c.stops.slice().reverse()) {
    const p = byStop[stop.id]; if (!p) continue;
    for (const screen of ['nameIt', 'pulse', 'build']) {
      const prompts = stop.screens[screen].prompts;
      prompts.forEach((pr, i) => {
        if (!/fear/i.test(pr)) return;
        let v = screen === 'build' ? null : ans(p, screen)[i];
        if (screen === 'build') { const b = p.answers?.build; if (b && /fear, named/i.test(pr)) v = b.step; }
        if (s(v)) out.push({ stop, screen, prompt: pr, text: s(v) });
      });
    }
  }
  return out;
}

// ---------- Seasons (B): the six season tracks approved as later content (app/content/seasons.json) ----------
export function seasonFor(c, byStop, stop) {
  const seasons = c.seasons?.tracks || [];
  const p = byStop[stop.id]; const id = p?.season?.id; if (!id) return null;
  return seasons.find((x) => x.id === id) || null;
}

// ---------- Pattern notes (C): plain rules, no AI. Every pointer is checked against the book text in tests. ----------
export const PATTERN_REFS = {
  moved: { ref: 'Chapter 4: When You Feel Stuck Between Cry and Staff', quoteFrom: 's4' },
  buried: { ref: 'Chapter 3: The Buried Talent and the Story Fear Tells' },
  traded: { ref: "Chapter 10: What's in Your Hand?" },
  holy: { ref: 'Chapter 9: Holy Waiting vs. Permanent Pause' },
};
export function patterns(c, byStop, steps) {
  const notes = [];
  const prog = Object.values(byStop);
  const reviewed = prog.filter((p) => p.review?.verdict);
  const walked = prog.filter((p) => p.finishedAt || p.review?.verdict || p.move?.doneAt).length;
  if (walked < 3 && (steps || []).length < 3) return notes;
  const moved = prog.filter((p) => p.move?.newDate || p.move?.missedAt || p.loop?.answer === 'notyet').map((p) => stopOf(c, p.stopId)).filter(Boolean).sort((a, b) => a.order - b.order);
  if (moved.length >= 3) notes.push({ id: 'moved', n: moved.length, stops: moved.map((x) => x.order), ref: PATTERN_REFS.moved.ref });
  const count = (v) => reviewed.filter((p) => p.review.verdict === v).length;
  const tr = count('traded'), bu = count('buried'), hw = count('holy-wait');
  if (reviewed.length >= 3 && bu > tr && bu >= hw) notes.push({ id: 'buried', n: bu, of: reviewed.length, ref: PATTERN_REFS.buried.ref });
  else if (reviewed.length >= 3 && tr > bu && tr >= hw) notes.push({ id: 'traded', n: tr, of: reviewed.length, ref: PATTERN_REFS.traded.ref });
  else if (reviewed.length >= 3 && hw > tr && hw > bu) notes.push({ id: 'holy', n: hw, of: reviewed.length, ref: PATTERN_REFS.holy.ref });
  const dated = (steps || []).filter((x) => x.doneAt && x.dueDate);
  if (dated.length >= 3) { const onTime = dated.filter((x) => x.doneAt.slice(0, 10) <= x.dueDate).length; notes.push({ id: 'ontime', n: onTime, of: dated.length }); }
  return notes;
}

// ---------- Plan page (item 4) ----------
export function plan(c, byStop, steps) {
  const ref = (stopId, screen) => { const st = stopOf(c, stopId); const r = st?.screens[screen]?.bookRef; return r ? `${r.chapter}, ${r.section}` : ''; };
  const p11 = byStop.s11;
  const rule = ruleOf(p11);
  const sorted = (steps || []).slice().sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const open = sorted.filter((x) => !x.doneAt && !x.outcome).pop();
  const next11 = s(p11?.review?.answers?.[1]);
  let partner = rule && s(rule.partner) ? { text: s(rule.partner), ref: ref('s11', 'build') } : null;
  if (!partner) { for (const st of c.stops.slice().reverse()) { const b = byStop[st.id]?.answers?.build; if (b && s(b.partner)) { partner = { text: s(b.partner), ref: ref(st.id, 'build') }; break; } } }
  return {
    before: standstill0(byStop) ? { text: standstill0(byStop), ref: ref('s0', 'nameIt') } : null,
    after: standstill11(byStop) ? { text: standstill11(byStop), ref: ref('s11', 'pulse') } : null,
    rule: rule ? { ...rule, prompts: stopOf(c, 's11').screens.build.prompts, ref: ref('s11', 'build') } : null,
    steps: sorted.map((x) => { const st = stopOf(c, x.stopId); const p = byStop[x.stopId];
      return { text: s(x.text), dueDate: x.dueDate, doneAt: x.doneAt, outcome: x.outcome || p?.review?.verdict || null, happened: s(p?.review?.answers?.[0]), stop: st, ref: ref(x.stopId, 'build') }; }),
    next: next11 ? { text: next11, ref: ref('s11', 'review') } : open ? { text: s(open.text), dueDate: open.dueDate, ref: ref(open.stopId, 'build') } : null,
    partner,
  };
}
export function planText(c, pl) {
  const L = [];
  L.push('My Faith in Motion plan');
  if (pl.before) L.push('', `My standstill at Stop 0: ${pl.before.text}`, `(${pl.before.ref})`);
  if (pl.after) L.push('', `My standstill at Stop 11: ${pl.after.text}`, `(${pl.after.ref})`);
  if (pl.rule) { L.push('', 'My Rule of Motion'); pl.rule.lines.forEach((l, i) => { if (s(l)) L.push(`${pl.rule.prompts[i]} ${l}`); }); L.push(`(${pl.rule.ref})`); }
  if (pl.steps.length) { L.push('', 'My steps'); pl.steps.forEach((x) => L.push(`Stop ${x.stop?.order}: ${x.text}${x.outcome ? ` (${VERDICT[x.outcome] || x.outcome})` : ''}`)); }
  if (pl.next) L.push('', `My next step: ${pl.next.text}`);
  if (pl.partner) L.push('', `Holding me to it: ${pl.partner.text}`);
  return L.join('\n');
}

// ---------- Upgrade: snapshot first, then additive changes only ----------
// v1 to v2 needs no rewrite of any existing record: Stop 11 is read through ruleOf(), and every new field is
// new. The upgrade still saves a full local copy of the data before it marks the device as v2.
export const SNAPSHOT_CACHE = 'fim-data-backups'; // the service worker only ever deletes caches named fim-shell-*
export async function snapshot(data, reason, cachesApi = globalThis.caches) {
  if (!cachesApi) return null;
  const url = `/app/__local-backup/${reason}-${Date.now()}.json`;
  const body = JSON.stringify({ app: 'faith-in-motion-steps', schemaVersion: 1, exportedAt: new Date().toISOString(), reason, data });
  const cache = await cachesApi.open(SNAPSHOT_CACHE);
  await cache.put(url, new Response(body, { headers: { 'Content-Type': 'application/json' } }));
  const keys = await cache.keys(); // keep the newest five
  for (const k of keys.slice(0, Math.max(0, keys.length - 5))) await cache.delete(k);
  return url;
}
export async function latestSnapshot(cachesApi = globalThis.caches) {
  if (!cachesApi) return null;
  const cache = await cachesApi.open(SNAPSHOT_CACHE); const keys = await cache.keys(); if (!keys.length) return null;
  const r = await cache.match(keys[keys.length - 1]); return r ? r.json() : null;
}
export async function upgrade(db, cachesApi = globalThis.caches) {
  const prof = await db.profile();
  const from = Number(prof?.schemaVersion) || 1;
  if (from >= DATA_VERSION) return { from, to: from, snapshot: null };
  let snap = null;
  try { snap = await snapshot(await db.exportAll(), `before-v${DATA_VERSION}`, cachesApi); } catch { /* storage full: nothing below rewrites data, so carry on */ }
  if (prof) await db.saveProfile({ schemaVersion: DATA_VERSION });
  return { from, to: DATA_VERSION, snapshot: snap };
}

// ---------- steps-next: last activity, read from existing timestamps only (no new field) ----------
export function lastActivity(byStop, steps = [], motionChecks = []) {
  const ts = [];
  for (const p of Object.values(byStop || {})) {
    ts.push(p.readAt, p.finishedAt, p.move?.doneAt, p.move?.missedAt, p.review?.reviewedAt, p.season?.at, p.loop?.at, p.answers?.rule?.savedAt);
    for (const v of Object.values(p.visited || {})) ts.push(v);
  }
  for (const s of steps) ts.push(s.createdAt, s.doneAt);
  for (const m of motionChecks) ts.push(m.updatedAt);
  const ms = ts.map((x) => Date.parse(x || '')).filter((x) => Number.isFinite(x));
  return ms.length ? Math.max(...ms) : null;
}
export const quietDays = (last, now = Date.now()) => (last ? Math.floor((now - last) / 86400000) : 0);
