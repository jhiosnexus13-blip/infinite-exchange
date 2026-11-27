/* v128/v129 — street fronts + cheap shared enterable interiors for ordinary OSM buildings (preview only).
   IE_V128_FRONTS=false  no doors / canopies / ground-floor windows
   IE_V128_ENTER=false   fronts stay visual only (no walk-in)
   Fronts: 4 shared InstancedMeshes (frames, doors, glass, canopies), streamed within ~110 m (80 m on phones), capped.
   Enter: ONE shared off-map room, built lazily, with several prop-set variants picked deterministically per building
   (lounge, kitchen, cafe, pub, office, bedroom, arcade, workshop). Same door exit. Never labelled.
   v129: Newtown homes (Sturdee Avenue terrace, Lewi G's house and the rest) get the same fronts and interiors.
   Landmarks / plaza clear zones and rooms owned by v87 / the office are still skipped. No facade shader. */
const on = k => window['IE_V128_' + k] !== false;

export function initV128({ T, S, CAM, P, LITE, warp, fx }) {
  const info = { fronts: 0, enters: 0, exits: 0, inside: false, doors: 0, ready: true };
  fx.v128Info = info; window.__fx128 = info;
  if (!on('FRONTS')) return { info, update() {} };

  const R = LITE ? 80 : 110, CAP = LITE ? 260 : 520, MOVE = 40;
  const grp = new T.Group(); grp.name = 'v128-fronts'; S.add(grp);
  const box = new T.BoxGeometry(1, 1, 1);
  const mk = (col, n, vc) => { const m = new T.InstancedMesh(box, new T.MeshBasicMaterial({ color: col, fog: true }), n); m.count = 0; m.frustumCulled = false; if (vc) { m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(n * 3), 3); m.material.color.setHex(0xffffff); } grp.add(m); return m; };
  const frames = mk(0xd9d2c2, CAP * 4), doors = mk(0xffffff, CAP, true), glass = mk(0x1d2c38, CAP * 3), canopies = mk(0x3b3f45, CAP);
  frames.name = 'v128-frames'; doors.name = 'v128-doors'; glass.name = 'v128-glass'; canopies.name = 'v128-canopy';
  const DOORCOL = [0x7a1f1f, 0x1f3d6b, 0x1f4d34, 0x2b2b30, 0x6b4a22, 0x5a2a5e, 0x8a8f95].map(h => new T.Color(h));
  const dummy = new T.Object3D(), tmpC = new T.Color();
  const put = (im, i, x, y, z, ry, sx, sy, sz) => { dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.set(sx, sy, sz); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); };

  const hAt = (x, z) => { try { return fx.earth && fx.earth.heightAt ? Math.max(0, Math.min(3, fx.earth.heightAt(x, z))) : 0; } catch (_) { return 0; } };
  const freeAt = (e, n, self) => { const l = fx.COL.get(Math.floor(e / fx.COLC) + ':' + Math.floor(n / fx.COLC)); if (!l) return true; for (const b of l) if (b !== self && b.h > 0 && e > b.x0 && e < b.x1 && n > b.y0 && n < b.y1 && fx.inPoly(b.p, e, n)) return false; return true; };

  /* pick the best street-facing edge once per building, cached on the collision record */
  function frontOf(b) {
    if (b.f128 !== undefined) return b.f128;
    b.f128 = null; const p = b.p; if (!p || p.length < 3 || b.h < 3.2) return null;
    let cx = 0, cn = 0; for (const [e, n] of p) { cx += e; cn += n; } cx /= p.length; cn /= p.length;
    let best = null, bs = -1;
    for (let i = 0; i < p.length; i++) {
      const [e0, n0] = p[i], [e1, n1] = p[(i + 1) % p.length], dx = e1 - e0, dy = n1 - n0, len = Math.hypot(dx, dy); if (len < 4.2) continue;
      const nx = dy / len, ny = -dx / len, me = (e0 + e1) / 2, mn = (n0 + n1) / 2; /* CCW footprint -> outward normal */
      if (!freeAt(me + nx * 1.1, mn + ny * 1.1, b) || !freeAt(me + nx * 2.2, mn + ny * 2.2, b)) continue; /* party walls / back-to-backs / courtyards stay blank */
      const sc = len + (freeAt(me + nx * 7, mn + ny * 7, b) ? 8 : 0); if (sc > bs) { bs = sc; best = { e0, n0, dx: dx / len, dy: dy / len, len, nx, ny, out: Math.max(0, Math.min(1, 0.025 * ((me - cx) * nx + (mn - cn) * ny))) /* v69 skins are scaled 1.025 about the centroid, so the wall stands this far outside the footprint */ }; }
    }
    if (best) { /* door slot centre: middle of the edge, nudged off the exact centre so neighbouring plots don't mirror */
      best.door = Math.max(1.1, Math.min(best.len - 1.1, best.len * (0.36 + (((b.x0 * 7 + b.y0 * 13) | 0) & 7) * 0.04))); }
    return (b.f128 = best);
  }

  const lmOK = (x, z) => { const L = fx.landmarks; if (L) for (const k in L) { const q = L[k].pos; if (q && (x - q.x) ** 2 + (z - q.z) ** 2 < 34 * 34) return false; }
    if (fx.clear) for (const [cx, cz, cr] of fx.clear) if ((x - cx) ** 2 + (z - cz) ** 2 < (cr + 4) ** 2) return false; return true; };

  const st = { cx: 1e9, cz: 1e9, t: -9, doors: [], tries: 0 }; info.list = () => st.doors;
  function rebuild(px, pz) {
    if (!fx.COL || !fx.COL.size) return;
    const seen = new Set(), list = [], c0 = Math.floor((px - R) / fx.COLC), c1 = Math.floor((px + R) / fx.COLC), n0 = Math.floor((-pz - R) / fx.COLC), n1 = Math.floor((-pz + R) / fx.COLC);
    for (let i = c0; i <= c1; i++) for (let j = n0; j <= n1; j++) { const l = fx.COL.get(i + ':' + j); if (l) for (const b of l) if (b.h > 0 && !seen.has(b)) { seen.add(b); list.push(b); } }
    const cand = [];
    for (const b of list) { const f = frontOf(b); if (!f) continue; const dm = f.e0 + f.dx * f.door, dn = f.n0 + f.dy * f.door; const d2 = (dm - px) ** 2 + (-dn - pz) ** 2; if (d2 > R * R) continue; cand.push([d2, b, f]); }
    cand.sort((a, c) => a[0] - c[0]); if (cand.length > CAP) cand.length = CAP;
    let nf = 0, nd = 0, ng = 0, nc = 0; st.doors = [];
    for (const [, b, f] of cand) {
      const wx = e => e, ang = Math.atan2(f.nx, -f.ny); /* world outward = (nx, -ny) */
      const ox = f.nx, oz = -f.ny, tx = f.dx, tz = -f.dy; /* tangent in world */
      const at = s => { const e = f.e0 + f.dx * s, n = f.n0 + f.dy * s, w = warp(e, n); return [w.x + ox * f.out, w.z + oz * f.out, e, n]; };
      const [dxw, dzw, de, dn] = at(f.door); if (!lmOK(dxw, dzw)) continue;
      const y0 = hAt(dxw, dzw), dh = Math.min(2.15, b.h - 0.8), seed = (((b.x0 * 3 + b.y0 * 5) | 0) & 63) / 64;
      if (nd >= CAP) break;
      /* door frame + door + canopy */
      put(frames, nf++, dxw + ox * 0.06, y0 + (dh + 0.2) / 2, dzw + oz * 0.06, ang, 1.35, dh + 0.2, 0.1);
      put(doors, nd, dxw + ox * 0.12, y0 + dh / 2, dzw + oz * 0.12, ang, 1.0, dh, 0.14);
      tmpC.copy(DOORCOL[Math.floor(seed * DOORCOL.length) % DOORCOL.length]); doors.setColorAt(nd, tmpC); nd++;
      put(canopies, nc++, dxw + ox * 0.5, y0 + dh + 0.32, dzw + oz * 0.5, ang, 1.9, 0.12, 1.0);
      /* ground-floor windows: slots every ~3.4 m either side of the door, never across the door */
      let wn = 0;
      for (let s = f.door - 3.4; s > 1.0 && wn < 2; s -= 3.4, wn++) { const [wx_, wz_] = at(s); if (ng < CAP * 3 && nf < CAP * 4) { put(frames, nf++, wx_ + ox * 0.06, y0 + 1.5, wz_ + oz * 0.06, ang, 1.5, 1.3, 0.1); put(glass, ng++, wx_ + ox * 0.1, y0 + 1.5, wz_ + oz * 0.1, ang, 1.28, 1.08, 0.12); } }
      wn = 0;
      for (let s = f.door + 3.4; s < f.len - 1.0 && wn < 2; s += 3.4, wn++) { const [wx_, wz_] = at(s); if (ng < CAP * 3 && nf < CAP * 4) { put(frames, nf++, wx_ + ox * 0.06, y0 + 1.5, wz_ + oz * 0.06, ang, 1.5, 1.3, 0.1); put(glass, ng++, wx_ + ox * 0.1, y0 + 1.5, wz_ + oz * 0.1, ang, 1.28, 1.08, 0.12); } }
      st.doors.push({ x: dxw, z: dzw, ox, oz, b, y0, seed });
    }
    frames.count = nf; doors.count = nd; glass.count = ng; canopies.count = nc;
    for (const im of [frames, doors, glass, canopies]) { im.instanceMatrix.needsUpdate = true; } if (doors.instanceColor) doors.instanceColor.needsUpdate = true;
    info.fronts = nd; info.doors = st.doors.length; info.glass = ng; st.cx = px; st.cz = pz;
  }

  /* ---------------- one shared off-map room; v129 swaps a cheap prop-set variant per building ---------------- */
  const RX = -1300, RZ = -4600, FY = -230, W = 12, D = 10, HH = 3.2;
  const KINDS = ['lounge', 'kitchen', 'cafe', 'pub', 'office', 'bedroom', 'arcade', 'workshop'];
  let room = null, cur = null, busy = 0, exitAt = 0, dwell = 0;
  const fadeOn = () => { const f = fx.bm && fx.bm.fade; if (f) { f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); } };
  function kindOf(d) {
    const b = d.b || {}, h = b.h || 6, area = Math.max(1, (b.x1 - b.x0) * (b.y1 - b.y0));
    let k = Math.abs(((b.x0 * 13 + b.y0 * 29) | 0) + ((d.seed * 97) | 0)) % 8;
    if (area > 420 || h > 10) k = [2, 3, 4, 6][k % 4];
    else if (area < 90) k = [0, 5, 1, 7][k % 4];
    return KINDS[k];
  }
  function buildRoom() {
    const g = new T.Group(); g.name = 'v128-room'; g.position.set(RX, FY, RZ); g.visible = false; S.add(g);
    const M = c => new T.MeshBasicMaterial({ color: c });
    const shell = [M(0xd8d0c0), M(0xd8d0c0), M(0xf4f1ea), M(0x8a6a46), M(0xcfc7b6), M(0xcfc7b6)];
    shell.forEach(m => m.side = T.BackSide);
    const box = new T.Mesh(new T.BoxGeometry(W, HH, D), shell); box.position.y = HH / 2; g.add(box);
    const B = (a, b, c) => new T.BoxGeometry(a, b, c);
    const add = (par, geo, col, x, y, z, ry = 0) => { const m = new T.Mesh(geo, M(col)); m.position.set(x, y, z); m.rotation.y = ry; par.add(m); return m; };
    /* shared door, window glow, ceiling light — same exit wall every variant */
    add(g, B(1.0, 2.1, 0.08), 0x2b2b30, 0, 1.05, D / 2 - 0.05);
    add(g, B(1.2, 2.25, 0.04), 0xd9d2c2, 0, 1.12, D / 2 - 0.03);
    add(g, B(0.06, 1.1, 1.8), 0xbfe4ff, -5.97, 1.7, -0.5);
    const ceil = add(g, B(0.9, 0.06, 0.9), 0xfff4d0, 0, HH - 0.05, 0);
    const variants = {}, blockers = {};
    const kit = (name, wall, floor, light, fn) => {
      const v = new T.Group(); v.name = 'v129-' + name; v.visible = false; v.userData = { wall, floor, light }; g.add(v);
      const A = (geo, col, x, y, z, ry, hx, hz) => { add(v, geo, col, x, y, z, ry || 0); if (hx) (blockers[name] || (blockers[name] = [])).push({ x, z, hx, hz }); };
      fn(A); variants[name] = v;
    };
    kit('lounge', 0xe6dccb, 0x8a6a46, 0xfff4d0, A => {
      A(B(3.2, 0.02, 2.4), 0x9a3b3b, 0, 0.012, -0.4);
      A(B(2.4, 0.5, 0.95), 0x40607e, -2.4, 0.25, -3.7, 0, 1.4, 0.7);
      A(B(2.4, 0.45, 0.18), 0x40607e, -2.4, 0.7, -4.1);
      A(B(1.1, 0.4, 0.7), 0x5b4129, 0, 0.2, -0.2, 0, 0.8, 0.6);
      A(B(1.8, 0.7, 0.4), 0x2b2b30, 3.6, 0.35, -4.5, 0, 1.0, 0.4);
      A(B(1.2, 0.7, 0.08), 0x1a1a22, 3.6, 1.15, -4.55);
      A(new T.CylinderGeometry(0.22, 0.18, 0.4, 8), 0x7a4a2a, -5.0, 0.2, 2.0);
      A(new T.SphereGeometry(0.4, 8, 6), 0x2f7a3b, -5.0, 0.8, 2.0);
      A(new T.SphereGeometry(0.16, 8, 6), 0xffe9a8, -3.6, 1.15, -3.0);
    });
    kit('kitchen', 0xe8efe8, 0xc9b89a, 0xfff8e8, A => {
      A(B(8, 1.0, 0.7), 0xded7ca, 0, 0.5, -4.5, 0, 4.0, 0.5);
      A(B(8, 0.08, 0.7), 0x8a8f95, 0, 1.02, -4.5);
      A(B(0.7, 2.2, 0.7), 0xcfd4d8, -5.2, 1.1, -4.5, 0, 0.5, 0.5);
      A(B(2.2, 0.9, 1.0), 0xeee6d8, 0.2, 0.45, -0.8, 0, 1.3, 0.7);
      A(B(1.4, 0.75, 0.9), 0x5b4129, 3.6, 0.38, 1.4, 0, 0.9, 0.7);
      A(B(0.08, 0.7, 0.7), 0x88c4e0, -1.6, 1.7, -4.55);
      A(B(0.08, 0.7, 0.7), 0x88c4e0, 1.6, 1.7, -4.55);
    });
    kit('cafe', 0xf0e4d4, 0x6b4a32, 0xffe8c8, A => {
      A(B(0.8, 1.15, 5.5), 0x5b3a28, -4.6, 0.58, -0.6, 0, 0.6, 2.8);
      A(B(0.7, 1.0, 0.7), 0x3d2a1c, -4.6, 1.65, -2.8);
      A(B(0.9, 1.1, 0.9), 0xeee6d8, -2.0, 0.55, 1.6, 0, 0.6, 0.6);
      A(B(0.9, 1.1, 0.9), 0xeee6d8, 1.4, 0.55, 0.2, 0, 0.6, 0.6);
      A(B(0.9, 1.1, 0.9), 0xeee6d8, 3.4, 0.55, -2.4, 0, 0.6, 0.6);
      A(B(0.7, 0.08, 0.7), 0x7a1f1f, -2.0, 1.12, 1.6);
      A(B(0.7, 0.08, 0.7), 0x7a1f1f, 1.4, 1.12, 0.2);
      A(B(1.6, 1.2, 0.5), 0xd8c4a0, 4.6, 0.6, -4.3, 0, 0.9, 0.4);
    });
    kit('pub', 0x4a3024, 0x3a2a20, 0xffc878, A => {
      A(B(8.5, 1.15, 0.9), 0x5b3a22, 0, 0.58, -4.3, 0, 4.2, 0.6);
      A(B(8.5, 1.4, 0.3), 0x2b1a12, 0, 1.9, -4.55);
      for (let i = 0; i < 8; i++) A(B(0.12, 0.28, 0.12), [0x7a1f1f, 0xccaa99, 0x2f7a3b, 0xc4a35a][i % 4], -3.2 + i * 0.8, 1.55, -4.45);
      A(B(0.9, 1.0, 0.9), 0x3d2418, -3.0, 0.5, -0.6, 0, 0.6, 0.6);
      A(B(0.9, 1.0, 0.9), 0x3d2418, 1.2, 0.5, 0.8, 0, 0.6, 0.6);
      A(B(0.35, 0.7, 0.35), 0x2b2b30, -3.0, 0.35, -1.4);
      A(B(0.35, 0.7, 0.35), 0x2b2b30, 1.2, 0.35, 0.0);
      A(B(0.12, 1.8, 2.2), 0x1a120c, 5.7, 1.4, -1.0);
    });
    kit('office', 0xd8dee6, 0x6a6560, 0xe8f0ff, A => {
      A(B(2.4, 0.75, 1.1), 0x5b5149, -2.4, 0.38, -2.2, 0.4, 1.4, 0.9);
      A(B(0.55, 1.1, 0.55), 0x2b2b30, -2.0, 0.55, -1.2);
      A(B(0.7, 0.45, 0.08), 0x1a1a22, -2.2, 1.15, -2.5, 0.4);
      A(B(1.0, 1.3, 0.5), 0x6a6e74, 4.4, 0.65, -4.3, 0, 0.7, 0.4);
      A(B(1.0, 1.3, 0.5), 0x6a6e74, 5.1, 0.65, -3.4, 0, 0.6, 0.4);
      A(B(0.4, 2.0, 2.6), 0x5b4129, 5.5, 1.0, 1.2, 0, 0.4, 1.4);
      A(B(1.6, 0.02, 1.2), 0x3b4f7a, 1.2, 0.012, 1.6);
    });
    kit('bedroom', 0xe8d8d0, 0x9a8a78, 0xffe0d0, A => {
      A(B(2.2, 0.5, 1.8), 0x6b3b4a, -2.6, 0.28, -2.6, 0, 1.3, 1.1);
      A(B(2.2, 0.25, 0.4), 0xe8e2d2, -2.6, 0.65, -3.3);
      A(B(0.45, 0.45, 0.45), 0x5b4129, -4.0, 0.23, -2.6, 0, 0.35, 0.35);
      A(B(0.45, 0.45, 0.45), 0x5b4129, -1.2, 0.23, -2.6, 0, 0.35, 0.35);
      A(B(1.2, 2.1, 0.55), 0x5b5149, 4.8, 1.05, -4.3, 0, 0.7, 0.4);
      A(B(2.0, 0.02, 1.4), 0x7a5d2b, 1.6, 0.012, 1.2);
      A(new T.SphereGeometry(0.14, 8, 6), 0xffe9a8, -4.0, 0.7, -2.6);
    });
    kit('arcade', 0x1a1230, 0x2a2438, 0xff66cc, A => {
      for (let i = 0; i < 3; i++) { A(B(0.9, 1.6, 0.8), [0x2a1a44, 0x1a2a44, 0x1a2040][i], -3.6 + i * 2.2, 0.8, -3.6, 0, 0.6, 0.55); A(B(0.8, 0.55, 0.08), [0xff2e4a, 0x3b7bff, 0x00ff9d][i], -3.6 + i * 2.2, 1.35, -3.2); }
      for (let i = 0; i < 2; i++) { A(B(0.9, 1.6, 0.8), 0x241a38, 2.2 + i * 2.0, 0.8, 0.4, 0, 0.6, 0.55); A(B(0.8, 0.55, 0.08), [0xffc83a, 0xff66cc][i], 2.2 + i * 2.0, 1.35, 0.8); }
      A(B(2.2, 1.0, 0.7), 0x3b2a5e, -4.4, 0.5, 2.0, 0, 1.2, 0.5);
      A(B(0.2, 0.2, 0.2), 0xff66cc, 0, 3.0, 0);
    });
    kit('workshop', 0xc8c0b0, 0x6a5a48, 0xffe8a0, A => {
      A(B(3.6, 0.9, 0.9), 0x5b4129, -2.2, 0.45, -4.2, 0, 1.9, 0.6);
      A(B(0.5, 0.3, 0.8), 0x8a8f95, -1.2, 1.0, -4.2);
      A(B(0.08, 1.6, 3.0), 0x4a4038, 5.7, 1.4, -1.4);
      A(B(1.0, 0.8, 1.0), 0x3b3f45, 3.8, 0.4, -3.8, 0, 0.6, 0.6);
      A(B(0.8, 0.6, 0.8), 0x6a4a22, 4.6, 0.3, -2.4, 0, 0.5, 0.5);
      A(new T.CylinderGeometry(0.45, 0.45, 0.3, 12), 0x2b2b30, -4.4, 0.15, 1.6);
      A(B(1.2, 1.2, 0.8), 0x7a6a50, 3.2, 0.6, 1.8, 0, 0.7, 0.5);
    });
    room = { g, shell, floor: shell[3], wall: [shell[0], shell[1], shell[4], shell[5]], ceil, variants, blockers };
  }

  (window.__groundParts = window.__groundParts || []).unshift(() => cur ? FY : null);

  const btn = document.createElement('button'); btn.type = 'button'; btn.id = 'v128tip'; document.body.appendChild(btn);
  btn.style.cssText = 'position:fixed;left:50%;bottom:30%;transform:translateX(-50%);z-index:140;display:none;padding:12px 20px;font:bold 16px Arial,sans-serif;background:#0b0e12;color:#e8e2d2;border:2px solid #b9a97f;border-radius:8px;cursor:pointer;pointer-events:auto;touch-action:manipulation';
  let act = null;
  const show = (txt, fn) => { act = fn; if (btn.textContent !== txt) btn.textContent = txt; btn.style.display = 'block'; };
  const hide = () => { act = null; btn.style.display = 'none'; };
  const go = e => { if (e) { e.preventDefault(); e.stopPropagation(); } if (act) act(); };
  btn.onclick = go; btn.ontouchend = go;
  addEventListener('keydown', e => { if (btn.style.display !== 'block') return; if (e.code === 'KeyF' || (cur && (e.code === 'Enter' || e.code === 'NumpadEnter'))) { e.preventDefault(); go(e); } });

  const clearOK = (x, z) => { const C = window.__collide; return !C || !C(x, z, 0.8); };
  function enter(d) {
    if (cur || busy || !on('ENTER')) return; busy = 1; hide(); fadeOn(); info.enters++;
    try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch (_) {}
    setTimeout(() => {
      try {
        if (!room) buildRoom();
        const kind = kindOf(d); d.kind = kind; info.kind = kind;
        for (const k in room.variants) room.variants[k].visible = k === kind;
        const u = room.variants[kind].userData;
        room.wall.forEach(m => m.color.setHex(u.wall)); room.floor.color.setHex(u.floor); room.ceil.material.color.setHex(u.light);
        room.g.visible = true; cur = d; info.inside = true; fx.cullT = 0;
        P.pos.set(RX, FY + 1.7, RZ + 2.4); P.yaw = 0; P.pitch = 0;
      } catch (err) { console.warn('v128 enter', err); cur = null; info.inside = false; }
      busy = 0; dwell = 0; exitAt = performance.now();
    }, 180);
  }
  function leave() {
    if (!cur || busy) return; busy = 1; hide(); fadeOn(); info.exits++; const d = cur;
    setTimeout(() => {
      let x = d.x + d.ox * 1.7, z = d.z + d.oz * 1.7;
      for (const k of [1.7, 2.4, 3.2, 4.2]) { x = d.x + d.ox * k; z = d.z + d.oz * k; if (clearOK(x, z)) break; if (clearOK(x - d.oz * 1.2, z + d.ox * 1.2)) { x = x - d.oz * 1.2; z = z + d.ox * 1.2; break; } if (clearOK(x + d.oz * 1.2, z - d.ox * 1.2)) { x = x + d.oz * 1.2; z = z - d.ox * 1.2; break; } }
      cur = null; info.inside = false; if (room) room.g.visible = false;
      P.pos.set(x, 1.7 + hAt(x, z), z); P.yaw = Math.atan2(-d.ox, -d.oz); P.pitch = 0; fx.cullT = 0; busy = 0; exitAt = performance.now(); dwell = 0; st.cx = 1e9;
    }, 180);
  }
  let wrapped = false;
  const wrapClear = () => { if (wrapped || !fx.clearRoomState) return; wrapped = true; const o = fx.clearRoomState; fx.clearRoomState = function () { if (cur) { cur = null; info.inside = false; if (room) room.g.visible = false; busy = 0; hide(); exitAt = performance.now(); } return o.apply(this, arguments); }; };

  let tk = 0;
  function update(t) {
    wrapClear();
    if (cur) { /* inside: clamp to the room, push off the table, exit at the door */
      let x = P.pos.x, z = P.pos.z; x = Math.max(RX - 5.2, Math.min(RX + 5.2, x)); z = Math.max(RZ - 4.2, Math.min(RZ + 4.3, z));
      const bl = (cur && cur.kind && room && room.blockers[cur.kind]) || [];
      for (const b of bl) { const dx = x - (RX + b.x), dz = z - (RZ + b.z); if (Math.abs(dx) < b.hx + 0.45 && Math.abs(dz) < b.hz + 0.45) { if (Math.abs(dx) / (b.hx + 0.45) > Math.abs(dz) / (b.hz + 0.45)) x = RX + b.x + Math.sign(dx || 1) * (b.hx + 0.45); else z = RZ + b.z + Math.sign(dz || 1) * (b.hz + 0.45); } }
      P.pos.x = x; P.pos.z = z; if (P.pos.y < FY + 1) P.pos.y = FY + 1.7;
      const nearDoor = Math.abs(x - RX) < 1.4 && z > RZ + 3.3; const fz = -Math.cos(P.yaw);
      if (nearDoor && !busy) { show('EXIT — tap / Enter / F', leave); dwell = (z > RZ + 4.0 && fz > 0.55) ? dwell + 1 / 60 : 0; if (dwell > 0.4 && performance.now() - exitAt > 900) leave(); } else if (!busy) { hide(); dwell = 0; }
      return;
    }
    const px = P.pos.x, pz = P.pos.z;
    if (window.__trainRiding) { hide(); return; }
    const moved = Math.hypot(px - st.cx, pz - st.cz) > MOVE, loading = fx.geo && !fx.geo.done && t - st.t > 3, retry = !st.doors.length && st.tries < 12 && t - st.t > 6;
    if (moved || loading || retry) { st.t = t; st.tries++; rebuild(px, pz); }
    if (t - tk < 0.12) return; tk = t;
    if (busy || performance.now() - exitAt < 1300 || !on('ENTER') || P.pos.y > 8) { if (!busy) hide(); return; }
    const fx_ = -Math.sin(P.yaw), fz_ = -Math.cos(P.yaw); let hit = null, hd = 9;
    for (const d of st.doors) { const dx = px - d.x, dz = pz - d.z; if (dx * dx + dz * dz > 25) continue; const dn = dx * d.ox + dz * d.oz, dl = Math.abs(dx * -d.oz + dz * d.ox); if (dn > -0.2 && dn < 2.6 && dl < 1.7 && dn < hd) { hd = dn; hit = d; hit.fz = -(fx_ * d.ox + fz_ * d.oz); hit.dn = dn; hit.dl = dl; } }
    if (hit) { show('ENTER — tap / F', () => enter(hit)); dwell = (hit.dn < 1.5 && hit.dl < 1.1 && hit.fz > 0.6) ? dwell + 0.12 : 0; if (dwell > 0.36) { dwell = 0; enter(hit); } } else { hide(); dwell = 0; }
  }
  return { info, update, enter, leave };
}
