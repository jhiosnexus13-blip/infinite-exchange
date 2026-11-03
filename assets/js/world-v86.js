/* JHIOS world v86 — Regent Road / Troll Cart / Market Gates / lore pass + QA jumps (preview only, live stays ?v=81).
   Sources: OSM Geofabrik Norfolk extract (© OpenStreetMap contributors, ODbL) + Free Roam Street View compare (/workspace/gy-real-refs/v85-sv-compare/).
   1. KFC (114a) + McDonald's (114) Regent Road NR30 2AB: OSM nodes 1865800794/1865800797 sit on the north face of building 175506364 (e-522..-491, n358-389),
      across Regent Road from Market Gates, west of the Alexandra Rd junction / Troll Cart. Not inside the mall. KFC west (town side), McD east per SV 2017.
   2. Troll Cart (OSM 175596035, 7-9 Regent Rd): east glazing band, black J D Wetherspoon fascia, bigger hanging sign (v65 small one gated: IE_V86_TROLL_OLD=true), outdoor tables, jump.
   3. Market Gates: First-style branding on the 2 v65 buses, 4 litter bins. 4. Campfires kept as lore + jumps + lore plaques. 5. Dance Of The Ancients ritual ring (IE_V86_DANCE=false drops).
   6. Jumps: Royal Assembly Rooms (Lodge) restored, Sea Life Centre Gardens (Giant Wheel), Troll Cart, KFC/McD Regent Rd, campfire beach (lore), campfire Bure (lore).
   7. Barnard Bridge: earth ramps joining deck to grass at both ends (walkable), BARNARD BRIDGE land sign. IE_V86_BARNARD=false drops. */
export function initV86({ T, S, LBL, LITE, warp, fx }) {
  const info = { shops: 0, troll: 0, bins: 0, dance: 0, jumps: 0, ramps: 0 }; fx.v86Info = info; window.__fx86 = info;
  const DET = window.__detail ?? (LITE ? 0 : 1), L1 = DET >= 1, L2 = DET >= 2;
  const grp = new T.Group(); grp.name = 'v86'; S.add(grp);
  const MC = new Map(); const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!MC.has(k)) MC.set(k, new T.MeshBasicMaterial(Object.assign({ color: c }, o))); return MC.get(k); };
  const box = (c, w, h, d, e, n, y, ry = 0, o) => { const p = warp(e, n), m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(c, o)); m.position.set(p.x, y, p.z); m.rotation.y = ry; grp.add(m); return m; };
  const cyl = (c, r0, r1, h, e, n, y, seg = 10, o) => { const p = warp(e, n), m = new T.Mesh(new T.CylinderGeometry(r0, r1, h, seg), mat(c, o)); m.position.set(p.x, y, p.z); grp.add(m); return m; };
  const solid = (e, n, w, d) => { if (L1 && fx.addSolid) fx.addSolid([[e - w / 2, n - d / 2], [e + w / 2, n - d / 2], [e + w / 2, n + d / 2], [e - w / 2, n + d / 2]], -1, 99); };
  const board = (text, w, h, e, n, y, ry, bg, fg, fs = 0.6, font = 'Arial, sans-serif') => { const c = document.createElement('canvas'); c.width = 512; c.height = Math.max(64, Math.round(512 * h / w)); const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; const ls = String(text).split('\n'); const px = Math.floor(c.height * fs / ls.length);
    ls.forEach((l, i) => { let s = px; g.font = `bold ${s}px ${font}`; while (g.measureText(l).width > c.width * 0.92 && s > 8) g.font = `bold ${--s}px ${font}`; g.fillText(l, c.width / 2, c.height * (i + 0.5) / ls.length); });
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), side: T.DoubleSide })); const p = warp(e, n); m.position.set(p.x, y, p.z); m.rotation.y = ry; grp.add(m); return m; };
  const N_ = Math.PI, E_ = Math.PI / 2, W_ = -Math.PI / 2; // board facing north / east / west
  const run = (k, f) => { try { f(); } catch (e) { console.warn('v86 ' + k, e); info[k + 'Err'] = String(e); } };
  const PJ = fx.pj81 = fx.pj81 || {}; const jump = (key, label, e, n, fe, fn, pitch = 0.06, after) => { const a = warp(e, n), f = warp(fe, fn); PJ[key] = [a.x, a.z, [f.x, f.z, pitch]];
    let k = 0; const go = () => { const nav = document.querySelector('.wmap-jumps'); if (!nav) { if (++k < 40) setTimeout(go, 1000); return; } if (!nav.querySelector(`[data-jump="${key}"]`)) { const b = document.createElement('button'); b.type = 'button'; b.dataset.jump = key; b.textContent = label;
      const x = after && nav.querySelector(`[data-jump="${after}"]`); x ? x.after(b) : nav.appendChild(b); info.jumps++; } }; setTimeout(go, 800); };

  run('regent', () => { const NF = 389.3; // north face of OSM 175506364
    const shop = (e0, e1, bg, fg, name, logoCol) => { const e = (e0 + e1) / 2, w = e1 - e0; box(bg, w, 1.3, 0.35, e, NF, 3.9); if (L1) { board(name, w - 1, 1.0, e, NF + 0.2, 3.9, N_, logoCol, fg, 0.62); box(0x1b2733, w - 1.2, 2.4, 0.12, e, NF + 0.1, 1.5, 0, { transparent: true, opacity: 0.75 }); box(0xd9dde2, 1.6, 2.5, 0.14, e + w / 2 - 1.6, NF + 0.12, 1.25); } info.shops++; };
    shop(-521.5, -506, 0xc8102e, '#ffffff', 'KFC', '#c8102e'); shop(-506, -491.5, 0x1f3d2b, '#ffc72c', "McDonald's", '#1f3d2b');
    if (L1) { board('M', 1.6, 1.6, -491.6, NF + 1.2, 5.6, N_, '#1f3d2b', '#ffc72c', 0.9); box(0x6b6f74, 0.12, 2.2, 0.12, -491.6, NF + 1.2, 3.7); board("SPENCER'S SPORTS BAR", 9, 0.8, -506, NF + 0.2, 5.4, N_, '#101418', '#e8e8e8', 0.55); }
    jump('regent_kfc_mcd', 'KFC + McDonald\u2019s (Regent Rd)', -506, 402, -506, NF, 0.08, 'market_gates'); });

  run('troll', () => { const FE = -457.6; // east face of OSM 175596035 (hanging sign side)
    box(0x15181c, 0.25, 1.1, 22, FE - 0.2, 435, 4.0); if (L1) board('THE TROLL CART  \u00b7  J D WETHERSPOON', 21, 0.95, FE + 0.05, 435, 4.0, E_, '#15181c', '#f2f2f2', 0.55);
    box(0x223040, 0.12, 2.6, 20, FE + 0.02, 435, 1.5, 0, { transparent: true, opacity: 0.72 }); for (let i = 0; i <= 5; i++) box(0xe8e2d4, 0.18, 2.7, 0.22, FE + 0.06, 425 + i * 4, 1.5);
    if (window.IE_V86_TROLL_OLD !== true) { const e = -456.6, n = 437; cyl(0x2b2b2b, 0.06, 0.06, 1.8, e + 1.0, n, 4.9, 6); box(0x2b2b2b, 2.6, 0.09, 0.09, e + 1.3, n, 5.8);
      for (const s of [-0.03, 0.03]) board('THE TROLL CART', 2.4, 1.4, e + 1.6, n + s, 4.95, s < 0 ? 0 : Math.PI, '#3a1d12', '#f2d38a', 0.5, 'Georgia, serif'); }
    if (L1) for (let i = 0; i < 4; i++) { const n = 426 + i * 5; cyl(0x2a2a2a, 0.45, 0.45, 0.06, -452.5, n, 0.75, 12); cyl(0x2a2a2a, 0.05, 0.05, 0.72, -452.5, n, 0.37, 6); for (const s of [-1, 1]) box(0x3b2a1e, 0.4, 0.45, 1.2, -452.5 + s * 0.9, n, 0.23); solid(-452.5, n, 2.2, 1.4); }
    if (L2) for (let i = 0; i < 5; i++) cyl(0x3f8a3a, 0.35, 0.2, 0.4, FE + 0.6, 425 + i * 5, 3.1, 8);
    jump('troll_cart', 'The Troll Cart', -440, 437, -458, 437, 0.12, 'market_gates'); info.troll = 1; });

  run('buses', () => { if (!L1) return; for (const [e, n, ry] of [[-490.5, 452, 0.05], [-506.5, 476, 0.2]]) for (const s of [-1, 1]) { const ox = Math.cos(ry) * 1.31 * s, on = -Math.sin(ry) * 1.31 * s;
      board('first', 3.2, 0.7, e + ox, n + on, 1.15, ry + (s > 0 ? E_ : W_), '#5b2a86', '#ffffff', 0.8); }
    for (const [e, n] of [[-497, 404], [-480, 401], [-460, 412], [-530, 392]]) { cyl(0x1f2a24, 0.32, 0.3, 1.0, e, n, 0.5, 10); info.bins++; } });

  run('lore', () => { // campfires stay as world lore (council bans beach fires; Bure Park has no fire pit) - plaques say so
    for (const [e, n, k, lbl] of [[420, 2650, 'campfire_beach', 'campfire beach (lore)'], [-754, 2910, 'campfire_bure', 'campfire Bure (lore)']]) {
      if (L1) { box(0x3a2a1c, 0.12, 1.0, 0.12, e + 5, n - 9, 0.5); board('LORE \u00b7 ' + (k === 'campfire_beach' ? 'DANCE OF THE ANCIENTS' : 'BURE PARK FIRE') + '\nnot a real fire site', 1.6, 0.8, e + 5.08, n - 9, 1.3, E_, '#2a1d12', '#f2d38a', 0.7); }
      jump(k, lbl, e + 9, n - 4, e, n, 0.05); }
    if (window.IE_V86_DANCE === false) return; const e = 420, n = 2650, R = 12; // ritual ring around the beach fire
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + 0.2, te = e + Math.cos(a) * R, tn = n + Math.sin(a) * R, h = 2.6 + (i % 3) * 0.5; cyl(0x7a6450, 0.22, 0.32, h, te, tn, h / 2, 7); box(0x5a4632, 1.1, 0.16, 0.16, te, tn, h - 0.4, -a);
      if (L1 && i % 3 === 0) { cyl(0x3a2a1c, 0.06, 0.06, 1.6, te * 0.92 + e * 0.08, tn * 0.92 + n * 0.08, 0.8, 5); cyl(0xff8a2a, 0, 0.16, 0.45, te * 0.92 + e * 0.08, tn * 0.92 + n * 0.08, 1.8, 6, { fog: false }); } }
    if (L2) for (let i = 0; i < 40; i++) { const t = i / 40, a = t * 6.283 * 2.2, r = 2.6 + t * 7; const s = cyl(0xefe6d2, 0.14, 0.14, 0.05, e + Math.cos(a) * r, n + Math.sin(a) * r, 0.04, 6); } // shell spiral in the sand
    info.dance = 1; });

  run('jumps', () => { const lg = () => { if (!PJ.lodge) return setTimeout(lg, 1000); const keep = PJ.lodge; jump('lodge', 'Royal Assembly Rooms (Lodge)', 0, 0, 0, 0, 0, 'tower_complex'); PJ.lodge = keep; }; lg(); // v81 eye-level spot kept; v86 restores the map button
    const g = () => { const w = fx.wheelGrp; if (!w) return setTimeout(g, 1000); const p = w.position, f = warp(-30, -278); PJ.giant_wheel = [f.x, f.z, [p.x, p.z, 0.35]];
      jump('giant_wheel', 'Sea Life Centre Gardens (Giant Wheel)', -30, -278, 16, -278, 0.35, 'pleasure_beach'); }; g(); });
  run('barnard', () => { if (window.IE_V86_BARNARD === false) return; const BE = -60, BN = 2236, TOP = 3.7, H = 8, RL = 14; // deck n 2228..2244 at y~3.7
    const ramps = []; for (const s of [-1, 1]) { const n0 = BN + s * H, n1 = n0 + s * RL, mid = (n0 + n1) / 2, ang = Math.atan2(TOP, RL), L = Math.hypot(TOP, RL);
      const m = box(0x5f8a3e, 9.4, 0.6, L, BE, mid, TOP / 2 - 0.3); m.rotation.set(-ang * s, 0, 0); ramps.push([n0, n1]); info.ramps++; }
    (window.__groundParts = window.__groundParts || []).push((x, z) => { const e = x, n = -z; if (Math.abs(e - BE) > 4.7) return null; for (const [n0, n1] of ramps) { const t = (n - n0) / (n1 - n0); if (t >= 0 && t <= 1) return TOP * (1 - t); } return null; });
    if (L1) { const se = BE + 7, sn = BN - H - RL - 2; for (const d of [-1.2, 1.2]) box(0x3a3d42, 0.1, 1.8, 0.1, se + d, sn, 0.9); board('BARNARD BRIDGE', 2.8, 0.7, se, sn, 2.0, 0, '#12355b', '#ffffff', 0.62); } });
  return { info };
}
