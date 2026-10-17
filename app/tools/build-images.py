#!/usr/bin/env python3
"""Build graded, self-hosted images for Faith in Motion: Steps.

Downloads Pexels originals into /tmp/fim-originals (not committed), applies the
Lamplight Ridge grade, crops to focal points, exports WebP, writes
app/img/manifest.json, app/img/credits.json and app/CREDITS.md, plus the cover,
PWA icons, grain tile and the Open Graph image.

Run from the repo root:  python3 app/tools/build-images.py
"""
import base64, io, json, os, random, sys, urllib.request
from datetime import date
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
APP = os.path.join(ROOT, "app")
IMG = os.path.join(APP, "img")
ORIG = "/tmp/fim-originals"
CONTENT_MANIFEST = os.path.join(APP, "content", "manifest.json")
os.makedirs(IMG, exist_ok=True)
os.makedirs(ORIG, exist_ok=True)

# slot, pexels id, photographer, page, focal, alt, exposure tweak
PHOTOS = [
    ("door1", 1025112, "Hassan OUAJBIR", "https://www.pexels.com/photo/man-wearing-blue-hooded-sweater-1025112/", "50% 55%", "A lone walker on a narrow path through tall golden grass under a glowing sky", 1.0),
    ("s00", 6152559, "Trace Hudson", "https://www.pexels.com/photo/male-traveler-standing-on-top-of-mountain-and-admiring-landscape-6152559/", "40% 60%", "A man standing still at a cliff edge above misty mountains at dawn", 1.0),
    ("s01", 10952326, "Artem Korsakov", "https://www.pexels.com/photo/back-view-of-a-man-walking-on-countryside-road-10952326/", "45% 55%", "A man walking a dirt country road toward the low sun", 1.0),
    ("s02", 3760930, "Tope J. Asokere", "https://www.pexels.com/photo/african-man-cutting-board-in-workshop-3760930/", "50% 35%", "A craftsman bent over his work in a warm, dim workshop", 1.0),
    ("s03", 1301856, "Lisa Fotios", "https://www.pexels.com/photo/person-digging-on-soil-using-garden-shovel-1301856/", "35% 40%", "A garden shovel full of dark soil", 1.0),
    ("s04", 35815220, "Teodor Buhl", "https://www.pexels.com/photo/rustic-artisan-bread-loaves-in-wicker-basket-35815220/", "50% 50%", "Round loaves of bread in a wicker basket", 1.0),
    ("s05", 16183797, "Shakib Shanto", "https://www.pexels.com/photo/empty-country-road-at-sunrise-16183797/", "50% 65%", "A country road with long tree shadows at sunrise", 1.0),
    ("s06", 8817520, "Pavel Danilyuk", "https://www.pexels.com/photo/man-with-eyes-closed-while-praying-8817520/", "45% 40%", "A young man praying with his eyes closed", 1.0),
    ("s07", 7616800, "Los Muertos Crew", "https://www.pexels.com/photo/woman-writing-on-her-notebook-while-holding-a-cup-7616800/", "55% 45%", "A woman writing in a notebook with a cup of coffee at a sunny desk", 1.0),
    ("s08", 14437769, "kwnos Iv", "https://www.pexels.com/photo/person-going-up-the-stairs-14437769/", "50% 40%", "A man climbing rough stone steps between rocks", 1.0),
    ("s09", 32478360, "\u0130layda Mutlu", "https://www.pexels.com/photo/misty-morning-walk-on-a-quiet-country-road-32478360/", "50% 60%", "One person walking a foggy tree-lined road", 1.05),
    ("s10", 15182672, "ahadi muyali", "https://www.pexels.com/photo/hands-holding-soil-and-seeds-15182672/", "50% 50%", "Weathered hands holding soil and seeds", 1.0),
    ("s11", 5171139, "REAFON GATES", "https://www.pexels.com/photo/couple-walking-on-pathway-5171139/", "50% 60%", "A couple walking arm in arm down a sunlit forest path", 1.0),
    ("share-water", 5085466, "M\u0103d\u0103lina Vl\u0103du\u021b\u0103", "https://www.pexels.com/photo/sunrise-over-sea-shore-5085466/", "50% 60%", "", 1.0),
    ("share-road", 9065110, "Tom Fisk", "https://www.pexels.com/photo/an-empty-asphalt-road-9065110/", "55% 55%", "", 1.0),
    ("share-walk", 30687348, "josh_ dago__", "https://www.pexels.com/photo/two-people-walking-down-a-sunlit-path-30687348/", "50% 55%", "", 1.0),
]

VALLEY = (0x19, 0x29, 0x35)
MID = (0x8A, 0x7B, 0x6A)
LIGHT = (0xFA, 0xD4, 0x91)
CREAM = (0xF4, 0xEC, 0xDF)
NAVY = (0x12, 0x20, 0x40)


def download(pid):
    path = os.path.join(ORIG, f"{pid}.jpeg")
    if not os.path.exists(path) or os.path.getsize(path) < 10000:
        url = f"https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg?auto=compress&w=2400"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 fim-steps-build"})
        with urllib.request.urlopen(req, timeout=60) as r, open(path, "wb") as f:
            f.write(r.read())
    return path


def _lut():
    """Per-luminance tri-tone LUT (256 entries)."""
    lut = []
    for i in range(256):
        L = i / 255
        if L < 0.5:
            t = L / 0.5; a, b = VALLEY, MID
        else:
            t = (L - 0.5) / 0.5; a, b = MID, LIGHT
        lut.append(tuple(a[k] + (b[k] - a[k]) * t for k in range(3)))
    return lut

LUT = _lut()


def grade(im, exposure=1.0):
    im = im.convert("RGB")
    if exposure != 1.0:
        im = ImageEnhance.Brightness(im).enhance(exposure)
    im = ImageEnhance.Color(im).enhance(0.70)  # a. saturation x 0.70
    # b. luminance (Rec. 709) -> tri-tone
    r, g, b = im.split()
    lum = Image.merge("RGB", (r, g, b)).convert("L", (0.2126, 0.7152, 0.0722, 0))
    tri = [ch.point([int(round(LUT[i][k])) for i in range(256)]) for k, ch in enumerate([lum, lum, lum])]
    tritone = Image.merge("RGB", tri)
    # c. out = 0.55 image + 0.45 tritone; then out*0.96 + 0.02
    out = Image.blend(im, tritone, 0.45)
    out = out.point(lambda v: min(255, max(0, int(round(v * 0.96 + 0.02 * 255)))))
    return out


def crop_to(im, ratio_w, ratio_h, focal):
    fx, fy = [float(p.strip("%")) / 100 for p in focal.split()]
    W, H = im.size
    target = ratio_w / ratio_h
    if W / H > target:
        nw, nh = int(H * target), H
    else:
        nw, nh = W, int(W / target)
    left = min(max(0, int(fx * W - nw / 2)), W - nw)
    top = min(max(0, int(fy * H - nh / 2)), H - nh)
    return im.crop((left, top, left + nw, top + nh))


def save_webp(im, path, budget_kb, q=72):
    """Quality 72 by default. If over budget, step quality down to 60, then add a
    light smoothing pass (fine detail like bare branches is costly in WebP)."""
    src, blur = im, 0.0
    while True:
        buf = io.BytesIO(); src.save(buf, "WEBP", quality=q, method=6)
        if buf.tell() <= budget_kb * 1024:
            break
        if q > 60:
            q -= 4
        elif blur < 1.6:
            blur += 0.4; src = im.filter(ImageFilter.GaussianBlur(blur))
        elif q > 40:
            q -= 4
        else:
            break
    with open(path, "wb") as f:
        f.write(buf.getvalue())
    return buf.tell(), q


def lqip(im):
    small = im.copy(); small.thumbnail((24, 24 * im.height // im.width + 1))
    small = small.filter(ImageFilter.GaussianBlur(1))
    buf = io.BytesIO(); small.save(buf, "WEBP", quality=40)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def stop_ids_by_order():
    try:
        m = json.load(open(CONTENT_MANIFEST))
        return [s["id"] for s in m["stops"]]
    except Exception:
        return None


def main():
    ids = stop_ids_by_order()
    today = date.today().isoformat()
    manifest = {"grade": "lamplight-ridge-v1", "items": {}}
    credits = []
    report = []
    for slot, pid, who, page, focal, alt, expo in PHOTOS:
        src = download(pid)
        im = grade(Image.open(src), expo)
        # Key: stop slots map to content ids by order (s00 -> manifest.stops[0].id)
        key = slot
        if slot.startswith("s") and slot[1:].isdigit() and ids:
            key = ids[int(slot[1:])]
        if slot.startswith("share"):
            crop = crop_to(im, 9, 16, focal)  # tall plate; cards crop further on canvas
            sizes = {"1350": 1350 * 9 // 16, "1920": 1080}
            srcs = {}
            for label, w in (("1080", 1080), ("640", 640)):
                out = crop.resize((w, w * 16 // 9), Image.LANCZOS)
                p = os.path.join(IMG, f"{slot}-{label}.webp")
                size, q = save_webp(out, p, 170 if label == "1080" else 70)
                srcs[label] = f"/app/img/{slot}-{label}.webp"; report.append((p, size, q))
            w, h = 1080, 1920
        else:
            crop = crop_to(im, 4, 5, focal)
            srcs = {}
            for label, w in (("1080", 1080), ("640", 640)):
                out = crop.resize((w, w * 5 // 4), Image.LANCZOS)
                p = os.path.join(IMG, f"{key}-{label}.webp")
                size, q = save_webp(out, p, 170 if label == "1080" else 70)
                srcs[label] = f"/app/img/{key}-{label}.webp"; report.append((p, size, q))
            w, h = 1080, 1350
        manifest["items"][key] = {"slot": slot, "pexelsId": pid, "focal": focal, "alt": alt,
                                  "width": w, "height": h, "lqip": lqip(crop), "src": srcs}
        credits.append({"slot": key, "pexelsId": pid, "pageUrl": page, "photographer": who,
                        "license": "Pexels License", "licenseUrl": "https://www.pexels.com/license/",
                        "downloadedAt": today})

    json.dump(manifest, open(os.path.join(IMG, "manifest.json"), "w"), indent=1, ensure_ascii=False)
    json.dump(credits, open(os.path.join(IMG, "credits.json"), "w"), indent=1, ensure_ascii=False)

    lines = ["# Credits, Faith in Motion: Steps", "",
             "## Photography", "",
             "All photos are from Pexels under the Pexels License (https://www.pexels.com/license/). Free commercial use and modification; attribution not required. Each photo is graded with the Lamplight Ridge grade and self-hosted as WebP. The people pictured do not endorse this app or the book.", "",
             "| Slot | Photographer | Pexels ID | Page | Downloaded |", "|---|---|---|---|---|"]
    for c in credits:
        lines.append(f"| {c['slot']} | {c['photographer']} | {c['pexelsId']} | {c['pageUrl']} | {c['downloadedAt']} |")
    lines += ["", "## Type", "",
              "Playfair Display, Cormorant Garamond and Instrument Sans, all under the SIL Open Font License 1.1, self-hosted as latin WOFF2 subsets from Google Fonts.", "",
              "## Icons", "", "Phosphor Icons (Light), MIT License, drawn inline as SVG.", "",
              "## Scripture", "", "Scripture quotations are from the ESV. The full notice is shown on the About screen (app/content/esv-notice.txt).", ""]
    open(os.path.join(APP, "CREDITS.md"), "w").write("\n".join(lines))

    # Cover
    cover = Image.open(os.path.join(ROOT, "assets", "cover-front-hi.png")).convert("RGB")
    for w, budget in ((480, 60), (900, 160)):
        out = cover.resize((w, round(w * cover.height / cover.width)), Image.LANCZOS)
        p = os.path.join(IMG, f"cover-{w}.webp"); size, q = save_webp(out, p, budget, 80); report.append((p, size, q))

    # Grain tile (512px, warm neutral noise around mid gray; used with multiply at 4% in CSS)
    rnd = random.Random(7)
    g = Image.new("L", (512, 512))
    g.putdata([max(0, min(255, int(rnd.gauss(200, 40)))) for _ in range(512 * 512)])
    g = g.filter(ImageFilter.GaussianBlur(0.6)).convert("RGB")
    p = os.path.join(IMG, "grain.webp"); size, q = save_webp(g, p, 32, 40); report.append((p, size, q))

    # Icons: cream Playfair "F" on valley (sibling of the site favicon)
    font_path = os.path.join(APP, "fonts", "playfair-display-700.woff2")
    def icon(sz, maskable=False):
        im = Image.new("RGB", (sz, sz), VALLEY)
        d = ImageDraw.Draw(im)
        scale = 0.42 if maskable else 0.6
        f = ImageFont.truetype(font_path, int(sz * scale))
        bb = d.textbbox((0, 0), "F", font=f)
        d.text(((sz - (bb[2] - bb[0])) / 2 - bb[0], (sz - (bb[3] - bb[1])) / 2 - bb[1]), "F", font=f, fill=CREAM)
        # thin amber ridge line under the F
        y = int(sz * (0.72 if not maskable else 0.66)); x0 = int(sz * (0.34 if not maskable else 0.38))
        d.line([(x0, y), (sz - x0, y)], fill=(0xE8, 0xA0, 0x4A), width=max(1, sz // 96))
        return im
    for sz, name, m in ((192, "icon-192.png", False), (512, "icon-512.png", False), (512, "icon-512-maskable.png", True), (180, "icon-180.png", False)):
        p = os.path.join(IMG, name); icon(sz, m).save(p, optimize=True); report.append((p, os.path.getsize(p), "png"))

    # Open Graph 1200x630: share-road plate left 45%, cream panel right, cover over the seam
    og = Image.new("RGB", (1200, 630), CREAM)
    plate = grade(Image.open(download(9065110)))
    plate = crop_to(plate, 540, 630, "55% 55%").resize((540, 630), Image.LANCZOS)
    og.paste(plate, (0, 0))
    cov = cover.resize((250, round(250 * cover.height / cover.width)), Image.LANCZOS)
    og.paste(cov, (540 - 125, (630 - cov.height) // 2))
    d = ImageDraw.Draw(og)
    fd = ImageFont.truetype(os.path.join(APP, "fonts", "playfair-display-700.woff2"), 54)
    fi = ImageFont.truetype(os.path.join(APP, "fonts", "playfair-display-400-italic.woff2"), 54)
    fu = ImageFont.truetype(os.path.join(APP, "fonts", "instrument-sans-var.woff2"), 26)
    fb = ImageFont.truetype(os.path.join(APP, "fonts", "cormorant-garamond-500.woff2"), 32)
    x = 720
    d.text((x, 170), "Faith", font=fd, fill=NAVY)
    d.text((x, 232), "in Motion", font=fi, fill=NAVY)
    d.text((x, 300), "Steps", font=fd, fill=(0x46, 0x35, 0x26))
    d.text((x, 390), "One step a week,", font=fb, fill=NAVY)
    d.text((x, 428), "with the book open beside you.", font=fb, fill=NAVY)
    d.text((x, 520), "faithinmotionbook.com/app", font=fu, fill=(0x46, 0x35, 0x26))
    p = os.path.join(IMG, "og-app-1200x630.png"); og.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(p, optimize=True); report.append((p, os.path.getsize(p), "png"))

    over = False
    for p, size, q in report:
        lim = 170 if p.endswith("-1080.webp") else 70 if p.endswith("-640.webp") else None
        flag = " OVER BUDGET" if lim and size > lim * 1024 else ""
        over = over or bool(flag)
        print(f"{os.path.relpath(p, ROOT):40s} {size/1024:7.1f} KB  q={q}{flag}")
    if over:
        sys.exit(1)

if __name__ == "__main__":
    main()
