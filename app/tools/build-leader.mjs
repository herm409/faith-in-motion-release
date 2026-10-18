// Builds /groups/index.html, the small group leader guide, ONLY from the app's content files.
// Every discussion question, verse, book line and chapter pointer is copied from app/content/stops/*.json.
// The few labels and the short "How to use this guide" list are new wording: they carry a
// "Draft, pending Herman" pill while app/config.json newWordingDraft is true. Run: node app/tools/build-leader.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const APP = join(dirname(fileURLToPath(import.meta.url)), '..'); const ROOT = join(APP, '..');
const C = join(APP, 'content');
const { GW_GUIDE } = await import('../js/fresh.js'); // same Group walks guide text the app shows
const cfg = JSON.parse(readFileSync(join(APP, 'config.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(C, 'manifest.json'), 'utf8'));
const stops = manifest.stops.map((s) => JSON.parse(readFileSync(join(C, s.file), 'utf8'))).sort((a, b) => a.order - b.order);
const esv = readFileSync(join(C, 'esv-notice.txt'), 'utf8').trim();
const DRAFT = cfg.newWordingDraft && (!Array.isArray(cfg.draftOnly) || cfg.draftOnly.includes('Leader guide')) ? ' <span class="draft-new">Draft, pending Herman</span>' : '';
export const L = { // new wording (Draft, pending Herman)
  title: 'Small group leader guide', lede: 'Walk Faith in Motion together, one stop a week. Twelve stops, one for each part of the book.',
  how: 'How to use this guide', howItems: ['Before you meet, everyone reads the section named under "Read before you meet."', 'Open with the key verses and the book line.', 'Pick two or three questions. You do not need to use them all.', 'Close by having each person name one step for the week, then start the next meeting by asking how it went.', 'Private answers stay private. No one has to share what they wrote in the app.'],
  read: 'Read before you meet', verses: 'Key verses', line: 'From the book', discuss: 'Discuss', step: "This week's step", next: 'Next time, ask', then: 'Then read', app: 'Each person can walk the same stop in the free Steps app.', appLink: 'Open the Steps app', toc: 'The twelve stops', back: 'Back to Faith in Motion',
};
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const li = (a) => a.filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join('');
const ref = (r) => (r ? `${r.chapter}, ${r.section}` : '');
const sec = (s) => {
  const sc = s.screens;
  const verses = [...(sc.read.verses || []), ...(sc.pulse.verses || [])].filter((v, i, a) => a.findIndex((w) => w.ref === v.ref) === i).slice(0, 2);
  return `<section class="stop" id="stop-${s.order}" aria-labelledby="h-${s.order}">
  <p class="kicker">Stop ${s.order} · ${esc(s.chapterRef)}</p>
  <h2 id="h-${s.order}">${esc(s.title)}</h2>
  <p class="label">${L.read}</p><p class="ref">${esc(ref(sc.read.bookRef))}</p>
  ${verses.length ? `<p class="label">${L.verses}</p>${verses.map((v) => `<blockquote><p>${esc(v.text)}</p><cite>${esc(v.ref)} (ESV)</cite></blockquote>`).join('')}` : ''}
  ${sc.read.quote ? `<p class="label">${L.line}</p><p class="pull">${esc(sc.read.quote)}</p>` : ''}
  <p class="label">${L.discuss}</p><ol>${li([...sc.pulse.prompts, ...sc.nameIt.prompts])}</ol>
  <p class="label">${L.step}</p><ul>${li(sc.build.prompts)}</ul>
  <p class="label">${L.next}</p><ul>${li(sc.review.prompts)}</ul>
  <p class="label">${L.then}</p><p class="ref">${esc(ref(sc.review.bookRef))}</p>
</section>`;
};
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${L.title} | Faith in Motion</title>
<meta name="description" content="${esc(L.lede)}" />
<link rel="canonical" href="https://faithinmotionbook.com/groups/" />
<meta property="og:title" content="${L.title} | Faith in Motion" />
<meta property="og:description" content="${esc(L.lede)}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://faithinmotionbook.com/groups/" />
<meta property="og:image" content="https://faithinmotionbook.com/assets/og-faith-in-motion-1200x630.jpg" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://faithinmotionbook.com/assets/og-faith-in-motion-1200x630.jpg" />
<link rel="icon" href="/app/img/icon-192.png" />
<style>
@font-face { font-family: "Playfair Display"; font-style: normal; font-weight: 700; font-display: swap; src: url("/assets/fonts/playfair-display-normal.woff2") format("woff2"); }
@font-face { font-family: "Cormorant Garamond"; font-style: normal; font-weight: 400 600; font-display: swap; src: url("/assets/fonts/cormorant-garamond-normal.woff2") format("woff2"); }
@font-face { font-family: "Cormorant Garamond"; font-style: italic; font-weight: 400 500; font-display: swap; src: url("/assets/fonts/cormorant-garamond-italic.woff2") format("woff2"); }
@font-face { font-family: "Instrument Sans"; font-style: normal; font-weight: 400 700; font-display: swap; src: url("/app/fonts/instrument-sans-var.woff2") format("woff2"); }
:root { --navy: #122040; --cream: #F4ECDF; --umber: #463526; --amber: #E8A04A; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--cream); color: var(--navy); font: 400 20px/1.55 "Cormorant Garamond", Georgia, serif; }
.wrap { max-width: 760px; margin: 0 auto; padding: 32px 22px 80px; }
a { color: var(--navy); text-underline-offset: 3px; } a:focus-visible { outline: 2px solid var(--navy); outline-offset: 3px; }
.top { font: 600 15px/1.4 "Instrument Sans", system-ui, sans-serif; }
h1, h2 { font-family: "Playfair Display", Georgia, serif; line-height: 1.15; }
h1 { font-size: clamp(2.2rem, 6vw, 3.2rem); margin: 28px 0 10px; } h2 { font-size: 1.7rem; margin: 6px 0 14px; }
.lede { font-size: 1.3rem; }
.kicker, .label, .toc, .note, .draft-new { font-family: "Instrument Sans", system-ui, sans-serif; }
.kicker { font-size: 14px; font-weight: 600; letter-spacing: .04em; color: var(--umber); margin: 0; }
.label { font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--umber); margin: 22px 0 4px; }
.ref { margin: 0; font-style: italic; }
.pull { font-style: italic; font-size: 1.25rem; border-left: 3px solid var(--amber); padding-left: 14px; margin: 6px 0; }
blockquote { margin: 8px 0; padding: 0 0 0 14px; border-left: 2px solid rgba(70,53,38,.3); } blockquote p { margin: 0; } cite { font: 600 13px "Instrument Sans", system-ui, sans-serif; color: var(--umber); font-style: normal; }
ol, ul { padding-left: 22px; } li { margin: 6px 0; }
.stop { border-top: 1px solid rgba(70,53,38,.25); padding-top: 26px; margin-top: 34px; }
.toc { font-size: 15px; columns: 2; padding-left: 18px; }
.card { background: #fff8ee; border: 1px solid rgba(70,53,38,.18); border-radius: 14px; padding: 6px 20px 14px; margin: 24px 0; }
.btn { display: inline-block; background: var(--navy); color: var(--cream); font: 600 16px "Instrument Sans", system-ui, sans-serif; padding: 12px 20px; border-radius: 999px; text-decoration: none; }
.note { font-size: 13px; color: var(--umber); margin-top: 40px; }
.draft-new { display: inline-block; vertical-align: middle; font-size: 11px; font-weight: 600; color: var(--umber); background: rgba(232,160,74,.12); border: 1px dashed rgba(232,160,74,.7); border-radius: 999px; padding: 3px 9px; letter-spacing: .02em; }
@media print { .top, .btn, .draft-new { display: none; } .stop { break-inside: avoid; } body { background: #fff; } }
</style>
</head>
<body>
<main class="wrap">
<p class="top"><a href="/#groups">${L.back}</a></p>
<h1>${L.title}${DRAFT}</h1>
<p class="lede">${esc(L.lede)}</p>
<div class="card"><p class="label">${L.how}${DRAFT}</p><ol>${li(L.howItems)}</ol>
<p>${esc(L.app)}</p><p><a class="btn" href="/app/?src=groups">${L.appLink}</a></p></div>
${cfg.groupWalks ? `<div class="card" id="group-walks"><h2>${esc(GW_GUIDE.title)}</h2>${GW_GUIDE.sections.map((s) => `<p class="label">${esc(s.h)}</p>${s.p.map((x) => `<p>${esc(x)}</p>`).join('')}${s.verse ? `<blockquote><p>${esc(s.verse.text)}</p><cite>${esc(s.verse.ref)} (ESV)</cite></blockquote>` : ''}`).join('')}
<p><a class="btn" href="/app/groups">${esc(GW_GUIDE.appLink)}</a></p></div>` : ''}
<p class="label">${L.toc}</p>
<ol class="toc" start="0">${stops.map((s) => `<li><a href="#stop-${s.order}">${esc(s.title)}</a></li>`).join('')}</ol>
${stops.map(sec).join('\n')}
<p class="note">${esc(esv)}</p>
</main>
</body>
</html>
`;
mkdirSync(join(ROOT, 'groups'), { recursive: true });
const out = join(ROOT, 'groups', 'index.html');
if (process.argv.includes('--check')) { const cur = readFileSync(out, 'utf8'); if (cur !== html) { console.log('FAIL groups/index.html is out of date: run node app/tools/build-leader.mjs'); process.exit(1); } console.log('OK   groups/index.html matches content'); }
else { writeFileSync(out, html); console.log(`groups/index.html: ${stops.length} stops, ${(html.length / 1024).toFixed(0)} KB`); }
