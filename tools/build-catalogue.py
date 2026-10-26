#!/usr/bin/env python3
"""v62: build the central music catalogue (assets/data/music-catalogue.json) from tracks.json (the playback list; YouTube stays the source),
the world's existing placements (assets/data/yarmouth-landmarks.json) and the approved placements below.
Durations come from local YouTube metadata (jhios-vault/meta/*.info.json) when present, else null. Nothing is invented:
unknown fields stay null, unplaced tracks have worldLocation null.  Re-run after editing tracks.json or PLACEMENTS:
  python3 tools/build-catalogue.py [--meta /workspace/jhios-vault/meta]"""
import json, glob, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
META = sys.argv[sys.argv.index('--meta') + 1] if '--meta' in sys.argv else '/workspace/jhios-vault/meta'
OUT = os.path.join(ROOT, 'assets/data/music-catalogue.json')
tracks = json.load(open(os.path.join(ROOT, 'tracks.json')))['tracks']
LM = json.load(open(os.path.join(ROOT, 'assets/data/yarmouth-landmarks.json')))['landmarks']
prev = {}
if os.path.exists(OUT):
    for t in json.load(open(OUT)).get('tracks', []): prev[t['id']] = t
meta = {}
for f in glob.glob(os.path.join(META, '*.info.json')):
    try: d = json.load(open(f)); meta[d['id']] = d
    except Exception: pass
def yt(u):
    m = re.search(r'(?:v=|youtu\.be/|shorts/|embed/)([\w-]{11})', u or ''); return m.group(1) if m else None

# Catalogue-driven locations (built in world-fx.js catalogueScreens). Plain neutral keys; private homes are never named or numbered.
LOCATIONS = {
  'newtown-flats-east': {'lat': 52.624678, 'lon': 1.735020, 'height_m': 12, 'note': 'Above the Beatty Close flats block (east half; the west half already carries the beatty-close-flat screen). Flats model: world-streets.js v57/v60 (e -143..-86, n 2341). No label/name on the building.'},
  'newtown-park-steps': {'lat': 52.625176, 'lon': 1.735524, 'height_m': 10, 'note': 'Above the steps DOWN from the Newtown Park / Community Centre footpath to the lower path (world-v63.js, e -66 n 2412; v63 replaced the v60 stairs up at e -58.5).'},
  'fallen-angels': {'lat': 52.609897, 'lon': 1.736820, 'height_m': 22, 'note': 'Beside the DAM After Dark sign on Fallen Angels, 83 Marine Parade (world-fx.js damSign, 52.609697,1.736920), offset ~22 m north so the logo stays clear. Music placement only: not a licence or partnership.'},
  'gy-train-station': {'lat': 52.612160, 'lon': 1.720886, 'height_m': 12, 'note': 'Great Yarmouth railway station, Acle New Road (NaPTAN 9100YARMTH 52.612160,1.720886; Wikipedia 52.6118,1.7207). Station building: world-v64.js from OSM way 204723756 (building=train_station).'},
  'seashore-sign': {'lat': 52.631078, 'lon': 1.739532, 'height_m': 9, 'note': 'Over the Seashore Holiday Park & Seafront sign on North Drive by the Seashore north entrance (OSM node 562733171, 52.631203,1.739301; sign model world-v63.js e205 n3070). Music placement only: not a partnership.'},
  'jellicoe-bridge-under': {'lat': 52.627643, 'lon': 1.735556, 'height_m': -5.3, 'note': 'Under the Jellicoe Road bridge (OSM ways 231810834/231810835 bridge=yes) on the service lane beneath (OSM way 231810653). Bridge model world-v63.js; screen hangs under the deck (height_m negative = below the default float height).'},
  # v64
  'gy-cemetery': {'lat': 52.611854, 'lon': 1.728971, 'height_m': 9, 'note': 'Great Yarmouth Old Cemetery (OSM way 175643707, landuse=cemetery). Atmosphere scaffold world-v64.js: plain headstones, yews, two lamps. No crime/cult props.'},
  'bure-park-campfire': {'lat': 52.629641, 'lon': 1.725347, 'height_m': 7, 'note': 'Campfire party scaffold in Bure Park (OSM way 200289880, leisure=park), world-v64.js.'},
  'newtown-back-alley': {'lat': 52.62673, 'lon': 1.734821, 'height_m': 6, 'note': 'Plain Newtown back alley (OSM way 231810665, service=alley) with plain fences (world-v64.js). Approximate spot, not a specific property; no names or numbers.'},
  'pembroke-ave-terrace': {'lat': 52.573137, 'lon': 1.713145, 'height_m': 14, 'note': 'Over Pembroke Avenue, Gorleston (OSM way 38689917), above the street centreline; the existing OSM terrace is left plain. No address, name or home label.'},
  'land-train-north-drive': {'lat': 52.624799, 'lon': 1.738186, 'height_m': 9, 'note': 'Above the land-train route at its North Drive end (world-train.js), the train listening spot.'},
  'scroby-sands-beach': {'lat': 52.631797, 'lon': 1.742564, 'height_m': 8, 'note': 'North Denes beach opposite the Scroby Sands wind farm (30 turbines modelled from OSM generator:source=wind nodes, world-v63.js).'},
}
# Approved placements this batch (Joseph, world wave 26 Oct 2026). Track ids are tracks.json ids.
PLACEMENTS = {
  'newtowns-nameless-original-version': 'newtown-flats-east', 'newtowns-nameless-glitch-version': 'newtown-flats-east',
  'lewi-g': 'newtown-park-steps', 'lewi-g-fr33-pvrty': 'newtown-park-steps',
  'spacexbaby': 'fallen-angels', 'spacexbaby-drum-and-bass-remix': 'fallen-angels', 'spacexbaby-house-remix': 'fallen-angels',
  'kill-me-one-day': 'gy-train-station', 'darkest-parts': 'gy-train-station', 'do-it-alone': 'gy-train-station',
  # v63 (landmarks now modelled)
  'last-christmas': 'seashore-sign', 'last-christmas-dnb-mix': 'seashore-sign',
  'these-streets-done-nuttin-feat-luce-aether': 'jellicoe-bridge-under',
  'eastern-sunlight': 'scroby-sands-beach', 'big-up-the-eastcoast': 'scroby-sands-beach',
  # v64 (IDs from music-catalogue/tracks.json or jhios-vault catalogue-audit-2026-10-20.csv)
  'red-light': 'fallen-angels',
  'see-you-on-the-other-side-cover': 'gy-cemetery', 'blood-on-the-mirror': 'gy-cemetery', 'blood-on-the-money': 'gy-cemetery', 'mask-on-mask-off': 'gy-cemetery',
  'nightmare-pool': 'gy-cemetery', 'can-after-can': 'gy-cemetery', 'trauma-doll': 'gy-cemetery', 'children-of-madness': 'gy-cemetery',
  'a-cell-to-rest': 'newtown-back-alley', 'fr33-bird': 'bure-park-campfire', 'luce-aether-s-train': 'land-train-north-drive',
  'ios-we-rise': 'pembroke-ave-terrace', 'jhios-we-ride-feat-luce-aether': 'pembroke-ave-terrace',
}
# Approved but NOT placed: the place is not modelled / not verified in the world code yet (IDs are known).
DEFERRED = {  # v64
  'm7': 'Deferred v64: Joseph gave an old flats block (private; exact location not given, not guessed) and "outside Troll Cart / under Market Gates" (with Rolling Dreams). Troll Cart (OSM 175596035) and Market Gates (OSM 175506393) exist but Rolling Dreams has no ID yet.',
  'the-great-remembering': 'Deferred v64: Masonic Lodge not found in OSM (local pbf); needs the exact lodge location.',
  'cern-versions-of-reality': 'Deferred v64: to go with The Great Remembering at the Masonic Lodge (not found in OSM).',
  'big-bunda': 'Deferred v64: Fallen Angels area not confirmed by Joseph ("confirm").',
}
# Existing world placements (landmark screens built before v62)
existing = {}
for L in LM:
    if L.get('feature_track'): existing.setdefault(L['feature_track'], []).append(L['key'])
    for i in L.get('wheel_track_ids', []) or []: existing.setdefault(i, []).append(L['key'])
for t in tracks:
    tags = set(t.get('tags') or []); hay = ' | '.join(filter(None, [t.get('title'), t.get('artist'), t.get('album')] + list(tags)))
    if not (yt(t.get('youtube_url')) or t.get('audio_url')): continue
    for L in LM:
        m = (L.get('song_match') or '').lower(); rx = [re.compile(p.replace('(?i)', ''), re.I) for p in L.get('song_patterns', [])]
        if (m and m in f"{t['title']} {t.get('album') or ''}".lower()) or any(r.search(hay) for r in rx) or (L.get('song_tag') and L['song_tag'] in tags) or (L.get('song_album') and (t.get('album') or '').lower() == L['song_album'].lower()):
            existing.setdefault(t['id'], []).append(L['key'])
out = []
for t in tracks:
    y = yt(t.get('youtube_url')); md = meta.get(y) or {}; p = prev.get(t['id'], {})
    locs = list(dict.fromkeys(existing.get(t['id'], []) + ([PLACEMENTS[t['id']]] if t['id'] in PLACEMENTS else [])))
    status = p.get('placementStatus') if p.get('placementStatus') == 'verified' else ('placed' if locs else 'unplaced')
    e = {'id': t['id'], 'title': t['title'], 'artist': t.get('artist') or None, 'project': t.get('album') or None, 'lane': t.get('lane'),
         'youtubeId': y, 'durationSec': t.get('duration_s') or md.get('duration') or None,
         'worldLocation': locs[0] if locs else None, 'worldLocations': locs,
         'artwork': t.get('artwork_url') or (f'https://i.ytimg.com/vi/{y}/hqdefault.jpg' if y else None),
         'caption': p.get('caption'), 'placementStatus': status}
    if t['id'] in DEFERRED: e['placementNote'] = DEFERRED[t['id']]
    out.append(e)
missing = [k for k in list(PLACEMENTS) + list(DEFERRED) if k not in {t['id'] for t in tracks}]
if missing: sys.exit('unknown track ids: %s' % missing)
doc = {'version': 64, 'note': 'Central JHIOS music catalogue (v64). YouTube is the playback source; tracks.json stays the player list. worldLocation null = not placed (never guessed). placementStatus: unplaced | placed (built on a branch) | verified (Joseph confirmed). Built by tools/build-catalogue.py.',
       'locations': LOCATIONS, 'tracks': out}
with open(OUT, 'w') as f: # one track per line: small file, readable diffs
    f.write('{"version": 64,\n "note": %s,\n "locations": %s,\n "tracks": [\n' % (json.dumps(doc['note'], ensure_ascii=False), json.dumps(LOCATIONS, ensure_ascii=False)))
    f.write(',\n'.join('  ' + json.dumps(e, ensure_ascii=False, separators=(',', ':')) for e in out)); f.write('\n ]}\n')
c = {}
for e in out: c[e['placementStatus']] = c.get(e['placementStatus'], 0) + 1
print(len(out), 'tracks', c, 'durations', sum(1 for e in out if e['durationSec']), 'yt', sum(1 for e in out if e['youtubeId']))
