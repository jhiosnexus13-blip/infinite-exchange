# INFINITE EXCHANGE v2 — what changed

Local build of v2 of infiniteexchange.online. **It hasn't been pushed to GitHub, deployed, or connected to any live service.** It's still plain static HTML, CSS and JS with no framework and no build step. The only server-side piece is one Netlify Function.

## Pages
| Path | What it is |
|---|---|
| `/` (`index.html`) | Rewritten home page. Every section has three layers: a hook, a short insight, and a "read more" `<details>`. The Signal section uses the approved announcement text word for word: the hook, then the "Quick version" paragraph, then the full post in "read more". The original copy for Why/Archive/Protocol, Playlists, Support and Notice keeps its meaning, and new sections only use claims from the announcement or brief. New: lane cards with "play lane", and a JHIOS Soundtracks "Commission custom sound" section that uses the existing Tally form. |
| `/vault` | The whole catalogue. Lane filter chips, search, and `?lane=` `?tag=` `?q=` URLs. A track detail view at `/vault?t=<id>` has a share link (Web Share API, or copies to clipboard) and "also on" links. |
| `/world` | The 3D world, rewritten in three.js r169 as an ES module from jsDelivr (see below). |
| `/privacy` | A short note on what the listener counter stores. |
| `/404` | A 404 page in the terminal style. |

## Player (`assets/js/player.js`, shared by every page)
- **One engine per page**, used by both the site and the world, so they can't play over each other. A `BroadcastChannel` also pauses other tabs when you press play.
- **Source abstraction.** If a track has an `audio_url`, it plays from `AUDIO_BASE + audio_url` through HTML5 `<audio preload="metadata">`, which supports seeking and range requests. Otherwise it plays through the **YouTube IFrame API** in a visible 200×200 mini-player (youtube-nocookie host), as YouTube's terms require. To move a track to self-hosted audio, fill in its `audio_url`. The UI doesn't change.
- Controls: play/pause, previous/next, a seek bar and a queue panel. Media Session sets the metadata and action handlers (play, pause, next, previous, seekto, seek ±). Lock-screen controls work fully for self-hosted audio. For YouTube tracks, the iframe controls its own media session.
- A play is counted (`POST /api/listen`) only after 30 s of real playback, once per track per page view.

## 3D world
- Touch: a left joystick to move and a right joystick to look. Neither is inverted: push up to go forward or look up, push right to turn right. A joystick only reacts to a touch that starts on it.
- Keyboard: W/↑ forward, S/↓ back, A/← turn left, D/→ turn right, Q/E strafe. No pointer-lock.
- Mouse or touch drag on the scene looks around, not inverted.
- Tap or click a lane monolith to play that lane (raycast).
- A collapsible playlist panel groups tracks by lane, the same way as the site, and is built from the same `tracks.json`.
- Layering: the canvas is at z-index 0, and the HUD, panel, joysticks and player sit above it with their own `pointer-events`.
- Pixel ratio is capped (1.5 on touch screens, 2 otherwise). Layout respects safe areas, rendering pauses when the tab is hidden, and the globe stops spinning under reduced-motion.
- **Holographic listener globe:** plots country-level counts from `/listeners.json`.

## Listener counts (real code): `netlify/functions/listeners.mjs`
- `GET /listeners.json` (or `/api/listeners`) returns `{countries:{GB:n,…}, updated}`.
- `POST /api/listen` adds 1 to the caller's country. The country comes from Netlify's `context.geo.country.code`.
- Storage is **Netlify Blobs**, store `jhios-listeners`. **No IPs, user agents or per-person data are stored**, only country code totals.
- Rate limits: a 30-minute `jx_l` cookie per browser session, a cap per country per minute, and same-origin requests only.
- Read-modify-write on one blob means a rare lost increment when plays land at the same moment. That's fine for a display counter.
- **Demo data:** the static `listeners.json` holds EXAMPLE placeholder data with `"demo": true`. On Netlify the function takes over that path. The static file only appears when no function is running, for example on a plain static server, and the page then shows a yellow "DEMO DATA" label in the HUD and in the world. The same example set is in `world.js` as a fallback, with the same label.

## tracks.json (320 tracks)
- Built from `jhios-vault/vault.csv` (24 rows) and `catalogue-audit-2026-10-20.csv` (386 YouTube items, public ones only, de-duplicated against the vault).
- Fields: `id,title,artist,lane,album,release_date,duration_s,audio_url,artwork_url,youtube_url,tags` (plus optional `also_on`).
- Lane rules, applied only where the data supports them:
  - The vault's own lane is used.
  - YouTube playlist "SCR3WFAC3 - Sanctum" → `Sanctum`.
  - "Luce Aether" in the title → `Luce Aether`.
  - A SCR3WFAC3 playlist or title → `SCR3WFAC3`.
  - Everything else → `Unsorted`. The vault's "JHIOS" lane also goes to `Unsorted`, tagged `jhios-core`.
- Result: SCR3WFAC3 75, Luce Aether 71, Sanctum 15, JHIOS Soundtracks 4, Unsorted 155.
- The 4 DAM After Dark Vol. 1 entries (Down And Dirty, Make It Drip, Private Show, Let's Get Freaky) come from pack-020. They have no YouTube URL and no audio yet, so they show as not playable and link to Ditto.
- Lee T / Iron Duke and M&M items are excluded.
- Every `audio_url` is empty, so all playback is through YouTube for now. YouTube is also kept in the track view as an "also on" link.

## Other changes
- Removed the broken `/assets/*.jpg|png` references and replaced them with CSS/SVG (portal, keyhole, state panels).
- Removed the 1-byte `scr3wfac3-logo.png` and added an SVG mark (`assets/logo.svg`).
- Added `favicon.svg`, PNG icons, `og-image.png`, Open Graph and Twitter meta, canonical links, `robots.txt` and `sitemap.xml`.
- Accessibility: skip links, focus-visible styles, aria labels, native `<details>`, and `prefers-reduced-motion` support.
- `netlify.toml`: security headers and a CSP that allows jsDelivr and YouTube; cache headers for HTML, assets, `tracks.json` and `/audio/*`; 301 redirects from `.html` to clean URLs; the functions directory.
- `config.js`: `AUDIO_BASE` (one line to switch to R2), endpoints, lanes, and the form URL.
- `tools/serve.py`: local preview server that copies Netlify's clean URLs.

## Testing
- `python3 tools/serve.py 8080`: static run, globe shows DEMO DATA.
- `npx netlify-cli dev`: production-like run with the function and Blobs. It was tested with `--offline --dir .`.
- Playwright tests at 1280×800 and 390×844 (touch) passed on both servers: 50/50 on netlify dev.
- `html-validate` (recommended rules) passes on all pages.

## Needs Joseph
1. **Approval to push to GitHub / deploy on Netlify.** Netlify will install `@netlify/blobs` from `package.json`. No build command is needed.
2. **Self-hosted audio:** create a Cloudflare R2 bucket on a custom domain with CORS for infiniteexchange.online, upload 320 kbps MP3s (or AAC 256), set `AUDIO_BASE`, and fill in `audio_url` per track. Then add the R2 host to the CSP `media-src`; it already allows `https:`.
3. **Master files** for the tracks to self-host, and **rights confirmation** for each one, including collaborations.
4. **Lane assignment for the 155 Unsorted tracks** and the vault's "JHIOS" lane items.
5. **Commission form:** the home page uses the existing Join form (tally.so/r/Y5bYgv). Keep it, or make a dedicated commission form?
6. **Listener backend:** decide whether to enable it. It goes live with the deploy, and the privacy page describes it.

## Deploy blockers / notes
- None are hard blockers.
- The YouTube iframe has to stay visible at 200×200, which takes up some screen. On mobile in the world it sits above the joysticks.
- Netlify's local dev didn't show the custom Cache-Control on `tracks.json`. Check the headers after the first deploy.
- three.js loads from jsDelivr. Pin or self-host it if you want no third-party runtime dependency.
