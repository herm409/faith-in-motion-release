#!/usr/bin/env node
// Local preview server. Emulates the Netlify rewrite "/app/*  /app/index.html  200".
// POST / is a LOCAL STUB: it logs the submitted field NAMES and the email domain, returns 200, and never forwards anywhere.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = Number(process.env.PORT || 8788);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const log = [];
const CSP = (fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8').match(/Content-Security-Policy = "([^"]+)"/) || [])[1] || '';
// /api/* runs the real Netlify Functions (v2 fetch handlers) locally when FIM_STEPS_* env vars are set.
const FN = { auth: '../../netlify/functions/auth.mjs', sync: '../../netlify/functions/sync.mjs', account: '../../netlify/functions/account.mjs' };
async function runFunction(req, res, url) {
  const name = url.pathname.split('/')[2];
  if (!FN[name]) { res.writeHead(404); res.end(); return; }
  const mod = await import(new URL(FN[name], import.meta.url));
  const chunks = []; for await (const c of req) chunks.push(c);
  const headers = new Headers(); for (const [k, v] of Object.entries(req.headers)) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
  const r = new Request(`http://localhost:${PORT}${req.url}`, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
  const out = await mod.default(r, { ip: '127.0.0.1' });
  const h = {}; out.headers.forEach((v, k) => { if (k !== 'set-cookie') h[k] = v; });
  const cookies = out.headers.getSetCookie();
  if (cookies.length) h['set-cookie'] = cookies;
  res.writeHead(out.status, h); res.end(Buffer.from(await out.arrayBuffer()));
}
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) { runFunction(req, res, url).catch(() => { res.writeHead(500); res.end('{}'); }); return; }
  if (req.method === 'POST') {
    let body = ''; req.on('data', (d) => { body += d; });
    req.on('end', () => {
      const f = Object.fromEntries(new URLSearchParams(body));
      log.push(f);
      console.log(`[stub POST ${url.pathname}] form=${f['form-name']} fields=${Object.keys(f).join(',')} email=${f.email ? f.email.replace(/^.*@/, '*@') : '-'}`);
      res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok (local stub)');
    });
    return;
  }
  if (url.pathname === '/__stub_log') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(log)); return; }
  let p = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) {
    if (url.pathname.startsWith('/app/')) p = path.join(ROOT, 'app/index.html');
    else if (url.pathname === '/thanks') p = path.join(ROOT, 'thanks.html');
    else { res.writeHead(404); res.end('not found'); return; }
  }
  const headers = { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
  if (p.endsWith('sw.js')) headers['Service-Worker-Allowed'] = '/app/';
  if (url.pathname.startsWith('/app/')) headers['Content-Security-Policy'] = CSP; // mirrors netlify.toml
  res.writeHead(200, headers); fs.createReadStream(p).pipe(res);
}).listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}/app/`));
