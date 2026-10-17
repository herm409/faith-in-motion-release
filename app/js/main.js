// Faith in Motion: Steps. App shell, router and views.
// Privacy contract: journal answers live only in IndexedDB on this device. They are never sent by fetch,
// never placed in form posts, and never drawn on share cards. Export is a local file the reader starts.
import { h, s, paras, announce, reducedMotion, icon, iosShareGlyph, cairn } from './dom.js';
import * as db from './db.js';
import * as C from './content.js';
import * as forms from './forms.js';
import * as ics from './ics.js';
import * as share from './share.js';
import * as account from './account.js';

const { SCREENS, SCREEN_NAMES } = C;
let c; // content
let prof; // profile
const app = document.getElementById('app');
let swReg = null, deferredPrompt = null, updateWaiting = false, journaling = false;
const T = () => c.strings;
const tf = (key, vars) => String(T()[key] || '').replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
// append that skips null/false (Element.append would print "null")
// Draft markers: driven by config.draftMarkers so go-live needs no content edits.
const draftPill = (what) => (c?.config?.draftMarkers ? h('span', { class: 'draft-pill', 'data-draft': what, title: `${what}: not final yet` }, c.config.draftMarkerText || 'Draft, pending Herman') : null);
const ap = (el, ...k) => { el.append(...k.flat(Infinity).filter((x) => x !== null && x !== undefined && x !== false && x !== '')); return el; };
const APP_VERSION = 'preview-1';

// ---------- Helpers ----------
const todayISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return todayISO(d); };
const parseISO = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtDay = (iso) => parseISO(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
const weekday = (iso) => parseISO(iso).toLocaleDateString('en-US', { weekday: 'long' });
const weekStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return d; };
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
function img(item, { eager = false, cls, altOverride } = {}) {
  if (!item) return h('div', { class: cls });
  return h('img', { src: item.src['640'], srcset: `${item.src['640']} 640w, ${item.src['1080']} 1080w`, sizes: '100vw', width: item.width, height: item.height,
    alt: altOverride ?? item.alt ?? '', decoding: 'async', loading: eager ? 'eager' : 'lazy', fetchpriority: eager ? 'high' : null, class: cls,
    style: `object-position:${item.focal};background:url(${item.lqip}) center/cover` });
}
const stopImg = (stop) => c.img.items[stop.id];
// The images manifest alt describes the shipped photo. Content hero.alt is art direction that may not match (see report).
const stopAlt = (stop) => c.img.items[stop.id]?.alt || '';

function go(path, { replace = false } = {}) {
  if (replace) history.replaceState({}, '', path); else history.pushState({}, '', path);
  render();
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
  e.preventDefault(); closeSheet(true); go(a.getAttribute('href'));
});
addEventListener('popstate', () => { closeSheet(true); render(); });
const link = (href, text, attrs = {}) => h('a', { href, 'data-link': true, ...attrs }, text);
const ext = (href, text, attrs = {}) => h('a', { href, target: '_blank', rel: 'noopener', ...attrs }, text);

function mount(...nodes) {
  app.replaceChildren(...nodes);
  const main = app.querySelector('main');
  if (main) { main.id = 'main'; main.setAttribute('tabindex', '-1'); }
  window.scrollTo(0, 0);
}
function topbar({ back } = {}) {
  return h('div', { class: 'topbar' },
    back ? h('a', { href: back, 'data-link': true, class: 'iconbtn', 'aria-label': 'Back' }, icon('back')) : h('span'),
    h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Menu', 'aria-haspopup': 'dialog', onclick: openMenu }, icon('list')));
}

// ---------- Bottom sheets ----------
let sheetEls = null, lastFocus = null;
function openSheet(title, body, { label } = {}) {
  closeSheet(true);
  lastFocus = document.activeElement;
  const scrim = h('div', { class: 'scrim', onclick: () => closeSheet() });
  const sheet = h('div', { class: 'bsheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': label || title },
    h('div', { class: 'grip', 'aria-hidden': 'true' }),
    h('div', { class: 'inner' },
      h('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, h('h2', { text: title }),
        h('button', { class: 'iconbtn', type: 'button', style: 'background:transparent;color:var(--navy)', 'aria-label': 'Close', onclick: () => closeSheet() }, icon('x'))),
      body));
  document.body.append(scrim, sheet);
  requestAnimationFrame(() => { scrim.classList.add('on'); sheet.classList.add('on'); sheet.querySelector('button, a, input, textarea')?.focus(); });
  sheetEls = [scrim, sheet];
  sheet.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSheet();
    if (e.key === 'Tab') {
      const f = [...sheet.querySelectorAll('a[href], button, input, textarea')].filter((x) => !x.disabled); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  return sheet;
}
function closeSheet(instant) {
  if (!sheetEls) return; const [scrim, sheet] = sheetEls; sheetEls = null;
  scrim.classList.remove('on'); sheet.classList.remove('on');
  setTimeout(() => { scrim.remove(); sheet.remove(); }, instant ? 0 : 170);
  if (!instant && lastFocus && document.contains(lastFocus)) lastFocus.focus();
}
function toast(msg) { // export and import results only
  const t = h('div', { class: 'toast', role: 'status', text: msg }); document.body.append(t); setTimeout(() => t.remove(), 3200);
}
function savedIndicator() { return h('span', { class: 'saved', 'aria-live': 'polite' }); }
function flashSaved(el) { if (!el) return; el.textContent = T().saved; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 1600); }
function fieldError(input, msg) {
  const id = input.id + '-err'; let e = document.getElementById(id);
  if (!msg) { input.removeAttribute('aria-invalid'); e?.remove(); return; }
  if (!e) { e = h('p', { class: 'err', id }); input.after(e); }
  e.textContent = msg; input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', id);
}

// ---------- Need help now (always reachable from the menu, precached for offline) ----------
function prettyNumber(action) {
  const n = action.replace(/^(tel|sms):/, '');
  return /^1?800\d{7}$/.test(n) ? n.replace(/^1?(800)(\d{3})(\d{4})$/, '1-$1-$2-$3') : n;
}
function helpNowBody() {
  const hn = c.helpNow;
  if (!hn) return h('p', { class: 'prose', text: 'Call or text 988, or call 911.' });
  return h('div', { class: 'helpnow' }, h('div', { class: 'prose' }, paras(hn.body)),
    h('ul', { class: 'menu-list', style: 'margin-top:8px' }, hn.lines.map((l) => h('li', { style: 'display:block;border-bottom:1px solid var(--hair);padding:12px 0' },
      h('p', { style: 'margin:0;font-weight:600;font-size:17px', text: l.label }),
      l.detail ? h('p', { class: 'help', style: 'margin:2px 0 10px', text: l.detail }) : null,
      h('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' },
        h('a', { class: 'btn btn-secondary', style: 'width:auto;flex:1;min-width:130px', href: l.action, 'aria-label': `Call ${prettyNumber(l.action)}, ${l.label}` }, `Call ${prettyNumber(l.action)}`),
        l.smsAction ? h('a', { class: 'btn btn-secondary', style: 'width:auto;flex:1;min-width:130px', href: l.smsAction, 'aria-label': `Text ${prettyNumber(l.smsAction)}, ${l.label}` }, `Text ${prettyNumber(l.smsAction)}`) : null)))),
    hn.encourage ? h('p', { class: 'quiet', style: 'margin-top:14px', text: hn.encourage }) : null,
    h('div', { class: 'btn-row' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: () => closeSheet() }, hn.cta || 'Close')));
}
function openHelpNow() { openSheet(c.helpNow?.heading || 'Need help now?', helpNowBody()); }

function openMenu() {
  const have = prof?.door === 'have';
  const item = (ic, text, href) => h('li', {}, h('a', { href, 'data-link': true }, icon(ic), text));
  const list = h('ul', { class: 'menu-list' },
    h('li', {}, h('button', { type: 'button', class: 'helpnow-item', onclick: () => { closeSheet(true); openHelpNow(); } }, icon('sun'), c.manifest.helpNow?.label || c.helpNow?.menuLabel || 'Need help now?')),
    have ? item('path', 'The Route', '/app/route') : item('path', 'Start here', '/app/start'),
    have ? item('steps', 'My steps', '/app/steps') : null,
    item('share', 'Share a card', '/app/share'),
    item('chat', 'Send a testimony', '/app/testimony'),
    !isStandalone() ? h('li', {}, h('button', { type: 'button', onclick: () => { closeSheet(true); offerInstall(true); } }, icon('phone'), 'Install the app')) : null,
    item('phone', account.signedIn() ? 'Account and sync' : 'Sign in to sync', '/app/account'),
    item('archive', 'Backup and restore', '/app/backup'),
    item('info', 'About', '/app/about'),
    have ? null : item('download', T().getBook, '/app/start/book'));
  openSheet('Menu', list);
}

// ---------- Install ----------
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
async function afterFirstSave() {
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  if (sessionStorage.getItem('fim-install-offered')) return;
  sessionStorage.setItem('fim-install-offered', '1');
  offerInstall(false);
}
async function offerInstall(fromMenu) {
  if (isStandalone()) return;
  prof = await db.profile();
  const recent = (iso) => iso && Date.now() - Date.parse(iso) < 14 * 86400000;
  if (deferredPrompt) {
    if (!fromMenu && recent(prof?.installPromptDismissedAt)) return;
    openSheet(T().install, h('div', {}, h('p', { class: 'prose', text: c.door1.install?.android || '' }),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-primary', type: 'button', onclick: async () => { closeSheet(); deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; } }, T().install),
        h('button', { class: 'textlink', type: 'button', onclick: async () => { prof = await db.saveProfile({ installPromptDismissedAt: new Date().toISOString() }); closeSheet(); } }, T().notNow))));
  } else if (isIOS() || fromMenu) {
    if (!fromMenu && recent(prof?.iosBannerDismissedAt)) return;
    openSheet(T().install, h('div', {},
      h('p', { style: 'font-size:18px;display:flex;gap:10px;align-items:flex-start' }, h('span', { style: 'flex:none;margin-top:2px' }, iosShareGlyph()), T().iosInstall),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn btn-secondary', type: 'button', onclick: async () => { prof = await db.saveProfile({ iosBannerDismissedAt: new Date().toISOString() }); closeSheet(); } }, T().notNow))),
      { label: 'Install Steps on your iPhone' });
  }
}

// ---------- Router ----------
async function render() {
  prof = await db.profile();
  const path = location.pathname.replace(/\/+$/, '') || '/app';
  const [, a, b, d] = path.split('/').filter(Boolean);
  journaling = false;
  if (!a) return prof?.door === 'have' ? viewToday() : prof?.door === 'none' ? viewDoor1('start') : viewFork();
  if (a === 'start') return viewDoor1(b || 'start');
  if (a === 'route') return viewRoute();
  if (a === 'stop') return viewStop(b, d || 'read');
  if (a === 'steps') return viewSteps();
  if (a === 'share') return viewShare();
  if (a === 'testimony') return viewTestimony();
  if (a === 'backup') return viewBackup();
  if (a === 'about') return viewAbout();
  if (a === 'account') return viewAccount(b);
  if (a === 'sendoff') return viewSendoff();
  return go('/app/', { replace: true });
}

// ---------- Fork ----------
function viewFork() {
  document.title = 'Faith in Motion: Steps';
  mount(h('main', { class: 'dark full' },
    h('div', { class: 'bg' }, img(c.img.items.door1, { eager: true })),
    topbar(),
    h('div', { class: 'fg' },
      h('h1', { class: 'lockup fork-lockup' }, h('b', {}, 'Faith '), h('i', {}, 'in Motion'), h('span', { class: 'steps' }, 'Steps')),
      h('p', { class: 'fork-hook', text: c.door1.hook }),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-primary', type: 'button', onclick: async () => { prof = await db.saveProfile({ door: 'have' }); go('/app/'); } }, T().haveBook),
        h('button', { class: 'btn btn-secondary', type: 'button', onclick: async () => { prof = await db.saveProfile({ door: 'none' }); go('/app/start'); } }, T().noBook)),
      h('p', { class: 'fineline', text: T().noAccount }), draftPill('Privacy wording'),
      h('p', { class: 'fineline fork-signin' }, link('/app/account', T().forkSignIn, { class: 'textlink' })))));
}

// ---------- Door 1 ----------
function d1bar() {
  return h('nav', { class: 'd1bar', 'aria-label': 'Book' },
    link('/app/start/book', T().getBook, { class: 'btn btn-primary' }),
    h('button', { class: 'btn btn-secondary', type: 'button', onclick: async () => { prof = await db.saveProfile({ door: 'have' }); go('/app/'); } }, T().iHaveIt));
}
function routePreview() {
  return h('section', { class: 'route dimmed', 'aria-label': 'Route preview', style: 'border-radius:14px;overflow:hidden;margin:24px 0;min-height:auto' },
    h('div', { class: 'route-map', 'aria-hidden': 'true' }, routeSvg([], null, 360)),
    h('p', { class: 'route-note', text: T().twelveStops }));
}
function viewDoor1(sub) {
  const d = c.door1;
  const page = (...body) => mount(h('main', { class: 'door1' }, topbar({ back: sub === 'start' ? null : '/app/start' }),
    h('div', { class: 'sheet' }, h('div', { class: 'sheet-inner' }, ...body)), d1bar()));
  if (sub === 'start') {
    document.title = 'Faith in Motion: Steps';
    return page(h('div', { class: 'stage-cover' }, h('img', { src: '/app/img/cover-900.webp', width: 900, height: 1254, alt: 'The cover of Faith in Motion by Herman Davis', fetchpriority: 'high' })),
      h('h1', { class: 'h1', text: d.hook }),
      h('p', { style: 'font-family:var(--f-read);font-size:21px;font-style:italic', text: T().appAsks }),
      h('div', { class: 'prose' }, paras(d.intro)),
      h('div', { class: 'btn-row' },
        link('/app/start/intro', d.sample.heading, { class: 'btn btn-secondary' }),
        link('/app/start/try', d.tryOne.heading, { class: 'btn btn-secondary' }),
        ext(SIGNUP_URL(), T().devoCta, { class: 'btn btn-secondary devo-link' })),
      routePreview());
  }
  if (sub === 'intro') {
    document.title = `${d.sample.heading} | Steps`;
    const q = d.sampleQuotes?.[0];
    return page(h('h1', { class: 'h1', text: d.sample.heading }), h('div', { class: 'prose' }, paras(d.sample.body)),
      q ? h('p', { class: 'pull' }, q.quote, h('br'), h('small', { style: 'font-family:var(--f-ui);font-style:normal;font-size:15px', text: q.attribution })) : null,
      c.config.introPdfOffered ? h('div', { class: 'btn-row' }, ext(c.config.introPdf, 'Download the free Introduction (PDF)', { class: 'btn btn-primary' })) : null,
      h('div', { class: 'btn-row' }, link('/app/start/try', d.tryOne.cta, { class: 'btn btn-secondary' })));
  }
  if (sub === 'try') {
    document.title = `${d.tryOne.heading} | Steps`;
    return page(h('h1', { class: 'h1', text: d.tryOne.heading }), h('div', { class: 'prose' }, paras(d.tryOne.body)),
      h('div', { class: 'btn-row' }, link('/app/stop/s0/read', d.tryOne.cta, { class: 'btn btn-primary' })));
  }
  if (sub === 'book') {
    document.title = `${d.buy.heading} | Steps`;
    const row = (label, price, href, note) => h('div', { class: 'buy-row' }, h('div', {}, h('strong', { text: label }), h('div', { class: 'price' }, h('span', { text: price }), draftPill('Price')), note ? h('p', { class: 'help', text: note }) : null),
      ext(href, 'Buy on Amazon', { class: 'btn btn-primary', 'aria-label': `Buy the ${label.toLowerCase()} on Amazon, ${price}` }));
    page(h('h1', { class: 'h1', text: d.buy.heading }), h('div', { class: 'prose' }, paras(d.buy.body)),
      row(d.buy.paperback.label, d.buy.paperback.price, c.config.paperbackUrl),
      row(d.buy.kindle.label, d.buy.kindle.price, c.config.kindleUrl, d.buy.kindle.note),
      h('section', { id: 'gift', 'aria-labelledby': 'gift-h', style: 'margin-top:28px' },
        h('h2', { id: 'gift-h', class: 'heading', text: d.buy.gift.label }),
        h('p', { class: 'prose', text: T().giftLine }),
        draftPill('Prices'), h('div', { class: 'btn-row' }, ext(c.config.paperbackUrl, `Gift the paperback, ${d.buy.paperback.price}`, { class: 'btn btn-secondary' }), ext(c.config.kindleUrl, `Gift the Kindle edition, ${d.buy.kindle.price}`, { class: 'btn btn-secondary' }))),
      devoBlock());
    if (location.hash === '#gift' || location.hash === '#devotionals') setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView(), 50);
    return;
  }
  // Signups live on the website now. Old notify links land on the devotionals block.
  if (sub === 'notify') return go('/app/start/book#devotionals', { replace: true });
  return go('/app/start', { replace: true });
}

// Devotional and email signups happen on the website, never inside the app.
const SIGNUP_URL = () => c.config.signupUrl || 'https://faithinmotionbook.com/#notify-form';
function devoBlock() {
  return h('section', { id: 'devotionals', class: 'devo', 'aria-labelledby': 'devo-h', style: 'margin-top:28px' },
    h('h2', { id: 'devo-h', class: 'heading', text: c.door1.signup.heading }),
    h('p', { style: 'font-family:var(--f-read);font-size:20px', text: T().devoLine }),
    h('div', { class: 'btn-row' }, ext(SIGNUP_URL(), T().devoCta, { class: 'btn btn-secondary devo-link' })),
    h('p', { class: 'fineprint', text: T().devoNote }));
}
// One quiet mention, used on the stop-complete screens and in About.
const devoMention = (cls = 'quiet-light') => h('p', { class: `${cls} devo-mention`, style: 'margin-top:18px' }, `${T().devoAsk} `, ext(SIGNUP_URL(), T().devoLinkText, { class: 'textlink devo-link' }));

// ---------- Today ----------
async function currentStep() {
  const steps = (await db.all('steps')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return steps.find((x) => !x.doneAt && x.dueDate) || null;
}
function nextScreen() {
  const stop = C.stopById(c, prof?.lastStopId) || c.stops[0];
  const screen = prof?.lastScreen && SCREENS.includes(prof.lastScreen) ? prof.lastScreen : 'read';
  return { stop, screen };
}
async function viewToday() {
  document.title = 'Today | Steps';
  const step = await currentStep();
  const { stop, screen } = nextScreen();
  const steps = await db.all('steps');
  const inMotion = steps.some((x) => x.doneAt && new Date(x.doneAt) >= weekStart());
  const card = h('section', { class: 'today-card', 'aria-label': 'Today' });
  if (step && step.dueDate === todayISO()) ap(card, h('p', { class: 'banner', role: 'status', text: T().dueToday }));
  if (step) {
    const dateBox = h('div');
    ap(card, h('p', { class: 'label', text: c.door1.home?.todayLabel || 'Your step' }),
      h('h2', {}, `Your step: ${step.text}`), h('p', { class: 'quiet', text: `By ${fmtDay(step.dueDate)}` }),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn btn-primary', type: 'button', onclick: (e) => tookStep(step, e.currentTarget) }, T().tookStep),
        h('button', { class: 'btn btn-secondary', type: 'button', onclick: () => newDatePicker(step, dateBox) }, T().newDate)), dateBox);
    if (stop.id !== step.stopId) ap(card, h('p', { class: 'up-next' }, h('span', { class: 'label', text: T().upNext }), ' ', link(`/app/stop/${stop.id}/${screen}`, `Stop ${stop.order}: ${stop.title}`, { class: 'textlink' })));
  } else {
    const fresh = screen === 'read' && !(await db.progress(stop.id)).visited?.read;
    ap(card, h('p', { class: 'label', text: T().upNext }),
      h('h2', {}, `Stop ${stop.order}: ${stop.title}`),
      h('p', { class: 'quiet', text: stop.screens[screen].heading }),
      h('div', { class: 'btn-row' }, link(`/app/stop/${stop.id}/${screen}`, fresh ? tf('startStop', { n: stop.order }) : tf('continueStop', { n: stop.order }), { class: 'btn btn-primary' })));
  }
  if (new Date().getDay() === 0) {
    const last = steps.filter((x) => !x.outcome && new Date(x.createdAt) >= new Date(weekStart().getTime() - 7 * 86400000)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (last) ap(card, sundayReview(last));
  }
  if (inMotion) ap(card, h('p', { class: 'quiet', style: 'margin-top:16px;font-weight:600', text: T().inMotion }));
  const vow = C.verseOfWeek(c);
  const vowLabel = c.door1.home?.verseOfWeekLabel || 'Verse of the week';
  const vowEl = vow ? h('section', { class: 'vow', 'aria-label': vowLabel },
    h('p', { class: 'label', style: 'margin-top:0', text: vowLabel }),
    h('blockquote', { class: 'verse', style: 'margin:8px 0' }, h('p', { text: vow.text }), h('cite', { text: `${vow.ref} (ESV)` })),
    h('p', { class: 'quiet', text: `Read it in ${vow.readIn}` })) : null;
  const motion = await motionCheck();
  const upd = updateWaiting ? h('p', { class: 'update-line' }, T().updated + ' ', h('button', { class: 'textlink', type: 'button', onclick: applyUpdate }, 'Reload')) : null;
  mount(h('main', { class: 'today' }, topbar(),
    h('div', { class: 'band' }, img(stopImg(stop), { eager: true, altOverride: stopAlt(stop) }), h('p', { class: 'lockup', 'aria-hidden': 'true' }, h('b', {}, 'Faith '), h('i', {}, 'in Motion'))),
    h('div', { class: 'sheet' }, h('div', { class: 'sheet-inner' }, h('h1', { class: 'sr-only', text: 'Today' }), upd, card, motion, vowEl,
      h('p', { style: 'margin-top:28px' }, link('/app/route', 'Open the Route', { class: 'textlink' }))))));
  warm(stop);
}
function sundayReview(step) {
  const box = h('fieldset', { class: 'card', style: 'margin-top:20px' }, h('legend', { class: 'legend', text: T().sundayAsk }), h('p', { class: 'quiet', text: step.text }));
  for (const [v, l] of [['traded', 'Traded'], ['buried', 'Buried'], ['holy-wait', 'Holy wait']]) {
    ap(box, h('label', { class: 'radio-row' }, h('input', { type: 'radio', name: 'sun', value: v, onchange: async () => { step.outcome = v; await db.put('steps', step); if (!box.querySelector('.btn')) ap(box, h('div', { class: 'btn-row' }, link('/app/route', T().pickNext, { class: 'btn btn-secondary' }))); } }), l));
  }
  return box;
}
async function motionCheck() {
  const prompts = c.strings.motionCheck; if (!Array.isArray(prompts) || !prompts.length) return null; // hidden without ui-strings.json
  const month = todayISO().slice(0, 7); const prev = new Date(); prev.setDate(1); prev.setMonth(prev.getMonth() - 1);
  const cur = (await db.get('motionChecks', month)) || { month, answers: [] }; const last = await db.get('motionChecks', todayISO(prev).slice(0, 7));
  const ind = savedIndicator();
  const save = debounce(async () => { await db.put('motionChecks', cur); flashSaved(ind); }, 400);
  return h('section', { class: 'card' }, h('h3', { text: c.strings.motionCheckTitle || 'Motion check' }), prompts.map((p, i) => h('div', { class: 'field' },
    h('label', { for: `mc-${i}`, text: p }), last?.answers?.[i] ? h('p', { class: 'help', text: `Last month: ${last.answers[i]}` }) : null,
    h('textarea', { id: `mc-${i}`, oninput: (e) => { cur.answers[i] = e.target.value; save(); } }, cur.answers[i] || ''))), ind);
}
async function tookStep(step, btn) {
  btn.disabled = true;
  await firstLight(document.querySelector('.plate, .band'));
  step.doneAt = new Date().toISOString(); await db.put('steps', step);
  const p = await db.progress(step.stopId); p.move.doneAt = step.doneAt; await db.saveProgress(p);
  sessionStorage.setItem('fim-walked', step.stopId);
  go('/app/sendoff');
}
function firstLight(el) {
  return new Promise((res) => {
    if (!el) return res();
    let sw = el.querySelector('.sweep');
    if (!sw) { sw = h('div', { class: 'sweep', 'aria-hidden': 'true' }); ap(el, sw); }
    sw.style.cssText = 'position:absolute;inset:0;z-index:2;pointer-events:none;background:linear-gradient(90deg,rgba(25,41,53,.35),rgba(250,212,145,.35));transform-origin:left;';
    const rm = reducedMotion();
    sw.animate(rm ? [{ opacity: 1 }, { opacity: 1 }] : [{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 1 }], { duration: rm ? 1 : 900, easing: 'cubic-bezier(0.16,1,0.3,1)', fill: 'forwards' });
    setTimeout(res, rm ? 60 : 950);
  });
}
function newDatePicker(step, box) {
  const input = h('input', { type: 'date', id: 'nd', min: todayISO(), max: addDays(3), value: addDays(1) });
  box.replaceChildren(h('div', { class: 'field' }, h('label', { for: 'nd', text: T().newDateLabel }), input),
    h('button', { class: 'btn btn-primary', type: 'button', onclick: async () => {
      const v = input.value; if (!v || v < todayISO() || v > addDays(3)) { fieldError(input, 'Pick a date between today and 3 days from now.'); return; }
      step.dueDate = v; await db.put('steps', step);
      const p = await db.progress(step.stopId); p.move.missedAt = p.move.missedAt || new Date().toISOString(); p.move.newDate = v; await db.saveProgress(p);
      go('/app/', { replace: true });
    } }, 'Save the new date'));
  input.focus();
}

// ---------- Route ----------
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
function waypoints(H) {
  const pts = [];
  for (let i = 0; i < 12; i++) { const t = i / 11; pts.push([(i % 2 ? 0.7 : 0.3) * 400 + Math.sin(i * 1.7) * 22, (0.05 + t * 0.9) * H]); }
  return pts;
}
function pathD(pts) {
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; const my = (y0 + y1) / 2; d += ` C${x0.toFixed(1)},${my.toFixed(1)} ${x1.toFixed(1)},${my.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`; }
  return d;
}
function routeSvg(walkedIdx, newIdx, H = 1500) {
  const r = rng(1012); const svg = s('svg', { viewBox: `0 0 400 ${H}`, 'aria-hidden': 'true' });
  for (let k = 0; k < Math.round(H / 60); k++) { // seeded contour lines, same every visit
    const cx = r() * 400, cy = r() * H, rad = 40 + r() * 120; let d = '';
    for (let ring = 0; ring < 3; ring++) {
      const rr = rad + ring * 16;
      for (let j = 0; j <= 28; j++) { const a = (j / 28) * Math.PI * 2; const wob = 1 + Math.sin(a * 3 + k) * 0.12 + Math.cos(a * 5 + ring) * 0.06; d += `${j ? 'L' : 'M'}${(cx + Math.cos(a) * rr * wob).toFixed(1)},${(cy + Math.sin(a) * rr * 0.7 * wob).toFixed(1)}`; }
      d += 'Z';
    }
    svg.append(s('path', { d, class: 'contour' }));
  }
  const pts = waypoints(H);
  svg.append(s('path', { d: pathD(pts), class: 'trail' }));
  for (const i of walkedIdx) {
    if (i === 0) continue;
    const seg = s('path', { d: pathD([pts[i - 1], pts[i]]), class: 'walked' + (i === newIdx && !reducedMotion() ? ' draw' : '') });
    if (i === newIdx) seg.style.setProperty('--len', String(Math.round(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) * 1.4)));
    svg.append(seg);
  }
  return svg;
}
async function viewRoute() {
  if (prof?.door !== 'have') return go('/app/start', { replace: true });
  document.title = 'The Route | Steps';
  const progress = await db.all('stopProgress');
  const walked = c.stops.map((st, i) => (progress.find((p) => p.stopId === st.id)?.move?.doneAt ? i : -1)).filter((i) => i >= 0);
  const newly = sessionStorage.getItem('fim-walked'); sessionStorage.removeItem('fim-walked');
  const newIdx = newly ? c.stops.findIndex((x) => x.id === newly) : null;
  const { stop: cur } = nextScreen();
  const H = 1500; const pts = waypoints(H);
  const map = h('div', { class: 'route-map' }, routeSvg(walked, newIdx, H));
  const list = h('ol', { style: 'list-style:none;margin:0;padding:0' });
  c.stops.forEach((st, i) => {
    const state = walked.includes(i) ? 'walked' : st.id === cur.id ? 'today' : 'open';
    const right = pts[i][0] > 200;
    ap(list, h('li', {}, h('a', { href: `/app/stop/${st.id}/read`, 'data-link': true, class: `wp${right ? ' right' : ''}${state === 'today' ? ' today' : ''}`,
      style: right ? `right:${(100 - (pts[i][0] / 400) * 100).toFixed(2)}%;top:${((pts[i][1] / H) * 100).toFixed(2)}%` : `left:${((pts[i][0] / 400) * 100).toFixed(2)}%;top:${((pts[i][1] / H) * 100).toFixed(2)}%`, 'aria-label': `Stop ${st.order}: ${st.title}${state === 'walked' ? ', walked' : state === 'today' ? ', current stop' : ''}` },
      h('span', { class: 'cairn' }, cairn(state)), h('span', { class: 't' }, h('i', {}, C.chapterLabel(st)), st.title))));
  });
  ap(map, list);
  mount(h('main', { class: 'route dark' }, topbar({ back: '/app/' }),
    h('header', { class: 'route-band' }, h('p', { class: 'lockup', style: 'font-size:1.2rem;margin:0' }, h('b', {}, 'Faith '), h('i', {}, 'in Motion')), h('h1', { text: 'The Route' })), map));
}

// ---------- Stop screens ----------
function rail(stop, screen, p) {
  const svg = s('svg', { viewBox: '0 0 320 28', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  svg.append(s('path', { d: 'M8,18 C80,8 120,26 160,16 S260,8 312,16', class: 'path' }));
  const nav = h('nav', { class: 'rail', 'aria-label': 'Waypoints in this stop' });
  const links = h('div', { style: 'position:relative;flex:1;min-width:0;height:28px' }, svg);
  SCREENS.forEach((name, i) => {
    const x = 8 + i * (304 / 7); const now = name === screen; const done = !!p.visited?.[name] && !now;
    svg.append(s('path', { d: `M${(x - 6).toFixed(1)},22 L${x.toFixed(1)},8 L${(x + 6).toFixed(1)},22 Z`, class: `tick${done ? ' done' : ''}${now ? ' now' : ''}` }));
    ap(links, h('a', { href: `/app/stop/${stop.id}/${name}`, 'data-link': true, 'aria-label': `${SCREEN_NAMES[name]}${done ? ', visited' : ''}`, 'aria-current': now ? 'step' : null,
      style: `position:absolute;top:-8px;left:calc(${((x / 320) * 100).toFixed(2)}% - 18px);width:36px;height:44px` }));
  });
  ap(nav, links, h('button', { type: 'button', class: 'hardday-btn', onclick: () => openHardDay(stop) }, T().hardDay));
  return nav;
}
function openHardDay(stop) {
  const hd = stop.hardDay;
  const body = hd ? h('div', {}, h('div', { class: 'prose' }, paras(hd.body)),
    hd.bookRef ? h('div', { class: 'card' }, h('p', { class: 'bookref', text: `Read ${hd.bookRef.chapter}, ${hd.bookRef.section}.` })) : null)
    : h('div', {}, h('div', { class: 'prose' }, paras(T().hardDayDefaultBody)), h('div', { class: 'card' }, h('p', { class: 'bookref', text: T().hardDayDefaultRead })));
  ap(body, h('p', {}, h('button', { class: 'textlink', type: 'button', onclick: () => { closeSheet(true); openHelpNow(); } }, c.helpNow?.menuLabel || 'Need help now?')));
  openSheet(hd?.heading || T().hardDayDefaultHeading, body);
}
const verses = (list) => (list || []).map((v) => h('blockquote', { class: 'verse' }, h('p', { text: v.text }), h('cite', { text: `${v.ref} (ESV)` })));
const readCard = (sc) => h('div', { class: 'card' }, h('h3', { text: 'Read first' }), h('p', { class: 'bookref', text: `Read ${sc.bookRef.chapter}, ${sc.bookRef.section}, then come back.` }));
const bookPointer = (sc) => h('p', { class: 'stop-meta', style: 'margin-top:24px' }, `In the book: ${sc.bookRef.chapter}, ${sc.bookRef.section}`);
function nextStop(stop) { const i = c.stops.indexOf(stop); const n = c.stops[i + 1]; return n ? { id: n.id, screen: 'read' } : { id: stop.id, screen: 'review' }; }
const latestStepFor = async (stopId) => (await db.all('steps')).filter((x) => x.stopId === stopId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

async function viewStop(id, screen) {
  const stop = C.stopById(c, id);
  if (!stop || !SCREENS.includes(screen)) return go('/app/', { replace: true });
  if (prof?.door !== 'have' && stop.order !== 0) return go('/app/start/book', { replace: true });
  if (!prof?.door) prof = await db.saveProfile({ door: 'none' });
  const sc = stop.screens[screen];
  const p = await db.progress(stop.id);
  p.visited = p.visited || {};
  document.title = `${SCREEN_NAMES[screen]}: ${stop.title} | Steps`;
  const nextName = SCREENS[SCREENS.indexOf(screen) + 1];
  const ind = savedIndicator();
  const persist = async () => { p.visited[screen] = p.visited[screen] || new Date().toISOString(); await db.saveProgress(p); };
  const saveDeb = debounce(async () => { await persist(); flashSaved(ind); afterFirstSave(); }, 400);
  const area = (key, i, label) => {
    if (!Array.isArray(p.answers[key])) p.answers[key] = [];
    const arr = p.answers[key]; const fid = `${screen}-${i}`;
    return h('div', { class: 'field' }, h('label', { for: fid, text: label }),
      h('textarea', { id: fid, autocomplete: 'off', onfocus: () => { journaling = true; }, onblur: () => { journaling = false; }, oninput: (e) => { arr[i] = e.target.value; saveDeb(); } }, arr[i] || ''));
  };
  const nextBtn = (label, after) => h('button', { class: 'btn btn-primary', type: 'button', onclick: async () => { await persist(); if (after) await after(); } }, label);
  const toNext = async () => { if (nextName) { prof = await db.saveProfile({ lastStopId: stop.id, lastScreen: nextName }); go(`/app/stop/${stop.id}/${nextName}`); } };
  const toSendoff = async (target, { finished = false } = {}) => {
    const ns = target || (nextName ? { id: stop.id, screen: nextName } : nextStop(stop));
    const wasD1 = prof?.door !== 'have';
    prof = await db.saveProfile({ lastStopId: ns.id, lastScreen: ns.screen });
    const q = new URLSearchParams();
    if (wasD1 && screen === 'review') q.set('d1', '1');
    if (finished) q.set('done', stop.id);
    go(`/app/sendoff${String(q) ? '?' + q : ''}`);
  };
  const body = h('div', { class: 'screen' }, h('h2', { class: 'heading', text: sc.heading }));
  const quote = sc.quote ? h('p', { class: 'pull', text: sc.quote }) : null; // at most one line of book text
  const prose = () => h('div', { class: 'prose' }, paras(sc.body));

  if (screen === 'read') {
    ap(body, quote, prose(), readCard(sc), ...verses(sc.verses));
    sc.prompts.forEach((pr, i) => ap(body, area('read', i, pr)));
    ap(body, ind, h('div', { class: 'btn-row' }, nextBtn(sc.cta || T().readIt, async () => { p.readAt = p.readAt || new Date().toISOString(); await db.saveProgress(p); await toNext(); })),
      h('p', { class: 'quiet', style: 'margin-top:6px' }, ext(c.config.kindleUrl, `Don't have it? ${c.door1.buy.kindle.label} ${c.door1.buy.kindle.price}`, { class: 'textlink' }), ' ', draftPill('Price')));
  } else if (screen === 'pulse') {
    ap(body, quote, ...verses(sc.verses), prose());
    sc.prompts.forEach((pr, i) => ap(body, area('pulse', i, pr)));
    ap(body, ind, h('div', { class: 'btn-row' }, nextBtn(sc.cta, toNext)));
  } else if (screen === 'nameIt') {
    ap(body, quote, prose(), ...verses(sc.verses));
    sc.prompts.forEach((pr, i) => ap(body, area('nameIt', i, pr)));
    ap(body, ind, h('div', { class: 'btn-row' }, nextBtn(sc.cta, toNext)));
  } else if (screen === 'build') {
    ap(body, quote, prose(), ...verses(sc.verses), buildForm(stop, sc, p, ind, persist, toSendoff));
  } else if (screen === 'move') {
    ap(body, quote, prose(), ...verses(sc.verses), moveForm(stop, sc, p, persist, toSendoff, saveDeb));
  } else if (screen === 'help') {
    ap(body, quote, prose(), ...verses(sc.verses));
    if (!p.answers.help || Array.isArray(p.answers.help)) p.answers.help = { choice: '', believerNote: '', answers: [] };
    p.answers.help.answers = p.answers.help.answers || [];
    sc.prompts.forEach((pr, i) => {
      const fid = `help-${i}`;
      ap(body, h('div', { class: 'field' }, h('label', { for: fid, text: pr }), h('textarea', { id: fid, autocomplete: 'off', oninput: (e) => { p.answers.help.answers[i] = e.target.value; if (i === 0) p.answers.help.believerNote = e.target.value; saveDeb(); } }, p.answers.help.answers[i] || '')));
    });
    ap(body, ind, h('div', { class: 'btn-row' },
      link('/app/start/book#gift', T().giftCopy, { class: 'btn btn-secondary' }),
      h('div', { class: 'with-pill' }, link('/app/share?card=walk', T().walkWithMe, { class: 'btn btn-secondary' }), draftPill('Walk with me invite')),
      nextBtn(sc.cta, () => toSendoff())));
  } else if (screen === 'pray') {
    ap(body, draftPill('Prayer'), quote, ...verses(sc.verses));
    if (!p.answers.pray || Array.isArray(p.answers.pray)) p.answers.pray = { blanks: [], answers: [] };
    let bi = 0; const pr = h('div', { class: 'prose' });
    for (const para of String(sc.body).split(/\n\n+/)) {
      const el = h('p'); const bits = para.split('____');
      bits.forEach((bit, j) => {
        ap(el, bit);
        if (j < bits.length - 1) {
          const k = bi++; const label = (sc.prompts[k] || sc.prompts[sc.prompts.length - 1] || `Blank ${k + 1}`).replace(/:$/, '');
          ap(el, h('input', { type: 'text', class: 'inline-blank', 'aria-label': `${label} (blank ${k + 1})`, value: p.answers.pray.blanks[k] || '', autocomplete: 'off', oninput: (e) => { p.answers.pray.blanks[k] = e.target.value; saveDeb(); } }));
        }
      });
      ap(pr, el);
    }
    ap(body, pr);
    if (bi === 0) sc.prompts.forEach((q, i) => { const fid = `pray-${i}`; ap(body, h('div', { class: 'field' }, h('label', { for: fid, text: q }), h('textarea', { id: fid, autocomplete: 'off', oninput: (e) => { p.answers.pray.answers[i] = e.target.value; saveDeb(); } }, p.answers.pray.answers[i] || ''))); });
    ap(body, ind, h('div', { class: 'btn-row' }, nextBtn(sc.cta, () => toSendoff())));
  } else if (screen === 'review') {
    ap(body, quote, reviewForm(stop, sc, p, persist, toSendoff, saveDeb, ind));
  }
  ap(body, bookPointer(sc));

  mount(h('main', { class: 'stop' }, topbar({ back: prof?.door === 'have' ? '/app/route' : '/app/start' }),
    h('div', { class: 'plate' }, img(stopImg(stop), { eager: true, altOverride: stopAlt(stop) }), h('div', { class: 'sweep', 'aria-hidden': 'true' })),
    h('div', { class: 'stage' }, h('div', { class: 'sheet' }, h('span', { class: 'numeral', 'aria-hidden': 'true' }, h('span', { class: 'n-top', text: String(stop.order) }), h('span', { class: 'n-bot', text: String(stop.order) })),
      h('div', { class: 'sheet-inner' },
        h('header', { class: 'stop-head' }, h('div', {}, h('h1', { class: 'stop-title' }, h('span', { class: 'sr-only' }, `Stop ${stop.order}: `), stop.title), h('p', { class: 'stop-meta', text: `Stop ${stop.order}, ${C.chapterLabel(stop)}` }))),
        rail(stop, screen, p), body))),
    prof?.door !== 'have' ? d1bar() : null));
  plateScroll();
  if (prof?.lastStopId !== stop.id || prof?.lastScreen !== screen) prof = await db.saveProfile({ lastStopId: stop.id, lastScreen: screen });
  warm(stop);
}

function classifyBuild(prompts) {
  const kinds = prompts.map((pr) => {
    if (/\bby[:)]|\(date\)|^the date:|^the day i'll|\bby \(/i.test(pr)) return 'date';
    if (/\bstop\b/i.test(pr)) return 'stopDoing';
    if (/\btell\b|hold me|invite in/i.test(pr)) return 'partner';
    return 'text';
  });
  let stepIdx = prompts.findIndex((pr, i) => kinds[i] === 'text' && /step|trade|inch|faithful use|good work/i.test(pr));
  if (stepIdx < 0) stepIdx = kinds.indexOf('text');
  if (stepIdx >= 0) kinds[stepIdx] = 'step';
  return kinds;
}
function buildForm(stop, sc, p, ind, persist, toSendoff) {
  const b = p.answers.build = { step: '', dueDate: '', stopDoing: '', partner: '', extra: [], ...(p.answers.build || {}) };
  const kinds = classifyBuild(sc.prompts);
  const form = h('form', { novalidate: true });
  const fields = sc.prompts.map((pr, i) => ({ pr, kind: kinds[i], i }));
  if (!kinds.includes('date')) fields.push({ pr: T().byWhen, kind: 'date', i: 'd' });
  let stepEl, dateEl;
  for (const f of fields) {
    const fid = `build-${f.i}`; let input;
    if (f.kind === 'date') input = dateEl = h('input', { id: fid, type: 'date', min: todayISO(), value: b.dueDate || '', required: true, oninput: (e) => { b.dueDate = e.target.value; } });
    else if (f.kind === 'step') input = stepEl = h('input', { id: fid, type: 'text', maxlength: '140', value: b.step || '', required: true, autocomplete: 'off', oninput: (e) => { b.step = e.target.value; } });
    else {
      const key = f.kind === 'text' ? null : f.kind;
      input = h('textarea', { id: fid, autocomplete: 'off', oninput: (e) => { if (key) b[key] = e.target.value; else b.extra[f.i] = e.target.value; } }, key ? b[key] || '' : b.extra[f.i] || '');
    }
    form.append(h('div', { class: 'field' }, h('label', { for: fid, text: f.pr }), input, f.kind === 'step' ? h('p', { class: 'help', text: 'One sentence, 140 characters or fewer.' }) : null));
  }
  const after = h('div');
  form.append(h('div', { class: 'btn-row' }, h('button', { type: 'submit', class: 'btn btn-primary' }, sc.cta)), ind, after);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let ok = true;
    if (!b.step.trim()) { fieldError(stepEl, 'Write your step in one sentence.'); ok = false; } else fieldError(stepEl, null);
    if (!b.dueDate || b.dueDate < todayISO()) { fieldError(dateEl, 'Pick a date from today on.'); ok = false; } else fieldError(dateEl, null);
    if (!ok) { form.querySelector('[aria-invalid=true]')?.focus(); return; }
    await persist();
    const open = (await db.all('steps')).find((x) => x.stopId === stop.id && !x.doneAt);
    const rec = { id: open?.id || `${stop.id}-${Date.now()}`, stopId: stop.id, text: b.step.trim(), dueDate: b.dueDate, outcome: open?.outcome ?? null, createdAt: open?.createdAt || new Date().toISOString(), doneAt: null, lap: 1 };
    await db.put('steps', rec);
    flashSaved(ind); afterFirstSave();
    // L4: the reader taps this to open their own Messages app; nothing is sent by the app.
    const smsBody = `My step this week: ${rec.text}, by ${weekday(rec.dueDate)}. Will you ask me about it on ${weekday(rec.dueDate)}?`;
    const sms = `sms:${isIOS() ? '?&' : '?'}body=${encodeURIComponent(smsBody)}`;
    after.replaceChildren(h('div', { class: 'card' }, h('h3', { text: 'Your step is set' }), h('p', { class: 'quiet', text: `By ${fmtDay(rec.dueDate)}` }),
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => ics.shareOrDownload(ics.stepIcs(rec), 'faith-in-motion-step.ics') }, T().addCalendar),
        h('a', { class: 'btn btn-secondary', href: sms }, T().textPartner),
        h('button', { type: 'button', class: 'btn btn-primary', onclick: () => toSendoff({ id: stop.id, screen: 'move' }) }, 'Done for now')),
      h('p', { class: 'help', text: 'The calendar file and the text open on your phone. Only you choose to save or send them.' })));
    after.querySelector('button')?.focus();
  });
  return form;
}
function checkbox(label, checked, onchange) {
  return h('label', { class: 'check' }, h('input', { type: 'checkbox', checked, onchange }),
    h('span', { class: 'box', 'aria-hidden': 'true' }, s('svg', { viewBox: '0 0 24 24', width: '20', height: '20' }, s('path', { d: 'M5 12.5l4.5 4.5L19 7' }))), h('span', { text: label }));
}
function moveForm(stop, sc, p, persist, toSendoff, saveDeb) {
  const wrap = h('div');
  const items = sc.prompts.slice(0, -1); const last = sc.prompts[sc.prompts.length - 1];
  const list = h('fieldset', { style: 'border:0;padding:0;margin:14px 0' }, h('legend', { class: 'legend', text: 'Practice this week' }));
  items.forEach((it, i) => ap(list, checkbox(it, !!p.move.checks[i], (e) => { p.move.checks[i] = e.target.checked; saveDeb(); })));
  ap(wrap, list);
  const due = p.answers?.build?.dueDate;
  const missed = due && due < todayISO() && !p.move.doneAt;
  const nd = h('input', { type: 'date', id: 'move-nd', min: todayISO(), max: addDays(3), value: p.move.newDate || '' });
  ap(wrap, h('div', { class: 'field' }, missed ? h('p', { class: 'banner', text: T().newDateLabel }) : null, h('label', { for: 'move-nd', text: last }), nd));
  nd.addEventListener('change', async () => {
    if (nd.value && (nd.value < todayISO() || nd.value > addDays(3))) { fieldError(nd, 'Pick a date between today and 3 days from now.'); return; }
    fieldError(nd, null); p.move.newDate = nd.value; p.move.missedAt = p.move.missedAt || new Date().toISOString(); await persist();
    const st = (await db.all('steps')).find((x) => x.stopId === stop.id && !x.doneAt); if (st) { st.dueDate = nd.value; await db.put('steps', st); }
  });
  ap(wrap, h('div', { class: 'btn-row' },
    p.move.doneAt ? h('p', { class: 'quiet', text: 'You took this step.' }) : h('button', { class: 'btn btn-primary', type: 'button', onclick: async (e) => {
      e.currentTarget.disabled = true; await firstLight(document.querySelector('.plate'));
      p.move.doneAt = new Date().toISOString(); await persist();
      const st = (await db.all('steps')).find((x) => x.stopId === stop.id && !x.doneAt); if (st) { st.doneAt = p.move.doneAt; await db.put('steps', st); }
      sessionStorage.setItem('fim-walked', stop.id); toSendoff();
    } }, T().tookStep),
    h('button', { class: 'btn btn-secondary', type: 'button', onclick: async () => { await persist(); toSendoff(); } }, sc.cta)));
  return wrap;
}
function reviewForm(stop, sc, p, persist, toSendoff, saveDeb, ind) {
  const wrap = h('div');
  const [first, ...rest] = sc.prompts;
  const m = /^(.*?\?)\s*(.*)$/.exec(first) || [null, 'How did it go?', first];
  const opts = m[2].split(' / ');
  const fs = h('fieldset', { style: 'border:0;padding:0;margin:10px 0' }, h('legend', { class: 'legend', text: m[1] }));
  [['traded', 'Traded'], ['buried', 'Buried'], ['holy-wait', 'Holy wait']].forEach(([v, word], i) => {
    ap(fs, h('label', { class: 'radio-row' }, h('input', { type: 'radio', name: 'verdict', value: v, checked: p.review.verdict === v, onchange: async () => {
      p.review.verdict = v; p.review.reviewedAt = new Date().toISOString(); await persist();
      const st = await latestStepFor(stop.id); if (st) { st.outcome = v; await db.put('steps', st); }
      flashSaved(ind);
    } }), h('span', {}, word, h('small', { text: opts[i] || '' }))));
  });
  ap(wrap, fs);
  p.review.answers = p.review.answers || [];
  rest.forEach((pr, i) => { const fid = `review-${i}`; ap(wrap, h('div', { class: 'field' }, h('label', { for: fid, text: pr }), h('textarea', { id: fid, autocomplete: 'off', oninput: (e) => { p.review.answers[i] = e.target.value; saveDeb(); } }, p.review.answers[i] || ''))); });
  ap(wrap, ind, h('div', { class: 'prose' }, paras(sc.body)), ...verses(sc.verses));
  if (prof?.door === 'have') ap(wrap, h('div', { class: 'btn-row' }, link(`/app/share?card=stop&stop=${stop.id}`, 'Share that I finished this stop', { class: 'btn btn-secondary' })));
  if (stop.order === 3 || stop.order === 11) ap(wrap, h('div', { class: 'card' }, h('h3', { text: c.testimony.heading }), h('p', { class: 'quiet', text: c.testimony.intro }), link(`/app/testimony?stop=${stop.id}`, 'Send a testimony', { class: 'btn btn-secondary' })));
  ap(wrap, h('div', { class: 'btn-row' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: async () => { p.finishedAt = p.finishedAt || new Date().toISOString(); await persist(); toSendoff(nextStop(stop), { finished: true }); } }, sc.cta)));
  return wrap;
}
let plateHandler = null;
function plateScroll() {
  if (plateHandler) removeEventListener('scroll', plateHandler);
  const plate = document.querySelector('.plate'); if (!plate || reducedMotion()) return;
  plateHandler = () => { plate.style.transform = `translateY(${-Math.min(scrollY, innerHeight * 0.24)}px)`; };
  addEventListener('scroll', plateHandler, { passive: true });
}
function warm(stop) {
  const i = c.stops.indexOf(stop); const ids = [stop, c.stops[i + 1]].filter(Boolean).map((x) => x.id);
  navigator.serviceWorker?.controller?.postMessage({ warm: ids.flatMap((id) => [c.img.items[id]?.src['640'], c.img.items[id]?.src['1080']]).filter(Boolean) });
}

// ---------- Send-off ----------
function viewSendoff() {
  document.title = 'Go take your step | Steps';
  const q = new URLSearchParams(location.search); const d1 = q.has('d1'), fromShare = q.has('share');
  const { stop, screen } = nextScreen();
  const done = C.stopById(c, q.get('done'));
  const next = done ? c.stops[c.stops.indexOf(done) + 1] : null;
  const back = h('p', { style: 'margin-top:14px' }, link(d1 ? '/app/start' : '/app/', T().backToday, { class: 'textlink' }));
  let fg;
  if (done && d1) {
    fg = [h('p', { class: 'eyebrow', text: tf('stopDone', { n: done.order }) }), h('h1', { text: T().tryEnd }),
      next ? h('p', { class: 'lede', text: tf('nextNeedsBook', { n: next.order, title: next.title }) }) : null,
      h('div', { class: 'btn-row' }, link('/app/start/book', T().getBook, { class: 'btn btn-primary' }), ext(SIGNUP_URL(), T().devoCta, { class: 'btn btn-secondary devo-link' })), back];
  } else if (done && next) {
    document.title = `${tf('stopDone', { n: done.order })} | Steps`;
    fg = [h('p', { class: 'eyebrow', text: tf('stopDone', { n: done.order }) }), h('h1', { text: T().stopDoneHeading }),
      h('p', { class: 'lede', text: T().stopDoneWarm }),
      h('div', { class: 'btn-row' }, link(`/app/stop/${next.id}/read`, tf('goToStop', { n: next.order, title: next.title }), { class: 'btn btn-primary btn-next' })), devoMention(), back];
  } else if (done) {
    document.title = `${T().routeDone} | Steps`;
    fg = [h('p', { class: 'eyebrow', text: tf('stopDone', { n: done.order }) }), h('h1', { text: T().routeDone }),
      h('p', { class: 'lede', text: T().routeDoneWarm }),
      h('div', { class: 'btn-row' }, link('/app/route', T().seeRoute, { class: 'btn btn-primary btn-next' })), devoMention(), back];
  } else {
    fg = [h('h1', { text: d1 ? T().tryEnd : fromShare ? T().shareSendoff : T().sendoff }),
      d1 ? h('div', { class: 'btn-row' }, link('/app/start/book', T().getBook, { class: 'btn btn-primary' }), ext(SIGNUP_URL(), T().devoCta, { class: 'btn btn-secondary devo-link' })) : null,
      !d1 && !fromShare && stop.screens[screen] ? h('p', { class: 'lede quiet-light', text: tf('upNextIn', { n: stop.order, screen: SCREEN_NAMES[screen] }) }) : null,
      back];
  }
  mount(h('main', { class: 'dark full sendoff' }, h('div', { class: 'bg' }, img(stopImg(next || stop) || c.img.items.door1, { eager: true, altOverride: '' })), topbar(),
    h('div', { class: 'fg' }, ...fg)));
  document.querySelector('.btn-next')?.focus({ preventScroll: true });
}

// ---------- My steps (L1) ----------
async function viewSteps() {
  document.title = 'My steps | Steps';
  const steps = (await db.all('steps')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const out = { traded: 'Traded', buried: 'Buried', 'holy-wait': 'Holy wait' };
  mount(h('main', { class: 'page' }, topbar({ back: '/app/' }), h('div', { class: 'sheet' }, h('div', { class: 'sheet-inner' },
    h('h1', { class: 'h1', text: 'My steps' }),
    steps.length ? h('ol', { class: 'timeline' }, steps.map((st) => { const stop = C.stopById(c, st.stopId);
      return h('li', {}, h('p', { class: 'step', style: 'margin:0', text: st.text }),
        h('p', { class: 'meta', style: 'margin:4px 0 0', text: `Stop ${stop?.order}, ${stop ? C.chapterLabel(stop) : ''}. By ${fmtDay(st.dueDate)}.${st.doneAt ? ' Taken.' : ''}${st.outcome ? ' ' + out[st.outcome] + '.' : ''}` })); }))
      : h('p', { class: 'prose', text: c.door1.home?.noStepYet || 'No steps yet.' })))));
}

// ---------- Share cards ----------
async function viewShare() {
  document.title = 'Share a card | Steps';
  const q = new URLSearchParams(location.search);
  const have = prof?.door === 'have';
  const kinds = [['step', 'Step'], ['verse', 'Verse'], ['quote', 'Book quote'], ['stop', 'Stop finished'], ['walk', 'Walk with me']].filter(([k]) => have || !['step', 'stop'].includes(k));
  let kind = kinds.some(([k]) => k === q.get('card')) ? q.get('card') : kinds[0][0];
  let size = share.SIZES[q.get('size')] ? q.get('size') : 'post';
  let quoteIdx = Number(q.get('q') || 0);
  const stop = C.stopById(c, q.get('stop')) || nextScreen().stop;
  const cards = Array.isArray(c.share) ? c.share : c.share.cards;
  const vow = C.verseOfWeek(c) || { text: stop.screens.pulse.verses[0]?.text, ref: stop.screens.pulse.verses[0]?.ref, stop };
  const tags = { step: 'card-step', verse: 'card-verse', quote: 'card-quote', stop: 'card-stop', walk: 'invite-walk' };
  const publicLine = h('input', { id: 'pub', type: 'text', maxlength: '80', autocomplete: 'off' });
  const canvasBox = h('div'); const meta = h('p', { class: 'help', 'aria-live': 'polite' }); const draftNote = h('div');
  const pubWrap = h('div', { class: 'field' }, h('label', { for: 'pub' }, 'A public line ', h('span', {}, '(optional, 80 characters)')), publicLine, h('p', { class: 'help', text: 'Only what you type here goes on the card. Your journal never does.' }));
  const anotherQuote = h('p', {}, h('button', { class: 'textlink', type: 'button', onclick: () => { quoteIdx++; draw(); } }, 'Another quote'));
  // PRIVACY: card text comes only from content files, the stop title, and the optional public line typed above.
  const cardData = () => {
    const ch = C.chapterNum(stop); const chLabel = /^\d+$/.test(ch) ? `Chapter ${ch}` : `the ${ch}`;
    if (kind === 'step') return { kind, headline: `I took my ${chLabel} step: ${stop.title}.`, sub: publicLine.value.trim() || null, plate: c.img.items['share-road'] };
    if (kind === 'stop') return { kind, headline: `I finished Stop ${stop.order}: ${stop.title}.`, plate: c.img.items['share-road'] };
    if (kind === 'verse') return { kind, headline: vow.text, sub: `${vow.ref} (ESV). From ${vow.stop ? C.chapterLabel(vow.stop) : 'a chapter'} of Faith in Motion`, plate: c.img.items['share-water'] };
    if (kind === 'quote') { const cd = cards[quoteIdx % cards.length]; return { kind, headline: cd.quote, sub: cd.attribution.replace(/\s*faithinmotionbook\.com\/app\s*$/, ''), plate: c.img.items['share-water'] }; }
    return { kind, headline: (c.wwm?.cardLines || ["I'm taking one step a week with Faith in Motion.", 'Walk with me?']).join(' '), plate: c.img.items['share-walk'] };
  };
  let current;
  async function draw() {
    draftNote.replaceChildren(kind !== 'walk' ? '' : draftPill('Walk with me invite') || (!c.config.inviteCopyApproved && C.isPreviewHost() ? h('span', { class: 'draft-note', text: T().draftCopy }) : ''));
    pubWrap.hidden = kind !== 'step'; anotherQuote.hidden = kind !== 'quote';
    const data = { ...cardData(), coverSrc: '/app/img/cover-480.webp' };
    current = await share.render(data, size);
    Object.assign(current.canvas, { className: 'preview-canvas' });
    current.canvas.setAttribute('role', 'img'); current.canvas.setAttribute('aria-label', `Card preview: ${data.headline}`);
    canvasBox.replaceChildren(current.canvas);
    meta.textContent = `${share.SIZES[size].join(' by ')} pixels. Text contrast ${current.contrast.toFixed(1)} to 1.`;
    window.__lastCard = { kind, size, w: current.canvas.width, h: current.canvas.height, contrast: current.contrast, headline: data.headline, sub: data.sub || '', link: `${c.config.appUrl}?src=${tags[kind]}` };
  }
  const chipRow = (opts, getv, setv, label) => { const row = h('div', { class: 'chips', role: 'group', 'aria-label': label });
    opts.forEach(([k, l]) => row.append(h('button', { type: 'button', class: 'chip', 'data-k': k, 'aria-pressed': String(getv() === k), onclick: (e) => { setv(k); row.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', 'false')); e.currentTarget.setAttribute('aria-pressed', 'true'); draw(); } }, l))); return row; };
  publicLine.addEventListener('input', debounce(draw, 300));
  mount(h('main', { class: 'page' }, topbar({ back: have ? '/app/' : '/app/start' }), h('div', { class: 'sheet' }, h('div', { class: 'sheet-inner' },
    h('h1', { class: 'h1', text: 'Share a card' }),
    h('p', { class: 'legend', text: 'Card' }), chipRow(kinds, () => kind, (v) => { kind = v; }, 'Card'),
    h('p', { class: 'legend', text: 'Size' }), chipRow(Object.entries(share.SIZE_LABELS), () => size, (v) => { size = v; }, 'Size'),
    pubWrap, draftNote, anotherQuote, canvasBox, meta,
    h('div', { class: 'btn-row' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: async () => {
      const url = `${c.config.appUrl}?src=${tags[kind]}`;
      const text = kind === 'walk' ? (c.wwm?.shareText || 'Walk with me?') : 'Faith in Motion by Herman Davis.';
      const r = await share.shareCanvas(current.canvas, `faith-in-motion-${kind}-${size}.png`, text, url);
      if (r !== 'cancelled') go('/app/sendoff?share=1');
    } }, 'Share or download'))))));
  await draw();
}

// ---------- Testimony ----------
function viewTestimony() {
  document.title = 'Send a testimony | Steps';
  const t = c.testimony; const byName = Object.fromEntries((t.fields || []).map((f) => [f.name, f]));
  const L = { testimony: byName.story || byName.testimony || { label: 'What changed when you took your step?' }, first_name: byName.name || byName.first_name || { label: 'First name' },
    city: byName.city || { label: 'City' }, email: byName.email || { label: 'Email', help: 'Only so Herman can reply. Never shown publicly.' },
    share_ok: byName.consent || byName.share_ok || { label: 'Herman may share my words publicly, with my first name and city if I gave them.' } };
  const stopId = new URLSearchParams(location.search).get('stop') || 'menu';
  const status = h('p', { class: 'help', role: 'status', 'aria-live': 'polite' });
  const fld = (id, field, input, optional) => { if (field.help) input.setAttribute('aria-describedby', id + '-help');
    return h('div', { class: 'field' }, h('label', { for: id }, field.label, optional ? h('span', {}, ' (optional)') : null), input, field.help ? h('p', { class: 'help', id: id + '-help', text: field.help }) : null); };
  const form = h('form', { name: 'testimony', method: 'POST', 'data-netlify': 'true', 'netlify-honeypot': '_honey', novalidate: true },
    h('input', { type: 'hidden', name: 'form-name', value: 'testimony' }), h('input', { type: 'hidden', name: 'stop', value: stopId }), h('input', { type: 'hidden', name: 'source', value: 'app' }),
    h('p', { class: 'honey', 'aria-hidden': 'true' }, h('label', {}, 'Leave empty ', h('input', { type: 'text', name: '_honey', tabindex: '-1', autocomplete: 'off' }))),
    fld('t-story', L.testimony, h('textarea', { id: 't-story', name: 'testimony', maxlength: '2000', required: true })),
    fld('t-name', L.first_name, h('input', { id: 't-name', type: 'text', name: 'first_name', autocomplete: 'given-name', maxlength: '80' }), !/optional/i.test(L.first_name.help || '')),
    fld('t-city', L.city, h('input', { id: 't-city', type: 'text', name: 'city', autocomplete: 'address-level2', maxlength: '80' }), true),
    fld('t-email', L.email, h('input', { id: 't-email', type: 'email', name: 'email', autocomplete: 'email', inputmode: 'email', maxlength: '120' }), !/optional/i.test(L.email.help || '')),
    draftPill('Testimony consent wording'), h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'share_ok', value: 'yes' }), h('span', { class: 'box', 'aria-hidden': 'true' }, s('svg', { viewBox: '0 0 24 24', width: '20', height: '20' }, s('path', { d: 'M5 12.5l4.5 4.5L19 7' }))), h('span', { text: L.share_ok.label })),
    L.share_ok.help ? h('p', { class: 'help', text: L.share_ok.help }) : null,
    t.privacyNote ? h('p', { class: 'fineprint', text: t.privacyNote }) : null,
    h('button', { type: 'submit', class: 'btn btn-primary' }, t.submit || 'Send'), status);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const story = form.testimony.value.trim(); const email = form.email.value.trim();
    let ok = true;
    if (!story) { fieldError(form.testimony, 'Write a few sentences about what changed.'); ok = false; } else fieldError(form.testimony, null);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fieldError(form.email, 'Check the email address, or leave it empty.'); ok = false; } else fieldError(form.email, null);
    if (!ok) { form.querySelector('[aria-invalid=true]')?.focus(); return; }
    // PRIVACY: posted fields are exactly what the reader typed into this form. No journal data is added.
    const fields = { testimony: story, first_name: form.first_name.value.trim(), city: form.city.value.trim(), email, stop: stopId, source: 'app', _honey: form._honey.value };
    if (form.share_ok.checked) fields.share_ok = 'yes';
    const r = await forms.submit('testimony', fields);
    if (r === 'queued') { status.textContent = t.offline || T().queued; return; }
    thanks(story);
  });
  const thanks = (story) => {
    const ty = t.thankYou || {};
    mount(h('main', { class: 'page' }, topbar({ back: '/app/' }), h('div', { class: 'sheet' }, h('div', { class: 'sheet-inner' },
      h('h1', { class: 'h1', text: T().testimonyThanks }), h('div', { class: 'prose' }, paras(ty.body)),
      h('h2', { class: 'heading', text: T().amazonAlso }),
      h('div', { class: 'btn-row' }, ext(c.config.reviewKindleUrl, ty.reviewKindle || 'Review the Kindle edition', { class: 'btn btn-secondary' }), ext(c.config.reviewPaperbackUrl, ty.reviewPaperback || 'Review the paperback', { class: 'btn btn-secondary' }),
        h('button', { class: 'btn btn-secondary', type: 'button', onclick: async (e) => { const b = e.currentTarget; try { await navigator.clipboard.writeText(story); b.textContent = 'Copied'; } catch { b.textContent = 'Copy not available here'; } } }, ty.copyWords || 'Copy my words')),
      ty.takedown ? h('p', { class: 'fineprint', text: ty.takedown }) : null,
      h('p', { style: 'margin-top:20px' }, link('/app/sendoff?share=1', ty.close || T().shareSendoff, { class: 'textlink' }))))));
    announce(T().testimonyThanks);
  };
  mount(h('main', { class: 'page' }, topbar({ back: '/app/' }), h('div', { class: 'sheet' }, h('div', { class: 'sheet-inner' },
    h('h1', { class: 'h1', text: t.heading }), t.intro ? h('p', { style: 'font-family:var(--f-read);font-size:21px', text: t.intro }) : null, form))));
}

// ---------- Backup (local file only; nothing uploaded) ----------
function viewBackup() {
  document.title = 'Backup and restore | Steps';
  const status = h('div', { role: 'status', 'aria-live': 'polite' });
  const doExport = async () => {
    const data = await db.exportAll(); // no outbox
    const payload = { app: 'faith-in-motion-steps', schemaVersion: 1, exportedAt: new Date().toISOString(), data };
    const r = await ics.shareOrDownload(JSON.stringify(payload, null, 1), `faith-in-motion-steps-backup-${todayISO()}.json`, 'application/json', { preferDownload: true });
    if (r !== 'cancelled') toast(r === 'shared' ? 'Backup shared.' : 'Backup saved to your downloads.');
  };
  const fileIn = h('input', { type: 'file', id: 'bk-file', accept: 'application/json,.json' });
  fileIn.addEventListener('change', async () => {
    const file = fileIn.files[0]; if (!file) return;
    let j; try { j = JSON.parse(await file.text()); } catch { status.replaceChildren(h('p', { class: 'err', text: "This file isn't a backup from Steps (it isn't valid JSON). Nothing changed." })); toast('Import failed. Nothing changed.'); return; }
    const problems = validateBackup(j);
    if (problems.length) { status.replaceChildren(h('p', { class: 'err', text: `This backup can't be used: ${problems.join('; ')}. Nothing changed.` })); toast('Import failed. Nothing changed.'); return; }
    const answered = (j.data.stopProgress || []).filter((p) => Object.keys(p.visited || {}).length || p.readAt || p.move?.doneAt).length;
    const when = new Date(j.exportedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    status.replaceChildren(h('div', { class: 'card' }, h('p', { style: 'font-weight:600', text: `Backup from ${when}: answers for ${answered} ${answered === 1 ? 'stop' : 'stops'}.` }),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn btn-secondary', type: 'button', onclick: doExport }, 'Save a backup of this phone first'),
        h('button', { class: 'btn btn-primary', type: 'button', onclick: async () => {
          if (!confirm("Replace this phone's answers with the backup? This can't be undone.")) return;
          await db.replaceAll(j.data); toast('Backup restored.'); go('/app/');
        } }, T().replace))));
  });
  mount(h('main', { class: 'page' }, topbar({ back: '/app/' }), h('div', { class: 'sheet' }, h('div', { class: 'sheet-inner' },
    h('h1', { class: 'h1', text: 'Backup and restore' }),
    h('p', { style: 'font-family:var(--f-read);font-size:21px', text: account.signedIn() ? "You're signed in, so your answers are encrypted and synced to your account. A backup is a file you save yourself, kept wherever you put it." : 'Your answers live in this browser on this phone unless you sign in to sync. A backup is a file you save yourself. Nothing is uploaded.' }),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: doExport }, T().exportBtn)),
    h('div', { class: 'field', style: 'margin-top:28px' }, h('label', { for: 'bk-file', text: T().importBtn }), fileIn), status))));
}
function validateBackup(j) {
  const p = [];
  if (!j || typeof j !== 'object') return ['it is not a backup object'];
  if (j.app !== 'faith-in-motion-steps') p.push('it is not from Faith in Motion: Steps');
  if (j.schemaVersion !== 1) p.push(`unknown version ${j.schemaVersion}`);
  const d = j.data;
  if (!d || typeof d !== 'object') p.push('the data section is missing');
  else {
    if (d.profile != null && typeof d.profile !== 'object') p.push('profile is not an object');
    for (const k of ['stopProgress', 'steps', 'motionChecks']) if (d[k] !== undefined && !Array.isArray(d[k])) p.push(`${k} is not a list`);
    if (Array.isArray(d.stopProgress) && d.stopProgress.some((x) => !x || typeof x.stopId !== 'string')) p.push('a stop record has no stopId');
    if (Array.isArray(d.steps) && d.steps.some((x) => !x || typeof x.id !== 'string' || typeof x.stopId !== 'string')) p.push('a step record is missing its id');
    if (Array.isArray(d.motionChecks) && d.motionChecks.some((x) => !x || typeof x.month !== 'string')) p.push('a motion check has no month');
  }
  return p;
}


// ---------- Account and sync (optional) ----------
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'not yet');
const AUTH_ERRORS = { 'rate-limited': 'Too many tries. Wait a few minutes, then try again.', 'bad-email': 'Enter an email address like name@example.com.',
  'bad-code': 'Enter the 6-digit code from the email.', INVALID_OTP: "That code didn't work. Check the email and try again.", OTP_EXPIRED: 'That code expired. Ask for a new one.',
  TOO_MANY_ATTEMPTS: 'Too many tries with that code. Ask for a new one.', TOO_MANY_REQUESTS: 'Too many tries. Wait a few minutes, then try again.', 'http-429': 'Too many tries. Wait a few minutes, then try again.' };
const authMsg = (e) => AUTH_ERRORS[e.message] || (navigator.onLine ? "Something went wrong. Try again in a minute." : "You're offline. Connect to sign in.");
function viewAccount() {
  document.title = 'Account and sync | Steps';
  const st = account.state();
  const sheet = h('div', { class: 'sheet-inner' });
  mount(h('main', { class: 'page' }, topbar({ back: '/app/' }), h('div', { class: 'sheet' }, sheet)));
  const privacy = [h('p', { class: 'acct-privacy', text: T().noAccount }), draftPill('Privacy wording')];
  if (!st?.userId || st.needsSignIn) {
    const status = h('p', { class: 'help', role: 'status', 'aria-live': 'polite' });
    const email = h('input', { id: 'acct-email', type: 'email', name: 'email', autocomplete: 'email', inputmode: 'email', maxlength: '120', value: st?.email || '' });
    const code = h('input', { id: 'acct-code', type: 'text', name: 'code', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '8', pattern: '[0-9]*' });
    const codeBox = h('div', { hidden: true },
      h('div', { class: 'field' }, h('label', { for: 'acct-code', text: 'Code from the email' }), code, h('p', { class: 'help', text: "It can take a minute to arrive. Check spam if you don't see it." })),
      h('div', { class: 'btn-row' }, h('button', { type: 'submit', class: 'btn btn-primary', 'data-step': 'verify' }, 'Sign in'),
        h('button', { type: 'button', class: 'btn btn-secondary', onclick: () => send(true) }, 'Send a new code')));
    const sendBtn = h('button', { type: 'submit', class: 'btn btn-primary', 'data-step': 'send' }, 'Email me a code');
    let phase = 'send';
    async function send(resend) {
      const v = email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { fieldError(email, 'Enter an email address like name@example.com.'); email.focus(); return; }
      fieldError(email, null); status.textContent = 'Sending...';
      try { await account.sendCode(v); phase = 'verify'; codeBox.hidden = false; sendBtn.hidden = true; status.textContent = `We sent a code to ${v}.`; code.focus(); }
      catch (e) { status.textContent = authMsg(e); }
    }
    const form = h('form', { class: 'acct-form', novalidate: true },
      h('div', { class: 'field' }, h('label', { for: 'acct-email', text: 'Your email' }), email),
      h('div', { class: 'btn-row' }, sendBtn), codeBox, status);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (phase === 'send') return send();
      const v = code.value.replace(/\s/g, '');
      if (!/^\d{4,10}$/.test(v)) { fieldError(code, 'Enter the 6-digit code from the email.'); code.focus(); return; }
      fieldError(code, null); status.textContent = 'Signing in...';
      try { const u = await account.verifyCode(email.value.trim(), v); prof = await db.profile();
        sessionStorage.setItem('fim-just-signed-in', u.pulled ? 'loaded' : u.synced ? 'empty' : 'pending');
        viewAccount(); announce(u.pulled ? T().loadedHere : 'Signed in. Your journal is syncing.'); }
      catch (err) { status.textContent = authMsg(err); }
    });
    ap(sheet, h('h1', { class: 'h1', text: st?.needsSignIn ? 'Sign in again' : 'Use Steps on any device' }),
      h('p', { class: 'prose', text: st?.needsSignIn ? 'Your sign-in expired. Sign in again to keep syncing. Nothing on this phone was lost.' : 'Signing in is optional. Steps works fully without an account, even offline. Sign in with your email to keep your journal on every device you use.' }),
      ...privacy, form,
      h('p', { class: 'fineprint', text: 'No password. We email you a one-time code. Your email is used only to sign you in.' }),
      st?.needsSignIn ? null : h('section', { class: 'acct-howto', 'aria-labelledby': 'howto-h' },
        h('h2', { id: 'howto-h', class: 'heading', text: T().howtoHeadingOut }), h('p', { text: T().howtoOut })));
    return;
  }
  const syncLine = h('p', { class: 'sync-line', role: 'status', 'aria-live': 'polite' });
  const paint = () => { const s = account.state(); if (!s) return;
    syncLine.textContent = !navigator.onLine ? "You're offline. Changes are saved on this phone and will sync when you're back online."
      : s.syncState === 'syncing' ? 'Syncing...' : s.syncState === 'error' ? (s.syncError === 'busy' ? 'Sync is busy. It will try again soon.' : "Couldn't sync just now. It will try again.")
      : s.lastSyncAt && Date.now() - Date.parse(s.lastSyncAt) < 60000 ? 'Synced just now.' : `Synced. Last sync ${fmtTime(s.lastSyncAt)}.`; };
  paint(); const onAcct = () => paint(); addEventListener('fim-account', onAcct); addEventListener('online', onAcct); addEventListener('offline', onAcct);
  const tick = setInterval(() => { if (!syncLine.isConnected) clearInterval(tick); else paint(); }, 20000);
  const just = sessionStorage.getItem('fim-just-signed-in'); sessionStorage.removeItem('fim-just-signed-in');
  const loaded = just === 'loaded' ? h('div', { class: 'acct-loaded', role: 'status' }, h('p', { class: 'acct-loaded-title', text: T().loadedHere }), h('p', { text: T().loadedHereMore }),
      h('div', { class: 'btn-row' }, link('/app/', T().openJournal, { class: 'btn btn-primary' })))
    : just ? h('div', { class: 'acct-loaded', role: 'status' }, h('p', { class: 'acct-loaded-title', text: T().signedInFresh })) : null;
  const howto = h('section', { class: 'acct-howto', 'aria-labelledby': 'howto-h' },
    h('h2', { id: 'howto-h', class: 'heading', text: T().howtoHeadingIn }),
    h('ol', { class: 'howto-steps' },
      h('li', {}, tf('howtoIn1', { url: `${location.host}/app` })), h('li', { text: T().howtoIn2 }),
      h('li', {}, tf('howtoIn3', { email: st.email })), h('li', { text: T().howtoIn4 })));
  const erase = h('input', { type: 'checkbox', id: 'acct-erase', checked: true });
  const delStatus = h('p', { class: 'help', role: 'status', 'aria-live': 'polite' });
  ap(sheet, h('h1', { class: 'h1', text: 'Account and sync' }),
    loaded, h('p', { class: 'acct-who' }, 'Signed in as ', h('strong', { text: st.email })), syncLine, ...privacy,
    h('div', { class: 'btn-row' }, h('button', { type: 'button', class: loaded && just === 'loaded' ? 'btn btn-secondary' : 'btn btn-primary', onclick: async () => { await account.syncNow(); paint(); } }, 'Sync now'),
      link('/app/backup', 'Save a backup file', { class: 'btn btn-secondary' })),
    howto,
    h('p', {}, h('button', { type: 'button', class: 'textlink', onclick: async () => { await account.signOut(); viewAccount(); announce('Signed out. Your journal is still on this phone.'); } }, 'Sign out')),
    h('p', { class: 'help', text: 'Signing out keeps your journal on this phone. It stops syncing until you sign in again.' }),
    h('section', { class: 'danger-zone', 'aria-labelledby': 'del-h' },
      h('h2', { id: 'del-h', class: 'heading', text: 'Delete my account and data' }),
      h('p', { text: 'This permanently deletes your account and every synced answer from our server. It cannot be undone. Save a backup file first if you want a copy.' }),
      h('label', { class: 'check' }, erase, h('span', { class: 'box', 'aria-hidden': 'true' }, s('svg', { viewBox: '0 0 24 24', width: '20', height: '20' }, s('path', { d: 'M5 12.5l4.5 4.5L19 7' }))), h('span', { text: 'Also erase the journal on this phone' })),
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn btn-secondary btn-delete', onclick: async () => {
        if (!confirm('Delete your account and all synced data? This cannot be undone.')) return;
        delStatus.textContent = 'Deleting...';
        try { const r = await account.deleteAccount({ eraseLocal: erase.checked }); removeEventListener('fim-account', onAcct); prof = await db.profile();
          sheet.replaceChildren(h('h1', { class: 'h1', text: 'Account deleted' }), h('p', { class: 'prose', text: `Your account and ${r.items} synced ${r.items === 1 ? 'answer' : 'answers'} were deleted from our server.${erase.checked ? ' This phone was erased too.' : ' Your journal is still on this phone.'}` }),
            h('div', { class: 'btn-row' }, link('/app/', 'Back to the app', { class: 'btn btn-primary' }))); announce('Account deleted.'); }
        catch (e) { delStatus.textContent = navigator.onLine ? "Couldn't delete right now. Nothing was removed. Try again." : "You're offline. Connect to delete your account."; }
      } }, 'Delete my account and data')), delStatus));
}

// ---------- About ----------
function viewAbout() {
  document.title = 'About | Steps';
  mount(h('main', { class: 'page' }, topbar({ back: '/app/' }), h('div', { class: 'sheet' }, h('div', { class: 'sheet-inner' },
    h('h1', { class: 'h1', text: c.door1.about?.heading || 'About' }),
    h('div', { class: 'prose' }, paras(c.door1.about?.body || '')),
    h('p', { style: 'font-weight:600', text: T().aboutPrivacy }), draftPill('Privacy wording'),
    h('p', {}, link('/app/account', account.signedIn() ? 'Account and sync' : 'Sign in to use Steps on any device', { class: 'textlink' })),
    h('h2', { class: 'heading', text: T().devoAboutHeading }), devoMention('prose'),
    h('h2', { class: 'heading', text: 'Scripture' }), h('p', { class: 'esv', text: c.esv }),
    h('h2', { class: 'heading', text: 'Photography' }),
    h('ul', { class: 'timeline' }, c.credits.map((cr) => h('li', { style: 'padding:10px 0' }, `${cr.photographer}, `, ext(cr.pageUrl, `Pexels photo ${cr.pexelsId}`), h('span', { class: 'meta', text: ` (${cr.slot}). ${cr.license}.` })))),
    h('p', { class: 'help' }, ext('https://www.pexels.com/license/', 'Pexels License')),
    h('h2', { class: 'heading', text: 'Version' }),
    h('p', { class: 'help', text: `App ${APP_VERSION}. Content ${c.version?.hash || ''} (${c.manifest.version || ''}).` }),
    h('p', {}, h('button', { class: 'textlink', type: 'button', onclick: openHelpNow }, c.helpNow?.menuLabel || 'Need help now?'))))));
}

// ---------- Service worker ----------
function applyUpdate() { if (journaling) return; swReg?.waiting?.postMessage({ skipWaiting: true }); }
async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    swReg = await navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' });
    const mark = () => { if (swReg.waiting && navigator.serviceWorker.controller) { updateWaiting = true; if (!journaling && (location.pathname.replace(/\/$/, '') === '/app')) render(); } };
    mark();
    swReg.addEventListener('updatefound', () => { const w = swReg.installing; w?.addEventListener('statechange', () => { if (w.state === 'installed') mark(); }); });
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (updateWaiting && !reloaded) { reloaded = true; location.reload(); } });
  } catch { /* unsupported or offline first load */ }
}

// ---------- Boot ----------
(async function boot() {
  c = await C.load();
  c.helpNow = await fetch('/app/content/' + (c.manifest.helpNow?.file || 'help-now.json')).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (new URLSearchParams(location.search).get('src')?.startsWith('invite') && !(await db.profile())?.door) history.replaceState({}, '', '/app/start' + location.search);
  await render();
  forms.startRetries();
  account.start();
  addEventListener('fim-remote-change', () => { if (!journaling && !document.querySelector('.bsheet.on') && !/^\/app\/(account|backup|testimony|share)/.test(location.pathname)) render(); });
  registerSW();
})();
