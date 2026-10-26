/* JHIOS world v77 — REAL-imaging P1 fat bump (preview). Overlays only; no new data.
   1/2. Britannia + Wellington: guaranteed deck slab + walk height under the fixed jump spots, Wellington pier-head (green-cream arched entrance + head pavilion),
        and a post-jump settle lock that re-pins the player ON deck facing seaward for ~1.5 s (first jump raced ground/collision settle).
   3. Lodge: hide stray beige/cream annex meshes standing in front of the outer ROYAL ASSEMBLY ROOMS lunettes (other modules), lettering + compass kept.
   4. Tower: extra bright octagon drum ring, blue mullions, silver octagon roof + spire (unfogged).
   5. Jump list order: Barnard Field 2nd, Youth 3rd (re-asserted after late module inserts).
   6. "jumping…" toast on every jump + retry if the first click did not move the player.
   7. Harbour: shrink/anchor the neon cluster on the South Pier deck, fade magenta wires so the real deck reads.
   8. Youth: no change (P2). */
export function initV77(o) {
  const { T, S, warp, fx } = o, grp = new T.Group(); grp.name = 'v77'; S.add(grp); const info = { fixes: [] };
  const M = (c, x = {}) => new T.MeshBasicMaterial(Object.assign({ color: c }, x));
  const box = (c, w, h, d, x, y, z, mx) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), M(c, mx)); m.position.set(x, y, z); grp.add(m); return m; };
  const cyl = (c, r0, r1, h, x, y, z, s = 8, mx) => { const m = new T.Mesh(new T.CylinderGeometry(r0, r1, h, s), M(c, mx)); m.position.set(x, y, z); grp.add(m); return m; };
  const DY = 1.5, gp = window.__groundParts = window.__groundParts || [];
  // ---- 1/2: deck boxes in world x/z around the fixed PJ spots (world-fx jumpTo) ----
  const DECKS = { britannia_pier: { x0: 178, x1: 330, z0: -521, z1: -501, sea: [320, -511] }, wellington_pier: { x0: 56, x1: 214, z0: 478, z1: 498, sea: [190, 488] } };
  for (const d of Object.values(DECKS)) box(0x6b5a48, d.x1 - d.x0, 0.6, d.z1 - d.z0, (d.x0 + d.x1) / 2, DY - 0.3, (d.z0 + d.z1) / 2);
  gp.unshift((x, z) => { for (const d of Object.values(DECKS)) if (x > d.x0 && x < d.x1 && z > d.z0 && z < d.z1) return DY; return null; });
  { const W = DECKS.wellington_pier, zc = (W.z0 + W.z1) / 2; // REAL: curved arched green-cream entrance at the root, pavilion at the head
    box(0xf2ecd8, 3, 7, 24, W.x0 + 1, DY + 3.5, zc - 0); box(0x2f6b5a, 3.4, 1, 24.4, W.x0 + 1, DY + 7.4, zc);
    const ar = new T.Mesh(new T.TorusGeometry(4.2, 0.6, 8, 16, Math.PI), M(0x2f6b5a)); ar.rotation.y = Math.PI / 2; ar.position.set(W.x0 + 2.6, DY + 7.5, zc); grp.add(ar);
    box(0x1a1d22, 0.3, 5, 5, W.x0 + 2.6, DY + 2.5, zc); // opening reads dark; walk-through gap is on the deck either side
    box(0xf2ecd8, 16, 6, 18, W.x1 - 6, DY + 3, zc); box(0x2f6b5a, 17, 0.8, 19, W.x1 - 6, DY + 6.4, zc); cyl(0x3d8a6a, 0, 4, 3, W.x1 - 6, DY + 8.3, zc, 8);
    for (let x = W.x0 + 6; x < W.x1 - 14; x += 10) for (const z of [W.z0 + 0.5, W.z1 - 0.5]) cyl(0xe8e6df, 0.08, 0.08, 1, x, DY + 0.5, z, 6);
    info.fixes.push('wellington-pierhead'); }
  info.fixes.push('pier-decks');
  // ---- 6 + settle: wrap teleport via jump buttons ----
  // v79: the old faint toast moved to world-fx (.wjump, shown by jumpTo/teleport itself)
  const P = () => o.P || null;
  const settle = (k, x, z) => { const d = DECKS[k]; if (!d) return; let n = 0; const t = setInterval(() => { const p = fx.lastJump; const pl = P();
      if (pl && pl.pos && (Math.abs(pl.pos.x - x) > 2.5 || Math.abs(pl.pos.z - z) > 2.5)) { pl.pos.x = x; pl.pos.z = z; pl.yaw = Math.atan2(-(d.sea[0] - x), -(d.sea[1] - z)); }
      if (++n > 8) clearInterval(t); }, 180); };
  const SPOT = { britannia_pier: [250, -511], wellington_pier: [112, 488] }; // v80: seaward ON the plank deck, past the root buildings (must match world-fx PJ)
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.wmap-jumps [data-jump]'); if (!b) return; const k = b.dataset.jump, before = fx.lastJump && fx.lastJump.join();
    if (SPOT[k]) settle(k, ...SPOT[k]);
    setTimeout(() => { if ((fx.lastJump && fx.lastJump.join()) === before) { const nb = document.querySelector(`.wmap-jumps [data-jump="${k}"]`); if (nb && !nb.dataset.r77) { nb.dataset.r77 = '1'; fx.jBusy = 0; fx.jumpToast && fx.jumpToast(true); nb.click(); setTimeout(() => { delete nb.dataset.r77; }, 1500); } } }, 900); // first-click no-op retry
  }, true);
  info.fixes.push('jumping-toast', 'settle-lock');
  // ---- 5: jump order ----
  { let n = 0; const ord = () => { const nav = document.querySelector('.wmap-jumps'); if (nav) { const bf = nav.querySelector('[data-jump="barnard_field"]'), yc = nav.querySelector('[data-jump="youth_centre"]');
      if (bf) nav.insertBefore(bf, nav.children[1] || null); if (yc) nav.insertBefore(yc, nav.children[2] || null); } if (++n < 20) setTimeout(ord, 900); }; ord(); info.fixes.push('jump-order'); }
  // ---- 4: Tower octagon drum (pos from landmark if available) ----
  { let n = 0; const tw = () => { const L = fx.landmarks && fx.landmarks.tower_complex; if (!L || !L.pos) { if (++n < 30) setTimeout(tw, 800); return; } const x = L.pos.x, z = L.pos.z, U = { fog: false, toneMapped: false };
      const drum = new T.Mesh(new T.CylinderGeometry(11.2, 11.2, 7.5, 8, 1, true), M(0x8fd4ff, Object.assign({ transparent: true, opacity: 0.75, side: T.DoubleSide }, U))); drum.position.set(x, 42.5, z); drum.rotation.y = Math.PI / 8; grp.add(drum);
      for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; cyl(0x1d4fd0, 0.35, 0.35, 7.8, x + Math.cos(a) * 11.3, 42.5, z + Math.sin(a) * 11.3, 6, U); }
      cyl(0xdfe3e8, 11.8, 11.8, 0.8, x, 46.6, z, 8, U); cyl(0xc8ccd2, 1, 11.4, 5, x, 49.4, z, 8, U); cyl(0xe8ecf0, 0.05, 0.6, 9, x, 56.4, z, 6, U); info.fixes.push('tower-drum'); }; tw(); }
  // ---- 3: Lodge annex clear (world x≈e, z≈-n near core) ----
  { const F = -115.2, S0 = -458, S1 = -437, Wd = S1 - S0, outs = [S0 + Wd * 0.1, S0 + Wd * 0.9].map(n => warp(F + 2, n)); let n = 0;
    const clr = () => { let hid = 0; const bb = new T.Box3(), v = new T.Vector3(); S.traverse(m => { if (!m.isMesh || !m.visible || !m.material || !m.material.color) return; let p = m; while (p && p.name !== 'v69' && p.name !== 'v77') p = p.parent; if (p) return;
        const c = m.material.color, beige = c.r > 0.75 && c.g > 0.68 && c.b > 0.5 && c.b < 0.95; if (!beige) return; bb.setFromObject(m); if (bb.max.y < 1.5 || bb.min.y > 9) return;
        for (const o2 of outs) for (const dx of [0, 3, 6]) { v.set(o2.x + dx, 5, o2.z); if (bb.containsPoint(v)) { m.visible = false; hid++; return; } } });
      info.lodgeHidden = (info.lodgeHidden || 0) + hid; if (++n < 6) setTimeout(clr, 2500); }; setTimeout(clr, 3000); info.fixes.push('lodge-annex'); }
  // ---- 7: Harbour neon demote ----
  { let n = 0; const hb = () => { const hs = fx.harbourSpawn; if (!hs) { if (++n < 30) setTimeout(hb, 1000); return; } let k = 0;
      for (const c of fx.clusters || []) if (c.grp && Math.hypot(c.grp.position.x - hs[0], c.grp.position.z - hs[1]) < 120) { c.grp.scale.setScalar(0.6); c.grp.traverse(m => { if ((m.isLine || m.isLineSegments) && m.material) { m.material.transparent = true; m.material.opacity = 0.3; } }); k++; }
      info.harbourDemoted = k; if (!k && ++n < 30) setTimeout(hb, 1000); }; setTimeout(hb, 1500); info.fixes.push('harbour-demote'); }
  // ---- P1.5: Barnard Field south: grassy tree bank meeting Barnard Bridge (road + pavements both sides); field loop CE=-60 CN=2280 RN=14 ----
  { const at = (e, n) => warp(e, n), bx = (c, w, h, d, e, n, y) => { const p = at(e, n); return box(c, w, h, d, p.x, y, p.z); };
    for (let k = 0; k < 4; k++) bx(0x5f8a3e, 60, 0.8 + k * 0.7, 3, -60, 2252 - k * 3, (0.8 + k * 0.7) / 2); // stepped grass bank, rising south
    for (let i = 0; i < 9; i++) { const e = -88 + i * 7 + (i % 2) * 2, n = 2246 - (i % 3) * 2.5, p = at(e, n), h = 3.6 + (i % 3); cyl(0x5a3d22, 0.18, 0.25, h, p.x, h / 2 + 1, p.z, 6); const cr = new T.Mesh(new T.SphereGeometry(2 + (i % 2) * 0.6, 8, 6), M(0x2f6a2a)); cr.position.set(p.x, h + 2, p.z); grp.add(cr); }
    const BN = 2236, BE = -60; bx(0x5a5f66, 9, 0.6, 16, BE, BN, 3.4); bx(0x3a3d42, 5, 0.06, 16, BE, BN, 3.73); for (const s2 of [-1, 1]) { bx(0xa9a49a, 2, 0.18, 16, BE + s2 * 3.5, BN, 3.79); bx(0xb7b2a8, 0.3, 1.0, 16, BE + s2 * 4.4, BN, 4.2); }
    for (const s2 of [-1, 1]) bx(0x9c8f7e, 9.6, 3.2, 1.2, BE, BN + s2 * 8, 1.6);
    const lb = o.LBL && o.LBL('BARNARD BRIDGE', '#c9d2da', 1.1); if (lb) { const p = at(BE, BN); lb.position.set(p.x, 8.5, p.z); lb.renderOrder = 5; lb.material.depthTest = false; /* v80: full label clear of the deck/bank (scouts read BARNAR) */ grp.add(lb); } info.fixes.push('barnard-bank-bridge'); }
  fx.v77Info = info; return { info };
}
