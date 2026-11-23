/* v118: Great Yarmouth Town Hall (Hall Plain, 1882, John Bond Pearce, Grade II*) — real height pass.
   The hall itself is the existing OSM footprint (relation 2344635 / yarmouth-geo building #104) now at ~17 m
   instead of the 9 m default, so there is no second hall mesh. This file adds ONLY the 110 ft (34 m) clock tower
   with its lantern, rising out of the roof (no hidden mesh inside the hall). Placement: main frontage, third bay
   from the right (Historic England 1246969 / Wikipedia); frontage side and bay are approximate — check vs Street View.
   The Star Hotel (24 Hall Quay, OSM way 175552797) also gets a real ~15 m height in the same data edit.
   Flag: IE_V118_TOWNHALL=false. */
export function initV118(o) {
  const { T, S, LITE, LOW, fx } = o;
  const info = { townhall: 0 };
  if (window.IE_V118_TOWNHALL === false) { info.off = true; return { info, update() {} }; }
  const g = new T.Group(); g.name = 'v118-townhall-tower'; window.__v118 = info;
  /* NE frontage edge (-773,298)->(-750,275); 2.5/7 along from the right-hand (NW) end, inset 1.8 m: world x=e, z=-n */
  g.position.set(-766.6, 0, -288.0); g.rotation.y = Math.PI / 4;
  const M = c => (LITE || LOW) ? new T.MeshLambertMaterial({ color: c }) : new T.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0 });
  const brick = M(0x9a4632), terra = M(0xc9825a), stone = M(0xd8cdb8), lead = M(0x4a5a5c), face = new T.MeshBasicMaterial({ color: 0xf2efe4 });
  const box = (w, h, d, x, y, z, m) => { const k = new T.Mesh(new T.BoxGeometry(w, h, d), m); k.position.set(x, y, z); g.add(k); return k; };
  /* shaft: from just under the 17 m roofline to 25 m */
  box(5.4, 9.5, 5.4, 0, 15 + 4.75, 0, brick);
  for (const y of [18.2, 21.4]) box(5.7, 0.35, 5.7, 0, y, 0, terra);            /* terracotta string courses */
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.6, 9.5, 0.6, sx * 2.6, 19.75, sz * 2.6, terra); /* corner pilasters */
  /* clock stage 25–28.5 m with four faces */
  box(5.9, 3.5, 5.9, 0, 26.75, 0, stone);
  const faceGeo = new T.CircleGeometry(1.25, LOW ? 16 : 28);
  for (let i = 0; i < 4; i++) { const f = new T.Mesh(faceGeo, face); const a = i * Math.PI / 2; f.position.set(Math.sin(a) * 2.97, 26.9, Math.cos(a) * 2.97); f.rotation.y = a; g.add(f);
    const hand = new T.Mesh(new T.BoxGeometry(0.08, 0.9, 0.02), new T.MeshBasicMaterial({ color: 0x111111 })); hand.position.set(Math.sin(a) * 2.99, 27.2, Math.cos(a) * 2.99); hand.rotation.y = a; g.add(hand); }
  box(6.3, 0.4, 6.3, 0, 28.7, 0, terra);                                           /* cornice */
  /* open lantern 28.9–31.6 m: four posts + cap */
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.45, 2.7, 0.45, sx * 1.9, 30.25, sz * 1.9, stone);
  box(4.6, 0.35, 4.6, 0, 31.75, 0, stone);
  const dome = new T.Mesh(new T.SphereGeometry(2.0, LOW ? 10 : 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), lead); dome.position.set(0, 31.9, 0); dome.scale.y = 0.9; g.add(dome);
  const fin = new T.Mesh(new T.ConeGeometry(0.18, 1.6, 8), lead); fin.position.set(0, 34.0 - 0.8 + 0.0, 0); g.add(fin); /* tip at ~34 m (110 ft) */
  S.add(g); info.townhall = 1;
  /* ---------- v118: one path past North Denes school, not two ----------
     v115 built a raised alley (up to ~0.9 m) from the Jellicoe underpass east to the Iron Duke; v116 then laid its own
     paved school path (~0.15 m) along almost the same line. Both were visible (overlap / waste) and the two walk-height
     functions fought, so you bobbed ~0.5 m walking east. Keep the v116 path; hide the duplicated v115 slab, kerbs and its
     lamps between e-50 and e105, and flatten walking to the v116 level there. Fingerpost boards are left alone.
     IE_V118_ALLEY=false keeps the old behaviour. */
  if (window.IE_V118_ALLEY !== false) {
    const AW2 = 3.6 / 2 + 0.4;
    const nnAt = e => e < -20 ? 2684 + (e + 50) * (4 / 30) : 2690;
    const gp = window.__groundParts || (window.__groundParts = []);
    gp.unshift((x, z) => { const e = x, n = -z; if (e < -50 || e > 105 || n < 2680.5 || n > 2695) return null; return Math.abs(n - nnAt(e)) < AW2 ? 0.14 : null; });
    const wp = new T.Vector3();
    const tidy = () => {
      const b = S.getObjectByName('v115-bridges'); if (!b) return false; let n0 = 0;
      b.traverse(o => {
        if (!o.isMesh || !o.geometry) return;
        o.getWorldPosition(wp); const e = wp.x, n = -wp.z;
        if (e < -50 || e > 105 || n < 2681 || n > 2695) return;
        const P = o.geometry.parameters || {};
        const slab = wp.y < 1.4 && o.geometry.type === 'BoxGeometry';
        const pole = o.geometry.type === 'BoxGeometry' && Math.abs((P.height || 0) - 3.6) < 0.01 && (P.width || 1) < 0.2;
        const bulb = o.geometry.type === 'SphereGeometry' && Math.abs((P.radius || 0) - 0.22) < 0.01;
        if (slab || pole || bulb) { o.visible = false; n0++; }
      });
      info.alleyHidden = n0; return true;
    };
    [800, 2500, 6000].forEach(ms => setTimeout(tidy, ms));
  }
  /* ---------- v118: Venetian Waterways water (OSM water polygons of the boating channel, North Drive) ----------
     The channel polygons were only in the flat 0.06 m neon water layer, under the LIDAR ground, so the Waterways looked dry.
     One calm water surface per polygon, levelled to the LIDAR channel floor (+5 cm). Islets / footbridges (v85) stay. */
  if (window.IE_V118_WATERWAYS !== false) {
    const build = (tries = 0) => {
      const polys = fx && fx.wwPolys; const H = fx && fx.earth && fx.earth.heightAt;
      if (!polys || (!H && tries < 30)) return setTimeout(() => build(tries + 1), 500);
      if (!polys.length) return;
      const mat = (LITE || LOW) ? new T.MeshLambertMaterial({ color: 0x2c5a60 }) : new T.MeshStandardMaterial({ color: 0x2b5960, roughness: 0.08, metalness: 0.15 });
      const ww = new T.Group(); ww.name = 'v118-waterways-water';
      info.ww = [];
      for (const c of polys) {
        const pts = []; for (let i = 0; i < c.length; i += 2) pts.push([c[i], c[i + 1]]);
        if (pts.length > 2 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
        /* sample LIDAR inside the polygon: 85th percentile = water level (banks are outside the polygon) */
        let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9; for (const [e, n] of pts) { mnx = Math.min(mnx, e); mxx = Math.max(mxx, e); mny = Math.min(mny, n); mxy = Math.max(mxy, n); }
        const inside = (e, n) => { let r = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > n) !== (yj > n) && e < (xj - xi) * (n - yi) / (yj - yi) + xi) r = !r; } return r; };
        const hs = []; for (let e = mnx; e <= mxx; e += 2) for (let n = mny; n <= mxy; n += 2) if (inside(e, n)) { const h = H ? H(e, -n) : 0; if (h != null && isFinite(h)) hs.push(h); }
        hs.sort((a, b) => a - b); const lvl = (hs.length ? hs[Math.floor(hs.length * 0.85)] : 0) + 0.05;
        const shape = new T.Shape(pts.map(([e, n]) => new T.Vector2(e, n)));
        const geo = new T.ShapeGeometry(shape); geo.rotateX(-Math.PI / 2); /* shape (e, n) -> (x=e, z=-n) after rotateX(-90°) */
        const m = new T.Mesh(geo, mat); m.position.y = lvl; m.receiveShadow = true; m.renderOrder = 0; ww.add(m);
        info.ww.push([Math.round(lvl * 100) / 100, hs.length]);
      }
      S.add(ww);
    };
    build();
  }
  return { info, update() {} };
}
