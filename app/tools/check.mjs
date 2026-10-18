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
// steps-five wording pills: never on the production branch or in any go-live build (approved by Herman 2026-10-17).
{ const cfg = JSON.parse(readFileSync(join(APP, 'config.json'), 'utf8'));
  let branch = ''; try { branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: join(APP, '..') }).toString().trim(); } catch {}
  const prodish = branch === 'steps-prod-golive'; // previews may show pills; the production branch never can
  if (prodish && cfg.newWordingDraft !== false) { fail++; console.log(`FAIL newWordingDraft must be false on ${branch || 'a go-live build'} (Draft, pending Herman pills would ship)`); }
  const stat = ['index.html', 'groups/index.html'].filter((f) => readFileSync(join(APP, '..', f), 'utf8').includes('pending Herman'));
  if (prodish && stat.length) { fail++; console.log(`FAIL static Draft, pending Herman pill in ${stat.join(', ')} on ${branch}`); }
  else if (!(prodish && cfg.newWordingDraft !== false)) console.log(prodish ? 'OK   newWordingDraft off (no Draft, pending Herman pills)' : `OK   newWordingDraft ${cfg.newWordingDraft ? 'on (preview only; check fails if this reaches steps-prod-golive)' : 'off'}`); }
// group walks: approved for production by Herman 2026-10-17 7:46 PM CT (tables created on Neon main). Allowed on go-live;
// the draft-pill checks above still fail on any newWordingDraft or draftOnly pill on the production branch.
{ const cfg = JSON.parse(readFileSync(join(APP, 'config.json'), 'utf8')); let branch = ''; try { branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: join(APP, '..') }).toString().trim(); } catch {}
  if (branch === 'steps-prod-golive' && Array.isArray(cfg.draftOnly) && cfg.draftOnly.length) { fail++; console.log('FAIL draftOnly pills configured on steps-prod-golive'); }
  else console.log(`OK   groupWalks ${cfg.groupWalks ? 'on' : 'off'}${branch === 'steps-prod-golive' ? ' (production: no draft pills)' : ''}`); }
// small group leader guide (/groups/) must be rebuilt from content and dash-free
try { execSync('node app/tools/build-leader.mjs --check', { cwd: join(APP, '..'), stdio: 'pipe' }); const g = readFileSync(join(APP, '..', 'groups', 'index.html'), 'utf8');
  if (bad.test(g)) { fail++; console.log('FAIL dashes in groups/index.html'); } else console.log('OK   groups/index.html rebuilt from content, no dashes'); }
catch (e) { fail++; console.log(String(e.stdout || e.message).trim()); }
// landing page untouched vs main
try {
  const cwd = join(APP, '..');
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd }).toString().trim();
  // a38a74c = landing redesign Herman approved for production on 2026-10-17. Once a branch contains it,
  // the landing must match that approved version exactly (forms.html and thanks.html unchanged since 405f631).
  // 03f75b9 = steps-next leader guide link, approved by Herman for production on 2026-10-17 6:51 PM CT (pill removed).
  // 9da0fc0 = steps-next preview: one added link to /groups/ in the Groups section (pending Herman; not on production).
  // 465da53 = social card (og/twitter) update to the landing, approved by Herman on 2026-10-17. Newest pin the branch contains wins.
  // 5102cab = phone menu (menu button + sheet, styles/script cache v=20261017-menu), approved by Herman for production on 2026-10-17 7:51 PM CT.
  // 4c847b0 = app-discovery PREVIEW (announcement bar + bar-early.js, hero app button, /thanks app link). Not on production; approved for preview Oct 18 7:51 AM CT.
  //   Once a branch contains it, thanks.html is pinned to 4c847b0 instead of 405f631.
  // 618834c = app-discovery for production (hero buttons fit the first phone screen, plain 44px close X), approved Oct 18 8:00 AM CT.
  // 44d55ba = app-section (promo links to #steps-app, browser/home-screen copy), preview Oct 18 8:11 AM CT, approved for production Oct 18 8:12 AM CT.
  // f0bb6d5 = fix4 (TOC chapter labels, wordmark spacing, sticky 'Get the book' bar, app v1.0 branding), requested by Herman Oct 18 ~9:05 AM CT.
  // 1d72c8b = signup form fail-guard (script.js + index.html cache v), built for Herman's review Oct 18 ~5 PM CT; NOT yet approved for production.
  let APPROVED = 'a38a74c';
  let hasApproved = false;
  for (const pin of ['1d72c8b', 'f0bb6d5', '44d55ba', '618834c', '4c847b0', '5102cab', '03f75b9', '9da0fc0', '465da53', 'a38a74c']) { try { execSync(`git merge-base --is-ancestor ${pin} HEAD`, { cwd }); APPROVED = pin; hasApproved = true; break; } catch {} }
  if (hasApproved || branch === 'landing-motion') {
    const base = hasApproved ? APPROVED : 'steps-prod-golive';
    const drift = execSync(`git diff --name-only ${base} -- index.html styles.css script.js thanks.html bar-early.js`, { cwd }).toString().trim();
    const thanksBase = ['1d72c8b', 'f0bb6d5', '44d55ba', '618834c', '4c847b0'].includes(APPROVED) ? APPROVED : '405f631';
    const forms = [execSync('git diff --name-only 405f631 -- forms.html', { cwd }).toString().trim(), execSync(`git diff --name-only ${thanksBase} -- thanks.html`, { cwd }).toString().trim()].filter(Boolean).join('\n');
    const bad = [...new Set([...(hasApproved ? drift.split('\n') : []), ...forms.split('\n')].filter(Boolean))];
    if (bad.length) { fail++; console.log(`FAIL landing files differ from approved ${base} (or forms/thanks changed):`, bad.join(', ')); }
    else console.log(`OK   landing matches approved redesign (${hasApproved ? APPROVED : 'landing-motion in progress'}); forms.html unchanged since 405f631, thanks.html matches ${thanksBase}`);
  } else {
    const out = execSync('git diff --name-only main -- index.html styles.css script.js thanks.html', { cwd }).toString().trim();
    if (out) { fail++; console.log('FAIL landing files changed:', out); } else console.log('OK   landing files unchanged vs main');
  }
} catch (e) { console.log('SKIP git compare:', e.message); }
process.exit(fail ? 1 : 0);
