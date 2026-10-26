/* JHIOS world v41 — Seafront land train + seagulls.
   Train: runs on the real OSM road centreline (North Drive > Marine Parade / Golden Mile > South Beach Parade > South Denes toward the Harbour Mouth),
   stops at real points; tap RIDE (or the train) to board, ride at speed with the camera, hop off at any stop or pick a destination.
   One merged LineSegments for the train (rewritten per frame, ~200 verts), one for all stop shelters; nothing is added to the clickables list.
   Gulls: one InstancedMesh, circling high overhead; a shader fades them out below ~40° elevation so they only appear when you look up. */
let T, S, CAM, P, LBL, LITE, RED, fx, warp, openNear, CV;
const STOPS = [['north_drive', 'North Drive', 52.624514, 1.738397], ['fallen_angels', 'Fallen Angels', 52.609742, 1.736766], ['britannia_pier', 'Britannia Pier', 52.6081748, 1.7395651], ['tower_complex', 'Tower Complex', 52.604471, 1.736196],
  ['wellington_pier', 'Wellington Pier', 52.5993089, 1.7366743], ['pleasure_beach', 'Pleasure Beach', 52.5937437, 1.7355419], ['harbour_mouth', 'Harbour Mouth', 52.57256, 1.73889]];
const CARS = [[4.6, 0x00e5ff], [6.2, 0xff5fd2], [6.2, 0xffc84a], [6.2, 0x9d7dff]], GAP = 1.0, CW = 2.3, CH = 2.6; // v42: engine + 3 open canopy carriages, like the real Golden Mile road train

export function initTrain(o) {
  ({ T, S, CAM, P, LBL, LITE, RED, fx, warp, openNear, CV } = o); const G = o.G, ORG = o.ORG;
  // ---- route (OSM road nodes, metres e/n from origin) ----
  const gm = G.golden_mile.coords, raw = []; for (let i = 0; i < gm.length; i += 2) raw.push([gm[i], gm[i + 1]]);
  let iN = raw.findIndex(p => p[0] === 103 && p[1] === 1616); if (iN < 0) iN = raw.length - 1;
  let south = raw.slice(0, iN + 1); // Pleasure Beach .. North Drive (Golden Mile order)
  for (let i = 0; i < south.length; i++) { const k = south.findIndex((p, j) => j > i && p[0] === south[i][0] && p[1] === south[i][1]); if (k > 0) south.splice(i + 1, k - i); } // drop the Britannia Pier out-and-back spur
  const north = [[114, 2371], [112, 2123], [107, 1789]]; // North Drive (OSM) up to the seafront shelter
  const spur = []; if (G.harbour_spur) { const c = G.harbour_spur.coords; for (let i = 2; i < c.length; i += 2) spur.push([c[i], c[i + 1]]); }
  let en = north.concat(south.reverse(), spur);
  for (let it = 0; it < 3; it++) { const o2 = [en[0]]; for (let i = 0; i < en.length - 1; i++) { const a = en[i], b = en[i + 1]; o2.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } o2.push(en[en.length - 1]); en = o2; } // v42: Chaikin-rounded corners (smooth ride)
  const path = en.map(([e, n]) => warp(e, n)), cum = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + path[i].distanceTo(path[i - 1]));
  const L = cum[cum.length - 1];
  const at = (s, out) => { s = Math.max(0, Math.min(L, s)); let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const a = path[lo], b = path[hi], f = (s - cum[lo]) / ((cum[hi] - cum[lo]) || 1); out.x = a.x + (b.x - a.x) * f; out.z = a.z + (b.z - a.z) * f; out.dx = (b.x - a.x); out.dz = (b.z - a.z); const l = Math.hypot(out.dx, out.dz) || 1; out.dx /= l; out.dz /= l; return out; };
  const project = (x, z) => { let best = 1e18, bs = 0; for (let i = 1; i < path.length; i++) { const a = path[i - 1], b = path[i], vx = b.x - a.x, vz = b.z - a.z, l2 = vx * vx + vz * vz || 1;
    const f = Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / l2)), px = a.x + vx * f, pz = a.z + vz * f, d = (px - x) ** 2 + (pz - z) ** 2; if (d < best) { best = d; bs = cum[i - 1] + Math.sqrt(l2) * f; } } return [bs, Math.sqrt(best)]; };
  const loc = (lat, lon) => ({ e: (lon - ORG.lon) * Math.cos(ORG.lat * Math.PI / 180) * 111320, n: (lat - ORG.lat) * 110540 });
  const tmp = {};
  const stops = STOPS.map(([k, name, lat, lon]) => { const q = loc(lat, lon), w = warp(q.e, q.n), [s] = project(w.x, w.z); at(s, tmp);
    // platform on the landward (west) side of the road
    if (k === 'north_drive') { const dx = w.x - tmp.x, dz = w.z - tmp.z, l = Math.hypot(dx, dz) || 1; // the real seafront shelter IS this stop: board on its road side
      return { k, name, s, x: w.x - dx / l * 4, z: w.z - dz / l * 4, rx: tmp.x, rz: tmp.z, nx: -dx / l, nz: -dz / l, real: true }; }
    let nx = -tmp.dz, nz = tmp.dx; if (nx > 0) { nx = -nx; nz = -nz; } const px = tmp.x + nx * 6, pz = tmp.z + nz * 6; return { k, name, s, x: px, z: pz, rx: tmp.x, rz: tmp.z, nx, nz }; }).sort((a, b) => a.s - b.s);
  // ---- stop shelters (one merged draw) + labels ----
  const sv = [], push = (a, b) => sv.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  for (const st of stops) { const tx = -st.nz, tz = st.nx, c = (u, y, v) => [st.x + tx * u + st.nx * v, y, st.z + tz * u + st.nz * v];
    if (!st.real) { // v45: simple land-train stop (Great Yarmouth has only ONE white shelter, the North Drive landmark): post + name board + bench
      push(c(-2.6, 0, 0.4), c(-2.6, 3.1, 0.4)); for (const y of [2.3, 3.1]) push(c(-3.9, y, 0.4), c(-1.3, y, 0.4)); push(c(-3.9, 2.3, 0.4), c(-3.9, 3.1, 0.4)); push(c(-1.3, 2.3, 0.4), c(-1.3, 3.1, 0.4));
      { for (const v of [0.6, 1.0]) push(c(0, 0.45, v), c(2.4, 0.45, v)); push(c(0, 0.85, 1.05), c(2.4, 0.85, 1.05)); for (const u of [0.2, 2.2]) { push(c(u, 0, 0.6), c(u, 0.45, 0.6)); push(c(u, 0, 1.0), c(u, 0.85, 1.05)); } } }
    for (let k = 0; k < 16; k++) { const a0 = k / 16 * 6.283, a1 = (k + 1) / 16 * 6.283; push([st.x + Math.cos(a0) * 5, 0.2, st.z + Math.sin(a0) * 5], [st.x + Math.cos(a1) * 5, 0.2, st.z + Math.sin(a1) * 5]); }
    const lab = LBL('🚂 ' + st.name.toUpperCase(), '#00e5ff', LITE ? 1.6 : 1.8); lab.position.set(st.x, 5.6, st.z); S.add(lab); }
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sv, 3));
  const sMat = new T.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false, fog: false });
  const shel = new T.LineSegments(sg, sMat); shel.raycast = () => {}; S.add(shel);
  // ---- train (v42): engine + 3 open-sided carriages with canopy roofs, one dynamic LineSegments with vertex colours ----
  const SEGS = 52, NV = CARS.length * SEGS * 2, tp = new Float32Array(NV * 3), tc = new Float32Array(NV * 3);
  { let v = 0; for (const [, hex] of CARS) { const c = new T.Color(hex); for (let i = 0; i < SEGS * 2; i++, v++) { tc[v * 3] = c.r; tc[v * 3 + 1] = c.g; tc[v * 3 + 2] = c.b; } } }
  const tg = new T.BufferGeometry(); tg.setAttribute('position', new T.BufferAttribute(tp, 3)); tg.setAttribute('color', new T.BufferAttribute(tc, 3));
  const tMat = new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false, fog: false });
  const train = new T.LineSegments(tg, tMat); train.frustumCulled = false; train.raycast = () => {}; S.add(train);
  const hit = new T.Mesh(new T.BoxGeometry(CW + 2, CH + 2, 30), new T.MeshBasicMaterial({ visible: false })); S.add(hit);
  // v62: solid carriage floors (opaque decks under the wire frames, so riding never shows the road through your feet)
  const floorG = new T.Group(); floorG.name = 'train-floor'; S.add(floorG);
  const floors = CARS.map(([len, hex]) => { const m = new T.Mesh(new T.BoxGeometry(CW * 2, 0.16, len), new T.MeshBasicMaterial({ color: new T.Color(hex).multiplyScalar(0.18) })); m.raycast = () => {}; floorG.add(m); return m; });
  const TLEN = CARS.reduce((a, c) => a + c[0] + GAP, 0);
  // ---- state ----
  const st = { s: stops[0].s, dir: 1, v: 0, mode: 'dwell', wait: 4, riding: false, target: null, lastSet: null, rideSpeed: L / 48, idleSpeed: LITE ? 14 : 14 };
  const p0 = {}, p1 = {};
  function drawTrain() { let v = 0, s = st.s; const hideOwn = st.riding; // riding: your own carriage is not drawn, so nothing frames the view
    for (let c = 0; c < CARS.length; c++) { const len = CARS[c][0], sF = s, sB = s - st.dir * len; at(sF, p0); at(sB, p1);
      const fx_ = p0.x, fz = p0.z, bx = p1.x, bz = p1.z; let dx = fx_ - bx, dz = fz - bz; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; const nx = -dz * CW / 2, nz = dx * CW / 2;
      const P3 = (u, side, y) => [bx + (fx_ - bx) * u + side * nx, y, bz + (fz - bz) * u + side * nz], L2 = (a, b) => { if (v >= (c + 1) * SEGS * 2) return; tp.set(a, v * 3); tp.set(b, v * 3 + 3); v += 2; };
      const start = c * SEGS * 2; v = start;
      if (!(hideOwn && c === 1)) {
        const wl = (u, side) => { for (let k = 0; k < 6; k++) { const a0 = k / 6 * 6.283, a1 = (k + 1) / 6 * 6.283, r = 0.38; L2([...P3(u + Math.cos(a0) * r / len, side * 1.02, 0.4 + Math.sin(a0) * r)], [...P3(u + Math.cos(a1) * r / len, side * 1.02, 0.4 + Math.sin(a1) * r)]); } };
        if (c === 0) { // engine: low bonnet up front, small open cab with a roof behind it
          for (const side of [-1, 1]) { L2(P3(0, side, 0.7), P3(1, side, 0.7)); L2(P3(0.45, side, 1.7), P3(1, side, 1.7)); L2(P3(1, side, 0.7), P3(1, side, 1.7)); L2(P3(0.45, side, 0.7), P3(0.45, side, 1.7));
            L2(P3(0.05, side, 0.7), P3(0.05, side, 2.7)); L2(P3(0.42, side, 0.7), P3(0.42, side, 2.7)); wl(0.2, side); wl(0.8, side); }
          for (const y of [0.7, 1.7]) L2(P3(1, -1, y), P3(1, 1, y)); L2(P3(0.45, -1, 1.7), P3(0.45, 1, 1.7)); L2(P3(1, -0.5, 1.2), P3(1, 0.5, 1.2)); // grille
          for (const [a, b] of [[[0, -1.1, 2.75], [0.47, -1.1, 2.75]], [[0.47, -1.1, 2.75], [0.47, 1.1, 2.75]], [[0.47, 1.1, 2.75], [0, 1.1, 2.75]], [[0, 1.1, 2.75], [0, -1.1, 2.75]]]) L2(P3(...a), P3(...b));
          L2(P3(0.72, 0, 1.7), P3(0.72, 0, 2.6)); } // funnel
        else { // open carriage: floor, low sides, corner posts, canopy roof with a slight ridge, bench backs across
          for (const side of [-1, 1]) { L2(P3(0, side, 0.75), P3(1, side, 0.75)); L2(P3(0, side, 1.25), P3(1, side, 1.25)); for (const u of [0.02, 0.5, 0.98]) L2(P3(u, side, 0.75), P3(u, side, 2.75)); wl(0.18, side); wl(0.82, side);
            L2(P3(-0.03, side * 1.12, 2.8), P3(1.03, side * 1.12, 2.8)); L2(P3(-0.03, side * 1.12, 2.8), P3(-0.03, side * 0, 3.15)); L2(P3(1.03, side * 1.12, 2.8), P3(1.03, 0, 3.15)); }
          L2(P3(-0.03, 0, 3.15), P3(1.03, 0, 3.15)); for (const u of [0, 1]) L2(P3(u, -1, 0.75), P3(u, 1, 0.75));
          for (const u of [0.25, 0.5, 0.75]) { L2(P3(u, -1, 1.65), P3(u, 1, 1.65)); L2(P3(u, -1, 1.1), P3(u, 1, 1.1)); } }
      }
      { const fl = floors[c]; fl.position.set((fx_ + bx) / 2, 0.68, (fz + bz) / 2); fl.rotation.y = Math.atan2(dx, dz); }
      for (; v < start + SEGS * 2; v += 2) { tp.set([0, -50, 0], v * 3); tp.set([0, -50, 0], v * 3 + 3); } // unused slots parked out of sight
      s = sB - st.dir * GAP; }
    tg.attributes.position.needsUpdate = true;
    at(st.s - st.dir * TLEN / 2, p1); hit.position.set(p1.x, 2, p1.z); hit.rotation.y = Math.atan2(p1.dx, p1.dz); }
  const nearestStop = (x, z) => { let b = null, bd = 1e9; for (const s of stops) { const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; b = s; } } return [b, bd]; };
  const trainDist = () => { at(st.s - st.dir * TLEN / 2, p1); return Math.hypot(p1.x - P.pos.x, p1.z - P.pos.z); };
  const canBoard = () => { const [, d] = nearestStop(P.pos.x, P.pos.z); return d < 16 || trainDist() < 12; }; // v62: prompt only when you are actually at a stop or beside the train
  // ---- UI: touch-friendly buttons, bottom centre above the player bar ----
  const css = document.createElement('style'); css.textContent = `.wtrain{position:fixed;z-index:26;left:50%;transform:translateX(-50%);bottom:calc(var(--player-h,64px) + 1.4rem + env(safe-area-inset-bottom));display:flex;gap:.4rem;font-family:ui-monospace,monospace}
.wtrain button{min-height:48px;min-width:48px;padding:0 .9rem;border-radius:24px;border:2px solid #00e5ff;background:rgba(0,10,14,.82);color:#bff8ff;font:inherit;font-size:.8rem;letter-spacing:.05em;cursor:pointer;box-shadow:0 0 10px rgba(0,229,255,.45);touch-action:manipulation}
.wtrain button:hover,.wtrain button:focus-visible{background:#00e5ff;color:#001014;outline:none}.wtrain .tmain[hidden],.wtrain .tnext[hidden]{display:none}.wtrain .tnext{align-self:center;padding:.35rem .7rem;border-radius:6px;background:rgba(0,10,14,.82);border:1px solid #ffc84a;color:#ffe7a8;font-size:.75rem;letter-spacing:.06em}.wtrain button.req{border-color:#ffc84a;color:#ffe7a8;box-shadow:0 0 10px rgba(255,200,74,.5)}
.wtrain-menu{position:fixed;z-index:27;left:50%;transform:translateX(-50%);bottom:calc(var(--player-h,64px) + 5rem + env(safe-area-inset-bottom));background:rgba(0,10,14,.94);border:1px solid #00e5ff;border-radius:8px;padding:.4rem;display:flex;flex-direction:column;gap:.3rem;min-width:220px;font-family:ui-monospace,monospace}
.wtrain-menu[hidden]{display:none}.wtrain-menu b{color:#00e5ff;font-size:.7rem;padding:.2rem .4rem}.wtrain-menu button{min-height:44px;text-align:left;padding:0 .8rem;border:1px solid rgba(0,229,255,.4);border-radius:6px;background:transparent;color:#dffcff;font:inherit;font-size:.8rem;cursor:pointer}
.wtrain-menu button:hover,.wtrain-menu button:focus-visible{background:rgba(0,229,255,.2);outline:none}.wtrain-menu button.here{opacity:.5}
@media (max-width:640px){.wtrain{bottom:calc(var(--player-h,64px) + 7.6rem + env(safe-area-inset-bottom))}.wtrain-menu{bottom:calc(var(--player-h,64px) + 11rem + env(safe-area-inset-bottom))}}`;
  document.head.appendChild(css);
  const ui = document.createElement('div'); ui.className = 'wtrain'; ui.innerHTML = `<span class="tnext" hidden></span><button type="button" class="tmain" hidden>🚂 BOARD TRAIN</button><button type="button" class="tstops" aria-haspopup="true" aria-expanded="false">🚂 STOPS ▾</button>`;
  const menu = document.createElement('div'); menu.className = 'wtrain-menu'; menu.hidden = true; menu.setAttribute('role', 'menu');
  document.body.append(ui, menu); const bMain = ui.querySelector('.tmain'), bNext = ui.querySelector('.tnext'), bStops = ui.querySelector('.tstops');
  for (const el of [ui, menu]) el.addEventListener('pointerdown', e => e.stopPropagation());
  function renderMenu() { const ride = st.riding || canBoard(), [here] = nearestStop(P.pos.x, P.pos.z);
    menu.innerHTML = `<b>${st.riding ? 'SEAFRONT TRAIN · CHANGE DESTINATION' : ride ? 'SEAFRONT TRAIN · RIDE TO' : 'SEAFRONT TRAIN · JUMP TO STOP'}</b>` +
      stops.map(s => `<button type="button" role="menuitem" data-stop="${s.k}" class="${!st.riding && ride && s === here ? 'here' : ''}">${ride ? '▶' : '⌖'} ${s.name}${st.target === s && st.riding ? ' ·  next' : ''}</button>`).join(''); }
  bStops.addEventListener('click', e => { e.stopPropagation(); menu.hidden = !menu.hidden; bStops.setAttribute('aria-expanded', String(!menu.hidden)); if (!menu.hidden) renderMenu(); });
  menu.addEventListener('click', e => { const b = e.target.closest('[data-stop]'); if (!b) return; e.stopPropagation(); const s = stops.find(x => x.k === b.dataset.stop); menu.hidden = true; bStops.setAttribute('aria-expanded', 'false');
    if (st.riding) { setTarget(s); } else if (canBoard()) board(s); else walkTo(s); });
  bMain.addEventListener('click', e => { e.stopPropagation(); st.riding ? hopOff() : board(null); });
  function setTarget(s) { st.target = s; st.dir = s.s >= st.s ? 1 : -1; st.mode = 'run'; }
  function board(dest) { if (window.__mapOpen) return; const [here, d] = nearestStop(P.pos.x, P.pos.z);
    if (d < 16) { if (Math.abs(st.s - here.s) > 1) { st.s = here.s; } } // the train pulls up at your stop
    else if (trainDist() > 12) return;
    if (!dest || dest === here && d < 16) dest = Math.abs(st.s - stops[0].s) > Math.abs(st.s - stops[stops.length - 1].s) ? stops[0] : stops[stops.length - 1];
    if (Math.abs(dest.s - st.s) < 2) return;
    st.riding = true; st.v = 0; setTarget(dest); st.s = st.s + 0; // lead car is where you sit
    P.yaw = Math.atan2(-at(st.s, tmp).dx * st.dir, -tmp.dz * st.dir); P.pitch = -0.04; camInit = false; place(); fx.trainLog = (fx.trainLog || 0) + 1;
    // v65: boarding starts Luce Aether's Train if nothing else is playing (never interrupts music the visitor already chose)
    try { const J = window.JX; if (J && J.tracks && !J.playing) { const tr = J.tracks.find(x => x.id === 'luce-aether-s-train'); if (tr) { J.play(tr, [tr]); fx.trainTrack = tr.id; } } } catch (e) { console.warn('train track', e); } }
  function hopOff() { if (!st.riding) return; if (st.v < 2) return exitAt(null); // stopped: step off right here
    const next = nextStop(); if (next) setTarget(next); else exitAt(null); st.hop = true; } // v62: REQUEST STOP = alight at the NEXT stop on the line
  const nextStop = () => st.dir > 0 ? stops.find(s => s.s > st.s + 5) : [...stops].reverse().find(s => s.s < st.s - 5);
  function exitAt(s) { st.riding = false; st.hop = false; st.mode = 'dwell'; st.wait = 6; st.v = 0; let x, z;
    if (s) { x = s.x + s.nx * 3; z = s.z + s.nz * 3; } else { at(st.s, tmp); let nx = -tmp.dz, nz = tmp.dx; if (nx > 0) { nx = -nx; nz = -nz; } x = tmp.x + nx * 7; z = tmp.z + nz * 7; }
    [x, z] = openNear(x, z); P.pos.set(x, 1.7, z); P.pitch = 0; st.lastSet = null; fx.cullT = 0; }
  function walkTo(s) { const hs = s.k === 'harbour_mouth' && fx.harbourSpawn; if (hs) { P.pos.set(hs[0], 1.7 + 2.6, hs[1]); P.yaw = Math.atan2(-(hs[2][0] - hs[0]), -(hs[2][1] - hs[1])); P.pitch = 0.05; fx.cullT = 0; fx.lastJump = [+hs[0].toFixed(1), +hs[1].toFixed(1)]; return; } /* v73: Harbour Mouth stop lands on the South Pier deck */ const [x, z] = openNear(s.x + s.nx * 4, s.z + s.nz * 4); P.pos.set(x, 1.7, z); P.yaw = Math.atan2(-(s.rx - x), -(s.rz - z)); P.pitch = 0.05; fx.cullT = 0; fx.lastJump = [+x.toFixed(1), +z.toFixed(1)]; }
  const seat = {}; let camInit = false;
  function place(dt = 0, t = 0) { const sS = st.s - st.dir * (CARS[0][0] + GAP + 1.0); at(sS, tmp); // front bench of the first open carriage
    const side = (-tmp.dz * st.dir) * 0 + 1, nx = -tmp.dz * st.dir, nz = tmp.dx * st.dir, sea = nx > 0 ? 1 : -1; // nudge 0.5 m toward the sea side of the bench
    const tx = tmp.x + nx * 0.5 * sea, tz = tmp.z + nz * 0.5 * sea;
    if (!camInit || !dt) { seat.x = tx; seat.z = tz; camInit = true; } else { const k = Math.min(1, dt * 10); seat.x += (tx - seat.x) * k; seat.z += (tz - seat.z) * k; }
    const sway = RED ? 0 : Math.sin(t * 2.1) * 0.03 * Math.min(1, st.v / 20);
    P.pos.set(seat.x, 2.2 + (RED ? 0 : Math.abs(Math.sin(t * 4.2)) * 0.02 * Math.min(1, st.v / 20)), seat.z); st.lastSet = [P.pos.x, P.pos.z]; st.sway = sway; }
  // tap the train (own raycast against the hidden hit box; nothing joins the clickables, so lane picks / jump map are untouched)
  const ray = new T.Raycaster(), ndc = new T.Vector2(); let down = null;
  CV.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  CV.addEventListener('pointerup', e => { if (!down || window.__mapOpen) return; const ok = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8 && performance.now() - down.t < 600; down = null; if (!ok) return;
    const r = CV.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, CAM);
    if (ray.intersectObject(hit, false).length) { if (st.riding) hopOff(); else if (trainDist() < 60) { const [h, d] = nearestStop(P.pos.x, P.pos.z); if (d < 16 || trainDist() < 12) board(null); else if (trainDist() < 60) { st.s = project(P.pos.x, P.pos.z)[0]; board(null); } } } });
  let uiT = 0, lastLabel = '';
  function update(t, dt) {
    window.__trainRiding = st.riding;
    if (st.riding && st.lastSet && Math.hypot(P.pos.x - st.lastSet[0], P.pos.z - st.lastSet[1]) > 4) { st.riding = false; st.hop = false; st.mode = 'dwell'; st.wait = 3; st.v = 0; P.pos.y = 1.7; st.lastSet = null; } // jumped away via the map
    if (st.riding) { const rem = Math.abs(st.target.s - st.s), vmax = st.rideSpeed, acc = vmax / 6;
      st.v = Math.min(vmax, st.v + acc * dt, Math.sqrt(2 * acc * rem) + 1); st.s += st.dir * Math.min(rem, st.v * dt);
      if (rem - st.v * dt <= 0.05) { st.s = st.target.s; const s = st.target; drawTrain(); exitAt(s); }
      else { place(dt, t); at(st.s + st.dir * 12, p0); at(st.s - st.dir * 6, p1); const hx = (p0.x - p1.x), hz = (p0.z - p1.z), h0 = Math.atan2(-hx, -hz), seaBias = (-Math.sin(h0 + 0.2) > -Math.sin(h0 - 0.2) ? 0.2 : -0.2), want = h0 + seaBias; /* look ahead along the road, a little toward the sea */ let d = want - P.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); P.yaw += d * Math.min(1, dt * 2.0); CAM.position.copy(P.pos); CAM.rotation.set(P.pitch, P.yaw, st.sway || 0, 'YXZ'); } }
    else if (!RED) { // idle shuttle: end to end, dwelling at each stop
      if (st.mode === 'dwell') { st.wait -= dt; if (st.wait <= 0) { const i = stops.findIndex(s => Math.abs(s.s - st.s) < 1); let j = i + st.dir; if (j < 0 || j >= stops.length) { st.dir = -st.dir; j = i + st.dir; } if (i < 0) j = st.dir > 0 ? stops.findIndex(s => s.s > st.s) : stops.length - 1; st.target = stops[Math.max(0, Math.min(stops.length - 1, j))]; st.mode = 'run'; } }
      else { const rem = Math.abs(st.target.s - st.s), v = Math.min(st.idleSpeed, Math.sqrt(rem * 4) + 1); st.s += st.dir * Math.min(rem, v * dt); if (rem <= 0.05 + v * dt) { st.s = st.target.s; st.mode = 'dwell'; st.wait = 8; } } }
    drawTrain();
    const day = fx.env && fx.env.state ? fx.env.state.day : 0.5; tMat.opacity = 0.75 + (1 - day) * 0.25; sMat.opacity = (0.45 + (1 - day) * 0.5) * (0.85 + 0.15 * Math.sin(t * 2));
    if (t - uiT > 0.25) { uiT = t; const ns = st.riding ? nextStop() : null, lbl = st.riding ? (st.hop ? '🔔 STOP REQUESTED' : '🔔 REQUEST STOP') : canBoard() ? '🚂 BOARD TRAIN' : '';
      const nx = st.riding ? 'NEXT STOP: ' + ((st.hop ? st.target : ns || st.target) || { name: '—' }).name.toUpperCase() : ''; if (nx !== bNext.textContent) { bNext.textContent = nx; bNext.hidden = !nx; }
      if (lbl !== lastLabel) { lastLabel = lbl; bMain.hidden = !lbl; bMain.textContent = lbl; bMain.classList.toggle('req', !!st.riding); }
      floorG.visible = true; ui.style.display = window.__mapOpen ? 'none' : ''; }
  }
  drawTrain();
  const api = { get info() { return { length_m: Math.round(L), points: path.length, streets: ['North Drive', 'Marine Parade', 'South Beach Parade', 'South Denes (harbour spur)'], rideSpeed: +st.rideSpeed.toFixed(1), riding: st.riding, s: +st.s.toFixed(1), v: +st.v.toFixed(1), target: st.target && st.target.k, stops: stops.map(s => ({ k: s.k, name: s.name, s: Math.round(s.s), at: [+s.x.toFixed(1), +s.z.toFixed(1)] })) }; },
    walkTo(k) { walkTo(stops.find(s => s.k === k)); }, board(k) { board(k ? stops.find(s => s.k === k) : null); }, hopOff, target(k) { setTarget(stops.find(s => s.k === k)); }, canBoard,
    get floor() { return floorG; }, get near() { return canBoard(); }, trainAt() { at(st.s - st.dir * TLEN / 2, p1); const v = new T.Vector3(p1.x, 2, p1.z).project(CAM), r = CV.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, visible: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 }; } };
  return { update, api };
}

/* ---------- seagulls: a handful circling high overhead, only ever visible when you look up ---------- */
export function initGulls(o) {
  const { T, S, CAM, LITE, RED } = o, N = LITE ? 4 : 9;
  // body sliver + two wings (tip vertices carry aW = flap weight); ~2.6 m span, wire-ish neon white
  const pos = [0, 0, -0.7, 0.12, 0, 0.5, -0.12, 0, 0.5, 0, 0, -0.2, 1.3, 0.15, 0.1, 0, 0, 0.35, 0, 0, -0.2, -1.3, 0.15, 0.1, 0, 0, 0.35], w = [0, 0, 0, 0, 1, 0, 0, 1, 0];
  const g = new T.InstancedBufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aW', new T.Float32BufferAttribute(w, 1));
  const ph = new Float32Array(N); for (let i = 0; i < N; i++) ph[i] = Math.random() * 6.283; g.setAttribute('aPh', new T.InstancedBufferAttribute(ph, 1));
  const mat = new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, uniforms: { uTime: { value: 0 }, uDay: { value: 0.5 } },
    vertexShader: `attribute float aW; attribute float aPh; uniform float uTime; varying float vE; void main(){ vec3 p = position; p.y += aW * sin(uTime * 6.0 + aPh) * 0.75; p.x *= 1.0 - aW * 0.12 * (1.0 + sin(uTime * 6.0 + aPh));
      vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0); vec3 d = w.xyz - cameraPosition; vE = d.y / max(length(d), 0.001); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uDay; varying float vE; void main(){ float a = smoothstep(0.66, 0.76, vE); if (a <= 0.0) discard; gl_FragColor = vec4(mix(vec3(0.75,0.95,1.0), vec3(1.0), uDay), a * (0.55 + 0.4 * (1.0 - uDay))); }` });
  const m = new T.InstancedMesh(g, mat, N); m.frustumCulled = false; m.raycast = () => {}; m.renderOrder = 2; m.name = 'gulls'; S.add(m);
  const B = []; for (let i = 0; i < N; i++) B.push({ r: 14 + Math.random() * 26, h: 58 + Math.random() * 30, w: (0.18 + Math.random() * 0.14) * (i % 3 ? 1 : -1), a: Math.random() * 6.283, bob: Math.random() * 6.283, s: 1.6 + Math.random() * 0.8 });
  const c = new T.Vector3().copy(CAM.position), o3 = new T.Object3D(); let ready = false;
  function update(t, dt, day) { mat.uniforms.uTime.value = RED ? 0 : t; mat.uniforms.uDay.value = day == null ? 0.5 : day;
    if (!ready || c.distanceTo(CAM.position) > 300) { c.copy(CAM.position); ready = true; } else { const k = Math.min(1, dt * 0.8); c.x += (CAM.position.x - c.x) * k; c.z += (CAM.position.z - c.z) * k; } // drift with you; the shader hides any that slip below ~42°
    for (let i = 0; i < N; i++) { const b = B[i]; if (!RED) b.a += b.w * dt; const x = c.x + Math.cos(b.a) * b.r, z = c.z + Math.sin(b.a) * b.r;
      o3.position.set(x, CAM.position.y + b.h + Math.sin(t * 0.4 + b.bob) * 3, z); o3.rotation.set(0, -b.a + (b.w > 0 ? Math.PI : 0), (b.w > 0 ? 0.25 : -0.25), 'YXZ'); o3.scale.setScalar(b.s); o3.updateMatrix(); m.setMatrixAt(i, o3.matrix); }
    m.instanceMatrix.needsUpdate = true; }
  return { update, info: { count: N, minElevationDeg: 42 } };
}
