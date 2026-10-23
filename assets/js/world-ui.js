/* JHIOS world v59 — window manager: every window / pop-up gets a minimise button (plus its existing close) and, when minimised,
   a small restore chip in one chip dock (styled like the video mini player's controls). Also the controller focus mode:
   spatial navigation between a window's buttons / links with a clearly visible highlight (shared with keyboard :focus-visible).
   Windows (topmost first): welcome guide, jump map, queue, food basket popup, train stops menu, controller help,
   then the docked ones (video panel, playlist panel) and the on-screen HUD controls, which the controller only enters on R3. */
const q = s => document.querySelector(s), shown = el => !!el && !el.hidden && el.isConnected && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
export function initUI(api) {
  const css = document.createElement('style'); css.textContent = `
.wmin{position:absolute;top:6px;right:44px;z-index:5;width:34px;height:34px;border-radius:8px;border:1px solid #00e5ff;background:rgba(0,10,14,.9);color:#dffcff;font:700 1rem ui-monospace,monospace;cursor:pointer;line-height:1}
.wmin:hover,.wmin:focus-visible{background:#00e5ff;color:#001014}
.wmin.solo{right:6px}.wtrain-menu{position:fixed}.wtrain-menu .wmin{top:4px;right:4px;width:30px;height:30px}.wtrain-menu b{padding-right:38px!important}
.wpanel .pbody{position:relative}.wpanel .pbody .wmin{top:4px;right:4px}
.wchips{position:fixed;z-index:65;left:calc(.5rem + env(safe-area-inset-left));bottom:calc(var(--player-h,64px) + .6rem + env(safe-area-inset-bottom));display:flex;flex-wrap:wrap;gap:.35rem;max-width:calc(100vw - 1rem);pointer-events:none}
.wchips button{pointer-events:auto;min-height:36px;padding:0 .7rem;border-radius:18px;border:1px solid #00e5ff;background:rgba(0,10,14,.92);color:#dffcff;font:600 .75rem ui-monospace,monospace;letter-spacing:.06em;cursor:pointer;box-shadow:0 0 10px rgba(0,229,255,.25)}
.wchips button:hover{background:rgba(0,229,255,.25)}
body :is(button,a,input,select,[tabindex]):focus-visible{outline:3px solid #ffe14a!important;outline-offset:2px!important;box-shadow:0 0 0 6px rgba(255,225,74,.25)!important}
.gp-focus{outline:3px solid #ffe14a!important;outline-offset:2px!important;box-shadow:0 0 0 6px rgba(255,225,74,.3),0 0 16px rgba(255,225,74,.6)!important}
.wgp-mode{position:fixed;z-index:66;top:calc(.5rem + env(safe-area-inset-top));left:50%;transform:translateX(-50%);padding:.2rem .7rem;border-radius:12px;background:rgba(0,0,0,.78);border:1px solid #ffe14a;color:#ffe14a;font:600 .7rem ui-monospace,monospace;pointer-events:none}`;
  document.head.appendChild(css);
  const dock = document.createElement('div'); dock.className = 'wchips'; dock.setAttribute('aria-label', 'Minimised windows'); document.body.appendChild(dock);
  const mins = new Map(); // id -> saved state
  const W = [ // el(): the window element, open(), close(), min()/restore() default to hide/show
    { id: 'welcome', name: 'Guide', el: () => q('.wwel'), modal: true, close() { const e = this.el(); e.hidden = true; window.__welcomeOpen = false; } },
    { id: 'map', name: 'Map', el: () => q('#wmap'), modal: true, open: () => !!(window.__mapApi && __mapApi.open), close: () => __mapApi.closeMap(),
      min() { mins.set('map', __mapApi.state); __mapApi.closeMap(); }, restore() { const s = mins.get('map'); __mapApi.openMap(); if (s) __mapApi.state = s; }, anchor: '.wmap-close' },
    { id: 'queue', name: 'Queue', el: () => q('.queue'), modal: true, close: () => q('[data-a=queue]') && q('[data-a=queue]').click(), restore() { const b = q('[data-a=queue]'); if (b && this.el().hidden) b.click(); } },
    { id: 'food', name: 'Food basket', el: () => window.__foodCard, modal: true, close: () => { const c = window.__foodCard; if (c) c.hidden = true; } },
    { id: 'train', name: 'Train stops', el: () => q('.wtrain-menu'), modal: true, close() { this.el().hidden = true; const b = q('.wtrain .tstops'); b && b.setAttribute('aria-expanded', 'false'); },
      restore() { const b = q('.wtrain .tstops'); if (b && this.el().hidden) b.click(); } },
    { id: 'pad', name: 'Controller', el: () => q('.wgamepad'), modal: true, close() { const e = this.el(); e && e.remove(); } },
    { id: 'video', name: 'Video', el: () => q('.ytbox'), open: () => { const e = q('.ytbox'); return shown(e) && !e.classList.contains('closed') && !e.classList.contains('min'); },
      close: () => q('[data-a=ytstop]') && q('[data-a=ytstop]').click(), min: () => q('.ytbox .ytclose').click(), restore: () => q('.ytbox .ytexp').click(), nochip: true, own: true },
    { id: 'chat', name: 'Chat', el: () => q('.wchat'), close: () => window.__chat && __chat.close(), restore: () => window.__chat && __chat.open(false) },
    { id: 'playlist', name: 'Playlists', el: () => q('#pbody'), close: () => api.openPanel(false), min: () => api.openPanel(false), restore: () => api.openPanel(true) },
  ];
  const byId = id => W.find(w => w.id === id);
  const isOpen = w => w.open ? w.open() : shown(w.el());
  const minimise = id => { const w = byId(id); if (!w || !isOpen(w)) return false; if (w.min) w.min(); else { if (id !== 'map') mins.set(id, 1); w.el().hidden = true; } if (!w.nochip) { mins.set(id, mins.get(id) || 1); chips(); } return true; };
  const restore = id => { const w = byId(id); if (!w) return; if (w.restore) w.restore(); else { const e = w.el(); if (e) e.hidden = false; if (id === 'welcome') window.__welcomeOpen = true; } mins.delete(id); chips(); };
  const close = id => { const w = byId(id); if (w) { w.close(); mins.delete(id); chips(); } };
  function chips() { dock.innerHTML = ''; for (const id of mins.keys()) { const w = byId(id); if (!w || w.nochip) continue; const b = document.createElement('button'); b.type = 'button'; b.dataset.chip = id; b.textContent = '▴ ' + w.name; b.setAttribute('aria-label', 'Restore ' + w.name);
      b.addEventListener('pointerdown', e => e.stopPropagation()); b.addEventListener('click', e => { e.stopPropagation(); restore(id); }); dock.appendChild(b); } }
  const ensure = () => { for (const w of W) { if (w.own) continue; const e = w.el(); if (!e || e.querySelector('.wmin')) continue; if (getComputedStyle(e).position === 'static') e.style.position = 'relative';
      const b = document.createElement('button'); b.type = 'button'; b.className = 'wmin' + (w.id === 'map' || w.id === 'pad' || w.id === 'welcome' || w.id === 'chat' ? '' : ' solo'); b.textContent = '–'; b.title = 'Minimise'; b.setAttribute('aria-label', 'Minimise ' + w.name);
      b.addEventListener('pointerdown', ev => ev.stopPropagation()); b.addEventListener('click', ev => { ev.stopPropagation(); minimise(w.id); });
      if (w.id === 'map') b.style.right = '64px'; if (w.id === 'welcome') { (e.querySelector('.wwel-box') || e).style.position = 'relative'; (e.querySelector('.wwel-box') || e).appendChild(b); b.style.right = '6px'; b.classList.add('wmin'); continue; } e.appendChild(b); }
    for (const id of [...mins.keys()]) { const w = byId(id); if (w && isOpen(w)) { mins.delete(id); chips(); } } }; // reopened another way: drop its chip
  setInterval(ensure, 250); ensure();
  // ---- focus navigation ----
  const FOC = 'button,a[href],input,select,[tabindex]:not([tabindex="-1"])';
  const items = root => root ? [...root.querySelectorAll(FOC)].filter(e => !e.disabled && !e.closest('[hidden]') && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden') : [];
  const hud = { id: 'hud', name: 'Controls', items: () => [...document.querySelectorAll('.wtrain button,#ptoggle,.player button,.player input.seek,.wchips button,#minimap,.whelp,#daynight')].filter(e => !e.disabled && !e.hidden && e.getClientRects().length) };
  const st = { cur: null, win: null, entered: null };
  const top = () => { for (const w of W) if (w.modal && isOpen(w)) return w; if (st.entered === 'hud') return hud; if (st.entered && isOpen(byId(st.entered))) return byId(st.entered); st.entered = null; return null; };
  const list = w => w === hud ? hud.items() : items(w.el()).concat(w.id === 'video' ? items(q('.player .extra')) : []);
  const setFocus = el => { if (st.cur && st.cur !== el) st.cur.classList.remove('gp-focus'); st.cur = el; st.win = top(); if (el) { el.classList.add('gp-focus'); try { el.focus({ preventScroll: true }); } catch (_) {} el.scrollIntoView && el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } };
  const clear = () => { if (st.cur) st.cur.classList.remove('gp-focus'); st.cur = null; };
  const ctr = r => [r.left + r.width / 2, r.top + r.height / 2];
  const move = (dx, dy) => { const w = top(); if (!w) return; const L = list(w); if (!L.length) return; if (!st.cur || !L.includes(st.cur)) return setFocus(L.find(e => w.anchor && e.matches(w.anchor)) || L[0]);
    const [cx, cy] = ctr(st.cur.getBoundingClientRect()); let best = null, bd = 1e9;
    for (const e of L) { if (e === st.cur) continue; const [x, y] = ctr(e.getBoundingClientRect()), vx = x - cx, vy = y - cy, along = vx * dx + vy * dy; if (along <= 2) continue; const side = Math.abs(vx * dy - vy * dx), d = along + side * 2.5; if (d < bd) { bd = d; best = e; } }
    if (!best) { const i = L.indexOf(st.cur); best = L[(i + (dx + dy > 0 ? 1 : -1) + L.length) % L.length]; } setFocus(best); };
  const activate = () => { const w = top(); if (!w) return false; if (!st.cur || !list(w).includes(st.cur)) { move(0, 1); return true; } const el = st.cur; if (el.matches('input[type=checkbox]')) el.click(); else if (el.matches('input[type=range]')) return true; else el.click(); return true; };
  const adjust = d => { const el = st.cur; if (el && el.matches('input[type=range]')) { const step = (+el.max - +el.min) / 20 || 5; el.value = Math.max(+el.min, Math.min(+el.max, +el.value + d * step)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; } return false; };
  const scroll = dy => { const w = top(); if (!w) return; let e = st.cur || (w.el && w.el()); while (e && e !== document.body) { const cs = getComputedStyle(e); if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 2) { e.scrollTop += dy; return; } e = e.parentElement; }
    const r = w.el && w.el(); if (r) { const s = [...r.querySelectorAll('*')].find(x => /(auto|scroll)/.test(getComputedStyle(x).overflowY) && x.scrollHeight > x.clientHeight + 2); if (s) s.scrollTop += dy; } };
  const back = () => { const w = top(); if (!w) return false; if (w === hud) { st.entered = null; clear(); return true; } close(w.id); if (st.entered === w.id) st.entered = null; clear(); return true; };
  const minTop = () => { const w = top(); if (!w || w === hud) return false; minimise(w.id); if (st.entered === w.id) st.entered = null; clear(); return true; };
  const enter = () => { if (st.entered) { st.entered = null; clear(); return; } const v = byId('video'), p = byId('playlist'); st.entered = isOpen(p) ? 'playlist' : isOpen(v) ? 'video' : 'hud'; clear(); const L = list(top() || hud), tb = L.find(e => e.matches('.wtrain button')); if (st.entered === 'hud' && tb) setFocus(tb); else move(0, 1); }; // HUD: start on the train buttons when they are up
  const mode = document.createElement('div'); mode.className = 'wgp-mode'; mode.hidden = true; document.body.appendChild(mode);
  const showMode = (w, pad) => { if (w !== st.win) { clear(); st.win = w; } // focus starts fresh in each window
     const on = !!(w && pad); mode.hidden = !on; if (on) mode.textContent = `🎮 ${w.name}: D-pad / stick move · Ⓐ✕ select · Ⓑ○ back · View/Share minimise`; if (!w && st.cur) clear(); };
  return { W, hud, top, move, activate, adjust, scroll, back, minTop, enter, minimise, restore, close, isOpen: id => isOpen(byId(id)), mins, st, showMode, list, setFocus };
}
