/* JHIOS site v59 — controller support for the non-world pages (index, vault, privacy, 404). Gamepad API, standard mapping.
   D-pad / left stick: move a visible focus ring between links and buttons (spatial navigation); Ⓐ/✕ activate; Ⓑ/○ close an open
   overlay (video panel, queue) or go back; right stick / bumpers scroll; Start/Options = go to /world. Keyboard Tab / Enter unchanged. */
(() => {
  const css = document.createElement('style'); css.textContent = `.gp-focus,body :is(a,button,input,select,summary,[tabindex]):focus-visible{outline:3px solid #ffe14a!important;outline-offset:2px!important;box-shadow:0 0 0 6px rgba(255,225,74,.28)!important}`;
  document.head.appendChild(css);
  const DZ = 0.15, dz = v => Math.abs(v) < DZ ? 0 : Math.sign(v) * (Math.abs(v) - DZ) / (1 - DZ);
  const S = { prev: [], cur: null, t: 0, rep: 0, last: '', log: [] }; window.__sitePad = S;
  const vis = e => !e.disabled && !e.closest('[hidden]') && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const overlays = () => [...document.querySelectorAll('.queue,.ytbox')].filter(e => !e.hidden && !e.classList.contains('closed') && !e.classList.contains('min') && e.getClientRects().length);
  const root = () => { const o = document.querySelector('.queue:not([hidden])'); return o && o.getClientRects().length ? o : document; };
  const items = () => [...root().querySelectorAll('a[href],button,input,select,summary,[tabindex]:not([tabindex="-1"])')].filter(vis);
  const set = el => { if (S.cur) S.cur.classList.remove('gp-focus'); S.cur = el; if (el) { el.classList.add('gp-focus'); try { el.focus({ preventScroll: true }); } catch (_) {} el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } };
  const c = r => [r.left + r.width / 2, r.top + r.height / 2];
  const move = (dx, dy) => { const L = items(); if (!L.length) return; if (!S.cur || !L.includes(S.cur)) { const vp = L.find(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }); return set(vp || L[0]); }
    const [x0, y0] = c(S.cur.getBoundingClientRect()); let best = null, bd = 1e9;
    for (const e of L) { if (e === S.cur) continue; const [x, y] = c(e.getBoundingClientRect()), vx = x - x0, vy = y - y0, al = vx * dx + vy * dy; if (al <= 2) continue; const d = al + Math.abs(vx * dy - vy * dx) * 2.5; if (d < bd) { bd = d; best = e; } }
    if (best) set(best); else if (dy) scrollBy(0, dy * 200); };
  const back = () => { const q = document.querySelector('.queue:not([hidden])'); if (q) { const b = document.querySelector('[data-a=queue]'); if (b) return b.click(); q.hidden = true; return; }
    const yb = document.querySelector('.ytbox'); if (yb && !yb.hidden && !yb.classList.contains('closed') && !yb.classList.contains('min')) { const b = yb.querySelector('.ytclose'); if (b) return b.click(); }
    if (history.length > 1) history.back(); };
  const act = (n, f) => { S.log.push(n); try { f(); } catch (e) { console.warn('pad', e); } };
  const poll = () => { const pads = navigator.getGamepads ? navigator.getGamepads() : []; let p = null; for (const g of pads) if (g && g.connected !== false) { p = g; break; } if (!p) return;
    const now = performance.now(), dt = Math.min(0.1, (now - (S.t || now)) / 1000); S.t = now;
    const B = i => { const b = p.buttons && p.buttons[i]; return !!b && (b.pressed || b.value > 0.5); }, N = []; for (let i = 0; i < 17; i++) N[i] = B(i); const E = i => N[i] && !S.prev[i];
    const ax = p.axes || [], L0 = dz(ax[0] || 0), L1 = dz(ax[1] || 0), R1 = dz(ax[3] || 0);
    let dir = E(12) ? 'u' : E(13) ? 'd' : E(14) ? 'l' : E(15) ? 'r' : '';
    const sd = Math.abs(L1) > 0.55 && Math.abs(L1) >= Math.abs(L0) ? (L1 < 0 ? 'u' : 'd') : Math.abs(L0) > 0.55 ? (L0 < 0 ? 'l' : 'r') : '', hd = sd || (N[12] ? 'u' : N[13] ? 'd' : N[14] ? 'l' : N[15] ? 'r' : '');
    if (dir) S.rep = now + 500; else if (hd) { if (hd !== S.last) { dir = sd ? hd : ''; S.rep = now + 500; } else if (now > S.rep) { dir = hd; S.rep = now + 160; } } S.last = hd;
    if (dir) act('focus-' + dir, () => move(dir === 'l' ? -1 : dir === 'r' ? 1 : 0, dir === 'u' ? -1 : dir === 'd' ? 1 : 0));
    if (E(0)) act('activate', () => { if (!S.cur || !items().includes(S.cur)) move(0, 1); else S.cur.click(); });
    if (E(1)) act('back', back); if (E(9)) act('world', () => { location.href = '/world'; });
    if (R1) scrollBy(0, R1 * 1100 * dt); if (E(4)) act('scroll-up', () => scrollBy(0, -innerHeight * 0.6)); if (E(5)) act('scroll-down', () => scrollBy(0, innerHeight * 0.6));
    if (E(3)) act('playpause', () => { const b = document.querySelector('[data-a=toggle]'); b && b.click(); });
    S.prev = N; };
  setInterval(poll, 30);
})();
