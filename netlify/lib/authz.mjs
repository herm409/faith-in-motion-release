// Verifies the caller and applies account rules shared by every authenticated endpoint.
import { verifyBearer } from './jwt.mjs';
import { query } from './db.mjs';
import { hit } from './rate.mjs';

export async function authorize(req) {
  const user = await verifyBearer(req);
  // The account must still exist (a deleted account's 15-minute JWT cannot write again), must not be banned,
  // and must not have a password credential: an account pre-created with a password for someone else's
  // email can never read the real owner's journal. Steps itself only offers passwordless email codes.
  const [r] = await query('select fim.account_status($1::uuid) as s', [user.sub]);
  if (r.s !== 'ok') throw Object.assign(new Error(r.s), { status: r.s === 'missing' ? 401 : 403, code: `account-${r.s}` });
  const rl = await hit('sync:user', user.sub, 240, 60);
  if (!rl.ok) throw Object.assign(new Error('rate-limited'), { status: 429, code: 'rate-limited', retryAfter: rl.retryAfter });
  return user;
}

