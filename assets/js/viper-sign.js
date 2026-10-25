/* Viper Room GY logo panel — elevated above street level outside Arena/Empire entrance, matching DAM After Dark height style.
   Tap opens toon.fm events page. Placed under the existing Don't This Remind Ya feature screen.
   Call initViper() from buildEnvironment after damSign. */
export function initViper(o) {
  const { T, S, CL, LBL, W, roofAt, fx } = o;
  const VIPER = { lat: 52.604471, lon: 1.736196, url: 'https://toon.fm/viper-room-gy', label: 'VIPER ROOM GY · EVENTS' };
  const c = W(VIPER.lat, VIPER.lon, 8, -6), g = new T.Group(); g.position.copy(c); S.add(g);
  const mat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false,
    uniforms: { map: { value: null }, uG: window.__glowU || { value: 1 }, uOn: { value: 0 } },
    vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D map; uniform float uG; uniform float uOn; varying vec2 vU; void main(){ vec3 c = texture2D(map, vU).rgb * uOn; gl_FragColor = vec4(c * (1.7 + 0.5 * (uG - 1.0) * 3.0), 1.0); }` });
  fetch('/assets/img/viper-room.b64.txt?v=61').then(r => r.ok ? r.text() : Promise.reject()).then(u => {
    const loader = new T.TextureLoader();
    loader.load(u.trim(), t => { t.colorSpace = T.SRGBColorSpace; mat.uniforms.map.value = t; mat.uniforms.uOn.value = 1; });
  }).catch(() => { mat.uniforms.uOn.value = 1; });
  const sign = new T.Mesh(new T.PlaneGeometry(16, 8), mat); sign.position.y = 18; g.add(sign);
  sign.userData = { link: VIPER.url, title: VIPER.label, id: 'viper-room' }; CL.push(sign);
  const lab = LBL(VIPER.label, '#ff2e2e', 2.2); lab.position.set(0, 12.5, 0.1); g.add(lab);
  const events = LBL('31 Oct House vs Garage · 7 Nov CamUKG · 28 Nov Nicky Blackmarket', '#ffaaaa', 1.1); events.position.set(0, 10.2, 0.1); g.add(events);
  let tries = 0; const seat = () => { const h = roofAt(c.x, c.z); if (h < 0 && tries++ < 40) return setTimeout(seat, 250); const r = Math.max(h, 0, 12);
    lab.position.y = r + 6; events.position.y = r + 4.2; sign.position.y = r + 10; }; seat();
  fx.viper = { pos: [c.x, c.z], url: VIPER.url };
}
