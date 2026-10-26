/* v66: art pass (wet road sheen, dirty-amber town lamps, optional grain), Operators MVP (optional local display name),
   plaza globe upgrades (example audience pins, top-regions panel, name-tag list, request box), arcade MVP, THE STACK room.
   All original JHIOS naming. Status: built (server pieces need a Netlify deploy to verify). */
const LS = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const BAD = /(fuck|shit|cunt|nigg|fag|rape|nazi|hitler|kill)/i;
export function initV66({ T, S, LBL, LITE, warp, fx, G, CAM, P: PL }) {
  const st = { lamps: 0, sheen: 0, names: 0, open: null };
  /* ---------- BATCH A: art ---------- */
  const at = (m, x, y, z) => (m.position.set(x, y, z), m);
  const near = (x, z, cx, cz, r) => (x - cx) ** 2 + (z - cz) ** 2 < r * r;
  const sheenMat = new T.MeshBasicMaterial({ color: 0x9db3c9, transparent: true, opacity: 0.08, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const lampMat = new T.PointsMaterial({ color: 0xd99a3c, size: LITE ? 2.6 : 3.4, sizeAttenuation: true, transparent: true, opacity: 0.0, depthWrite: false });
  const poolMat = new T.MeshBasicMaterial({ color: 0xb87a2a, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  function ribbon(pos, pts, w) { for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1, nx = -dz / L * w, nz = dx / L * w;
      pos.push(a.x + nx, 0.035, a.z + nz, a.x - nx, 0.035, a.z - nz, b.x + nx, 0.035, b.z + nz, b.x + nx, 0.035, b.z + nz, a.x - nx, 0.035, a.z - nz, b.x - nx, 0.035, b.z - nz); } }
  const sheen = [], lp = [], pools = [];
  const inTown = (e, n) => e > -820 && e < 40 && n > -650 && n < 760;          // town centre + Market Gates
  const calm = (e, n) => (e > -1000 && e < -500 && n > 2700) || e > 150;            // Bure Park / woods and beach side: no extra lamps
  if (G && G.roads) for (const r of G.roads) { const c = r[1]; if (!c || c.length < 4) continue; const pts = [];
    for (let i = 0; i < c.length; i += 2) pts.push([c[i], c[i + 1]]);
    const town = pts.some(([e, n]) => inTown(e, n)); if (!town) continue;
    const mg = pts.some(([e, n]) => e > -760 && e < -420 && n > 330 && n < 720); const W = pts.map(([e, n]) => warp(e, n));
    if (mg || pts.some(([e, n]) => e > -260 && n > -650 && n < 700)) ribbon(sheen, W, 2.4);
    let acc = 0, side = 1; for (let i = 0; i + 1 < pts.length; i++) { const [e0, n0] = pts[i], [e1, n1] = pts[i + 1], L = Math.hypot(e1 - e0, n1 - n0);
      for (let s = (30 - acc); s < L; s += 30) { const f = s / L, e = e0 + (e1 - e0) * f, n = n0 + (n1 - n0) * f; if (calm(e, n) || !inTown(e, n)) continue;
        const ox = -(n1 - n0) / L * 4.5 * side, oz = (e1 - e0) / L * 4.5 * side; side = -side; const p = warp(e + ox, n + oz); lp.push(p.x, 5.6, p.z); pools.push(p.x, p.z); }
      acc = (acc + L) % 30; } }
  const seaRoute = fx.route || []; // Golden Mile already has env lamps; add sheen only
  if (seaRoute.length) ribbon(sheen, seaRoute.map(p => (p.isVector3 ? p : new T.Vector3(p[0], 0, p[1]))), 3);
  const g = new T.Group(); g.name = 'v66-art'; S.add(g);
  if (sheen.length) { const ge = new T.BufferGeometry(); ge.setAttribute('position', new T.Float32BufferAttribute(sheen, 3)); const m = new T.Mesh(ge, sheenMat); m.renderOrder = 2; g.add(m); st.sheen = sheen.length / 18; }
  const MAXL = LITE ? 500 : 1400; if (lp.length / 3 > MAXL) { const k = Math.ceil(lp.length / 3 / MAXL), a = [], b = []; for (let i = 0; i < lp.length / 3; i += k) { a.push(lp[i * 3], lp[i * 3 + 1], lp[i * 3 + 2]); b.push(pools[i * 2], pools[i * 2 + 1]); } lp.length = 0; lp.push(...a); pools.length = 0; pools.push(...b); }
  if (lp.length) { const ge = new T.BufferGeometry(); ge.setAttribute('position', new T.Float32BufferAttribute(lp, 3)); g.add(new T.Points(ge, lampMat)); st.lamps = lp.length / 3;
    if (!LITE) { const pg = [], R = 4.2; for (let i = 0; i < pools.length; i += 2) { const x = pools[i], z = pools[i + 1]; for (let s = 0; s < 8; s++) { const a0 = s / 8 * 6.283, a1 = (s + 1) / 8 * 6.283; pg.push(x, 0.04, z, x + Math.cos(a1) * R, 0.04, z + Math.sin(a1) * R, x + Math.cos(a0) * R, 0.04, z + Math.sin(a0) * R); } }
      const ge2 = new T.BufferGeometry(); ge2.setAttribute('position', new T.Float32BufferAttribute(pg, 3)); const pm = new T.Mesh(ge2, poolMat); pm.renderOrder = 3; g.add(pm); } }
  // optional film grain, OFF by default; adjustable in the Operator panel (off / low / high)
  let grain = LS.get('jhios.grain') || 'off'; const gc = document.createElement('canvas'); gc.width = gc.height = 128;
  Object.assign(gc.style, { position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5, mixBlendMode: 'overlay', imageRendering: 'pixelated', display: 'none' }); document.body.appendChild(gc);
  const gx = gc.getContext('2d'), gimg = gx.createImageData(128, 128);
  const setGrain = v => { grain = v; LS.set('jhios.grain', v); gc.style.display = v === 'off' ? 'none' : 'block'; gc.style.opacity = v === 'high' ? 0.22 : 0.1; };
  setGrain(grain);
  /* ---------- UI shell ---------- */
  const css = document.createElement('style'); css.textContent = `
  .v66b{position:fixed;z-index:40;font:12px/1.3 ui-monospace,monospace;color:#cfe;background:#06110cdd;border:1px solid #1d6b4b;border-radius:8px;padding:6px 10px;cursor:pointer}
  .v66b:hover{border-color:#00ff9d}
  #v66op{left:10px;bottom:118px} #v66act{left:50%;bottom:86px;transform:translateX(-50%);display:none;border-color:#00ff9d;color:#00ff9d}
  #v66p{position:fixed;z-index:60;left:50%;top:50%;transform:translate(-50%,-50%);width:min(440px,94vw);max-height:84vh;overflow:auto;background:#050c09f2;border:1px solid #1d6b4b;border-radius:12px;padding:14px;color:#cfe;font:13px/1.45 ui-monospace,monospace;display:none}
  #v66p h3{margin:0 0 6px;color:#00ff9d;font-size:14px;letter-spacing:.08em} #v66p .x{float:right;cursor:pointer;color:#8aa} #v66p input,#v66p textarea{width:100%;box-sizing:border-box;background:#020604;color:#dfe;border:1px solid #1d6b4b;border-radius:6px;padding:6px;font:inherit}
  #v66p button{background:#0b2a1d;color:#cfe;border:1px solid #1d6b4b;border-radius:6px;padding:5px 9px;margin:4px 4px 0 0;font:inherit;cursor:pointer} #v66p .m{color:#8aa;font-size:11px} #v66p .tag{display:inline-block;margin:2px;padding:1px 6px;border:1px solid #234;border-radius:9px} #v66p .tag.me{border-color:#00ff9d}
  #v66p canvas{width:100%;background:#000;border:1px solid #1d6b4b;border-radius:6px;touch-action:none}`; document.head.appendChild(css);
  const el = (h) => { const d = document.createElement('div'); d.innerHTML = h; return d.firstElementChild; };
  const esc = s => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const P = el('<div id="v66p" role="dialog"></div>'); document.body.appendChild(P);
  let gameStop = null; const close = () => { P.style.display = 'none'; st.open = null; if (gameStop) gameStop(), gameStop = null; };
  const open = (id, html) => { if (gameStop) gameStop(), gameStop = null; st.open = id; P.innerHTML = '<span class="x" title="close">✕</span>' + html; P.style.display = 'block'; P.querySelector('.x').onclick = close; try { document.exitPointerLock && document.exitPointerLock(); } catch {} };
  addEventListener('keydown', e => { if (e.key === 'Escape' && st.open) close(); });
  /* ---------- Operators MVP ---------- */
  let sid = LS.get('jhios.opsid'); if (!/^[a-z0-9]{8,24}$/.test(sid || '')) { sid = Array.from(crypto.getRandomValues(new Uint8Array(14)), b => (b % 36).toString(36)).join(''); LS.set('jhios.opsid', sid); }
  const op = () => LS.get('jhios.operator') || { name: null };
  const okName = n => /^[\p{L}\p{N}][\p{L}\p{N} ._-]{1,19}$/u.test(n) && !BAD.test(n);
  const opBtn = el('<div class="v66b" id="v66op" title="Operator profile (optional)"></div>'); document.body.appendChild(opBtn);
  const opLabel = () => { opBtn.textContent = '◉ ' + (op().name ? 'OPERATOR ' + op().name : 'ANONYMOUS OPERATOR'); }; opLabel();
  function opPanel(msg) { const o = op(); open('op', `<h3>OPERATOR // SIGN-ON</h3>
    <p>Every visitor is an Operator. You are already one: anonymous by default, no account, no email, no real name.
    Operators move between the layers of the world: the streets you walk, the archive under them, the signal that ties them together.
    A call-sign is optional and only lives in this browser until you add it to the plaza name list yourself.</p>
    <p class="m">Lore text is a JHIOS placeholder until Joseph's manifesto copy is supplied.</p>
    <label>Call-sign (optional, 2-20 chars)<input id="v66n" maxlength="20" value="${esc(o.name || '')}" placeholder="leave blank to stay anonymous"></label>
    <button id="v66s">SAVE</button><button id="v66c">CLEAR MY NAME</button><div class="m" id="v66m">${esc(msg || '')}</div>
    <h3 style="margin-top:12px">CAMERA FX</h3><span class="m">Film grain:</span> ${['off', 'low', 'high'].map(v => `<button data-g="${v}"${grain === v ? ' style="border-color:#00ff9d"' : ''}>${v}</button>`).join('')}`);
    P.querySelector('#v66s').onclick = () => { const n = P.querySelector('#v66n').value.trim(); if (!n) { LS.set('jhios.operator', null); opLabel(); return opPanel('Anonymous. Nothing saved.'); } if (!okName(n)) return opPanel('Use 2-20 letters, numbers, space . _ - and keep it clean.'); LS.set('jhios.operator', { name: n }); opLabel(); opPanel('Saved in this browser only.'); };
    P.querySelector('#v66c').onclick = () => { LS.set('jhios.operator', null); opLabel(); opPanel('Cleared. You are anonymous.'); };
    P.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { setGrain(b.dataset.g); opPanel(); }); }
  opBtn.onclick = () => opPanel();
  /* ---------- Globe: example audience pins + glow + panels ---------- */
  let regions = [], example = true; const GB = window.__globe; let halo = null;
  if (GB) { const pins = new T.Group(); GB.globe.add(pins); halo = new T.Mesh(new T.SphereGeometry(GB.R * 1.08, 24, 16), new T.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.03, depthWrite: false, side: T.BackSide })); GB.globe.add(halo);
    fetch('/assets/data/audience-regions.json', { cache: 'no-store' }).then(r => (r.ok ? r.json() : Promise.reject())).catch(() => fetch('/assets/data/audience-regions.example.json?v=76').then(r => r.json())).then(d => {
      example = !!d.example; regions = (d.regions || []).filter(r => isFinite(r.lat) && isFinite(r.lon) && r.value > 0).sort((a, b) => b.value - a.value); const max = regions[0] ? regions[0].value : 1;
      for (const r of regions) { const s = 0.1 + 0.25 * Math.sqrt(r.value / max), m = new T.Mesh(new T.OctahedronGeometry(s), new T.MeshBasicMaterial({ color: 0xffb347 })); m.position.copy(GB.toVec(r.lat, r.lon, GB.R + 0.25)); pins.add(m); }
      if (example && LBL) { try { const l = LBL('PLACEHOLDER DATA · REAL ANALYTICS PENDING', '#ffb347'); if (l) { l.scale.multiplyScalar(0.3); l.position.set(GB.globe.position.x, 1.4, GB.globe.position.z + 5.5); S.add(l); } } catch {} } }).catch(() => {}); }
  const api = (u, o) => fetch(u, o).then(r => r.json().then(d => (r.ok ? d : Promise.reject(d.error || 'error'))));
  function refreshNames(q = '') { return api('/api/names?sid=' + sid + '&q=' + encodeURIComponent(q)).then(d => { st.names = d.total; return d; }); }
  refreshNames().catch(() => {});
  function globePanel(tab = 'regions', msg = '') {
    const head = `<h3>PLAZA GLOBE</h3><div>${['regions', 'names', 'request'].map(t => `<button data-t="${t}"${t === tab ? ' style="border-color:#00ff9d"' : ''}>${t === 'regions' ? 'TOP REGIONS' : t === 'names' ? 'NAME LIST' : 'REQUEST BOX'}</button>`).join('')}</div><div id="v66g" style="margin-top:8px"></div><div class="m" id="v66m">${esc(msg)}</div>`;
    open('globe', head); P.querySelectorAll('[data-t]').forEach(b => b.onclick = () => globePanel(b.dataset.t)); const box = P.querySelector('#v66g'), say = t => (P.querySelector('#v66m').textContent = t);
    if (tab === 'regions') { const tot = regions.reduce((s, r) => s + r.value, 0) || 1;
      box.innerHTML = (example ? '<p style="color:#ffb347">EXAMPLE DATA: placeholder regions, not real viewers. Joseph pastes country-level aggregates from YouTube Studio.</p>' : '<p class="m">Country-level aggregates only, pasted from YouTube Studio. No individual viewers.</p>') +
        regions.slice(0, 10).map((r, i) => `<div>${i + 1}. ${esc(r.name)} <span class="m">${Math.round(r.value / tot * 100)}%</span></div>`).join('') + '<p class="m">Live presence dots (green) are separate: they come from visitors in the world now.</p>'; }
    if (tab === 'names') { box.innerHTML = `<p>Add a display name to the plaza list. The globe glows brighter as the list grows. Real names are never needed; you can remove yours any time.</p>
      <input id="v66nm" maxlength="24" placeholder="display name" value="${esc(op().name || '')}"><button id="v66add">ADD / REPLACE MINE</button><button id="v66rm">REMOVE MINE</button>
      <input id="v66q" placeholder="search names" style="margin-top:8px"><div id="v66l" class="m">loading…</div>`;
      const L = box.querySelector('#v66l'), show = q => refreshNames(q).then(d => { L.innerHTML = `<div>${d.total} name${d.total === 1 ? '' : 's'} on the list</div>` + d.names.map(x => `<span class="tag${x.mine ? ' me' : ''}">${esc(x.n)}</span>`).join(''); }).catch(() => (L.textContent = 'Name list is offline here (needs the Netlify function).'));
      show(''); let tq; box.querySelector('#v66q').oninput = e => { clearTimeout(tq); tq = setTimeout(() => show(e.target.value.trim()), 300); };
      box.querySelector('#v66add').onclick = () => { const n = box.querySelector('#v66nm').value.trim(); if (!okName(n)) return say('Use 2-20 letters, numbers, space . _ - and keep it clean.');
        api('/api/names', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sid, name: n }) }).then(() => (say('Added.'), show(''))).catch(e => say(String(e))); };
      box.querySelector('#v66rm').onclick = () => api('/api/names', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sid }) }).then(() => (say('Removed.'), show(''))).catch(e => say(String(e))); }
    if (tab === 'request') { box.innerHTML = `<p>Ask for something in the world: a place, a sound, a game. Requests go to Joseph for review. Nothing is built automatically and requests are not shown publicly.</p>
      <textarea id="v66rq" rows="3" maxlength="200" placeholder="e.g. light up the old pier at night"></textarea><button id="v66send">SEND REQUEST</button><p class="m">Please don't include personal details or addresses.</p>`;
      box.querySelector('#v66send').onclick = () => { const x = box.querySelector('#v66rq').value.trim(); if (x.length < 4) return say('A few more words please.');
        api('/api/requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sid, text: x, name: op().name || undefined }) }).then(() => { box.querySelector('#v66rq').value = ''; say('Sent for review. Thank you, Operator.'); }).catch(e => say(String(e) === 'error' ? 'Request box is offline here.' : String(e))); }; }
  }
  /* ---------- Arcade MVP ---------- */
  const ARC = warp(-51, -995); // Pleasure Beach arcade strip (pleasure-beach.json arcade line)
  function arcadePanel() { open('arcade', `<h3>JHIOS ARCADE</h3><p class="m">Original mini-games. Tap/click or press Space. Scores stay in this browser.</p><button data-a="react">SIGNAL CATCH</button><button data-a="run">NEON RUNNER</button><div id="v66ga" style="margin-top:8px"></div>`);
    P.querySelectorAll('[data-a]').forEach(b => b.onclick = () => game(b.dataset.a)); }
  function game(kind) { if (gameStop) gameStop(), gameStop = null; const box = P.querySelector('#v66ga'); box.innerHTML = '<canvas width="400" height="220"></canvas><div class="m" id="v66sc"></div>';
    const c = box.querySelector('canvas'), x = c.getContext('2d'), sc = box.querySelector('#v66sc'), best = LS.get('jhios.arc.' + kind) || 0; let raf, alive = true, tap = false;
    const hit = e => { e.preventDefault(); tap = true; }; c.addEventListener('pointerdown', hit); const key = e => { if (e.code === 'Space' && st.open === 'arcade') { e.preventDefault(); e.stopPropagation(); tap = true; } }; addEventListener('keydown', key, true);
    gameStop = () => { alive = false; cancelAnimationFrame(raf); removeEventListener('keydown', key, true); };
    const save = s => { if (s > (LS.get('jhios.arc.' + kind) || 0)) LS.set('jhios.arc.' + kind, s); };
    if (kind === 'react') { let phase = 'wait', go = performance.now() + 1000 + Math.random() * 2500, t0 = 0, msg = 'Wait for GREEN, then tap.', rounds = [], tb = 0;
      const loop = now => { if (!alive) return; if (phase === 'wait' && now > go) phase = 'go', t0 = now;
        if (tap) { tap = false; if (phase === 'wait') { msg = 'Too early. Signal lost.'; go = now + 1200 + Math.random() * 2500; } else if (phase === 'go') { const ms = Math.round(now - t0); rounds.push(ms); msg = ms + ' ms'; phase = rounds.length >= 5 ? 'done' : 'wait'; go = now + 900 + Math.random() * 2500; if (phase === 'done') { const avg = Math.round(rounds.reduce((a, b) => a + b) / 5); tb = Math.max(0, 1000 - avg); save(tb); msg = 'Average ' + avg + ' ms, score ' + tb + '. Tap to retry.'; } } else { rounds = []; phase = 'wait'; go = now + 1000 + Math.random() * 2500; msg = 'Wait for GREEN, then tap.'; } }
        x.fillStyle = phase === 'go' ? '#00ff9d' : '#071a12'; x.fillRect(0, 0, 400, 220); x.fillStyle = phase === 'go' ? '#000' : '#cfe'; x.font = '18px monospace'; x.textAlign = 'center'; x.fillText(phase === 'go' ? 'NOW' : msg, 200, 110); x.font = '12px monospace'; x.fillText('round ' + Math.min(rounds.length + 1, 5) + '/5', 200, 200);
        sc.textContent = 'best ' + Math.max(best, LS.get('jhios.arc.react') || 0); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); }
    else { let y = 0, vy = 0, obs = [], sp = 4, score = 0, dead = false, last = performance.now(), spawn = 0;
      const loop = now => { if (!alive) return; const d = Math.min(3, (now - last) / 16.7); last = now;
        if (tap) { tap = false; if (dead) { obs = []; score = 0; sp = 4; dead = false; } else if (y <= 0) vy = 9.5; }
        if (!dead) { vy -= 0.55 * d; y = Math.max(0, y + vy * d); if (y === 0) vy = 0; spawn -= d; if (spawn <= 0) { obs.push({ x: 410, h: 18 + Math.random() * 26 }); spawn = 40 + Math.random() * 50; } sp += 0.002 * d; score += d * 0.2;
          for (const o of obs) { o.x -= sp * d; if (o.x < 70 && o.x > 30 && y < o.h) { dead = true; save(Math.floor(score)); } } obs = obs.filter(o => o.x > -20); }
        x.fillStyle = '#050c09'; x.fillRect(0, 0, 400, 220); x.strokeStyle = '#1d6b4b'; x.beginPath(); x.moveTo(0, 190); x.lineTo(400, 190); x.stroke();
        x.fillStyle = '#00ff9d'; x.fillRect(40, 170 - y, 20, 20); x.fillStyle = '#b48cff'; for (const o of obs) x.fillRect(o.x, 190 - o.h, 14, o.h);
        x.fillStyle = '#cfe'; x.font = '13px monospace'; x.textAlign = 'left'; x.fillText('score ' + Math.floor(score), 10, 20); if (dead) { x.textAlign = 'center'; x.fillText('CRASHED. Tap to run again.', 200, 100); }
        sc.textContent = 'best ' + Math.max(best, LS.get('jhios.arc.run') || 0); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); } }
  // arcade cabinet marker
  const cab = new T.Group(); cab.position.set(ARC.x, 0, ARC.z); S.add(cab);
  cab.add(at(new T.Mesh(new T.BoxGeometry(1.2, 2, 0.9), new T.MeshBasicMaterial({ color: 0x1a0f2e })), 0, 1, 0));
  const scr = new T.Mesh(new T.PlaneGeometry(0.9, 0.6), new T.MeshBasicMaterial({ color: 0x00ff9d })); scr.position.set(0, 1.5, 0.46); cab.add(scr);
  try { const l = LBL && LBL('JHIOS ARCADE · PLAY', '#00ff9d'); if (l) { l.position.set(ARC.x, 3, ARC.z); S.add(l); } } catch {}
  /* ---------- THE STACK (layered-systems room) ---------- */
  const HP = warp(156, 288); const hatch = new T.Group(); hatch.position.set(HP.x, 0, HP.z); S.add(hatch);
  hatch.add(at(new T.Mesh(new T.BoxGeometry(2.2, 0.08, 2.2), new T.MeshBasicMaterial({ color: 0x1b2420 })), 0, 0.04, 0));
  const hr = new T.Mesh(new T.TorusGeometry(1.25, 0.05, 6, 32), new T.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.6 })); hr.rotation.x = -Math.PI / 2; hr.position.y = 0.1; hatch.add(hr);
  try { const l = LBL && LBL('THE STACK · ACCESS HATCH', '#00ff9d'); if (l) { l.position.set(HP.x, 2.4, HP.z); S.add(l); } } catch {}
  function stackPanel() { open('stack', `<h3>THE STACK // LAYER MAP</h3><p class="m">A fictional JHIOS access hatch. This explains how the world is built in layers. Original lore, not a real place.</p>
    <p><b style="color:#00ff9d">L0 · STREET</b> The town you walk: Yarmouth's roads, seafront and markets drawn from open map data. Everyone starts here.</p>
    <p><b style="color:#00ff9d">L1 · SIGNAL</b> Live presence. Other Operators show as dots, chat lines and voice notes. Anonymous unless you choose a call-sign.</p>
    <p><b style="color:#00ff9d">L2 · ARCHIVE</b> The music catalogue under the streets. Tracks are pinned only where Joseph has confirmed a place; the rest wait in the vault, unplaced.</p>
    <p><b style="color:#00ff9d">L3 · OPERATORS</b> Optional call-signs, the plaza name list and the request box. Operators suggest; Joseph reviews; nothing is auto-built.</p>
    <p><b style="color:#00ff9d">L4 · FICTION</b> Hatches like this one and the Assembly Rooms plate mark story layers: versions of reality that sit on top of the real map and never claim to be it.</p>
    <p class="m">Status: built (panel). Deeper rooms: vision.</p>`); }
  /* ---------- proximity action button ---------- */
  const act = el('<div class="v66b" id="v66act"></div>'); document.body.appendChild(act); let cur = null;
  const spots = () => [GB && { id: 'globe', p: GB.globe.position, r: 16, t: 'PLAZA GLOBE · regions / names / requests', f: () => globePanel() }, { id: 'arcade', p: ARC, r: 9, t: 'JHIOS ARCADE · PLAY', f: arcadePanel }, { id: 'stack', p: HP, r: 7, t: 'OPEN THE STACK', f: stackPanel }].filter(Boolean);
  act.onclick = () => cur && cur.f();
  addEventListener('keydown', e => { if (e.code !== 'KeyF' || !cur || st.open) return; const a = document.activeElement; if (a && /INPUT|TEXTAREA/.test(a.tagName)) return; cur.f(); });
  let acc = 0;
  return { st, open: id => ({ globe: globePanel, arcade: arcadePanel, stack: stackPanel, op: opPanel })[id](), close,
    update(t, dt) { const E = fx.env && fx.env.state, night = E ? 1 - (E.day ?? 1) : 0.3, rain = E ? (E.rain || 0) : 0;
      sheenMat.opacity = 0.05 + 0.1 * rain + 0.05 * night; lampMat.opacity = 0.15 + 0.8 * night; poolMat.opacity = 0.11 * night;
      hr.material.opacity = 0.4 + 0.3 * Math.sin(t * 2); scr.material.color.setHSL(0.42 + 0.05 * Math.sin(t * 3), 1, 0.5);
      if (halo) halo.material.opacity = Math.min(0.5, 0.03 + Math.log10(1 + st.names) * 0.12);
      if (grain !== 'off' && (acc += dt) > 0.08) { acc = 0; const a = gimg.data; for (let i = 0; i < a.length; i += 4) { const v = Math.random() * 255; a[i] = a[i + 1] = a[i + 2] = v; a[i + 3] = 255; } gx.putImageData(gimg, 0, 0); }
      const p = (PL && (PL.pos || PL.position)) || (CAM && CAM.getWorldPosition(new T.Vector3())); if (!p) return; cur = null; for (const s of spots()) if (near(p.x, p.z, s.p.x, s.p.z, s.r)) { cur = s; break; }
      act.style.display = cur && !st.open ? 'block' : 'none'; if (cur) act.textContent = '[F] ' + cur.t; } };
}
