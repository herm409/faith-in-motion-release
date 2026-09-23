# Faith in Motion — Release Site COMP-NOTES

**Date:** 2026-09-23  
**Path:** `/workspace/faith-in-motion/release-site/`

## Delivered
- `index.html` — single-page editorial release preview
- `styles.css` — navy / cream / dawn amber; Playfair + Cormorant
- `script.js` — sticky Notify bar + header scroll state; respects `prefers-reduced-motion`
- `comps/` — desktop hero, desktop full, mobile hero (if capture succeeded)

## DESIGN.md Apply checklist
1. **Break the vibe-code mold** — Asymmetric 7/5-ish hero (type left / cover right); staggered theme list, not 3 equal cards; no logo cloud.
2. **Stylized inspiration galleries** — Quiet book-landing archetype + Deck.gallery restraint + Apple sticky bar materials.
3. **Surface and background craft** — Cover as photographic object with soft shadow; cream paper sections; soft-white problem band; navy about slab. Sparse amber underline / section kickers only. No mesh gradients.
4. **Accessibility web** — Skip link, landmarks (`header`/`main`/`nav`/`footer`), real `<a class="btn">`, `:focus-visible`, alt text on cover + headshot, `prefers-reduced-motion`.
5. **Responsive adapt** — Cover-first stack under ~860px; nav links collapse on small screens (Notify remains); theme list loses stagger padding.
6. **Apple design polish** — Sticky translucent header + optional sticky buy bar; generous shell margins; optical title tracking; restrained chrome.

## Deviations / notes
- **CTA label:** Brief prefers “Notify me” (primary) until Amazon is live — used throughout; secondary line “Paperback & ebook on Amazon — link coming soon” per brief.
- **Mailto:** Used `#notify` only (no invented email address). Swap in a real address when ready.
- **Domain:** No custom domain in chrome; relative asset paths for local open / localhost.
- **Theme beats:** Paraphrased lightly from locked BLURBS for web length — no invented endorsements.
- **Footer:** © Herman Davis · HD Media (per brief).
- **Hero micro-gradient:** Extremely soft amber radial behind cover only (dawn echo from cover art) — not a purple mesh; intentional surface craft.

## Open questions
1. Real notify email / form endpoint when Amazon goes live?
2. Confirm “HD Media” vs any preferred imprint line on footer.
3. Domain TBD — swap wordmark link when chosen.

---

## Muse campaign fold — 2026-09-23 (CT)

Folded Muse Faith in Motion launch campaign into the existing cream/navy release site. **No deploy.**

### Campaign locks applied
- **Amazon release:** Monday, October 12, 2026 — status line on hero + notify band: “Releases October 12, 2026 on Amazon”
- **Campaign idea (once):** “Name it. Step into it.” as hero kicker only
- **North star:** Faith rests in God’s sovereignty — and moves in obedience (Promise band)
- **Hero promise:** Muse draft under locked one-liner; locked subtitle **Stepping Into the Gift God Gave You** and BLURBS one-liner kept
- **Primary CTA:** Notify (FormSubmit unchanged); secondary soft “Sit with one question”
- **Formats:** Paperback · Ebook chips retained; ISBN unchanged

### Section order after fold
Hero → Tension (holy waiting vs avoidance + 3 editorial examples) → Promise → For you if → Inside (3-part + reflection/weekly practice callout) → Sit → Author → Proof (HTML comment + hidden reserved slot) → Group pathway → Notify / Final CTA

### Intentionally not done
- No fake endorsements / proof content
- No sample PDF / bulk-order form
- No countdown timers or hustle language
- No ISBN / author / cover art changes
- No deploy

---

## Muse merge — 2026-09-23 (CT)

Implemented Muse steals into cream Faith in Motion release site. **No deploy.**

### Chapter source
**Locked master manuscript** — `/workspace/faith-in-motion/publish/FAITH-IN-MOTION-MASTER-v1-TEXT-LOCKED.md`  
Titles used: Introduction: The Great Christian Standstill · Ch 1–10 (exact headings) · Conclusion — A Life in Motion.  
Muse’s Part 1/2/3 labels (“What Faith Really Is” / “Engine…” / “Barriers…”) were **not** applied — manuscript has no Part structure.

### Pages
`publish/interior/PAGE-COUNT.txt` = **135** (wrap PDF historically labeled 136pp; site states “About 135”).

### CTA swap hook
All primary Notify anchors carry `data-cta="prelaunch"` plus HTML comments: after Oct 12, 2026 flip label → “Get the book”, href → real Amazon product URL (never search URL).

### Comps refreshed
- `comps/desktop-hero.png`
- `comps/desktop-full.png`
- `comps/desktop-refrain.png`
- `comps/desktop-chapters.png`
- `comps/desktop-specs.png`
- `comps/desktop-cta.png`
- `comps/mobile-hero.png`

### Note paths (Herman)
- Source of truth (box): `/workspace/faith-in-motion/release-site/`
- Mac Studio (Hermans-Mac-Studio): `/Users/hermandavis/Documents/Faith-in-Motion/release-site/`
- Quick comps glance: `/Users/hermandavis/Desktop/Faith-in-Motion-comps-2026-09-23/`
- Local preview: `python3 -m http.server 8765` from release-site (already on box :8765)
- Drive parent for book files: folder id `1s_yU6VoetqDEJijLO2JeuSnDKBhW36Xp` (manuscript/interior; site not uploaded to Drive this pass)

### Intentionally unchanged
FormSubmit notify + success · For you if · Tension · Groups · Sit with one question · Name it. Step into it. · Oct 12, 2026 · no fake blurbs / countdown / Amazon search.

---

## Restyle — denser literary (2026-09-23 CT)

Finished denser restyle per `RESTYLE-REFS.md` before sample/7-day emails.

### Done
- Chapter map: full shell; Sleep Again cover+TOC (≥900px) + Atomic 5+5 chapters; Intro/Conclusion span; manuscript titles only; no `max-width: 40rem` void
- Section padding tightened (~`clamp(2.5rem, 5vw, 4rem)`)
- Hero product-stage: larger framed cover, deeper shadow, subtle navy `cover-stage`, tighter CTA
- For-you 2-col desktop; stacked tight mobile; sticky Notify kept
- DESIGN.md Apply: **all six** (Responsive adapt + Apple polish materials on; Apple-sparse emptiness off; literary density on)
- Date lock: **October 12, 2026** everywhere user-facing
- Comps refreshed: `desktop-hero`, `desktop-chapters`, `desktop-full`, `mobile-hero`
- Copied to MacBook: `/Users/hermandavis/Downloads/faith-in-motion-release-site/`

### Still not done this pass
Sample PDF · 7-day emails · Vercel deploy · fake blurbs
