/* JHIOS world v65 — public venues + street furniture (all from OSM; public venue names only, nothing at private homes).
   1. Royal Assembly Rooms, Albert Square (Great Yarmouth Masonic Association's hall; OSM way 176978199 "Lodge of Friendship No. 100"):
      solid footprint + pale classical portico on the Albert Square (east) front. Beside it a small steel floor hatch with a plate reading
      "JHIOS // VERSIONS OF REALITY · FICTION": a story prop, not a real facility and not CERN's.
   2. Market Gates (OSM ways 175506393, 679011648-50, multistorey 175606432): solid footprints, an entrance gateway with a MARKET GATES board over
      the pedestrian entrance (OSM way 1549406097), bus station stand flags + two parked single-deck buses in a generic First-style livery (no logos).
   3. The Troll Cart pub (OSM way 175596035): solid footprint + hanging pub sign.
   4. Bus stop flags at every OSM highway=bus_stop node in the core (138).
   5. Beach campfire scaffold on North Denes beach (stone ring, logs, flame, log benches) for the Dance Of The Ancients screens. No captions. */
export function initV65(o) {
  const { T, S, LBL, LITE, warp, fx } = o, grp = new T.Group(); grp.name = 'v65'; S.add(grp);
  const MB = new Map(), info = {};
  const put = (hex, g) => { (MB.get(hex) || MB.set(hex, []).get(hex)).push(g.index ? g.toNonIndexed() : g); };
  const AB = (hex, w, h, d, e, n, y, ry = 0) => { const g = new T.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); const p = warp(e, n); g.translate(p.x, y, p.z); put(hex, g); };
  const CY = (hex, r0, r1, h, e, n, y, seg = 10) => { const g = new T.CylinderGeometry(r0, r1, h, seg); const p = warp(e, n); g.translate(p.x, y, p.z); put(hex, g); };
  const solidP = pts => fx.addSolid && fx.addSolid(pts.slice(0, -1));
  const board = (txt, w, h, e, n, y, ry, bg = '#111', fg = '#f4f1e8') => { const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w);
    const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.fillStyle = fg; g.font = `bold ${Math.round(c.height * 0.5)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = Math.round(c.height * 0.5); while (g.measureText(txt).width > c.width * 0.92 && fs > 10) { fs -= 4; g.font = `bold ${fs}px Georgia, serif`; } g.fillText(txt, c.width / 2, c.height / 2);
    const tx = new T.CanvasTexture(c); if (T.SRGBColorSpace) tx.colorSpace = T.SRGBColorSpace;
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tx, side: T.DoubleSide })); const p = warp(e, n); m.position.set(p.x, y, p.z); m.rotation.y = ry; grp.add(m); return m; };
  const E = Math.PI / 2; // a plane facing +x (east) uses ry = +pi/2

  // 1. Royal Assembly Rooms + fiction hatch
  { const LODGE = [[-134.1,-467.3],[-142.5,-466.5],[-142.6,-467.3],[-152.0,-466.4],[-152.2,-467.7],[-157.6,-467.1],[-157.0,-460.7],[-151.4,-461.3],[-150.9,-455.6],[-154.4,-455.2],[-153.8,-449.5],[-145.3,-450.3],[-145.1,-447.7],[-144.4,-440.1],[-132.4,-441.3],[-132.0,-436.6],[-127.2,-437.0],[-127.1,-435.9],[-122.7,-436.3],[-121.8,-436.4],[-121.9,-437.0],[-116.7,-437.5],[-117.3,-443.4],[-114.0,-443.7],[-115.5,-459.2],[-118.5,-458.9],[-119.3,-466.9],[-121.4,-466.7],[-129.1,-466.0],[-129.2,-467.1],[-134.0,-466.6],[-134.1,-467.3]]; solidP(LODGE);
    const fe = -121.2, n0 = -458, n1 = -438, nc = (n0 + n1) / 2;
    AB(0xe8e2d3, 4.2, 0.6, n1 - n0 + 1, fe + 2.1, nc, 9.2); // entablature
    for (let i = 0; i < 6; i++) { const n = n0 + 1 + i * (n1 - n0 - 2) / 5; CY(0xf1ece0, 0.42, 0.48, 8.6, fe + 3.6, n, 4.6); }
    { const g = new T.BufferGeometry(), p = warp(fe + 4.2, n0), q = warp(fe + 4.2, n1), m = warp(fe + 4.2, nc), y0 = 9.5, y1 = 12;
      g.setAttribute('position', new T.Float32BufferAttribute([p.x, y0, p.z, q.x, y0, q.z, m.x, y1, m.z], 3)); put(0xe8e2d3, g); } // pediment
    AB(0xd9d3c4, 5, 0.3, n1 - n0, fe + 2.5, nc, 0.15); for (let s = 0; s < 3; s++) AB(0xcfc9b9, 0.5, 0.15 * (3 - s), n1 - n0 - 4, fe + 5 + s * 0.5, nc, 0.075 * (3 - s)); // steps
    board('ROYAL ASSEMBLY ROOMS', 12, 1.1, fe + 4.3, nc, 8.4, E, '#1c2330', '#e9dfc4');
    const he = fe + 9, hn = n0 - 6; AB(0x55606b, 2.6, 0.25, 2.6, he, hn, 0.12); AB(0x8a96a3, 2.2, 0.08, 2.2, he, hn, 0.29); AB(0x2f3740, 0.15, 0.1, 1.4, he + 0.6, hn, 0.38);
    board('JHIOS // VERSIONS OF REALITY · FICTION', 2.4, 0.3, he, hn - 1.45, 0.7, 0, '#06140c', '#3dff9a'); CY(0x2f3740, 0.04, 0.04, 0.7, he - 1.1, hn - 1.45, 0.35, 6); CY(0x2f3740, 0.04, 0.04, 0.7, he + 1.1, hn - 1.45, 0.35, 6);
    info.lodge = [fe, nc]; info.hatch = [he, hn]; }

  // 2. Market Gates
  { for (const P of [[[-506.1,462.6],[-503.5,433.8],[-501.7,414.7],[-501.3,411.5],[-505.0,410.4],[-507.5,409.5],[-510.5,408.4],[-513.4,408.6],[-519.5,409.5],[-524.4,409.9],[-531.4,408.9],[-538.6,406.7],[-545.4,404.5],[-548.9,415.2],[-544.4,416.6],[-546.6,423.5],[-542.3,424.9],[-543.6,448.3],[-546.1,448.0],[-546.2,449.7],[-548.7,474.4],[-557.3,473.3],[-557.6,475.3],[-554.7,487.1],[-521.0,489.5],[-518.4,461.7],[-506.1,462.6]], [[-521.0,489.5],[-524.6,531.8],[-507.3,532.6],[-490.4,534.0],[-466.2,529.1],[-465.4,522.5],[-463.5,522.6],[-462.7,515.8],[-457.9,467.7],[-488.8,464.7],[-501.2,463.3],[-506.1,462.6],[-518.4,461.7],[-521.0,489.5]], [[-557.6,475.3],[-562.1,476.8],[-563.4,477.9],[-560.6,462.3],[-559.5,451.7],[-562.8,451.6],[-572.3,447.1],[-574.9,451.6],[-590.6,444.7],[-593.5,445.8],[-595.5,450.6],[-600.5,452.0],[-612.4,476.7],[-617.1,478.8],[-618.7,479.6],[-627.3,515.6],[-610.3,519.7],[-595.1,523.1],[-593.3,512.9],[-572.2,517.4],[-570.0,508.7],[-568.1,508.9],[-559.1,509.7],[-554.7,487.1],[-557.6,475.3]], [[-559.1,509.7],[-561.3,531.1],[-524.9,534.1],[-524.6,531.8],[-521.0,489.5],[-554.7,487.1],[-559.1,509.7]], [[-397.9,478.0],[-402.8,477.4],[-414.5,475.9],[-414.6,473.0],[-419.3,472.6],[-419.5,471.5],[-457.9,467.7],[-462.7,515.8],[-450.9,516.8],[-416.4,519.7],[-415.6,508.6],[-412.6,508.5],[-412.2,504.2],[-406.1,504.9],[-400.4,505.6],[-397.9,478.0]]]) solidP(P);
    const ge = -628, gn = 528; for (const dn of [-4.5, 4.5]) AB(0x2c3138, 0.6, 6.5, 0.6, ge, gn + dn, 3.25);
    AB(0x2c3138, 0.8, 1.6, 10.2, ge, gn, 6.9); board('MARKET GATES', 9.4, 1.2, ge - 0.42, gn, 6.9, -E, '#0d3b66', '#ffffff'); board('MARKET GATES', 9.4, 1.2, ge + 0.42, gn, 6.9, E, '#0d3b66', '#ffffff');
    for (const [e, n] of [[-546.2, 381.8], [-503.5, 433.8], [-493.6, 444.3], [-513.3, 483.4], [-500.0, 493.4], [-484.7, 465.4]]) { AB(0xd8dde3, 0.2, 2.2, 3.2, e + 1.6, n, 2.4); AB(0xbfe4ff, 0.06, 2, 3.2, e + 1.6, n, 1.1); }
    const bus = (e, n, ry) => { AB(0xf4f4f6, 2.55, 2.4, 11.2, e, n, 1.9, ry); AB(0x5b2a86, 2.6, 0.55, 11.25, e, n, 0.55, ry); AB(0xe2457a, 2.6, 0.18, 11.25, e, n, 0.93, ry);
      AB(0x1b2430, 2.62, 0.9, 10.2, e, n, 2.3, ry); AB(0x1b2430, 2.3, 1.2, 0.05, e + Math.sin(ry) * 5.62, n + Math.cos(ry) * 5.62, 2.2, ry); AB(0x111111, 2.4, 0.25, 0.4, e, n, 3.0 + 0.15, ry); };
    bus(-490.5, 452, 0.05); bus(-506.5, 476, 0.2); fx.addSolid && fx.addSolid([[-491.8, 446.4], [-489.2, 446.4], [-489.2, 457.6], [-491.8, 457.6]]); fx.addSolid && fx.addSolid([[-507.8, 470.4], [-505.2, 470.4], [-505.2, 481.6], [-507.8, 481.6]]);
    info.marketGates = [ge, gn]; info.buses = 2; }

  // 3. The Troll Cart
  { const TC = [[-462.9,416.1],[-475.1,415.0],[-475.5,415.0],[-477.4,435.9],[-479.4,458.3],[-466.7,459.5],[-465.5,446.3],[-460.1,446.5],[-458.0,422.6],[-463.4,422.1],[-463.0,418.1],[-462.9,416.1]]; solidP(TC); const e = -456.6, n = 437; CY(0x2b2b2b, 0.06, 0.06, 1.4, e + 0.7, n, 4.6, 6); AB(0x2b2b2b, 1.6, 0.08, 0.08, e + 0.8, n, 5.2);
    board('THE TROLL CART', 1.5, 1.0, e + 1.5, n, 4.6, 0, '#3a1d12', '#f2d38a'); board('THE TROLL CART', 1.5, 1.0, e + 1.5, n + 0.02, 4.6, Math.PI, '#3a1d12', '#f2d38a'); info.trollCart = [e, n]; }

  // 4. bus stop flags (OSM highway=bus_stop)
  { const ST = [[-738.6,-1477.5],[-745.0,-1462.6],[-493.6,444.3],[-402.8,-500.1],[-402.3,-762.5],[-392.2,-779.0],[-397.5,-985.9],[-388.6,-961.4],[-327.1,-1433.3],[-1341.5,354.6],[-1331.4,357.1],[-1206.6,375.7],[-1220.5,357.4],[-1110.0,292.6],[-1124.5,320.4],[-1262.3,185.3],[-873.0,-380.6],[-751.9,-840.5],[-763.9,-1218.0],[-776.7,-1116.0],[-763.2,-846.7],[-930.9,-167.3],[-1023.8,84.8],[-1332.5,-1177.9],[-1322.7,-1219.4],[207.0,3192.1],[189.4,3083.9],[169.0,2749.5],[162.3,2562.6],[107.9,2342.2],[123.8,2340.3],[108.6,2083.8],[119.9,2168.3],[99.9,1709.0],[111.7,1753.0],[91.8,1355.7],[105.7,1354.0],[88.9,1147.7],[95.0,1070.2],[64.3,805.4],[75.4,730.7],[8.6,288.6],[25.6,270.7],[-4.1,89.4],[7.0,56.9],[-19.5,-80.4],[-6.8,-149.3],[-32.2,-384.2],[-47.6,-392.4],[-43.2,-693.0],[-64.5,-698.9],[-836.0,-457.6],[-676.9,-6.2],[-671.7,-80.6],[-385.4,-1285.0],[-177.8,-1113.6],[-221.9,814.3],[-212.0,831.8],[-302.4,727.3],[-932.2,-193.3],[-210.2,2606.0],[-472.4,688.7],[-365.3,-83.5],[-231.2,615.5],[202.2,3029.3],[-245.9,-1195.2],[-1440.0,1741.5],[-1468.7,-97.4],[-1466.1,-106.5],[-1439.5,-35.8],[31.4,477.9],[-566.9,363.6],[-484.7,465.4],[-1054.0,991.6],[-1074.6,-668.5],[-546.2,381.8],[-685.0,689.1],[-1159.1,1046.1],[-75.0,-901.6],[-226.1,2606.9],[19.8,606.4],[-573.7,3133.6],[-558.1,3086.7],[-185.0,1432.2],[-577.7,2766.3],[-590.0,2758.9],[-600.4,2501.1],[-590.6,2458.6],[-598.2,2174.6],[-616.0,2159.5],[-574.8,1854.9],[-582.6,1839.3],[-540.7,1625.9],[-585.2,1440.9],[-594.3,1323.2],[-622.7,1256.6],[-633.4,1127.0],[-725.6,927.5],[-676.4,874.9],[-207.2,2200.3],[-218.5,2387.2],[-226.3,2198.3],[-167.3,2024.0],[-55.1,-961.7],[-173.7,1844.1],[-176.8,1783.2],[-216.0,1644.1],[-222.3,1656.4],[-494.1,1675.5],[-500.0,493.4],[-513.3,483.4],[-96.5,-1338.0],[-503.5,433.8],[-886.3,484.3],[-807.9,609.4],[-970.5,770.0],[-808.7,323.0],[-418.3,-66.7],[-467.4,181.2],[-445.3,-47.3],[-490.5,148.4],[-228.6,106.7],[-379.6,-264.0],[-374.0,-269.2],[-438.8,-406.1],[-460.8,2687.1],[-401.8,2708.1],[-1295.1,-548.0],[-1222.3,226.3],[-1015.0,275.6],[-226.9,2401.8],[-176.6,802.9],[-167.2,2008.0],[-976.3,501.9],[-196.0,1431.7],[-372.8,-1177.5],[-1451.3,10.7],[-96.9,-129.5]]; for (const [e, n] of ST) { CY(0x8a9097, 0.05, 0.05, 2.8, e, n, 1.4, 6); AB(0x1f7a4d, 0.06, 0.45, 0.6, e, n + 0.32, 2.55); AB(0xf6f6f6, 0.07, 0.12, 0.6, e, n + 0.32, 2.3); }
    info.busStops = ST.length; }

  // 5. North Denes beach campfire
  const flames = [];
  { const e = 420, n = 2650; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; AB(0x77746c, 0.5, 0.35, 0.5, e + Math.cos(a) * 1.5, n + Math.sin(a) * 1.5, 0.18, a); }
    for (let i = 0; i < 4; i++) AB(0x4d3322, 1.7, 0.22, 0.22, e, n, 0.3 + i * 0.05, i * 0.8);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; AB(0x8d6b48, 2.8, 0.5, 0.55, e + Math.cos(a) * 5.5, n + Math.sin(a) * 5.5, 0.25, -a + E); }
    const p = warp(e, n); for (const [c, s, y] of [[0xff7a1a, 1.1, 1.0], [0xffc83a, 0.65, 1.2]]) { const m = new T.Mesh(new T.ConeGeometry(s, 1.8 * s + 0.4, 7), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, toneMapped: false }));
      m.position.set(p.x, y, p.z); grp.add(m); flames.push(m); }
    info.beachCampfire = [e, n]; }

  for (const [hex, gs] of MB) grp.add(new T.Mesh(mergeGeo(T, gs), new T.MeshBasicMaterial({ color: hex, side: T.DoubleSide })));
  info.drawCalls = MB.size + flames.length + 7; fx.v65Info = info;
  return { update(t) { if (LITE) return; flames.forEach((f, i) => { f.scale.y = 1 + 0.18 * Math.sin(t * (7 + i * 3)); f.rotation.y = t * (1 + i); }); } };
}
function mergeGeo(T, gs) { let n = 0; for (const g of gs) n += g.attributes.position.count; const a = new Float32Array(n * 3); let o = 0;
  for (const g of gs) { a.set(g.attributes.position.array, o); o += g.attributes.position.count * 3; }
  const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(a, 3)); out.computeBoundingSphere(); return out; }
