/* JHIOS world v58 — Gamepad API support (standard mapping: Xbox, PlayStation, generic Bluetooth pads, Edge on Xbox).
   Everything routes into the SAME actions the keyboard / touch / mouse use (world.js passes them in): movement + look feed the
   same mv/st/turn/pitch sums as the touch sticks; buttons click the same DOM controls or call the same functions.
   Buttons are edge-triggered (one action per press); only movement / look / sprint act while held. */
const DZ = 0.15, dz = v => Math.abs(v) < DZ ? 0 : Math.sign(v) * (Math.abs(v) - DZ) / (1 - DZ);
const q = s => document.querySelector(s), vis = el => el && !el.hidden && el.offsetParent !== null;
const click = s => { const el = typeof s === 'string' ? q(s) : s; if (el && !el.disabled) { el.click(); return true; } return false; };
export function initGamepad(api) {
  const st = { mx: 0, my: 0, lx: 0, ly: 0, sprint: false, connected: false, prev: [], focus: -1, log: [] }; let ov = null;
  const act = (name, f) => { st.log.push(name); try { f(); } catch (e) { console.warn('gamepad', name, e); } };
  const overlay = pad => { if (ov) ov.remove(); ov = document.createElement('div'); ov.className = 'wgamepad'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Controller connected');
    ov.style.cssText = 'position:fixed;left:50%;top:max(56px,env(safe-area-inset-top));transform:translateX(-50%);z-index:70;width:min(380px,calc(100vw - 24px));padding:12px 14px;background:rgba(6,14,16,.94);border:1px solid #00ff9d;border-radius:12px;color:#c8ffe8;font:13px/1.45 ui-monospace,monospace;box-shadow:0 0 20px rgba(0,255,157,.3)';
    const R = (a, b) => `<tr><td style="color:#7dffd0;padding-right:10px;white-space:nowrap">${a}</td><td>${b}</td></tr>`;
    ov.innerHTML = `<b style="color:#00ff9d">🎮 Controller connected</b><div style="opacity:.7;font-size:11px;margin:2px 0 6px">${(pad && pad.id || '').replace(/</g, '').slice(0, 60)}</div><table style="border-collapse:collapse">`
      + R('Left stick / D-pad ↑↓', 'Move') + R('Right stick', 'Look / turn') + R('D-pad ←→', 'Turn · cycle nearby screens') + R('Ⓐ / ✕', 'Interact (play screen, popup, train)')
      + R('Ⓑ / ○', 'Back / close') + R('Ⓧ / □ (hold)', 'Sprint') + R('Ⓨ / △', 'Play / pause') + R('Menu / Options', 'Map') + R('View / Share', 'Minimise / restore video')
      + R('LB / L1 · RB / R1', 'Previous / next track') + R('LT / L2 · RT / R2', 'Volume − / +') + `</table><button type="button" class="wgp-x" style="margin-top:8px;width:100%;padding:8px;background:transparent;color:#c8ffe8;border:1px solid #2f6a55;border-radius:8px;cursor:pointer">Got it (Ⓑ / ○)</button>`;
    ov.querySelector('.wgp-x').onclick = () => { ov.remove(); ov = null; }; document.body.appendChild(ov); };
  addEventListener('gamepadconnected', e => { st.connected = true; overlay(e.gamepad); });
  addEventListener('gamepaddisconnected', () => { const any = [...(navigator.getGamepads ? navigator.getGamepads() : [])].some(Boolean); st.connected = any; if (!any) { st.mx = st.my = st.lx = st.ly = 0; st.sprint = false; } });
  const volStep = d => { const r = q('.ytbox .ytvol input'); if (!r) return; r.value = Math.max(0, Math.min(100, (+r.value || 0) + d)); r.dispatchEvent(new Event('input', { bubbles: true })); };
  const back = () => { // close whatever is on top: controller help, map, popup, train menu, video panel, playlist panel
    if (ov) { ov.remove(); ov = null; return; }
    if (window.__mapOpen && api.closeMap) return api.closeMap();
    const fc = window.__foodCard; if (fc && !fc.hidden) { fc.hidden = true; return; }
    const tm = q('.wtrain-menu'); if (tm && !tm.hidden) { click('.wtrain .tstops'); if (!tm.hidden) tm.hidden = true; return; }
    const yb = q('.ytbox'); if (yb && !yb.hidden && !yb.classList.contains('closed') && click('[data-a=ytstop]')) return;
    api.openPanel(false); };
  const ytMin = () => { const yb = q('.ytbox'); if (!yb || yb.hidden) return; if (yb.classList.contains('min') || yb.classList.contains('closed')) click('.ytbox .ytexp'); else click('.ytbox .ytclose'); };
  const interact = () => { const tb = q('.wtrain .tmain'); if (api.pickCentre()) return; if (tb && !tb.hidden) click(tb); };
  const cycle = d => { const L = api.nearScreens(); if (!L.length) return false; st.focus = (st.focus + d + L.length) % L.length; api.faceAt(L[st.focus]); return true; };
  const ACT = { 0: ['interact', interact], 1: ['back', back], 3: ['playpause', () => click('[data-a=toggle]')], 9: ['map', () => (window.__mapOpen ? api.closeMap() : api.openMap())],
    8: ['video-min', ytMin], 4: ['prev', () => click('[data-a=prev]')], 5: ['next', () => click('[data-a=next]')], 6: ['vol-', () => volStep(-10)], 7: ['vol+', () => volStep(10)] };
  st.poll = () => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : []; let p = null; for (const g of pads) if (g && g.connected !== false) { p = g; break; }
    if (!p) { st.mx = st.my = st.lx = st.ly = 0; st.sprint = false; return st; }
    if (!st.connected) { st.connected = true; overlay(p); } // some browsers only expose the pad after a press, without the event
    const ax = p.axes || [], B = i => { const b = p.buttons && p.buttons[i]; return !!b && (typeof b === 'object' ? (b.pressed || b.value > 0.5) : b > 0.5); };
    const dU = B(12), dD = B(13), dL = B(14), dR = B(15), near = api.nearScreens().length > 0;
    st.mx = dz(ax[0] || 0); st.my = -dz(ax[1] || 0) + (dU ? 1 : 0) - (dD ? 1 : 0); // up = forward, analogue speed
    st.lx = dz(ax[2] || 0) + (!near ? (dR ? 1 : 0) - (dL ? 1 : 0) : 0); st.ly = -dz(ax[3] || 0); st.sprint = B(2);
    const now = []; for (let i = 0; i < 16; i++) now[i] = B(i);
    for (const k in ACT) if (now[k] && !st.prev[k]) act(ACT[k][0], ACT[k][1]);
    if (near && now[14] && !st.prev[14]) act('focus-prev', () => cycle(-1)); if (near && now[15] && !st.prev[15]) act('focus-next', () => cycle(1));
    st.prev = now; return st; };
  return st;
}
