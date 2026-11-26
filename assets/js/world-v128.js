/* v128 — street fronts + cheap shared enterable interior for ordinary OSM buildings (preview only).
   IE_V128_FRONTS=false  no doors / canopies / ground-floor windows
   IE_V128_ENTER=false   fronts stay visual only (no walk-in)
   Fronts: 4 shared InstancedMeshes (frames, doors, glass, canopies), streamed within ~110 m (80 m on phones), capped.
   Enter: ONE shared lit room built off-map once, re-tinted per building; exit returns to the same door, collision-safe.
   Skipped: landmarks/plaza clear zones, hand-built Newtown (Sturdee terrace + private homes stay closed and unlabelled), rooms owned by v87/office.
   Nothing here is labelled with a name — private homes are never labelled. No procedural facade shader (no TV static). */
const on = k => window['IE_V128_' + k] !== false;
const NT = [-330, 2060, 240, 2760]; /* Newtown residential box (e0, n0, e1, n1) — leave exactly as built */

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
  const inNT = (e, n) => e > NT[0] && e < NT[2] && n > NT[1] && n < NT[3];
  const freeAt = (e, n, self) => { const l = fx.COL.get(Math.floor(e / fx.COLC) + ':' + Math.floor(n / fx.COLC)); if (!l) return true; for (const b of l) if (b !== self && b.h > 0 && e > b.x0 && e < b.x1 && n > b.y0 && n < b.y1 && fx.inPoly(b.p, e, n)) return false; return true; };

  /* pick the best street-facing edge once per building, cached on the collision record */
  function frontOf(b) {
    if (b.f128 !== undefined) return b.f128;
    b.f128 = null; const p = b.p; if (!p || p.length < 3 || b.h < 3.2) return null;
    let cx = 0, cn = 0; for (const [e, n] of p) { cx += e; cn += n; } cx /= p.length; cn /= p.length;
    if (inNT(cx, cn)) return null;
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

  /* ---------------- shared generic interior (one lit room, built on first entry, off-map like v87) ---------------- */
  const RX = -1300, RZ = -4600, FY = -230, W = 12, D = 10, HH = 3.2;
  let room = null, cur = null, busy = 0, exitAt = 0, dwell = 0;
  const PAL = [
    { wall: 0xe6dccb, floor: 0x8a6a46, sofa: 0x40607e, rug: 0x9a3b3b },
    { wall: 0xcfd8cf, floor: 0x6f5a45, sofa: 0x7a3b3b, rug: 0x2f5d4d },
    { wall: 0xdad2c0, floor: 0xa28b68, sofa: 0x3d4a40, rug: 0x3b4f7a },
    { wall: 0xc8cfdc, floor: 0x5d5149, sofa: 0x8a6a35, rug: 0x6b3b63 },
    { wall: 0xe2c9b0, floor: 0x7d6b5a, sofa: 0x2f3b52, rug: 0x7a5d2b }];
  const fadeOn = () => { const f = fx.bm && fx.bm.fade; if (f) { f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); } };
  function buildRoom() {
    const g = new T.Group(); g.name = 'v128-room'; g.position.set(RX, FY, RZ); g.visible = false; S.add(g);
    const M = c => new T.MeshBasicMaterial({ color: c });
    const shell = [M(0xd8d0c0), M(0xd8d0c0), M(0xf4f1ea), M(0x8a6a46), M(0xcfc7b6), M(0xcfc7b6)]; /* +x -x ceiling floor +z -z (BackSide) */
    shell.forEach(m => m.side = T.BackSide);
    const room_ = new T.Mesh(new T.BoxGeometry(W, HH, D), shell); room_.position.y = HH / 2; g.add(room_);
    const add = (geo, col, x, y, z, ry = 0) => { const m = new T.Mesh(geo, M(col)); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m; };
    const B = (a, b, c) => new T.BoxGeometry(a, b, c);
    const rug = add(B(4, 0.02, 3), 0x9a3b3b, 0, 0.012, 0.2);
    const sofa1 = add(B(2.2, 0.5, 0.9), 0x40607e, -3.0, 0.25, -3.6), sofa2 = add(B(2.2, 0.5, 0.18), 0x40607e, -3.0, 0.7, -4.02);
    const table = add(B(1.1, 0.45, 0.7), 0x5b4129, 0, 0.225, 0.2);
    const shelf = add(B(2.6, 2.0, 0.4), 0x5b4129, 3.6, 1.0, -4.5); for (let i = 0; i < 6; i++) add(B(0.3, 0.4, 0.28), [0xaa3333,0x3366aa,0x22aa66,0xccaa33,0x8844aa,0xcccccc][i], 2.7 + i * 0.36, 1.45 + (i % 2) * 0.4, -4.45);
    const counter = add(B(3.0, 1.0, 0.7), 0x8a8f95, 4.5, 0.5, 1.6, Math.PI / 2);
    add(new T.CylinderGeometry(0.22, 0.18, 0.4, 10), 0x7a4a2a, -5.0, 0.2, 2.0); add(new T.SphereGeometry(0.4, 10, 8), 0x2f7a3b, -5.0, 0.8, 2.0); /* plant */
    add(B(0.06, 1.1, 1.8), 0xbfe4ff, -5.97, 1.7, -0.5); /* wall window glow */
    add(B(0.9, 0.06, 0.9), 0xfff4d0, 0, HH - 0.05, 0); add(new T.SphereGeometry(0.16, 8, 6), 0xffe9a8, -3.6, 1.15, -3.0); /* ceiling light + lamp */
    const door = add(B(1.0, 2.1, 0.08), 0x2b2b30, 0, 1.05, D / 2 - 0.05); add(B(1.2, 2.25, 0.04), 0xd9d2c2, 0, 1.12, D / 2 - 0.03);
    room = { g, shell, rug, sofa1, sofa2, floor: shell[3], wall: [shell[0], shell[1], shell[4], shell[5]], door };
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
        const pal = PAL[Math.floor(d.seed * PAL.length) % PAL.length];
        room.wall.forEach(m => m.color.setHex(pal.wall)); room.floor.color.setHex(pal.floor); room.rug.material.color.setHex(pal.rug); room.sofa1.material.color.setHex(pal.sofa); room.sofa2.material.color.setHex(pal.sofa);
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
      const tx = x - RX, tz = z - (RZ + 0.2); if (Math.abs(tx) < 1.45 && Math.abs(tz) < 1.05) { if (Math.abs(tx) / 1.45 > Math.abs(tz) / 1.05) x = RX + Math.sign(tx || 1) * 1.45; else z = RZ + 0.2 + Math.sign(tz || 1) * 1.05; }
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
