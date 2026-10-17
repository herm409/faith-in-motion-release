// Account summary and "Delete my account and data". Scoped to the verified user only.
import { guard, json, log } from '../lib/http.mjs';
import { asUser } from '../lib/db.mjs';
import { authorize } from '../lib/authz.mjs';

export default async (req) => {
  const stop = guard(req, ['GET', 'DELETE', 'OPTIONS']);
  if (stop) return stop;
  const origin = req.headers.get('origin');
  try {
    const user = await authorize(req);
    if (req.method === 'DELETE') {
      const [[r]] = await asUser(user.sub, [['select fim.delete_me() as n']]);
      log('account.deleted', { items: Number(r.n) });
      // Expire the session cookie on this device too.
      const res = json(200, { deleted: true, items: Number(r.n) }, origin);
      for (const name of ['__Secure-neon-auth.session_token', 'neon-auth.session_token', '__Secure-neon-auth.session_data', 'neon-auth.session_data'])
        res.headers.append('Set-Cookie', `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
      return res;
    }
    const [[r]] = await asUser(user.sub, [[`select count(*) filter (where not deleted) as n, max(updated_at) as last from fim.items where user_id = current_setting('fim.user_id')::uuid`]]);
    return json(200, { email: user.email, items: Number(r.n), lastSyncedAt: r.last ? new Date(r.last).toISOString() : null }, origin);
  } catch (e) {
    log('account.error', { code: e.code || e.message, status: e.status || 500 });
    return json(e.status || 500, { error: e.code || 'server-error' }, origin);
  }
};
export const config = { path: '/api/account' };
