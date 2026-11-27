#!/usr/bin/env python3
"""Bake generic Newtown gap-fill footprints for v130.

OSM building outlines in this area are already in yarmouth-geo.json (0 missing
ways in the expanded Newtown bbox). Many streets — especially Barnard Avenue
and Barnard Crescent — have no building outlines in OSM at all. This script
walks named OSM road centrelines (gy-roads-v121.json) and places unlabelled
terrace plots where no existing footprint or reserved plot is within the
offset, same idea as the v50 world-streets fillers.

No house numbers or addresses are written into the data.
"""
from __future__ import annotations
import json, math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'assets' / 'data'
OUT = DATA / 'newtown-v130-fill.json'

# Expanded Newtown: Sturdee / Beatty / Jellicoe / Barnard / Newtown Park
BB = (-640, 2080, 180, 2860)
LEN = 11.0
DEP = 7.5
OFF = 9.0
GAP = 1.2

RESERVED = [
    (-155, 2286, -75, 2362, 'beatty-flats'),
    (-217, 2325, -176, 2375, 'avenue-pub'),
    (-150, 2447, -130, 2483, 'gynet-terrace'),  # west-side palm terrace, do not overwrite
    (-62, 2401, -52, 2411, 'lewi-house'),
    (-98, 2396, -68, 2416, 'youth-centre-path'),
    (-104, 2419, -66, 2452, 'newtown-park'),
    (-260, 2665, -180, 2720, 'racecourse-gate'),
]
# Roads that already have a purpose-built model or shouldn't get housing
SKIP_NAMES = {
    '', 'A47', 'A149', 'Breydon Bridge', 'Caister Road', '6F600',
    'Beatty Close',  # purpose-built flats + bungalows
    'North Drive',   # seafront, already in the world pass
    'River Walk',
    # These already have v50/v60 procedural terraces in world-streets.js
    'Beatty Road', 'Raleigh Avenue', 'Sturdee Avenue', 'Shakespeare Road',
    'Tennyson Road', 'Madden Avenue', 'Chaucer Road', 'Cunningham Avenue',
    'Byron Road',
}

def flat(a):
    return [(a[i], a[i + 1]) for i in range(0, len(a), 2)] if a else []

def cxy(pts):
    return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)

def in_box(e, n, b):
    return b[0] <= e <= b[2] and b[1] <= n <= b[3]

def load():
    G = json.loads((DATA / 'yarmouth-geo.json').read_text())
    X = json.loads((DATA / 'newtown-streets.json').read_text())
    R = json.loads((DATA / 'gy-roads-v121.json').read_text())
    exist = []
    for b in G['buildings']:
        pts = flat(b[1])
        if len(pts) < 3:
            continue
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        exist.append((min(xs) - 1, min(ys) - 1, max(xs) + 1, max(ys) + 1))
    for f in X['buildings']:
        pts = flat(f)
        if len(pts) < 3:
            continue
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        exist.append((min(xs) - 1, min(ys) - 1, max(xs) + 1, max(ys) + 1))
    TR = X['terrace']
    hs = TR['houses']
    exist.append((TR['front'] - TR['depth'] - 3, hs[0][0] - 1, TR['front'] + 4, hs[-1][0] + TR['w'] + 1))
    for g in X.get('green_extra') or []:
        pts = flat(g)
        if len(pts) < 3:
            continue
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        exist.append((min(xs), min(ys), max(xs), max(ys)))
    polys = []
    RC = json.loads((DATA / 'newtown-extra.json').read_text())
    if RC.get('racecourse') and RC['racecourse'].get('outer'):
        for ring in RC['racecourse']['outer']:
            polys.append(ring)
    return G, X, R, exist, polys

def inpoly(p, e, n):
    c = False
    for i in range(len(p)):
        j = (i - 1) % len(p)
        xi, yi = p[i]; xj, yj = p[j]
        if ((yi > n) != (yj > n)) and e < (xj - xi) * (n - yi) / ((yj - yi) or 1e-12) + xi:
            c = not c
    return c

def blocked(e, n, exist, extra, polys=()):
    if not (BB[0] <= e <= BB[2] and BB[1] <= n <= BB[3]):
        return 'bbox'
    if e > 80:
        return 'seafront'
    for b in RESERVED:
        if in_box(e, n, b):
            return b[4]
    for poly in polys:
        if inpoly(poly, e, n):
            return 'racecourse'
    for b in exist:
        if in_box(e, n, b):
            return 'existing'
    for b in extra:
        if in_box(e, n, b):
            return 'new'
    return None

def walk_road(pts, exist, extra, name, polys):
    out = []
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy)
        if L < 4:
            continue
        tx, ty = dx / L, dy / L
        nx, ny = -ty, tx
        s = 2.0
        while s < L - 2.0:
            cx, cy = a[0] + tx * s, a[1] + ty * s
            for sign in (1, -1):
                mx = cx + nx * sign * OFF
                my = cy + ny * sign * OFF
                # plot corners (front along the road, depth outward)
                hw, hd = LEN / 2, DEP / 2
                fe = mx - tx * hw - nx * sign * hd
                fn = my - ty * hw - ny * sign * hd
                # occupancy test at centre and four corners
                corners = [
                    (mx, my),
                    (mx + tx * hw + nx * sign * hd, my + ty * hw + ny * sign * hd),
                    (mx + tx * hw - nx * sign * hd, my + ty * hw - ny * sign * hd),
                    (mx - tx * hw + nx * sign * hd, my - ty * hw + ny * sign * hd),
                    (mx - tx * hw - nx * sign * hd, my - ty * hw - ny * sign * hd),
                ]
                if any(blocked(e, n, exist, extra, polys) for e, n in corners):
                    continue
                # also keep off the carriageway
                if any(abs((e - cx) * nx + (n - cy) * ny) < 5.5 and abs((e - cx) * tx + (n - cy) * ty) < hw + 1 for e, n in corners):
                    # centre is already at OFF=9, this just rejects if a corner swings in
                    if min(abs((e - cx) * nx + (n - cy) * ny) for e, n in corners) < 5.0:
                        continue
                pts4 = [
                    [round(mx + tx * hw + nx * sign * hd, 1), round(my + ty * hw + ny * sign * hd, 1)],
                    [round(mx - tx * hw + nx * sign * hd, 1), round(my - ty * hw + ny * sign * hd, 1)],
                    [round(mx - tx * hw - nx * sign * hd, 1), round(my - ty * hw - ny * sign * hd, 1)],
                    [round(mx + tx * hw - nx * sign * hd, 1), round(my + ty * hw - ny * sign * hd, 1)],
                ]
                xs = [p[0] for p in pts4]; ys = [p[1] for p in pts4]
                rec = {
                    'pts': [c for p in pts4 for c in p],
                    'h': 6.2,
                    'storeys': 2,
                    'cx': round(mx, 1),
                    'cy': round(my, 1),
                    'road': name,
                }
                out.append(rec)
                extra.append((min(xs) - GAP, min(ys) - GAP, max(xs) + GAP, max(ys) + GAP))
            s += LEN + 0.8
    return out

def main():
    G, X, R, exist, polys = load()
    names = R['names']
    extra = []
    fills = []
    by_road = {}
    for r in R['roads']:
        cls, _w, _fl, ni, coords = r
        if cls < 1 or cls > 3:
            continue
        name = names[ni] if 0 <= ni < len(names) else ''
        if name in SKIP_NAMES:
            continue
        pts = flat(coords)
        if len(pts) < 2:
            continue
        # keep a road if any vertex is in the expanded bbox
        if not any(BB[0] <= p[0] <= BB[2] and BB[1] <= p[1] <= BB[3] for p in pts):
            continue
        added = walk_road(pts, exist, extra, name, polys)
        if added:
            fills.extend(added)
            by_road[name] = by_road.get(name, 0) + len(added)
    # 23 Sturdee: unlabelled two-storey house on the east side, 5th odd
    # house from the south (3, 7, 11, 13, 23). OSM has no house numbers;
    # location is the first east-side UPRN cluster on the N–S stretch.
    # Never write a number or address into any visible world string.
    house23 = {
        'pts': [-127.6, 2409.0, -121.4, 2409.0, -121.4, 2415.2, -127.6, 2415.2],
        'h': 6.2,
        'storeys': 2,
        'cx': -124.5,
        'cy': 2412.0,
        'road': 'Sturdee Avenue',
        'special': 'bedroom-23',
    }
    fills.append(house23)
    out = {
        'note': (
            'v130 Newtown gap-fill. OSM building ways in this bbox were already '
            'in yarmouth-geo.json (0 missing outlines). Plots below are unlabelled '
            'generic terraces along OSM road centrelines where no building outline '
            'exists (Barnard area especially). No house numbers or addresses. '
            'The Sturdee east-side special house is unlabelled; its interior is '
            'wired in bedroom-23-sturdee.js. © OpenStreetMap contributors (ODbL).'
        ),
        'bbox': list(BB),
        'counts': {
            'plots': len(fills),
            'by_road': dict(sorted(by_road.items(), key=lambda kv: (-kv[1], kv[0]))),
        },
        'house23': {'e': -124.5, 'n': 2412.0},
        'buildings': fills,
    }
    OUT.write_text(json.dumps(out, separators=(',', ':')) + '\n')
    print('wrote', OUT, 'plots', len(fills), 'by_road', out['counts']['by_road'])

if __name__ == '__main__':
    main()
