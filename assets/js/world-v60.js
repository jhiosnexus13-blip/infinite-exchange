/* JHIOS world v60: race day at Great Yarmouth Racecourse + fireworks over the beach spawn.
   - 8 racehorses with jockeys in coloured silks gallop a loop of the real track (OSM relation 3118342 outer rail, offset inside it).
     Two InstancedMeshes (horse, jockey), one matrix update per frame.
   - Lord Nelson Stand (OSM way 230703557) built solid: cream walls, glazed upper front, tiered terrace and cantilever roof facing the course,
     with a smartly dressed race-day crowd (suits, dresses, hats) as instanced low-poly figures (3 draw calls, static).
   - Fireworks: a fixed pool of additive particle shells with short trails, launched in a loop high over the spawn plaza; a soft sky flash.
     Pool and particle counts are capped (smaller in lite mode); reduced-motion turns the fireworks off. */
export function initV60(o, X) {
  const { T, S, LITE, RED, warp, PZ, fx } = o;
  const M = c => new T.MeshBasicMaterial({ color: c });
  const merge = gs => { const pos = []; for (const g of gs) { const nb = g.index ? g.toNonIndexed() : g; pos.push(...nb.attributes.position.array); } const out = new T.BufferGeometry(); out.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); return out; };
  const out = { horses: 0, crowd: 0, shells: 0 };
  // ---------- racehorses ----------
  const RC = X && X.racecourse; let race = null;
  if (RC && RC.outer && RC.outer[0]) {
    const R = RC.outer[0].slice(); if (R.length > 2 && R[0][0] === R[R.length - 1][0] && R[0][1] === R[R.length - 1][1]) R.pop();
    let A = 0; for (let i = 0; i < R.length; i++) { const a = R[i], b = R[(i + 1) % R.length]; A += a[0] * b[1] - b[0] * a[1]; }
    const inSign = A > 0 ? 1 : -1; // CCW: inside is to the left of travel
    const path = (lane) => { const P = []; for (let i = 0; i < R.length; i++) { const p0 = R[(i - 1 + R.length) % R.length], p1 = R[i], p2 = R[(i + 1) % R.length];
        let tx = p2[0] - p0[0], ty = p2[1] - p0[1]; const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L; P.push([p1[0] - ty * lane * inSign, p1[1] + tx * lane * inSign]); }
      const W = P.map(p => warp(p[0], p[1])), cum = [0]; for (let i = 1; i <= W.length; i++) cum.push(cum[i - 1] + W[i - 1].distanceTo(W[i % W.length])); return { W, cum, len: cum[W.length] }; };
    const N = 8, lanes = [], silks = [0xe0202c, 0x1f4fd8, 0xffd21f, 0x18a04a, 0xff7ad9, 0xffffff, 0x7a2bd0, 0xff8a1a];
    for (let i = 0; i < N; i++) lanes.push(path(4 + (i % 4) * 1.6));
    const L = (w, h, d, x, y, z, rz = 0) => { const g = new T.BoxGeometry(w, h, d); if (rz) g.rotateZ(rz); g.translate(x, y, z); return g; };
    const hg = merge([L(2.0, 0.8, 0.6, 0, 1.55, 0), L(0.35, 0.9, 0.35, 1.05, 2.05, 0, -0.6), L(0.7, 0.3, 0.3, 1.45, 2.4, 0), // body, neck, head
      ...[[0.75, 0.2], [0.75, -0.2], [-0.75, 0.2], [-0.75, -0.2]].map(([x, z]) => L(0.16, 1.2, 0.16, x, 0.6, z)), L(0.6, 0.12, 0.12, -1.2, 1.6, 0, 0.5)]);
    const jg = merge([L(0.45, 0.65, 0.45, 0.15, 2.35, 0, -0.5), L(0.3, 0.3, 0.3, 0.38, 2.8, 0)]);
    const horses = new T.InstancedMesh(hg, M(0x5a3420), N), jock = new T.InstancedMesh(jg, M(0xffffff), N);
    const hc = [0x5a3420, 0x2a1a12, 0x7a4a2a, 0x3b2418, 0x8a5a34, 0x1c1410, 0x6b3e22, 0x4a2c1a];
    for (let i = 0; i < N; i++) { horses.setColorAt(i, new T.Color(hc[i])); jock.setColorAt(i, new T.Color(silks[i])); }
    for (const m of [horses, jock]) { m.frustumCulled = false; m.raycast = () => {}; S.add(m); }
    const dm = new T.Object3D(), spd = Array.from({ length: N }, (_, i) => 15.5 + (i * 0.37) % 1.2), start = Array.from({ length: N }, (_, i) => -i * 2.6 - (i % 2) * 1.2);
    const at = (P, s) => { s = ((s % P.len) + P.len) % P.len; let lo = 0, hi = P.W.length; while (hi - lo > 1) { const m = (lo + hi) >> 1; P.cum[m] <= s ? lo = m : hi = m; } const a = P.W[lo], b = P.W[(lo + 1) % P.W.length], seg = P.cum[lo + 1] - P.cum[lo] || 1; return [a.clone().lerp(b, (s - P.cum[lo]) / seg), b.clone().sub(a)]; };
    race = (t) => { for (let i = 0; i < N; i++) { const s = start[i] + t * (spd[i] + 0.6 * Math.sin(t * 0.13 + i)), [p, d] = at(lanes[i], s);
        dm.position.set(p.x, Math.abs(Math.sin(t * 9 + i)) * 0.18, p.z); dm.rotation.set(0, Math.atan2(-d.z, d.x), 0); dm.updateMatrix(); horses.setMatrixAt(i, dm.matrix); jock.setMatrixAt(i, dm.matrix); }
      horses.instanceMatrix.needsUpdate = true; jock.instanceMatrix.needsUpdate = true; };
    race(0); out.horses = N; window.__races = { horse: i => { const m = new T.Matrix4(); horses.getMatrixAt(i, m); return new T.Vector3().setFromMatrixPosition(m).toArray(); } }; fx.racehorses = { horses, jock, lanes };
  }
  // ---------- Lord Nelson Stand + crowd ----------
  const ST = RC && RC.stand && RC.stand.ring;
  if (ST) { const R = ST.slice(0, 4); // corners: R[0]-R[1] west face, R[1]-R[2] north, R[2]-R[3] east (course side), R[3]-R[0] south
    const cx = R.reduce((s, p) => s + p[0], 0) / 4, cy = R.reduce((s, p) => s + p[1], 0) / 4, sh = new T.Shape(R.map(p => { const w = warp(p[0], p[1]); return new T.Vector2(w.x, -w.z); }));
    const g = new T.ExtrudeGeometry(sh, { depth: 9, bevelEnabled: false }); g.rotateX(-Math.PI / 2); const body = new T.Mesh(g, M(0xe9e4d6)); S.add(body);
    const e0 = R[3], e1 = R[2], ux = e1[0] - e0[0], uy = e1[1] - e0[1], len = Math.hypot(ux, uy), u = [ux / len, uy / len], nrm = [u[1], -u[0]]; // nrm points out of the east face
    const ry = Math.atan2(uy, ux), mid = [(e0[0] + e1[0]) / 2, (e0[1] + e1[1]) / 2], put = (m, w, h, d, off, y) => { const ms = new T.Mesh(new T.BoxGeometry(w, h, d), m); const p = warp(mid[0] + nrm[0] * off, mid[1] + nrm[1] * off); ms.position.set(p.x, y, p.z); ms.rotation.y = ry; S.add(ms); return ms; };
    put(M(0x2a3b4a), len - 1, 3.2, 0.2, 0.1, 6.6);                             // glazed hospitality floor
    for (let k = 0; k < 5; k++) put(M(k % 2 ? 0xbfc4c8 : 0xa9aeb3), len, 0.6 * (k + 1), 1.6, 0.8 + (5 - k - 1) * 1.6 + 0.8, 0.3 * (k + 1)); // tiered terrace steps
    put(M(0xf4f4f0), len + 2, 0.35, 11, 5.2, 9.4);                              // cantilever roof over the terrace
    for (const f of [-0.45, 0, 0.45]) { const p = warp(mid[0] + u[0] * f * len + nrm[0] * 10, mid[1] + u[1] * f * len + nrm[1] * 10); const c2 = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 9.3, 6), M(0xdedede)); c2.position.set(p.x, 4.65, p.z); S.add(c2); }
    // crowd
    const NC = LITE ? 90 : 220, bodyG = new T.CylinderGeometry(0.2, 0.28, 1.25, 6); bodyG.translate(0, 0.62, 0); const headG = new T.SphereGeometry(0.16, 6, 5); headG.translate(0, 1.42, 0);
    const hatG = new T.CylinderGeometry(0.24, 0.3, 0.1, 8); hatG.translate(0, 1.58, 0);
    const bodies = new T.InstancedMesh(bodyG, M(0xffffff), NC), heads = new T.InstancedMesh(headG, M(0xffffff), NC), hats = new T.InstancedMesh(hatG, M(0xffffff), NC);
    const suits = [0x1d2230, 0x2b2b2e, 0x3a4a63, 0x5b5f66, 0x2f3d2c], dresses = [0xe0306a, 0x2a8de0, 0xf2c94c, 0xffffff, 0xa040c0, 0x26b07a, 0xff7a5c], skins = [0xf1c7a6, 0xd9a37e, 0xa86e4a, 0x6b4630, 0xf6d8c0], dm = new T.Object3D();
    let rnd = 7; const rr = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < NC; i++) { const onStep = i < NC * 0.55, k = Math.floor(rr() * 5);
      const off = onStep ? 0.8 + (5 - k - 1) * 1.6 + 0.8 + (rr() - 0.5) * 1.0 : 11 + rr() * 9, ys = onStep ? 0.6 * (k + 1) : 0, along = (rr() - 0.5) * (len - 2);
      const p = warp(mid[0] + u[0] * along + nrm[0] * off, mid[1] + u[1] * along + nrm[1] * off), dress = rr() < 0.45;
      dm.position.set(p.x, ys, p.z); dm.rotation.set(0, ry + Math.PI / 2 + (rr() - 0.5) * (onStep ? 0.6 : 3), 0); const sc = 0.9 + rr() * 0.2; dm.scale.set(sc, sc, sc); dm.updateMatrix();
      bodies.setMatrixAt(i, dm.matrix); heads.setMatrixAt(i, dm.matrix); bodies.setColorAt(i, new T.Color(dress ? dresses[i % dresses.length] : suits[i % suits.length])); heads.setColorAt(i, new T.Color(skins[i % skins.length]));
      if (dress ? rr() < 0.7 : rr() < 0.25) { hats.setMatrixAt(i, dm.matrix); hats.setColorAt(i, new T.Color(dress ? dresses[(i + 3) % dresses.length] : 0x222222)); } else { dm.scale.set(0, 0, 0); dm.updateMatrix(); hats.setMatrixAt(i, dm.matrix); hats.setColorAt(i, new T.Color(0)); } }
    for (const m of [bodies, heads, hats]) { m.raycast = () => {}; S.add(m); } out.crowd = NC;
  }
  // ---------- fireworks over the spawn ----------
  let fw = null;
  if (!RED) { const NS = LITE ? 3 : 6, NP = LITE ? 48 : 90, cols = [0xff3b6b, 0x3bd6ff, 0xffd23b, 0x7dff6a, 0xc77dff, 0xff8a3b, 0xffffff], shells = [];
    for (let s = 0; s < NS; s++) { const pos = new Float32Array(NP * 3), seg = new Float32Array(NP * 6), vel = new Float32Array(NP * 3);
      const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pos, 3)); const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(seg, 3));
      const pm = new T.PointsMaterial({ color: 0xffffff, size: LITE ? 9 : 7, transparent: true, opacity: 1, blending: T.AdditiveBlending, depthWrite: false, fog: false });
      const lm = new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, fog: false });
      const pts = new T.Points(pg, pm), ln = new T.LineSegments(lg, lm); for (const o2 of [pts, ln]) { o2.frustumCulled = false; o2.raycast = () => {}; o2.visible = false; S.add(o2); }
      shells.push({ pos, seg, vel, pg, lg, pm, lm, pts, ln, t0: s * 0.9 + 0.5, life: 2.8, o: new T.Vector3() }); }
    const flash = new T.Mesh(new T.SphereGeometry(1, 12, 8), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.BackSide }));
    flash.scale.setScalar(70); flash.raycast = () => {}; S.add(flash);
    const launch = (sh, t) => { const [px, pz] = PZ(); sh.o.set(px + (Math.random() - 0.5) * 140, 170 + Math.random() * 90, pz + (Math.random() - 0.5) * 140); sh.t0 = t; sh.life = 2.4 + Math.random() * 0.8;
      const c = cols[Math.floor(Math.random() * cols.length)]; sh.pm.color.setHex(c); sh.lm.color.setHex(c); const sp = 38 + Math.random() * 22;
      for (let i = 0; i < NP; i++) { const z = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - z * z), k = sp * (0.85 + Math.random() * 0.3); sh.vel[i * 3] = r * Math.cos(a) * k; sh.vel[i * 3 + 1] = z * k; sh.vel[i * 3 + 2] = r * Math.sin(a) * k; }
      sh.pts.visible = sh.ln.visible = true; };
    for (const sh of shells) sh.t0 = -1e9;
    let next = 0, k = 0;
    fw = (t) => { if (t > next) { const sh = shells[k++ % NS]; launch(sh, t); next = t + 0.55 + Math.random() * 0.9; fx.fwFlash = { t, c: sh.pm.color.clone(), p: sh.o.clone() }; }
      for (const sh of shells) { const a = t - sh.t0; if (a > sh.life) { if (sh.pts.visible) sh.pts.visible = sh.ln.visible = false; continue; }
        const dr = (1 - Math.exp(-1.4 * a)) / 1.4, dr2 = (1 - Math.exp(-1.4 * Math.max(0, a - 0.22))) / 1.4, g = -4.9 * a * a, g2 = -4.9 * Math.max(0, a - 0.22) ** 2;
        for (let i = 0; i < NP; i++) { const vx = sh.vel[i * 3], vy = sh.vel[i * 3 + 1], vz = sh.vel[i * 3 + 2], x = sh.o.x + vx * dr, y = sh.o.y + vy * dr + g, z = sh.o.z + vz * dr;
          sh.pos[i * 3] = x; sh.pos[i * 3 + 1] = y; sh.pos[i * 3 + 2] = z; sh.seg.set([x, y, z, sh.o.x + vx * dr2, sh.o.y + vy * dr2 + g2, sh.o.z + vz * dr2], i * 6); }
        sh.pg.attributes.position.needsUpdate = true; sh.lg.attributes.position.needsUpdate = true; const f = 1 - a / sh.life; sh.pm.opacity = Math.min(1, f * 1.6); sh.lm.opacity = 0.55 * f * f; }
      const F = fx.fwFlash; if (F) { const a = t - F.t; flash.position.copy(F.p); flash.material.color.copy(F.c); flash.material.opacity = a < 0.5 ? 0.18 * (1 - a / 0.5) : 0; } };
    out.shells = NS; out.particles = NS * NP; }
  fx.v60Info = out;
  return { update(t) { if (race) race(t); if (fw) fw(t); } };
}
