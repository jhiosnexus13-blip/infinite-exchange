/* JHIOS world v50: the Newtown streets around the GYnet food basket on Sturdee Avenue (assets/data/newtown-streets.json, from OSM / Geofabrik,
   © OpenStreetMap contributors). Grey road ribbons with street-name labels, Newtown Park as a green area, and dim, low-key terrace blocks set
   along the roads wherever OSM has no building, so the area isn't empty. No house numbers, no addresses, and nothing is labelled as anyone's home.
   Everything is merged into a handful of draw calls; lite mode uses fewer, coarser terrace blocks. */
export function initStreets(o, X) {
  const { T, S, LBL, LITE, warp, G } = o;
  const P = f => { const r = []; for (let i = 0; i < f.length; i += 2) r.push([f[i], f[i + 1]]); return r; };
  const roads = []; for (const [name, ls] of Object.entries(X.roads)) for (const f of ls) roads.push([name, P(f)]);
  // existing footprints (main geo + OSM extract) as boxes, so filler terraces never overlap real buildings
  const boxes = []; const addBox = R => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of R) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } boxes.push([a - 1, b - 1, c + 1, d + 1]); };
  const xs = roads.flatMap(r => r[1].map(p => p[0])), ys = roads.flatMap(r => r[1].map(p => p[1]));
  const bb = [Math.min(...xs) - 80, Math.min(...ys) - 80, Math.max(...xs) + 80, Math.max(...ys) + 80];
  for (const b of (G && G.buildings) || []) { const f = b[1]; if (f[0] > bb[0] && f[0] < bb[2] && f[1] > bb[1] && f[1] < bb[3]) addBox(P(f)); }
  for (const f of X.buildings) addBox(P(f));
  const park = P(X.park.poly); addBox(park); for (const f of X.green_extra || []) addBox(P(f));
  const hit = (x, y) => boxes.some(q => x > q[0] && x < q[2] && y > q[1] && y < q[3]);
  const dseg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
  const nearRoad = (p, skip) => roads.some(([n, R]) => n !== skip && R.some((a, i) => i < R.length - 1 && dseg(p, a, R[i + 1]) < 7));
  // ---- road ribbons (grey, flat) ----
  const rv = [], ri = [];
  const quad = (a, b, c, d, y) => { const k = rv.length / 3; for (const q of [a, b, c, d]) rv.push(q.x, y, q.z); ri.push(k, k + 1, k + 2, k, k + 2, k + 3); };
  // ---- terrace filler ----
  const tv = [], ti = []; const TH = 6.2, DEP = 7, OFF = 9, LEN = LITE ? 24 : 12; let terr = 0;
  const box = (c, t, n, len) => { const k = tv.length / 3, hw = len / 2;
    const pts = [[-hw, 0], [hw, 0], [hw, DEP], [-hw, DEP]].map(([u, v]) => [c[0] + t[0] * u + n[0] * v, c[1] + t[1] * u + n[1] * v]).map(p => warp(p[0], p[1]));
    for (const y of [0, TH]) for (const p of pts) tv.push(p.x, y, p.z);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; ti.push(k + i, k + j, k + 4 + j, k + i, k + 4 + j, k + 4 + i); } ti.push(k + 4, k + 5, k + 6, k + 4, k + 6, k + 7); terr++; };
  const lines = [];
  for (const [name, R] of roads) { let best = null, bl = 0;
    for (let i = 0; i < R.length - 1; i++) { const a = R[i], b = R[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (!L) continue;
      const t = [dx / L, dy / L], n = [-t[1], t[0]], A = warp(a[0], a[1]), B = warp(b[0], b[1]), hw = 3.6;
      const off = (p, s) => warp(p[0] + n[0] * s, p[1] + n[1] * s);
      quad(off(a, hw), off(b, hw), off(b, -hw), off(a, -hw), 0.06);
      lines.push(off(a, hw).setY(0.1), off(b, hw).setY(0.1), off(a, -hw).setY(0.1), off(b, -hw).setY(0.1));
      if (L > bl) { bl = L; best = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, A, B]; }
      for (let s = LEN / 2 + 8; s < L - 8; s += LEN + 0.6) for (const side of [1, -1]) {
        const c = [a[0] + t[0] * s + n[0] * side * OFF, a[1] + t[1] * s + n[1] * side * OFF], nn = [n[0] * side, n[1] * side];
        const far = [c[0] + nn[0] * DEP * 0.5, c[1] + nn[1] * DEP * 0.5], probes = [far, [far[0] + t[0] * LEN / 2, far[1] + t[1] * LEN / 2], [far[0] - t[0] * LEN / 2, far[1] - t[1] * LEN / 2]];
        if (probes.some(p => hit(p[0], p[1]) || nearRoad(p, name))) continue; box(c, t, nn, LEN); boxes.push([Math.min(...probes.map(p => p[0])) - 2, Math.min(...probes.map(p => p[1])) - 2, Math.max(...probes.map(p => p[0])) + 2, Math.max(...probes.map(p => p[1])) + 2]); } }
    if (best) { const l = LBL(name.toUpperCase(), '#b9c3cc', LITE ? 2.2 : 1.8); const w = warp(best[0], best[1]); l.position.set(w.x, 4.2, w.z); S.add(l); } }
  const geo = (v, i) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); g.setIndex(i); g.computeVertexNormals(); return g; };
  const grp = new T.Group(); grp.name = 'newtown-streets'; S.add(grp);
  grp.add(new T.Mesh(geo(rv, ri), new T.MeshBasicMaterial({ color: 0x3a3f45, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 })));
  const kerb = new T.LineSegments(new T.BufferGeometry().setFromPoints(lines), new T.LineBasicMaterial({ color: 0x7c858e, transparent: true, opacity: 0.55 })); grp.add(kerb);
  if (terr) { const tg = geo(tv, ti); grp.add(new T.Mesh(tg, new T.MeshBasicMaterial({ color: 0x1b2026 })));
    if (!LITE) grp.add(new T.LineSegments(new T.EdgesGeometry(tg, 30), new T.LineBasicMaterial({ color: 0x46525e, transparent: true, opacity: 0.45 }))); }
  // ---- Newtown Park ----
  const sh = new T.Shape(park.map(([x, y]) => { const w = warp(x, y); return new T.Vector2(w.x, -w.z); }));
  const pg = new T.ShapeGeometry(sh); pg.rotateX(-Math.PI / 2);
  const pm = new T.Mesh(pg, new T.MeshBasicMaterial({ color: 0x2f7a3a, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })); pm.position.y = 0.08; grp.add(pm);
  for (const f of X.green_extra || []) { const R = P(f); const g2 = new T.ShapeGeometry(new T.Shape(R.map(([x, y]) => { const w = warp(x, y); return new T.Vector2(w.x, -w.z); }))); g2.rotateX(-Math.PI / 2);
    const m2 = new T.Mesh(g2, pm.material); m2.position.y = 0.08; grp.add(m2); } // plain unlabelled grass (recreation ground)
  const pc = park.reduce((s, p) => [s[0] + p[0] / park.length, s[1] + p[1] / park.length], [0, 0]), pw = warp(pc[0], pc[1]);
  const pl = LBL('NEWTOWN PARK', '#8dffa0', 2.4); pl.position.set(pw.x, 5, pw.z); S.add(pl);
  grp.traverse(m => { m.raycast = () => {}; });
  return window.__streets = { roads: roads.length, terraces: terr, park: [pw.x, pw.z] };
}
