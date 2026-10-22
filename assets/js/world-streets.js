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
  const park = P(X.park.poly); addBox(park); for (const f of X.green_extra || []) addBox(P(f)); if (X.centre) addBox(P(X.centre.poly)); const TR = X.terrace; if (TR) { const hs = TR.houses; boxes.push([TR.front - TR.depth - 3, hs[0][0] - 1, TR.front + 4, hs[hs.length - 1][0] + TR.w + 1]); }
  boxes.push([-166, 2322, -88, 2378]); // v57: Beatty Close flats + bungalows plot
  boxes.push([-217, 2325, -176, 2375]); // v56: The Avenue pub + forecourt (built below) keeps filler terraces off its plot
  const hit = (x, y) => boxes.some(q => x > q[0] && x < q[2] && y > q[1] && y < q[3]);
  const dseg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
  const nearRoad = (p, skip) => roads.some(([n, R]) => n !== skip && R.some((a, i) => i < R.length - 1 && dseg(p, a, R[i + 1]) < 7));
  // ---- road ribbons (grey, flat) ----
  const rv = [], ri = [];
  const quad = (a, b, c, d, y) => { const k = rv.length / 3; for (const q of [a, b, c, d]) rv.push(q.x, y, q.z); ri.push(k, k + 1, k + 2, k, k + 2, k + 3); };
  // ---- terrace filler ----
  const tv = [], ti = []; const TH = 6.2, DEP = 7, OFF = 9, LEN = LITE ? 24 : 12; let terr = 0;
  const ctv = [], cti = [], chq = []; // v57: Chaucer Road terraces get their own red-brick arrays + front details
  const box = (c, t, n, len, V = tv, I = ti) => { const k = V.length / 3, hw = len / 2;
    const pts = [[-hw, 0], [hw, 0], [hw, DEP], [-hw, DEP]].map(([u, v]) => [c[0] + t[0] * u + n[0] * v, c[1] + t[1] * u + n[1] * v]).map(p => warp(p[0], p[1]));
    for (const y of [0, TH]) for (const p of pts) V.push(p.x, y, p.z);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; I.push(k + i, k + j, k + 4 + j, k + i, k + 4 + j, k + 4 + i); } I.push(k + 4, k + 5, k + 6, k + 4, k + 6, k + 7); terr++; };
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
        if (probes.some(p => hit(p[0], p[1]) || nearRoad(p, name))) continue; if (name === 'Chaucer Road') { box(c, t, nn, LEN, ctv, cti); chq.push([c, t, nn]); } else box(c, t, nn, LEN); boxes.push([Math.min(...probes.map(p => p[0])) - 2, Math.min(...probes.map(p => p[1])) - 2, Math.max(...probes.map(p => p[0])) + 2, Math.max(...probes.map(p => p[1])) + 2]); } }
    if (best) { const l = LBL(name.toUpperCase(), '#b9c3cc', LITE ? 2.2 : 1.8); const w = warp(best[0], best[1]); l.position.set(w.x, 4.2, w.z); S.add(l); } }
  const geo = (v, i) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); g.setIndex(i); g.computeVertexNormals(); return g; };
  const grp = new T.Group(); grp.name = 'newtown-streets'; S.add(grp);
  grp.add(new T.Mesh(geo(rv, ri), new T.MeshBasicMaterial({ color: 0x3a3f45, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 })));
  const kerb = new T.LineSegments(new T.BufferGeometry().setFromPoints(lines), new T.LineBasicMaterial({ color: 0x7c858e, transparent: true, opacity: 0.55 })); grp.add(kerb);
  // v53: solid buildings: brick walls + brown roofs for the filler terraces AND the OSM buildings here (re-skinned, 2% outset), merged per material
  const wv = [], wi = [], fv = [], fi = [], cwv = [], cwi = [];
  const chR = (X.roads['Chaucer Road'] || []).map(P), nearCh = R => { const cx = R.reduce((a, p) => a + p[0], 0) / R.length, cy = R.reduce((a, p) => a + p[1], 0) / R.length; return chR.some(L => L.some((a, i) => i < L.length - 1 && dseg([cx, cy], a, L[i + 1]) < 22)); };
  const solid = (R, h, wallsV = wv, wallsI = wi) => { const cx = R.reduce((a, p) => a + p[0], 0) / R.length, cy = R.reduce((a, p) => a + p[1], 0) / R.length;
    const Q = R.map(p => warp(cx + (p[0] - cx) * 1.02, cy + (p[1] - cy) * 1.02)); const n = Q.length;
    for (let i = 0; i < n; i++) { const a = Q[i], b = Q[(i + 1) % n], k = wallsV.length / 3; wallsV.push(a.x, 0, a.z, b.x, 0, b.z, b.x, h, b.z, a.x, h, a.z); wallsI.push(k, k + 1, k + 2, k, k + 2, k + 3); }
    const tri = T.ShapeUtils.triangulateShape(Q.map(q => new T.Vector2(q.x, q.z)), []), k = fv.length / 3; for (const q of Q) fv.push(q.x, h, q.z); for (const t of tri) fi.push(k + t[0], k + t[1], k + t[2]); };
  for (let i = 0; i < tv.length; i += 24) { const R = []; for (let j = 0; j < 4; j++) R.push([0, 0]); } // (filler boxes below come from tv directly)
  if (ctv.length) grp.add(new T.Mesh(geo(ctv, cti), new T.MeshBasicMaterial({ color: 0xa2432b, side: T.DoubleSide }))); // v57 Chaucer red brick
  if (tv.length) { const tg = geo(tv, ti); grp.add(new T.Mesh(tg, new T.MeshBasicMaterial({ color: 0x8a4e34, side: T.DoubleSide }))); }
  for (const f of X.buildings) { const R = P(f); if (R.length > 2) nearCh(R) ? solid(R, 6.4, cwv, cwi) : solid(R, 6.4); }
  // v56: 'all brick buildings need to be solid too': the main-geo OSM footprints inside the Newtown streets area (drawn as translucent neon blocks
  // by geo()) get the same solid brick skin at their own height (+0.3 so the brick roof caps the neon one); duplicates of X.buildings are skipped
  { const seen = new Set([...X.buildings.map(f => f[0] + ',' + f[1]), '-160,2365', '-128,2365']); let nb = 0; // v57: the two approximate Beatty Close blocks are replaced by the flats model
    for (const b of (G && G.buildings) || []) { const f = b[1]; if (!(f[0] > bb[0] && f[0] < bb[2] && f[1] > bb[1] && f[1] < bb[3]) || seen.has(f[0] + ',' + f[1])) continue;
      const R = P(f); if (R.length < 3) continue; let A = 0; for (let i = 0; i < R.length; i++) { const p = R[i], q = R[(i + 1) % R.length]; A += p[0] * q[1] - q[0] * p[1]; } A = Math.abs(A / 2);
      const hh = Math.max(6.4, (b[0] || (A > 900 ? 9 : 6)) + 0.3); nearCh(R) ? solid(R, hh, cwv, cwi) : solid(R, hh); nb++; }
    window.__brickSolid = nb; }
  // v54: the terrace Joseph pinned on Sturdee Ave: pink-render ends, red-brick middle pair with pointed front gables, grey roofs, low front walls, cordyline
  if (TR) { const M = c => new T.MeshBasicMaterial({ color: c }), put = (g, m, x, y, h) => { const o3 = new T.Mesh(g, m); const w = warp(x, y); o3.position.set(w.x, h, w.z); grp.add(o3); return o3; };
    const H = 5.6, D = TR.depth, fx0 = TR.front, cxh = fx0 - D / 2, grey = M(0x6b6f74);
    for (const [y0, k] of TR.houses) { const cy = y0 + TR.w / 2;
      put(new T.BoxGeometry(D, H, TR.w), M(k === 'r' ? 0x9c3b26 : 0xe6c3bd), cxh, cy, H / 2);
      const rs = new T.Shape([new T.Vector2(-D / 2 - 0.3, 0), new T.Vector2(D / 2 + 0.3, 0), new T.Vector2(0, 2.4)]), rg = new T.ExtrudeGeometry(rs, { depth: TR.w, bevelEnabled: false }); rg.translate(0, 0, -TR.w / 2); put(rg, grey, cxh, cy, H);
      if (k === 'r') { const gs = new T.Shape([new T.Vector2(-TR.w / 2 + 0.2, 0), new T.Vector2(TR.w / 2 - 0.2, 0), new T.Vector2(0, 2.6)]), gg = new T.ExtrudeGeometry(gs, { depth: 2.2, bevelEnabled: false }); gg.rotateY(Math.PI / 2); gg.translate(-2.2, 0, 0); put(gg, M(0x9c3b26), fx0 + 0.01, cy, H).rotation.y = 0;
        put(new T.BoxGeometry(0.15, 0.25, TR.w - 0.2), M(0xffffff), fx0 + 0.05, cy, H + 0.05); }
      for (const [dy, h] of [[-1.3, 1.6], [1.3, 1.6], [-1.3, 4.1], [1.3, 4.1]]) put(new T.BoxGeometry(0.1, 1.1, 1.2), M(0xe8eef4), fx0 + 0.06, cy + dy, h);
      put(new T.BoxGeometry(0.4, 0.9, TR.w), M(0x8a4a33), fx0 + 4.2, cy, 0.45); // low brick front wall
      put(new T.BoxGeometry(0.7, 1.1, 0.7), M(0x2c6a34), fx0 + 4.9, cy + 1.6, 0.55); } // wheelie bin
    const [px, py] = TR.palm; put(new T.CylinderGeometry(0.18, 0.25, 2.4, 6), M(0x6b5130), px, py, 1.2);
    for (let i = 0; i < (LITE ? 8 : 16); i++) { const a = i / (LITE ? 8 : 16) * Math.PI * 2, lf = put(new T.ConeGeometry(0.12, 2.2, 4), M(0x3f8a3a), px + Math.cos(a) * 0.6, py + Math.sin(a) * 0.6, 3.0); lf.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); } }
  for (let k = 0; k < ctv.length; k += 24) { const kk = fv.length / 3; for (const j of [12, 15, 18, 21]) fv.push(ctv[k + j], TH + 0.05, ctv[k + j + 2]); fi.push(kk, kk + 1, kk + 2, kk, kk + 2, kk + 3); } // Chaucer roofs
  for (let k = 0; k < tv.length; k += 24) { const kk = fv.length / 3; for (const j of [12, 15, 18, 21]) fv.push(tv[k + j], TH + 0.05, tv[k + j + 2]); fi.push(kk, kk + 1, kk + 2, kk, kk + 2, kk + 3); } // filler roofs
  if (cwv.length) grp.add(new T.Mesh(geo(cwv, cwi), new T.MeshBasicMaterial({ color: 0xa2432b, side: T.DoubleSide })));
  if (wv.length) grp.add(new T.Mesh(geo(wv, wi), new T.MeshBasicMaterial({ color: 0x7e4630, side: T.DoubleSide })));
  if (fv.length) grp.add(new T.Mesh(geo(fv, fi), new T.MeshBasicMaterial({ color: 0x4e3226, side: T.DoubleSide })));
  if (!LITE && wv.length) grp.add(new T.LineSegments(new T.EdgesGeometry(geo(wv, wi), 30), new T.LineBasicMaterial({ color: 0xc08060, transparent: true, opacity: 0.25 })));
  // ---- Newtown Park ----
  const sh = new T.Shape(park.map(([x, y]) => { const w = warp(x, y); return new T.Vector2(w.x, -w.z); }));
  const pg = new T.ShapeGeometry(sh); pg.rotateX(-Math.PI / 2);
  const pm = new T.Mesh(pg, new T.MeshBasicMaterial({ color: 0x2f7a3a, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })); pm.position.y = 0.08; grp.add(pm);
  for (const f of X.green_extra || []) { const R = P(f); const g2 = new T.ShapeGeometry(new T.Shape(R.map(([x, y]) => { const w = warp(x, y); return new T.Vector2(w.x, -w.z); }))); g2.rotateX(-Math.PI / 2);
    const m2 = new T.Mesh(g2, pm.material); m2.position.y = 0.08; grp.add(m2); } // plain unlabelled grass (recreation ground)
  const pc = park.reduce((s, p) => [s[0] + p[0] / park.length, s[1] + p[1] / park.length], [0, 0]), pw = warp(pc[0], pc[1]);
  { const lv = [], rail = (a, b) => lv.push(a.x, a.y, a.z, b.x, b.y, b.z), W3 = (x, y, h) => { const w = warp(x, y); w.y = h; return w; };
    for (let i = 0; i < park.length; i++) { const a = park[i], b = park[(i + 1) % park.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      rail(W3(a[0], a[1], 1.0), W3(b[0], b[1], 1.0)); rail(W3(a[0], a[1], 0.2), W3(b[0], b[1], 0.2));
      for (let s2 = 0; s2 <= L; s2 += LITE ? 4 : 2) { const t2 = s2 / L, x = a[0] + (b[0] - a[0]) * t2, y = a[1] + (b[1] - a[1]) * t2; rail(W3(x, y, 0), W3(x, y, 1.0)); } }
    grp.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(lv.reduce((o2, v, i) => (i % 3 === 0 && o2.push(new T.Vector3(lv[i], lv[i + 1], lv[i + 2])), o2), [])), new T.LineBasicMaterial({ color: 0xb8c0c8 })));
    const M = c => new T.MeshBasicMaterial({ color: c }), add = (g, m, x, y, h, ry = 0) => { const o3 = new T.Mesh(g, m); const w = warp(x, y); o3.position.set(w.x, h, w.z); o3.rotation.y = ry; grp.add(o3); return o3; };
    // playground (east end) on a dark safety surface
    const ex = Math.max(...park.map(p => p[0])), ny = (Math.min(...park.map(p => p[1])) + Math.max(...park.map(p => p[1]))) / 2;
    add(new T.BoxGeometry(12, 0.06, 16), M(0x2b2f33), ex - 8, ny, 0.12);
    add(new T.BoxGeometry(0.25, 2.4, 0.25), M(0xffb21e), ex - 5, ny + 4, 1.2); add(new T.BoxGeometry(2, 0.2, 2), M(0xffb21e), ex - 5, ny + 4, 2.4); add(new T.BoxGeometry(0.8, 0.1, 4.2), M(0xff7a1e), ex - 5, ny + 1.6, 1.25).rotation.x = 0.55; // slide
    for (const dx of [-1.6, 1.6]) add(new T.BoxGeometry(0.15, 2.6, 0.15), M(0xd8a020), ex - 10 + dx, ny + 4, 1.3); add(new T.BoxGeometry(3.4, 0.15, 0.15), M(0xd8a020), ex - 10, ny + 4, 2.6); // swings
    for (const dx of [-0.6, 0.6]) add(new T.BoxGeometry(0.5, 0.1, 0.4), M(0x222222), ex - 10 + dx, ny + 4, 0.7);
    for (const [dx, dy, c] of [[-8, -3, 0xff4b4b], [-11, -4, 0x4bb3ff], [-6, -5, 0x7dff6a]]) { add(new T.CylinderGeometry(0.08, 0.08, 0.6, 5), M(0x999999), ex + dx, ny + dy, 0.3); add(new T.SphereGeometry(0.45, 8, 6), M(c), ex + dx, ny + dy, 0.85); } // springers
    // footpath + lamp on the south side
    const sy = Math.min(...park.map(p => p[1])) - 2.2, wx = Math.min(...park.map(p => p[0]));
    add(new T.BoxGeometry(ex - wx + 6, 0.05, 2.2), M(0x6a6560), (ex + wx) / 2, sy, 0.1);
    add(new T.CylinderGeometry(0.08, 0.1, 6, 6), M(0x9aa0a6), wx + 10, sy - 1.2, 3); add(new T.SphereGeometry(0.3, 8, 6), new T.MeshBasicMaterial({ color: 0xfff2c0 }), wx + 10, sy - 1.2, 6.1);
    // Newtown Youth & Community Centre: single-storey red brick, pitched tiled roof
    if (X.centre) { const C = P(X.centre.poly), xs2 = C.map(p => p[0]), ys2 = C.map(p => p[1]), x0 = Math.min(...xs2), x1 = Math.max(...xs2), y0 = Math.min(...ys2), y1 = Math.max(...ys2), cxx = (x0 + x1) / 2, cyy = (y0 + y1) / 2;
      add(new T.BoxGeometry(x1 - x0, 3.2, y1 - y0), M(0x9a3f2a), cxx, cyy, 1.6);
      const rs = new T.Shape([new T.Vector2(-(y1 - y0) / 2 - 0.4, 0), new T.Vector2((y1 - y0) / 2 + 0.4, 0), new T.Vector2(0, 2.6)]); const rg = new T.ExtrudeGeometry(rs, { depth: x1 - x0 + 0.8, bevelEnabled: false }); rg.translate(0, 0, -(x1 - x0 + 0.8) / 2);
      add(rg, M(0x5a2e22), cxx, cyy, 3.2, Math.PI / 2);
      for (const dx of [-8, -3, 3, 8]) add(new T.BoxGeometry(1.4, 1.1, 0.1), M(0xdfe8f0), cxx + dx, y1 + 0.05, 1.8);
      const cl = LBL(X.centre.name, '#ffb08a', 1.6); const cw = warp(cxx, cyy); cl.position.set(cw.x, 8, cw.z); S.add(cl); } }
  // v56: The Avenue pub, Beatty Road (OSM node 601501713 amenity=pub, e-192/n2359; OSM has no footprint, so a ~20x11 m block set back from Beatty Rd
  // behind its forecourt car park, Beatty Close behind it). From Joseph's Street View: red-brick ground floor, black-and-white half-timbered upper
  // floor with three steep front gables, dark tiled roof, two tall brick chimneys, single-storey brick wing on the right (south), low brick wall,
  // red/white/blue striped forecourt fencing, bus shelter on the pavement. Solid, shared materials, timbers merged into one mesh.
  { const M = c => new T.MeshBasicMaterial({ color: c }), brick = M(0x9c3b26), white = M(0xf1ede3), tile = M(0x33302f), black = M(0x161616);
    const at = (e, n, y, m, g, ry = 0) => { const ms = new T.Mesh(g, m); const w = warp(e, n); ms.position.set(w.x, y, w.z); ms.rotation.y = ry; grp.add(ms); return ms; };
    const B = (w, h, d) => new T.BoxGeometry(w, h, d); // w along e (world x), d along n (world -z)
    const E0 = -195.5, E1 = -184.5, EC = (E0 + E1) / 2, N0 = 2340, N1 = 2360, NC = 2350, D = E1 - E0, Wn = N1 - N0;
    at(EC, NC, 1.6, brick, B(D, 3.2, Wn));                                   // red-brick ground floor
    at(EC, NC, 4.6, white, B(D, 2.8, Wn));                                   // rendered upper floor
    const tri = (w, h, dep) => { const g = new T.ExtrudeGeometry(new T.Shape([new T.Vector2(-w / 2, 0), new T.Vector2(w / 2, 0), new T.Vector2(0, h)]), { depth: dep, bevelEnabled: false }); g.translate(0, 0, -dep / 2); return g; };
    at(EC, NC, 6.0, tile, tri(D + 0.8, 3.6, Wn + 0.6));                      // main roof (ridge runs along the road)
    const tim = []; const T1 = (w, h, d, e, n, y) => { const g = B(w, h, d); g.translate(warp(e, n).x, y, warp(e, n).z); tim.push(g); };
    for (const y of [3.25, 4.6, 5.95]) T1(0.12, 0.22, Wn + 0.04, E0 - 0.04, NC, y);               // horizontal beams on the front
    for (let n = N0 + 0.3; n <= N1 - 0.2; n += 1.15) T1(0.12, 2.8, 0.2, E0 - 0.04, n, 4.6);        // close studding
    for (const gn of [N0 + 3.4, NC, N1 - 3.4]) { // three steep front gables, half-timbered
      const gg = tri(5.8, 4.2, 2.4); gg.rotateY(Math.PI / 2); at(E0 + 0.9, gn, 6.0, white, gg);
      const rf = tri(6.4, 4.6, 2.6); rf.rotateY(Math.PI / 2); at(E0 + 1.05, gn, 5.95, tile, rf).scale.set(1, 1, 1);
      T1(0.12, 4.0, 0.18, E0 - 0.36, gn, 8.0); T1(0.12, 0.18, 4.6, E0 - 0.36, gn, 7.2);
      for (const s2 of [-1, 1]) { const g = B(0.12, 0.18, 3.2); g.rotateX(s2 * Math.atan2(4.2, 2.9)); const w = warp(E0 - 0.36, gn + s2 * 1.45); g.translate(w.x, 8.0, w.z); tim.push(g); } }
    { const pos = []; for (const g of tim) { const nb = g.toNonIndexed(); pos.push(...nb.attributes.position.array); nb.dispose(); g.dispose(); }
      const tg = new T.BufferGeometry(); tg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); grp.add(new T.Mesh(tg, black)); }
    for (let n = N0 + 1.5; n < N1 - 1; n += 2.6) if (Math.abs(n - NC) > 1.2) at(E0 - 0.05, n, 1.7, M(0xd8e2ea), B(0.1, 1.3, 1.5)); // ground-floor windows
    at(E0 - 0.05, NC, 1.2, black, B(0.12, 2.3, 1.6));                         // door
    for (const n of [N0 + 2, N1 - 2]) at(EC + 2.5, n, 10.2, brick, B(1.1, 4.4, 1.3)); // two tall red-brick chimneys
    at(-189, 2333.5, 1.7, brick, B(9, 3.4, 13)); at(-189, 2333.5, 3.5, tile, B(9.3, 0.25, 13.3)); // single-storey brick wing (right / south)
    at(-204.5, 2350, 0.07, M(0x2f3236), B(17, 0.04, 44));                      // forecourt car park
    at(-213.2, 2337, 0.4, brick, B(0.35, 0.8, 18)); at(-213.2, 2364, 0.4, brick, B(0.35, 0.8, 16)); // low brick wall (entrance gap)
    { const cols = [M(0xc8202c), M(0xf4f4f4), M(0x1f3a93)], seg = new T.BoxGeometry(1, 0.9, 0.08); let k = 0;
      for (const n of [2328, 2372]) for (let e = -212.5; e < -195.5; e += 1, k++) at(e, n, 0.45, cols[k % 3], seg); } // red/white/blue striped fencing
    { const sm = M(0x2b2f33); at(-215.2, 2349, 2.45, sm, B(1.6, 0.12, 4)); for (const dn of [-1.9, 1.9]) at(-215.9, 2349 + dn, 1.2, sm, B(0.1, 2.4, 0.1));
      at(-215.9, 2349, 1.3, new T.MeshBasicMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.35, depthWrite: false }), B(0.05, 2, 3.8)); } // bus shelter on the pavement
    at(-211.5, 2366, 2, black, new T.CylinderGeometry(0.1, 0.1, 4, 6)); at(-211.5, 2366, 4, M(0x5a1e1e), B(0.12, 1.2, 1.8)); // pub sign
    const ps = LBL('THE AVENUE', '#ffd27a', 1.4); const pw2 = warp(-211.5, 2366); ps.position.set(pw2.x, 5.4, pw2.z); S.add(ps); }
  // v57: merged solid detail boxes (one draw call per colour) for Beatty Close + Chaucer Road
  { const MB = new Map(), tri = (w, h, dep) => { const g = new T.ExtrudeGeometry(new T.Shape([new T.Vector2(-w / 2, 0), new T.Vector2(w / 2, 0), new T.Vector2(0, h)]), { depth: dep, bevelEnabled: false }); g.translate(0, 0, -dep / 2); return g; };
    const addG = (hex, g, e, n, y, ry = 0) => { g.rotateY(ry); const w = warp(e, n); g.translate(w.x, y, w.z); (MB.get(hex) || MB.set(hex, []).get(hex)).push(g); };
    const AB = (hex, w, h, d, e, n, y, ry = 0, rx = 0, rz = 0) => { const g = new T.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); addG(hex, g, e, n, y, ry); };
    const BR = 0x8a4a33, CR = 0xe9e2cf, WH = 0xf4f6f8, GR = 0x8c9298, TL = 0x34302e;
    // Beatty Close (behind The Avenue): north side = one long two-storey brown/red-brick block of flats with a cream first-floor access walkway on
    // the road (south) face, metal railings, two outside stairs, chimneys on the ridge, white bargeboards + a street-name sign on the west gable.
    // OSM has no footprints here (see newtown-extra.json); it replaces the two approximate blocks. South side = single-storey brick bungalows.
    // No numbers, names or addresses on any of it.
    { const x0 = -162, x1 = -104, L = x1 - x0, xc = (x0 + x1) / 2, nf = 2366, D = 9, nc = nf + D / 2, H = 5.8;
      AB(BR, L, H, D, xc, nc, H / 2);
      addG(TL, tri(D + 0.6, 3.2, L + 0.6), xc, nc, H, Math.PI / 2);
      const sl = Math.hypot(D / 2 + 0.3, 3.2), ang = Math.atan2(3.2, D / 2 + 0.3);
      for (const s2 of [-1, 1]) AB(WH, 0.18, 0.3, sl, x0 - 0.35, nc + s2 * (D / 2 + 0.3) / 2, H + 1.6, 0, -s2 * ang); // white bargeboards (west gable)
      for (let x = x0 + 4; x < x1 - 2; x += 9.5) AB(0x8f5a40, 0.9, 1.6, 0.9, x, nc, H + 3.2);                    // chimneys along the ridge
      for (let x = x0 + 2.4; x < x1 - 1; x += 4.8) for (const y of [1.5, 4.3]) AB(WH, 1.3, 1.2, 0.1, x, nf - 0.06, y); // white windows (road face)
      for (const y of [1.5, 4.3]) AB(WH, 0.1, 1.1, 1.7, x0 - 0.06, nc + 1.2, y);                                 // gable windows
      AB(CR, L, 0.25, 1.7, xc, nf - 0.85, 2.9); AB(CR, L, 0.9, 0.14, xc, nf - 1.7, 3.45);                         // access walkway + cream parapet
      AB(GR, L, 0.06, 0.06, xc, nf - 1.7, 4.15); for (let x = x0; x <= x1; x += 2) AB(GR, 0.05, 0.3, 0.05, x, nf - 1.7, 4.0); // metal railing
      for (let x = x0 + 1; x <= x1; x += 6.4) AB(CR, 0.25, 2.8, 0.25, x, nf - 1.55, 1.4);                         // walkway posts
      for (const sx of [x0 + 5, x1 - 9]) { AB(CR, 1.6, 0.25, 1.6, sx - 0.8, nf - 2.6, 2.9); AB(GR, Math.hypot(4, 2.9), 0.18, 1.1, sx + 2, nf - 2.6, 1.45, 0, 0, Math.atan2(2.9, 4)); AB(CR, 0.2, 1.1, 1.6, sx - 1.6, nf - 2.6, 2.4); } // outside stairs
      AB(0x1f5c3a, 0.08, 0.42, 2.0, x0 - 0.08, nc - 1.5, 2.9); AB(WH, 0.06, 0.32, 1.9, x0 - 0.11, nc - 1.5, 2.9); // 'BEATTY CLOSE' street-name sign on the gable
      const bs = LBL('BEATTY CLOSE', '#1f5c3a', 0.5); const bw = warp(x0 - 0.4, nc - 1.5); bs.position.set(bw.x, 3.5, bw.z); S.add(bs);
      for (const bx of [-158, -145, -121, -108, -95]) { const n0 = 2331; AB(0x9a5a3e, 10, 2.8, 8, bx, n0, 1.4); addG(TL, tri(8.6, 2.2, 10.4), bx, n0, 2.8, Math.PI / 2);
        AB(WH, 1.4, 1.1, 0.1, bx - 2.5, n0 + 4.05, 1.5); AB(WH, 1.4, 1.1, 0.1, bx + 2.5, n0 + 4.05, 1.5); AB(0x3b4a5a, 0.95, 2, 0.1, bx, n0 + 4.05, 1.0); } } // bungalows
    // Chaucer Road (Joseph's Street View at the south end): red-brick semis with small grey porch canopies, low red-brick front walls with grey
    // metal railings, a green 'CHAUCER ROAD' sign on a front wall, and a footpath leading back between the houses.
    chq.forEach(([c, t, nn], idx) => { const ry = Math.atan2(t[1], t[0]), at = (u, v) => [c[0] + t[0] * u + nn[0] * v, c[1] + t[1] * u + nn[1] * v];
      const fw = at(0, -2.6); AB(0x9a3f2a, LEN - 1.2, 0.8, 0.3, fw[0], fw[1], 0.4, ry); AB(GR, LEN - 1.2, 0.05, 0.05, fw[0], fw[1], 1.25, ry);
      for (let u = -LEN / 2 + 0.6; u <= LEN / 2 - 0.6; u += 1.2) { const q = at(u, -2.6); AB(GR, 0.05, 0.45, 0.05, q[0], q[1], 1.02, ry); }
      for (const u of [-LEN / 4, LEN / 4]) { const p1 = at(u, -0.55), d1 = at(u, -0.03); AB(0x5b6066, 1.9, 0.12, 1.1, p1[0], p1[1], 2.55, ry); AB(u < 0 ? 0xc0303a : WH, 0.95, 2.0, 0.08, d1[0], d1[1], 1.0, ry);
        for (const du of [-1.9, 1.9]) for (const y of [1.5, 4.4]) { const w1 = at(u + du * (u < 0 ? -1 : 1) * 0 + du, -0.03); AB(WH, 1.5, 1.1, 0.08, w1[0], w1[1], y, ry); } }
      if (idx === 0) { const sg = at(LEN / 4, -2.8); AB(0x1f6b3c, 2.4, 0.4, 0.06, sg[0], sg[1], 0.5, ry); const sw = warp(sg[0], sg[1]); const sl = LBL('CHAUCER ROAD', '#e8fff0', 0.45); sl.position.set(sw.x, 1.3, sw.z); S.add(sl);
        const ap = at(-LEN / 2 - 1.4, DEP / 2 - 1); AB(0x6a6560, 1.8, 0.05, DEP + 6, ap[0], ap[1], 0.09, ry); // footpath back between the houses
        for (const du of [-1, 1]) { const fp = at(-LEN / 2 - 1.4 + du * 1.0, DEP / 2); AB(0x6b4a32, 0.08, 1.6, DEP + 2, fp[0], fp[1], 0.8, ry); } } }); // fences
    for (const [hex, list] of MB) { const pos = []; for (const g of list) { const nb = g.index ? g.toNonIndexed() : g; pos.push(...nb.attributes.position.array); nb.dispose(); g.dispose(); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); grp.add(new T.Mesh(g, new T.MeshBasicMaterial({ color: hex, side: T.DoubleSide }))); } }
  const pl = LBL('NEWTOWN PARK', '#8dffa0', 2.4); pl.position.set(pw.x, 5, pw.z); S.add(pl);
  grp.traverse(m => { m.raycast = () => {}; });
  return window.__streets = { roads: roads.length, terraces: terr, park: [pw.x, pw.z] };
}
