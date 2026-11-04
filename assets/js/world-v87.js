/* JHIOS world v87 — enterable pocket rooms (preview only; live stays ?v=81).
   window.IE_V87_ROOMS = false disables every room (no prompts, no meshes). Per-room gates: IE_V87_CERN / IE_V87_DANCE / IE_V87_VIPER = false.
   Rooms are built OFF-MAP (far SW corner x -1500..-1390, z -4600, inside the world.js walk clamp, floor y = -200; collisions there swapped off via fx.clear while inside) — no real GY mesh is cut.
   Shared enterRoom()/exitRoom(): fade, teleport, collider swap (room box clamp + ground override), music stop on exit.
   1. CERN: Hadron-style ring + Shiva portal face (fiction) + Versions Of Reality track.
   2. Dance dream: cover-art ring (Dance Of The Ancients vibe), fire, dusk void.
   3. Viper: venue-like club (logo, stage, LEDs, speakers), DJ booth, strobe, events wall.
   Track picks (tracks.json): cern-versions-of-reality, dunes-and-the-sand-trance-techno-version (dance), manhattan-shuffle-dub-dance-version (viper). */
export function initV87({ T, S, LITE, warp, fx, P }) {
  if (fx.v87 && fx.v87Info && fx.v87Info.ready) return fx.v87;
  const info = { rooms: [], inside: null, enters: 0, exits: 0, ready: false }; fx.v87Info = info; window.__fx87 = info;
  if (window.IE_V87_ROOMS === false) { info.off = true; info.ready = true; return { info, update() {} }; }
  const DET = window.__detail ?? (LITE ? 0 : 1), L1 = DET >= 1, FY = -200;
  const grp = new T.Group(); grp.name = 'v87-rooms'; S.add(grp);
  const MC = new Map(), mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!MC.has(k)) MC.set(k, new T.MeshBasicMaterial(Object.assign({ color: c, fog: false }, o))); return MC.get(k); };
  const box = (g, c, w, h, d, x, y, z, o) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c, o)); m.position.set(x, y, z); g.add(m); return m; };
  const board = (g, text, w, h, x, y, z, ry, bg, fg) => { const c = document.createElement('canvas'); c.width = 512; c.height = Math.max(64, Math.round(512 * h / w)); const k = c.getContext('2d');
    k.fillStyle = bg; k.fillRect(0, 0, c.width, c.height); k.fillStyle = fg; k.textAlign = 'center'; k.textBaseline = 'middle'; const ls = String(text).split('\n'), px = Math.floor(c.height * 0.6 / ls.length);
    ls.forEach((l, i) => { let s = px; k.font = `bold ${s}px Arial, sans-serif`; while (k.measureText(l).width > c.width * 0.92 && s > 8) k.font = `bold ${--s}px Arial, sans-serif`; k.fillText(l, c.width / 2, c.height * (i + 0.5) / ls.length); });
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), side: T.DoubleSide, fog: false })); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m; };
  const art = (g, id, w, x, y, z, ry) => { const m = new T.Mesh(new T.PlaneGeometry(w, w * 9 / 16), new T.MeshBasicMaterial({ color: 0x333344, side: T.DoubleSide, fog: false })); m.position.set(x, y, z); m.rotation.y = ry; g.add(m);
    const go = () => { const t = window.JX && JX.tracks && JX.tracks.find(q => q.id === id); const yt = t && /[?&]v=([\w-]{6,})/.exec(t.youtube_url || ''); const u = t && (t.artwork_url || (yt && `https://i.ytimg.com/vi/${yt[1]}/mqdefault.jpg`));
      if (u) new T.TextureLoader().load(u, tx => { tx.colorSpace = T.SRGBColorSpace; m.material.map = tx; m.material.color.set(0xffffff); m.material.needsUpdate = true; }); };
    window.JX ? JX.load().then(go).catch(() => {}) : 0; return m; };
  const FICTION = 'FICTION \u00b7 JHIOS world art \u00b7 not a real venue or facility';
  const fiction = (g, x, y, z, ry) => board(g, FICTION, 4.4, 0.5, x, y, z, ry, '#06140c', '#3dff9a');
  const music = { play(id) { const J = window.JX; if (!J) return; J.load().then(() => { const t = J.tracks.find(q => q.id === id); if (t) { J.play(t, [t]); info.track = id; } }).catch(() => {}); },
    stop() { const J = window.JX; if (J && J.playing && J.toggle) J.toggle(); info.track = null; } };
  const R = {}; let cur = null, busy = 0;
  const fadeOn = () => { const f = fx.bm && fx.bm.fade; if (f) { f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); } };
  // ground override: first in the list, only answers while inside a room
  (window.__groundParts = window.__groundParts || []).unshift((x, z) => cur ? FY : null);
  let exitT = 0; function enterRoom(key) { const r = R[key]; if (!r || cur || busy) return; busy = 1; try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch (_) {} fadeOn(); info.enters++;
    setTimeout(() => { r.from = [P.pos.x, P.pos.z]; cur = r; info.inside = key; P.pos.set(r.spawn[0], FY + 1.7, r.spawn[1]); P.yaw = r.yaw; P.pitch = 0.02;
      fx.clear = fx.clear || []; r.clr = [r.spawn[0], r.spawn[1], 40]; fx.clear.push(r.clr); // collider swap: world solids off, room clamp on
      if (r.track) music.play(r.track); fx.cullT = 0; busy = 0; }, 180); }
  function exitRoom() { const r = cur; if (!r || busy) return; busy = 1; fadeOn(); info.exits++;
    setTimeout(() => { music.stop(); const o = r.out(); cur = null; info.inside = null; if (fx.clear) { const i = fx.clear.indexOf(r.clr); if (i >= 0) fx.clear.splice(i, 1); }
      P.pos.set(o[0], 1.7 + (o[3] || 0), o[1]); P.yaw = Math.atan2(-(o[2][0] - o[0]), -(o[2][1] - o[1])); P.pitch = 0.05; fx.cullT = 0; busy = 0; exitT = performance.now(); btn.style.display = 'none'; }, 180); }
  fx.enterRoom = enterRoom; fx.exitRoom = exitRoom;
  // prompt: high z so HUD/player never steal the tap; Enter / F / tap
  let btn = document.getElementById('v87act');
  if (!btn) { btn = document.createElement('button'); btn.type = 'button'; btn.id = 'v87act'; document.body.appendChild(btn); }
  btn.style.cssText = 'position:fixed;left:50%;bottom:28%;transform:translateX(-50%);z-index:140;display:none;padding:12px 20px;font:bold 16px Arial,sans-serif;background:#07020a;color:#3dff9a;border:2px solid #3dff9a;border-radius:8px;cursor:pointer;pointer-events:auto;touch-action:manipulation;-webkit-user-select:none;user-select:none';
  let act = null;
  const fire = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } if (act) act(); };
  btn.onclick = fire; btn.ontouchend = fire;
  addEventListener('keydown', e => { if (btn.style.display !== 'block') return; if (e.code !== 'Enter' && e.code !== 'NumpadEnter' && e.code !== 'KeyF') return; const a = document.activeElement; if (a && /INPUT|TEXTAREA/.test(a.tagName)) return; e.preventDefault(); act && act(); });
  const show = (txt, fn) => { act = fn; if (btn.textContent !== txt) btn.textContent = txt; btn.style.display = 'block'; };
  // room builder: axis-aligned box in world x/z, origin (ox, oz), size w (x) by d (z)
  const room = (key, ox, oz, w, d, h, wall, floor) => { const g = new T.Group(); g.name = 'v87-' + key; g.position.set(ox, FY, oz); grp.add(g); g.visible = false;
    box(g, floor, w, 0.2, d, 0, -0.1, 0); box(g, wall, w, 0.2, d, 0, h + 0.1, 0);
    for (const [sx, sz, ww, dd] of [[0, -d / 2, w, 0.2], [0, d / 2, w, 0.2], [-w / 2, 0, 0.2, d], [w / 2, 0, 0.2, d]]) box(g, wall, ww, h, dd, sx, h / 2, sz, { side: T.DoubleSide });
    const r = R[key] = { key, g, ox, oz, x0: ox - w / 2 + 0.6, x1: ox + w / 2 - 0.6, z0: oz - d / 2 + 0.6, z1: oz + d / 2 - 0.6, exitAt: null, spawn: [ox, oz], yaw: 0 }; info.rooms.push(key); return r; };

  // 1. CERN — Hadron-style ring corridor; main face = Shiva portal (fiction)
  if (window.IE_V87_CERN !== false) { const ox = -1500, oz = -4600, r = room('cern', ox, oz, 28, 28, 5.2, 0x070c12, 0x121820); const g = r.g;
    // LHC-ish dual beam pipes + magnet shells on a 3/4 ring
    for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 + i / 20 * Math.PI * 1.35;
      for (const rr of [7.4, 11.6]) { const m = box(g, 0x2a3a48, 2.2, 3.6, 0.35, Math.cos(a) * rr, 1.9, Math.sin(a) * rr); m.rotation.y = -a + Math.PI / 2; }
      box(g, 0x2f6a80, 1.4, 1.4, 1.4, Math.cos(a) * 9.5, 1.9, Math.sin(a) * 9.5); // magnet block (brighter v101)
      { const fs = box(g, i % 2 ? 0x3dff9a : 0x33e0ff, 1.6, 0.04, 0.35, Math.cos(a) * 9.5, 0.03, Math.sin(a) * 9.5); fs.rotation.y = -a; } // emissive floor strip
      if (L1 && i % 2 === 0) { const lg = box(g, 0x3dff9a, 0.2, 0.08, 0.2, Math.cos(a) * 9.5, 3.8, Math.sin(a) * 9.5); }
      // inner cyan beam glow
      const bm = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 2.0, 8), mat(0x66ffcc, { transparent: true, opacity: 0.55 })); bm.position.set(Math.cos(a) * 9.5, 1.9, Math.sin(a) * 9.5); bm.rotation.z = Math.PI / 2; bm.rotation.y = -a; g.add(bm); }
    box(g, 0x3a4550, 2.2, 5.0, 2.2, 0, 2.5, -11.2, { wireframe: true }); // arrival shaft cage
    for (let y = 0.2; y < 5; y += 0.4) box(g, 0x8a96a3, 1.0, 0.06, 0.06, 0, y, -11.9); // ladder
    // v101 soft fill planes so the hall never reads as void
    for (const [x, z, ry] of [[0, -13.8, 0], [0, 13.8, Math.PI], [-13.8, 0, Math.PI / 2], [13.8, 0, -Math.PI / 2]]) { const f = new T.Mesh(new T.PlaneGeometry(27, 4.6), mat(0x123a4a, { transparent: true, opacity: 0.85, side: T.DoubleSide })); f.position.set(x, 2.5, z); f.rotation.y = ry; g.add(f); }
    { const fr = new T.Mesh(new T.RingGeometry(3.2, 3.6, 48), mat(0x33e0ff, { transparent: true, opacity: 0.5, side: T.DoubleSide })); fr.rotation.x = -Math.PI / 2; fr.position.y = 0.03; g.add(fr); }
    const pa = -Math.PI / 2 + Math.PI * 1.35, px = Math.cos(pa) * 10.0, pz = Math.sin(pa) * 10.0;
    // Shiva portal face (procedural canvas — fiction, not a real deity photo)
    const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 1024; const sk = sc.getContext('2d');
    const grd = sk.createRadialGradient(512, 520, 40, 512, 512, 500); grd.addColorStop(0, '#fff6c8'); grd.addColorStop(0.25, '#ff7a1a'); grd.addColorStop(0.55, '#3dff9a'); grd.addColorStop(1, '#061018');
    sk.fillStyle = grd; sk.fillRect(0, 0, 1024, 1024);
    sk.strokeStyle = '#e8fff2'; sk.lineWidth = 8; sk.beginPath(); sk.arc(512, 480, 160, 0, 7); sk.stroke(); // halo
    sk.fillStyle = '#0a1018'; sk.beginPath(); sk.ellipse(512, 560, 90, 140, 0, 0, 7); sk.fill(); // torso
    sk.beginPath(); sk.arc(512, 400, 70, 0, 7); sk.fill(); // head
    sk.fillStyle = '#3dff9a'; sk.beginPath(); sk.arc(512, 385, 10, 0, 7); sk.fill(); // third eye
    for (const [ang, len] of [[-1.1, 220], [-0.55, 240], [0.55, 240], [1.1, 220], [-1.6, 180], [1.6, 180]]) {
      sk.strokeStyle = '#ffd76a'; sk.lineWidth = 14; sk.beginPath(); sk.moveTo(512, 520); sk.lineTo(512 + Math.cos(ang - Math.PI / 2) * len, 520 + Math.sin(ang - Math.PI / 2) * len); sk.stroke(); }
    sk.fillStyle = '#e8fff2'; sk.font = 'bold 42px Arial'; sk.textAlign = 'center'; sk.fillText('SHIVA PORTAL', 512, 920); sk.font = '28px Arial'; sk.fillText('FICTION · Versions Of Reality', 512, 970);
    const shiva = new T.Mesh(new T.CircleGeometry(2.8, 48), new T.MeshBasicMaterial({ map: new T.CanvasTexture(sc), side: T.DoubleSide, fog: false, toneMapped: false }));
    shiva.position.set(px, 2.2, pz); shiva.rotation.y = -pa; g.add(shiva);
    const portal = new T.Mesh(new T.TorusGeometry(3.05, 0.22, 12, 48), mat(0x3dff9a)); portal.position.copy(shiva.position); portal.rotation.y = -pa; g.add(portal);
    const ring2 = new T.Mesh(new T.TorusGeometry(3.5, 0.08, 8, 48), mat(0xff7a1a, { transparent: true, opacity: 0.7 })); ring2.position.copy(shiva.position); ring2.rotation.y = -pa; g.add(ring2);
    r.spin = [portal, ring2, shiva];
    board(g, 'VERSIONS OF REALITY\n\u25b6 CERN // Versions Of Reality', 6.2, 1.8, -7, 3.6, -11.5, 0, '#06140c', '#e8fff2');
    art(g, 'cern-versions-of-reality', 6.2, 7, 3.4, -11.5, 0);
    fiction(g, 0, 4.4, -11.4, 0); fiction(g, px * 0.75, 4.5, pz * 0.75, -pa + Math.PI / 2);
    board(g, 'EXIT \u00b7 SHIVA PORTAL / LADDER', 4.2, 0.55, px, 4.9, pz, -pa, '#07020a', '#3dff9a');
    // v101: entry wall copies of VERSIONS board + art so they sit in FOV on spawn
    board(g, 'VERSIONS OF REALITY\n\u25b6 CERN // Versions Of Reality', 4.6, 1.3, -13.3, 4.0, -1.5, Math.PI / 2, '#06140c', '#e8fff2');
    art(g, 'cern-versions-of-reality', 4.6, -13.3, 2.0, -1.5, Math.PI / 2);
    // v101 spawn: in the ring gap corridor (clear of shaft cage + slabs), facing the Shiva portal
    { const sa = Math.PI * 1.2, sx = Math.cos(sa) * 9.5, sz = Math.sin(sa) * 9.5; r.spawn = [ox + sx, oz + sz]; r.yaw = Math.atan2(-(px - sx), -(pz - sz)); }
    r.x0 = ox - 13.6; r.x1 = ox + 13.6; r.z0 = oz - 13.6; r.z1 = oz + 13.6;
    r.track = 'cern-versions-of-reality';
    r.exits = [[ox + px, oz + pz], [ox, oz - 11.9]];
    r.door = () => { const h = (fx.v65Info && fx.v65Info.hatch) || [-70, -447.5]; const p = warp(h[0], h[1]); return [p.x, p.z, 14]; };
    r.out = () => { const h = (fx.v65Info && fx.v65Info.hatch) || [-70, -447.5], p = warp(h[0] + 4.5, h[1] + 1.5), q = warp(h[0], h[1]); return [p.x, p.z, [q.x, q.z]]; }; r.label = 'ENTER HATCH \u00b7 VERSIONS OF REALITY — tap';
 }

  // 2. Dance dream box — Dance Of The Ancients cover-art ring
  if (window.IE_V87_DANCE !== false && window.IE_V86_DANCE !== false) { const ox = -1440, oz = -4600, r = room('dance', ox, oz, 32, 32, 10, 0x3a1a4a, 0x2a1830); const g = r.g;
    box(g, 0x5a2a6a, 31.5, 9.5, 31.5, 0, 4.8, 0, { side: T.BackSide, transparent: true, opacity: 0.92 });
    // soft dream haze discs
    for (const [rad, y, op] of [[14, 0.05, 0.25], [10, 0.08, 0.2], [6, 0.12, 0.3]]) { const d = new T.Mesh(new T.CircleGeometry(rad, 40), mat(0xff7a1a, { transparent: true, opacity: op })); d.rotation.x = -Math.PI / 2; d.position.y = y; g.add(d); }
    const fl = []; for (const [c, s, y] of [[0xff7a1a, 1.4, 1.2], [0xffc83a, 0.85, 1.5], [0xffeed0, 0.45, 1.9]]) { const m = new T.Mesh(new T.ConeGeometry(s, 2.4 * s + 0.5, 8), mat(c, { transparent: true, opacity: 0.92 })); m.position.set(0, y, 0); g.add(m); fl.push(m); } r.spin = fl;
    const covers = ['dunes-and-the-sand-trance-techno-version', 'dunes-and-the-sand-drum-and-bass-version', 'kamukura-no-kotodama-i-spirit-of-words-ainu-shinto', 'kamukura-no-kotodama-ii-descent-of-the-kami', 'seikilos-iv-dance-of-the-grave', 'cern-versions-of-reality', 'manhattan-shuffle-tribal-psy-trance-version', 'down-and-dirty'];
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; const id = covers[i];
      { const fr = box(g, [0xff7a1a, 0xffc83a, 0x66ffcc, 0xff4fd8][i % 4], 6.3, 3.75, 0.05, Math.cos(a) * 12.4, 3.6, Math.sin(a) * 12.4); fr.rotation.y = -a - Math.PI / 2; } // glowing fallback frame
      box(g, 0xffb040, 0.5, 0.15, 0.5, Math.cos(a) * 8, 9.6, Math.sin(a) * 8); // ceiling ember light
      art(g, id, 5.8, Math.cos(a) * 12.2, 3.6, Math.sin(a) * 12.2, -a - Math.PI / 2);
      // square cover plate behind (album vibe)
      box(g, 0x2a1830, 6.0, 6.0, 0.08, Math.cos(a) * 12.55, 3.6, Math.sin(a) * 12.55); }
    // v101: dusk haze, floor glow ring, second fire + embers
    { const hz = new T.Mesh(new T.CylinderGeometry(15, 15, 9, 32, 1, true), mat(0xff8a5a, { transparent: true, opacity: 0.12, side: T.BackSide })); hz.position.y = 4.5; g.add(hz);
      const rg = new T.Mesh(new T.RingGeometry(10.5, 11.2, 64), mat(0xffc83a, { transparent: true, opacity: 0.6, side: T.DoubleSide })); rg.rotation.x = -Math.PI / 2; rg.position.y = 0.06; g.add(rg);
      for (const [c, s, y] of [[0xff4f1a, 0.8, 0.8], [0xffd76a, 0.45, 1.1]]) { const m = new T.Mesh(new T.ConeGeometry(s, 2.2 * s + 0.4, 8), mat(c, { transparent: true, opacity: 0.9 })); m.position.set(-5, y, -5); g.add(m); fl.push(m); }
      for (let e = 0; e < 24; e++) box(g, e % 2 ? 0xffc83a : 0xff7a1a, 0.12, 0.12, 0.12, Math.sin(e * 2.3) * 4, 2 + (e * 0.37) % 6, Math.cos(e * 1.7) * 4); }
    board(g, 'EXIT \u2193 behind you \u00b7 south door (glowing disc) \u00b7 tap EXIT', 6.4, 0.7, 0, 5.6, -3, 0, '#07020a', '#3dff9a');
    board(g, 'EXIT \u00b7 BEACH', 4.0, 0.7, 0, 3.0, 15.7, Math.PI, '#07020a', '#3dff9a');
    board(g, 'DANCE OF THE ANCIENTS\n\u25b6 dream box \u00b7 cover art', 7.2, 1.4, 0, 8.2, 0, 0, '#1a0820', '#ffc83a');
    fiction(g, 0, 0.7, 15.2, Math.PI);
    r.spawn = [ox, oz + 5]; r.yaw = 0; r.track = 'dunes-and-the-sand-trance-techno-version';
    const em = new T.Mesh(new T.CircleGeometry(1.4, 28), mat(0x66ffcc, { transparent: true, opacity: 0.55 })); em.rotation.x = -Math.PI / 2; em.position.set(0, 0.04, 13); g.add(em);
    r.exits = [[ox, oz + 13]]; r.exitR = 10;
    r.door = () => { const p = warp(420, 2650); return [p.x, p.z, 14]; };
    r.out = () => { const p = warp(436, 2650), q = warp(520, 2650); return [p.x, p.z, [q.x, q.z]]; }; r.label = 'ENTER THE DREAM — tap'; }

  // 3. Viper Room GY — dark club / venue look (logo + red stage)
  if (window.IE_V87_VIPER !== false) { const ox = -1395, oz = -4600, r = room('viper', ox, oz, 14, 10, 4.5, 0x050208, 0x0c0a10); const g = r.g;
    // stage riser + LED bar
    box(g, 0x1a1218, 10, 0.35, 3.2, 0, 0.2, -3.2); box(g, 0xff2e4a, 10, 0.08, 0.12, 0, 0.42, -1.55);
    box(g, 0x151018, 4.2, 1.2, 1.4, 0, 0.95, -3.5); // booth
    box(g, 0xff2e4a, 4.2, 0.06, 1.4, 0, 1.58, -3.5);
    for (const s of [-1.1, 1.1]) box(g, 0x2a2a30, 0.7, 0.05, 0.55, s, 1.62, -3.5);
    // speakers
    for (const s of [-5.2, 5.2]) { box(g, 0x2a2a34, 1.4, 2.8, 1.3, s, 1.4, -3.6); box(g, 0x777788, 1.0, 1.0, 0.05, s, 1.8, -2.93); box(g, 0xff2e4a, 1.4, 0.06, 0.06, s, 2.82, -2.93); }
    // side LED strips
    for (const s of [-6.8, 6.8]) box(g, 0xff2e4a, 0.08, 4.0, 0.08, s, 2.2, 0);
    // crowd silhouettes (venue vibe)
    for (let i = 0; i < 7; i++) { const x = -4.5 + i * 1.5; box(g, 0x2a1a24, 0.55, 1.5 + (i % 3) * 0.2, 0.35, x, 0.85, 2.8); }
    board(g, 'VIPER ROOM GY', 6.5, 1.1, 0, 3.6, -4.85, 0, '#07020a', '#ff2e4a');
    // logo plane from site asset
    const logoM = new T.Mesh(new T.PlaneGeometry(5.5, 2.4), mat(0x220810)); logoM.position.set(0, 2.5, -4.7); g.add(logoM);
    fetch('/assets/img/viper-room-gy-logo.b64.txt').then(r => r.text()).then(b64 => {
      const u = b64.trim().startsWith('data:') ? b64.trim() : 'data:image/png;base64,' + b64.trim();
      new T.TextureLoader().load(u, tx => { tx.colorSpace = T.SRGBColorSpace; logoM.material = new T.MeshBasicMaterial({ map: tx, transparent: true, fog: false, toneMapped: false }); });
    }).catch(() => {});
    const ev = board(g, 'EVENTS \u00b7 toon.fm/viper-room-gy\n(tap wall / Enter)', 5.6, 1.7, -6.85, 2.3, 0, Math.PI / 2, '#120308', '#ff8a9a');
    art(g, 'manhattan-shuffle-dub-dance-version', 5.6, 6.85, 2.3, 0, -Math.PI / 2);
    fiction(g, 0, 3.9, 4.85, Math.PI);
    board(g, 'EXIT \u00b7 ARENA APRON', 4.0, 0.55, 0, 2.8, 4.85, Math.PI, '#07020a', '#3dff9a');
    const st = new T.Mesh(new T.PlaneGeometry(13.5, 9.2), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false, side: T.DoubleSide, depthWrite: false })); st.rotation.x = Math.PI / 2; st.position.y = 4.3; g.add(st); r.strobe = L1 ? st : null;
    // v100 fatten: bright fill strips, floor grid, wall wash so the room reads at any angle
    for (const s of [-6.85, 6.85]) { for (const y of [0.6, 3.9]) box(g, 0xff2e4a, 0.06, 0.1, 9.6, s, y, 0); box(g, 0x2a0a14, 0.05, 4.3, 9.8, s * 1.005, 2.2, 0); }
    for (const y of [0.6, 3.9]) box(g, 0xff6a2e, 13.6, 0.1, 0.06, 0, y, 4.88);
    for (let i = -6; i <= 6; i += 2) box(g, 0x3a0c18, 0.06, 0.02, 9.6, i, 0.02, 0);
    for (let i = -4; i <= 4; i += 2) box(g, 0x3a0c18, 13.6, 0.02, 0.06, 0, 0.02, i);
    for (const s of [-3.5, 0, 3.5]) box(g, 0xffd0d8, 1.6, 0.05, 0.3, s, 4.42, 0); // ceiling light bars
    for (let i = 0; i < 7; i++) box(g, i % 2 ? 0x55ffcc : 0xff2e4a, 0.5, 0.08, 0.3, -4.5 + i * 1.5, 1.7 + (i % 3) * 0.2, 2.8); // crowd glowsticks
    for (const s of [-6, 6]) { box(g, 0x2a1a22, 1.6, 1.0, 0.8, s, 0.5, 3.6); box(g, 0xff2e4a, 1.6, 0.05, 0.8, s, 1.02, 3.6); } // bar counters
    r.spawn = [ox, oz + 3.6]; r.yaw = 0; r.track = 'manhattan-shuffle-dub-dance-version'; r.loop = true; r.events = ev;
    r.exits = [[ox, oz + 4.2]];
    const vbase = () => (fx.feature && fx.feature.grp) ? fx.feature.grp.position : (fx.viper && fx.viper.grp && fx.viper.grp.getWorldPosition(new T.Vector3()));
    r.door = () => { const p = vbase(); if (!p) return null; return [p.x, p.z, 22]; };
    r.out = () => { const p = vbase() || { x: 0, z: 0 }; return [p.x + 22, p.z + 15, [p.x, p.z]]; }; /* v100: ~27m out, clear apron beyond the 22m door radius */ r.label = 'ENTER VIPER ROOM GY — tap'; }

  try {
    const PJ = window.__pjumps || (window.__pjumps = {});
    const dp = warp(420, 2650); const dl = warp(420, 2632); PJ.dance_ancients = [dl.x, dl.z, [dp.x, dp.z, 0.1]];
    fx.pj81 = fx.pj81 || {}; fx.pj81.dance_ancients = PJ.dance_ancients; // v100: jumpTo0 reads fx.pj81, not __pjumps
    const addJ = (key, label, after) => { const nav = document.querySelector('.wmap-jumps'); if (!nav || nav.querySelector('[data-jump="' + key + '"]')) return; const b = document.createElement('button'); b.type = 'button'; b.dataset.jump = key; b.textContent = label; const a = after && nav.querySelector('[data-jump="' + after + '"]'); a ? a.after(b) : nav.appendChild(b); };
    const waitJ = () => { if (!document.querySelector('.wmap-jumps')) return setTimeout(waitJ, 400); addJ('dance_ancients', 'Dance Of The Ancients', 'pleasure_beach'); const vh = document.querySelector('.wmap-jumps [data-jump="versions_hatch"]'); if (vh) vh.textContent = 'CERN / Versions Of Reality hatch'; else addJ('versions_hatch', 'CERN / Versions Of Reality hatch', 'dance_ancients'); };
    waitJ();
  } catch (_) {}

  const tipFor = (key, text, col) => {
    const id = 'v87tip-' + key; let tip = document.getElementById(id);
    if (!tip) { tip = document.createElement('button'); tip.type = 'button'; tip.id = id; document.body.appendChild(tip);
      tip.style.cssText = 'position:fixed;left:50%;bottom:28%;transform:translateX(-50%);z-index:141;display:none;padding:12px 20px;font:bold 16px Arial,sans-serif;background:#07020a;color:' + col + ';border:2px solid ' + col + ';border-radius:8px;cursor:pointer;pointer-events:auto;touch-action:manipulation';
      const go = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } tip.textContent = 'Opening...'; try { enterRoom(key); tip.style.display = 'none'; } catch (err) { console.warn(key, err); tip.textContent = 'Enter failed — tap to retry'; } };
      tip.onclick = go; tip.ontouchend = go;
      addEventListener('keydown', e => { if (tip.style.display !== 'block') return; if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'KeyF') { e.preventDefault(); go(e); } });
    }
    const tick = () => { const r = R[key], p = P && P.pos; let near = false;
      if (r && r.door && p && !cur && performance.now() - exitT > 1200) { const d = r.door(); if (d) near = Math.hypot(p.x - d[0], p.z - d[1]) < d[2] && p.y < 12; }
      tip.style.display = near ? 'block' : 'none'; if (near) tip.textContent = text; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };
  if (R.dance) tipFor('dance', 'ENTER THE DREAM — tap / Enter / F', '#ffc83a');
  if (R.viper) tipFor('viper', 'ENTER VIPER ROOM GY — tap / Enter / F', '#ff2e4a');
  const tipOwns = () => ['v87tip-dance', 'v87tip-viper'].some(id => { const el = document.getElementById(id); return el && el.style.display === 'block'; });

  info.ready = true;
  let tk = 0;
  function update(t, dt) {

    for (const k in R) R[k].g.visible = cur === R[k];
    if (cur) { const r = cur; P.pos.x = Math.max(r.x0, Math.min(r.x1, P.pos.x)); P.pos.z = Math.max(r.z0, Math.min(r.z1, P.pos.z)); if (P.pos.y < FY + 1) P.pos.y = FY + 1.7; // no fall-through
      if (r.spin) r.spin.forEach((m, i) => { m.rotation.z = t * (0.6 + i); m.scale.y = 1 + 0.12 * Math.sin(t * (6 + i * 3)); });
      if (r.strobe) r.strobe.material.opacity = (Math.sin(t * 22) > 0.85 ? 0.35 : 0) * (window.__beat ? __beat() : 1);
      if (r.loop && window.JX && JX.current && JX.current.id === r.track && !JX.playing && t - (r.lt || 0) > 3) { r.lt = t; music.play(r.track); }
      const near = r.exits.some(([x, z]) => Math.hypot(P.pos.x - x, P.pos.z - z) < (r.exitR || 3.8));
      if (r.key === 'viper' && Math.hypot(P.pos.x - (r.ox - 5.4), P.pos.z - r.oz) < 2) show('OPEN VIPER ROOM EVENTS — tap', () => open('https://toon.fm/viper-room-gy', '_blank', 'noopener'));
      else if (near) show('EXIT — tap / Enter / F', exitRoom); else btn.style.display = 'none'; return; }
    if (t - tk < 0.2) return; tk = t; if (performance.now() - exitT < 1200) { btn.style.display = 'none'; return; } let hit = null;
    for (const k in R) { const d = R[k].door && R[k].door(); if (d && Math.hypot(P.pos.x - d[0], P.pos.z - d[1]) < d[2] && P.pos.y < 12) { hit = R[k]; break; } }
    if (hit && !tipOwns()) show(hit.label, () => enterRoom(hit.key)); else if (!cur) btn.style.display = 'none';
  }
  return { info, update, enterRoom, exitRoom };
}
