// Share cards drawn on <canvas>. Never journal text, counts, streaks, likes or rankings.
export const SIZES = { story: [1080, 1920], post: [1080, 1350], square: [1080, 1080], wide: [1200, 630] };
export const SIZE_LABELS = { story: 'IG story', post: 'IG post', square: 'Square', wide: 'X / Facebook' };
const CREAM = '#F4ECDF', NAVY = '#122040', VALLEY = '25,41,53', LIGHT = '#FAD491';
const imgCache = new Map();
function loadImg(src) {
  if (!imgCache.has(src)) imgCache.set(src, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image failed: ' + src)); i.src = src; }));
  return imgCache.get(src);
}
export async function fontsReady() {
  await Promise.all(['700 40px "Playfair Display"', 'italic 400 40px "Playfair Display"', '500 40px "Cormorant Garamond"', 'italic 500 40px "Cormorant Garamond"', '400 20px "Instrument Sans"', '600 20px "Instrument Sans"'].map((f) => document.fonts.load(f)));
}
function cover(ctx, img, x, y, w, h, fx = 0.5, fy = 0.5) {
  const r = Math.max(w / img.width, h / img.height); const sw = w / r, sh = h / r;
  const sx = Math.min(Math.max(0, img.width * fx - sw / 2), img.width - sw), sy = Math.min(Math.max(0, img.height * fy - sh / 2), img.height - sh);
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
function wrap(ctx, text, maxW) {
  const words = text.split(/\s+/); const lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
function fitText(ctx, text, maxW, maxH, font, maxSize, minSize, lh = 1.18) {
  for (let size = maxSize; size >= minSize; size -= 2) {
    ctx.font = font.replace('%', size + 'px'); const lines = wrap(ctx, text, maxW);
    if (lines.length * size * lh <= maxH) return { lines, size, lh };
  }
  ctx.font = font.replace('%', minSize + 'px'); return { lines: wrap(ctx, text, maxW), size: minSize, lh };
}
const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const CREAM_L = lum(0xF4, 0xEC, 0xDF);
// Worst case: the 98th percentile brightest pixel in the zone vs cream text.
function sampleContrast(ctx, x, y, w, h) {
  const d = ctx.getImageData(x, y, w, h).data; const ls = [];
  for (let i = 0; i < d.length; i += 4 * 7) ls.push(lum(d[i], d[i + 1], d[i + 2]));
  ls.sort((a, b) => a - b); return contrast(CREAM_L, ls[Math.floor(ls.length * 0.98)]);
}
function drawPlateWithScrim(ctx, plate, focal, x, y, w, h, zone, veil) {
  cover(ctx, plate, x, y, w, h, focal[0], focal[1]);
  ctx.fillStyle = `rgba(${VALLEY},${veil})`; ctx.fillRect(x, y, w, h);
  const g = ctx.createLinearGradient(0, zone.y, 0, zone.y + zone.h);
  g.addColorStop(0, `rgba(${VALLEY},0.15)`); g.addColorStop(0.35, `rgba(${VALLEY},0.7)`); g.addColorStop(1, `rgba(${VALLEY},0.88)`);
  ctx.fillStyle = g; ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
}
function lockup(ctx, x, y, size, color) {
  ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
  ctx.font = `700 ${size}px "Playfair Display"`; ctx.fillText('Faith', x, y);
  const w = ctx.measureText('Faith ').width; ctx.font = `italic 400 ${size}px "Playfair Display"`; ctx.fillText('in Motion', x + w, y);
}
// card: { kind, headline, sub, plate: {src, focal}, coverSrc }
export async function render(card, sizeKey) {
  await fontsReady();
  const [W, H] = SIZES[sizeKey];
  const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
  const plateSrc = typeof card.plate.src === 'string' ? card.plate.src : card.plate.src['1080'];
  const [plate, coverImg] = await Promise.all([loadImg(plateSrc), loadImg(card.coverSrc)]);
  const focal = (card.plate.focal || '50% 50%').split(' ').map((p) => parseFloat(p) / 100);
  let veil = 0.3, measured = 0, zone, textBox;
  if (sizeKey === 'wide') {
    // plate left 45%, cream panel right with navy text, cover overlapping the seam
    const pw = Math.round(W * 0.45);
    cover(ctx, plate, 0, 0, pw, H, focal[0], focal[1]);
    ctx.fillStyle = `rgba(${VALLEY},0.2)`; ctx.fillRect(0, 0, pw, H);
    ctx.fillStyle = CREAM; ctx.fillRect(pw, 0, W - pw, H);
    const cw = 170, ch = Math.round(cw * coverImg.height / coverImg.width);
    ctx.drawImage(coverImg, pw - cw / 2, (H - ch) / 2, cw, ch);
    const tx = pw + cw / 2 + 40, tw = W - tx - 50;
    lockup(ctx, tx, 92, 34, NAVY);
    const t = fitText(ctx, card.headline, tw, 300, '700 % "Playfair Display"', 46, 24);
    ctx.fillStyle = NAVY; let yy = 150 + t.size; t.lines.forEach((l) => { ctx.fillText(l, tx, yy); yy += t.size * t.lh; });
    if (card.sub) { const s = fitText(ctx, card.sub, tw, 80, '600 % "Instrument Sans"', 22, 16); ctx.fillStyle = '#463526'; s.lines.forEach((l) => { yy += 6; ctx.fillText(l, tx, yy + s.size); yy += s.size * 1.3; }); }
    ctx.font = '600 24px "Instrument Sans"'; ctx.fillStyle = '#463526'; ctx.fillText('faithinmotionbook.com/app', tx, H - 44);
    measured = 12.9; // navy on cream, measured once
  } else {
    if (sizeKey === 'story') { zone = { x: 0, y: Math.round(H * 0.5), w: W, h: H - Math.round(H * 0.5) }; textBox = { x: 80, y: Math.round(H * 0.56), w: W - 160, h: Math.round(H * 0.22) }; }
    else { zone = { x: 0, y: Math.round(H * 0.2), w: W, h: Math.round(H * 0.8) }; textBox = { x: 80, y: Math.round(H * (sizeKey === 'square' ? 0.3 : 0.32)), w: Math.round(W * 0.7) - 80, h: Math.round(H * 0.36) }; }
    for (let i = 0; i < 7; i++) {
      ctx.clearRect(0, 0, W, H);
      if (sizeKey === 'story') {
        const ph = Math.round(H * 0.6);
        drawPlateWithScrim(ctx, plate, focal, 0, 0, W, ph, { x: 0, y: Math.round(H * 0.4), w: W, h: ph - Math.round(H * 0.4) }, veil);
        ctx.fillStyle = `rgb(${VALLEY})`; ctx.fillRect(0, ph, W, H - ph);
      }
      else drawPlateWithScrim(ctx, plate, focal, 0, 0, W, H, zone, veil);
      measured = sampleContrast(ctx, textBox.x, textBox.y, textBox.w, textBox.h);
      if (measured >= 4.5) break;
      veil = Math.min(0.9, veil + 0.1);
    }
    const t = fitText(ctx, card.headline, textBox.w, textBox.h * 0.78, card.kind === 'verse' || card.kind === 'quote' ? 'italic 500 % "Cormorant Garamond"' : '700 % "Playfair Display"', sizeKey === 'story' ? 84 : 72, sizeKey === 'story' ? 44 : 34);
    ctx.fillStyle = CREAM; let yy = textBox.y + t.size;
    t.lines.forEach((l) => { ctx.fillText(l, textBox.x, yy); yy += t.size * t.lh; });
    if (card.sub) { const s = fitText(ctx, card.sub, textBox.w, 120, '600 % "Instrument Sans"', 30, 22); ctx.fillStyle = LIGHT; yy += 10; s.lines.forEach((l) => { ctx.fillText(l, textBox.x, yy + s.size * 0.4); yy += s.size * 1.3; }); }
    const safe = sizeKey === 'story' ? 96 : 60;
    lockup(ctx, 80, sizeKey === 'story' ? safe + 50 : 110, 44, CREAM);
    const cw = sizeKey === 'story' ? 220 : 180, chh = Math.round(cw * coverImg.height / coverImg.width);
    const cx = sizeKey === 'story' ? 80 : W - cw - 60, cy = H - safe - chh;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(cx + 6, cy + 10, cw, chh);
    ctx.drawImage(coverImg, cx, cy, cw, chh);
    ctx.font = '600 28px "Instrument Sans"'; ctx.fillStyle = CREAM;
    const link = 'faithinmotionbook.com/app';
    if (sizeKey === 'story') { ctx.textAlign = 'right'; ctx.fillText(link, W - 80, H - safe - 10); ctx.textAlign = 'left'; }
    else ctx.fillText(link, 80, H - safe - 10);
  }
  return { canvas: c, contrast: measured, veil };
}
export async function shareCanvas(canvas, filename, text, url) {
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text, url }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancelled'; }
  }
  const u = URL.createObjectURL(blob); const a = Object.assign(document.createElement('a'), { href: u, download: filename });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
  return 'downloaded';
}
