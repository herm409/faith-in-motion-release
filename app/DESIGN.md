# Faith in Motion: Steps: design notes (Lamplight Ridge)

A quiet, pre-dawn mountain walk. Photographs sit in a dark valley "plate"; reading happens on a warm cream "sheet" that rises over it. One amber lamp leads the way.

## Palette (tokens in app.css)
| Token | Hex | Use |
|---|---|---|
| valley | #192935 | page ground, plates, Route |
| navy | #122040 | text on cream, numeral bottom half |
| cream | #F4ECDF | sheets, text on dark |
| first-light | #FAD491 | focus on dark, highlights |
| amber | #E8A04A | the single primary action, route line, focus ring |
| umber | #463526 | hairlines (20%), secondary text on cream |
| slate / slate-text | #51636E / #A9B4BA | muted text on dark |

"Need help now?" uses only cream, navy and amber, with no alarm red. Inline form errors use a dark rust (#8A2E12, 600 weight) next to the field for contrast; that color appears nowhere else.

## Type
- Playfair Display 700 / 400 italic: titles, the two-tone stop numeral, wordmark ("Faith *in Motion*").
- Cormorant Garamond 500 / italic: reading text, verses, journal prompts.
- Instrument Sans (variable): UI, buttons, labels.
Self-hosted latin WOFF2 (~120 KB), `font-display: swap`, preloaded.

## Images
Pexels sources graded "Lamplight Ridge" (lifted blacks, cool shadows, warm highlights, fine grain) by `tools/build-images.py`. Heroes 4:5 WebP at 640/1080; share plates 9:16. Credits in `CREDITS.md`. Alt text comes from `img/manifest.json` (content `hero.alt` describes art direction, not these photos).

## Motion
Durations 90/160/240/420 ms, ease `cubic-bezier(0.16,1,0.3,1)`. Sheets rise; the route line draws once. `prefers-reduced-motion` removes all movement.

## Components
- Plate + sheet layout (plate 42svh).
- Stop rail: 8 cairn steps (read, pulse, nameIt, build, move, help, pray, review), current one amber.
- Bottom sheets (`.bsheet`): Hard day, Need help now, menu. Escape / scrim / X closes; focus is trapped and returned.
- Route: dotted amber path through 12 cairns, labels alternate sides.
- Share cards: canvas, 4 sizes, auto text color tested to 4.5:1 against the sampled plate.

## Privacy
Journal answers live only in IndexedDB on the device. They are never posted, synced, sent to analytics, or drawn on share cards. Export is a JSON download the user starts.

## Draft markers (preview only)
`config.json` `draftMarkers: true` shows a small amber-outlined pill ("Draft, pending Herman", text from `draftMarkerText`) on prices (Get the book, gift, the Read screen Kindle link), each Pray screen, the Walk with me button and share card, and the testimony consent. Set `draftMarkers` to `false` at go-live; no content edits needed. Crisis lines carry no marker.
