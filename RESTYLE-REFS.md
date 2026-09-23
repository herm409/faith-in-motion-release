# Faith in Motion — Restyle References

**Date:** 2026-09-23 (CT)  
**Scope:** Layout / type / surface / density steals for cream–navy release site.  
**Do not:** edit `index.html` / `styles.css` in this pass — refs only.  
**Problem this answers:** Apple-sparse cream void beside left-ragged chapter list; tall section padding / scroll waste; hero quieter than product-stage book energy. Keep pastoral voice, Notify CTA, real manuscript TOC, no fake blurbs.

---

## Sources (live — verified load)

| # | Site | URL | Why it made the cut |
|---|------|-----|---------------------|
| 1 | **Sleep Again** (indie book launch) | https://sleepagain.co/ | Densest literary-adjacent book landing that actually loads. Serif editorial, numbered “inside” field-manual list, cover as object, tight section rhythm without SaaS carnival. Closest fix for our cream-void TOC. |
| 2 | **Atomic Habits** (James Clear) | https://jamesclear.com/atomic-habits | Classic author book-landing energy: cover-forward hero, numbered “teach you” list, bonus grid density, clear buy path. Product-stage presence without fake churchiness. |
| 3 | **Set Adrift** (Zondervan marketing) | https://www.zondervan.com/p/set-adrift/ | Live Christian-publisher title page: benefit headline over synopsis, cover-centered stage, author band. Pastoral category tone without Apple-sparse emptiness. |

**Tried / not used as primary**
- Ann Voskamp `/books/` — loaded but thin catalog grid, not a single-title launch stage.
- Zondervan *Revelation for the Rest of Us* — also live; same publisher pattern as Set Adrift (kept as supporting echo, not a fourth primary).
- Godly.design — gallery index useful later; not a book landing itself.

---

## Four steals per source

### 1. Sleep Again — https://sleepagain.co/

| Steal | What to take |
|-------|----------------|
| **Layout** | Hero as near-equal type + cover columns (`~1.05 / 0.95`) aligned to baseline; “Inside” as **two-column** (cover left / numbered list right) so the TOC never floats in empty cream. Numbered section labels (`01` … `04`) as scroll milestones, not empty padding. |
| **Type** | Large soft serif H1 (`clamp ~2.2–4.4rem`, weight 400) with italic stress on the emotional half of the line; body lede capped ~38ch; list titles ~1.18rem medium with soft one-line ledes under each. |
| **Surface** | Paper-dark ink on warm ground; hairline rules between list rows; cover with deep soft shadow (`~0 32px 56px`) so the book feels *held*, not floated on white. Accent used sparingly on numerals / rules. |
| **Density / motion** | Section padding ~`4–6rem` (not 8–10vw luxury voids). Inside-list row padding ~`1.4rem` with full-width rule — content fills the column. Almost no motion; density comes from filled columns, not animation. |

**Direct FIM map:** Replace left-ragged `.chapter-map { max-width: 40rem }` with a full-shell two-column (or 2-col TOC grid) so cream is *paper behind type*, not a vacant right rail.

### 2. Atomic Habits — https://jamesclear.com/atomic-habits

| Steal | What to take |
|-------|----------------|
| **Layout** | Cover as hero product object with retail/buy immediacy; “10 Things This Book Will Teach You” as a **full-width numbered list** (not a skinny left column); bonuses as a dense card/grid band under the hero. |
| **Type** | Clear display title + short benefit subtitle; list items short imperative lines (scanable, not essay paragraphs). UI chrome secondary to book title. |
| **Surface** | Bright product stage around the cover; alternating content bands so the page never feels like one endless cream sheet. Praise is dense *when real* — we keep Proof reserved. |
| **Density / motion** | Product-stage energy = stacked value (cover → bonuses → teach-list → buy), not silence. Motion minimal; energy is packing ratio and CTA proximity. |

**Direct FIM map:** Raise hero “stage” (cover scale + CTA cluster + thesis beat in the same fold). Use Atomic’s numbered teach-list *pattern* for our real TOC / path — full width, not a ragged left strip. Do **not** invent blurbs to fill praise slots.

### 3. Set Adrift (Zondervan) — https://www.zondervan.com/p/set-adrift/

| Steal | What to take |
|-------|----------------|
| **Layout** | Benefit-led headline above the title object; synopsis as a readable mid-width column; author “Meet” band as a clear horizontal slab after proof/content — not buried. Cover repeatedly reappears as the anchor object. |
| **Type** | Plainspoken Christian benefit headline (problem → hope) before decorative title treatment; body in readable publisher serif/sans mix; author bios as real paragraphs, not cards-of-three. |
| **Surface** | Publisher marketing polish: cover photography as merchandise, white/cream content bands alternating with darker author/CTA slabs. Endorsements when present are stacked full-width quotes — we leave Proof empty until real. |
| **Density / motion** | Marketing pages pack synopsis + cover + CTA without giant empty gutters. Static. Energy = clarity of promise + cover presence. |

**Direct FIM map:** Keep pastoral benefit language (Tension / Promise) but tighten vertical rhythm to publisher-marketing density. Hero should feel like a *title launch*, not a lifestyle brochure.

---

## Always / Never for FIM restyle

### Always
- Cream `#F4ECDF` / navy `#122040` / sparse dawn amber `#E8A04A`
- Playfair + Cormorant pastoral voice; Notify primary until Amazon live (Oct 12, 2026)
- Real manuscript TOC (Intro + Ch 1–10 + Conclusion) — no Muse fake Parts
- Cover as photographic object (framed mat OK); Herman headshot only in About
- Full-width (or 2-col shell) chapter map — **no** empty cream right of a `max-width: 40rem` list
- Section padding that serves reading, not luxury-void scroll
- Proof stays reserved / hidden until real endorsements exist
- `prefers-reduced-motion`, real focus, landmarks

### Never
- Apple-sparse “intentional emptiness” as the main density strategy
- Left-ragged chapter column with vacant cream beside it
- Fake blurbs, logo clouds, countdown hustle, Amazon search URLs
- Inter/Geist/Poppins as brand; purple→blue mesh; dark/gold Muse full rebrand
- Three equal SaaS feature cards as the proof/inside block
- Inflating section padding (`clamp(4.5–10vw…)` hero/CTA style) to fake premium
- Inventing chapter micro-blurbs that aren’t in the locked manuscript (short factual ledes OK only if sourced)

**Explicit craft lock:** Drop Apple-sparse breathing. Keep pastoral voice.

---

## Concrete layout recipe (OUR site)

### 1. Hero — quieter → title-stage
- Keep asymmetric type-left / cover-right, but **raise cover visual weight** (larger framed cover, stronger shadow, less soft empty margin above fold).
- Thesis (“Faith is not a standstill.”) + kicker (“Name it. Step into it.”) + one-liner stay; pull CTA + Notify into a tighter cluster under lede (Atomic proximity).
- Target padding: **`padding-block: clamp(2.25rem, 4.5vw, 3.75rem)`** (down from ~2.5–6.5rem luxury). Fold should feel *product on stage*, not brochure breathing room.
- Spine watermark: keep opacity low; don’t steal space from type/cover.

### 2. Chapter map — full-width denser (primary fix)
**Current bug:** `.chapter-map { max-width: 40rem }` → left-ragged list, cream void on the right.

**Target recipe:**
1. `.chapter-map` → **`max-width: none`**, width of `.shell` (~1120px).
2. Prefer one of:
   - **A (Sleep Again echo):** `grid-template-columns: minmax(220px, 0.9fr) minmax(0, 1.1fr)` — small cover/path callout left, TOC right; **or**
   - **B (Atomic teach-list echo):** single full-width list in **two columns** at `≥900px` (`columns: 2` or CSS grid `1fr 1fr`) with Opening spanning full / Conclusion spanning full; Chapters 1–10 split 5+5.
3. Row density: `padding: 0.55–0.7rem 0` (down from `0.85rem`); keep hairline rules; numerals italic amber Playfair.
4. Part labels (Opening / Chapters / Close) as compact sticky-ish kickers or a single top rule row — not three tall stacked voids.
5. Optional one-line manuscript-true micro-lede under Intro / Conclusion only; **do not** invent 10 fake chapter blurbs.

### 3. Section padding targets
| Band | Current feel | Target |
|------|--------------|--------|
| Hero | Tall luxury | `clamp(2.25rem, 4.5vw, 3.75rem)` top/bottom |
| Tension / Promise / For you / Groups | ~3.25–5.5–6rem | **`clamp(2.5rem, 5vw, 4rem)`** |
| Inside (chapters) | ~3.5–6.5rem | **`clamp(2.75rem, 5.5vw, 4.25rem)`** + denser map |
| Refrain (navy) | OK if content-filled | Keep 3-col; reduce vertical if quotes wrap short |
| Specs strip | Already tight (~1.35rem) | Keep |
| Notify / final CTA | Very tall (~4.5–7.5rem) | **`clamp(3rem, 6vw, 4.75rem)`** — still ceremonial, not a void |

Rule of thumb: **if a section’s empty cream exceeds its content height on desktop, padding is too tall.**

### 4. Cover treatment
- Keep cream mat + offset rule (Muse merge).
- Borrow Sleep Again shadow depth so cover reads as merchandise on a stage (Atomic energy) without leaving cream brand.
- In chapter band option A: reuse a smaller cover next to TOC (same asset) to kill empty cream — not a second illustration style.

### 5. Type / surface notes
- Display stays Playfair; body Cormorant. Don’t chase Sleep Again’s Source Serif — steal *scale and weight*, not the family.
- Surfaces: cream paper + navy slabs + soft-white cards only. Density via **filled columns and tighter rhythm**, not new colors.
- Motion stays low (`MOTION_INTENSITY` ~4): one soft headline reveal max; rest static. Density ≠ carousel.

### 6. Voice
- Pastoral, motion-honest: rest *and* step. No hype verbs from Atomic’s self-help register (“breakthrough,” “1% better”) — steal structure, not tone.
- Zondervan benefit-headline pattern OK when it maps to locked Tension/Promise copy.

---

## Implementation order (next pass — not this file)

1. Chapter map full-width / 2-col (biggest visual win).  
2. Section padding tokens tightened globally.  
3. Hero cover scale + CTA cluster.  
4. Optional dual cover in Inside band.  
5. Comp refresh (`comps/desktop-chapters.png`, hero, full).  

**Still forbidden next pass:** fake blurbs, countdown, Amazon search link, Muse dark/gold restyle, editing manuscript TOC titles.

---

## One-line north star

> **Denser editorial book-launch on cream/navy: Sleep Again’s filled columns + Atomic’s product-stage cover energy + Zondervan’s Christian benefit clarity — without Apple-sparse empty cream or fake praise.**
