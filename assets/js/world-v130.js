/* v130 — Newtown lean pass (preview only).
   1. Gap-fill unlabelled terrace plots along OSM road centrelines where no building
      outline exists (Barnard, Jellicoe and the side streets). Existing OSM ways were
      already in yarmouth-geo.json. Reuses the v128 fronts / interiors system via COL.
   2. Two-storey shared interiors live in world-v128.js (this module only flags storeys
      on the new plots and wires the special Sturdee bedroom).
   3. Bill's Beatty flats: walkable outside stairs + upper landings; the camera follows
      a ramp/step __groundParts height so the POV rises and falls.
   4. Typical UK street-name signs (white plate, black text, grey post) at named-road
      junctions, Newtown first, then the rest of town up to a cap.
   5. Unlabelled east-side Sturdee house with the bedroom-23-sturdee.js interior.
   Toggles (all default on): IE_V130_FILL, IE_V130_STAIRS, IE_V130_SIGNS, IE_V130_23.
   Houses are never labelled. GYnet palm terrace and Lewi G's house are left alone
   (plain fronts / generic interiors only). */
const on = k => window['IE_V130_' + k] !== false;

export function initV130({ T, S, CAM, P, LITE, warp, fx }) {
  const info = { fill: 0, signs: 0, stairs: false, house23: false, ready: true };
  fx.v130Info = info; window.__fx130 = info;

  if (on('FILL')) fillPlots(T, S, warp, fx, info, LITE);
  if (on('STAIRS')) beattyStairs(T, S, warp, fx, info);
  if (on('SIGNS')) fetch('/assets/data/gy-roads-v121.json?v=130').then(r => r.json()).then(D => {
    try { placeSigns(T, S, warp, fx, info, LITE, D); } catch (e) { console.warn('v130 signs', e); }
  }).catch(e => console.warn('v130 signs data', e));

  if (on('23')) {
    import('./bedroom-23-sturdee.js?v=130').then(m => {
      fx.bedroom23 = m.initBedroom23({ T, S, CAM, P, LITE, warp, fx });
      fx.interiorFor = d => (fx.bedroom23 && fx.bedroom23.owns(d)) ? fx.bedroom23 : null;
      info.house23 = !!(fx.bedroom23 && fx.bedroom23.info && fx.bedroom23.info.ready);
    }).catch(e => console.warn('v130 bedroom', e));
  }

  return {
    info,
    update(t) { if (fx.bedroom23 && fx.bedroom23.info && fx.bedroom23.info.inside) fx.bedroom23.update(t); }
  };
}

/* ---------------- 1. gap-fill plots ---------------- */
function fillPlots(T, S, warp, fx, info, LITE) {
  fetch('/assets/data/newtown-v130-fill.json?v=130').then(r => r.json()).then(D => {
    try { buildFill(T, S, warp, fx, info, LITE, D); } catch (e) { console.warn('v130 fill', e); }
  }).catch(e => console.warn('v130 fill data', e));
}

function buildFill(T, S, warp, fx, info, LITE, D) {
  const list = D.buildings || [];
  const grp = new T.Group(); grp.name = 'v130-fill'; S.add(grp);
  const buckets = new Map();
  const push = (hex, arr) => { (buckets.get(hex) || buckets.set(hex, []).get(hex)).push(...arr); };
  const CREAM = 0xece4cf, BRICK = 0x9a5a3e, ROOF = 0x5b6068, CHIM = 0x9a4a32;
  let n = 0;
  for (const b of list) {
    const raw = b.pts, pts = [];
    for (let i = 0; i < raw.length; i += 2) pts.push([raw[i], raw[i + 1]]);
    if (pts.length < 3) continue;
    let A = 0;
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; A += p[0] * q[1] - q[0] * p[1]; }
    if (A < 0) pts.reverse();
    const h = b.h || 6.2;
    const W3 = pts.map(p => warp(p[0], p[1]));
    const wall = (b.special === 'bedroom-23') ? CREAM : ((((b.cx * 7 + b.cy * 13) | 0) & 3) === 1 ? BRICK : CREAM);
    const pos = [];
    const k0 = 0;
    /* sides + roof (fan on top) */
    for (let i = 0; i < W3.length; i++) {
      const a = W3[i], c = W3[(i + 1) % W3.length];
      pos.push(a.x, 0, a.z, c.x, 0, c.z, c.x, h, c.z, a.x, 0, a.z, c.x, h, c.z, a.x, h, a.z);
    }
    /* roof cap */
    const cx = W3.reduce((s, p) => s + p.x, 0) / W3.length, cz = W3.reduce((s, p) => s + p.z, 0) / W3.length;
    const rh = h + 0.08;
    for (let i = 0; i < W3.length; i++) {
      const a = W3[i], c = W3[(i + 1) % W3.length];
      buckets.has(-1); // keep linter quiet if any
      (function () {
        const roof = [];
        roof.push(a.x, rh, a.z, c.x, rh, c.z, cx, rh, cz);
        push(ROOF, roof);
      })();
    }
    push(wall, pos);
    /* two chimney nubs on longer plots */
    if (!LITE && Math.abs(A) / 2 > 50) {
      push(CHIM, boxAt(cx + 0.8, rh + 0.6, cz, 0.6, 1.2, 0.6));
    }
    /* collision + v128 door target */
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [e, n_] of pts) { x0 = Math.min(x0, e); x1 = Math.max(x1, e); y0 = Math.min(y0, n_); y1 = Math.max(y1, n_); }
    const rec = { p: pts, x0, x1, y0, y1, h, storeys: b.storeys || 2 };
    if (b.special) rec.special = b.special;
    if (fx.COL && fx.COLC) {
      for (let i = Math.floor(x0 / fx.COLC); i <= Math.floor(x1 / fx.COLC); i++)
        for (let j = Math.floor(y0 / fx.COLC); j <= Math.floor(y1 / fx.COLC); j++) {
          const k = i + ':' + j;
          (fx.COL.get(k) || fx.COL.set(k, []).get(k)).push(rec);
        }
    }
    n++;
  }
  for (const [hex, arr] of buckets) {
    if (hex === -1 || !arr.length) continue;
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(arr, 3));
    const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: hex, side: T.DoubleSide }));
    m.raycast = () => {};
    grp.add(m);
  }
  info.fill = n;
  /* nudge v128 to rebuild doors once the new COL entries are in */
  try { if (fx.v128 && fx.v128.info) fx.v128.info.dirty = 1; } catch (_) {}
}

function boxAt(x, y, z, w, h, d) {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const p = [
    [-hw, -hh, -hd], [hw, -hh, -hd], [hw, hh, -hd], [-hw, -hh, -hd], [hw, hh, -hd], [-hw, hh, -hd],
    [-hw, -hh, hd], [hw, hh, hd], [hw, -hh, hd], [-hw, -hh, hd], [-hw, hh, hd], [hw, hh, hd],
    [-hw, -hh, -hd], [-hw, hh, -hd], [-hw, hh, hd], [-hw, -hh, -hd], [-hw, hh, hd], [-hw, -hh, hd],
    [hw, -hh, -hd], [hw, -hh, hd], [hw, hh, hd], [hw, -hh, -hd], [hw, hh, hd], [hw, hh, -hd],
    [-hw, hh, -hd], [hw, hh, -hd], [hw, hh, hd], [-hw, hh, -hd], [hw, hh, hd], [-hw, hh, hd],
    [-hw, -hh, -hd], [hw, -hh, hd], [hw, -hh, -hd], [-hw, -hh, -hd], [-hw, -hh, hd], [hw, -hh, hd]
  ];
  const o = [];
  for (const q of p) o.push(x + q[0], y + q[1], z + q[2]);
  return o;
}

/* ---------------- 3. Beatty Close walkable outside stairs ---------------- */
function beattyStairs(T, S, warp, fx, info) {
  /* Match world-streets.js v60 flats: x0=-143, x1=-86, nf=2341 (north face), walkway ~y=2.9.
     Flights run north from the walkway into the close so the player can walk up and down. */
  const x0 = -143, x1 = -86, nf = 2341, TOP = 2.9, RUN = 4.2, WID = 1.35;
  const sx = [x0 + 5, x1 - 9]; /* same stations as the decorative stairs */
  const grp = new T.Group(); grp.name = 'v130-beatty-stairs'; S.add(grp);
  const cream = new T.MeshBasicMaterial({ color: 0xe9e2cf });
  const stepM = new T.MeshBasicMaterial({ color: 0xd8d0be });
  const add = (g, e, n, y, ry) => {
    const m = new T.Mesh(g, cream); const w = warp(e, n); m.position.set(w.x, y, w.z); if (ry) m.rotation.y = ry; grp.add(m); return m;
  };
  const flights = [];
  for (const e0 of sx) {
    /* top landing just north of the walkway */
    const le = e0 - 0.2, ln = nf + 1.55;
    add(new T.BoxGeometry(WID + 0.3, 0.1, 1.5), le, ln, TOP);
    /* ramp + treads, running +n (into the close), falling to ground */
    const STEPS = 8;
    for (let i = 0; i < STEPS; i++) {
      const t0 = i / STEPS, t1 = (i + 1) / STEPS;
      const nMid = nf + 2.2 + (t0 + t1) / 2 * RUN;
      const yMid = TOP * (1 - (t0 + t1) / 2);
      const slen = RUN / STEPS;
      const m = new T.Mesh(new T.BoxGeometry(WID, 0.1, slen + 0.04), stepM);
      const w = warp(e0 + 0.4, nMid);
      m.position.set(w.x, yMid, w.z);
      grp.add(m);
    }
    const a = warp(e0 + 0.4, nf + 2.2), b = warp(e0 + 0.4, nf + 2.2 + RUN);
    flights.push({
      ax: a.x, az: a.z, bx: b.x, bz: b.z,
      e0: e0 + 0.4 - WID / 2, e1: e0 + 0.4 + WID / 2,
      n0: nf + 2.2, n1: nf + 2.2 + RUN
    });
  }
  /* walkway along the north face */
  const walk = { e0: x0 + 0.2, e1: x1 - 0.2, n0: nf + 0.1, n1: nf + 1.7, y: TOP };
  const ww = warp((walk.e0 + walk.e1) / 2, (walk.n0 + walk.n1) / 2);
  const wmesh = new T.Mesh(new T.BoxGeometry(x1 - x0 - 0.2, 0.08, 1.6), cream);
  wmesh.position.set(ww.x, TOP, ww.z); grp.add(wmesh);

  const onBand = (e, n, a, b, pad) => e >= a - pad && e <= b + pad && n >= a /* dummy */;
  (window.__groundParts = window.__groundParts || []).unshift((x, z) => {
    const e = x, n = -z; /* warp is nearly 1:1 this close to the linear range? Newtown is far — use inverse-free test in e/n, but player is in world xz.
       For FAR warp, e,n != x,-z. Convert via a local test against warped corners instead. */
    /* Prefer world-space tests built from warped endpoints. */
    /* Walkway: warped box */
    if (inWorldBand(x, z, walk, warp, 0.35)) return TOP;
    for (const f of flights) {
      const t = projectT(x, z, f);
      if (t == null) continue;
      return TOP * (1 - t);
    }
    return null;
  });
  info.stairs = true;
  info.flights = flights.length;
}

function projectT(x, z, f) {
  const dx = f.bx - f.ax, dz = f.bz - f.az, L2 = dx * dx + dz * dz || 1;
  const t = ((x - f.ax) * dx + (z - f.az) * dz) / L2;
  if (t < -0.02 || t > 1.02) return null;
  const px = f.ax + t * dx, pz = f.az + t * dz;
  const d = Math.hypot(x - px, z - pz);
  if (d > 0.85) return null;
  return Math.max(0, Math.min(1, t));
}

function inWorldBand(x, z, walk, warp, pad) {
  /* test a point against the warped walkway quad */
  const c = [
    warp(walk.e0, walk.n0), warp(walk.e1, walk.n0), warp(walk.e1, walk.n1), warp(walk.e0, walk.n1)
  ];
  let inside = false;
  for (let i = 0, j = 3; i < 4; j = i++) {
    const xi = c[i].x, zi = c[i].z, xj = c[j].x, zj = c[j].z;
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / ((zj - zi) || 1e-9) + xi) inside = !inside;
  }
  if (inside) return true;
  /* small pad: distance to edges */
  for (let i = 0; i < 4; i++) {
    const a = c[i], b = c[(i + 1) % 4];
    const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L2));
    if (Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz)) < pad) return true;
  }
  return false;
}

/* ---------------- 4. UK street-name signs ---------------- */
function placeSigns(T, S, warp, fx, info, LITE, D) {
  const names = D.names || [], roads = D.roads || [];
  const segs = [];
  for (const r of roads) {
    const ni = r[3], name = names[ni];
    if (!name) continue;
    const c = r[4] || [];
    for (let i = 0; i + 3 < c.length; i += 2) segs.push({ name, e0: c[i], n0: c[i + 1], e1: c[i + 2], n1: c[i + 3] });
  }
  /* grid of vertices -> junctions of two different names */
  const cell = 10, grid = new Map();
  const key = (e, n) => Math.floor(e / cell) + ':' + Math.floor(n / cell);
  const put = (e, n, name, tx, ty) => {
    const k = key(e, n);
    const a = grid.get(k) || (grid.set(k, []).get(k));
    a.push({ e, n, name, tx, ty });
  };
  for (const s of segs) {
    const dx = s.e1 - s.e0, dy = s.n1 - s.n0, L = Math.hypot(dx, dy) || 1, tx = dx / L, ty = dy / L;
    put(s.e0, s.n0, s.name, tx, ty);
    put(s.e1, s.n1, s.name, tx, ty);
  }
  const junc = [];
  const seenJ = new Set();
  for (const [k, list] of grid) {
    const namesHere = [];
    const bucket = list.slice();
    const [ci, cj] = k.split(':').map(Number);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue;
      const o = grid.get((ci + di) + ':' + (cj + dj));
      if (o) bucket.push(...o);
    }
    const by = new Map();
    for (const p of bucket) (by.get(p.name) || by.set(p.name, []).get(p.name)).push(p);
    if (by.size < 2) continue;
    const used = [...by.keys()].sort();
    const id = used.join('|') + '@' + Math.round(bucket[0].e / 8) + ',' + Math.round(bucket[0].n / 8);
    if (seenJ.has(id)) continue;
    seenJ.add(id);
    const ce = bucket.reduce((s, p) => s + p.e, 0) / bucket.length, cn = bucket.reduce((s, p) => s + p.n, 0) / bucket.length;
    junc.push({ e: ce, n: cn, roads: used.map(nm => ({ name: nm, p: by.get(nm)[0] })) });
  }

  const inNewtown = j => j.e > -640 && j.e < 180 && j.n > 2080 && j.n < 2860;
  junc.sort((a, b) => (inNewtown(b) - inNewtown(a)) || (a.n - b.n));
  const CAP = LITE ? 90 : 220;
  const picked = [];
  const tooClose = (e, n) => picked.some(p => Math.hypot(p.e - e, p.n - n) < 14);
  for (const j of junc) {
    if (picked.length >= CAP) break;
    if (tooClose(j.e, j.n)) continue;
    picked.push(j);
  }

  const grp = new T.Group(); grp.name = 'v130-signs'; S.add(grp);
  const postG = new T.CylinderGeometry(0.04, 0.05, 2.55, 6);
  const postM = new T.MeshBasicMaterial({ color: 0x4a4e52 });
  const posts = new T.InstancedMesh(postG, postM, Math.max(1, picked.length * 2));
  posts.frustumCulled = false; let np = 0;
  const dummy = new T.Object3D();
  const texCache = new Map();
  const plateFor = name => {
    if (texCache.has(name)) return texCache.get(name);
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 512, 128);
    x.strokeStyle = '#111111'; x.lineWidth = 8; x.strokeRect(6, 6, 500, 116);
    x.fillStyle = '#111111'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const n = name.length;
    x.font = (n > 18 ? 'bold 42px' : n > 12 ? 'bold 52px' : 'bold 60px') + ' Arial, Helvetica, sans-serif';
    x.fillText(name.toUpperCase(), 256, 68);
    const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
    const mat = new T.MeshBasicMaterial({ map: tx, side: T.DoubleSide });
    texCache.set(name, mat); return mat;
  };

  let ns = 0;
  for (const j of picked) {
    j.roads.slice(0, 2).forEach((rd, i) => {
      const p = rd.p || { tx: 1, ty: 0 };
      const nx = -p.ty, ny = p.tx;
      const side = i === 0 ? 1 : -1;
      const e = j.e + nx * side * 3.2 + p.tx * 1.2;
      const n = j.n + ny * side * 3.2 + p.ty * 1.2;
      const w = warp(e, n);
      dummy.position.set(w.x, 1.27, w.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      if (np < posts.count) posts.setMatrixAt(np++, dummy.matrix);
      const wdt = Math.min(2.4, 0.7 + rd.name.length * 0.09);
      const plate = new T.Mesh(new T.PlaneGeometry(wdt, 0.34), plateFor(rd.name));
      const yaw = Math.atan2(-(nx * side), ny * side); /* face roughly toward the junction / across the road */
      plate.position.set(w.x, 2.32, w.z);
      plate.rotation.y = Math.atan2(p.tx, p.ty) + Math.PI / 2;
      grp.add(plate);
      ns++;
    });
  }
  posts.count = np; posts.instanceMatrix.needsUpdate = true; grp.add(posts);
  info.signs = ns; info.junctions = picked.length; info.signsNewtown = picked.filter(inNewtown).length;
}

/* unused helper kept out of the export surface */
void boxAt;
