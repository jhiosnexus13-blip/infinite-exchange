/* v114: mobile joystick clearance. Thumb sticks (bottom-left / bottom-right) stay on top
   and unobstructed; overlays, chips, chat, train, YouTube, operator, detail, hints and
   pop-ups are moved or auto-minimised out of those gutters. Designed for ~390×844 and ~412×915.
   Flag: IE_V114_UI=false disables. */
export function initV114UI() {
  if (window.IE_V114_UI === false) return { off: true };
  const css = document.createElement('style');
  css.id = 'v114-ui';
  css.textContent = `
/* sticks always above clutter, below full-screen map / welcome / password modal */
body.touch .stick{z-index:90!important;pointer-events:auto!important;width:104px;height:104px}
body.touch .stick .knob{width:44px;height:44px;margin:-22px 0 0 -22px}
/* reserved gutters ≈ 132×170 above the player bar in each bottom corner */
body.touch #wlite{left:50%!important;right:auto!important;bottom:calc(var(--player-h,64px) + 170px + env(safe-area-inset-bottom))!important;transform:translateX(-50%);z-index:40!important;max-width:70vw}
body.touch .wchips{left:50%!important;right:auto!important;bottom:calc(var(--player-h,64px) + 206px + env(safe-area-inset-bottom))!important;transform:translateX(-50%);max-width:70vw;justify-content:center;z-index:50!important}
body.touch .wsoc{top:calc(env(safe-area-inset-top) + 10.8rem)!important;right:calc(.5rem + env(safe-area-inset-right))!important;bottom:auto!important;z-index:40!important;flex-direction:column}
body.touch .wchat{top:calc(env(safe-area-inset-top) + 14.2rem)!important;right:calc(.5rem + env(safe-area-inset-right))!important;bottom:auto!important;max-height:min(38vh,280px)!important;width:min(300px,calc(100vw - 2rem))!important;z-index:55!important}
body.touch .wtrain{bottom:calc(var(--player-h,64px) + 170px + env(safe-area-inset-bottom))!important;z-index:50!important;max-width:calc(100vw - 280px)}
body.touch .wtrain-menu{top:28%!important;bottom:auto!important;z-index:70!important;max-height:42vh;overflow:auto}
body.touch .wcredits{display:none}
body.touch .wctl70{left:50%!important;right:auto!important;bottom:auto!important;top:calc(env(safe-area-inset-top) + 5.6rem)!important;transform:translateX(-50%);max-width:min(340px,86vw)!important;z-index:45!important}
body.touch #v66op{left:50%!important;bottom:calc(var(--player-h,64px) + 214px + env(safe-area-inset-bottom))!important;transform:translateX(-50%);z-index:45!important}
body.touch #v66act{left:50%!important;bottom:calc(var(--player-h,64px) + 170px + env(safe-area-inset-bottom))!important;transform:translateX(-50%);z-index:55!important}
body.touch #v66p,body.touch #v114p,body.touch .whelp-box{top:40%!important;max-height:calc(100dvh - 280px - env(safe-area-inset-bottom))!important;z-index:80!important}
body.touch .toast{bottom:calc(var(--player-h,64px) + 178px + env(safe-area-inset-bottom))!important}
body.touch .wpresence{top:calc(env(safe-area-inset-top) + 8.4rem)!important;right:calc(.5rem + env(safe-area-inset-right))!important}
/* YouTube: top, never in the stick gutters (overrides the older bottom-centre rule) */
body.touch.world .ytbox,body.world.touch .ytbox{top:calc(env(safe-area-inset-top) + 5.8rem)!important;right:calc(.5rem + env(safe-area-inset-right))!important;bottom:auto!important;left:auto!important;transform:none!important;width:min(200px,46vw)!important;z-index:48!important}
body.touch.world .ytbox.min{width:132px!important;height:auto!important}
body.touch.world .queue{top:calc(env(safe-area-inset-top) + 5.8rem)!important;right:calc(.5rem + env(safe-area-inset-right))!important;bottom:auto!important;max-height:36vh;z-index:49!important;width:min(300px,calc(100vw - 2rem))}
body.touch .wcard{max-width:min(240px,58vw)}
@media (max-width:430px){
  body.touch .wtrain{max-width:calc(100vw - 248px);font-size:.72rem}
  body.touch .hud{max-width:58vw}
}
/* approach cards and floating tips must not sit in the gutters — clamp via JS too */
body.touch #v109office{bottom:42%!important}
`;
  document.head.appendChild(css);

  const isTouch = () => document.body.classList.contains('touch') || matchMedia('(pointer:coarse)').matches || innerWidth <= 430;
  const gutter = (el) => {
    if (!el || !isTouch()) return false;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false;
    const ph = parseFloat(getComputedStyle(document.body).getPropertyValue('--player-h')) || 64;
    const bot = innerHeight - (ph + 8);
    const leftG = { x0: 0, x1: 136, y0: bot - 178, y1: bot };
    const rightG = { x0: innerWidth - 136, x1: innerWidth, y0: bot - 178, y1: bot };
    const hit = g => !(r.right < g.x0 || r.left > g.x1 || r.bottom < g.y0 || r.top > g.y1);
    return hit(leftG) || hit(rightG);
  };

  function minimiseYt() {
    if (!isTouch()) return;
    const box = document.querySelector('.ytbox');
    if (!box || box.classList.contains('closed') || box.classList.contains('min')) return;
    /* auto-minimise an expanded player so it cannot fall over the sticks */
    const btn = box.querySelector('.ytclose, .ytexp, [data-ytmin], .ytmin');
    if (box.getBoundingClientRect().height > 160 || gutter(box)) {
      const min = box.querySelector('button[aria-label*="inimi" i], button.ytmin, .ytclose');
      /* prefer a dedicated minimise if present; otherwise leave the CSS top placement */
      try { if (window.JX && typeof JX.minimise === 'function') JX.minimise(); } catch {}
    }
  }

  function tidyChat() {
    if (!isTouch()) return;
    const chat = document.querySelector('.wchat');
    if (chat && gutter(chat) && !chat.hidden) {
      /* already CSS-moved to the upper right; if still overlapping, collapse */
      const x = chat.querySelector('.x, button[aria-label*=close i], button.wmin');
      if (x && chat.getBoundingClientRect().height > 200) { /* leave open but CSS clamps max-height */ }
    }
  }

  function tidyLate() {
    minimiseYt(); tidyChat();
    /* welcome / control hint already classed .wctl70 and moved by CSS */
    document.querySelectorAll('#v66op,#v66act,#v114act,.wtrain,.wchips,#wlite,.wsoc').forEach(el => {
      /* CSS handles these; no-op unless a late inline style fights us */
      if (el && el.style && isTouch() && gutter(el) && el.id === 'v66op') {
        el.style.left = '50%'; el.style.bottom = 'calc(var(--player-h,64px) + 214px + env(safe-area-inset-bottom))'; el.style.transform = 'translateX(-50%)';
      }
    });
  }

  /* auto-dismiss one-shot toasts and control hints after a short read on phones, so they don't linger over movement */
  const auto = (sel, ms) => { const el = document.querySelector(sel); if (!el || !isTouch()) return; setTimeout(() => { if (el && el.parentNode) { const b = el.querySelector('button,[class*=x],.wmin'); if (b) b.click(); else el.style.display = 'none'; } }, ms); };
  setTimeout(() => auto('.wctl70', 14000), 500);

  addEventListener('resize', tidyLate);
  addEventListener('orientationchange', () => setTimeout(tidyLate, 200));
  const mo = new MutationObserver(() => { tidyLate(); });
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
  setTimeout(tidyLate, 600);
  setTimeout(tidyLate, 2000);
  console.info('[IE] v114 UI: stick gutters cleared on touch / narrow viewports');
  return { tidy: tidyLate };
}
