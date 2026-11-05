/* JHIOS world v109 — L2-only lean facade texture pack (phones stay L0/L1).
   Gate: only loaded when window.__detail >= 2 and IE_L2_FACADES !== false.
   Sources (licensed-free / clearly reusable):
   - Procedural canvas brick + render (no remote fetch on phones path) — inspired by
     ambientCG Brick / Plaster CC0 patterns (https://ambientcg.com/ — CC0 1.0).
   - Optional remote albedo (desktop L2 only, IE_L2_REMOTE_TEX !== false):
     Poly Haven "brick_4" 1k diffuse, CC0 — https://polyhaven.com/a/brick_4
   Applied lightly to Beatty Close flats block + a Market Gates / seafront strip feel.
   Does NOT invent subway boards; does not change L0/L1 geometry. */
export function initV109Facades({ T, S, LBL, LITE, warp, fx }) {
  const info = { ready: false, applied: [], remote: false };
  if ((window.__detail ?? 0) < 2 || window.IE_L2_FACADES === false) { info.off = true; info.ready = true; return { info }; }
  const grp = new T.Group(); grp.name = 'v109-facades'; S.add(grp);

  function brickCanvas(w = 256, h = 256, base = '#8e5a40', mortar = '#c9b8a6') {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d');
    k.fillStyle = mortar; k.fillRect(0, 0, w, h);
    const bw = 28, bh = 14;
    for (let y = 0, row = 0; y < h; y += bh + 2, row++) {
      const ox = (row % 2) * (bw / 2);
      for (let x = -bw; x < w; x += bw + 2) {
        const shade = ((Math.sin(x * 0.17 + y) + 1) * 0.5) * 18;
        k.fillStyle = base; // slight per-brick noise via overlay
        k.globalAlpha = 1; k.fillRect(x + ox, y, bw, bh);
        k.fillStyle = `rgba(0,0,0,${0.04 + shade / 400})`; k.fillRect(x + ox, y, bw, bh);
      }
    }
    k.globalAlpha = 1; const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.anisotropy = 2; return tx;
  }
  function plasterCanvas(w = 256, h = 256, col = '#d8d2c4') {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const k = c.getContext('2d');
    k.fillStyle = col; k.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { k.fillStyle = `rgba(0,0,0,${Math.random() * 0.04})`; k.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; tx.wrapS = tx.wrapT = T.RepeatWrapping; return tx;
  }

  const brick = brickCanvas(); brick.repeat.set(6, 3);
  const cream = plasterCanvas(256, 256, '#e8e2d4'); cream.repeat.set(4, 2);
  const matB = new T.MeshBasicMaterial({ map: brick }); const matC = new T.MeshBasicMaterial({ map: cream });

  // Beatty Close flats — thin textured skin just outside the solid brown block (west gable + south face feel)
  // Anchored near world-streets v57 flats (approx e -160..-80 / n 2340 area). warp() converts OSM e/n → world.
  const skins = [
    { e: -138, n: 2348, w: 48, h: 5.2, d: 0.08, y: 2.6, ry: 0, m: matB, label: 'beatty-flats-front' },
    { e: -162, n: 2348, w: 0.08, h: 5.2, d: 12, y: 2.6, ry: 0, m: matB, label: 'beatty-flats-gable' },
    { e: -138, n: 2354.2, w: 48, h: 1.1, d: 0.06, y: 3.9, ry: 0, m: matC, label: 'beatty-walkway-band' },
  ];
  for (const q of skins) {
    const m = new T.Mesh(new T.BoxGeometry(q.w, q.h, q.d), q.m); const p = warp(q.e, q.n);
    m.position.set(p.x, q.y, p.z); if (q.ry) m.rotation.y = q.ry; m.name = 'v109-' + q.label; grp.add(m); info.applied.push(q.label);
  }

  // Market Gates / seafront lean strip — cream render panel near Market Gates buses (west of Troll Cart / Regent)
  // Approx OSM Market Gates area e -470 / n 450. Flag: IE_L2_MARKET_FACADE=false to skip.
  if (window.IE_L2_MARKET_FACADE !== false) {
    const p = warp(-470, 448); const m = new T.Mesh(new T.BoxGeometry(18, 4.2, 0.1), matC);
    m.position.set(p.x, 2.4, p.z); m.name = 'v109-market-gates-strip'; grp.add(m); info.applied.push('market-gates-strip');
    if (LBL) { const lab = LBL('MARKET GATES', '#e8fff2', 1.1); lab.position.set(p.x, 5.0, p.z); grp.add(lab); }
  }

  // Optional remote Poly Haven brick (desktop L2 only; never on LITE/LOW)
  if (!LITE && window.IE_L2_REMOTE_TEX !== false) {
    const url = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/brick_4/brick_4_diff_1k.jpg';
    const loader = new T.TextureLoader(); loader.crossOrigin = 'anonymous';
    loader.load(url, tx => {
      tx.colorSpace = T.SRGBColorSpace; tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.repeat.set(6, 3);
      matB.map = tx; matB.needsUpdate = true; info.remote = true; info.applied.push('polyhaven-brick_4');
    }, undefined, () => { /* keep procedural canvas fallback */ });
  }

  info.ready = true; fx.v109fInfo = info; console.info('[IE] v109 L2 facades', info.applied);
  return { info, grp };
}
