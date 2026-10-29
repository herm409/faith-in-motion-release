#!/usr/bin/env node
// Copy Author Desk content into app/content/, validate it, and write version.json.
// Usage (repo root): node app/tools/sync-content.mjs [sourceDir]
// No dependencies. Fails loudly, naming the file and key path.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(here, '..');
const SRC = path.resolve(process.argv[2] || '/workspace/faith-in-motion/app-content');
const OUT = path.join(APP, 'content');
const SCREENS = ['read', 'pulse', 'nameIt', 'build', 'move', 'help', 'pray', 'review'];
const errors = [];
const warns = [];
const fail = (file, keyPath, msg) => errors.push(`${file}: ${keyPath}: ${msg}`);

const DASH = /[\u2012-\u2015]/;
const HTML = /<[A-Za-z]/;
const MD = [/\*\*/, /^\s*#/m, /\[[^\]]+\]\([^)]+\)/];

function walkStrings(file, obj, keyPath, fn) {
  if (typeof obj === 'string') fn(obj, keyPath);
  else if (Array.isArray(obj)) obj.forEach((v, i) => walkStrings(file, v, `${keyPath}[${i}]`, fn));
  else if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) walkStrings(file, v, keyPath ? `${keyPath}.${k}` : k, fn);
}
function checkStrings(file, obj) {
  walkStrings(file, obj, '', (s, kp) => {
    if (DASH.test(s)) fail(file, kp, `contains a dash U+${s.match(DASH)[0].codePointAt(0).toString(16).toUpperCase()}`);
    if (HTML.test(s)) fail(file, kp, 'contains HTML ("<" followed by a letter)');
    // Hashtags (ui.tags, e.g. "#FaithInMotionBook #FaithInMotion") are copy, not Markdown headings.
    if (!/tags$/i.test(kp)) for (const re of MD) if (re.test(s)) fail(file, kp, `contains Markdown (${re})`);
  });
}
function readJSON(rel) {
  const p = path.join(SRC, rel);
  if (!fs.existsSync(p)) { fail(rel, '(file)', 'missing'); return null; }
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { fail(rel, '(file)', `invalid JSON: ${e.message}`); return null; }
}
function need(file, obj, keys, base = '') {
  for (const k of keys) if (!obj || obj[k] === undefined) fail(file, base ? `${base}.${k}` : k, 'required key missing');
}
const words = (s) => (s.match(/[A-Za-z0-9\u2019']+/g) || []).length;

// ---------- manifest ----------
const manifest = readJSON('manifest.json');
need('manifest.json', manifest, ['stops', 'workbookCardHidden']);
if (manifest && !manifest.title && !manifest.appTitle) fail('manifest.json', 'title|appTitle', 'required key missing');
const outFiles = new Map();
outFiles.set('manifest.json', manifest);
if (manifest) checkStrings('manifest.json', manifest);

// ---------- stops ----------
let verseWords = 0, allWords = 0;
const refs = new Map();
const stops = [];
(manifest?.stops || []).forEach((s, i) => {
  need('manifest.json', s, ['id', 'file', 'title'], `stops[${i}]`);
  const f = s.file;
  const stop = readJSON(f);
  if (!stop) return;
  checkStrings(f, stop);
  need(f, stop, ['id', 'order', 'title', 'chapterRef', 'principles', 'screens']);
  if (stop.id !== s.id) fail(f, 'id', `does not match manifest id "${s.id}"`);
  const scr = stop.screens || {};
  for (const name of SCREENS) {
    const sc = scr[name];
    if (!sc) { fail(f, `screens.${name}`, 'required screen missing'); continue; }
    need(f, sc, ['heading', 'body', 'bookRef', 'verses', 'prompts', 'cta'], `screens.${name}`);
    need(f, sc.bookRef, ['chapter', 'section'], `screens.${name}.bookRef`);
    if (!Array.isArray(sc.prompts)) fail(f, `screens.${name}.prompts`, 'must be an array');
    (sc.verses || []).forEach((v, j) => {
      need(f, v, ['ref', 'translation', 'text'], `screens.${name}.verses[${j}]`);
      if (v.translation !== 'ESV') fail(f, `screens.${name}.verses[${j}].translation`, `must be "ESV", got "${v.translation}"`);
      verseWords += words(v.text || '');
      if (refs.has(v.ref)) warns.push(`${f}: verse ${v.ref} also appears in ${refs.get(v.ref)}`);
      refs.set(v.ref, `${f} ${name}`);
    });
  }
  if (stop.hardDay) need(f, stop.hardDay, ['heading', 'body'], 'hardDay');
  walkStrings(f, stop, '', (str, kp) => { if (!/principles|bookRef|\.id$|^id$|translation|hero\.mood/.test(kp)) allWords += words(str); });
  outFiles.set(f, stop);
  stops.push(stop);
});
if (stops.length !== 12) fail('manifest.json', 'stops', `expected 12 stops, found ${stops.length}`);

// ---------- other files ----------
const door1 = readJSON('door1-preview.json');
if (door1) { checkStrings('door1-preview.json', door1); need('door1-preview.json', door1, ['hook', 'intro', 'sample', 'tryOne', 'buy']); outFiles.set('door1-preview.json', door1); walkStrings('', door1, '', (s, kp) => { if (!/Source$/.test(kp)) allWords += words(s); }); }

const share = readJSON('share-cards.json');
if (share) {
  checkStrings('share-cards.json', share);
  const cards = Array.isArray(share) ? share : share.cards;
  if (!Array.isArray(cards)) fail('share-cards.json', 'cards', 'required array missing');
  // The card count is content, not a build rule: it grew from 12 to 25 on 2026-10-28. Assert shape, not a fixed number.
  else { if (cards.length < 12) warns.push(`share-cards.json: expected at least 12 cards, found ${cards.length}`); cards.forEach((c, i) => { need('share-cards.json', c, ['stopId', 'quote', 'attribution'], `cards[${i}]`); if (!stops.some((s) => s.id === c.stopId)) fail('share-cards.json', `cards[${i}].stopId`, `unknown stop ${c.stopId}`); }); const seen = new Set(); cards.forEach((c, i) => { const k = c.quote.trim().toLowerCase(); if (seen.has(k)) fail('share-cards.json', `cards[${i}].quote`, 'duplicate quote'); seen.add(k); }); }
  outFiles.set('share-cards.json', share);
  walkStrings('', share, '', (s) => { allWords += words(s); });
}

const testimony = readJSON('testimony-form.json');
if (testimony) { checkStrings('testimony-form.json', testimony); need('testimony-form.json', testimony, ['fields']); outFiles.set('testimony-form.json', testimony); walkStrings('', testimony, '', (s) => { allWords += words(s); }); }

const esvPath = path.join(SRC, 'esv-notice.txt');
let esv = '';
if (!fs.existsSync(esvPath)) fail('esv-notice.txt', '(file)', 'missing'); else { esv = fs.readFileSync(esvPath, 'utf8').trim(); if (DASH.test(esv)) fail('esv-notice.txt', '(text)', 'contains a dash'); allWords += words(esv); }

// Need help now (permanent menu item). Required when manifest.helpNow is present.
if (manifest && manifest.helpNow) {
  const hf = manifest.helpNow.file || 'help-now.json';
  const hn = readJSON(hf);
  if (hn) {
    checkStrings(hf, hn);
    need(hf, hn, ['heading', 'body', 'lines']);
    (hn.lines || []).forEach((l, i) => {
      need(hf, l, ['label', 'action'], `lines[${i}]`);
      for (const k of ['action', 'smsAction']) if (l[k] && !/^(tel|sms):\+?\d{3,15}$/.test(l[k])) fail(hf, `lines[${i}].${k}`, `must be tel: or sms: followed by digits, got "${l[k]}"`);
    });
    outFiles.set('help-now.json', hn);
    walkStrings('', hn, '', (s, kp) => { if (!/action|Action|placement|^id$/.test(kp)) allWords += words(s); });
  }
}

// Optional extras
for (const opt of ['ui-strings.json']) {
  if (fs.existsSync(path.join(SRC, opt))) { const j = readJSON(opt); if (j) { checkStrings(opt, j); outFiles.set(opt, j); } }
}
const vowName = fs.existsSync(path.join(SRC, 'verse-of-week.json')) ? 'verse-of-week.json' : (fs.existsSync(path.join(SRC, 'verse-of-the-week.json')) ? 'verse-of-the-week.json' : null);
if (vowName) {
  const v = readJSON(vowName);
  if (v) {
    checkStrings(vowName, v);
    const weeks = Array.isArray(v) ? v : v.weeks;
    if (!Array.isArray(weeks)) fail(vowName, 'weeks', 'required array missing');
    else weeks.forEach((w, i) => {
      need(vowName, w, ['week', 'ref'], `weeks[${i}]`);
      if (!w.text) {
        const st = stops.find((s) => s.id === w.stopId);
        const found = st && Object.values(st.screens).some((sc) => (sc.verses || []).some((x) => x.ref === w.ref));
        if (!found) fail(vowName, `weeks[${i}]`, `verse ${w.ref} not found in stop ${w.stopId}`);
      }
    });
    outFiles.set('verse-of-week.json', v);
  }
}

// Walk with me invite (DRAFT, Markdown source): extract the in-app share text and card text.
const wwmPath = path.join(SRC, 'walk-with-me-invite.DRAFT.md');
if (fs.existsSync(wwmPath)) {
  const md = fs.readFileSync(wwmPath, 'utf8');
  const grab = (heading) => { const m = md.split(new RegExp(`^###\\s+${heading}.*$`, 'm'))[1]; return m ? m.split(/^#{2,3}\s|^\* \* \*/m)[0].trim().split(/\n/).map((l) => l.trim()).filter(Boolean) : null; };
  const shareLines = grab('Share-sheet text');
  const cardLines = grab('Card text');
  if (!shareLines || !cardLines) fail('walk-with-me-invite.DRAFT.md', 'Share-sheet text|Card text', 'sections not found');
  else {
    const strip = (lines) => lines.filter((l) => !/faithinmotionbook\.com/.test(l));
    const out = { status: 'DRAFT', shareText: strip(shareLines).join(' '), cardLines: strip(cardLines), sourceLinkInDraft: (shareLines.find((l) => /faithinmotionbook/.test(l)) || '') };
    checkStrings('walk-with-me-invite.DRAFT.md', { shareText: out.shareText, cardLines: out.cardLines });
    outFiles.set('walk-with-me.json', out);
  }
} else warns.push('walk-with-me-invite.DRAFT.md missing; Walk with me uses defaults');

// ---------- report ----------
if (errors.length) {
  console.error(`\nsync-content FAILED (${errors.length} problems):`);
  for (const e of errors) console.error('  x ' + e);
  process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'stops'), { recursive: true });
const hash = crypto.createHash('sha256');
for (const [rel, data] of outFiles) {
  const text = JSON.stringify(data);
  hash.update(rel + text);
  fs.writeFileSync(path.join(OUT, rel), text);
}
fs.writeFileSync(path.join(OUT, 'esv-notice.txt'), esv + '\n');
hash.update(esv);
const version = { hash: hash.digest('hex').slice(0, 12), syncedAt: new Date().toISOString(), contentVersion: manifest.version || null, files: [...outFiles.keys(), 'esv-notice.txt'] };
fs.writeFileSync(path.join(OUT, 'version.json'), JSON.stringify(version));

const ratio = (verseWords / allWords) * 100;
console.log(`sync-content OK: ${stops.length} stops, ${refs.size} verse refs, all ESV.`);
console.log(`ESV words ${verseWords} / all app text ${allWords} = ${ratio.toFixed(1)}% (rule: under 25%)`);
if (ratio > 22) console.warn(`WARN: ESV ratio ${ratio.toFixed(1)}% is above 22%`);
for (const w of warns) console.warn('WARN: ' + w);
console.log(`content version ${version.hash} -> ${path.relative(process.cwd(), OUT)}`);
