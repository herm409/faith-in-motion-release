#!/usr/bin/env node
// Writes app/sw.js with a precache list and a version hash of everything precached.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const rel = (p) => '/app/' + path.relative(APP, p).split(path.sep).join('/');
const files = [
  path.join(APP, 'index.html'), path.join(APP, 'app.css'), path.join(APP, 'config.json'), path.join(APP, 'manifest.webmanifest'),
  ...walk(path.join(APP, 'js')), ...walk(path.join(APP, 'fonts')), ...walk(path.join(APP, 'content')),
  ...['manifest.json', 'credits.json', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png', 'icon-180.png', 'cover-480.webp', 'grain.webp'].map((f) => path.join(APP, 'img', f)),
];
// Heroes: only the first-run plate and the current + next stop's 640w (stop 0 and stop 1 on first visit).
const content = JSON.parse(fs.readFileSync(path.join(APP, 'content', 'manifest.json'), 'utf8'));
for (const key of ['door1', content.stops[0].id, content.stops[1].id]) files.push(path.join(APP, 'img', `${key}-640.webp`));
const hash = crypto.createHash('sha256'); let bytes = 0;
for (const f of files) { const b = fs.readFileSync(f); bytes += b.length; hash.update(rel(f)); hash.update(b); }
const tpl = fs.readFileSync(path.join(APP, 'tools', 'sw.template.js'), 'utf8');
hash.update(tpl);
const version = hash.digest('hex').slice(0, 10);
const list = ['/app/', ...files.map(rel)];
fs.writeFileSync(path.join(APP, 'sw.js'), tpl.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(list, null, 1)));
console.log(`sw.js ${version}: ${list.length} precache entries, ${(bytes / 1024).toFixed(0)} KB (budget 1228 KB)`);
if (bytes > 1.2 * 1024 * 1024) { console.error('Precache over 1.2 MB budget'); process.exit(1); }
