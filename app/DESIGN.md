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
Local first. IndexedDB on the device is the source of truth and the app works fully offline with no account. Journal answers are never sent to analytics, form posts, or share cards. Export stays a JSON download the user starts. If a reader signs in, their data (journal included) is synced to the account, encrypted at rest. The wording on screen says exactly that and carries a Draft pill until Herman approves it.

## Accounts and sync (preview)
- Sign-in: optional, passwordless email code (Neon Auth, managed Better Auth, Email OTP). The browser only talks to our own origin: `/api/auth/*` is a Netlify Function proxy that allows only send code, sign in with code, get session, token, and sign out. Password sign-up is not exposed and accounts with a password are refused.
- Backend: Neon project `faith-in-motion-steps` (Postgres 17). Table `fim.items` holds one row per synced field: `(user_id, store, key, field, t, deleted, iv, ct, seq)`. Row level security is forced; every request runs `set local role fim_rls` with `fim.user_id` set from the verified JWT, so a user can only touch their own rows.
- Crypto: field values are sealed with AES-256-GCM using `FIM_STEPS_DATA_KEY` (server env), with `user id, store, key, field` as additional data. No plaintext journal text is stored or logged.
- JWT: EdDSA only, verified against the Neon Auth JWKS, issuer and audience checked, email must be verified, user must still exist.
- Merge: last write wins per field (stop answers per question, profile per field, steps and motion checks per item), each with a client timestamp. Blank defaults carry t=1 so they never overwrite real data. Push dirty fields, then pull everything newer than the server cursor. A new device merges, it never wipes.
- Sync runs on local change (debounced), when back online, when the app becomes visible, and every 60 seconds while signed in.
- Delete my account and data: deletes all rows, sessions and the auth user server side; optionally erases this phone too.
- Limits: sign-in code send 5 per email and 10 per IP per 10 minutes; code entry 8 per email and 20 per IP per 10 minutes; sync 240 requests per minute per user. CORS allows only the preview origin and faithinmotionbook.com.
- Env vars (Netlify, branch-deploy context only): `FIM_STEPS_AUTH_URL`, `FIM_STEPS_DATABASE_URL`, `FIM_STEPS_DATA_KEY`.

### Go-live checklist for accounts
1. Neon Auth: add a real email provider (custom SMTP or the send-email webhook). The shared Neon sender is for development only.
2. Neon Auth console: turn off email and password sign-in and turn off localhost.
3. Netlify: add the three env vars for the production context (new data key only if starting fresh; the key must never change once data exists).
4. Replace the Draft pill on the privacy wording once approved, set `draftMarkers` to `false`, remove noindex.

## Draft markers (preview only)
`config.json` `draftMarkers: true` shows a small amber-outlined pill ("Draft, pending Herman", text from `draftMarkerText`) on prices (Get the book, gift, the Read screen Kindle link), each Pray screen, the Walk with me button and share card, and the testimony consent. Set `draftMarkers` to `false` at go-live; no content edits needed. Crisis lines carry no marker.
