/* JHIOS 3D world — Phase 1 environment & FX (sky, digital rain, Great Yarmouth skyline + sea,
   walkways, minimap, proximity volume, approach cards, orbiting album-art screens).
   Skyline is geographically faithful: lat/lon from /assets/data/yarmouth-landmarks.json
   (© OpenStreetMap contributors) -> local metres (equirectangular, origin on Marine Parade)
   -> pushed out onto the horizon ring keeping true bearings and distance order.
   World axes: +x = EAST (North Sea), -z = NORTH.
   MODEL SWAP: set a URL in MODELS below and that landmark/lane object is replaced by the .glb
   (loaded lazily with GLTFLoader from the same three.js version); null = procedural. */
export const MODELS = {
  britannia_pier: null, wellington_pier: null, nelsons_monument: null, pleasure_beach: null,
  minster: null, haven_bridge: null, gorleston_harbour: null, tower_complex: null,
  'SCR3WFAC3': null, 'Luce Aether': null, 'JHIOS Soundtracks': null, 'Sanctum': null, 'Unsorted': null, 'GoldBot': null,
};
let T, S, CAM, P, H, CL, LBL, CV, LOW, RED, OBJS, getPlaying;
const R0 = 112, SCALE = 0.02, HS = 0.25; // ring radius, metres->units beyond ring, height exaggeration
const fx = { t: 0 };

export function buildEnvironment(o) {
  ({ THREE: T, scene: S, camera: CAM, player: P, holos: H, clickables: CL, labelSprite: LBL, canvas: CV, LOW, reduced: RED, HOLO_OBJS: OBJS, getPlaying } = o);
  sky(); rain(); paths(); minimap(); cards(); orbitScreens(); proximity();
  fetch('/assets/data/yarmouth-landmarks.json').then(r => r.json()).then(skyline).catch(e => console.warn('skyline', e));
  swapModels();
}

/* ---------- sky sphere: slowly shifting gradient + faint scanlines ---------- */
function sky() {
  const m = new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, fog: false, uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `uniform float uTime; varying vec3 vP;
      void main(){ float h = clamp(vP.y, -0.2, 1.0); float s = 0.5 + 0.5 * sin(uTime * 0.05);
        vec3 hor = mix(vec3(0.0,0.16,0.10), vec3(0.05,0.04,0.16), s); vec3 zen = mix(vec3(0.0,0.015,0.02), vec3(0.02,0.0,0.04), 1.0 - s);
        vec3 c = mix(hor, zen, pow(max(h,0.0), 0.45));
        c += vec3(0.0,0.5,0.3) * 0.05 * step(0.92, fract(vP.y * 140.0 - uTime * 0.3)) * (1.0 - h);
        float east = smoothstep(0.6, 1.0, vP.x) * (1.0 - h) * 0.25; c += vec3(0.0,0.25,0.3) * east;
        gl_FragColor = vec4(c, 1.0); }` });
  const sp = new T.Mesh(new T.SphereGeometry(800, 32, 16), m); sp.renderOrder = -10; sp.frustumCulled = false; S.add(sp); fx.sky = m;
}
/* ---------- digital rain / embers around the player ---------- */
function rain() {
  const N = LOW ? 250 : 1400, pos = new Float32Array(N * 3), spd = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 80; pos[i * 3 + 1] = Math.random() * 30; pos[i * 3 + 2] = (Math.random() - 0.5) * 80; spd[i] = 1 + Math.random() * 3; }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(180,255,220,1)'); gr.addColorStop(0.4, 'rgba(0,255,157,.6)'); gr.addColorStop(1, 'rgba(0,255,157,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
  const m = new T.PointsMaterial({ size: 0.22, map: new T.CanvasTexture(c), transparent: true, depthWrite: false, blending: T.AdditiveBlending, color: 0x9dffd2 });
  const pts = new T.Points(g, m); pts.frustumCulled = false; S.add(pts); fx.rain = { pts, pos, spd, N };
}
/* ---------- lat/lon -> world ---------- */
let ORG;
function local(lat, lon) { return { e: (lon - ORG.lon) * Math.cos(ORG.lat * Math.PI / 180) * 111320, n: (lat - ORG.lat) * 110540 }; }
/* Seafront projection: the coast is a near-straight N-S line just east of the origin, so bearings from the
   origin itself would misorder seafront landmarks (e.g. Tower Complex 110 m N of origin would sit WEST of
   Britannia Pier on the ring). Seafront items (coast, sea, piers, tower, wheel, pillar, lighthouse, Marine Parade
   strip) are therefore projected from a virtual viewpoint SEA_OFF metres west, which makes their ring order
   strictly north->south along Marine Parade while keeping them east of spawn. Inland items use the origin. */
const SEA_OFF = -1200;
function warp(e, n, off = 0) { e -= off; const r = Math.hypot(e, n) || 1, rr = R0 + r * SCALE; return new T.Vector3(e / r * rr, 0, -n / r * rr); }
const W = (lat, lon, de = 0, dn = 0) => { const l = local(lat, lon); return warp(l.e + de, l.n + dn); };

function skyline(D) {
  ORG = D.origin; const segs = [], add = (a, b) => segs.push(a.x, a.y, a.z, b.x, b.y, b.z);
  const box = (c, w, h, d, ry = 0) => { // wire box at c (base centre)
    const hw = w / 2, hd = d / 2, cs = Math.cos(ry), sn = Math.sin(ry), q = (x, y, z) => new T.Vector3(c.x + x * cs + z * sn, c.y + y, c.z - x * sn + z * cs);
    const v = [q(-hw, 0, -hd), q(hw, 0, -hd), q(hw, 0, hd), q(-hw, 0, hd), q(-hw, h, -hd), q(hw, h, -hd), q(hw, h, hd), q(-hw, h, hd)];
    [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([i, j]) => add(v[i], v[j]));
  };
  const grp = new T.Group(); grp.name = 'skyline'; S.add(grp); fx.skyline = grp; fx.landmarks = {};
  const mat = new T.LineBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false, fog: false });
  const yaw = v => Math.atan2(v.x, v.z); // facing angle of a world point from origin
  const coast = D.coastline.map(([la, lo]) => local(la, lo));
  const coastE = n => { for (let i = 0; i < coast.length - 1; i++) { const a = coast[i], b = coast[i + 1]; if (n <= a.n && n >= b.n) return a.e + (b.e - a.e) * (n - a.n) / (b.n - a.n); } return coast[n > 0 ? 0 : coast.length - 1].e; };
  fx.coastE = coastE;
  for (const L of D.landmarks) {
    const OFF = ['pier', 'tower', 'wheel', 'column', 'lighthouse'].includes(L.type) ? SEA_OFF : 0, l = local(L.lat, L.lon), base = warp(l.e, l.n, OFF), ht = (L.height_m || 10) * HS, ry = yaw(base);
    const tag = LBL(L.name.split(' (')[0], '#5dffc0', 1.6); tag.position.copy(base).setY(ht + 3); grp.add(tag);
    fx.landmarks[L.key] = { pos: base, name: L.name };
    if (L.type === 'pier') { // deck from the coast out to sea (east), legs, pavilion at the head
      const ce = coastE(l.n), root = warp(ce, l.n, OFF), tip = warp(ce + L.length_m, l.n, OFF), N = 10;
      for (let i = 0; i < N; i++) { const a = root.clone().lerp(tip, i / N), b = root.clone().lerp(tip, (i + 1) / N);
        a.y = b.y = 1.4; add(a, b); add(a.clone().setZ(a.z - 0.8), b.clone().setZ(b.z - 0.8)); add(a, a.clone().setY(0)); add(a.clone().setZ(a.z - 0.8), a.clone().setZ(a.z - 0.8).setY(0)); }
      const head = tip.clone(); head.y = 1.4; box(head, 4, ht * 0.6, 3, 0); box(head.clone().setY(1.4 + ht * 0.6), 2.6, ht * 0.35, 2, 0);
      add(head.clone().setY(1.4 + ht * 0.95), head.clone().setY(1.4 + ht * 1.3));
    } else if (L.type === 'column') { // Norfolk Naval Pillar: plinth, fluted column, Britannia on a globe
      box(base, 3, 1.6, 3, ry); box(base.clone().setY(1.6), 2, 1.2, 2, ry);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, d = new T.Vector3(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6); add(base.clone().add(d).setY(2.8), base.clone().add(d.multiplyScalar(0.8)).setY(ht)); }
      box(base.clone().setY(ht), 1.8, 0.6, 1.8, ry);
      const gl = new T.LineSegments(new T.EdgesGeometry(new T.IcosahedronGeometry(0.7, 0)), mat); gl.position.copy(base).setY(ht + 1.2); grp.add(gl);
      add(base.clone().setY(ht + 1.8), base.clone().setY(ht + 3.2)); add(base.clone().setY(ht + 2.6).add(new T.Vector3(0.7, 0, 0)), base.clone().setY(ht + 2.6).add(new T.Vector3(-0.7, 0, 0)));
    } else if (L.type === 'wheel') {
      const r = ht / 2, wg = new T.Group(); wg.position.copy(base).setY(r + 1); wg.rotation.y = ry + Math.PI / 2;
      const rim = new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({ length: 48 }, (_, i) => new T.Vector3(Math.cos(i / 48 * 6.283) * r, Math.sin(i / 48 * 6.283) * r, 0))), mat);
      const sp = []; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; sp.push(0, 0, 0, Math.cos(a) * r, Math.sin(a) * r, 0); }
      const spg = new T.BufferGeometry(); spg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
      const wheel = new T.Group(); wheel.add(rim, new T.LineSegments(spg, mat));
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, gd = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(0.7, 0.7, 0.7)), mat); gd.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); wheel.add(gd); }
      wg.add(wheel); grp.add(wg); fx.wheel = wheel;
      add(base.clone().add(new T.Vector3(1.5, 0, 0)), base.clone().setY(r + 1)); add(base.clone().add(new T.Vector3(-1.5, 0, 0)), base.clone().setY(r + 1));
    } else if (L.type === 'minster') { // nave + crossing tower + spire
      box(base, 9, ht * 0.35, 3.5, ry); box(base, 3, ht * 0.7, 3, ry);
      for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]]) add(base.clone().add(new T.Vector3(x, ht * 0.7, z)), base.clone().setY(ht));
    } else if (L.type === 'bridge') { const a = warp(l.e - 60, l.n), b = warp(l.e + 60, l.n); a.y = b.y = 1.2; add(a, b); add(a.clone().setY(2.4), b.clone().setY(2.4)); for (let i = 0; i <= 6; i++) { const p = a.clone().lerp(b, i / 6); add(p.clone().setY(0), p.clone().setY(2.4)); } }
    else if (L.type === 'tower') { // Tower Complex / Arena: wide low arena block + tall slim tower with a crown
      box(base, 7, ht * 0.32, 4.5, ry); box(base.clone().setY(ht * 0.32), 5, ht * 0.12, 3.5, ry);
      const tb = base.clone().add(new T.Vector3(Math.cos(ry) * 1.6, 0, -Math.sin(ry) * 1.6)); box(tb, 1.8, ht, 1.8, ry); box(tb.clone().setY(ht), 2.4, 1.2, 2.4, ry);
      add(tb.clone().setY(ht + 1.2), tb.clone().setY(ht + 3.5));
      if (L.feature_track) featureScreen(L, base, ht);
    }
    else if (L.type === 'lighthouse') { box(base, 1.2, ht, 1.2, ry); box(base.clone().setY(ht), 1.6, 1.0, 1.6, ry); fx.beacon = base.clone().setY(ht + 0.5); }
  }
  // Marine Parade / Atlas seafront strip: buildings just inland of the coast
  const f = local(D.seafront.from.lat, D.seafront.from.lon), t2 = local(D.seafront.to.lat, D.seafront.to.lon);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let n = f.n; n < t2.n; n += 55) { const e = coastE(n) - 35 - rnd() * 40, b = warp(e, n, SEA_OFF), h = (8 + rnd() * 18) * HS * 1.4; box(b, 2.2 + rnd() * 2, h, 2.5, yaw(b)); if (rnd() < 0.3) add(b.clone().setY(h), b.clone().setY(h + 1.5)); }
  // generic town blocks between seafront and river
  for (let i = 0; i < 70; i++) { const n = -2600 + rnd() * 3800, e = coastE(n) - 150 - rnd() * 650, b = warp(e, n); box(b, 2 + rnd() * 3, (6 + rnd() * 10) * HS, 2 + rnd() * 3, yaw(b)); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(segs, 3)); grp.add(new T.LineSegments(g, mat));
  // River Yare (+ Bure) ribbon to the west
  const riv = D.river_yare.map(([la, lo]) => W(la, lo).setY(0.08));
  const rc = new T.CatmullRomCurve3(riv), rp = rc.getPoints(80);
  grp.add(new T.Line(new T.BufferGeometry().setFromPoints(rp), new T.LineBasicMaterial({ color: 0x00c8ff, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, fog: false })));
  grp.add(new T.Line(new T.BufferGeometry().setFromPoints(rp.map(p => p.clone().add(new T.Vector3(0.9, 0, 0)))), new T.LineBasicMaterial({ color: 0x0088cc, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, fog: false })));
  // coastline glow
  grp.add(new T.Line(new T.BufferGeometry().setFromPoints(coast.map(c => warp(c.e, c.n, SEA_OFF).setY(0.12))), new T.LineBasicMaterial({ color: 0x9dffe0, fog: false })));
  sea(coast);
  fx.mapLandmarks = Object.values(fx.landmarks);
}
/* ---------- featured hologram screen above a landmark (billboard, bobbing, tap = play via JX) ---------- */
function featureScreen(L, base, ht) {
  const W2 = 26, H2 = 19.5, y0 = ht + 6 + H2 / 2, grp = new T.Group(); grp.position.copy(base).setY(y0); S.add(grp);
  const titleText = "Don't This Remind Ya";
  const mat = new T.MeshBasicMaterial({ map: titleTex(titleText, '#00ff9d'), transparent: true, opacity: 0.95, side: T.DoubleSide, fog: false });
  const scr = new T.Mesh(new T.PlaneGeometry(W2, H2), mat); grp.add(scr);
  const frMat = new T.LineBasicMaterial({ color: 0x00ff9d, transparent: true, blending: T.AdditiveBlending, fog: false });
  for (const k of [1, 1.03, 1.06]) { const f = new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(W2 * k, H2 * k)), frMat); grp.add(f); }
  const glow = new T.Mesh(new T.PlaneGeometry(W2 * 1.25, H2 * 1.25), new T.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.12, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
  glow.position.z = -0.2; grp.add(glow);
  const lab = LBL(titleText.toUpperCase(), '#00ff9d', 3.2); lab.position.set(0, H2 / 2 + 2.6, 0); grp.add(lab);
  const sub = LBL('▶ TAP TO PLAY // SCR3WFAC3', '#b9ffe0', 1.6); sub.position.set(0, -H2 / 2 - 1.8, 0); grp.add(sub);
  // beam down to the tower
  const bg = new T.BufferGeometry().setFromPoints([new T.Vector3(0, -H2 / 2, 0), new T.Vector3(0, ht + 3.5 - y0, 0)]); grp.add(new T.Line(bg, frMat));
  scr.userData = { track: L.feature_track, feature: true };
  const hit = new T.Mesh(new T.PlaneGeometry(W2 * 1.1, H2 * 1.35), new T.MeshBasicMaterial({ visible: false, side: T.DoubleSide })); hit.userData = scr.userData; grp.add(hit); CL.push(hit);
  loader().load('https://i.ytimg.com/vi/hN8QWPKuDvk/hqdefault.jpg', tex => { tex.colorSpace = T.SRGBColorSpace; mat.map.dispose(); mat.map = tex; mat.needsUpdate = true; fx.featureThumb = true; }, undefined, () => { fx.featureThumb = false; });
  fx.feature = { grp, y0, frMat, glow, key: L.key, track: L.feature_track };
}
/* ---------- North Sea: big subdivided plane; fragments west of the (warped) coastline are discarded ---------- */
function sea(coast) {
  const seg = LOW ? 60 : 140, geo = new T.PlaneGeometry(900, 900, seg, seg); geo.rotateX(-Math.PI / 2);
  const cn = coast.map(c => c.n), ce = coast.map(c => c.e);
  const m = new T.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, side: T.DoubleSide,
    uniforms: { uTime: { value: 0 }, uR0: { value: R0 }, uS: { value: SCALE }, uOff: { value: SEA_OFF }, uN: { value: cn }, uE: { value: ce } },
    vertexShader: `uniform float uTime; varying vec3 vW; varying float vH;
      void main(){ vec3 p = position; vec4 w = modelMatrix * vec4(p,1.0);
        float h = sin(w.x * 0.08 + uTime * 0.9) * 0.35 + sin(w.z * 0.11 - uTime * 0.7) * 0.25 + sin((w.x + w.z) * 0.21 + uTime * 1.3) * 0.12;
        w.y += h - 0.3; vW = w.xyz; vH = h; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime; uniform float uR0; uniform float uS; uniform float uOff; uniform float uN[6]; uniform float uE[6]; varying vec3 vW; varying float vH;
      float coastE(float n){ for(int i=0;i<5;i++){ if(n <= uN[i] && n >= uN[i+1]) return mix(uE[i], uE[i+1], (n-uN[i])/(uN[i+1]-uN[i])); } return n > 0.0 ? uE[0] : uE[5]; }
      void main(){ float rr = length(vW.xz); if (rr < uR0) discard; float r = (rr - uR0) / uS; vec2 d = vW.xz / rr; float e = d.x * r + uOff, n = -d.y * r;
        float ce = coastE(n); if (e < ce) discard;
        float grid = step(0.94, fract(vW.x * 0.25)) + step(0.94, fract(vW.z * 0.25));
        float edge = 1.0 - smoothstep(0.0, 60.0, e - ce);
        vec3 c = vec3(0.0, 0.12, 0.16) + vec3(0.0, 0.6, 0.55) * (vH * 0.4 + 0.2) + vec3(0.2,1.0,0.8) * grid * 0.12 + vec3(0.6,1.0,0.9) * edge * 0.25;
        gl_FragColor = vec4(c, 0.78); }` });
  const mesh = new T.Mesh(geo, m); mesh.position.set(300, 0, 0); mesh.frustumCulled = false; S.add(mesh); fx.sea = m;
}
/* ---------- glowing walkways from spawn to each object ---------- */
function paths() {
  const sp = new T.Vector3(0, 0, 22);
  fx.pathMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime; varying vec2 vU; void main(){ float edge = smoothstep(0.5, 0.0, abs(vU.x - 0.5)) ; float side = step(0.42, abs(vU.x - 0.5));
      float dash = step(0.6, fract(vU.y * 20.0 - uTime * 0.8)); gl_FragColor = vec4(vec3(0.0,1.0,0.62), 0.10 * edge + 0.5 * side + 0.25 * dash * edge); }` });
  for (const h of H) {
    const to = new T.Vector3(h.o.pos[0], 0, h.o.pos[1]), d = to.clone().sub(sp), L = d.length() - (h.o.w || 3.2) / 2 - 1.5;
    const geo = new T.PlaneGeometry(1.4, L, 1, 1); geo.rotateX(-Math.PI / 2); const m = new T.Mesh(geo, fx.pathMat);
    m.position.copy(sp).addScaledVector(d.normalize(), L / 2).setY(0.03); m.rotation.y = Math.atan2(d.x, d.z);
    m.material = fx.pathMat; geo.attributes.uv.array.forEach((v, i, a) => { if (i % 2) a[i] = v * L / 20; }); S.add(m);
  }
  const ring = new T.Mesh(new T.RingGeometry(1.6, 2.0, 32), new T.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.04, 22); S.add(ring);
}
/* ---------- minimap (top-right canvas) ---------- */
function minimap() {
  const c = document.createElement('canvas'); c.id = 'minimap'; c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c); fx.map = c;
}
function drawMap() {
  const c = fx.map, css = c.clientWidth; if (!css) return; const dpr = Math.min(2, devicePixelRatio || 1);
  if (c.width !== Math.round(css * dpr)) { c.width = c.height = Math.round(css * dpr); }
  const g = c.getContext('2d'), s = c.width, k = s / 2 / 48; // 48 world units radius around origin
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, s, s); g.fillStyle = 'rgba(3,10,8,.82)'; g.fillRect(0, 0, s, s);
  const X = x => s / 2 + x * k, Z = z => s / 2 + z * k; g.strokeStyle = 'rgba(0,255,157,.18)'; g.lineWidth = 1;
  for (let i = -40; i <= 40; i += 20) { g.beginPath(); g.moveTo(X(i), 0); g.lineTo(X(i), s); g.moveTo(0, Z(i)); g.lineTo(s, Z(i)); g.stroke(); }
  g.fillStyle = 'rgba(0,160,200,.25)'; g.fillRect(s - 6 * dpr, 0, 6 * dpr, s); // sea is east
  g.strokeStyle = 'rgba(0,255,157,.35)'; g.beginPath(); g.arc(X(0), Z(-2), 4 * k, 0, 7); g.stroke(); // globe
  for (const h of H) { g.fillStyle = h.hex; g.beginPath(); g.arc(X(h.o.pos[0]), Z(h.o.pos[1]), (h.lane === getPlaying() ? 4.5 : 3) * dpr, 0, 7); g.fill(); }
  if (fx.feature) { const fp = fx.feature.grp.position, dx = fp.x - P.pos.x, dz = fp.z - P.pos.z, dl = Math.hypot(dx, dz) || 1;
    const mx = Math.abs(P.pos.x + dx) < 46 && Math.abs(P.pos.z + dz) < 46 ? X(fp.x) : X(Math.max(-44, Math.min(44, P.pos.x + dx / dl * 60)));
    const mz = Math.abs(P.pos.x + dx) < 46 && Math.abs(P.pos.z + dz) < 46 ? Z(fp.z) : Z(Math.max(-44, Math.min(44, P.pos.z + dz / dl * 60)));
    g.fillStyle = '#00ff9d'; g.fillRect(mx - 4 * dpr, mz - 3 * dpr, 8 * dpr, 6 * dpr); g.strokeStyle = '#fff'; g.strokeRect(mx - 4 * dpr, mz - 3 * dpr, 8 * dpr, 6 * dpr);
    g.font = `${8 * dpr}px ui-monospace,monospace`; g.fillText('TOWER', Math.min(s - 30 * dpr, mx + 6 * dpr), mz + 3 * dpr); }
  const px = Math.max(-47, Math.min(47, P.pos.x)), pz = Math.max(-47, Math.min(47, P.pos.z));
  g.save(); g.translate(X(px), Z(pz)); g.rotate(-P.yaw); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -7 * dpr); g.lineTo(4.5 * dpr, 5 * dpr); g.lineTo(-4.5 * dpr, 5 * dpr); g.closePath(); g.fill(); g.restore();
  g.fillStyle = '#00ff9d'; g.font = `${9 * dpr}px ui-monospace,monospace`; g.fillText('N', s / 2 - 3 * dpr, 10 * dpr); g.fillText('SEA', s - 26 * dpr, s / 2);
  g.strokeStyle = '#00ff9d'; g.strokeRect(0.5, 0.5, s - 1, s - 1);
}
/* ---------- approach card (DOM) ---------- */
function cards() { const d = document.createElement('div'); d.id = 'wcard'; d.className = 'wcard'; d.hidden = true; d.setAttribute('role', 'status'); document.body.appendChild(d); fx.card = d; }
function updateCard() {
  let best = null, bd = 1e9; for (const h of H) { const d = Math.hypot(P.pos.x - h.o.pos[0], P.pos.z - h.o.pos[1]) - (h.o.w || 3.2) / 4; h.near += ((d < 10 ? 1 : 0) - h.near) * 0.08; if (d < 10 && d < bd) { bd = d; best = h; } }
  const c = fx.card; if (!best) { if (!c.hidden) c.hidden = true; fx.cardLane = null; return; }
  const v = new T.Vector3(best.o.pos[0], best.o.h * 0.55, best.o.pos[1]).project(CAM);
  if (v.z > 1) { c.hidden = true; return; }
  const JX = window.JX, playing = JX && JX.playing && JX.current && JX.current.lane === best.lane;
  const html = best.link ? `<b style="color:${best.hex}">${best.o.label}</b><small>tap to open GoldBot ↗</small>`
    : `<b style="color:${best.hex}">${best.lane}</b><small>${playing ? '▶ NOW PLAYING: ' + JX.esc(JX.current.title) : 'tap to play'}</small>`;
  if (c._h !== html) { c.innerHTML = html; c._h = html; }
  c.hidden = false; fx.cardLane = best.lane;
  const r = CV.getBoundingClientRect(); c.style.transform = `translate(-50%,-100%) translate(${Math.max(90, Math.min(r.width - 90, (v.x + 1) / 2 * r.width))}px,${Math.max(80, (1 - v.y) / 2 * r.height)}px)`;
}
/* ---------- orbiting album-art screens ---------- */
const MAX_TEX = 36; let texCount = 0; const loader = () => fx.tl || (fx.tl = Object.assign(new T.TextureLoader(), { crossOrigin: 'anonymous' }));
function titleTex(title, hex) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 144; const g = c.getContext('2d');
  g.fillStyle = '#04100c'; g.fillRect(0, 0, 256, 144); g.strokeStyle = hex; g.lineWidth = 4; g.strokeRect(2, 2, 252, 140);
  g.fillStyle = hex; g.font = '600 22px ui-monospace,monospace'; g.textAlign = 'center';
  const words = String(title).split(' '), lines = []; let ln = ''; for (const w of words) { if ((ln + ' ' + w).length > 16) { lines.push(ln); ln = w; } else ln = (ln ? ln + ' ' : '') + w; } lines.push(ln);
  lines.slice(0, 4).forEach((l, i) => g.fillText(l, 128, 72 - (Math.min(4, lines.length) - 1) * 13 + i * 26));
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
function orbitScreens() {
  fx.orbits = []; fx.screens = [];
  const boot = () => window.JX.load().then(() => {
    for (const h of H) { if (h.link) continue;
      const tr = window.JX.byLane(h.lane).filter(t => window.JX.ytId(t.youtube_url) || t.audio_url).slice(0, LOW ? 6 : 8); if (!tr.length) continue;
      const grp = new T.Group(); grp.position.set(h.o.pos[0], 0, h.o.pos[1]); S.add(grp);
      const rad = (h.o.w || 3.2) / 2 + 3.2, y = Math.max(2.6, h.o.h * 0.55);
      tr.forEach((t, i) => { const a = i / tr.length * Math.PI * 2;
        const m = new T.Mesh(new T.PlaneGeometry(2.4, 1.35), new T.MeshBasicMaterial({ map: titleTex(t.title, h.hex), transparent: true, opacity: 0.92, side: T.DoubleSide, fog: false }));
        m.position.set(Math.cos(a) * rad, y + Math.sin(i * 1.7) * 0.6, Math.sin(a) * rad);
        const fr = new T.LineSegments(new T.EdgesGeometry(m.geometry), new T.LineBasicMaterial({ color: h.o.col })); m.add(fr);
        m.userData = { track: t.id, title: t.title, yt: window.JX.ytId(t.youtube_url), lane: h.lane, loaded: false, a };
        grp.add(m); CL.push(m); fx.screens.push(m); });
      fx.orbits.push({ grp, h, rad });
    } }).catch(e => console.warn(e));
  window.JX ? boot() : addEventListener('DOMContentLoaded', boot);
}
function updateOrbits(t, dt) {
  for (const o of fx.orbits) {
    if (!RED) o.grp.rotation.y += dt * 0.15;
    const d = Math.hypot(P.pos.x - o.h.o.pos[0], P.pos.z - o.h.o.pos[1]);
    o.grp.visible = d < 70;
    for (const m of o.grp.children) {
      m.lookAt(CAM.position.x, m.getWorldPosition(fx.v || (fx.v = new T.Vector3())).y, CAM.position.z);
      const u = m.userData; // lazy thumbnail load when near, capped
      if (!u.loaded && d < 40 && u.yt && texCount < MAX_TEX) { u.loaded = true; texCount++;
        loader().load(`https://i.ytimg.com/vi/${u.yt}/mqdefault.jpg`, tex => { tex.colorSpace = T.SRGBColorSpace; m.material.map.dispose(); m.material.map = tex; m.material.needsUpdate = true; u.thumb = true; },
          undefined, () => { u.thumbFailed = true; /* keep the title-text texture */ }); }
    }
  }
}
/* ---------- proximity volume: 100% near the playing lane's object, 25% far, never mute ---------- */
function proximity() { fx.lastVol = -1; fx.volT = 0; }
function updateVolume(t) {
  const JX = window.JX; if (!JX || !JX.setVolume || t - fx.volT < 0.25) return; fx.volT = t;
  const lane = JX.playing && JX.current ? JX.current.lane : null, h = H.find(x => x.lane === lane);
  let v = 100; if (h) { const d = Math.hypot(P.pos.x - h.o.pos[0], P.pos.z - h.o.pos[1]); v = 25 + 75 * Math.max(0, Math.min(1, (60 - d) / 50)); }
  v = Math.round(v); if (Math.abs(v - fx.lastVol) >= 2 || (v === 100 && fx.lastVol !== 100)) { JX.setVolume(v); fx.lastVol = v; }
}
/* ---------- optional .glb swaps ---------- */
async function swapModels() {
  const todo = Object.entries(MODELS).filter(([, u]) => u); if (!todo.length) return;
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'); const gl = new GLTFLoader();
  for (const [key, url] of todo) gl.load(url, g => {
    const h = H.find(x => x.lane === key);
    if (h) { h.obj.clear(); h.obj.add(g.scene); }
    else if (fx.landmarks && fx.landmarks[key]) { g.scene.position.copy(fx.landmarks[key].pos); S.add(g.scene); }
  }, undefined, e => console.warn('model', key, e));
}

let mapT = 0;
export function updateWorldFX(t, dt) {
  if (fx.sky) fx.sky.uniforms.uTime.value = t; if (fx.sea) fx.sea.uniforms.uTime.value = RED ? 0 : t; if (fx.pathMat) fx.pathMat.uniforms.uTime.value = RED ? 0 : t;
  if (fx.rain && !RED) { const { pos, spd, N } = fx.rain;
    for (let i = 0; i < N; i++) { let y = pos[i * 3 + 1] - spd[i] * dt; if (y < 0) { y = 30; pos[i * 3] = P.pos.x + (Math.random() - 0.5) * 80; pos[i * 3 + 2] = P.pos.z + (Math.random() - 0.5) * 80; } pos[i * 3 + 1] = y; }
    fx.rain.pts.geometry.attributes.position.needsUpdate = true; }
  if (fx.feature) { const f = fx.feature; f.grp.position.y = f.y0 + (RED ? 0 : Math.sin(t * 0.8) * 1.2); f.grp.lookAt(CAM.position.x, f.grp.position.y, CAM.position.z);
    const on = window.JX && JX.playing && JX.current && JX.current.id === f.track; f.frMat.opacity = on ? 0.6 + 0.4 * (window.__beat ? __beat() : 1) : 0.75 + 0.2 * Math.sin(t * 2); f.glow.material.opacity = on ? 0.25 : 0.12; }
  if (fx.wheel && !RED) fx.wheel.rotation.z += dt * 0.08;
  updateCard(); updateOrbits(t, dt); updateVolume(t);
  if (t - mapT > 0.1) { mapT = t; drawMap(); }
  fx.frames = (fx.frames || 0) + 1;
}
export const worldDebug = {
  get fx() { return { screens: fx.screens.length, thumbs: fx.screens.filter(s => s.userData.thumb).length, thumbFailed: fx.screens.filter(s => s.userData.thumbFailed).length, card: fx.cardLane, vol: fx.lastVol, frames: fx.frames, landmarks: fx.landmarks && Object.fromEntries(Object.entries(fx.landmarks).map(([k, v]) => [k, [+v.pos.x.toFixed(1), +v.pos.z.toFixed(1)]])) }; },
  featureAt() { const f = fx.feature; if (!f) return null; const v = f.grp.getWorldPosition(new T.Vector3()).project(CAM), r = CV.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, id: f.track, thumb: fx.featureThumb, pos: [+f.grp.position.x.toFixed(1), +f.grp.position.z.toFixed(1)], visible: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 }; },
  screenAt(lane, i = 0) { const m = fx.screens.filter(s => s.userData.lane === lane)[i]; if (!m) return null; const v = m.getWorldPosition(new T.Vector3()).project(CAM), r = CV.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, id: m.userData.track, z: v.z, visible: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 }; },
};
