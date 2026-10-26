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
  venetian_waterways: null, iron_duke: null, the_avenues: null, newtown_archive: null, arc_cinema: null, harbour_mouth: null, police_investigation_centre: null, seafront_shelter: null,
  'SCR3WFAC3': null, 'Luce Aether': null, 'JHIOS Soundtracks': null, 'Sanctum': null, 'Unsorted': null, 'GoldBot': null,
};
let T, S, CAM, P, H, CL, LBL, CV, LOW, RED, OBJS, getPlaying, LITE = false;
const worldErr = (where, e) => { console.error('[world]', where, e); if (window.__werr) window.__werr(`${where}: ${(e && (e.message || e.type)) || e}`); };
const safe = (where, f) => { try { return f(); } catch (e) { worldErr(where, e); } };
/* Projection (v31): 1 world unit = 1 real metre out to CORE metres from the origin on Marine Parade, so the
   seafront, town centre and Newtown are walkable at true scale; beyond CORE the distance is compressed by FAR
   so Gorleston / Breydon still sit on the horizon. Bearings are always true. Lane objects stay in the
   plaza around spawn (buildings within PLAZA m of the origin are left out so they stay reachable). */
const CORE = 4600, FAR = 0.35, /* v42: was 3200, which squashed the racecourse (it runs to 4.5 km north) */ PLAZA = 62, HS = 1;
const fx = { t: 0 };
const PZ = () => window.__PLAZA || [0, 0]; // plaza centre in world x/z (set by world.js)

export function buildEnvironment(o) {
  ({ THREE: T, scene: S, camera: CAM, player: P, holos: H, clickables: CL, labelSprite: LBL, canvas: CV, LOW, reduced: RED, HOLO_OBJS: OBJS, getPlaying } = o); LITE = !!o.LITE;
  safe('minimap', minimap); safe('sky', sky); safe('rain', rain); safe('paths', paths); safe('map', bigMap); safe('cards', cards); safe('screens', orbitScreens); safe('volume', proximity);
  const j = u => fetch(u).then(r => r.json());
  Promise.all([j('/assets/data/yarmouth-landmarks.json?v=75'), j(LITE ? '/assets/data/yarmouth-geo-lite.json?v=75' : '/assets/data/yarmouth-geo.json?v=75').catch(e => (console.warn('geo', e), null))])
    .then(([D, G]) => { ORG = D.origin; const grp = new T.Group(); grp.name = 'skyline'; S.add(grp); fx.skyline = grp; if (G && /[?&]nogeo=1/.test(location.search)) G = null; if (G) safe('geo', () => { fx.G = G; G.keepPts = D.landmarks.filter(l => l.type !== 'screen' && !l.use_footprint).map(l => { const q = local(l.lat, l.lon); return [q.e, q.n]; }); G.keepScreen = D.landmarks.filter(l => l.type === 'screen').map(l => { const q = local(l.lat, l.lon); return { key: l.key, e: q.e, n: q.n }; }); G.keep = D.landmarks.filter(l => l.type === 'archive' || l.type === 'waterways').map(l => { const q = local(l.lat, l.lon); return [q.e, q.n, l.type === 'archive' ? 22 : 0]; }); geo(G, grp); });
      import('./world-env.js?v=75').then(m => { fx.env = m.initEnv({ THREE: T, T, S, CAM, P, fx, LITE, RED, warp, G }); }).catch(e => worldErr('world-env', e)); import('./world-v66.js?v=75').then(m => { fx.v66 = m.initV66({ T, S, LBL, LITE, warp, fx, G, CAM, P }); }).catch(e => worldErr('v66', e)); import('./world-v69.js?v=75').then(m => { fx.v69 = m.initV69({ T, S, LBL, LITE, warp, fx, G }); }).catch(e => worldErr('v69', e)); Promise.all([import('./world-newtown.js?v=75'), j('/assets/data/newtown-extra.json?v=75')]).then(([m, X]) => { fx.newtown = m.initNewtown({ T, S, LBL, LITE, warp, fx }, X); import('./world-v60.js?v=75').then(m2 => { fx.v60 = m2.initV60({ T, S, LITE, RED, warp, PZ, fx }, X); }).catch(e => worldErr('v60', e)); }).catch(e => worldErr('newtown', e)); if (G && G.golden_mile) import('./world-train.js?v=75').then(m => { fx.train = m.initTrain({ T, S, CAM, P, LBL, LITE, RED, fx, warp, openNear, CV, G, ORG }); }).catch(e => worldErr('seafront train', e)); safe('landmarks', () => skyline(D, grp, !fx.coastE)); safe('fallen angels', fallenAngels); safe('waterways gate', waterwaysGate); safe('waterways north drive gate', waterwaysDriveGate); safe('dam sign', damSign); safe('food basket', foodBasket); Promise.all([import('./world-streets.js?v=75'), j('/assets/data/newtown-streets.json?v=75')]).then(([m, X]) => { fx.streets = m.initStreets({ T, S, LBL, LITE, warp, G }, X); }).catch(e => worldErr('newtown streets', e)); 
      Promise.all([import('./world-pb.js?v=75'), j('/assets/data/pleasure-beach.json?v=75')]).then(([m, PB]) => { fx.pbUpd = m.initPB({ T, S, W, LBL, LITE, fx }, PB); }).catch(e => worldErr('pleasure beach', e)); }).catch(e => worldErr('map data', e));
  swapModels().catch(e => worldErr('models', e));
  import('./world-presence.js?v=75').then(m => { fx.pres = m.initPresence({ T, S, P, LITE, fx }); }).catch(e => console.warn('presence', e)).then(() => import('./world-chat.js?v=75')).then(m => m.initChat({ fx, LITE })).catch(e => console.warn('chat', e));
  import('./world-train.js?v=75').then(m => { fx.gulls = m.initGulls({ T, S, CAM, LITE, RED }); }).catch(e => worldErr('gulls', e));
}

/* ---------- sky sphere: slowly shifting gradient + faint scanlines ---------- */
function sky() {
  const m = new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { uTime: { value: 0 }, uDay: { value: 0 }, uGloom: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `uniform float uTime; uniform float uDay; uniform float uGloom; varying vec3 vP;
      void main(){ float h = clamp(vP.y, -0.2, 1.0); float s = 0.5 + 0.5 * sin(uTime * 0.05);
        vec3 hor = mix(vec3(0.0,0.16,0.10), vec3(0.05,0.04,0.16), s); vec3 zen = mix(vec3(0.0,0.015,0.02), vec3(0.02,0.0,0.04), 1.0 - s);
        vec3 c = mix(hor, zen, pow(max(h,0.0), 0.45));
        c += vec3(0.0,0.5,0.3) * 0.05 * step(0.92, fract(vP.y * 140.0 - uTime * 0.3)) * (1.0 - h);
        float east = smoothstep(0.6, 1.0, vP.x) * (1.0 - h) * 0.25; c += vec3(0.0,0.25,0.3) * east;
        vec3 dayC = mix(mix(vec3(0.55,0.72,0.82), vec3(0.16,0.38,0.62), pow(max(h,0.0),0.6)), vec3(0.42,0.47,0.5), uGloom); c = mix(c, dayC, uDay * 0.85);
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

/* v42: North Drive seafront shelter, modelled on the real one (Joseph's Street View link + the 'Odds Against Me' artwork): a long, low, white-rendered
   back-to-back shelter: flat slab roof with a thin overhang, solid corner piers and end walls with small square windows, a central spine wall with
   benches both sides, open fronts. Long axis along local x (rotated to run with North Drive). Solid white (3 shades) + one soft neon edge pass. */
function makeShelter() {
  const LEN = 8.4, DEP = 3.2, H = 2.5, g = new T.Group(); g.name = 'seafront-shelter';
  const parts = { w: [], s: [], d: [] }; // white / shade / dark
  const B = (k, w, h, d, x, y, z) => { const b = new T.BoxGeometry(w, h, d); b.translate(x, y + h / 2, z); parts[k].push(b); };
  B('w', LEN + 0.7, 0.22, DEP + 0.6, 0, H, 0);                                   // slab roof with overhang
  B('w', LEN - 0.6, 0.12, DEP + 0.75, 0, H - 0.05, 0);                           // fascia lip
  for (const sx of [-1, 1]) { B('w', 0.35, H, DEP, sx * (LEN / 2 - 0.18), 0, 0); // end walls
    for (const sz of [-1, 1]) B('w', 0.9, H, 0.3, sx * (LEN / 2 - 0.6), 0, sz * (DEP / 2 - 0.15)); // corner piers
    for (const sz of [-1, 1]) B('d', 0.06, 0.5, 0.5, sx * (LEN / 2 + 0.01), 1.55, sz * 0.75); } // small square windows in the end walls
  for (const sx of [-1, 1]) { B('d', 0.37, 0.35, DEP + 0.02, sx * (LEN / 2 - 0.18), 0, 0); for (const sz of [-1, 1]) B('d', 0.92, 0.35, 0.32, sx * (LEN / 2 - 0.6), 0, sz * (DEP / 2 - 0.15)); } // black skirting band (Street View)
  B('w', LEN - 0.7, H, 0.22, 0, 0, 0);                                           // central spine wall (back-to-back)
  for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) B('d', 0.55, 0.45, 0.05, sx * 2.2, 1.55, sz * 0.115); // spine wall windows
  for (const sz of [-1, 1]) { B('s', LEN - 1.1, 0.12, 0.45, 0, 0.45, sz * 0.38); B('s', LEN - 1.1, 0.45, 0.1, 0, 0, sz * 0.55); } // benches both sides
  B('s', LEN + 1.6, 0.05, DEP + 2, 0, 0, 0);                                     // paved apron
  const cols = { w: 0xeef2f1, s: 0xb9c4c2, d: 0x1b2427 };
  const edgesPos = [];
  for (const [k, list] of Object.entries(parts)) { const pos = [];
    for (const b of list) { const nb = b.toNonIndexed(); pos.push(...nb.attributes.position.array); if (k === 'w') { const e = new T.EdgesGeometry(b, 30); edgesPos.push(...e.attributes.position.array); e.dispose(); } nb.dispose(); b.dispose(); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: cols[k], fog: false })); m.raycast = () => {}; g.add(m); }
  const eg = new T.BufferGeometry(); eg.setAttribute('position', new T.Float32BufferAttribute(edgesPos, 3));
  const el = new T.LineSegments(eg, new T.LineBasicMaterial({ color: 0x9ff8ff, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, fog: false })); el.raycast = () => {}; g.add(el);
  return g;
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
  const mat = new T.LineBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false, fog: false }); fx.lmMat = mat;
  const yaw = v => Math.atan2(v.x, v.z); // facing angle of a world point from origin
  const coast = D.coastline.map(([la, lo]) => local(la, lo));
  const coastE0 = n => { for (let i = 0; i < coast.length - 1; i++) { const a = coast[i], b = coast[i + 1]; if (n <= a.n && n >= b.n) return a.e + (b.e - a.e) * (n - a.n) / (b.n - a.n); } return coast[n > 0 ? 0 : coast.length - 1].e; };
  const coastE = fx.coastE || coastE0;
  for (const L of D.landmarks) {
    const l = local(L.lat, L.lon), base = warp(l.e, l.n), ht = (L.height_m || 10) * HS, ry = yaw(base);
    const tag = LBL(L.name.split(' (')[0], '#5dffc0', 7); if (L.no_label || L.key === 'the_avenues') tag.visible = false; // v57: only the pub's own 'THE AVENUE' sign shows tag.position.copy(base).setY(ht + (L.use_footprint ? 8 : L.song_match || L.song_tag || L.song_patterns ? 34 : L.type === 'tower' ? 20 : L.type === 'wheel' ? 22 : 9)); if (L.type === 'tower') tag.scale.multiplyScalar(1.25); grp.add(tag);
    fx.landmarks[L.key] = { pos: base, name: L.name, fy: ht + 6, land: L.land_offset }; (fx.clear || (fx.clear = [[PZ()[0], PZ()[1], PLAZA]])).push([base.x, base.z, L.type === 'tower' ? 30 : L.type === 'wheel' ? 26 : 12]); // approach radius never blocked by colliders
    if (L.song_match || L.song_tag || L.song_patterns) songCluster(L, base, ht);
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
      const r = ht / 2, wg = new T.Group(); wg.position.copy(base).setY(r + 12); wg.rotation.y = L.rot_y ?? 0.35; // raised on a plinth: the lowest gondola screen clears the neighbouring Pleasure Beach roofs (v39 audit) // faces the promenade / spawn side
      const rim = new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({ length: 48 }, (_, i) => new T.Vector3(Math.cos(i / 48 * 6.283) * r, Math.sin(i / 48 * 6.283) * r, 0))), mat);
      const sp = []; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; sp.push(0, 0, 0, Math.cos(a) * r, Math.sin(a) * r, 0); }
      const spg = new T.BufferGeometry(); spg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
      const wheel = new T.Group(); wheel.add(rim, new T.LineSegments(spg, mat)); wheel.userData.spin = true;
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, gd = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(0.7, 0.7, 0.7)), mat); gd.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); wheel.add(gd); }
      wg.add(wheel); grp.add(wg); fx.wheel = wheel; fx.wheelGrp = wg;
      if (L.wheel_slots) wheelScreens(L, wheel, r);
      add(base.clone().add(new T.Vector3(1.5, 0, 0)), base.clone().setY(r + 1)); add(base.clone().add(new T.Vector3(-1.5, 0, 0)), base.clone().setY(r + 1));
    } else if (L.type === 'minster') { // nave + crossing tower + spire
      box(base, 9, ht * 0.35, 3.5, ry); box(base, 3, ht * 0.7, 3, ry);
      for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]]) add(base.clone().add(new T.Vector3(x, ht * 0.7, z)), base.clone().setY(ht));
    } else if (L.type === 'bridge') { /* v62: real 3D bridge models live in world-river.js */ }
    else if (L.type === 'tower') { // Tower Complex / Arena: wide low arena block + tall slim tower with a crown (scaled to metres)
      box(base, 40, ht * 0.32, 26, ry); box(base.clone().setY(ht * 0.32), 30, ht * 0.12, 20, ry);
      const tb = base.clone().add(new T.Vector3(Math.cos(ry) * 9, 0, -Math.sin(ry) * 9)); box(tb, 9, ht, 9, ry); box(tb.clone().setY(ht), 12, 5, 12, ry);
      add(tb.clone().setY(ht + 5), tb.clone().setY(ht + 14));
      // v43 (Street View 25 Marine Parade): ground-floor frontage signs on the prom (east) face, north to south
      if (!LITE) for (const [t2, c2, dz] of [['JURASSIC JOURNEY', '#5fdc6a', -14], ['SUBWAY', '#3fbf4f', -6.5], ['THE BUDDHA CLUB', '#e8eef0', 1.5], ['THE TOWER · PUBLIC HOUSE', '#6f8cff', 11]]) {
        const sg = LBL(t2, c2, 1.5); sg.position.copy(base).add(new T.Vector3(21, 4.4, dz)); grp.add(sg); }
      if (L.feature_track) featureScreen(L, base, ht);
    }
    else if (L.type === 'pub' && L.use_footprint) { fx.mapSpots.push({ pos: base, label: L.name.replace(/^The /, '').toUpperCase(), col: '#ffcc66' }); } // v42: the real OSM footprint is the pub (no stand-in model)
    else if (L.type === 'pub' && L.key === 'the_avenues') { fx.mapSpots.push({ pos: base, label: 'AVENUE', col: '#ffcc66' }); } // v56: solid model in world-streets.js replaces the wire stand-in
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
    else if (L.type === 'police') { const pr = L.rot_y ?? ry; // low custody block + blue light bar
      box(base, 58, ht, 34, pr); box(base.clone().setY(ht), 20, 2, 12, pr); // v43: rot_y 0.59 = the OSM footprint's long axis (~34° N of E), matches satellite
      const lb = new T.Mesh(new T.BoxGeometry(8, 0.8, 1.2), new T.MeshBasicMaterial({ color: 0x3b7bff, fog: false })); lb.position.copy(base).setY(ht + 2.6); lb.rotation.y = pr; grp.add(lb); fx.policeBar = lb;
      fx.mapSpots.push({ pos: base, label: 'POLICE', col: '#5b8bff' }); }
    else if (L.type === 'shelter') { safe('shelter', () => { const sh = makeShelter(); sh.position.copy(base); sh.rotation.y = L.rot_y ?? Math.PI / 2; grp.add(sh);
      // v43 (Street View 59 North Dr): red paved bus layby on the road side of the shelter + steel crash barrier between layby and carriageway
      const lay = new T.Mesh(new T.PlaneGeometry(4.2, 26), new T.MeshBasicMaterial({ color: 0x7a2f2a, fog: false })); lay.rotation.x = -Math.PI / 2; lay.position.copy(base).add(new T.Vector3(-4.6, 0.06, 0)); lay.raycast = () => {}; grp.add(lay);
      const bp = []; for (let z = -15; z <= 15; z += 2.5) bp.push(-7, 0, z, -7, 0.75, z); bp.push(-7, 0.7, -15, -7, 0.7, 15, -7, 0.5, -15, -7, 0.5, 15);
      const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.Float32BufferAttribute(bp, 3)); const bl = new T.LineSegments(bg, new T.LineBasicMaterial({ color: 0xcfd8dc, fog: false })); bl.position.copy(base); bl.raycast = () => {}; grp.add(bl); }); } // v42: the real North Drive shelter (see makeShelter)
    else if (L.type === 'harbour') { // harbour entrance: two pier-head beacons either side of the river mouth + a channel marker line
      for (const [dx, dz, c] of [[-14, 6, 0xff3b3b], [14, -6, 0x3bff6a]]) { const p = base.clone().add(new T.Vector3(dx, 0, dz)); box(p, 3, ht, 3, 0); box(p.clone().setY(ht), 4, 2, 4, 0);
        const lm = new T.Mesh(new T.SphereGeometry(1.2, 8, 6), new T.MeshBasicMaterial({ color: c, fog: false })); lm.position.copy(p).setY(ht + 3); grp.add(lm); (fx.harbourLm || (fx.harbourLm = [])).push(lm); }
      add(base.clone().add(new T.Vector3(-14, 0.5, 6)), base.clone().add(new T.Vector3(14, 0.5, -6)));
      fx.mapSpots.push({ pos: base, label: 'HARBOUR', col: '#7fd4ff' }); }
    else if (L.type === 'cinema') { // Arc Cinema: block, marquee canopy and screen sign facing the prom (east)
      safe('arc', () => arcCinema());
      fx.mapSpots.push({ pos: base, label: 'ARC', col: '#ffcc66' }); }
    else if (L.type === 'lighthouse' || L.type === 'coastwatch' || L.type === 'bascule_bridge') { fx.beacon = fx.beacon || base.clone().setY(ht + 0.5); } // v58: solid photo-based models in world-river.js (Gorleston Lighthouse, Coastwatch, Herring Bridge)
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(segs, 3)); grp.add(new T.LineSegments(g, mat));
  if (noGeo) sea(coast); // real OSM geography (geo()) normally draws coast, water, roads and buildings
  catalogueScreens();
  fx.mapLandmarks = Object.values(fx.landmarks);
}

/* ---------- OSM geography: everything goes through warp() so it shares the landmark/lane mapping ---------- */
function sandMat(col, a) { // v45: golden sand with procedural grain + wind ripples (no texture fetch); rides the beat glow uniform
  return new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, fog: false,
    uniforms: { uC: { value: new T.Color(col) }, uA: { value: a }, uG: window.__glowU || { value: 1 } },
    vertexShader: `varying vec2 vP; varying float vD; void main(){ vP = position.xz; vec4 mv = modelViewMatrix * vec4(position,1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uC; uniform float uA; uniform float uG; varying vec2 vP; varying float vD;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1,0)), f.x), mix(h(i + vec2(0,1)), h(i + 1.0), f.x), f.y); }
      void main(){ float near = exp(-vD * 0.01);
        float grain = mix(0.5, n(vP * 7.0), near) * 0.35 + mix(0.5, h(vP * 40.0), near * 0.6) * 0.12 + n(vP * 0.9) * 0.3 + n(vP * 0.12) * 0.3;
        float rip = 0.5 + 0.5 * sin(vP.x * 1.7 + vP.y * 0.6 + n(vP * 0.3) * 4.0);
        vec3 c = uC * (0.55 + 0.45 * grain) * (0.9 + 0.12 * rip);
        float f = exp(-max(vD - 150.0, 0.0) * 0.0025);
        gl_FragColor = vec4(c, uA * (0.5 + 0.5 * f) * (0.85 + 0.15 * uG)); }` });
}
function geoMat(col, opts = {}) { // holographic fill with vertical glow, distance fade (own fog: scene fog would hide the ring)
  return new T.ShaderMaterial({ transparent: true, depthWrite: !!opts.depth, side: T.DoubleSide, blending: opts.add ? T.AdditiveBlending : T.NormalBlending,
    uniforms: { uC: { value: new T.Color(col) }, uA: { value: opts.a ?? 0.8 }, uTime: { value: 0 } },
    vertexShader: `attribute float aV; varying float vV; varying float vD; varying float vY; void main(){ vV = aV; vY = position.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uC; uniform float uA; uniform float uTime; varying float vV; varying float vD; varying float vY;
      void main(){ float f = exp(-max(vD - 120.0, 0.0) * 0.0028); float top = smoothstep(0.82, 1.0, vV); float floors = step(0.9, fract(vY / 3.0)) * 0.3;
        vec3 c = mix(vec3(0.0,0.03,0.03), uC, 0.06 + 0.22 * vV * vV + floors) + uC * top * 0.9;
        gl_FragColor = vec4(mix(vec3(0.0,0.1,0.07), c, f), uA * (0.35 + 0.65 * f)); }` });
}
/* ---------- building collision: 2D footprint test in the real-scale core (world x = east, z = -north) ---------- */
const COLC = 32, COL = new Map();
/* v63: extra solids from modules (models with no OSM footprint): poly [[e,n],...], optional foot-height band [ylo, yhi] so a bridge deck
   blocks walkers on top but not under it (window.__footY = player feet, set by world.js each frame) */
fx.addSolid = (pts, ylo, yhi) => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [e, n] of pts) { x0 = Math.min(x0, e); x1 = Math.max(x1, e); y0 = Math.min(y0, n); y1 = Math.max(y1, n); }
  const b = { p: pts, x0, x1, y0, y1, h: -1, ylo: ylo ?? null, yhi: yhi ?? null }; for (let i = Math.floor(x0 / COLC); i <= Math.floor(x1 / COLC); i++) for (let j = Math.floor(y0 / COLC); j <= Math.floor(y1 / COLC); j++) { const k = i + ':' + j; (COL.get(k) || COL.set(k, []).get(k)).push(b); }
  fx.solids = (fx.solids || 0) + 1; return b; };
function inPoly(p, e, n) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > n) !== (yj > n) && e < (xj - xi) * (n - yi) / (yj - yi) + xi) c = !c; } return c; }
function roofAt(x, z) { const e = x, n = -z, l = COL.get(Math.floor(e / COLC) + ':' + Math.floor(n / COLC)); let h = -1; if (l) for (const b of l) if (inPoly(b.p, e, n)) h = Math.max(h, b.h); return h; }
function collide(x, z, r = 0.5, raw) { const e = x, n = -z; if (!raw && fx.clear && fx.clear.some(([cx, cz, cr]) => (x - cx) ** 2 + (z - cz) ** 2 < cr * cr)) return false; if (Math.hypot(e, n) > CORE - 40) return false; if (fx.waterHit && fx.waterHit(e, n)) return true; /* v58: River Yare / Breydon / Bure block walking (bridges exempt, world-river.js) */ const l = COL.get(Math.floor(e / COLC) + ':' + Math.floor(n / COLC)); if (!l) return false;
  const fy = window.__footY ?? 0; for (const b of l) if ((b.ylo == null || (fy >= b.ylo && fy <= b.yhi)) && e > b.x0 - r && e < b.x1 + r && n > b.y0 - r && n < b.y1 + r && (inPoly(b.p, e, n) || inPoly(b.p, e + r, n) || inPoly(b.p, e - r, n) || inPoly(b.p, e, n + r) || inPoly(b.p, e, n - r))) return true; return false; }
function geo(G, grp) {
  // Buildings: indexed per 320 m tile (16-bit indices, shared wall/roof vertices: 2 verts per footprint corner),
  // built in time-sliced batches so a slow phone never blocks the main thread for long.
  const CH = 320, tiles = new Map();
  const holes = [[PZ()[0], -PZ()[1], PLAZA], ...(G.keep || [])]; // [e, n, radius] spots kept clear of buildings
  const flat = a => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; };
  const minA = LITE ? 60 : LOW ? 70 : 25, EDGES = !LOW && !LITE;
  const bm = geoMat(0x00ff9d, { a: 0.72, depth: true }), em = new T.LineBasicMaterial({ color: 0x7dffd0, transparent: true, opacity: 0.7, blending: T.AdditiveBlending, depthWrite: false, fog: false });
  const city = new T.Group(); city.name = 'osm-buildings'; grp.add(city); fx.chunks = []; fx.geo = { buildings: 0, verts: 0, meshes: 0, lite: LITE, done: false };
  const tileFor = (x, z, nv) => { const k = Math.floor(x / CH) + ':' + Math.floor(z / CH); let t = tiles.get(k);
    if (!t || t.n + nv > 65000) { if (t) flush(t); t = { k, p: [], v: [], i: [], e: [], n: 0 }; tiles.set(k, t); } return t; };
  const flush = t => { if (!t.n) return; const g = new T.BufferGeometry(), pos = new T.Float32BufferAttribute(new Float32Array(t.p), 3);
    g.setAttribute('position', pos); g.setAttribute('aV', new T.Float32BufferAttribute(new Float32Array(t.v), 1)); g.setIndex(new T.BufferAttribute(new Uint16Array(t.i), 1)); g.computeBoundingSphere();
    const m = new T.Mesh(g, bm); city.add(m); const ch = { c: g.boundingSphere.center, r: g.boundingSphere.radius, o: [m] };
    if (t.e.length) { const eg = new T.BufferGeometry(); eg.setAttribute('position', pos); eg.setIndex(new T.BufferAttribute(new Uint16Array(t.e), 1)); eg.boundingSphere = g.boundingSphere; const l = new T.LineSegments(eg, em); city.add(l); ch.o.push(l); ch.edge = l; }
    fx.chunks.push(ch); fx.geo.verts += t.n; fx.geo.meshes = city.children.length; t.p = t.v = t.i = t.e = null; t.n = 0; tiles.delete(t.k); };
  const one = (h0, c) => {
    if (c[1] === 2365 && (c[0] === -160 || c[0] === -128)) return; // v57: approximate Beatty Close blocks, replaced by the solid flats model (world-streets.js)
    const pts = flat(c); let A = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; A += p[0] * q[1] - q[0] * p[1]; } A /= 2;
    if (Math.abs(A) < minA) return; if (A < 0) pts.reverse();
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    if (holes.some(([e, n, r]) => Math.hypot(cx - e, cy - n) < r)) return;
    if (G.keepPts && G.keepPts.some(([e, n]) => inPoly(pts, e, n))) { fx.geo.replaced = (fx.geo.replaced || 0) + 1; return; } // the landmark's own model stands in for its OSM footprint
    const h = (h0 || (Math.abs(A) > 900 ? 9 : 6)) * HS, W3 = pts.map(([e, n]) => warp(e, n)), N = W3.length, t = tileFor(W3[0].x, W3[0].z, N * 2), b0 = t.n;
    for (const w of W3) { t.p.push(w.x, 0, w.z, w.x, h, w.z); t.v.push(0, 1); } t.n += N * 2;
    for (let i = 0; i < N; i++) { const j = (i + 1) % N, a = b0 + i * 2, b = b0 + j * 2; t.i.push(a, b, b + 1, a, b + 1, a + 1); if (EDGES) t.e.push(a + 1, b + 1); }
    const tri = T.ShapeUtils.triangulateShape(W3.map(v => new T.Vector2(v.x, v.z)), []); for (const q of tri) t.i.push(b0 + q[0] * 2 + 1, b0 + q[1] * 2 + 1, b0 + q[2] * 2 + 1);
    fx.geo.buildings++;
    if (Math.hypot(cx, cy) < CORE - 40) { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [e, n] of pts) { x0 = Math.min(x0, e); x1 = Math.max(x1, e); y0 = Math.min(y0, n); y1 = Math.max(y1, n); }
      const b = { p: pts, x0, x1, y0, y1, h }; for (const k of G.keepScreen || []) if (inPoly(pts, k.e, k.n)) (fx.roofAt || (fx.roofAt = {}))[k.key] = h; for (let i = Math.floor(x0 / COLC); i <= Math.floor(x1 / COLC); i++) for (let j = Math.floor(y0 / COLC); j <= Math.floor(y1 / COLC); j++) { const k = i + ':' + j; (COL.get(k) || COL.set(k, []).get(k)).push(b); } }
  };
  let bi = 0; const BATCH = LITE ? 400 : 900;
  const step = () => { try { const end = Math.min(G.buildings.length, bi + BATCH); for (; bi < end; bi++) one(G.buildings[bi][0], G.buildings[bi][1]);
      if (bi < G.buildings.length) return setTimeout(step, 0); for (const t of [...tiles.values()]) flush(t); fx.geo.done = true; }
    catch (e) { worldErr('buildings', e); } };
  step(); window.__collide = collide;
  // flat polygons (water / beach)
  const flatMesh = (polys, y, col, a) => { const p = [], v = [];
    for (const c of polys) { const W3 = flat(c).map(([e, n]) => warp(e, n)); const tri = T.ShapeUtils.triangulateShape(W3.map(q => new T.Vector2(q.x, q.z)), []);
      for (const t of tri) for (const k of t) { p.push(W3[k].x, y, W3[k].z); v.push(0.6); } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('aV', new T.Float32BufferAttribute(v, 1));
    const m = new T.Mesh(g, geoMat(col, { a, add: true })); m.renderOrder = -1; grp.add(m); return m; };
  const rivA = c => { let A = 0, mx = -1e9; const N = c.length / 2; for (let i = 0; i < N; i++) { const j = (i + 1) % N; A += c[i * 2] * c[j * 2 + 1] - c[j * 2] * c[i * 2 + 1]; mx = Math.max(mx, c[i * 2]); } return mx > -3000 && Math.abs(A / 2) > 40000; }; // v58: same test as world-river.js isRiver()
  flatMesh(G.water.filter(c => !rivA(c)), 0.06, 0x00b4ff, 0.55); { const bm = flatMesh(G.beach, 0.04, 0xffcf5a, 0.3); bm.material.dispose(); bm.material = sandMat(0xffcf5a, 0.42); } // v44/v45: golden sand with grain
  if (G.green && G.green.length) flatMesh(G.green, 0.03, 0x3dff7a, 0.22); // v44: OSM grass / parks / pitches / golf / racecourse turf = green
  // polylines (roads by class, piers raised, coastline bright)
  const lines = (list, y, col, op) => { const s = []; for (const c of list) { const W3 = flat(c).map(([e, n]) => warp(e, n)); for (let i = 0; i < W3.length - 1; i++) s.push(W3[i].x, y, W3[i].z, W3[i + 1].x, y, W3[i + 1].z); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(s, 3)); const l = new T.LineSegments(g, new T.LineBasicMaterial({ color: col, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, fog: false })); grp.add(l); return l; };
  lines(G.roads.filter(r => r[0] >= 2).map(r => r[1]), 0.1, 0xc4ccd4, 0.7); lines(G.roads.filter(r => r[0] < 2).map(r => r[1]), 0.09, 0x9aa3ad, 0.5); // v44: all roads grey (the Golden Mile keeps its own look)
  lines(G.piers.map(p => p[0]), 1.4, 0xb4fff0, 0.9); lines(G.coast, 0.12, 0x9dffe0, 0.95);
  // seaward coastline profile (max east per northing bin) for the sea shader
  const NB = 16, n0 = 5600, n1 = -4800, prof = Array.from({ length: NB }, (_, i) => ({ n: n0 + (n1 - n0) * i / (NB - 1), e: -1e9 }));
  for (const c of G.coast) for (let i = 0; i < c.length; i += 2) { const k = Math.round((c[i + 1] - n0) / (n1 - n0) * (NB - 1)); if (k >= 0 && k < NB && c[i] > -1500) prof[k].e = Math.max(prof[k].e, c[i]); }
  for (let i = 0; i < NB; i++) if (prof[i].e < -1e8) prof[i].e = (prof[i - 1] || prof[i + 1] || { e: 300 }).e > -1e8 ? (prof[i - 1] || prof[i + 1]).e : 300;
  fx.coastE = n => { for (let i = 0; i < NB - 1; i++) { const a = prof[i], b = prof[i + 1]; if (n <= a.n && n >= b.n) return a.e + (b.e - a.e) * (n - a.n) / (b.n - a.n); } return prof[n > 0 ? 0 : NB - 1].e; };
  if (G.golden_mile) goldenMile(G.golden_mile, grp);
  if (G.harbour_spur) goldenMile(G.harbour_spur, grp, true);
  sea(prof);
  import('./world-v63.js?v=75').then(m => { fx.v63 = m.initV63({ T, S, LBL, LITE, warp, fx }); }).catch(e => worldErr('v63', e)); import('./world-v64.js?v=75').then(m => { fx.v64 = m.initV64({ T, S, LITE, warp, fx }); }).catch(e => worldErr('v64', e)); import('./world-v65.js?v=75').then(m => { fx.v65 = m.initV65({ T, S, LBL, LITE, warp, fx }); }).catch(e => worldErr('v65', e)); // v65: Royal Assembly Rooms + fiction hatch, Market Gates, Troll Cart, bus stops/buses, beach campfire // v64: station, cemetery, Bure Park campfire, alley // v63: Newtown path levels, Beatty Rd frontage, Jellicoe bridge, Seashore sign, Scroby Sands
  import('./world-river.js?v=75').then(m => { fx.riverInfo = m.initRiver({ T, S, W, LBL, LITE, LOW, fx, warp, local, G }); }).catch(e => worldErr('river', e)); // v58: textured, animated, unwalkable river + harbour landmarks
}

/* ---------- Golden Mile: the main explorable route, a glowing gold ribbon on the real OSM road centreline ---------- */
function goldenMile(R, grp, spur) {
  const pts = []; for (let i = 0; i < R.coords.length; i += 2) pts.push(warp(R.coords[i], R.coords[i + 1]));
  const pos = [], uv = [], idx = [], HW = 3.5; let acc = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l * HW, nz = dx / l * HW;
    if (i) acc += pts[i].distanceTo(pts[i - 1]); pos.push(pts[i].x + nx, 0.14, pts[i].z + nz, pts[i].x - nx, 0.14, pts[i].z - nz); uv.push(0, acc / 12, 1, acc / 12);
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  fx.goldMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: { uTime: { value: 0 }, uGlow: { value: 1 } },
    vertexShader: `varying vec2 vU; varying float vD; void main(){ vU = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime; uniform float uGlow; varying vec2 vU; varying float vD; void main(){ float x = abs(vU.x - 0.5); float side = step(0.4, x); float dash = step(0.55, fract(vU.y - uTime * 0.6)) * step(x, 0.12);
      float f = exp(-max(vD - 200.0, 0.0) * 0.002); gl_FragColor = vec4(vec3(1.0,0.75,0.2), min(1.0, (0.12 + 0.7 * side + 0.5 * dash) * f * uGlow)); }` });
  const m = new T.Mesh(g, fx.goldMat); m.renderOrder = 1; grp.add(m);
  if (spur) { fx.route2 = pts.map(p => [p.x, p.z]); fx.route2Info = { streets: R.streets, length_m: R.length_m }; return; }
  const lab = LBL('GOLDEN MILE', '#ffcc4a', 3); lab.position.copy(pts[0]).setY(6); grp.add(lab);
  fx.route = pts.map(p => [p.x, p.z]); fx.routeInfo = { streets: R.streets, length_m: R.length_m, points: pts.length };
}
/* ---------- featured hologram screen above a landmark (billboard, bobbing, tap = play via JX) ---------- */
function featureScreen(L, base, ht) {
  const W2 = 26, H2 = 19.5, y0 = ht + 34 + H2 / 2, /* raised clear of the 'Tower Complex' landmark label (at ht + 20) */ grp = new T.Group(); grp.position.copy(base).setY(y0); S.add(grp);
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
  viperPanel(grp, H2);
  fx.mapSpots.push({ pos: base, label: 'TOWER', col: '#00ff9d' });
}
/* v62: Viper Room GY panel: Joseph's approved logo, hung directly UNDER the "Don't This Remind Ya" card outside the Arena / Empire entrance
   (rides with the card, faces you). Tap = toon.fm/viper-room-gy in a new tab. A link panel only: no venue interior / underground space is built. */
const VIPER = { url: 'https://toon.fm/viper-room-gy', label: 'VIPER ROOM GY' };
function viperPanel(grp, H2) {
  const g = new T.Group(); g.name = 'viper-room-panel'; g.position.set(0, -H2 / 2 - 9.5, 0.05); grp.add(g);
  const PW = 13, PH = PW * 250 / 526;
  g.add(new T.Mesh(new T.PlaneGeometry(PW + 1.4, PH + 1.4), new T.MeshBasicMaterial({ color: 0x07020a, transparent: true, opacity: 0.88, side: T.DoubleSide, fog: false })));
  const fr = new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(PW + 1.4, PH + 1.4)), new T.LineBasicMaterial({ color: 0xff2e4a, fog: false })); g.add(fr);
  const mat = new T.MeshBasicMaterial({ transparent: true, opacity: 0, side: T.DoubleSide, fog: false, depthWrite: false });
  const logo = new T.Mesh(new T.PlaneGeometry(PW, PH), mat); logo.position.z = 0.06; g.add(logo);
  fx.viper = { url: VIPER.url, loaded: false, grp: g };
  // logo stored as a data-URL text file (same as the DAM logo) so it travels through text-only commits; source PNG: jhios-vault/assets/viper-room/viper-room-gy-logo.png
  fetch('/assets/img/viper-room-gy-logo.b64.txt?v=75').then(r => r.ok ? r.text() : Promise.reject(new Error('viper logo ' + r.status))).then(u => loader().load(u.trim(), t => { t.colorSpace = T.SRGBColorSpace; mat.map = t; mat.opacity = 1; mat.needsUpdate = true; fx.viper.loaded = true; }, undefined, () => { fx.viper.loaded = false; fx.viper.error = true; })).catch(() => { fx.viper.error = true; });
  const lab = LBL('▶ TAP · VIPER ROOM GY EVENTS', '#ff8a9a', 1.3); lab.position.set(0, -PH / 2 - 1.6, 0.1); g.add(lab);
  const hit = new T.Mesh(new T.PlaneGeometry(PW + 1.6, PH + 3.4), new T.MeshBasicMaterial({ visible: false, side: T.DoubleSide })); hit.position.y = -0.8;
  hit.userData = { link: VIPER.url, title: VIPER.label, id: 'viper-room' }; g.add(hit); CL.push(hit);
}
/* ---------- Pleasure Beach big wheel: one tappable gondola screen per slot, rotating with the rim but kept upright ---------- */
function wheelScreens(L, wheel, r) {
  const boot = () => window.JX.load().then(() => {
    const ids = (L.wheel_track_ids || []).slice(); while (ids.length < (L.wheel_slots || 0)) ids.push(null); // more ids than slots = more gondolas
    fx.wheelInfo = ids.map(id => id && (window.JX.tracks.find(t => t.id === id) ? id : `missing:${id}`));
    fx.gondolas = ids.map((id, k) => { const t = id && window.JX.tracks.find(x => x.id === id), a = k / ids.length * Math.PI * 2 + Math.PI / 2, hex = t ? '#ff5fd2' : '#3a5a50';
      const m = new T.Mesh(new T.PlaneGeometry(9, 5.06), new T.MeshBasicMaterial({ map: titleTex(t ? t.title : 'SLOT ' + (k + 1) + ' // EMPTY', hex), transparent: true, opacity: t ? 0.95 : 0.45, side: T.DoubleSide, fog: false }));
      m.position.set(Math.cos(a) * r, Math.sin(a) * r - 3.6, 0.6); m.add(new T.LineSegments(new T.EdgesGeometry(m.geometry), new T.LineBasicMaterial({ color: hex, fog: false })));
      const hang = new T.BufferGeometry().setFromPoints([new T.Vector3(0, 2.53, 0), new T.Vector3(0, 3.6, 0)]); fx.wheelR = r; m.add(new T.Line(hang, new T.LineBasicMaterial({ color: hex, fog: false })));
      m.userData = t ? { track: t.id, feature: true, title: t.title, yt: window.JX.ytId(t.youtube_url), loaded: false, a0: a } : { a0: a }; if (t) CL.push(m);
      wheel.add(m); return m; });
  }).catch(e => worldErr('wheel', e));
  window.JX ? boot() : addEventListener('DOMContentLoaded', boot);
}

/* v42: giant neon pint of beer beside The Iron Duke (amber body, white foam head, glass rim); additive so it rides the global beat pulse */
function neonPint() {
  const g = new T.Group(), A = (c, o) => new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false, fog: false });
  const body = new T.Mesh(new T.CylinderGeometry(2.6, 2.1, 8, 20, 1, true), A(0xffa21a, 0.55)); body.position.y = 4; g.add(body);
  const core = new T.Mesh(new T.CylinderGeometry(2.3, 1.85, 7.6, 16), A(0xff8a00, 0.28)); core.position.y = 3.9; g.add(core);
  const foam = new T.Mesh(new T.CylinderGeometry(2.75, 2.6, 1.5, 20), A(0xffffff, 0.85)); foam.position.y = 8.6; g.add(foam);
  const cap = new T.Mesh(new T.SphereGeometry(2.75, 20, 6, 0, Math.PI * 2, 0, Math.PI / 2), A(0xffffff, 0.7)); cap.scale.y = 0.35; cap.position.y = 9.35; g.add(cap);
  const glass = new T.LineSegments(new T.EdgesGeometry(new T.CylinderGeometry(2.85, 2.2, 10, 20, 1, true), 1), new T.LineBasicMaterial({ color: 0xdff8ff, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false, fog: false })); glass.position.y = 5; g.add(glass);
  const bub = []; for (let i = 0; i < 40; i++) { const a = Math.random() * 6.283, r = Math.random() * 1.8; bub.push(Math.cos(a) * r, 0.6 + Math.random() * 7.2, Math.sin(a) * r); }
  const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.Float32BufferAttribute(bub, 3)); g.add(new T.Points(bg, new T.PointsMaterial({ color: 0xfff2c0, size: 0.25, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false, fog: false })));
  g.traverse(o => { o.raycast = () => {}; }); g.name = 'neon-pint'; return g;
}

/* v45: DAM After Dark sign on the Marine Parade (west) face of Fallen Angels (roof-mounted, faces the viewer), east side of the Golden Mile, 83 Marine Parade (OSM way 175855364, next to the Arc Cinema).
   Logo texture (512 px jpeg as data URL text, black background -> additive so only the neon shows), pulses with the shared beat uniform; tap opens their TikTok. */
const DAM = { lat: 52.609697, lon: 1.736920, url: 'https://www.tiktok.com/@damafterdark.ent', label: 'DAM After Dark on TikTok' };
function damSign() {
  const c = W(DAM.lat, DAM.lon), g = new T.Group(); g.position.copy(c); S.add(g); fx.damG = g; // v47: on the roof of Fallen Angels at its road-facing (west) edge, turned to face the viewer, so it reads from the road in either direction
  const mat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false,
    uniforms: { map: { value: null }, uG: window.__glowU || { value: 1 }, uOn: { value: 0 } },
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D map; uniform float uG; uniform float uOn; varying vec2 vU; void main(){ vec3 c = texture2D(map, vU).rgb * uOn; gl_FragColor = vec4(c * (1.7 + 0.5 * (uG - 1.0) * 3.0), 1.0); }` });
  fetch('/assets/img/dam-after-dark.b64.txt?v=75').then(r => r.text()).then(u => loader().load(u.trim(), t => { t.colorSpace = T.SRGBColorSpace; mat.uniforms.map.value = t; mat.uniforms.uOn.value = 1; })).catch(() => {}); // logo stored as a data URL text file (512 px jpeg)
  const sign = new T.Mesh(new T.PlaneGeometry(13, 13), mat); sign.position.y = 13; g.add(sign);
  sign.userData = { link: DAM.url, title: DAM.label, id: 'dam-after-dark' }; CL.push(sign);
  // v47: no frame box (tap area = the logo plane itself)
  const lab = LBL(DAM.label, '#ff5a6a', 1.8); lab.position.set(0, 4.6, 0.1); g.add(lab);
  // v47: sit ON TOP of the Fallen Angels block: caption just above its roof line, logo above that (waits for the collision grid / roof heights)
  let tries = 0; const seat = () => { const h = roofAt(c.x, c.z); if (h < 0 && tries++ < 40) return setTimeout(seat, 250); const r = Math.max(h, 0, fx.faRoof || 0);
    const up = Math.max(0, (fx.arcTop || 0) - r - 6); lab.position.y = r + 1.6 + up; sign.position.y = r + 2.8 + 6.5 + up; if (up && !fx.damMast) { const m = new T.LineSegments(new T.BufferGeometry().setFromPoints([new T.Vector3(-1.5, r, 0), new T.Vector3(-1.5, r + up + 1, 0), new T.Vector3(1.5, r, 0), new T.Vector3(1.5, r + up + 1, 0)]), new T.LineBasicMaterial({ color: 0xff5a6a, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, fog: false })); m.raycast = () => {}; g.add(m); fx.damMast = m; } fx.damRoof = r; if (window.__dam) window.__dam.roof = r; }; seat();
  fx.dam = window.__dam = { pos: [c.x, c.z], url: DAM.url };
}

/* v48: GYnet 'Helping Hand' community food basket on Sturdee Avenue (Newtown). OSM/Nominatim have no house-number points on this street, so it stands
   on the east kerb near the middle of the street (OSM way 36882994). Label is ONLY the project name; tap opens the GYnet Facebook group. */
const FOOD = { lat: 52.625772, lon: 1.734437, /* v54: pavement in front of the house Joseph pinned from Street View (west side of Sturdee Ave) */ url: 'https://www.facebook.com/groups/391524778452828/', bank: 'https://www.facebook.com/groups/2893679090868859/', label: 'Helping Hand Food Basket · GYnet' };
/* v52: the food bank is run separately from GYnet, so the basket offers both: a small card with two big buttons (new tab) and Close.
   Fixed near the top-centre so it stays clear of the bottom player bar and joystick in portrait and landscape. */
function foodCard() {
  let c = document.getElementById('foodcard'); if (c) { c.hidden = false; c.querySelector('a').focus(); return; }
  c = document.createElement('div'); c.id = 'foodcard'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', 'Helping Hand Food Basket');
  c.style.cssText = 'position:fixed;left:50%;top:max(12px,env(safe-area-inset-top));transform:translateX(-50%);z-index:60;width:min(340px,calc(100vw - 24px));max-height:calc(100vh - 150px);overflow:auto;box-sizing:border-box;padding:14px;background:rgba(10,14,20,.94);border:1px solid #ffb347;border-radius:14px;color:#ffe3b8;font:15px/1.3 system-ui,sans-serif;box-shadow:0 0 24px rgba(255,179,71,.35);text-align:center';
  const btn = 'display:block;margin:10px 0 0;padding:14px 10px;min-height:48px;box-sizing:border-box;border-radius:10px;font-weight:700;font-size:16px;text-decoration:none;';
  c.innerHTML = '<div style="font-weight:800;font-size:17px;color:#ffcf8a">Helping Hand Food Basket</div>'
    + '<a class="fc-bank" href="' + FOOD.bank + '" target="_blank" rel="noopener" style="' + btn + 'background:#ffb347;color:#1a1004">Food bank group</a>'
    + '<a class="fc-gynet" href="' + FOOD.url + '" target="_blank" rel="noopener" style="' + btn + 'background:#1f6feb;color:#fff">Follow GYnet</a>'
    + '<button type="button" class="fc-close" style="' + btn + 'width:100%;background:transparent;color:#ffe3b8;border:1px solid #6b5a40;cursor:pointer">Close</button>';
  c.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { window.__lastOpen = a.href; }));
  c.querySelector('.fc-close').onclick = () => { c.hidden = true; };
  for (const ev of ['pointerdown', 'touchstart', 'mousedown', 'wheel']) c.addEventListener(ev, e => e.stopPropagation(), { passive: true });
  document.body.appendChild(c); window.__foodCard = c;
}
function foodBasket() {
  const c = W(FOOD.lat, FOOD.lon), g = new T.Group(); g.position.copy(c); S.add(g);
  const A = (col, o = 0.9) => new T.MeshBasicMaterial({ color: col, transparent: true, opacity: o, blending: T.AdditiveBlending, depthWrite: false, fog: false });
  const L = col => new T.LineBasicMaterial({ color: col, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false, fog: false });
  const seg = LITE ? 10 : 16;
  const bk = new T.LineSegments(new T.EdgesGeometry(new T.CylinderGeometry(1.5, 1.1, 1.1, seg, 1, true)), L(0xffb347)); bk.position.y = 1.15; g.add(bk); // wicker basket
  for (const y of [0.85, 1.15, 1.45]) { const r = new T.Mesh(new T.TorusGeometry(1.1 + (y - 0.6) * 0.36, 0.035, 4, seg), A(0xffb347, 0.8)); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); }
  const hd = new T.Mesh(new T.TorusGeometry(1.25, 0.06, 4, seg, Math.PI), A(0xffd27a, 0.9)); hd.position.y = 1.7; g.add(hd); // handle
  const sp = new T.SphereGeometry(0.32, 8, 6);
  for (const [x, z, col] of [[-0.6, 0.2, 0xff4b4b], [0.1, -0.5, 0x7dff6a], [0.55, 0.35, 0xffa51f], [-0.15, 0.6, 0xff4b4b]]) { const f = new T.Mesh(sp, A(col)); f.position.set(x, 1.8, z); g.add(f); } // fruit
  const loaf = new T.Mesh(new T.CapsuleGeometry(0.28, 0.8, 3, 8), A(0xf2c27a)); loaf.rotation.z = Math.PI / 2; loaf.position.set(0.3, 1.95, -0.1); g.add(loaf); // bread
  const tin = new T.CylinderGeometry(0.22, 0.22, 0.45, 10);
  for (const [x, z] of [[-0.75, -0.45], [0.85, -0.2]]) { const tn = new T.Mesh(tin, A(0xbfe6ff, 0.8)); tn.position.set(x, 1.85, z); g.add(tn); } // tins
  const hs = new T.Shape(); hs.moveTo(0, -0.9); hs.bezierCurveTo(-1.6, 0.2, -0.7, 1.3, 0, 0.55); hs.bezierCurveTo(0.7, 1.3, 1.6, 0.2, 0, -0.9);
  const heart = new T.Mesh(new T.ShapeGeometry(hs, LITE ? 6 : 12), A(0xff5f8a, 0.85)); heart.position.y = 3.7; heart.userData.spin = true; g.add(heart); fx.foodHeart = heart; // helping-hand heart
  const pole = new T.LineSegments(new T.BufferGeometry().setFromPoints([new T.Vector3(0, 2.2, 0), new T.Vector3(0, 2.8, 0)]), L(0xff5f8a)); g.add(pole);
  g.traverse(o => { o.raycast = () => {}; });
  const hit = new T.Mesh(new T.BoxGeometry(3.4, 4.6, 3.4), new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); hit.position.y = 2.3;
  hit.userData = { popup: foodCard, title: FOOD.label, id: 'gynet-food-basket' }; g.add(hit); CL.push(hit);
  const lab = LBL(FOOD.label, '#ffcf8a', 1.2); lab.position.set(0, 5.4, 0); g.add(lab);
  // v50: the standout of Newtown: raised on a glowing plinth with a soft beacon beam and halo visible from the surrounding streets
  g.position.y = 1.6; g.scale.setScalar(1.25);
  const plinth = new T.Mesh(new T.CylinderGeometry(2, 2.3, 1.6, seg), A(0xffb347, 0.35)); plinth.position.y = -0.8 / 1.25; g.add(plinth);
  const beam = new T.Mesh(new T.CylinderGeometry(0.5, 1.6, 46, seg, 1, true), A(0xffa53a, 0.34)); beam.position.y = 26; g.add(beam);
  const halo = new T.Mesh(new T.SphereGeometry(3.2, 12, 8), A(0xffb347, 0.12)); halo.position.y = 2; g.add(halo); fx.foodBeam = beam; fx.foodHalo = halo;
  beam.raycast = halo.raycast = plinth.raycast = () => {};
  lab.scale.multiplyScalar(1.3);
  fx.food = window.__food = { pos: [c.x, c.z], url: FOOD.url, bank: FOOD.bank }; window.__foodPopup = foodCard; // v59: same popup the basket tap opens (tests / controller)
}

/* v57: Waterways North Drive entrance (~26 North Dr, the southern section's road-side gate, on the park's west edge ~1.73804, about 120 m north of
   the Sandown Rd arch). From Joseph's Street View (Aug 2022, looking east to the sea): two pale stone gate pillars with stone urns either side of
   a path off the red pavement, low clipped hedges along the pavement, a small stone kiosk with a pointed thatched-style roof and a little stone hut
   beside it, a larger thatched shelter further in to the left (north), an information board on the right (south), open lawns beyond.
   Local axes: x = east (into the park), z = south. Solid, shared materials, no colliders. */
function waterwaysDriveGate() {
  const g = new T.Group(); g.name = 'waterways-drive-gate'; g.position.copy(W(52.6145, 1.73806)); S.add(g);
  const mats = new Map(), M = (c, o) => { const k = c + (o ? 't' : ''); if (!mats.has(k)) mats.set(k, new T.MeshBasicMaterial(Object.assign({ color: c }, o || {}))); return mats.get(k); };
  const A = (geo, c, x, y, z, rx = 0, ry = 0, rz = 0, o) => { const m = new T.Mesh(geo, M(c, o)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
  const STONE = 0xd9cdb4, HEDGE = 0x2f5a2a, THATCH = 0x8a6a3a, LAWN = 0x6f8a45;
  A(new T.BoxGeometry(5, 0.05, 40), 0xa04a3e, -3, 0.06, 0);                                          // red pavement along North Drive
  A(new T.BoxGeometry(36, 0.03, 40), LAWN, 18, 0.04, 0);                                             // lawns
  A(new T.BoxGeometry(18, 0.05, 3), 0x9a9286, 9, 0.07, 0);                                           // path in
  for (const sz of [-1, 1]) { A(new T.BoxGeometry(1.0, 1.5, 1.0), STONE, 0.4, 0.75, sz * 2.1); A(new T.BoxGeometry(1.15, 0.15, 1.15), STONE, 0.4, 1.57, sz * 2.1);
    A(new T.CylinderGeometry(0.45, 0.22, 0.7, 10), STONE, 0.4, 2.0, sz * 2.1); A(new T.CylinderGeometry(0.15, 0.25, 0.25, 8), STONE, 0.4, 1.73, sz * 2.1); // urns
    A(new T.BoxGeometry(1.0, 0.9, 17), HEDGE, 0.4, 0.45, sz * (2.6 + 8.5)); }                         // low clipped hedges
  A(new T.CylinderGeometry(1.3, 1.4, 2.4, 8), STONE, 17, 1.2, 0.5); A(new T.ConeGeometry(1.7, 2.6, 8), THATCH, 17, 3.7, 0.5); A(new T.SphereGeometry(0.2, 6, 5), STONE, 17, 5.1, 0.5); // stone kiosk, pointed roof
  A(new T.BoxGeometry(2.4, 2.2, 2.0), STONE, 20.5, 1.1, 3.0); A(new T.ConeGeometry(1.8, 1.0, 4), 0x6b6258, 20.5, 2.7, 3.0, 0, Math.PI / 4); // little stone hut
  A(new T.BoxGeometry(7, 2.4, 5), 0x8a5a40, 22, 1.2, -16); A(new T.ConeGeometry(5.4, 2.8, 4), THATCH, 22, 3.8, -16, 0, Math.PI / 4); // larger thatched shelter (north / left)
  A(new T.BoxGeometry(0.12, 1.3, 2.4), 0x2c3540, 2.2, 1.6, 6.5); for (const dz of [-1, 1]) A(new T.BoxGeometry(0.1, 1.0, 0.1), 0x2c3540, 2.2, 0.5, 6.5 + dz * 1.0); // information board (south / right)
  g.traverse(o => { o.raycast = () => {}; });
}
/* v57: Venetian Waterways south entrance, North Drive / Sandown Road corner (OSM park way 175858676, south edge 52.61341, SW corner ~1.73810;
   Sandown Rd way 29992301 meets North Drive here). From Joseph's Street View (Sandown Rd, Sept 2024, looking N/NE into the park): dark wrought-iron
   arch with 'WATERWAYS' lettering between two red-brick pillars, low cream balustrade walls with red-brick piers either side, red paved pavement,
   white arched footbridge over the water to the right (east), small thatched shelter inside, flagpole with a green flag, Victorian lamp post.
   Local axes: x = east, z = south (the gate faces south onto Sandown Rd). Solid, a few shared materials, no colliders. */
function waterwaysGate() {
  const g = new T.Group(); g.name = 'waterways-gate'; g.position.copy(W(52.61348, 1.73812)); S.add(g);
  const mats = new Map(), M = (c, o) => { const k = c + (o ? 't' : ''); if (!mats.has(k)) mats.set(k, new T.MeshBasicMaterial(Object.assign({ color: c, fog: true }, o || {}))); return mats.get(k); };
  const A = (geo, c, x, y, z, rx = 0, ry = 0, rz = 0, o) => { const m = new T.Mesh(geo, M(c, o)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
  const BRK = 0x9a3f2a, CRM = 0xe9e2cf, IRON = 0x1a1a1c, WHT = 0xf3f3f0;
  A(new T.BoxGeometry(30, 0.05, 6), 0xa04a3e, 0, 0.06, 4);                                         // red paved pavement
  A(new T.BoxGeometry(3.2, 0.04, 14), 0x8a8478, 0, 0.07, -6);                                       // path into the park
  for (const sx of [-1, 1]) { A(new T.BoxGeometry(0.8, 2.6, 0.8), BRK, sx * 1.9, 1.3, 0); A(new T.BoxGeometry(1.0, 0.18, 1.0), CRM, sx * 1.9, 2.69, 0); } // brick gate pillars
  A(new T.TorusGeometry(1.9, 0.07, 6, 28, Math.PI), IRON, 0, 2.7, 0); A(new T.TorusGeometry(1.6, 0.05, 6, 28, Math.PI), IRON, 0, 2.7, 0); // wrought-iron arch
  for (let k = 1; k < 8; k++) { const a = k / 8 * Math.PI; A(new T.BoxGeometry(0.04, 0.32, 0.04), IRON, Math.cos(a) * 1.75, 2.7 + Math.sin(a) * 1.75, 0, 0, 0, a - Math.PI / 2); }
  A(new T.TorusGeometry(0.32, 0.05, 6, 16), IRON, 0, 4.85, 0);                                       // crest
  const lt = LBL('WATERWAYS', '#d9c27a', 0.45); lt.position.set(0, 4.35, 0.05); g.add(lt);
  const wall = (x0, x1, z0, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), ry = -Math.atan2(z1 - z0, x1 - x0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    A(new T.BoxGeometry(L, 0.2, 0.5), CRM, cx, 0.1, cz, 0, ry); A(new T.BoxGeometry(L, 0.14, 0.55), CRM, cx, 0.95, cz, 0, ry); // plinth + coping
    const n = Math.floor(L / 0.32); for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; A(new T.CylinderGeometry(0.09, 0.12, 0.68, 6), CRM, x0 + (x1 - x0) * t, 0.54, z0 + (z1 - z0) * t); } // balusters
    for (const p of [[x1, z1]]) { A(new T.BoxGeometry(0.6, 1.25, 0.6), BRK, p[0], 0.62, p[1]); A(new T.BoxGeometry(0.7, 0.12, 0.7), CRM, p[0], 1.3, p[1]); } }; // red-brick pier
  wall(-2.3, -6, 0, 0.4); wall(-6, -9.5, 0.4, 1.6); wall(-9.5, -12.5, 1.6, 3.6);                      // west, curving round the corner
  wall(2.3, 6, 0, 0.3); wall(6, 9.5, 0.3, 0.6);                                                      // east
  A(new T.BoxGeometry(22, 0.04, 4.5), 0x2f6f8f, 6, 0.05, -5.5);                                      // water channel
  for (const s2 of [-1, 1]) A(new T.BoxGeometry(1.8, 0.2, 3.3), WHT, 12, 0.6, -5.5 + s2 * 1.45, -s2 * 0.38, 0, 0); // white arched footbridge (east): two ramps over the channel
  for (const sx of [-1, 1]) A(new T.TorusGeometry(3.05, 0.12, 6, 20, Math.PI), WHT, 12 + sx * 0.95, 0.15, -5.5, 0, Math.PI / 2, 0).scale.set(1, 0.42, 1);
  const gz = new T.Vector3(3.5, 0, -13); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; A(new T.CylinderGeometry(0.08, 0.08, 2.2, 5), 0x5a4030, gz.x + Math.cos(a) * 1.6, 1.1, gz.z + Math.sin(a) * 1.6); }
  A(new T.ConeGeometry(2.4, 1.8, 6), 0x8a6a3a, gz.x, 3.1, gz.z);                                    // thatched shelter
  A(new T.CylinderGeometry(0.06, 0.08, 7.5, 6), WHT, -4.2, 3.75, 1.2); A(new T.PlaneGeometry(1.7, 0.95), 0x9bc53d, -3.32, 6.9, 1.2, 0, 0, 0, { side: T.DoubleSide }); // flagpole, green flag
  A(new T.CylinderGeometry(0.07, 0.12, 3.6, 6), IRON, 5.5, 1.8, -2.2); A(new T.CylinderGeometry(0.22, 0.12, 0.5, 6), IRON, 5.5, 3.85, -2.2); A(new T.SphereGeometry(0.16, 8, 6), 0xfff2c0, 5.5, 3.8, -2.2); // Victorian lamp
  g.traverse(o => { o.raycast = () => {}; }); fx.waterwaysGate = g.position.clone();
}
/* v48: Fallen Angels, 83 Marine Parade (OSM way 175855364), rebuilt from Joseph's Street View (52.60989,1.73770, hdg 226, Mar 2019):
   2-storey Victorian yellow-brown brick corner building, round-arched windows, chimney, black railings, white rendered arched ground floor on the
   NE (Marine Parade / Euston Rd roundabout) corner. Drawn just outside the OSM footprint so it hides the generic block; neon edges keep the style. */
const FA_PTS = [[28, 696], [31, 699], [56, 697], [55, 671], [26, 673]], FA_H = 8.6;
function fallenAngels() {
  const P = FA_PTS.map(([e, n]) => warp(e, n)), cx = P.reduce((s, p) => s + p.x, 0) / P.length, cz = P.reduce((s, p) => s + p.z, 0) / P.length;
  const Q = P.map(p => new T.Vector2(cx + (p.x - cx) * 1.012, cz + (p.z - cz) * 1.012)); // 1% outset over the generic footprint
  const shape = new T.Shape(Q.map(q => new T.Vector2(q.x, -q.y)));
  const ex = new T.ExtrudeGeometry(shape, { depth: FA_H, bevelEnabled: false }); ex.rotateX(-Math.PI / 2); // shape y = -z  ->  after rotation z = q.y
  const g = new T.Group(); g.name = 'fallen-angels'; S.add(g);
  const wall = new T.Mesh(ex, new T.MeshBasicMaterial({ color: 0x7a6236, fog: false })); g.add(wall);
  const edge = (geo, col, op = 0.85) => { const l = new T.LineSegments(geo, new T.LineBasicMaterial({ color: col, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, fog: false })); g.add(l); return l; };
  edge(new T.EdgesGeometry(ex, 20), 0xffc870);
  const L = [], W2 = [], A = (a, b) => L.push(a.x, a.y, a.z, b.x, b.y, b.z);
  const arch = (o, t, nrm, u, y0, w, h, out) => { const at = (du, dy) => new T.Vector3(o.x + t.x * (u + du) + nrm.x * out, y0 + dy, o.z + t.z * (u + du) + nrm.z * out);
    A(at(-w / 2, 0), at(-w / 2, h - w / 2)); A(at(w / 2, 0), at(w / 2, h - w / 2)); A(at(-w / 2, 0), at(w / 2, 0));
    for (let k = 0; k < 8; k++) { const a0 = Math.PI * k / 8, a1 = Math.PI * (k + 1) / 8; const p0 = at(-Math.cos(a0) * w / 2, h - w / 2 + Math.sin(a0) * w / 2), p1 = at(-Math.cos(a1) * w / 2, h - w / 2 + Math.sin(a1) * w / 2); A(p0, p1); } };
  const NE = 2; // index of the (56,697) corner
  for (let i = 0; i < Q.length; i++) { const a = Q[i], b = Q[(i + 1) % Q.length], len = a.distanceTo(b); if (len < 4) continue;
    const t = new T.Vector3((b.x - a.x) / len, 0, (b.y - a.y) / len); let nrm = new T.Vector3(t.z, 0, -t.x); if ((a.x + b.x) / 2 + nrm.x - cx < (a.x + b.x) / 2 - cx === false && false) nrm.negate();
    const mid = new T.Vector2((a.x + b.x) / 2 - cx, (a.y + b.y) / 2 - cz); if (mid.x * nrm.x + mid.y * nrm.z < 0) nrm.negate(); // outward
    const o = new T.Vector3(a.x, 0, a.y), toNE = i === NE ? 0 : (i + 1) % Q.length === NE ? len : -1; // distance along this edge of the NE corner, if it ends there
    const n = Math.max(1, Math.floor(len / 3.4));
    for (let k = 0; k < n; k++) { const u = (k + 0.5) * len / n, nearNE = toNE >= 0 && Math.abs(u - toNE) < 10;
      arch(o, t, nrm, u, 4.9, 1.2, 2.4, 0.12); // first-floor arched windows
      if (nearNE) { // white rendered ground floor with arched openings
        const wb = new T.Mesh(new T.BoxGeometry(len / n + 0.02, 3.8, 0.3), new T.MeshBasicMaterial({ color: 0xeef0ea, fog: false })); wb.position.set(o.x + t.x * u + nrm.x * 0.2, 1.9, o.z + t.z * u + nrm.z * 0.2); wb.rotation.y = Math.atan2(-t.z, t.x); wb.raycast = () => {}; g.add(wb);
        arch(o, t, nrm, u, 0, 1.6, 3.2, 0.38); W2.push(u); }
      else arch(o, t, nrm, u, 0.9, 1.1, 2.2, 0.12); }
    if (toNE >= 0) for (let u = 0; u < len; u += 0.8) if (Math.abs(u - toNE) >= 10) { const p = new T.Vector3(o.x + t.x * u + nrm.x * 1.2, 0, o.z + t.z * u + nrm.z * 1.2); A(p, p.clone().setY(1.1)); } } // black-painted railings (drawn faint)
  const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(L, 3)); edge(lg, 0xfff0c8, 0.7);
  const ch = new T.Mesh(new T.BoxGeometry(1.6, 2.4, 1.0), new T.MeshBasicMaterial({ color: 0x6a5430, fog: false })); const c0 = warp(44, 690); ch.position.set(c0.x, FA_H + 1.2, c0.z); g.add(ch); edge(new T.EdgesGeometry(ch.geometry).translate(c0.x, FA_H + 1.2, c0.z), 0xffc870);
  const cornice = new T.LineSegments(new T.EdgesGeometry(new T.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, 4.2, 0)), new T.LineBasicMaterial({ color: 0xffd890, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, fog: false })); g.add(cornice);
  g.traverse(o => { o.raycast = () => {}; }); fx.faRoof = FA_H;
}

/* v48: Arc Cinema (OSM way 958803579, footprint ~e21-55 / n618-673) rebuilt from Joseph's Street View (52.60872,1.73731, looking N up North Drive):
   ornate cream Victorian block facing SOUTH down North Drive: central pediment/gable, flanking wings with window rows, vertical blue 'THE ARC' banner,
   wide magenta ground-floor canopy 'FOR THE LOVE OF FILM'. Solid cream + neon edges. */
function textTex(txt, fg, bg, w = 512, h = 64, vertical = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (vertical) { const ch = [...txt]; g.font = `900 ${Math.floor(w * 0.62)}px Arial, sans-serif`; ch.forEach((k, i) => g.fillText(k, w / 2, (i + 0.5) * h / ch.length)); }
  else { g.font = `800 ${Math.floor(h * 0.56)}px Arial, sans-serif`; g.fillText(txt, w / 2, h / 2 + 2); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; }
function arcCinema() {
  const a = warp(21, 618), b = warp(55, 673), x0 = a.x, x1 = b.x, zS = a.z, zN = b.z, W = x1 - x0, D = zS - zN, cxm = (x0 + x1) / 2, H = 14;
  const g = new T.Group(); g.name = 'arc-cinema'; S.add(g);
  const cream = new T.MeshBasicMaterial({ color: 0xd9c9a3, fog: false }), dark = new T.MeshBasicMaterial({ color: 0x2a2620, fog: false });
  const E = new T.LineBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false, fog: false });
  const solid = (geo, x, y, z, m = cream, edges = true) => { const ms = new T.Mesh(geo, m); ms.position.set(x, y, z); g.add(ms); if (edges) { const l = new T.LineSegments(new T.EdgesGeometry(geo), E); l.position.copy(ms.position); g.add(l); } return ms; };
  solid(new T.BoxGeometry(W, H, D), cxm, H / 2, (zS + zN) / 2); // main block
  const cw = 12; solid(new T.BoxGeometry(cw, 3, 1.2), cxm, H + 1.5, zS - 0.6); // raised centre bay
  const tri = new T.Shape([new T.Vector2(-cw / 2 - 0.5, 0), new T.Vector2(cw / 2 + 0.5, 0), new T.Vector2(0, 5)]);
  solid(new T.ExtrudeGeometry(tri, { depth: 1.2, bevelEnabled: false }), cxm, H + 3, zS - 1.2); // pediment
  const Lw = []; const P = (x1_, y1, x2, y2, z) => Lw.push(x1_, y1, z, x2, y2, z);
  for (const side of [-1, 1]) for (const y of [6.2, 10]) for (let k = 0; k < 4; k++) { const x = cxm + side * (cw / 2 + 1.6 + k * ((W / 2 - cw / 2 - 2.4) / 4)), z = zS + 0.06, w = 1.3, h = 2.4;
    P(x - w / 2, y, x + w / 2, y, z); P(x - w / 2, y + h, x + w / 2, y + h, z); P(x - w / 2, y, x - w / 2, y + h, z); P(x + w / 2, y, x + w / 2, y + h, z); }
  for (const y of [5.4, 13.2]) P(x0, y, x1, y, zS + 0.07); // string courses
  const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(Lw, 3)); g.add(new T.LineSegments(lg, E));
  const ban = new T.Mesh(new T.PlaneGeometry(2.6, 8), new T.MeshBasicMaterial({ map: textTex('THE ARC', '#ffffff', '#1d3f9a', 64, 512, true), fog: false })); ban.position.set(cxm, 9.8, zS + 0.12); g.add(ban); // vertical banner
  const cnp = solid(new T.BoxGeometry(W * 0.62, 1.4, 2.8), cxm, 3.9, zS + 1.4, new T.MeshBasicMaterial({ color: 0x9a1f78, fog: false }));
  const cl = new T.Mesh(new T.PlaneGeometry(W * 0.62 - 0.4, 1.2), new T.MeshBasicMaterial({ map: textTex('FOR THE LOVE OF FILM', '#ffffff', '#9a1f78', 768, 64), fog: false })); cl.position.set(cxm, 3.9, zS + 2.82); g.add(cl);
  const glow = new T.Mesh(new T.PlaneGeometry(W * 0.62, 0.12), new T.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false, fog: false })); glow.position.set(cxm, 3.2, zS + 2.83); g.add(glow);
  solid(new T.BoxGeometry(W * 0.5, 3, 0.2), cxm, 1.5, zS + 0.1, dark, false); // glazed entrance under the canopy
  g.traverse(o => { o.raycast = () => {}; });
  fx.arcTop = H + 18; // the DAM sign on Fallen Angels rides a mast above this so it clears the Arc from Marine Parade
}
/* v62: catalogue-driven placements: /assets/data/music-catalogue.json lists approved world locations (lat/lon) and which tracks sit there.
   Each location becomes a normal song cluster (same tappable screens, playback still via tracks.json + YouTube). Neutral labels only. */
function catalogueScreens() {
  fetch('/assets/data/music-catalogue.json?v=75').then(r => r.json()).then(C => { fx.catalogue = { locations: Object.keys(C.locations || {}), placed: 0 };
    for (const [key, loc] of Object.entries(C.locations || {})) { const ids = C.tracks.filter(t => (t.worldLocations || []).includes(key) && t.placementStatus !== 'unplaced').map(t => t.id); if (!ids.length) continue;
      fx.catalogue.placed += ids.length; const base = W(loc.lat, loc.lon), ht = (loc.height_m || 10) * HS;
      songCluster({ key: 'cat:' + key, type: 'screen', song_ids: ids, cluster_at: [loc.lat, loc.lon] }, base, ht); } }).catch(e => console.warn('catalogue', e));
}
/* ---------- song cluster: every matching track from tracks.json as a tappable floating screen over a landmark ---------- */
fx.clusters = [];
function songCluster(L, base, ht) {
  const boot = () => window.JX.load().then(() => {
    const m = (L.song_match || '').toLowerCase();
    const rx = (L.song_patterns || []).map(p => new RegExp(p, 'i')), hay = t => [t.title, t.artist, t.album, t.feat, t.featuring, ...(t.tags || [])].filter(Boolean).join(' | ');
    const ids = L.song_ids ? new Set(L.song_ids) : null, list = window.JX.tracks.filter(t => (ids && ids.has(t.id)) || (m && `${t.title} ${t.album || ''}`.toLowerCase().includes(m)) || rx.some(r => r.test(hay(t))) || (L.song_tag && (t.tags || []).includes(L.song_tag)) || (L.song_album && (t.album || '').toLowerCase() === L.song_album.toLowerCase()))
      .filter(t => window.JX.ytId(t.youtube_url) || t.audio_url);
    fx.clusterInfo = Object.assign(fx.clusterInfo || {}, { [L.key]: list.map(t => t.id) });
    if (!list.length) return;
    const hex = L.type === 'archive' ? '#b48cff' : '#ff5fd2', col = new T.Color(hex), grp = new T.Group(); grp.position.copy(L.cluster_at ? W(L.cluster_at[0], L.cluster_at[1]) : base); grp.userData.orbit = true; S.add(grp);
    if (L.pint) { grp.add(neonPint()); ht = 0; } // giant glowing pint the screens orbit
    const n = list.length, perTier = Math.min(n, 10), rad = n === 1 ? 0 : n <= 3 ? 9 : Math.max(16, perTier * 2.6), W2 = 10, H2 = 5.6;
    const frMat = new T.LineBasicMaterial({ color: col, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, fog: false });
    list.forEach((t, i) => { const tier = Math.floor(i / perTier), a = (i % perTier) / perTier * Math.PI * 2 + tier * 0.3;
      const scr = new T.Mesh(new T.PlaneGeometry(W2, H2), new T.MeshBasicMaterial({ map: titleTex(t.title, hex), transparent: true, opacity: 0.95, side: T.DoubleSide, fog: false }));
      scr.position.set(Math.cos(a) * rad, ht + 8 + tier * (H2 + 2.5), Math.sin(a) * rad); scr.add(new T.LineSegments(new T.EdgesGeometry(scr.geometry), frMat));
      scr.userData = { track: t.id, feature: true, title: t.title, yt: window.JX.ytId(t.youtube_url), loaded: false };
      grp.add(scr); CL.push(scr); });
    const lab = L.no_label ? (n === 1 ? LBL(list[0].title, hex, 2.6) : new T.Group()) : LBL(`${list.length} TRACK${list.length > 1 ? 'S' : ''} // TAP TO PLAY`, hex, 1.4) /* v75: smaller headings */; lab.position.set(0, ht + (L.no_label ? 15 : 4), 0); { const labs = fx.clusterLabs || (fx.clusterLabs = []), k = labs.filter(q => q.distanceTo(grp.position) < 45).length; lab.position.y += k * 5; if (k) lab.position.x += k * 6; labs.push(grp.position.clone()); } grp.add(lab); // v74: stagger headings of neighbouring clusters (Lodge 8 TRACKS vs 1 TRACK over the hatch)
    fx.clusters.push({ grp, key: L.key, frMat, spin: L.pint ? 0.14 : 0.05 });
  }).catch(e => console.warn('cluster', e));
  window.JX ? boot() : addEventListener('DOMContentLoaded', boot);
}
let cTex = 0;
function updateClusters(t, dt) {
  if (fx.foodHeart && !RED) fx.foodHeart.rotation.y = t * 0.8;
  if (fx.foodBeam && !RED) { const k = 0.5 + 0.5 * Math.sin(t * 1.6); fx.foodBeam.material.opacity = 0.26 + 0.14 * k; fx.foodHalo.scale.setScalar(1 + 0.12 * k); }
  if (fx.damG) fx.damG.rotation.y = Math.atan2(CAM.position.x - fx.damG.position.x, CAM.position.z - fx.damG.position.z);
  for (const c of fx.clusters) { const p = c.grp.position, d = Math.hypot(P.pos.x - p.x, P.pos.z - p.z); c.grp.visible = d < (LOW ? 900 : 1600);
    if (!c.grp.visible) continue; if (!RED) c.grp.rotation.y += dt * (c.spin || 0.05);
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

/* ---------- jump-on-map: full-screen overlay of the whole mapped area; tap = teleport, quick-jump list ---------- */
const MB = { x0: -1600, x1: 700, z0: -4700, z1: 3600 }; // walkable bounds (mirrors the clamp in world.js)
const JUMPS = [['plaza', 'Beach plaza (spawn)'], ['pleasure_beach', 'Pleasure Beach'], ['tower_complex', 'Tower Complex'], ['britannia_pier', 'Britannia Pier'], ['arc_cinema', 'Arc Cinema'],
  ['venetian_waterways', 'Venetian Waterways'], ['newtown_archive', 'Newtown Archive'], ['iron_duke', 'The Iron Duke'], ['the_avenues', 'The Avenues'], ['harbour_mouth', 'Harbour Mouth'], ['police_investigation_centre', 'Police Investigation Centre'], ['racecourse', 'Racecourse']];
function bigMap() {
  const el = document.createElement('div'); el.id = 'wmap'; el.className = 'wmap'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Map of Great Yarmouth: tap to jump');
  el.innerHTML = `<canvas class="wmap-cv" aria-hidden="true"></canvas><div class="wmap-top"><span class="wmap-title">GREAT YARMOUTH // JUMP MAP</span><span class="wmap-hint">tap to jump · drag to pan · pinch / scroll to zoom</span></div>
    <button type="button" class="wmap-close" aria-label="Close map">✕</button><nav class="wmap-jumps" aria-label="Quick jumps">${JUMPS.map(([k, n]) => `<button type="button" data-jump="${k}">${n}</button>`).join('')}</nav>
    <small class="wmap-credit">© OpenStreetMap contributors</small>`;
  document.body.appendChild(el); const fade = document.createElement('div'); fade.className = 'wfade'; document.body.appendChild(fade);
  const cv = el.querySelector('canvas'), M = fx.bm = { el, cv, fade, open: false, s: 0.1, cx: 0, cz: 0 };
  // nothing inside the overlay may reach the 3D canvas, the joysticks or the window key handlers
  for (const ev of ['pointerdown', 'pointerup', 'pointermove', 'click', 'touchstart', 'touchmove', 'touchend', 'wheel', 'contextmenu']) el.addEventListener(ev, e => e.stopPropagation(), { passive: ev !== 'wheel' && ev !== 'contextmenu' && ev !== 'touchmove' });
  el.addEventListener('touchmove', e => e.preventDefault(), { passive: false }); el.addEventListener('contextmenu', e => e.preventDefault());
  fx.map.style.pointerEvents = 'auto'; fx.map.style.cursor = 'pointer'; fx.map.setAttribute('role', 'button'); fx.map.setAttribute('aria-label', 'Open jump map'); fx.map.removeAttribute('aria-hidden');
  fx.map.addEventListener('pointerdown', e => e.stopPropagation()); fx.map.addEventListener('click', e => { e.stopPropagation(); openMap(); });
  el.querySelector('.wmap-close').addEventListener('click', () => closeMap());
  el.querySelector('.wmap-jumps').addEventListener('click', e => { const b = e.target.closest('[data-jump]'); if (b) jumpTo(b.dataset.jump); });
  addEventListener('keydown', e => { if (M.open && (e.key === 'Escape' || e.key === 'm' || e.key === 'M')) { e.preventDefault(); e.stopImmediatePropagation(); closeMap(); }
    else if (M.open) e.stopImmediatePropagation(); else if ((e.key === 'm' || e.key === 'M') && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName)) { e.preventDefault(); openMap(); } }, { capture: true });
  addEventListener('keyup', e => { if (M.open) e.stopImmediatePropagation(); }, { capture: true });
  // pan / pinch / tap
  const pts = new Map(); let tap = null, pinch = null;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 1) tap = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; else { tap = null; const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: M.s }; } });
  cv.addEventListener('pointermove', e => { const p = pts.get(e.pointerId); if (!p) return; const dx = e.clientX - p[0], dy = e.clientY - p[1]; p[0] = e.clientX; p[1] = e.clientY;
    if (pts.size === 1) { M.cx -= dx / M.s; M.cz -= dy / M.s; if (tap) tap.moved += Math.abs(dx) + Math.abs(dy); drawBig(); }
    else if (pinch && pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, pinch.s * d / pinch.d / M.s); } });
  const up = e => { if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
    if (tap && pts.size === 0 && tap.moved < 10 && performance.now() - tap.t < 600) { const [x, z] = toWorld(e.clientX, e.clientY); teleport(x, z, null); } if (pts.size === 0) tap = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => { pts.delete(e.pointerId); tap = null; pinch = null; });
  cv.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  addEventListener('resize', () => { if (M.open) { sizeBig(); drawBig(); } });
}
const toWorld = (sx, sy) => { const M = fx.bm, r = M.cv.getBoundingClientRect(); return [M.cx + (sx - r.left - r.width / 2) / M.s, M.cz + (sy - r.top - r.height / 2) / M.s]; };
function zoomAt(sx, sy, f) { const M = fx.bm, [wx, wz] = toWorld(sx, sy), r = M.cv.getBoundingClientRect(); M.s = Math.max(M.fit * 0.8, Math.min(6, M.s * f));
  M.cx = wx - (sx - r.left - r.width / 2) / M.s; M.cz = wz - (sy - r.top - r.height / 2) / M.s; drawBig(); }
function sizeBig() { const M = fx.bm, dpr = Math.min(2, devicePixelRatio || 1), w = innerWidth, h = innerHeight; M.cv.width = Math.round(w * dpr); M.cv.height = Math.round(h * dpr); M.dpr = dpr;
  M.fit = Math.min(w / (MB.x1 - MB.x0), h / (MB.z1 - MB.z0)) * 0.95; }
function bakeBig() { // whole area pre-rendered once into an offscreen bitmap (0.6 px per metre)
  const G = fx.G, K = LITE ? 0.3 : 0.6, c = document.createElement('canvas'); c.width = Math.round((MB.x1 - MB.x0) * K); c.height = Math.round((MB.z1 - MB.z0) * K);
  const g = c.getContext('2d'), X = x => (x - MB.x0) * K, Z = z => (z - MB.z0) * K; g.fillStyle = '#020a08'; g.fillRect(0, 0, c.width, c.height);
  if (!G) { fx.bm.bake = c; return; }
  const poly = (a, fill, stroke) => { g.beginPath(); for (let i = 0; i < a.length; i += 2) { const v = warp(a[i], a[i + 1]); i ? g.lineTo(X(v.x), Z(v.z)) : g.moveTo(X(v.x), Z(v.z)); } g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.stroke(); } };
  const line = (a, col, w) => { g.beginPath(); for (let i = 0; i < a.length; i += 2) { const v = warp(a[i], a[i + 1]); i ? g.lineTo(X(v.x), Z(v.z)) : g.moveTo(X(v.x), Z(v.z)); } g.strokeStyle = col; g.lineWidth = w; g.stroke(); };
  // sea: everything east of the seaward coast profile
  g.fillStyle = '#04202c'; g.beginPath(); g.moveTo(c.width, 0); for (let z = MB.z0; z <= MB.z1; z += 50) g.lineTo(X(fx.coastE(-z)), Z(z)); g.lineTo(c.width, c.height); g.closePath(); g.fill();
  if (G.green) for (const w of G.green) poly(w, 'rgba(61,255,122,.14)'); for (const w of G.beach) poly(w, 'rgba(255,207,90,.22)'); for (const w of G.water) poly(w, '#06364a', 'rgba(0,180,255,.5)');
  g.lineWidth = 1; for (const [, a] of G.roads) line(a, 'rgba(180,190,200,.45)', 1.6);
  g.lineWidth = 0.6; for (const [, a] of G.buildings) poly(a, 'rgba(0,255,157,.28)', 'rgba(0,255,157,.55)');
  for (const a of G.coast) line(a, '#9dffe0', 1.5); for (const [a] of G.piers) line(a, '#b4fff0', 2.5);
  if (G.harbour_spur) line(G.harbour_spur.coords, 'rgba(255,200,74,.7)', 3);
  if (G.golden_mile) { g.shadowColor = '#ffc84a'; g.shadowBlur = 8; line(G.golden_mile.coords, '#ffc84a', 5); g.shadowBlur = 0; }
  fx.bm.bake = c; fx.bm.K = K;
}
function drawBig() {
  const M = fx.bm; if (!M.open) return; const g = M.cv.getContext('2d'), d = M.dpr, W = M.cv.width, H = M.cv.height;
  M.cx = Math.max(MB.x0, Math.min(MB.x1, M.cx)); M.cz = Math.max(MB.z0, Math.min(MB.z1, M.cz));
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#010605'; g.fillRect(0, 0, W, H);
  const S = M.s * d, X = x => W / 2 + (x - M.cx) * S, Z = z => H / 2 + (z - M.cz) * S;
  g.imageSmoothingEnabled = true; g.drawImage(M.bake, X(MB.x0), Z(MB.z0), (MB.x1 - MB.x0) * S, (MB.z1 - MB.z0) * S);
  g.strokeStyle = 'rgba(0,255,157,.35)'; g.setLineDash([6 * d, 6 * d]); g.strokeRect(X(MB.x0), Z(MB.z0), (MB.x1 - MB.x0) * S, (MB.z1 - MB.z0) * S); g.setLineDash([]);
  g.font = `600 ${12 * d}px ui-monospace,monospace`; g.textBaseline = 'middle';
  const lm = fx.landmarks || {};
  for (const [k, v] of Object.entries(lm)) { const x = X(v.pos.x), y = Z(v.pos.z), j = JUMPS.some(q => q[0] === k);
    g.fillStyle = j ? '#ffcc4a' : '#5dffc0'; g.beginPath(); g.arc(x, y, (j ? 5 : 3.5) * d, 0, 7); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 2 * d; g.stroke();
    const t = v.name.split(' (')[0]; g.lineWidth = 3 * d; g.strokeStyle = 'rgba(0,0,0,.8)'; g.strokeText(t, x + 8 * d, y); g.fillText(t, x + 8 * d, y); }
  g.fillStyle = '#00ff9d'; g.beginPath(); g.arc(X(PZ()[0]), Z(PZ()[1]), 6 * d, 0, 7); g.fill(); g.fillText('PLAZA', X(PZ()[0]) + 9 * d, Z(PZ()[1]) + 12 * d);
  if (fx.presence) { g.fillStyle = '#7fe9ff'; g.shadowColor = '#7fe9ff'; g.shadowBlur = 8 * d; for (const v of fx.presence.others.values()) { g.beginPath(); g.arc(X(v.x), Z(v.z), 4 * d, 0, 7); g.fill(); } g.shadowBlur = 0; } // other visitors (anonymous)
  // you are here
  const px = X(P.pos.x), pz = Z(P.pos.z); g.save(); g.translate(px, pz); g.rotate(-P.yaw); g.fillStyle = '#fff'; g.shadowColor = '#00ff9d'; g.shadowBlur = 12 * d;
  g.beginPath(); g.moveTo(0, -13 * d); g.lineTo(8 * d, 9 * d); g.lineTo(0, 4 * d); g.lineTo(-8 * d, 9 * d); g.closePath(); g.fill(); g.restore();
  g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 3 * d; g.strokeText('YOU ARE HERE', px + 14 * d, pz - 12 * d); g.fillText('YOU ARE HERE', px + 14 * d, pz - 12 * d);
  g.fillStyle = '#00ff9d'; g.font = `600 ${14 * d}px ui-monospace,monospace`; g.fillText('N ↑', 14 * d, H - 20 * d);
  if (M.gp) { const cx = W / 2, cy = H / 2; g.strokeStyle = '#ffe14a'; g.lineWidth = 2.5 * d; g.beginPath(); g.arc(cx, cy, 14 * d, 0, 7); g.moveTo(cx - 24 * d, cy); g.lineTo(cx - 8 * d, cy); g.moveTo(cx + 8 * d, cy); g.lineTo(cx + 24 * d, cy); g.moveTo(cx, cy - 24 * d); g.lineTo(cx, cy - 8 * d); g.moveTo(cx, cy + 8 * d); g.lineTo(cx, cy + 24 * d); g.stroke(); // v59: controller cursor (A = jump here)
    const t = (M.gpLabel ? M.gpLabel + ' · ' : '') + 'Ⓐ/✕ jump here'; g.font = `700 ${13 * d}px ui-monospace,monospace`; g.lineWidth = 4 * d; g.strokeStyle = '#000'; g.strokeText(t, cx + 20 * d, cy + 28 * d); g.fillStyle = '#ffe14a'; g.fillText(t, cx + 20 * d, cy + 28 * d); }
}
function openMap() { const M = fx.bm; if (M.open) return; dispatchEvent(new Event('blur')); /* releases held keys */ M.el.hidden = false; M.open = true; window.__mapOpen = true; sizeBig();
  if (!M.bake) bakeBig(); M.s = Math.max(M.fit, Math.min(6, M.fit * 2.2)); M.cx = P.pos.x; M.cz = P.pos.z; drawBig(); M.el.querySelector('.wmap-close').focus({ preventScroll: true }); }
function closeMap() { const M = fx.bm; if (!M.open) return; M.el.hidden = true; M.open = false; setTimeout(() => { window.__mapOpen = false; }, 350); /* swallow the trailing ghost click */ fx.map.focus && CV.focus && CV.focus({ preventScroll: true }); }
/* v59: map API for the gamepad / window manager (world-ui.js): pan, zoom, pins, a centre cursor and the same tap-to-jump as a click */
window.__mapApi = {
  get open() { return !!(fx.bm && fx.bm.open); }, openMap() { openMap(); }, closeMap() { closeMap(); },
  pan(dx, dy) { const M = fx.bm; if (!M || !M.open) return; M.cx += dx / M.s; M.cz += dy / M.s; drawBig(); },
  zoom(f) { const M = fx.bm; if (!M || !M.open) return; const r = M.cv.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, f); },
  pins() { const M = fx.bm; if (!M) return []; return Object.entries(fx.landmarks || {}).map(([k, v]) => ({ k, name: v.name.split(' (')[0], x: v.pos.x, z: v.pos.z, sx: (v.pos.x - M.cx) * M.s, sy: (v.pos.z - M.cz) * M.s })); },
  centreOn(x, z) { const M = fx.bm; if (!M || !M.open) return; M.cx = x; M.cz = z; drawBig(); },
  setCursor(on, label) { const M = fx.bm; if (!M) return; M.gp = on; M.gpLabel = label || ''; drawBig(); },
  tapCentre() { const M = fx.bm; if (!M || !M.open) return; teleport(M.cx, M.cz, null); },
  get state() { const M = fx.bm; return M ? { cx: M.cx, cz: M.cz, s: M.s } : null; }, set state(v) { const M = fx.bm; if (M && v) { M.cx = v.cx; M.cz = v.cz; M.s = v.s; drawBig(); } },
};
function seaEdge(n) { // exact seaward OSM coastline easting at northing n (max over crossing segments), falls back to the coarse profile
  let best = -1e9; for (const c of (fx.G && fx.G.coast) || []) for (let i = 0; i < c.length - 2; i += 2) { const n0 = c[i + 1], n1 = c[i + 3];
    if ((n - n0) * (n - n1) <= 0 && n0 !== n1) { const e = c[i] + (c[i + 2] - c[i]) * (n - n0) / (n1 - n0); if (e > -1500 && e > best) best = e; } }
  return best > -1e8 ? best : (fx.coastE ? fx.coastE(n) : 120); }
function landX(x, z) { return Math.min(x, warp(seaEdge(-z), -z).x - 15); } // never land in the sea: stop 15 m inland of the coastline
function openNear(x, z) { const C = window.__collide; if (!C || !C(x, z, 0.8)) return [x, z]; // nearest open ground (spiral), never inside a footprint
  for (let r = 2; r < 80; r += 2) for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, X = x + Math.cos(a) * r, Z = z + Math.sin(a) * r; if (!C(X, Z, 0.8) && landX(X, Z) === X) return [X, Z]; } return [x, z]; }
const ray0 = () => fx.ray || (fx.ray = new T.Raycaster());
function sightClear(x, z, tx, ty, tz) { if (!fx.chunks) return true; const o = new T.Vector3(x, 1.7, z), d = new T.Vector3(tx - x, ty - 1.7, tz - z), L = d.length(); d.normalize(); const rc = ray0(); rc.set(o, d); rc.far = L - 3;
  const ms = fx.chunks.filter(c => Math.hypot(c.c.x - x, c.c.z - z) - c.r < L + 20).map(c => c.o[0]); return !rc.intersectObjects(ms, false).length; }
function landing(k) { const L = fx.landmarks[k], t = L.pos, ty = L.fy || 10, C = window.__collide || (() => false);
  if (L.land) { const [x, z] = openNear(t.x + L.land[0], t.z - L.land[1]); return [x, z, sightClear(x, z, t.x, ty, t.z)]; } // fixed viewpoint (metres east / north of the landmark)
  for (const r of [55, 40, 70, 30, 90, 22]) for (let i = 0; i < 16; i++) { const a = Math.atan2(50, -25) + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 8, x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r;
    if (x < MB.x0 + 5 || x > MB.x1 - 5 || z < MB.z0 + 5 || z > MB.z1 - 5 || landX(x, z) !== x || C(x, z, 0.8)) continue; if (sightClear(x, z, t.x, ty, t.z)) return [x, z, true]; }
  const [x, z] = openNear(t.x - 25, t.z + 50); return [x, z, false]; }
function teleport(x, z, face, raw) { // raw (v73): exact deck spot (piers over water/sea), skip the inland clamp + open-ground spiral
  x = Math.max(MB.x0 + 5, Math.min(MB.x1 - 5, x)); z = Math.max(MB.z0 + 5, Math.min(MB.z1 - 5, z)); if (!raw) { x = landX(x, z); [x, z] = openNear(x, z); }
  const M = fx.bm; M.fade.classList.remove('on'); void M.fade.offsetWidth; M.fade.classList.add('on');
  closeMap(); setTimeout(() => { P.pos.set(x, P.pos.y, z); if (face) { P.yaw = Math.atan2(-(face[0] - x), -(face[1] - z)); P.pitch = 0.12; } fx.cullT = 0; fx.lastJump = [+x.toFixed(1), +z.toFixed(1)]; }, 180);
}
function jumpTo(k) {
  if (fx.extraJumps && fx.extraJumps[k]) { const [x, z, f, raw] = fx.extraJumps[k]; return teleport(x, z, f, raw); }
  if (k === 'plaza') { const [px, pz] = PZ(); return teleport(px, pz + 22, [px, pz - 6]); }
  const L = fx.landmarks && fx.landmarks[k]; if (!L) return; const t = [L.pos.x, L.pos.z];
  // stand 55 m to the landward/south-west side and look at it (seafront spots: on the prom, facing out)
  const [x, z] = landing(k); teleport(x, z, t); // open ground with a clear view of it, preferring the landward/south-west side
}
/* ---------- North Sea: big subdivided plane; fragments west of the (warped) coastline are discarded ---------- */
function sea(coast) {
  const seg = LOW ? 80 : 160, geo = new T.PlaneGeometry(7000, 9000, seg, seg); geo.rotateX(-Math.PI / 2);
  const cs = coast.concat(Array(Math.max(0, 16 - coast.length)).fill(coast[coast.length - 1]).map((c, i) => ({ n: c.n - (i + 1), e: c.e }))).slice(0, 16), cn = cs.map(c => c.n), ce = cs.map(c => c.e);
  const m = new T.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, side: T.DoubleSide,
    uniforms: { uTime: { value: 0 }, uAmp: { value: 1 }, uDay: { value: 0 }, uG: window.__glowU || { value: 1 }, uC: { value: CORE }, uK: { value: FAR }, uN: { value: cn }, uE: { value: ce } },
    vertexShader: `uniform float uTime; uniform float uAmp; varying vec3 vW; varying float vH;
      void main(){ vec3 p = position; vec4 w = modelMatrix * vec4(p,1.0);
        float h = sin(w.x * 0.08 + uTime * 0.9) * 0.35 + sin(w.z * 0.11 - uTime * 0.7) * 0.25 + sin((w.x + w.z) * 0.21 + uTime * 1.3) * 0.12${LOW ? '' : ' + sin(w.x * 0.37 - w.z * 0.19 + uTime * 2.1) * 0.06 + sin(w.z * 0.53 + w.x * 0.11 - uTime * 1.7) * 0.05'}; h *= uAmp;
        w.y += h - 0.3; vW = w.xyz; vH = h; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime; uniform float uDay; uniform float uG; uniform float uC; uniform float uK; uniform float uN[16]; uniform float uE[16]; varying vec3 vW; varying float vH;
      float coastE(float n){ for(int i=0;i<15;i++){ if(n <= uN[i] && n >= uN[i+1]) return mix(uE[i], uE[i+1], (n-uN[i])/(uN[i+1]-uN[i])); } return n > 0.0 ? uE[0] : uE[15]; }
      void main(){ float rr = max(length(vW.xz), 0.001); float r = rr < uC ? rr : uC + (rr - uC) / uK; vec2 d = vW.xz / rr; float e = d.x * r, n = -d.y * r;
        float ce = coastE(n); if (e < ce) discard;
        float grid = step(0.94, fract(vW.x * 0.25)) + step(0.94, fract(vW.z * 0.25));
        float edge = 1.0 - smoothstep(0.0, 60.0, e - ce);
        // v45: clearly blue sea: deep/day blues, crest highlights, sun/moon shimmer, foam line at the shore that breathes in and out
        float crest = smoothstep(0.25, 0.75, vH);
        float sh = ${LOW ? '0.0' : 'pow(max(0.0, sin(vW.x * 0.9 + uTime * 1.6) * sin(vW.z * 0.7 - uTime * 1.2)), 6.0)'};
        vec3 deep = mix(vec3(0.0, 0.07, 0.22), vec3(0.06, 0.34, 0.72), uDay), lite = mix(vec3(0.1, 0.45, 1.0), vec3(0.35, 0.7, 1.0), uDay);
        vec3 c = deep + lite * (vH * 0.35 + 0.18) + vec3(0.6, 0.85, 1.0) * (crest * 0.18 + sh * 0.35) + vec3(0.3, 0.6, 1.0) * grid * 0.08;
        float fl = e - ce, fw = 6.0 + 3.0 * sin(uTime * 0.6 + n * 0.02);
        float foam = (1.0 - smoothstep(0.0, fw, fl)) * (0.6 + 0.4 * sin(n * 0.3 + uTime * 1.1)) + (1.0 - smoothstep(0.0, 2.0, abs(fl - fw - 4.0))) * 0.35;
        c += vec3(0.85, 0.95, 1.0) * foam * 0.55 + vec3(0.5, 0.8, 1.0) * edge * 0.12;
        gl_FragColor = vec4(c * (0.9 + 0.1 * uG), 0.82); }` });
  const mesh = new T.Mesh(geo, m); mesh.position.set(3200, 0, 0); mesh.frustumCulled = false; S.add(mesh); fx.sea = m;
}
/* ---------- glowing walkways from spawn to each object ---------- */
function paths() {
  const sp = new T.Vector3(PZ()[0], 0, PZ()[1] + 22);
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
  const far = Math.hypot(P.pos.x - PZ()[0], P.pos.z - PZ()[1]) > 70, RM = far ? 350 : 48, cx0 = far ? P.pos.x : PZ()[0], cz0 = far ? P.pos.z : PZ()[1]; // plaza view around origin, or a 350 m view following the player in town
  const g = c.getContext('2d'), s = c.width, k = s / 2 / RM;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, s, s); g.fillStyle = 'rgba(3,10,8,.82)'; g.fillRect(0, 0, s, s);
  const X = x => s / 2 + (x - cx0) * k, Z = z => s / 2 + (z - cz0) * k; g.strokeStyle = 'rgba(0,255,157,.18)'; g.lineWidth = 1;
  for (let i = -2; i <= 2; i++) { const q = s / 2 + i * s / 5; g.beginPath(); g.moveTo(q, 0); g.lineTo(q, s); g.moveTo(0, q); g.lineTo(s, q); g.stroke(); }
  g.fillStyle = 'rgba(0,160,200,.25)'; g.fillRect(s - 6 * dpr, 0, 6 * dpr, s); // sea is east
  g.strokeStyle = 'rgba(0,255,157,.35)'; g.beginPath(); g.arc(X(PZ()[0]), Z(PZ()[1] - 2), 4 * k, 0, 7); g.stroke(); // globe
  if (fx.route2) { g.strokeStyle = 'rgba(255,200,74,.6)'; g.lineWidth = 1.5 * dpr; g.beginPath(); fx.route2.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); g.stroke(); g.lineWidth = 1; }
  if (fx.route) { g.strokeStyle = '#ffc84a'; g.lineWidth = 2.5 * dpr; g.beginPath(); fx.route.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); g.stroke(); g.lineWidth = 1; }
  for (const h of H) { g.fillStyle = h.hex; g.beginPath(); g.arc(X(h.o.pos[0]), Z(h.o.pos[1]), (h.lane === getPlaying() ? 4.5 : 3) * dpr, 0, 7); g.fill(); }
  g.font = `${8 * dpr}px ui-monospace,monospace`; // real-map spots: drawn in place when on the map, else pinned to the edge in their direction
  for (const sp of fx.mapSpots || []) { let mx = X(sp.pos.x), mz = Z(sp.pos.z); const inside = mx > 4 && mx < s - 4 && mz > 4 && mz < s - 4;
    if (!inside) { const dx = mx - s / 2, dz = mz - s / 2, dl = Math.max(Math.abs(dx), Math.abs(dz)) || 1; mx = s / 2 + dx / dl * (s / 2 - 4); mz = s / 2 + dz / dl * (s / 2 - 4); }
    g.fillStyle = sp.col; g.fillRect(mx - 2.5 * dpr, mz - 2.5 * dpr, 5 * dpr, 5 * dpr); if (inside) g.fillText(sp.label, Math.min(s - 46 * dpr, Math.max(2, mx + 5 * dpr)), mz + 3 * dpr); }
  if (fx.presence) { g.fillStyle = '#7fe9ff'; for (const v of fx.presence.others.values()) { const mx = X(v.x), mz = Z(v.z); if (mx > 2 && mx < s - 2 && mz > 2 && mz < s - 2) { g.beginPath(); g.arc(mx, mz, 2.2 * dpr, 0, 7); g.fill(); } } }
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
  if (fx.sky) fx.sky.uniforms.uTime.value = t; if (fx.sea) fx.sea.uniforms.uTime.value = RED ? 0 : t; if (fx.pathMat) fx.pathMat.uniforms.uTime.value = RED ? 0 : t; if (fx.goldMat) fx.goldMat.uniforms.uTime.value = RED ? 0 : t;
  if (fx.rain && !RED) { const { pos, spd, N } = fx.rain;
    for (let i = 0; i < N; i++) { let y = pos[i * 3 + 1] - spd[i] * dt; if (y < 0) { y = 30; pos[i * 3] = P.pos.x + (Math.random() - 0.5) * 80; pos[i * 3 + 2] = P.pos.z + (Math.random() - 0.5) * 80; } pos[i * 3 + 1] = y; }
    fx.rain.pts.geometry.attributes.position.needsUpdate = true; }
  if (fx.skyMesh) fx.skyMesh.position.copy(CAM.position);
  if (fx.feature) { const f = fx.feature; f.grp.position.y = f.y0 + (RED ? 0 : Math.sin(t * 0.8) * 1.2); f.grp.lookAt(CAM.position.x, f.grp.position.y, CAM.position.z);
    const on = window.JX && JX.playing && JX.current && JX.current.id === f.track; f.frMat.opacity = on ? 0.6 + 0.4 * (window.__beat ? __beat() : 1) : 0.75 + 0.2 * Math.sin(t * 2); f.glow.material.opacity = on ? 0.25 : 0.12; }
  if (fx.chunks && t - (fx.cullT || 0) > 0.25) { fx.cullT = t; const far = LOW ? 900 : 1800, edge = LOW ? 0 : 700; // distance culling per 320 m chunk
    for (const c of fx.chunks) { const d = Math.hypot(c.c.x - P.pos.x, c.c.z - P.pos.z) - c.r; c.o[0].visible = d < far; if (c.edge) c.edge.visible = d < edge; } }
  if (fx.policeBar) fx.policeBar.material.color.setHex(Math.floor(t * 3) % 2 ? 0x3b7bff : 0xff3b3b);
  if (fx.archiveCore && !RED) fx.archiveCore.rotation.y += dt * 0.6;
  updateClusters(t, dt);
  if (fx.wheel && !RED) fx.wheel.rotation.z += dt * 0.08;
  if (fx.gondolas) { const d = fx.wheelGrp ? Math.hypot(P.pos.x - fx.wheelGrp.position.x, P.pos.z - fx.wheelGrp.position.z) : 1e9;
    const th = fx.wheel.rotation.z, sn = Math.sin(th), cs = Math.cos(th);
    for (const m of fx.gondolas) { const u = m.userData, a0 = m.userData.a0; // hang 3.6 m straight down from its rim point and stay upright
      m.position.set(Math.cos(a0) * fx.wheelR - 3.6 * sn, Math.sin(a0) * fx.wheelR - 3.6 * cs, 0.6); m.rotation.z = -th;
      if (u.yt && !u.loaded && d < 300 && cTex < 40) { u.loaded = true; cTex++; loader().load(`https://i.ytimg.com/vi/${u.yt}/mqdefault.jpg`, tex => { tex.colorSpace = T.SRGBColorSpace; m.material.map.dispose(); m.material.map = tex; m.material.needsUpdate = true; u.thumb = true; }, undefined, () => { u.thumbFailed = true; }); }
      if (window.JX && JX.current && JX.current.id === u.track) m.scale.setScalar(1.2 + 0.08 * Math.sin(t * 4)); else m.scale.setScalar(1); } }
  if (fx.pbUpd) { try { const pb = fx.landmarks && fx.landmarks.pleasure_beach; fx.pbUpd(t, dt, !RED && pb && Math.hypot(P.pos.x - pb.pos.x, P.pos.z - pb.pos.z) < 700); } catch (e) { worldErr('pleasure beach', e); fx.pbUpd = null; } }
  if (fx.newtown && t - (fx.ntT || 0) > 1) { fx.ntT = t; try { fx.newtown.update(); } catch (e) { fx.newtown = null; } }
  if (fx.v63) { try { fx.v63.update(t, dt); } catch (e) { worldErr('v63', e); fx.v63 = null; } }
  if (fx.v64) { try { fx.v64.update(t, dt); } catch (e) { worldErr('v64', e); fx.v64 = null; } }
  if (fx.v65) { try { fx.v65.update(t, dt); } catch (e) { worldErr('v65', e); fx.v65 = null; } }
  if (fx.v66) { try { fx.v66.update(t, dt); } catch (e) { worldErr('v66', e); fx.v66 = null; } }
  if (fx.v60) { try { fx.v60.update(t, dt); } catch (e) { worldErr('v60', e); fx.v60 = null; } }
  if (fx.train) { try { fx.train.update(t, dt); } catch (e) { worldErr('seafront train', e); fx.train = null; } }
  if (fx.pres) { try { fx.pres.update(t, dt); } catch (e) { console.warn('presence', e); fx.pres = null; } }
  if (fx.gulls) { try { fx.gulls.update(t, dt, fx.env && fx.env.state ? fx.env.state.day : 0.5); } catch (e) { worldErr('gulls', e); fx.gulls = null; } }
  if (fx.env) { try { fx.env.update(t, dt); } catch (e) { worldErr('env', e); fx.env = null; } }
  updateCard(); updateOrbits(t, dt); updateVolume(t);
  if (t - mapT > 0.1) { mapT = t; drawMap(); }
  fx.frames = (fx.frames || 0) + 1;
}
export const worldDebug = {
  w62(lat, lon) { const v = W(lat, lon); return [v.x, v.z]; },
  get v66() { return fx.v66 ? fx.v66.st : null; },
  v66open(id) { fx.v66 && fx.v66.open(id); },
  get v65() { return Object.assign({ clusters: Object.fromEntries(Object.entries(fx.clusterInfo || {}).filter(([k]) => /assembly|beach-campfire|bure/.test(k))), trainTrack: fx.trainTrack || null }, fx.v65Info); },
  get v64() { return Object.assign({ clusters: Object.fromEntries(Object.entries(fx.clusterInfo || {}).filter(([k]) => /station|cemetery|bure|alley|pembroke|fallen|train/.test(k))) }, fx.v64Info); },
  get v63() { return Object.assign({ solids: fx.solids || 0, clusters: Object.fromEntries(Object.entries(fx.clusterInfo || {}).filter(([k]) => /seashore|jellicoe|scroby|park-steps/.test(k))) }, fx.v63Info); },
  get v62() { return { viper: fx.viper && { loaded: fx.viper.loaded, error: !!fx.viper.error, url: fx.viper.url, pos: fx.viper.grp.getWorldPosition(new T.Vector3()).toArray().map(Math.round) }, catalogue: fx.catalogue, clusters: Object.fromEntries(Object.entries(fx.clusterInfo || {}).filter(([k]) => k.startsWith('cat:'))), bridges: fx.riverInfo && fx.riverInfo.bridges }; },
  sight(x, z, tx, ty, tz) { return sightClear(x, z, tx, ty, tz); },
  audit() { const V = [], C = window.__collide, wp = new T.Vector3(); if (!C) return ['no collision grid'];
    const items = CL.filter(o => o.visible !== false).map(o => { o.getWorldPosition(wp); return { n: o.userData.title || o.userData.id || o.userData.track || o.name || 'obj', x: wp.x, y: wp.y, z: wp.z, orb: o.parent && o.parent.userData.orbit ? o.parent.position : null, spin: (() => { for (let q = o.parent; q; q = q.parent) if (q.userData.spin) return true; return false; })() }; });
    for (const it of items) { const h = roofAt(it.x, it.z); if (h >= 0 && it.y < h + 1) V.push(`inside building: ${it.n} y=${it.y.toFixed(1)} roof=${h}`);
      let ok = false; for (let r = 0; r <= 10 && !ok; r += 2.5) for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; if (!C(it.x + Math.cos(a) * r, it.z + Math.sin(a) * r)) { ok = true; break; } } if (!ok) V.push(`no open approach within 10 m: ${it.n}`); }
    if (C(PZ()[0], PZ()[1] + 22)) V.push('spawn blocked');
    for (const k of Object.keys(fx.landmarks)) { const L = fx.landmarks[k], [x, z, see] = landing(k); if (C(x, z, 0.8)) V.push(`landing inside building: ${k}`); if (!see) V.push(`no clear view from landing: ${k}`);
      const near = items.filter(i => Math.hypot(i.x - L.pos.x, i.z - L.pos.z) < 60); const seen = i => { if (i.spin || sightClear(x, z, i.x, i.y, i.z)) return true; // wheel gondolas sweep round: the hub view check above covers them if (!i.orb) return false; // orbiting ring: fine if it comes into view during the orbit
        const dx = i.x - i.orb.x, dz = i.z - i.orb.z; let n = 0; for (let a = 1; a < 8; a++) { const c = Math.cos(a * 0.785), s2 = Math.sin(a * 0.785); if (sightClear(x, z, i.orb.x + dx * c - dz * s2, i.y, i.orb.z + dx * s2 + dz * c)) n++; } return n >= 4; };
      for (const i of near) if (!seen(i)) V.push(`screen occluded from landing: ${k} -> ${i.n}`); }
    return { violations: V, items: items.length, replaced: fx.geo && fx.geo.replaced, roofs: fx.roofAt }; },
  get train() { return fx.train && fx.train.api; }, get gulls() { return fx.gulls && fx.gulls.info; }, get presence() { return fx.pres && fx.pres.api; }, get newtown() { return fx.newtownInfo; },
  openMap() { openMap(); }, closeMap() { closeMap(); }, jump(k) { jumpTo(k); },
  get river() { const v = p => p && [Math.round(p.x), Math.round(p.y), Math.round(p.z)]; return { info: fx.riverInfo || null, herringBridge: v(fx.herringBridge), coastwatch: v(fx.coastwatch), lighthouse: v(fx.gorlestonLight) }; }, // v58
  get fx() { return { screens: fx.screens.length, thumbs: fx.screens.filter(s => s.userData.thumb).length, thumbFailed: fx.screens.filter(s => s.userData.thumbFailed).length, card: fx.cardLane, vol: fx.lastVol, frames: fx.frames, mapOpen: !!(fx.bm && fx.bm.open), lastJump: fx.lastJump, geo: fx.geo, pb: fx.pbInfo, env: fx.env && { day: +fx.env.state.day.toFixed(2), phase: +fx.env.state.phase.toFixed(3), wx: fx.env.state.wx, wxErr: fx.env.state.wxErr, rain: fx.env.state.rain, lamps: fx.env.state.lampInfo }, cols: COL.size, clusters: fx.clusterInfo, wheel: fx.wheelInfo, route: fx.routeInfo, route2: fx.route2Info, landmarks: fx.landmarks && Object.fromEntries(Object.entries(fx.landmarks).map(([k, v]) => [k, [+v.pos.x.toFixed(1), +v.pos.z.toFixed(1)]])) }; },
  featureAt() { const f = fx.feature; if (!f) return null; const v = f.grp.getWorldPosition(new T.Vector3()).project(CAM), r = CV.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, id: f.track, thumb: fx.featureThumb, pos: [+f.grp.position.x.toFixed(1), +f.grp.position.z.toFixed(1)], visible: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 }; },
  screenAt(lane, i = 0) { const m = fx.screens.filter(s => s.userData.lane === lane)[i]; if (!m) return null; const v = m.getWorldPosition(new T.Vector3()).project(CAM), r = CV.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, id: m.userData.track, z: v.z, visible: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 }; },
};
