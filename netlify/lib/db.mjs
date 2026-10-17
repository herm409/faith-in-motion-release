// Minimal client for Neon's HTTPS SQL endpoint (the same protocol @neondatabase/serverless uses). No dependencies.
import { env } from './http.mjs';
function conn() {
  const url = env('FIM_STEPS_DATABASE_URL');
  if (!url) throw Object.assign(new Error('db-not-configured'), { status: 503 });
  return { url, endpoint: `https://${new URL(url).hostname.replace(/^[^.]+\./, 'api.')}/sql` };
}
async function post(body) {
  const { url, endpoint } = conn();
  const r = await fetch(endpoint, { method: 'POST', headers: { 'Neon-Connection-String': url, 'Neon-Raw-Text-Output': 'true', 'Neon-Array-Mode': 'true', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  // Never surface Postgres messages (they can echo values). Keep only the SQLSTATE code.
  if (!r.ok) throw Object.assign(new Error('db-error'), { status: 500, code: String(j.code || r.status) });
  return j;
}
const rows = (res) => (res.rows || []).map((r) => Object.fromEntries(res.fields.map((f, i) => [f.name, r[i]])));
export async function query(sql, params = []) { return rows(await post({ query: sql, params })); }
// Runs statements in one transaction as the RLS role, with fim.user_id set to the verified user.
export async function asUser(uid, statements) {
  const res = await post({ queries: [
    { query: 'set local role fim_rls', params: [] },
    { query: "select set_config('fim.user_id', $1, true)", params: [uid] },
    ...statements.map(([sql, params = []]) => ({ query: sql, params })),
  ] });
  return res.results.slice(2).map(rows);
}
