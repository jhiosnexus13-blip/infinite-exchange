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
.wwel-go:hover,.wwel-go:focus-visible{background:#fff;outline:none}.wwel-go:disabled{opacity:.45;cursor:not-allowed;background:#00ff9d}
.wwel label{display:flex;gap:.45rem;align-items:center;font-size:.72rem;color:#9cc;cursor:pointer;min-height:32px}.wwel input{width:18px;height:18px;accent-color:#00ff9d}
.whelp{position:fixed;z-index:31;top:calc(3.3rem + env(safe-area-inset-top));left:calc(.5rem + env(safe-area-inset-left));width:44px;height:44px;border-radius:50%;border:1px solid #00ff9d;background:rgba(0,0,0,.7);color:#00ff9d;font:700 1.1rem ui-monospace,monospace;cursor:pointer}
.wwel-kofi{display:block;margin:.7rem auto 0;width:max-content;font-size:.75rem;color:#9adfc4;opacity:.8;text-decoration:none;border-bottom:1px dotted currentColor}.wwel-kofi:hover,.wwel-kofi:focus-visible{opacity:1;color:#00ff9d}
.whelp:hover,.whelp:focus-visible{background:#00ff9d;color:#000;outline:none}
.whelp.docked{position:static;pointer-events:auto;flex:0 0 auto}
#hint{transition:opacity .8s}#hint.gone{opacity:0}.hud>*{background:rgba(1,8,6,.72);padding:.1rem .45rem;border-radius:8px}`;
  document.head.appendChild(css);
  const li = (ic, html) => `<li><span class="ic" aria-hidden="true">${ic}</span><span>${html}</span></li>`;
  const move = touch ? li('🕹', '<b>Move</b> with the left joystick, <b>look</b> with the right one or drag anywhere on the screen.')
                     : li('⌨', '<b>Move</b> with WASD or the arrow keys (Q / E to step sideways). <b>Look</b> by dragging with the mouse.');
  const tap = touch ? 'Tap' : 'Click';
  const el = document.createElement('div'); el.className = 'wwel'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'wwel-t');
  el.innerHTML = `<div class="wwel-box"><h2 id="wwel-t">WELCOME TO GREAT YARMOUTH // 3D</h2><p class="sub">A neon, real-scale Great Yarmouth with local music on every screen. Sign up to enter:</p>
<form class="wwel-form" style="display:grid;gap:.5rem;margin:.6rem 0">
  <label>Name (optional)<input type="text" name="name" maxlength="60" placeholder="Your name" style="width:100%;min-height:36px;padding:.3rem .5rem;border-radius:6px;border:1px solid #2f6a75;background:#02161b;color:#e8feff"></label>
  <label>Message (optional)<input type="text" name="message" maxlength="200" placeholder="Say something" style="width:100%;min-height:36px;padding:.3rem .5rem;border-radius:6px;border:1px solid #2f6a75;background:#02161b;color:#e8feff"></label>
  <label>Email <span style="color:#ff2e4d">*</span><input type="email" name="email" required maxlength="120" placeholder="you@example.com" style="width:100%;min-height:36px;padding:.3rem .5rem;border-radius:6px;border:1px solid #2f6a75;background:#02161b;color:#e8feff"></label>
  <p class="note" style="margin:0">Email is used for memberships, updates, and events only. We do not share it.</p>
</form>
<ul>
${move}
${li('▶', `<b>${tap} a glowing screen</b> or hologram to play its songs (YouTube, so turn your sound on). The ♫ PLAYLISTS button lists every track.`)}
${li('🗺', `<b>${tap} the minimap</b> (top right) to open the jump map, then ${touch ? 'tap' : 'click'} anywhere to jump there. ${touch ? 'Pinch' : 'Scroll'} to zoom the map.`)}
${li('🚂', `<b>Seafront train</b> runs from North Drive to the Harbour Mouth, stopping at Britannia Pier, Tower Complex, Wellington Pier and Pleasure Beach. At a stop press <b>RIDE TRAIN</b> (or ${tap.toLowerCase()} the train), choose a stop from <b>STOPS ▾</b>, and press <b>HOP OFF</b> to get out at the next stop.`)}
${li('☾', '<b>Sun / moon button</b> switches day and night. The weather is live Great Yarmouth weather.')}
${li('👥', 'Other visitors show up as <b>glowing silhouettes</b>, and the counter shows how many are here now. Nobody sees a name.')}
${li('💬', '<b>Chat</b>: press <b>T</b> (or the 💬 button) to chat. Everyone is an anonymous visitor-xxxx; links are removed.')}
${li('🎙', '<b>Voice notes</b>: hold <b>V</b>, the 🎙 button (press and hold on a phone) or LB + RB on a controller to record up to 15 s; let go to send. The mic is only on while you hold it.')}
${li('🎧', 'Headphones recommended.')}
${touch || small ? li('📱', `On a phone, landscape gives you more room.${lite ? '' : ' If it runs slowly, add <b>?lite=1</b> to the address for a lighter version.'}`) : ''}
</ul>
<div class="wwel-socials" hidden style="margin:.8rem 0;font-size:.78rem;line-height:1.4">
  <p style="margin:0 0 .4rem;color:#00ff9d">Follow the signals:</p>
  <p style="margin:0"><a href="https://www.facebook.com/joseph.hrabec" target="_blank" rel="noopener" style="color:#7dffd0">Joseph Hrabec (personal)</a> · <a href="https://www.facebook.com/greatyarmouthperjury" target="_blank" rel="noopener" style="color:#7dffd0">GYP</a><br>
  <a href="https://www.facebook.com/jhios" target="_blank" rel="noopener" style="color:#7dffd0">JHIOS</a> · <a href="https://www.youtube.com/@scr3wfac3gang" target="_blank" rel="noopener" style="color:#7dffd0">SCR3WFAC3 Music</a> · <a href="https://www.youtube.com/@luceAether" target="_blank" rel="noopener" style="color:#7dffd0">Luce Aether Music</a></p>
</div>
<p class="note">Live features (other visitors, chat and voice notes) work best on a stable Wi-Fi connection; mobile data may not connect. Messages and voice notes disappear after 30 minutes.</p>
<p class="note">Work in progress: more local artists are on the way.</p>
<button type="button" class="wwel-go" disabled>ENTER THE WORLD</button><label><input type="checkbox" class="wwel-off"> Don't show this again</label>${(window.JHIOS_CONFIG || {}).KOFI_URL ? `<a class="wwel-kofi" href="${JHIOS_CONFIG.KOFI_URL}" target="_blank" rel="noopener" title="${JHIOS_CONFIG.KOFI_LABEL}" aria-label="${JHIOS_CONFIG.KOFI_LABEL}">☕ Support on Ko-fi</a>` : ''}</div>`;
  const help = document.createElement('button'); help.type = 'button'; help.className = 'whelp'; help.textContent = '?'; help.setAttribute('aria-label', 'How to use the world'); help.title = 'Help';
  let off = false; try { off = localStorage.getItem(KEY) === '1'; } catch (_) {}
  const unlock = () => { try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) { const c = window.__jxAC || (window.__jxAC = new AC()); c.resume && c.resume(); const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } } catch (_) {} };
  const show = () => { el.hidden = false; el.querySelector('.wwel-off').checked = off; window.__welcomeOpen = true; setTimeout(() => el.querySelector('.wwel-go').focus(), 50); };
  const hide = () => { el.hidden = true; window.__welcomeOpen = false; const c = document.getElementById('scene'); c && c.focus({ preventScroll: true }); };
  const form = el.querySelector('.wwel-form');
  const emailInput = form.querySelector('[name=email]');
  const goBtn = el.querySelector('.wwel-go');
  const socials = el.querySelector('.wwel-socials');
  const validate = () => { const ok = emailInput.checkValidity() && emailInput.value.trim(); goBtn.disabled = !ok; };
  emailInput.addEventListener('input', validate);
  form.addEventListener('submit', e => e.preventDefault());
  goBtn.addEventListener('click', () => {
    if (goBtn.disabled) return;
    const data = { name: form.name.value.trim(), message: form.message.value.trim(), email: emailInput.value.trim() };
    try { localStorage.setItem('jx-member', JSON.stringify(data)); } catch (_) {}
    // simple log — later wire to /api/visitors or a dedicated endpoint
    console.log('member signup', data);
    socials.hidden = false;
    unlock();
    off = el.querySelector('.wwel-off').checked;
    try { off ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch (_) {}
    hide();
    hideHint();
  });
  el.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); e.stopPropagation(); });
  for (const n of [el, help]) n.addEventListener('pointerdown', e => e.stopPropagation());
  help.addEventListener('click', e => { e.stopPropagation(); show(); });
  // v42: the ? sits in the weather / day-night row (top right) so it never covers the playlists panel; falls back to its own corner until that row exists
  const dock = () => { const dn = document.getElementById('daynight'); if (!dn) return false; help.classList.add('docked'); dn.parentNode.appendChild(help); return true; };
  const hideHint = () => setTimeout(() => { const h = document.getElementById('hint'); if (h) h.classList.add('gone'); }, 9000); // the welcome screen covers the controls, so the top hint fades out
  const mount = () => { document.body.append(el, help); let n = 0; const iv = setInterval(() => { if (dock() || ++n > 60) clearInterval(iv); }, 250); if (off || /[?&]nowelcome=1/.test(location.search)) { el.hidden = true; window.__welcomeOpen = false; hideHint(); } else show(); };
  document.body ? mount() : addEventListener('DOMContentLoaded', mount);
})();
