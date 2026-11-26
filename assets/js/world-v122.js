/* v122 lean pass — preview only. Toggles (set before load, e.g. in the console then reload):
   IE_V122_JUMPGUARD=false  no jump-list click guard       IE_V122_ZFIX=false   no extra facade polygon offset
   IE_V122_GOLDBOT=false    no GoldBot kiosk               IE_V122_HUDFIX=false no weather/visitor pill nudge
   IE_V122_VR=false         no Enter VR button             (also in other files: IE_V122_FIGS, IE_V122_TOAST, IE_V122_NORELOAD, IE_V122_LOCALTEX)
   v123 (preview bump): IE_V123_CLIP=false  old camera/collision    IE_V123_CARS=false  old two-box vehicles
                        IE_V123_FACADES=false  no untextured-wall reskin
   GoldBot / Digital AssetOps is Zak Denny's project; text here is deliberately plain: research & demo testing, no claims, no numbers. */
const on = k => window['IE_V122_' + k] !== false;
const GOLDBOT = 'https://goldbot-digitalassetops.lovable.app', FB = 'https://www.facebook.com/profile.php?id=61578308143435';

export function initV122({ T, S, CAM, P, LBL, CL, LITE, warp, fx }) {
  const st = { t: 0, t0: performance.now(), zfix: 0, hud: 0, ground: 0, facades: 0, facadesN: 0, facadeNames: [] };

  /* A2: jump list — modules keep inserting stops for ~30 s, so a tap could land on whatever slid under the finger.
     Block a click if the list changed in the last 600 ms or if the button under the finger changed between press and release;
     otherwise remember the stop's name so the toast can say 'Travelling to <place>…'. */
  if (on('JUMPGUARD')) {
    let down = null, mut = 0; const seen = new WeakSet();
    const watch = () => document.querySelectorAll('.wmap-jumps').forEach(n => { if (seen.has(n)) return; seen.add(n); new MutationObserver(() => { mut = performance.now(); }).observe(n, { childList: true, subtree: true }); });
    watch(); st.watch = watch;
    document.addEventListener('pointerdown', e => { down = e.target.closest && e.target.closest('.wmap-jumps button'); }, true);
    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('.wmap-jumps button'); if (!b) return;
      if (e.isTrusted && (performance.now() - mut < 600 || (down && down !== b))) { e.preventDefault(); e.stopImmediatePropagation(); b.animate && b.animate([{ outline: '2px solid #ffd166' }, { outline: '0 solid transparent' }], 500); b.title = 'List was still updating — tap again'; return; }
      fx.jLabel = (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 48) || null;
    }, true);
  }

  /* B: GoldBot / Digital AssetOps kiosk between the two Lodge hatches + clearer hatch labels */
  let kiosk = null;
  if (on('GOLDBOT')) {
    const E0 = -78, N0 = -438.5, w = warp(E0, N0);
    kiosk = new T.Group(); kiosk.name = 'v122-goldbot-kiosk'; kiosk.position.set(w.x, 0, w.z); kiosk.rotation.y = Math.PI / 2; // board faces east, toward the Lodge jump spot
    const blk = new T.MeshLambertMaterial({ color: 0x101010 }), gold = new T.MeshLambertMaterial({ color: 0xd4a937, emissive: 0x3a2a05 });
    const post = new T.Mesh(new T.BoxGeometry(0.16, 2.2, 0.16), blk); post.position.set(-0.75, 1.1, 0); kiosk.add(post); const p2 = post.clone(); p2.position.x = 0.75; kiosk.add(p2);
    const frame = new T.Mesh(new T.BoxGeometry(1.8, 1.15, 0.1), gold); frame.position.set(0, 1.75, 0); kiosk.add(frame);
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 320; const g = cv.getContext('2d');
    g.fillStyle = '#0b0b0b'; g.fillRect(0, 0, 512, 320); g.strokeStyle = '#d4a937'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 304);
    g.fillStyle = '#f5c542'; g.font = 'bold 54px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('GOLDBOT', 256, 82);
    g.font = '28px system-ui, sans-serif'; g.fillStyle = '#e8d9a8'; g.fillText('Digital AssetOps · Zak Denny', 256, 126);
    g.fillText('V15.4 — research & demo testing', 256, 176); g.fillStyle = '#ffb4a0'; g.fillText('Not financial advice', 256, 216);
    g.fillStyle = '#f5c542'; g.font = 'bold 26px system-ui, sans-serif'; g.fillText('Walk up · tap to open ↗', 256, 276);
    const tex = new T.CanvasTexture(cv); if (T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
    const face = new T.Mesh(new T.PlaneGeometry(1.7, 1.06), new T.MeshBasicMaterial({ map: tex, fog: false })); face.position.set(0, 1.75, 0.056); kiosk.add(face);
    face.userData.action = () => openPanel(); face.userData.reach = 7; face.userData.label = 'GoldBot · Digital AssetOps';
    S.add(kiosk); if (CL) CL.push(face);
    try { fx.addSolid && fx.addSolid([[E0 - 0.3, N0 - 1], [E0 + 0.3, N0 - 1], [E0 + 0.3, N0 + 1], [E0 - 0.3, N0 + 1]]); } catch (_) {}
    if (LBL) { const l = LBL('GOLDBOT · DIGITAL ASSETOPS', '#f5c542', 1); l.position.set(w.x, 3.2, w.z); S.add(l); kiosk.userData.lbl = l;
      const o = warp(-70, -430), lo = LBL('JHIOS OFFICE · PASSWORD HATCH', '#ffb347', 1); lo.position.set(o.x, 6.5, o.z); S.add(lo); }
  }
  let panel = null;
  function openPanel() {
    if (!panel) {
      const css = document.createElement('style'); css.textContent = `.v122gb{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:60;max-width:min(92vw,380px);background:#0b0b0b;color:#efe3bd;border:2px solid #d4a937;border-radius:12px;padding:16px 18px;font:14px/1.45 system-ui,sans-serif;box-shadow:0 0 24px #d4a93755}.v122gb h3{margin:0 0 6px;color:#f5c542;font-size:18px}.v122gb a{display:block;margin:8px 0;padding:9px 12px;border-radius:8px;background:#d4a937;color:#111;font-weight:700;text-decoration:none;text-align:center}.v122gb a.alt{background:transparent;color:#f5c542;border:1px solid #d4a937}.v122gb small{display:block;color:#c9b98a;margin-top:6px}.v122gb button{position:absolute;right:8px;top:6px;background:none;border:0;color:#f5c542;font-size:20px;cursor:pointer}`;
      document.head.appendChild(css);
      panel = document.createElement('div'); panel.className = 'v122gb'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'GoldBot');
      panel.innerHTML = `<button type="button" aria-label="Close">×</button><h3>GoldBot · Digital AssetOps</h3><div>Zak Denny's GoldBot V15.4 — research &amp; demo testing. Not financial advice.</div><a href="${GOLDBOT}" target="_blank" rel="noopener">Open GoldBot ↗</a><a class="alt" href="${FB}" target="_blank" rel="noopener">Digital AssetOps on Facebook ↗</a><small>Opens in a new tab. JHIOS and Digital AssetOps are separate projects.</small>`;
      panel.querySelector('button').onclick = () => { panel.hidden = true; };
      document.body.appendChild(panel);
    }
    panel.hidden = false;
  }

  /* C: WebXR — button only where immersive-vr is supported; nothing changes for everyone else. Untested on a headset. */
  if (on('VR') && navigator.xr && fx.renderer) navigator.xr.isSessionSupported('immersive-vr').then(ok => { if (ok) setupVR(); }).catch(() => {});
  function setupVR() {
    const R = fx.renderer, rig = new T.Group(); rig.name = 'v122-vr-rig'; S.add(rig);
    const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = 'Enter VR';
    btn.style.cssText = 'position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:55;padding:9px 18px;border-radius:20px;border:1px solid #7dffd0;background:#04140ecc;color:#7dffd0;font:600 14px system-ui,sans-serif;cursor:pointer';
    document.body.appendChild(btn);
    let sess = null, parent0 = null, turned = [false, false]; const ctrls = [];
    const ground = new T.Plane(new T.Vector3(0, 1, 0), 0), ray = new T.Raycaster(), m4 = new T.Matrix4(), hit = new T.Vector3(), dir = new T.Vector3(), fw = new T.Vector3();
    for (let i = 0; i < 2; i++) {
      const c = R.xr.getController(i); const ln = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3(0, 0, -6)]), new T.LineBasicMaterial({ color: 0x7dffd0 }));
      c.add(ln); rig.add(c); ctrls.push(c);
      c.addEventListener('selectend', () => { // teleport to where the ray meets the ground (within 20 m), wall check if available
        m4.identity().extractRotation(c.matrixWorld); ray.ray.origin.setFromMatrixPosition(c.matrixWorld); ray.ray.direction.set(0, 0, -1).applyMatrix4(m4);
        ground.constant = -(P.pos.y - 1.7); if (!ray.ray.intersectPlane(ground, hit)) return;
        if (Math.hypot(hit.x - P.pos.x, hit.z - P.pos.z) > 20) return; if (window.__collide && window.__collide(hit.x, hit.z)) return;
        P.pos.x = hit.x; P.pos.z = hit.z;
      });
    }
    btn.onclick = async () => {
      if (sess) { sess.end(); return; }
      try { R.xr.enabled = true; R.xr.setReferenceSpaceType('local-floor');
        sess = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
        await R.xr.setSession(sess); parent0 = CAM.parent; rig.add(CAM); CAM.position.set(0, 0, 0); CAM.rotation.set(0, 0, 0); btn.textContent = 'Exit VR';
        sess.addEventListener('end', () => { sess = null; rig.remove(CAM); if (parent0) parent0.add(CAM); R.xr.enabled = false; btn.textContent = 'Enter VR'; });
      } catch (e) { sess = null; R.xr.enabled = false; btn.textContent = 'VR unavailable'; setTimeout(() => { btn.textContent = 'Enter VR'; }, 2500); }
    };
    window.__vrFrame = (pl, dt) => {
      const s = R.xr.getSession(); if (s) for (const src of s.inputSources) {
        const a = src.gamepad && src.gamepad.axes; if (!a || a.length < 4) continue; const x = a[2], y = a[3], hand = src.handedness === 'right' ? 1 : 0;
        if (hand === 0) { if (Math.hypot(x, y) > 0.15) { CAM.getWorldDirection(fw); fw.y = 0; fw.normalize(); dir.set(-fw.z, 0, fw.x); // head-relative smooth move
            const sp = 3.2 * dt, dx = (fw.x * -y + dir.x * x) * sp, dz = (fw.z * -y + dir.z * x) * sp, C = window.__collide;
            if (!C || C(pl.pos.x, pl.pos.z) || !C(pl.pos.x + dx, pl.pos.z + dz)) { pl.pos.x += dx; pl.pos.z += dz; } } }
        else { if (Math.abs(x) > 0.6) { if (!turned[1]) { pl.yaw -= Math.sign(x) * Math.PI / 6; turned[1] = true; } } else if (Math.abs(x) < 0.3) turned[1] = false; } // 30° snap turn
      }
      rig.position.set(pl.pos.x, pl.pos.y - 1.7, pl.pos.z); rig.rotation.set(0, pl.yaw, 0);
    };
  }


  /* v123-1: if the player ends up inside a wall (jump, residual gap), spiral them out. Runs every frame, cheap grid test. */
  if (window.IE_V123_CLIP !== false) {
    window.__camUnclip = (pl) => {
      const C = window.__collide; if (!C || !C(pl.pos.x, pl.pos.z, 0.3)) return;
      for (let rad = 0.5; rad <= 10; rad += 0.5) {
        const n = Math.max(8, (rad * 8) | 0);
        for (let i = 0; i < n; i++) {
          const a = i * 6.28318530718 / n, x = pl.pos.x + Math.cos(a) * rad, z = pl.pos.z + Math.sin(a) * rad;
          if (!C(x, z, 0.85)) { pl.pos.x = x; pl.pos.z = z; return; }
        }
      }
    };
    /* backup solids for the two custom Marine Parade blocks (Arc Cinema + Fallen Angels) in case the OSM footprint is slightly smaller than the visible box */
    try {
      /* pad ~1.2 m past the visible boxes: Fallen Angels is drawn 1% larger than its OSM footprint, which is how the camera could clip the last half-metre */
      fx.addSolid && fx.addSolid([[19.8, 614], [56.2, 614], [56.2, 674.2], [19.8, 674.2]]);
      fx.addSolid && fx.addSolid([[24.6, 669.6], [57.8, 669.6], [57.8, 700.4], [24.6, 700.4]]);
    } catch (_) {}
  }

  /* v123-3: world-wide sweep — any large untextured / flat-coloured wall gets the v69 world-space facade shader (windows, doors, grime).
     Skips roads, cars, roofs-with-maps, holograms, thin signs, and anything already using facade69. The Arc Cinema's cream box is the one in Joseph's recording. */
  const on123 = k => window['IE_V123_' + k] !== false;
  const facCache = new Map();
  function reskinFacades() {
    if (!on123('FACADES') || !fx.facade69) return 0;
    const skipName = /road|pavement|kerb|ground|dtm|terrain|water|sea|river|car|vehicle|wheel|tree|hedge|fence|rail|lamp|holo|screen|poster|sign|presence|player|train|track|kiosk|globe|sand|dune|asphalt|grass|pave|deck|bridge|waterway|v115-solid|v121|osm-buildings|sky|sun|earth|cloud|moon|atmos|env|hemi|v114/;
    const box = new T.Box3(), sz = new T.Vector3();
    let n = 0;
    S.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || o.userData.v123facade) return;
      const nm = ((o.name || '') + ' ' + ((o.parent && o.parent.name) || '') + ' ' + ((o.parent && o.parent.parent && o.parent.parent.name) || '')).toLowerCase();
      if (skipName.test(nm)) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const okType = m => m && (m.isMeshBasicMaterial || m.isMeshLambertMaterial || m.isMeshStandardMaterial || m.isMeshPhongMaterial);
      if (!mats[0] || mats.some(m => !okType(m) || m.map || m.alphaMap || m.uniforms || (m.transparent && m.opacity < 0.9) || (m.blending && m.blending !== T.NormalBlending))) return;
      if (mats.some(m => m.customProgramCacheKey && /^facade69/.test(String(m.customProgramCacheKey())))) { o.userData.v123facade = 1; return; }
      box.setFromObject(o); box.getSize(sz);
      if (sz.y < 2.2 || Math.min(sz.x, sz.z) < 0.4 || Math.max(sz.x, sz.y, sz.z) < 4 || Math.max(sz.x, sz.y, sz.z) > 400) return;
      const hex = (mats[0].color && mats[0].color.getHex) ? mats[0].color.getHex() : 0xcccccc;
      const lum = ((hex >> 16) & 255) * 0.3 + ((hex >> 8) & 255) * 0.59 + (hex & 255) * 0.11;
      if (lum < 28 || lum > 245) return; // skip near-black and near-white emissive/trim
      const sat = Math.max((hex >> 16) & 255, (hex >> 8) & 255, hex & 255) - Math.min((hex >> 16) & 255, (hex >> 8) & 255, hex & 255);
      if (sat > 200 && lum > 80) return; // skip neon greens / magentas
      const fac = facCache.get(hex) || facCache.set(hex, fx.facade69({ color: hex })).get(hex);
      if (mats.length === 1) o.material = fac;
      else o.material = mats.map(m => { const h = m.color && m.color.getHex ? m.color.getHex() : hex; return facCache.get(h) || facCache.set(h, fx.facade69({ color: h })).get(h); });
      o.userData.v123facade = 1; n++; if (st.facadeNames.length < 30) st.facadeNames.push((o.parent&&o.parent.name)||o.name||hex.toString(16));
    });
    return n;
  }

  return {
    update(t, dt) {
      st.t = (performance.now() - st.t0) / 1000; // wall-clock seconds (dt is clamped on slow devices)
      if (st.watch && st.t < 40 && (st.t | 0) % 2 === 0) st.watch();
      /* A5: speckled windows — coplanar facade skins vs added detail; push the facade shader back harder once the REAL set exists */
      if (on('ZFIX') && st.zfix < 3 && st.t > 6 + st.zfix * 10) { st.zfix++; S.traverse(o => { const ms = o.isMesh && (Array.isArray(o.material) ? o.material : [o.material]); if (!ms) return;
        for (const m of ms) if (m && m.customProgramCacheKey && /^facade69/.test(String(m.customProgramCacheKey())) && !(m.polygonOffsetUnits >= 4)) { m.polygonOffset = true; m.polygonOffsetFactor = 2; m.polygonOffsetUnits = 4; m.needsUpdate = true; } }); }
      /* cheap: weather pill must not sit on top of the visitor count */
      if (on('HUDFIX') && st.t - st.hud > 1) { st.hud = st.t; const a = document.getElementById('wxhud'), b = document.querySelector('.wpresence');
        if (a && b && !b.closest('#v115panel') && a.offsetParent && b.offsetParent) { const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
          if (ra.bottom > rb.top && rb.bottom > ra.top && ra.right > rb.left && rb.right > ra.left) b.style.top = Math.ceil(ra.bottom + 6) + 'px'; } }
      if (kiosk && st.ground < 60) { st.ground++; let g = null; const k = kiosk.position; for (const f of window.__groundParts || []) { const v = f(k.x, k.z, 50); if (v != null) { g = v; break; } } if (g != null) { k.y = g; if (kiosk.userData.lbl) kiosk.userData.lbl.position.y = g + 3.2; } }
      if (on123('FACADES') && st.facades < 4 && st.t > 3 + st.facades * 8) { st.facades++; st.facadesN += reskinFacades(); fx.v123 = Object.assign(fx.v123 || {}, { facades: st.facadesN, names: st.facadeNames }); }
    }
  };
}
