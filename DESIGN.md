# Faith in Motion — Release Site DESIGN.md

**Status:** Comps in progress (2026-09-23)  
**Order:** Release site first → social campaign after  
**Owner:** Herman Davis / HD Media  

## Apply (craft locked 2026-09-23 — ALL SIX)
1. Break the vibe-code mold  
2. Stylized inspiration galleries  
3. Surface and background craft  
4. Accessibility web  
5. Responsive adapt — required (dense desktop; stacked-but-tight mobile; sticky Notify stays)  
6. Apple design polish — materials/sticky/focus/optical tracking **on**; Apple-**sparse empty cream** **off**

**Density lock:** literary density on (filled columns, tighter section rhythm). Do not use intentional emptiness as the main premium strategy.

## Reading this as
Book-launch landing for sincere Christians who feel stuck; language pastoral and motion-honest; leaning quiet premium editorial (dawn path + navy), not SaaS carnival.

## Identity (always / never)
**Always:** warm dawn photography from locked cover; navy `#122040`; cream paper grounds; Playfair + Cormorant (or licensed web equiv); one signature layout rhythm (editorial 7/5 split with full-bleed chapter breaks); primary CTA “Get the book” / notify until Amazon live.  
**Never:** Inter/Geist/Poppins as identity; purple→blue mesh; centered SaaS hero + 3 equal cards + logo cloud; hype copy; front-cover author photo as hero; glass stacked on glass.

## Taste dials
`DESIGN_VARIANCE 8` / `MOTION_INTENSITY 4` / `VISUAL_DENSITY 7` (literary denser; was 5 Apple-sparse)

## Product
- **Title:** Faith in Motion  
- **Subtitle:** Stepping Into the Gift God Gave You  
- **One-liner:** Faith is not a standstill—when God gives a gift or a vision, He invites you to step.  
- **ISBN:** 979-8-1758-5995-0  
- **Domain:** TBD later  
- **Buy CTA:** Placeholder until Amazon live (“Notify me” / “Get the book — coming soon”)

## Palette
| Token | Hex | Use |
|-------|-----|-----|
| Navy | `#122040` | Back/spine chrome, text on cream, footer |
| Cream | `#F4ECDF` | Page ground, paper sections |
| Dawn amber | `#E8A04A` | Sparse accent (sun / underline) |
| Ink | `#1A1A1A` | Body on cream |
| Soft white | `#FAF8F4` | Cards on navy |

## Type
- **Display:** Playfair Display — title; `Faith` bold, `in Motion` italic  
- **Body / blurb:** Cormorant Garamond  
- **UI / buttons:** system-ui or a quiet grotesque (not Inter as brand) — small labels only  

## Layout primitive
**Editorial chapter scroll:** full-bleed photo hero → cream problem band → 7/5 split “inside the book” → navy about band with circular headshot → sticky/mobile buy bar.

## Gallery steals (named, not clones)
1. **Sleep Again** (sleepagain.co) — Layout: near-equal type/cover hero; Inside as filled columns (cover + numbered list / 2-col TOC) so cream is paper behind type, not a vacant right rail. Surface: deep soft cover shadow. Density: section padding ~4–6rem class, not luxury voids.  
2. **Atomic Habits** (jamesclear.com/atomic-habits) — Layout: cover as product-stage object; full-width numbered teach-list pattern for real TOC (5+5 chapters). CTA proximity under lede.  
3. **Set Adrift / Zondervan** — Layout: benefit-led pastoral headline clarity; cover-centered merchandise stage; publisher marketing density without fake churchiness.  
4. **Apple polish materials** (craft #6) — translucent sticky Notify bar; optical title tracking; reduced-motion safe. **Not** Apple-sparse empty cream.

## Always / never (from gallery)
- Always fill shell width on chapter map / refrain / for-you (no left-ragged void).  
- Never three equal feature cards as the proof block.  
- Always use the locked cover as the primary visual object.  
- Never invent a second illustration style.  
- Never inflate section padding to fake premium; target ~`clamp(2.5rem, 5vw, 4rem)`.

## Sections (comps)
1. Nav — title wordmark + Buy  
2. Hero — one-liner + subtitle + cover + primary CTA  
3. Problem — “Faith is not a standstill” (from locked blurb)  
4. Inside — 3–4 theme beats (not equal card grid; editorial list or staggered)  
5. About Herman — circular Colosseum headshot + short bio  
6. Buy strip — placeholder CTA  
7. Footer — © Herman Davis / HD Media  

## Assets
- `assets/cover-front.png` (+ hi) from cream print wrap  
- `assets/herman-headshot.jpg`  

## Out of scope (phase 2)
Social creatives, calendar, ads — after site ships.

---

## Muse fold — 2026-09-23 (CT)
Campaign locks: “Name it. Step into it.” (hero kicker once) · Amazon **October 12, 2026** · north star (rest + move) · Muse hero promise under locked subtitle/one-liner · Tension / Promise / Group pathway / reserved Proof · Notify primary until live. See `COMP-NOTES.md`.

---

## Muse merge — 2026-09-23 (CT)

Merged stronger Muse release-site pieces into cream/navy editorial. **No deploy. No full Muse dark/gold restyle.**

### Kept identity
Cream `#F4ECDF` / navy `#122040` / dawn amber `#E8A04A` sparse · Playfair + Cormorant · Notify primary until Amazon · locked blurbs & Oct 12, 2026 status.

### Added / elevated
1. **Sticky nav polish** — Message · Chapters · Author · Groups + Notify (`data-cta="prelaunch"` + HTML comment for Oct 12 Amazon swap; no Amazon search URL).
2. **Thesis display** — “Faith is not a standstill.” as distinct amber italic beat in hero.
3. **Spine / watermark** — “Trust fully. Steward faithfully. Step forward.” (hero soft watermark + promise kicker; aligns with locked blurb both/and).
4. **Refrain band** — three editorial columns on navy: Grace launches purpose · Small offered ≠ small buried · Open hands beat empty fantasies.
5. **Chapter map** — real TOC from `publish/FAITH-IN-MOTION-MASTER-v1-TEXT-LOCKED.md` (Intro + Ch 1–10 + Conclusion). Muse Part 1/2/3 labels **not** used (not in manuscript).
6. **Book specs strip** — ~135 pp (`interior/PAGE-COUNT.txt`), trim 6×9, First edition 2026, ISBN 979-8-1758-5995-0, paperback & ebook.
7. **Framed cover** — soft cream mat + offset rule.
8. **Final CTA** — “Put your faith in motion.” + Notify form still primary.

### Still reserved / forbidden
No fake blurbs · no countdown · no Amazon search link · no Muse full dark/gold brand.

---

## Restyle — 2026-09-23 (CT)

Study-then-restyle per `RESTYLE-REFS.md`. **No deploy. No Muse dark/gold clone.**

### Apply note
All six craft items on (including Responsive adapt + Apple polish materials). Literary density on; Apple-sparse emptiness off. Steals: Sleep Again filled columns · Atomic product-stage · Zondervan Christian benefit clarity.

### Layout changes
1. **Chapter map** — full shell width; Sleep Again cover+TOC split (≥900px) + Atomic 2-col chapters (5+5); Intro / Conclusion full-width headers; manuscript titles only. Map-stage cover hidden &lt;900px (hero cover already present).  
2. **Section padding** — tightened to ~`clamp(2.5rem, 5vw, 4rem)` (hero/inside/buy per recipe).  
3. **Hero product-stage** — larger framed cover (~440px), deeper shadow, optional subtle navy `cover-stage` band, tighter CTA cluster; cream brand kept.  
4. **For-you** — 2-col grid on desktop; stacked tight on mobile.  
5. **Responsive** — stacked-but-tight phone rhythm; sticky Notify retained.  

### Date lock
Amazon release status copy: **October 12, 2026** (was October 1).

### Still forbidden
No fake blurbs · no countdown · no Amazon search URL · no invented Part 1/2/3 · no hustle copy · no Vercel deploy this pass.
