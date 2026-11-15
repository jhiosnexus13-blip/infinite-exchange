/* v115: place Jellicoe and Barnard Bridges on their real OSM alignments, large and
   properly scaled. Preview only (v2-round2). Flag: IE_V115_BRIDGES=false disables.

   Jellicoe: already on OSM ways 231810834/835 (e-72..-54, n2662..2674) over the old
   Midland & Great Northern railway / service lane. This pass enlarges the massing and
   adds the alley on the north side that leads east past North Denes Primary School
   (OSM relation 3118379, e-10..106 n2713..2753) up towards The Iron Duke
   (OSM way 232015022, e122 n2692, Jellicoe Road / North Drive corner).

   Barnard: previous deck sat in Barnard Field (e-60, n2236, N–S, 9×16 m). Real
   Barnard Avenue (baked yarmouth-geo: e-93,n2133 to e112,n2121) is E–W and meets
   the same railway at e-63, n2131. The new deck sits there, at the end of that
   road as seen from North Drive — ahead on the road, not in the field. */
export function initV115Bridges(o) {
  const { T, S, LBL, LITE, warp, fx } = o;
  const info = { jellicoe: 0, barnard: 0, alley: 0, hidden: 0 };
  if (window.IE_V115_BRIDGES === false) { info.off = true; return { info, update() {} }; }

  const grp = new T.Group(); grp.name = 'v115-bridges'; S.add(grp);
  const M = (c, x = {}) => new T.MeshBasicMaterial(Object.assign({ color: c }, x));
  const box = (c, w, h, d, e, n, y, ry = 0) => {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), typeof c === 'number' ? M(c) : c);
    const p = warp(e, n); m.position.set(p.x, y, p.z); m.rotation.y = ry; grp.add(m); return m;
  };
  const board = (text, w, h, e, n, y, ry, bg = '#1a2430', fg = '#f4ebd4') => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = Math.max(128, Math.round(1024 * h / Math.max(0.5, w)));
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = fg; g.lineWidth = 14; g.strokeRect(16, 16, c.width - 32, c.height - 32);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = String(text).split('\n');
    g.font = 'bold ' + Math.floor(c.height / (lines.length + 1.2)) + 'px Georgia,serif';
    lines.forEach((ln, i) => g.fillText(ln, c.width / 2, c.height * (i + 1) / (lines.length + 1)));
    const tx = new T.CanvasTexture(c); tx.anisotropy = 4;
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tx, side: T.DoubleSide, fog: true }));
    const p = warp(e, n); m.position.set(p.x, y, p.z); m.rotation.y = ry; grp.add(m); return m;
  };
  const gp = window.__groundParts = window.__groundParts || [];
  const solid = (e0, n0, e1, n1, ylo, yhi) => fx.addSolid && fx.addSolid([[e0, n0], [e1, n0], [e1, n1], [e0, n1]], ylo, yhi);

  /* ---------- hide the old Barnard Field toy bridge (e-60, n2236, N–S) ---------- */
  const OLD = warp(-60, 2236);
  const hideOld = () => {
    let n = 0;
    const consider = (m) => {
      if (!m || !m.isObject3D) return;
      const wp = new T.Vector3();
      m.traverse(ch => {
        if (!ch.isMesh && !ch.isSprite && !ch.isLine && !ch.isLineSegments) return;
        ch.getWorldPosition(wp);
        /* field centre is n=2280 (z≈-2280); only hide the old deck / bank / label around n=2236 */
        if (Math.abs(wp.x - OLD.x) < 55 && Math.abs(wp.z - OLD.z) < 32 && wp.y < 16) {
          if (ch.parent && ch.parent.name === 'v115-bridges') return;
          ch.visible = false; n++;
        }
      });
    };
    for (const name of ['v77', 'v81', 'v86', 'v99', 'v80']) consider(S.getObjectByName(name));
    /* floating 'BARNARD BRIDGE' labels near the old spot (some are parented on the scene) */
    S.traverse(ch => {
      if (!ch.isSprite) return;
      ch.getWorldPosition(new T.Vector3());
    });
    S.traverse(ch => {
      if (!(ch.isSprite || (ch.isMesh && ch.material && ch.material.map))) return;
      const wp = new T.Vector3(); ch.getWorldPosition(wp);
      if (Math.abs(wp.x - OLD.x) < 40 && Math.abs(wp.z - OLD.z) < 30 && wp.y > 5 && wp.y < 16) {
        if (ch.parent && ch.parent.name === 'v115-bridges') return;
        ch.visible = false; n++;
      }
    });
    info.hidden = n;
  };
  /* cancel the old walkable deck so it no longer floats in the field (first non-null wins — this is unshifted before the new deck, then the new deck is unshifted on top) */
  gp.unshift((x, z) => {
    const e = x, n = -z;
    if (Math.abs(e + 60) < 12 && n > 2208 && n < 2266) {
      const h = fx.earth && fx.earth.heightAt ? fx.earth.heightAt(x, z) : 0;
      return (h != null ? h : 0) + 0.02;
    }
    return null;
  });

  /* ---------- Barnard Bridge on OSM Barnard Avenue × old railway ---------- */
  /* Avenue: (-93, 2133) → (112, 2121). Railway at e≈-63 (same as Jellicoe). */
  const A = [-93, 2133], B = [112, 2121];
  const BE = -63;
  const Bt = (BE - A[0]) / (B[0] - A[0]);
  const BN = A[1] + Bt * (B[1] - A[1]); /* ≈ 2131.24 */
  const TH = Math.atan2(B[1] - A[1], B[0] - A[0]); /* heading east, ≈ -0.058 rad */
  const RY = -TH; /* Three.js yaw so +X follows the road in (x, z=-n) */
  const COS = Math.cos(TH), SIN = Math.sin(TH);
  const toW = (along, perp) => [BE + along * COS - perp * SIN, BN + along * SIN + perp * COS];
  const toL = (e, n) => {
    const de = e - BE, dn = n - BN;
    return [de * COS + dn * SIN, -de * SIN + dn * COS];
  };
  const DT = 6.6, SPAN = 28, HALF = SPAN / 2, WID = 15.6, RAMP = 48, CW = 10.2;
  const bAt = (c, w, h, d, along, perp, y) => { const [e, n] = toW(along, perp); return box(c, w, h, d, e, n, y, RY); };

  /* canceller is already first; unshift the NEW deck so it wins on the avenue */
  gp.unshift((x, z) => {
    const [al, pe] = toL(x, -z);
    if (Math.abs(pe) > WID / 2 + 0.5) return null;
    const a = Math.abs(al);
    if (a <= HALF) return DT;
    if (a <= HALF + RAMP) return Math.max(0.06, DT * (1 - (a - HALF) / RAMP));
    return null;
  });

  /* deck, road, pavements, centre line */
  bAt(0x5a5f66, SPAN + 1.6, 0.85, WID, 0, 0, DT - 0.42);
  bAt(0x2b2e33, SPAN + 1.2, 0.08, CW, 0, 0, DT + 0.04);
  for (const s of [-1, 1]) bAt(0xa9a49a, SPAN + 1.2, 0.1, 2.4, 0, s * (CW / 2 + 1.15), DT + 0.08);
  bAt(0xd9d9d0, SPAN + 1.0, 0.04, 0.18, 0, 0, DT + 0.1);
  /* steel girders under the span */
  for (const p of [-WID / 2 + 1.2, -CW / 3, CW / 3, WID / 2 - 1.2]) bAt(0x2a2d32, SPAN - 0.6, 1.15, 0.45, 0, p, DT - 1.15);
  for (let i = -4; i <= 4; i++) bAt(0x32363c, 0.4, 1.15, WID - 1.6, i * (SPAN / 9), 0, DT - 1.15);
  /* parapets + rails */
  for (const s of [-1, 1]) {
    bAt(0xb7b2a8, SPAN + 2.2, 1.35, 0.42, 0, s * (WID / 2 - 0.15), DT + 0.7);
    bAt(0x3a3d42, SPAN + 2.2, 0.12, 0.18, 0, s * (WID / 2 - 0.15), DT + 1.42);
    solid(...(() => { const a = toW(-HALF - 0.6, s * (WID / 2 - 0.15)), b = toW(HALF + 0.6, s * (WID / 2 - 0.15)); const w = 0.4;
      return [Math.min(a[0], b[0]) - w, Math.min(a[1], b[1]) - w, Math.max(a[0], b[0]) + w, Math.max(a[1], b[1]) + w, DT - 1.2, 99]; })());
  }
  /* brick abutments + wing walls at each end of the span */
  for (const side of [-1, 1]) {
    const al = side * (HALF + 1.0);
    bAt(0x8a5a3e, 2.6, DT - 0.2, WID + 5, al, 0, (DT - 0.2) / 2);
    for (const s of [-1, 1]) bAt(0x7a4e36, 8, DT * 0.55, 1.4, al + side * 4, s * (WID / 2 + 2.2), DT * 0.28);
    solid(...(() => { const [e, n] = toW(al, 0); return [e - 1.6, n - WID / 2 - 1, e + 1.6, n + WID / 2 + 1, -9, DT - 1.15]; })());
  }
  /* ramps: stepped tarmac + pavements down to grade, both east and west */
  const steps = LITE ? 8 : 14;
  for (const dir of [-1, 1]) {
    for (let k = 0; k < steps; k++) {
      const al0 = dir * (HALF + 1 + k * (RAMP / steps));
      const al1 = dir * (HALF + 1 + (k + 1) * (RAMP / steps));
      const al = (al0 + al1) / 2, seg = Math.abs(al1 - al0) + 0.15;
      const h = Math.max(0.08, DT * (1 - (Math.abs(al) - HALF) / RAMP));
      bAt(0x2b2e33, seg, 0.1, CW, al, 0, h);
      for (const s of [-1, 1]) bAt(0xa9a49a, seg, 0.1, 2.3, al, s * (CW / 2 + 1.15), h + 0.04);
      if (h > 0.9) for (const s of [-1, 1]) bAt(0xb7b2a8, seg, 0.95, 0.28, al, s * (WID / 2 - 0.2), h + 0.5);
    }
  }
  /* approach road — the “yellow road” from North Drive (e112) west through the bridge to e-93 */
  const roadLen = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const roadN = LITE ? 8 : 14;
  for (let i = 0; i < roadN; i++) {
    const t0 = i / roadN, t1 = (i + 1) / roadN;
    const e0 = A[0] + (B[0] - A[0]) * t0, n0 = A[1] + (B[1] - A[1]) * t0;
    const e1 = A[0] + (B[0] - A[0]) * t1, n1 = A[1] + (B[1] - A[1]) * t1;
    const midE = (e0 + e1) / 2, midN = (n0 + n1) / 2;
    const [al] = toL(midE, midN);
    if (Math.abs(al) < HALF + RAMP - 1) continue; /* deck and ramps already cover this */
    const len = Math.hypot(e1 - e0, n1 - n0) + 0.3;
    box(0x3a3f45, len, 0.08, 11.4, midE, midN, 0.07, RY);
    box(0xe6c84a, len, 0.03, 0.16, midE, midN, 0.12, RY); /* yellow centre line — reads as the yellow road */
    for (const s of [-1, 1]) box(0xa9a49a, len, 0.07, 1.9, ...toW(al, s * 6.4), 0.1, RY);
  }
  /* underpass: old railway path, N–S, walkable under the deck */
  box(0x4a4d52, 7, 0.06, 90, BE, BN, 0.05, 0);
  /* lamps on the deck */
  for (const al of [-10, 0, 10]) for (const s of [-1, 1]) {
    const [e, n] = toW(al, s * (WID / 2 - 0.6));
    box(0x2a2d32, 0.16, 5.2, 0.16, e, n, DT + 2.6, RY);
    const lamp = new T.Mesh(new T.SphereGeometry(0.32, 8, 6), M(0xffe2a8, { fog: false }));
    const p = warp(e, n); lamp.position.set(p.x, DT + 5.3, p.z); grp.add(lamp);
  }
  /* name plates, both faces + a roadside sign on the east approach (on the yellow road) */
  board('BARNARD BRIDGE', 10.5, 1.5, ...toW(0, WID / 2 + 0.4), DT + 2.5, RY, '#12355b', '#ffffff');
  board('BARNARD BRIDGE', 10.5, 1.5, ...toW(0, -(WID / 2 + 0.4)), DT + 2.5, RY + Math.PI, '#12355b', '#ffffff');
  { const [e, n] = toW(HALF + RAMP + 6, 8); box(0x3a3d42, 0.12, 2.2, 0.12, e, n, 1.1);
    board('BARNARD\nBRIDGE', 3.2, 1.5, e, n, 2.5, RY + Math.PI / 2, '#12355b', '#ffffff'); }
  if (LBL) {
    const lb = LBL('BARNARD BRIDGE', '#e9e2c8', 1.6);
    const p = warp(BE, BN); lb.position.set(p.x, DT + 5.2, p.z); lb.userData.v83keep = 1; grp.add(lb);
  }
  info.barnard = { e: +BE.toFixed(2), n: +BN.toFixed(2), deck: DT, span: SPAN, width: WID, headingDeg: +(TH * 180 / Math.PI).toFixed(2) };

  /* jump: stand on the yellow road EAST of the bridge, looking WEST, so the deck is ahead */
  const land = warp(...toW(HALF + RAMP + 14, 0));
  const look = warp(BE, BN);
  const jump = [land.x, land.z, [look.x, look.z, 0.04, 0.15], true];
  const applyJump = () => {
    const J = fx.extraJumps || (fx.extraJumps = {});
    J.barnard_bridge = jump;
    fx.pj81 = fx.pj81 || {};
    fx.pj81.barnard_bridge = jump;
  };
  applyJump();
  setTimeout(applyJump, 1500); setTimeout(applyJump, 4000);

  /* ---------- Jellicoe: enlarge the OSM-aligned deck + alley to school / Iron Duke ---------- */
  /* Dual carriageway: N0=2662.4 N1=2674.6, AW=-72 AE=-54, DT=6.4 (world-v63 v83 siting). */
  const JN0 = 2662.4, JN1 = 2674.6, JNC = (JN0 + JN1) / 2, JDW = JN1 - JN0; /* 12.2 m */
  const JAW = -72, JAE = -54, JCX = (JAW + JAE) / 2, JDT = 6.5, JSPAN = JAE - JAW; /* 18 m OSM span */
  const JWID = 16.8; /* full dual carriageway + pavements, a bit wider than the v63 slab */

  /* slightly higher / wider deck so it covers the slimmer v63 slab without z-fighting */
  box(0x5a5f66, JSPAN + 2.2, 0.9, JWID, JCX, JNC, JDT - 0.4);
  box(0x3a3d42, JSPAN + 1.8, 0.08, JWID - 5.2, JCX, JNC, JDT + 0.06);
  for (const pn of [JN0 + 1.5, JN1 - 1.5]) box(0xa9a49a, JSPAN + 1.8, 0.1, 2.3, JCX, pn, JDT + 0.1);
  box(0xd9d9d0, JSPAN + 1.6, 0.04, 0.18, JCX, JNC, JDT + 0.12);
  /* girders */
  for (const pn of [JN0 + 2.2, JNC, JN1 - 2.2]) box(0x2a2d32, JSPAN - 0.4, 1.2, 0.48, JCX, pn, JDT - 1.2);
  for (let e = JAW + 2; e <= JAE - 2; e += 3.2) box(0x32363c, 0.4, 1.2, JWID - 2, e, JNC, JDT - 1.2);
  /* parapets */
  for (const nn of [JN0 - 1.8, JN1 + 1.8]) {
    box(0xb7b2a8, JSPAN + 3.2, 1.4, 0.45, JCX, nn, JDT + 0.72);
    box(0x3a3d42, JSPAN + 3.2, 0.12, 0.2, JCX, nn, JDT + 1.48);
    solid(JAW - 1.5, nn - 0.3, JAE + 1.5, nn + 0.3, JDT - 1.2, 99);
  }
  /* brick abutments at e=-72 and e=-54, wing walls, underpass opening kept clear (N–S) */
  for (const ea of [JAW, JAE]) {
    box(0x8a5a3e, 2.8, JDT - 0.15, JWID + 6, ea, JNC, (JDT - 0.15) / 2);
    for (const s of [-1, 1]) box(0x7a4e36, 9, JDT * 0.58, 1.5, ea + (ea === JAW ? -4.5 : 4.5), JNC + s * (JWID / 2 + 2.4), JDT * 0.3);
    solid(ea - 1.5, JN0 - 2, ea + 1.5, JN1 + 2, -9, JDT - 1.2);
  }
  /* deck lamps */
  for (const e of [JCX - 5, JCX + 5]) for (const nn of [JN0 - 1.5, JN1 + 1.5]) {
    box(0x2a2d32, 0.16, 5.2, 0.16, e, nn, JDT + 2.6);
    const lamp = new T.Mesh(new T.SphereGeometry(0.32, 8, 6), M(0xffe2a8, { fog: false }));
    const p = warp(e, nn); lamp.position.set(p.x, JDT + 5.3, p.z); grp.add(lamp);
  }
  board('JELLICOE BRIDGE', 11.5, 1.55, JCX, JN1 + 2.15, JDT + 2.55, 0, '#1a2430', '#f4ebd4');
  board('JELLICOE BRIDGE', 11.5, 1.55, JCX, JN0 - 2.15, JDT + 2.55, Math.PI, '#1a2430', '#f4ebd4');
  if (LBL) {
    const lb = LBL('JELLICOE BRIDGE', '#c9d2da', 1.5);
    const p = warp(JCX, JN1 + 0.8); lb.position.set(p.x, JDT + 5.0, p.z); lb.userData.v83keep = 1; grp.add(lb);
  }
  /* improved underpass lane, N–S along the old railway (e -63.8), longer so it meets the new alley */
  box(0x4a4d52, 6.5, 0.06, 110, -63.8, JNC, 0.05);

  /* Alley NEXT to the bridge, north side, leading UP from the underpass then EAST
     past North Denes Primary School (south frontage n≈2713) towards The Iron Duke (e122, n2692). */
  const ALLEY = [
    [-63.8, 2678],   /* beside the north abutment, at the underpass */
    [-50, 2684],     /* up / out from the bridge */
    [-20, 2688],
    [10, 2690],      /* south of the school (school bb n2713..2753, e-10..106) */
    [50, 2690],
    [90, 2690],
    [115, 2691],     /* approaching The Iron Duke on the Jellicoe / North Drive corner */
  ];
  const alleyW = 3.6;
  const alleyH = (e, n) => {
    /* rise from grade at the underpass up to a comfortable 0.9 m path, then stay level toward the pub */
    const t = Math.max(0, Math.min(1, (e + 63.8) / 30));
    return 0.06 + t * 0.85;
  };
  for (let i = 0; i < ALLEY.length - 1; i++) {
    const [e0, n0] = ALLEY[i], [e1, n1] = ALLEY[i + 1];
    const e = (e0 + e1) / 2, n = (n0 + n1) / 2;
    const len = Math.hypot(e1 - e0, n1 - n0) + 0.25;
    const ry = Math.atan2(-(n1 - n0), e1 - e0); /* world yaw, same rule as Barnard */
    const y = alleyH(e, n);
    box(0x9a978f, len, 0.08, alleyW, e, n, y, ry);
    for (const s of [-1, 1]) box(0x6b6560, len, 0.22, 0.14, e + 0, n, y + 0.12, ry);
    /* actually kerbs offset in perp — simple side rails along the path */
  }
  /* kerbs along the path (approx, axis-friendly: path is nearly E–W from e-50 onwards) */
  for (let e = -50; e < 116; e += 4) {
    const n = e < -20 ? 2684 + (e + 50) * (4 / 30) : 2690;
    const y = alleyH(e, n);
    box(0xb7b2a8, 4.1, 0.22, 0.14, e, n + alleyW / 2, y + 0.12);
    box(0xb7b2a8, 4.1, 0.22, 0.14, e, n - alleyW / 2, y + 0.12);
    if (!LITE && e % 16 === 0) {
      box(0x2a2d32, 0.12, 3.6, 0.12, e, n + alleyW / 2 + 0.3, y + 1.8);
      const lamp = new T.Mesh(new T.SphereGeometry(0.22, 8, 6), M(0xffe2a8, { fog: false }));
      const p = warp(e, n + alleyW / 2 + 0.3); lamp.position.set(p.x, y + 3.7, p.z); grp.add(lamp);
    }
  }
  /* ramp / steps UP from the underpass (e-63.8, n2678, y0) onto the alley */
  for (let k = 0; k < 8; k++) {
    const n = 2675.2 + k * 0.55, y = 0.06 + k * 0.11;
    box(0x9a978f, 3.4, 0.1, 0.6, -63.8, n, y);
  }
  gp.unshift((x, z) => {
    const e = x, n = -z;
    /* steps */
    if (Math.abs(e + 63.8) < 1.8 && n >= 2674.8 && n <= 2680) {
      const k = Math.max(0, Math.min(7, Math.floor((n - 2675.2) / 0.55)));
      return 0.06 + k * 0.11 + 0.05;
    }
    /* alley: near-E–W corridor n≈2684..2693, e -50..116 */
    if (e >= -54 && e <= 118 && n >= 2681 && n <= 2694) {
      const nn = e < -20 ? 2684 + (e + 50) * (4 / 30) : 2690;
      if (Math.abs(n - nn) < alleyW / 2 + 0.4) return alleyH(e, n) + 0.04;
    }
    return null;
  });
  /* fingerposts */
  board('NORTH DENES\nPRIMARY SCHOOL', 3.6, 1.5, 20, 2692.5, 2.4, Math.PI, '#153a28', '#e8ffe8');
  board('THE IRON DUKE →', 3.8, 1.15, 90, 2692.4, 2.2, Math.PI, '#1f1410', '#f2e6c4');
  board('← JELLICOE\nBRIDGE', 3.2, 1.4, -48, 2686.5, 2.2, Math.PI, '#1a2430', '#f4ebd4');
  if (LBL) {
    const a = LBL('TO NORTH DENES SCHOOL  ·  THE IRON DUKE', '#c9ffd8', 1.05);
    const p = warp(40, 2691); a.position.set(p.x, 3.4, p.z); a.userData.v83keep = 1; grp.add(a);
  }
  info.alley = ALLEY.length;
  info.jellicoe = { e: JCX, n: JNC, deck: JDT, span: JSPAN, width: JWID };

  /* Jellicoe deck jump: stand on the east side of the deck, looking EAST along the alley toward school & Iron Duke */
  const jLand = warp(JAE + 2, JNC);
  const jLook = warp(90, 2690);
  const jJump = [jLand.x, jLand.z, [jLook.x, jLook.z, 0.02, JDT], 2];
  const applyJ = () => {
    const J = fx.extraJumps || (fx.extraJumps = {});
    J.jellicoe_deck = jJump;
    /* keep underside jump for clip tests; don't overwrite unless missing */
    fx.pj81 = fx.pj81 || {};
    fx.pj81.jellicoe_deck = jJump;
  };
  applyJ(); setTimeout(applyJ, 1500); setTimeout(applyJ, 4000);

  hideOld();
  [400, 1200, 2500, 5000].forEach(ms => setTimeout(hideOld, ms));

  fx.v115Info = info;
  window.__fx115 = info;
  console.info('[IE] v115 bridges', info);
  return { info, update() { /* hideOld is retry-based */ } };
}
