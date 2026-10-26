/* JHIOS world v58 — River Yare / Breydon Water / River Bure, plus the harbour-side landmarks rebuilt from photos.
   Water: the real OSM water polygons already in yarmouth-geo.json (© OpenStreetMap contributors; the big tidal ones: River Yare
   incl. the harbour mouth, Breydon Water, River Bure) drawn as ONE merged mesh with an animated shader in the sea's style
   (same sine-sum waves, crest highlights and shimmer, shared uTime/uDay/uG with the sea) but calmer, darker and greener.
   Collision: fx.waterHit(e, n) is tested by collide() in world-fx.js, so the river blocks walking the same way buildings do;
   the real OSM bridge decks (Haven Bridge, Herring Bridge, Breydon Bridge, Vauxhall Bridge, Acle New Road / Bure) are exempt.
   Models (MeshBasic, merged per material, no colliders):
   - Herring Bridge (Great Yarmouth Third River Crossing, opened Feb 2024; OSM way 1248888737, man_made=bridge, bascule):
     twin-leaf bascule from Geograph photos (geo-ref/landmarks/herring-bridge): grey concrete pier/machinery houses either bank,
     two flat steel leaves meeting mid-river, carriageway with footways and railings, control building on the east pier.
   - Gorleston Coastwatch (NCI lookout, South Pier, OSM node 2326738997): white-rendered square lookout with a glazed red-brown
     upper cabin, roof rail, lattice radio mast and NCI flag (geo-ref/landmarks/gorleston-coastwatch).
   - Gorleston (Range Rear) Lighthouse, Riverside Road (OSM way 223802990, built 1878): ~21 m tapered red-brick round tower,
     small windows, white gallery with rail, red lantern cap (geo-ref/landmarks/gorleston-lighthouse). */
const RIVER_MIN_A = 40000, RIVER_MAX_W = -3000; // big polygons in the town's river corridor = Yare / Breydon / Bure
export const BRIDGES = [ // [lat1, lon1, lat2, lon2, half-width m] real OSM bridge ways
  [52.60643, 1.721964, 52.606972, 1.72325, 11, 'Haven Bridge'],
  [52.592965, 1.72505, 52.592965, 1.72705, 17, 'Herring Bridge'],
  [52.61313, 1.716614, 52.611075, 1.714759, 9, 'Breydon Bridge'],
  [52.611576, 1.721763, 52.611325, 1.722, 5, 'Vauxhall Bridge'],
  [52.612517, 1.722192, 52.61204, 1.723116, 10, 'Acle New Road (Bure)'],
];
const area = c => { let A = 0; const N = c.length / 2; for (let i = 0; i < N; i++) { const j = (i + 1) % N; A += c[i * 2] * c[j * 2 + 1] - c[j * 2] * c[i * 2 + 1]; } return Math.abs(A / 2); };
export function isRiver(c) { let mx = -1e9; for (let i = 0; i < c.length; i += 2) mx = Math.max(mx, c[i]); return mx > RIVER_MAX_W && area(c) > RIVER_MIN_A; }
function inPoly(p, e, n) { let c = false; for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) { const xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1]; if ((yi > n) !== (yj > n) && e < (xj - xi) * (n - yi) / (yj - yi) + xi) c = !c; } return c; }

export function initRiver(o) {
  const { T, S, W, LBL, LITE, LOW, fx, warp, local, G } = o; const out = { polys: 0 };
  const polys = (G.water || []).filter(isRiver); out.polys = polys.length;
  // ---- collision grid (raw local metres: e east, n north) ----
  const CS = 64, grid = new Map();
  for (const c of polys) { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < c.length; i += 2) { x0 = Math.min(x0, c[i]); x1 = Math.max(x1, c[i]); y0 = Math.min(y0, c[i + 1]); y1 = Math.max(y1, c[i + 1]); }
    const b = { p: c, x0, x1, y0, y1 }; for (let i = Math.floor(x0 / CS); i <= Math.floor(x1 / CS); i++) for (let j = Math.floor(y0 / CS); j <= Math.floor(y1 / CS); j++) { const k = i + ':' + j; (grid.get(k) || grid.set(k, []).get(k)).push(b); } }
  const br = BRIDGES.map(([a, b, c, d, hw]) => { const p = local(a, b), q = local(c, d); return [p.e, p.n, q.e, q.n, hw]; });
  const onBridge = (e, n) => br.some(([ax, ay, bx, by, hw]) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((e - ax) * dx + (n - ay) * dy) / l)); return Math.hypot(e - ax - t * dx, n - ay - t * dy) < hw; });
  fx.waterHit = (e, n) => { const l = grid.get(Math.floor(e / CS) + ':' + Math.floor(n / CS)); if (!l) return false; for (const b of l) if (e > b.x0 && e < b.x1 && n > b.y0 && n < b.y1 && inPoly(b.p, e, n)) return !onBridge(e, n); return false; };
  fx.onBridge = onBridge;
  // ---- one merged river mesh ----
  const pos = []; for (const c of polys) { const W3 = []; for (let i = 0; i < c.length; i += 2) W3.push(warp(c[i], c[i + 1]));
    const tri = T.ShapeUtils.triangulateShape(W3.map(v => new T.Vector2(v.x, v.z)), []); for (const t of tri) for (const k of t) pos.push(W3[k].x, 0.08, W3[k].z); }
  const su = fx.sea ? fx.sea.uniforms : {};
  const m = new T.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, side: T.DoubleSide,
    uniforms: { uTime: su.uTime || { value: 0 }, uDay: su.uDay || { value: 0 }, uG: su.uG || window.__glowU || { value: 1 } },
    vertexShader: `varying vec3 vW; varying float vD; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime; uniform float uDay; uniform float uG; varying vec3 vW; varying float vD;
      void main(){ vec2 p = vW.xz; float t = uTime * 0.6; // same sine-sum swell as the sea, ~half the amplitude and speed (sheltered river)
        float h = (sin(p.x * 0.08 + t * 0.9) * 0.35 + sin(p.y * 0.11 - t * 0.7) * 0.25 + sin((p.x + p.y) * 0.21 + t * 1.3) * 0.12${LOW ? '' : ' + sin(p.x * 0.37 - p.y * 0.19 + t * 2.1) * 0.06 + sin(p.y * 0.53 + p.x * 0.11 - t * 1.7) * 0.05'}) * 0.55;
        float crest = smoothstep(0.12, 0.4, h);
        float sh = ${LOW ? '0.0' : 'pow(max(0.0, sin(p.x * 0.9 + uTime * 1.0) * sin(p.y * 0.7 - uTime * 0.8)), 8.0)'};
        float rip = 0.5 + 0.5 * sin(p.x * 1.3 + p.y * 0.4 + uTime * 0.8 + sin(p.y * 0.2) * 2.0);
        float grid = step(0.95, fract(p.x * 0.25)) + step(0.95, fract(p.y * 0.25));
        vec3 deep = mix(vec3(0.0, 0.06, 0.07), vec3(0.06, 0.24, 0.24), uDay), lite = mix(vec3(0.04, 0.32, 0.30), vec3(0.22, 0.46, 0.40), uDay);
        vec3 c = deep + lite * (h * 0.45 + 0.2) + vec3(0.55, 0.8, 0.75) * (crest * 0.12 + sh * 0.25) + vec3(0.3, 0.6, 0.55) * (rip * 0.04 + grid * 0.06);
        float f = exp(-max(vD - 400.0, 0.0) * 0.0015);
        gl_FragColor = vec4(c * (0.9 + 0.1 * uG), 0.86 * (0.55 + 0.45 * f)); }` });
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeBoundingSphere();
  const mesh = new T.Mesh(g, m); mesh.name = 'river'; mesh.renderOrder = -1; mesh.raycast = () => {}; S.add(mesh); fx.river = m; out.tris = pos.length / 9;
  // ---- models ----
  const at = (lat, lon) => W(lat, lon);
  const kit = (name, lat, lon, ry = 0) => { const grp = new T.Group(); grp.name = name; grp.position.copy(at(lat, lon)); grp.rotation.y = ry; S.add(grp);
    const parts = new Map(); const mats = new Map();
    const M = (c, map) => { const k = map ? map.uuid : c; if (!mats.has(k)) mats.set(k, new T.MeshBasicMaterial(map ? { map } : { color: c })); return mats.get(k); };
    const A = (geo, c, x, y, z, rx = 0, ry2 = 0, rz = 0, map) => { geo.rotateX(rx); geo.rotateY(ry2); geo.rotateZ(rz); geo.translate(x, y, z); const k = map ? map.uuid : c; (parts.get(k) || parts.set(k, { c, map, g: [] }).get(k)).g.push(geo.index ? geo.toNonIndexed() : geo); };
    const done = () => { for (const { c, map, g: gs } of parts.values()) { const mg = merge(gs); const mm = new T.Mesh(mg, M(c, map)); mm.raycast = () => {}; grp.add(mm); } return grp; };
    return { grp, A, done }; };
  const merge = gs => { let n = 0; for (const x of gs) n += x.attributes.position.count; const P = new Float32Array(n * 3), U = new Float32Array(n * 2); let o2 = 0;
    for (const x of gs) { P.set(x.attributes.position.array, o2 * 3); if (x.attributes.uv) U.set(x.attributes.uv.array, o2 * 2); o2 += x.attributes.position.count; }
    const r = new T.BufferGeometry(); r.setAttribute('position', new T.BufferAttribute(P, 3)); r.setAttribute('uv', new T.BufferAttribute(U, 2)); r.computeBoundingSphere(); return r; };
  const brick = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#7a5a4a'; x.fillRect(0, 0, 128, 128);
    for (let r = 0; r < 16; r++) for (let k = -1; k < 6; k++) { const v = 0.8 + Math.random() * 0.35; x.fillStyle = `rgb(${168 * v | 0},${70 * v | 0},${48 * v | 0})`; x.fillRect(k * 24 + (r % 2) * 12 + 1, r * 8 + 1, 23, 7); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(5, 14); return t; })();
  const lab = (txt, col, s, p) => { const l = LBL(txt, col, s); l.position.copy(p); S.add(l); return l; };

  // Herring Bridge: OSM outline 52.592825-52.593105 N, 1.72547-1.72664 E => ~79 m E-W span, ~31 m wide incl. footways. Local x = east, z = south.
  { const { grp, A, done } = kit('herring-bridge', 52.592965, 1.726055); const L2 = 79, HALF = L2 / 2, DW = 20, FW = 3.2, Y = 0.28;
    const GREY = 0x8c9096, DARK = 0x3a3d42, STEEL = 0x5e6c78, WHITE = 0xe8eaec, RAIL = 0xb9c2c9;
    for (const s of [-1, 1]) { // concrete pier / machinery houses on each bank (the leaves pivot here), with approach deck
      A(new T.BoxGeometry(18, 6.5, DW + FW * 2 + 4), GREY, s * (HALF - 4), -3.0, 0); // pier body down to the water
      A(new T.BoxGeometry(30, 0.3, DW + FW * 2), DARK, s * (HALF + 10), Y - 0.12, 0); // approach carriageway
      for (const z of [-1, 1]) A(new T.BoxGeometry(16, 3.2, 2.6), GREY, s * (HALF - 4), Y + 1.6, z * (DW / 2 + FW + 1.3)); } // parapet / machinery housings either side
    // two leaves meeting mid-channel: steel deck slab, side girders, road + footways
    for (const s of [-1, 1]) { const cx = s * (HALF - 12) / 2 - s * 0; const len = HALF - 12 + 0.01;
      A(new T.BoxGeometry(len, 1.2, DW + FW * 2), STEEL, s * len / 2, Y - 0.75, 0);
      for (const z of [-1, 1]) A(new T.BoxGeometry(len, 1.1, 0.5), STEEL, s * len / 2, Y + 0.35, z * (DW / 2 + FW + 0.2)); }
    A(new T.BoxGeometry(L2 - 4, 0.06, DW), DARK, 0, Y, 0); // carriageway (dark tarmac)
    for (const z of [-1, 1]) { A(new T.BoxGeometry(L2 - 4, 0.18, FW), 0xa9a49a, 0, Y + 0.06, z * (DW / 2 + FW / 2)); // footways
      A(new T.BoxGeometry(L2, 0.08, 0.08), RAIL, 0, Y + 1.25, z * (DW / 2 + FW)); A(new T.BoxGeometry(L2, 0.06, 0.06), RAIL, 0, Y + 0.7, z * (DW / 2 + FW)); // pedestrian rails
      for (let x = -HALF; x <= HALF; x += 2.5) A(new T.BoxGeometry(0.07, 1.25, 0.07), RAIL, x, Y + 0.62, z * (DW / 2 + FW));
      A(new T.BoxGeometry(L2 - 4, 0.9, 0.3), 0xd0d4d8, 0, Y + 0.45, z * (DW / 2)); } // vehicle barrier between road and footway
    for (const z of [-5, 5]) A(new T.BoxGeometry(L2 - 6, 0.07, 0.25), WHITE, 0, Y + 0.04, z); // lane lines (2+2 lanes)
    A(new T.BoxGeometry(0.4, 0.08, DW), 0xffd24a, 0, Y + 0.05, 0); // leaf joint
    // control building on the east (South Denes) pier, north side: two-storey grey box with dark glazing (from the river-level photos)
    A(new T.BoxGeometry(10, 7, 8), 0x9aa2a8, HALF + 3, Y + 3.5, -(DW / 2 + FW + 7)); A(new T.BoxGeometry(10.2, 1.6, 8.2), 0x233240, HALF + 3, Y + 5.4, -(DW / 2 + FW + 7));
    for (const s of [-1, 1]) for (const z of [-1, 1]) { A(new T.BoxGeometry(0.25, 6, 0.25), 0x9aa3ad, s * (HALF + 2), Y + 3, z * (DW / 2 + FW + 0.8)); A(new T.BoxGeometry(0.7, 0.3, 0.4), 0xff3b2f, s * (HALF + 2), Y + 6.1, z * (DW / 2 + FW + 0.8)); } // barrier signal masts
    for (let x = -HALF + 4; x <= HALF - 4; x += 18) for (const z of [-1, 1]) { A(new T.CylinderGeometry(0.12, 0.16, 8, 6), 0xb9c2c9, x, Y + 4, z * (DW / 2 + 0.3)); A(new T.BoxGeometry(1.4, 0.2, 0.4), 0xeef3f6, x, Y + 8, z * (DW / 2 - 0.3)); } // lighting columns
    done(); fx.herringBridge = grp.position.clone(); }

  // Gorleston Coastwatch (NCI lookout) on the South Pier: ~5.5 m square white base, red-brown glazed cabin, roof rail, lattice mast.
  { const { grp, A, done } = kit('gorleston-coastwatch', 52.5721123, 1.738101);
    const WHITE = 0xeeeeea, MAROON = 0x7a3a30, GLASS = 0x26343e;
    A(new T.BoxGeometry(6, 3.2, 6), WHITE, 0, 1.6, 0); A(new T.BoxGeometry(6.4, 0.25, 6.4), 0xbfc3c4, 0, 3.3, 0);
    A(new T.BoxGeometry(5.6, 2.4, 5.6), MAROON, 0, 4.6, 0); for (const [x, z, ry] of [[2.82, 0, 0], [-2.82, 0, 0], [0, 2.82, Math.PI / 2], [0, -2.82, Math.PI / 2]]) A(new T.BoxGeometry(0.06, 1.2, 4.8), GLASS, x, 4.8, z, 0, ry);
    A(new T.BoxGeometry(6, 0.3, 6), WHITE, 0, 5.95, 0); for (const [x, z, w, d] of [[3, 0, 0.06, 6], [-3, 0, 0.06, 6], [0, 3, 6, 0.06], [0, -3, 6, 0.06]]) A(new T.BoxGeometry(w, 0.06, d), 0xdddddd, x, 7.0, z);
    for (const [x, z] of [[3, 3], [-3, 3], [3, -3], [-3, -3]]) A(new T.BoxGeometry(0.06, 1, 0.06), 0xdddddd, x, 6.5, z);
    for (const [x, z] of [[-1.8, -1.6], [-1.0, -1.6], [-1.4, -0.9]]) A(new T.CylinderGeometry(0.06, 0.06, 9, 4), 0xc8ccd0, x, 10.5, z); // lattice mast (three legs + rungs)
    for (let y = 6.5; y < 15; y += 1.2) A(new T.BoxGeometry(0.9, 0.05, 0.8), 0xc8ccd0, -1.4, y, -1.35);
    A(new T.CylinderGeometry(0.04, 0.04, 6, 4), 0xdddddd, 1.8, 9, 1.8); A(new T.BoxGeometry(1.6, 1.0, 0.03), 0x2a4a7a, 2.6, 11.4, 1.8); // NCI flag
    for (const x of [-1.2, 1.2]) A(new T.BoxGeometry(0.9, 2.1, 0.06), 0x30383e, x, 1.05, 3.02); // doors / windows on the base
    done(); fx.coastwatch = grp.position.clone(); }

  // Gorleston (Range Rear) Lighthouse, Riverside Road: ~21 m, red brick tapering round tower, white gallery + red lantern.
  { const { grp, A, done } = kit('gorleston-lighthouse', 52.572122, 1.732303);
    A(new T.CylinderGeometry(1.9, 2.6, 17, 20, 1, true), 0, 0, 8.5, 0, 0, 0, 0, brick); A(new T.CylinderGeometry(2.7, 2.7, 0.5, 20), 0x6a4a3a, 0, 0.25, 0);
    A(new T.CylinderGeometry(2.3, 2.3, 0.4, 20), 0xf0f0ee, 0, 17.2, 0); // white gallery deck
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; A(new T.BoxGeometry(0.05, 0.9, 0.05), 0x222222, Math.cos(a) * 2.2, 17.85, Math.sin(a) * 2.2); }
    A(new T.TorusGeometry(2.2, 0.04, 4, 24), 0x222222, 0, 18.3, 0, Math.PI / 2);
    A(new T.CylinderGeometry(1.25, 1.25, 1.8, 12), 0x30383c, 0, 18.3, 0); A(new T.CylinderGeometry(1.15, 1.15, 1.4, 12), 0xfff2b0, 0, 18.3, 0);
    A(new T.ConeGeometry(1.5, 1.4, 12), 0xb8221c, 0, 19.9, 0); A(new T.SphereGeometry(0.25, 8, 6), 0xb8221c, 0, 20.75, 0);
    for (const [y, a] of [[4, 0.8], [8, 2.6], [12, 4.4], [15, 0.4]]) { const r = 2.6 - (y / 17) * 0.7; A(new T.BoxGeometry(0.5, 0.9, 0.3), 0x22282c, Math.cos(a) * r, y, Math.sin(a) * r, 0, -a + Math.PI / 2); }
    done(); fx.beacon = grp.position.clone().setY(18.3); fx.gorlestonLight = grp.position.clone(); }

  // ---- v62: real 3D bridges: raised decks with thickness, parapets / railings, piers into the water and approach ramps (walkable via fx.groundH) ----
  // Styles from photos (geo-ref/landmarks/haven-bridge, herring-bridge; Commons/Geograph CC BY-SA) and OSM bridge ways:
  //  Haven Bridge (1930 bascule): two stone river piers with rounded cutwaters framing the lifting span, blue-grey steel girder fascia, pale balustrade, lamp standards.
  //  Herring Bridge (2024 twin-leaf bascule): the model above, lifted onto ramped approaches.
  //  Breydon Bridge (A47 lifting bridge): grey concrete deck on slim piers, steel lifting span. Vauxhall Bridge (Victorian iron bowstring, now foot/cycle).
  //  Acle New Road over the Bure: concrete deck, brick-capped parapets.
  const BSTY = { 'Haven Bridge': { H: 2.2, hump: 0.5, piers: [0.3, 0.7], girder: 0x5f7383, deck: 0x6b6f73, rail: 0xe6e8e4, kind: 'haven' },
    'Herring Bridge': { H: 2.6, hump: 0, piers: [], girder: 0x5e6c78, deck: 0x8c9096, rail: 0xb9c2c9, kind: 'herring' },
    'Breydon Bridge': { H: 4.0, hump: 0.3, piers: [0.2, 0.4, 0.6, 0.8], girder: 0x56636e, deck: 0x9a9c98, rail: 0xb9c2c9, kind: 'breydon' },
    'Vauxhall Bridge': { H: 1.6, hump: 0.2, piers: [0.5], girder: 0x4e5a62, deck: 0x6a5e52, rail: 0x3c4a52, kind: 'vauxhall' },
    'Acle New Road (Bure)': { H: 2.0, hump: 0.2, piers: [0.33, 0.66], girder: 0x8a8c88, deck: 0x9a9c98, rail: 0x8a4a3a, kind: 'acle' } };
  const sm = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const decks = [];
  for (const [la1, lo1, la2, lo2, hw, name] of BRIDGES) { const sty = BSTY[name]; if (!sty) continue;
    const a = W(la1, lo1), b = W(la2, lo2), dx = b.x - a.x, dz = b.z - a.z, Lb = Math.hypot(dx, dz), R = sty.H * 9, H = sty.H;
    const hp = s => s < 0 ? H * sm(1 + s / R) : s > Lb ? H * sm(1 - (s - Lb) / R) : H + sty.hump * Math.sin(Math.PI * s / Lb);
    const d = { a, ux: dx / Lb, uz: dz / Lb, Lb, R, hw: Math.min(hw, 14), hp, name }; decks.push(d);
    const ry = Math.atan2(-dz, dx), HW = d.hw;
    const { grp, A, done } = kit('bridge-' + name.split(' ')[0].toLowerCase(), la1, lo1, ry); grp.position.y = 0;
    const DECKC = sty.deck, ST = 2;
    for (let s0 = -R; s0 < Lb + R - 0.01; s0 += ST) { const s1 = Math.min(Lb + R, s0 + ST), sm0 = (s0 + s1) / 2, h0 = hp(s0), h1 = hp(s1), hm = (h0 + h1) / 2, sl = Math.atan2(h1 - h0, s1 - s0), len = (s1 - s0) / Math.cos(sl) + 0.05;
      if (sty.kind === 'herring' && Math.abs(sm0 - Lb / 2) < 64.5) continue; // the Herring model supplies its own span
      const span = sm0 > 0 && sm0 < Lb;
      if (span) A(new T.BoxGeometry(len, 1.1, HW * 2), DECKC, sm0, hm - 0.55, 0, 0, 0, sl); // deck slab with thickness
      else { A(new T.BoxGeometry(len, Math.max(0.2, hm + 0.05), HW * 2 + 1.2), 0x8a8478, sm0, Math.max(0.1, hm + 0.05) / 2 - 0.05, 0, 0, 0, 0); A(new T.BoxGeometry(len, 0.06, HW * 2 - 0.4), 0x4a4c50, sm0, hm + 0.02, 0, 0, 0, sl); } // ramp embankment + its surface
      for (const z of [-1, 1]) { const zz = z * (HW + (span ? 0 : 0.6)); // parapets / railings either side
        if (sty.kind === 'acle' || (!span && hm > 0.3)) A(new T.BoxGeometry(len, 1.0, 0.35), sty.kind === 'acle' && span ? 0x9a9c98 : 0x8a8478, sm0, hm + 0.5, zz, 0, 0, sl);
        if (sty.kind !== 'acle') { A(new T.BoxGeometry(len, 0.08, 0.08), sty.rail, sm0, hm + 1.15, zz, 0, 0, sl); if (span) A(new T.BoxGeometry(len, 0.06, 0.06), sty.rail, sm0, hm + 0.6, zz, 0, 0, sl);
          for (let k = 0; k < ST; k += (sty.kind === 'haven' ? 0.5 : 1)) A(new T.BoxGeometry(0.08, 1.15, 0.08), sty.rail, s0 + k, hp(s0 + k) + 0.57, zz); }
        else A(new T.BoxGeometry(len, 0.12, 0.45), 0x8a4a3a, sm0, hm + 1.05, zz, 0, 0, sl); // brick coping
        if (span && sty.kind !== 'acle') A(new T.BoxGeometry(len, 1.5, 0.3), sty.girder, sm0, hm - 0.85, z * (HW + 0.1), 0, 0, sl); } } // steel girder fascia
    for (const f of sty.piers) { const s = f * Lb, h = hp(s); // river piers down into the water, with rounded cutwaters
      const pw = sty.kind === 'haven' ? 7 : 3, ph = h + 4; A(new T.BoxGeometry(pw, ph, HW * 2 + 1), sty.kind === 'haven' ? 0xa49c8c : 0x9a9c98, s, h - 1.1 - ph / 2 + 0.01, 0);
      for (const z of [-1, 1]) A(new T.CylinderGeometry(pw / 2, pw / 2, ph, 12, 1, false, 0, Math.PI).rotateY(z > 0 ? 0 : Math.PI), sty.kind === 'haven' ? 0xa49c8c : 0x9a9c98, s, h - 1.1 - ph / 2, z * (HW + 0.5));
      if (sty.kind === 'haven') for (const z of [-1, 1]) { A(new T.BoxGeometry(pw + 0.6, 0.4, 2), 0x8e8676, s, h + 1.3, z * (HW + 0.6)); A(new T.CylinderGeometry(0.1, 0.14, 5, 6), 0x2c3236, s, h + 3.5, z * (HW + 0.6)); A(new T.SphereGeometry(0.35, 8, 6), 0xfff2c0, s, h + 6.1, z * (HW + 0.6)); } } // pier caps + lamp standards
    for (const s of [0, Lb]) A(new T.BoxGeometry(2.5, hp(s) + 3, HW * 2 + 2), 0x8a8478, s, (hp(s) + 3) / 2 - 3, 0); // abutments at the quays
    if (sty.kind === 'haven') { const m0 = 0.3 * Lb + 3.5, m1 = 0.7 * Lb - 3.5; A(new T.BoxGeometry(0.5, 0.09, HW * 2), 0xffd24a, (m0 + m1) / 2, hp((m0 + m1) / 2) + 0.03, 0); // bascule leaf joint
      for (const z of [-1, 1]) for (const x of [m0, m1]) A(new T.BoxGeometry(2.4, 1.4, 1.2), sty.girder, x, hp(x) + 0.7, z * (HW + 0.4)); }
    if (sty.kind === 'breydon') { const m = Lb * 0.5; A(new T.BoxGeometry(Lb * 0.18, 0.09, HW * 2), 0x3e4a54, m, hp(m) + 0.04, 0); for (const z of [-1, 1]) A(new T.BoxGeometry(4, 5, 3), 0xb9bdb8, m - Lb * 0.12, hp(m) + 2.5, z * (HW + 2.2)); } // lifting span + control houses
    if (sty.kind === 'vauxhall') for (const z of [-1, 1]) { const N = 14, AH = 4; for (let k = 0; k < N; k++) { const x0 = k / N * Lb, x1 = (k + 1) / N * Lb, y0 = AH * Math.sin(Math.PI * k / N), y1 = AH * Math.sin(Math.PI * (k + 1) / N), sl2 = Math.atan2(y1 - y0, x1 - x0);
        A(new T.BoxGeometry(Math.hypot(x1 - x0, y1 - y0) + 0.05, 0.35, 0.3), sty.girder, (x0 + x1) / 2, hp((x0 + x1) / 2) + 1.2 + (y0 + y1) / 2, z * HW, 0, 0, sl2); if (k) A(new T.BoxGeometry(0.12, y0 + 1.2, 0.12), sty.girder, x0, hp(x0) + (y0 + 1.2) / 2, z * HW); } } // bowstring trusses
    done(); }
  { const hb = S.getObjectByName('herring-bridge'); if (hb) hb.position.y = BSTY['Herring Bridge'].H - 0.28; }
  // ground height for walking: bridge decks + approach ramps (world x / z)
  fx.bridgeH = (x, z) => { let g = null; for (const d of decks) { const rx = x - d.a.x, rz = z - d.a.z, s = rx * d.ux + rz * d.uz; if (s < -d.R || s > d.Lb + d.R) continue; if (Math.abs(rx * d.uz - rz * d.ux) > d.hw + 0.3) continue; g = Math.max(g ?? 0, d.hp(s)); } return g; };
  (window.__groundParts = window.__groundParts || []).push(fx.bridgeH);
  out.bridges = decks.map(d => ({ name: d.name, len: Math.round(d.Lb), ramp: Math.round(d.R) }));
  return out;
}
