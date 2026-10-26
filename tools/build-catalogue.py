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
  'newtown-park-steps': {'lat': 52.625364, 'lon': 1.735580, 'height_m': 10, 'note': 'Above the steps at the east end of the Newtown Park / Community Centre footpath (world-streets.js v60, e -58.5 n 2416.8).'},
  'fallen-angels': {'lat': 52.609897, 'lon': 1.736820, 'height_m': 22, 'note': 'Beside the DAM After Dark sign on Fallen Angels, 83 Marine Parade (world-fx.js damSign, 52.609697,1.736920), offset ~22 m north so the logo stays clear. Music placement only: not a licence or partnership.'},
  'gy-train-station': {'lat': 52.612160, 'lon': 1.720886, 'height_m': 12, 'note': 'Great Yarmouth railway station, Acle New Road (NaPTAN 9100YARMTH 52.612160,1.720886; Wikipedia 52.6118,1.7207). Station building itself is not modelled yet.'},
}
# Approved placements this batch (Joseph, world wave 26 Oct 2026). Track ids are tracks.json ids.
PLACEMENTS = {
  'newtowns-nameless-original-version': 'newtown-flats-east', 'newtowns-nameless-glitch-version': 'newtown-flats-east',
  'lewi-g': 'newtown-park-steps', 'lewi-g-fr33-pvrty': 'newtown-park-steps',
  'spacexbaby': 'fallen-angels', 'spacexbaby-drum-and-bass-remix': 'fallen-angels', 'spacexbaby-house-remix': 'fallen-angels',
  'kill-me-one-day': 'gy-train-station', 'darkest-parts': 'gy-train-station', 'do-it-alone': 'gy-train-station',
}
# Approved but NOT placed: the place is not modelled / not verified in the world code yet (IDs are known).
DEFERRED = {
  'last-christmas': 'Approved for the "Seashore Holiday Park & Seafront" sign; the sign is not modelled and its exact spot is unverified.',
  'last-christmas-dnb-mix': 'Approved for the "Seashore Holiday Park & Seafront" sign; the sign is not modelled and its exact spot is unverified.',
  'these-streets-done-nuttin-feat-luce-aether': 'Approved for under Jellicoe bridge; no Jellicoe bridge exists in the world code yet and its exact spot is unverified.',
  'eastern-sunlight': 'Approved for the beach opposite the wind turbines; turbines are not modelled and the exact beach spot is unverified.',
  'big-up-the-eastcoast': 'Approved for the beach opposite the wind turbines; turbines are not modelled and the exact beach spot is unverified.',
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
doc = {'version': 62, 'note': 'Central JHIOS music catalogue (v62). YouTube is the playback source; tracks.json stays the player list. worldLocation null = not placed (never guessed). placementStatus: unplaced | placed (built on a branch) | verified (Joseph confirmed). Built by tools/build-catalogue.py.',
       'locations': LOCATIONS, 'tracks': out}
with open(OUT, 'w') as f: # one track per line: small file, readable diffs
    f.write('{"version": 62,\n "note": %s,\n "locations": %s,\n "tracks": [\n' % (json.dumps(doc['note'], ensure_ascii=False), json.dumps(LOCATIONS, ensure_ascii=False)))
    f.write(',\n'.join('  ' + json.dumps(e, ensure_ascii=False, separators=(',', ':')) for e in out)); f.write('\n ]}\n')
c = {}
for e in out: c[e['placementStatus']] = c.get(e['placementStatus'], 0) + 1
print(len(out), 'tracks', c, 'durations', sum(1 for e in out if e['durationSec']), 'yt', sum(1 for e in out if e['youtubeId']))
