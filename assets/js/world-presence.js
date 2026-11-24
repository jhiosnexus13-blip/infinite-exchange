/* JHIOS world v41/v43 — live presence + all-time visitors: anonymous heartbeat to /api/presence (Netlify Function + Blobs).
   Sends a random per-tab id + rounded world x/z + heading every 5 s (lite 8 s); shows "N here now" in the HUD and every other visitor
   as a glowing low-poly human silhouette (one InstancedMesh, never raycast), smoothly interpolated. Fails silently: no function, no counter. */
export function initPresence(o) {
  const { T, S, P, LITE, fx } = o, MAX = 50, EVERY = LITE ? 8000 : 5000;
  const sid = Array.from(crypto.getRandomValues(new Uint8Array(10)), b => (b % 36).toString(36)).join('');
  // ---- silhouette: head, torso, hips, arms, legs merged into one geometry (~1.8 m tall) ----
  /* v120 tier ladder (Joseph): L0 = the simple glowing silhouette (one additive InstancedMesh, as before);
     L1 = solid body (same figure, opaque lit material, per-visitor colour); L2 = most detailed (smoother body + neck, hands, feet,
     hair cap, per-visitor colour, plus the faint L0 glow shell so visitors still read as visitors). One or two InstancedMeshes
     per tier, never raycast. All tiers are grounded on window.__groundParts (bridges/decks/terrain). IE_V120_FIG=false = old glow everywhere. */
  const build = (q, extra) => { const k = q ? 2 : 1, parts = [[new T.SphereGeometry(0.13, 8 * k, 6 * k), 0, 1.66, 0], [new T.CylinderGeometry(0.22, 0.15, 0.62, 7 * k), 0, 1.24, 0], [new T.CylinderGeometry(0.15, 0.16, 0.18, 7 * k), 0, 0.88, 0],
    [new T.CylinderGeometry(0.055, 0.045, 0.62, 5 * k), -0.27, 1.17, 0, 0.1], [new T.CylinderGeometry(0.055, 0.045, 0.62, 5 * k), 0.27, 1.17, 0, -0.1],
    [new T.CylinderGeometry(0.075, 0.055, 0.82, 5 * k), -0.09, 0.41, 0], [new T.CylinderGeometry(0.075, 0.055, 0.82, 5 * k), 0.09, 0.41, 0]];
    if (extra) parts.push([new T.CylinderGeometry(0.06, 0.07, 0.1, 8), 0, 1.53, 0], [new T.SphereGeometry(0.05, 6, 4), -0.3, 0.85, 0], [new T.SphereGeometry(0.05, 6, 4), 0.3, 0.85, 0],
      [new T.BoxGeometry(0.12, 0.07, 0.24), -0.09, 0.035, -0.05], [new T.BoxGeometry(0.12, 0.07, 0.24), 0.09, 0.035, -0.05], [new T.SphereGeometry(0.138, 10, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), 0, 1.68, 0.01]);
    const pos = [], nor = [];
    for (const [g0, x, y, z, rz = 0] of parts) { const g = g0.index ? g0.toNonIndexed() : g0.clone(); g.rotateZ(rz); g.translate(x, y, z); pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); g.dispose(); g0.dispose(); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); return geo; };
  const geo = build(false, false);
  const mat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uTime: { value: 0 }, uGlow: window.__glowU || { value: 1 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vY = position.y;
      vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime; uniform float uGlow; varying vec3 vN; varying vec3 vV; varying float vY; void main(){ float fr = pow(1.0 - abs(dot(normalize(vN), vV)), 1.6);
      float a = (0.18 + 0.85 * fr) * (0.85 + 0.15 * sin(uTime * 2.0 + vY * 4.0)); gl_FragColor = vec4(vec3(0.45, 0.95, 1.0) * (0.8 + fr), clamp(a * uGlow, 0.0, 0.95)); }` });
  /* three lazily-built sets, switched at runtime with the NEON/LITE/SOLID/REAL switcher (window.__detail) */
  const tierNow = () => window.IE_V120_FIG === false ? 0 : Math.max(0, Math.min(2, window.__detail ?? (LITE ? 0 : 1)));
  const SETS = [], mk = (g, m, col) => { const im = new T.InstancedMesh(g, m, MAX); if (col) im.setColorAt(0, new T.Color(0x6fd8e8)); im.count = 0; im.frustumCulled = false; im.raycast = () => {}; im.name = 'presence'; S.add(im); return im; };
  const setFor = t => SETS[t] || (SETS[t] = t === 0 ? [mk(geo, mat)] : t === 1 ? [mk(geo, new T.MeshLambertMaterial({ emissive: 0x1c2630 }), true)]
    : [mk(build(true, true), new T.MeshStandardMaterial({ roughness: 0.75, metalness: 0.05 }), true), mk(geo.clone().scale(1.05, 1.02, 1.05), mat)]);
  let DET = tierNow(), meshes = setFor(DET), mesh = meshes[0];
  const PAL = [0x5f8fd8, 0xd8566a, 0x6fbf6a, 0xe8e2d4, 0x9a7ad8, 0xf08a4a, 0x5ac8e8, 0xf0d050, 0x6fe8f0, 0xff8fc8], col = new T.Color();
  const tint = k => { let h = 0; for (const c of k) h = (h * 31 + c.charCodeAt(0)) | 0; return PAL[Math.abs(h) % PAL.length]; };
  const groundY = (x, z) => { for (const f of window.__groundParts || []) { const v = f(x, z, 2); if (v != null) return v; } return 0; };
  // ---- HUD counter ----
  const hud = document.createElement('div'); hud.className = 'wpresence'; hud.hidden = true; hud.setAttribute('role', 'status'); hud.setAttribute('aria-live', 'polite');
  const css = document.createElement('style'); css.textContent = `.wpresence{position:fixed;z-index:21;right:calc(.5rem + env(safe-area-inset-right));top:calc(166px + env(safe-area-inset-top));font:600 .68rem ui-monospace,monospace;color:#9ff3ff;background:rgba(0,10,14,.75);border:1px solid rgba(110,230,255,.55);border-radius:12px;padding:.2rem .55rem;pointer-events:none;box-shadow:0 0 8px rgba(110,230,255,.35)}.wpresence[hidden]{display:none}
@media (max-width:640px){.wpresence{top:calc(12.2rem + env(safe-area-inset-top))}}`;
  document.head.appendChild(css); document.body.appendChild(hud);
  const others = new Map(); // tag -> { x, z, h, tx, tz, th, seen }
  fx.presence = { others, count: 0, ok: false, sid };
  let fails = 0, timer = 0, busy = false;
  async function beat() { if (busy || document.hidden) return; busy = true;
    try { const r = await fetch('/api/presence', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sid, x: Math.round(P.pos.x), z: Math.round(P.pos.z), h: Math.round(P.yaw * 10) / 10 }), cache: 'no-store' });
      if (!r.ok) throw new Error(r.status); const d = await r.json(); fails = 0; fx.presence.ok = true; apply(d); }
    catch (e) { fails++; if (fails >= 2) { fx.presence.ok = false; render(); others.clear(); for (const m of meshes) m.count = 0; } if (fails >= 6) { clearInterval(timer); timer = 0; } } // function unavailable (local preview etc.): stay quiet
    finally { busy = false; } }
  function apply(d) { const now = performance.now(), list = Array.isArray(d.others) ? d.others.slice(0, MAX) : [];
    for (const [x, z, h = 0, tag] of list) { const k = String(tag ?? (x + ':' + z)); const v = others.get(k); if (v) { v.tx = x; v.tz = z; v.th = h; v.seen = now; } else others.set(k, { x, z, h, tx: x, tz: z, th: h, seen: now }); }
    for (const [k, v] of others) if (now - v.seen > EVERY * 2.5) others.delete(k);
    const n = Math.min(MAX, d.count | 0); fx.presence.count = n; hud.hidden = false; render(); }
  // v43: all-time visitors (one count per browser, ever; production only; see netlify/functions/visitors.mjs)
  let total = null; const fmt = n => n.toLocaleString('en-GB'), phone = matchMedia('(max-width:640px)').matches;
  function render() { const n = fx.presence.count, live = fx.presence.ok ? (n === 0 ? (phone ? '● just you' : '● just you here') : `● ${n}${phone ? ' here' : ` other${n === 1 ? '' : 's'} here now`}`) : '';
    const all = total == null ? '' : phone ? `${fmt(total)} all-time` : `${fmt(total)} visitor${total === 1 ? '' : 's'} all-time`;
    hud.textContent = [live, all].filter(Boolean).join(' · '); hud.hidden = !hud.textContent; }
  (async () => { try { let vid = localStorage.getItem('jx_vid'); if (!/^[a-z0-9]{12,32}$/.test(vid || '')) { vid = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => (b % 36).toString(36)).join(''); localStorage.setItem('jx_vid', vid); }
      const first = !localStorage.getItem('jx_counted');
      const r = await fetch('/api/visitors', first ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ vid }), cache: 'no-store' } : { cache: 'no-store' });
      if (!r.ok) return; const d = await r.json(); if (typeof d.total !== 'number') return; if (first && (d.counted === true || d.counted === false && !d.reason)) localStorage.setItem('jx_counted', '1');
      total = d.total; fx.presence.total = total; render(); } catch (_) {} })(); // unavailable: stay hidden
  timer = setInterval(beat, EVERY); setTimeout(beat, 1500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && timer) beat(); });
  addEventListener('pagehide', () => { try { navigator.sendBeacon && navigator.sendBeacon('/api/presence', new Blob([JSON.stringify({ sid, x: 0, z: 0, bye: 1 })], { type: 'application/json' })); } catch (_) {} });
  const o3 = new T.Object3D();
  function update(t, dt) { mat.uniforms.uTime.value = t; let i = 0;
    const tn = tierNow(); if (tn !== DET) { for (const m of meshes) m.count = 0; DET = tn; meshes = setFor(DET); mesh = meshes[0]; } const k = Math.min(1, dt * 1.6);
    for (const [key, v] of others) { if (i >= MAX) break; v.x += (v.tx - v.x) * k; v.z += (v.tz - v.z) * k; let dh = v.th - v.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); v.h += dh * k;
      v.y = groundY(v.x, v.z); o3.position.set(v.x, v.y, v.z); o3.rotation.set(0, v.h, 0); o3.updateMatrix();
      for (const m of meshes) { m.setMatrixAt(i, o3.matrix); if (m.instanceColor) m.setColorAt(i, col.setHex(v.c ?? (v.c = tint(key)))); } i++; }
    for (const m of meshes) { m.count = i; if (i) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } } }
  const api = { get info() { return { ok: fx.presence.ok, count: fx.presence.count, total, text: hud.textContent, shown: mesh.count, tier: DET, meshes: meshes.length, vis: meshes.map(m => [m.visible, m.count, !!m.parent]), sid }; }, _apply: apply }; if (/[?&]dbg=1/.test(location.search)) window.__iePres = api;
  return { update, api };
}
