/* v114: JHIOS arcade — several distinct mini-games as 3D cabinets (not fake facades),
   placed at real arcades / seafront named fronts, the plaza, and enterable rooms (Viper, Dance, CERN, office).
   Flag: IE_V114_ARCADE=false restores the old single v66 cabinet only.
   Scores stay in this browser (localStorage jhios.arc.*). Preview only. */
export function initV114Arcade(o) {
  const { T, S, LBL, LITE, warp, fx, P, CL } = o;
  const info = { cabs: 0, games: ['signal', 'runner', 'pulse', 'memory', 'orbit'] };
  if (window.IE_V114_ARCADE === false) { info.off = true; return { info, update() {} }; }

  const LS = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return 0; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const near = (x, z, cx, cz, r) => (x - cx) ** 2 + (z - cz) ** 2 < r * r;
  const GAMES = {
    signal: { title: 'SIGNAL CATCH', sub: 'Wait for green, then tap', col: 0x00ff9d, fg: '#00ff9d', bg: '#06140c' },
    runner: { title: 'NEON RUNNER', sub: 'Tap to jump the blocks', col: 0xb48cff, fg: '#e6d4ff', bg: '#120818' },
    pulse:  { title: 'PULSE MATCH', sub: 'Tap when the needle is in the band', col: 0xffcc33, fg: '#ffe27a', bg: '#1a1404' },
    memory: { title: 'MEMORY GRID', sub: 'Repeat the sequence', col: 0xff3b5c, fg: '#ffd0d8', bg: '#1a060a' },
    orbit:  { title: 'ORBIT DEFLECT', sub: 'Slide to bounce the spark', col: 0x33c0ff, fg: '#c8f0ff', bg: '#041018' }
  };

  /* ---------- distinct cabinet meshes (each game has its own silhouette) ---------- */
  function cabinet(kind, x, y, z, ry) {
    const g = new T.Group(); g.name = 'v114-cab-' + kind; g.position.set(x, y, z); g.rotation.y = ry || 0;
    const meta = GAMES[kind], C = meta.col;
    const body = (w, h, d, px, py, pz, c) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshBasicMaterial({ color: c, fog: false })); m.position.set(px, py, pz); g.add(m); return m; };
    if (kind === 'signal') { /* tall upright, pointed header */
      body(0.95, 1.55, 0.85, 0, 0.82, 0, 0x102018);
      body(1.05, 0.28, 0.95, 0, 1.7, 0.02, C);
      const cap = new T.Mesh(new T.ConeGeometry(0.42, 0.38, 5), new T.MeshBasicMaterial({ color: C, fog: false })); cap.position.set(0, 2.05, 0); g.add(cap);
      body(0.7, 0.55, 0.08, 0, 0.42, 0.44, 0x0a0a0c); /* control shelf */
    } else if (kind === 'runner') { /* wide sit-down / cocktail */
      body(1.55, 0.7, 1.15, 0, 0.45, 0, 0x1a1028);
      body(1.4, 0.08, 1.0, 0, 0.84, 0, C);
      body(0.5, 0.95, 0.5, 0, 1.35, -0.35, 0x12081c);
      const back = new T.Mesh(new T.BoxGeometry(1.2, 0.7, 0.12), new T.MeshBasicMaterial({ color: 0x0a0610, fog: false })); back.position.set(0, 1.55, -0.12); g.add(back);
    } else if (kind === 'pulse') { /* candy cab, rounded top */
      body(1.05, 1.35, 0.9, 0, 0.75, 0, 0x2a2208);
      const cyl = new T.Mesh(new T.CylinderGeometry(0.55, 0.55, 0.7, 12), new T.MeshBasicMaterial({ color: C, fog: false })); cyl.rotation.z = Math.PI / 2; cyl.position.set(0, 1.62, 0.05); g.add(cyl);
      body(0.85, 0.22, 0.55, 0, 0.38, 0.35, 0x1a1404);
    } else if (kind === 'memory') { /* red, grid face, chunky pedestal */
      body(1.15, 0.35, 1.15, 0, 0.2, 0, 0x2a0a10);
      body(0.95, 1.45, 0.8, 0, 1.05, 0, 0x220810);
      body(1.05, 0.22, 0.9, 0, 1.82, 0, C);
      /* 3x3 grid of tiles on the face */
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) body(0.18, 0.18, 0.05, (c - 1) * 0.24, 1.15 + (1 - r) * 0.24, 0.43, 0x4a1520);
    } else { /* orbit: low blue cockpit */
      body(1.25, 0.55, 1.2, 0, 0.38, 0, 0x081018);
      const bowl = new T.Mesh(new T.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), new T.MeshBasicMaterial({ color: C, fog: false, transparent: true, opacity: 0.45 })); bowl.position.set(0, 0.7, 0.05); g.add(bowl);
      body(0.7, 0.85, 0.55, 0, 1.15, -0.25, 0x0a1822);
      body(1.05, 0.12, 0.7, 0, 1.62, -0.1, C);
    }
    /* shared screen */
    const scr = new T.Mesh(new T.PlaneGeometry(kind === 'runner' ? 0.95 : 0.72, kind === 'runner' ? 0.55 : 0.48), new T.MeshBasicMaterial({ color: C, fog: false }));
    const sy = kind === 'runner' ? 1.55 : kind === 'orbit' ? 1.22 : kind === 'pulse' ? 1.15 : kind === 'memory' ? 1.15 : 1.22;
    const sz = kind === 'runner' ? -0.05 : kind === 'orbit' ? -0.0 : 0.48;
    if (kind === 'runner') { scr.position.set(0, sy, sz); scr.rotation.x = -0.35; }
    else if (kind === 'orbit') { scr.position.set(0, 1.28, -0.0); }
    else scr.position.set(0, sy, 0.47);
    g.add(scr); g.userData.scr = scr; g.userData.kind = kind;
    /* hit box */
    const hit = new T.Mesh(new T.BoxGeometry(1.4, 2.2, 1.4), new T.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 1.1, 0); hit.userData.v114game = kind; hit.userData.action = () => openGame(kind);
    g.add(hit);
    if (CL) CL.push(hit);
    try { const l = LBL && LBL('JHIOS · ' + meta.title, meta.fg, 0.7); if (l) { l.position.set(0, 2.45, 0); g.add(l); } } catch {}
    return g;
  }

  /* ---------- place cabinets: outdoor via warp(e,n); rooms parented so they follow visibility ---------- */
  const outdoor = [
    /* Pleasure Beach arcade strip — a ROW of three distinct cabs (replaces the single v66 marker) */
    ['signal', -54, -995, 0.4],
    ['runner', -51, -995, 0.4],
    ['pulse',  -48, -995, 0.4],
    /* named Marine Parade fronts: cabinets on the apron just west of the real fascia, not fake fronts */
    ['memory', 7.4, 296, Math.PI / 2],   /* Leisureland */
    ['orbit',  7.4, 321, Math.PI / 2],   /* Gold Rush */
    ['pulse',  7.4, 335, Math.PI / 2],   /* Magic City */
    ['signal', 7.4, 350, Math.PI / 2],   /* Cash Casino */
    ['runner', 55,  485, 0],             /* Joyland yard (inside the real park, not a facade) */
    /* plaza — edge, clear of holograms (plaza centre e 140 n 300) */
    ['memory', 126, 286, 0.6],
    ['orbit',  154, 278, -0.4],
    /* Market Gates / bus side apron, clear of the Troll Cart front */
    ['pulse',  -492, 418, Math.PI]
  ];
  const cabs = [];
  for (const [kind, e, n, ry] of outdoor) {
    const w = warp(e, n);
    const cab = cabinet(kind, w.x, 0, w.z, ry);
    S.add(cab); cabs.push(cab); info.cabs++;
  }

  function attach(name, list, tries = 0) {
    const parent = S.getObjectByName(name);
    if (!parent) { if (tries < 40) setTimeout(() => attach(name, list, tries + 1), 400); return; }
    for (const [kind, lx, lz, ry] of list) {
      const cab = cabinet(kind, lx, 0, lz, ry);
      parent.add(cab); cabs.push(cab); info.cabs++;
    }
  }
  /* rooms: local metres on the floor of the off-map interior (group origin = room centre, y = floor) */
  attach('v87-viper', [ /* west wall, clear of the DJ aisle */
    ['signal', -9.6,  2.2,  Math.PI / 2],
    ['orbit',  -9.6, -2.4,  Math.PI / 2]
  ]);
  attach('v87-dance', [ /* east edge, clear of the fire ring */
    ['pulse',  16.5, 12, -Math.PI / 2],
    ['runner', 16.5, -8, -Math.PI / 2]
  ]);
  attach('v87-cern', [
    ['memory', 16, 14, -Math.PI / 2]
  ]);
  attach('v109-office-room', [ /* south wall of the office, visitors only after unlock */
    ['signal',  8, -13.5, Math.PI],
    ['memory', -8, -13.5, Math.PI]
  ]);

  /* ---------- shared game panel (sits in the upper/centre band, clear of joystick gutters) ---------- */
  const css = document.createElement('style');
  css.textContent = `#v114p{position:fixed;z-index:80;left:50%;top:42%;transform:translate(-50%,-50%);width:min(440px,92vw);max-height:calc(100dvh - 280px - env(safe-area-inset-bottom));overflow:auto;background:#050c09f5;border:1px solid #1d6b4b;border-radius:12px;padding:14px 14px 16px;color:#cfe;font:13px/1.45 ui-monospace,monospace;display:none;box-shadow:0 0 24px rgba(0,255,157,.2)}
    #v114p h3{margin:0 0 4px;font-size:14px;letter-spacing:.08em} #v114p .x{float:right;cursor:pointer;color:#8aa;font-size:18px;width:36px;height:36px;border:0;background:transparent}
    #v114p .m{color:#8aa;font-size:11px} #v114p canvas{width:100%;height:auto;background:#000;border:1px solid #1d6b4b;border-radius:6px;touch-action:none;display:block}
    #v114act{position:fixed;z-index:55;left:50%;bottom:calc(var(--player-h,64px) + 168px + env(safe-area-inset-bottom));transform:translateX(-50%);display:none;padding:8px 14px;border-radius:10px;border:1px solid #00ff9d;background:#06110cdd;color:#00ff9d;font:600 12px/1.3 ui-monospace,monospace;cursor:pointer;max-width:72vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`;
  document.head.appendChild(css);
  const panel = document.createElement('div'); panel.id = 'v114p'; panel.setAttribute('role', 'dialog'); document.body.appendChild(panel);
  const act = document.createElement('button'); act.type = 'button'; act.id = 'v114act'; document.body.appendChild(act);
  let gameStop = null, openKind = null;
  const close = () => { panel.style.display = 'none'; openKind = null; if (gameStop) gameStop(), gameStop = null; };
  panel.addEventListener('click', e => { if (e.target.classList.contains('x')) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && openKind) close(); });

  function openGame(kind) {
    const meta = GAMES[kind]; if (!meta) return;
    if (gameStop) gameStop(), gameStop = null;
    openKind = kind;
    panel.innerHTML = `<button type="button" class="x" title="close" aria-label="Close">✕</button><h3 style="color:${meta.fg}">JHIOS · ${meta.title}</h3><p class="m">${meta.sub}. Best score stays in this browser.</p><canvas width="400" height="220"></canvas><div class="m" id="v114sc"></div>`;
    panel.style.display = 'block'; panel.style.borderColor = meta.fg;
    const c = panel.querySelector('canvas'), x = c.getContext('2d'), sc = panel.querySelector('#v114sc');
    const key = 'jhios.arc.' + kind; let best = +LS.get(key) || 0;
    const save = s => { if (s > (+LS.get(key) || 0)) { LS.set(key, s); best = s; } };
    let raf, alive = true, tap = false, px = 0.5, extraStop = null;
    const hit = ev => { ev.preventDefault(); tap = true; const r = c.getBoundingClientRect(); if (ev.clientX != null) px = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)); };
    const move = ev => { const r = c.getBoundingClientRect(); if (ev.clientX != null) px = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)); };
    c.addEventListener('pointerdown', hit); c.addEventListener('pointermove', move);
    const keyH = ev => { if (!openKind) return; if (ev.code === 'Space' || ev.code === 'Enter') { ev.preventDefault(); ev.stopPropagation(); tap = true; } if (ev.code === 'ArrowLeft') px = Math.max(0, px - 0.08); if (ev.code === 'ArrowRight') px = Math.min(1, px + 0.08); };
    addEventListener('keydown', keyH, true);
    gameStop = () => { alive = false; cancelAnimationFrame(raf); c.removeEventListener('pointerdown', hit); c.removeEventListener('pointermove', move); removeEventListener('keydown', keyH, true); if (extraStop) extraStop(); extraStop = null; };
    const bg = meta.bg, fg = meta.fg;
    if (kind === 'signal') playSignal(x, sc, { alive: () => alive, tap: () => (tap ? (tap = false, true) : false), save, best: () => best, setBest: v => best = v, raf: f => (raf = requestAnimationFrame(f)), bg, fg });
    else if (kind === 'runner') playRunner(x, sc, { alive: () => alive, tap: () => (tap ? (tap = false, true) : false), save, best: () => best, raf: f => (raf = requestAnimationFrame(f)), bg, fg });
    else if (kind === 'pulse') playPulse(x, sc, { alive: () => alive, tap: () => (tap ? (tap = false, true) : false), save, best: () => best, raf: f => (raf = requestAnimationFrame(f)), bg, fg });
    else if (kind === 'memory') playMemory(x, sc, { alive: () => alive, tap: () => (tap ? (tap = false, true) : false), px: () => px, save, best: () => best, raf: f => (raf = requestAnimationFrame(f)), bg, fg, canvas: c, onStop: fn => { extraStop = fn; } });
    else playOrbit(x, sc, { alive: () => alive, tap: () => (tap ? (tap = false, true) : false), px: () => px, save, best: () => best, raf: f => (raf = requestAnimationFrame(f)), bg, fg });
  }

  function playSignal(x, sc, A) {
    let phase = 'wait', go = performance.now() + 1000 + Math.random() * 2500, t0 = 0, msg = 'Wait for GREEN, then tap.', rounds = [];
    const loop = now => { if (!A.alive()) return;
      if (phase === 'wait' && now > go) { phase = 'go'; t0 = now; }
      if (A.tap()) {
        if (phase === 'wait') { msg = 'Too early. Signal lost.'; go = now + 1200 + Math.random() * 2500; }
        else if (phase === 'go') { const ms = Math.round(now - t0); rounds.push(ms); msg = ms + ' ms'; phase = rounds.length >= 5 ? 'done' : 'wait'; go = now + 900 + Math.random() * 2500; if (phase === 'done') { const avg = Math.round(rounds.reduce((a, b) => a + b) / 5); const tb = Math.max(0, 1000 - avg); A.save(tb); msg = 'Average ' + avg + ' ms, score ' + tb + '. Tap to retry.'; } }
        else { rounds = []; phase = 'wait'; go = now + 1000 + Math.random() * 2500; msg = 'Wait for GREEN, then tap.'; }
      }
      x.fillStyle = phase === 'go' ? '#00ff9d' : A.bg; x.fillRect(0, 0, 400, 220);
      x.fillStyle = phase === 'go' ? '#000' : A.fg; x.font = '18px monospace'; x.textAlign = 'center'; x.fillText(phase === 'go' ? 'NOW' : msg, 200, 110);
      x.font = '12px monospace'; x.fillText('round ' + Math.min(rounds.length + 1, 5) + '/5', 200, 200);
      sc.textContent = 'best ' + A.best(); A.raf(loop);
    }; A.raf(loop);
  }
  function playRunner(x, sc, A) {
    let y = 0, vy = 0, obs = [], sp = 4, score = 0, dead = false, last = performance.now(), spawn = 0;
    const loop = now => { if (!A.alive()) return; const d = Math.min(3, (now - last) / 16.7); last = now;
      if (A.tap()) { if (dead) { obs = []; score = 0; sp = 4; dead = false; y = 0; vy = 0; } else if (y <= 0) vy = 9.5; }
      if (!dead) { vy -= 0.55 * d; y = Math.max(0, y + vy * d); if (y === 0) vy = 0; spawn -= d; if (spawn <= 0) { obs.push({ x: 410, h: 18 + Math.random() * 26 }); spawn = 40 + Math.random() * 50; } sp += 0.002 * d; score += d * 0.2;
        for (const o of obs) { o.x -= sp * d; if (o.x < 70 && o.x > 30 && y < o.h) { dead = true; A.save(Math.floor(score)); } } obs = obs.filter(o => o.x > -20); }
      x.fillStyle = A.bg; x.fillRect(0, 0, 400, 220); x.strokeStyle = '#5a3a8a'; x.beginPath(); x.moveTo(0, 190); x.lineTo(400, 190); x.stroke();
      x.fillStyle = '#b48cff'; x.fillRect(40, 170 - y, 20, 20); x.fillStyle = '#ff7ad9'; for (const o of obs) x.fillRect(o.x, 190 - o.h, 14, o.h);
      x.fillStyle = A.fg; x.font = '13px monospace'; x.textAlign = 'left'; x.fillText('score ' + Math.floor(score), 10, 20); if (dead) { x.textAlign = 'center'; x.fillText('CRASHED. Tap to run again.', 200, 100); }
      sc.textContent = 'best ' + A.best(); A.raf(loop);
    }; A.raf(loop);
  }
  function playPulse(x, sc, A) {
    let t0 = performance.now(), round = 0, hits = 0, score = 0, freeze = 0, msg = 'Tap when the needle is in the gold band.', done = false, lastHit = 0;
    const loop = now => { if (!A.alive()) return;
      const t = (now - t0) / 1000, spd = 1.15 + round * 0.12, pos = (Math.sin(t * spd * Math.PI * 2) + 1) / 2;
      const lo = 0.42, hi = 0.58;
      if (A.tap()) {
        if (done) { round = 0; hits = 0; score = 0; done = false; t0 = now; msg = 'Tap when the needle is in the gold band.'; }
        else if (now - lastHit > 250) { lastHit = now; const ok = pos >= lo && pos <= hi; if (ok) { hits++; score += Math.round(100 - Math.abs(pos - 0.5) * 400); msg = 'LOCKED. ' + hits + '/10'; } else { msg = 'MISS.'; } round++; if (round >= 10) { done = true; A.save(score); msg = 'Score ' + score + '. Tap to retry.'; } }
      }
      x.fillStyle = A.bg; x.fillRect(0, 0, 400, 220);
      x.fillStyle = '#3a3010'; x.fillRect(30, 90, 340, 36);
      x.fillStyle = '#ffe27a'; x.fillRect(30 + lo * 340, 90, (hi - lo) * 340, 36);
      x.fillStyle = '#fff'; x.fillRect(30 + pos * 340 - 3, 78, 6, 60);
      x.fillStyle = A.fg; x.font = '15px monospace'; x.textAlign = 'center'; x.fillText(msg, 200, 50);
      x.font = '12px monospace'; x.fillText('round ' + Math.min(round + 1, 10) + '/10  score ' + score, 200, 200);
      sc.textContent = 'best ' + A.best(); A.raf(loop);
    }; A.raf(loop);
  }
  function playMemory(x, sc, A) {
    const N = 3; let seq = [], step = 0, mode = 'show', showI = -1, showT = 0, lives = 3, score = 0, msg = 'Watch, then tap the tiles in order.', flash = -1, flashC = 0, dead = false;
    const cell = (px, py) => { const gx = Math.floor((px - 70) / 90), gy = Math.floor((py - 30) / 90); return (gx >= 0 && gx < 3 && gy >= 0 && gy < 3) ? gy * 3 + gx : -1; };
    const onMem = ev => {
      if (!A.alive() || (mode !== 'input' && mode !== 'dead') || (mode === 'dead')) return;
      if (mode !== 'input') return;
      const r = A.canvas.getBoundingClientRect();
      const cx = (ev.clientX - r.left) * (400 / r.width), cy = (ev.clientY - r.top) * (220 / r.height);
      const id = cell(cx, cy); if (id < 0) return;
      flash = id; flashC = 8;
      if (id === seq[step]) { step++; if (step >= seq.length) { score += seq.length * 10; seq.push(Math.floor(Math.random() * 9)); step = 0; mode = 'show'; showI = -1; showT = 20; msg = 'Good. Length ' + seq.length + '.'; } }
      else { lives--; msg = 'Wrong. ' + lives + ' left.'; if (lives <= 0) { dead = true; A.save(score); msg = 'Game over. Score ' + score + '. Tap to retry.'; mode = 'dead'; } else { step = 0; mode = 'show'; showI = -1; showT = 20; } }
    };
    A.canvas.addEventListener('pointerdown', onMem);
    if (A.onStop) A.onStop(() => A.canvas.removeEventListener('pointerdown', onMem));
    seq = [Math.floor(Math.random() * 9)]; showT = 30;
    const loop = () => { if (!A.alive()) return;
      if (A.tap() && dead) { seq = [Math.floor(Math.random() * 9)]; step = 0; mode = 'show'; showI = -1; showT = 30; lives = 3; score = 0; dead = false; msg = 'Watch, then tap.'; }
      if (mode === 'show') { showT--; if (showT <= 0) { showI++; if (showI >= seq.length) { mode = 'input'; showI = -1; msg = 'Your turn.'; } else showT = 22; } }
      if (flashC > 0) flashC--;
      x.fillStyle = A.bg; x.fillRect(0, 0, 400, 220);
      for (let i = 0; i < 9; i++) {
        const cx = 70 + (i % 3) * 90, cy = 30 + Math.floor(i / 3) * 90;
        const on = (mode === 'show' && showI >= 0 && seq[showI] === i && showT > 6) || (flash === i && flashC > 0);
        x.fillStyle = on ? '#ff6a86' : '#3a1520'; x.fillRect(cx, cy, 78, 78);
        x.strokeStyle = '#ff3b5c88'; x.strokeRect(cx, cy, 78, 78);
      }
      x.fillStyle = A.fg; x.font = '13px monospace'; x.textAlign = 'left'; x.fillText(msg, 10, 210); x.fillText('score ' + score, 300, 210);
      sc.textContent = 'best ' + A.best(); A.raf(loop);
    }; A.raf(loop);
  }
  function playOrbit(x, sc, A) {
    let bx = 200, by = 80, vx = 2.4, vy = 2.8, pad = 200, score = 0, lives = 3, dead = false, last = performance.now();
    const bricks = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) bricks.push({ x: 30 + c * 44, y: 16 + r * 18, on: true });
    const loop = now => { if (!A.alive()) return; const d = Math.min(3, (now - last) / 16.7); last = now;
      if (A.tap() && dead) { bx = 200; by = 80; vx = 2.4; vy = 2.8; lives = 3; score = 0; dead = false; bricks.forEach(b => b.on = true); }
      pad = 40 + A.px() * 320;
      if (!dead) {
        bx += vx * d * 1.15; by += vy * d * 1.15;
        if (bx < 8 || bx > 392) vx *= -1, bx = Math.max(8, Math.min(392, bx));
        if (by < 8) vy = Math.abs(vy);
        if (by > 200 && bx > pad - 36 && bx < pad + 36) { vy = -Math.abs(vy); vx += (bx - pad) * 0.08; by = 200; }
        else if (by > 230) { lives--; if (lives <= 0) { dead = true; A.save(score); } else { bx = 200; by = 80; vy = 2.8; } }
        for (const b of bricks) if (b.on && bx > b.x && bx < b.x + 40 && by > b.y && by < b.y + 14) { b.on = false; vy *= -1; score += 15; }
        if (bricks.every(b => !b.on)) { bricks.forEach(b => b.on = true); vy = Math.min(4.5, Math.abs(vy) + 0.4) * Math.sign(vy || 1); score += 50; }
      }
      x.fillStyle = A.bg; x.fillRect(0, 0, 400, 220);
      x.fillStyle = '#33c0ff'; for (const b of bricks) if (b.on) x.fillRect(b.x, b.y, 40, 14);
      x.fillStyle = '#c8f0ff'; x.fillRect(pad - 36, 208, 72, 8);
      x.beginPath(); x.arc(bx, by, 6, 0, Math.PI * 2); x.fill();
      x.fillStyle = A.fg; x.font = '12px monospace'; x.textAlign = 'left'; x.fillText('score ' + score + '   lives ' + lives, 8, 12);
      if (dead) { x.textAlign = 'center'; x.fillText('OUT. Score ' + score + '. Tap to retry.', 200, 120); }
      sc.textContent = 'best ' + A.best(); A.raf(loop);
    }; A.raf(loop);
  }

  /* ---------- proximity prompt (raised above joystick gutters) ---------- */
  const spots = () => cabs.map(cab => { const p = new T.Vector3(); cab.getWorldPosition(p); return { cab, kind: cab.userData.kind, p, r: 3.6, t: 'PLAY · ' + (GAMES[cab.userData.kind] || {}).title }; });
  let cur = null;
  act.onclick = () => cur && openGame(cur.kind);
  addEventListener('keydown', e => {
    if (e.code !== 'KeyF' || !cur || openKind) return;
    const a = document.activeElement; if (a && /INPUT|TEXTAREA/.test(a.tagName)) return;
    if (window.__fx87 && window.__fx87.inside && !cur) return;
    openGame(cur.kind);
  });

  const tmp = new T.Vector3();
  return { info, open: openGame, close, update(t) {
    for (const cab of cabs) {
      const scr = cab.userData.scr; if (!scr || !scr.material) continue;
      const k = cab.userData.kind, c = GAMES[k].col;
      const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * (1.6 + (c % 7) * 0.05) + cab.id));
      scr.material.color.setHex(c);
      scr.material.opacity = 1;
    }
    const pos = (P && (P.pos || P.position)); if (!pos) return;
    /* skip hidden cabinets (office / rooms not entered) */
    cur = null;
    let bestD = 1e9;
    for (const s of spots()) {
      if (!s.cab.visible || (s.cab.parent && s.cab.parent.visible === false)) continue;
      s.cab.getWorldPosition(tmp);
      const d = Math.hypot(tmp.x - pos.x, tmp.y - (pos.y || 0), tmp.z - pos.z);
      if (d < s.r && d < bestD) { bestD = d; cur = { kind: s.kind, t: s.t }; }
    }
    const indoorsOfficeLocked = (window.__jhiosOffice && !window.__jhiosOffice.inside && cur && false);
    act.style.display = cur && !openKind ? 'block' : 'none';
    if (cur) act.textContent = '[F] ' + cur.t;
  } };
}
