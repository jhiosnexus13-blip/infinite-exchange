/* JHIOS world v63 — walkable levels + landmarks for the deferred track placements. All solid MeshBasic, merged per colour.
   1. Newtown path levels: from the Park / Community Centre footpath, steps DOWN to a lower path (~1.8 m, Joseph's description; the EA 1 m LiDAR DTM
      only shows a ~0.3-0.5 m dip along the OSM alley line, so the depth follows Joseph) between brick retaining walls with railings, then a RAMP back up
      to street level and a paved link to the EAST END of Beatty Close (OSM way 36883456 ends e-78.6/n2345). Plain detached house beside the steps is
      the existing v60 model. Nothing here is labelled; no names or numbers.
   2. Beatty Road (east side, between Raleigh Avenue and The Avenue pub): the OSM semis become solid, a mock-Tudor cream semi pair fills the gap
      before the pub forecourt, and 1.8 m close-board fences + side gates close every gap between pairs, so the frontage is continuous.
      Raleigh Avenue's junction is left open (it is a road). Unlabelled.
   3. Jellicoe Road bridge (OSM ways 231810834/231810835, bridge=yes layer=1) over the service lane (OSM way 231810653): deck, parapets, abutments,
      embankment ramps both sides; walk over it or along the lane under it.
   4. Seashore Holiday Park & Seafront sign on North Drive by the Seashore north entrance (OSM node 562733171).
   5. Scroby Sands wind farm: 30 turbines at their OSM generator nodes (Vestas V80 scale: ~60 m hub, 40 m blades), rotors turn slowly.
   Collision: fx.addSolid(poly, ylo, yhi) (world-fx.js) with optional foot-height band; walk heights via window.__groundParts (x, z, eyeY). */
export function initV63(o) {
  const { T, S, LBL, LITE, warp, fx } = o, grp = new T.Group(); grp.name = 'v63'; S.add(grp);
  const MB = new Map(), info = {};
  const put = (hex, g) => { (MB.get(hex) || MB.set(hex, []).get(hex)).push(g.index ? g.toNonIndexed() : g); };
  // box: w along e, h up, d along n; centred at (e, n, y); ry rotation (radians, about up)
  const AB = (hex, w, h, d, e, n, y, ry = 0, rx = 0) => { const g = new T.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); const p = warp(e, n); g.translate(p.x, y, p.z); put(hex, g); };
  const solid = (e0, n0, e1, n1, ylo, yhi) => fx.addSolid && fx.addSolid([[e0, n0], [e1, n0], [e1, n1], [e0, n1]], ylo, yhi);
  const parts = window.__groundParts = window.__groundParts || [];
  const foot = y => (y == null ? 1.7 : y) - 1.7;

  // ---------- 1. Newtown path levels ----------
  { const D = 1.8, EA = -67.6, EB = -64.4, EC = (EA + EB) / 2, NT = 2415.5, NS = 2408.5, NR = 2362, NB = 2348, STEPS = 9;
    const hAt = n => n >= NT ? 0 : n >= NS ? -Math.min(D, Math.ceil((NT - n) / ((NT - NS) / STEPS)) * D / STEPS) : n >= NR ? -D : n >= NB ? -D * (n - NB) / (NR - NB) : 0;
    parts.push((x, z) => { const e = x, n = -z; if (e < EA || e > EB || n < NB || n > NT) return null; return hAt(n); });
    for (let i = 0; i < STEPS; i++) { const n1 = NT - i * (NT - NS) / STEPS, n0 = n1 - (NT - NS) / STEPS, top = -(i + 1) * D / STEPS; AB(0x8c8780, EB - EA, 0.12, n1 - n0, EC, (n0 + n1) / 2, top - 0.06); AB(0x6f6a64, EB - EA, 0.04, 0.08, EC, n0 + 0.04, top + 0.02); }
    AB(0x6a6560, EB - EA, 0.1, NS - NR, EC, (NS + NR) / 2, -D - 0.05);                                // lower path
    { const L = Math.hypot(NR - NB, D), a = Math.atan2(D, NR - NB); AB(0x726c66, EB - EA, 0.1, L, EC, (NR + NB) / 2, -D / 2 - 0.05, 0, a); } // ramp up (south end)
    AB(0x6a6560, 15, 0.06, 4.2, -71.8, 2345.6, 0.07);                                                  // link to the east end of Beatty Close
    for (const [ew, s] of [[EA - 0.18, -1], [EB + 0.18, 1]]) { // retaining walls (brick) with coping + railings, earth bank behind
      AB(0x7c4030, 0.36, D + 0.3, NT - NR, ew, (NT + NR) / 2, -D / 2 + 0.15); AB(0xa7a29a, 0.5, 0.08, NT - NB, ew, (NT + NB) / 2, 0.34);
      { const L = NR - NB; for (let k = 0; k < 4; k++) { const n0 = NB + k * L / 4, n1 = n0 + L / 4, hh = D * ((n0 + n1) / 2 - NB) / L; AB(0x7c4030, 0.36, hh + 0.3, L / 4, ew, (n0 + n1) / 2, -hh / 2 + 0.15); } }
      AB(0x5a7a3a, 1.6, 0.06, NT - NB, ew + s * 1.0, (NT + NB) / 2, 0.08);
      for (const y of [0.65, 1.2]) AB(0xa9b0b6, 0.05, 0.05, NT - NB, ew, (NT + NB) / 2, y); for (let n = NB; n <= NT; n += 2) AB(0xa9b0b6, 0.06, 0.9, 0.06, ew, n, 0.8);
      solid(s < 0 ? ew - 2.2 : ew - 0.2, NB + 2, s < 0 ? ew + 0.2 : ew + 2.2, NT, -9, 9); } // wall + bank: 2.4 m deep so a fast walker can't step through
    for (const e of [EA + 0.15, EB - 0.15]) { const L = Math.hypot(NT - NS, D), a = -Math.atan2(D, NT - NS); AB(0xa9b0b6, 0.05, 0.05, L, e, (NT + NS) / 2, -D / 2 + 0.95, 0, -a); } // stair handrails
    info.newtownPath = { depth: D, steps: STEPS, top: [EC, NT], bottom: [EC, NB], link: [-78.6, 2345.6] }; }

  // ---------- 2. Beatty Road east side: continuous frontage south of The Avenue ----------
  { const FE = -199.2, BE = -188, HT = 6.4, rows = [[2264, 2276], [2281, 2293], [2298, 2311]]; // OSM semi pairs (newtown-streets.json); shell already drawn by world-streets.js
    for (const [a, b] of rows) solid(FE, a, BE, b, -9, 9);
    // new mock-Tudor semi pair (cream render, black half-timbering, red-brick ground floor, red tile roof), filling up to the pub forecourt
    { const a = 2312, b = 2324, ec = (FE + BE) / 2, dep = BE - FE, len = b - a;
      AB(0x9a4a32, dep, 2.8, len, ec, (a + b) / 2, 1.4); AB(0xeee6cf, dep, 2.6, len, ec, (a + b) / 2, 4.1);
      { const g = new T.ExtrudeGeometry(new T.Shape([new T.Vector2(-dep / 2 - 0.3, 0), new T.Vector2(dep / 2 + 0.3, 0), new T.Vector2(0, 3.4)]), { depth: len + 0.4, bevelEnabled: false }); g.translate(0, 0, -(len + 0.4) / 2); const p = warp(ec, (a + b) / 2); g.translate(p.x, 5.4, p.z); put(0x8a3a2a, g); }
      for (const nn of [a + 0.15, (a + b) / 2, b - 0.15]) AB(0x151515, 0.12, 2.6, 0.18, FE - 0.06, nn, 4.1);
      for (let nn = a + 1; nn < b; nn += 1.5) AB(0x151515, 0.1, 2.4, 0.12, FE - 0.07, nn, 4.1);
      AB(0x151515, 0.12, 0.16, len, FE - 0.07, (a + b) / 2, 2.85);
      for (const nn of [a + 1.8, b - 1.8]) { AB(0xf4f6f8, 0.1, 1.2, 1.6, FE - 0.08, nn, 1.6); AB(0xf4f6f8, 0.1, 1.1, 1.5, FE - 0.09, nn, 4.2); }
      for (const nn of [a + 4.2, b - 4.2]) AB(0x3a2a22, 0.1, 2.0, 0.95, FE - 0.08, nn, 1.0);
      AB(0x8f5a40, 0.9, 1.8, 0.9, ec, (a + b) / 2, 7.9);
      solid(FE, a, BE, b, -9, 9); }
    // close-board fences + side gates in every gap between pairs (and between the last pair and the pub forecourt)
    for (const [a, b] of [[2276, 2281], [2293, 2298], [2311, 2312], [2324, 2326]]) { AB(0x6b4a2e, 0.12, 1.8, b - a, FE + 0.4, (a + b) / 2, 0.9); AB(0x5a3c24, 0.14, 0.1, b - a, FE + 0.4, (a + b) / 2, 1.85); solid(FE + 0.1, a - 0.2, BE, b + 0.2, -9, 9); }
    // low front garden walls with gaps for the paths
    for (const [a, b] of [...rows, [2312, 2324]]) for (const [p, q] of [[a, (a + b) / 2 - 1], [(a + b) / 2 + 1, b]]) AB(0xb8a68a, 0.3, 0.7, q - p, FE - 5.5, (p + q) / 2, 0.35);
    info.beattyRoad = { pairs: rows.length + 1, gapsClosed: 4 }; }

  // ---------- 3. Jellicoe Road bridge over the service lane ----------
  { const N0 = 2680.6, N1 = 2694.6, NC = (N0 + N1) / 2, DW = N1 - N0, DT = 6.4, AW = -70.5, AE = -57.5, RW = 45;
    const hAt = e => e >= AW - 1 && e <= AE + 1 ? DT : e < AW - 1 ? Math.max(0, DT * (1 - (AW - 1 - e) / RW)) : Math.max(0, DT * (1 - (e - AE - 1) / RW));
    parts.push((x, z, y) => { const e = x, n = -z; if (n < N0 || n > N1 || e < AW - 1 - RW || e > AE + 1 + RW) return null; const h = hAt(e); if (h <= 0.02) return null; return foot(y) >= h - 1.1 ? h : null; });
    AB(0x5a5f66, AE - AW + 2.4, 0.8, DW, (AW + AE) / 2, NC, DT - 0.4);                                     // deck slab
    AB(0x3a3d42, AE - AW + 2.4, 0.06, DW - 1, (AW + AE) / 2, NC, DT + 0.02);                               // road surface
    AB(0xd9d9d0, AE - AW + 2.4, 0.04, 0.15, (AW + AE) / 2, NC, DT + 0.06);                                // centre line
    for (const nn of [N0 + 0.2, N1 - 0.2]) { AB(0xb7b2a8, AE - AW + 2.4, 1.1, 0.4, (AW + AE) / 2, nn, DT + 0.55); solid(AW - 1.2, nn - 0.2, AE + 1.2, nn + 0.2, DT - 1.5, 99); }
    for (const ea of [AW, AE]) { AB(0x9c8f7e, 1.6, DT - 0.8, DW + 3, ea, NC, (DT - 0.8) / 2); solid(ea - 0.8, N0 - 1.5, ea + 0.8, N1 + 1.5, -9, DT - 1.2); }
    for (const s of [-1, 1]) for (let k = 0; k < 9; k++) { // embankment ramps: 9 segments per side, solid for walkers well below the surface
      const e0 = s < 0 ? AW - 1 - (k + 1) * RW / 9 : AE + 1 + k * RW / 9, e1 = e0 + RW / 9, h = hAt((e0 + e1) / 2);
      AB(0x6f7a4a, e1 - e0, h, DW + 2, (e0 + e1) / 2, NC, h / 2); AB(0x3a3d42, e1 - e0, 0.06, DW - 1, (e0 + e1) / 2, NC, h + 0.03);
      if (h > 0.9) { solid(e0, N0 - 1, e1, N1 + 1, -9, h - 1.2); for (const nn of [N0 + 0.2, N1 - 0.2]) { AB(0xb7b2a8, e1 - e0, 1.0, 0.3, (e0 + e1) / 2, nn, h + 0.5); solid(e0, nn - 0.2, e1, nn + 0.2, h - 0.8, 99); } } }
    AB(0x4a4d52, 6, 0.05, 90, -63.8, 2687, 0.05);                                                         // the lane underneath
    for (const nn of [N0 - 0.5, N1 + 0.5]) AB(0x2a2a2a, AE - AW - 1.6, 0.5, 0.2, (AW + AE) / 2, nn, DT - 1.0); // soffit shadow edge
    const lb = LBL('JELLICOE ROAD', '#c9d2da', 0.9); const lw = warp((AW + AE) / 2, N1 + 0.5); lb.position.set(lw.x, DT + 1.9, lw.z); S.add(lb);
    info.jellicoe = { deck: DT, span: [AW, AE], under: [-63.8, 2687] }; }

  // ---------- 4. Seashore Holiday Park & Seafront sign (North Drive, by the north entrance) ----------
  { const e = 205, n = 3070, c = document.createElement('canvas'); c.width = 1024; c.height = 384; const x = c.getContext('2d');
    x.fillStyle = '#0d3b66'; x.fillRect(0, 0, 1024, 384); x.fillStyle = '#ffd23f'; x.fillRect(0, 300, 1024, 20); x.fillStyle = '#ffffff'; x.textAlign = 'center';
    x.font = 'bold 92px system-ui,sans-serif'; x.fillText('SEASHORE', 512, 120); x.font = 'bold 58px system-ui,sans-serif'; x.fillText('HOLIDAY PARK & SEAFRONT', 512, 215);
    x.font = '34px system-ui,sans-serif'; x.fillStyle = '#ffd23f'; x.fillText('NORTH DENES · GREAT YARMOUTH', 512, 365);
    const tex = new T.CanvasTexture(c); if (T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
    const p = warp(e, n), board = new T.Mesh(new T.PlaneGeometry(6.4, 2.4), new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide, fog: false }));
    board.position.set(p.x - 0.12, 2.6, p.z); board.rotation.y = -Math.PI / 2; grp.add(board); // faces west, onto North Drive
    AB(0xf2f2f2, 0.2, 2.7, 6.8, e + 0.08, n, 2.6); for (const dn of [-3.3, 3.3]) { AB(0xdfe3e6, 0.25, 3.9, 0.25, e + 0.1, n + dn, 1.95); solid(e - 0.2, n + dn - 0.2, e + 0.4, n + dn + 0.2, -9, 9); }
    AB(0x5a8a3c, 2.5, 0.06, 9, e + 0.5, n, 0.05);
    info.seashoreSign = [e, n]; }

  // ---------- 5. Scroby Sands wind farm (OSM generator:source=wind nodes) ----------
  const rotors = [];
  { const P = [[3243, 2856], [2736, 2861], [2793, 3236], [3293, 3231], [3843, 3218], [2850, 3601], [3347, 3598], [3852, 3586], [3411, 3971], [3912, 3957], [3972, 4330],
      [2868, 6213], [3362, 6195], [3863, 6199], [4277, 6200], [4217, 5820], [3810, 5825], [3372, 5836], [2932, 5836], [3006, 5464], [3618, 5450], [4058, 5447],
      [4112, 5084], [3084, 5087], [3026, 4723], [3438, 4768], [3954, 4716], [3421, 4334], [2967, 4346], [2909, 3969]];
    const HUB = 60, BL = 40, bm = new T.MeshBasicMaterial({ color: 0xf2f4f6, fog: false });
    const blade = new T.BoxGeometry(2.2, BL, 0.5).translate(0, BL / 2, 0), bg = []; for (let k = 0; k < 3; k++) bg.push(blade.clone().rotateZ(k * 2.094).toNonIndexed());
    const rg = mergeGeo(T, bg);
    for (const [e, n] of P) { const p = warp(e, n), tw = new T.CylinderGeometry(1.6, 2.4, HUB, 8).toNonIndexed(); tw.translate(p.x, HUB / 2, p.z); put(0xe9ecef, tw);
      AB(0xe9ecef, 3, 3, 8, e, n, HUB, Math.PI / 2); AB(0xf0c419, 5, 0.3, 5, e, n, 0.5); // nacelle (facing the shore), yellow transition piece
      const r = new T.Mesh(rg, bm); r.position.set(p.x - 4.4, HUB, p.z); r.rotation.y = Math.PI / 2; r.rotation.z = Math.random() * 6.28; grp.add(r); rotors.push(r); }
    const lb = LBL('SCROBY SANDS WIND FARM', '#e6f2ff', 18); const lw = warp(3300, 3400); lb.position.set(lw.x, 120, lw.z); S.add(lb);
    info.turbines = P.length; }

  for (const [hex, gs] of MB) { const m = new T.Mesh(mergeGeo(T, gs), new T.MeshBasicMaterial({ color: hex, fog: hex !== 0xe9ecef })); grp.add(m); } // turbines (0xe9ecef) skip fog so they read offshore
  info.drawCalls = MB.size + rotors.length + 1; fx.v63Info = info;
  return { update(t, dt) { if (!LITE) for (const r of rotors) r.rotation.z += dt * 1.6; } };
}
function mergeGeo(T, gs) { let n = 0; for (const g of gs) n += g.attributes.position.count; const a = new Float32Array(n * 3); let o = 0;
  for (const g of gs) { a.set(g.attributes.position.array, o); o += g.attributes.position.count * 3; }
  const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(a, 3)); out.computeBoundingSphere(); return out; }
