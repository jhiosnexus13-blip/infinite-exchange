# Infinite Exchange 3D world — changelog and decision log (expansion-pack protocols)

Live is v129 on main (merged PR #19, 27 Nov 16:14 UK). Work for this pass lives on branch `v130-preview` (preview only, never merged without Joseph saying "live").
Preview: https://deploy-preview-N--sunny-froyo-1f7d52.netlify.app/world?v=130

Protocols carried into every entry: free tiers only; phone-light (shared/instanced geometry, no per-building materials); every behaviour behind a toggle that defaults to the new, safe behaviour; private homes are never labelled (GYnet palm terrace and Lewi G's house get only plain fronts / generic interiors); no tattoos on NPCs; landmarks and existing enterables (CERN, Dance, Viper, the office) are left as built; one push per pass, `?v=` bumped.

## v130 — Newtown homes, walkable Beatty stairs, UK street signs, Sturdee bedroom (this pass)
Joseph (27 Nov): wants missing Newtown buildings filled so people can visit their own homes, upstairs and downstairs where appropriate, Bill's Beatty flats outside stairs to actually raise and lower the camera, typical UK street-name signs, and his old messy bedroom at 23 Sturdee Avenue (unlabelled), with later room-detail refs (gold JOE tag with a cross in the O, strobe in the ceiling corner).

- **OSM footprints:** a fresh Overpass pull of `building=*` ways over the expanded Newtown bbox (Sturdee / Beatty / Jellicoe / Barnard / Newtown Park, lat 52.6220–52.6295, lon 1.7268–1.7398) found 129 ways. All of them were already in `yarmouth-geo.json` (0 missing outlines). Barnard Avenue / Crescent have essentially no OSM building outlines at all; most individual Newtown houses are also unmapped. Gap reported: homes not in OSM cannot be placed as exact footprints without photos or another address dataset.
- **Gap-fill (`IE_V130_FILL`, default on):** `assets/data/newtown-v130-fill.json`, baked by `tools/build-newtown-v130-fill.py`, places unlabelled generic two-storey terrace plots along OSM road centrelines (from `gy-roads-v121.json`) where no existing footprint, reserved plot, racecourse or seafront is in the way. Roads already handled by the v50/v60 `world-streets.js` fillers are skipped (Sturdee, Beatty Road, Chaucer, etc.). Beatty Close, North Drive and the GYnet / Lewi G / park / pub plots are left alone. Plots are merged into a few solid meshes, registered in `fx.COL` so v128 doors and interiors attach, and never labelled. Count is in the JSON `counts` field.
- **Upstairs / downstairs (`world-v128.js`):** two-storey houses (height 5–10.5 m, not a large shop floor, not the Beatty Close bungalow plots) share one cheap off-map upstairs plus a walkable staircase; bungalows and shops stay single-storey. Same exit door. `window.__groundParts` follows the stair so the POV rises and falls.
- **Beatty flats stairs (`IE_V130_STAIRS`, default on):** two flights at the existing decorative-stair stations on the north face of the flats, plus the first-floor walkway, are walkable. A `__groundParts` ramp (unshift, so it wins over the LIDAR ground) lifts the camera from grade to y=2.9 and back down. Upper landings are reachable.
- **UK street signs (`IE_V130_SIGNS`, default on):** white plate, black lettering, thin black border, grey post, at named-road junctions from `gy-roads-v121.json`. Newtown junctions first, then the rest of town up to a cap (90 on phones, 220 otherwise). No house numbers.
- **23 Sturdee bedroom (`IE_V130_23`, default on, `bedroom-23-sturdee.js`):** the unlabelled east-side house (OSM has no house numbers; placed from street-number order as the 5th odd house from the south, first east-side cluster on the N–S stretch, e≈-124.5 n≈2412) has a dingy downstairs hall, walkable stairs, and the messy bedroom upstairs: west wall off-white/grey floor-to-ceiling scrawl with a gold spray JOE tag (cross inside the O) and a deep-red lower band; north wall off-white scrawl on the top band, evocation poster + striped shirt at the top left, deep-red lower two-thirds with black marker and a few white phrases, double plug on the right, dark poster/flag high right, red mattress on the floor with white clothes piled on it, messy bedding and clothes, music gear, corner cabinet, light switch on the red wall. Dim warm fill plus a small ceiling-corner strobe at 1.5 Hz (short duty cycle, not seizure-fast; `prefers-reduced-motion` keeps a steady glow). No people, no label, no number, no address. Module is isolated so it can be refined when photos arrive.
- Toggles default on: `IE_V130_FILL=false`, `IE_V130_STAIRS=false`, `IE_V130_SIGNS=false`, `IE_V130_23=false`. Cache-bust `?v=130`. Preview only; do not merge to main until Joseph says "live".

## v129 — Newtown doors, full-volume audio, varied interiors (this pass)
Joseph (26 Nov 07:33): "No need for privacy, and what about the audio proximity issues?" plus "also all indoors should be varied".
- **Newtown (`IE_V128_FRONTS` / `IE_V128_ENTER`, still default on):** removed the residential exclusion box. Sturdee Avenue terrace, Lewi G's house and the other Newtown homes now get the same street door, frame, canopy, ground-floor windows and enterable interior as the rest of town. Still no labels, names or addresses on any house.
- **Audio:** the pre-v126 walk-up fade (volume = 25 + 75 * closeness to the playing holo, written every 0.25 s via `JX.setVolume`) was already removed in v126 and was not reintroduced by v127/v128. Audit of every audio path (JX HTMLAudio + YouTube IFrame, Viper CSS3D stage `setVolume(100)`, CERN/Dance room music start/stop which is enter/exit not distance, office, train auto-play, arcade canvas, chat voice notes, beat-analyser MediaElementSource with no panner, no THREE.PositionalAudio anywhere) found no remaining distance fade, rolloff, panning, auto-pause or out-of-range mute on music/video. Two leftovers could still *sound* like proximity: (1) a faded `jx_vol` saved from before v126 was re-applied on load because the v126 one-shot `JX.setVolume(100)` did not persist to localStorage; (2) the one-shot could lose a race with a late YouTube `onReady`. v129 migrates `jx_vol` to 100 once (`jx_vol_v129`) and keeps the one-shot restore. Voice-chat proximity code stays dormant. After the migrate, the visitor's own slider or device volume is the only attenuation.
- **Varied interiors:** the one shared off-map room now swaps one of eight cheap prop-set variants, picked deterministically from the building's footprint (lounge, kitchen, cafe, pub, office, bedroom, arcade, workshop). Different layout, props, wall/floor colour and light. Same door, same exit, same wall clamp plus per-variant blockers. Built lazily, only one variant visible. No labels.
- Toggles unchanged: `IE_V128_FRONTS=false`, `IE_V128_ENTER=false`. No new audio toggle (proximity stays off).

## v128 — fronts and enterable
Joseph (26 Nov 07:20): "buildings seem to be more like open garages now ... we should be able to enter most buildings".
- **Fix (regression from v127):** the v127 brick/plaster wall material was `FrontSide`; OSM wall winding is mixed, so many street faces were culled and you saw the insides. facade69 was always `DoubleSide`. v127 material is now `DoubleSide`, opaque, and roofs are darkened again like facade69. Toggle: `IE_V127_BRICK=false` still reverts to facade69.
- **Fronts (`IE_V128_FRONTS`, default on):** `world-v128.js` picks one street-facing edge per ordinary building (longest, open-air edge; party walls skipped) and draws a door, frame, canopy and up to four ground-floor windows with 4 shared `InstancedMesh`es (frames, doors, glass, canopies), streamed within 110 m (80 m on phones) and capped at 520 (260 phones). Positions account for the v69 skin being scaled 1.025 about the centroid. No facade shader, so no TV static.
- **Enter (`IE_V128_ENTER`, default on):** walk up to a door (prompt "ENTER — tap / F", or walk into it for ~0.4 s) -> fade -> one shared lit room built off-map once (x -1300, z -4600, floor y -230) and re-tinted per building; walls clamp the player, the table is pushed off, the door is the exit ("EXIT — tap / Enter / F" or walk into it) and returns you 1.7 m outside the same door, nudged to open ground via `__collide`. Nothing is labelled.
- **Left alone:** Newtown residential box (e -330..240, n 2060..2760: Sturdee Avenue terrace, Lewi G's house) gets no doors and is not enterable; landmark / plaza clear zones; buildings replaced by landmark models; v87 rooms and the v109 office own their own entrances.
- **Why:** doorless extruded boxes read as "open garages"; one generic interior is the leanest robust way to make most buildings enterable (no per-building geometry, no stuck spots, off-map so no town collision to cut).

## v127
Brick (Poly Haven brick_4) + procedural plaster on ordinary facade69 walls, world-space UVs (`IE_V127_BRICK`); dark north seafront ground and v121 roads lifted (`IE_V127_GROUND`); facade69 window pattern fades out at distance (speckle fix); leftover Barnard Field toy-bridge ground/solids/jump removed (`IE_V127_FIELD=false` restores). No new OSM seafront footprints exist in the Geofabrik extract north of The Avenues.

## v126
Music/YouTube/video always full volume; proximity volume code left dormant for the future live voice-chat relay.

## v125
Walk through parked cars and vans; building collision unchanged.

## v124
Town-wide v123 facade sweep defaulted off (TV static; `IE_V123_FACADES===true` revives it); Arc Cinema keeps its windows; camera roll locked to 0.

## v123
World-wide camera/collision (radius 0.8, near 0.15), detailed instanced parked cars, facade sweep (now off).

## v122
Visitors, jump toast, no-reload gfx chip, self-hosted brick_4, z-fight fix, GoldBot kiosk, hatch labels, first WebXR.
