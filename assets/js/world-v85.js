/* JHIOS world v85 — Joseph's 11 aerials (2026-11-03) + OSM geo pass (preview only, live stays ?v=81).
   Data: /assets/data/v85-geo.json baked from the Geofabrik Norfolk extract (© OpenStreetMap contributors, ODbL). Notes: /workspace/geo-ref/aerials-2026-11-03/ADJUST-v85.md
   1. Observation / Giant Wheel moved to OSM node 9160612437 (52.60099,1.73674, gardens between Sea Life and Marina Centre, aerials 2+9); plinth float removed,
      solid white rim + A-frame legs + boarding deck (revert: window.IE_V85_WHEEL_OLD=true keeps the v42 Pleasure Beach spot).
   2. Joyland (OSM way 175853187): tarmac yard, Spook Express castle, green Snail mountain, tokens booth, JOYLAND fascia (aerials 2+11). IE_V85_JOYLAND=false to drop.
   3. Venetian Waterways: 7 OSM islets as raised grass islands, 8 OSM footbridges, thatched shelters on the OSM huts (aerial 8); fx.js wire loop gated (IE_V85_WATERWAYS_WIRE=true restores).
   4. Marine Parade by Anchor Gardens: the 4 OSM white canopy bus shelters (ways 959752751-754), Frylys Desserts kiosk sign, flower anchor bed (aerial 10).
   5. Nelson's Monument / Norfolk Naval Pillar (OSM 201845724 + lawn 201845723): fluted Doric column, caryatid drum lit green, Britannia + trident, railed lawn,
      replaces v69 stand-in + fx wire column (IE_V85_NELSON_OLD=true restores both) (aerial 4).
   Tiers: L0 LOOK = massing only; L1 SOLID = + collision, signs, shelters, bridges; L2 RICH = + thatch, statues, anchor bed. */
export function initV85({ T, S, LBL, LITE, warp, fx }) {
  const info = { wheel: 0, joyland: 0, islets: 0, bridges: 0, huts: 0, shelters: 0, nelson: 0 }; fx.v85Info = info; window.__fx85 = info;
  const DET = window.__detail ?? (LITE ? 0 : 1), L1 = DET >= 1, L2 = DET >= 2;
  const grp = new T.Group(); grp.name = 'v85'; S.add(grp);
  const MC = new Map(); const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!MC.has(k)) MC.set(k, new T.MeshBasicMaterial(Object.assign({ color: c }, o))); return MC.get(k); };
  const mesh = (g, c, o) => { const m = new T.Mesh(g, mat(c, o)); grp.add(m); return m; };
  const box = (c, w, h, d, e, n, y, ry = 0) => { const p = warp(e, n); const m = mesh(new T.BoxGeometry(w, h, d), c); m.position.set(p.x, y, p.z); m.rotation.y = ry; return m; };
  const cyl = (c, r0, r1, h, e, n, y, seg = 16, o) => { const p = warp(e, n); const m = mesh(new T.CylinderGeometry(r0, r1, h, seg), c, o); m.position.set(p.x, y, p.z); return m; };
  const slab = (pts, c, y, h = 0.2) => { const s = new T.Shape(pts.map(([e, n]) => { const p = warp(e, n); return new T.Vector2(p.x, -p.z); })); const g = new T.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return mesh(g, c); };
  const solid = (e, n, w, d, ylo = -1, yhi = 99) => { if (L1 && fx.addSolid) fx.addSolid([[e - w / 2, n - d / 2], [e + w / 2, n - d / 2], [e + w / 2, n + d / 2], [e - w / 2, n + d / 2]], ylo, yhi); };
  const board = (text, w, h, e, n, y, ry, bg, fg, fs = 0.6) => { const c = document.createElement('canvas'); c.width = 512; c.height = Math.max(64, Math.round(512 * h / w)); const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; const ls = String(text).split('\n'); const px = Math.floor(c.height * fs / ls.length);
    ls.forEach((l, i) => { let s = px; g.font = `bold ${s}px Arial, sans-serif`; while (g.measureText(l).width > c.width * 0.92 && s > 8) g.font = `bold ${--s}px Arial, sans-serif`; g.fillText(l, c.width / 2, c.height * (i + 0.5) / ls.length); });
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), side: T.DoubleSide })); const p = warp(e, n); m.position.set(p.x, y, p.z); m.rotation.y = ry; grp.add(m); return m; };
  const W_ = -Math.PI / 2; // board facing west (Marine Parade side)
  fetch('/assets/data/v85-geo.json?v=107').then(r => r.json()).then(D => {
    const run = (k, f) => { try { f(); } catch (e) { console.warn('v85 ' + k, e); info[k + 'Err'] = String(e); } };
    run('wheel', () => wheel(D)); if (window.IE_V85_JOYLAND !== false) run('joyland', () => joyland(D)); run('waterways', () => waterways(D)); run('parade', () => parade(D)); if (window.IE_V85_NELSON_OLD !== true) run('nelson', () => nelson(D));
    grp.traverse(o => { if (o.isMesh && !o.userData.hit) o.raycast = () => {}; });
  }).catch(e => { info.err = String(e); });

  function wheel(D) { if (window.IE_V85_WHEEL_OLD === true) return; const go = (k = 0) => { const wg = fx.wheelGrp, wh = fx.wheel; if (!wg || !wh) { if (k < 40) setTimeout(() => go(k + 1), 500); return; }
      const rim = wh.children[0], r = rim && rim.geometry ? Math.hypot(rim.geometry.attributes.position.getX(0), rim.geometry.attributes.position.getY(0)) : 20;
      const [e, n] = D.wheel, p = warp(e, n), hub = r + 3.2; wg.position.set(p.x, hub, p.z); wg.rotation.y = Math.PI / 2; // plane runs N-S, faces the parade + beach (aerial 9)
      (fx.clear || (fx.clear = [])).push([p.x, p.z, 26]);
      const white = mat(0xf4f6f8); wh.add(new T.Mesh(new T.TorusGeometry(r, 0.38, 6, 64), white)); if (L1) wh.add(new T.Mesh(new T.TorusGeometry(r * 0.94, 0.16, 4, 64), white));
      const legs = new T.Group(); for (const dz of [-2.6, 2.6]) for (const s of [-1, 1]) { const top = new T.Vector3(0, 0, dz), foot = new T.Vector3(s * r * 0.55, -hub, dz * 2.2), L = top.distanceTo(foot);
        const g = new T.CylinderGeometry(0.45, 0.7, L, 8); const m = new T.Mesh(g, white); m.position.copy(top).add(foot).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), foot.clone().sub(top).normalize()); legs.add(m); }
      const axle = new T.Mesh(new T.CylinderGeometry(1.1, 1.1, 6, 12), mat(0xc9ced4)); axle.rotation.x = Math.PI / 2; legs.add(axle); wg.add(legs);
      slab([[e - 7, n - 9], [e + 7, n - 9], [e + 7, n + 9], [e - 7, n + 9]], 0x6f7378, 0, 0.35); if (L1) { box(0x2d4f8a, 6, 3, 4, e - 5, n - 8, 1.5); board('GIANT WHEEL', 6, 0.9, e - 8.05, n - 8, 2.4, W_, '#1c3f7a', '#ffffff'); solid(e - 5, n - 8, 6, 4); }
      for (const s of [-1, 1]) solid(e + 0, n + s * r * 0.55, 2.4, 6.5); info.wheel = 1; }; go(); }

  function joyland(D) { slab(D.joyland, 0x4a4d52, 0.03, 0.06); // yard tarmac
    // Spook Express castle (lilac walls, teal turret cones) by the entrance, green Snail mountain behind (aerial 11)
    box(0xb79ac9, 11, 7, 8, 63, 484, 3.5); for (const [de, dn] of [[-5.5, -4], [5.5, -4], [-5.5, 4], [5.5, 4]]) { cyl(0xc7a9d8, 1.3, 1.3, 9, 63 + de, 484 + dn, 4.5, 10); cyl(0x1f9a8a, 0, 1.7, 3, 63 + de, 484 + dn, 10.5, 10); }
    cyl(0x6a3d2a, 2.6, 3.2, 3.6, 60.8, 481, 1.8, 12); // rock arch entrance
    cyl(0x58ad3c, 2.2, 8.5, 14, 80, 489, 7, 18); cyl(0x6cc24a, 0, 2.4, 2.5, 80, 489, 15.2, 12); cyl(0xd94a3a, 1.6, 1.6, 0.6, 76, 486, 3.1, 14); // mountain + red rail band
    solid(63, 484, 11, 8); solid(80, 489, 13, 13);
    if (L1) { box(0x1f5e3a, 4.5, 3, 3.5, 92, 481, 1.5); board('GET YOUR TOKENS HERE', 4.5, 1.1, 89.7, 481, 3.6, W_, '#1f5e3a', '#ffe36b');
      board('SPOOK EXPRESS\nEntrance', 6, 1.6, 57.4, 484, 7.6, W_, '#7a3fa0', '#ffe9a8', 0.55); board('JOYLAND', 9, 1.6, 99.6, 499, 6.8, W_, '#d2232a', '#ffffff', 0.7); solid(92, 481, 4.5, 3.5); }
    if (L2) { cyl(0xf2c94c, 2.4, 2.4, 0.4, 95, 494, 4, 20).rotation.z = Math.PI / 2; cyl(0x3b7d2c, 0.8, 1.1, 3.2, 70, 478, 1.6, 8); cyl(0xb5651d, 0.7, 0.9, 2.4, 73, 479, 1.2, 8); cyl(0x8fd16a, 0.6, 0.8, 2.2, 86, 480, 1.1, 8); } // snail swirl, character statues
    info.joyland = 1; }

  function waterways(D) { for (const p of D.islets) { slab(p, 0x5f8f43, 0, 0.35); info.islets++; }
    (window.__groundParts = window.__groundParts || []).push((x, z) => { const e = x, n = -z; for (const p of D.islets) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[i], b = p[j]; if ((a[1] > n) !== (b[1] > n) && e < (b[0] - a[0]) * (n - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } if (c) return 0.35; } return null; });
    if (L1) for (const b of D.bridges) { const [a, c] = [b[0], b[b.length - 1]], L = Math.hypot(c[0] - a[0], c[1] - a[1]) + 2, ry = Math.atan2(c[0] - a[0], c[1] - a[1]), e = (a[0] + c[0]) / 2, n = (a[1] + c[1]) / 2;
      box(0xe8e2d0, 2.2, 0.35, L, e, n, 0.75, ry); for (const s of [-1, 1]) box(0xf2eee2, 0.15, 0.8, L, e + s * 1.05 * Math.cos(ry), n - s * 1.05 * Math.sin(ry), 1.3, ry); info.bridges++; }
    for (const [e, n] of D.huts) { box(0xd8cfb8, 3.2, 2.4, 3.2, e, n, 1.2); cyl(L2 ? 0x8a6a3a : 0x6b5a45, 0.3, 3.4, 2.6, e, n, 3.7, L2 ? 14 : 6); info.huts++; } // thatched cone shelters (aerial 8)
    if (window.IE_V85_WATERWAYS_WIRE !== true && fx.wwWire) fx.wwWire.visible = false; }

  function parade(D) { if (!L1 && window.IE_V86_SHELTER_L0 === false) return; /* v86: canopies show at L0 too */ for (const p of D.shelters) { let e0 = 1e9, e1 = -1e9, n0 = 1e9, n1 = -1e9; for (const [e, n] of p) { e0 = Math.min(e0, e); e1 = Math.max(e1, e); n0 = Math.min(n0, n); n1 = Math.max(n1, n); }
      const e = (e0 + e1) / 2, n = (n0 + n1) / 2, len = n1 - n0, wid = e1 - e0, q = warp(e, n);
      const g = new T.CylinderGeometry(wid * 0.75, wid * 0.75, len, 14, 1, true, -Math.PI * 0.32, Math.PI * 0.64); g.rotateX(-Math.PI / 2); const m = mesh(g, 0xf7f7f4, { side: T.DoubleSide }); m.scale.y = 0.3; m.position.set(q.x, 3.0 - wid * 0.75 * 0.3, q.z); // v105: arc now faces UP (was hanging ~4 m below ground); crown 3.0 m, eaves ~2.5 m
      for (const dn of [-len / 2 + 0.6, len / 2 - 0.6]) box(0xdfe3e6, 0.18, 3.0, 0.18, e + wid * 0.35, n + dn, 1.5); if (L2) box(0x5a4632, wid * 0.6, 0.12, 0.45, e + wid * 0.2, n, 0.5); info.shelters++; }
    // v107: Marine Parade WEST frontage south→north (Leisureland, Empire, Gold Rush, Magic City, Cash Casino) — real low-poly building mass + fascia (not floating boards alone). Joyland untouched.
    if (window.IE_V105_STRIP !== false) {
      const strip = [
        ['LEISURELAND', 296, 12, 7.2, 9, 0xd8262e, '#d8262e', '#ffe14a', 4.6],
        ['THE EMPIRE', 307, 9, 10.5, 8, 0xc9b48a, '#c9b48a', '#3a2d1c', 8.8],
        ['GOLD RUSH', 321, 10, 7.0, 9, 0x1a1a1a, '#1a1a1a', '#ffcc33', 4.4],
        ['MAGIC CITY', 335, 10, 7.0, 9, 0x3a1a6a, '#3a1a6a', '#ffdf5a', 4.4],
        ['CASH CASINO', 350, 11, 7.4, 9, 0xe8107a, '#e8107a', '#ffffff', 4.4],
      ];
      for (const [name, n, wn, bh, depth, col, bg, fg, sy] of strip) {
        const eC = 10.2 - depth / 2; // mass sits west of Marine Parade kerb; fascia on east face
        box(col, depth, bh, wn, eC, n, bh / 2); // L0 massing
        box(0x2a2e34, depth + 0.3, 0.35, wn + 0.3, eC, n, bh + 0.15); // flat roof slab
        if (L1) {
          board(name, Math.min(wn - 0.6, 11), Math.max(1.1, bh * 0.18), 10.25, n, sy, Math.PI / 2, bg, fg);
          solid(eC, n, depth, wn, -1, bh + 1);
          // simple ground arcade glazing strip
          box(0x88c8e8, 0.2, Math.min(3.2, bh * 0.45), wn - 1.2, 10.15, n, Math.min(2.0, bh * 0.28));
        }
        if (L2) {
          for (let i = 0; i < 3; i++) box(0x1a1d22, 0.15, 1.2, 1.6, 10.18, n - wn * 0.28 + i * (wn * 0.28), bh * 0.62); // upper windows
        }
        info.strip = (info.strip || 0) + 1;
      }
      info.stripMass = 1;
    }
    box(0x2a2f36, 0.2, 1.1, 7.5, 38.8, 387.5, 3.4); board("FRYLY'S DESSERTS · CHIPS", 7.4, 1.0, 38.65, 387.5, 3.4, W_, '#2a2f36', '#f6d36b', 0.55);
    if (L2) { const R = 0xc4122f; box(R, 1.2, 0.25, 14, 54, 352, 0.15); box(R, 9, 0.25, 1.2, 54, 357, 0.15); const a = cyl(R, 5, 5, 0.25, 54, 346, 0.15, 24); a.scale.set(1, 1, 0.35); cyl(0xf0e9da, 1.4, 1.4, 0.26, 54, 360, 0.16, 16); } } // anchor bed

  function nelson(D) { const [e, n] = D.monument; slab(D.monument_lawn, 0x3f7a35, 0, 0.12);
    box(0x8b8780, 9.5, 1.2, 9.5, e, n, 0.6); box(0x9b978e, 7.2, 5.4, 7.2, e, n, 3.9); box(0xa29e95, 5.4, 2.2, 5.4, e, n, 7.7); // stepped plinth + pedestal + die
    cyl(0xaaa69c, 1.45, 1.75, 26, e, n, 21.8, L1 ? 20 : 12); box(0xa29e95, 4.2, 1.1, 4.2, e, n, 35.4); // fluted Doric shaft + abacus
    cyl(0x39ff8a, 1.5, 1.5, 3.2, e, n, 37.6, 12, { fog: false }); // gallery lit green at night (aerial 4)
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; cyl(0xb2ad9f, 0.32, 0.32, 3.2, e + Math.cos(a) * 1.95, n + Math.sin(a) * 1.95, 37.6, 6); } // caryatids
    cyl(0x9b978e, 2.3, 2.3, 0.6, e, n, 39.5, 14); cyl(0x8d897f, 0.4, 1.8, 1.2, e, n, 40.4, 14); const gl = cyl(0xc7b37a, 0.9, 0.9, 1.6, e, n, 41.6, 10); gl.scale.set(1, 1, 1);
    cyl(0xc7b37a, 0.35, 0.5, 2.3, e, n, 43.4, 8); cyl(0xc7b37a, 0.28, 0.28, 0.5, e, n, 44.8, 8); box(0xc7b37a, 0.09, 3.6, 0.09, e + 0.7, n, 44, 0); box(0xc7b37a, 0.7, 0.09, 0.09, e + 0.7, n, 45.7); // Britannia, trident
    solid(e, n, 9.5, 9.5);
    if (L1) { let e0 = 1e9, e1 = -1e9, n0 = 1e9, n1 = -1e9; for (const [a, b] of D.monument_lawn) { e0 = Math.min(e0, a); e1 = Math.max(e1, a); n0 = Math.min(n0, b); n1 = Math.max(n1, b); }
      const K = 0x1d1f22, cE = (e0 + e1) / 2, cN = (n0 + n1) / 2; box(K, e1 - e0, 0.08, 0.08, cE, n0, 1.05); box(K, e1 - e0, 0.08, 0.08, cE, n1, 1.05); box(K, 0.08, 0.08, n1 - n0, e0, cN, 1.05); box(K, 0.08, 0.08, n1 - n0, e1, cN, 1.05);
      for (let t = 0; t <= 1.001; t += 0.05) { box(K, 0.05, 1.1, 0.05, e0 + (e1 - e0) * t, n0, 0.55); box(K, 0.05, 1.1, 0.05, e0 + (e1 - e0) * t, n1, 0.55); box(K, 0.05, 1.1, 0.05, e0, n0 + (n1 - n0) * t, 0.55); box(K, 0.05, 1.1, 0.05, e1, n0 + (n1 - n0) * t, 0.55); } }
    info.nelson = 1; }
  return { info };
}
