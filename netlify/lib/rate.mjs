// Fixed-window rate limits stored in fim.rate (keys are HMACs, never raw IPs or emails).
import { query } from './db.mjs';
import { bucket } from './crypto.mjs';
export async function hit(kind, value, limit, windowSec) {
  const k = bucket(kind, String(value).toLowerCase());
  const [r] = await query(
    `insert into fim.rate (k, n, reset_at) values ($1, 1, now() + make_interval(secs => $2::int))
     on conflict (k) do update set
       n = case when fim.rate.reset_at < now() then 1 else fim.rate.n + 1 end,
       reset_at = case when fim.rate.reset_at < now() then excluded.reset_at else fim.rate.reset_at end
     returning n, greatest(1, ceil(extract(epoch from reset_at - now())))::int as retry`, [k, String(windowSec)]);
  return { ok: Number(r.n) <= limit, retryAfter: Number(r.retry) };
}
