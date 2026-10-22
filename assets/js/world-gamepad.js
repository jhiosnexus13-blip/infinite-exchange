/* JHIOS world v58/v59 — Gamepad API support (standard mapping: Xbox, PlayStation, generic Bluetooth pads, Edge on Xbox).
   Everything routes into the SAME actions the keyboard / touch / mouse use (world.js passes them in): movement + look feed the
   same mv/st/turn/pitch sums as the touch sticks; buttons click the same DOM controls or call the same functions.
   v59: while a window is open (world-ui.js decides the topmost) the pad drives THAT window instead of walking: D-pad / left stick
   move a visible focus between its buttons, Ⓐ activates, Ⓑ closes / goes back, View/Share minimises, right stick / bumpers scroll.
   The jump map gets its own mode: left stick pans, triggers / right stick zoom, D-pad hops between pins, Ⓐ jumps to the cursor,
   bumpers step through the quick-jump buttons. R3 (or L3) enters / leaves the docked panels and on-screen controls (train buttons too).
   Buttons are edge-triggered (one action per press); only movement / look / sprint / pan / zoom / scroll act while held. */
const DZ = 0.15, dz = v => Math.abs(v) < DZ ? 0 : Math.sign(v) * (Math.abs(v) - DZ) / (1 - DZ);
const q = s => document.querySelector(s);
const click = s => { const el = typeof s === 'string' ? q(s) : s; if (el && !el.disabled) { el.click(); return true; } return false; };
export function initGamepad(api) {
  const ui = api.ui; const st = { mx: 0, my: 0, lx: 0, ly: 0, sprint: false, connected: false, prev: [], focus: -1, log: [], mode: 'walk', t: 0, rep: 0, lastDir: '', jb: -1 }; let ov = null;
  const act = (name, f) => { st.log.push(name); try { f(); } catch (e) { console.warn('gamepad', name, e); } };
  const isPS = id => /playstation|dualsense|dualshock|054c|ps[345]/i.test(id || '');
  const G = () => isPS(st.padId) ? { A: '✕', B: '○', X: '□', Y: '△', S: 'Options', V: 'Share', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2' } : { A: 'Ⓐ', B: 'Ⓑ', X: 'Ⓧ', Y: 'Ⓨ', S: 'Menu', V: 'View', LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT' };
  const overlay = pad => { st.padId = pad && pad.id; if (ov) ov.remove(); ov = document.createElement('div'); ov.className = 'wgamepad'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Controller connected');
    ov.style.cssText = 'position:fixed;left:50%;top:max(56px,env(safe-area-inset-top));transform:translateX(-50%);z-index:70;width:min(360px,calc(100vw - 24px));max-height:calc(100vh - 160px);overflow:auto;box-sizing:border-box;padding:12px 14px;background:rgba(6,14,16,.94);border:1px solid #00ff9d;border-radius:12px;color:#c8ffe8;font:14px/1.5 ui-monospace,monospace;box-shadow:0 0 20px rgba(0,255,157,.3)';
    const g = G(), R = (a, b) => `<tr><td style="color:#7dffd0;padding-right:12px;white-space:nowrap;font-weight:700">${a}</td><td>${b}</td></tr>`;
    ov.innerHTML = `<b style="color:#00ff9d">🎮 Controller connected</b><table style="border-collapse:collapse;margin-top:6px">`
      + R('Sticks', 'Left: walk · Right: look') + R(g.A, '<b>Do it</b>: play, open, ride the train, select') + R(g.B, 'Back / close') + R(g.S, 'Map') + `</table>`
      + `<details style="margin-top:6px;font-size:12px;opacity:.85"><summary style="cursor:pointer;color:#7dffd0">more</summary><table style="border-collapse:collapse">`
      + R(g.Y, 'Music play / pause') + R(g.X + ' hold', 'Run') + R(g.LB + ' / ' + g.RB, 'Skip track') + R(g.LT + ' / ' + g.RT, 'Volume') + R(g.V, 'Minimise video / window') + R('D-pad', 'Walk · ←→ nearby screens') + R('Click a stick', 'On-screen buttons')
      + `<tr><td colspan="2">In menus and the map: stick / D-pad move, ${g.A} select, ${g.B} back; map: triggers zoom.</td></tr></table></details>`
      + `<button type="button" class="wgp-x" style="margin-top:8px;width:100%;padding:8px;background:transparent;color:#c8ffe8;border:1px solid #2f6a55;border-radius:8px;cursor:pointer">Got it (${g.B})</button>`;
    ov.querySelector('.wgp-x').onclick = () => { ov.remove(); ov = null; }; for (const ev of ['pointerdown', 'wheel']) ov.addEventListener(ev, e => e.stopPropagation(), { passive: true }); document.body.appendChild(ov); };
  addEventListener('gamepadconnected', e => { st.connected = true; overlay(e.gamepad); });
  addEventListener('gamepaddisconnected', () => { const any = [...(navigator.getGamepads ? navigator.getGamepads() : [])].some(Boolean); st.connected = any; if (!any) { st.mx = st.my = st.lx = st.ly = 0; st.sprint = false; ui.showMode(null, false); } });
  const volStep = d => { const r = q('.ytbox .ytvol input'); if (!r) return; r.value = Math.max(0, Math.min(100, (+r.value || 0) + d)); r.dispatchEvent(new Event('input', { bubbles: true })); };
  const backWalk = () => { if (ui.isOpen('video')) return ui.close('video'); api.openPanel(false); }; // no window has focus: close the docked panels
  const ytMin = () => { const yb = q('.ytbox'); if (!yb || yb.hidden) return; if (yb.classList.contains('min') || yb.classList.contains('closed')) click('.ytbox .ytexp'); else click('.ytbox .ytclose'); };
  // v59: ONE 'do it' target, shared by the pointer highlight, the prompt and the action: what the centre pointer is over wins, else the train when near a stop / the train
  const train = () => { const tb = q('.wtrain .tmain'); return tb && !tb.hidden && tb.getClientRects().length ? tb : null; };
  const target = () => { const h = api.peekCentre(); if (h) return { label: h.label, run: () => api.pickCentre(h.hit) }; const tb = train(); if (tb) { const t = tb.textContent.replace(/[^\w\s]/g, '').trim().toLowerCase(); return { label: t.charAt(0).toUpperCase() + t.slice(1), run: () => tb.click() }; } return null; };
  const interact = () => { const t = target(); if (t) { st.lastDo = t.label; t.run(); } };
  st.doIt = interact;
  const cycle = d => { const L = api.nearScreens(); if (!L.length) return false; st.focus = (st.focus + d + L.length) % L.length; api.faceAt(L[st.focus]); return true; };
  const WALK = { 0: ['interact', interact], 1: ['back', backWalk], 3: ['playpause', () => click('[data-a=toggle]')], 9: ['map', () => api.openMap()],
    8: ['video-min', ytMin], 4: ['prev', () => click('[data-a=prev]')], 5: ['next', () => click('[data-a=next]')], 6: ['vol-', () => volStep(-10)], 7: ['vol+', () => volStep(10)], 10: ['enter-ui', () => ui.enter()], 11: ['enter-ui', () => ui.enter()] };
  // map: pins in screen space relative to the centre cursor
  const pinHop = (dx, dy) => { const P = (window.__mapApi && __mapApi.pins()) || []; let best = null, bd = 1e9; for (const p of P) { const along = p.sx * dx + p.sy * dy; if (along <= 4) continue; const side = Math.abs(p.sx * dy - p.sy * dx), d = along + side * 2; if (d < bd) { bd = d; best = p; } }
    if (best) { __mapApi.centreOn(best.x, best.z); __mapApi.setCursor(true, best.name); st.pin = best.k; } };
  const jumpBtn = d => { const L = [...document.querySelectorAll('#wmap .wmap-jumps button'), ...document.querySelectorAll('#wmap .wmap-close, #wmap .wmin')]; if (!L.length) return; st.jb = (st.jb + d + L.length) % L.length; ui.setFocus(L[st.jb]); };
  st.poll = () => {
    const now = performance.now(), dt = Math.min(0.1, (now - (st.t || now)) / 1000); st.t = now;
    const pads = navigator.getGamepads ? navigator.getGamepads() : []; let p = null; for (const g of pads) if (g && g.connected !== false) { p = g; break; }
    if (!p) { st.mx = st.my = st.lx = st.ly = 0; st.sprint = false; return st; }
    if (!st.connected) { st.connected = true; overlay(p); } st.padId = p.id;
    if ((p.buttons || []).some(b => b && (b.pressed || b.value > 0.5)) || (p.axes || []).some(a => Math.abs(a) > 0.3)) setKind('pad'); // some browsers only expose the pad after a press, without the event
    const ax = p.axes || [], BV = i => { const b = p.buttons && p.buttons[i]; return !b ? 0 : typeof b === 'object' ? (b.pressed ? Math.max(b.value || 0, 1) : b.value || 0) : b; }, B = i => BV(i) > 0.5;
    const now16 = []; for (let i = 0; i < 17; i++) now16[i] = B(i); const edge = i => now16[i] && !st.prev[i];
    const L0 = dz(ax[0] || 0), L1 = dz(ax[1] || 0), R0 = dz(ax[2] || 0), R1 = dz(ax[3] || 0);
    const w = ui.top(); ui.showMode(w, true);
    if (w && w.id === 'map') { st.mode = 'map'; st.mx = st.my = st.lx = st.ly = 0; st.sprint = false; const M = window.__mapApi;
      if (st.lastMode !== 'map') { M.setCursor(true, ''); st.jb = -1; }
      if (L0 || L1) { M.pan(L0 * 700 * dt, L1 * 700 * dt); M.setCursor(true, ''); st.pin = null; }
      const zf = (BV(7) - BV(6)) * 1.6 - R1 * 1.6; if (Math.abs(zf) > 0.05) M.zoom(Math.exp(zf * dt));
      if (edge(12)) act('map-pin-up', () => pinHop(0, -1)); if (edge(13)) act('map-pin-down', () => pinHop(0, 1)); if (edge(14)) act('map-pin-left', () => pinHop(-1, 0)); if (edge(15)) act('map-pin-right', () => pinHop(1, 0));
      if (edge(4)) act('map-jumpbtn-prev', () => jumpBtn(-1)); if (edge(5)) act('map-jumpbtn-next', () => jumpBtn(1));
      if (edge(0)) act('map-select', () => { const f = ui.st.cur; if (f && f.closest('#wmap') && st.jb >= 0) { f.click(); st.jb = -1; } else M.tapCentre(); });
      if (edge(1)) act('map-close', () => ui.back()); if (edge(8)) act('map-minimise', () => ui.minTop()); if (edge(9)) act('map-close', () => ui.back());
      if (edge(3)) act('playpause', () => click('[data-a=toggle]'));
    } else if (w) { st.mode = 'ui'; st.mx = st.my = st.lx = st.ly = 0; st.sprint = false;
      if (window.__mapApi && st.lastMode === 'map') __mapApi.setCursor(false);
      // direction from D-pad (edge) or left stick (with repeat while held)
      let dir = edge(12) ? 'u' : edge(13) ? 'd' : edge(14) ? 'l' : edge(15) ? 'r' : '';
      const sd = Math.abs(L1) > 0.55 && Math.abs(L1) >= Math.abs(L0) ? (L1 < 0 ? 'u' : 'd') : Math.abs(L0) > 0.55 ? (L0 < 0 ? 'l' : 'r') : '';
      const hd = sd || (now16[12] ? 'u' : now16[13] ? 'd' : now16[14] ? 'l' : now16[15] ? 'r' : '');
      if (dir) st.rep = now + 500; else if (hd) { if (hd !== st.lastDir) { dir = sd ? hd : ''; st.rep = now + 500; } else if (now > st.rep) { dir = hd; st.rep = now + 160; } } st.lastDir = hd;
      if (dir) act('focus-' + dir, () => { if ((dir === 'l' || dir === 'r') && ui.adjust(dir === 'l' ? -1 : 1)) return; ui.move(dir === 'l' ? -1 : dir === 'r' ? 1 : 0, dir === 'u' ? -1 : dir === 'd' ? 1 : 0); });
      if (edge(0)) act('activate', () => ui.activate()); if (edge(1)) act('ui-back', () => ui.back()); if (edge(8)) act('ui-minimise', () => ui.minTop());
      if (R1) ui.scroll(R1 * 900 * dt); if (edge(4)) act('scroll-up', () => ui.scroll(-220)); if (edge(5)) act('scroll-down', () => ui.scroll(220));
      if (edge(10) || edge(11)) act('leave-ui', () => ui.enter()); if (edge(9)) act('map', () => api.openMap()); if (edge(3)) act('playpause', () => click('[data-a=toggle]'));
      if (edge(6)) act('vol-', () => volStep(-10)); if (edge(7)) act('vol+', () => volStep(10));
    } else { st.mode = 'walk'; if (window.__mapApi && st.lastMode === 'map') __mapApi.setCursor(false);
      const dU = now16[12], dD = now16[13], dL = now16[14], dR = now16[15], near = api.nearScreens().length > 0;
      st.mx = L0; st.my = -L1 + (dU ? 1 : 0) - (dD ? 1 : 0); // up = forward, analogue speed
      st.lx = R0 + (!near ? (dR ? 1 : 0) - (dL ? 1 : 0) : 0); st.ly = -R1; st.sprint = now16[2];
      for (const k in WALK) if (edge(+k)) act(WALK[k][0], WALK[k][1]);
      if (near && edge(14)) act('focus-prev', () => cycle(-1)); if (near && edge(15)) act('focus-next', () => cycle(1)); }
    st.lastMode = st.mode; st.prev = now16; return st; };
  // ---- centre pointer (tiny SCR3WFAC3 mask) + context prompt ----
  const css = document.createElement('style'); css.textContent = `.waim{position:fixed;left:50%;top:50%;width:24px;height:24px;margin:-12px 0 0 -12px;z-index:25;pointer-events:none;color:#fff;opacity:.6;filter:drop-shadow(0 0 2px rgba(0,255,157,.55));transition:transform .15s,opacity .15s,color .15s,filter .15s}.waim svg{width:100%;height:100%;display:block;overflow:visible}
.waim.on{opacity:1;color:#00ff9d;transform:scale(1.3);filter:drop-shadow(0 0 3px #00ff9d) drop-shadow(0 0 7px #00ff9d)}.waim[hidden],.wprompt[hidden]{display:none}
.wprompt{position:fixed;left:calc(50% + 22px);top:50%;transform:translateY(-50%);z-index:25;pointer-events:none;padding:.15rem .55rem;border-radius:10px;background:rgba(0,10,8,.82);border:1px solid #00ff9d;color:#dfffee;font:600 .8rem ui-monospace,monospace;white-space:nowrap;max-width:46vw;overflow:hidden;text-overflow:ellipsis;box-shadow:0 0 10px rgba(0,255,157,.35)}
.wprompt b{color:#00ff9d;margin-right:.35rem}.wprompt.touch{left:50%;top:auto;bottom:calc(var(--player-h,64px) + 4.2rem + env(safe-area-inset-bottom));transform:translateX(-50%)}`; document.head.appendChild(css);
  const aim = document.createElement('div'); aim.className = 'waim'; aim.setAttribute('aria-hidden', 'true'); // inline, stroke-only cut-out reticle (same art as /assets/img/scr3wfac3-mask.svg): transparent everywhere but the lines
  aim.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M16 2.5c-6.2 0-10.5 4.6-10.5 11.2 0 6.9 4.3 13.8 10.5 15.8 6.2-2 10.5-8.9 10.5-15.8C26.5 7.1 22.2 2.5 16 2.5z" stroke-width="1.8"/><path d="M9.2 11.2l4.4 4.4M13.6 11.2l-4.4 4.4M18.4 11.2l4.4 4.4M22.8 11.2l-4.4 4.4" stroke-width="1.6"/><path d="M10.8 21.2c2.8 2.3 7.6 2.3 10.4 0" stroke-width="1.5"/><circle cx="7.6" cy="8.4" r=".9" fill="currentColor" stroke="none"/><circle cx="24.4" cy="8.4" r=".9" fill="currentColor" stroke="none"/><circle cx="16" cy="26.4" r=".8" fill="currentColor" stroke="none"/></svg>`;
  const pr = document.createElement('div'); pr.className = 'wprompt'; pr.hidden = true; pr.setAttribute('aria-live', 'polite'); document.body.append(aim, pr);
  const coarse = matchMedia('(pointer:coarse)').matches; let kind = coarse ? 'touch' : 'key';
  function setKind(k) { kind = k; }
  addEventListener('pointerdown', e => setKind(e.pointerType === 'touch' ? 'touch' : 'key'), { capture: true, passive: true }); addEventListener('keydown', () => setKind('key'), { capture: true });
  const glyph = () => kind === 'pad' ? (isPS(st.padId) ? '✕' : 'Ⓐ') : kind === 'touch' ? 'Tap' : 'Enter';
  const refresh = () => { const busy = !!ui.top() || window.__mapOpen || window.__welcomeOpen; const t = busy ? null : target(); st.target = t && t.label;
    aim.hidden = busy || (kind === 'touch' && !st.connected); aim.classList.toggle('on', !!t);
    pr.hidden = !t; if (t) { pr.classList.toggle('touch', kind === 'touch' && !st.connected); pr.innerHTML = `<b>${glyph()}</b>${t.label.replace(/</g, '&lt;')}`; } };
  setInterval(refresh, 150);
  // ---- keyboard parity: Enter = do it, Esc = back, M = map (world-fx), Space = music; E stays strafe-right (existing key) ----
  addEventListener('keydown', e => { if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.altKey || e.ctrlKey || e.metaKey) return; const onUi = e.target !== document.body && e.target.id !== 'scene' && e.target.tagName !== 'CANVAS';
    if (e.key === 'Enter' && !onUi && !ui.top() && !window.__mapOpen) { e.preventDefault(); interact(); }
    else if (e.key === 'Escape' && ui.top() && !window.__mapOpen && !window.__welcomeOpen) { e.preventDefault(); ui.back(); }
    else if (e.code === 'Space' && !onUi && !window.__mapOpen) { e.preventDefault(); click('[data-a=toggle]'); } });
  setInterval(() => { if (st.connected) st.poll(); }, 30); // v59: also sampled off the render loop so a short press is never lost on a slow frame
  return st;
}
