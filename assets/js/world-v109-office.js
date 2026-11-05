/* JHIOS world v109 — lean SECRET UNDERGROUND JHIOS OFFICE stub (enterable pocket).
   Gate: IE_V109_OFFICE=false disables. Heavy Mainframe-style board UI is FLAG-GATED
   (IE_V109_OFFICE_BOARDS=true) so phones stay lean — do NOT install Mainframe plugin.
   Layout sketch (stub now; full build next enterable after v109 if Joseph promotes):
   - Hatch near Newtown / Archive plaza (not a real GY cut) → lift down to FY=-220 pocket
   - Corridor of bot office bays (one stub bay labelled per known bot slot)
   - Main board wall (placeholder panels) + MAINFRAME room (dark hub, agent-work boards)
   Reuses v87 enter/exit patterns via fx.enterRoom when available; otherwise self-contained. */
export function initV109Office({ T, S, LITE, warp, fx, P }) {
  const info = { ready: false, rooms: [], inside: null, plan: 'stub-v109' };
  if (window.IE_V109_OFFICE === false) { info.off = true; info.ready = true; return { info, update() {} }; }
  const DET = window.__detail ?? (LITE ? 0 : 1);
  const HEAVY = DET >= 2 && window.IE_V109_OFFICE_BOARDS === true; // phones / L0-L1: geometry only
  const FY = -220;
  const grp = new T.Group(); grp.name = 'v109-office'; S.add(grp);
  const MC = new Map(); const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!MC.has(k)) MC.set(k, new T.MeshBasicMaterial(Object.assign({ color: c, fog: false }, o))); return MC.get(k); };
  const box = (g, c, w, h, d, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); g.add(m); return m; };
  const board = (g, text, w, h, x, y, z, ry, bg, fg) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = Math.max(64, Math.round(512 * h / w)); const k = c.getContext('2d');
    k.fillStyle = bg; k.fillRect(0, 0, c.width, c.height); k.fillStyle = fg; k.font = 'bold 36px monospace'; k.textAlign = 'center'; k.textBaseline = 'middle';
    String(text).split('\n').forEach((l, i, a) => k.fillText(l, c.width / 2, c.height * (i + 0.5) / a.length));
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), side: T.DoubleSide, fog: false }));
    m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m;
  };

  // Off-map pocket SW of CERN cluster
  const OX = -1340, OZ = -4600, W = 36, D = 28, H = 5.5;
  const g = new T.Group(); g.name = 'v109-office-room'; g.position.set(OX, FY, OZ); g.visible = false; grp.add(g);
  box(g, 0x0a1018, W, 0.2, D, 0, -0.1, 0); box(g, 0x0a1018, W, 0.2, D, 0, H + 0.1, 0);
  for (const [sx, sz, ww, dd] of [[0, -D / 2, W, 0.2], [0, D / 2, W, 0.2], [-W / 2, 0, 0.2, D], [W / 2, 0, 0.2, D]]) box(g, 0x121a24, ww, H, dd, sx, H / 2, sz);
  board(g, 'JHIOS // UNDERGROUND OFFICE\nSTUB · v109', 8, 1.2, 0, H - 1.2, -D / 2 + 0.15, 0, '#061018', '#3dff9a');
  board(g, 'MAINFRAME', 4.5, 0.7, 0, 3.2, D / 2 - 0.15, Math.PI, '#05080e', '#7fe9ff');

  // Bot office bays (lean cubes + labels) — expand later with real agent desks
  const BOTS = ['1Bot', 'Grok Bot', 'North', 'Claude', 'Ops'];
  BOTS.forEach((name, i) => {
    const x = -12 + i * 6; box(g, 0x1a2430, 4.2, 2.4, 3.2, x, 1.2, -6);
    board(g, name.toUpperCase() + '\nOFFICE', 3.6, 0.7, x, 2.6, -4.35, 0, '#0a1420', '#9dffe0');
    if (HEAVY) { // flag-gated "mainframe video" board strip — canvas only, no plugin
      board(g, '▸ AGENT RUN\n▸ PR / PREVIEW\n▸ QUEUE', 3.4, 1.8, x, 1.5, -4.4, 0, '#02060c', '#5dffc0');
    }
  });

  // Mainframe hub alcove (north wall)
  box(g, 0x050810, 10, 4.2, 4, 0, 2.1, 8);
  board(g, 'MAINFRAME · EVERYTHING STEMS FROM HERE', 9, 0.55, 0, 4.0, 5.9, Math.PI, '#000', '#7fe9ff');
  if (HEAVY) {
    for (let i = 0; i < 3; i++) board(g, 'BOARD ' + (i + 1) + '\n··· live agents ···', 2.8, 2.2, -4 + i * 4, 2.0, 5.95, Math.PI, '#02040a', '#3dff9a');
  } else {
    board(g, 'Boards: set IE_V109_OFFICE_BOARDS=true on L2', 8, 0.45, 0, 2.2, 5.95, Math.PI, '#0a1018', '#668');
  }

  // Surface hatch near Newtown archive / plaza-ish — reuse Versions hatch neighbourhood if present
  const hatchE = -70, hatchN = -430; // near versions hatch; fictional office access
  const hp = warp(hatchE, hatchN);
  const hatch = new T.Group(); hatch.position.set(hp.x, 0, hp.z); S.add(hatch);
  box(hatch, 0x1a1a1a, 2.4, 0.15, 2.4, 0, 0.08, 0);
  box(hatch, 0x3dff9a, 2.0, 0.04, 2.0, 0, 0.16, 0);
  board(hatch, 'JHIOS\nOFFICE ↓', 2.0, 0.7, 0, 1.4, 0, 0, '#06140c', '#3dff9a');

  let cur = null, busy = 0, exitT = 0;
  const fadeOn = () => { const f = fx.bm && fx.bm.fade; if (f) { f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); } };
  (window.__groundParts = window.__groundParts || []).unshift((x, z) => cur ? FY : null);

  let btn = document.getElementById('v109office');
  if (!btn) { btn = document.createElement('button'); btn.type = 'button'; btn.id = 'v109office'; document.body.appendChild(btn); }
  btn.style.cssText = 'position:fixed;left:50%;bottom:34%;transform:translateX(-50%);z-index:142;display:none;padding:12px 20px;font:bold 15px monospace;background:#07020a;color:#3dff9a;border:2px solid #3dff9a;border-radius:8px;cursor:pointer';
  let act = null; const fire = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } if (act) act(); };
  btn.onclick = fire; btn.ontouchend = fire;
  const show = (txt, fn) => { act = fn; btn.textContent = txt; btn.style.display = 'block'; };

  function enter() {
    if (cur || busy) return; busy = 1; fadeOn(); info.enters = (info.enters || 0) + 1;
    setTimeout(() => { cur = true; info.inside = 'jhios-office'; g.visible = true;
      fx.clear = fx.clear || []; const clr = [OX, OZ, 40]; fx.clear.push(clr); enter._clr = clr;
      P.pos.set(OX, FY + 1.7, OZ + 8); P.yaw = Math.PI; P.pitch = 0.02; fx.cullT = 0; busy = 0; }, 180);
  }
  function exit() {
    if (!cur || busy) return; busy = 1; fadeOn(); info.exits = (info.exits || 0) + 1;
    setTimeout(() => { cur = null; info.inside = null; g.visible = false;
      if (fx.clear && enter._clr) { const i = fx.clear.indexOf(enter._clr); if (i >= 0) fx.clear.splice(i, 1); }
      P.pos.set(hp.x, 1.7, hp.z + 4); P.yaw = 0; P.pitch = 0.05; fx.cullT = 0; busy = 0; exitT = performance.now(); btn.style.display = 'none'; }, 180);
  }
  function clearRoomState() {
    if (!cur) return false; cur = null; info.inside = null; g.visible = false;
    if (fx.clear && enter._clr) { const i = fx.clear.indexOf(enter._clr); if (i >= 0) fx.clear.splice(i, 1); }
    btn.style.display = 'none'; busy = 0; exitT = performance.now(); fx.cullT = 0; return true;
  }
  // Chain into shared clear so map teleport exits this room too
  const prevClear = fx.clearRoomState;
  fx.clearRoomState = () => { const a = clearRoomState(); const b = prevClear ? prevClear() : false; return a || b; };

  info.rooms.push('jhios-office'); info.ready = true; fx.v109oInfo = info;
  console.info('[IE] v109 underground office stub ready', { heavy: HEAVY, hatch: [hatchE, hatchN] });

  function update() {
    if (cur) {
      P.pos.x = Math.max(OX - W / 2 + 0.8, Math.min(OX + W / 2 - 0.8, P.pos.x));
      P.pos.z = Math.max(OZ - D / 2 + 0.8, Math.min(OZ + D / 2 - 0.8, P.pos.z));
      if (P.pos.y < FY + 1) P.pos.y = FY + 1.7;
      const nearExit = Math.hypot(P.pos.x - OX, P.pos.z - (OZ + 10)) < 3.5;
      if (nearExit) show('EXIT OFFICE — tap', exit); else btn.style.display = 'none';
      return;
    }
    if (performance.now() - exitT < 1000) { btn.style.display = 'none'; return; }
    if (fx.v87Info && fx.v87Info.inside) { btn.style.display = 'none'; return; }
    const near = Math.hypot(P.pos.x - hp.x, P.pos.z - hp.z) < 4 && P.pos.y < 8;
    if (near) show('ENTER JHIOS OFFICE ↓ — tap', enter); else btn.style.display = 'none';
  }
  return { info, update, enter, exit, clearRoomState };
}
