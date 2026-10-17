// .ics generation: CRLF line endings, floating local times (no TZID), UID per step, DTSTAMP, VALARM at start.
const pad = (n) => String(n).padStart(2, '0');
const local = (d, hh) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(hh)}0000`;
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (t) => String(t).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => '\\' + m);
function fold(line) { const out = []; while (line.length > 74) { out.push(line.slice(0, 74)); line = ' ' + line.slice(74); } out.push(line); return out.join('\r\n'); }
function ev({ uid, start, summary, description, rrule }) {
  return ['BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${stamp()}`, `DTSTART:${start}`, `DURATION:PT15M`, rrule ? `RRULE:${rrule}` : null,
    `SUMMARY:${esc(summary)}`, description ? `DESCRIPTION:${esc(description)}` : null,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(summary)}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'].filter(Boolean);
}
function wrap(events) {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Faith in Motion//Steps//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...events.flat(), 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
}
export function stepIcs(step) {
  const [y, m, d] = step.dueDate.split('-').map(Number);
  const due = new Date(y, m - 1, d); const later = new Date(y, m - 1, d + 3);
  return wrap([
    ev({ uid: `${step.id}-due@faithinmotionbook.com`, start: local(due, 8), summary: 'Faith in Motion: take your step', description: `${step.text}\nOpen the app: https://faithinmotionbook.com/app/` }),
    ev({ uid: `${step.id}-redate@faithinmotionbook.com`, start: local(later, 8), summary: 'Faith in Motion: new date for your step?', description: 'Open the app: https://faithinmotionbook.com/app/' }),
  ]);
}
export function sundayIcs() {
  const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return wrap([ev({ uid: `sunday-review@faithinmotionbook.com`, start: local(d, 16), summary: 'Faith in Motion: traded or buried?', description: 'Open the app: https://faithinmotionbook.com/app/', rrule: 'FREQ=WEEKLY;BYDAY=SU' })]);
}
export async function shareOrDownload(text, filename, type = 'text/calendar', { preferDownload = false } = {}) {
  const file = new File([text], filename, { type });
  if (!preferDownload && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancelled'; }
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}
