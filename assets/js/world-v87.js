/* JHIOS world v87 — enterable pocket rooms (preview only; live stays ?v=81).
   window.IE_V87_ROOMS = false disables every room (no prompts, no meshes). Per-room gates: IE_V87_CERN / IE_V87_DANCE / IE_V87_VIPER = false.
   v104: art() ytId accepts youtu.be/shorts/embed (Dance covers were grey); Dance exitR 10->4.5 (no EXIT tip on spawn); Viper crowd centre aisle |x|>=1.8 + pushed 0.8 m south for DJ sightline.
   v102 Viper FX flags (default ON): IE_V87_DJ=false hides DJ, IE_V87_CROWD=false hides crowd, IE_V87_STROBE=false / IE_V87_LASERS=false turn those off (both only build at L1+ / DET>=1).
   v102 sizes: CERN 40x40x6.5 @x-1560, Dance 42x42x12 @x-1490, Viper 24x18x6 @x-1420 (all z -4600, inside world.js clamp x>=-1600, z>=-4700).
   Rooms are built OFF-MAP (far SW corner x -1580..-1408, z -4600, inside the world.js walk clamp, floor y = -200; collisions there swapped off via fx.clear while inside) — no real GY mesh is cut.
   Shared enterRoom()/exitRoom(): fade, teleport, collider swap (room box clamp + ground override), music stop on exit.
   1. CERN: Hadron-style ring + Shiva portal face (fiction) + Versions Of Reality track.
   2. Dance dream: cover-art ring (Dance Of The Ancients vibe), fire, dusk void.
   3. Viper: venue-like club (logo, stage, LEDs, speakers), DJ booth, strobe, events wall.
   Track picks (tracks.json): cern-versions-of-reality, pavamana-mantra-i-om-asato-ma-sadgamaya-sanskrit-invocation (dance, v103 album-only), manhattan-shuffle-dub-dance-version (viper). */
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
    const go = () => { const t = window.JX && JX.tracks && JX.tracks.find(q => q.id === id); const yt = t && /(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/.exec(t.youtube_url || ''); const u = t && (t.artwork_url || (yt && `https://i.ytimg.com/vi/${yt[1]}/mqdefault.jpg`));
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

  // 1. CERN — Hadron-style ring corridor; main face = Shiva portal (fiction). v102: 40x40x6.5 (k scales every v101 radius/position)
  if (window.IE_V87_CERN !== false) { const k = 40 / 28, ox = -1560, oz = -4600, HC = 6.5, r = room('cern', ox, oz, 40, 40, HC, 0x070c12, 0x121820); const g = r.g;
    const R1 = 7.4 * k, R2 = 11.6 * k, RM = 9.5 * k;
    for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 + i / 20 * Math.PI * 1.35; const nearPortal = i >= 19; // v102: no magnet/beam block in front of the Shiva portal
      for (const rr of [R1, R2]) { const m = box(g, 0x2a3a48, 2.2 * k, 4.4, 0.35, Math.cos(a) * rr, 2.2, Math.sin(a) * rr); m.rotation.y = -a + Math.PI / 2; }
      { const fs = box(g, i % 2 ? 0x3dff9a : 0x33e0ff, 1.6 * k, 0.04, 0.35, Math.cos(a) * RM, 0.03, Math.sin(a) * RM); fs.rotation.y = -a; }
      if (L1 && i % 2 === 0) box(g, 0x3dff9a, 0.25, 0.08, 0.25, Math.cos(a) * RM, HC - 0.4, Math.sin(a) * RM);
      if (nearPortal) continue;
      box(g, 0x2f6a80, 1.6, 1.6, 1.6, Math.cos(a) * RM, 2.2, Math.sin(a) * RM);
      const bm = new T.Mesh(new T.CylinderGeometry(0.14, 0.14, 2.6, 8), mat(0x66ffcc, { transparent: true, opacity: 0.55 })); bm.position.set(Math.cos(a) * RM, 2.2, Math.sin(a) * RM); bm.rotation.z = Math.PI / 2; bm.rotation.y = -a; g.add(bm); }
    const SZ = -11.2 * k; box(g, 0x3a4550, 2.6, HC - 0.2, 2.6, 0, (HC - 0.2) / 2, SZ, { wireframe: true }); // arrival shaft cage
    for (let y = 0.2; y < HC - 0.2; y += 0.4) box(g, 0x8a96a3, 1.0, 0.06, 0.06, 0, y, SZ - 0.8); // ladder
    const W2 = 19.7; for (const [x, z, ry] of [[0, -W2, 0], [0, W2, Math.PI], [-W2, 0, Math.PI / 2], [W2, 0, -Math.PI / 2]]) { const f = new T.Mesh(new T.PlaneGeometry(39, HC - 0.6), mat(0x123a4a, { transparent: true, opacity: 0.85, side: T.DoubleSide })); f.position.set(x, HC / 2, z); f.rotation.y = ry; g.add(f); }
    { const fr = new T.Mesh(new T.RingGeometry(3.2 * k, 3.6 * k, 48), mat(0x33e0ff, { transparent: true, opacity: 0.5, side: T.DoubleSide })); fr.rotation.x = -Math.PI / 2; fr.position.y = 0.03; g.add(fr); }
    const pa = -Math.PI / 2 + Math.PI * 1.35, px = Math.cos(pa) * 10.0 * k, pz = Math.sin(pa) * 10.0 * k;
    const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 1024; const sk = sc.getContext('2d');
    const grd = sk.createRadialGradient(512, 520, 40, 512, 512, 500); grd.addColorStop(0, '#fff6c8'); grd.addColorStop(0.25, '#ff7a1a'); grd.addColorStop(0.55, '#3dff9a'); grd.addColorStop(1, '#061018');
    sk.fillStyle = grd; sk.fillRect(0, 0, 1024, 1024);
    sk.strokeStyle = '#e8fff2'; sk.lineWidth = 8; sk.beginPath(); sk.arc(512, 480, 160, 0, 7); sk.stroke();
    sk.fillStyle = '#0a1018'; sk.beginPath(); sk.ellipse(512, 560, 90, 140, 0, 0, 7); sk.fill();
    sk.beginPath(); sk.arc(512, 400, 70, 0, 7); sk.fill();
    sk.fillStyle = '#3dff9a'; sk.beginPath(); sk.arc(512, 385, 10, 0, 7); sk.fill();
    for (const [ang, len] of [[-1.1, 220], [-0.55, 240], [0.55, 240], [1.1, 220], [-1.6, 180], [1.6, 180]]) {
      sk.strokeStyle = '#ffd76a'; sk.lineWidth = 14; sk.beginPath(); sk.moveTo(512, 520); sk.lineTo(512 + Math.cos(ang - Math.PI / 2) * len, 520 + Math.sin(ang - Math.PI / 2) * len); sk.stroke(); }
    sk.fillStyle = '#e8fff2'; sk.font = 'bold 42px Arial'; sk.textAlign = 'center'; sk.fillText('SHIVA PORTAL', 512, 920); sk.font = '28px Arial'; sk.fillText('FICTION · Versions Of Reality', 512, 970);
    const shiva = new T.Mesh(new T.CircleGeometry(2.8, 48), new T.MeshBasicMaterial({ map: new T.CanvasTexture(sc), side: T.DoubleSide, fog: false, toneMapped: false }));
    shiva.position.set(px, 2.9, pz); shiva.rotation.y = -pa; g.add(shiva);
    const portal = new T.Mesh(new T.TorusGeometry(3.05, 0.22, 12, 48), mat(0x3dff9a)); portal.position.copy(shiva.position); portal.rotation.y = -pa; g.add(portal);
    const ring2 = new T.Mesh(new T.TorusGeometry(3.5, 0.08, 8, 48), mat(0xff7a1a, { transparent: true, opacity: 0.7 })); ring2.position.copy(shiva.position); ring2.rotation.y = -pa; g.add(ring2);
    r.spin = [portal, ring2, shiva];
    board(g, 'VERSIONS OF REALITY\n\u25b6 CERN // Versions Of Reality', 6.2, 1.8, -7 * k, 4.4, SZ - 0.3, 0, '#06140c', '#e8fff2');
    art(g, 'cern-versions-of-reality', 6.2, 7 * k, 4.2, SZ - 0.3, 0);
    fiction(g, 0, HC - 0.8, SZ - 0.2, 0); fiction(g, px * 0.75, 5.2, pz * 0.75, -pa + Math.PI / 2);
    board(g, 'EXIT \u00b7 SHIVA PORTAL / LADDER', 4.2, 0.55, px, 5.8, pz, -pa, '#07020a', '#3dff9a');
    board(g, 'VERSIONS OF REALITY\n\u25b6 CERN // Versions Of Reality', 4.6, 1.3, -19.3, 4.8, -2, Math.PI / 2, '#06140c', '#e8fff2');
    art(g, 'cern-versions-of-reality', 4.6, -19.3, 2.4, -2, Math.PI / 2);
    // v101 spawn logic kept: ring gap corridor at RM (clear of shaft cage + slabs), facing the Shiva portal
    { const sa = Math.PI * 1.2, sx = Math.cos(sa) * RM, sz = Math.sin(sa) * RM; r.spawn = [ox + sx, oz + sz]; r.yaw = Math.atan2(-(px - sx), -(pz - sz)); }
    r.x0 = ox - 19.4; r.x1 = ox + 19.4; r.z0 = oz - 19.4; r.z1 = oz + 19.4;
    r.track = 'cern-versions-of-reality';
    r.exits = [[ox + px, oz + pz], [ox, oz + SZ - 0.8]]; r.exitR = 7; // v102: EXIT shows from ~7 m (was 3.8, felt back-door only)
    r.door = () => { const h = (fx.v65Info && fx.v65Info.hatch) || [-70, -447.5]; const p = warp(h[0], h[1]); return [p.x, p.z, 14]; };
    r.out = () => { const h = (fx.v65Info && fx.v65Info.hatch) || [-70, -447.5], p = warp(h[0] + 4.5, h[1] + 1.5), q = warp(h[0], h[1]); return [p.x, p.z, [q.x, q.z]]; }; r.label = 'ENTER HATCH \u00b7 VERSIONS OF REALITY — tap';
  }

  // 2. Dance dream box — Dance Of The Ancients cover-art ring. v102: 42x42x12 (k scales v101 layout)
  if (window.IE_V87_DANCE !== false && window.IE_V86_DANCE !== false) { const k = 42 / 32, ox = -1490, oz = -4600, HD = 12, r = room('dance', ox, oz, 42, 42, HD, 0x3a1a4a, 0x2a1830); const g = r.g;
    box(g, 0x5a2a6a, 41.5, HD - 0.5, 41.5, 0, HD / 2 - 0.2, 0, { side: T.BackSide, transparent: true, opacity: 0.92 });
    for (const [rad, y, op] of [[14 * k, 0.05, 0.25], [10 * k, 0.08, 0.2], [6 * k, 0.12, 0.3]]) { const d = new T.Mesh(new T.CircleGeometry(rad, 40), mat(0xff7a1a, { transparent: true, opacity: op })); d.rotation.x = -Math.PI / 2; d.position.y = y; g.add(d); }
    const fl = []; for (const [c, s, y] of [[0xff7a1a, 1.8, 1.5], [0xffc83a, 1.1, 1.9], [0xffeed0, 0.6, 2.4]]) { const m = new T.Mesh(new T.ConeGeometry(s, 2.4 * s + 0.5, 8), mat(c, { transparent: true, opacity: 0.92 })); m.position.set(0, y, 0); g.add(m); fl.push(m); } r.spin = fl;
    // v103: Dance Of The Ancients album ONLY (music-catalogue worldLocation north-denes-beach-campfire) — 24 tracks, 2 rows x 12
    const covers = ['kamukura-no-kotodama-ii-descent-of-the-kami', 'seikilos-i-the-epitaph-flame-mongolian-seikilos', 'seikilos-iii-eternal-song', 'abwun-dbwashmaya-ii-kingdom-eternal', 'ekh-survaljiin-duu-song-of-the-source-i-mongolian-invocation', 'enkis-waters-i-abzu-rising-sumerian', 'enkis-waters-ii-wisdom-of-ea', 'seikilos-ii-the-riddle-of-death', 'tyrs-eir-iv-shield-and-fire', 'ankh-djed-was-i-life-and-power-egyptian', 'ekh-survaljiin-duu-song-of-the-source-ii-eternal-echo', 'brigh-an-latha-iii-shadows-depart', 'abwun-dbwashmaya-i-heavens-breath-aramaic', 'pavamana-mantra-ii-path-of-illusion', 'seikilos-iv-dance-of-the-grave', 'tyrs-eir-iii-ragnars-call', 'brigh-an-latha-i-strength-of-the-day-gaelic', 'tyrs-eir-ii-war-of-wires', 'kamukura-no-kotodama-i-spirit-of-words-ainu-shinto', 'pavamana-mantra-i-om-asato-ma-sadgamaya-sanskrit-invocation', 'tyrs-eir-i-the-blood-oath-norse', 'ankh-djed-was-ii-the-temple-pillars', 'brigh-an-latha-ii-fire-awakens', 'brigh-an-latha-iv-dawn-of-the-druids'];
    const RC = 12.4 * k, NP = 12;
    for (let i = 0; i < covers.length; i++) { const row = Math.floor(i / NP), a = ((i % NP) + row * 0.5) / NP * 6.283, y = row ? 7.4 : 3.1, id = covers[i];
      { const fr = box(g, [0xff7a1a, 0xffc83a, 0x66ffcc, 0xff4fd8][i % 4], 6.0, 3.6, 0.05, Math.cos(a) * RC, y, Math.sin(a) * RC); fr.rotation.y = -a - Math.PI / 2; }
      if (i < NP) box(g, 0xffb040, 0.6, 0.15, 0.6, Math.cos(a) * 8 * k, HD - 0.4, Math.sin(a) * 8 * k);
      art(g, id, 5.6, Math.cos(a) * (RC - 0.2), y, Math.sin(a) * (RC - 0.2), -a - Math.PI / 2); }
    // v103: FICTION figures dancing around the fire (IE_V87_DANCE_FIGURES=false hides) — neon-edged silhouettes, not the album painting
    r.figs = []; if (window.IE_V87_DANCE_FIGURES !== false) { const NF = 8, FR = 5.2 * k, cols = [0xff7a1a, 0x3dff9a, 0xffc83a, 0x33e0ff, 0xff4fd8, 0x66ffcc, 0xffd76a, 0xff2e4a];
      for (let i = 0; i < NF; i++) { const a = i / NF * 6.283, hgt = 1.5 + (i % 3) * 0.12, c = cols[i];
        const p = new T.Group(); p.position.set(Math.cos(a) * FR, 0, Math.sin(a) * FR); p.rotation.y = -a - Math.PI / 2; g.add(p);
        box(p, 0x120810, 0.46, hgt, 0.3, 0, hgt / 2, 0); box(p, c, 0.52, hgt + 0.06, 0.24, 0, hgt / 2, 0, { wireframe: true });
        box(p, 0x120810, 0.3, 0.3, 0.3, 0, hgt + 0.2, 0); box(p, c, 0.36, 0.36, 0.24, 0, hgt + 0.2, 0, { wireframe: true });
        const arm = (s) => { const q = new T.Group(); q.position.set(s * 0.3, hgt - 0.1, 0); p.add(q); box(q, c, 0.08, 0.7, 0.08, 0, 0.3, 0); q.rotation.z = s * 0.6; return q; };
        r.figs.push([p, i * 0.8, a, FR, arm(-1), arm(1)]); }
      fiction(g, 0, 0.4, -FR - 1.2, 0); }
    { const hz = new T.Mesh(new T.CylinderGeometry(15 * k, 15 * k, HD - 1, 32, 1, true), mat(0xff8a5a, { transparent: true, opacity: 0.12, side: T.BackSide })); hz.position.y = (HD - 1) / 2; g.add(hz);
      const rg = new T.Mesh(new T.RingGeometry(10.5 * k, 11.2 * k, 64), mat(0xffc83a, { transparent: true, opacity: 0.6, side: T.DoubleSide })); rg.rotation.x = -Math.PI / 2; rg.position.y = 0.06; g.add(rg);
      for (const [fx2, fz2] of [[-5 * k, -5 * k], [5 * k, -5 * k]]) for (const [c, s, y] of [[0xff4f1a, 0.9, 0.9], [0xffd76a, 0.5, 1.2]]) { const m = new T.Mesh(new T.ConeGeometry(s, 2.2 * s + 0.4, 8), mat(c, { transparent: true, opacity: 0.9 })); m.position.set(fx2, y, fz2); g.add(m); fl.push(m); }
      for (let e = 0; e < 32; e++) box(g, e % 2 ? 0xffc83a : 0xff7a1a, 0.14, 0.14, 0.14, Math.sin(e * 2.3) * 5.5, 2 + (e * 0.37) % 8, Math.cos(e * 1.7) * 5.5); }
    board(g, 'EXIT \u2193 behind you \u00b7 south door (glowing disc) \u00b7 tap EXIT', 6.4, 0.7, 0, 6.6, -4, 0, '#07020a', '#3dff9a');
    board(g, 'EXIT \u00b7 BEACH', 4.0, 0.7, 0, 3.0, 20.7, Math.PI, '#07020a', '#3dff9a');
    board(g, 'DANCE OF THE ANCIENTS\n\u25b6 dream box \u00b7 cover art', 7.2, 1.4, 0, 9.8, 0, 0, '#1a0820', '#ffc83a');
    fiction(g, 0, 0.7, 20.2, Math.PI);
    r.spawn = [ox, oz + 9]; r.yaw = 0; r.track = 'pavamana-mantra-i-om-asato-ma-sadgamaya-sanskrit-invocation';
    const em = new T.Mesh(new T.CircleGeometry(1.8, 28), mat(0x66ffcc, { transparent: true, opacity: 0.55 })); em.rotation.x = -Math.PI / 2; em.position.set(0, 0.04, 17.5); g.add(em);
    r.exits = [[ox, oz + 17.5]]; r.exitR = 4.5; // v104: was 10 (covered spawn at z+9)
    r.door = () => { const p = warp(420, 2650); return [p.x, p.z, 14]; };
    r.out = () => { const p = warp(436, 2650), q = warp(520, 2650); return [p.x, p.z, [q.x, q.z]]; }; r.label = 'ENTER THE DREAM — tap'; }

  // 3. Viper Room GY — v102: 24x18x6 club. Stage north (z -), DJ on booth, crowd mid, bars on side walls, spawn + exit south.
  if (window.IE_V87_VIPER !== false) { const ox = -1420, oz = -4600, VW = 24, VD = 18, VH = 6, r = room('viper', ox, oz, VW, VD, VH, 0x050208, 0x0c0a10); const g = r.g;
    const NW = -VD / 2 + 0.15, SW = VD / 2 - 0.15, EW = VW / 2 - 0.15; // wall faces
    // stage riser + LED lip
    box(g, 0x1a1218, 16, 0.6, 4.6, 0, 0.3, -6.4); box(g, 0xff2e4a, 16, 0.08, 0.12, 0, 0.62, -4.1);
    // DJ booth (bigger) + decks + mixer
    box(g, 0x151018, 5.6, 1.1, 1.6, 0, 1.15, -5.6); box(g, 0xff2e4a, 5.6, 0.06, 1.6, 0, 1.72, -5.6); box(g, 0xff2e4a, 5.6, 0.12, 0.05, 0, 0.9, -4.79);
    const decks = []; for (const s of [-1.6, 1.6]) { box(g, 0x2a2a30, 1.0, 0.06, 0.8, s, 1.76, -5.7); const pl = new T.Mesh(new T.CylinderGeometry(0.36, 0.36, 0.03, 20), mat(0x111114)); pl.position.set(s, 1.8, -5.7); g.add(pl); decks.push(pl); { const mk = box(g, 0xffffff, 0.3, 0.035, 0.04, 0, 0, 0); pl.add(mk); mk.position.set(0.15, 0.03, 0); } }
    box(g, 0x222230, 0.9, 0.08, 0.7, 0, 1.78, -5.7); for (let i = 0; i < 4; i++) box(g, i % 2 ? 0x55ffcc : 0xff2e4a, 0.08, 0.03, 0.08, -0.3 + i * 0.2, 1.84, -5.6);
    // DJ silhouette (IE_V87_DJ=false hides)
    r.dj = null; if (window.IE_V87_DJ !== false) { const dj = new T.Group(); dj.position.set(0, 0.6, -6.5); g.add(dj); const C = 0x2a1622;
      box(dj, C, 0.22, 0.9, 0.22, -0.16, 0.45, 0); box(dj, C, 0.22, 0.9, 0.22, 0.16, 0.45, 0);
      const up = new T.Group(); up.position.y = 0.9; dj.add(up); box(up, C, 0.62, 0.75, 0.32, 0, 0.38, 0); box(up, 0x1a0c14, 0.32, 0.32, 0.32, 0, 0.95, 0);
      box(up, 0xff2e4a, 0.42, 0.08, 0.1, 0, 0.98, 0); // headphones band glow
      const armL = new T.Group(); armL.position.set(-0.4, 0.68, 0); up.add(armL); box(armL, C, 0.16, 0.16, 0.62, 0, 0, 0.3);
      const armR = new T.Group(); armR.position.set(0.4, 0.68, 0); up.add(armR); box(armR, C, 0.16, 0.6, 0.16, 0, 0.3, 0);
      r.dj = { up, armL, armR, decks }; }
    // NOW PLAYING strip on booth front
    board(g, 'NOW PLAYING \u00b7 MANHATTAN SHUFFLE (DUB DANCE)', 5.2, 0.32, 0, 1.25, -4.76, 0, '#07020a', '#55ffcc');
    // speakers stacks either side of stage
    for (const s of [-9.5, 9.5]) { box(g, 0x2a2a34, 1.8, 3.6, 1.6, s, 1.8, -7.4); box(g, 0x777788, 1.2, 1.2, 0.05, s, 2.4, -6.58); box(g, 0x777788, 0.7, 0.7, 0.05, s, 1.0, -6.58); box(g, 0xff2e4a, 1.8, 0.06, 0.06, s, 3.62, -6.58); }
    // back wall: logo high and clear (v102: nothing overlaps it), title board above
    const logoM = new T.Mesh(new T.PlaneGeometry(7.2, 3.1), mat(0x220810)); logoM.position.set(0, 3.55, NW + 0.05); g.add(logoM);
    fetch('/assets/img/viper-room-gy-logo.b64.txt?v=104').then(r => r.text()).then(b64 => {
      const u = b64.trim().startsWith('data:') ? b64.trim() : 'data:image/png;base64,' + b64.trim();
      new T.TextureLoader().load(u, tx => { tx.colorSpace = T.SRGBColorSpace; logoM.material = new T.MeshBasicMaterial({ map: tx, transparent: true, fog: false, toneMapped: false }); });
    }).catch(() => {});
    board(g, 'VIPER ROOM GY', 6.5, 0.7, 0, 5.5, NW + 0.04, 0, '#07020a', '#ff2e4a');
    const ev = board(g, 'EVENTS \u00b7 toon.fm/viper-room-gy\n(tap wall / Enter)', 5.6, 1.7, -EW, 2.6, -1, Math.PI / 2, '#120308', '#ff8a9a');
    art(g, 'manhattan-shuffle-dub-dance-version', 5.6, EW, 2.9, -1, -Math.PI / 2);
    fiction(g, 0, 4.8, SW, Math.PI);
    board(g, 'EXIT \u00b7 ARENA APRON', 4.0, 0.55, 0, 3.2, SW, Math.PI, '#07020a', '#3dff9a');
    // club lighting: wall LED strips, wall wash, floor grid, ceiling bars + truss
    for (const s of [-EW, EW]) { for (const y of [0.6, VH - 0.5]) box(g, 0xff2e4a, 0.06, 0.1, VD - 0.4, s, y, 0); box(g, 0x2a0a14, 0.05, VH - 0.3, VD - 0.2, s * 1.003, VH / 2, 0); }
    for (const y of [0.6, VH - 0.5]) box(g, 0xff6a2e, VW - 0.4, 0.1, 0.06, 0, y, SW + 0.02);
    for (let i = -10; i <= 10; i += 2) box(g, 0x3a0c18, 0.06, 0.02, VD - 0.4, i, 0.02, 0);
    for (let i = -8; i <= 8; i += 2) box(g, 0x3a0c18, VW - 0.4, 0.02, 0.06, 0, 0.02, i);
    for (const s of [-7, -3.5, 0, 3.5, 7]) for (const z of [-2, 4]) box(g, 0xffd0d8, 1.6, 0.05, 0.3, s, VH - 0.08, z);
    box(g, 0x3a3a44, VW - 2, 0.15, 0.15, 0, VH - 0.6, -3.6); box(g, 0x3a3a44, VW - 2, 0.15, 0.15, 0, VH - 0.6, 1.5); // light truss
    // dancefloor glow pad
    { const df = new T.Mesh(new T.PlaneGeometry(12, 6.5), mat(0x3a0a24, { transparent: true, opacity: 0.8 })); df.rotation.x = -Math.PI / 2; df.position.set(0, 0.03, 0); g.add(df); }
    // bars on side walls
    for (const s of [-10.6, 10.6]) { box(g, 0x2a1a22, 1.0, 1.1, 5, s, 0.55, 4.5); box(g, 0xff2e4a, 1.0, 0.05, 5, s, 1.12, 4.5); for (let b = 0; b < 4; b++) box(g, b % 2 ? 0x55ffcc : 0xffc83a, 0.12, 0.35, 0.12, s + Math.sign(s) * 0.3, 1.3, 2.8 + b * 1.1); }
    // small crowd (IE_V87_CROWD=false hides): ~15 silhouettes on the floor facing the stage, bob + glowsticks
    r.crowd = []; if (window.IE_V87_CROWD !== false) { const n = L1 ? 16 : 10;
      for (let i = 0; i < n; i++) { const row = i % 3, x0 = -5.2 + ((i * 2.3) % 10.6) + (row - 1) * 0.4, x = Math.abs(x0) < 1.8 ? Math.sign(x0 || 1) * (1.8 + Math.abs(x0) * 0.5) : x0, z = -1.8 + row * 1.9 + ((i * 0.7) % 0.8), hgt = 1.45 + ((i * 37) % 5) * 0.08;
        const p = new T.Group(); p.position.set(x, 0, z); p.rotation.y = Math.sin(i) * 0.3; g.add(p); box(p, 0x24161e, 0.42, hgt, 0.28, 0, hgt / 2, 0); box(p, 0x1c1018, 0.26, 0.26, 0.26, 0, hgt + 0.15, 0);
        if (i % 3 === 0) box(p, i % 2 ? 0x55ffcc : 0xff2e4a, 0.06, 0.4, 0.06, 0.3, hgt + 0.35, 0);
        r.crowd.push([p, i * 1.7]); } }
    // strobe (IE_V87_STROBE=false off; default on at L1+)
    const st = new T.Mesh(new T.PlaneGeometry(VW - 0.6, VD - 0.6), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false, side: T.DoubleSide, depthWrite: false })); st.rotation.x = Math.PI / 2; st.position.y = VH - 0.15; g.add(st);
    r.strobe = (L1 && window.IE_V87_STROBE !== false) ? st : null; if (!r.strobe) st.visible = false;
    // lasers (IE_V87_LASERS=false off; default on at L1+): thin additive cylinders hung from the truss, slow sweep
    r.lasers = []; if (L1 && window.IE_V87_LASERS !== false) { const LL = 7;
      for (let i = 0; i < 6; i++) { const piv = new T.Group(); piv.position.set(-7.5 + i * 3, VH - 0.6, -3.6); g.add(piv);
        const b = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, LL, 4, 1, true), new T.MeshBasicMaterial({ color: i % 2 ? 0x33e0ff : 0xff2040, transparent: true, opacity: 0.7, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
        b.position.y = -LL / 2; piv.add(b); piv.rotation.x = -0.9; r.lasers.push([piv, i]); } }
    r.spawn = [ox, oz + 6.8]; r.yaw = 0; r.track = 'manhattan-shuffle-dub-dance-version'; r.loop = true; r.events = ev;
    r.exits = [[ox, oz + 7.6]]; r.evAt = [ox - EW + 1.2, oz - 1];
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
      if (r.dj) { const d = r.dj; d.up.rotation.z = 0.08 * Math.sin(t * 4.2); d.up.position.y = 0.9 + 0.05 * Math.abs(Math.sin(t * 4.2)); d.armL.rotation.y = 0.3 * Math.sin(t * 2.1); d.armR.rotation.x = -0.4 + 0.5 * Math.sin(t * 8.4); d.decks.forEach(p => p.rotation.y = t * 3.5); }
      if (r.crowd) for (const [p, ph] of r.crowd) p.position.y = 0.08 * Math.abs(Math.sin(t * 4.2 + ph));
      if (r.figs) for (const [p, ph, a0, fr, aL, aR] of r.figs) { const a = a0 + t * 0.15; p.position.set(Math.cos(a) * fr, 0.12 * Math.abs(Math.sin(t * 3.6 + ph)), Math.sin(a) * fr); p.rotation.y = -a - Math.PI / 2 + 0.3 * Math.sin(t * 1.8 + ph); aL.rotation.z = -0.6 - 0.7 * Math.abs(Math.sin(t * 3.6 + ph)); aR.rotation.z = 0.6 + 0.7 * Math.abs(Math.sin(t * 3.6 + ph + 1)); }
      if (r.lasers) for (const [p, i] of r.lasers) { p.rotation.z = 0.5 * Math.sin(t * 0.6 + i * 0.9); p.rotation.x = -0.9 + 0.25 * Math.sin(t * 0.4 + i); }
      if (r.loop && window.JX && JX.current && JX.current.id === r.track && !JX.playing && t - (r.lt || 0) > 3) { r.lt = t; music.play(r.track); }
      const near = r.exits.some(([x, z]) => Math.hypot(P.pos.x - x, P.pos.z - z) < (r.exitR || 3.8));
      if (r.key === 'viper' && r.evAt && Math.hypot(P.pos.x - r.evAt[0], P.pos.z - r.evAt[1]) < 2) show('OPEN VIPER ROOM EVENTS — tap', () => open('https://toon.fm/viper-room-gy', '_blank', 'noopener'));
      else if (near) show('EXIT — tap / Enter / F', exitRoom); else btn.style.display = 'none'; return; }
    if (t - tk < 0.2) return; tk = t; if (performance.now() - exitT < 1200) { btn.style.display = 'none'; return; } let hit = null;
    for (const k in R) { const d = R[k].door && R[k].door(); if (d && Math.hypot(P.pos.x - d[0], P.pos.z - d[1]) < d[2] && P.pos.y < 12) { hit = R[k]; break; } }
    if (hit && !tipOwns()) show(hit.label, () => enterRoom(hit.key)); else if (!cur) btn.style.display = 'none';
  }
  return { info, update, enterRoom, exitRoom };
}
