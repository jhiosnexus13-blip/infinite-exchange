/* JHIOS world v87 — enterable pocket rooms (preview only; live stays ?v=81).
   window.IE_V87_ROOMS = false disables every room (no prompts, no meshes). Per-room gates: IE_V87_CERN / IE_V87_DANCE / IE_V87_VIPER = false.
   Rooms are built OFF-MAP (far SW corner x -1500..-1390, z -4600, inside the world.js walk clamp, floor y = -200; collisions there swapped off via fx.clear while inside) — no real GY mesh is cut.
   Shared enterRoom()/exitRoom(): fade, teleport, collider swap (room box clamp + ground override), music stop on exit.
   1. CERN / Versions Of Reality: v65 Royal Assembly Rooms floor hatch (fx.v65Info.hatch) -> shaft -> curved ~20 m corridor -> portal + track panel. No CERN logo.
   2. Dance dream box: ~2 m radius at ring centre e420 n2650 (needs IE_V86_DANCE !== false). Dusk void, album art around a fire, one track, no captions.
   3. Viper Room GY: ENTER prompt by the world-fx viperPanel(); 12x8x4 dark room, DJ booth, strobe (L1+), looping track, toon.fm events wall.
   Track picks (tracks.json): cern-versions-of-reality, dunes-and-the-sand-trance-techno-version (dance), manhattan-shuffle-dub-dance-version (viper). */
export function initV87({ T, S, LITE, warp, fx, P }) {
  const info = { rooms: [], inside: null, enters: 0, exits: 0 }; fx.v87Info = info; window.__fx87 = info;
  if (window.IE_V87_ROOMS === false) { info.off = true; return { info, update() {} }; }
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
  function enterRoom(key) { const r = R[key]; if (!r || cur || busy) return; busy = 1; fadeOn(); info.enters++;
    setTimeout(() => { r.from = [P.pos.x, P.pos.z]; cur = r; info.inside = key; P.pos.set(r.spawn[0], FY + 1.7, r.spawn[1]); P.yaw = r.yaw; P.pitch = 0.02;
      fx.clear = fx.clear || []; r.clr = [r.spawn[0], r.spawn[1], 40]; fx.clear.push(r.clr); // collider swap: world solids off, room clamp on
      if (r.track) music.play(r.track); fx.cullT = 0; busy = 0; }, 180); }
  function exitRoom() { const r = cur; if (!r || busy) return; busy = 1; fadeOn(); info.exits++;
    setTimeout(() => { music.stop(); const o = r.out(); cur = null; info.inside = null; if (fx.clear) { const i = fx.clear.indexOf(r.clr); if (i >= 0) fx.clear.splice(i, 1); }
      P.pos.set(o[0], 1.7 + (o[3] || 0), o[1]); P.yaw = Math.atan2(-(o[2][0] - o[0]), -(o[2][1] - o[1])); P.pitch = 0.05; fx.cullT = 0; busy = 0; }, 180); }
  fx.enterRoom = enterRoom; fx.exitRoom = exitRoom;
  // prompt (E key or tap)
  const btn = document.createElement('button'); btn.type = 'button'; btn.id = 'v87act'; btn.style.cssText = 'position:fixed;left:50%;bottom:28%;transform:translateX(-50%);z-index:120;display:none;padding:10px 18px;font:bold 15px Arial,sans-serif;background:#07020a;color:#3dff9a;border:2px solid #3dff9a;border-radius:8px;cursor:pointer';
  document.body.appendChild(btn); let act = null; btn.onclick = () => act && act();
  addEventListener('keydown', e => { if (e.code !== 'KeyE' || btn.style.display !== 'block') return; const a = document.activeElement; if (a && /INPUT|TEXTAREA/.test(a.tagName)) return; act && act(); });
  const show = (txt, fn) => { act = fn; if (btn.textContent !== txt) btn.textContent = txt; btn.style.display = 'block'; };
  // room builder: axis-aligned box in world x/z, origin (ox, oz), size w (x) by d (z)
  const room = (key, ox, oz, w, d, h, wall, floor) => { const g = new T.Group(); g.name = 'v87-' + key; g.position.set(ox, FY, oz); grp.add(g); g.visible = false;
    box(g, floor, w, 0.2, d, 0, -0.1, 0); box(g, wall, w, 0.2, d, 0, h + 0.1, 0);
    for (const [sx, sz, ww, dd] of [[0, -d / 2, w, 0.2], [0, d / 2, w, 0.2], [-w / 2, 0, 0.2, d], [w / 2, 0, 0.2, d]]) box(g, wall, ww, h, dd, sx, h / 2, sz, { side: T.DoubleSide });
    const r = R[key] = { key, g, ox, oz, x0: ox - w / 2 + 0.6, x1: ox + w / 2 - 0.6, z0: oz - d / 2 + 0.6, z1: oz + d / 2 - 0.6, exitAt: null, spawn: [ox, oz], yaw: 0 }; info.rooms.push(key); return r; };

  // 1. CERN / Versions Of Reality (needs the v65 hatch)
  if (window.IE_V87_CERN !== false) { const ox = -1500, oz = -4600, r = room('cern', ox, oz, 26, 26, 4.2, 0x0b1418, 0x1a2228); const g = r.g;
    // curved ~20 m corridor: inner/outer wall segments on an arc r=9..12 round the room centre; walking clamp keeps you in the box, walls are visual
    for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + i / 12 * Math.PI * 1.1; for (const rr of [8.2, 12.2]) { const m = box(g, 0x16323a, 1.8, 4.2, 0.2, Math.cos(a) * rr, 2.1, Math.sin(a) * rr); m.rotation.y = -a + Math.PI / 2; }
      if (L1 && i % 2 === 0) box(g, 0x3dff9a, 0.25, 0.08, 0.25, Math.cos(a) * 10.2, 4.0, Math.sin(a) * 10.2); }
    box(g, 0x2f3740, 1.6, 4.2, 1.6, 0, 2.1, -10.2, { wireframe: true }); // short shaft you arrive in
    const pa = -Math.PI / 2 + Math.PI * 1.1, px = Math.cos(pa) * 10.2, pz = Math.sin(pa) * 10.2; // portal at corridor end
    const portal = new T.Mesh(new T.TorusGeometry(1.6, 0.18, 10, 32), mat(0x3dff9a)); portal.position.set(px, 1.9, pz); portal.rotation.y = -pa; g.add(portal);
    const disc = new T.Mesh(new T.CircleGeometry(1.45, 32), mat(0x66ffcc, { transparent: true, opacity: 0.45, side: T.DoubleSide })); disc.position.copy(portal.position); disc.rotation.y = -pa; g.add(disc); r.spin = [portal, disc];
    board(g, 'VERSIONS OF REALITY\n\u25b6 CERN // Versions Of Reality', 5.6, 1.6, -6, 2.4, -11.9, 0, '#06140c', '#e8fff2'); // song panel >= 5.2 m
    art(g, 'cern-versions-of-reality', 5.6, 6, 2.3, -11.9, 0);
    fiction(g, 0, 3.5, -11.85, 0); fiction(g, px * 0.8, 3.5, pz * 0.8, -pa + Math.PI / 2);
    board(g, 'EXIT \u00b7 PORTAL / LADDER TO HATCH', 3.6, 0.5, px, 3.7, pz, -pa, '#07020a', '#3dff9a');
    for (let y = 0.3; y < 4; y += 0.45) box(g, 0x8a96a3, 0.9, 0.06, 0.06, 0, y, -10.9); // ladder
    r.spawn = [ox, oz - 10.2]; r.yaw = Math.PI / 2 + 0.6; r.track = 'cern-versions-of-reality';
    r.exits = [[ox + px, oz + pz], [ox, oz - 10.9]];
    r.door = () => { const h = (fx.v65Info && fx.v65Info.hatch) || [-70, -447.5]; const p = warp(h[0], h[1]); return [p.x, p.z, 14]; }; /* v92 hatch apron; wide so ENTER shows */
    r.out = () => { const h = fx.v65Info.hatch, p = warp(h[0] + 3, h[1]), q = warp(h[0], h[1]); return [p.x, p.z, [q.x, q.z]]; }; r.label = 'ENTER HATCH \u00b7 VERSIONS OF REALITY [E]';
 }

  // 2. Dance dream box (removed with the v86 ring)
  if (window.IE_V87_DANCE !== false && window.IE_V86_DANCE !== false) { const ox = -1440, oz = -4600, r = room('dance', ox, oz, 30, 30, 9, 0x1a1030, 0x241a2a); const g = r.g;
    box(g, 0x2a1840, 29.6, 8.8, 29.6, 0, 4.5, 0, { side: T.BackSide, transparent: true, opacity: 0.9 }); // dusk void
    const fl = []; for (const [c, s] of [[0xff7a1a, 1.2], [0xffc83a, 0.7]]) { const m = new T.Mesh(new T.ConeGeometry(s, 2.2 * s + 0.4, 7), mat(c, { transparent: true, opacity: 0.9 })); m.position.set(0, 1.1, 0); g.add(m); fl.push(m); } r.spin = fl;
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; art(g, 'dunes-and-the-sand-trance-techno-version', 5.4, Math.cos(a) * 11, 3.2, Math.sin(a) * 11, -a - Math.PI / 2); } // album art, no captions
    fiction(g, 0, 0.6, 14.7, Math.PI);
    r.spawn = [ox, oz + 6]; r.yaw = 0; r.track = 'dunes-and-the-sand-trance-techno-version';
    const em = new T.Mesh(new T.CircleGeometry(1.2, 24), mat(0x66ffcc, { transparent: true, opacity: 0.5 })); em.rotation.x = -Math.PI / 2; em.position.set(0, 0.03, 12); g.add(em);
    r.exits = [[ox, oz + 12]];
    r.door = () => { const p = warp(420, 2650); return [p.x, p.z, 2]; };
    r.out = () => { const p = warp(436, 2650), q = warp(520, 2650); return [p.x, p.z, [q.x, q.z]]; }; r.label = 'ENTER THE DREAM [E]'; }

  // 3. Viper Room GY (full)
  if (window.IE_V87_VIPER !== false) { const ox = -1395, oz = -4600, r = room('viper', ox, oz, 12, 8, 4, 0x07020a, 0x111014); const g = r.g;
    box(g, 0x1a1a1f, 3.2, 1.1, 1.2, 0, 0.55, -2.8); box(g, 0xff2e4a, 3.2, 0.06, 1.2, 0, 1.13, -2.8); for (const s of [-0.8, 0.8]) box(g, 0x333338, 0.5, 0.05, 0.5, s, 1.18, -2.8); // DJ booth + decks
    board(g, 'VIPER ROOM GY', 5.4, 1.0, 0, 3.1, -3.88, 0, '#07020a', '#ff2e4a');
    const ev = board(g, 'EVENTS \u00b7 toon.fm/viper-room-gy\n(tap the wall to open)', 5.4, 1.6, -5.88, 2.2, 0, Math.PI / 2, '#120308', '#ff8a9a');
    art(g, 'manhattan-shuffle-dub-dance-version', 5.4, 5.88, 2.2, 0, -Math.PI / 2);
    fiction(g, 0, 3.6, 3.88, Math.PI);
    board(g, 'EXIT \u00b7 ARENA APRON', 3.6, 0.5, 0, 2.6, 3.88, Math.PI, '#07020a', '#3dff9a');
    const st = new T.Mesh(new T.PlaneGeometry(11.6, 7.6), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false, side: T.DoubleSide, depthWrite: false })); st.rotation.x = Math.PI / 2; st.position.y = 3.9; g.add(st); r.strobe = L1 ? st : null;
    r.spawn = [ox, oz + 2.2]; r.yaw = 0; r.track = 'manhattan-shuffle-dub-dance-version'; r.loop = true; r.events = ev;
    r.exits = [[ox, oz + 3.3]];
    const vp = () => fx.viper && fx.viper.grp && fx.viper.grp.getWorldPosition(new T.Vector3());
    const vn = () => new T.Vector3(0, 0, 1).applyQuaternion(fx.viper.grp.getWorldQuaternion(new T.Quaternion())).setY(0).normalize();
    r.door = () => { const p = vp(); if (!p) return null; const n = vn(); return [p.x + n.x * 6, p.z + n.z * 6, 6]; };
    r.out = () => { const p = vp(), n = vn(); return [p.x + n.x * 12, p.z + n.z * 12, [p.x + n.x * 30, p.z + n.z * 30]]; }; r.label = 'ENTER VIPER ROOM GY [E]'; }

  let tk = 0;
  function update(t, dt) {
    for (const k in R) R[k].g.visible = cur === R[k];
    if (cur) { const r = cur; P.pos.x = Math.max(r.x0, Math.min(r.x1, P.pos.x)); P.pos.z = Math.max(r.z0, Math.min(r.z1, P.pos.z)); if (P.pos.y < FY + 1) P.pos.y = FY + 1.7; // no fall-through
      if (r.spin) r.spin.forEach((m, i) => { m.rotation.z = t * (0.6 + i); m.scale.y = 1 + 0.12 * Math.sin(t * (6 + i * 3)); });
      if (r.strobe) r.strobe.material.opacity = (Math.sin(t * 22) > 0.85 ? 0.35 : 0) * (window.__beat ? __beat() : 1);
      if (r.loop && window.JX && JX.current && JX.current.id === r.track && !JX.playing && t - (r.lt || 0) > 3) { r.lt = t; music.play(r.track); }
      const near = r.exits.some(([x, z]) => Math.hypot(P.pos.x - x, P.pos.z - z) < 2.2);
      if (r.key === 'viper' && Math.hypot(P.pos.x - (r.ox - 5.4), P.pos.z - r.oz) < 2) show('OPEN VIPER ROOM EVENTS [E]', () => open('https://toon.fm/viper-room-gy', '_blank', 'noopener'));
      else if (near) show('EXIT [E]', exitRoom); else btn.style.display = 'none'; return; }
    if (t - tk < 0.2) return; tk = t; let hit = null;
    for (const k in R) { const d = R[k].door && R[k].door(); if (d && Math.hypot(P.pos.x - d[0], P.pos.z - d[1]) < d[2] && P.pos.y < 12) { hit = R[k]; break; } }
    if (hit) show(hit.label, () => enterRoom(hit.key)); else btn.style.display = 'none';
  }
  return { info, update, enterRoom, exitRoom };
}
