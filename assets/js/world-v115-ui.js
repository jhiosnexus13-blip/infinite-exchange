/* v115: mobile HUD tidy. Joseph's v114 phone shots: chips stacked in the screen
   centre (ANONYMOUS OPERATOR, LOOK/SOLID/RICH, STOPS), weather + Chat/Hold over
   the minimap, and a big blurry dark disc in the view (near-camera digital-rain
   sprites under ACES, plus the old 800 m sky sphere). This pass:
     - collapses secondary controls into one Menu on touch
     - keeps the view centre clear and the joystick gutters clear
     - leaves the minimap alone in the top-right
   Flag: IE_V115_UI=false disables (v114 gutter CSS stays). */
export function initV115UI() {
  if (window.IE_V115_UI === false) return { off: true };

  const disableV114 = () => { const s = document.getElementById('v114-ui'); if (s) s.disabled = true; };
  disableV114(); setTimeout(disableV114, 200); setTimeout(disableV114, 1500);

  const css = document.createElement('style');
  css.id = 'v115-ui';
  css.textContent = `
/* sticks always on top of chrome, below full-screen map / welcome / office modal */
body.touch .stick{z-index:90!important;pointer-events:auto!important;width:104px;height:104px}
body.touch .stick .knob{width:44px;height:44px;margin:-22px 0 0 -22px}
/* SECONDARY CONTROLS: hidden on the free canvas; they live inside #v115panel */
body.touch #wlite,
body.touch .wchips,
body.touch .wtrain,
body.touch #v66op,
body.touch .wsoc,
body.touch #wxhud,
body.touch .wcredits,
body.touch .wpresence{display:none!important}
/* when hosted in the menu, undo fixed positioning so they stack as rows */
body.touch #v115panel #wlite,
body.touch #v115panel .wchips,
body.touch #v115panel .wtrain,
body.touch #v115panel #v66op,
body.touch #v115panel .wsoc,
body.touch #v115panel #wxhud,
body.touch #v115panel .wpresence{
  display:flex!important;position:static!important;transform:none!important;
  left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;
  max-width:100%!important;width:100%!important;margin:0 0 .45rem!important;
  z-index:auto!important;pointer-events:auto!important;flex-wrap:wrap
}
body.touch #v115panel #wxhud{align-items:center;gap:8px;font-size:12px}
body.touch #v115panel .wtrain{justify-content:flex-start}
body.touch #v115panel .wsoc{flex-direction:row;gap:.4rem}
body.touch #v115panel #v66op{justify-content:center}
/* menu button — top-left, under / beside the HUD, clear of minimap and sticks */
#v115btn{position:fixed;top:calc(env(safe-area-inset-top) + 3.15rem);left:calc(.5rem + env(safe-area-inset-left));
  z-index:55;min-width:44px;min-height:44px;padding:0 .85rem;border-radius:22px;
  border:1px solid #00ff9d;background:rgba(0,12,10,.92);color:#dfffe8;
  font:700 .78rem ui-monospace,monospace;letter-spacing:.08em;cursor:pointer;
  box-shadow:0 0 10px rgba(0,255,157,.25);touch-action:manipulation}
#v115btn[aria-expanded="true"]{background:#00ff9d;color:#00140c}
#v115panel{position:fixed;top:calc(env(safe-area-inset-top) + 6.1rem);left:calc(.5rem + env(safe-area-inset-left));
  z-index:80;width:min(312px,calc(100vw - 7.5rem));max-height:calc(100dvh - 280px - env(safe-area-inset-bottom));
  overflow:auto;padding:.7rem .7rem .85rem;border-radius:12px;
  border:1px solid #00ff9d88;background:rgba(0,10,12,.96);color:#dfffe8;
  font:.8rem/1.35 ui-monospace,monospace;box-shadow:0 8px 28px rgba(0,0,0,.55)}
#v115panel[hidden]{display:none!important}
#v115panel h3{margin:0 0 .55rem;font:700 .72rem ui-monospace,monospace;letter-spacing:.12em;color:#00ff9d}
#v115panel .v115x{position:absolute;top:6px;right:6px;width:36px;height:36px;border-radius:8px;
  border:1px solid #00ff9d88;background:transparent;color:#dfffe8;font:700 1.1rem/1 sans-serif;cursor:pointer}
/* minimap owns the top-right — nothing else sits there */
body.touch #minimap{top:calc(.5rem + env(safe-area-inset-top))!important;right:calc(.5rem + env(safe-area-inset-right))!important;
  width:96px!important;height:96px!important;z-index:40!important}
/* chat / train-stops menus: upper band, not centre, not stick gutters, not over minimap */
body.touch .wchat{top:calc(env(safe-area-inset-top) + 6.2rem)!important;left:calc(.5rem + env(safe-area-inset-left))!important;
  right:auto!important;bottom:auto!important;width:min(300px,calc(100vw - 8rem))!important;
  max-height:min(42vh,320px)!important;z-index:85!important}
body.touch .wtrain-menu{top:calc(env(safe-area-inset-top) + 6.2rem)!important;left:calc(.5rem + env(safe-area-inset-left))!important;
  right:auto!important;bottom:auto!important;transform:none!important;z-index:85!important;
  max-height:42vh;overflow:auto}
/* approach prompts + toasts sit in the upper third, never the view centre or gutters */
body.touch #v66act,body.touch #v114act{left:50%!important;top:calc(env(safe-area-inset-top) + 5.6rem)!important;
  bottom:auto!important;transform:translateX(-50%);z-index:55!important}
body.touch #v66p,body.touch #v114p,body.touch .whelp-box{top:18%!important;bottom:auto!important;
  max-height:calc(100dvh - 300px - env(safe-area-inset-bottom))!important;z-index:80!important}
body.touch .toast{top:calc(env(safe-area-inset-top) + 5.4rem)!important;bottom:auto!important;left:50%;transform:translateX(-50%)}
body.touch .wctl70{left:50%!important;right:auto!important;bottom:auto!important;
  top:calc(env(safe-area-inset-top) + 5.6rem)!important;transform:translateX(-50%);
  max-width:min(340px,86vw)!important;z-index:45!important}
body.touch.world .ytbox,body.world.touch .ytbox{top:calc(env(safe-area-inset-top) + 7.4rem)!important;
  left:calc(.5rem + env(safe-area-inset-left))!important;right:auto!important;bottom:auto!important;
  transform:none!important;width:min(180px,44vw)!important;z-index:48!important}
body.touch.world .ytbox.min{width:124px!important}
body.touch.world .queue{top:calc(env(safe-area-inset-top) + 7.4rem)!important;left:calc(.5rem + env(safe-area-inset-left))!important;
  right:auto!important;bottom:auto!important;max-height:36vh;z-index:49!important;width:min(280px,calc(100vw - 8rem))}
body.touch #v109office{bottom:42%!important}
body.touch .wcredits{display:none}
`;
  document.head.appendChild(css);

  const isTouch = () => document.body.classList.contains('touch') || matchMedia('(pointer:coarse)').matches || innerWidth <= 480;
  if (!document.getElementById('v115btn')) {
    const btn = document.createElement('button');
    btn.id = 'v115btn'; btn.type = 'button'; btn.textContent = 'MENU';
    btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'v115panel');
    btn.setAttribute('aria-label', 'Open controls menu');
    const panel = document.createElement('div');
    panel.id = 'v115panel'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Controls');
    panel.innerHTML = '<button class="v115x" type="button" aria-label="Close">×</button><h3>CONTROLS</h3><div class="v115body"></div>';
    const place = () => { if (!isTouch()) { btn.style.display = 'none'; panel.hidden = true; return; } btn.style.display = ''; };
    const close = () => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    const open = () => { gather(); panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); };
    btn.addEventListener('click', e => { e.stopPropagation(); panel.hidden ? open() : close(); });
    panel.querySelector('.v115x').addEventListener('click', e => { e.stopPropagation(); close(); });
    /* close when the player uses a stick, so the menu never sits over movement */
    document.addEventListener('pointerdown', e => { if (e.target && e.target.closest && e.target.closest('.stick')) close(); }, { passive: true });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    const body = panel.querySelector('.v115body');
    const gather = () => {
      const ids = ['#wlite', '.wchips', '#v66op', '.wtrain', '.wsoc', '#wxhud', '.wpresence'];
      ids.forEach(sel => {
        const el = document.querySelector(sel);
        if (el && el.closest('#v115panel') !== panel) body.appendChild(el);
      });
    };
    document.body.append(btn, panel);
    place(); gather();
    addEventListener('resize', place);
    /* late-created widgets (weather, operator, train, chat) */
    const mo = new MutationObserver(() => { disableV114(); if (!panel.hidden) gather(); });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(gather, 600); setTimeout(gather, 2000); setTimeout(gather, 5000);
  }

  /* auto-dismiss the welcome control hint so it doesn't linger in the view */
  const auto = (sel, ms) => { const el = document.querySelector(sel); if (!el || !isTouch()) return;
    setTimeout(() => { if (!el || !el.parentNode) return; const b = el.querySelector('button,[class*=x],.wmin'); if (b) b.click(); else el.style.display = 'none'; }, ms); };
  setTimeout(() => auto('.wctl70', 10000), 400);

  console.info('[IE] v115 UI: mobile controls collapsed into one menu; centre and sticks clear');
  return { ok: true };
}

/* Near-camera blob: hide the old 800 m neon sky sphere (it tracks the camera) and
   cull / disable digital-rain point sprites that bloom into a dark disc under ACES. */
export function tidyV115Fx(fx, CAM, T) {
  if (window.IE_V115_BLOB === false) return;
  if (fx.skyMesh) { fx.skyMesh.visible = false; }
  if (fx.rain && fx.rain.pts) {
    fx.rain.pts.visible = false; /* neon embers fight the photoreal ground and caused the centre orb */
    if (fx.rain.pts.material) { fx.rain.pts.material.toneMapped = false; fx.rain.pts.material.size = 0.08; }
  }
  if (fx.env && fx.env.state) {
    const E = fx.env.state;
    if (E.lampMat) { E.lampMat.toneMapped = false; E.lampMat.size = Math.min(E.lampMat.size || 2.6, 0.9); E.lampMat.sizeAttenuation = true; }
    if (E.strMat) { E.strMat.toneMapped = false; E.strMat.size = Math.min(E.strMat.size || 0.9, 0.45); E.strMat.sizeAttenuation = true; }
  }
}
