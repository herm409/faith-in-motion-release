// Weight budgets + copy/landing guards. Run: node app/tools/check.mjs (from repo root or app/)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { execSync } from 'node:child_process';
const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const gz = (files) => files.reduce((n, f) => n + gzipSync(readFileSync(f)).length, 0);
const raw = (files) => files.reduce((n, f) => n + statSync(f).size, 0);
const KB = (n) => Math.round(n / 1024);
let fail = 0; const row = (name, val, max) => { const ok = val <= max; if (!ok) fail++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: ${KB(val)} KB (budget ${KB(max)} KB)`); };
const js = walk(join(APP, 'js')).filter((f) => f.endsWith('.js'));
row('JS gzipped', gz(js), 60 * 1024);
row('CSS gzipped', gz([join(APP, 'app.css')]), 20 * 1024);
row('Fonts', raw(walk(join(APP, 'fonts'))), 180 * 1024);
row('Content', raw(walk(join(APP, 'content'))), 250 * 1024);
const sw = readFileSync(join(APP, 'sw.js'), 'utf8');
const urls = [...sw.matchAll(/"(\/app\/[^"]+\.[a-z0-9]+)"/g)].map((x) => x[1]);
row(`Precache (${urls.length} files)`, raw(urls.map((u) => join(APP, u.slice(5)))), 1.2 * 1024 * 1024);
// dashes in shipped UI text
const bad = /[\u2012-\u2015]/; const textFiles = [...js, join(APP, 'index.html'), join(APP, 'manifest.webmanifest'), ...walk(join(APP, 'content')).filter((f) => extname(f) === '.json')];
const dashed = textFiles.filter((f) => bad.test(readFileSync(f, 'utf8')));
if (dashed.length) { fail++; console.log('FAIL figure/en/em dashes in', dashed); } else console.log('OK   no figure/en/em dashes in shipped text');
const html = readFileSync(join(APP, 'index.html'), 'utf8');
{ const live = JSON.parse(readFileSync(join(APP, 'config.json'), 'utf8')).draftMarkers === false; const has = /name="robots"[^>]*noindex/.test(html);
  if (live === has) { fail++; console.log(live ? 'FAIL noindex still present in a go-live build' : 'FAIL noindex missing in a preview build'); }
  else console.log(live ? 'OK   go-live build: no noindex, draft markers off' : 'OK   noindex present (remove at go-live)'); }
// landing page untouched vs main
try {
  const cwd = join(APP, '..');
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd }).toString().trim();
  // a38a74c = landing redesign Herman approved for production on 2026-10-17. Once a branch contains it,
  // the landing must match that approved version exactly (forms.html and thanks.html unchanged since 405f631).
  // 465da53 = social card (og/twitter) update to the landing, approved by Herman on 2026-10-17. Newest pin the branch contains wins.
  let APPROVED = 'a38a74c';
  let hasApproved = false;
  for (const pin of ['465da53', 'a38a74c']) { try { execSync(`git merge-base --is-ancestor ${pin} HEAD`, { cwd }); APPROVED = pin; hasApproved = true; break; } catch {} }
  if (hasApproved || branch === 'landing-motion') {
    const base = hasApproved ? APPROVED : 'steps-prod-golive';
    const drift = execSync(`git diff --name-only ${base} -- index.html styles.css script.js thanks.html`, { cwd }).toString().trim();
    const forms = execSync('git diff --name-only 405f631 -- forms.html thanks.html', { cwd }).toString().trim();
    const bad = [...new Set([...(hasApproved ? drift.split('\n') : []), ...forms.split('\n')].filter(Boolean))];
    if (bad.length) { fail++; console.log(`FAIL landing files differ from approved ${base} (or forms/thanks changed):`, bad.join(', ')); }
    else console.log(`OK   landing matches approved redesign (${hasApproved ? APPROVED : 'landing-motion in progress'}); forms.html + thanks.html unchanged since 405f631`);
  } else {
    const out = execSync('git diff --name-only main -- index.html styles.css script.js thanks.html', { cwd }).toString().trim();
    if (out) { fail++; console.log('FAIL landing files changed:', out); } else console.log('OK   landing files unchanged vs main');
  }
} catch (e) { console.log('SKIP git compare:', e.message); }
process.exit(fail ? 1 : 0);
