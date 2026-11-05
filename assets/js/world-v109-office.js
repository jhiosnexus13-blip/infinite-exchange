/* JHIOS world v109/v110 — SECRET UNDERGROUND JHIOS OFFICE (password-gated enterable).
   Gate: IE_V109_OFFICE=false disables. Password: window.IE_OFFICE_PASS (default below).
   Most visitors locked out. Boards are lean canvas planes (neon green terminal aesthetic) —
   no Mainframe plugin. Phones: same geometry + boards; no heavy textures. */
export function initV109Office({ T, S, LITE, warp, fx, P }) {
  const info = { ready: false, rooms: [], inside: null, unlocked: false, plan: 'v110-walkable' };
  if (window.IE_V109_OFFICE === false) { info.off = true; info.ready = true; return { info, update() {} }; }

  const PASS = String(window.IE_OFFICE_PASS || 'JHIOS-MAINFRAME'); // Joseph can override via window.IE_OFFICE_PASS
  const FY = -220, OX = -1340, OZ = -4600, W = 40, D = 32, H = 6;
  const grp = new T.Group(); grp.name = 'v109-office'; S.add(grp);
  const MC = new Map();
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!MC.has(k)) MC.set(k, new T.MeshBasicMaterial(Object.assign({ color: c, fog: false }, o))); return MC.get(k); };
  const box = (g, c, w, h, d, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); g.add(m); return m; };

  function termBoard(g, lines, w, h, x, y, z, ry, opts = {}) {
    const c = document.createElement('canvas'); c.width = opts.cw || 768; c.height = opts.ch || Math.max(128, Math.round(c.width * h / w));
    const k = c.getContext('2d');
    k.fillStyle = opts.bg || '#020806'; k.fillRect(0, 0, c.width, c.height);
    k.strokeStyle = opts.border || '#3dff9a'; k.lineWidth = 4; k.strokeRect(3, 3, c.width - 6, c.height - 6);
    // scanlines
    k.fillStyle = 'rgba(61,255,154,0.04)'; for (let yy = 0; yy < c.height; yy += 4) k.fillRect(0, yy, c.width, 1);
    k.textAlign = 'left'; k.textBaseline = 'top';
    const pad = 18; let yy = pad;
    for (const row of lines) {
      const col = row.c || opts.fg || '#3dff9a'; const sz = row.s || opts.s || 28;
      k.fillStyle = col; k.font = `${row.b ? 'bold ' : ''}${sz}px ui-monospace,monospace`;
      const t = String(row.t || row); k.fillText(t, pad, yy); yy += sz + (row.gap || 8);
      if (yy > c.height - pad) break;
    }
    const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tx, side: T.DoubleSide, fog: false }));
    m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return { mesh: m, canvas: c, ctx: k, tex: tx, lines, w, h, opts };
  }

  const g = new T.Group(); g.name = 'v109-office-room'; g.position.set(OX, FY, OZ); g.visible = false; grp.add(g);
  // shell
  box(g, 0x050a08, W, 0.2, D, 0, -0.1, 0); box(g, 0x050a08, W, 0.2, D, 0, H + 0.1, 0);
  for (const [sx, sz, ww, dd] of [[0, -D / 2, W, 0.2], [0, D / 2, W, 0.2], [-W / 2, 0, 0.2, D], [W / 2, 0, 0.2, D]]) box(g, 0x0a1410, ww, H, dd, sx, H / 2, sz);
  // floor grid glow strip toward hub
  box(g, 0x0e2a1c, 2.2, 0.04, D - 2, 0, 0.02, 0);

  // --- CENTRAL MAINFRAME HUB (north) ---
  box(g, 0x020604, 14, 5.2, 5, 0, 2.6, 10);
  const hub = termBoard(g, [
    { t: '╔═ JHIOS MAINFRAME ═══════════════════╗', s: 26, b: 1 },
    { t: '║  EVERYTHING STEMS FROM HERE         ║', s: 24 },
    { t: '║                                     ║', s: 22 },
    { t: '║  STATUS   · ONLINE                  ║', s: 24, c: '#7fe9ff' },
    { t: '║  FLEET    · 5 agents linked         ║', s: 24 },
    { t: '║  PREVIEW  · v2-round2 /world?v=110  ║', s: 22 },
    { t: '║  LIVE     · main locked (no promote)║', s: 22, c: '#ffcc4a' },
    { t: '╚═════════════════════════════════════╝', s: 26, b: 1 },
  ], 12, 4.4, 0, 2.8, 7.35, Math.PI, { cw: 900, ch: 520 });

  // --- FLEET WALL (west) ---
  const BOTS = [
    ['1Bot', 'coord', 'idle'],
    ['Grok Bot', 'world', 'ACTIVE'],
    ['North', 'geo', 'standby'],
    ['Claude', 'code', 'standby'],
    ['Ops', 'deploy', 'watch'],
  ];
  const fleetLines = [
    { t: '▸ FLEET WALL', s: 32, b: 1, c: '#3dff9a' },
    { t: 'agent          role       state', s: 22, c: '#7fe9ff' },
    { t: '────────────────────────────────', s: 20, c: '#1a4a32' },
  ];
  BOTS.forEach(([n, role, st], i) => {
    const on = st === 'ACTIVE';
    fleetLines.push({ t: `${n.padEnd(12)} ${role.padEnd(10)} ${st}`, s: 24, c: on ? '#3dff9a' : '#6a9a80', b: on ? 1 : 0 });
    // bay desk
    const x = -14 + i * 7; box(g, 0x101a14, 5.2, 2.2, 3.4, x, 1.1, -8);
    termBoard(g, [
      { t: n.toUpperCase(), s: 28, b: 1 },
      { t: 'OFFICE BAY', s: 18, c: '#7fe9ff' },
      { t: st, s: 22, c: on ? '#3dff9a' : '#668' },
    ], 4.6, 1.6, x, 2.5, -6.2, 0, { cw: 512, ch: 200 });
  });
  termBoard(g, fleetLines, 10, 5.0, -W / 2 + 0.12, 3.0, 2, Math.PI / 2, { cw: 700, ch: 560 });

  // --- WORKFLOW STEPS (east) ---
  termBoard(g, [
    { t: '▸ WORKFLOW', s: 32, b: 1 },
    { t: '1  ENTER  · hatch + password', s: 24 },
    { t: '2  FIX    · teleport / speed / audio', s: 24, c: '#3dff9a' },
    { t: '3  SHIP   · ?v= bump · preview only', s: 24 },
    { t: '4  QA     · Joseph walk + promote?', s: 24, c: '#ffcc4a' },
    { t: '5  LIVE   · main — wait for yes', s: 24, c: '#ff6a6a' },
    { t: '', s: 12 },
    { t: 'queue · COMPLETE-NOW · no Soundtracks', s: 18, c: '#7fe9ff' },
  ], 10, 5.0, W / 2 - 0.12, 3.0, 2, -Math.PI / 2, { cw: 700, ch: 560 });

  // --- NEON TERMINAL strip (south, facing hub) ---
  const term = termBoard(g, [
    { t: 'jhios@mainframe:~$ fleet status', s: 22, c: '#7fe9ff' },
    { t: 'ok · 5 linked · preview deploy pending', s: 22 },
    { t: 'jhios@mainframe:~$ world --check', s: 22, c: '#7fe9ff' },
    { t: 'teleport exit · indoor speed · audio hold  ✓', s: 20, c: '#3dff9a' },
    { t: 'jhios@mainframe:~$ _', s: 22, c: '#3dff9a', b: 1 },
  ], 14, 2.4, 0, 2.0, -D / 2 + 0.15, 0, { cw: 900, ch: 280 });

  // title plaque
  termBoard(g, [{ t: 'JHIOS // UNDERGROUND OFFICE', s: 36, b: 1 }, { t: 'AUTHORIZED AGENTS ONLY', s: 22, c: '#ffcc4a' }], 10, 1.3, 0, H - 1.0, -D / 2 + 0.14, 0, { cw: 800, ch: 180 });

  // live-ish tick: blink cursor + refresh timestamps on hub/terminal
  let blink = 0;
  function refreshBoards(t) {
    blink = Math.floor(t * 2) % 2;
    const now = new Date();
    const hh = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/London' });
    // rewrite terminal last line cursor
    const k = term.ctx, c = term.canvas;
    k.fillStyle = '#020806'; k.fillRect(0, 0, c.width, c.height);
    k.strokeStyle = '#3dff9a'; k.lineWidth = 4; k.strokeRect(3, 3, c.width - 6, c.height - 6);
    k.fillStyle = 'rgba(61,255,154,0.04)'; for (let yy = 0; yy < c.height; yy += 4) k.fillRect(0, yy, c.width, 1);
    const rows = [
      ['jhios@mainframe:~$ fleet status', '#7fe9ff'],
      [`ok · 5 linked · London ${hh}`, '#3dff9a'],
      ['jhios@mainframe:~$ world --check', '#7fe9ff'],
      ['teleport exit · indoor speed · audio hold  ✓', '#3dff9a'],
      [`jhios@mainframe:~$ ${blink ? '█' : ' '}`, '#3dff9a'],
    ];
    let yy = 18; k.textAlign = 'left'; k.textBaseline = 'top';
    for (const [txt, col] of rows) { k.fillStyle = col; k.font = 'bold 26px ui-monospace,monospace'; k.fillText(txt, 18, yy); yy += 44; }
    term.tex.needsUpdate = true;
  }

  // Surface hatch
  const hatchE = -70, hatchN = -430;
  const hp = warp(hatchE, hatchN);
  const hatch = new T.Group(); hatch.position.set(hp.x, 0, hp.z); S.add(hatch);
  box(hatch, 0x1a1a1a, 2.4, 0.15, 2.4, 0, 0.08, 0);
  box(hatch, 0x3dff9a, 2.0, 0.04, 2.0, 0, 0.16, 0);
  termBoard(hatch, [{ t: 'JHIOS OFFICE ↓', s: 28, b: 1 }, { t: 'PASSWORD', s: 18, c: '#ffcc4a' }], 2.2, 0.85, 0, 1.45, 0, 0, { cw: 512, ch: 200 });

  let cur = null, busy = 0, exitT = 0;
  try { info.unlocked = sessionStorage.getItem('ie_office_ok') === '1'; } catch (_) {}

  const fadeOn = () => { const f = fx.bm && fx.bm.fade; if (f) { f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); } };
  (window.__groundParts = window.__groundParts || []).unshift((x, z) => cur ? FY : null);

  // password modal (DOM — lean)
  let modal = document.getElementById('v109pass');
  if (!modal) {
    modal = document.createElement('div'); modal.id = 'v109pass'; modal.hidden = true;
    modal.style.cssText = 'position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.72);font-family:ui-monospace,monospace';
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

  function enter(authed) {
    if (!authed && !info.unlocked) { showPass(); return; }
    if (cur || busy) return; busy = 1; fadeOn(); info.enters = (info.enters || 0) + 1;
    setTimeout(() => { cur = true; info.inside = 'jhios-office'; g.visible = true;
      fx.clear = fx.clear || []; const clr = [OX, OZ, 45]; fx.clear.push(clr); enter._clr = clr;
      P.pos.set(OX, FY + 1.7, OZ + 6); P.yaw = Math.PI; P.pitch = 0.02; fx.cullT = 0; busy = 0; }, 180);
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
  console.info('[IE] v110 underground office ready (password-gated)', { hatch: [hatchE, hatchN] });

  let lastBoard = 0;
  function update(t) {
    if (cur && t - lastBoard > 0.5) { lastBoard = t; try { refreshBoards(t); } catch (_) {} }
    if (cur) {
      P.pos.x = Math.max(OX - W / 2 + 0.8, Math.min(OX + W / 2 - 0.8, P.pos.x));
      P.pos.z = Math.max(OZ - D / 2 + 0.8, Math.min(OZ + D / 2 - 0.8, P.pos.z));
      if (P.pos.y < FY + 1) P.pos.y = FY + 1.7;
      const nearExit = Math.hypot(P.pos.x - OX, P.pos.z - (OZ + 11)) < 3.8;
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
