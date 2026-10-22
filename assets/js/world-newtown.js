/* JHIOS world v41 — Newtown detail from real OSM data (assets/data/newtown-extra.json):
   Great Yarmouth Racecourse (OSM relation 3118342: outer + inner rails) with the Lord Nelson Stand, North Denes Road kerbs / pavements / lamps / junctions
   and named businesses, and Beatty Close (street label only; the flats are approximate blocks in the building data, no numbers or names).
   All lines are merged per colour (4 draw calls) plus a handful of labels; lite mode thins posts and lamps and drops minor labels. */
export function initNewtown(o, X) {
  const { T, S, LBL, LITE, warp, fx } = o, buckets = new Map(), mats = [];
  const seg = (hex, a, b) => { let s = buckets.get(hex); if (!s) buckets.set(hex, s = []); s.push(a.x, a.y, a.z, b.x, b.y, b.z); };
  const W = (p, y = 0) => { const v = warp(p[0], p[1]); v.y = y; return v; };
  const ring = (hex, R, y, close = true) => { for (let i = 0; i < R.length - (close ? 0 : 1); i++) { const a = R[i], b = R[(i + 1) % R.length]; if (a === b) continue; seg(hex, W(a, y), W(b, y)); } };
  const label = (t, p, y, col, h) => { const l = LBL(t, col, h); l.position.copy(W(p, y)); S.add(l); return l; };
  const info = {};
  // ---- racecourse ----
  const RC = X.racecourse; if (RC) { const post = LITE ? 30 : 14;
    for (const R of [...RC.outer, ...RC.inner]) { ring(0xe8fff6, R, 1.0); ring(0xe8fff6, R, 1.35);
      let acc = 0; for (let i = 0; i < R.length; i++) { const a = W(R[i]), b = W(R[(i + 1) % R.length]), L = a.distanceTo(b); for (let s = (post - acc % post) % post; s < L; s += post) { const q = a.clone().lerp(b, s / L); seg(0xe8fff6, q.clone().setY(0), q.clone().setY(1.35)); } acc += L; } }
    // v42: label over the south straight (near the stand) instead of the vertex-average centre ~900 m up the course
    const o0 = RC.outer[0], xs = o0.map(p => p[0]), ns = o0.map(p => p[1]), c = [(Math.min(...xs) + Math.max(...xs)) / 2, Math.min(...ns) + 260];
    label('GREAT YARMOUTH RACECOURSE', c, 26, '#7dffe0', 12);
    if (RC.stand) { const R = RC.stand.ring; for (const y of [3, 6, 9, 10.5]) ring(0xffc84a, R, y); for (const p of R) seg(0xffc84a, W(p, 0), W(p, 10.5));
      const sc = R.reduce((s, p) => [s[0] + p[0] / R.length, s[1] + p[1] / R.length], [0, 0]); label('LORD NELSON STAND', sc, 14, '#ffc84a', 2);
      // jump spot: on the grass between the stand and the rail, facing the course
      const j = [sc[0] + 38, sc[1] + 6], jw = W(j), cw = W([c[0], c[1] + 120]); // v42: in front of the stand, looking NNE up the course at the label
      (fx.extraJumps || (fx.extraJumps = {})).racecourse = [jw.x, jw.z, [cw.x, cw.z]]; }
    (fx.mapSpots || (fx.mapSpots = [])).push({ pos: W(c), col: '#7dffe0', label: 'RACECOURSE' }); info.racecourse = { rings: RC.outer.length + RC.inner.length, centre: c }; }
  // ---- North Denes Road ----
  const ND = X.north_denes_road; if (ND) { const R = ND.road.map(p => W(p)); let lampN = 0, acc = 0; const LS = LITE ? 60 : 30;
    for (let i = 0; i < R.length - 1; i++) { const a = R[i], b = R[i + 1], d = b.clone().sub(a), L = d.length(); if (!L) continue; const n = new T.Vector3(-d.z, 0, d.x).normalize();
      for (const off of [4.2, -4.2]) seg(0xbfeee0, a.clone().addScaledVector(n, off).setY(0.18), b.clone().addScaledVector(n, off).setY(0.18)); // kerbs
      if (!LITE) for (const off of [6.8, -6.8]) seg(0x5fa894, a.clone().addScaledVector(n, off).setY(0.12), b.clone().addScaledVector(n, off).setY(0.12)); // pavement back edge
      for (let s = (LS - acc % LS) % LS; s < L; s += LS) { const side = lampN++ % 2 ? 1 : -1, q = a.clone().addScaledVector(d, s / L).addScaledVector(n, side * 5.2);
        seg(0xffd27a, q.clone().setY(0), q.clone().setY(6)); seg(0xffd27a, q.clone().setY(6), q.clone().addScaledVector(n, -side * 1.4).setY(6)); }
      acc += L; }
    for (const j of ND.junctions) { const q = W(j.at, 0.2); for (let k = 0; k < 8; k++) { const a0 = k / 8 * 6.283, a1 = (k + 1) / 8 * 6.283; seg(0xffffff, q.clone().add(new T.Vector3(Math.cos(a0) * 3, 0, Math.sin(a0) * 3)), q.clone().add(new T.Vector3(Math.cos(a1) * 3, 0, Math.sin(a1) * 3))); }
      if (!LITE && j.name) label(j.name.toUpperCase(), j.at, 4, '#9fd8c8', 0.9); }
    for (const g of ND.greens) ring(0x3dff7a, g.ring, 0.1);
    for (const t of ND.trees || []) { const q = W(t); seg(0x3dff7a, q.clone(), q.clone().setY(4)); }
    for (const p of ND.pois) label(p.name.toUpperCase(), p.at, 7, '#ff9de6', 1.2);
    label('NORTH DENES ROAD', ND.road[Math.floor(ND.road.length / 2)], 9, '#bfeee0', 1.6); info.ndr = { lamps: lampN, junctions: ND.junctions.length, pois: ND.pois.length }; }
  // ---- Beatty Close (street label only) ----
  const BC = X.beatty_close; if (BC) { for (const R of BC.roads) ring(0xbfeee0, R, 0.15, false); label('BEATTY CLOSE', BC.label_at, 5, '#bfeee0', 1.1); info.beatty = { blocks: BC.blocks.length }; }
  for (const [hex, s] of buckets) { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(s, 3));
    const m = new T.LineBasicMaterial({ color: hex, transparent: true, opacity: 0.75, blending: T.AdditiveBlending, depthWrite: false, fog: false }); m.userData.op = 0.75; mats.push(m);
    const l = new T.LineSegments(g, m); l.raycast = () => {}; S.add(l); }
  info.drawCalls = buckets.size; fx.newtownInfo = info;
  return { update() { const day = fx.env && fx.env.state ? fx.env.state.day : 0.5; for (const m of mats) m.opacity = m.userData.op * (0.6 + (1 - day) * 0.4); } };
}
