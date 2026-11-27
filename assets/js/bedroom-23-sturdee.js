/* v130 — unlabelled house on Sturdee Avenue, east side: walk-in two-storey interior
   with Joseph's old messy bedroom upstairs. Never draw a name, number or address.
   Ref (room details only, no people):
   WEST wall: off-white/grey, floor-to-ceiling pen/marker scrawl and doodles, a gold
   spray-paint JOE tag with a cross inside the O. Lower band + side wall deep red / orange-red.
   NORTH wall: off-white scrawl on the top band, Bob Marley-style poster + striped shirt
   hanging at the top left; deep-red lower two-thirds with black marker and a few white
   phrases; double plug on the right of the red; dark poster/flag high on the right;
   red mattress on the floor along the wall with white clothes piled on it; messy bedding
   and clothes over the floor. Dim warm grungy light. A small STROBE in the ceiling
   corner (phone-safe ~1.5 Hz, not seizure-fast; prefers-reduced-motion = steady glow).
   Light switch on the red wall, small cabinet/table in the corner, music gear, clutter.
   Toggle: IE_V130_23=false disables the special interior (generic v128 room is used). */
const RX = -1480, RZ = -4720, FY = -230;
const W = 8.2, D = 7.4, H1 = 2.7, H2 = 2.85;
/* Unlabelled target (east side of Sturdee). Do not surface these as a label. */
const AT = { e: -124.5, n: 2412.0, r: 9 };

const reduce = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };

function scrawl(ctx, w, h, col, n, seed) {
  let s = seed || 1;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = 0.25 + rnd() * 0.55; ctx.lineWidth = 0.7 + rnd() * 2.2;
    ctx.beginPath();
    let x = rnd() * w, y = rnd() * h;
    ctx.moveTo(x, y);
    const segs = 2 + (rnd() * 5 | 0);
    for (let k = 0; k < segs; k++) { x += (rnd() - 0.45) * 40; y += (rnd() - 0.5) * 18; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  ctx.restore();
}

function doodles(ctx, w, h, seed) {
  let s = seed || 7;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const x = rnd() * w, y = rnd() * h, r = 6 + rnd() * 16;
    ctx.globalAlpha = 0.35 + rnd() * 0.4; ctx.strokeStyle = rnd() > 0.5 ? '#1a1a1a' : '#2a1a12'; ctx.lineWidth = 1 + rnd();
    ctx.beginPath();
    if (rnd() > 0.6) { ctx.arc(x, y, r, 0, Math.PI * (0.8 + rnd())); }
    else if (rnd() > 0.5) { ctx.rect(x, y, r * 1.6, r * 1.1); }
    else { ctx.moveTo(x, y); ctx.lineTo(x + r, y + r * (rnd() - 0.5)); ctx.lineTo(x + r * 0.2, y + r); }
    ctx.stroke();
  }
  ctx.restore();
}

function joeTag(ctx, cx, cy, s) {
  /* Gold spray JOE, graffiti-style, with a cross inside the O. */
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(s, s);
  const gold = '#e6c24a';
  const spray = (fn) => {
    ctx.strokeStyle = gold; ctx.fillStyle = gold; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      ctx.globalAlpha = 0.28 + i * 0.12; ctx.lineWidth = 13 - i * 1.8;
      ctx.beginPath(); fn(ctx, (i - 2) * 0.4, (i % 3 - 1) * 0.35); ctx.stroke();
    }
  };
  spray((c, dx, dy) => { /* J */ c.moveTo(-88 + dx, -36 + dy); c.lineTo(-52 + dx, -36 + dy); c.moveTo(-66 + dx, -36 + dy); c.lineTo(-66 + dx, 28 + dy); c.quadraticCurveTo(-66 + dx, 48 + dy, -90 + dx, 46 + dy); });
  spray((c, dx, dy) => { /* O */ c.ellipse(0 + dx, 2 + dy, 26, 34, 0, 0, Math.PI * 2); });
  /* cross inside the O */
  ctx.globalAlpha = 0.95; ctx.strokeStyle = gold; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-16, 2); ctx.lineTo(16, 2); ctx.moveTo(0, -18); ctx.lineTo(0, 22); ctx.stroke();
  spray((c, dx, dy) => { /* E */ c.moveTo(78 + dx, -36 + dy); c.lineTo(38 + dx, -36 + dy); c.lineTo(38 + dx, 42 + dy); c.lineTo(78 + dx, 42 + dy); c.moveTo(38 + dx, 3 + dy); c.lineTo(70 + dx, 3 + dy); });
  /* drips */
  ctx.globalAlpha = 0.55; ctx.lineWidth = 3;
  for (const [x, y, l] of [[-66, 48, 16], [12, 36, 10], [38, 42, 14]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1, y + l); ctx.stroke(); }
  ctx.restore();
}

function texWest(T) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
  const x = c.getContext('2d');
  x.fillStyle = '#d8d4cc'; x.fillRect(0, 0, 1024, 1024);
  x.fillStyle = '#c9c3b8'; for (let i = 0; i < 40; i++) { x.globalAlpha = 0.15; x.fillRect(Math.random() * 1024, Math.random() * 1024, 80, 30); }
  x.globalAlpha = 1;
  /* deep red / orange-red lower band */
  const g = x.createLinearGradient(0, 640, 0, 1024);
  g.addColorStop(0, '#7a2a18'); g.addColorStop(1, '#5a1c10');
  x.fillStyle = g; x.fillRect(0, 700, 1024, 324);
  scrawl(x, 1024, 700, '#1c1a16', 140, 3);
  scrawl(x, 1024, 700, '#3a2a22', 60, 9);
  doodles(x, 1024, 690, 11);
  scrawl(x, 1024, 300, '#0e0e0e', 40, 21); /* some writing over the red, drawn in the lower band via translate */
  x.save(); x.beginPath(); x.rect(0, 700, 1024, 324); x.clip(); scrawl(x, 1024, 1024, '#1a120e', 50, 15); x.restore();
  joeTag(x, 512, 360, 2.15);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}

function texNorth(T) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
  const x = c.getContext('2d');
  /* top third off-white with scrawl */
  x.fillStyle = '#d6d1c8'; x.fillRect(0, 0, 1024, 340);
  scrawl(x, 1024, 340, '#1a1814', 70, 4);
  doodles(x, 1024, 330, 8);
  /* lower two-thirds deep red */
  const g = x.createLinearGradient(0, 340, 0, 1024);
  g.addColorStop(0, '#8a2e1a'); g.addColorStop(1, '#5c1e12');
  x.fillStyle = g; x.fillRect(0, 340, 1024, 684);
  scrawl(x, 1024, 1024, '#0a0a0a', 90, 6);
  /* a few white scribbled phrases — abstract, not a transcript of the room */
  x.fillStyle = '#f3f0e8'; x.globalAlpha = 0.8; x.font = 'italic 36px Georgia, serif';
  x.fillText('wake up', 120, 520); x.fillText('still here', 580, 640); x.fillText('one more', 200, 820);
  x.globalAlpha = 1;
  /* Bob Marley-style poster (evocation only: pan-African blocks + generic silhouette, not a reproduction) */
  x.fillStyle = '#1a1a1a'; x.fillRect(40, 36, 210, 280);
  x.fillStyle = '#1f7a3a'; x.fillRect(50, 46, 190, 80);
  x.fillStyle = '#e6c24a'; x.fillRect(50, 126, 190, 80);
  x.fillStyle = '#b01a1a'; x.fillRect(50, 206, 190, 96);
  x.fillStyle = '#111'; x.beginPath(); x.arc(145, 170, 44, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#222'; x.beginPath(); x.ellipse(145, 230, 40, 28, 0, 0, Math.PI * 2); x.fill();
  /* dark poster / flag, high right */
  x.fillStyle = '#1a1210'; x.fillRect(760, 40, 210, 150);
  x.strokeStyle = '#3a2a22'; x.lineWidth = 4; x.strokeRect(760, 40, 210, 150);
  x.fillStyle = '#5a2018'; x.fillRect(780, 70, 170, 18); x.fillRect(780, 110, 120, 18);
  /* double plug socket, right on the red */
  x.fillStyle = '#d8d4cc'; x.fillRect(820, 700, 86, 54);
  x.strokeStyle = '#333'; x.lineWidth = 3; x.strokeRect(820, 700, 86, 54);
  x.fillStyle = '#333';
  for (const ox of [16, 52]) { x.fillRect(820 + ox, 716, 8, 8); x.fillRect(820 + ox + 14, 716, 8, 8); x.fillRect(820 + ox + 4, 730, 16, 8); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}

function texRed(T) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#8a321c'); g.addColorStop(1, '#5a1c10');
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  scrawl(x, 512, 512, '#1a100c', 40, 12);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}

function texShirt(T) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const x = c.getContext('2d');
  for (let i = 0; i < 10; i++) { x.fillStyle = i % 2 ? '#f2f0ea' : '#2c2c30'; x.fillRect(0, i * 25.6, 128, 25.6); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; return t;
}

export function initBedroom23({ T, S, CAM, P, LITE, warp, fx }) {
  const info = { inside: false, enters: 0, exits: 0, ready: false };
  if (window.IE_V130_23 === false) return { info, owns: () => false, enter() {}, leave() {}, update() {} };

  const g = new T.Group(); g.name = 'bedroom-23-sturdee'; g.position.set(RX, FY, RZ); g.visible = false; S.add(g);
  const M = (col, extra) => new T.MeshBasicMaterial(Object.assign({ color: col }, extra || {}));
  const add = (par, geo, mat, x, y, z, rx, ry, rz) => {
    const m = new T.Mesh(geo, typeof mat === 'number' ? M(mat) : mat);
    m.position.set(x, y, z); if (rx) m.rotation.x = rx; if (ry) m.rotation.y = ry; if (rz) m.rotation.z = rz;
    par.add(m); return m;
  };
  const B = (a, b, c) => new T.BoxGeometry(a, b, c);

  /* ---------- downstairs hall (dingy, simple) ---------- */
  const down = new T.Group(); down.name = 'b23-down'; g.add(down);
  { const mats = [M(0x4a342c), M(0x4a342c), M(0x2a221c), M(0x5a4a3c), M(0x4a342c), M(0x4a342c)];
    mats.forEach(m => m.side = T.BackSide);
    const hall = new T.Mesh(B(W, H1, D), mats); hall.position.y = H1 / 2; down.add(hall); }
  add(down, B(1.0, 2.1, 0.08), 0x2b2b30, 0, 1.05, D / 2 - 0.04); /* front door (exit) */
  add(down, B(1.2, 2.25, 0.04), 0xd9d2c2, 0, 1.12, D / 2 - 0.02);
  add(down, B(0.9, 0.8, 0.4), 0x3b2a22, -3.2, 0.4, -2.8); /* side table */
  add(down, B(1.6, 0.7, 0.5), 0x2a2a2e, 3.0, 0.35, -3.2);
  add(down, B(0.08, 0.7, 1.1), 0x6a8090, 4.05, 1.6, 0.8); /* window glow */

  /* stairs along the west wall, rising toward -z (back of the house) */
  const stairs = new T.Group(); stairs.name = 'b23-stairs'; g.add(stairs);
  const STEPS = 9, rise = (H1 + 0.12) / STEPS, run = 2.4 / STEPS, xS = -2.9, z0 = 1.6;
  for (let i = 0; i < STEPS; i++) {
    add(stairs, B(1.15, 0.08, run + 0.02), 0x5a4a3c, xS, rise * (i + 1) - 0.04, z0 - run * i - run / 2);
    add(stairs, B(0.06, rise * (i + 1), 0.06), 0x3a3a3e, xS - 0.58, rise * (i + 1) / 2, z0 - run * i - run / 2);
  }
  add(stairs, B(1.2, 0.08, 1.1), 0x5a4a3c, xS, H1 + 0.04, z0 - run * STEPS - 0.4); /* top landing */

  /* ---------- upstairs bedroom ---------- */
  const up = new T.Group(); up.name = 'b23-up'; up.position.y = H1; g.add(up);
  const westT = texWest(T), northT = texNorth(T), redT = texRed(T), shirtT = texShirt(T);
  const westM = new T.MeshBasicMaterial({ map: westT, side: T.DoubleSide });
  const northM = new T.MeshBasicMaterial({ map: northT, side: T.DoubleSide });
  const redM = new T.MeshBasicMaterial({ map: redT, side: T.DoubleSide });
  const ceilM = M(0x2a2420, { side: T.DoubleSide });
  const floorM = M(0x3a2a22, { side: T.DoubleSide });
  /* walls: +z is south (toward stairs/door below), -z is NORTH, -x is WEST, +x is east/side */
  add(up, B(0.06, H2, D), westM, -W / 2 + 0.03, H2 / 2, 0, 0, 0, 0);
  add(up, B(W, H2, 0.06), northM, 0, H2 / 2, -D / 2 + 0.03);
  add(up, B(0.06, H2, D), redM, W / 2 - 0.03, H2 / 2, 0);
  add(up, B(W, H2, 0.06), redM, 0, H2 / 2, D / 2 - 0.03);
  add(up, B(W, 0.06, D), ceilM, 0, H2 - 0.03, 0);
  add(up, B(W, 0.06, D), floorM, 0, 0.03, 0);
  /* opening for the stairs (west-back of upstairs floor is solid; hole toward west-front) */
  /* stair arrives at x=-2.9, z ≈ 1.6-2.4 = -0.8 relative to hall; hall z is shared. Hole in floor already by not blocking — a darker well: */
  add(up, B(1.3, 0.1, 2.6), 0x1a1410, xS, 0.02, 0.4);

  /* striped shirt hanging, top left of north wall */
  add(up, B(0.55, 0.95, 0.08), new T.MeshBasicMaterial({ map: shirtT }), -2.6, H2 - 0.7, -D / 2 + 0.12);
  add(up, B(0.08, 0.08, 0.08), 0x333, -2.6, H2 - 0.22, -D / 2 + 0.1);

  /* light switch on the red (east) wall */
  add(up, B(0.04, 0.12, 0.08), 0xe8e4dc, W / 2 - 0.05, 1.2, 1.6);

  /* small cabinet / table in the west-north corner */
  add(up, B(0.7, 0.7, 0.5), 0x4a3a2c, -W / 2 + 0.55, 0.35, -D / 2 + 0.5);
  add(up, B(0.18, 0.16, 0.12), 0x1a1a1a, -W / 2 + 0.5, 0.78, -D / 2 + 0.5);

  /* red mattress on the floor along the north wall, white clothes piled on it */
  add(up, B(2.8, 0.16, 1.35), 0x8a2424, 0.4, 0.14, -D / 2 + 0.9);
  add(up, B(1.1, 0.22, 0.7), 0xf2efe8, 0.1, 0.32, -D / 2 + 0.85);
  add(up, B(0.7, 0.16, 0.5), 0xe8e4dc, 0.7, 0.3, -D / 2 + 1.15);
  add(up, B(0.5, 0.12, 0.4), 0xd8d4cc, -0.5, 0.28, -D / 2 + 0.7);

  /* messy bedding and clothes all over the floor */
  const clutter = [[-0.8, 0.08, 0.6, 0.7, 0.1, 0.5, 0xc8c0b4], [1.6, 0.07, 0.2, 0.6, 0.08, 0.4, 0x2a2a30],
    [0.2, 0.07, 1.4, 0.5, 0.08, 0.45, 0xe8e6e0], [2.2, 0.08, -0.8, 0.55, 0.1, 0.35, 0x4a3028],
    [-1.6, 0.07, 1.2, 0.45, 0.08, 0.35, 0xd0ccc4], [1.1, 0.09, 2.0, 0.8, 0.1, 0.5, 0x6a2020],
    [-2.0, 0.08, -0.4, 0.5, 0.1, 0.4, 0xf0eee8], [2.6, 0.07, 1.5, 0.4, 0.08, 0.4, 0x1a1a1e]];
  for (const [x, y, z, a, b, c, col] of clutter) add(up, B(a, b, c), col, x, y, z, 0, (x + z) * 0.2, 0);

  /* unmade / kicked bedding heap */
  add(up, B(1.4, 0.2, 1.0), 0x7a2020, 1.5, 0.16, -1.4);
  add(up, B(0.8, 0.14, 0.6), 0xc8c0b0, 1.7, 0.28, -1.2);

  /* music gear: small amp, guitar-ish shape, crate */
  add(up, B(0.45, 0.4, 0.3), 0x1a1a1a, 3.2, 0.22, 0.6);
  add(up, B(0.22, 0.08, 0.22), 0x333, 3.2, 0.46, 0.6);
  add(up, B(0.12, 0.85, 0.08), 0x3a2418, 3.35, 0.7, -0.2, 0, 0, 0.4);
  add(up, B(0.35, 0.45, 0.08), 0x3a2418, 3.4, 0.45, -0.15, 0, 0, 0.4);
  add(up, B(0.5, 0.28, 0.4), 0x5a4a30, 3.1, 0.16, 1.3);

  /* posters already on the north texture; a leaning poster board on the east wall */
  add(up, B(0.04, 0.7, 0.5), 0x1a1a22, W / 2 - 0.08, 1.4, -0.8);

  /* dim warm fill — a low amber panel in the ceiling, plus the strobe in the west-north corner */
  add(up, B(1.2, 0.04, 0.8), 0x6a4a28, 0.8, H2 - 0.06, 0.4);
  const strobe = add(up, B(0.12, 0.08, 0.12), M(0xfff4d0), -W / 2 + 0.35, H2 - 0.1, -D / 2 + 0.35);
  const halo = add(up, B(0.28, 0.04, 0.28), M(0xffe8a0, { transparent: true, opacity: 0.35 }), -W / 2 + 0.35, H2 - 0.14, -D / 2 + 0.35);
  strobe.name = 'b23-strobe';
  info.strobe = strobe; info.halo = halo;

  /* ---------- occupancy / movement ---------- */
  let cur = null, busy = 0, exitAt = 0, dwell = 0, btn = null;
  const ensureBtn = () => {
    if (btn) return btn;
    btn = document.createElement('button');
    btn.id = 'ie-b23-btn'; btn.type = 'button';
    btn.style.cssText = 'position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:40;display:none;padding:10px 16px;font:700 14px/1 system-ui,sans-serif;color:#111;background:#f4f0e6;border:0;border-radius:8px;letter-spacing:.04em';
    document.body.appendChild(btn);
    const go = e => { if (e) { e.preventDefault(); e.stopPropagation(); } if (act) act(); };
    btn.onclick = go; btn.ontouchend = go;
    return btn;
  };
  let act = null;
  const show = (txt, fn) => { const b = ensureBtn(); act = fn; if (b.textContent !== txt) b.textContent = txt; b.style.display = 'block'; };
  const hide = () => { act = null; if (btn) btn.style.display = 'none'; };
  const fadeOn = () => { const f = fx.bm && fx.bm.fade; if (f) { f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); } };

  const ground = (x, z) => {
    if (!cur) return null;
    const lx = x - RX, lz = z - RZ;
    /* stairs: x around xS, z from z0 down to z0-2.4, y from 0 to H1 */
    const sx0 = xS - 0.7, sx1 = xS + 0.7, zTop = z0 - 2.4, zBot = z0 + 0.15;
    if (lx > sx0 && lx < sx1 && lz < zBot && lz > zTop - 0.3) {
      const t = Math.max(0, Math.min(1, (zBot - lz) / (zBot - zTop)));
      return FY + t * H1;
    }
    if (/* upstairs, not in the well */ Math.abs(lx) < W / 2 - 0.2 && Math.abs(lz) < D / 2 - 0.2) {
      const onWell = lx > sx0 - 0.1 && lx < sx1 + 0.1 && lz > zTop - 0.2 && lz < z0 + 0.2;
      if (!onWell && (P.pos.y - FY) > H1 * 0.55) return FY + H1;
    }
    return FY;
  };
  (window.__groundParts = window.__groundParts || []).unshift(ground);

  const clamp = () => {
    let x = P.pos.x, z = P.pos.z;
    x = Math.max(RX - W / 2 + 0.45, Math.min(RX + W / 2 - 0.45, x));
    z = Math.max(RZ - D / 2 + 0.45, Math.min(RZ + D / 2 - 0.45, z));
    P.pos.x = x; P.pos.z = z;
  };

  const owns = d => {
    if (!d) return false;
    const b = d.b;
    if (b && b.special === 'bedroom-23') return true;
    if (b && b.p && fx.inPoly && fx.inPoly(b.p, AT.e, AT.n)) return true;
    const w = warp(AT.e, AT.n);
    return Math.hypot((d.x || 0) - w.x, (d.z || 0) - w.z) < AT.r;
  };

  function enter(d) {
    if (cur || busy) return; busy = 1; hide(); fadeOn(); info.enters++;
    setTimeout(() => {
      g.visible = true; cur = d; info.inside = true; fx.cullT = 0;
      P.pos.set(RX, FY + 1.7, RZ + D / 2 - 1.6); P.yaw = Math.PI; P.pitch = 0; /* face into the house, away from the door */
      busy = 0; dwell = 0; exitAt = performance.now();
    }, 180);
  }
  function leave() {
    if (!cur || busy) return; busy = 1; hide(); fadeOn(); info.exits++;
    const d = cur;
    setTimeout(() => {
      g.visible = false; cur = null; info.inside = false;
      let x = d.x + d.ox * 1.7, z = d.z + d.oz * 1.7;
      const clearOK = (x, z) => { const C = window.__collide; return !C || !C(x, z, 0.8); };
      for (const k of [1.7, 2.4, 3.2, 4.2]) { x = d.x + d.ox * k; z = d.z + d.oz * k; if (clearOK(x, z)) break; }
      const hAt = (x, z) => { try { return fx.earth && fx.earth.heightAt ? Math.max(0, fx.earth.heightAt(x, z)) : 0; } catch (_) { return 0; } };
      P.pos.set(x, 1.7 + hAt(x, z), z); P.yaw = Math.atan2(-d.ox, -d.oz); P.pitch = 0;
      fx.cullT = 0; busy = 0; exitAt = performance.now(); dwell = 0;
    }, 180);
  }

  const FLASH = 1.5; /* Hz, under the 3 Hz photosensitive guideline */
  function update(t) {
    if (!cur) return;
    clamp();
    /* strobe: brief on-pulse at 1.5 Hz, or a steady dim glow if reduced motion */
    if (strobe) {
      const quiet = reduce();
      const mat = strobe.material, hm = halo.material;
      if (quiet) { mat.color.setHex(0xffe8b0); hm.opacity = 0.25; }
      else {
        const phase = (t * FLASH) % 1; /* 0..1 each flash */
        const on = phase < 0.12; /* short duty cycle, not a black/white room flip */
        mat.color.setHex(on ? 0xfff8e8 : 0x6a6048);
        hm.opacity = on ? 0.7 : 0.12;
      }
    }
    const lx = P.pos.x - RX, lz = P.pos.z - RZ;
    const nearDoor = Math.abs(lx) < 1.3 && lz > D / 2 - 1.5 && (P.pos.y - FY) < 2.2;
    const fz = Math.cos(P.yaw); /* door is at +z, leaving is looking toward +z ≈ yaw 0? player yaw: we entered with yaw=PI looking -z. Exit looking +z means yaw ≈ 0, cos(yaw)>0. */
    if (nearDoor && !busy) {
      show('EXIT — tap / Enter / F', leave);
      dwell = (lz > D / 2 - 1.1 && Math.cos(P.yaw) > 0.5) ? dwell + 1 / 60 : 0;
      if (dwell > 0.4 && performance.now() - exitAt > 900) leave();
    } else if (!busy) { hide(); dwell = 0; }
  }

  addEventListener('keydown', e => {
    if (!cur || !btn || btn.style.display !== 'block') return;
    if (e.code === 'KeyF' || e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); leave(); }
  });

  info.ready = true; fx.b23Info = info; window.__b23 = info;
  return { info, owns, enter, leave, update, AT };
}
