/* JHIOS world v40 — Great Yarmouth Pleasure Beach, rebuilt from OSM + the official park map (see assets/data/pleasure-beach.json).
   All line geometry is merged per colour; a handful of small groups animate (coaster car, carousel, spinners, drop ring). */
let T, S, W, LBL, LITE, fx;
const mats = [], spin = [];
export function initPB(o, D) {
  ({ T, S, W, LBL, LITE, fx } = o);
  const root = new T.Group(); root.name = 'pleasure-beach'; S.add(root);
  const M = (hex, op = 0.85) => { const m = new T.LineBasicMaterial({ color: hex, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, fog: false }); m.userData.op = op; mats.push(m); return m; };
  const buckets = new Map(); const seg = (hex, a, b) => { let s = buckets.get(hex); if (!s) buckets.set(hex, s = []); s.push(a.x, a.y, a.z, b.x, b.y, b.z); };
  const V = (lat, lon, y = 0) => { const v = W(lat, lon); v.y = y; return v; };
  const info = { coaster_m: 0, rides: [] };
  // --- 1932 wooden Roller Coaster (scenic railway): OSM track ways, layer -> height
  const ways = D.coaster.map(w => { const y = w.covered ? 2.2 : 3 + w.layer * 4.2; return w.pts.map(p => V(p[0], p[1], y)); });
  const tieEvery = LITE ? 4 : 2;
  for (const P of ways) for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1], d = b.clone().sub(a), L = d.length(); if (!L) continue; info.coaster_m += L;
    const n = new T.Vector3(-d.z, 0, d.x).normalize().multiplyScalar(0.7);
    seg(0xffb347, a.clone().add(n), b.clone().add(n)); seg(0xffb347, a.clone().sub(n), b.clone().sub(n));
    for (let s = 0; s < L; s += tieEvery) { const q = a.clone().addScaledVector(d, s / L); seg(0x8a5a2b, q.clone().add(n), q.clone().sub(n)); if (s % (tieEvery * 3) < tieEvery) { seg(0x8a5a2b, q.clone().add(n), q.clone().add(n).setY(0)); seg(0x8a5a2b, q.clone().sub(n), q.clone().sub(n).setY(0)); } } }
  const longest = ways.reduce((a, b) => len(b) > len(a) ? b : a, ways[0] || []);
  if (longest.length > 1) { const car = new T.Group(); for (let k = 0; k < 3; k++) { const c = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1.6, 1, 2.4)), M(0xff5fd2, 1)); c.position.z = k * 2.7; car.add(c); }
    const brake = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(0.5, 1.3, 0.5)), M(0xffffff, 1)); brake.position.set(0, 1, 2.7); car.add(brake); // the brakesperson rides mid-train
    root.add(car); spin.push({ kind: 'car', o: car, path: longest, L: len(longest) }); }
  // --- monorail (OSM railway=monorail), log flume stand-in (OSM, not on the 2025 ride list), Gardens mini golf
  for (const w of D.monorail) { const P = w.pts.map(p => V(p[0], p[1], 5)); for (let i = 0; i < P.length - 1; i++) { seg(0x5dd6ff, P[i], P[i + 1]); if (i % 3 === 0) seg(0x2a6a80, P[i], P[i].clone().setY(0)); } }
  for (const w of D.flume) { const P = w.pts.map(p => V(p[0], p[1], 1.5)); for (let i = 0; i < P.length - 1; i++) { seg(0x2a5a9a, P[i], P[i + 1]); seg(0x2a5a9a, P[i].clone().setY(0.4), P[i + 1].clone().setY(0.4)); } }
  if (D.gardens) { const P = D.gardens.map(p => V(p[0], p[1], 0.3)); for (let i = 0; i < P.length - 1; i++) seg(0x7dff6a, P[i], P[i + 1]);
    const c = P.reduce((s, p) => s.add(p), new T.Vector3()).divideScalar(P.length); for (let k = 0; k < 9; k++) { const q = c.clone().add(new T.Vector3(Math.cos(k * 0.7) * (4 + k * 1.6), 0, Math.sin(k * 0.7) * (4 + k * 1.6))); seg(0xffffff, q, q.clone().setY(1.6)); seg(0xff5f5f, q.clone().setY(1.6), q.clone().setY(1.6).add(new T.Vector3(0.6, -0.2, 0))); }
    if (!LITE) { const l = LBL('GARDENS · MINI GOLF', '#7dff6a', 2.2); l.position.copy(c).setY(6); root.add(l); } }
  // --- rides from the official park map
  const label = (txt, p, y, col = '#ffcf5f', h = 2.6) => { const l = LBL(txt, col, h); l.position.copy(p).setY(y); root.add(l); };
  const wbox = (hex, c, w, h, d, y0 = 0) => { const e = new T.EdgesGeometry(new T.BoxGeometry(w, h, d)), p = e.attributes.position; for (let i = 0; i < p.count; i += 2) seg(hex, new T.Vector3(p.getX(i), p.getY(i) + h / 2 + y0, p.getZ(i)).add(c), new T.Vector3(p.getX(i + 1), p.getY(i + 1) + h / 2 + y0, p.getZ(i + 1)).add(c)); };
  for (const r of D.rides) { const c = V(r.lat, r.lon); info.rides.push(r.key);
    if (r.kind === 'arch') { // entrance arch + sign
      const ax = new T.Vector3(0, 0, 9); for (const s of [-1, 1]) wbox(0xff5fd2, c.clone().addScaledVector(ax, s), 1.4, 9, 1.4);
      const arc = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI; arc.push(c.clone().add(new T.Vector3(0, 9 + Math.sin(a) * 3.5, -Math.cos(a) * 9))); } for (let k = 0; k < 16; k++) seg(0xffcf5f, arc[k], arc[k + 1]);
      // v43 (Street View 49 S Beach Parade): dark-green steel gates between the pillars, white railings along the frontage
      for (let z = -8; z <= 8; z += 0.8) seg(0x2fb36a, c.clone().add(new T.Vector3(0, 0, z)), c.clone().add(new T.Vector3(0, 2.6, z)));
      for (const y of [0.3, 1.3, 2.6]) seg(0x2fb36a, c.clone().add(new T.Vector3(0, y, -8)), c.clone().add(new T.Vector3(0, y, 8)));
      for (const s2 of [-1, 1]) { for (const y of [0.5, 1.1]) seg(0xf4f8f8, c.clone().add(new T.Vector3(0, y, s2 * 9.7)), c.clone().add(new T.Vector3(0, y, s2 * 34)));
        for (let z = 10; z <= 34; z += 2) seg(0xf4f8f8, c.clone().add(new T.Vector3(0, 0, s2 * z)), c.clone().add(new T.Vector3(0, 1.1, s2 * z))); }
      const sg = LBL('PLEASURE BEACH', '#ff5fd2', 3.2); sg.position.copy(c).setY(10.5); sg.userData.sign = true; root.add(sg); fx.pbSign = sg; }
    else if (r.kind === 'carousel') { const g = new T.Group(); g.position.copy(c); const rr = 7;
      g.add(new T.LineSegments(new T.EdgesGeometry(new T.CylinderGeometry(rr, rr, 0.6, 24)), M(0xffcf5f, 0.9)).translateY(0.6));
      g.add(new T.LineSegments(new T.EdgesGeometry(new T.ConeGeometry(rr + 0.6, 3, 24, 1, true)), M(0xff5fd2, 0.9)).translateY(6.5));
      const hp = []; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283, x = Math.cos(a) * (rr - 1), z = Math.sin(a) * (rr - 1); hp.push(x, 0.9, z, x, 5, z); }
      const hg = new T.BufferGeometry(); hg.setAttribute('position', new T.Float32BufferAttribute(hp, 3)); g.add(new T.LineSegments(hg, M(0xffffff, 0.8)));
      for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283, h = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(0.4, 0.8, 1.4)), M(0xffcf5f, 0.9)); h.position.set(Math.cos(a) * (rr - 1), 2.5, Math.sin(a) * (rr - 1)); h.rotation.y = -a; h.userData.k = k; g.add(h); }
      root.add(g); spin.push({ kind: 'carousel', o: g }); label(r.name.toUpperCase(), c, 10); }
    else if (r.kind === 'tower') { wbox(0x5dd6ff, c, 1.6, r.h, 1.6); const g = new T.Group(); g.position.copy(c).setY(r.h * 0.8);
      g.add(new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(14, 0.6, 1.2)), M(0x5dd6ff, 0.9))); root.add(g); spin.push({ kind: 'swing', o: g }); label(r.name.toUpperCase(), c, r.h + 3); }
    else if (r.kind === 'drop') { wbox(0xff5f5f, c, 2.2, r.h, 2.2); const ring = new T.LineSegments(new T.EdgesGeometry(new T.CylinderGeometry(3, 3, 1.2, 12)), M(0xffcf5f, 1)); ring.position.copy(c); root.add(ring); spin.push({ kind: 'drop', o: ring, h: r.h }); label(r.name.toUpperCase(), c, r.h + 3); }
    else if (r.kind === 'box') { wbox(0x9d7dff, c, r.w, r.h, r.d); label(r.name.toUpperCase(), c, r.h + 3, '#c9b5ff', 2); }
    else if (r.kind === 'strip') { const c2 = V(r.lat2, r.lon2), d = c2.clone().sub(c), L = d.length(), n = new T.Vector3(-d.z, 0, d.x).normalize().multiplyScalar(5);
      for (const y of [0, r.h, r.h + 1.2]) { seg(0xff9d2a, c.clone().add(n).setY(y), c2.clone().add(n).setY(y)); seg(0xff9d2a, c.clone().sub(n).setY(y), c2.clone().sub(n).setY(y)); }
      for (let s = 0; s <= L; s += LITE ? 16 : 8) { const q = c.clone().addScaledVector(d, s / L); seg(0xff9d2a, q.clone().sub(n), q.clone().sub(n).setY(r.h + 1.2)); }
      label('ARCADES', c.clone().lerp(c2, 0.5), r.h + 4, '#ff9d2a', 2.4); }
    else if (r.kind === 'pool') { const P = []; for (let k = 0; k <= 20; k++) { const a = k / 20 * 6.283; P.push(c.clone().add(new T.Vector3(Math.cos(a) * 9, 0.5, Math.sin(a) * 6))); } for (let k = 0; k < 20; k++) seg(0x2aa8ff, P[k], P[k + 1]); label(r.name.toUpperCase(), c, 5, '#7fd4ff', 2); }
    else if (r.kind === 'spinner') { wbox(0xff5fd2, c, 1, 5, 1); const g = new T.Group(); g.position.copy(c).setY(5); const a = []; for (let k = 0; k < 6; k++) { const q = k / 6 * 6.283; a.push(0, 0, 0, Math.cos(q) * 6, -1.5, Math.sin(q) * 6); }
      const ag = new T.BufferGeometry(); ag.setAttribute('position', new T.Float32BufferAttribute(a, 3)); g.add(new T.LineSegments(ag, M(0xff5fd2, 0.9))); root.add(g); spin.push({ kind: 'spin', o: g }); if (!LITE) label(r.name.toUpperCase(), c, 9, '#ff9de6', 2); } }
  if (ways.length) label('ROLLER COASTER · 1932', ways[0][Math.floor(ways[0].length / 2)], 18, '#ffb347', 3);
  for (const [hex, s] of buckets) { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(s, 3)); const l = new T.LineSegments(g, M(hex)); l.frustumCulled = true; root.add(l); }
  fx.pbInfo = Object.assign(info, { coaster_m: Math.round(info.coaster_m), lineBuckets: buckets.size });
  return update;
}
function len(P) { let s = 0; for (let i = 1; i < P.length; i++) s += P[i].distanceTo(P[i - 1]); return s; }
function at(P, d) { for (let i = 1; i < P.length; i++) { const l = P[i].distanceTo(P[i - 1]); if (d <= l) return [P[i - 1].clone().lerp(P[i], d / l), P[i]]; d -= l; } return [P[P.length - 1].clone(), P[P.length - 1]]; }
function update(t, dt, near) {
  const day = fx.env && fx.env.state ? fx.env.state.day : 0, glow = 0.55 + (1 - day) * 0.45;
  for (const m of mats) m.opacity = Math.min(1, m.userData.op * glow * 1.1);
  if (fx.pbSign) fx.pbSign.material.opacity = day > 0.5 ? 0.85 : (Math.floor(t * 2) % 4 ? 1 : 0.55);
  if (!near) return;
  for (const s of spin) {
    if (s.kind === 'carousel') s.o.rotation.y += dt * 0.5;
    else if (s.kind === 'spin') s.o.rotation.y += dt * 1.6;
    else if (s.kind === 'swing') s.o.rotation.y += dt * 0.9;
    else if (s.kind === 'drop') { const ph = (t * 0.12) % 1; s.o.position.y = ph < 0.7 ? 2 + ph / 0.7 * (s.h - 4) : (s.h - 2) * (1 - (ph - 0.7) / 0.3) ** 2 + 1; }
    else if (s.kind === 'car') { const d = (t * 9) % (2 * s.L), x = d < s.L ? d : 2 * s.L - d, [p, nx] = at(s.path, x); s.o.position.copy(p).setY(p.y + 0.6); s.o.lookAt(nx.x, p.y + 0.6, nx.z); }
  }
}
