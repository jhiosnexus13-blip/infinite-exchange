/* JHIOS world v80 — realism ladder, first slice (Joseph t963u) + Free Roam v79 grade fixes. Preview only.
   1. Named roads painted ON the tarmac (flat centreline text, repeated along the way) using only real OSM names already in our data:
      North Denes Road (newtown-extra.json north_denes_road.road), Beatty Road + Newtown streets (newtown-streets.json),
      Marine Parade (yarmouth-geo.json golden_mile, the stretch between Wellington and Britannia piers), Jellicoe Road (bridge deck, world-v63 OSM ways).
   2. Barnard Bridge deck walkable (ground part + ramps onto the south bank) + parapet collision, and a "Barnard Bridge" quick jump.
   3. Wellington pier-head pavilion massing enlarged so it reads from the deck spawn.
   4. Detail level L2 RICH extras (window.__detail === 2): a few warm street lights + slightly lighter fog. L0/L1 handled in world.js. */
export function initV80(o) {
  const { T, S, warp, fx, LITE } = o, grp = new T.Group(); grp.name = 'v80'; S.add(grp); const info = { fixes: [], roadLabels: 0 };
  const M = (c, x = {}) => new T.MeshBasicMaterial(Object.assign({ color: c }, x));
  const box = (c, w, h, d, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); grp.add(m); return m; };
  // ---- 1: tarmac road names ----
  const texCache = new Map();
  const roadTex = name => { if (texCache.has(name)) return texCache.get(name); const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const g = c.getContext('2d');
    g.font = 'bold 84px Arial,Helvetica,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(240,240,232,0.92)'; g.fillText(name.toUpperCase(), 512, 66);
    const tx = new T.CanvasTexture(c); tx.anisotropy = 4; tx.repeat.set(0, 0); const r = { tx, w: Math.min(1, (g.measureText(name.toUpperCase()).width + 40) / 1024) }; tx.repeat.set(r.w, 1); tx.offset.set((1 - r.w) / 2, 0); texCache.set(name, r); return r; };
  const paint = (name, pts, y = 0.11, every = LITE ? 220 : 120) => { // pts [[e,n],...]; label lies flat on the centreline, reading along the road
    const { tx, w } = roadTex(name), LEN = 14 * w / 0.6; let acc = every / 2;
    for (let i = 0; i < pts.length - 1; i++) { const a = warp(pts[i][0], pts[i][1]), b = warp(pts[i + 1][0], pts[i + 1][1]), dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz); if (L < 1) continue;
      for (let s = acc; s < L; s += every) { const m = new T.Mesh(new T.PlaneGeometry(LEN, 2.2), M(0xffffff, { map: tx, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
        m.rotation.set(-Math.PI / 2, Math.atan2(-dz, dx), 0, 'YXZ');
        m.position.set(a.x + dx * s / L, y, a.z + dz * s / L); m.renderOrder = 2; grp.add(m); info.roadLabels++; }
      acc = Math.max(0, (acc - L) % every); if (acc <= 0) acc += every; }
  };
  const pairs = a => { const o = []; for (let i = 0; i + 1 < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; };
  fetch('/assets/data/newtown-extra.json?v=80').then(r => r.json()).then(X => { const r = X.north_denes_road && X.north_denes_road.road; if (r && r.length) { paint('North Denes Road', r); info.fixes.push('road:North Denes Road'); } }).catch(e => console.warn('v80 roads', e));
  fetch('/assets/data/newtown-streets.json?v=80').then(r => r.json()).then(X => { for (const [name, segs] of Object.entries(X.roads || {})) for (const s of segs) paint(name, pairs(s), 0.11, 70); info.fixes.push('road:newtown'); }).catch(e => console.warn('v80 roads', e));
  fetch('/assets/data/yarmouth-geo' + (LITE ? '-lite' : '') + '.json?v=80').then(r => r.json()).then(G => { const gm = G.golden_mile; if (!gm) return; // Marine Parade = the seafront road between the piers (n ≈ -490 … +520)
    const mp = pairs(gm.coords).filter(p => p[1] > -490 && p[1] < 520); if (mp.length > 1) { paint('Marine Parade', mp, 0.12, 110); info.fixes.push('road:Marine Parade'); } }).catch(e => console.warn('v80 roads', e));
  paint('Jellicoe Road', [[-70.5, 2689.6], [-57.5, 2689.6]], 6.47, 9); // on the v63 Jellicoe bridge deck (DT 6.4)
  // ---- 2: Barnard Bridge (world-v77: BE -60, BN 2236, 9 m wide, 16 m long along n, road top ~3.76) walkable + south-bank join ----
  { const BE = -60, BN = 2236, TOP = 3.8, HALF = 8, RAMP = 10, gp = window.__groundParts = window.__groundParts || [];
    gp.unshift((x, z) => { const e = x, n = -z; if (Math.abs(e - BE) > 4.3) return null; const d = Math.abs(n - BN); if (d <= HALF) return TOP; if (d <= HALF + RAMP) return TOP * (1 - (d - HALF) / RAMP); return null; });
    for (const s of [-1, 1]) fx.addSolid && fx.addSolid([[BE + s * 4.3 - 0.25, BN - HALF], [BE + s * 4.3 + 0.25, BN - HALF], [BE + s * 4.3 + 0.25, BN + HALF], [BE + s * 4.3 - 0.25, BN + HALF]], TOP - 1, 99); // parapets block walkers on the deck only
    const J = fx.extraJumps || (fx.extraJumps = {}), a = warp(BE, BN - HALF - RAMP - 4), f = warp(BE, BN + HALF + 6); J.barnard_bridge = [a.x, a.z, [f.x, f.z, 0.08], true];
    let k = 0; const add = () => { const nav = document.querySelector('.wmap-jumps'); if (!nav) { if (++k < 30) setTimeout(add, 800); return; } if (!nav.querySelector('[data-jump="barnard_bridge"]')) { const b = document.createElement('button'); b.type = 'button'; b.dataset.jump = 'barnard_bridge'; b.textContent = 'Barnard Bridge'; const bf = nav.querySelector('[data-jump="barnard_field"]'); bf ? bf.after(b) : nav.appendChild(b); } }; add();
    let k2 = 0; const addJ = () => { const nav = document.querySelector('.wmap-jumps'); if (!nav) { if (++k2 < 30) setTimeout(addJ, 800); return; } const un = nav.querySelector('[data-jump="jellicoe"]'); if (!un) { if (++k2 < 30) setTimeout(addJ, 800); return; }
      if (!nav.querySelector('[data-jump="jellicoe_deck"]')) { const b = document.createElement('button'); b.type = 'button'; b.dataset.jump = 'jellicoe_deck'; b.textContent = 'Jellicoe Road (deck)'; un.before(b); } }; addJ(); // deck-level jump; underside kept as a clip test
    info.fixes.push('barnard-bridge-walk'); }
  // ---- 3: Wellington pier-head: bigger pavilion massing (deck x 56..214, z 478..498, DY 1.5) ----
  { const DY = 1.5, x = 202, z = 488; box(0xf2ecd8, 22, 9, 19.6, x, DY + 4.5, z); box(0x2f6b5a, 23, 1, 20.4, x, DY + 9.5, z); box(0x2f6b5a, 6, 5, 6, x, DY + 12.5, z);
    for (let i = -3; i <= 3; i++) box(0x1d3a4a, 0.2, 3, 2, x - 11.1, DY + 4, z + i * 2.6);
    fx.addSolid && fx.addSolid([[x - 11, -(z - 9.8)], [x + 11, -(z - 9.8)], [x + 11, -(z + 9.8)], [x - 11, -(z + 9.8)]]); info.fixes.push('wellington-head-big'); }
  // ---- 4: L2 RICH extras ----
  if (window.__detail === 2) { const lamps = [[-20, 0], [-10, 200], [5, 400], [-30, -200], [-45, -400], [-190, 1300], [-183, 1600], [-221, 2300], [-222, 2500]];
    for (const [e, n] of lamps) { const p = warp(e, n); box(0x30343a, 0.2, 6, 0.2, p.x, 3, p.z); const g = new T.Mesh(new T.SphereGeometry(0.5, 8, 6), M(0xffd9a0, { fog: false })); g.position.set(p.x, 6.2, p.z); grp.add(g);
      const L = new T.PointLight(0xffc880, 1.2, 40, 2); L.position.set(p.x, 6, p.z); grp.add(L); }
    if (S.fog && S.fog.density) S.fog.density *= 0.8; info.fixes.push('l2-rich'); }
  // ---- 5: pier plank decks: light weathered planks + grain stripes, clearly not the brown beach (Britannia + Wellington deck boxes from v77) ----
  { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#b08a5a'; g.fillRect(0, 0, 64, 256);
    for (let y = 0; y < 256; y += 16) { g.fillStyle = y % 32 ? '#a57e50' : '#bb9566'; g.fillRect(0, y, 64, 14); g.fillStyle = '#3a2a1a'; g.fillRect(0, y + 14, 64, 2); }
    const tx = new T.CanvasTexture(c); tx.wrapS = tx.wrapT = T.RepeatWrapping;
    for (const d of [{ x0: 178, x1: 330, z0: -521, z1: -501 }, { x0: 56, x1: 214, z0: 478, z1: 498 }]) { const W = d.x1 - d.x0, D = d.z1 - d.z0, t2 = tx.clone(); t2.needsUpdate = true; t2.repeat.set(D / 4, W / 16);
      const m = new T.Mesh(new T.PlaneGeometry(D, W), M(0xffffff, { map: t2 })); m.rotation.set(-Math.PI / 2, 0, Math.PI / 2); m.position.set((d.x0 + d.x1) / 2, 1.52, (d.z0 + d.z1) / 2); grp.add(m);
      for (const z of [d.z0 + 0.3, d.z1 - 0.3]) { box(0xe8e4da, W, 0.08, 0.08, (d.x0 + d.x1) / 2, 2.5, z); box(0xe8e4da, W, 0.06, 0.06, (d.x0 + d.x1) / 2, 2.0, z); } } info.fixes.push('pier-planks'); }
  // ---- 6: Youth Centre first look: push floating music panels near the landing (-66,-2380) up + back out of the first view ----
  { let n = 0; const yd = () => { let k = 0; for (const c of fx.clusters || []) { const p = c.grp.position; if (Math.hypot(p.x + 66, p.z + 2380) < 70 && !c.grp.userData.v80) { c.grp.userData.v80 = 1; c.grp.position.y += 9; c.grp.position.z -= 14; c.grp.scale.setScalar(0.75); k++; } }
      info.youthDeclutter = (info.youthDeclutter || 0) + k; if (++n < 20) setTimeout(yd, 1500); }; setTimeout(yd, 2000); }
  // ---- 7: people, boats, arcade glow ----
  let npc = null; import('./world-v80-npc.js?v=80').then(m => { npc = m.initNpc(o); info.npc = npc.info; }).catch(e => console.warn('v80 npc', e));
  fx.v80Info = info; return { info, update(t, dt) { if (npc) npc.update(t, dt); } };
}
