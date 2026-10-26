/* JHIOS world — spawn help model (Joseph).
   Loads the portrait from assets/img/joseph-help.b64.txt, places a simple sprite/figure at spawn,
   and opens a scrollable help window on interact ("Ask For Help"). */
export function initHelp(o) {
  const { T, S, P, fx } = o;
  const helpGroup = new T.Group();
  helpGroup.name = 'joseph-help';
  helpGroup.position.set(P.pos.x, 0, P.pos.z - 4); // slightly in front of spawn
  S.add(helpGroup);

  // Load portrait as sprite for now (evolves to video later)
  let portraitSprite = null;
  (async () => {
    try {
      const r = await fetch('/assets/img/joseph-help.b64.txt');
      if (!r.ok) return;
      const b64 = await r.text();
      const img = new Image();
      img.src = 'data:image/jpeg;base64,' + b64.trim();
      await new Promise(res => { img.onload = res; img.onerror = res; });
      const tex = new T.Texture(img); tex.needsUpdate = true;
      const mat = new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
      portraitSprite = new T.Sprite(mat);
      portraitSprite.scale.set(1.8, 2.4, 1);
      portraitSprite.position.set(0, 1.6, 0);
      helpGroup.add(portraitSprite);
      // Label
      const label = labelSprite('Ask For Help', '#00ff9d', 0.6);
      label.position.set(0, 3.2, 0);
      helpGroup.add(label);
    } catch (_) {}
  })();

  // Help window
  const css = document.createElement('style');
  css.textContent = `
.whelp-box{position:fixed;z-index:40;left:50%;top:50%;transform:translate(-50%,-50%);width:min(480px,92vw);max-height:80vh;background:rgba(0,10,14,.96);border:1px solid #00ff9d;border-radius:12px;color:#d4ded9;font:.85rem/1.45 ui-monospace,monospace;box-shadow:0 0 24px rgba(0,255,157,.3);display:flex;flex-direction:column}
.whelp-box[hidden]{display:none}
.whelp-box .hd{padding:.6rem 1rem;font-weight:700;color:#00ff9d;letter-spacing:.08em;border-bottom:1px solid rgba(0,255,157,.3)}
.whelp-box .body{flex:1;overflow-y:auto;padding:1rem}
.whelp-box img{width:100%;max-height:220px;object-fit:cover;border-radius:6px;margin-bottom:.8rem}
.whelp-box .x{position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:8px;border:1px solid #00ff9d;background:rgba(0,10,14,.9);color:#00ff9d;font:700 1.1rem ui-monospace,monospace;cursor:pointer}
.whelp-box h3{margin:.4rem 0 .2rem;color:#00ff9d}
.whelp-box p{margin:.4rem 0}
`;
  document.head.appendChild(css);

  const box = document.createElement('div');
  box.className = 'whelp-box';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.innerHTML = `
    <div class="hd">ASK FOR HELP</div>
    <button class="x" aria-label="Close">×</button>
    <div class="body">
      <img alt="Joseph" src="">
      <h3>Joseph Hrabec · JHIOS</h3>
      <p>Welcome to the Infinite Exchange 3D world. I’m Joseph. This is a living archive and signal space built outside the usual platforms.</p>
      <h3>How to move</h3>
      <p>WASD or arrow keys to walk. Drag to look. On mobile use the on-screen sticks. Space or tap to interact with holograms, playlists, and people.</p>
      <h3>What you can do</h3>
      <p>Walk the lanes. Play tracks. Chat with others (public or private). Customise your silhouette name, colour, and male/female form. Ask for help here anytime.</p>
      <h3>Tips</h3>
      <p>Target another visitor to see their details and open a private chat. Your choices are saved locally. The world is still growing — more video explanations and placements are coming.</p>
      <p>Let the great work continue.</p>
    </div>`;
  document.body.appendChild(box);

  const imgEl = box.querySelector('img');
  const closeBtn = box.querySelector('.x');
  closeBtn.addEventListener('click', () => { box.hidden = true; });

  // Interaction: simple distance check for now (can be upgraded to raycast)
  let helpOpen = false;
  function checkInteract() {
    if (!portraitSprite) return;
    const dist = P.pos.distanceTo(helpGroup.position);
    if (dist < 3.5 && !helpOpen) {
      // auto or on key — for now expose an API
    }
  }

  const api = {
    open() {
      if (portraitSprite && imgEl && !imgEl.src) imgEl.src = portraitSprite.material.map.image.src;
      box.hidden = false;
      helpOpen = true;
    },
    close() { box.hidden = true; helpOpen = false; },
    get isOpen() { return !box.hidden; }
  };

  // Temporary: press H near spawn to open (will be replaced by proper targeting)
  addEventListener('keydown', e => {
    if (e.code === 'KeyH' && !e.repeat && P.pos.distanceTo(helpGroup.position) < 6) api.open();
  });

  fx.help = api;
  return { update: checkInteract, api };
}

function labelSprite(text, color = '#00ff9d', h = 1.1) {
  const c = document.createElement('canvas'), g = c.getContext('2d'), F = '600 36px ui-monospace,Menlo,Consolas,monospace';
  g.font = F; const w = Math.ceil(g.measureText(text).width) + 20; c.width = Math.min(1024, w); c.height = 56;
  g.font = F; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = color; g.shadowBlur = 6;
  g.fillText(text, c.width / 2, 28);
  const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
  s.scale.set(h * c.width / 56, h, 1); return s;
}
