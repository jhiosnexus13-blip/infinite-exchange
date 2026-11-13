/* v114: photoreal-leaning ground + physically based sky for Great Yarmouth / Gorleston.
   Aerial: Copernicus Sentinel-2 cloudless 2025 mosaic by EOX (https://s2maps.eu/), CC BY 4.0;
           contains modified Copernicus Sentinel data.
   Terrain: Environment Agency LIDAR Composite DTM 1m © Environment Agency copyright and/or
            database right 2022. Licensed under the Open Government Licence v3.0.
   Geographically aligned to the existing Marine Parade origin (52.6035, 1.7365) and warp().
   Flags: IE_V114_EARTH=false disables everything; IE_V114_SKY=false keeps the neon sky;
          IE_V114_TERRAIN=false skips the ground mesh; IE_V114_SHADOWS=false skips L2 shadows.
   L0 uses lite textures and fewer segments. Preview only — do not promote main. */
import { Sky } from 'three/addons/objects/Sky.js';

const ORG = { lat: 52.6035, lon: 1.7365, aod: 3.532 };
const BBOX = { lon0: 1.7128, lat0: 52.5691, lon1: 1.7498, lat1: 52.6469 };
const HMIN = -8, HMAX = 16, SINK = 0.12;
const ME = 111320 * Math.cos(ORG.lat * Math.PI / 180), MN = 110540;
const e0 = (BBOX.lon0 - ORG.lon) * ME, e1 = (BBOX.lon1 - ORG.lon) * ME;
const n0 = (BBOX.lat0 - ORG.lat) * MN, n1 = (BBOX.lat1 - ORG.lat) * MN;

export function initV114Earth(o) {
  const { T, S, CAM, P, fx, LITE, RED, warp, renderer: R } = o;
  const info = { ready: false, sky: false, terrain: false, verts: 0, src: 'EA LIDAR DTM 1m OGL + Sentinel-2 2025 EOX CC-BY' };
  if (window.IE_V114_EARTH === false) { info.off = true; return { info, update() {}, heightAt: () => 0 }; }
  const DET = window.__detail ?? (LITE ? 0 : 1);
  const lite = DET === 0 || !!LITE;

  /* ---- renderer: ACES filmic + optional L2 shadows. Neon materials already set toneMapped:false where they must stay raw. */
  if (R) {
    R.toneMapping = T.ACESFilmicToneMapping;
    R.toneMappingExposure = lite ? 0.85 : 1.05;
    if (R.outputColorSpace !== undefined) R.outputColorSpace = T.SRGBColorSpace;
    if (DET >= 2 && !lite && window.IE_V114_SHADOWS !== false) {
      R.shadowMap.enabled = true;
      R.shadowMap.type = T.PCFSoftShadowMap;
    }
  }
  S.traverse(obj => { if (obj.isGridHelper) obj.visible = false; });

  /* ---- physically based sky (Preetham / Three.js Sky) ---- */
  let sky = null, sun = new T.Vector3(), sunLight = null, hemi = null;
  if (window.IE_V114_SKY !== false) {
    sky = new Sky();
    sky.name = 'v114-sky';
    sky.scale.setScalar(45000);
    sky.material.depthWrite = false;
    sky.renderOrder = -20;
    sky.frustumCulled = false;
    S.add(sky);
    if (fx.skyMesh) fx.skyMesh.visible = false;
    S.background = null;
    if (S.fog) { S.fog.color.set(0x9eb8c8); S.fog.density = lite ? 0.0009 : 0.0007; }
    sunLight = new T.DirectionalLight(0xfff1d0, 2.2);
    sunLight.name = 'v114-sun';
    sunLight.position.set(80, 120, 40);
    sunLight.castShadow = !!(DET >= 2 && R && R.shadowMap && R.shadowMap.enabled);
    if (sunLight.castShadow) {
      const s = sunLight.shadow;
      s.mapSize.set(1536, 1536);
      s.camera.near = 2; s.camera.far = 700;
      s.camera.left = s.camera.bottom = -220;
      s.camera.right = s.camera.top = 220;
      s.bias = -0.0004; s.normalBias = 0.04;
    }
    S.add(sunLight); S.add(sunLight.target);
    hemi = new T.HemisphereLight(0x8ec0e8, 0x3d342c, 0.5);
    hemi.name = 'v114-hemi';
    S.add(hemi);
    const u = sky.material.uniforms;
    u.turbidity.value = 4; u.rayleigh.value = 1.8; u.mieCoefficient.value = 0.005; u.mieDirectionalG.value = 0.8;
    info.sky = true;
    /* old neon sea is built later in geo(); hide it from update() once it exists. IE_V114_OLDSEA=true restores. */
  }

  /* ---- height sampler (CPU, bilinear) ---- */
  let Hpix = null, Hw = 0, Hh = 0;
  function sampleAOD(u, imgV) {
    if (!Hpix) return ORG.aod;
    const x = u * (Hw - 1), y = imgV * (Hh - 1);
    const x0 = Math.max(0, Math.min(Hw - 2, Math.floor(x)));
    const y0 = Math.max(0, Math.min(Hh - 2, Math.floor(y)));
    const fx_ = x - x0, fy_ = y - y0;
    const at = (xx, yy) => Hpix[(yy * Hw + xx) * 4]; /* R = height */
    const r = (1 - fy_) * ((1 - fx_) * at(x0, y0) + fx_ * at(x0 + 1, y0)) + fy_ * ((1 - fx_) * at(x0, y0 + 1) + fx_ * at(x0 + 1, y0 + 1));
    return HMIN + (r / 255) * (HMAX - HMIN);
  }
  function heightAt(x, z) {
    const e = x, n = -z;
    const u = (ORG.lon + e / ME - BBOX.lon0) / (BBOX.lon1 - BBOX.lon0);
    const vv = (ORG.lat + n / MN - BBOX.lat0) / (BBOX.lat1 - BBOX.lat0);
    if (u < 0 || u > 1 || vv < 0 || vv > 1) return 0;
    return sampleAOD(u, 1 - vv) - ORG.aod - SINK;
  }
  info.heightAt = heightAt;

  /* ---- terrain mesh ---- */
  function buildTerrain(aerialTex) {
    if (window.IE_V114_TERRAIN === false) return;
    const segsW = lite ? 64 : (DET >= 2 ? 192 : 128);
    const segsH = lite ? 160 : (DET >= 2 ? 448 : 288);
    const geo = new T.PlaneGeometry(1, 1, segsW, segsH);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const u = uv.getX(i), v = uv.getY(i);
      const e = e0 + (e1 - e0) * u;
      const n = n0 + (n1 - n0) * v; /* v=0 south */
      const w = warp(e, n);
      const y = sampleAOD(u, 1 - v) - ORG.aod - SINK;
      pos.setXYZ(i, w.x, y, w.z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    aerialTex.colorSpace = T.SRGBColorSpace;
    aerialTex.anisotropy = (R && R.capabilities && R.capabilities.getMaxAnisotropy) ? Math.min(8, R.capabilities.getMaxAnisotropy()) : 4;
    aerialTex.wrapS = aerialTex.wrapT = T.ClampToEdgeWrapping;
    aerialTex.minFilter = T.LinearMipmapLinearFilter;
    aerialTex.magFilter = T.LinearFilter;
    aerialTex.needsUpdate = true;
    const mat = new T.MeshStandardMaterial({
      map: aerialTex, roughness: 0.92, metalness: 0.02, envMapIntensity: 0.35,
      color: 0xffffff, flatShading: false
    });
    const mesh = new T.Mesh(geo, mat);
    mesh.name = 'v114-terrain';
    mesh.receiveShadow = !!(sunLight && sunLight.castShadow);
    mesh.castShadow = false;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    S.add(mesh);
    fx.earthMesh = mesh;
    info.terrain = true;
    info.verts = pos.count;
    (window.__groundParts = window.__groundParts || []).push((x, z) => {
      /* rooms / bridges unshift and return first; we only answer in the baked extent */
      const e = x, n = -z;
      const u = (ORG.lon + e / ME - BBOX.lon0) / (BBOX.lon1 - BBOX.lon0);
      const vv = (ORG.lat + n / MN - BBOX.lat0) / (BBOX.lat1 - BBOX.lat0);
      if (u < 0 || u > 1 || vv < 0 || vv > 1) return null;
      return sampleAOD(u, 1 - vv) - ORG.aod - SINK;
    });
  }

  const loadImg = (url) => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('img ' + url)); i.src = url; });
  const dtmUrl = lite ? '/assets/img/gy-dtm-lite.png?v=114' : '/assets/img/gy-dtm.png?v=114';
  const aerUrl = lite ? '/assets/img/gy-s2-2025-lite.jpg?v=114' : '/assets/img/gy-s2-2025.jpg?v=114';

  Promise.all([loadImg(dtmUrl), loadImg(aerUrl)]).then(([dimg, aimg]) => {
    const c = document.createElement('canvas'); c.width = dimg.width; c.height = dimg.height;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(dimg, 0, 0);
    const id = g.getImageData(0, 0, c.width, c.height);
    Hpix = id.data; Hw = c.width; Hh = c.height;
    const tex = new T.Texture(aimg);
    tex.colorSpace = T.SRGBColorSpace;
    tex.needsUpdate = true;
    buildTerrain(tex);
    info.ready = true;
    fx.earthInfo = info;
    console.info('[IE] v114 earth ready', { verts: info.verts, lite, sky: info.sky, terrain: info.terrain });
  }).catch(e => {
    console.warn('[IE] v114 earth textures', e);
    info.err = String(e && e.message || e);
    info.ready = true;
    /* sky still runs without the ground */
  });

  const viperOn = () => !!(window.__fx87 && window.__fx87.inside === 'viper');

  function update(/* t, dt */) {
    const E = fx.env && fx.env.state;
    const vip = viperOn();
    if (sky) sky.visible = !vip;
    if (sunLight) sunLight.visible = !vip;
    if (hemi) hemi.visible = !vip;
    if (fx.skyMesh && window.IE_V114_SKY !== false) fx.skyMesh.visible = false;
    if (vip) return;
    if (sky) sky.position.copy(CAM.position);
    const phase = E ? E.phase : 0.3;
    const sunEl = Math.sin((phase - 0.05) * Math.PI * 2); /* >0 day; noon ~phase 0.30 */
    const elevation = sunEl * 1.05; /* radians, ~60° at noon */
    const azimuth = (phase - 0.3) * Math.PI * 2 + Math.PI; /* noon = south (−z) */
    const phi = Math.PI / 2 - elevation;
    sun.setFromSphericalCoords(1, phi, azimuth);
    if (sky && sky.material.uniforms.sunPosition) sky.material.uniforms.sunPosition.value.copy(sun);
    const day = Math.min(1, Math.max(0, sunEl * 2.2 + 0.5));
    const gloom = E ? Math.min(1, (E.cloud || 0) * 0.6 + (E.rain || 0) * 0.4) : 0;
    if (sunLight) {
      const px = P && P.pos ? P.pos.x : 0, pz = P && P.pos ? P.pos.z : 0;
      sunLight.target.position.set(px, 0, pz);
      sunLight.position.copy(sun).multiplyScalar(280).add(sunLight.target.position);
      sunLight.intensity = Math.max(0.04, day * (2.35 - gloom * 1.15));
      sunLight.color.setHSL(0.09 + day * 0.04, 0.32, 0.93 - (1 - day) * 0.15);
    }
    if (hemi) hemi.intensity = 0.18 + day * 0.42 * (1 - gloom * 0.4);
    if (R && R.toneMapping === T.ACESFilmicToneMapping) R.toneMappingExposure = 0.32 + day * (lite ? 0.65 : 0.82);
    if (sky) {
      sky.material.uniforms.turbidity.value = 2.8 + gloom * 8 + (1 - day) * 2;
      sky.material.uniforms.rayleigh.value = 0.6 + (1 - gloom) * 1.5 * day + (1 - day) * 0.2;
    }
    if (S.fog) {
      S.fog.color.setHex(day > 0.35 ? (gloom > 0.5 ? 0x8a97a0 : 0xb7c8d4) : 0x0b1218);
      const k = E && E.fogK ? E.fogK : 1;
      S.fog.density = (lite ? 0.00085 : 0.00062) * k;
      if (E) { E.fogD0 = lite ? 0.00085 : 0.00062; if (E.fogC0) E.fogC0.set(S.fog.color); }
    }
    if (E && E.amb) for (const a of E.amb) a.intensity = 0.16 + day * 0.22;
    if (window.IE_V114_OLDSEA !== true && fx.sea && fx.sea.visible) { fx.sea.visible = false; info.oldSeaHidden = true; }
    /* plaza neon PointLight — keep a little glow, don't wash the aerial */
    if (!info.dimmedPlaza) {
      S.traverse(obj => { if (obj.isPointLight && obj.color && obj.color.getHex() === 0x00ff9d) { obj.intensity = Math.min(obj.intensity, 8); obj.distance = obj.distance || 40; } });
      info.dimmedPlaza = true;
    }
  }

  fx.earth = { info, update, heightAt };
  return { info, update, heightAt };
}
