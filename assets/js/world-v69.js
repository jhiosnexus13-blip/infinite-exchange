/* v69 geography pass (status: built, needs preview walk to verify):
   1. Town-wide road ribbons + raised pavements + kerb lines + centre markings for every OSM road in yarmouth-geo.json (was lines only).
   2. Solid weathered skins over the OSM footprints (brick / render / seafront pastel, windows, doors, grime, dark roofs) via one
      world-space facade shader, so no geometry UVs are needed; the same shader re-skins the Newtown terrace fillers (windows + doors).
   3. Parked cars along residential streets (instanced), kept off junctions and landmark approaches.
   4. Spawn plaza paving, kerb ring, benches, bins, lamps, globe plinth.
   5. Britannia + Wellington piers: solid decks from the real OSM pier polygons, piles, rails, Britannia theatre pavilion; walkable via __groundParts.
   6. Nelson's Monument + Minster solid stand-ins (swap-ready).
   7. Bottom of Beatty Road from Joseph's 26 Oct photos (data hook: assets/data/beatty-bottom.json): bus stop opp Seymour Avenue,
      Madden Avenue sign + curved brick garden walls + berry bushes, cream -> pale-blue terrace palette, parked cars, yellow/white markings,
      distant water tower + mast silhouettes.
   8. North Drive road-train stop: real shelter + platform + bench + name board.
   9. More quick jumps (Market Gates, cemetery, lodge, beach campfire, Seashore, Fallen Angels, Jellicoe, Newtown Park, Beatty Close, Youth Centre)
      and safer landings for Britannia Pier / Tower Complex / Newtown Archive.
   No house numbers, no addresses, nothing labelled as anyone's home. © OpenStreetMap contributors (ODbL) for all geometry. */
export function initV69({ T, S, LBL, LITE, warp, fx, G: G0 }) {
  const G = G0 || {};
  const info = { roads: 0, pavements: 0, skins: 0, cars: 0, jumps: 0, piers: 0 };
  const grp = new T.Group(); grp.name = 'v69'; S.add(grp);
  const ORG = (G && G.origin) || { lat: 52.6035, lon: 1.7365 };
  const loc = (lat, lon) => [(lon - ORG.lon) * Math.cos(ORG.lat * Math.PI / 180) * 111320, (lat - ORG.lat) * 110540];
  const P2 = f => { const r = []; for (let i = 0; i < f.length; i += 2) r.push([f[i], f[i + 1]]); return r; };
  let seed = 69; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const geo = (v, i, c) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); if (c) g.setAttribute('color', new T.Float32BufferAttribute(c, 3)); g.setIndex(i); g.computeBoundingSphere(); return g; };
  const C = new T.Color();
  // ---------- merged box/cylinder helper (per colour) ----------
  const MB = new Map(); const put = (col, g) => { (MB.get(col) || MB.set(col, []).get(col)).push(g); };
  const AB = (col, w, h, d, e, n, y, ry = 0) => { const g = new T.BoxGeometry(w, h, d); g.rotateY(ry); const p = warp(e, n); g.translate(p.x, y, p.z); put(col, g); };
  const CY = (col, r0, r1, h, e, n, y, seg = 10) => { const g = new T.CylinderGeometry(r0, r1, h, seg); const p = warp(e, n); g.translate(p.x, y, p.z); put(col, g); };
  const flushMB = () => { for (const [col, gs] of MB) { const ng = gs.map(g => (g.index ? g.toNonIndexed() : g)); const tot = ng.reduce((a, g) => a + g.attributes.position.count, 0); if (!tot) continue;
      const pos = new Float32Array(tot * 3), idx = []; let o = 0; for (const gi of ng) { pos.set(gi.attributes.position.array, o * 3); for (let i = 0; i < gi.attributes.position.count; i++) idx.push(o + i); o += gi.attributes.position.count; }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.computeVertexNormals(); g.computeBoundingSphere();
      grp.add(new T.Mesh(g, new T.MeshBasicMaterial({ color: col }))); } MB.clear(); };
  const board = (text, w, h, e, n, y, ry, bg = '#0d3b66', fg = '#ffffff', fs = 0.62) => { const c = document.createElement('canvas'); c.width = 512; c.height = Math.max(64, Math.round(512 * h / w)); const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; const lines = String(text).split('\n');
    const px = Math.floor(c.height * fs / lines.length); g.font = `bold ${px}px Arial, sans-serif`; lines.forEach((l, i) => { let s = px; while (g.measureText(l).width > c.width * 0.92 && s > 8) { s--; g.font = `bold ${s}px Arial, sans-serif`; } g.fillText(l, c.width / 2, c.height * (i + 0.5) / lines.length); g.font = `bold ${px}px Arial, sans-serif`; });
    const tx = new T.CanvasTexture(c); const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tx, side: T.DoubleSide })); const p = warp(e, n); m.position.set(p.x, y, p.z); m.rotation.y = ry; grp.add(m); return m; };

  // ---------- facade shader: world-space windows/doors/grime, flat roofs darker; vertex colours carry the palette ----------
  const facade = (opts = {}) => { const m = new T.MeshBasicMaterial({ color: opts.color ?? 0xffffff, vertexColors: !!opts.vc, side: T.DoubleSide });
    m.onBeforeCompile = sh => { sh.vertexShader = 'varying vec3 vW69;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vW69 = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'varying vec3 vW69;\nfloat h69(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        { vec3 nn = normalize(cross(dFdx(vW69), dFdy(vW69))); vec3 base = diffuseColor.rgb;
          if (abs(nn.y) > 0.6) { diffuseColor.rgb = base * 0.42 + vec3(0.03); }
          else { vec2 t = normalize(vec2(-nn.z, nn.x)); float s = dot(vW69.xz, t); float y = vW69.y;
            float fl = floor(y / 3.0), fy = fract(y / 3.0), cx = floor(s / 3.4), fs = fract(s / 3.4); float rnd = h69(vec2(cx, fl) + floor(vW69.xz / 40.0));
            float shade = 0.78 + 0.22 * abs(nn.x); vec3 col = base * shade;
            col *= 0.96 + 0.04 * h69(floor(vW69.xz * 0.25) + fl);                 // weathered patches
            col *= mix(0.62, 1.0, smoothstep(0.0, 1.6, y));                        // grime at street level
            bool win = fy > 0.36 && fy < 0.82 && fs > 0.22 && fs < 0.72 && y > 0.4;
            bool door = fl < 0.5 && fy < 0.7 && fs > 0.38 && fs < 0.62 && rnd > 0.72;
            if (door) col = mix(vec3(0.42, 0.08, 0.07), vec3(0.12, 0.16, 0.22), step(0.86, rnd));
            else if (win) { col = vec3(0.07, 0.09, 0.11) + vec3(0.05) * fs; if (rnd < 0.08) col = vec3(0.6, 0.45, 0.24); if (fy < 0.4 || fy > 0.78 || fs < 0.26 || fs > 0.68) col = mix(base * shade, vec3(0.8, 0.79, 0.75), 0.35); }
            float aa = clamp(1.6 - max(fwidth(s), fwidth(y)) * 5.0, 0.0, 1.0); diffuseColor.rgb = mix(base * shade * 0.82, col, aa); } }`); };
    m.customProgramCacheKey = () => 'facade69' + (opts.vc ? 'v' : 'c'); return m; };
  fx.facade69 = facade;

  // ---------- 1. road ribbons + pavements ----------
  const NT = [-330, 2060, 240, 2760]; // Newtown pack already draws its own ribbons there
  const inNT = (e, n) => e > NT[0] && e < NT[2] && n > NT[1] && n < NT[3];
  const roadW = [5.2, 6.2, 7.4, 9.0];
  const rv = [], ri = [], pv = [], pi = [], mk = [], segs = [];
  const quad = (V, I, a, b, c, d, y) => { const k = V.length / 3; for (const q of [a, b, c, d]) V.push(q.x, y, q.z); I.push(k, k + 1, k + 2, k, k + 2, k + 3); };
  const roads = ((G && G.roads) || []).filter(r => r && r[1] && r[1].length >= 4);
  for (const [ty, f] of roads) { const L = P2(f), hw = (roadW[ty] || 5.2) / 2; let any = false;
    for (let i = 0; i < L.length - 1; i++) { const a = L[i], b = L[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy); if (len < 0.5) continue;
      if (inNT(a[0], a[1]) && inNT(b[0], b[1])) continue; if (Math.hypot(a[0], a[1]) > 4500) continue;
      const n = [-dy / len, dx / len], off = (p, s) => warp(p[0] + n[0] * s, p[1] + n[1] * s); any = true;
      quad(rv, ri, off(a, hw), off(b, hw), off(b, -hw), off(a, -hw), 0.045);
      if (!LITE || ty <= 1) for (const sd of [1, -1]) { quad(pv, pi, off(a, sd * hw), off(b, sd * hw), off(b, sd * (hw + 2.0)), off(a, sd * (hw + 2.0)), 0.13); info.pavements++;
        mk.push(off(a, sd * hw).setY(0.15), off(b, sd * hw).setY(0.15)); }
      if (ty >= 2 && !LITE) for (let s = 1; s < len - 2; s += 6) { const p = [a[0] + dx / len * s, a[1] + dy / len * s], q = [a[0] + dx / len * (s + 2.5), a[1] + dy / len * (s + 2.5)]; mk.push(warp(p[0], p[1]).setY(0.07), warp(q[0], q[1]).setY(0.07)); }
      segs.push([a, b, hw, ty, len]); }
    if (any) info.roads++; }
  const roadMat = new T.MeshBasicMaterial({ color: 0x33373c, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  if (rv.length) grp.add(new T.Mesh(geo(rv, ri), roadMat));
  if (pv.length) grp.add(new T.Mesh(geo(pv, pi), new T.MeshBasicMaterial({ color: 0x77736c, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
  if (mk.length) grp.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(mk), new T.LineBasicMaterial({ color: 0xc9c6bd, transparent: true, opacity: 0.6 })));

  // ---------- 2. solid weathered skins over OSM footprints ----------
  const seaE = n => { let best = 1e9, e = 200; for (const c of (G && G.coast) || []) for (let i = 0; i < c.length; i += 2) { const d = Math.abs(c[i + 1] - n); if (d < best) { best = d; e = c[i]; } } return e; };
  const PAL_BRICK = [0x8a4a34, 0x7a3f2e, 0x5f3a2c, 0x9b5a3c, 0x6e4a3a], PAL_RENDER = [0xe6dcc4, 0xd8d2c4, 0xc9cfd2, 0xa9c3d4, 0xe9dfc4, 0xb7b0a2], PAL_SEA = [0xf1ece0, 0xe8d9b5, 0xcfe3e8, 0xf0c9b8, 0xdfe7d0, 0xe6e6e6];
  const zone = (e, n) => { const se = seaE(n); if (e > se - 160) return 'sea'; if (e > -820 && e < 40 && n > -650 && n < 760) return 'town'; return 'res'; };
  const PZ = window.__PLAZA || [0, 0]; const holes = [[PZ[0], -PZ[1], 62], ...((G && G.keep) || [])];
  const skinTiles = new Map(); const tileOf = (e, n) => { const k = Math.floor(e / 400) + ':' + Math.floor(n / 400); let t = skinTiles.get(k); if (!t) skinTiles.set(k, t = { v: [], i: [], c: [] }); return t; };
  const skinMat = facade({ vc: true });
  const skin = (pts, h, col) => { const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length, t = tileOf(cx, cy);
    const Q = pts.map(p => warp(cx + (p[0] - cx) * 1.025, cy + (p[1] - cy) * 1.025)), N = Q.length; C.setHex(col); const k0 = t.v.length / 3;
    for (let i = 0; i < N; i++) { const a = Q[i], b = Q[(i + 1) % N], k = t.v.length / 3; t.v.push(a.x, 0, a.z, b.x, 0, b.z, b.x, h, b.z, a.x, h, a.z); for (let j = 0; j < 4; j++) t.c.push(C.r, C.g, C.b); t.i.push(k, k + 1, k + 2, k, k + 2, k + 3); }
    let tri; try { tri = T.ShapeUtils.triangulateShape(Q.map(q => new T.Vector2(q.x, q.z)), []); } catch { tri = []; } const k = t.v.length / 3; for (const q of Q) { t.v.push(q.x, h + 0.02, q.z); t.c.push(C.r, C.g, C.b); } for (const q of tri) t.i.push(k + q[0], k + q[1], k + q[2]);
    if (t.v.length > 180000) flushTile(t); info.skins++; };
  const flushTile = t => { if (!t.v.length) return; const g = geo(t.v, t.i, t.c); grp.add(new T.Mesh(g, skinMat)); t.v = []; t.i = []; t.c = []; };
  const inPoly = (p, e, n) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > n) !== (yj > n) && e < (xj - xi) * (n - yi) / (yj - yi) + xi) c = !c; } return c; };
  const B = (G && G.buildings) || []; let bi = 0;
  const one = (h0, f) => { if (f[1] === 2365 && (f[0] === -160 || f[0] === -128)) return; const pts = P2(f); if (pts.length < 3) return;
    let A = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; A += p[0] * q[1] - q[0] * p[1]; } A = Math.abs(A / 2); if (A < (LITE ? 60 : 25)) return;
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    if (holes.some(([e, n, r]) => Math.hypot(cx - e, cy - n) < r)) return; if (G.keepPts && G.keepPts.some(([e, n]) => inPoly(pts, e, n))) return;
    if (Math.hypot(cx, cy) > 4300) return; const z = zone(cx, cy);
    const h = (h0 || (A > 900 ? 9 : 6)) + 0.12; const pal = z === 'sea' ? PAL_SEA : z === 'town' ? (R() < 0.55 ? PAL_BRICK : PAL_RENDER) : (R() < 0.7 ? PAL_BRICK : PAL_RENDER);
    skin(pts, h, beattyCol(cx, cy) ?? pal[Math.floor(R() * pal.length)]); };
  // once the solid skins cover the footprints, hide the old translucent green slab fills (neon roof edges stay as the digital layer)
  const hideSlabs = () => { const city = S.getObjectByName('osm-buildings'); if (!city || !(fx.geo && fx.geo.done)) return setTimeout(hideSlabs, 1000); let n = 0;
    const hid = new T.MeshBasicMaterial({ visible: false }); city.traverse(o => { if (o.isMesh) { o.material = hid; n++; } else if (o.isLineSegments && o.material) { o.material.opacity = 0.35; } }); info.slabsHidden = n; };
  const step = () => { try { const end = Math.min(B.length, bi + (LITE ? 500 : 1200)); for (; bi < end; bi++) one(B[bi][0], B[bi][1]); if (bi < B.length) return setTimeout(step, 0); for (const t of skinTiles.values()) flushTile(t); info.skinsDone = true; hideSlabs(); } catch (e) { console.warn('v69 skins', e); } };
  let BD = null; const beattyCol = (e, n) => { if (!BD || e < -262 || e > -185 || n < 2500 || n > 2660) return null; const L = e > -222.5 ? BD.terraceEast : BD.terraceWest; const t = (L || []).find(t => n >= t.n0 && n < t.n1); return t ? new T.Color(t.col).getHex() : null; };
  fetch('/assets/data/beatty-bottom.json?v=80').then(r => r.json()).then(d => { BD = d; }).catch(() => {}).finally(() => setTimeout(step, 50));
  // Newtown fillers + Chaucer/Sturdee shells: swap their flat colours for the facade shader (keeps their colour, adds windows/doors/grime)
  const reskinNT = (tries = 0) => { const ng = S.getObjectByName('newtown-streets'); if (!ng) return tries < 30 && setTimeout(() => reskinNT(tries + 1), 1000); let sw = 0; ng.traverse(o => { if (!o.isMesh || !o.material || !o.material.color) return; const hx = o.material.color.getHex();
      if ([0x8a4e34, 0xa2432b, 0xece4cf, 0xc9d6bf].includes(hx)) { o.material = facade({ color: hx }); sw++; } }); info.newtownReskinned = sw; }; setTimeout(reskinNT, 1500);

  // ---------- 3. parked cars (instanced) ----------
  const lmk = Object.values(fx.landmarks || {}).map(l => [l.pos.x, l.pos.z]);
  const cars = []; const CARCOL = [0x1b1f24, 0xd9dcdf, 0x7d8288, 0x2c3e5c, 0x8c1d1d, 0x3f5d3a, 0xb9b39f, 0x101012];
  const MAXC = LITE ? 260 : 1400;
  for (const [a, b, hw, ty, len] of segs) { if (ty > 1 || len < 24 || cars.length >= MAXC) continue; const dx = (b[0] - a[0]) / len, dy = (b[1] - a[1]) / len, n = [-dy, dx];
    for (let s = 10; s < len - 10; s += 5.6) for (const sd of [1, -1]) { if (R() > 0.32 || cars.length >= MAXC) continue; const e = a[0] + dx * s + n[0] * sd * (hw - 1.1), nn = a[1] + dy * s + n[1] * sd * (hw - 1.1);
      if (holes.some(([he, hn, r]) => Math.hypot(e - he, nn - hn) < r + 6)) continue; const w = warp(e, nn); if (lmk.some(([x, z]) => Math.hypot(w.x - x, w.z - z) < 18)) continue;
      cars.push([w, Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])) , CARCOL[Math.floor(R() * CARCOL.length)]]); } }
  const addCars = list => { if (!list.length) return; const bodyG = new T.BoxGeometry(1.8, 1.0, 4.2); bodyG.translate(0, 0.65, 0); const cabG = new T.BoxGeometry(1.62, 0.62, 2.2); cabG.translate(0, 1.45, -0.2);
    const bm = new T.InstancedMesh(bodyG, new T.MeshBasicMaterial({ color: 0xffffff }), list.length), cm = new T.InstancedMesh(cabG, new T.MeshBasicMaterial({ color: 0x15191e }), list.length); const M = new T.Matrix4(), Qt = new T.Quaternion(), Y = new T.Vector3(0, 1, 0), One = new T.Vector3(1, 1, 1);
    list.forEach(([w, ry, col], i) => { Qt.setFromAxisAngle(Y, ry); M.compose(w, Qt, One); bm.setMatrixAt(i, M); cm.setMatrixAt(i, M); bm.setColorAt(i, C.setHex(col)); }); grp.add(bm, cm); info.cars += list.length; };
  addCars(cars);

  // ---------- 4. spawn plaza: paving, kerb, furniture, globe plinth ----------
  { const [px, pz] = PZ; const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#7d7a73'; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = 110 + Math.floor(Math.random() * 30); g.fillStyle = `rgb(${v},${v - 3},${v - 8})`; g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30); }
    const tx = new T.CanvasTexture(c); tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.repeat.set(30, 30);
    const pave = new T.Mesh(new T.CircleGeometry(60, 64), new T.MeshBasicMaterial({ map: tx, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); pave.rotation.x = -Math.PI / 2; pave.position.set(px, 0.08, pz); grp.add(pave);
    const kerb = new T.Mesh(new T.TorusGeometry(60, 0.25, 4, 96), new T.MeshBasicMaterial({ color: 0xa9a59b })); kerb.rotation.x = -Math.PI / 2; kerb.position.set(px, 0.12, pz); grp.add(kerb);
    const inner = new T.Mesh(new T.RingGeometry(9, 10.2, 48), new T.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.35, side: T.DoubleSide })); inner.rotation.x = -Math.PI / 2; inner.position.set(px, 0.11, pz); grp.add(inner);
    const GB = window.__globe; if (GB && GB.globe) { const gp = GB.globe.getWorldPosition(new T.Vector3()); const pl = new T.Mesh(new T.CylinderGeometry(2.6, 3.2, 1.0, 24), new T.MeshBasicMaterial({ color: 0x3a3f46 })); pl.position.set(gp.x, 0.5, gp.z); grp.add(pl);
      const ring = new T.Mesh(new T.CylinderGeometry(2.7, 2.7, 0.08, 24), new T.MeshBasicMaterial({ color: 0x00ff9d })); ring.position.set(gp.x, 1.02, gp.z); grp.add(ring); }
    const at = (a, r) => [px + Math.cos(a) * r, pz + Math.sin(a) * r];
    const furn = new Map(); const fb = (col, w, h, d, x, y, z, ry) => { const g2 = new T.BoxGeometry(w, h, d); g2.rotateY(ry); g2.translate(x, y, z); (furn.get(col) || furn.set(col, []).get(col)).push(g2); };
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.13, [x, z] = at(a, 46); fb(0x5a4030, 2.4, 0.12, 0.7, x, 0.55, z, -a); fb(0x2b2f35, 0.12, 0.5, 0.6, x, 0.27, z, -a); fb(0x5a4030, 2.4, 0.5, 0.1, x + Math.cos(a) * 0.35, 0.85, z + Math.sin(a) * 0.35, -a); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.4, [x, z] = at(a, 50); fb(0x1f2a24, 0.6, 1.0, 0.6, x, 0.5, z, 0); }
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.8, [x, z] = at(a, 38); fb(0x6b665d, 3, 0.7, 3, x, 0.35, z, a); fb(0x2f4a2a, 2.6, 0.6, 2.6, x, 0.9, z, a); }
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, [x, z] = at(a, 56); fb(0x2b2f35, 0.18, 5.5, 0.18, x, 2.75, z, 0); fb(0xffcf7a, 0.5, 0.25, 0.5, x, 5.5, z, 0); }
    for (const [col, gs] of furn) for (const g2 of gs) grp.add(new T.Mesh(g2, new T.MeshBasicMaterial({ color: col }))); }

  { const hp = new T.Mesh(new T.CircleGeometry(4.6, 40), new T.MeshBasicMaterial({ color: 0x1b1f24 })); hp.rotation.x = -Math.PI / 2; hp.position.set(156, 0.1, -288); grp.add(hp); // THE STACK hatch: dark steel plate + glow ring (Systems Scout coords)
    const hr = new T.Mesh(new T.RingGeometry(4.6, 6.2, 48), new T.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.95, side: T.DoubleSide, toneMapped: false })); hr.rotation.x = -Math.PI / 2; hr.position.set(156, 0.12, -288); grp.add(hr);
    const hb = new T.Mesh(new T.CylinderGeometry(1.2, 4.6, 40, 24, 1, true), new T.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.18, depthWrite: false, side: T.DoubleSide, toneMapped: false })); hb.position.set(156, 20, -288); grp.add(hb);
    const hc = new T.Mesh(new T.CylinderGeometry(0.35, 0.35, 70, 12, 1, true), new T.MeshBasicMaterial({ color: 0x9dffd8, transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false })); hc.position.set(156, 35, -288); grp.add(hc); } // v70: bigger plate/ring + tall light column so scouts spot the hatch
  { const [e, n] = loc(52.604471, 1.736196); AB(0xe7dcc6, 20, 36, 26, e - 4, n, 18); AB(0x4b4f55, 21, 0.8, 27, e - 4, n, 36.4); for (let y = 4; y < 35; y += 3.2) AB(0x2a2f38, 0.3, 1.6, 22, e + 6.1, n, y);  // v74 observation top (Tower ADJUST 05 drone + 06 360 aerial): octagonal glazed drum, blue mullions, red bracket lights, wide flat cap, silver seamed octagon roof + thin spire, east-slope hatch
    const te = e - 4; CY(0xe7dcc6, 7, 7, 2.4, te, n, 37.6, 8); { const gm = (geo, col, y, op = 1) => { const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: col, fog: false, toneMapped: false, transparent: op < 1, opacity: op })); const w = warp(te, n); m.position.set(w.x, y, w.z); m.rotation.y = Math.PI / 8; grp.add(m); return m; }; // v75: unfogged so the octagon top reads at night from the prom
      gm(new T.CylinderGeometry(10, 10, 8, 8), 0x9fd0ff, 42.5); for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2, m = gm(new T.BoxGeometry(0.7, 8.2, 0.7), 0x14306a, 42.5); const w = warp(te + Math.cos(an) * 10.2, n + Math.sin(an) * 10.2); m.position.set(w.x, 42.5, w.z); } // v76: taller, wider octagon glazed drum with dark corner mullions
      gm(new T.CylinderGeometry(10.3, 10.3, 0.7, 8), 0x14306a, 38.6); gm(new T.CylinderGeometry(13, 13, 1, 8), 0xf4f2ec, 47); gm(new T.CylinderGeometry(1.6, 12, 4.4, 8), 0xd8dce2, 49.7); gm(new T.CylinderGeometry(0.12, 0.7, 24, 8), 0xf0f2f5, 63.9); gm(new T.SphereGeometry(0.7, 8, 6), 0xff2020, 76);
      { let k = 0; const up = () => { const f = fx.feature; if (f && f.grp && f.key === 'tower_complex') { f.grp.position.y += 34; if (f.y0 != null) f.y0 += 34; return; } if (++k < 30) setTimeout(up, 700); }; setTimeout(up, 600); } /* VIPER feature screen lifted clear of the drum */ } for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; AB(0x1d4fa8, 0.6, 5.5, 0.6, te + Math.cos(a) * 8.7, n + Math.sin(a) * 8.7, 41.5, -a); CY(0xff2a2a, 0.4, 0.4, 0.4, te + Math.cos(a) * 7.6, n + Math.sin(a) * 7.6, 38.6, 6); } // v75: bigger, light-blue glazed octagon band so it reads from the prom
    CY(0xf4f2ec, 11, 11, 0.8, te, n, 44.6, 8); CY(0xd8dce2, 1.4, 10.4, 3.6, te, n, 46.8, 8); CY(0xe6e9ee, 0.08, 0.6, 22, te, n, 59.6, 8); AB(0x8d9196, 1.4, 0.6, 1.4, te + 5, n, 46.2); } // v70: solid Tower slab to the full landmark height so the cyan wire never reads as the building
  { // v73 Harbour Mouth (gy-real-refs/harbour-mouth-REAL-WORLD-ADJUST.md P1-P7): two concrete pier arms west of the real pier-head light lat/lons, deck top Y=2.6 m (well above the river/teal),
    // 10 m wide, round South Pier head, rock armour on the seaward (south) side, coping, black bollards every 15 m, tubular rails, orange lifebuoys, red South Pier light tower, North Pier light.
    const DY = 2.6, W = 10, LEN = 130, hm = { decks: [] };
    const wet = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: 0x3d5148, polygonOffset: true, polygonOffsetFactor: -2 })); // grey-green water demotes the teal to a glow under the piers
    for (const [lat, lon, dir, nm] of [[52.5730187, 1.7396790, 1, 'north'], [52.5721123, 1.7381010, -1, 'south']]) { const [e, n] = loc(lat, lon); const c = n + dir * 2, ch = c - dir * (W / 2 - 0.6), out = c + dir * (W / 2 - 0.4); // ch = channel edge, out = outer edge
      AB(0x8f8c84, LEN, DY + 1.2, W, e - LEN / 2, c, (DY - 1.2) / 2); AB(0xa9a69e, LEN, 0.35, 0.9, e - LEN / 2, ch, DY + 0.17); // deck slab + bright coping kerb on the channel edge
      for (let i = 0; i < 9; i++) AB(0x6f6c66, 6 + (i % 3) * 3, 0.03, 3 + (i % 2) * 2, e - 10 - i * 13, c + (i % 2 ? 1.5 : -1.5), DY + 0.02); // darker wet patches / puddles
      for (let i = 0; i * 15 < LEN - 5; i++) { CY(0x15171a, 0.3, 0.38, 0.75, e - 6 - i * 15, ch + dir * 0.9, DY + 0.38, 8); CY(0x15171a, 0.42, 0.42, 0.12, e - 6 - i * 15, ch + dir * 0.9, DY + 0.8, 8); } // black cast-iron bollards
      for (let x = 0; x < LEN; x += 3) AB(0xd9dcde, 0.08, 1.05, 0.08, e - x, out, DY + 0.52); AB(0xd9dcde, LEN, 0.08, 0.08, e - LEN / 2, out, DY + 1.05); AB(0xd9dcde, LEN, 0.07, 0.07, e - LEN / 2, out, DY + 0.55); // tubular rail (outer edge)
      if (nm === 'south') { CY(0x8f8c84, 7, 7.4, DY + 1.2, e, c, (DY - 1.2) / 2, 32); CY(0xa9a69e, 7.1, 7.1, 0.35, e, c, DY + 0.17, 32); // round pier head
        for (let i = 0; i < 22; i++) { const r = 1.2 + (i * 37 % 10) / 10; AB(0x6e6f6c, r * 2, r * 1.4, r * 1.8, e - 4 - i * 6, c - W / 2 - 1.8 - (i % 2), 0.6, i * 0.7); } // grey rock armour (seaward)
        CY(0xc22a2a, 1.3, 1.6, 9, e + 2, c + 1, DY + 4.5, 12); CY(0x2b2f35, 1.6, 1.6, 0.4, e + 2, c + 1, DY + 9.2, 12); CY(0xffe2a0, 0.9, 0.9, 1.4, e + 2, c + 1, DY + 10.1, 12); CY(0xc22a2a, 0, 1.3, 1.2, e + 2, c + 1, DY + 11.4, 12); // red light tower + lantern
        for (const k of [0, 1]) { const x = e - 18 - k * 34; AB(0x9aa0a6, 0.12, 1.6, 0.12, x, out - dir * 0.4, DY + 0.8); const lb = new T.Mesh(new T.TorusGeometry(0.4, 0.12, 6, 16), new T.MeshBasicMaterial({ color: 0xff7a1a })); const w = warp(x, out - dir * 0.55); lb.position.set(w.x, DY + 1.3, w.z); grp.add(lb); } // orange lifebuoys on posts
        AB(0x2e2a26, 4, 2.6, 3.4, e - 60, out - dir * 3, DY + 2.4); for (const dx of [-1.6, 1.6]) AB(0x3a3029, 0.3, 1.2, 0.3, e - 60 + dx, out - dir * 3, DY + 0.6); } // coastguard lookout box on timber stilts
      else { CY(0x8f8c84, 5, 5.4, DY + 1.2, e, c, (DY - 1.2) / 2, 24); CY(0xeeeeea, 1.1, 1.4, 7, e, c, DY + 3.5, 12); CY(0x2fa05a, 1.2, 1.2, 1.2, e, c, DY + 7.6, 12); } // North Pier head + light
      const a = warp(e - LEN, c - W / 2), b = warp(e + 1, c + W / 2), hw = warp(e, c); hm.decks.push({ x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z), hx: hw.x, hz: hw.z, hr: nm === 'south' ? 7 : 5 });
      for (let x = 0; x <= LEN; x += 7) { const w = warp(e - x, c); (fx.clear || (fx.clear = [])).push([w.x, w.z, W / 2 + 0.5]); } // deck is walkable over the river collider
      hm[nm] = { e, n: c, x: hw.x, z: hw.z }; }
    { const w = warp((hm.north.e + hm.south.e) / 2 - 40, (hm.north.n + hm.south.n) / 2); wet.scale.set(260, 160, 1); wet.rotation.x = -Math.PI / 2; wet.position.set(w.x, 0.25, w.z); wet.raycast = () => {}; grp.add(wet); }
    (window.__groundParts = window.__groundParts || []).push((x, z) => { for (const d of hm.decks) if ((x > d.x0 && x < d.x1 && z > d.z0 && z < d.z1) || (x - d.hx) ** 2 + (z - d.hz) ** 2 < d.hr * d.hr) return DY; return null; });
    // spawn: South Pier deck 12 m back from the head, eye 1.7 m above deck, looking NE across the mouth at the North Pier light
    { const s = hm.south, sp = warp(s.e - 24, s.n + 1), mo = warp(s.e + 30, s.n + 40); hm.spawn = [sp.x, sp.z, [mo.x, mo.z], true]; /* v75: 34 m back on the deck, facing out through the mouth: red South tower ahead-right, North light ahead-left */ fx.harbourSpawn = hm.spawn; info.harbour = { southHead: [+s.x.toFixed(1), +s.z.toFixed(1)], northHead: [+hm.north.x.toFixed(1), +hm.north.z.toFixed(1)], spawn: [+sp.x.toFixed(1), +sp.z.toFixed(1)], deckY: DY }; }
    (fx.extraJumps || (fx.extraJumps = {})).harbour_mouth = hm.spawn;
    { const s0 = hm.south, nn = hm.north, sh = warp(s0.e + 2, s0.n + 1), nh = warp(nn.e, nn.n); let tries = 0; const pin = () => { // v74: neon gate / 3 TRACKS cluster onto the South Pier head; red + green beacons onto the real light towers
        let done = 0; for (const c of fx.clusters || []) if (c.grp && Math.hypot(c.grp.position.x - s0.x, c.grp.position.z - s0.z) < 160) { c.grp.position.set(s0.x - 10, DY, s0.z); done++; }
        const lm = fx.harbourLm || []; for (const b of lm) b.visible = false; /* v75: placeholder spheres hidden; real beacons below */
        if ((!done || !lm.length) && ++tries < 30) setTimeout(pin, 700); }; setTimeout(pin, 500);
      for (const [w, y, c] of [[sh, DY + 12.6, 0xff2020], [nh, DY + 8.9, 0x20ff50]]) { const bm = new T.Mesh(new T.SphereGeometry(1.0, 16, 12), new T.MeshBasicMaterial({ color: c, toneMapped: false, fog: false })); bm.position.set(w.x, y, w.z); grp.add(bm);
        const halo = new T.Mesh(new T.SphereGeometry(2.4, 16, 12), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.28, depthWrite: false, toneMapped: false, fog: false })); halo.position.copy(bm.position); halo.raycast = () => {}; grp.add(halo); } } }
  { // v74 Royal Assembly Rooms REAL massing (seafront-sv/JOSEPH-lodge-cluster-ADJUST + lodge-assembly-2026-10/02, 03 colour): white ground storey, brown-brick upper with 5 white blind arches,
    // white cornice, slate roof, white-capped chimneys, 5-bay front (3 open arches on grey columns + 2 outer arched windows with ROYAL ASSEMBLY ROOMS lunettes and square & compass panes),
    // yellow corner quoins (01), tarmac apron with bays + NO PARKING, square & compass either side of the car-park signs (Joseph addendum). Versions hatch stays beside the building (v65). Front faces east at e=-115.
    const F = -115.2, B = -156.5, S0 = -458, S1 = -437, NC = (S0 + S1) / 2, D = F - B, Wd = S1 - S0, E = Math.PI / 2;
    const emb = (w, h, e, n, y, bg, fg) => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 256, 256); g.strokeStyle = fg; g.lineWidth = 14; g.lineCap = 'round';
      g.beginPath(); g.moveTo(128, 40); g.lineTo(60, 210); g.moveTo(128, 40); g.lineTo(196, 210); g.stroke(); g.beginPath(); g.arc(128, 40, 14, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(50, 120); g.lineTo(128, 200); g.lineTo(206, 120); g.stroke(); // compass over square
      g.font = 'bold 60px Georgia,serif'; g.fillStyle = fg; g.textAlign = 'center'; g.fillText('G', 128, 150); const tx = new T.CanvasTexture(c); if (T.SRGBColorSpace) tx.colorSpace = T.SRGBColorSpace;
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tx, side: T.DoubleSide, fog: false, toneMapped: false })); const p = warp(e, n); m.position.set(p.x, y, p.z); m.rotation.y = E; grp.add(m); };
    AB(0xf2f0ea, D, 7, Wd, (F + B) / 2, NC, 3.5); AB(0x7a4632, D, 6.5, Wd, (F + B) / 2, NC, 10.25); AB(0xf4f2ec, D + 0.8, 0.7, Wd + 0.8, (F + B) / 2, NC, 13.85); // ground / brick upper / cornice
    { const g = new T.CylinderGeometry(0.01, Wd / 2 + 0.3, 3, 4, 1); g.rotateY(Math.PI / 4); g.scale(D * 0.72 / (Wd / 2 + 0.3), 1, 1); const p = warp((F + B) / 2, NC); g.translate(p.x, 15.7, p.z); put(0x3e434a, g); } // slate hipped roof
    for (const dn of [-Wd / 2 + 1.5, Wd / 2 - 1.5]) { AB(0x7a4632, 1.4, 3.4, 1.4, F - 6, NC + dn, 15.6); AB(0xf4f2ec, 1.7, 0.4, 1.7, F - 6, NC + dn, 17.5); } // chimneys, white caps
    for (const dn of [-Wd / 2, Wd / 2]) for (let y = 0.6; y < 14; y += 1.2) AB(0xe2b83a, 0.6, 0.55, 0.6 + (Math.round(y / 1.2) % 2) * 0.6, F + 0.05, NC + dn, y); // yellow corner quoins
    for (let i = 0; i < 5; i++) { const n = S0 + Wd * (i + 0.5) / 5, outer = i === 0 || i === 4;
      AB(0xd9cba8, 0.4, 0.6, 3.2, F + 0.25, n, 6.1); AB(0xd9cba8, 0.5, 0.5, 0.5, F + 0.3, n, 6.5); // beige arch head + keystone
      AB(0xf4f2ec, 0.15, 3.6, 2.4, F + 0.08, n, 10.4); AB(0x7a4632, 0.16, 3.2, 1.9, F + 0.09, n, 10.3); AB(0xf4f2ec, 0.17, 0.9, 2.4, F + 0.1, n, 12.2); // white blind arch panel upper
      if (outer) { AB(0x203046, 0.1, 4.6, 2.8, F + 0.12, n, 3.3); { const lb = board('ROYAL ASSEMBLY\nROOMS', 4.0, 1.8, F + 0.35, n, 5.4, E, '#0f1a2a', '#fff6d8', 0.5); lb.material.fog = false; lb.material.toneMapped = false; } emb(3.0, 3.0, F + 0.35, n, 2.6, '#0f1a2a', '#ffd76a'); /* v76: lit + larger so it reads from the hatch apron */ }
      else { AB(0x1a1d22, 0.1, 5.2, 2.8, F - 1.8, n, 2.6); AB(0x2b4058, 0.1, 3.6, 1.6, F - 1.7, n, 1.9); CY(0x2e5a2e, 0.5, 0.4, 1.0, F + 0.8, n, 0.5, 8); } } // recessed arched glazed door + topiary pot
    for (let i = 1; i < 5; i++) { if (i === 1 || i === 4) continue; } for (const i of [1, 2, 3, 4]) CY(0x9a9ea3, 0.35, 0.4, 5.8, F + 0.6, S0 + Wd * i / 5, 2.9, 12); // grey Tuscan columns between the bays
    for (let i = 0; i < 6; i++) CY(0x15171a, 0.12, 0.12, 0.6, F + 0.3, S0 + 1 + i * (Wd - 2) / 5, 14.6, 6); // parapet lamps
    AB(0x2c2f33, 14, 0.05, Wd + 8, F + 7.2, NC, 0.04); for (let i = 0; i <= 6; i++) AB(0xf2f0ea, 5, 0.03, 0.12, F + 9, S0 - 4 + i * (Wd + 8) / 6, 0.08); // tarmac apron + bay lines
    board('NO PARKING', 4, 0.8, F + 3.2, NC, 0.07, E, '#2c2f33', '#f2d23a').rotation.set(-Math.PI / 2, 0, E); // painted on the apron
    for (const dn of [-6, 6]) { const sn = NC + dn; CY(0x6b6f74, 0.07, 0.07, 2.6, F + 13, sn, 1.3, 6); board('PRIVATE CAR PARK', 2.4, 0.9, F + 13.06, sn, 2.3, E, '#ffffff', '#1a2638'); for (const ds of [-1.9, 1.9]) emb(1.3, 1.3, F + 13.06, sn + ds, 2.3, '#0f1a2a', '#ffd76a'); } // car-park signs with square & compass either side
    fx.addSolid && fx.addSolid([[B, S0], [F + 0.4, S0], [F + 0.4, S1], [B, S1]]); info.lodgeV74 = { front: F, n: [S0, S1] };
    { const fc = warp(F, NC), to = warp(F + 34, NC + 4); let k = 0; const mv = () => { let d = 0; for (const c of fx.clusters || []) if (c.grp && Math.hypot(c.grp.position.x - fc.x, c.grp.position.z - fc.z) < 40) { c.grp.position.x = to.x; c.grp.position.z = to.z; d++; } if (!d && ++k < 30) setTimeout(mv, 700); }; setTimeout(mv, 600); } } // v75: pink song panels off the facade, out past the apron so the 5-bay front + lettering read from the hatch
  // ---------- 5. piers: solid decks from OSM pier polygons ----------
  const decks = [];
  for (const pr of (G && G.piers) || []) { const name = pr[1]; if (!/Britannia|Wellington/.test(name || '')) continue; const pts = P2(pr[0]); if (pts.length < 3) continue; const Y = 1.5;
    const sh = new T.Shape(pts.map(([e, n]) => { const w = warp(e, n); return new T.Vector2(w.x, -w.z); })); const dg = new T.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false }); dg.rotateX(-Math.PI / 2); dg.translate(0, Y - 0.6, 0);
    grp.add(new T.Mesh(dg, new T.MeshBasicMaterial({ color: 0x6b5a48 })));
    let e0 = 1e9, e1 = -1e9, n0 = 1e9, n1 = -1e9; for (const [e, n] of pts) { e0 = Math.min(e0, e); e1 = Math.max(e1, e); n0 = Math.min(n0, n); n1 = Math.max(n1, n); }
    for (let e = e0 + 3; e < e1; e += 9) for (const n of [n0 + 2, n1 - 2]) if (inPoly(pts, e, n)) CY(0x3d3a36, 0.35, 0.35, Y + 3, e, n, (Y - 3) / 2, 6);
    for (let i = 0; i < pts.length; i++) { const a = warp(...pts[i]), b = warp(...pts[(i + 1) % pts.length]); const len = a.distanceTo(b); const rg = new T.BoxGeometry(len, 1.0, 0.12); rg.rotateY(-Math.atan2(b.z - a.z, b.x - a.x)); rg.translate((a.x + b.x) / 2, Y + 0.5, (a.z + b.z) / 2); put(0xe8e6df, rg); }
    if (/Britannia/.test(name)) { const he = e1 - 50, hn = (n0 + n1) / 2; AB(0xf2f0ea, 34, 9, 30, he, hn, Y + 4.5); AB(0x2d5aa0, 36, 1.2, 32, he, hn, Y + 9.6); AB(0xd23b3b, 20, 2.2, 0.3, he - 17.2, hn, Y + 7.8);
      board('BRITANNIA PIER', 18, 2, he - 17.4, hn, Y + 7.8, -Math.PI / 2, '#d23b3b', '#ffffff'); AB(0xe8e6df, 10, 5, 8, e0 + 18, hn, Y + 2.5); AB(0x7a1f2b, 10.4, 1.0, 8.4, e0 + 18, hn, Y + 5.3);
      for (let k = 0; k < 6; k++) CY(k % 2 ? 0xf2f0ea : 0xc0262b, 2.6 - k * 0.3, 2.9 - k * 0.3, 2.2, he - 34, hn + 9, Y + 1.1 + k * 2.2, 12); CY(0xc0262b, 0, 1.2, 2.5, he - 34, hn + 9, Y + 14.4, 12); }
    else { const nc = (n0 + n1) / 2; AB(0xf2ecd8, 18, 7, 26, e0 + 14, nc, Y + 3.5); AB(0x2f6b5a, 19, 1, 27, e0 + 14, nc, Y + 7.3); for (const dn of [-13, 13]) { CY(0xf2ecd8, 2.2, 2.2, 10, e0 + 5, nc + dn, Y + 5, 12); const dm = new T.Mesh(new T.SphereGeometry(2.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshBasicMaterial({ color: 0x3d8a6a })); const w = warp(e0 + 5, nc + dn); dm.position.set(w.x, Y + 10, w.z); grp.add(dm); }
      board('WELLINGTON PIER', 12, 1.6, e0 + 4.8, nc, Y + 6.2, -Math.PI / 2, '#f2ecd8', '#1f5a46', 0.6); AB(0x9a9c98, 30, 1.2, 14, e1 - 20, nc, Y + 0.3); }
    if (/Wellington/.test(name)) { const ge = e0 - 6, gn = (n0 + n1) / 2 - 42; const gl = new T.MeshBasicMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.35, side: T.DoubleSide, depthWrite: false }); const w = warp(ge, gn); // Winter Gardens glasshouse (stand-in, position approximate behind the pier root)
      const gh = new T.Mesh(new T.BoxGeometry(18, 10, 40), gl); gh.position.set(w.x, 5, w.z); grp.add(gh); const rf = new T.Mesh(new T.CylinderGeometry(9, 9, 40, 12, 1, true, 0, Math.PI), gl); rf.rotation.set(Math.PI / 2, 0, Math.PI / 2); rf.position.set(w.x, 10, w.z); grp.add(rf); }
    decks.push({ pts, Y, e0, e1 }); info.piers++; }
  if (decks.length) (window.__groundParts = window.__groundParts || []).push((x, z) => { const e = x, n = -z; for (const d of decks) { if (e < d.e0 - 10 || e > d.e1) continue; if (inPoly(d.pts, e, n)) return d.Y; } return null; });

  // ---------- 6. Nelson's Monument + Minster stand-ins ----------
  { const [e, n] = loc(52.5884393, 1.7335971); AB(0x8d8a82, 9, 1.2, 9, e, n, 0.6); AB(0x9a978e, 6.5, 3, 6.5, e, n, 2.7); AB(0xa8a59c, 4.6, 4, 4.6, e, n, 6.2); CY(0xb4b0a6, 1.4, 1.7, 26, e, n, 21.2, 16); AB(0xa8a59c, 3.8, 2.4, 3.8, e, n, 35.4);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; AB(0x8f8a7e, 0.7, 2.2, 0.5, e + Math.cos(a) * 1.4, n + Math.sin(a) * 1.4, 37.8, a); } CY(0xd4c08a, 0.9, 0.9, 1.8, e, n, 39.8, 8); CY(0xc8b37a, 0.45, 0.55, 2.4, e, n, 41.8, 8); }
  { const [e, n] = loc(52.611367, 1.7273138); AB(0x8a8780, 22, 14, 62, e, n - 4, 7); AB(0x5d5a55, 23, 1, 63, e, n - 4, 14.5); AB(0x8a8780, 34, 12, 14, e, n + 6, 6); AB(0x9a968e, 11, 30, 11, e, n + 26, 15); CY(0x57534c, 0, 6, 9, e, n + 26, 34.5, 4);
    for (let i = 0; i < 5; i++) AB(0x2a2f38, 0.3, 6, 2.2, e - 11.2, n - 26 + i * 11, 7); }

  { const [e, n] = loc(52.604471, 1.736196); // Tower Complex solid facade (stand-in behind the wire frame): cream render, red-brick base, corner turrets, dark arched windows
    AB(0xe7dcc6, 26, 15, 40, e, n, 7.5); AB(0x8a3f2e, 26.4, 3.2, 40.4, e, n, 1.6); AB(0x4b4f55, 27, 0.8, 41, e, n, 15.4);
    for (const dn of [-19, 19]) { CY(0xe7dcc6, 3.2, 3.2, 22, e + 12, n + dn, 11, 12); CY(0x5c6a74, 0, 3.6, 5, e + 12, n + dn, 24.5, 12); }
    for (let i = 0; i < 7; i++) AB(0x1d2128, 0.3, 4.5, 2.6, e + 13.1, n - 15 + i * 5, 8.5);
    AB(0xd9d4c8, 14, 22, 20, e - 4, n, 26); for (let f = 0; f < 6; f++) AB(0x8f9499, 1.4, 0.2, 18, e + 3.7, n, 17 + f * 3.4); for (let f = 0; f < 6; f++) AB(0x1d2128, 0.2, 1.6, 18, e + 3.1, n, 18 + f * 3.4);
    for (const dn of [-6, 0, 5]) AB(0x9aa0a6, 0.2, 6, 0.2, e - 4, n + dn, 40);
    // ground-floor fascias as seen on Street View, Marine Parade, Sep 2024 (Joseph's seafront SV frame); Viper stays a logo panel elsewhere, no venue
    board('THE BUDDHA CLUB', 10, 1.3, e + 13.3, n - 13, 4.4, Math.PI / 2, '#8d9096', '#ffffff', 0.6); board('THE TOWER BAR\nPublic House', 10, 1.5, e + 13.3, n, 4.4, Math.PI / 2, '#5b2a86', '#ffffff', 0.55);
    board('SUBWAY', 7, 1.3, e + 13.3, n + 13, 4.4, Math.PI / 2, '#0b7a3e', '#ffd200', 0.7); AB(0x2f6fb2, 0.3, 8, 38, e + 13.2, n, 11.5); for (let i = 0; i < 8; i++) AB(0xe9e1cc, 0.5, 8.2, 0.6, e + 13.4, n - 17.5 + i * 5, 11.5); AB(0x111111, 0.3, 1.0, 40, e + 13.4, n, 15.8); }
  { const [e, n] = loc(52.6278547, 1.7383001); // The Iron Duke (1930s Art Deco pub, North Drive): dark brick mass, pale bands, rounded end bays, lettering facing the sea road
    AB(0x4a2c24, 16, 8.6, 30, e, n, 4.3); AB(0x4a2c24, 10, 11, 10, e - 2, n, 5.5); for (const y of [3.0, 6.2, 8.7]) AB(0xe9e3d2, 16.4, 0.45, 30.4, e, n, y);
    for (const dn of [-15, 15]) { CY(0x4a2c24, 5, 5, 8.6, e + 3, n + dn, 4.3, 16); for (const y of [3.0, 6.2, 8.7]) CY(0xe9e3d2, 5.2, 5.2, 0.45, e + 3, n + dn, y, 16); }
    for (let i = 0; i < 6; i++) { AB(0x1a1d22, 0.3, 1.9, 2.4, e + 8.1, n - 11 + i * 4.4, 4.6); AB(0xe9e3d2, 0.34, 0.2, 2.8, e + 8.1, n - 11 + i * 4.4, 5.6); }
    board('THE IRON DUKE', 12, 1.4, e + 8.3, n, 7.4, Math.PI / 2, '#1f1410', '#f2e6c4', 0.7);
    for (let i = 0; i < 9; i++) { AB(0x22262c, 0.18, 0.9, 0.18, e + 14, n - 16 + i * 4, 0.45); } AB(0x6f6b63, 4, 0.14, 36, e + 11, n, 0.07); }
  // ---------- 7. bottom of Beatty Road (Joseph's photos) ----------
  fetch('/assets/data/beatty-bottom.json?v=80').then(r => r.json()).then(D => { try {
    const BE = -222.5; const s = D.busStop; // shelter on the east kerb, facing the road (west)
    AB(0x22262c, 0.12, 2.5, 0.12, s.e, s.n - 1.8, 1.25); AB(0x22262c, 0.12, 2.5, 0.12, s.e, s.n + 1.8, 1.25); AB(0x22262c, 0.12, 2.5, 0.12, s.e + 1.4, s.n - 1.8, 1.25); AB(0x22262c, 0.12, 2.5, 0.12, s.e + 1.4, s.n + 1.8, 1.25);
    const roof = new T.Mesh(new T.BoxGeometry(1.8, 0.12, 4.0), new T.MeshBasicMaterial({ color: 0xf2f2f0 })); const rp = warp(s.e + 0.7, s.n); roof.position.set(rp.x, 2.55, rp.z); grp.add(roof);
    const glass = new T.MeshBasicMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.28, side: T.DoubleSide, depthWrite: false });
    for (const [w, d, de, dn] of [[0.04, 3.6, 1.4, 0], [1.4, 0.04, 0.7, -1.8]]) { const m = new T.Mesh(new T.BoxGeometry(w, 2.1, d), glass); const p = warp(s.e + de, s.n + dn); m.position.set(p.x, 1.25, p.z); grp.add(m); }
    AB(0xc0262b, 0.35, 0.08, 2.6, s.e + 1.15, s.n, 0.55); AB(0x22262c, 0.08, 0.5, 0.08, s.e + 1.15, s.n - 1.1, 0.27); AB(0x22262c, 0.08, 0.5, 0.08, s.e + 1.15, s.n + 1.1, 0.27);
    board(s.ad + '\nfreshly baked', 1.3, 1.9, s.e + 0.7, s.n + 1.83, 1.25, 0, '#3b2a6b', '#ffe27a', 0.5);
    board('NO SMOKING', 0.6, 0.6, s.e + 1.38, s.n - 0.9, 1.6, Math.PI / 2, '#ffffff', '#c0262b', 0.35);
    const pe = s.e - 1.2, pn = s.n - 3.2; AB(0x8a9096, 0.1, 3.2, 0.1, pe, pn, 1.6); board('BUS STOP\n' + s.sign.replace(', ', '\n') + '\ntraveline', 0.9, 1.2, pe - 0.08, pn, 2.85, -Math.PI / 2, '#ffffff', '#123a7a', 0.6);
    board('SCAN ME\n' + s.qr, 0.55, 0.8, pe - 0.08, pn, 1.55, -Math.PI / 2, '#1d5fbf', '#ffffff', 0.7);
    if (LBL) { const l = LBL('BUS STOP · BEATTY RD opp SEYMOUR AVE', '#ffffff', 1.4); const p = warp(s.e, s.n); l.position.set(p.x, 3.6, p.z); grp.add(l); }
    for (const pn of [2540, 2600, 2660]) AB(0x4a3a2c, 0.25, 8.5, 0.25, BE + 6.6, pn, 4.25); // timber poles + overhead lines (photo 07)
    { const w = []; for (const dy of [7.8, 8.2]) for (const [n0, n1] of [[2540, 2600], [2600, 2660]]) w.push(warp(BE + 6.6, n0).setY(dy), warp(BE + 6.6, n1).setY(dy - 0.0)); grp.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(w), new T.LineBasicMaterial({ color: 0x1a1a1a }))); }
    { const vg = []; for (let n = 2540; n < 2650; n += 2) for (const o of [5.4, -5.4]) { const a = warp(BE + o - 0.9, n), b = warp(BE + o + 0.9, n), c = warp(BE + o + 0.9, n + 2), d = warp(BE + o - 0.9, n + 2); vg.push(a.x, 0.14, a.z, b.x, 0.14, b.z, c.x, 0.14, c.z, a.x, 0.14, a.z, c.x, 0.14, c.z, d.x, 0.14, d.z); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(vg, 3)); grp.add(new T.Mesh(g, new T.MeshBasicMaterial({ color: 0x4f6b3a, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }))); } // grass verges
    { const yb = []; const e0 = BE + 1.2, e1 = BE + 3.5, n0 = s.n - 9, n1 = s.n + 9; for (const [a, b] of [[[e0, n0], [e1, n0]], [[e1, n0], [e1, n1]], [[e1, n1], [e0, n1]], [[e0, n0], [e0, n1]]]) yb.push(warp(...a).setY(0.11), warp(...b).setY(0.11)); board('BUS STOP', 2.0, 0.6, (e0 + e1) / 2, s.n, 0.12, 0, '#33373c', '#f2c230').rotation.set(-Math.PI / 2, 0, Math.PI / 2); grp.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(yb), new T.LineBasicMaterial({ color: 0xf2c230 }))); }
    board('BEATTY ROAD', 1.8, 0.38, s.e + 3.5, s.n - 6, 1.0, -Math.PI / 2, '#ffffff', '#111111', 0.7); AB(0x22262c, 0.08, 1.0, 0.08, s.e + 3.5, s.n - 6.8, 0.5); AB(0x22262c, 0.08, 1.0, 0.08, s.e + 3.5, s.n - 5.2, 0.5);
    CY(0x3b2a1e, 0.25, 0.35, 4, BE + 6.2, 2560, 2, 6); CY(0x2f4d26, 0.6, 3.2, 5, BE + 6.2, 2560, 6, 8); AB(0x6b4a30, 0.5, 0.1, 1.8, BE + 6.2, 2565, 0.5); AB(0x6b4a30, 0.1, 0.5, 1.8, BE + 6.45, 2565, 0.8);
    { const de = BE - 2.0, dn = 2638; AB(0xc8102e, 2.55, 4.2, 10.8, de, dn, 2.3); AB(0x1b2430, 2.6, 0.9, 10.2, de, dn, 1.9); AB(0x1b2430, 2.6, 0.9, 10.2, de, dn, 3.7); AB(0xf2f2f2, 2.6, 0.2, 10.85, de, dn, 2.8); AB(0x111111, 2.4, 0.5, 0.3, de, dn - 5.4, 4.0); } // double-deck bus in Coastal Red-style red (no operator logo)
    const m = D.madden; AB(0x22262c, 0.1, 1.2, 0.1, m.e - 0.8, m.n, 0.6); AB(0x22262c, 0.1, 1.2, 0.1, m.e + 0.8, m.n, 0.6); board(m.sign, 1.8, 0.4, m.e, m.n, 1.15, 0, '#1d4f9c', '#ffffff', 0.7);
    for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI / 2, ce = m.e + 6, cn = m.n - 6, e = ce - Math.cos(a) * 6, n = cn + Math.sin(a) * 6; AB(0x9b6b46, 1.0, 1.0, 0.3, e, n, 0.5, a); if (i % 2) CY(0x2f4d26, 0.5, 0.6, 1.0, e + 0.6, n - 0.6, 1.1, 6); if (i % 3 === 1) CY(0x8a1a2a, 0.12, 0.12, 0.12, e + 0.8, n - 0.4, 1.5, 4); }
    AB(0x2b2f35, 0.16, 6, 0.16, m.e + 2.5, m.n - 2.2, 3); AB(0xffcf7a, 0.5, 0.2, 0.5, m.e + 2.5, m.n - 2.2, 6);
    // low brick front walls along both kerbs (house colours come from the skin palette below, read from the same file)
    for (const [list, dir] of [[D.terraceEast || [], 1], [D.terraceWest || [], -1]]) for (const t of list) for (let n = t.n0; n < t.n1; n += 6.5) AB(dir > 0 ? 0x9a4a32 : 0x7d3b2c, 0.35, 1.1, 5.6, BE + dir * 5.9, n + 3.1, 0.55);
    const bc = []; for (const [e, n0, n1, p] of D.parked || []) for (let n = n0; n < n1; n += 5.4) if (R() < p) bc.push([warp(e, n), 0, CARCOL[Math.floor(R() * CARCOL.length)]]); bc.push([warp(-227, 2590), 0, 0x2f5a3a]); addCars(bc);
    const ln = []; for (let n = 2140; n < 2660; n += 4) { ln.push(warp(BE, n).setY(0.1), warp(BE, n + 2).setY(0.1)); } for (let n = 2560; n < 2620; n += 1.6) for (const o of [-3.3, 3.3]) ln.push(warp(BE + o, n).setY(0.1), warp(BE + o, n + 0.8).setY(0.1));
    const lnm = new T.LineSegments(new T.BufferGeometry().setFromPoints(ln.slice(0, (2660 - 2140) / 4 * 2)), new T.LineBasicMaterial({ color: 0xffffff })); grp.add(lnm);
    grp.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(ln.slice((2660 - 2140) / 4 * 2)), new T.LineBasicMaterial({ color: 0xf2c230 })));
    const sk = D.skyline; if (sk && !LITE) { const [te, tn] = sk.tower; CY(0xeeeeea, 1.6, 2.2, 26, te, tn, 13, 10); CY(0xf4f4f0, 7, 5, 8, te, tn, 30, 16); const [me, mn] = sk.mast; CY(0xdedede, 0.4, 0.9, 38, me, mn, 19, 6); for (let k = 0; k < 3; k++) AB(0xdedede, 2.6, 0.9, 0.3, me, mn, 34 + k * 1.6, k); }
    flushMB(); info.beatty = true; } catch (e) { console.warn('v69 beatty', e); } }).catch(() => {});

  // ---------- 8. North Drive road-train stop ----------
  { const [e, n] = loc(52.624514, 1.738397), pe = e - 14; AB(0x8d8a82, 4, 0.3, 18, pe, n, 0.15); AB(0xd8d4c8, 0.3, 0.2, 18, pe + 2, n, 0.32);
    for (const dn of [-4, 4]) for (const de of [-1.6, 1.4]) AB(0x2b2f35, 0.12, 2.6, 0.12, pe + de, n + dn, 1.6); AB(0xe9e7e0, 3.6, 0.15, 9, pe, n, 2.95); AB(0x5a4030, 0.5, 0.1, 4, pe - 1.2, n, 0.75);
    board('NORTH DRIVE\nroad train stop', 3, 1.2, pe - 1.7, n, 2.2, Math.PI / 2, '#123a7a', '#ffffff', 0.6); }

  // ---------- 9. quick jumps ----------
  const J = fx.extraJumps || (fx.extraJumps = {}); const wj = (e, n, fe, fn) => { const a = warp(e, n), b = warp(fe, fn); return [a.x, a.z, [b.x, b.z]]; };
  const add = (k, label, v) => { if (!v) return; J[k] = v; info.jumps++; const nav = document.querySelector('.wmap-jumps'); if (nav && !nav.querySelector(`[data-jump="${k}"]`)) { const b = document.createElement('button'); b.type = 'button'; b.dataset.jump = k; b.textContent = label; nav.appendChild(b); } };
  const later = () => { const i3 = fx.v63Info || {}, i4 = fx.v64Info || {}, i5 = fx.v65Info || {};
    { const bp = ((G && G.piers) || []).find(p => /Britannia/.test(p[1] || '')); if (bp) { const pts = P2(bp[0]), e0 = Math.min(...pts.map(p => p[0])), nc = pts.reduce((s, p) => s + p[1], 0) / pts.length; J.britannia_pier = [195, -511, [320, -511], true]; /* v75: clear deck lane past the pier buildings (world x/z, scanned), facing seaward along the pier */ /* v74: exact spot on the solid OSM deck */ } }
    { const wp = ((G && G.piers) || []).find(p => /Wellington/.test(p[1] || '')); if (wp) { const pts = P2(wp[0]), e0 = Math.min(...pts.map(p => p[0])), nc = pts.reduce((s, p) => s + p[1], 0) / pts.length; add('wellington_pier', 'Wellington Pier', [72, 488, [190, 488], true]); /* v75: north deck lane clear of the pavilion block, facing the sea */ /* v73: feet on the solid OSM deck (raw: skip landX beach clamp) */ } }
    { const [e, n] = loc(52.604471, 1.736196); const pe = Math.max(e + 40, seaE(n) - 45); J.tower_complex = wj(pe, n - 30, e, n); }
    { const [e, n] = loc(52.625267, 1.735168); J.newtown_archive = wj(-152, 2441, e, n); /* v70: further out on the carriageway; scouts landed inside the brick at -136 */ /* on the Sturdee Avenue carriageway, outside the frontage */ }
    add('market_gates', 'Market Gates', wj(-478, 446, -530, 430) /* open ground by the v65 Market Gates bus stands, looking at the centre */);
    add('troll_cart', 'Troll Cart', i5.trollCart && wj(i5.trollCart[0] - 14, i5.trollCart[1] - 10, i5.trollCart[0], i5.trollCart[1]));
    add('cemetery', 'Cemetery', wj(-509, 880, -509, 930));
    add('lodge', 'Masonic Lodge', i5.hatch ? wj(i5.hatch[0] + 12, i5.hatch[1] - 8, i5.hatch[0], i5.hatch[1]) : i5.lodge && wj(i5.lodge[0] + 16, i5.lodge[1] - 18, i5.lodge[0], i5.lodge[1])); /* v72: on the Albert Square apron east of the portico, facing the fiction hatch; fe-30 landed inside the brick shell */
    add('beach_campfire', 'Ancients beach fire', i5.beachCampfire && wj(i5.beachCampfire[0] - 18, i5.beachCampfire[1] - 12, i5.beachCampfire[0], i5.beachCampfire[1]));
    add('bure_campfire', 'Bure Park woods', i4.campfire && wj(i4.campfire[0] - 14, i4.campfire[1] - 10, i4.campfire[0], i4.campfire[1]));
    add('seashore', 'Seashore sign', i3.seashoreSign && wj(i3.seashoreSign[0] - 16, i3.seashoreSign[1] - 10, i3.seashoreSign[0], i3.seashoreSign[1]));
    { const [e, n] = loc(52.609742, 1.736766); add('fallen_angels', 'Fallen Angels', wj(Math.max(e + 30, seaE(n) - 25), n - 10, e, n)); }
    add('jellicoe', 'Jellicoe bridge underside', i3.jellicoe && wj(i3.jellicoe.under[0] - 10, i3.jellicoe.under[1] - 8, i3.jellicoe.under[0], i3.jellicoe.under[1]));
    add('newtown_park', 'Newtown Park', i3.newtownPath ? wj(i3.newtownPath.top[0] - 20, i3.newtownPath.top[1], i3.newtownPath.top[0] + 30, i3.newtownPath.top[1]) : null);
    add('youth_centre', 'Youth & Community Centre', i3.newtownPath ? wj(i3.newtownPath.bottom[0] - 16, i3.newtownPath.bottom[1] - 12, i3.newtownPath.bottom[0], i3.newtownPath.bottom[1]) : null); { const nav = document.querySelector('.wmap-jumps'), yb = nav && nav.querySelector('[data-jump="youth_centre"]'); if (yb && nav.children[1]) nav.insertBefore(yb, nav.children[1]); } /* v75: unbury Youth near the top of the jump list */
    add('beatty_close', 'Beatty Close', wj(-170, 2318, -115, 2324));
    add('the_stack', 'THE STACK hatch', [153, -285, [156, -288]]); /* v73: land on the plate so F opens LAYER MAP */ (fx.mapSpots || (fx.mapSpots = [])).some(m => m.label === 'STACK') || fx.mapSpots.push({ pos: new T.Vector3(156, 0, -288), label: 'STACK', col: '#00ff9d' }); /* v70: minimap / jump-map pin */ /* world x/z from Systems Scout (stack-nav.md) */
    add('beatty_bottom', 'Beatty Rd bus stop', wj(-226, 2584, -216.5, 2596)); };
  setTimeout(later, 2500); setTimeout(later, 8000);
  flushMB();
  fx.v69Info = info; window.__v69 = info; return { info };
}
