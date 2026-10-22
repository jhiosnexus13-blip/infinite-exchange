/* JHIOS world v38 — live Great Yarmouth weather (Open-Meteo), fast day/night cycle, street lamps,
   Marine Parade lights and beach waves. Loaded lazily by world-fx.js; every part fails soft. */
let T, S, CAM, P, fx, LITE, RED, warp, G;
const E = { wx: null, wxErr: null, phase: 0.3, day: 1, rain: 0, drizzle: 0, storm: 0, fogK: 1, cloud: 0, wind: 0, dir: 0, flash: 0, nextFlash: 5 };
const err = (w, e) => { console.error('[env]', w, e); window.__werr && window.__werr(`${w}: ${(e && e.message) || e}`); };
const safe = (w, f) => { try { return f(); } catch (e) { err(w, e); } };
const URL_WX = 'https://api.open-meteo.com/v1/forecast?latitude=52.6078&longitude=1.7302&current=weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,precipitation,rain,visibility,is_day,temperature_2m';
const CYCLE = 300; // seconds per full day
const lerp = (a, b, k) => a + (b - a) * k;

export function initEnv(o) {
  ({ T, S, CAM, P, fx, LITE, RED, warp, G } = o);
  safe('hud', hud); safe('rain', rainInit); safe('lamps', lamps); safe('waves', waves);
  E.amb = []; S.traverse(c => { if (c.isAmbientLight) E.amb.push(c); });
  E.bg0 = S.background ? S.background.clone() : null; E.fogC0 = S.fog ? S.fog.color.clone() : null; E.fogD0 = S.fog ? S.fog.density : 0;
  weather(); setInterval(weather, 10 * 60 * 1000);
  return { update, state: E };
}

/* ---------- weather ---------- */
function weather() {
  const force = (location.search.match(/[?&]wx=(\d+)/) || [])[1];
  if (force) { apply({ weather_code: +force, cloud_cover: 90, wind_speed_10m: 30, wind_direction_10m: 240, precipitation: 2, rain: 2, visibility: 4000, is_day: 1, temperature_2m: 11 }, true); return; }
  const ac = 'AbortController' in window ? new AbortController() : null; const to = setTimeout(() => ac && ac.abort(), 8000);
  fetch(URL_WX, ac ? { signal: ac.signal } : {}).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(j => { clearTimeout(to); apply(j.current || {}); })
    .catch(e => { clearTimeout(to); E.wxErr = String(e && e.message || e); console.warn('[env] weather', e); chip(); });
}
const DESC = c => c === 0 ? ['Clear', '☀'] : c <= 2 ? ['Partly cloudy', '⛅'] : c === 3 ? ['Overcast', '☁'] : c <= 48 ? ['Fog', '🌫'] : c <= 57 ? ['Drizzle', '🌦'] : c <= 67 ? ['Rain', '🌧'] : c <= 77 ? ['Snow', '🌨'] : c <= 82 ? ['Showers', '🌧'] : c <= 86 ? ['Snow showers', '🌨'] : ['Thunderstorm', '⛈'];
function apply(c, forced) {
  const code = c.weather_code | 0, first = !E.wx; E.wx = c; E.wxErr = null; E.forced = !!forced;
  E.cloud = (c.cloud_cover ?? 0) / 100; E.wind = c.wind_speed_10m ?? 0; E.dir = (c.wind_direction_10m ?? 0) * Math.PI / 180;
  const pr = Math.max(c.rain ?? 0, c.precipitation ?? 0);
  E.drizzle = (code >= 51 && code <= 57) ? 1 : 0;
  E.rain = (code >= 61 && code <= 67) || (code >= 80 && code <= 82) || code >= 95 ? Math.min(1, 0.35 + pr / 4) : E.drizzle ? 0.25 : pr > 0 ? Math.min(0.5, pr / 3) : 0;
  E.storm = code >= 95 ? 1 : 0;
  const vis = c.visibility ?? 20000; E.fogK = (code === 45 || code === 48) ? 3.2 : 1 + Math.max(0, (10000 - vis) / 10000) * 1.8 + E.rain * 0.6;
  if (first) E.phase = c.is_day ? 0.3 : 0.8; // start the fast cycle at GY's real day/night
  chip();
}
function hud() {
  const box = document.createElement('div'); box.id = 'wxhud';
  box.style.cssText = 'position:fixed;right:8px;top:calc(env(safe-area-inset-top) + 46px);z-index:30;display:flex;gap:6px;align-items:center;font:12px/1.2 ui-monospace,Menlo,Consolas,monospace;pointer-events:none';
  const c = document.createElement('div'); c.id = 'wxchip'; c.style.cssText = 'background:rgba(0,20,14,.72);color:#9dffd2;border:1px solid #00ff9d66;border-radius:14px;padding:6px 10px;white-space:nowrap;max-width:62vw;overflow:hidden;text-overflow:ellipsis';
  c.textContent = 'GY weather…';
  const b = document.createElement('button'); b.type = 'button'; b.id = 'daynight'; b.setAttribute('aria-label', 'Toggle day / night');
  b.style.cssText = 'pointer-events:auto;min-width:44px;min-height:44px;border-radius:22px;border:1px solid #00ff9d88;background:rgba(0,20,14,.8);color:#ffe27a;font-size:20px;cursor:pointer;touch-action:manipulation';
  for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown']) b.addEventListener(ev, e => e.stopPropagation());
  b.addEventListener('click', e => { e.stopPropagation(); E.phase = E.day > 0.5 ? 0.75 : 0.25; });
  box.append(c, b); document.body.appendChild(box); E.chip = c; E.btn = b;
  const f = document.createElement('div'); f.style.cssText = 'position:fixed;inset:0;background:#dfe8ff;opacity:0;pointer-events:none;z-index:5;mix-blend-mode:screen'; document.body.appendChild(f); E.flashEl = f;
}
function chip() {
  if (!E.chip) return; const c = E.wx;
  if (!c) { E.chip.textContent = 'GY weather unavailable'; E.chip.title = E.wxErr || ''; return; }
  const [d, i] = DESC(c.weather_code | 0), t = c.temperature_2m != null ? Math.round(c.temperature_2m) + '°C' : '';
  E.chip.textContent = `${i} GY ${t} · ${d} · ${Math.round(E.wind)} km/h${E.forced ? ' (test)' : ''}`;
  E.chip.title = `Live Great Yarmouth weather (Open-Meteo), refreshed every 10 min. Cloud ${Math.round(E.cloud * 100)}%, visibility ${c.visibility ?? '?'} m`;
}

/* ---------- rain streaks (slanted by wind) ---------- */
function rainInit() {
  const N = LITE ? 450 : 1800, pos = new Float32Array(N * 6), g = new T.BufferGeometry();
  for (let i = 0; i < N; i++) { pos[i * 6] = (Math.random() - 0.5) * 70; pos[i * 6 + 1] = Math.random() * 30; pos[i * 6 + 2] = (Math.random() - 0.5) * 70; }
  g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setDrawRange(0, 0);
  const m = new T.LineBasicMaterial({ color: 0xa8d8ff, transparent: true, opacity: 0.45, depthWrite: false, fog: false });
  const l = new T.LineSegments(g, m); l.frustumCulled = false; S.add(l); E.rl = { l, pos, N, g, m };
}
function rainUpdate(dt) {
  const R = E.rl; if (!R) return; const n = Math.floor(R.N * E.rain); R.g.setDrawRange(0, n * 2); if (!n) return;
  const w = Math.min(1.2, E.wind / 40), wx = -Math.sin(E.dir) * w, wz = Math.cos(E.dir) * w; // wind FROM dir: blows toward opposite (world z = -north)
  const vy = E.drizzle ? 7 : 18, len = E.drizzle ? 0.35 : 1.1, p = R.pos;
  for (let i = 0; i < n; i++) { const k = i * 6; let y = p[k + 1] - vy * dt;
    let x = p[k] + wx * vy * dt, z = p[k + 2] + wz * vy * dt;
    if (y < 0 || Math.abs(x - P.pos.x) > 40 || Math.abs(z - P.pos.z) > 40) { y = 20 + Math.random() * 12; x = P.pos.x + (Math.random() - 0.5) * 70; z = P.pos.z + (Math.random() - 0.5) * 70; }
    p[k] = x; p[k + 1] = y; p[k + 2] = z; p[k + 3] = x - wx * len; p[k + 4] = y + len; p[k + 5] = z - wz * len; }
  R.g.attributes.position.needsUpdate = true; R.m.opacity = E.drizzle ? 0.3 : 0.5;
}

/* ---------- lamps + Marine Parade lights along the Golden Mile ---------- */
function spriteTex(rgb) { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'), gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, `rgba(${rgb},.85)`); gr.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return new T.CanvasTexture(c); }
function lamps() {
  const R = fx.route; if (!R || R.length < 2) return;
  const STEP = LITE ? 60 : 32, heads = [], poles = [], string = [], strCol = [];
  let acc = 0, side = 1, sacc = 0, total = 0;
  for (let i = 1; i < R.length; i++) { const [ax, az] = R[i - 1], [bx, bz] = R[i], L = Math.hypot(bx - ax, bz - az); if (!L) continue; const nx = -(bz - az) / L, nz = (bx - ax) / L;
    for (let s = (STEP - acc); s < L; s += STEP) { const k = s / L, x = ax + (bx - ax) * k + nx * 6 * side, z = az + (bz - az) * k + nz * 6 * side; poles.push([x, z]); heads.push(x, 6.2, z); side = -side; }
    acc = (acc + L) % STEP;
    if (total < 1700) for (let s = (4 - sacc); s < L; s += 4) { const k = s / L; string.push(ax + (bx - ax) * k - nx * 6, 4.6 + Math.sin(s * 0.8) * 0.3, az + (bz - az) * k - nz * 6); strCol.push(1, 1, 1); }
    sacc = (sacc + L) % 4; total += L; }
  const pg = new T.CylinderGeometry(0.09, 0.12, 6.2, 5); pg.translate(0, 3.1, 0);
  const pm = new T.MeshBasicMaterial({ color: 0x1c4a3c }), im = new T.InstancedMesh(pg, pm, poles.length), M = new T.Matrix4();
  poles.forEach(([x, z], i) => im.setMatrixAt(i, M.makeTranslation(x, 0, z))); im.frustumCulled = false; S.add(im);
  const hg = new T.BufferGeometry(); hg.setAttribute('position', new T.Float32BufferAttribute(heads, 3));
  E.lampMat = new T.PointsMaterial({ size: 2.6, map: spriteTex('255,200,110'), color: 0xffd28a, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.1, fog: false });
  S.add(Object.assign(new T.Points(hg, E.lampMat), { frustumCulled: false }));
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(string, 3)); sg.setAttribute('color', new T.Float32BufferAttribute(strCol, 3));
  E.strMat = new T.PointsMaterial({ size: 0.9, map: spriteTex('255,255,255'), vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.2, fog: false });
  S.add(Object.assign(new T.Points(sg, E.strMat), { frustumCulled: false })); E.str = sg;
  E.lampInfo = { lamps: poles.length, parade_bulbs: string.length / 3 };
}
const PAL = [[1, 0.2, 0.6], [0.2, 1, 0.6], [1, 0.8, 0.2], [0.3, 0.6, 1]];
function strUpdate(t) { if (!E.str || t - (E.strT || 0) < 0.3) return; E.strT = t; const c = E.str.attributes.color, o = Math.floor(t * 3.3);
  for (let i = 0; i < c.count; i++) { const p = PAL[(i + o) % 4]; c.setXYZ(i, p[0], p[1], p[2]); } c.needsUpdate = true; }

/* ---------- beach waves: animated foam lines just seaward of the OSM coastline ---------- */
function waves() {
  if (!G || !G.coast) return; const s = [];
  for (const c of G.coast) { const W3 = []; for (let i = 0; i < c.length; i += 2) W3.push(warp(c[i], c[i + 1]));
    for (let k = 1; k <= (LITE ? 2 : 3); k++) for (let i = 0; i < W3.length - 1; i++) s.push(W3[i].x + k * 5, 0.12, W3[i].z, W3[i + 1].x + k * 5, 0.12, W3[i + 1].z); }
  if (!s.length) return; const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(s, 3));
  E.foamMat = new T.LineBasicMaterial({ color: 0xd8fff4, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false, fog: false });
  E.foam = new T.LineSegments(g, E.foamMat); E.foam.frustumCulled = false; S.add(E.foam);
}

/* ---------- per frame ---------- */
const C = {}; const col = (k, h) => C[k] || (C[k] = new T.Color(h));
function update(t, dt) {
  E.phase = (E.phase + dt / CYCLE) % 1;
  const sun = Math.sin((E.phase - 0.05) * Math.PI * 2); // >0 day; noon at phase .30, midnight .80
  E.day = Math.min(1, Math.max(0, sun * 2.2 + 0.5)); const night = 1 - E.day, gloom = Math.min(1, E.cloud * 0.6 + E.rain * 0.4);
  if (E.btn) { const s = E.day > 0.5 ? '☀' : '☾'; if (E.btn.textContent !== s) E.btn.textContent = s; }
  const dk = E.day * (1 - gloom * 0.55);
  if (S.background && E.bg0) S.background.copy(E.bg0).lerp(col('dayBg', gloom > 0.5 ? 0x45525a : 0x3a6a8a), dk * 0.85);
  if (fx.sky && fx.sky.uniforms.uDay) { fx.sky.uniforms.uDay.value = dk; fx.sky.uniforms.uGloom.value = gloom; }
  if (S.fog && E.fogC0) { S.fog.color.copy(E.fogC0).lerp(col('dayFog', 0x5d7a80), dk * 0.7); S.fog.density = E.fogD0 * E.fogK * (LITE ? 0.8 : 1); }
  for (const a of E.amb) a.intensity = 1.2 + dk * 1.6;
  if (fx.goldMat && fx.goldMat.uniforms.uGlow) fx.goldMat.uniforms.uGlow.value = 0.8 + night * 1.0;
  if (fx.lmMat) fx.lmMat.opacity = 0.6 + night * 0.4;
  if (fx.wheel) fx.wheel.traverse(o => { if (o.isLineSegments || o.isLineLoop) { o.material.color.setHex(night > 0.5 ? 0xff7ad9 : 0x00ff9d); } });
  if (E.lampMat) E.lampMat.opacity = Math.max(0.06, night); if (E.strMat) E.strMat.opacity = 0.15 + night * 0.85;
  strUpdate(t);
  const w = Math.min(1, E.wind / 50); if (fx.sea && fx.sea.uniforms.uAmp) fx.sea.uniforms.uAmp.value = 0.6 + w * 1.8 + E.storm * 0.6;
  if (E.foam && !RED) { const sp = 0.25 + w * 0.6, ph = (t * sp) % 1; E.foam.position.x = -ph * 5; E.foamMat.opacity = 0.15 + 0.45 * Math.sin(ph * Math.PI); }
  if (!RED) rainUpdate(dt);
  if (E.storm && !RED) { E.nextFlash -= dt; if (E.nextFlash <= 0) { E.flash = 1; E.nextFlash = 4 + Math.random() * 12; } }
  if (E.flash > 0) { E.flash = Math.max(0, E.flash - dt * 3.5); const f = E.flash > 0.6 || (E.flash > 0.2 && E.flash < 0.35) ? E.flash : 0; E.flashEl.style.opacity = (f * 0.55).toFixed(2); if (S.background) S.background.lerp(col('fl', 0xc8d4ff), f * 0.7); }
}
