/* JHIOS 3D TERMINAL WORLD — three.js (ES module, r169).
   Controls (no inversion anywhere):
     keyboard: W/↑ forward, S/↓ back, A/← turn left, D/→ turn right, Q/E strafe
     mouse/touch drag on the scene: look (drag right = turn right, drag up = look up)
     touch joysticks: left = move (up = forward), right = look (up = look up, right = turn right)
   Joysticks only capture pointers that START on them; panels sit above the canvas. */
import * as THREE from 'three';

const C = window.JHIOS_CONFIG || {};
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer:coarse)').matches;
/* low-quality fallback: reduced motion, ?lq=1, or a low-end device (few cores / little memory) */
const LOW = reduced || /[?&]lq=1/.test(location.search) || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;
document.body.classList.toggle('lq', LOW);
/* LITE (v33): phones / tablets / low memory get the simplified OSM dataset, 1.5x pixel cap, shorter far plane. ?full=1 forces the full set, ?lite=1 forces lite. */
const LITE = !/[?&]full=1/.test(location.search) && (/[?&]lite=1/.test(location.search) || (() => { try { return sessionStorage.getItem('jx-lite') === '1'; } catch (_) { return false; } })() || coarse || (navigator.deviceMemory || 8) <= 4 || Math.min(screen.width, screen.height) <= 820);
const werr = m => { try { (window.__werr || console.error)(m); } catch (_) {} };
const canvas = document.getElementById('scene');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW && !LITE, powerPreference: LITE ? 'default' : 'high-performance', failIfMajorPerformanceCaveat: false }); }
catch (e) { werr('WebGL could not start: ' + (e && e.message || e) + ' (try closing other tabs, or Chrome > Settings > Hardware acceleration)'); throw e; }
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); window.__glLost = (window.__glLost || 0) + 1; werr('3D context lost (GPU reset #' + window.__glLost + '), restoring…'); }, false);
canvas.addEventListener('webglcontextrestored', () => { werr('3D context restored'); setTimeout(() => window.__werr && window.__werr(''), 2500); if (window.__glLost >= 2) { try { sessionStorage.setItem('jx-lite', '1'); } catch (_) {} } }, false);
const capDPR = () => Math.min(window.devicePixelRatio || 1, LOW ? 1 : (coarse || LITE) ? 1.5 : 2);
renderer.setPixelRatio(capDPR());
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050607);
scene.fog = LOW ? null : new THREE.FogExp2(0x03100b, 0.011);
const camera = new THREE.PerspectiveCamera(70, 1, 0.5, LITE ? 3500 : 6000);
/* v41: the lane plaza + spawn sit on open sand on the Golden Mile beach, between the Tower Complex and Britannia Pier (OSM beach, 140 m E / 300 m N of the Marine Parade origin) */
const PZ = window.__PLAZA = [140, -300];
const player = { pos: new THREE.Vector3(PZ[0], 1.7, PZ[1] + 22), yaw: 0, pitch: 0 };

/* ---------- world ---------- */
const grid = new THREE.GridHelper(400, 200, 0x00ff9d, 0x0d3326); grid.material.transparent = true; grid.material.opacity = 0.35; scene.add(grid);
scene.add(new THREE.AmbientLight(0x406060, 1.2));
const sun = new THREE.PointLight(0x00ff9d, 40, 60); sun.position.set(PZ[0], 12, PZ[1]); scene.add(sun);

/* sprite sized to its text: height h world units, width follows the measured text (keeps labels on-screen) */
function labelSprite(text, color = '#00ff9d', h = 1.1) {
  const c = document.createElement('canvas'), g = c.getContext('2d'), F = '600 44px ui-monospace,Menlo,Consolas,monospace';
  g.font = F; const w = Math.ceil(g.measureText(text).width) + 24; c.width = Math.min(2048, w); c.height = 72;
  g.font = F; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = color; g.shadowBlur = 8;
  g.fillText(text, c.width / 2, 36);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false }));
  s.scale.set(h * c.width / 72, h, 1); return s;
}
/* ---------- procedural holographic lane objects (no external models) ---------- */
const HOLO_V = `varying vec3 vN; varying vec3 vV; varying float vY;
void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vY = wp.y; vN = normalize(normalMatrix * normal);
  vec4 mv = viewMatrix * wp; vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const HOLO_F = `uniform vec3 uColor; uniform float uTime; uniform float uPulse; varying vec3 vN; varying vec3 vV; varying float vY;
void main(){ float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
  float scan = 0.55 + 0.45 * step(0.5, fract(vY * 6.0 - uTime * 1.5));
  float band = smoothstep(0.0, 0.15, fract(vY * 0.12 - uTime * 0.25)) * 0.6 + 0.4;
  float flick = 0.85 + 0.15 * sin(uTime * 37.0 + vY * 3.0) * step(0.93, fract(sin(floor(uTime * 12.0)) * 43758.5));
  float a = (0.12 + fr * 0.9) * scan * band * flick * (0.7 + uPulse);
  gl_FragColor = vec4(uColor * (1.0 + uPulse * 0.8), clamp(a, 0.0, 1.0)); }`;
const holoU = { uTime: { value: 0 } };
function holoMat(col) {
  return new THREE.ShaderMaterial({ vertexShader: HOLO_V, fragmentShader: HOLO_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(col) }, uTime: holoU.uTime, uPulse: { value: 0 } } });
}
function wireMat(col) { return new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }); }
/* add a holo part: shader shell + additive edge lines */
function part(obj, geo, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, obj.userData.holo); m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), obj.userData.wire)); obj.add(m); return m;
}
function newHolo(col) { const g = new THREE.Group(); g.userData.holo = holoMat(col); g.userData.wire = wireMat(col); return g; }

function buildFigure(col, female) {
  const g = newHolo(col), s = female ? 0.82 : 1;
  const sh = female ? 0.55 : 0.95;
  part(g, new THREE.SphereGeometry(0.42 * s, 12, 8), 0, 5.55 * s, 0);
  part(g, new THREE.CylinderGeometry(0.14 * s, 0.16 * s, 0.35 * s, 6), 0, 5.05 * s, 0);
  part(g, new THREE.CylinderGeometry(sh * s, (female ? 0.36 : 0.5) * s, 1.7 * s, 6), 0, 4.0 * s, 0);
  if (female) part(g, new THREE.CylinderGeometry(0.34 * s, 0.72 * s, 1.25 * s, 6), 0, 2.75 * s, 0);
  else part(g, new THREE.CylinderGeometry(0.5 * s, 0.45 * s, 0.6 * s, 6), 0, 2.9 * s, 0);
  for (const sgn of [-1, 1]) {
    const arm = new THREE.CylinderGeometry((female ? 0.1 : 0.17) * s, (female ? 0.08 : 0.13) * s, 2.3 * s, 5);
    part(g, arm, sgn * (sh + 0.12) * s, 3.75 * s, 0, 0, 0, sgn * 0.12);
    part(g, new THREE.SphereGeometry((female ? 0.13 : 0.22) * s, 6, 4), sgn * (sh + 0.05) * s, 4.8 * s, 0);
    part(g, new THREE.CylinderGeometry((female ? 0.15 : 0.22) * s, (female ? 0.09 : 0.14) * s, 2.6 * s, 5), sgn * (female ? 0.22 : 0.3) * s, 1.3 * s, 0);
  }
  if (!female) {
    part(g, new THREE.BoxGeometry(0.62 * s, 0.7 * s, 0.14 * s), 0, 5.55 * s, 0.38 * s);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff5470, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    g.userData.eyes = [-1, 1].map(sg => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 0.07 * s, 0.05 * s), eyeMat); e.position.set(sg * 0.15 * s, 5.62 * s, 0.47 * s); g.add(e); return e; });
    g.userData.eyeMat = eyeMat;
  }
  if (female) {
    const strands = new THREE.Group(); strands.position.set(0, 5.75 * s, -0.1); g.add(strands); g.userData.strands = [];
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.25 + 0.5 * i / 8) + Math.PI, x0 = Math.cos(a) * 0.4 * s, z0 = Math.sin(a) * 0.4 * s * -1;
      const pts = Array.from({ length: 7 }, (_, k) => new THREE.Vector3(x0 * (1 + k * 0.12), -k * 0.42 * s, -Math.abs(z0) - k * 0.05));
      const geo = new THREE.BufferGeometry().setFromPoints(pts); const line = new THREE.Line(geo, g.userData.wire);
      line.userData.base = pts.map(p => p.clone()); line.userData.ph = i * 0.7; strands.add(line); g.userData.strands.push(line);
    }
    const tMat = new THREE.LineBasicMaterial({ color: 0xe6d4ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
    g.userData.trails = [0, 1].map(k => { const n = 40, geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const l = new THREE.Line(geo, tMat); l.frustumCulled = false; l.userData = { k, n, init: false }; g.add(l); return l; });
  }
  if (female) {
    const hair = new THREE.CylinderGeometry(0.46 * s, 0.62 * s, 1.9 * s, 10, 1, true, Math.PI * 0.15, Math.PI * 1.7);
    part(g, hair, 0, 4.9 * s, -0.06, 0, Math.PI, 0);
    part(g, new THREE.SphereGeometry(0.47 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), 0, 5.6 * s, -0.02);
  }
  return g;
}
export function makeScr3wfac3Figure(col = 0xff2e4d) {
  const g = newHolo(col), V = (x, y, z) => new THREE.Vector3(x, y, z);
  const blk = new THREE.MeshBasicMaterial({ color: 0x0a0a0c }), mask = new THREE.MeshBasicMaterial({ color: 0x141417 }), cuffM = new THREE.MeshBasicMaterial({ color: 0x1c1c20 }), shoeM = new THREE.MeshBasicMaterial({ color: 0xe9ecef });
  const rim = g.userData.wire, shoeRim = new THREE.LineBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const P = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, edge = rim) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); if (edge) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), edge)); (cur || g).add(m); return m; };
  let cur = null; const pivot = (name, x, y, z) => { const q = new THREE.Group(); q.name = name; q.position.set(x, y, z); g.add(q); return q; };
  const limbs = g.userData.limbs = {};
  P(new THREE.SphereGeometry(0.44, 10, 8), blk, 0, 5.55, -0.04, 0, 0, 0, 1, 1.12, 1);
  P(new THREE.SphereGeometry(0.4, 10, 8, -Math.PI * 0.42, Math.PI * 0.84, 0.12 * Math.PI, 0.72 * Math.PI), mask, 0, 5.52, 0.1, 0, 0, 0, 0.98, 1.22, 0.9, null);
  P(new THREE.ConeGeometry(0.07, 0.22, 4), mask, 0, 5.5, 0.47, 0.35, Math.PI / 4, 0, 1, 1, 0.8, null);
  P(new THREE.BoxGeometry(0.2, 0.045, 0.06), mask, 0, 5.3, 0.44, 0, 0, 0, 1, 1, 1, null);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.47, 10, 8), g.userData.holo); shell.position.set(0, 5.55, -0.02); shell.scale.set(1, 1.12, 1); g.add(shell);
  P(new THREE.CylinderGeometry(0.24, 0.27, 0.42, 8), blk, 0, 5.0, 0);
  P(new THREE.CylinderGeometry(0.92, 0.52, 1.75, 8), blk, 0, 4.0, 0);
  P(new THREE.CylinderGeometry(0.52, 0.48, 0.55, 8), blk, 0, 2.9, 0);
  for (const sg of [-1, 1]) { const side = sg < 0 ? 'R' : 'L';
    P(new THREE.SphereGeometry(0.24, 6, 4), blk, sg * 0.98, 4.78, 0);
    cur = limbs['arm' + side] = pivot('arm' + side, sg * 0.98, 4.78, 0);
    P(new THREE.CylinderGeometry(0.18, 0.14, 2.2, 6), blk, sg * 0.1, -1.06, 0, 0, 0, sg * 0.12);
    P(new THREE.SphereGeometry(0.13, 6, 4), mask, sg * 0.24, -2.23, 0, 0, 0, 0, 1, 1, 1, null);
    cur = limbs['leg' + side] = pivot('leg' + side, sg * 0.3, 2.65, 0);
    P(new THREE.CylinderGeometry(0.23, 0.15, 2.3, 6), blk, 0, -1.15, 0);
    P(new THREE.CylinderGeometry(0.15, 0.15, 0.16, 6), cuffM, 0, -2.29, 0);
    P(new THREE.BoxGeometry(0.34, 0.26, 0.74), shoeM, 0, -2.51, 0.1, 0, 0, 0, 1, 1, 1, shoeRim);
    P(new THREE.BoxGeometry(0.36, 0.08, 0.78), shoeM, 0, -2.61, 0.11, 0, 0, 0, 1, 1, 1, null);
    cur = null;
  }
  const gold = [], curve = (pts, n = 8) => { const c = new THREE.CatmullRomCurve3(pts).getPoints(n); for (let i = 0; i < c.length - 1; i++) gold.push(c[i].x, c[i].y, c[i].z, c[i + 1].x, c[i + 1].y, c[i + 1].z); };
  for (const sg of [-1, 1]) { const ex = sg * 0.17;
    curve([V(ex - sg * 0.13, 5.84, 0.38), V(ex, 5.66, 0.47), V(ex + sg * 0.16, 5.42, 0.38)]);
    curve([V(ex + sg * 0.15, 5.86, 0.36), V(ex + sg * 0.02, 5.66, 0.47), V(ex - sg * 0.12, 5.44, 0.42)]); }
  curve([V(-0.2, 5.36, 0.4), V(0, 5.26, 0.47), V(0.2, 5.36, 0.4)]);
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gold, 3));
  g.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0xe0b24a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })));
  const scr = [], S2 = [[-0.12, 5.98, 0.3, -0.2, 1, 0.3], [0.04, 6.0, 0.3, 0.1, 1, 0.2], [0.2, 5.95, 0.28, 0.6, 0.8, 0.2], [-0.37, 5.7, 0.2, -1, 0.1, 0.2], [0.38, 5.74, 0.2, 1, 0.15, 0.1],
    [-0.36, 5.4, 0.22, -1, -0.15, 0.3], [0.37, 5.42, 0.22, 1, -0.1, 0.25], [-0.13, 5.5, 0.44, 0.3, 0.1, 1], [-0.12, 5.12, 0.36, -0.5, -0.8, 0.4]];
  for (const [x, y, z, dx, dy, dz] of S2) { const d = V(dx, dy, dz).normalize().multiplyScalar(0.2); scr.push(x, y, z, x + d.x, y + d.y, z + d.z, x + d.x * 0.5 - 0.02, y + d.y * 0.5, z + d.z * 0.5, x + d.x * 0.5 + 0.02, y + d.y * 0.5, z + d.z * 0.5); }
  const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.Float32BufferAttribute(scr, 3));
  g.add(new THREE.LineSegments(sgeo, new THREE.LineBasicMaterial({ color: 0xdfe6ee, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })));
  P(new THREE.SphereGeometry(0.05, 6, 4), blk, -0.16, 5.66, 0.43, 0, 0, 0, 1.4, 0.8, 0.6, null);
  const amber = new THREE.MeshBasicMaterial({ color: 0xffa424, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), amber); eye.position.set(0.16, 5.66, 0.44); eye.scale.set(1.4, 0.8, 0.6); g.add(eye);
  const hc = document.createElement('canvas'); hc.width = hc.height = 64; const hg = hc.getContext('2d'), gr = hg.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,170,40,1)'); gr.addColorStop(1, 'rgba(255,120,0,0)'); hg.fillStyle = gr; hg.fillRect(0, 0, 64, 64);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(hc), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); halo.position.set(0.16, 5.66, 0.5); halo.scale.setScalar(0.45); g.add(halo);
  g.userData.amber = { mat: amber, halo }; g.traverse(o => { o.raycast = () => {}; });
  return g;
}
function buildRobot(col) {
  const g = newHolo(col), B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  part(g, B(1.6, 1.3, 1.4), 0, 12.3, 0);
  part(g, B(1.3, 0.25, 0.1), 0, 12.4, 0.72);
  part(g, new THREE.CylinderGeometry(0.04, 0.04, 1.2, 4), 0.5, 13.5, 0); part(g, new THREE.SphereGeometry(0.15, 6, 4), 0.5, 14.1, 0);
  part(g, B(3.6, 3.2, 2.0), 0, 9.8, 0);
  { const c = document.createElement('canvas'); c.width = 256; c.height = 160; const tex = new THREE.CanvasTexture(c);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    scr.position.set(0, 9.55, 1.04); g.add(scr); g.userData.chart = { c, g: c.getContext('2d'), tex, data: Array.from({ length: 48 }, (_, i) => 80 + Math.sin(i * 0.4) * 20), last: 0 };
  }
  part(g, new THREE.CylinderGeometry(0.35, 0.35, 0.12, 8), 0, 11.15, 1.02, Math.PI / 2);
  part(g, B(2.4, 1.4, 1.6), 0, 7.6, 0);
  for (const sgn of [-1, 1]) {
    part(g, B(1.2, 1.0, 1.4), sgn * 2.45, 10.9, 0);
    part(g, B(0.8, 2.6, 0.8), sgn * 2.45, 8.9, 0);
    part(g, B(0.95, 2.4, 0.95), sgn * 2.45, 6.4, 0);
    part(g, B(0.8, 0.7, 0.6), sgn * 2.45, 4.9, 0);
    part(g, B(1.0, 3.0, 1.1), sgn * 0.8, 5.3, 0);
    part(g, B(1.15, 3.0, 1.25), sgn * 0.8, 2.0, 0);
    part(g, B(1.3, 0.5, 1.9), sgn * 0.8, 0.25, 0.25);
  }
  return g;
}
function buildTurntable(col) {
  const g = newHolo(col);
  part(g, new THREE.BoxGeometry(5, 0.7, 4), 0, 1.6, 0);
  part(g, new THREE.CylinderGeometry(0.25, 0.25, 1.25, 6), 0, 0.62, 0);
  const vinyl = new THREE.Group(); vinyl.position.set(-0.5, 2.05, 0); g.add(vinyl);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.06, 32), g.userData.holo); vinyl.add(disc);
  for (let r = 0.55; r < 1.7; r += 0.18) {
    const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 40 }, (_, i) => new THREE.Vector3(Math.cos(i / 40 * 6.283) * r, 0.04, Math.sin(i / 40 * 6.283) * r))), g.userData.wire);
    vinyl.add(ring);
  }
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 12), g.userData.holo); lab.position.y = 0.02; vinyl.add(lab);
  vinyl.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.1, 0.1, 3.2)), g.userData.wire));
  part(g, new THREE.CylinderGeometry(0.22, 0.28, 0.35, 6), -2.1, 2.2, 0, 0, 0, -0.4);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), g.userData.holo); base.position.set(-2.1, 1.95, 0); vinyl.add(base);
  g.userData.vinyl = vinyl;
  return g;
}
/* ---------- lane plaza ---------- */
const clickables = [];
const lanes = (C.lanes || []).map((ln, i) => {
  const g = new THREE.Group(); g.position.set(PZ[0] + (i - 1.5) * 8, 0, PZ[1]); scene.add(g);
  const fig = ln.id === 'scr3w' ? makeScr3wfac3Figure(ln.color) : ln.id === 'robot' ? buildRobot(ln.color) : ln.id === 'turntable' ? buildTurntable(ln.color) : buildFigure(ln.color, ln.female);
  fig.scale.setScalar(ln.scale || 1); g.add(fig);
  const lab = labelSprite(ln.label || ln.id, ln.color || '#00ff9d', 1.4); lab.position.y = (ln.scale || 1) * 6.5; g.add(lab);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(3, 6, 3), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 3; g.add(hit);
  hit.userData = { id: ln.id, type: 'lane' }; clickables.push(hit);
  return { g, fig, lab, id: ln.id };
});
/* ---------- animate holos ---------- */
function animateHolos(t, dt) {
  holoU.uTime.value = t;
  lanes.forEach(l => {
    if (l.fig.userData.eyes) l.fig.userData.eyes.forEach(e => e.material.opacity = 0.6 + 0.4 * Math.sin(t * 8 + e.position.x));
    if (l.fig.userData.strands) l.fig.userData.strands.forEach(s => { const pts = s.userData.base.map((p, i) => p.clone().add(new THREE.Vector3(Math.sin(t * 1.2 + s.userData.ph + i) * 0.08, 0, 0))); s.geometry.setFromPoints(pts); });
    if (l.fig.userData.vinyl) l.fig.userData.vinyl.rotation.y += dt * 2;
    if (l.fig.userData.chart) { const ch = l.fig.userData.chart; if (t - ch.last > 0.12) { ch.last = t; ch.data.push(80 + Math.sin(t * 0.8) * 30 + Math.random() * 10); ch.data.shift(); const g = ch.g; g.clearRect(0, 0, 256, 160); g.strokeStyle = '#00ff9d'; g.lineWidth = 2; g.beginPath(); ch.data.forEach((v, i) => { const x = i * (256 / 48), y = 160 - v; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); ch.tex.needsUpdate = true; } }
  });
}
/* ---------- input ---------- */
const keys = new Set();
const stickL = { x: 0, y: 0 }, stickR = { x: 0, y: 0 };
const pad = { poll: () => ({ mx: 0, my: 0, lx: 0, ly: 0, sprint: false }) };
const MOVE = 18, TURN = 1.8;
const fwd = new THREE.Vector3(), right = new THREE.Vector3();
const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const gp = pad.poll();
  let mv = (keys.has('f') ? 1 : 0) - (keys.has('b') ? 1 : 0) + stickL.y + gp.my;
  let st = (keys.has('sr') ? 1 : 0) - (keys.has('sl') ? 1 : 0) + stickL.x + gp.mx;
  const turn = window.__mapOpen ? 0 : ((keys.has('tr') ? 1 : 0) - (keys.has('tl') ? 1 : 0) + stickR.x + gp.lx);
  player.yaw -= turn * TURN * dt;
  if (!window.__mapOpen) player.pitch += (stickR.y + gp.ly) * TURN * 0.7 * dt;
  player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch));
  fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)); right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const SPD = (gp.sprint ? 2 : 1) * MOVE * (1 + Math.min(5, Math.max(0, (Math.hypot(player.pos.x - PZ[0], player.pos.z - PZ[1]) - 60) / 40)));
  if (window.__mapOpen) { mv = 0; st = 0; }
  { const dx = (fwd.x * mv + right.x * st) * SPD * dt, dz = (fwd.z * mv + right.z * st) * SPD * dt, C = window.__collide, px = player.pos.x, pz = player.pos.z;
    if (C && (dx || dz) && !C(px, pz)) { if (!C(px + dx, pz + dz)) player.pos.x += dx, player.pos.z += dz; else if (!C(px + dx, pz)) player.pos.x += dx; else if (!C(px, pz + dz)) player.pos.z += dz; }
    else { player.pos.x += dx; player.pos.z += dz; } }
  player.pos.x = Math.max(-1600, Math.min(700, player.pos.x)); player.pos.z = Math.max(-4700, Math.min(3600, player.pos.z));
  camera.position.copy(player.pos); camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  animateHolos(clock.elapsedTime, dt);
  renderer.render(scene, camera);
  if (!window.__worldReady) { window.__worldReady = true; document.documentElement.dataset.world = 'ok'; }
}
renderer.setAnimationLoop(tick);
document.addEventListener('visibilitychange', () => renderer.setAnimationLoop(document.hidden ? null : tick));
window.__world = { get player() { return player; }, face(lane) { const m = clickables.find(o => o.userData.id === lane); if (m) { player.pos.set(m.position.x, 1.7, m.position.z + 14); player.yaw = 0; player.pitch = 0.15; } }, project(lane) { const m = clickables.find(o => o.userData.id === lane); if (!m) return null; const v = m.position.clone().project(camera); const r = canvas.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, visible: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 }; }, goto(x, z, yaw = 0, pitch = 0) { player.pos.set(x, 1.7, z); player.yaw = yaw; player.pitch = pitch; }, get low() { return LOW; }, get lite() { return LITE; }, get state() { return { x: player.pos.x, z: player.pos.z, yaw: player.yaw, pitch: player.pitch }; } };
