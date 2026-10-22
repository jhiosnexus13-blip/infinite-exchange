/* JHIOS world v41 — welcome / how-to screen shown before entering the world. "Don't show again" is kept in localStorage;
   the ? button in the HUD reopens it. Enter also unlocks audio (a user gesture), so the first tap on a screen plays straight away. */
(() => {
  const KEY = 'jx-welcome-off', touch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
  const small = Math.min(screen.width, screen.height) <= 820, lite = /[?&]lite=1/.test(location.search);
  const css = document.createElement('style'); css.textContent = `
.wwel{position:fixed;inset:0;z-index:2000;background:rgba(1,6,5,.94);display:flex;align-items:center;justify-content:center;padding:calc(.8rem + env(safe-area-inset-top)) .8rem calc(.8rem + env(safe-area-inset-bottom));font-family:ui-monospace,Menlo,Consolas,monospace;color:#cfeee2}
.wwel[hidden]{display:none}.wwel-box{width:min(560px,100%);max-height:100%;overflow:auto;border:1px solid #00ff9d;box-shadow:0 0 24px rgba(0,255,157,.25);background:#020a08;padding:1rem 1.1rem;border-radius:6px}
.wwel h2{margin:0 0 .2rem;font-size:1.05rem;letter-spacing:.12em;color:#00ff9d;text-shadow:2px 0 #ff2e4d,-2px 0 #00e5ff}.wwel .sub{margin:0 0 .7rem;font-size:.72rem;color:#7fa99a}
.wwel ul{list-style:none;margin:0;padding:0;display:grid;gap:.42rem;font-size:.78rem;line-height:1.35}.wwel li{display:grid;grid-template-columns:1.7rem 1fr;gap:.3rem}.wwel li b{color:#fff}.wwel .ic{text-align:center}
.wwel .note{margin:.7rem 0 0;font-size:.68rem;color:#7fa99a}.wwel-go{display:block;width:100%;min-height:54px;margin:.9rem 0 .5rem;border:2px solid #00ff9d;border-radius:28px;background:#00ff9d;color:#001a10;font:700 1rem ui-monospace,monospace;letter-spacing:.1em;cursor:pointer}
.wwel-go:hover,.wwel-go:focus-visible{background:#fff;outline:none}.wwel label{display:flex;gap:.45rem;align-items:center;font-size:.72rem;color:#9cc;cursor:pointer;min-height:32px}.wwel input{width:18px;height:18px;accent-color:#00ff9d}
.whelp{position:fixed;z-index:31;top:calc(3.3rem + env(safe-area-inset-top));left:calc(.5rem + env(safe-area-inset-left));width:44px;height:44px;border-radius:50%;border:1px solid #00ff9d;background:rgba(0,0,0,.7);color:#00ff9d;font:700 1.1rem ui-monospace,monospace;cursor:pointer}
.whelp:hover,.whelp:focus-visible{background:#00ff9d;color:#000;outline:none}`;
  document.head.appendChild(css);
  const li = (ic, html) => `<li><span class="ic" aria-hidden="true">${ic}</span><span>${html}</span></li>`;
  const move = touch ? li('🕹', '<b>Move</b> with the left joystick, <b>look</b> with the right one or drag anywhere on the screen.')
                     : li('⌨', '<b>Move</b> with WASD or the arrow keys (Q / E to step sideways). <b>Look</b> by dragging with the mouse.');
  const tap = touch ? 'Tap' : 'Click';
  const el = document.createElement('div'); el.className = 'wwel'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'wwel-t');
  el.innerHTML = `<div class="wwel-box"><h2 id="wwel-t">WELCOME TO GREAT YARMOUTH // 3D</h2><p class="sub">A neon, real-scale Great Yarmouth with local music on every screen. Quick guide:</p><ul>
${move}
${li('▶', `<b>${tap} a glowing screen</b> or hologram to play its songs (YouTube, so turn your sound on). The ♫ PLAYLISTS button lists every track.`)}
${li('🗺', `<b>${tap} the minimap</b> (top right) to open the jump map, then ${touch ? 'tap' : 'click'} anywhere to jump there. ${touch ? 'Pinch' : 'Scroll'} to zoom the map.`)}
${li('🚂', `<b>Seafront train</b> runs from North Drive to the Harbour Mouth, stopping at Britannia Pier, Tower Complex, Wellington Pier and Pleasure Beach. At a stop press <b>RIDE TRAIN</b> (or ${tap.toLowerCase()} the train), choose a stop from <b>STOPS ▾</b>, and press <b>HOP OFF</b> to get out at the next stop.`)}
${li('☾', '<b>Sun / moon button</b> switches day and night. The weather is live Great Yarmouth weather.')}
${li('👥', 'Other visitors show up as <b>glowing silhouettes</b>, and the counter shows how many are here now. Nobody sees a name.')}
${li('🎧', 'Headphones recommended.')}
${touch || small ? li('📱', `On a phone, landscape gives you more room.${lite ? '' : ' If it runs slowly, add <b>?lite=1</b> to the address for a lighter version.'}`) : ''}
</ul><p class="note">Some live features, like seeing other visitors (and voice chat, coming soon), work best on Wi-Fi for now; mobile data may not connect.</p>
<p class="note">Work in progress: more local artists are on the way.</p>
<button type="button" class="wwel-go">ENTER THE WORLD</button><label><input type="checkbox" class="wwel-off"> Don't show this again</label></div>`;
  const help = document.createElement('button'); help.type = 'button'; help.className = 'whelp'; help.textContent = '?'; help.setAttribute('aria-label', 'How to use the world'); help.title = 'Help';
  let off = false; try { off = localStorage.getItem(KEY) === '1'; } catch (_) {}
  const unlock = () => { try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) { const c = window.__jxAC || (window.__jxAC = new AC()); c.resume && c.resume(); const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } } catch (_) {} };
  const show = () => { el.hidden = false; el.querySelector('.wwel-off').checked = off; window.__welcomeOpen = true; setTimeout(() => el.querySelector('.wwel-go').focus(), 50); };
  const hide = () => { el.hidden = true; window.__welcomeOpen = false; const c = document.getElementById('scene'); c && c.focus({ preventScroll: true }); };
  el.querySelector('.wwel-go').addEventListener('click', () => { unlock(); off = el.querySelector('.wwel-off').checked; try { off ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch (_) {} hide(); });
  el.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); e.stopPropagation(); });
  for (const n of [el, help]) n.addEventListener('pointerdown', e => e.stopPropagation());
  help.addEventListener('click', e => { e.stopPropagation(); show(); });
  const mount = () => { document.body.append(el, help); if (off || /[?&]nowelcome=1/.test(location.search)) { el.hidden = true; window.__welcomeOpen = false; } else show(); };
  document.body ? mount() : addEventListener('DOMContentLoaded', mount);
})();
