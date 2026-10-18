// Group walks API (Option 1: progress only). The user id always comes from the verified JWT.
// Reads run as role fim_rls under row-level security; writes go through checked SQL functions (netlify/sql/002-group-walks.sql).
// The only things a member ever shares: a first name, current stop (0 to 11), and which stops' steps were taken (0 to 11).
import { randomInt } from 'node:crypto';
import { guard, json, log, readJson } from '../lib/http.mjs';
import { asUser } from '../lib/db.mjs';
import { authorize } from '../lib/authz.mjs';
import { hit } from '../lib/rate.mjs';

const ALPHA = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const newCode = () => Array.from({ length: 6 }, () => ALPHA[randomInt(ALPHA.length)]).join('');
const CODE = /^[2-9A-HJKMNP-Z]{6}$/i, UUID = /^[0-9a-f-]{36}$/i;
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const ERR = { P0010: [404, 'bad-code'], P0011: [403, 'not-leader'], P0012: [409, 'group-full'], P0014: [409, 'too-many-groups'], 23514: [400, 'bad-value'], 23505: [409, 'retry'] };
const bad = (code) => Object.assign(new Error(code), { status: 400, code });

async function list(uid) {
  const [groups, members] = await asUser(uid, [
    ['select id, name, code, leader_id = fim.me() as leader, created_at from fim.groups order by created_at'],
    ['select group_id, user_id, first_name, current_stop, steps_taken, user_id = fim.me() as me from fim.group_members order by joined_at'],
  ]);
  const t = (v) => v === true || v === 't';
  const stops = (a) => (Array.isArray(a) ? a : String(a || '').replace(/[{}]/g, '').split(',').filter(Boolean)).map(Number).filter((n) => n >= 0 && n <= 11);
  return groups.map((g) => {
    const leader = t(g.leader);
    return {
      id: g.id, name: g.name, leader,
      code: leader ? g.code : undefined, // only the leader sees and shares the invite code
      members: members.filter((m) => m.group_id === g.id).map((m) => ({
        id: leader && !t(m.me) ? m.user_id : undefined, // ids only for the leader's Remove button
        firstName: m.first_name, me: t(m.me),
        stop: m.current_stop === null || m.current_stop === undefined ? null : Number(m.current_stop),
        stepsTaken: stops(m.steps_taken),
      })),
    };
  });
}

export default async (req) => {
  const stop = guard(req, ['GET', 'POST', 'OPTIONS']);
  if (stop) return stop;
  const origin = req.headers.get('origin');
  try {
    const user = await authorize(req);
    const uid = user.sub;
    if (req.method === 'GET') return json(200, { groups: await list(uid) }, origin);
    const b = await readJson(req, 4096);
    const action = String(b.action || '');
    const gid = b.group !== undefined ? String(b.group) : null;
    if (gid !== null && !UUID.test(gid)) throw bad('bad-group');
    const first = () => { const f = clean(b.firstName, 30); if (!f) throw bad('first-name-required'); return f; };
    const name = () => { const n = clean(b.name, 60); if (!n) throw bad('name-required'); return n; };
    if (action === 'create') {
      for (let i = 0; ; i++) {
        try { const [[r]] = await asUser(uid, [['select fim.group_create($1, $2, $3) as id', [newCode(), name(), first()]]]); log('groups.create'); return json(200, { id: r.id, groups: await list(uid) }, origin); }
        catch (e) { if (e.code !== '23505' || i >= 4) throw e; }
      }
    }
    if (action === 'join') {
      const rl = await hit('groups:join', uid, 10, 600);
      if (!rl.ok) return json(429, { error: 'rate-limited', retryAfter: rl.retryAfter }, origin, { 'Retry-After': String(rl.retryAfter) });
      const code = String(b.code || '').trim();
      if (!CODE.test(code)) throw Object.assign(new Error('bad-code'), { status: 404, code: 'bad-code' });
      const [[r]] = await asUser(uid, [['select fim.group_join($1, $2) as id', [code.toUpperCase(), first()]]]);
      log('groups.join'); return json(200, { id: r.id, groups: await list(uid) }, origin);
    }
    if (action === 'status') {
      // Exactly two numbers-only fields; anything else in the body is ignored and never stored.
      const s = b.stop === null || b.stop === undefined ? null : Number(b.stop);
      if (s !== null && !(Number.isInteger(s) && s >= 0 && s <= 11)) throw bad('bad-stop');
      const taken = Array.isArray(b.stepsTaken) ? [...new Set(b.stepsTaken.map(Number))] : [];
      if (taken.length > 12 || taken.some((n) => !(Number.isInteger(n) && n >= 0 && n <= 11))) throw bad('bad-steps');
      await asUser(uid, [[`update fim.group_members set current_stop = $1::smallint, steps_taken = $2::smallint[], updated_at = now() where user_id = fim.me()`,
        [s === null ? null : String(s), `{${taken.sort((x, y) => x - y).join(',')}}`]]]);
      return json(200, { ok: true }, origin);
    }
    if (!gid) throw bad('bad-group');
    if (action === 'rename') await asUser(uid, [['select fim.group_rename($1::uuid, $2)', [gid, name()]]]);
    else if (action === 'newCode') {
      for (let i = 0; ; i++) { try { await asUser(uid, [['select fim.group_new_code($1::uuid, $2)', [gid, newCode()]]]); break; } catch (e) { if (e.code !== '23505' || i >= 4) throw e; } }
    } else if (action === 'firstName') await asUser(uid, [[`update fim.group_members set first_name = $2, updated_at = now() where group_id = $1::uuid and user_id = fim.me()`, [gid, first()]]]);
    else if (action === 'remove') { const m = String(b.member || ''); if (!UUID.test(m)) throw bad('bad-member'); await asUser(uid, [['select fim.group_remove($1::uuid, $2::uuid)', [gid, m]]]); }
    else if (action === 'leave') await asUser(uid, [['delete from fim.group_members where group_id = $1::uuid and user_id = fim.me()', [gid]]]);
    else if (action === 'close') await asUser(uid, [['select fim.group_close($1::uuid)', [gid]]]);
    else throw bad('bad-action');
    log(`groups.${action}`);
    return json(200, { groups: await list(uid) }, origin);
  } catch (e) {
    const m = ERR[e.code]; const status = m ? m[0] : e.status || 500; const code = m ? m[1] : e.code || (e.status ? e.message : 'server-error');
    log('groups.error', { code, status });
    return json(status, { error: code }, origin, e.retryAfter ? { 'Retry-After': String(e.retryAfter) } : {});
  }
};
export const config = { path: '/api/groups' };
