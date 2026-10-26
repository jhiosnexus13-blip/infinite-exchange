/* JHIOS world v80 — people + life (Joseph 1:1, preview). Low-poly MeshBasic figures in the world-v76 style, shared geometry + per-colour
   material cache, distance-culled. Density by place (Joseph): BUSY = Marine Parade seafront (Britannia -> Pleasure Beach), Regent Road,
   town centre / Market Gates; MID = The Avenues pub; QUIET = Newtown, Lodge apron, Youth path, Barnard Field, Bure Park (dog walkers).
   Boats drift on the real river water (positions validated with fx.waterHit). Seafront arcade glow strip along Marine Parade (land side).
   Coordinates are world e/n (warp), only at places already in the world. Regent Road line is approximate (OSM line not in our data). */
export function initNpc(o) {
  const { T, S, warp, fx } = o, root = new T.Group(); root.name = 'v80-npc'; S.add(root); const info = { busy: 0, mid: 0, quiet: 0, boats: 0, arcades: 0 };
  const MC = new Map(), M = (c, x) => { const k = c + (x ? 'f' : ''); if (!MC.has(k)) MC.set(k, new T.MeshBasicMaterial(Object.assign({ color: c }, x || {}))); return MC.get(k); };
  const BX = new T.BoxGeometry(1, 1, 1), at = (e, n) => warp(e, n), rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(80);
  const pick = a => a[Math.floor(rnd() * a.length)];
  const SKIN = [0xf2c4a4, 0xe8b58e, 0xc68e62, 0x9a6440, 0x6b4428, 0xf6d2b8], HAIR = [0x1a1410, 0x3b2a1c, 0x6b4a2a, 0xc9a36a, 0xe07a2a, 0x9a9a9a, 0x2a2a2a],
    TOP = [0x2b3a55, 0x7a1f2b, 0x3a5a3a, 0xd8d4c8, 0x1f1f24, 0xe6c34a, 0x5a3f7a, 0xc8562a, 0x3f7fa8, 0xf0f0ea], LEG = [0x2a3448, 0x1c1c20, 0x4a4238, 0x3a4a6a, 0x6a5a48];
  const STYLES = { hivis: { top: 0xe8f020, leg: 0x2a2a30 }, coat: { top: 0x4a3a2a, leg: 0x3a3630, long: 1 }, hoodie: { top: 0x3a3f4a, hood: 1 }, tourist: { top: 0xff6fb0, leg: 0x6a8ab0 }, jacket: { top: 0x8a2a3a, leg: 0x1c1c20 } };
  function person(style, sc = 1) { const g = new T.Group(), b = new T.Group(); g.add(b); const st = STYLES[style] || {}, sk = pick(SKIN), top = st.top ?? pick(TOP), leg = st.leg ?? pick(LEG);
    const P = (c, w, h, d, x, y, z, par = b) => { const m = new T.Mesh(BX, M(c)); m.scale.set(w, h, d); m.position.set(x, y, z); par.add(m); return m; };
    const legs = [-1, 1].map(s => { const p = new T.Group(); p.position.set(s * 0.11, 0.85, 0); b.add(p); P(leg, 0.15, 0.82, 0.17, 0, -0.41, 0, p); P(0x1a1a1a, 0.16, 0.08, 0.26, 0, -0.82, -0.04, p); return p; });
    const arms = [-1, 1].map(s => { const p = new T.Group(); p.position.set(s * 0.29, 1.42, 0); b.add(p); P(top, 0.11, 0.6, 0.12, 0, -0.3, 0, p); P(sk, 0.09, 0.1, 0.1, 0, -0.64, 0, p); return p; });
    P(top, 0.46, st.long ? 0.9 : 0.62, 0.26, 0, st.long ? 1.05 : 1.15, 0); P(sk, 0.22, 0.24, 0.22, 0, 1.63, 0); P(st.hood ? top : pick(HAIR), 0.24, st.hood ? 0.2 : 0.09, 0.24, 0, 1.77, 0.02);
    g.scale.setScalar(sc * (0.92 + rnd() * 0.16)); root.add(g); return { g, b, legs, arms }; }
  function dog() { const g = new T.Group(), c = pick([0x3a2a1a, 0xd8c8a0, 0x1a1a1a, 0x8a5a2a]); const P = (w, h, d, x, y, z) => { const m = new T.Mesh(BX, M(c)); m.scale.set(w, h, d); m.position.set(x, y, z); g.add(m); };
    P(0.22, 0.22, 0.6, 0, 0.42, 0); P(0.18, 0.2, 0.22, 0, 0.58, -0.36); for (const x of [-0.08, 0.08]) for (const z of [-0.22, 0.22]) P(0.06, 0.32, 0.06, x, 0.16, z); P(0.04, 0.04, 0.22, 0, 0.55, 0.36); root.add(g); return g; }
  const A = [], tmp = new T.Vector3(), Y0 = {};
  // walker along a polyline of [e,n] (loop or ping-pong), optional pauses; y = deck height
  function walker(zone, pts, o2 = {}) { const p = person(o2.style, o2.sc); const W = pts.map(([e, n]) => at(e, n)); let L = 0; const seg = W.slice(1).map((b, i) => { const l = W[i].distanceTo(b); L += l; return l; });
    const a = { p, W, seg, L, s: rnd() * L, v: o2.v ?? 1.2 + rnd() * 0.4, y: o2.y || 0, loop: o2.loop !== false, dir: 1, idle: o2.idle || 0, dog: o2.dog ? dog() : null, ph: rnd() * 6, door: o2.door, hide: 0, kind: 'walk' };
    A.push(a); info[zone]++; return a; }
  function idler(zone, e, n, faceE, faceN, o2 = {}) { const p = person(o2.style, o2.sc), w = at(e, n), f = at(faceE, faceN); p.g.position.set(w.x, o2.y || 0, w.z); p.g.rotation.y = Math.atan2(-(f.x - w.x), -(f.z - w.z));
    if (o2.sit) { p.legs.forEach(l => l.rotation.x = -1.4); p.b.position.y = -0.4; } A.push({ p, kind: 'idle', ph: rnd() * 6, chat: o2.chat }); info[zone]++; }
  const posAt = (a, s) => { let i = 0; while (i < a.seg.length - 1 && s > a.seg[i]) { s -= a.seg[i]; i++; } const t = Math.min(1, s / (a.seg[i] || 1)); return [tmp.copy(a.W[i]).lerp(a.W[i + 1], t), a.W[i + 1].x - a.W[i].x, a.W[i + 1].z - a.W[i].z]; };
  // ---- BUSY: Marine Parade seafront, Britannia (n 517) -> Pleasure Beach (n -1078); road centre from golden_mile, people on both pavements ----
  const gm = [[22, 454], [15, 250], [-7, -15], [-5, -37], [-10, -104], [-13, -127], [-21, -153], [-44, -426], [-48, -514], [-54, -549], [-48, -569], [-46, -593], [-70, -1101]];
  const roadE = n => { for (let i = 0; i < gm.length - 1; i++) { const [e0, n0] = gm[i], [e1, n1] = gm[i + 1]; if (n <= n0 && n >= n1) return e0 + (e1 - e0) * (n - n0) / (n1 - n0); } return gm[0][0]; };
  const STY = ['tourist', 'hoodie', 'jacket', 'coat', undefined, undefined, 'tourist'];
  for (let k = 0; k < 22; k++) { const side = k % 2 ? -1 : 1, n0 = 500 - rnd() * 1560, len = 40 + rnd() * 120, off = side * (7.5 + rnd() * 1.5); // pavements ~8 m either side of the centreline
    const pts = [n0, n0 - len].map(n => [roadE(n) + off, n]); const a = walker('busy', pts, { style: pick(STY), loop: false, idle: rnd() < 0.4 ? 3 + rnd() * 5 : 0, sc: 0.95 }); if (k % 7 === 3) { walker('busy', pts.map(([e, n]) => [e + 0.7, n + 0.6]), { style: pick(STY), loop: false, sc: 0.85 }).s = a.s; } }
  for (let k = 0; k < 6; k++) { const n = 480 - rnd() * 1500, e = roadE(n) - 8.2; idler('busy', e, n, e + 3, n + (k % 2 ? 1 : -1)); idler('busy', e + 0.5, n + 0.9, e, n, { chat: 1 }); } // chatting pairs outside arcades
  // Regent Road (approx line from Marine Parade by n 290 west to the Market) + town centre / Market Gates
  for (let k = 0; k < 8; k++) { const side = k % 2 ? -1 : 1, e0 = -40 - rnd() * 380; walker('busy', [[e0, 290 + 0.25 * (e0 + 40) * -0.2 + side * 5], [e0 - 60, 290 + 0.25 * (e0 + 100) * -0.2 + side * 5]], { style: pick(STY), loop: false, idle: rnd() < 0.3 ? 4 : 0 }); }
  for (let k = 0; k < 7; k++) { const c = [-500 + rnd() * 40, 430 + rnd() * 20]; walker('busy', [c, [c[0] - 14 + rnd() * 28, c[1] - 14 + rnd() * 28]], { style: pick(STY), loop: false, idle: 2 + rnd() * 4 }); }
  idler('busy', -485, 440, -478, 446, { style: 'coat' }); idler('busy', -484, 441.2, -478, 446, {}); // bus-stand queue
  // ---- MID: The Avenues pub (door e -195.5 n 2350, forecourt e -204.5, Beatty Rd pavement / shelter e -215 n 2349) ----
  idler('mid', -199, 2352.6, -199, 2354, { style: 'hoodie', chat: 1 }); idler('mid', -199, 2354, -199, 2352.6, { style: 'jacket', chat: 1 });
  idler('mid', -206.5, 2343.2, -204, 2350, { style: 'hivis' }); idler('mid', -211, 2356, -208, 2356, { sit: 1, style: 'coat' }); // forecourt wall lean, picnic bench (Sturdee side)
  walker('mid', [[-215, 2349.5], [-197, 2350]], { style: 'tourist', loop: false, door: 'in', v: 1.3 }); walker('mid', [[-197, 2350], [-215, 2347.5]], { style: 'coat', loop: false, door: 'out', v: 1.2 });
  // ---- QUIET ----
  walker('quiet', Array.from({ length: 13 }, (_, i) => [-60 + Math.cos(i / 12 * 6.283) * 27, 2280 + Math.sin(i / 12 * 6.283) * 18]), { dog: 1, v: 1.0, style: 'coat' }); // Barnard Field edge, dog walker
  walker('quiet', [[-85, 2262], [-38, 2262]], { loop: false, sc: 0.7, v: 1.5 }); // kid on the south grass
  walker('quiet', [[-110, 438], [-104, 452]], { loop: false, style: 'coat', idle: 6 }); // Lodge apron visitor
  walker('quiet', [[-100, 2395], [-60, 2395]], { loop: false, style: 'hoodie' }); // Youth Centre path
  walker('quiet', [[-140, 2470], [-138, 2600]], { loop: false }); idler('quiet', -128, 2510, -132, 2510, { style: 'hivis' }); // Sturdee Avenue, one walker + one smoker
  const BP = [-754, 2890]; for (let k = 0; k < 3; k++) { const r = 22 + k * 9; walker('quiet', Array.from({ length: 13 }, (_, i) => [BP[0] + Math.cos(i / 12 * 6.283 + k) * r, BP[1] + Math.sin(i / 12 * 6.283 + k) * r * 0.7]), { dog: 1, v: 1.0 + k * 0.1 }); } // Bure Park dog walkers
  // ---- piers (deck y 1.5) ----
  idler('busy', 326, 511, 340, 511, { y: 1.5, style: 'coat' }); walker('busy', [[200, 515], [320, 515]], { y: 1.5, loop: false }); walker('busy', [[205, 507], [300, 506]], { y: 1.5, loop: false, style: 'tourist' });
  idler('quiet', 212, -488 + 0, 230, -488, { y: 1.5 }); walker('quiet', [[100, -492], [185, -492]], { y: 1.5, loop: false, style: 'jacket' });
  // ---- boats on real water: scan around the Yare (Haven Bridge) and the Bure (Acle New Road) for river cells ----
  const boats = []; const boatAt = (e0, n0) => { const H = fx.waterHit; if (!H) return false; for (let d = 0; d < 200; d += 6) for (const s of [1, -1]) { const e = e0 + s * d; if (H(e, n0) && H(e, n0 + 30) && H(e, n0 - 30)) {
      const g = new T.Group(); const hull = new T.Mesh(BX, M(pick([0xf0f0ea, 0x2a5a8a, 0xb83a2a]))); hull.scale.set(1.6, 0.5, 4.2); hull.position.y = 0.2; g.add(hull); const p1 = person(pick(STY), 0.9); p1.g.position.set(0, -0.2, 0.6); p1.legs.forEach(l => l.rotation.x = -1.4); g.add(p1.g);
      if (rnd() < 0.6) { const p2 = person(undefined, 0.9); p2.g.position.set(0, -0.2, -0.9); p2.legs.forEach(l => l.rotation.x = -1.4); g.add(p2.g); } root.add(g); boats.push({ g, e, n0, ph: rnd() * 6 }); info.boats++; return true; } } return false; };
  setTimeout(() => { for (const [e, n] of [[-967, 300], [-975, 420], [-960, 180], [-940, 973], [-930, 1060]]) boatAt(e, n); }, 4000);
  // ---- seafront arcade glow: lit fascia + sign + bulb canopy on the land side of Marine Parade, Britannia -> Pleasure Beach ----
  const NE = [0xff3fb0, 0x2ff0ff, 0xd04aff, 0xffb02a, 0xff5a3a, 0x7aff5a], glow = [];
  for (let n = 470; n > -1060; n -= 34 + rnd() * 18) { if (Math.abs(n - 107) < 22) continue; // Tower Complex has its own frontage
    const e = roadE(n) - 13.5, w = at(e, n), c = pick(NE), L = 18 + rnd() * 10, grp = new T.Group(); grp.position.set(w.x, 0, w.z); root.add(grp);
    const add = (col, sx, sy, sz, x, y, z, x2) => { const m = new T.Mesh(BX, x2 ? new T.MeshBasicMaterial(Object.assign({ color: col, fog: false, toneMapped: false }, x2)) : M(col, { fog: false, toneMapped: false })); m.scale.set(sx, sy, sz); m.position.set(x, y, z); grp.add(m); return m; };
    add(0x14101c, 0.4, 7, L, -0.4, 3.5, 0); const sign = add(c, 0.3, 1.4, L * 0.8, 0.1, 5.6, 0, { transparent: true }); const win = add(pick(NE), 0.2, 2.6, L * 0.7, 0.1, 1.9, 0, { transparent: true, opacity: 0.55 });
    for (const y of [4.6, 6.6]) add(0xfff2c0, 0.15, 0.12, L, 0.2, y, 0); for (let z = -L / 2; z <= L / 2; z += 1.6) add(0xffe08a, 0.25, 0.25, 0.25, 0.9, 4.3, z);
    glow.push({ sign, win, ph: rnd() * 6, f: 2 + rnd() * 5 }); info.arcades++; }
  fx.npcInfo = info;
  const cam = o.P; let lastCull = 0;
  return { info, update(t, dt) {
    const px = cam ? cam.pos.x : 0, pz = cam ? cam.pos.z : 0, day = fx.env && fx.env.state ? fx.env.state.day : 0.3;
    if (t - lastCull > 0.5) { lastCull = t; for (const a of A) a.near = Math.hypot(a.p.g.position.x - px, a.p.g.position.z - pz) < 450; for (const a of A) { a.p.g.visible = a.near && !a.hide; if (a.dog) a.dog.visible = a.p.g.visible; } }
    for (const a of A) { if (!a.near) continue;
      if (a.kind === 'idle') { a.p.b.rotation.z = Math.sin(t * 0.8 + a.ph) * 0.03; if (a.chat) a.p.arms[1].rotation.x = -0.4 - Math.sin(t * 2 + a.ph) * 0.3; continue; }
      if (a.hide > 0) { a.hide -= dt; if (a.hide <= 0) { a.s = 0; a.p.g.visible = true; } continue; }
      if (a.wait > 0) { a.wait -= dt; a.p.legs.forEach(l => l.rotation.x = 0); a.p.b.rotation.z = Math.sin(t + a.ph) * 0.03; continue; }
      a.s += a.v * dt * a.dir;
      if (a.s >= a.L || a.s <= 0) { if (a.door) { a.hide = 20 + rnd() * 20; a.p.g.visible = false; if (a.dog) a.dog.visible = false; continue; } // pub in/out cycle every ~20–40 s
        if (a.loop && a.W.length > 2) a.s = (a.s + a.L) % a.L; else { a.dir *= -1; a.s = Math.max(0, Math.min(a.L, a.s)); a.wait = a.idle; } }
      const [p, dx, dz] = posAt(a, a.s); a.p.g.position.set(p.x, a.y, p.z); a.p.g.rotation.y = Math.atan2(-dx * a.dir, -dz * a.dir);
      const sw = Math.sin(t * a.v * 5 + a.ph) * 0.5; a.p.legs[0].rotation.x = sw; a.p.legs[1].rotation.x = -sw; a.p.arms[0].rotation.x = -sw * 0.7; a.p.arms[1].rotation.x = sw * 0.7;
      if (a.dog) { const [q] = posAt(a, Math.max(0, Math.min(a.L, a.s + 1.6 * a.dir))); a.dog.position.set(q.x + 0.6, a.y, q.z); a.dog.rotation.y = a.p.g.rotation.y; } }
    for (const b of boats) { const n = b.n0 + Math.sin(t * 0.02 + b.ph) * 30, w = at(b.e, n); b.g.position.set(w.x, 0.1 + Math.sin(t * 1.3 + b.ph) * 0.06, w.z); b.g.rotation.z = Math.sin(t * 0.9 + b.ph) * 0.04; }
    const k = 0.75 + 0.25 * (1 - day); for (const g of glow) { const f = Math.sin(t * g.f + g.ph) > 0.92 ? 0.5 : 1; g.sign.material.opacity = k * f; g.win.material.opacity = 0.35 + 0.4 * (1 - day); }
  } };
}
