/* v127 lean pass — preview only.
   IE_V127_BRICK=false  no world-space brick/plaster on ordinary walls
   IE_V127_GROUND=false no lift of dark north seafront ground / roads
   IE_V127_FIELD=false  restore the leftover Barnard Field toy-bridge bump
   Does NOT reuse the v123 facade-shader sweep (that made TV-static walls). */
const on = k => window['IE_V127_' + k] !== false;

export function initV127({ T, S, LITE, warp, fx }) {
  const st = { t0: performance.now(), brick: 0, brickN: 0, earth: 0, road: 0 };
  const info = { brick: 0 };

  /* ---- 1. world-space brick_4 + plaster on ordinary town / seafront wall skins ---- */
  if (on('BRICK')) {
    const skip = /iron-duke|arc-cinema|fallen-angels|seafront-shelter|v116-iron|holo|road|pavement|v121|osm-buildings|v115-solid|car|train|kiosk|sky|earth|terrain|v114/;
    const plaster = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
      g.fillStyle = '#e4dccb'; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 9000; i++) {
        const v = 196 + (i * 19) % 44;
        g.fillStyle = `rgba(${v},${v - 7},${v - 22},${0.22 + (i % 5) * 0.04})`;
        g.fillRect((i * 47) % 512, (i * 91) % 512, 1 + i % 3, 1 + i % 2);
      }
      g.strokeStyle = 'rgba(180,170,155,0.18)'; g.lineWidth = 1;
      for (let y = 0; y < 512; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
      const tx = new T.CanvasTexture(c); tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.colorSpace = T.SRGBColorSpace || tx.colorSpace;
      tx.generateMipmaps = true; tx.minFilter = T.LinearMipmapLinearFilter; tx.magFilter = T.LinearFilter;
      tx.anisotropy = (fx.renderer && fx.renderer.capabilities && fx.renderer.capabilities.getMaxAnisotropy) ? Math.min(8, fx.renderer.capabilities.getMaxAnisotropy()) : 4;
      tx.needsUpdate = true; return tx;
    })();
    const loader = new T.TextureLoader();
    let brickTex = plaster, ready = false;
    loader.load('/assets/img/v116/brick_4_diff_1k.jpg?v=129', tx => {
      tx.colorSpace = T.SRGBColorSpace || tx.colorSpace; tx.wrapS = tx.wrapT = T.RepeatWrapping;
      tx.generateMipmaps = true; tx.minFilter = T.LinearMipmapLinearFilter; tx.magFilter = T.LinearFilter;
      tx.anisotropy = plaster.anisotropy; tx.needsUpdate = true; brickTex = tx; ready = true;
      mats.forEach(m => { if (m.userData.brickU) { m.userData.brickU.value = tx; m.needsUpdate = true; } });
    }, undefined, () => { ready = true; });

    const mats = [];
    const mkMat = (vc, tint) => {
      const m = new T.MeshBasicMaterial({ color: tint ?? 0xffffff, vertexColors: !!vc, fog: true, side: T.DoubleSide }); /* v128: OSM wall winding is mixed — FrontSide (v127) made street fronts vanish ('open garages'). facade69 was always DoubleSide. */
      const uBrick = { value: brickTex }, uPlas = { value: plaster };
      m.userData.brickU = uBrick;
      m.onBeforeCompile = sh => {
        sh.uniforms.uBrick = uBrick; sh.uniforms.uPlas = uPlas;
        sh.vertexShader = 'varying vec3 vW127;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vW127 = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = 'varying vec3 vW127;\nuniform sampler2D uBrick, uPlas;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          { vec3 nn = normalize(cross(dFdx(vW127), dFdy(vW127)));
            if (abs(nn.y) >= 0.6) { diffuseColor.rgb = diffuseColor.rgb * 0.42 + vec3(0.03); } else {
              vec2 tng = normalize(vec2(-nn.z, nn.x));
              vec2 uv = vec2(dot(vW127.xz, tng), vW127.y) * 0.45; /* ~2.2 m per tile, with mips — never a noise-scale repeat */
              vec3 br = texture2D(uBrick, uv).rgb;
              vec3 pl = texture2D(uPlas, uv).rgb;
              vec3 base = diffuseColor.rgb;
              float lum = dot(base, vec3(0.30, 0.59, 0.11));
              vec3 tex = mix(br, pl, smoothstep(0.42, 0.62, lum));
              tex *= mix(vec3(1.0), base / max(lum, 0.08), 0.28);
              float shade = 0.82 + 0.18 * abs(nn.x);
              diffuseColor.rgb = tex * shade;
            }
          }`);
      };
      m.customProgramCacheKey = () => 'v127brick' + (vc ? 'v' : 'c');
      mats.push(m); return m;
    };
    const matV = mkMat(true), matC = {};
    function applyBrick() {
      if (window.IE_V127_BRICK === false) return 0;
      let n = 0;
      S.traverse(o => {
        if (!o.isMesh || o.isInstancedMesh || o.userData.v127brick) return;
        const nm = ((o.name || '') + ' ' + ((o.parent && o.parent.name) || '') + ' ' + ((o.parent && o.parent.parent && o.parent.parent.name) || '')).toLowerCase();
        if (skip.test(nm)) return;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        const m0 = ms[0]; if (!m0) return;
        const key = m0.customProgramCacheKey && String(m0.customProgramCacheKey());
        if (!(key && key.indexOf('facade69') === 0)) return; /* only the ordinary v69/newtown wall skins, never a raw sweep of every mesh */
        if (m0.vertexColors) o.material = matV;
        else {
          const hex = (m0.color && m0.color.getHex) ? m0.color.getHex() : 0xcccccc;
          o.material = matC[hex] || (matC[hex] = mkMat(false, hex));
        }
        o.userData.v127brick = 1; n++;
      });
      return n;
    }
    st.applyBrick = applyBrick;
  }

  /* ---- 2. lift near-black ground (dark aerial north of LIDAR) and v121 roads so the seafront doesn't dissolve ---- */
  function liftGround() {
    if (!on('GROUND') || (st.earth && st.road)) return;
    const earth = S.getObjectByName('v114-terrain');
    if (earth && earth.material && !earth.userData.v127lift) {
      const m = earth.material;
      const prevKey = m.customProgramCacheKey;
      m.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
          { float lum = dot(diffuseColor.rgb, vec3(0.30, 0.59, 0.11));
            if (lum < 0.28) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.34, 0.32, 0.27), clamp((0.28 - lum) * 2.4, 0.0, 0.75)); }`);
      };
      m.customProgramCacheKey = () => (prevKey ? prevKey.call(m) : 't') + 'v127g';
      m.needsUpdate = true; earth.userData.v127lift = 1; st.earth = 1;
    }
    S.traverse(o => {
      if (!o.isMesh || o.userData.v127road) return;
      if (o.name !== 'v121-carriageway' && o.name !== 'v121-pavement') return;
      const m = o.material; if (!m) return;
      if (o.name === 'v121-carriageway') { m.color.setHex(0x6a6e74); if (m.emissive) m.emissive.setHex(0x1a1c1e); }
      else { m.color.setHex(0xb0aaa0); if (m.emissive) m.emissive.setHex(0x151310); }
      m.needsUpdate = true; o.userData.v127road = 1; st.road = 1;
    });
  }

  return {
    info,
    update() {
      const t = (performance.now() - st.t0) / 1000;
      if (st.applyBrick && st.brick < 5 && t > 4 + st.brick * 6) { st.brick++; const n = st.applyBrick(); st.brickN += n; info.brick = st.brickN; fx.v127Info = info; }
      if (t > 2) liftGround();
    }
  };
}
