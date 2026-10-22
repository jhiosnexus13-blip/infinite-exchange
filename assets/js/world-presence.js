/* JHIOS world v41 — live presence: anonymous heartbeat to /api/presence (Netlify Function + Blobs).
   Sends a random per-tab id + rounded world x/z + heading every 5 s (lite 8 s); shows "N here now" in the HUD and every other visitor
   as a glowing low-poly human silhouette (one InstancedMesh, never raycast), smoothly interpolated. Fails silently: no function, no counter. */
export function initPresence(o) {
  const { T, S, P, LITE, fx } = o, MAX = 50, EVERY = LITE ? 8000 : 5000;
  const sid = Array.from(crypto.getRandomValues(new Uint8Array(10)), b => (b % 36).toString(36)).join('');
  // ---- silhouette: head, torso, hips, arms, legs merged into one geometry (~1.8 m tall) ----
  const parts = [[new T.SphereGeometry(0.13, 8, 6), 0, 1.66, 0], [new T.CylinderGeometry(0.22, 0.15, 0.62, 7), 0, 1.24, 0], [new T.CylinderGeometry(0.15, 0.16, 0.18, 7), 0, 0.88, 0],
    [new T.CylinderGeometry(0.055, 0.045, 0.62, 5), -0.27, 1.17, 0, 0.1], [new T.CylinderGeometry(0.055, 0.045, 0.62, 5), 0.27, 1.17, 0, -0.1],
    [new T.CylinderGeometry(0.075, 0.055, 0.82, 5), -0.09, 0.41, 0], [new T.CylinderGeometry(0.075, 0.055, 0.82, 5), 0.09, 0.41, 0]];
  const pos = [], nor = [];
  for (const [g0, x, y, z, rz = 0] of parts) { const g = g0.toNonIndexed(); g.rotateZ(rz); g.translate(x, y, z); pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); g.dispose(); g0.dispose(); }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  const mat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vY = position.y;
      vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime; varying vec3 vN; varying vec3 vV; varying float vY; void main(){ float fr = pow(1.0 - abs(dot(normalize(vN), vV)), 1.6);
      float a = (0.18 + 0.85 * fr) * (0.85 + 0.15 * sin(uTime * 2.0 + vY * 4.0)); gl_FragColor = vec4(vec3(0.45, 0.95, 1.0) * (0.8 + fr), clamp(a, 0.0, 0.95)); }` });
  const mesh = new T.InstancedMesh(geo, mat, MAX); mesh.count = 0; mesh.frustumCulled = false; mesh.raycast = () => {}; mesh.name = 'presence'; S.add(mesh);
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
    catch (e) { fails++; if (fails >= 2) { hud.hidden = true; fx.presence.ok = false; others.clear(); mesh.count = 0; } if (fails >= 6) { clearInterval(timer); timer = 0; } } // function unavailable (local preview etc.): stay quiet
    finally { busy = false; } }
  function apply(d) { const now = performance.now(), list = Array.isArray(d.others) ? d.others.slice(0, MAX) : [];
    for (const [x, z, h = 0, tag] of list) { const k = String(tag ?? (x + ':' + z)); const v = others.get(k); if (v) { v.tx = x; v.tz = z; v.th = h; v.seen = now; } else others.set(k, { x, z, h, tx: x, tz: z, th: h, seen: now }); }
    for (const [k, v] of others) if (now - v.seen > EVERY * 2.5) others.delete(k);
    const n = Math.min(MAX, d.count | 0); fx.presence.count = n; hud.hidden = false; hud.textContent = n === 0 ? '● just you here' : `● ${n} other${n === 1 ? '' : 's'} here now`; }
  timer = setInterval(beat, EVERY); setTimeout(beat, 1500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && timer) beat(); });
  addEventListener('pagehide', () => { try { navigator.sendBeacon && navigator.sendBeacon('/api/presence', new Blob([JSON.stringify({ sid, x: 0, z: 0, bye: 1 })], { type: 'application/json' })); } catch (_) {} });
  const o3 = new T.Object3D();
  function update(t, dt) { mat.uniforms.uTime.value = t; let i = 0; const k = Math.min(1, dt * 1.6);
    for (const v of others.values()) { if (i >= MAX) break; v.x += (v.tx - v.x) * k; v.z += (v.tz - v.z) * k; let dh = v.th - v.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); v.h += dh * k;
      o3.position.set(v.x, 0, v.z); o3.rotation.set(0, v.h, 0); o3.updateMatrix(); mesh.setMatrixAt(i++, o3.matrix); }
    mesh.count = i; if (i) mesh.instanceMatrix.needsUpdate = true; }
  return { update, api: { get info() { return { ok: fx.presence.ok, count: fx.presence.count, shown: mesh.count, sid }; }, _apply: apply } };
}
