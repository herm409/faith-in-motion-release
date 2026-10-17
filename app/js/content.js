// Loads app/content/* (synced from Author Desk) and app/config.json.
const DEFAULT_STRINGS = {
  haveBook: 'I have the book', noBook: "I don't have the book yet", noAccount: 'Your journal is private to you. If you sign in, it is encrypted and synced so you can use it on any device. It is never shown to anyone else, shared, or sold.',
  getBook: 'Get the book', iHaveIt: 'I have it', readIt: "I've read it", saved: 'Saved on this phone', tookStep: 'I took my step',
  newDate: 'I need a new date', addCalendar: 'Add to my calendar', textPartner: 'Text my partner', giftCopy: 'Gift a copy',
  walkWithMe: 'Walk with me', hardDay: 'Hard day?', sendoff: 'Close the app and go take your step.', backToday: 'Back to today',
  install: 'Install Steps', notNow: 'Not now', queued: "Saved. It will send when you're back online.", exportBtn: 'Export my answers',
  importBtn: 'Restore from a backup', replace: "Replace this phone's data",
  appAsks: 'The app asks the questions. The book gives the teaching.',
  twelveStops: 'Twelve stops, one for each part of the book.',
  tryEnd: 'The rest of the roadmap walks through each chapter. Get the book to begin.',
  shareSendoff: 'Now close the app and take your step.',
  giftLine: 'On Amazon, choose Buy for others.',
  hardDayDefaultHeading: 'Hard day',
  hardDayDefaultBody: "If you can't take a step this week, your task is honesty and one trusted believer.",
  hardDayDefaultRead: "Read Chapter 8, A Pastoral Word to the Sincerely Stuck, or Chapter 10, A Pastoral Word to the 'One-Talent' Heart.",
  iosInstall: 'Install Steps on your iPhone: tap the Share button, then Add to Home Screen.',
  dueToday: 'Your step is due today.', inMotion: 'In motion this week', updated: "Updated. Reload when you're ready.",
  aboutPrivacy: 'Your journal is private to you. If you sign in, it is encrypted and synced so you can use it on any device. It is never shown to anyone else, shared, or sold.',
  byWhen: 'I will do it by:', newDateLabel: 'Pick a new date within 3 days.',
  testimonyThanks: 'Thank you. Herman reads every one.', amazonAlso: 'Also post this as an Amazon review',
  notifySuccess: "You're on the list. The first Midday Step arrives soon.", draftCopy: 'Draft copy',
  sundayAsk: 'Traded or buried?', pickNext: "Pick next week's step",
};
let cache;
async function j(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}
async function maybe(path) { try { return await j(path); } catch { return null; } }
export async function load() {
  if (cache) return cache;
  const version = await maybe('/app/content/version.json');
  const has = (f) => !version || (version.files || []).includes(f);
  const opt = (f) => (has(f) ? maybe('/app/content/' + f) : Promise.resolve(null));
  const [manifest, config, door1, share, testimony, vow, wwm, ui, img, credits, esv] = await Promise.all([
    j('/app/content/manifest.json'), j('/app/config.json'), j('/app/content/door1-preview.json'), j('/app/content/share-cards.json'),
    j('/app/content/testimony-form.json'), opt('verse-of-week.json'), opt('walk-with-me.json'), opt('ui-strings.json'),
    j('/app/img/manifest.json'), j('/app/img/credits.json'), fetch('/app/content/esv-notice.txt').then((r) => r.text()),
  ]);
  const stops = await Promise.all(manifest.stops.map((s) => j('/app/content/' + s.file)));
  stops.sort((a, b) => a.order - b.order);
  cache = { manifest, config, door1, share, testimony, vow, wwm, version, img, credits, esv: esv.trim(), stops,
    strings: { ...DEFAULT_STRINGS, ...(ui || {}) }, hasUiStrings: !!ui };
  return cache;
}
export const SCREENS = ['read', 'pulse', 'nameIt', 'build', 'move', 'help', 'pray', 'review'];
export const SCREEN_NAMES = { read: 'Read', pulse: 'Pulse', nameIt: 'Name it', build: 'Build', move: 'Move', help: 'Help', pray: 'Pray', review: 'Review' };
export function stopById(c, id) { return c.stops.find((s) => s.id === id); }
export function chapterNum(stop) {
  const m = /Chapter (\d+)/.exec(stop.chapterRef || ''); if (m) return m[1];
  return stop.order === 0 ? 'Introduction' : stop.order === 11 ? 'Conclusion' : String(stop.order);
}
export function chapterLabel(stop) {
  const n = chapterNum(stop); return /^\d+$/.test(n) ? `Chapter ${n}` : n;
}
// Verse of the week: ISO week number, week 53 folds to 52. Text is looked up in the named stop (not repeated in the file).
export function verseOfWeek(c, date = new Date()) {
  if (!c.vow) return null;
  const weeks = Array.isArray(c.vow) ? c.vow : c.vow.weeks;
  if (!weeks || !weeks.length) return null;
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  let wk = Math.ceil(((d - yearStart) / 86400000 + 1) / 7); if (wk > 52) wk = 52;
  const w = weeks.find((x) => x.week === wk) || weeks[(wk - 1) % weeks.length];
  let text = w.text, stop = stopById(c, w.stopId);
  if (!text && stop) {
    for (const sc of Object.values(stop.screens)) { const v = (sc.verses || []).find((x) => x.ref === w.ref); if (v) { text = v.text; break; } }
  }
  if (!text) return null;
  return { ref: w.ref, text, readIn: w.readIn || w.chapterRef || (stop && stop.chapterRef) || '', stop };
}
export function isPreviewHost() {
  const h = location.hostname; return h.includes('--') || h.includes('netlify.app') || h === 'localhost' || h === '127.0.0.1';
}
