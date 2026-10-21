/* JHIOS 3D TERMINAL WORLD — three.js (ES module, r169).
   Controls (no inversion anywhere):
     keyboard: W/↑ forward, S/↓ back, A/← turn left, D/→ turn right, Q/E strafe
     mouse/touch drag on the scene: look (drag right = turn right, drag up = look up)
     touch joysticks: left = move (up = forward), right = look (up = look up, right = turn right)
   Joysticks only capture pointers that START on them; panels sit above the canvas. */
import * as THREE from 'three';

const C = window.JHIOS_CONFIG || {};
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const capDPR = () => Math.min(window.devicePixelRatio || 1, matchMedia('(pointer:coarse)').matches ? 1.5 : 2);
renderer.setPixelRatio(capDPR());
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050607);
scene.fog = new THREE.FogExp2(0x050607, 0.022);
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 400);
const player = { pos: new THREE.Vector3(0, 1.7, 22), yaw: 0, pitch: 0 };

/* ---------- world ---------- */
const grid = new THREE.GridHelper(400, 200, 0x00ff9d, 0x0d3326); grid.material.transparent = true; grid.material.opacity = 0.35; scene.add(grid);
scene.add(new THREE.AmbientLight(0x406060, 1.2));
const sun = new THREE.PointLight(0x00ff9d, 40, 60); sun.position.set(0, 12, 0); scene.add(sun);

function labelSprite(text, color = '#00ff9d') {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 96; const g = c.getContext('2d');
  g.font = '600 40px ui-monospace,Menlo,Consolas,monospace'; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 512, 48);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  s.scale.set(16, 1.5, 1); return s;
}
const LANE_POS = { 'SCR3WFAC3': [-16, -6, 0xff2e4d], 'Luce Aether': [16, -6, 0xb48cff], 'JHIOS Soundtracks': [-16, 12, 0xffcc00], 'Sanctum': [16, 12, 0x00e5ff] };
const clickables = [];
for (const [lane, [x, z, col]] of Object.entries(LANE_POS)) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 7, 2.4), new THREE.MeshStandardMaterial({ color: 0x0a0e0d, emissive: col, emissiveIntensity: 0.35, roughness: 0.4 }));
  m.position.set(x, 3.5, z); m.userData.lane = lane; scene.add(m); clickables.push(m);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: col })); m.add(edges);
  const l = labelSprite(lane, '#' + col.toString(16).padStart(6, '0')); l.position.set(x, 8.2, z); scene.add(l);
  const sub = labelSprite('tap to play', '#8a9a94'); sub.scale.set(10, 0.9, 1); sub.position.set(x, 7.3, z); scene.add(sub);
}

/* ---------- holographic listener globe ---------- */
const GLOBE_R = 4, globe = new THREE.Group(); globe.position.set(0, 6, -2); scene.add(globe);
globe.add(new THREE.Mesh(new THREE.SphereGeometry(GLOBE_R, 32, 20), new THREE.MeshBasicMaterial({ color: 0x00ff9d, wireframe: true, transparent: true, opacity: 0.18 })));
globe.add(new THREE.Mesh(new THREE.SphereGeometry(GLOBE_R * 0.98, 32, 20), new THREE.MeshBasicMaterial({ color: 0x002a1a, transparent: true, opacity: 0.35 })));
const ring = new THREE.Mesh(new THREE.TorusGeometry(GLOBE_R * 1.25, 0.03, 8, 96), new THREE.MeshBasicMaterial({ color: 0xb48cff })); ring.rotation.x = Math.PI / 2; globe.add(ring);
const globeTitle = labelSprite('WHERE PEOPLE LISTEN FROM'); globeTitle.position.set(0, 11.2, -2); scene.add(globeTitle);
const demoTag = labelSprite('DEMO DATA — NOT REAL', '#ffcc00'); demoTag.scale.set(12, 1.1, 1); demoTag.position.set(0, 10.3, -2); demoTag.visible = false; scene.add(demoTag);
// Approximate country centroids [lat, lon] for plotting country-level counts.
const CENTROIDS = { GB: [54, -2], IE: [53, -8], US: [39, -98], CA: [56, -106], MX: [23, -102], BR: [-10, -55], AR: [-34, -64], CL: [-30, -71], CO: [4, -73], PE: [-10, -76],
  FR: [46, 2], DE: [51, 10], NL: [52, 5], BE: [50.5, 4.5], ES: [40, -4], PT: [39.5, -8], IT: [42.8, 12.8], CH: [47, 8], AT: [47.5, 14.5], PL: [52, 19], CZ: [49.8, 15.5],
  SE: [62, 15], NO: [62, 10], DK: [56, 10], FI: [64, 26], RU: [60, 100], UA: [49, 32], RO: [46, 25], GR: [39, 22], TR: [39, 35], IL: [31.5, 34.8], EG: [27, 30],
  NG: [10, 8], ZA: [-29, 24], KE: [1, 38], MA: [32, -5], IN: [21, 78], PK: [30, 70], CN: [35, 105], JP: [36, 138], KR: [36, 128], PH: [13, 122], ID: [-5, 120],
  TH: [15, 100], VN: [16, 106], MY: [2.5, 112.5], SG: [1.35, 103.8], AU: [-25, 135], NZ: [-41, 174], AE: [24, 54], SA: [24, 45], JM: [18.1, -77.3] };
const toVec = (lat, lon, r) => { const p = (90 - lat) * Math.PI / 180, t = (lon + 180) * Math.PI / 180; return new THREE.Vector3(-r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t)); };
const markers = new THREE.Group(); globe.add(markers);
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
const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
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

/* ---------- raycast: tap a monolith to play its lane ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(x, y) {
  const r = canvas.getBoundingClientRect(); ndc.set((x - r.left) / r.width * 2 - 1, -(y - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects(clickables, false)[0];
  if (hit) playLane(hit.object.userData.lane);
}
function playLane(lane) { if (!window.JX) return; JX.load().then(() => { JX.playLane(lane); selectLane(lane); openPanel(true); }); }

/* ---------- playlist panel (shared engine: window.JX from player.js) ---------- */
const ptoggle = document.getElementById('ptoggle'), pbody = document.getElementById('pbody'), tabs = document.getElementById('planess'), plist = document.getElementById('ptracks');
let curLane = 'SCR3WFAC3';
function openPanel(force) { const open = force ?? pbody.hidden; pbody.hidden = !open; ptoggle.setAttribute('aria-expanded', String(open)); }
ptoggle.addEventListener('click', () => openPanel());
function selectLane(l) { curLane = l; renderPanel(); }
function renderPanel() {
  if (!window.JX || !JX.tracks.length) return;
  tabs.innerHTML = C.LANES.map(l => `<button type="button" role="tab" aria-selected="${l === curLane}" data-lane="${JX.esc(l)}">${JX.esc(l)}</button>`).join('');
  plist.innerHTML = JX.byLane(curLane).map(t => `<li><button type="button" data-id="${JX.esc(t.id)}" class="${JX.current === t ? 'cur' : ''}" ${JX.playable(t) ? '' : 'disabled'}>${JX.current === t && JX.playing ? '⏸ ' : '▶ '}${JX.esc(t.title)}</button></li>`).join('') || '<li class="meta">No tracks in this lane yet.</li>';
}
tabs.addEventListener('click', e => { const b = e.target.closest('[data-lane]'); if (b) selectLane(b.dataset.lane); });
plist.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (!b || b.disabled) return; const t = JX.tracks.find(x => x.id === b.dataset.id); JX.current === t ? JX.toggle() : JX.play(t, JX.byLane(curLane)); });
const bootPanel = () => JX.load().then(() => { renderPanel(); JX.on('state', renderPanel); }).catch(e => { plist.innerHTML = '<li class="meta">Could not load tracks.</li>'; console.warn(e); });
window.JX ? bootPanel() : addEventListener('DOMContentLoaded', bootPanel);

/* ---------- loop ---------- */
function resize() { const w = innerWidth, h = innerHeight; renderer.setPixelRatio(capDPR()); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const clock = new THREE.Clock(), fwd = new THREE.Vector3(), right = new THREE.Vector3();
const MOVE = 7, TURN = 1.8;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  let mv = (keys.has('f') ? 1 : 0) - (keys.has('b') ? 1 : 0) + stickL.y;
  let st = (keys.has('sr') ? 1 : 0) - (keys.has('sl') ? 1 : 0) + stickL.x;
  const turn = (keys.has('tr') ? 1 : 0) - (keys.has('tl') ? 1 : 0) + stickR.x;
  player.yaw -= turn * TURN * dt;              // positive turn = turn right
  player.pitch += stickR.y * TURN * 0.7 * dt;  // stick up = look up
  player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch));
  fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)); right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  player.pos.addScaledVector(fwd, mv * MOVE * dt).addScaledVector(right, st * MOVE * dt);
  player.pos.x = Math.max(-150, Math.min(150, player.pos.x)); player.pos.z = Math.max(-150, Math.min(150, player.pos.z));
  camera.position.copy(player.pos); camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  if (!reduced) { globe.rotation.y += dt * 0.12; ring.rotation.z += dt * 0.3; }
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(tick);
document.addEventListener('visibilitychange', () => renderer.setAnimationLoop(document.hidden ? null : tick));
/* test/debug hook (read-only snapshot) */
window.__world = { face(lane) { const m = clickables.find(o => o.userData.lane === lane); player.pos.set(m.position.x, 1.7, m.position.z + 14); player.yaw = 0; player.pitch = 0.15; }, project(lane) { const m = clickables.find(o => o.userData.lane === lane); const v = m.position.clone().project(camera); const r = canvas.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, visible: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 }; }, get state() { return { x: player.pos.x, z: player.pos.z, yaw: player.yaw, pitch: player.pitch }; } };
