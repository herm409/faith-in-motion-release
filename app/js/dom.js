// DOM helpers. Content strings always go in with textContent, never innerHTML.
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const SVGNS = 'http://www.w3.org/2000/svg';
export function s(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v !== null && v !== undefined) el.setAttribute(k, v);
  for (const kid of kids.flat()) if (kid) el.append(kid);
  return el;
}
export function paras(text, cls) {
  return String(text || '').split(/\n\n+/).filter(Boolean).map((p) => h('p', { class: cls }, p));
}
export function announce(msg) {
  const a = document.getElementById('announce');
  if (a) { a.textContent = ''; setTimeout(() => { a.textContent = msg; }, 30); }
}
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Phosphor Light icons (MIT), paths at 256 viewBox.
const P = {
  list: 'M40,128a8,8,0,0,1,8-8H208a8,8,0,0,1,0,16H48A8,8,0,0,1,40,128ZM48,72H208a8,8,0,0,0,0-16H48a8,8,0,0,0,0,16ZM208,184H48a8,8,0,0,0,0,16H208a8,8,0,0,0,0-16Z',
  x: 'M204.24,195.76a6,6,0,1,1-8.48,8.48L128,136.49,60.24,204.24a6,6,0,0,1-8.48-8.48L119.51,128,51.76,60.24a6,6,0,0,1,8.48-8.48L128,119.51l67.76-67.75a6,6,0,0,1,8.48,8.48L136.49,128Z',
  back: 'M222,128a6,6,0,0,1-6,6H54.49l61.75,61.76a6,6,0,1,1-8.48,8.48l-72-72a6,6,0,0,1,0-8.48l72-72a6,6,0,0,1,8.48,8.48L54.49,122H216A6,6,0,0,1,222,128Z',
  path: 'M200,166a34,34,0,0,0-33.4,28H72a26,26,0,0,1,0-52h96a38,38,0,0,0,0-76H72a6,6,0,0,0,0,12h96a26,26,0,0,1,0,52H72a38,38,0,0,0,0,76h94.6A34,34,0,1,0,200,166Zm0,56a22,22,0,1,1,22-22A22,22,0,0,1,200,222Z',
  share: 'M214,128v80a14,14,0,0,1-14,14H56a14,14,0,0,1-14-14V128a6,6,0,0,1,12,0v80a2,2,0,0,0,2,2H200a2,2,0,0,0,2-2V128a6,6,0,0,1,12,0ZM92.24,76.24,122,46.49V136a6,6,0,0,0,12,0V46.49l29.76,29.75a6,6,0,0,0,8.48-8.48l-40-40a6,6,0,0,0-8.48,0l-40,40a6,6,0,0,0,8.48,8.48Z',
  chat: 'M216,50H40A14,14,0,0,0,26,64V224a13.88,13.88,0,0,0,8.09,12.69A14.11,14.11,0,0,0,40,238a13.87,13.87,0,0,0,9-3.31l.06-.05L81.73,206H216a14,14,0,0,0,14-14V64A14,14,0,0,0,216,50Zm2,142a2,2,0,0,1-2,2H79.5a6,6,0,0,0-3.89,1.43L41.32,225.27A2,2,0,0,1,38,224V64a2,2,0,0,1,2-2H216a2,2,0,0,1,2,2Z',
  download: 'M222,144v64a6,6,0,0,1-6,6H40a6,6,0,0,1-6-6V144a6,6,0,0,1,12,0v58H210V144a6,6,0,0,1,12,0Zm-98.24,4.24a6,6,0,0,0,8.48,0l40-40a6,6,0,0,0-8.48-8.48L134,129.51V40a6,6,0,0,0-12,0v89.51L92.24,99.76a6,6,0,0,0-8.48,8.48Z',
  archive: 'M224,50H32A14,14,0,0,0,18,64V88a14,14,0,0,0,14,14h2v98a14,14,0,0,0,14,14H208a14,14,0,0,0,14-14V102h2a14,14,0,0,0,14-14V64A14,14,0,0,0,224,50ZM210,200a2,2,0,0,1-2,2H48a2,2,0,0,1-2-2V102H210ZM226,88a2,2,0,0,1-2,2H32a2,2,0,0,1-2-2V64a2,2,0,0,1,2-2H224a2,2,0,0,1,2,2ZM98,136a6,6,0,0,1,6-6h48a6,6,0,0,1,0,12H104A6,6,0,0,1,98,136Z',
  info: 'M142,176a6,6,0,0,1-6,6,14,14,0,0,1-14-14V128a2,2,0,0,0-2-2,6,6,0,0,1,0-12,14,14,0,0,1,14,14v40a2,2,0,0,0,2,2A6,6,0,0,1,142,176ZM124,94a10,10,0,1,0-10-10A10,10,0,0,0,124,94Zm106,34A102,102,0,1,1,128,26,102.12,102.12,0,0,1,230,128Zm-12,0a90,90,0,1,0-90,90A90.1,90.1,0,0,0,218,128Z',
  steps: 'M216,42H168a6,6,0,0,0-6,6V90H120a6,6,0,0,0-6,6v42H72a6,6,0,0,0-6,6v42H32a6,6,0,0,0,0,12H72a6,6,0,0,0,6-6V150h42a6,6,0,0,0,6-6V102h42a6,6,0,0,0,6-6V54h42a6,6,0,0,0,0-12Z',
  sun: 'M122,40V16a6,6,0,0,1,12,0V40a6,6,0,0,1-12,0Zm68,88a62,62,0,1,1-62-62A62.07,62.07,0,0,1,190,128Zm-12,0a50,50,0,1,0-50,50A50.06,50.06,0,0,0,178,128ZM59.76,68.24a6,6,0,1,0,8.48-8.48l-16-16a6,6,0,0,0-8.48,8.48Zm0,119.52-16,16a6,6,0,1,0,8.48,8.48l16-16a6,6,0,1,0-8.48-8.48ZM192,70a6,6,0,0,0,4.24-1.76l16-16a6,6,0,0,0-8.48-8.48l-16,16A6,6,0,0,0,192,70Zm4.24,117.76a6,6,0,0,0-8.48,8.48l16,16a6,6,0,0,0,8.48-8.48ZM46,128a6,6,0,0,0-6-6H16a6,6,0,0,0,0,12H40A6,6,0,0,0,46,128Zm82,82a6,6,0,0,0-6,6v24a6,6,0,0,0,12,0V216A6,6,0,0,0,128,210Zm112-88H216a6,6,0,0,0,0,12h24a6,6,0,0,0,0-12Z',
  phone: 'M176,18H80A22,22,0,0,0,58,40V216a22,22,0,0,0,22,22h96a22,22,0,0,0,22-22V40A22,22,0,0,0,176,18Zm10,198a10,10,0,0,1-10,10H80a10,10,0,0,1-10-10V40A10,10,0,0,1,80,30h96a10,10,0,0,1,10,10ZM138,60a10,10,0,1,1-10-10A10,10,0,0,1,138,60Z',
};
export function icon(name, label) {
  const svg = s('svg', { viewBox: '0 0 256 256', fill: 'currentColor', 'aria-hidden': label ? null : 'true', role: label ? 'img' : null, 'aria-label': label || null, focusable: 'false' });
  svg.append(s('path', { d: P[name] }));
  return svg;
}
// iOS share glyph (box with arrow), drawn for the install banner.
export function iosShareGlyph() {
  const svg = s('svg', { viewBox: '0 0 24 24', width: '22', height: '22', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'aria-hidden': 'true' });
  svg.append(s('path', { d: 'M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 10H16' }), s('path', { d: 'M12 3v12M8.5 6.5 12 3l3.5 3.5' }));
  return svg;
}
export function cairn(state) {
  // A small stacked-stone mark.
  const fill = state === 'walked' ? '#FAD491' : state === 'today' ? '#E8A04A' : 'none';
  const stroke = state === 'walked' ? '#FAD491' : state === 'today' ? '#E8A04A' : '#A9B4BA';
  const svg = s('svg', { viewBox: '0 0 28 28', 'aria-hidden': 'true' });
  svg.append(
    s('ellipse', { cx: 14, cy: 22, rx: 9, ry: 3.2, fill, stroke, 'stroke-width': 1.3 }),
    s('ellipse', { cx: 14, cy: 15.5, rx: 6.5, ry: 2.8, fill, stroke, 'stroke-width': 1.3 }),
    s('ellipse', { cx: 14, cy: 9.5, rx: 4, ry: 2.4, fill, stroke, 'stroke-width': 1.3 }),
  );
  return svg;
}
