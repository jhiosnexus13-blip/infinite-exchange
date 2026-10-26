/* JHIOS world v64 — minimal scaffolds for approved track placements. All MeshBasic, merged per colour; nothing labelled at private places.
   1. Great Yarmouth railway station building (OSM way 204723756, building=train_station): plain brick shed + pitched roof + canopy, solid.
   2. Great Yarmouth Old Cemetery (OSM way 175643707, landuse=cemetery): rows of plain headstones, a few yews and dim lamps. Atmosphere only:
      no graves dug, no figures, no crime or cult props.
   3. Bure Park (OSM way 200289880, leisure=park): campfire party scaffold (stone ring, logs, flame, log benches).
   4. Newtown back alley (OSM way 231810665, service=alley): low close-board back fences either side. No names, numbers or labels.
   Pembroke Avenue (Gorleston) uses the existing OSM street/buildings: floating screens only, nothing on any house. */
export function initV64(o) {
  const { T, S, LITE, warp, fx } = o, grp = new T.Group(); grp.name = 'v64'; S.add(grp);
  const MB = new Map(), info = {};
  const put = (hex, g) => { (MB.get(hex) || MB.set(hex, []).get(hex)).push(g.index ? g.toNonIndexed() : g); };
  const AB = (hex, w, h, d, e, n, y, ry = 0) => { const g = new T.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); const p = warp(e, n); g.translate(p.x, y, p.z); put(hex, g); };
  const CY = (hex, r0, r1, h, e, n, y, seg = 8) => { const g = new T.CylinderGeometry(r0, r1, h, seg); const p = warp(e, n); g.translate(p.x, y, p.z); put(hex, g); };
  const solid = (e0, n0, e1, n1) => fx.addSolid && fx.addSolid([[e0, n0], [e1, n0], [e1, n1], [e0, n1]]);
  let rnd = 64; const R = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);

  // 1. station (OSM bbox e -1088.9..-1053.3, n 917.7..1008.8): 30 x 86 m shed, long axis N-S
  { const E0 = -1086, E1 = -1056, N0 = 920, N1 = 1006, EC = (E0 + E1) / 2, NC = (N0 + N1) / 2, W = E1 - E0, H = 7;
    AB(0x8a4b3a, W, H, N1 - N0, EC, NC, H / 2);                                   // brick body
    for (const s of [-1, 1]) { const g = new T.BoxGeometry(W / 2 + 1.2, 0.4, N1 - N0 + 2); g.rotateZ(s * -0.42); const p = warp(EC + s * W / 4, NC); g.translate(p.x, H + 3.1, p.z); put(0x4a4f57, g); } // pitched roof
    AB(0xd8d2c4, 0.3, 2.6, 18, E1 + 0.2, NC, 2.2);                                // pale entrance panel (east, road side)
    AB(0x3b4048, 8, 0.3, 30, E1 + 4, NC, 4.2); for (const dn of [-13, 13]) AB(0x3b4048, 0.3, 4.2, 0.3, E1 + 7.5, NC + dn, 2.1); // canopy
    solid(E0, N0, E1, N1); info.station = [E0, N0, E1, N1]; }

  // 2. cemetery: headstone rows around (-509, 930)
  { let n = 0; for (let r = 0; r < 8; r++) for (let c = 0; c < 14; c++) { const e = -560 + c * 7 + (R() - 0.5), nn = 900 + r * 8 + (R() - 0.5); if (Math.hypot(e + 509, nn - 930) < 9) continue;
      AB(R() < 0.5 ? 0x9a9a94 : 0x7d7f7a, 1.0, 0.9 + R() * 0.5, 0.2, e, nn, 0.6); n++; }
    for (const [e, nn] of [[-570, 895], [-462, 898], [-575, 965], [-458, 968], [-520, 975]]) { CY(0x1f3a26, 0, 3.2, 8, e, nn, 5); CY(0x3b2a1e, 0.35, 0.4, 1.6, e, nn, 0.8); }
    for (const [e, nn] of [[-509, 918], [-509, 942]]) { CY(0x2b2b2b, 0.08, 0.1, 3.2, e, nn, 1.6); AB(0xffcf7a, 0.4, 0.5, 0.4, e, nn, 3.4); }
    info.headstones = n; }

  // 3. Bure Park campfire (-754, 2910)
  const flames = [];
  { const E = -754, N = 2910;
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; AB(0x6b6b66, 0.5, 0.35, 0.5, E + Math.cos(a) * 1.4, N + Math.sin(a) * 1.4, 0.18, a); }
    for (let i = 0; i < 4; i++) AB(0x4a3020, 1.6, 0.22, 0.22, E, N, 0.3 + i * 0.05, i * 0.8);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + 0.3; AB(0x5c3d24, 2.6, 0.45, 0.5, E + Math.cos(a) * 4.5, N + Math.sin(a) * 4.5, 0.25, -a + Math.PI / 2); }
    const p = warp(E, N);
    for (const [c, s, y] of [[0xff7a1a, 1.0, 0.9], [0xffc83a, 0.6, 1.1]]) { const m = new T.Mesh(new T.ConeGeometry(s, 1.8 * s + 0.4, 7), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, toneMapped: false }));
      m.position.set(p.x, y, p.z); grp.add(m); flames.push(m); }
    if (!LITE && T.PointLight) { const L = new T.PointLight(0xff9a40, 2, 18); L.position.set(p.x, 1.8, p.z); grp.add(L); flames.push(L); }
    info.campfire = [E, N]; }

  // 4. Newtown back alley (OSM way 231810665, e -95..-132 at n ~2586): plain fences both sides, no names
  { for (const dn of [-3.2, 3.2]) AB(0x6e5a44, 34, 1.8, 0.1, -113.5, 2586 + dn, 0.9);
    for (let e = -130; e <= -97; e += 2.4) for (const dn of [-3.2, 3.2]) AB(0x5a4836, 0.12, 1.9, 0.12, e, 2586 + dn, 0.95);
    info.alley = [-113.5, 2586]; }

  for (const [hex, gs] of MB) grp.add(new T.Mesh(mergeGeo(T, gs), new T.MeshBasicMaterial({ color: hex, toneMapped: hex !== 0xffcf7a })));
  info.drawCalls = MB.size + flames.length; fx.v64Info = info;
  return { update(t) { if (LITE) return; for (let i = 0; i < 2; i++) { const f = flames[i]; f.scale.y = 1 + 0.18 * Math.sin(t * (7 + i * 3)); f.rotation.y = t * (1 + i); } } };
}
function mergeGeo(T, gs) { let n = 0; for (const g of gs) n += g.attributes.position.count; const a = new Float32Array(n * 3); let o = 0;
  for (const g of gs) { a.set(g.attributes.position.array, o); o += g.attributes.position.count * 3; }
  const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(a, 3)); out.computeBoundingSphere(); return out; }
