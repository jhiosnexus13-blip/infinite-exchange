/* v116: North Drive showcase + global visual cleanup + graphics-level switcher.
   Preview only (v2-round2, PR #18). Flag: IE_V116=false disables.

   Graphics levels (never deleted — visibility only), stored in localStorage IE_GFX,
   also ?gfx=neon|lite|solid|real. Default = highest that should run smoothly
   (REAL on mid phones / desktop; SOLID on LOW devices). Obvious in the MENU.

     NEON  — original holographic / neon-line landmarks (the "wireframe" layer)
     LITE  — lean solid masses, no heavy PBR
     SOLID — solid OSM + simple roofs + showcase massing
     REAL  — Street View / game-realistic: PBR CC0, HDRI env, textured ground

   Mirrored-text and z-fighting fixes run at EVERY level.
   Floating neon / unattached billboard cleanup runs at LITE / SOLID / REAL only.
   Rain stays tied to live Open-Meteo weather; only the look is refined (world-env).
   Sky follows real Great Yarmouth time of day + weather (overcast when daytime
   clouds say so). Night is a proper dark sky, not a black void, and is NOT forced
   to daytime. The sun/moon button still overrides.

   Materials: Poly Haven CC0 (brick_4, roof_tiles_14, asphalt_04,
   aerial_grass_rock, overcast_soil_puresky) + procedural red block-paving /
   sand / render. See assets/img/v116/CREDITS.txt. */
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const LEVELS = [
  { id: 'neon',  label: 'NEON',  tip: 'Holographic neon lines and wireframe landmarks' },
  { id: 'lite',  label: 'LITE',  tip: 'Lean solid buildings, light on phones' },
  { id: 'solid', label: 'SOLID', tip: 'Solid OSM buildings with simple roofs' },
  { id: 'real',  label: 'REAL',  tip: 'Street View / game-realistic: PBR, textured ground' }
];
const TEX = '/assets/img/v116/';
/* Iron Duke OSM way 232015022 — real footprint, metres east/north of origin */
const DUKE = [[113,2696],[122,2695],[122,2704],[133,2704],[135,2702],[134,2696],[130,2695],[130,2683],[127,2682],[122,2684],[120,2679],[115,2681],[113,2679],[111,2681]];
/* North Denes Primary, OSM relation 3118379 */
const SCHOOL = [[-9,2753],[7,2752],[6,2742],[19,2741],[20,2753],[96,2750],[97,2753],[106,2752],[106,2749],[104,2749],[103,2742],[87,2743],[88,2720],[86,2720],[86,2713],[13,2715],[12,2739],[6,2739],[6,2732],[-10,2732]];
/* North Drive centreline (N–S) just east of the Duke, from the Jellicoe junction toward the dunes */
const ND_E = 152, ND_N0 = 2588, ND_N1 = 2810, ND_W = 9.6;

export function initV116(o) {
  const { T, S, CAM, P, LBL, LITE, LOW, RED, warp, fx, renderer: R } = o;
  const info = { level: 'real', ready: false };
  if (window.IE_V116 === false) { info.off = true; return { info, update() {}, apply() {} }; }

  const grp = new T.Group(); grp.name = 'v116'; S.add(grp);
  const grpStrip = new T.Group(); grpStrip.name = 'v116-strip'; grpStrip.userData.v116 = 1; grp.add(grpStrip);
  const DET = window.__detail ?? (LITE ? 0 : 1);
  const phone = !!(LITE || LOW || (typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches));
  const wantShadows = !LOW && !LITE && window.IE_V116_SHADOWS !== false && DET >= 1;

  /* ---------- graphics level pick (remembered; URL wins) ---------- */
  function pickDefault() {
    try {
      const q = (location.search.match(/[?&]gfx=(neon|lite|solid|real)/) || [])[1];
      if (q) return q;
      const s = localStorage.getItem('IE_GFX');
      if (s && LEVELS.some(l => l.id === s)) return s;
    } catch (_) {}
    /* highest that should run smoothly: REAL with phone-quality assets on mid
       phones (Joseph reviews on a phone); SOLID only on the LOW path. */
    return LOW ? 'solid' : 'real';
  }
  let gfx = pickDefault();
  window.__gfx = gfx; window.IE_GFX = gfx;
  try { localStorage.setItem('IE_GFX', gfx); } catch (_) {}

  /* ---------- shared helpers ---------- */
  const Mstd = (opts) => {
    const m = new T.MeshStandardMaterial(Object.assign({ roughness: 0.88, metalness: 0.02, envMapIntensity: 0.7 }, opts));
    m.userData.v116 = 1; return m;
  };
  const Mbasic = (opts) => { const m = new T.MeshBasicMaterial(opts); m.userData.v116 = 1; return m; };
  const wpos = (e, n, y = 0) => { const p = warp(e, n); return new T.Vector3(p.x, y, p.z); };
  const add = (mesh, parent = grpStrip) => { mesh.userData.v116 = 1; parent.add(mesh); return mesh; };

  function canvasTex(draw, w = 256, h = 256, wrap = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
    const tx = new T.CanvasTexture(c); if (tx.colorSpace !== undefined) tx.colorSpace = T.SRGBColorSpace;
    if (wrap) { tx.wrapS = tx.wrapT = T.RepeatWrapping; } tx.anisotropy = 4; tx.needsUpdate = true; return tx;
  }
  function normalFrom(draw, w = 256, h = 256, str = 3) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); draw(g, w, h);
    const src = g.getImageData(0, 0, w, h), out = g.createImageData(w, h), d = src.data, o = out.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const at = (xx, yy) => d[(((yy + h) % h) * w + ((xx + w) % w)) * 4];
      const nx = (at(x - 1, y) - at(x + 1, y)) * str, ny = (at(x, y - 1) - at(x, y + 1)) * str, nz = 255;
      const inv = 127 / Math.max(1, Math.hypot(nx, ny, nz));
      const i = (y * w + x) * 4; o[i] = nx * inv + 128; o[i + 1] = ny * inv + 128; o[i + 2] = nz * inv + 128; o[i + 3] = 255;
    }
    g.putImageData(out, 0, 0);
    const tx = new T.CanvasTexture(c); tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.anisotropy = 4; tx.needsUpdate = true; return tx;
  }

  /* procedural fallbacks (used immediately; replaced by CC0 maps when they load) */
  const proc = {};
  proc.brick = canvasTex((g, w, h) => {
    g.fillStyle = '#cbb6a2'; g.fillRect(0, 0, w, h);
    const bw = 32, bh = 14, gap = 2;
    for (let y = 0, row = 0; y < h + bh; y += bh + gap, row++) {
      const ox = (row % 2) * ((bw + gap) / 2);
      for (let x = -bw; x < w + bw; x += bw + gap) {
        const s = 96 + ((x * 13 + y * 7) % 40);
        g.fillStyle = `rgb(${s + 48},${s},${s - 10})`; g.fillRect(x + ox, y, bw, bh);
      }
    }
  });
  proc.brickN = normalFrom((g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#444';
    const bw = 32, bh = 14, gap = 2;
    for (let y = 0, row = 0; y < h + bh; y += bh + gap, row++) {
      const ox = (row % 2) * ((bw + gap) / 2);
      for (let x = -bw; x < w + bw; x += bw + gap) g.fillRect(x + ox, y, bw, bh);
    }
  }, 256, 256, 4);
  proc.roof = canvasTex((g, w, h) => {
    g.fillStyle = '#6a3428'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 10) {
      g.fillStyle = y % 20 ? '#7a3c2c' : '#5c2e22';
      for (let x = (y / 10) % 2 ? 8 : 0; x < w; x += 16) {
        g.beginPath(); g.moveTo(x, y + 10); g.quadraticCurveTo(x + 6, y - 1, x + 12, y + 10); g.fill();
      }
    }
  });
  proc.asphalt = canvasTex((g, w, h) => {
    g.fillStyle = '#3a3d42'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
  proc.pave = canvasTex((g, w, h) => {
    /* GY seafront red herringbone block paving */
    g.fillStyle = '#8a5a48'; g.fillRect(0, 0, w, h);
    const s = 14;
    for (let y = -s; y < h + s; y += s) for (let x = -s; x < w + s; x += s) {
      const flip = ((x / s) + (y / s)) % 2 | 0;
      const v = 118 + ((x * 3 + y) % 28);
      g.fillStyle = `rgb(${v + 40},${v - 8},${v - 22})`;
      g.save(); g.translate(x + s / 2, y + s / 2); g.rotate(flip ? Math.PI / 4 : -Math.PI / 4);
      g.fillRect(-s * 0.7, -s * 0.28, s * 1.4, s * 0.5); g.restore();
    }
  }, 256, 256);
  proc.paveN = normalFrom((g, w, h) => {
    g.fillStyle = '#888'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#eee';
    const s = 14;
    for (let y = -s; y < h + s; y += s) for (let x = -s; x < w + s; x += s) {
      const flip = ((x / s) + (y / s)) % 2 | 0;
      g.save(); g.translate(x + s / 2, y + s / 2); g.rotate(flip ? Math.PI / 4 : -Math.PI / 4);
      g.fillRect(-s * 0.7, -s * 0.28, s * 1.4, s * 0.5); g.restore();
    }
  });
  proc.grass = canvasTex((g, w, h) => {
    g.fillStyle = '#4d6a38'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2400; i++) {
      g.fillStyle = `rgba(${40 + Math.random() * 50},${70 + Math.random() * 80},${20 + Math.random() * 30},${0.35})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 3);
    }
  });
  proc.sand = canvasTex((g, w, h) => {
    g.fillStyle = '#c4b48a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(90,70,30,${Math.random() * 0.12})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
  proc.render = canvasTex((g, w, h) => {
    g.fillStyle = '#e8e0d0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 800; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.04})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
  proc.glass = canvasTex((g, w, h) => {
    g.fillStyle = '#eceae4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1c2830'; g.fillRect(6, 6, w - 12, h - 12);
    g.fillStyle = 'rgba(200,220,230,0.22)'; g.fillRect(8, 8, (w - 16) * 0.45, (h - 16) * 0.35);
  }, 128, 128, false);

  const mats = {
    brick: Mstd({ map: proc.brick, normalMap: proc.brickN, roughness: 0.82, color: 0xffffff }),
    brickDk: Mstd({ map: proc.brick, normalMap: proc.brickN, roughness: 0.84, color: 0xb89888 }),
    roof: Mstd({ map: proc.roof, roughness: 0.78, color: 0xffffff }),
    asphalt: Mstd({ map: proc.asphalt, roughness: 0.95, color: 0xffffff }),
    pave: Mstd({ map: proc.pave, normalMap: proc.paveN, roughness: 0.86, color: 0xffffff }),
    grass: Mstd({ map: proc.grass, roughness: 0.95, color: 0xffffff }),
    sand: Mstd({ map: proc.sand, roughness: 0.92, color: 0xffffff }),
    render: Mstd({ map: proc.render, roughness: 0.7, color: 0xffffff }),
    fascia: Mstd({ color: 0xb83a4a, roughness: 0.55, metalness: 0.05 }),
    kerb: Mstd({ color: 0xc8c2b6, roughness: 0.8 }),
    white: Mstd({ color: 0xf2f0ea, roughness: 0.55 }),
    glass: Mstd({ map: proc.glass, roughness: 0.18, metalness: 0.12, envMapIntensity: 1.1 }),
    hedge: Mstd({ color: 0x3a5a2c, roughness: 0.95 }),
    iron: Mstd({ color: 0x1a1c1e, roughness: 0.45, metalness: 0.35 }),
    lampG: Mstd({ color: 0xffe8b0, roughness: 0.35, emissive: 0x443318, emissiveIntensity: 0.35 })
  };
  /* tiling */
  const tile = (tx, a, b) => { if (tx && tx.repeat) tx.repeat.set(a, b); };
  tile(proc.brick, 4, 8); tile(proc.brickN, 4, 8);
  tile(proc.roof, 4, 4); tile(proc.asphalt, 8, 40);
  tile(proc.pave, 10, 40); tile(proc.paveN, 10, 40);
  tile(proc.grass, 20, 40); tile(proc.sand, 16, 16);

  /* ---------- load CC0 maps (replace procedural when ready) ---------- */
  const loader = new T.TextureLoader(); loader.crossOrigin = 'anonymous';
  function loadMap(file, matKey, kind /* 'map' | 'normal' */, rx, ry) {
    loader.load(TEX + file + '?v=116', tx => {
      if (tx.colorSpace !== undefined && kind === 'map') tx.colorSpace = T.SRGBColorSpace;
      tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.anisotropy = (R && R.capabilities && R.capabilities.getMaxAnisotropy) ? Math.min(8, R.capabilities.getMaxAnisotropy()) : 4;
      if (rx) tx.repeat.set(rx, ry);
      const m = mats[matKey]; if (!m) return;
      if (kind === 'normal') { m.normalMap = tx; m.normalScale = new T.Vector2(0.85, 0.85); }
      else m.map = tx;
      m.needsUpdate = true; info[file] = true;
    }, undefined, () => { info['miss:' + file] = true; });
  }
  loadMap('brick_4_diff_1k.jpg', 'brick', 'map', 3, 6);
  loadMap('brick_4_nor_gl_1k.jpg', 'brick', 'normal', 3, 6);
  loadMap('brick_4_diff_1k.jpg', 'brickDk', 'map', 3, 6);
  loadMap('brick_4_nor_gl_1k.jpg', 'brickDk', 'normal', 3, 6);
  loadMap('roof_tiles_14_diff_1k.jpg', 'roof', 'map', 3, 3);
  loadMap('roof_tiles_14_nor_gl_1k.jpg', 'roof', 'normal', 3, 3);
  loadMap('asphalt_04_diff_1k.jpg', 'asphalt', 'map', 6, 30);
  loadMap('asphalt_04_nor_gl_1k.jpg', 'asphalt', 'normal', 6, 30);
  loadMap('aerial_grass_rock_diff_1k.jpg', 'grass', 'map', 14, 28);

  /* HDRI environment (REAL level) — lighting only; sky visual still follows time/weather */
  let envMap = null;
  if (R) {
    try {
      new RGBELoader().setDataType(T.HalfFloatType).load(TEX + 'overcast_soil_puresky_1k.hdr?v=116', (hdr) => {
        const pmrem = new T.PMREMGenerator(R); pmrem.compileEquirectangularShader();
        envMap = pmrem.fromEquirectangular(hdr).texture; hdr.dispose(); pmrem.dispose();
        info.hdri = true;
        if (window.__gfx === 'real') applyEnv(true);
      }, undefined, () => { info.hdri = false; });
    } catch (e) { info.hdriErr = String(e && e.message || e); }
  }
  function applyEnv(on) {
    if (on && envMap) { S.environment = envMap; }
    else if (!on && S.environment === envMap) { S.environment = null; }
    /* do not set S.background to the HDRI — v114 Sky (and night/overcast tuning) owns the sky */
  }

  /* ---------- readable sign: TWO FrontSide planes, never mirrored ---------- */
  function sign(text, w, h, e, n, y, ry, bg = '#1a2430', fg = '#f4ebd4', parent = grpStrip) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = Math.max(128, Math.round(1024 * h / Math.max(0.5, w)));
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = fg; g.lineWidth = 12; g.strokeRect(14, 14, c.width - 28, c.height - 28);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = String(text).split('\n');
    let px = Math.floor(c.height / (lines.length + 1.15));
    lines.forEach((ln) => { g.font = 'bold ' + px + 'px Georgia,serif'; while (g.measureText(ln).width > c.width * 0.88 && px > 12) { px--; g.font = 'bold ' + px + 'px Georgia,serif'; } });
    g.font = 'bold ' + px + 'px Georgia,serif';
    lines.forEach((ln, i) => g.fillText(ln, c.width / 2, c.height * (i + 1) / (lines.length + 1)));
    const tx = new T.CanvasTexture(c); if (tx.colorSpace !== undefined) tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 4;
    const mat = Mbasic({ map: tx, side: T.FrontSide, fog: true, toneMapped: false });
    const g1 = new T.Group(); const p = warp(e, n);
    g1.position.set(p.x, y, p.z); g1.rotation.y = ry;
    const a = new T.Mesh(new T.PlaneGeometry(w, h), mat);
    const b = new T.Mesh(new T.PlaneGeometry(w, h), mat);
    a.position.z = 0.02; b.position.z = -0.02; b.rotation.y = Math.PI;
    g1.add(a, b); g1.userData.v116 = 1; parent.add(g1); return g1;
  }

  /* ---------- global mirrored-text fix (every DoubleSide canvas plane → two FrontSide faces) ---------- */
  function fixMirrored() {
    const seen = new Set();
    S.traverse(ch => {
      if (!ch.isMesh || !ch.geometry || !ch.material) return;
      if (ch.userData.v116fixed || ch.userData.v116) return;
      const mat = ch.material; const map = mat.map;
      if (!map || mat.side !== T.DoubleSide) return;
      /* canvas-text or any DoubleSide textured plane — flip by splitting sides */
      const g = ch.geometry;
      const isPlane = g.type === 'PlaneGeometry' || (g.parameters && g.parameters.width && g.parameters.height && !g.parameters.depth);
      if (!isPlane) {
        /* shader flip for non-planes */
        if (mat.userData.v116flip) return;
        mat.userData.v116flip = 1;
        const prev = mat.onBeforeCompile;
        mat.onBeforeCompile = (sh, r) => {
          if (prev) prev(sh, r);
          sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>',
            `#ifdef USE_MAP\n if (!gl_FrontFacing) vMapUv.x = 1.0 - vMapUv.x;\n#endif\n#include <map_fragment>`);
        };
        const prevKey = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : () => '';
        mat.customProgramCacheKey = () => {
          try { return prevKey() + '|v116flip'; } catch (_) { return 'v116flip'; }
        };
        mat.needsUpdate = true; return;
      }
      if (seen.has(ch)) return; seen.add(ch);
      ch.userData.v116fixed = 1;
      mat.side = T.FrontSide; mat.needsUpdate = true;
      const back = ch.clone(); back.userData.v116fixed = 1; back.userData.v116 = 1;
      back.rotation.y = ch.rotation.y + Math.PI;
      /* sit a hair behind so they do not z-fight */
      const nx = Math.sin(ch.rotation.y), nz = Math.cos(ch.rotation.y);
      back.position.copy(ch.position); back.position.x -= nx * 0.025; back.position.z -= nz * 0.025;
      ch.position.x += nx * 0.012; ch.position.z += nz * 0.012;
      (ch.parent || S).add(back);
    });
    info.mirroredFixed = (info.mirroredFixed || 0) + seen.size;
  }

  /* ---------- z-fight: FrontSide + polygonOffset on facade skins ---------- */
  function fixZFight() {
    S.traverse(o => {
      if (!o.isMesh || !o.material || o.userData.v116zf) return;
      const m = o.material;
      const key = m.customProgramCacheKey ? String(m.customProgramCacheKey()) : '';
      if (key.indexOf('facade69') >= 0) {
        o.userData.v116zf = 1;
        m.side = T.FrontSide;
        m.polygonOffset = true; m.polygonOffsetFactor = 1; m.polygonOffsetUnits = 1;
        m.needsUpdate = true;
      }
    });
  }

  /* ---------- neon catalogue: hide at realistic levels, SHOW at NEON (never delete) ---------- */
  const neonObjs = [];
  function catalogNeon() {
    neonObjs.length = 0;
    const take = (o) => { if (o && neonObjs.indexOf(o) < 0) neonObjs.push(o); };
    const city = S.getObjectByName('osm-buildings'); if (city) take(city);
    const sky = S.getObjectByName('skyline'); if (sky) take(sky);
    if (fx.clusters) fx.clusters.forEach(c => take(c.grp));
    if (fx.feature && fx.feature.grp) take(fx.feature.grp);
    const nt = S.getObjectByName('newtown-streets'); /* keep streets; neon lines are scene-level */
    S.traverse(o => {
      if (o.userData && (o.userData.v116 || o.userData.v116keep)) return;
      if (o.isSprite && o.position && (o.position.y > 3.5) && o.parent && o.parent.name !== 'v116' && o.parent.name !== 'v116-strip') {
        /* giant wayfinding / racecourse / cluster labels */
        const sc = (o.scale && Math.max(o.scale.x, o.scale.y)) || 1;
        if (sc > 2 || o.position.y > 8) take(o);
      }
      if (o.isLineSegments && o.material && o.material.blending === T.AdditiveBlending && !o.userData.v116) {
        /* neon rails / holo edges, not our furniture */
        if (o.parent && (o.parent.name === 'v69' || o.parent.name === 'v115-bridges' || o.parent.name === 'v116')) return;
        take(o);
      }
    });
    /* v115 floating LBLs and unattached finger-sprites */
    const b115 = S.getObjectByName('v115-bridges');
    if (b115) b115.traverse(o => { if (o.isSprite) take(o); });
    info.neonCatalog = neonObjs.length;
  }
  function setNeonVisible(on) {
    neonObjs.forEach(o => { if (o) o.visible = !!on; });
    const city = S.getObjectByName('osm-buildings');
    if (city) {
      city.visible = !!on;
      city.traverse(ch => {
        if (ch.isMesh) {
          if (on) {
            if (!ch.userData._v116mat && ch.material) ch.userData._v116mat = ch.material;
            if (!ch.material || ch.material.visible === false) {
              ch.material = new T.MeshBasicMaterial({ color: 0xff48c8, transparent: true, opacity: 0.2, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false, toneMapped: false });
            } else { ch.material.visible = true; }
            ch.visible = true;
          } else { ch.visible = false; }
        }
        if (ch.isLineSegments) {
          ch.visible = !!on;
          if (on && ch.material) { ch.material.opacity = 0.7; ch.material.visible = true; ch.material.transparent = true; }
        }
      });
    }
    const s115 = S.getObjectByName('v115-solid'); if (s115) s115.visible = !on;
    /* v69 facade skins stay for lite/solid/real; hide at neon so the holo reads */
    S.traverse(o => {
      if (!o.isMesh || !o.material) return;
      const key = o.material.customProgramCacheKey ? String(o.material.customProgramCacheKey()) : '';
      if (key.indexOf('facade69') >= 0) o.visible = !on;
    });
    const oldDuke = S.getObjectByName('v69-iron-duke'); if (oldDuke) oldDuke.visible = on; /* neon keeps the old massing underneath the holo; realistic uses the new Duke */
    if (!on && oldDuke) oldDuke.visible = false;
  }

  /* attach "These Streets Done Nuttin" to the Jellicoe underpass wall at realistic levels */
  function placeJellicoeScreen(realistic) {
    const under = wpos(-63.8, 2668.8, 2.6);
    S.traverse(o => {
      if (!o.isMesh || !o.userData) return;
      const id = o.userData.track || o.userData.title || '';
      const near = o.parent && o.parent.position && Math.hypot((o.parent.position.x || 0) - under.x, (o.parent.position.z || 0) - under.z) < 80;
      const isNuttin = /nuttin|these streets/i.test(String(id) + String(o.userData.title || ''));
      if (!(isNuttin || (near && o.userData.feature && o.parent && o.parent.position && o.parent.position.y > 8))) return;
      if (realistic) {
        /* pin a modest screen to the east abutment, facing the underpass (west) */
        const host = o.parent || o;
        host.position.set(under.x + 7.6, 2.8, under.z);
        host.rotation.set(0, -Math.PI / 2, 0);
        host.scale.setScalar(0.42);
        host.userData.v116pinned = 1;
        if (fx.feature && fx.feature.grp === host) fx.feature.y0 = 2.8;
      } else if (o.userData.v116pinned && o.userData._v116home) {
        const h = o.userData._v116home; o.position.copy(h.p); o.scale.copy(h.s);
      }
    });
  }

  /* ---------- school path: ends at a south gate, does not run into the Duke ---------- */
  function buildPath() {
    const g = new T.Group(); g.name = 'v116-path'; g.userData.v116 = 1; grpStrip.add(g);
    /* from underpass, up and east to e=50, then NORTH to the school gate at (50, 2713), STOP.
       A second spur from e=50 east only as far as e=100, then SOUTH onto Jellicoe (n=2668)
       so it never hits the Iron Duke's west wall at e≈111. */
    const segs = [
      /* school branch */
      [-50, 2686, 50, 2688, 3.4],
      [50, 2688, 50, 2712.2, 3.2]
    ];
    const spur = [
      [50, 2688, 100, 2688, 3.2],
      [100, 2688, 100, 2668, 3.2]
    ];
    const pave = (e0, n0, e1, n1, w) => {
      const e = (e0 + e1) / 2, n = (n0 + n1) / 2, len = Math.hypot(e1 - e0, n1 - n0) + 0.2;
      const ry = Math.atan2(-(n1 - n0), e1 - e0);
      const m = new T.Mesh(new T.BoxGeometry(len, 0.08, w), mats.pave);
      const p = warp(e, n); m.position.set(p.x, 0.1, p.z); m.rotation.y = ry; m.receiveShadow = true; g.add(m);
      for (const s of [-1, 1]) {
        const k = new T.Mesh(new T.BoxGeometry(len, 0.2, 0.14), mats.kerb);
        const off = s * (w / 2);
        /* perp in world: ry rotates local z */
        k.position.set(p.x + Math.cos(ry) * 0 + Math.sin(ry) * off, 0.16, p.z + Math.cos(ry) * off); /* approx */
        k.position.set(p.x - Math.sin(ry) * 0 + Math.cos(Math.PI / 2 + ry) * off, 0.16, p.z);
        /* simpler: local offset after adding to a holder */
        k.position.copy(p); k.position.y = 0.16; k.rotation.y = ry;
        k.translateZ(s * (w / 2)); g.add(k);
      }
    };
    segs.concat(spur).forEach(s => pave(...s));
    /* school gate — path ENDS here */
    const gateE = 50, gateN = 2712.6;
    const gp = warp(gateE, gateN);
    const post = (de) => { const m = new T.Mesh(new T.BoxGeometry(0.16, 2.1, 0.16), mats.iron); m.position.set(gp.x + de, 1.05, gp.z); g.add(m); };
    post(-1.5); post(1.5);
    const bar = new T.Mesh(new T.BoxGeometry(3.1, 0.1, 0.1), mats.iron); bar.position.set(gp.x, 1.85, gp.z); g.add(bar);
    /* hinged leaves, slightly open — a real entrance, not a blank wall */
    for (const s of [-1, 1]) {
      const leaf = new T.Mesh(new T.BoxGeometry(1.35, 1.5, 0.06), Mstd({ color: 0x2c3a28, roughness: 0.7 }));
      leaf.position.set(gp.x + s * 0.75, 0.85, gp.z + 0.15); leaf.rotation.y = s * 0.35; g.add(leaf);
    }
    sign('NORTH DENES\nPRIMARY SCHOOL', 3.4, 1.35, gateE, gateN - 0.5, 2.55, Math.PI, '#153a28', '#e8ffe8', g);
    /* walkable ground along the path, first-wins unshift */
    const gpFn = window.__groundParts || (window.__groundParts = []);
    gpFn.unshift((x, z) => {
      const e = x, n = -z;
      /* school path N–S at e=50, n 2688..2712 */
      if (Math.abs(e - 50) < 1.8 && n >= 2687 && n <= 2712.4) return 0.14;
      if (n >= 2685 && n <= 2691 && e >= -52 && e <= 102) return 0.14;
      if (Math.abs(e - 100) < 1.8 && n >= 2667 && n <= 2689) return 0.14;
      return null;
    });
    /* cancel the old v115 alley past e=105 (it ran into the Duke's west wall) */
    gpFn.unshift((x, z) => {
      const e = x, n = -z;
      if (e > 105 && e < 122 && n >= 2684 && n <= 2696) {
        const h = fx.earth && fx.earth.heightAt ? fx.earth.heightAt(x, z) : 0;
        return (h != null ? h : 0) + 0.02;
      }
      return null;
    });
    info.path = true;
  }

  /* ---------- windows (inset canvas, FrontSide, polygonOffset — no z-fight) ---------- */
  function windowPane(w, h, e, n, y, ry, parent) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), mats.glass);
    m.material = mats.glass.clone(); m.material.polygonOffset = true; m.material.polygonOffsetFactor = -3; m.material.polygonOffsetUnits = -3; m.material.side = T.FrontSide;
    const p = warp(e, n);
    const nx = Math.sin(ry), nz = Math.cos(ry);
    m.position.set(p.x + nx * 0.1, y, p.z + nz * 0.1); m.rotation.y = ry;
    m.castShadow = false; m.receiveShadow = false; parent.add(m);
    /* thin white rim (four edges), not a solid white plate */
    const tkn = 0.07, dep = 0.06;
    for (const [ww, hh, ox, oy] of [
      [w + tkn * 2, tkn, 0, (h + tkn) / 2], [w + tkn * 2, tkn, 0, -(h + tkn) / 2],
      [tkn, h, -(w + tkn) / 2, 0], [tkn, h, (w + tkn) / 2, 0]
    ]) {
      const fr = new T.Mesh(new T.BoxGeometry(ww, hh, dep), mats.white);
      fr.position.set(p.x + nx * 0.07 + Math.cos(ry) * ox, y + oy, p.z + nz * 0.07 - Math.sin(ry) * ox);
      fr.rotation.y = ry; parent.add(fr);
    }
    return m;
  }

  /* ---------- 1930s semis at the Jellicoe junction (south side, facing the road) ---------- */
  function addSemiPair(e, n, ry, gable) {
    const g = new T.Group(); g.userData.v116 = 1; grpStrip.add(g);
    const bodyW = 14.4, bodyD = 8.2, bodyH = 5.7;
    const body = new T.Mesh(new T.BoxGeometry(bodyW, bodyH, bodyD), mats.brick);
    const p = warp(e, n); body.position.set(p.x, bodyH / 2, p.z); body.rotation.y = ry;
    body.castShadow = !!wantShadows; body.receiveShadow = true; g.add(body);
    /* party wall */
    const wall = new T.Mesh(new T.BoxGeometry(0.18, bodyH + 0.2, bodyD + 0.1), mats.render);
    wall.position.copy(body.position); wall.rotation.y = ry; g.add(wall);
    /* roof */
    const ridgeH = 2.15;
    if (gable) {
      /* two-slope gable, ridge along the pair (local X) */
      for (const s of [-1, 1]) {
        const sl = new T.Mesh(new T.BoxGeometry(bodyW + 0.5, 0.12, Math.hypot(bodyD / 2, ridgeH) + 0.2), mats.roof);
        sl.position.set(p.x, bodyH + ridgeH / 2, p.z);
        sl.rotation.y = ry;
        sl.rotateX(s * Math.atan2(ridgeH, bodyD / 2));
        sl.translateZ(s * bodyD / 4); sl.castShadow = !!wantShadows; g.add(sl);
      }
      /* gable triangles as thin boxes (simple) */
      for (const sx of [-1, 1]) {
        const gb = new T.Mesh(new T.BoxGeometry(0.12, ridgeH, bodyD), mats.brick);
        gb.position.copy(body.position); gb.rotation.y = ry;
        gb.position.y = bodyH + ridgeH / 2; gb.translateX(sx * bodyW / 2); g.add(gb);
      }
    } else {
      /* hipped: four slopes */
      for (const s of [-1, 1]) {
        const sl = new T.Mesh(new T.BoxGeometry(bodyW - 1.2, 0.12, Math.hypot(bodyD / 2, ridgeH) + 0.15), mats.roof);
        sl.position.set(p.x, bodyH + ridgeH / 2, p.z); sl.rotation.y = ry;
        sl.rotateX(s * Math.atan2(ridgeH, bodyD / 2)); sl.translateZ(s * bodyD / 4); sl.castShadow = !!wantShadows; g.add(sl);
      }
      for (const s of [-1, 1]) {
        const sl = new T.Mesh(new T.BoxGeometry(Math.hypot(2.2, ridgeH), 0.12, bodyD - 1.4), mats.roof);
        sl.position.set(p.x, bodyH + ridgeH * 0.45, p.z); sl.rotation.y = ry;
        sl.rotateZ(-s * 0.55); sl.translateX(s * (bodyW / 2 - 0.9)); g.add(sl);
      }
    }
    /* chimneys — two, shared centrals and ends, typical 1930s */
    for (const sx of [-0.15, 0.15]) {
      const ch = new T.Mesh(new T.BoxGeometry(0.55, 1.5, 0.7), mats.render);
      ch.position.copy(body.position); ch.rotation.y = ry;
      ch.position.y = bodyH + ridgeH + 0.3; ch.translateX(sx * 2); g.add(ch);
      const cap = new T.Mesh(new T.BoxGeometry(0.68, 0.1, 0.84), mats.kerb);
      cap.position.copy(ch.position); cap.position.y += 0.8; g.add(cap);
    }
    /* front faces north (toward Jellicoe). ry=0 → front is +z? We want front toward +n (−z world).
       House sitting south of the road, facing north: front normal = (0,0,-1), ry = Math.PI. */
    const frontRy = ry; /* caller passes facing */
    /* windows + doors, two dwellings */
    for (const sx of [-3.4, 3.4]) {
      const local = (de, dn, y) => {
        /* local X along front, local Z out the front (normal) */
        const nx = Math.sin(frontRy), nz = Math.cos(frontRy);
        const tx = Math.cos(frontRy), tz = -Math.sin(frontRy);
        return [e + tx * de + nx * dn, n - tz * de + /* n axis: world z = -n, careful */
          /* easier: work in world after warp from a local offset */
          0, y, nx, nz, tx, tz];
      };
      /* use translate on a dummy */
    }
    const nx = Math.sin(frontRy), nz = Math.cos(frontRy);
    const tx = Math.cos(frontRy), tz = -Math.sin(frontRy);
    /* world e,n from local (along, out): e' = e + along*cos(ry) + out*sin(ry) — with warp identity, x = e, z = -n
       After rotation.y = ry on a mesh at (e,n), local +x is (cos ry, 0, -sin ry) in (x,z) = (cos, sin) in (e,n)?
       x = e + lx*cos(ry) + lz*sin(ry), z = -n - lx*sin(ry) + lz*cos(ry)
       n' = n + lx*sin(ry) - lz*cos(ry)
       We'll place windows with warp of computed e,n. */
    const at = (along, out, y) => {
      const ee = e + along * Math.cos(ry) + out * Math.sin(ry);
      const nn = n + along * Math.sin(ry) - out * Math.cos(ry);
      return [ee, nn, y];
    };
    for (const along of [-4.6, -1.7, 1.7, 4.6]) {
      windowPane(1.15, 1.35, ...at(along, bodyD / 2, 1.85), frontRy, g);
      windowPane(1.15, 1.25, ...at(along, bodyD / 2, 4.35), frontRy, g);
    }
    /* doors */
    for (const along of [-3.15, 3.15]) {
      const [ee, nn] = at(along, bodyD / 2, 0);
      const door = new T.Mesh(new T.BoxGeometry(0.95, 2.05, 0.08), Mstd({ color: 0x5a2a22, roughness: 0.7 }));
      const q = warp(ee, nn); const knx = Math.sin(frontRy), knz = Math.cos(frontRy);
      door.position.set(q.x + knx * 0.1, 1.05, q.z + knz * 0.1); door.rotation.y = frontRy; g.add(door);
      /* small canopy */
      const cap = new T.Mesh(new T.BoxGeometry(1.3, 0.08, 0.6), mats.render);
      cap.position.set(q.x + knx * 0.4, 2.2, q.z + knz * 0.4); cap.rotation.y = frontRy; g.add(cap);
    }
    /* front garden hedge + low brick wall */
    for (const along of [-4, 0, 4]) {
      const [ee, nn] = at(along, bodyD / 2 + 3.2, 0);
      const hg = new T.Mesh(new T.BoxGeometry(4.4, 1.05, 0.45), mats.hedge);
      const q = warp(ee, nn); hg.position.set(q.x, 0.55, q.z); hg.rotation.y = frontRy; g.add(hg);
      const lw = new T.Mesh(new T.BoxGeometry(4.4, 0.55, 0.22), mats.brick);
      const [e2, n2] = at(along, bodyD / 2 + 2.5, 0);
      const q2 = warp(e2, n2); lw.position.set(q2.x, 0.28, q2.z); lw.rotation.y = frontRy; g.add(lw);
    }
    return g;
  }

  /* ---------- Iron Duke: curved art-deco on the real OSM footprint ---------- */
  function buildDuke() {
    const g = new T.Group(); g.name = 'v116-iron-duke'; g.userData.v116 = 1; grpStrip.add(g);
    function extrude(pts, h, mat, y0) {
      const sh = new T.Shape();
      pts.forEach((pt, i) => { if (i === 0) sh.moveTo(pt[0], pt[1]); else sh.lineTo(pt[0], pt[1]); });
      sh.closePath();
      const geo = new T.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, steps: 1, curveSegments: 2 });
      geo.rotateX(-Math.PI / 2);
      const m = new T.Mesh(geo, mat); m.position.y = y0; m.castShadow = !!wantShadows; m.receiveShadow = true; return m;
    }
    /* inset slightly so we wrap the old v69 mass without z-fight; actually expand 0.15 m */
    const expand = (pts, k) => {
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      return pts.map(p => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]);
    };
    const H = 8.4;
    g.add(extrude(expand(DUKE, 1.02), H, mats.brickDk, 0));
    /* white render bands at 3.0, 6.2, cornice 8.3 */
    for (const y of [2.95, 6.15, 8.25]) {
      const band = extrude(expand(DUKE, 1.045), 0.38, mats.render, y);
      g.add(band);
    }
    /* rounded SE corner toward the junction — art-deco curved bay */
    const bay = new T.Mesh(new T.CylinderGeometry(4.6, 4.6, H, 24, 1, true, -0.4, 2.2), mats.brickDk);
    const bp = warp(131.5, 2684); bay.position.set(bp.x, H / 2, bp.z); bay.castShadow = !!wantShadows; g.add(bay);
    for (const y of [2.95, 6.15, 8.25]) {
      const r = new T.Mesh(new T.TorusGeometry(4.7, 0.2, 6, 20, 2.2), mats.render);
      r.position.set(bp.x, y + 0.18, bp.z); r.rotation.x = Math.PI / 2; r.rotation.z = -0.4; g.add(r);
    }
    /* pink / red fascia on the east (North Drive) face */
    const fas = new T.Mesh(new T.BoxGeometry(0.18, 1.55, 16.5), mats.fascia);
    const fp = warp(135.35, 2693); fas.position.set(fp.x, 3.55, fp.z); g.add(fas);
    sign('THE IRON DUKE', 11.5, 1.2, 135.55, 2693, 3.55, Math.PI / 2, '#b83a4a', '#f2e6c4', g);
    /* south fascia toward Jellicoe */
    sign('THE IRON DUKE', 8.5, 1.05, 124, 2678.55, 3.5, Math.PI, '#b83a4a', '#f2e6c4', g);
    /* windows, white frames, east face */
    for (let i = 0; i < 6; i++) {
      const nn = 2686 + i * 2.8;
      windowPane(1.5, 1.7, 135.3, nn, 5.35, Math.PI / 2, g);
      if (i !== 2 && i !== 3) windowPane(1.5, 1.6, 135.3, nn, 1.85, Math.PI / 2, g);
    }
    /* pub door on the east, slightly south of centre — a real entrance */
    const dp = warp(135.4, 2690);
    const door = new T.Mesh(new T.BoxGeometry(0.12, 2.35, 1.5), Mstd({ color: 0x2a1a14, roughness: 0.65 }));
    door.position.set(dp.x, 1.2, dp.z); g.add(door);
    /* hedges along North Drive frontage and Jellicoe */
    for (let n = 2682; n <= 2704; n += 3.2) {
      const h = new T.Mesh(new T.BoxGeometry(0.55, 1.15, 3.0), mats.hedge);
      const q = warp(137.4, n); h.position.set(q.x, 0.58, q.z); g.add(h);
    }
    for (let e = 116; e <= 130; e += 3.2) {
      const h = new T.Mesh(new T.BoxGeometry(3.0, 1.15, 0.55), mats.hedge);
      const q = warp(e, 2677.2); h.position.set(q.x, 0.58, q.z); g.add(h);
    }
    /* collision */
    if (fx.addSolid) fx.addSolid(DUKE, 0, 9.5);
    info.duke = true;
    return g;
  }

  /* ---------- school: real footprint, cream render, proper windows, no z-fight ---------- */
  function buildSchool() {
    const g = new T.Group(); g.name = 'v116-school'; g.userData.v116 = 1; grpStrip.add(g);
    const sh = new T.Shape();
    const cx = 48, cy = 2733;
    SCHOOL.forEach((pt, i) => {
      const k = 1.08; const e = cx + (pt[0] - cx) * k, n = cy + (pt[1] - cy) * k;
      if (i === 0) sh.moveTo(e, n); else sh.lineTo(e, n);
    }); sh.closePath();
    const H = 7.4;
    const geo = new T.ExtrudeGeometry(sh, { depth: H, bevelEnabled: false, steps: 1 });
    geo.rotateX(-Math.PI / 2); geo.computeVertexNormals();
    const mat = Mstd({ map: proc.render, color: 0xe6dcc4, roughness: 0.78, side: T.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
    const body = new T.Mesh(geo, mat); body.castShadow = !!wantShadows; body.receiveShadow = true; g.add(body);
    /* flat felt roof, slightly inset */
    const roofSh = new T.Shape();
    SCHOOL.forEach((pt, i) => { if (i === 0) roofSh.moveTo(pt[0], pt[1]); else roofSh.lineTo(pt[0], pt[1]); }); roofSh.closePath();
    const rg = new T.ExtrudeGeometry(roofSh, { depth: 0.28, bevelEnabled: false }); rg.rotateX(-Math.PI / 2);
    const roof = new T.Mesh(rg, Mstd({ color: 0x3a3a38, roughness: 0.95 })); roof.position.y = H; g.add(roof);
    /* south-frontage windows — inset planes, FrontSide, no z-fight. South wall is n≈2713-2715, e 13..86 */
    for (let e = 18; e <= 80; e += 4.2) {
      windowPane(1.7, 1.55, e, 2712.7, 2.15, Math.PI, g);
      windowPane(1.7, 1.55, e, 2712.7, 5.15, Math.PI, g);
    }
    info.school = true; return g;
  }

  /* ---------- North Drive: asphalt, red block paving, kerbs, markings, twin lamps, railings, dunes ---------- */
  const lampLights = [];
  function buildRoad() {
    const g = new T.Group(); g.name = 'v116-road'; g.userData.v116 = 1; grpStrip.add(g);
    const len = ND_N1 - ND_N0, midN = (ND_N0 + ND_N1) / 2;
    const mid = warp(ND_E, midN);
    /* carriageway — plane, length along N (world −z) */
    const road = new T.Mesh(new T.PlaneGeometry(ND_W, len + 4), mats.asphalt);
    road.rotation.x = -Math.PI / 2; road.position.set(mid.x, 0.045, mid.z);
    road.receiveShadow = true; g.add(road);
    /* white edge lines + dashed centre */
    const lineMat = Mbasic({ color: 0xe8e6dc, toneMapped: false });
    for (const s of [-1, 1]) {
      const ln = new T.Mesh(new T.PlaneGeometry(0.14, len + 4), lineMat);
      ln.rotation.x = -Math.PI / 2; ln.position.set(mid.x + s * (ND_W / 2 - 0.28), 0.055, mid.z); g.add(ln);
    }
    const dashes = Math.floor(len / 7);
    for (let i = 0; i < dashes; i++) {
      const n = ND_N0 + 3 + i * 7, on = i % 1 === 0;
      if (i % 2) continue;
      const d = new T.Mesh(new T.PlaneGeometry(0.16, 3.2), lineMat);
      const q = warp(ND_E, n); d.rotation.x = -Math.PI / 2; d.position.set(q.x, 0.056, q.z); g.add(d);
    }
    /* kerbs + red block paving both sides */
    for (const s of [-1, 1]) {
      const ke = ND_E + s * (ND_W / 2 + 0.15);
      const kerb = new T.Mesh(new T.BoxGeometry(0.28, 0.16, len + 4), mats.kerb);
      const q = warp(ke, midN); kerb.position.set(q.x, 0.12, q.z); g.add(kerb);
      const pw = 2.55;
      const pv = new T.Mesh(new T.PlaneGeometry(pw, len + 4), mats.pave);
      const pe = ND_E + s * (ND_W / 2 + 0.3 + pw / 2);
      const qp = warp(pe, midN); pv.rotation.x = -Math.PI / 2; pv.position.set(qp.x, 0.13, qp.z); pv.receiveShadow = true; g.add(pv);
    }
    /* Jellicoe approach (E–W) at n≈2668, from the bridge toward the junction */
    const jn = 2668.5, je0 = -50, je1 = ND_E + ND_W / 2, jlen = je1 - je0, jmid = (je0 + je1) / 2;
    const jm = warp(jmid, jn);
    const jroad = new T.Mesh(new T.PlaneGeometry(jlen, 11.2), mats.asphalt);
    jroad.rotation.x = -Math.PI / 2; jroad.rotation.z = Math.PI / 2; /* length along X (=e) */
    /* PlaneGeometry(jlen, 11.2) after rotX -90: local Y→-Z (the 11.2 is N–S width). Wait, we want length along e (X).
       Plane (width=jlen along X, height=11.2 along Y) rotX -90: height goes to -Z = N–S width. Width stays on X. Good, no rotZ. */
    jroad.rotation.z = 0;
    jroad.position.set(jm.x, 0.046, jm.z); jroad.receiveShadow = true; g.add(jroad);
    for (const s of [-1, 1]) {
      const pv = new T.Mesh(new T.PlaneGeometry(jlen, 2.4), mats.pave);
      const q = warp(jmid, jn + s * 6.8); pv.rotation.x = -Math.PI / 2; pv.position.set(q.x, 0.13, q.z); g.add(pv);
    }
    /* twin-arm seafront lamps, instanced-ish, every 28 m, alternating sides */
    const lampG = new T.Group();
    function oneLamp(e, n) {
      const q = warp(e, n);
      const pole = new T.Mesh(new T.CylinderGeometry(0.09, 0.13, 7.4, 8), mats.iron);
      pole.position.set(q.x, 3.7, q.z); lampG.add(pole);
      const base = new T.Mesh(new T.CylinderGeometry(0.22, 0.26, 0.45, 8), mats.iron);
      base.position.set(q.x, 0.22, q.z); lampG.add(base);
      /* two curved arms along the road (N–S) */
      for (const s of [-1, 1]) {
        const arm = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 1.7, 6), mats.iron);
        arm.rotation.z = s * 0.85; arm.position.set(q.x + s * 0.65, 7.15, q.z); lampG.add(arm);
        const lan = new T.Mesh(new T.SphereGeometry(0.22, 8, 6), mats.lampG);
        lan.position.set(q.x + s * 1.15, 6.7, q.z); lampG.add(lan);
      }
      if (!LOW && lampLights.length < 10) {
        const lt = new T.PointLight(0xffe2b0, 0, 22, 2);
        lt.position.set(q.x, 6.6, q.z); lt.userData.v116 = 1; lampG.add(lt); lampLights.push(lt);
      }
    }
    for (let n = ND_N0 + 8, i = 0; n < ND_N1 - 8; n += 28, i++) {
      oneLamp(ND_E + (i % 2 ? 1 : -1) * (ND_W / 2 + 1.5), n);
    }
    g.add(lampG);
    /* seaward railings (east kerb), 1.1 m, from junction north */
    const railE = ND_E + ND_W / 2 + 2.85;
    for (let n = 2660; n < ND_N1; n += 2.4) {
      const q = warp(railE, n);
      const post = new T.Mesh(new T.BoxGeometry(0.06, 1.1, 0.06), mats.iron);
      post.position.set(q.x, 0.55, q.z); g.add(post);
    }
    for (const y of [0.35, 0.65, 1.05]) {
      const rail = new T.Mesh(new T.BoxGeometry(0.04, 0.035, ND_N1 - 2660), mats.iron);
      const q = warp(railE, (2660 + ND_N1) / 2); rail.position.set(q.x, y, q.z); g.add(rail);
    }
    /* dune grassland east of the seaward pavement — textured grass, then sand toward the sea */
    const duneW = 90, duneE = ND_E + ND_W / 2 + 3.0 + 2.55 + duneW / 2;
    const grass = new T.Mesh(new T.PlaneGeometry(duneW, len + 4), mats.grass);
    const qg = warp(duneE, midN); grass.rotation.x = -Math.PI / 2; grass.position.set(qg.x, 0.06, qg.z); grass.receiveShadow = true; g.add(grass);
    const sand = new T.Mesh(new T.PlaneGeometry(50, len + 8), mats.sand);
    const qs = warp(duneE + duneW / 2 + 24, midN); sand.rotation.x = -Math.PI / 2; sand.position.set(qs.x, 0.05, qs.z); g.add(sand);
    /* walkable road + pavement */
    const gpFn = window.__groundParts || (window.__groundParts = []);
    gpFn.unshift((x, z) => {
      const e = x, n = -z;
      if (n >= ND_N0 - 2 && n <= ND_N1 + 2 && Math.abs(e - ND_E) < ND_W / 2 + 3.2) return 0.06;
      if (Math.abs(n - jn) < 7 && e >= je0 && e <= je1 + 2) return 0.06;
      return null;
    });
    info.road = true;
  }

  /* ---------- hide leftover v115 alley that hit the Duke; hide v115 mirrored fingerposts (replaced) ---------- */
  function tidyV115() {
    const b = S.getObjectByName('v115-bridges');
    if (!b) return;
    b.traverse(o => {
      if (o.isSprite) { o.visible = (window.__gfx === 'neon'); return; }
      if (!o.isMesh) return;
      const wp = new T.Vector3(); o.getWorldPosition(wp);
      const e = wp.x, n = -wp.z;
      /* old alley past e=105 into the Duke, and the old mirrored fingerpost boards (we replaced them) */
      if (e > 105 && e < 125 && n > 2684 && n < 2698 && wp.y < 4) o.visible = false;
    });
  }

  /* ---------- jumps for the showcase + ?jump= ---------- */
  function installJumps() {
    const J = fx.extraJumps || (fx.extraJumps = {});
    const mk = (e, n, le, ln, pitch, y) => {
      const a = warp(e, n), b = warp(le, ln); return [a.x, a.z, [b.x, b.z, pitch || 0.04, y || 0.06], true];
    };
    /* on North Drive looking NORTH, Iron Duke on the left — matches Joseph's SV "Iron Duke on left" */
    J.northdrive = mk(ND_E, 2660, ND_E, 2695, 0.02, 0.1);
    /* in front of the Duke, on the road, looking WEST at the façade */
    J.iron_duke_sv = mk(ND_E + 2, 2692, 130, 2692, 0.06, 0.1);
    /* Jellicoe junction looking west at the 1930s semis (south of the road) */
    J.jellicoe_semis = mk(120, 2668, 85, 2652, 0.05, 0.1);
    /* seaward pavement looking EAST at the dunes and overcast sky */
    J.northdrive_dunes = mk(ND_E + ND_W / 2 + 1.6, 2692, ND_E + 40, 2692, 0.08, 0.15);
    /* school gate, looking NORTH at the entrance */
    J.school_gate = mk(50, 2700, 50, 2713, 0.06, 0.16);
    info.jumps = Object.keys(J).filter(k => /northdrive|iron_duke|jellicoe_semis|school_gate/.test(k));
  }

  /* ---------- graphics switcher UI (replaces LOOK/SOLID/RICH, obvious in MENU) ---------- */
  function installUI() {
    const css = document.getElementById('v116-ui') || document.createElement('style');
    css.id = 'v116-ui';
    css.textContent = `
#wlite, #v116gfx{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:6px;border-radius:12px;
  background:rgba(0,10,8,.9);border:1px solid #2a4a40;font:700 11px ui-monospace,monospace}
#wlite .v116cap, #v116gfx .v116cap{flex:1 0 100%;letter-spacing:.14em;color:#00ff9d;font-size:.68rem;margin:0 0 2px}
#wlite button[data-gfx], #v116gfx button[data-gfx]{min-height:40px;min-width:58px;padding:6px 10px;border-radius:8px;border:1px solid #00ff9d55;
  background:transparent;color:#cfe;cursor:pointer;font:700 .78rem ui-monospace,monospace;letter-spacing:.06em;touch-action:manipulation}
#wlite button[data-gfx][aria-pressed="true"], #v116gfx button[data-gfx][aria-pressed="true"]{background:#00ff9d;color:#00140c;border-color:#00ff9d}
#wlite .v116tip, #v116gfx .v116tip{flex:1 0 100%;color:#8ab;font:400 .68rem/1.3 ui-monospace,monospace;margin-top:2px}
`;
    if (!css.parentNode) document.head.appendChild(css);
    function fill(host) {
      if (!host) return;
      host.innerHTML = '';
      host.setAttribute('aria-label', 'Graphics level');
      const cap = document.createElement('div'); cap.className = 'v116cap'; cap.textContent = 'GRAPHICS'; host.appendChild(cap);
      LEVELS.forEach(L => {
        const b = document.createElement('button'); b.type = 'button'; b.dataset.gfx = L.id;
        b.textContent = L.label; b.title = L.tip;
        b.setAttribute('aria-pressed', String(window.__gfx === L.id));
        b.addEventListener('click', ev => { ev.stopPropagation(); ev.preventDefault(); setLevel(L.id); });
        host.appendChild(b);
      });
      const tip = document.createElement('div'); tip.className = 'v116tip';
      const cur = LEVELS.find(l => l.id === window.__gfx) || LEVELS[3];
      tip.textContent = cur.tip; host.appendChild(tip);
    }
    const host = document.getElementById('wlite');
    if (host) {
      /* stop the old v80 reload-on-click handler by replacing the node */
      const fresh = host.cloneNode(false); host.parentNode.replaceChild(fresh, host); fresh.id = 'wlite';
      fill(fresh);
    }
    /* #wlite is the first widget the v115 MENU gathers, so GRAPHICS is at the top of the menu.
       Do not insert a second #v116gfx — that duplicated the switcher. */
    window.__setGfx = setLevel;
  }
  function refreshUI() {
    document.querySelectorAll('button[data-gfx]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.gfx === window.__gfx)));
    document.querySelectorAll('.v116tip').forEach(t => {
      const cur = LEVELS.find(l => l.id === window.__gfx); if (cur) t.textContent = cur.tip;
    });
  }

  /* ---------- apply level (runtime, no reload; neon layers are hidden, never deleted) ---------- */
  function setLevel(id, fromPick) {
    if (!LEVELS.some(l => l.id === id)) id = 'real';
    gfx = id; window.__gfx = id; window.IE_GFX = id;
    try { localStorage.setItem('IE_GFX', id); } catch (_) {}
    /* compatibility with the old 0/1/2 ladder (facades, shadows, etc.) without a forced reload */
    const map = { neon: 0, lite: 0, solid: 1, real: 2 };
    try { localStorage.setItem('jx-detail', String(map[id])); } catch (_) {}
    window.__detail = map[id];
    catalogNeon();
    const neon = id === 'neon';
    setNeonVisible(neon);
    grpStrip.visible = !neon;          /* showcase lives on lite/solid/real */
    grpStrip.traverse(o => {
      if (o.userData && o.userData.realOnly) o.visible = (id === 'real' && grpStrip.visible);
    });
    /* lite: still show massing but skip some trim (hedges already cheap) */
    applyEnv(id === 'real');
    applyFloatingCleanup(!neon);
    placeJellicoeScreen(!neon);
    tidyV115();
    refreshUI();
    info.level = id;
    console.info('[IE] v116 graphics', id);
  }
  function applyFloatingCleanup(realistic) {
    /* at realistic levels, hide unattached floating neon / giant labels; at NEON, restore */
    neonObjs.forEach(o => { if (!o) return; if (o.parent && o.parent.name === 'osm-buildings') return; /* already handled */ });
    if (fx.feature && fx.feature.grp && !fx.feature.grp.userData.v116pinned) {
      fx.feature.grp.visible = !realistic;
    }
    if (fx.clusters) fx.clusters.forEach(c => { if (c.grp) c.grp.visible = !realistic; });
    /* GREAT YARMOUTH RACECOURSE giant sprite (h=12, y=26) */
    S.traverse(o => {
      if (!o.isSprite) return;
      if (o.userData && o.userData.v116) return;
      const sc = Math.max(o.scale.x, o.scale.y);
      if (o.position.y > 12 || sc > 6) o.visible = !realistic;
    });
  }

  /* ---------- sky: real GY time + weather, not forced day. Proper night (not a void). ---------- */
  let userSky = false;
  function hookSkyButton() {
    const b = document.getElementById('daynight');
    if (b && !b.dataset.v116) { b.dataset.v116 = '1'; b.addEventListener('click', () => { userSky = true; }, true); }
    /* explicit ?sky=day|night is a preview override only — default is still real GY time */
    const sq = (location.search.match(/[?&]sky=(day|night)/) || [])[1];
    if (sq && fx.env && fx.env.state) { userSky = true; fx.env.state.holdPhase = true; fx.env.state.phase = sq === 'day' ? 0.3 : 0.8; }
  }
  function solarPhase() {
    const d = new Date(); const hours = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
    return ((0.3 + (hours - 12) / 24) % 1 + 1) % 1;
  }
  function tuneSky() {
    const E = fx.env && fx.env.state;
    hookSkyButton();
    if (E) {
      E.holdPhase = !userSky;
      if (!userSky) E.phase = solarPhase();
    }
    const earth = fx.earth;
    const day = E ? E.day : 0.6;
    const cloud = E ? E.cloud : 0.5;
    const rain = E ? E.rain : 0;
    const gloom = Math.min(1, cloud * 0.75 + rain * 0.35);
    /* lamps at night */
    const night = 1 - day;
    lampLights.forEach(l => { l.intensity = night * 6.5; l.visible = night > 0.25; });
    /* v114 sky / lights / fog already ran; nudge for overcast day and a visible night sky */
    const sky = S.getObjectByName('v114-sky');
    const sunL = S.getObjectByName('v114-sun');
    const hemi = S.getObjectByName('v114-hemi');
    if (day > 0.35 && gloom > 0.4) {
      if (sky && sky.material && sky.material.uniforms) {
        sky.material.uniforms.turbidity.value = 10 + gloom * 10;
        sky.material.uniforms.rayleigh.value = 0.35;
        sky.material.uniforms.mieCoefficient.value = 0.02;
        sky.material.uniforms.mieDirectionalG.value = 0.55;
      }
      if (sunL) sunL.intensity = Math.max(0.25, (sunL.intensity || 1) * (0.55 - gloom * 0.15));
      if (hemi) hemi.intensity = 0.55 + (1 - gloom) * 0.15;
      if (S.fog) { S.fog.color.setHex(0x8a9298); S.fog.density = (phone ? 0.00095 : 0.0007) * (E && E.fogK ? E.fogK : 1); }
      if (R && R.toneMappingExposure != null) R.toneMappingExposure = 0.68 + (1 - gloom) * 0.15;
    } else if (day <= 0.35) {
      /* night: dark blue-grey horizon, not pitch black; no neon sky-sphere (that caused the v115 blob) */
      if (sky && sky.material && sky.material.uniforms) {
        sky.material.uniforms.turbidity.value = 3 + gloom * 4;
        sky.material.uniforms.rayleigh.value = 0.25;
      }
      if (S.fog) { S.fog.color.setHex(0x141a28); S.fog.density = phone ? 0.0011 : 0.00085; }
      if (R && R.toneMappingExposure != null) R.toneMappingExposure = 0.42 + night * 0.08;
      if (hemi) hemi.intensity = 0.16 + (1 - gloom) * 0.08;
      if (S.background && S.background.isColor) S.background.setHex(0x10141e);
    }
  }

  /* ---------- pop-in: raise chunk cull distances (applied each few frames) ---------- */
  function reducePopin() {
    if (!fx.chunks) return;
    const far = LOW ? 1500 : ((window.__gfx === 'real' || (window.__detail ?? 1) >= 2) ? 3200 : 2400);
    const edge = LOW ? 400 : 1100;
    const t = performance.now() / 1000;
    if (t - (fx.cullT || 0) < 0.2) { /* world-fx already culled; extend */ }
    for (const c of fx.chunks) {
      const d = Math.hypot(c.c.x - P.pos.x, c.c.z - P.pos.z) - c.r;
      if (c.o && c.o[0] && d < far) c.o[0].visible = true;
      if (c.edge && d < edge) c.edge.visible = true;
    }
    fx._v116far = far;
  }

  /* ---------- build the strip ---------- */
  function buildStrip() {
    buildRoad();
    /* 1930s semis, south of Jellicoe, west of North Drive, facing NORTH onto Jellicoe.
       Front normal should be +n (world −z), ry = Math.PI (plane/front faces −z). */
    const frontNorth = Math.PI;
    addSemiPair(78, 2648, frontNorth, false);   /* hipped */
    addSemiPair(96, 2648, frontNorth, true);    /* gable */
    addSemiPair(114, 2648, frontNorth, false);
    /* one pair facing East onto North Drive, south of the junction */
    addSemiPair(138, 2634, Math.PI / 2, true);
    buildDuke();
    buildSchool();
    buildPath();
    installJumps();
    /* optional tight shadows on this strip only, REAL + capable devices */
    if (wantShadows && window.__gfx === 'real' && R) {
      R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
      const sunL = S.getObjectByName('v114-sun');
      if (sunL) {
        sunL.castShadow = true;
        const s = sunL.shadow; s.mapSize.set(1024, 1024);
        s.camera.near = 2; s.camera.far = 420;
        s.camera.left = s.camera.bottom = -140; s.camera.right = s.camera.top = 140;
        s.bias = -0.0005; s.normalBias = 0.035;
      }
      info.shadows = true;
    }
    info.strip = true;
  }

  /* ---------- ?jump= after load; ?nowelcome already in welcome ---------- */
  function honorJump() {
    const k = (location.search.match(/[?&]jump=([a-z0-9_]+)/i) || [])[1];
    if (!k || !fx.extraJumps || !fx.extraJumps[k]) return;
    const j = fx.extraJumps[k];
    if (window.__world && window.__world.teleport) {
      /* [x,z,[lx,lz,pitch,y],raw] */
      try { window.__world.teleport(j[0], j[1], j[2], j[3]); } catch (_) {}
    } else if (P && P.pos) {
      P.pos.set(j[0], (j[2] && j[2][3] != null ? j[2][3] : 0) + 1.7, j[1]);
      if (j[2]) P.yaw = Math.atan2(-(j[2][0] - j[0]), -(j[2][1] - j[1]));
    }
  }

  /* ---------- boot ---------- */
  buildStrip();
  installUI();
  setTimeout(installUI, 800); setTimeout(installUI, 2500);
  setTimeout(fixMirrored, 600); setTimeout(fixMirrored, 2000); setTimeout(fixMirrored, 6000);
  setTimeout(fixZFight, 800); setTimeout(fixZFight, 3000);
  setTimeout(() => { catalogNeon(); setLevel(gfx, true); honorJump(); }, 1200);
  setTimeout(() => { catalogNeon(); setLevel(gfx, true); honorJump(); }, 3500);
  setTimeout(honorJump, 5000);

  info.ready = true; fx.v116Info = info; window.__fx116 = info;
  console.info('[IE] v116 ready', { gfx, phone, LOW, LITE, shadows: !!info.shadows });

  function update(/* t, dt */) {
    tuneSky();
    reducePopin();
    /* keep neon visibility stable against v115-solid's delayed re-hide */
    if (window.__gfx === 'neon' && (update._n = (update._n || 0) + 1) % 40 === 0) setNeonVisible(true);
    if (window.__gfx !== 'neon' && (update._f = (update._f || 0) + 1) % 30 === 0) {
      applyFloatingCleanup(true);
      placeJellicoeScreen(true);
      /* any leftover unattached track screens still floating in the sky */
      S.traverse(o => {
        if (!o.isMesh && !o.isGroup) return;
        if (o.userData && o.userData.v116) return;
        const u = o.userData || (o.parent && o.parent.userData) || {};
        if ((u.track || u.feature || u.orbit) && (o.position.y > 4 || (o.parent && o.parent.position && o.parent.position.y > 4))) {
          (o.parent && o.parent.userData && o.parent.userData.orbit ? o.parent : o).visible = false;
        }
      });
      if (fx.clusters) fx.clusters.forEach(c => { if (c.grp && !c.grp.userData.v116pinned) c.grp.visible = false; });
      if (fx.feature && fx.feature.grp && !fx.feature.grp.userData.v116pinned) fx.feature.grp.visible = false;
    }
    if (window.__gfx !== 'neon' && fx.feature && fx.feature.grp && fx.feature.grp.userData.v116pinned) {
      fx.feature.y0 = 2.8;
    }
  }
  fx.v116 = { info, update, apply: setLevel, setLevel };
  return { info, update, apply: setLevel, setLevel };
}
