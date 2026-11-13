/* v115: replace holographic OSM building fills with solid masses — real OSM
   heights (yarmouth-geo.json first field, metres; untagged default 6 or 9 m by
   footprint area, same rule as v69/geo), simple roof shapes, reused open /
   procedural textures (slate, pantile, felt; same approach as v109 ambientCG /
   Poly Haven CC0 skins already in the world).
   v69 already draws solid wall skins + a facade shader; this pass fully hides
   the neon geoMat fills AND their roof-edge lines, then puts gable / hip / flat
   roofs on those walls. Flag: IE_V115_SOLID=false disables. */
export function initV115Solid(o) {
  const { T, S, LITE, LOW, warp, fx } = o;
  const info = { roofs: 0, hidden: 0, gable: 0, hip: 0, flat: 0 };
  if (window.IE_V115_SOLID === false) { info.off = true; return { info }; }

  const grp = new T.Group(); grp.name = 'v115-solid'; S.add(grp);

  const hideHolo = () => {
    const city = S.getObjectByName('osm-buildings');
    if (!city) return false;
    if (fx.geo && fx.geo.done === false) return false;
    let n = 0;
    city.traverse(obj => {
      if (obj.isMesh || obj.isLineSegments || obj.isLine) { obj.visible = false; n++; }
    });
    info.hidden = n;
    return true;
  };

  /* procedural CC0-style tile sheets — no remote fetch; same spirit as v109 canvas bricks */
  const sheet = (kind) => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    if (kind === 'slate') {
      g.fillStyle = '#2e3236'; g.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 14) for (let x = (y / 14) % 2 ? 12 : 0; x < 256; x += 24) {
        const v = 40 + ((x * 13 + y * 7) % 28);
        g.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
        g.fillRect(x + 1, y + 1, 22, 12);
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.strokeRect(x + 1, y + 1, 22, 12);
      }
    } else if (kind === 'pantile') {
      g.fillStyle = '#6a2e22'; g.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 16) for (let x = (y / 16) % 2 ? 10 : 0; x < 256; x += 20) {
        const v = 110 + ((x + y) % 30);
        g.fillStyle = `rgb(${v + 20},${v - 40},${v - 55})`;
        g.beginPath(); g.ellipse(x + 10, y + 8, 9, 7, 0, 0, Math.PI * 2); g.fill();
      }
    } else {
      g.fillStyle = '#3a3d40'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 800; i++) {
        const v = 45 + (i * 17) % 30; g.fillStyle = `rgb(${v},${v},${v - 2})`;
        g.fillRect((i * 37) % 256, (i * 53) % 256, 2, 2);
      }
    }
    const tx = new T.CanvasTexture(c);
    tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.anisotropy = 2; tx.colorSpace = T.SRGBColorSpace || tx.colorSpace;
    tx.needsUpdate = true;
    return tx;
  };
  const tex = { slate: sheet('slate'), pantile: sheet('pantile'), felt: sheet('felt') };
  const matOf = (kind, hex) => new T.MeshBasicMaterial({
    color: hex, map: tex[kind], side: T.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
  });
  const MAT = {
    slate: matOf('slate', 0xffffff),
    pantile: matOf('pantile', 0xffffff),
    felt: matOf('felt', 0x9a9a9a)
  };

  const flat = a => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; };
  const PZ = window.__PLAZA || [140, -300];
  const holesOf = (G) => [[PZ[0], -PZ[1], 62], ...((G && G.keep) || [])];

  /* merge roofs by kind into 400 m tiles so we don't emit 10k meshes */
  const tiles = new Map();
  const tileOf = (e, n, kind) => {
    const k = kind + ':' + Math.floor(e / 400) + ':' + Math.floor(n / 400);
    let t = tiles.get(k);
    if (!t) { t = { kind, v: [], i: [], uv: [] }; tiles.set(k, t); }
    return t;
  };
  const pushQuad = (t, a, b, c, d, uSpan, vSpan) => {
    const k = t.v.length / 3;
    for (const p of [a, b, c, d]) t.v.push(p.x, p.y, p.z);
    t.uv.push(0, 0, uSpan, 0, uSpan, vSpan, 0, vSpan);
    t.i.push(k, k + 1, k + 2, k, k + 2, k + 3);
  };

  const build = (G) => {
    if (!G || !G.buildings) return;
    const holes = holesOf(G);
    const minA = LITE ? 80 : LOW ? 90 : 30;
    const CORE = LITE ? 1400 : 3200; /* lean: roofs in the playable core first */
    const B = G.buildings;
    let i = 0;
    const step = () => {
      try {
        const end = Math.min(B.length, i + (LITE ? 350 : 800));
        for (; i < end; i++) one(B[i][0], B[i][1]);
        if (i < B.length) return setTimeout(step, 0);
        flush();
        info.done = true;
        console.info('[IE] v115 solid roofs', info);
      } catch (e) { console.warn('v115-solid', e); }
    };
    const one = (h0, c) => {
      if (c[1] === 2365 && (c[0] === -160 || c[0] === -128)) return;
      const pts = flat(c); if (pts.length < 3) return;
      let A = 0; for (let k = 0; k < pts.length; k++) { const p = pts[k], q = pts[(k + 1) % pts.length]; A += p[0] * q[1] - q[0] * p[1]; }
      A = Math.abs(A) / 2; if (A < minA) return;
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      if (Math.hypot(cx, cy) > CORE) return;
      if (holes.some(([e, n, r]) => Math.hypot(cx - e, cy - n) < r)) return;
      if (G.keepPts && G.keepPts.some(([e, n]) => {
        let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > n) !== (yj > n) && e < (xj - xi) * (n - yi) / ((yj - yi) || 1e-6) + xi) c = !c;
        } return c;
      })) return;
      /* real OSM metres when tagged; untagged 6 m (house) or 9 m (larger footprint) */
      const h = (h0 || (A > 900 ? 9 : 6)) + 0.12;
      /* oriented bounds via longest edge */
      let maxL = 0, ang = 0;
      for (let k = 0; k < pts.length; k++) {
        const p = pts[k], q = pts[(k + 1) % pts.length];
        const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (L > maxL) { maxL = L; ang = Math.atan2(q[1] - p[1], q[0] - p[0]); }
      }
      const ca = Math.cos(-ang), sa = Math.sin(-ang);
      let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
      for (const [e, n] of pts) {
        const u = (e - cx) * ca - (n - cy) * sa, v = (e - cx) * sa + (n - cy) * ca;
        if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v;
      }
      const len = u1 - u0, wid = v1 - v0, aspect = Math.max(len, wid) / Math.max(0.8, Math.min(len, wid));
      const toW = (u, v, y) => {
        const e = cx + u * ca + v * sa, n = cy - u * sa + v * ca;
        const w = warp(e, n); return new T.Vector3(w.x, y, w.z);
      };
      const rise = Math.min(3.4, Math.max(1.35, Math.min(len, wid) * 0.28));
      /* seafront pastels get pantiles; inland brick gets slate; big footprints get felt flats */
      const seaish = cx > 40;
      let kind, style;
      if (A > 1100 || (aspect < 1.25 && A > 400)) { kind = 'felt'; style = 'flat'; }
      else if (aspect >= 1.45 && A < 900) { kind = seaish ? 'pantile' : 'slate'; style = 'gable'; }
      else { kind = seaish ? 'pantile' : 'slate'; style = (A < 280 ? 'gable' : 'hip'); }
      const t = tileOf(cx, cy, kind);
      const eave = h + 0.04;
      const uu = Math.max(1, len / 4), vv = Math.max(1, wid / 4);
      if (style === 'flat') {
        const y = h + 0.22;
        pushQuad(t, toW(u0 - 0.2, v0 - 0.2, y), toW(u1 + 0.2, v0 - 0.2, y), toW(u1 + 0.2, v1 + 0.2, y), toW(u0 - 0.2, v1 + 0.2, y), uu, vv);
        info.flat++;
      } else if (style === 'gable') {
        /* ridge along the long axis (u) */
        const ridge = eave + rise;
        const midV = (v0 + v1) / 2;
        pushQuad(t, toW(u0, v0, eave), toW(u1, v0, eave), toW(u1, midV, ridge), toW(u0, midV, ridge), uu, vv);
        pushQuad(t, toW(u0, v1, eave), toW(u1, v1, eave), toW(u1, midV, ridge), toW(u0, midV, ridge), uu, vv);
        /* gable end walls (filled triangles as degenerate quads) so the prism is closed */
        const midU0 = toW(u0, midV, ridge), midU1 = toW(u1, midV, ridge);
        pushQuad(t, toW(u0, v0, eave), midU0, toW(u0, v1, eave), toW(u0, v0, eave), 1, 1);
        pushQuad(t, toW(u1, v0, eave), midU1, toW(u1, v1, eave), toW(u1, v0, eave), 1, 1);
        info.gable++;
      } else {
        const ridge = eave + rise;
        const inset = Math.min(len, wid) * 0.28;
        const ru0 = u0 + inset, ru1 = u1 - inset, rv0 = v0 + inset * 0.15, rv1 = v1 - inset * 0.15;
        /* four hip faces: long sides to a short ridge, short sides as triangles */
        const r0 = toW(ru0, (rv0 + rv1) / 2, ridge), r1 = toW(ru1, (rv0 + rv1) / 2, ridge);
        pushQuad(t, toW(u0, v0, eave), toW(u1, v0, eave), r1, r0, uu, vv);
        pushQuad(t, toW(u0, v1, eave), toW(u1, v1, eave), r1, r0, uu, vv);
        pushQuad(t, toW(u0, v0, eave), toW(u0, v1, eave), r0, toW(u0, v0, eave), 1, 1);
        pushQuad(t, toW(u1, v0, eave), toW(u1, v1, eave), r1, toW(u1, v0, eave), 1, 1);
        info.hip++;
      }
      info.roofs++;
    };
    const flush = () => {
      for (const t of tiles.values()) {
        if (!t.v.length) continue;
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(t.v, 3));
        g.setAttribute('uv', new T.Float32BufferAttribute(t.uv, 2));
        g.setIndex(t.i);
        g.computeVertexNormals();
        g.computeBoundingSphere();
        const m = new T.Mesh(g, MAT[t.kind] || MAT.slate);
        m.name = 'v115-roof-' + t.kind;
        grp.add(m);
        t.v = t.i = t.uv = null;
      }
    };
    step();
  };

  const start = () => {
    const G = fx.G;
    if (!G || !G.buildings) return setTimeout(start, 400);
    if (!hideHolo()) return setTimeout(start, 400);
    build(G);
    /* re-hide if a late module re-adds neon edges */
    [1500, 4000, 8000].forEach(ms => setTimeout(hideHolo, ms));
  };
  start();
  fx.v115s = { info };
  return { info };
}
