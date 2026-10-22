/* JHIOS 3D world — Phase 1 environment & FX (sky, digital rain, Great Yarmouth skyline + sea,
   walkways, minimap, proximity volume, approach cards, orbiting album-art screens).
   Skyline is geographically faithful: lat/lon from /assets/data/yarmouth-landmarks.json
   (© OpenStreetMap contributors) -> local metres (equirectangular, origin on Marine Parade)
   -> pushed out onto the horizon ring keeping true bearings and distance order.
   World axes: +x = EAST (North Sea), -z = NORTH.
   MODEL SWAP: set a URL in MODELS below and that landmark/lane object is replaced by the .glb
   (loaded lazily with GLTFLoader from the same three.js version); null = procedural. */
export const MODELS = {
  britannia_pier: null, wellington_pier: null, nelsons_monument: null, pleasure_beach: null,
  minster: null, haven_bridge: null, gorleston_harbour: null, tower_complex: null,
  venetian_waterways: null, iron_duke: null, the_avenues: null, newtown_archive: null,
  'SCR3WFAC3': null, 'Luce Aether': null, 'JHIOS Soundtracks': null, 'Sanctum': null, 'Unsorted': null, 'GoldBot': null,
};
let T, S, CAM, P, H, CL, LBL, CV, LOW, RED, OBJS, getPlaying;
/* Projection (v31): 1 world unit = 1 real metre out to CORE metres from the origin on Marine Parade, so the
   seafront, town centre and Newtown are walkable at true scale; beyond CORE the distance is compressed by FAR
   so Gorleston / Breydon still sit on the horizon. Bearings are always true. Lane objects stay in the
   plaza around spawn (buildings within PLAZA m of the origin are left out so they stay reachable). */
const CORE = 3200, FAR = 0.35, PLAZA = 62, HS = 1;
const fx = { t: 0 };

export function buildEnvironment(o) {
  ({ THREE: T, scene: S, camera: CAM, player: P, holos: H, clickables: CL, labelSprite: LBL, canvas: CV, LOW, reduced: RED, HOLO_OBJS: OBJS, getPlaying } = o);
  sky(); rain(); paths(); minimap(); cards(); orbitScreens(); proximity();
  const j = u => fetch(u).then(r => r.json());
  Promise.all([j('/assets/data/yarmouth-landmarks.json?v=31'), j('/assets/data/yarmouth-geo.json?v=31').catch(e => (console.warn('geo', e), null))])
    .then(([D, G]) => { ORG = D.origin; const grp = new T.Group(); grp.name = 'skyline'; S.add(grp); fx.skyline = grp; if (G) { G.keep = D.landmarks.filter(l => l.type === 'archive' || l.type === 'waterways').map(l => { const q = local(l.lat, l.lon); return [q.e, q.n, l.type === 'archive' ? 40 : 0]; }); geo(G, grp); } skyline(D, grp, !G); }).catch(e => console.warn('skyline', e));
  swapModels();
}

/* ---------- sky sphere: slowly shifting gradient + faint scanlines ---------- */
function sky() {
  const m = new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `uniform float uTime; varying vec3 vP;
      void main(){ float h = clamp(vP.y, -0.2, 1.0); float s = 0.5 + 0.5 * sin(uTime * 0.05);
        vec3 hor = mix(vec3(0.0,0.16,0.10), vec3(0.05,0.04,0.16), s); vec3 zen = mix(vec3(0.0,0.015,0.02), vec3(0.02,0.0,0.04), 1.0 - s);
        vec3 c = mix(hor, zen, pow(max(h,0.0), 0.45));
        c += vec3(0.0,0.5,0.3) * 0.05 * step(0.92, fract(vP.y * 140.0 - uTime * 0.3)) * (1.0 - h);
        float east = smoothstep(0.6, 1.0, vP.x) * (1.0 - h) * 0.25; c += vec3(0.0,0.25,0.3) * east;
        gl_FragColor = vec4(c, 1.0); }` });
  const sp = new T.Mesh(new T.SphereGeometry(800, 32, 16), m); sp.renderOrder = -10; sp.frustumCulled = false; S.add(sp); fx.sky = m; fx.skyMesh = sp;
}
/* ---------- digital rain / embers around the player ---------- */
function rain() {
  const N = LOW ? 250 : 1400, pos = new Float32Array(N * 3), spd = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 80; pos[i * 3 + 1] = Math.random() * 30; pos[i * 3 + 2] = (Math.random() - 0.5) * 80; spd[i] = 1 + Math.random() * 3; }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(180,255,220,1)'); gr.addColorStop(0.4, 'rgba(0,255,157,.6)'); gr.addColorStop(1, 'rgba(0,255,157,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
  const m = new T.PointsMaterial({ size: 0.22, map: new T.CanvasTexture(c), transparent: true, depthWrite: false, blending: T.AdditiveBlending, color: 0x9dffd2 });
  const pts = new T.Points(g, m); pts.frustumCulled = false; S.add(pts); fx.rain = { pts, pos, spd, N };
}
/* ---------- lat/lon -> world ---------- */
let ORG;
function local(lat, lon) { return { e: (lon - ORG.lon) * Math.cos(ORG.lat * Math.PI / 180) * 111320, n: (lat - ORG.lat) * 110540 }; }
function warp(e, n) { const r = Math.hypot(e, n) || 1, rr = r < CORE ? r : CORE + (r - CORE) * FAR; return new T.Vector3(e / r * rr, 0, -n / r * rr); }
const W = (lat, lon, de = 0, dn = 0) => { const l = local(lat, lon); return warp(l.e + de, l.n + dn); };

function skyline(D, grp, noGeo) {
  const segs = [], add = (a, b) => segs.push(a.x, a.y, a.z, b.x, b.y, b.z);
  const box = (c, w, h, d, ry = 0) => { // wire box at c (base centre)
    const hw = w / 2, hd = d / 2, cs = Math.cos(ry), sn = Math.sin(ry), q = (x, y, z) => new T.Vector3(c.x + x * cs + z * sn, c.y + y, c.z - x * sn + z * cs);
    const v = [q(-hw, 0, -hd), q(hw, 0, -hd), q(hw, 0, hd), q(-hw, 0, hd), q(-hw, h, -hd), q(hw, h, -hd), q(hw, h, hd), q(-hw, h, hd)];
    [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([i, j]) => add(v[i], v[j]));
  };
  fx.landmarks = {}; fx.mapSpots = [];
  const mat = new T.LineBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false, fog: false });
  const yaw = v => Math.atan2(v.x, v.z); // facing angle of a world point from origin
  const coast = D.coastline.map(([la, lo]) => local(la, lo));
  const coastE0 = n => { for (let i = 0; i < coast.length - 1; i++) { const a = coast[i], b = coast[i + 1]; if (n <= a.n && n >= b.n) return a.e + (b.e - a.e) * (n - a.n) / (b.n - a.n); } return coast[n > 0 ? 0 : coast.length - 1].e; };
  const coastE = fx.coastE || coastE0;
  for (const L of D.landmarks) {
    const l = local(L.lat, L.lon), base = warp(l.e, l.n), ht = (L.height_m || 10) * HS, ry = yaw(base);
    const tag = LBL(L.name.split(' (')[0], '#5dffc0', 7); tag.position.copy(base).setY(ht + (L.song_match || L.song_tag ? 34 : 9)); grp.add(tag);
    fx.landmarks[L.key] = { pos: base, name: L.name };
    if (L.song_match || L.song_tag) songCluster(L, base, ht);
    if (L.type === 'pier') { // deck from the coast out to sea (east), legs, pavilion at the head
      const ce = coastE(l.n), root = warp(ce, l.n), tip = warp(ce + L.length_m, l.n), N = 10;
      for (let i = 0; i < N; i++) { const a = root.clone().lerp(tip, i / N), b = root.clone().lerp(tip, (i + 1) / N);
        a.y = b.y = 1.4; add(a, b); add(a.clone().setZ(a.z - 0.8), b.clone().setZ(b.z - 0.8)); add(a, a.clone().setY(0)); add(a.clone().setZ(a.z - 0.8), a.clone().setZ(a.z - 0.8).setY(0)); }
      const head = tip.clone(); head.y = 1.4; box(head, 4, ht * 0.6, 3, 0); box(head.clone().setY(1.4 + ht * 0.6), 2.6, ht * 0.35, 2, 0);
      add(head.clone().setY(1.4 + ht * 0.95), head.clone().setY(1.4 + ht * 1.3));
    } else if (L.type === 'column') { // Norfolk Naval Pillar: plinth, fluted column, Britannia on a globe
      box(base, 3, 1.6, 3, ry); box(base.clone().setY(1.6), 2, 1.2, 2, ry);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, d = new T.Vector3(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6); add(base.clone().add(d).setY(2.8), base.clone().add(d.multiplyScalar(0.8)).setY(ht)); }
      box(base.clone().setY(ht), 1.8, 0.6, 1.8, ry);
      const gl = new T.LineSegments(new T.EdgesGeometry(new T.IcosahedronGeometry(0.7, 0)), mat); gl.position.copy(base).setY(ht + 1.2); grp.add(gl);
      add(base.clone().setY(ht + 1.8), base.clone().setY(ht + 3.2)); add(base.clone().setY(ht + 2.6).add(new T.Vector3(0.7, 0, 0)), base.clone().setY(ht + 2.6).add(new T.Vector3(-0.7, 0, 0)));
    } else if (L.type === 'wheel') {
      const r = ht / 2, wg = new T.Group(); wg.position.copy(base).setY(r + 1); wg.rotation.y = 0.35; // faces the promenade / spawn side
      const rim = new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({ length: 48 }, (_, i) => new T.Vector3(Math.cos(i / 48 * 6.283) * r, Math.sin(i / 48 * 6.283) * r, 0))), mat);
      const sp = []; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; sp.push(0, 0, 0, Math.cos(a) * r, Math.sin(a) * r, 0); }
      const spg = new T.BufferGeometry(); spg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
      const wheel = new T.Group(); wheel.add(rim, new T.LineSegments(spg, mat));
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, gd = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(0.7, 0.7, 0.7)), mat); gd.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); wheel.add(gd); }
      wg.add(wheel); grp.add(wg); fx.wheel = wheel;
      add(base.clone().add(new T.Vector3(1.5, 0, 0)), base.clone().setY(r + 1)); add(base.clone().add(new T.Vector3(-1.5, 0, 0)), base.clone().setY(r + 1));
    } else if (L.type === 'minster') { // nave + crossing tower + spire
      box(base, 9, ht * 0.35, 3.5, ry); box(base, 3, ht * 0.7, 3, ry);
      for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]]) add(base.clone().add(new T.Vector3(x, ht * 0.7, z)), base.clone().setY(ht));
    } else if (L.type === 'bridge') { const a = warp(l.e - 60, l.n), b = warp(l.e + 60, l.n); a.y = b.y = 1.2; add(a, b); add(a.clone().setY(2.4), b.clone().setY(2.4)); for (let i = 0; i <= 6; i++) { const p = a.clone().lerp(b, i / 6); add(p.clone().setY(0), p.clone().setY(2.4)); } }
    else if (L.type === 'tower') { // Tower Complex / Arena: wide low arena block + tall slim tower with a crown (scaled to metres)
      box(base, 40, ht * 0.32, 26, ry); box(base.clone().setY(ht * 0.32), 30, ht * 0.12, 20, ry);
      const tb = base.clone().add(new T.Vector3(Math.cos(ry) * 9, 0, -Math.sin(ry) * 9)); box(tb, 9, ht, 9, ry); box(tb.clone().setY(ht), 12, 5, 12, ry);
      add(tb.clone().setY(ht + 5), tb.clone().setY(ht + 14));
      if (L.feature_track) featureScreen(L, base, ht);
    }
    else if (L.type === 'pub') { // corner pub: block, pitched roof, hanging sign
      box(base, 14, ht, 10, ry); for (const [x, z] of [[-7, -5], [7, -5], [7, 5], [-7, 5]]) add(base.clone().add(new T.Vector3(x, ht, z)), base.clone().add(new T.Vector3(x * 0.6, ht + 4, 0)));
      add(base.clone().add(new T.Vector3(-4.2, ht + 4, 0)), base.clone().add(new T.Vector3(4.2, ht + 4, 0)));
      box(base.clone().add(new T.Vector3(8, 5, 0)), 0.3, 3, 2.4, ry); fx.mapSpots.push({ pos: base, label: L.name.replace(/^The /, '').toUpperCase(), col: '#ffcc66' });
    }
    else if (L.type === 'waterways') { // boating-lake loop marker + little bridges
      const r = 18; for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283, b = (k + 1) / 24 * 6.283; add(base.clone().add(new T.Vector3(Math.cos(a) * r, 0.6, Math.sin(a) * r * 3)), base.clone().add(new T.Vector3(Math.cos(b) * r, 0.6, Math.sin(b) * r * 3))); }
      for (const z of [-30, 0, 30]) { const a = base.clone().add(new T.Vector3(-8, 1.5, z)), b = base.clone().add(new T.Vector3(8, 1.5, z)); add(a, b); add(a, a.clone().setY(0)); add(b, b.clone().setY(0)); }
      fx.mapSpots.push({ pos: base, label: 'WATERWAYS', col: '#00c8ff' });
    }
    else if (L.type === 'archive') archive(L, base, ht);
    else if (L.type === 'lighthouse') { box(base, 1.2, ht, 1.2, ry); box(base.clone().setY(ht), 1.6, 1.0, 1.6, ry); fx.beacon = base.clone().setY(ht + 0.5); }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(segs, 3)); grp.add(new T.LineSegments(g, mat));
  if (noGeo) sea(coast); // real OSM geography (geo()) normally draws coast, water, roads and buildings
  fx.mapLandmarks = Object.values(fx.landmarks);
}

/* ---------- OSM geography: everything goes through warp() so it shares the landmark/lane mapping ---------- */
function geoMat(col, opts = {}) { // holographic fill with vertical glow, distance fade (own fog: scene fog would hide the ring)
  return new T.ShaderMaterial({ transparent: true, depthWrite: !!opts.depth, side: T.DoubleSide, blending: opts.add ? T.AdditiveBlending : T.NormalBlending,
    uniforms: { uC: { value: new T.Color(col) }, uA: { value: opts.a ?? 0.8 }, uTime: { value: 0 } },
    vertexShader: `attribute float aV; varying float vV; varying float vD; varying float vY; void main(){ vV = aV; vY = position.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uC; uniform float uA; uniform float uTime; varying float vV; varying float vD; varying float vY;
      void main(){ float f = exp(-max(vD - 120.0, 0.0) * 0.0028); float top = smoothstep(0.82, 1.0, vV); float floors = step(0.9, fract(vY / 3.0)) * 0.3;
        vec3 c = mix(vec3(0.0,0.03,0.03), uC, 0.06 + 0.22 * vV * vV + floors) + uC * top * 0.9;
        gl_FragColor = vec4(mix(vec3(0.0,0.1,0.07), c, f), uA * (0.35 + 0.65 * f)); }` });
}
function geo(G, grp) {
    const CH = 320, bins = new Map(), sec = v => { const k = Math.floor(v.x / CH) + ':' + Math.floor(v.z / CH); if (!bins.has(k)) bins.set(k, { p: [], v: [], e: [] }); return k; };
  const holes = [[0, 0, PLAZA], ...(G.keep || [])]; // [e, n, radius] spots kept clear of buildings
  const flat = a => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; };
  const minA = LOW ? 70 : 25;
  for (const [h0, c] of G.buildings) {
    const pts = flat(c); let A = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; A += p[0] * q[1] - q[0] * p[1]; } A /= 2;
    if (Math.abs(A) < minA) continue; if (A < 0) pts.reverse();
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    if (holes.some(([e, n, r]) => Math.hypot(cx - e, cy - n) < r)) continue;
    const h = (h0 || (Math.abs(A) > 900 ? 9 : 6)) * HS, W3 = pts.map(([e, n]) => warp(e, n)), B = bins.get(sec(W3[0]));
    for (let i = 0; i < W3.length; i++) { const a = W3[i], b = W3[(i + 1) % W3.length];
      B.p.push(a.x, 0, a.z, b.x, 0, b.z, b.x, h, b.z, a.x, 0, a.z, b.x, h, b.z, a.x, h, a.z); B.v.push(0, 0, 1, 0, 1, 1);
      if (!LOW) B.e.push(a.x, h, a.z, b.x, h, b.z); }
    const tri = T.ShapeUtils.triangulateShape(W3.map(v => new T.Vector2(v.x, v.z)), []);
    for (const t of tri) for (const k of t) { B.p.push(W3[k].x, h, W3[k].z); B.v.push(1); }
  }
  const bm = geoMat(0x00ff9d, { a: 0.72, depth: true }), em = new T.LineBasicMaterial({ color: 0x7dffd0, transparent: true, opacity: 0.7, blending: T.AdditiveBlending, depthWrite: false, fog: false });
  const city = new T.Group(); city.name = 'osm-buildings'; grp.add(city); let nb = 0;
  fx.chunks = [];
  for (const B of bins.values()) { if (!B.p.length) continue; const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(B.p, 3)); g.setAttribute('aV', new T.Float32BufferAttribute(B.v, 1)); g.computeBoundingSphere();
    const m = new T.Mesh(g, bm); city.add(m); nb += B.p.length / 3; const c = g.boundingSphere.center, ch = { c, r: g.boundingSphere.radius, o: [m] };
    if (B.e.length) { const eg = new T.BufferGeometry(); eg.setAttribute('position', new T.Float32BufferAttribute(B.e, 3)); eg.computeBoundingSphere(); const l = new T.LineSegments(eg, em); city.add(l); ch.o.push(l); ch.edge = l; }
    fx.chunks.push(ch); }
  // flat polygons (water / beach)
  const flatMesh = (polys, y, col, a) => { const p = [], v = [];
    for (const c of polys) { const W3 = flat(c).map(([e, n]) => warp(e, n)); const tri = T.ShapeUtils.triangulateShape(W3.map(q => new T.Vector2(q.x, q.z)), []);
      for (const t of tri) for (const k of t) { p.push(W3[k].x, y, W3[k].z); v.push(0.6); } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('aV', new T.Float32BufferAttribute(v, 1));
    const m = new T.Mesh(g, geoMat(col, { a, add: true })); m.renderOrder = -1; grp.add(m); return m; };
  flatMesh(G.water, 0.06, 0x00b4ff, 0.55); flatMesh(G.beach, 0.04, 0x9fd86a, 0.25);
  // polylines (roads by class, piers raised, coastline bright)
  const lines = (list, y, col, op) => { const s = []; for (const c of list) { const W3 = flat(c).map(([e, n]) => warp(e, n)); for (let i = 0; i < W3.length - 1; i++) s.push(W3[i].x, y, W3[i].z, W3[i + 1].x, y, W3[i + 1].z); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(s, 3)); const l = new T.LineSegments(g, new T.LineBasicMaterial({ color: col, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, fog: false })); grp.add(l); return l; };
  lines(G.roads.filter(r => r[0] >= 2).map(r => r[1]), 0.1, 0xffc84a, 0.75); lines(G.roads.filter(r => r[0] < 2).map(r => r[1]), 0.09, 0xff7a3d, 0.45);
  lines(G.piers.map(p => p[0]), 1.4, 0xb4fff0, 0.9); lines(G.coast, 0.12, 0x9dffe0, 0.95);
  // seaward coastline profile (max east per northing bin) for the sea shader
  const NB = 16, n0 = 5600, n1 = -4800, prof = Array.from({ length: NB }, (_, i) => ({ n: n0 + (n1 - n0) * i / (NB - 1), e: -1e9 }));
  for (const c of G.coast) for (let i = 0; i < c.length; i += 2) { const k = Math.round((c[i + 1] - n0) / (n1 - n0) * (NB - 1)); if (k >= 0 && k < NB && c[i] > -1500) prof[k].e = Math.max(prof[k].e, c[i]); }
  for (let i = 0; i < NB; i++) if (prof[i].e < -1e8) prof[i].e = (prof[i - 1] || prof[i + 1] || { e: 300 }).e > -1e8 ? (prof[i - 1] || prof[i + 1]).e : 300;
  fx.coastE = n => { for (let i = 0; i < NB - 1; i++) { const a = prof[i], b = prof[i + 1]; if (n <= a.n && n >= b.n) return a.e + (b.e - a.e) * (n - a.n) / (b.n - a.n); } return prof[n > 0 ? 0 : NB - 1].e; };
  sea(prof); fx.geo = { buildings: G.buildings.length, verts: nb, meshes: city.children.length };
}

/* ---------- featured hologram screen above a landmark (billboard, bobbing, tap = play via JX) ---------- */
function featureScreen(L, base, ht) {
  const W2 = 26, H2 = 19.5, y0 = ht + 6 + H2 / 2, grp = new T.Group(); grp.position.copy(base).setY(y0); S.add(grp);
  const titleText = "Don't This Remind Ya";
  const mat = new T.MeshBasicMaterial({ map: titleTex(titleText, '#00ff9d'), transparent: true, opacity: 0.95, side: T.DoubleSide, fog: false });
  const scr = new T.Mesh(new T.PlaneGeometry(W2, H2), mat); grp.add(scr);
  const frMat = new T.LineBasicMaterial({ color: 0x00ff9d, transparent: true, blending: T.AdditiveBlending, fog: false });
  for (const k of [1, 1.03, 1.06]) { const f = new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(W2 * k, H2 * k)), frMat); grp.add(f); }
  const glow = new T.Mesh(new T.PlaneGeometry(W2 * 1.25, H2 * 1.25), new T.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.12, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
  glow.position.z = -0.2; grp.add(glow);
  const lab = LBL(titleText.toUpperCase(), '#00ff9d', 3.2); lab.position.set(0, H2 / 2 + 2.6, 0); grp.add(lab);
  const sub = LBL('▶ TAP TO PLAY // SCR3WFAC3', '#b9ffe0', 1.6); sub.position.set(0, -H2 / 2 - 1.8, 0); grp.add(sub);
  const bg = new T.BufferGeometry().setFromPoints([new T.Vector3(0, -H2 / 2, 0), new T.Vector3(0, ht + 3.5 - y0, 0)]); grp.add(new T.Line(bg, frMat));
  scr.userData = { track: L.feature_track, feature: true };
  const hit = new T.Mesh(new T.PlaneGeometry(W2 * 1.1, H2 * 1.35), new T.MeshBasicMaterial({ visible: false, side: T.DoubleSide })); hit.userData = scr.userData; grp.add(hit); CL.push(hit);
  loader().load('https://i.ytimg.com/vi/hN8QWPKuDvk/hqdefault.jpg', tex => { tex.colorSpace = T.SRGBColorSpace; mat.map.dispose(); mat.map = tex; mat.needsUpdate = true; fx.featureThumb = true; }, undefined, () => { fx.featureThumb = false; });
  fx.feature = { grp, y0, frMat, glow, key: L.key, track: L.feature_track };
  fx.mapSpots.push({ pos: base, label: 'TOWER', col: '#00ff9d' });
}
/* ---------- song cluster: every matching track from tracks.json as a tappable floating screen over a landmark ---------- */
fx.clusters = [];
function songCluster(L, base, ht) {
  const boot = () => window.JX.load().then(() => {
    const m = (L.song_match || '').toLowerCase();
    const list = window.JX.tracks.filter(t => (m && `${t.title} ${t.album || ''}`.toLowerCase().includes(m)) || (L.song_tag && (t.tags || []).includes(L.song_tag)) || (L.song_album && (t.album || '').toLowerCase() === L.song_album.toLowerCase()))
      .filter(t => window.JX.ytId(t.youtube_url) || t.audio_url);
    fx.clusterInfo = Object.assign(fx.clusterInfo || {}, { [L.key]: list.map(t => t.id) });
    if (!list.length) return;
    const hex = L.type === 'archive' ? '#b48cff' : '#ff5fd2', col = new T.Color(hex), grp = new T.Group(); grp.position.copy(base); S.add(grp);
    const n = list.length, perTier = Math.min(n, 10), rad = Math.max(16, perTier * 2.6), W2 = 10, H2 = 5.6;
    const frMat = new T.LineBasicMaterial({ color: col, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, fog: false });
    list.forEach((t, i) => { const tier = Math.floor(i / perTier), a = (i % perTier) / perTier * Math.PI * 2 + tier * 0.3;
      const scr = new T.Mesh(new T.PlaneGeometry(W2, H2), new T.MeshBasicMaterial({ map: titleTex(t.title, hex), transparent: true, opacity: 0.95, side: T.DoubleSide, fog: false }));
      scr.position.set(Math.cos(a) * rad, ht + 8 + tier * (H2 + 2.5), Math.sin(a) * rad); scr.add(new T.LineSegments(new T.EdgesGeometry(scr.geometry), frMat));
      scr.userData = { track: t.id, feature: true, title: t.title, yt: window.JX.ytId(t.youtube_url), loaded: false };
      grp.add(scr); CL.push(scr); });
    const lab = LBL(`${list.length} TRACK${list.length > 1 ? 'S' : ''} // TAP TO PLAY`, hex, 2.6); lab.position.set(0, ht + 4, 0); grp.add(lab);
    fx.clusters.push({ grp, key: L.key, frMat });
  }).catch(e => console.warn('cluster', e));
  window.JX ? boot() : addEventListener('DOMContentLoaded', boot);
}
let cTex = 0;
function updateClusters(t, dt) {
  for (const c of fx.clusters) { const p = c.grp.position, d = Math.hypot(P.pos.x - p.x, P.pos.z - p.z); c.grp.visible = d < (LOW ? 900 : 1600);
    if (!c.grp.visible) continue; if (!RED) c.grp.rotation.y += dt * 0.05;
    for (const m of c.grp.children) { if (!m.userData.track) continue; m.lookAt(CAM.position.x, m.getWorldPosition(fx.v || (fx.v = new T.Vector3())).y, CAM.position.z);
      const u = m.userData, on = window.JX && JX.current && JX.current.id === u.track; m.scale.setScalar(on ? 1.25 + 0.1 * Math.sin(t * 4) : 1);
      if (!u.loaded && d < 300 && u.yt && cTex < 40) { u.loaded = true; cTex++;
        loader().load(`https://i.ytimg.com/vi/${u.yt}/mqdefault.jpg`, tex => { tex.colorSpace = T.SRGBColorSpace; m.material.map.dispose(); m.material.map = tex; m.material.needsUpdate = true; u.thumb = true; }, undefined, () => { u.thumbFailed = true; }); } } }
}
/* ---------- Newtown Archive: holographic octagonal vault (fictional site object) ---------- */
function archive(L, base, ht) {
  const col = 0xb48cff, mat = new T.LineBasicMaterial({ color: col, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false, fog: false }), seg = [];
  const r = 14, ring = (y, rr) => { for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, b = (k + 1) / 8 * 6.283; seg.push(Math.cos(a) * rr, y, Math.sin(a) * rr, Math.cos(b) * rr, y, Math.sin(b) * rr); } };
  ring(0, r + 3); ring(1.2, r + 3); ring(1.2, r); ring(ht * 0.6, r); ring(ht * 0.65, r + 1);
  for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, c = Math.cos(a), s2 = Math.sin(a); seg.push(c * r, 1.2, s2 * r, c * r, ht * 0.6, s2 * r, c * (r + 1), ht * 0.65, s2 * (r + 1), 0, ht, 0); }
  for (let y = 3; y < ht * 0.6; y += 2.4) ring(y, r - 0.6); // shelf stacks
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(seg, 3)); const ls = new T.LineSegments(g, mat); ls.position.copy(base); fx.skyline.add(ls);
  const core = new T.Mesh(new T.OctahedronGeometry(3.2, 0), new T.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, fog: false }));
  core.position.copy(base).setY(ht * 0.35); fx.skyline.add(core); fx.archiveCore = core;
  fx.mapSpots.push({ pos: base, label: 'ARCHIVE', col: '#b48cff' });
}
/* ---------- North Sea: big subdivided plane; fragments west of the (warped) coastline are discarded ---------- */
function sea(coast) {
  const seg = LOW ? 80 : 160, geo = new T.PlaneGeometry(7000, 9000, seg, seg); geo.rotateX(-Math.PI / 2);
  const cs = coast.concat(Array(Math.max(0, 16 - coast.length)).fill(coast[coast.length - 1]).map((c, i) => ({ n: c.n - (i + 1), e: c.e }))).slice(0, 16), cn = cs.map(c => c.n), ce = cs.map(c => c.e);
  const m = new T.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, side: T.DoubleSide,
    uniforms: { uTime: { value: 0 }, uC: { value: CORE }, uK: { value: FAR }, uN: { value: cn }, uE: { value: ce } },
    vertexShader: `uniform float uTime; varying vec3 vW; varying float vH;
      void main(){ vec3 p = position; vec4 w = modelMatrix * vec4(p,1.0);
        float h = sin(w.x * 0.08 + uTime * 0.9) * 0.35 + sin(w.z * 0.11 - uTime * 0.7) * 0.25 + sin((w.x + w.z) * 0.21 + uTime * 1.3) * 0.12;
        w.y += h - 0.3; vW = w.xyz; vH = h; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime; uniform float uC; uniform float uK; uniform float uN[16]; uniform float uE[16]; varying vec3 vW; varying float vH;
      float coastE(float n){ for(int i=0;i<15;i++){ if(n <= uN[i] && n >= uN[i+1]) return mix(uE[i], uE[i+1], (n-uN[i])/(uN[i+1]-uN[i])); } return n > 0.0 ? uE[0] : uE[15]; }
      void main(){ float rr = max(length(vW.xz), 0.001); float r = rr < uC ? rr : uC + (rr - uC) / uK; vec2 d = vW.xz / rr; float e = d.x * r, n = -d.y * r;
        float ce = coastE(n); if (e < ce) discard;
        float grid = step(0.94, fract(vW.x * 0.25)) + step(0.94, fract(vW.z * 0.25));
        float edge = 1.0 - smoothstep(0.0, 60.0, e - ce);
        vec3 c = vec3(0.0, 0.12, 0.16) + vec3(0.0, 0.6, 0.55) * (vH * 0.4 + 0.2) + vec3(0.2,1.0,0.8) * grid * 0.12 + vec3(0.6,1.0,0.9) * edge * 0.25;
        gl_FragColor = vec4(c, 0.78); }` });
  const mesh = new T.Mesh(geo, m); mesh.position.set(3200, 0, 0); mesh.frustumCulled = false; S.add(mesh); fx.sea = m;
}
/* ---------- glowing walkways from spawn to each object ---------- */
function paths() {
  const sp = new T.Vector3(0, 0, 22);
  fx.pathMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime; varying vec2 vU; void main(){ float edge = smoothstep(0.5, 0.0, abs(vU.x - 0.5)) ; float side = step(0.42, abs(vU.x - 0.5));
      float dash = step(0.6, fract(vU.y * 20.0 - uTime * 0.8)); gl_FragColor = vec4(vec3(0.0,1.0,0.62), 0.10 * edge + 0.5 * side + 0.25 * dash * edge); }` });
  for (const h of H) {
    const to = new T.Vector3(h.o.pos[0], 0, h.o.pos[1]), d = to.clone().sub(sp), L = d.length() - (h.o.w || 3.2) / 2 - 1.5;
    const geo = new T.PlaneGeometry(1.4, L, 1, 1); geo.rotateX(-Math.PI / 2); const m = new T.Mesh(geo, fx.pathMat);
    m.position.copy(sp).addScaledVector(d.normalize(), L / 2).setY(0.03); m.rotation.y = Math.atan2(d.x, d.z);
    m.material = fx.pathMat; geo.attributes.uv.array.forEach((v, i, a) => { if (i % 2) a[i] = v * L / 20; }); S.add(m);
  }
  const ring = new T.Mesh(new T.RingGeometry(1.6, 2.0, 32), new T.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.04, 22); S.add(ring);
}
/* ---------- minimap (top-right canvas) ---------- */
function minimap() {
  const c = document.createElement('canvas'); c.id = 'minimap'; c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c); fx.map = c;
}
function drawMap() {
  const c = fx.map, css = c.clientWidth; if (!css) return; const dpr = Math.min(2, devicePixelRatio || 1);
  if (c.width !== Math.round(css * dpr)) { c.width = c.height = Math.round(css * dpr); }
  const far = Math.hypot(P.pos.x, P.pos.z) > 70, RM = far ? 350 : 48, cx0 = far ? P.pos.x : 0, cz0 = far ? P.pos.z : 0; // plaza view around origin, or a 350 m view following the player in town
  const g = c.getContext('2d'), s = c.width, k = s / 2 / RM;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, s, s); g.fillStyle = 'rgba(3,10,8,.82)'; g.fillRect(0, 0, s, s);
  const X = x => s / 2 + (x - cx0) * k, Z = z => s / 2 + (z - cz0) * k; g.strokeStyle = 'rgba(0,255,157,.18)'; g.lineWidth = 1;
  for (let i = -2; i <= 2; i++) { const q = s / 2 + i * s / 5; g.beginPath(); g.moveTo(q, 0); g.lineTo(q, s); g.moveTo(0, q); g.lineTo(s, q); g.stroke(); }
  g.fillStyle = 'rgba(0,160,200,.25)'; g.fillRect(s - 6 * dpr, 0, 6 * dpr, s); // sea is east
  g.strokeStyle = 'rgba(0,255,157,.35)'; g.beginPath(); g.arc(X(0), Z(-2), 4 * k, 0, 7); g.stroke(); // globe
  for (const h of H) { g.fillStyle = h.hex; g.beginPath(); g.arc(X(h.o.pos[0]), Z(h.o.pos[1]), (h.lane === getPlaying() ? 4.5 : 3) * dpr, 0, 7); g.fill(); }
  g.font = `${8 * dpr}px ui-monospace,monospace`; // real-map spots: drawn in place when on the map, else pinned to the edge in their direction
  for (const sp of fx.mapSpots || []) { let mx = X(sp.pos.x), mz = Z(sp.pos.z); const inside = mx > 4 && mx < s - 4 && mz > 4 && mz < s - 4;
    if (!inside) { const dx = mx - s / 2, dz = mz - s / 2, dl = Math.max(Math.abs(dx), Math.abs(dz)) || 1; mx = s / 2 + dx / dl * (s / 2 - 4); mz = s / 2 + dz / dl * (s / 2 - 4); }
    g.fillStyle = sp.col; g.fillRect(mx - 2.5 * dpr, mz - 2.5 * dpr, 5 * dpr, 5 * dpr); if (inside) g.fillText(sp.label, Math.min(s - 46 * dpr, Math.max(2, mx + 5 * dpr)), mz + 3 * dpr); }
  const px = Math.max(-RM + 1, Math.min(RM - 1, P.pos.x - cx0)) + cx0, pz = Math.max(-RM + 1, Math.min(RM - 1, P.pos.z - cz0)) + cz0;
  g.save(); g.translate(X(px), Z(pz)); g.rotate(-P.yaw); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -7 * dpr); g.lineTo(4.5 * dpr, 5 * dpr); g.lineTo(-4.5 * dpr, 5 * dpr); g.closePath(); g.fill(); g.restore();
  g.fillStyle = '#00ff9d'; g.font = `${9 * dpr}px ui-monospace,monospace`; g.fillText('N', s / 2 - 3 * dpr, 10 * dpr); g.fillText('SEA', s - 26 * dpr, s / 2);
  g.strokeStyle = '#00ff9d'; g.strokeRect(0.5, 0.5, s - 1, s - 1);
}
/* ---------- approach card (DOM) ---------- */
function cards() { const d = document.createElement('div'); d.id = 'wcard'; d.className = 'wcard'; d.hidden = true; d.setAttribute('role', 'status'); document.body.appendChild(d); fx.card = d; }
function updateCard() {
  let best = null, bd = 1e9; for (const h of H) { const d = Math.hypot(P.pos.x - h.o.pos[0], P.pos.z - h.o.pos[1]) - (h.o.w || 3.2) / 4; h.near += ((d < 10 ? 1 : 0) - h.near) * 0.08; if (d < 10 && d < bd) { bd = d; best = h; } }
  const c = fx.card; if (!best) { if (!c.hidden) c.hidden = true; fx.cardLane = null; return; }
  const v = new T.Vector3(best.o.pos[0], best.o.h * 0.55, best.o.pos[1]).project(CAM);
  if (v.z > 1) { c.hidden = true; return; }
  const JX = window.JX, playing = JX && JX.playing && JX.current && JX.current.lane === best.lane;
  const html = best.link ? `<b style="color:${best.hex}">${best.o.label}</b><small>tap to open GoldBot ↗</small>`
    : `<b style="color:${best.hex}">${best.lane}</b><small>${playing ? '▶ NOW PLAYING: ' + JX.esc(JX.current.title) : 'tap to play'}</small>`;
  if (c._h !== html) { c.innerHTML = html; c._h = html; }
  c.hidden = false; fx.cardLane = best.lane;
  const r = CV.getBoundingClientRect(); c.style.transform = `translate(-50%,-100%) translate(${Math.max(90, Math.min(r.width - 90, (v.x + 1) / 2 * r.width))}px,${Math.max(80, (1 - v.y) / 2 * r.height)}px)`;
}
/* ---------- orbiting album-art screens ---------- */
const MAX_TEX = 36; let texCount = 0; const loader = () => fx.tl || (fx.tl = Object.assign(new T.TextureLoader(), { crossOrigin: 'anonymous' }));
function titleTex(title, hex) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 144; const g = c.getContext('2d');
  g.fillStyle = '#04100c'; g.fillRect(0, 0, 256, 144); g.strokeStyle = hex; g.lineWidth = 4; g.strokeRect(2, 2, 252, 140);
  g.fillStyle = hex; g.font = '600 22px ui-monospace,monospace'; g.textAlign = 'center';
  const words = String(title).split(' '), lines = []; let ln = ''; for (const w of words) { if ((ln + ' ' + w).length > 16) { lines.push(ln); ln = w; } else ln = (ln ? ln + ' ' : '') + w; } lines.push(ln);
  lines.slice(0, 4).forEach((l, i) => g.fillText(l, 128, 72 - (Math.min(4, lines.length) - 1) * 13 + i * 26));
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
function orbitScreens() {
  fx.orbits = []; fx.screens = [];
  const boot = () => window.JX.load().then(() => {
    for (const h of H) { if (h.link) continue;
      const tr = window.JX.byLane(h.lane).filter(t => window.JX.ytId(t.youtube_url) || t.audio_url).slice(0, LOW ? 6 : 8); if (!tr.length) continue;
      const grp = new T.Group(); grp.position.set(h.o.pos[0], 0, h.o.pos[1]); S.add(grp);
      const rad = (h.o.w || 3.2) / 2 + 3.2, y = Math.max(2.6, h.o.h * 0.55);
      tr.forEach((t, i) => { const a = i / tr.length * Math.PI * 2;
        const m = new T.Mesh(new T.PlaneGeometry(2.4, 1.35), new T.MeshBasicMaterial({ map: titleTex(t.title, h.hex), transparent: true, opacity: 0.92, side: T.DoubleSide, fog: false }));
        m.position.set(Math.cos(a) * rad, y + Math.sin(i * 1.7) * 0.6, Math.sin(a) * rad);
        const fr = new T.LineSegments(new T.EdgesGeometry(m.geometry), new T.LineBasicMaterial({ color: h.o.col })); m.add(fr);
        m.userData = { track: t.id, title: t.title, yt: window.JX.ytId(t.youtube_url), lane: h.lane, loaded: false, a };
        grp.add(m); CL.push(m); fx.screens.push(m); });
      fx.orbits.push({ grp, h, rad });
    } }).catch(e => console.warn(e));
  window.JX ? boot() : addEventListener('DOMContentLoaded', boot);
}
function updateOrbits(t, dt) {
  for (const o of fx.orbits) {
    if (!RED) o.grp.rotation.y += dt * 0.15;
    const d = Math.hypot(P.pos.x - o.h.o.pos[0], P.pos.z - o.h.o.pos[1]);
    o.grp.visible = d < 70;
    for (const m of o.grp.children) {
      m.lookAt(CAM.position.x, m.getWorldPosition(fx.v || (fx.v = new T.Vector3())).y, CAM.position.z);
      const u = m.userData; // lazy thumbnail load when near, capped
      if (!u.loaded && d < 40 && u.yt && texCount < MAX_TEX) { u.loaded = true; texCount++;
        loader().load(`https://i.ytimg.com/vi/${u.yt}/mqdefault.jpg`, tex => { tex.colorSpace = T.SRGBColorSpace; m.material.map.dispose(); m.material.map = tex; m.material.needsUpdate = true; u.thumb = true; },
          undefined, () => { u.thumbFailed = true; /* keep the title-text texture */ }); }
    }
  }
}
/* ---------- proximity volume: 100% near the playing lane's object, 25% far, never mute ---------- */
function proximity() { fx.lastVol = -1; fx.volT = 0; }
function updateVolume(t) {
  const JX = window.JX; if (!JX || !JX.setVolume || t - fx.volT < 0.25) return; fx.volT = t;
  const lane = JX.playing && JX.current ? JX.current.lane : null, h = H.find(x => x.lane === lane);
  let v = 100; if (h) { const d = Math.hypot(P.pos.x - h.o.pos[0], P.pos.z - h.o.pos[1]); v = 25 + 75 * Math.max(0, Math.min(1, (60 - d) / 50)); }
  v = Math.round(v); if (Math.abs(v - fx.lastVol) >= 2 || (v === 100 && fx.lastVol !== 100)) { JX.setVolume(v); fx.lastVol = v; }
}
/* ---------- optional .glb swaps ---------- */
async function swapModels() {
  const todo = Object.entries(MODELS).filter(([, u]) => u); if (!todo.length) return;
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'); const gl = new GLTFLoader();
  for (const [key, url] of todo) gl.load(url, g => {
    const h = H.find(x => x.lane === key);
    if (h) { h.obj.clear(); h.obj.add(g.scene); }
    else if (fx.landmarks && fx.landmarks[key]) { g.scene.position.copy(fx.landmarks[key].pos); S.add(g.scene); }
  }, undefined, e => console.warn('model', key, e));
}

let mapT = 0;
export function updateWorldFX(t, dt) {
  if (fx.sky) fx.sky.uniforms.uTime.value = t; if (fx.sea) fx.sea.uniforms.uTime.value = RED ? 0 : t; if (fx.pathMat) fx.pathMat.uniforms.uTime.value = RED ? 0 : t;
  if (fx.rain && !RED) { const { pos, spd, N } = fx.rain;
    for (let i = 0; i < N; i++) { let y = pos[i * 3 + 1] - spd[i] * dt; if (y < 0) { y = 30; pos[i * 3] = P.pos.x + (Math.random() - 0.5) * 80; pos[i * 3 + 2] = P.pos.z + (Math.random() - 0.5) * 80; } pos[i * 3 + 1] = y; }
    fx.rain.pts.geometry.attributes.position.needsUpdate = true; }
  if (fx.skyMesh) fx.skyMesh.position.copy(CAM.position);
  if (fx.feature) { const f = fx.feature; f.grp.position.y = f.y0 + (RED ? 0 : Math.sin(t * 0.8) * 1.2); f.grp.lookAt(CAM.position.x, f.grp.position.y, CAM.position.z);
    const on = window.JX && JX.playing && JX.current && JX.current.id === f.track; f.frMat.opacity = on ? 0.6 + 0.4 * (window.__beat ? __beat() : 1) : 0.75 + 0.2 * Math.sin(t * 2); f.glow.material.opacity = on ? 0.25 : 0.12; }
  if (fx.chunks && t - (fx.cullT || 0) > 0.25) { fx.cullT = t; const far = LOW ? 900 : 1800, edge = LOW ? 0 : 700; // distance culling per 320 m chunk
    for (const c of fx.chunks) { const d = Math.hypot(c.c.x - P.pos.x, c.c.z - P.pos.z) - c.r; c.o[0].visible = d < far; if (c.edge) c.edge.visible = d < edge; } }
  if (fx.archiveCore && !RED) fx.archiveCore.rotation.y += dt * 0.6;
  updateClusters(t, dt);
  if (fx.wheel && !RED) fx.wheel.rotation.z += dt * 0.08;
  updateCard(); updateOrbits(t, dt); updateVolume(t);
  if (t - mapT > 0.1) { mapT = t; drawMap(); }
  fx.frames = (fx.frames || 0) + 1;
}
export const worldDebug = {
  get fx() { return { screens: fx.screens.length, thumbs: fx.screens.filter(s => s.userData.thumb).length, thumbFailed: fx.screens.filter(s => s.userData.thumbFailed).length, card: fx.cardLane, vol: fx.lastVol, frames: fx.frames, geo: fx.geo, clusters: fx.clusterInfo, landmarks: fx.landmarks && Object.fromEntries(Object.entries(fx.landmarks).map(([k, v]) => [k, [+v.pos.x.toFixed(1), +v.pos.z.toFixed(1)]])) }; },
  featureAt() { const f = fx.feature; if (!f) return null; const v = f.grp.getWorldPosition(new T.Vector3()).project(CAM), r = CV.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, id: f.track, thumb: fx.featureThumb, pos: [+f.grp.position.x.toFixed(1), +f.grp.position.z.toFixed(1)], visible: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 }; },
  screenAt(lane, i = 0) { const m = fx.screens.filter(s => s.userData.lane === lane)[i]; if (!m) return null; const v = m.getWorldPosition(new T.Vector3()).project(CAM), r = CV.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, id: m.userData.track, z: v.z, visible: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 }; },
};
