/* v121: real OSM street network for Great Yarmouth town (assets/data/gy-roads-v121.json, baked by tools/bake-roads-v121.py from the
   Geofabrik Norfolk extract, © OpenStreetMap contributors, ODbL). Replaces the v69 4 m-simplified ribbons, pavements and markings and the
   v66 sheen (hidden, never deleted). Carriageway widths from OSM width / lanes tags, else by highway class; round joins and caps so bends and
   junctions close without gaps; one carriageway material on one layer, so crossing roads never z-fight; pavements sit just under the
   carriageway so they never paint across a junction; centre dashes stop short of junctions. Roads follow the v120 ground (fx.earth.heightAt),
   skip anything already carried by a 3D bridge, ramp, raised path or a hand-built street (v63 / v115 / v116 / Newtown / Joyland).
   Tiers: L0 = carriageways only; L1/L2 = + pavements + centre dashes. Flags: IE_V121_ROADS=false keeps the v120 roads. */
export function initV121(o) {
  const { T, S, warp, fx } = o, info = { roads: 0, segs: 0, skippedCustom: 0, skippedRaised: 0, bridgesFlat: 0, dashes: 0, hidden: [] };
  fx.v121Info = info;
  if (window.IE_V121_ROADS === false) { info.off = true; return { info, update() {} }; }
  const NT = [-330, 2060, 240, 2760]; const inNT = (e, n) => e > NT[0] && e < NT[2] && n > NT[1] && n < NT[3];
  const grp = new T.Group(); grp.name = 'v121-roads'; let paveM = null, dashM = null;
  const ground = (x, z, y0) => { for (const f of window.__groundParts || []) { const v = f(x, z, y0); if (v != null) return v; } return null; };
  const ray = new T.Raycaster(), DOWN = new T.Vector3(0, -1, 0), V = new T.Vector3();
  const go = (D) => {
    const H = (fx.earth && fx.earth.heightAt) || (() => -0.08);
    /* hand-built road surfaces that already exist at ground level: don't double them */
    const custom = []; for (const nm of ['v116', 'v63', 'v115-bridges', 'newtown-streets', 'v85', 'v118-waterways-water']) { const g0 = S.getObjectByName(nm); if (g0) g0.traverse(m => { if (m.isMesh && m.visible !== false) custom.push(m); }); }
    const onCustom = (x, z, h) => { if (!custom.length) return false; V.set(x, h + 0.6, z); ray.set(V, DOWN); ray.far = 1.2; return ray.intersectObjects(custom, false).length > 0; };
    const J = new Map(), JK = (x, z) => Math.floor(x / 16) + ':' + Math.floor(z / 16), jv = D.junctions;
    for (let i = 0; i < jv.length; i += 2) { const w = warp(jv[i], jv[i + 1]); const k = JK(w.x, w.z); if (!J.has(k)) J.set(k, []); J.get(k).push(w.x, w.z); }
    const nearJ = (x, z, r) => { const cx = Math.floor(x / 16), cz = Math.floor(z / 16); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const L = J.get((cx + a) + ':' + (cz + b)); if (L) for (let i = 0; i < L.length; i += 2) if ((L[i] - x) ** 2 + (L[i + 1] - z) ** 2 < r * r) return true; } return false; };
    const RV = [], RI = [], PV = [], PI = [], DV = [], DI = [];
    const quad = (Vv, I, ax, az, ay, bx, bz, by, cx, cz, cy, dx, dz, dy) => { const k = Vv.length / 3; Vv.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz); I.push(k, k + 2, k + 1, k, k + 3, k + 2); };
    /* join fan at a bend: covers the angular gap between the two segment normals on both sides (2 small fans instead of a full disc) */
    const fan = (Vv, I, x, z, y, r, a0, a1, st = 0.35) => { let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; const k = Math.max(1, Math.ceil(Math.abs(d) / st)), c = Vv.length / 3; Vv.push(x, y, z);
      for (let j = 0; j <= k; j++) { const a = a0 + d * j / k; Vv.push(x + Math.cos(a) * r, y, z + Math.sin(a) * r); } for (let j = 0; j < k; j++) I.push(c, c + 1 + j, c + 2 + j); };
    const join = (Vv, I, b, y, r, n1x, n1z, n2x, n2z) => { const a0 = Math.atan2(n1z, n1x), a1 = Math.atan2(n2z, n2x); fan(Vv, I, b.x, b.z, y, r, a0, a1); fan(Vv, I, b.x, b.z, y, r, a0 + Math.PI, a1 + Math.PI); };
    const cap = (Vv, I, x, z, y, r, nx, nz) => { const a0 = Math.atan2(nz, nx); fan(Vv, I, x, z, y, r, a0, a0 + Math.PI - 1e-3, 1.05); fan(Vv, I, x, z, y, r, a0 + Math.PI, a0 + 2 * Math.PI - 1e-3, 1.05); };
    const disc = (Vv, I, x, z, y, r) => { const k = Vv.length / 3, N = r > 4 ? 12 : 8; Vv.push(x, y, z); for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; Vv.push(x + Math.cos(a) * r, y, z + Math.sin(a) * r); } for (let i = 0; i < N; i++) I.push(k, k + 1 + (i + 1) % N, k + 1 + i); };
    for (const [cls, width, flags, , f] of D.roads) {
      const bridge = flags & 1, oneway = flags & 2, hw = width / 2, ped = cls === 0;
      const pts = []; for (let i = 0; i < f.length; i += 2) { if (Math.hypot(f[i], f[i + 1]) > 4500) continue; pts.push([f[i], f[i + 1]]); }
      /* subdivide (<= 6 m) only where the ground is not flat, so the strip follows slopes without bloating flat town streets */
      const W = []; const P = (e, n, orig) => { const w = warp(e, n); return { x: w.x, z: w.z, e, n, orig, h: H(w.x, w.z) }; };
      const sub = (A, B, d) => { const L = Math.hypot(B.e - A.e, B.n - A.n); if (L <= 6 || d > 6) return; const M = P((A.e + B.e) / 2, (A.n + B.n) / 2, 0);
        if (Math.abs(M.h - (A.h + B.h) / 2) < 0.04 && Math.abs(A.h - B.h) < 0.06) return; sub(A, M, d + 1); W.push(M); sub(M, B, d + 1); };
      for (let i = 0; i < pts.length; i++) { const B = P(pts[i][0], pts[i][1], 1); if (W.length) sub(W[W.length - 1], B, 0); W.push(B); }
      let any = false, dashAcc = 0;
      /* round joins only where the line actually bends (> 6 deg) or ends */
      const bend = i => { if (i === 0 || i === W.length - 1) return true; const a = W[i - 1], b = W[i], c = W[i + 1]; const u = Math.atan2(b.z - a.z, b.x - a.x), v = Math.atan2(c.z - b.z, c.x - b.x); let d = Math.abs(u - v); if (d > Math.PI) d = 2 * Math.PI - d; return d > 0.1; };
      for (let i = 0; i < W.length - 1; i++) {
        const a = W[i], b = W[i + 1]; if (inNT(a.e, a.n) && inNT(b.e, b.n)) continue;
        const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz); if (L < 0.05) continue;
        const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, mh = (a.h + b.h) / 2;
        if (bridge) { const g = ground(mx, mz, mh + 20); if (g != null && g > mh + 0.8) { info.skippedRaised++; continue; } }
        else { const g = ground(mx, mz, mh + 0.5); if (g != null && g > mh + 0.3) { info.skippedRaised++; continue; } }
        if (onCustom(mx, mz, mh)) { info.skippedCustom++; continue; }
        const ya = bridge ? Math.max(a.h, 0.12) + 0.07 : a.h + 0.07, yb = bridge ? Math.max(b.h, 0.12) + 0.07 : b.h + 0.07; if (bridge) info.bridgesFlat++;
        const nx = -dz / L, nz = dx / L;
        const Vv = ped ? PV : RV, I = ped ? PI : RI, yo = ped ? -0.012 : 0;
        quad(Vv, I, a.x + nx * hw, a.z + nz * hw, ya + yo, b.x + nx * hw, b.z + nz * hw, yb + yo, b.x - nx * hw, b.z - nz * hw, yb + yo, a.x - nx * hw, a.z - nz * hw, ya + yo);
        const c2 = W[i + 2]; let n2x = 0, n2z = 0; if (c2) { const ex = c2.x - b.x, ez = c2.z - b.z, l2 = Math.hypot(ex, ez) || 1; n2x = -ez / l2; n2z = ex / l2; }
        if (i === 0 && a.orig) cap(Vv, I, a.x, a.z, ya + yo, hw, nx, nz);
        if (b.orig && i === W.length - 2) cap(Vv, I, b.x, b.z, yb + yo, hw, nx, nz); else if (b.orig && bend(i + 1)) join(Vv, I, b, yb + yo, hw, nx, nz, n2x, n2z);
        if (cls >= 2 && !bridge && !(flags & 4)) for (const s of [1, -1]) { const r0 = hw * s, r1 = (hw + 1.9) * s;
          quad(PV, PI, a.x + nx * r1, a.z + nz * r1, ya - 0.02, b.x + nx * r1, b.z + nz * r1, yb - 0.02, b.x + nx * r0, b.z + nz * r0, yb - 0.02, a.x + nx * r0, a.z + nz * r0, ya - 0.02);
          if (s === 1 && b.orig && i < W.length - 2 && bend(i + 1)) join(PV, PI, b, yb - 0.02, hw + 1.9, nx, nz, n2x, n2z); }
        /* centre dashes: two-way tertiary+ (3 m on / 6 m off), not within 11 m of a junction */
        if (cls >= 3 && !oneway) { for (let s = dashAcc; s < L; s += 9) { const t0 = s / L, t1 = Math.min(1, (s + 3) / L); const x0 = a.x + dx * t0, z0 = a.z + dz * t0, x1 = a.x + dx * t1, z1 = a.z + dz * t1;
            if (nearJ(x0, z0, 11) || nearJ(x1, z1, 11)) continue; const y0 = ya + (yb - ya) * t0 + 0.012, y1 = ya + (yb - ya) * t1 + 0.012, q = 0.07;
            quad(DV, DI, x0 + nx * q, z0 + nz * q, y0, x1 + nx * q, z1 + nz * q, y1, x1 - nx * q, z1 - nz * q, y1, x0 - nx * q, z0 - nz * q, y0); info.dashes++; }
          dashAcc = ((dashAcc - L) % 9 + 9) % 9; }
        any = true; info.segs++; }
      if (any) info.roads++; }
    const mk = (Vv, I, mat, name, ro) => { if (!Vv.length) return null; const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(Vv, 3)); g.setIndex(I); g.computeVertexNormals(); g.computeBoundingSphere();
      const m = new T.Mesh(g, mat); m.name = name; m.renderOrder = ro; m.receiveShadow = true; m.raycast = () => {}; grp.add(m); return m; };
    mk(RV, RI, new T.MeshStandardMaterial({ color: 0x3c3f44, roughness: 0.93, metalness: 0, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 'v121-carriageway', 1);
    paveM = mk(PV, PI, new T.MeshStandardMaterial({ color: 0x8a867e, roughness: 0.95, metalness: 0, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), 'v121-pavement', 0);
    dashM = mk(DV, DI, new T.MeshBasicMaterial({ color: 0xe8e4d8, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 'v121-dashes', 2);
    S.add(grp);
    for (const nm of ['v69-roads', 'v69-pave', 'v69-marks', 'v66-sheen']) { const m = S.getObjectByName(nm); if (m) { m.visible = false; info.hidden.push(nm); } }
    info.ready = true; console.info('[IE] v121 roads', info);
  };
  /* wait for the v120 ground + the hand-built bridges/streets, then build once */
  const t0 = performance.now();
  const wait = (D) => { const earthOk = !fx.earth || (fx.earth.info && fx.earth.info.ready) || (fx.earth.info && fx.earth.info.off);
    const mods = ['v69-roads', 'v116', 'v63', 'newtown-streets'].every(n => S.getObjectByName(n)); const late = performance.now() - t0 > 25000;
    if ((earthOk && mods) || late) { try { go(D); } catch (e) { console.warn('v121 roads', e); } } else setTimeout(() => wait(D), 500); };
  fetch('/assets/data/gy-roads-v121.json?v=126').then(r => r.json()).then(D => wait(D)).catch(e => console.warn('v121 roads data', e));
  return { info, update() { const d = window.__detail ?? 1; if (paveM) paveM.visible = d >= 1; if (dashM) dashM.visible = d >= 1; } };
}
