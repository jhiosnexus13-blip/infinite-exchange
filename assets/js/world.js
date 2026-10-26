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
catch (e) { werr('WebGL could not start: ' + (e && e.message || e) + ' (try closing other tabs, or Chrome > Settings > Hardware acceleration)'); glFallback(e); throw e; }
/* v62: WebGL failure fallback: a readable card instead of a dead black screen (lite-mode retry, the vault, home) */
function glFallback(e) { try { const d = document.createElement('div'); d.id = 'wglfail'; d.setAttribute('role', 'alert');
  d.style.cssText = 'position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:#05080a;color:#dfffee;font:15px/1.45 system-ui,sans-serif;padding:20px';
  d.innerHTML = '<div style="max-width:420px;border:1px solid #00ff9d;border-radius:14px;padding:18px;background:rgba(0,20,14,.9);box-shadow:0 0 24px rgba(0,255,157,.25)"><b style="color:#00ff9d;letter-spacing:.08em">3D WORLD COULD NOT START</b><p>Your browser or device blocked 3D graphics (WebGL). Try lite mode, turn on hardware acceleration, or listen in the vault instead.</p><p style="display:flex;gap:8px;flex-wrap:wrap"><a href="/world?lite=1" style="padding:10px 14px;border:2px solid #00ff9d;border-radius:22px;color:#00ff9d;text-decoration:none">TRY LITE MODE</a><a href="/vault" style="padding:10px 14px;border:2px solid #9d7dff;border-radius:22px;color:#cdbdff;text-decoration:none">OPEN THE VAULT</a><a href="/" style="padding:10px 14px;border:1px solid #445;border-radius:22px;color:#ccd;text-decoration:none">HOME</a></p></div>';
  (document.body ? document.body.appendChild(d) : addEventListener('DOMContentLoaded', () => document.body.appendChild(d))); } catch (_) {} }
/* v62: visible lite mode: a small chip says when the simplified world is on, with a one-tap switch to full (and back) */
addEventListener('DOMContentLoaded', () => { try { const c = document.createElement('a'); c.id = 'wlite'; c.href = LITE ? '/world?full=1' : '/world?lite=1';
  c.textContent = LITE ? 'LITE MODE · tap for full' : 'FULL · lite mode'; c.title = LITE ? 'Simplified world for phones / low memory. Switch to the full world' : 'Switch to the simplified lite world';
  c.style.cssText = 'position:fixed;left:8px;bottom:calc(var(--player-h,64px) + 26px + env(safe-area-inset-bottom));z-index:24;padding:3px 9px;border-radius:10px;font:600 11px ui-monospace,monospace;letter-spacing:.05em;text-decoration:none;background:rgba(0,10,8,.8);border:1px solid ' + (LITE ? '#ffc84a;color:#ffe7a8' : '#335;color:#99a') + ';opacity:' + (LITE ? '.95' : '.6');
  c.addEventListener('click', () => { try { if (!LITE) sessionStorage.removeItem('jx-lite'); else sessionStorage.setItem('jx-lite', '0'); } catch (_) {} }); document.body.appendChild(c); } catch (_) {} });
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
  const sh = female ? 0.55 : 0.95;                       // shoulder half-width
  part(g, new THREE.SphereGeometry(0.42 * s, 12, 8), 0, 5.55 * s, 0);                       // head
  part(g, new THREE.CylinderGeometry(0.14 * s, 0.16 * s, 0.35 * s, 6), 0, 5.05 * s, 0);       // neck
  part(g, new THREE.CylinderGeometry(sh * s, (female ? 0.36 : 0.5) * s, 1.7 * s, 6), 0, 4.0 * s, 0); // torso (taper)
  if (female) part(g, new THREE.CylinderGeometry(0.34 * s, 0.72 * s, 1.25 * s, 6), 0, 2.75 * s, 0);  // hips/skirt flare
  else part(g, new THREE.CylinderGeometry(0.5 * s, 0.45 * s, 0.6 * s, 6), 0, 2.9 * s, 0);       // pelvis
  for (const sgn of [-1, 1]) {
    const arm = new THREE.CylinderGeometry((female ? 0.1 : 0.17) * s, (female ? 0.08 : 0.13) * s, 2.3 * s, 5);
    part(g, arm, sgn * (sh + 0.12) * s, 3.75 * s, 0, 0, 0, sgn * 0.12);
    part(g, new THREE.SphereGeometry((female ? 0.13 : 0.22) * s, 6, 4), sgn * (sh + 0.05) * s, 4.8 * s, 0); // shoulder
    part(g, new THREE.CylinderGeometry((female ? 0.15 : 0.22) * s, (female ? 0.09 : 0.14) * s, 2.6 * s, 5), sgn * (female ? 0.22 : 0.3) * s, 1.3 * s, 0);
  }
  if (!female) { // SCR3WFAC3 mask: face plate + glitch eyes
    part(g, new THREE.BoxGeometry(0.62 * s, 0.7 * s, 0.14 * s), 0, 5.55 * s, 0.38 * s);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff5470, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    g.userData.eyes = [-1, 1].map(sg => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 0.07 * s, 0.05 * s), eyeMat); e.position.set(sg * 0.15 * s, 5.62 * s, 0.47 * s); g.add(e); return e; });
    g.userData.eyeMat = eyeMat;
  }
  if (female) { // flowing hair strands (swayed in animateHolos) + orbiting light trails
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
  if (female) { // long hair: hood shell behind head down past shoulders
    const hair = new THREE.CylinderGeometry(0.46 * s, 0.62 * s, 1.9 * s, 10, 1, true, Math.PI * 0.15, Math.PI * 1.7);
    part(g, hair, 0, 4.9 * s, -0.06, 0, Math.PI, 0);
    part(g, new THREE.SphereGeometry(0.47 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), 0, 5.6 * s, -0.02);
  }
  return g;
}
/* v41: the SCR3WFAC3 figure, styled on the real mask (turnaround refs): matte black human-face mask over a black balaclava, gold wire X over each eye
   and a curved wire across the mouth, silver screws at angles, one amber glowing eye; black turtleneck, black joggers with cuffs, white trainers.
   Solid near-black parts with the lane-red neon edge rim; all gold wire in one LineSegments, all screws in one, so it stays cheap on phones. */
export function makeScr3wfac3Figure(col = 0xff2e4d) {
  const g = newHolo(col), V = (x, y, z) => new THREE.Vector3(x, y, z);
  const blk = new THREE.MeshBasicMaterial({ color: 0x0a0a0c }), mask = new THREE.MeshBasicMaterial({ color: 0x141417 }), cuffM = new THREE.MeshBasicMaterial({ color: 0x1c1c20 }), shoeM = new THREE.MeshBasicMaterial({ color: 0xe9ecef });
  const rim = g.userData.wire, shoeRim = new THREE.LineBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const P = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, edge = rim) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); if (edge) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), edge)); (cur || g).add(m); return m; };
  let cur = null; const pivot = (name, x, y, z) => { const q = new THREE.Group(); q.name = name; q.position.set(x, y, z); g.add(q); return q; };
  const limbs = g.userData.limbs = {}; // separable pivots (armL/armR at the shoulders, legL/legR at the hips) so this can be rigged for walking later
  // athletic ~180 cm build (figure is scaled up as a statue by the lane config)
  P(new THREE.SphereGeometry(0.44, 10, 8), blk, 0, 5.55, -0.04, 0, 0, 0, 1, 1.12, 1);                       // balaclava / hood
  P(new THREE.SphereGeometry(0.4, 10, 8, -Math.PI * 0.42, Math.PI * 0.84, 0.12 * Math.PI, 0.72 * Math.PI), mask, 0, 5.52, 0.1, 0, 0, 0, 0.98, 1.22, 0.9, null); // mask: front shell
  P(new THREE.ConeGeometry(0.07, 0.22, 4), mask, 0, 5.5, 0.47, 0.35, Math.PI / 4, 0, 1, 1, 0.8, null);        // nose
  P(new THREE.BoxGeometry(0.2, 0.045, 0.06), mask, 0, 5.3, 0.44, 0, 0, 0, 1, 1, 1, null);                       // lips
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.47, 10, 8), g.userData.holo); shell.position.set(0, 5.55, -0.02); shell.scale.set(1, 1.12, 1); g.add(shell); // faint lane-red holo rim around the head
  P(new THREE.CylinderGeometry(0.24, 0.27, 0.42, 8), blk, 0, 5.0, 0);                                            // turtleneck roll collar
  P(new THREE.CylinderGeometry(0.92, 0.52, 1.75, 8), blk, 0, 4.0, 0);                                            // sweatshirt torso (V-taper)
  P(new THREE.CylinderGeometry(0.52, 0.48, 0.55, 8), blk, 0, 2.9, 0);                                            // waistband / hips
  for (const sg of [-1, 1]) { const side = sg < 0 ? 'R' : 'L'; // figure faces +z, so -x is its right
    P(new THREE.SphereGeometry(0.24, 6, 4), blk, sg * 0.98, 4.78, 0);
    cur = limbs['arm' + side] = pivot('arm' + side, sg * 0.98, 4.78, 0);
    P(new THREE.CylinderGeometry(0.18, 0.14, 2.2, 6), blk, sg * 0.1, -1.06, 0, 0, 0, sg * 0.12);                 // sleeve
    P(new THREE.SphereGeometry(0.13, 6, 4), mask, sg * 0.24, -2.23, 0, 0, 0, 0, 1, 1, 1, null);                   // gloved hand
    cur = limbs['leg' + side] = pivot('leg' + side, sg * 0.3, 2.65, 0);
    P(new THREE.CylinderGeometry(0.23, 0.15, 2.3, 6), blk, 0, -1.15, 0);                                    // jogger leg
    P(new THREE.CylinderGeometry(0.15, 0.15, 0.16, 6), cuffM, 0, -2.29, 0);                                // jogger cuff
    P(new THREE.BoxGeometry(0.34, 0.26, 0.74), shoeM, 0, -2.51, 0.1, 0, 0, 0, 1, 1, 1, shoeRim);           // white trainer
    P(new THREE.BoxGeometry(0.36, 0.08, 0.78), shoeM, 0, -2.61, 0.11, 0, 0, 0, 1, 1, 1, null);             // chunky sole
    cur = null;
  }
  // gold wires: an X of curved wire over each eye + one curve across the mouth (on the mask surface, z ~ face front)
  const gold = [], curve = (pts, n = 8) => { const c = new THREE.CatmullRomCurve3(pts).getPoints(n); for (let i = 0; i < c.length - 1; i++) gold.push(c[i].x, c[i].y, c[i].z, c[i + 1].x, c[i + 1].y, c[i + 1].z); };
  for (const sg of [-1, 1]) { const ex = sg * 0.17;
    curve([V(ex - sg * 0.13, 5.84, 0.38), V(ex, 5.66, 0.47), V(ex + sg * 0.16, 5.42, 0.38)]);
    curve([V(ex + sg * 0.15, 5.86, 0.36), V(ex + sg * 0.02, 5.66, 0.47), V(ex - sg * 0.12, 5.44, 0.42)]); }
  curve([V(-0.2, 5.36, 0.4), V(0, 5.26, 0.47), V(0.2, 5.36, 0.4)]);
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gold, 3));
  g.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0xe0b24a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })));
  // silver screws sticking out at angles: forehead, temples, cheeks, chin
  const scr = [], S2 = [[-0.12, 5.98, 0.3, -0.2, 1, 0.3], [0.04, 6.0, 0.3, 0.1, 1, 0.2], [0.2, 5.95, 0.28, 0.6, 0.8, 0.2], [-0.37, 5.7, 0.2, -1, 0.1, 0.2], [0.38, 5.74, 0.2, 1, 0.15, 0.1],
    [-0.36, 5.4, 0.22, -1, -0.15, 0.3], [0.37, 5.42, 0.22, 1, -0.1, 0.25], [-0.13, 5.5, 0.44, 0.3, 0.1, 1], [-0.12, 5.12, 0.36, -0.5, -0.8, 0.4]];
  for (const [x, y, z, dx, dy, dz] of S2) { const d = V(dx, dy, dz).normalize().multiplyScalar(0.2); scr.push(x, y, z, x + d.x, y + d.y, z + d.z, x + d.x * 0.5 - 0.02, y + d.y * 0.5, z + d.z * 0.5, x + d.x * 0.5 + 0.02, y + d.y * 0.5, z + d.z * 0.5); }
  const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.Float32BufferAttribute(scr, 3));
  g.add(new THREE.LineSegments(sgeo, new THREE.LineBasicMaterial({ color: 0xdfe6ee, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })));
  // eyes: dark left socket, amber glowing right eye (viewer's right, as on the real mask) with a soft halo
  P(new THREE.SphereGeometry(0.05, 6, 4), blk, -0.16, 5.66, 0.43, 0, 0, 0, 1.4, 0.8, 0.6, null);
  const amber = new THREE.MeshBasicMaterial({ color: 0xffa424, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), amber); eye.position.set(0.16, 5.66, 0.44); eye.scale.set(1.4, 0.8, 0.6); g.add(eye);
  const hc = document.createElement('canvas'); hc.width = hc.height = 64; const hg = hc.getContext('2d'), gr = hg.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,170,40,1)'); gr.addColorStop(1, 'rgba(255,120,0,0)'); hg.fillStyle = gr; hg.fillRect(0, 0, 64, 64);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(hc), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); halo.position.set(0.16, 5.66, 0.5); halo.scale.setScalar(0.45); g.add(halo);
  g.userData.amber = { mat: amber, halo }; g.traverse(o => { o.raycast = () => {}; }); // decorative only: taps go to the lane hit-box / screens
  return g;
}
function buildRobot(col) {
  const g = newHolo(col), B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  part(g, B(1.6, 1.3, 1.4), 0, 12.3, 0);                          // head
  part(g, B(1.3, 0.25, 0.1), 0, 12.4, 0.72);                      // visor
  part(g, new THREE.CylinderGeometry(0.04, 0.04, 1.2, 4), 0.5, 13.5, 0); part(g, new THREE.SphereGeometry(0.15, 6, 4), 0.5, 14.1, 0);
  part(g, B(3.6, 3.2, 2.0), 0, 9.8, 0);                           // chest
  { // chest screen: animated scrolling line chart (canvas texture, redrawn ~8fps)
    const c = document.createElement('canvas'); c.width = 256; c.height = 160; const tex = new THREE.CanvasTexture(c);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    scr.position.set(0, 9.55, 1.04); g.add(scr); g.userData.chart = { c, g: c.getContext('2d'), tex, data: Array.from({ length: 48 }, (_, i) => 80 + Math.sin(i * 0.4) * 20), last: 0 };
  }
  part(g, new THREE.CylinderGeometry(0.35, 0.35, 0.12, 8), 0, 11.15, 1.02, Math.PI / 2);  // core
  part(g, B(2.4, 1.4, 1.6), 0, 7.6, 0);                           // waist
  for (const sgn of [-1, 1]) {
    part(g, B(1.2, 1.0, 1.4), sgn * 2.45, 10.9, 0);               // pauldron
    part(g, B(0.8, 2.6, 0.8), sgn * 2.45, 8.9, 0);                // upper arm
    part(g, B(0.95, 2.4, 0.95), sgn * 2.45, 6.4, 0);              // forearm
    part(g, B(0.8, 0.7, 0.6), sgn * 2.45, 4.9, 0);                // fist
    part(g, B(1.0, 3.0, 1.1), sgn * 0.8, 5.3, 0);                 // thigh
    part(g, B(1.15, 3.0, 1.25), sgn * 0.8, 2.0, 0);               // shin
    part(g, B(1.3, 0.5, 1.9), sgn * 0.8, 0.25, 0.25);             // foot
  }
  return g;
}
function buildTurntable(col) {
  const g = newHolo(col);
  part(g, new THREE.BoxGeometry(5, 0.7, 4), 0, 1.6, 0);           // plinth
  part(g, new THREE.CylinderGeometry(0.25, 0.25, 1.25, 6), 0, 0.62, 0); // pedestal
  const vinyl = new THREE.Group(); vinyl.position.set(-0.5, 2.05, 0); g.add(vinyl);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.06, 32), g.userData.holo); vinyl.add(disc);
  for (let r = 0.55; r < 1.7; r += 0.18) { // groove rings
    const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 40 }, (_, i) => new THREE.Vector3(Math.cos(i / 40 * 6.283) * r, 0.04, Math.sin(i / 40 * 6.283) * r))), g.userData.wire);
    vinyl.add(ring);
  }
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 12), g.userData.holo); lab.position.y = 0.02; vinyl.add(lab);
  vinyl.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.1, 0.1, 3.2)), g.userData.wire)); // marker stripe shows spin
  part(g, new THREE.CylinderGeometry(0.22, 0.28, 0.5, 8), 1.9, 2.2, -1.4);                 // tonearm pivot
  part(g, new THREE.CylinderGeometry(0.05, 0.05, 2.6, 4), 1.2, 2.5, -0.4, 0, 0, Math.PI / 2).rotation.set(Math.PI / 2, 0, 0.62); // arm
  part(g, new THREE.BoxGeometry(0.25, 0.15, 0.45), 0.45, 2.42, 0.6, 0, 0.6, 0);             // headshell
  g.userData.spin = vinyl; return g;
}
function buildPlanet(col) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x062a33, emissive: col, emissiveIntensity: 0.25, roughness: 0.6, flatShading: true });
  const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(2.3, 2), mat); sphere.position.y = 4.2; g.add(sphere);
  const ringMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.45, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.0, 4.4, 48, 1), ringMat); ring.rotation.set(-Math.PI / 2 + 0.45, 0, 0.2); sphere.add(ring);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(4.6, 4.75, 48, 1), ringMat); ring2.rotation.copy(ring.rotation); sphere.add(ring2);
  g.userData.holo = holoMat(col); const shell = new THREE.Mesh(new THREE.SphereGeometry(2.45, 20, 14), g.userData.holo); sphere.add(shell); // fresnel atmosphere
  g.userData.solid = mat; g.userData.spin = sphere; return g;
}
function buildQuestion(col) {
  const g = newHolo(col);
  const curve = new THREE.CatmullRomCurve3([[-1.3, 6.3], [-1.1, 7.3], [0, 7.8], [1.2, 7.3], [1.4, 6.2], [0.6, 5.3], [0, 4.6], [0, 3.6]].map(([x, y]) => new THREE.Vector3(x, y, 0)));
  part(g, new THREE.TubeGeometry(curve, 28, 0.4, 6, false), 0, 0, 0);
  part(g, new THREE.SphereGeometry(0.5, 10, 8), 0, 2.4, 0);
  return g;
}
const HOLO_OBJS = {
  'SCR3WFAC3':         { pos: [-16, -6], col: 0xff2e4d, build: c => { const g = makeScr3wfac3Figure(c); g.scale.setScalar(1.3); return g; }, h: 7.8 },
  'Luce Aether':       { pos: [16, -6],  col: 0xb48cff, build: c => buildFigure(c, true), h: 5.1 },
  'JHIOS Soundtracks': { pos: [-16, 12], col: 0xffcc00, build: buildTurntable, h: 3.2, w: 5.2 },
  'Sanctum':           { pos: [18, 14],  col: 0x00e5ff, build: buildPlanet, h: 7, w: 6 },
  'Unsorted':          { pos: [-30, 2],  col: 0x00ff9d, build: buildQuestion, h: 8.4, w: 3.4 },
  // GoldBot scaled to 0.56 (fits the frame + label from __world.face) and moved off the spawn->globe sightline
  'GoldBot':           { pos: [13, -27], col: 0xffc94a, build: c => { const g = buildRobot(c); g.scale.setScalar(0.56); return g; }, h: 8.1, w: 3.9, link: 'https://goldbot-digitalassetops.lovable.app/', label: 'GoldBot // Zak Denny', sub: 'tap to open' },
};
for (const o of Object.values(HOLO_OBJS)) o.pos = [o.pos[0] + PZ[0], o.pos[1] + PZ[1]]; // lane layout is relative to the plaza centre
const clickables = [], holos = [];
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
for (const [lane, o] of Object.entries(HOLO_OBJS)) {
  const [x, z] = o.pos, obj = o.build(o.col); obj.position.set(x, 0, z); obj.rotation.y = Math.random() * 6; scene.add(obj);
  const w = o.w || 3.2, hit = new THREE.Mesh(new THREE.BoxGeometry(w, o.h, w), hitMat); // invisible but raycastable hit-box
  hit.position.set(x, o.h / 2, z); if (o.link) hit.userData.link = o.link; else hit.userData.lane = lane; hit.userData.id = lane;
  scene.add(hit); clickables.push(hit);
  const hex = '#' + o.col.toString(16).padStart(6, '0');
  const l = labelSprite(o.label || lane, hex, 1.0); l.position.set(x, o.h + 1.2, z); scene.add(l);
  const sub = labelSprite(o.sub || 'tap to play', '#8a9a94', 0.6); sub.position.set(x, o.h + 0.45, z); scene.add(sub);
  holos.push({ lane, obj, pulse: 0, near: 0, o, hit, link: o.link, hex });
}
let playingLane = null;
const hookState = () => window.JX && JX.on('state', d => { playingLane = d && d.playing && d.track ? d.track.lane : null; });
window.JX ? hookState() : addEventListener('DOMContentLoaded', hookState);
/* beat: WebAudio analyser for self-hosted audio_url tracks, else a 140bpm pulse locked to playback time */
let actx = null, analyser = null, abuf = null, aEl = null;
function audioLevel() {
  const el = window.JX && JX.audioEl; if (!el) return null;
  try {
    if (!actx) { actx = new (window.AudioContext || window.webkitAudioContext)(); analyser = actx.createAnalyser(); analyser.fftSize = 256; abuf = new Uint8Array(analyser.frequencyBinCount); analyser.connect(actx.destination); }
    if (aEl !== el) { actx.createMediaElementSource(el).connect(analyser); aEl = el; }
    if (actx.state === 'suspended') actx.resume();
    analyser.getByteFrequencyData(abuf); let s = 0; for (let i = 1; i < 12; i++) s += abuf[i]; return Math.min(1, s / (11 * 200));
  } catch (e) { return null; }
}
function beatNow() {
  if (!window.JX || !JX.playing) return 0;
  const lvl = audioLevel(); if (lvl !== null) return lvl;
  const ph = (JX.time * 140 / 60) % 1; return Math.exp(-ph * 6);
}
window.__beat = beatNow;
/* v41 global beat clock: one shared glow multiplier for every additive (neon) material. YouTube audio can't be analysed, so while a track plays the
   pulse runs at the track's `bpm` (tracks.json, optional; 120 when unset), phase-locked to the player's current time so pause / seek stay aligned.
   Gentle (about +/-12%); idle = very slow breathe; reduced motion = steady. */
const glowU = window.__glowU = { value: 1 }; let glowMats = [], glowScanT = -9;
function updateGlow(t) {
  let v = 1;
  if (!reduced) { if (window.JX && JX.playing && JX.current) { const bpm = +JX.current.bpm > 0 ? +JX.current.bpm : 120, ph = ((JX.time || 0) * bpm / 60) % 1; v = 0.9 + 0.22 * Math.exp(-ph * 5); }
    else v = 1 + 0.03 * Math.sin(t * 0.6); }
  glowU.value += (v - glowU.value) * 0.5;
  if (t - glowScanT > 3) { glowScanT = t; const L = []; scene.traverse(o => { const m = o.material; if (!m) return; for (const q of Array.isArray(m) ? m : [m]) if (q.blending === THREE.AdditiveBlending && q.color && !q.userData.noPulse) L.push(q); }); glowMats = [...new Set(L)]; }
  for (const m of glowMats) { const u = m.userData; if (!u._gb) { u._gb = m.color.clone(); u._gw = new THREE.Color(); }
    else if (!m.color.equals(u._gw)) u._gb.copy(m.color); // colour was changed elsewhere (e.g. flashing police light): take it as the new base
    m.color.copy(u._gb).multiplyScalar(glowU.value); u._gw.copy(m.color); }
}
function animateHolos(t, dt) {
  holoU.uTime.value = t;
  const beatV = beatNow();
  for (const h of holos) {
    const on = h.lane === playingLane; h.pulse += ((on ? 1 : 0) - h.pulse) * Math.min(1, dt * 3);
    const beat = h.pulse * (0.25 + 0.75 * beatV) + h.near * 0.45;
    const ud = h.obj.userData; if (ud.holo) ud.holo.uniforms.uPulse.value = beat; if (ud.wire) ud.wire.opacity = 0.45 + 0.5 * Math.min(1, beat);
    if (ud.solid) ud.solid.emissiveIntensity = 0.25 + 0.6 * beat;
    const sc = h.base || (h.base = h.obj.scale.x); h.obj.scale.setScalar(sc * (1 + (on ? 0.05 * beatV : 0)));
    h.obj.position.x = h.o.pos[0] + (on && beatV > 0.8 && !reduced ? (Math.random() - 0.5) * 0.25 : 0); // glitch jitter on the beat
    if (ud.eyes) { const f = Math.random() < 0.08 ? 0.2 : 1; ud.eyes.forEach((e, i) => { e.scale.x = f * (1 + (on ? beatV : 0)); e.position.x = (i ? 1 : -1) * 0.15 * 1 + (Math.random() < 0.05 ? (Math.random() - 0.5) * 0.15 : 0); }); ud.eyeMat.opacity = 0.6 + 0.4 * Math.max(beatV * h.pulse, Math.random() < 0.9 ? 1 : 0); }
    if (ud.amber) { const f = reduced ? 1 : (Math.random() < 0.04 ? 0.35 : 1), k = 0.75 + 0.25 * Math.min(1, beat); ud.amber.mat.opacity = f * k; ud.amber.halo.material.opacity = f * (0.45 + 0.5 * Math.min(1, beat)) * (window.__nightGlow || 1); }
    if (ud.strands && !reduced) for (const l of ud.strands) { const a = l.geometry.attributes.position, b = l.userData.base;
      for (let k = 0; k < b.length; k++) a.setXYZ(k, b[k].x + Math.sin(t * 1.6 + l.userData.ph + k * 0.6) * 0.05 * k, b[k].y, b[k].z - Math.sin(t * 1.1 + k * 0.5 + l.userData.ph) * 0.06 * k); a.needsUpdate = true; }
    if (ud.trails && !reduced) for (const l of ud.trails) { const a = l.geometry.attributes.position, n = l.userData.n, k = l.userData.k;
      const ang = t * (1.4 + k * 0.5) + k * Math.PI, y = 2 + 2.3 * (0.5 + 0.5 * Math.sin(t * 0.7 + k * 2)), p = [Math.cos(ang) * 1.6, y, Math.sin(ang) * 1.6];
      if (!l.userData.init) { for (let i = 0; i < n; i++) a.setXYZ(i, ...p); l.userData.init = true; }
      a.array.copyWithin(3, 0, (n - 1) * 3); a.setXYZ(0, ...p); a.needsUpdate = true; }
    if (ud.chart && t - ud.chart.last > 0.12) { const C2 = ud.chart, g = C2.g; C2.last = t;
      const v = C2.data[C2.data.length - 1] + (Math.random() - 0.47) * 10 + (on ? beatV * 8 : 0); C2.data.push(Math.max(20, Math.min(140, v))); C2.data.shift();
      g.clearRect(0, 0, 256, 160); g.fillStyle = 'rgba(40,28,0,.55)'; g.fillRect(0, 0, 256, 160); g.strokeStyle = 'rgba(255,201,74,.25)'; g.lineWidth = 1;
      for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(0, i * 40); g.lineTo(256, i * 40); g.stroke(); }
      g.strokeStyle = '#ffc94a'; g.lineWidth = 3; g.beginPath(); C2.data.forEach((d, i) => { const x = i / (C2.data.length - 1) * 256, y = 160 - d; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
      g.fillStyle = '#ffc94a'; g.font = '600 18px ui-monospace,monospace'; g.fillText('GBOT ' + (C2.data[47] / 10).toFixed(2) + (C2.data[47] >= C2.data[46] ? ' ▲' : ' ▼'), 8, 22); C2.tex.needsUpdate = true; }
    if (reduced) continue;
    if (ud.spin && h.lane === 'JHIOS Soundtracks') { ud.spin.rotation.y += dt * (on && JX.playing ? 7 + 4 * beatV : 0.5); h.obj.rotation.y += dt * 0.1; }
    else if (ud.spin) { ud.spin.rotation.y += dt * 0.25; ud.spin.position.y = 4.2 + Math.sin(t * 0.8) * 0.25; }
    else { h.obj.rotation.y += dt * 0.25; if (h.lane === 'Unsorted') h.obj.position.y = Math.sin(t * 1.2) * 0.4; }
  }
}

/* ---------- holographic listener globe ---------- */
const GLOBE_R = 4, globe = new THREE.Group(); globe.position.set(PZ[0], 6, PZ[1] - 2); scene.add(globe);
globe.add(new THREE.Mesh(new THREE.SphereGeometry(GLOBE_R, 32, 20), new THREE.MeshBasicMaterial({ color: 0x00ff9d, wireframe: true, transparent: true, opacity: 0.18 })));
globe.add(new THREE.Mesh(new THREE.SphereGeometry(GLOBE_R * 0.98, 32, 20), new THREE.MeshBasicMaterial({ color: 0x002a1a, transparent: true, opacity: 0.35 })));
const ring = new THREE.Mesh(new THREE.TorusGeometry(GLOBE_R * 1.25, 0.03, 8, 96), new THREE.MeshBasicMaterial({ color: 0xb48cff })); ring.rotation.x = Math.PI / 2; globe.add(ring);
const globeTitle = labelSprite('WHERE PEOPLE LISTEN FROM'); globeTitle.position.set(PZ[0], 11.2, PZ[1] - 2); scene.add(globeTitle);
const demoTag = labelSprite('DEMO DATA — NOT REAL', '#ffcc00'); demoTag.scale.set(12, 1.1, 1); demoTag.position.set(PZ[0], 10.3, PZ[1] - 2); demoTag.visible = false; scene.add(demoTag);
// Approximate country centroids [lat, lon] for plotting country-level counts.
const CENTROIDS = { GB: [54, -2], IE: [53, -8], US: [39, -98], CA: [56, -106], MX: [23, -102], BR: [-10, -55], AR: [-34, -64], CL: [-30, -71], CO: [4, -73], PE: [-10, -76],
  FR: [46, 2], DE: [51, 10], NL: [52, 5], BE: [50.5, 4.5], ES: [40, -4], PT: [39.5, -8], IT: [42.8, 12.8], CH: [47, 8], AT: [47.5, 14.5], PL: [52, 19], CZ: [49.8, 15.5],
  SE: [62, 15], NO: [62, 10], DK: [56, 10], FI: [64, 26], RU: [60, 100], UA: [49, 32], RO: [46, 25], GR: [39, 22], TR: [39, 35], IL: [31.5, 34.8], EG: [27, 30],
  NG: [10, 8], ZA: [-29, 24], KE: [1, 38], MA: [32, -5], IN: [21, 78], PK: [30, 70], CN: [35, 105], JP: [36, 138], KR: [36, 128], PH: [13, 122], ID: [-5, 120],
  TH: [15, 100], VN: [16, 106], MY: [2.5, 112.5], SG: [1.35, 103.8], AU: [-25, 135], NZ: [-41, 174], AE: [24, 54], SA: [24, 45], JM: [18.1, -77.3] };
const toVec = (lat, lon, r) => { const p = (90 - lat) * Math.PI / 180, t = (lon + 180) * Math.PI / 180; return new THREE.Vector3(-r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t)); };
const markers = new THREE.Group(); globe.add(markers); window.__globe = { globe, toVec, R: GLOBE_R };
function plotListeners(counts) {
  markers.clear(); const max = Math.max(1, ...Object.values(counts));
  for (const [cc, n] of Object.entries(counts)) {
    const c = CENTROIDS[cc.toUpperCase()]; if (!c || !(n > 0)) continue;
    const h = 0.3 + 1.6 * Math.sqrt(n / max), base = toVec(c[0], c[1], GLOBE_R);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, h, 6), new THREE.MeshBasicMaterial({ color: 0x00ff9d, transparent: true, opacity: 0.85 }));
    bar.position.copy(base.clone().setLength(GLOBE_R + h / 2)); bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), base.clone().normalize());
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); dot.position.copy(base.clone().setLength(GLOBE_R + h));
    markers.add(bar, dot);
  }
}
/* EXAMPLE PLACEHOLDER DATA — NOT REAL LISTENER NUMBERS.
   Used only when /listeners.json (Netlify Function netlify/functions/listeners.mjs) is unreachable,
   e.g. on a plain static server. Real data needs that backend deployed (country-level counts only, no IPs stored).
   Whenever this is shown the page displays a "DEMO DATA" label. */
const DEMO_LISTENERS = { GB: 50, US: 30, DE: 12, NL: 8, IE: 6, CA: 5, AU: 4, FR: 4, BR: 3, JP: 2, ZA: 2, IN: 2 };
async function loadListeners() {
  const label = document.getElementById('globe-label');
  try {
    const r = await fetch(C.LISTENERS_URL || '/listeners.json', { cache: 'no-store' });
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) throw new Error('unavailable');
    const d = await r.json(); const counts = d.countries || d;
    if (d.demo) throw new Error('demo');
    if (!counts || typeof counts !== 'object' || !Object.keys(counts).length) { label.hidden = false; label.className = ''; label.textContent = 'Listener globe: no plays counted yet'; return; }
    plotListeners(counts); label.hidden = true;
  } catch (e) {
    plotListeners(DEMO_LISTENERS); demoTag.visible = true;
    label.hidden = false; label.textContent = 'GLOBE: DEMO DATA (example only, not real listeners)';
  }
}
loadListeners();

/* ---------- input ---------- */
const keys = new Set();
const KEYMAP = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'tl', ArrowLeft: 'tl', KeyD: 'tr', ArrowRight: 'tr', KeyQ: 'sl', KeyE: 'sr' };
const typing = e => { const a = document.activeElement; return /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable) || !!(a && (/INPUT|TEXTAREA|SELECT/.test(a.tagName) || a.isContentEditable)); }; // v69: world hotkeys never fire while a text field has focus
addEventListener('keydown', e => { const k = KEYMAP[e.code]; if (!k || typing(e)) return; if (e.target === document.body || e.target === canvas) e.preventDefault(); keys.add(k); });
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys.delete(k); });
addEventListener('blur', () => keys.clear());

const LOOK_SENS = 0.005;
let drag = null;
canvas.addEventListener('pointerdown', e => {
  canvas.focus({ preventScroll: true });
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
  player.yaw -= dx * LOOK_SENS;      // drag right -> turn right
  player.pitch -= dy * LOOK_SENS;    // drag up (dy<0) -> look up
});
const endDrag = e => { if (!drag || e.pointerId !== drag.id) return; const tap = !drag.moved; drag = null; if (tap && e.type === 'pointerup') pick(e.clientX, e.clientY); };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);

function makeStick(el) {
  const knob = el.querySelector('.knob'), st = { x: 0, y: 0, id: null };
  const R = 34;
  const upd = e => { const r = el.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; st.x = dx / R; st.y = -dy / R; }; // up = +y
  el.addEventListener('pointerdown', e => { if (st.id !== null) return; st.id = e.pointerId; el.setPointerCapture(e.pointerId); upd(e); e.preventDefault(); e.stopPropagation(); });
  el.addEventListener('pointermove', e => { if (e.pointerId === st.id) upd(e); });
  const end = e => { if (e.pointerId !== st.id) return; st.id = null; st.x = st.y = 0; knob.style.transform = ''; };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
  return st;
}
const stickL = makeStick(document.getElementById('stickL')), stickR = makeStick(document.getElementById('stickR'));
const setTouch = on => document.body.classList.toggle('touch', on);
setTouch(matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window);
addEventListener('pointerdown', e => { if (e.pointerType === 'touch') setTouch(true); }, { capture: true, passive: true });

/* ---------- raycast: tap a hologram to play its lane (GoldBot opens its link) ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function hitAt(x, y) { // v59: one raycast shared by tap / click, the centre pointer's highlight and its 'do it' action
  const r = canvas.getBoundingClientRect(); ndc.set((x - r.left) / r.width * 2 - 1, -(y - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(clickables, false).filter(h => h.object.visible !== false && (!h.object.parent || h.object.parent.visible !== false));
  return hits.find(h => h.object.userData.feature) || hits.find(h => h.object.userData.track) || hits[0] || null; // the giant featured skyline screen wins, then album-art screens, then hit-boxes
}
function pick(x, y, hit0) {
  if (window.__mapOpen) return;
  const hit = hit0 || hitAt(x, y);
  if (!hit) return false; const u = hit.object.userData;
  if (u.track) { if (window.JX) JX.load().then(() => { const t = JX.tracks.find(x => x.id === u.track); if (t) { JX.play(t, JX.byLane(t.lane)); selectLane(t.lane); openPanel(true); } }); return true; }
  if (u.popup) { window.__lastOpen = 'popup:' + (u.id || ''); u.popup(); return true; }
  if (u.link) { window.__lastOpen = u.link; window.open(u.link, '_blank', 'noopener'); } else playLane(u.lane); return true;
}
function playLane(lane) { if (!window.JX) return; JX.load().then(() => { JX.playLane(lane); selectLane(lane); openPanel(true); }); }

/* ---------- playlist panel (shared engine: window.JX from player.js) ---------- */
const ptoggle = document.getElementById('ptoggle'), pbody = document.getElementById('pbody'), tabs = document.getElementById('planess'), plist = document.getElementById('ptracks');
let curLane = 'SCR3WFAC3';
let panelOpenedAt = 0;
let ppinned = (() => { try { return localStorage.getItem('jx-ppin') === '1'; } catch (_) { return false; } })(); // v62: playlist auto-collapses after you pick a track unless pinned open
function openPanel(force) { const open = force ?? pbody.hidden; if (open && pbody.hidden) panelOpenedAt = performance.now(); pbody.hidden = !open; ptoggle.setAttribute('aria-expanded', String(open)); }
ptoggle.addEventListener('click', () => openPanel());
{ const pin = document.createElement('button'); pin.type = 'button'; pin.id = 'ppin'; pin.className = 'ppin';
  const sync = () => { pin.textContent = ppinned ? '📌 PINNED OPEN' : '📌 PIN OPEN'; pin.setAttribute('aria-pressed', String(ppinned)); }; sync();
  pin.style.cssText = 'align-self:flex-end;margin:.3rem .4rem 0;min-height:32px;padding:0 .6rem;border-radius:8px;border:1px solid var(--line,#2a3);background:transparent;color:inherit;font:inherit;font-size:.7rem;letter-spacing:.06em;cursor:pointer';
  pin.addEventListener('click', e => { e.stopPropagation(); ppinned = !ppinned; try { localStorage.setItem('jx-ppin', ppinned ? '1' : '0'); } catch (_) {} sync(); }); pbody.prepend(pin); }
function selectLane(l) { curLane = l; renderPanel(); }
function renderPanel() {
  if (!window.JX || !JX.tracks.length) return;
  tabs.innerHTML = C.LANES.map(l => `<button type="button" role="tab" aria-selected="${l === curLane}" data-lane="${JX.esc(l)}">${JX.esc(l)}</button>`).join('');
  plist.innerHTML = JX.byLane(curLane).map(t => `<li><button type="button" data-id="${JX.esc(t.id)}" class="${JX.current === t ? 'cur' : ''}" ${JX.playable(t) ? '' : 'disabled'}>${JX.current === t && JX.playing ? '⏸ ' : '▶ '}${JX.esc(t.title)}</button></li>`).join('') || '<li class="meta">No tracks in this lane yet.</li>';
}
tabs.addEventListener('click', e => { const b = e.target.closest('[data-lane]'); if (b) selectLane(b.dataset.lane); });
plist.addEventListener('click', e => { if (performance.now() - panelOpenedAt < 500) return; /* ignore the ghost click from the scene tap that just opened the panel (mobile) */ const b = e.target.closest('[data-id]'); if (!b || b.disabled) return; const t = JX.tracks.find(x => x.id === b.dataset.id); JX.current === t ? JX.toggle() : JX.play(t, JX.byLane(curLane)); if (!ppinned) setTimeout(() => openPanel(false), 650); });
const bootPanel = () => JX.load().then(() => { renderPanel(); JX.on('state', renderPanel); }).catch(e => { plist.innerHTML = '<li class="meta">Could not load tracks.</li>'; console.warn(e); });
window.JX ? bootPanel() : addEventListener('DOMContentLoaded', bootPanel);

/* ---------- loop ---------- */
function resize() { const w = innerWidth, h = innerHeight; renderer.setPixelRatio(capDPR()); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
// rotation: Android reports the new size late, so re-layout now and again after the viewport settles
const relayout = () => { resize(); setTimeout(resize, 150); setTimeout(resize, 600); };
addEventListener('orientationchange', relayout); if (window.visualViewport) visualViewport.addEventListener('resize', resize); if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', relayout);
/* environment module is loaded dynamically: if it (or its data) fails, the lanes, plaza and controls keep running */
let updateWorldFX = () => {};
import('./world-fx.js?v=72').then(m => { try { m.buildEnvironment({ THREE, scene, camera, player, holos, clickables, labelSprite, canvas, LOW, LITE, reduced, HOLO_OBJS, getPlaying: () => playingLane });
    updateWorldFX = (t, dt) => { try { m.updateWorldFX(t, dt); } catch (e) { updateWorldFX = () => {}; werr('world fx stopped: ' + (e && e.message)); } };
    Object.defineProperties(window.__world, Object.getOwnPropertyDescriptors(m.worldDebug)); } catch (e) { werr('environment: ' + (e && e.message || e)); } })
  .catch(e => werr('could not load world-fx.js: ' + (e && e.message || e)));
/* v58: gamepad (world-gamepad.js) drives the same actions: centre tap = pick(), the same panel / map functions, and the same move/look sums as the touch sticks */
let pad = { mx: 0, my: 0, lx: 0, ly: 0, sprint: false, poll() { return this; } };
const nearScreens = () => { const v = new THREE.Vector3(), out = []; for (const o of clickables) { if (o.visible === false || (o.parent && o.parent.visible === false)) continue; o.getWorldPosition(v); const d = Math.hypot(v.x - player.pos.x, v.z - player.pos.z); if (d < 40 && d > 1) out.push({ o, x: v.x, y: v.y, z: v.z, a: Math.atan2(-(v.x - player.pos.x), -(v.z - player.pos.z)) }); } return out.sort((p, q) => p.a - q.a); };
Promise.all([import('./world-gamepad.js?v=72'), import('./world-ui.js?v=72')]).then(([m, U]) => { const ui = U.initUI({ openPanel }); window.__ui = ui; const ctr = () => { const r = canvas.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  pad = m.initGamepad({ ui, pickCentre: h => !!pick(...ctr(), h), peekCentre: () => { if (window.__mapOpen) return null; const h = hitAt(...ctr()); if (!h) return null; const u = h.object.userData, t = u.track && window.JX && JX.tracks.find(x => x.id === u.track);
      return { hit: h, label: u.track ? 'PLAY TRACK' + (t || u.title ? ' · ' + (t ? t.title : u.title) : '') : u.popup ? 'OPEN · ' + (u.title || 'panel') : u.link ? 'OPEN LINK · ' + (u.title || u.label || 'link') : u.lane ? 'PLAY LANE · ' + u.lane : 'USE' }; }, openPanel,
  openMap: () => window.__world.openMap && window.__world.openMap(), closeMap: () => window.__world.closeMap && window.__world.closeMap(), nearScreens,
  faceAt: t => { player.yaw = t.a; player.pitch = Math.max(-1.2, Math.min(1.2, Math.atan2(t.y - player.pos.y, Math.hypot(t.x - player.pos.x, t.z - player.pos.z)))); } }); window.__pad = pad; }).catch(e => console.warn('gamepad', e));
const clock = new THREE.Clock(), fwd = new THREE.Vector3(), right = new THREE.Vector3();
const MOVE = 7, TURN = 1.8;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const gp = pad.poll();
  let mv = (keys.has('f') ? 1 : 0) - (keys.has('b') ? 1 : 0) + stickL.y + gp.my;
  let st = (keys.has('sr') ? 1 : 0) - (keys.has('sl') ? 1 : 0) + stickL.x + gp.mx;
  const turn = window.__mapOpen ? 0 : ((keys.has('tr') ? 1 : 0) - (keys.has('tl') ? 1 : 0) + stickR.x + gp.lx);
  player.yaw -= turn * TURN * dt;              // positive turn = turn right
  if (!window.__mapOpen) player.pitch += (stickR.y + gp.ly) * TURN * 0.7 * dt;  // stick up = look up
  player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch));
  fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)); right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const SPD = (gp.sprint ? 2 : 1) * MOVE * (1 + Math.min(5, Math.max(0, (Math.hypot(player.pos.x - PZ[0], player.pos.z - PZ[1]) - 60) / 40))); // stroll in the lane plaza, cruise speed out in the real-scale town
  if (window.__mapOpen) { mv = 0; st = 0; } // jump map overlay is up: no walking under it
  window.__footY = player.pos.y - 1.7; // v63: collide() uses it for height-banded solids (bridge decks / embankments)
  { const dx = (fwd.x * mv + right.x * st) * SPD * dt, dz = (fwd.z * mv + right.z * st) * SPD * dt, C = window.__collide, px = player.pos.x, pz = player.pos.z;
    if (C && (dx || dz) && !C(px, pz)) { if (!C(px + dx, pz + dz)) player.pos.x += dx, player.pos.z += dz; else if (!C(px + dx, pz)) player.pos.x += dx; else if (!C(px, pz + dz)) player.pos.z += dz; } // slide along walls; already inside (after a jump) = free to walk out
    else { player.pos.x += dx; player.pos.z += dz; } }
  /* v62: walkable levels: bridge decks / ramps and the sunken Newtown path (modules push height functions into window.__groundParts) */
  if (!window.__trainRiding) { let g = 0; for (const f of window.__groundParts || []) { const v = f(player.pos.x, player.pos.z, player.pos.y); if (v != null) { g = v; break; } } window.__groundNow = g; const want = 1.7 + g; player.pos.y += (want - player.pos.y) * Math.min(1, dt * 12); if (Math.abs(want - player.pos.y) > 6) player.pos.y = want; }
  player.pos.x = Math.max(-1600, Math.min(700, player.pos.x)); player.pos.z = Math.max(-4700, Math.min(3600, player.pos.z)); // real-scale Great Yarmouth: Breydon side to the piers, Caister road to Gorleston
  camera.position.copy(player.pos); camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  if (!reduced) { globe.rotation.y += dt * 0.12; ring.rotation.z += dt * 0.3; }
  animateHolos(clock.elapsedTime, dt);
  updateWorldFX(clock.elapsedTime, dt);
  updateGlow(clock.elapsedTime);
  renderer.render(scene, camera);
  if (!window.__worldReady) { window.__worldReady = true; document.documentElement.dataset.world = 'ok'; }
}
renderer.setAnimationLoop(tick);
document.addEventListener('visibilitychange', () => renderer.setAnimationLoop(document.hidden ? null : tick));
/* test/debug hook (read-only snapshot) */
window.__world = { get player() { return player; }, face(lane) { const m = clickables.find(o => o.userData.id === lane); player.pos.set(m.position.x, 1.7, m.position.z + 14); player.yaw = 0; player.pitch = 0.15; }, project(lane) { const m = clickables.find(o => o.userData.id === lane); const v = m.position.clone().project(camera); const r = canvas.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, visible: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 }; }, goto(x, z, yaw = 0, pitch = 0) { player.pos.set(x, 1.7, z); player.yaw = yaw; player.pitch = pitch; }, get low() { return LOW; }, get lite() { return LITE; }, get state() { return { x: player.pos.x, z: player.pos.z, yaw: player.yaw, pitch: player.pitch }; } };

