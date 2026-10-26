/* JHIOS world v81 — fat preview pass on the ?v=81 re-grade FAILs (Joseph prefers fat). Preview only.
   P0 1 Lodge: 8-track cluster brought down to eye level in front of the Royal Assembly Rooms (east apron), jump faces it square-on; full one-line ROYAL ASSEMBLY ROOMS fascia.
   P0 2 Youth Centre: music panels within 90 m of the landing relocated behind the visitor + shrunk; first look = path + Centre massing.
   P0 3 Barnard Bridge: tarmac carriageway + pavements either side over deck and gentle ramps, grass blend on the south bank; spawn on the road facing along the bridge.
   P0 4 Plaza globe: always-visible [F] VIEW ANALYTICS within 40 m + click on globe mesh; honest placeholder panel. STACK/LAYER MAP ✕ close hardened.
   P1 Beatty Close jump + label (OSM beatty_close), Britannia overhead blue slab hidden, Wellington cream slab hidden + spawn nudged, harbour magenta wire killed + clutter capped,
      Tower opaque octagon drum, Jellicoe road text shrunk, NPC count reported. */
export function initV81(o) {
  const { T, S, warp, fx, LBL } = o, grp = new T.Group(); grp.name = 'v81'; S.add(grp); const info = { fixes: [] };
  const M = (c, x = {}) => new T.MeshBasicMaterial(Object.assign({ color: c }, x));
  const retry = (fn, n = 30, ms = 1000) => { let k = 0; const go = () => { let ok = false; try { ok = fn(); } catch (e) { console.warn('v81', e); } if (!ok && ++k < n) setTimeout(go, ms); }; setTimeout(go, ms); };
  const addJumpBtn = (key, label, afterKey) => retry(() => { const nav = document.querySelector('.wmap-jumps'); if (!nav) return false; if (!nav.querySelector(`[data-jump="${key}"]`)) { const b = document.createElement('button'); b.type = 'button'; b.dataset.jump = key; b.textContent = label; const a = afterKey && nav.querySelector(`[data-jump="${afterKey}"]`); a ? a.after(b) : nav.appendChild(b); } return true; });
  const PJ = fx.pj81 = fx.pj81 || {};
  const board = (text, w, h, x, y, z, ry, bg = '#0f1a2a', fg = '#fff6d8') => { const c = document.createElement('canvas'); c.width = 2048; c.height = Math.round(2048 * h / w); const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = c.height * 0.62; g.font = `bold ${fs}px Georgia,serif`; while (g.measureText(text).width > c.width * 0.92) { fs *= 0.92; g.font = `bold ${fs}px Georgia,serif`; } g.fillText(text, c.width / 2, c.height / 2 + 4);
    const tx = new T.CanvasTexture(c); if (T.SRGBColorSpace) tx.colorSpace = T.SRGBColorSpace; const m = new T.Mesh(new T.PlaneGeometry(w, h), M(0xffffff, { map: tx, fog: false, toneMapped: false, side: T.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; grp.add(m); return m; };

  // ---- P0 1: Lodge (v69 model: front e=-115.2, n -458..-437, faces east) ----
  { const NC = -447.5, front = warp(-115.2, NC), cc = warp(-93, NC), sp = warp(-48, NC), E = Math.atan2(1, 0) /* faces +x */;
    board('ROYAL ASSEMBLY ROOMS', 18, 1.6, front.x + 0.7, 15.3, front.z, Math.PI / 2); // one line, above cornice, square to the apron
    PJ.lodge = [sp.x, sp.z, [front.x, front.z, 0.06]]; // land on the apron, looking straight west at the cluster + fascia
    retry(() => { let k = 0; for (const c of fx.clusters || []) { if (c.key !== 'cat:royal-assembly-rooms' && c.key !== 'cat:assembly-rooms-hatch') continue; if (c.grp.userData.v81) { k++; continue; }
        const main = c.key === 'cat:royal-assembly-rooms'; let lo = 1e9; for (const m of c.grp.children) if (m.userData && m.userData.track) lo = Math.min(lo, m.position.y);
        const s = main ? 0.8 : 0.5; c.grp.scale.setScalar(s); c.grp.position.set(cc.x, lo < 1e8 ? 4.2 - lo * s : 0, main ? cc.z : cc.z - 38); c.spin = main ? 0.02 : 0.05; c.grp.userData.v81 = 1; k++; }
      info.lodgeCluster = k; return k >= 2; }); info.fixes.push('lodge-eye-level'); }

  // ---- P0 2: Youth Centre declutter (landing -66,-2380 looking -z) ----
  retry(() => { let k = 0, i = 0; for (const c of fx.clusters || []) { const p = c.grp.position; if (c.grp.userData.v81y) continue; if (Math.hypot(p.x + 66, p.z + 2380) < 90) {
      c.grp.userData.v81y = 1; c.grp.position.set(-66 + ((i++ % 5) - 2) * 26, Math.max(0, p.y - 9), -2380 + 55 + Math.floor(i / 5) * 20); c.grp.scale.setScalar(0.6); k++; } }
    info.youthMoved = (info.youthMoved || 0) + k; return false; }, 15, 1500); info.fixes.push('youth-declutter');

  // ---- P0 3: Barnard Bridge road (v77/v80: BE -60, BN 2236, deck ±8, ramps 10, top 3.8) ----
  { const BE = -60, BN = 2236, TOP = 3.8, HALF = 8, RAMP = 10, tar = M(0x2b2e33, { polygonOffset: true, polygonOffsetFactor: -3 }), pav = M(0xa8a49c, { polygonOffset: true, polygonOffsetFactor: -3 }), grass = M(0x5f8a3e);
    const strip = (mat, w, e, n0, n1, y0, y1, th = 0.12) => { const a = warp(e, n0), b = warp(e, n1), L = Math.hypot(b.x - a.x, b.z - a.z, y1 - y0); const m = new T.Mesh(new T.BoxGeometry(w, th, L), mat);
      m.position.set((a.x + b.x) / 2, (y0 + y1) / 2 + th / 2, (a.z + b.z) / 2); m.rotation.order = 'YXZ'; m.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); m.rotation.x = -Math.atan2(y1 - y0, Math.hypot(b.x - a.x, b.z - a.z)); grp.add(m); };
    for (const [w, off, mat, dy] of [[5.6, 0, tar, 0.04], [1.5, 3.6, pav, 0.14], [1.5, -3.6, pav, 0.14]]) { const e = BE + off;
      strip(mat, w, e, BN - HALF, BN + HALF, TOP + dy, TOP + dy); strip(mat, w, e, BN + HALF, BN + HALF + RAMP, TOP + dy, dy); strip(mat, w, e, BN - HALF - RAMP, BN - HALF, dy, TOP + dy); }
    for (const s of [-1, 1]) { strip(grass, 30, BE, BN + s * (HALF + RAMP), BN + s * (HALF + RAMP + 12), 0.02, 0.02, 0.05); } // grass verges meeting the road ends
    for (const s of [-1, 1]) for (let i = 0; i < 9; i++) { const n = BN + s * (HALF + 1 + i * 1.1); strip(M(0xffffff), 0.15, BE, n, n + s * 0.6, TOP * Math.max(0, 1 - i * 1.1 / RAMP) + 0.07, TOP * Math.max(0, 1 - (i * 1.1 + 0.6) / RAMP) + 0.07, 0.02); }
    for (let n = BN - HALF + 1; n < BN + HALF - 1; n += 3) strip(M(0xf0f0e8), 0.15, BE, n, n + 1.5, TOP + 0.1, TOP + 0.1, 0.02); // centre dashes
    const a = warp(BE, BN - HALF - RAMP - 3), f = warp(BE, BN + HALF + RAMP + 10); PJ.barnard_bridge = [a.x, a.z, [f.x, f.z, 0.03], true];
    info.fixes.push('barnard-tarmac'); }

  // ---- P0 4: globe affordance + panel close ----
  { const css = document.createElement('style'); css.textContent = `#v81g{position:fixed;left:50%;bottom:120px;transform:translateX(-50%);z-index:60;display:none;background:#04140d;color:#00ff9d;border:1px solid #00ff9d;border-radius:8px;padding:8px 14px;font:600 13px ui-monospace,monospace;cursor:pointer;box-shadow:0 0 14px #00ff9d55}
#v81gp{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:70;display:none;max-width:420px;background:#020a07ee;color:#cfe;border:1px solid #00ff9d;border-radius:10px;padding:16px 18px;font:13px/1.5 ui-monospace,monospace}
#v81gp b{color:#ffb347} #v81gp .x,#v66p .x{cursor:pointer;float:right;font-size:20px;padding:2px 8px;position:relative;z-index:5;pointer-events:auto}`; document.head.appendChild(css);
    const btn = document.createElement('div'); btn.id = 'v81g'; btn.textContent = '[F] VIEW ANALYTICS'; document.body.appendChild(btn);
    const pnl = document.createElement('div'); pnl.id = 'v81gp'; pnl.setAttribute('role', 'dialog'); pnl.innerHTML = '<span class="x" title="close">✕</span><h3 style="color:#00ff9d;margin:0 0 8px">PLAZA GLOBE // ANALYTICS</h3><p><b>PLACEHOLDER DATA.</b> Real listener analytics are not connected yet. Status: planned.</p><p>The pins on the globe are example positions only. When real analytics land, this panel will show regions and listener counts.</p><p style="opacity:.7">Esc or ✕ to close.</p>'; document.body.appendChild(pnl);
    const close = () => { pnl.style.display = 'none'; }, openG = () => { if (fx.v66 && fx.v66.open) { try { fx.v66.open('globe'); return; } catch {} } pnl.style.display = 'block'; try { document.exitPointerLock && document.exitPointerLock(); } catch {} };
    pnl.querySelector('.x').addEventListener('click', e => { e.stopPropagation(); close(); });
    document.addEventListener('pointerdown', e => { const x = e.target.closest && e.target.closest('#v66p .x'); if (x) { e.stopPropagation(); e.preventDefault(); if (fx.v66 && fx.v66.close) fx.v66.close(); else x.parentElement.style.display = 'none'; } }, true); // LAYER MAP ✕
    addEventListener('keydown', e => { if (e.key === 'Escape') close(); if (e.code === 'KeyF' && btn.style.display === 'block' && !(fx.v66 && fx.v66.st && fx.v66.st.open)) { const a = document.activeElement; if (a && /INPUT|TEXTAREA/.test(a.tagName)) return; if (!(document.getElementById('v66act') || {}).offsetParent) openG(); } });
    btn.onclick = openG; const rc = new T.Raycaster(), v2 = new T.Vector2();
    addEventListener('click', e => { const GB = window.__globe, cam = o.CAM || fx.CAM; if (!GB || !cam || e.target.tagName !== 'CANVAS') return; v2.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); rc.setFromCamera(v2, cam); if (rc.intersectObject(GB.globe, true).length) openG(); });
    info.globeBtn = () => btn; info.fixes.push('globe-affordance'); }

  // ---- P1 5: Beatty Close (OSM beatty_close; label_at -172.4,2376.6; flats blocks north side) ----
  { const sp = warp(-112, 2347.5), lk = warp(-150, 2379), lp = warp(-130, 2349); PJ.beatty_close = [sp.x, sp.z, [lk.x, lk.z, 0.08]];
    const lb = LBL && LBL('BEATTY CLOSE', '#c4ccd4', 1.0); if (lb) { lb.position.set(lp.x, 6, lp.z); grp.add(lb); } addJumpBtn('beatty_close', 'Beatty Close', 'barnard_bridge'); info.fixes.push('beatty-close-jump'); }

  // ---- P1 scene scans (after modules load) ----
  const col = m => m.material && m.material.color ? m.material.color : null, bb = new T.Box3(), sz = new T.Vector3();
  retry(() => { let sky = 0, cream = 0; S.updateMatrixWorld(true);
    S.traverse(m => { if (!m.isMesh || !m.visible || m === fx.skyMesh || (fx.sea && m === fx.sea) || m.userData.v81keep) return; const c = col(m); if (!c || m.material.map || m.material.isShaderMaterial) return; bb.setFromObject(m); bb.getSize(sz);
      const hsv = {}; c.getHSL(hsv);
      // 6: big flat blue slab overhead (Britannia free-roam): wide, high, blue
      if (bb.min.y > 12 && Math.max(sz.x, sz.z) > 120 && hsv.h > 0.5 && hsv.h < 0.72 && hsv.s > 0.3) { m.visible = false; sky++; }
      // 7: Wellington foreground cream slab near the deck root (x 56..125, z 478..498)
      if (bb.max.x < 130 && bb.min.x > 40 && bb.min.z > 470 && bb.max.z < 506 && bb.max.y < 4 && bb.max.y > 1.4 && hsv.l > 0.75 && sz.y < 2.5 && Math.max(sz.x, sz.z) > 8) { m.visible = false; cream++; } });
    info.skySlabs = sky; info.wellCream = cream; return true; }, 1, 9000);
  PJ.wellington_pier = [128, 488, [214, 488, 0.05], true]; info.fixes.push('wellington-nudge');
  // 8: harbour magenta wires + clutter
  retry(() => { const hs = fx.harbourSpawn; if (!hs) return false; let w = 0, c = 0;
    for (const cl of fx.clusters || []) { const p = cl.grp.position; if (Math.hypot(p.x - hs[0], p.z - hs[1]) > 160) continue; let shown = 0;
      cl.grp.traverse(m => { if (m.isLine || m.isLineSegments) { m.visible = false; w++; } else if (m.userData && m.userData.track) { if (++shown > 4) { m.visible = false; c++; } } }); }
    S.traverse(m => { if (!(m.isLine || m.isLineSegments) || !m.visible) return; const cc = col(m); if (!cc) return; const h = {}; cc.getHSL(h); if (h.h > 0.8 && h.h < 0.95 && h.s > 0.5) { const p = m.getWorldPosition(new T.Vector3()); if (Math.hypot(p.x - hs[0], p.z - hs[1]) < 200) { m.visible = false; w++; } } });
    info.harbourWires = w; info.harbourPanelsHidden = c; return w + c > 0; }, 20, 1500); info.fixes.push('harbour-declutter');
  // Tower: opaque octagon drum under the cab (v77 translucent drum r11.2 h7.5 at y42.5)
  retry(() => { let d = null; S.traverse(m => { const g = m.geometry; if (!d && m.isMesh && g && g.type === 'CylinderGeometry' && g.parameters.radiusTop === 11.2 && g.parameters.height === 7.5) d = m; }); if (!d) return false;
    const p = d.getWorldPosition(new T.Vector3()), U = { fog: false, toneMapped: false }; const oc = new T.Mesh(new T.CylinderGeometry(10.8, 10.8, 7.2, 8), M(0x6fb8f0, U)); oc.position.set(p.x, 42.5, p.z); oc.rotation.y = Math.PI / 8; grp.add(oc);
    for (const y of [38.6, 46.3]) { const r = new T.Mesh(new T.CylinderGeometry(11.6, 11.6, 0.7, 8), M(0x1d2c44, U)); r.position.set(p.x, y, p.z); r.rotation.y = Math.PI / 8; grp.add(r); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, e = new T.Mesh(new T.BoxGeometry(0.6, 7.4, 0.6), M(0xf2f4f8, U)); e.position.set(p.x + Math.cos(a) * 10.9, 42.5, p.z + Math.sin(a) * 10.9); grp.add(e); }
    const sh = new T.Mesh(new T.CylinderGeometry(9.5, 9.5, 2.4, 8), M(0x3a4a5a, U)); sh.position.set(p.x, 37.6, p.z); grp.add(sh); info.fixes.push('tower-octagon'); return true; });
  // 10: Jellicoe road text smaller
  retry(() => { const g = S.getObjectByName('v80'); if (!g) return false; let k = 0; for (const m of g.children) if (m.geometry && m.geometry.type === 'PlaneGeometry' && m.position.y > 6 && m.position.y < 7 && m.position.z < -2600) { m.scale.set(0.4, 0.5, 1); k++; } info.jellicoeText = k; return k > 0; }, 15, 1500);
  // 9: NPC visibility report
  retry(() => { const n = fx.v80Info && fx.v80Info.npc; if (!n) return false; info.npc = n; return true; }, 20, 1500);
  // youth/lodge both run when loaded; also re-assert the Barnard + Beatty jump order
  addJumpBtn('barnard_bridge', 'Barnard Bridge', 'barnard_field');
  // globe proximity
  let acc = 0; fx.v81Info = info; window.__fx81 = info;
  return { info, update(t, dt) { if ((acc += dt) < 0.25) return; acc = 0; const GB = window.__globe, P = o.P; const b = document.getElementById('v81g'); if (!b) return; if (!GB || !P) { b.style.display = 'none'; return; }
      const g = GB.globe.getWorldPosition(new T.Vector3()), d = Math.hypot(P.pos.x - g.x, P.pos.z - g.z), v66 = document.getElementById('v66act'), v66on = v66 && v66.style.display === 'block';
      b.style.display = d < 40 && !v66on && !(fx.v66 && fx.v66.st && fx.v66.st.open) ? 'block' : 'none'; } };
}
