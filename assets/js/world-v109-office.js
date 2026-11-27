/* JHIOS world v117 — SECRET UNDERGROUND JHIOS OFFICE (password-gated enterable).
   Neon synthwave trading-city: each bot is a tower with a beam + floating card,
   a central Mainframe dome shows fleet totals (demo values), a timeline strip
   runs around the arena curb. Purple / magenta grid, skyline backdrop, neon-green
   terminal accents. Gate: IE_V109_OFFICE=false disables. Password: window.IE_OFFICE_PASS
   (default below). Lean: MeshBasic + additive beams, instanced skyline, shared
   geometry, no point lights. Phones get the same layout with fewer instances. */
export function initV109Office({ T, S, LITE, warp, fx, P }) {
  const info = { ready: false, rooms: [], inside: null, unlocked: false, plan: 'v117-trading-city' };
  window.__jhiosOffice = info;
  if (window.IE_V109_OFFICE === false) { info.off = true; info.ready = true; return { info, update() {} }; }

  const PASS = String(window.IE_OFFICE_PASS || 'JHIOS-MAINFRAME'); // Joseph can override via window.IE_OFFICE_PASS
  const FY = -220, OX = -1340, OZ = -4600, W = 40, D = 32, H = 24;
  const grp = new T.Group(); grp.name = 'v109-office'; S.add(grp);
  const MC = new Map();
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!MC.has(k)) MC.set(k, new T.MeshBasicMaterial(Object.assign({ color: c, fog: false }, o))); return MC.get(k); };
  const BOX = new T.BoxGeometry(1, 1, 1);
  const CYL = new T.CylinderGeometry(1, 1, 1, 12);
  const SPH = new T.SphereGeometry(1, 16, 12);
  const add = (g, geo, mtl, x, y, z, sx, sy, sz) => {
    const m = new T.Mesh(geo, typeof mtl === 'number' ? mat(mtl) : mtl);
    m.position.set(x, y, z);
    if (sx != null) m.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz);
    g.add(m);
    return m;
  };

  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const k = c.getContext('2d'); draw(k, c, w, h);
    const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; tx.needsUpdate = true;
    return { canvas: c, ctx: k, tex: tx };
  }
  function termBoard(g, lines, w, h, x, y, z, ry, opts = {}) {
    const { canvas: c, ctx: k, tex: tx } = canvasTex(opts.cw || 768, opts.ch || Math.max(128, Math.round((opts.cw || 768) * h / w)), (k, c) => {
      k.fillStyle = opts.bg || '#070614'; k.fillRect(0, 0, c.width, c.height);
      k.strokeStyle = opts.border || '#3dff9a'; k.lineWidth = 4; k.strokeRect(3, 3, c.width - 6, c.height - 6);
      k.fillStyle = 'rgba(61,255,154,0.04)'; for (let yy = 0; yy < c.height; yy += 4) k.fillRect(0, yy, c.width, 1);
    });
    const paint = (rows) => {
      k.fillStyle = opts.bg || '#070614'; k.fillRect(0, 0, c.width, c.height);
      k.strokeStyle = opts.border || '#3dff9a'; k.lineWidth = 4; k.strokeRect(3, 3, c.width - 6, c.height - 6);
      k.fillStyle = 'rgba(61,255,154,0.045)'; for (let yy = 0; yy < c.height; yy += 4) k.fillRect(0, yy, c.width, 1);
      k.textAlign = 'left'; k.textBaseline = 'top';
      const pad = opts.pad || 18; let yy = pad;
      for (const row of rows) {
        const col = row.c || opts.fg || '#3dff9a'; const sz = row.s || opts.s || 28;
        k.fillStyle = col; k.font = `${row.b ? 'bold ' : ''}${sz}px ui-monospace,monospace`;
        k.fillText(String(row.t || row), pad + (row.x || 0), yy); yy += sz + (row.gap || 8);
        if (yy > c.height - pad) break;
      }
      tx.needsUpdate = true;
    };
    paint(lines);
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tx, side: T.DoubleSide, fog: false, transparent: !!opts.transparent, opacity: opts.opacity || 1 }));
    m.position.set(x, y, z); m.rotation.y = ry; g.add(m);
    return { mesh: m, canvas: c, ctx: k, tex: tx, paint, w, h, opts };
  }

  const g = new T.Group(); g.name = 'v109-office-room'; g.position.set(OX, FY, OZ); g.visible = false; grp.add(g);

  /* ---------- shell: dark room, purple/magenta grid floor, high ceiling ---------- */
  add(g, BOX, 0x070614, 0, -0.1, 0, W, 0.2, D);
  add(g, BOX, 0x060410, 0, H + 0.1, 0, W, 0.2, D);
  for (const [sx, sz, ww, dd] of [[0, -D / 2, W, 0.2], [0, D / 2, W, 0.2], [-W / 2, 0, 0.2, D], [W / 2, 0, 0.2, D]]) {
    add(g, BOX, 0x0c0820, sx, H / 2, sz, ww, H, dd);
  }

  const grid = canvasTex(256, 256, (k, c) => {
    k.fillStyle = '#12061c'; k.fillRect(0, 0, 256, 256);
    k.strokeStyle = 'rgba(255, 40, 180, 0.55)'; k.lineWidth = 2;
    k.beginPath(); k.moveTo(0, 0); k.lineTo(256, 0); k.lineTo(256, 256); k.lineTo(0, 256); k.closePath(); k.stroke();
    k.strokeStyle = 'rgba(160, 40, 255, 0.28)'; k.lineWidth = 1;
    for (let i = 64; i < 256; i += 64) { k.beginPath(); k.moveTo(i, 0); k.lineTo(i, 256); k.stroke(); k.beginPath(); k.moveTo(0, i); k.lineTo(256, i); k.stroke(); }
    k.strokeStyle = 'rgba(255, 70, 200, 0.12)'; k.lineWidth = 1;
    for (let i = 16; i < 256; i += 16) { k.beginPath(); k.moveTo(i, 0); k.lineTo(i, 256); k.stroke(); k.beginPath(); k.moveTo(0, i); k.lineTo(256, i); k.stroke(); }
  });
  grid.tex.wrapS = grid.tex.wrapT = T.RepeatWrapping; grid.tex.repeat.set(W / 2, D / 2);
  const floor = new T.Mesh(new T.PlaneGeometry(W - 0.4, D - 0.4), new T.MeshBasicMaterial({ map: grid.tex, fog: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.02; g.add(floor);

  /* concentric arena rings — flat annuli (not filled disks) + a shallow circular platform */
  const ringMat = mat(0xff2bd6, { transparent: true, opacity: 0.85, depthWrite: false, side: T.DoubleSide });
  const ringMat2 = mat(0x9b4dff, { transparent: true, opacity: 0.55, depthWrite: false, side: T.DoubleSide });
  const ringMatG = mat(0x3dff9a, { transparent: true, opacity: 0.45, depthWrite: false, side: T.DoubleSide });
  for (const [inner, outer, mtl, y] of [[11.85, 12.25, ringMat, 0.07], [8.15, 8.5, ringMat2, 0.07], [5.0, 5.3, ringMatG, 0.07], [3.05, 3.3, ringMat, 0.07]]) {
    const ring = new T.Mesh(new T.RingGeometry(inner, outer, 48), mtl);
    ring.rotation.x = -Math.PI / 2; ring.position.y = y; g.add(ring);
  }
  add(g, CYL, 0x140820, 0, 0.03, 0, 12.0, 0.06, 12.0);

  /* ---------- skyline backdrop on the four walls (shared canvas) + instanced masses ---------- */
  const sky = canvasTex(LITE ? 512 : 768, 256, (k, c, w, h) => {
    const grd = k.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#12062a'); grd.addColorStop(0.45, '#1a0838'); grd.addColorStop(1, '#2a0a50');
    k.fillStyle = grd; k.fillRect(0, 0, w, h);
    for (let i = 0, x = 0; x < w; i++) {
      const bw = 10 + ((i * 37) % 22), bh = 50 + ((i * 53) % (h - 70));
      k.fillStyle = i % 3 === 0 ? '#140828' : (i % 3 === 1 ? '#1c0a36' : '#0e061c');
      k.fillRect(x, h - bh, bw - 2, bh);
      k.fillStyle = '#d4f6ff';
      for (let yy = h - bh + 4; yy < h - 6; yy += 7) {
        for (let xx = x + 2; xx < x + bw - 4; xx += 5) {
          if (((xx * 13 + yy * 7 + i) % 5) > 1) k.fillRect(xx, yy, 2, 3);
        }
      }
      x += bw;
    }
    k.fillStyle = 'rgba(255,40,180,0.18)'; k.fillRect(0, h - 3, w, 3);
  });
  const skyMat = new T.MeshBasicMaterial({ map: sky.tex, fog: false, transparent: true, opacity: 0.92 });
  const wallH = 10, wallY = 5.2;
  const walls = [
    [0, wallY, -D / 2 + 0.12, 0, W - 0.6],
    [0, wallY, D / 2 - 0.12, Math.PI, W - 0.6],
    [-W / 2 + 0.12, wallY, 0, Math.PI / 2, D - 0.6],
    [W / 2 - 0.12, wallY, 0, -Math.PI / 2, D - 0.6],
  ];
  for (const [x, y, z, ry, ww] of walls) {
    const p = new T.Mesh(new T.PlaneGeometry(ww, wallH), skyMat);
    p.position.set(x, y, z); p.rotation.y = ry; g.add(p);
  }

  const skyN = LITE ? 20 : 40;
  const skyPal = [mat(0x16082c), mat(0x1e0a3e), mat(0x0e0618)];
  const skyIM = skyPal.map((mtl) => new T.InstancedMesh(BOX, mtl, skyN));
  const dummy = new T.Object3D();
  const counts = [0, 0, 0];
  for (let i = 0; i < skyN; i++) {
    const t = i / skyN;
    const side = i % 4;
    let x, z;
    if (side === 0) { x = -W / 2 + 1.4; z = -D / 2 + 2 + t * (D - 4); }
    else if (side === 1) { x = W / 2 - 1.4; z = -D / 2 + 2 + t * (D - 4); }
    else if (side === 2) { x = -W / 2 + 2 + t * (W - 4); z = D / 2 - 1.4; }
    else { x = -W / 2 + 2 + t * (W - 4); z = -D / 2 + 1.4; }
    /* leave a gap on the south wall for the v114 arcade cabinets at x=±8, z=-13.5 */
    if (side === 3 && Math.abs(x) < 12) continue;
    const ht = 3.5 + ((i * 17) % 11) * 0.55;
    const wid = 1.1 + (i % 3) * 0.45;
    const dep = 1.0 + (i % 2) * 0.4;
    dummy.position.set(x, ht / 2, z);
    dummy.scale.set(wid, ht, dep);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    const bucket = i % 3;
    skyIM[bucket].setMatrixAt(counts[bucket]++, dummy.matrix);
  }
  skyIM.forEach((im, i) => { im.count = counts[i]; im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; g.add(im); });

  /* ---------- bot towers ---------- */
  const BOTS = [
    { name: 'JHIOS YouTube Bot', task: 'Queueing Shorts drafts', status: 'BUSY', color: 0x00f0ff, hex: '#00f0ff', h: 14.0 },
    { name: 'JHIOS Instagram Bot', task: 'Scheduling reel posts', status: 'BUSY', color: 0xff2bd6, hex: '#ff2bd6', h: 12.5 },
    { name: 'JHIOS Facebook Bot', task: 'Page share watch', status: 'IDLE', color: 0x4d7cff, hex: '#4d7cff', h: 9.5 },
    { name: '1Bot', task: 'Hub coordination', status: 'BUSY', color: 0x3dff9a, hex: '#3dff9a', h: 16.0, hub: true },
    { name: 'World UX Critic', task: 'Reviewing visitor HUD', status: 'BUSY', color: 0xffcc4a, hex: '#ffcc4a', h: 11.0 },
    { name: 'World Free Roam', task: 'Standby patrol', status: 'IDLE', color: 0x9b7bff, hex: '#9b7bff', h: 8.0 },
    { name: 'World Music Auditor', task: 'Checking stage audio', status: 'BUSY', color: 0xff6ad5, hex: '#ff6ad5', h: 12.0 },
    { name: 'World Scout North', task: 'North Drive survey', status: 'IDLE', color: 0x7fe9ff, hex: '#7fe9ff', h: 8.5 },
    { name: 'World Scout Seafront', task: 'Marine Parade pass', status: 'BUSY', color: 0xff8a3d, hex: '#ff8a3d', h: 11.5 },
    { name: 'World Systems Scout', task: 'Watching preview deploy', status: 'IDLE', color: 0x66ffaa, hex: '#66ffaa', h: 9.0 },
  ];

  const win = canvasTex(64, 128, (k, c, w, h) => {
    k.fillStyle = '#070614'; k.fillRect(0, 0, w, h);
    for (let y = 3; y < h - 2; y += 6) {
      for (let x = 2; x < w - 2; x += 5) {
        if (((x * 11 + y * 5) % 7) > 1) {
          k.fillStyle = ((x + y) % 11 === 0) ? '#ffe28a' : '#d4f6ff';
          k.fillRect(x, y, 3, 4);
        }
      }
    }
  });
  win.tex.wrapS = win.tex.wrapT = T.RepeatWrapping;

  const beams = [];
  const cards = [];
  const towerR = 9.3;
  /* even ring, but offset so a gap sits on the south apron (spawn / cabinets / ticker) */
  const ang0 = -Math.PI / 2 + Math.PI / 10;
  const winMats = new Map();
  const winMat = (hex) => {
    if (!winMats.has(hex)) winMats.set(hex, new T.MeshBasicMaterial({ map: win.tex, color: hex, fog: false }));
    return winMats.get(hex);
  };

  BOTS.forEach((b, i) => {
    const a = ang0 + i * (Math.PI * 2 / BOTS.length);
    const x = Math.cos(a) * towerR, z = Math.sin(a) * towerR;
    const tg = new T.Group(); tg.position.set(x, 0, z); g.add(tg);
    const w1 = b.hub ? 2.6 : 2.1, d1 = b.hub ? 2.6 : 2.1;
    add(tg, BOX, winMat(b.color), 0, b.h * 0.42, 0, w1, b.h * 0.84, d1);
    /* slight setback crown so the tower reads as a city block, not a single box */
    add(tg, BOX, winMat(b.color), 0, b.h * 0.88, 0, w1 * 0.72, b.h * 0.22, d1 * 0.72);
    add(tg, BOX, b.color, 0, b.h + 0.08, 0, w1 * 0.55, 0.14, d1 * 0.55);
    add(tg, SPH, mat(b.color, { transparent: true, opacity: 0.95, depthWrite: false }), 0, b.h + 0.35, 0, 0.28, 0.28, 0.28);

    const beamH = Math.max(6, H - b.h - 2.2);
    const bMat = new T.MeshBasicMaterial({ color: b.color, transparent: true, opacity: b.status === 'BUSY' ? 0.85 : 0.28, depthWrite: false, blending: T.AdditiveBlending, fog: false });
    const cMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: b.status === 'BUSY' ? 0.7 : 0.2, depthWrite: false, blending: T.AdditiveBlending, fog: false });
    const rad = b.hub ? 0.28 : 0.18;
    const beam = add(tg, CYL, bMat, 0, b.h + 0.4 + beamH / 2, 0, rad, beamH, rad);
    const core = add(tg, CYL, cMat, 0, b.h + 0.4 + beamH / 2, 0, 0.07, beamH, 0.07);
    beams.push({ mat: bMat, core: cMat, mesh: beam, busy: b.status === 'BUSY', ph: i * 0.7, rad });

    const cardW = 2.8, cardH = 1.35;
    const cx = Math.cos(a) * (towerR + 1.85), cz = Math.sin(a) * (towerR + 1.85);
    const card = termBoard(g, [
      { t: b.name, s: 30, b: 1, c: b.hex },
      { t: b.task, s: 22, c: '#d0c8ff', gap: 10 },
      { t: b.status === 'BUSY' ? 'STATUS  ·  BUSY' : 'STATUS  ·  IDLE', s: 24, b: 1, c: b.status === 'BUSY' ? '#3dff9a' : '#8a88aa' },
    ], cardW, cardH, cx, b.h * 0.62 + 1.1, cz, a + Math.PI, { cw: 512, ch: 240, border: b.hex, bg: '#080616', pad: 20 });
    cards.push(card.mesh);
  });

  /* ---------- central Mainframe dome (vault) + floating fleet panel ---------- */
  add(g, CYL, 0x1a1420, 0, 0.55, 0, 3.4, 1.1, 3.4);
  const colMat = mat(0xf0e2b8);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + 0.2;
    add(g, CYL, colMat, Math.cos(a) * 2.55, 1.15, Math.sin(a) * 2.55, 0.16, 2.2, 0.16);
  }
  const domeMat = mat(0xfff1c2, { transparent: true, opacity: 0.92 });
  const dome = add(g, SPH, domeMat, 0, 2.55, 0, 2.35, 2.15, 2.35);
  /* clip the lower hemisphere with a belt so it reads as a dome, not a full sphere */
  add(g, CYL, mat(0xffe08a, { transparent: true, opacity: 0.55, depthWrite: false, blending: T.AdditiveBlending }), 0, 2.4, 0, 2.5, 0.12, 2.5);
  add(g, CYL, mat(0x3dff9a, { transparent: true, opacity: 0.45, depthWrite: false, blending: T.AdditiveBlending }), 0, 0.08, 0, 3.6, 0.08, 3.6);
  const glow = add(g, new T.CircleGeometry(4.2, 24), mat(0xffe08a, { transparent: true, opacity: 0.22, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }), 0, 0.06, 0, 1, 1, 1);
  glow.rotation.x = -Math.PI / 2;

  const FLEET_DEMO = [
    { t: 'THE VAULT  ·  JHIOS MAINFRAME', s: 28, b: 1, c: '#3dff9a' },
    { t: 'FLEET TOTALS   ·   DEMO VALUES', s: 22, b: 1, c: '#ffcc4a', gap: 14 },
    { t: 'Agents online        6  /  10     (demo)', s: 24, c: '#e8e0ff' },
    { t: 'Busy now             6            (demo)', s: 24, c: '#3dff9a' },
    { t: 'Drafts waiting       4            (demo)', s: 24, c: '#e8e0ff' },
    { t: 'Posts approved       6            (demo)', s: 24, c: '#e8e0ff' },
    { t: 'Subscribers        128            (demo)', s: 24, c: '#e8e0ff' },
    { t: 'Queue depth          3            (demo)', s: 24, c: '#e8e0ff', gap: 14 },
  ];
  const hub = termBoard(g, FLEET_DEMO, 5.6, 3.6, 0, 4.6, 3.15, Math.PI, { cw: 768, ch: 520, border: '#3dff9a', bg: '#080616' });

  function paintHub(t) {
    const now = new Date();
    const hh = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/London' });
    hub.paint(FLEET_DEMO.concat([
      { t: `Preview  ·  v2-round2 /world?v=130     live locked`, s: 18, c: '#7fe9ff' },
      { t: `London  ${hh}     values are demo only`, s: 18, c: '#9a98b8' },
    ]));
  }
  paintHub(0);

  /* title plaque — "JHIOS FLEET" in the THETA GANG spot, north wall */
  termBoard(g, [{ t: 'JHIOS FLEET', s: 52, b: 1, c: '#3dff9a' }, { t: 'AUTHORIZED AGENTS ONLY', s: 22, c: '#ffcc4a' }], 7.2, 1.5, 0, 16.5, D / 2 - 0.16, Math.PI, { cw: 720, ch: 180, border: '#3dff9a', bg: '#080616' });

  /* ---------- timeline strip along the arena curb (south arc, visible on enter) ---------- */
  const EVENTS = [
    ['19:20', 'Systems Scout', 'preview watch'],
    ['19:22', 'YouTube Bot', 'queued Shorts draft'],
    ['19:24', 'Music Auditor', 'stage audio check'],
    ['19:26', 'UX Critic', 'HUD notes filed'],
    ['19:28', '1Bot', 'dispatched scout job'],
    ['19:30', 'Instagram Bot', 'reel schedule sync'],
    ['19:31', 'Scout Seafront', 'Marine Parade pass'],
    ['19:32', 'Facebook Bot', 'page share idle'],
  ];
  const ticker = termBoard(g, [], 13.5, 0.62, 0, 0.48, -6.5, Math.PI, { cw: 1400, ch: 96, border: '#ff2bd6', bg: '#0a0614', pad: 10 });
  const paintTicker = () => {
    const k = ticker.ctx, c = ticker.canvas;
    k.fillStyle = '#0a0614'; k.fillRect(0, 0, c.width, c.height);
    k.strokeStyle = '#ff2bd6'; k.lineWidth = 3; k.strokeRect(2, 2, c.width - 4, c.height - 4);
    k.fillStyle = '#3dff9a'; k.font = 'bold 22px ui-monospace,monospace'; k.textBaseline = 'middle'; k.textAlign = 'left';
    k.fillText('TIMELINE  ·  DEMO', 14, c.height / 2);
    k.fillStyle = '#ff2bd6'; k.fillRect(248, 12, 2, c.height - 24);
    const slot = (c.width - 270) / EVENTS.length;
    EVENTS.forEach((e, i) => {
      const x = 262 + i * slot;
      k.fillStyle = '#7fe9ff'; k.font = 'bold 18px ui-monospace,monospace'; k.fillText(e[0], x, 28);
      k.fillStyle = '#e8e0ff'; k.font = '16px ui-monospace,monospace'; k.fillText(e[1], x, 52);
      k.fillStyle = '#9a98b8'; k.font = '15px ui-monospace,monospace'; k.fillText(e[2], x, 74);
    });
    ticker.tex.needsUpdate = true;
  };
  paintTicker();
  /* neon curb under the ticker so the strip reads as part of the floor ring */
  add(g, BOX, mat(0xff2bd6, { transparent: true, opacity: 0.55, depthWrite: false }), 0, 0.12, -6.5, 13.8, 0.04, 0.35);

  /* marked EXIT pad between the south-wall arcade cabinets */
  add(g, BOX, mat(0x3dff9a, { transparent: true, opacity: 0.55, depthWrite: false }), 0, 0.05, -12.4, 2.6, 0.04, 2.2);
  termBoard(g, [{ t: 'EXIT  ↑  HATCH', s: 26, b: 1, c: '#3dff9a' }], 2.2, 0.45, 0, 1.15, -12.4, 0, { cw: 400, ch: 90, border: '#3dff9a', bg: '#080616' });

  /* live-ish tick: clock on the dome panel + pulsing busy beams */
  let lastBoard = 0;
  const _look = new T.Vector3();
  function refreshBoards(t) { paintHub(t); }

  /* ---------- surface hatch (unchanged world spot) ---------- */
  const hatchE = -70, hatchN = -430;
  const hp = warp(hatchE, hatchN);
  const hatch = new T.Group(); hatch.position.set(hp.x, 0, hp.z); S.add(hatch);
  add(hatch, BOX, 0x1a1a1a, 0, 0.08, 0, 2.4, 0.15, 2.4);
  add(hatch, BOX, 0x3dff9a, 0, 0.16, 0, 2.0, 0.04, 2.0);
  termBoard(hatch, [{ t: 'JHIOS OFFICE ↓', s: 28, b: 1 }, { t: 'PASSWORD', s: 18, c: '#ffcc4a' }], 2.2, 0.85, 0, 1.45, 0, 0, { cw: 512, ch: 200 });

  let cur = null, busy = 0, exitT = 0;
  try { info.unlocked = sessionStorage.getItem('ie_office_ok') === '1'; } catch (_) {}

  const fadeOn = () => { const f = fx.bm && fx.bm.fade; if (f) { f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); } };
  (window.__groundParts = window.__groundParts || []).unshift((x, z) => cur ? FY : null);

  /* password modal (DOM — lean, starts hidden) */
  let modal = document.getElementById('v109pass');
  if (!modal) {
    modal = document.createElement('div'); modal.id = 'v109pass'; modal.hidden = true;
    modal.style.cssText = 'position:fixed;inset:0;z-index:200;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.72);font-family:ui-monospace,monospace';
    modal.innerHTML = `<form style="background:#020806;border:2px solid #3dff9a;border-radius:10px;padding:18px 20px;min-width:280px;max-width:92vw;box-shadow:0 0 24px rgba(61,255,154,.25)">
      <div style="color:#3dff9a;font-weight:700;margin-bottom:8px">JHIOS OFFICE // AUTH</div>
      <div style="color:#7fe9ff;font-size:12px;margin-bottom:12px">Authorized agents only. Visitors stay locked out.</div>
      <input name="pw" type="password" autocomplete="off" placeholder="password" style="width:100%;box-sizing:border-box;padding:10px;background:#000;border:1px solid #3dff9a;color:#3dff9a;border-radius:6px;font:15px monospace" />
      <div class="err" style="color:#ff6a6a;font-size:12px;min-height:16px;margin-top:6px"></div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button type="submit" style="flex:1;padding:10px;background:#06140c;color:#3dff9a;border:1px solid #3dff9a;border-radius:6px;font-weight:700;cursor:pointer">ENTER</button>
        <button type="button" data-x style="padding:10px 14px;background:#100808;color:#ccc;border:1px solid #445;border-radius:6px;cursor:pointer">✕</button>
      </div>
    </form>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) hidePass(); });
    modal.querySelector('[data-x]').onclick = () => hidePass();
    modal.querySelector('form').onsubmit = e => {
      e.preventDefault();
      const v = modal.querySelector('[name=pw]').value;
      if (v === PASS) { info.unlocked = true; try { sessionStorage.setItem('ie_office_ok', '1'); } catch (_) {} hidePass(); enter(true); }
      else { modal.querySelector('.err').textContent = 'ACCESS DENIED'; modal.querySelector('[name=pw]').value = ''; }
    };
  }
  function showPass() { modal.hidden = false; modal.style.display = 'flex'; const inp = modal.querySelector('[name=pw]'); inp.value = ''; modal.querySelector('.err').textContent = ''; setTimeout(() => inp.focus(), 50); }
  function hidePass() { modal.hidden = true; modal.style.display = 'none'; }

  let btn = document.getElementById('v109office');
  if (!btn) { btn = document.createElement('button'); btn.type = 'button'; btn.id = 'v109office'; document.body.appendChild(btn); }
  btn.style.cssText = 'position:fixed;left:50%;bottom:34%;transform:translateX(-50%);z-index:142;display:none;padding:12px 20px;font:bold 15px ui-monospace,monospace;background:#07020a;color:#3dff9a;border:2px solid #3dff9a;border-radius:8px;cursor:pointer';
  let act = null; const fire = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } if (act) act(); };
  btn.onclick = fire; btn.ontouchend = fire;
  const show = (txt, fn) => { act = fn; btn.textContent = txt; btn.style.display = 'block'; };

  /* spawn on the south apron, looking north into the arena (yaw=PI → +Z) */
  const spawnX = OX, spawnZ = OZ - 9.6, spawnYaw = Math.PI;
  function enter(authed) {
    if (!authed && !info.unlocked) { showPass(); return; }
    if (cur || busy) return; busy = 1; fadeOn(); info.enters = (info.enters || 0) + 1;
    setTimeout(() => { cur = true; info.inside = 'jhios-office'; g.visible = true;
      fx.clear = fx.clear || []; const clr = [OX, OZ, 45]; fx.clear.push(clr); enter._clr = clr;
      P.pos.set(spawnX, FY + 1.7, spawnZ); P.yaw = spawnYaw; P.pitch = 0.08; fx.cullT = 0; busy = 0; }, 180);
  }
  function exit() {
    if (!cur || busy) return; busy = 1; fadeOn(); info.exits = (info.exits || 0) + 1;
    setTimeout(() => { cur = null; info.inside = null; g.visible = false;
      if (fx.clear && enter._clr) { const i = fx.clear.indexOf(enter._clr); if (i >= 0) fx.clear.splice(i, 1); }
      P.pos.set(hp.x, 1.7, hp.z + 4); P.yaw = 0; P.pitch = 0.05; fx.cullT = 0; busy = 0; exitT = performance.now(); btn.style.display = 'none'; }, 180);
  }
  function clearRoomState() {
    if (!cur) return false; cur = null; info.inside = null; g.visible = false; hidePass();
    if (fx.clear && enter._clr) { const i = fx.clear.indexOf(enter._clr); if (i >= 0) fx.clear.splice(i, 1); }
    btn.style.display = 'none'; busy = 0; exitT = performance.now(); fx.cullT = 0; return true;
  }
  const prevClear = fx.clearRoomState;
  fx.clearRoomState = () => { const a = clearRoomState(); const b = prevClear ? prevClear() : false; return a || b; };

  info.rooms.push('jhios-office'); info.ready = true; fx.v109oInfo = info;
  console.info('[IE] v117 underground office ready (trading-city, password-gated)', { hatch: [hatchE, hatchN] });

  function update(t) {
    if (cur) {
      if (t - lastBoard > 0.5) { lastBoard = t; try { refreshBoards(t); } catch (_) {} }
      for (const b of beams) {
        const pulse = b.busy ? 0.62 + 0.32 * Math.sin(t * 4.4 + b.ph) : 0.22;
        b.mat.opacity = pulse;
        b.core.opacity = b.busy ? 0.55 + 0.35 * Math.sin(t * 4.4 + b.ph) : 0.16;
        const s = b.busy ? 1 + 0.18 * Math.sin(t * 4.4 + b.ph) : 0.72;
        b.mesh.scale.x = b.rad * s; b.mesh.scale.z = b.rad * s;
      }
      _look.set(P.pos.x, 0, P.pos.z);
      for (const c of cards) {
        const wp = c.getWorldPosition(_look);
        c.lookAt(P.pos.x, wp.y, P.pos.z);
      }
      P.pos.x = Math.max(OX - W / 2 + 0.8, Math.min(OX + W / 2 - 0.8, P.pos.x));
      P.pos.z = Math.max(OZ - D / 2 + 0.8, Math.min(OZ + D / 2 - 0.8, P.pos.z));
      if (P.pos.y < FY + 1) P.pos.y = FY + 1.7;
      const nearExit = Math.hypot(P.pos.x - OX, P.pos.z - (OZ - 12.4)) < 3.6;
      if (nearExit) show('EXIT OFFICE — tap', exit); else btn.style.display = 'none';
      return;
    }
    if (performance.now() - exitT < 1000) { btn.style.display = 'none'; return; }
    if (fx.v87Info && fx.v87Info.inside) { btn.style.display = 'none'; return; }
    const near = Math.hypot(P.pos.x - hp.x, P.pos.z - hp.z) < 4.5 && P.pos.y < 8;
    if (near) show(info.unlocked ? 'ENTER JHIOS OFFICE ↓ — tap' : 'JHIOS OFFICE ↓ — PASSWORD', () => enter(false));
    else btn.style.display = 'none';
  }
  return { info, update, enter, exit, clearRoomState };
}
