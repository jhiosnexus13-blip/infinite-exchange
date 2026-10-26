/* JHIOS world v76 — Barnard Field rider (Joseph request, preview). OSM has no named "Barnard Field": placed on the existing Newtown green
   (newtown-streets.json green_extra[0]) behind Tennyson Road toward Beatty Close. Oval loop centre e=-60 n=2280, radii 22 x 14 m, at grade.
   Low-poly MeshBasic figure: strong ginger man (hair + beard), white vest, dark trousers, boots, on a mini-moto. Animated like the v60 racehorses. */
export function initV76(o) {
  const { T, S, LBL, warp, fx } = o, grp = new T.Group(); grp.name = 'v76'; S.add(grp);
  const CE = -60, CN = 2280, RX = 22, RN = 14, M = c => new T.MeshBasicMaterial({ color: c });
  const at = (e, n) => warp(e, n);
  const rig = new T.Group(); grp.add(rig); const body = new T.Group(); rig.add(body);
  const P = (geo, col, x, y, z, rx = 0, rz = 0) => { const m = new T.Mesh(geo, M(col)); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); body.add(m); return m; };
  const B = (w, h, d) => new T.BoxGeometry(w, h, d), C = (r0, r1, h, s = 8) => new T.CylinderGeometry(r0, r1, h, s);
  // mini-moto (faces -z): wheels, frame, tank, seat, bars
  const wheels = []; for (const z of [-0.55, 0.55]) { const w = P(new T.TorusGeometry(0.22, 0.08, 6, 12), 0x141414, 0, 0.3, z, 0, Math.PI / 2); w.rotation.set(0, Math.PI / 2, 0); wheels.push(w); P(C(0.06, 0.06, 0.12), 0x9a9a9a, 0, 0.3, z, 0, Math.PI / 2); }
  P(B(0.12, 0.12, 1.0), 0xd8231e, 0, 0.5, 0, -0.15); P(B(0.3, 0.22, 0.4), 0xd8231e, 0, 0.66, -0.2); P(B(0.26, 0.1, 0.5), 0x1a1a1a, 0, 0.72, 0.18);
  P(C(0.03, 0.03, 0.6), 0x2a2a2a, 0, 0.62, -0.5, 0.35); P(B(0.6, 0.04, 0.04), 0x2a2a2a, 0, 0.92, -0.6); P(B(0.2, 0.14, 0.05), 0xfff2c0, 0, 0.62, -0.66);
  // rider: strong build, white vest, fair skin, ginger hair + beard, dark trousers, boots
  const SK = 0xf2c4a4, GI = 0xe07a2a, BD = 0xc45a1a;
  P(B(0.6, 0.5, 0.34), 0xf4f4f0, 0, 1.15, 0.12); P(B(0.66, 0.2, 0.36), 0xf4f4f0, 0, 1.42, 0.1); // broad vest torso + chest
  for (const s of [-1, 1]) { P(B(0.2, 0.16, 0.24), SK, s * 0.4, 1.5, 0.08); P(C(0.1, 0.09, 0.42), SK, s * 0.4, 1.28, -0.12, 1.0); P(C(0.08, 0.07, 0.36), SK, s * 0.3, 1.1, -0.42, 1.4); // shoulders, big arms to bars
    P(C(0.11, 0.1, 0.45), 0x23262c, s * 0.16, 0.86, 0.0, 1.3); P(C(0.09, 0.08, 0.4), 0x23262c, s * 0.18, 0.55, -0.18, 0.2); P(B(0.13, 0.12, 0.24), 0x2a1a10, s * 0.18, 0.34, -0.24); }
  P(C(0.08, 0.09, 0.12), SK, 0, 1.58, 0.06); P(B(0.26, 0.28, 0.26), SK, 0, 1.76, 0.04); P(B(0.28, 0.1, 0.28), GI, 0, 1.94, 0.05); P(B(0.27, 0.14, 0.08), BD, 0, 1.64, -0.08); P(B(0.08, 0.06, 0.05), BD, 0, 1.72, -0.1);
  body.scale.setScalar(1.25);
  const lab = LBL('BARNARD FIELD', '#9dffb0', 2.2); const lp = at(CE, CN); lab.position.set(lp.x, 7, lp.z); grp.add(lab);
  // faint dirt track ring on the grass
  { const pts = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2, w = at(CE + Math.cos(a) * RX, CN + Math.sin(a) * RN); pts.push(new T.Vector3(w.x, 0.06, w.z)); } grp.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x8a6a40 }))); }
  // jump: south edge of the loop, facing the centre
  { const a = at(CE, CN - RN - 10), J = fx.extraJumps || (fx.extraJumps = {}); J.barnard_field = [a.x, a.z, [lp.x, lp.z]];
    const add = () => { const nav = document.querySelector('.wmap-jumps'); if (!nav) return setTimeout(add, 800); if (!nav.querySelector('[data-jump="barnard_field"]')) { const b = document.createElement('button'); b.type = 'button'; b.dataset.jump = 'barnard_field'; b.textContent = 'Barnard Field'; nav.insertBefore(b, nav.children[1] || null); } }; add(); }
  const tmp = new T.Vector3();
  return { info: { centre: [CE, CN], radii: [RX, RN] }, update(t) { const a = t * 0.35, e = CE + Math.cos(a) * RX, n = CN + Math.sin(a) * RN, w = at(e, n), w2 = at(CE + Math.cos(a + 0.05) * RX, CN + Math.sin(a + 0.05) * RN);
    rig.position.set(w.x, 0.05 + Math.abs(Math.sin(t * 9)) * 0.05, w.z); rig.rotation.y = Math.atan2(-(w2.x - w.x), -(w2.z - w.z)); body.rotation.z = 0.18; // lean into the turn
    for (const wh of wheels) wh.rotation.x = -t * 12; } };
}
