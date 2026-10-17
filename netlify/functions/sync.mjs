// Sync API. The user id always comes from a verified Neon Auth JWT, never from the request body.
// Every read and write runs as role fim_rls under row-level security scoped to that user id.
import { guard, json, log, readJson } from '../lib/http.mjs';
import { asUser } from '../lib/db.mjs';
import { authorize } from '../lib/authz.mjs';
import { seal, open } from '../lib/crypto.mjs';

const STORES = new Set(['profile', 'stopProgress', 'steps', 'motionChecks']);
const MAX_ITEMS = 500, MAX_VALUE = 64 * 1024, PAGE = 1000;
const aad = (uid, s, k, f) => `${uid}\n${s}\n${k}\n${f}`;

export default async (req) => {
  const stop = guard(req, ['GET', 'POST', 'OPTIONS']);
  if (stop) return stop;
  const origin = req.headers.get('origin');
  try {
    const user = await authorize(req);
    const uid = user.sub;
    if (req.method === 'POST') {
      const body = await readJson(req, 2 * 1024 * 1024);
      const items = Array.isArray(body.items) ? body.items : null;
      if (!items || items.length > MAX_ITEMS) return json(400, { error: 'bad-items' }, origin);
      const now = Date.now(); const rows = [];
      for (const it of items) {
        const s = String(it.store || ''), k = String(it.key ?? ''), f = String(it.field ?? '');
        if (!STORES.has(s) || !k || k.length > 200 || f.length > 200) return json(400, { error: 'bad-item' }, origin);
        let t = Number(it.t); if (!Number.isFinite(t) || t < 0) return json(400, { error: 'bad-time' }, origin);
        if (t > now + 10 * 60 * 1000) t = now; // a device clock far in the future cannot win forever
        const deleted = it.deleted === true;
        let iv = null, ct = null;
        if (!deleted) {
          const v = JSON.stringify(it.value ?? null);
          if (v.length > MAX_VALUE) return json(413, { error: 'value-too-large' }, origin);
          ({ iv, ct } = seal(it.value ?? null, aad(uid, s, k, f)));
        }
        rows.push({ s, k, f, t: Math.floor(t), d: deleted, iv, ct });
      }
      const [accepted] = await asUser(uid, [[
        `insert into fim.items (user_id, store, key, field, t, deleted, iv, ct)
         select current_setting('fim.user_id')::uuid, x.s, x.k, x.f, x.t, x.d, x.iv, x.ct
         from jsonb_to_recordset($1::jsonb) as x(s text, k text, f text, t bigint, d boolean, iv text, ct text)
         on conflict (user_id, store, key, field) do update
           set t = excluded.t, deleted = excluded.deleted, iv = excluded.iv, ct = excluded.ct, seq = nextval('fim.seq'), updated_at = now()
           where excluded.t > fim.items.t
         returning store, key, field`, [JSON.stringify(rows)]]]);
      log('sync.push', { n: rows.length, accepted: accepted.length });
      return json(200, { accepted: accepted.length, received: rows.length }, origin);
    }
    const since = Math.max(0, Number(new URL(req.url).searchParams.get('since') || 0) || 0);
    const [got] = await asUser(uid, [[
      `select store, key, field, t, deleted, iv, ct, seq from fim.items
       where user_id = current_setting('fim.user_id')::uuid and seq > $1::bigint order by seq limit ${PAGE + 1}`, [String(since)]]]);
    const more = got.length > PAGE; const page = got.slice(0, PAGE);
    const items = page.map((r) => ({ store: r.store, key: r.key, field: r.field, t: Number(r.t), deleted: r.deleted === 't' || r.deleted === true,
      value: r.deleted === 't' || r.deleted === true ? null : open(r.iv, r.ct, aad(uid, r.store, r.key, r.field)) }));
    const cursor = page.length ? Number(page[page.length - 1].seq) : since;
    log('sync.pull', { n: items.length, more });
    return json(200, { items, cursor, more }, origin);
  } catch (e) {
    log('sync.error', { code: e.code || e.message, status: e.status || 500 });
    return json(e.status || 500, { error: e.code || (e.status ? e.message : 'server-error') }, origin, e.retryAfter ? { 'Retry-After': String(e.retryAfter) } : {});
  }
};
export const config = { path: '/api/sync' };
