/* JHIOS world v99 — port of Claude v87 wheel/barnard/lodge pass (Drive patch). Separate from world-v87.js (enterable rooms CERN/Dance/Viper), which is untouched. Flags: window.IE_V99_* (=false disables).
   Original header (Claude v87): ONE fat pass on top of v86 (preview only, live stays ?v=81). Every change is gated by a window.IE_V99_* flag (=false reverts it).
   1. Giant Wheel: r 25 m (height 50), renamed "Giant Wheel (Sea Life Centre Gardens)", stale 31 m clear circle replaced, grey placeholder slab hidden. IE_V99_WHEEL=false
   2. Barnard Bridge: jump now lands ON the deck facing north + readable BARNARD BRIDGE board. IE_V99_BARNARD=false
   3. Lodge arrival declutter: Board-train button hidden ~14 s after the Lodge jump, music clusters moved off the fascia sightline, short jump label. IE_V99_LODGE=false
   HELD: KFC/McD relocation (OSM node 1865800794 matches v86 position; brief's Street View claim conflicts — needs Joseph's call). */
export function initV99({ T, S, LBL, LITE, warp, fx }) {
  const info = { wheel: 0, barnard: 0, lodge: 0 }; fx.v99Info = info; window.__fx99 = info;
  const run = (k, f) => { try { f(); } catch (e) { console.warn('v99 ' + k, e); info[k + 'Err'] = String(e); } };
  const retry = (f, n = 40, ms = 600) => { let k = 0; const go = () => { let done = false; try { done = f(); } catch (e) { done = true; console.warn('v99 retry', e); } if (!done && ++k < n) setTimeout(go, ms); }; go(); };
  const PJ = fx.pj81 = fx.pj81 || {};
  const grp = new T.Group(); grp.name = 'v99'; S.add(grp);

  if (window.IE_V99_WHEEL !== false) run('wheel', () => retry(() => {
    const wg = fx.wheelGrp; if (!wg) return false;
    const v85 = S.getObjectByName('v85'); if (!v85) return false;
    const p = wg.position;
    // drop v85's 26 m clear + v-landmark 31 m circle at the OLD pleasure-beach pin; keep one sane circle round the new hub
    if (Array.isArray(fx.clear)) { fx.clear = fx.clear.filter(c => !(c[2] === 31 && Math.hypot(c[0] - p.x, c[1] - p.z) > 40)); fx.clear.push([p.x, p.z, 22]); }
    v85.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0x6f7378 && o.geometry && o.geometry.type === 'ExtrudeGeometry') o.visible = false; });
    info.wheel = 1; return true; }));

  if (window.IE_V99_BARNARD !== false) run('barnard', () => {
    const BE = -60, BN = 2236, TOP = 3.7, a = warp(BE, BN - 5), f = warp(BE, BN + 40);
    PJ.barnard_bridge = [a.x, a.z, [f.x, f.z, 0.05, TOP], true]; // raw: stand on the deck, look north along it
    const c = document.createElement('canvas'); c.width = 1024; c.height = 160; const g = c.getContext('2d');
    g.fillStyle = '#16301f'; g.fillRect(0, 0, 1024, 160); g.strokeStyle = '#e9e2c8'; g.lineWidth = 6; g.strokeRect(8, 8, 1008, 144);
    g.fillStyle = '#e9e2c8'; g.font = 'bold 96px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BARNARD BRIDGE', 512, 84);
    const m = new T.Mesh(new T.PlaneGeometry(9, 1.4), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), side: T.DoubleSide }));
    const p = warp(BE, BN + 6); m.position.set(p.x, TOP + 3.6, p.z); grp.add(m); info.barnard = 1; });

  if (window.IE_V99_LODGE !== false) run('lodge', () => {
    const css = document.createElement('style'); css.textContent = '.wtrain.v99-hide{display:none!important}'; document.head.appendChild(css);
    let t = 0; document.addEventListener('click', ev => { const b = ev.target.closest && ev.target.closest('[data-jump="lodge"]'); if (!b) return;
      const ui = document.querySelector('.wtrain'); if (!ui) return; ui.classList.add('v99-hide'); clearTimeout(t); t = setTimeout(() => ui.classList.remove('v99-hide'), 14000); }, true);
    const relabel = () => { const b = document.querySelector('.wmap-jumps [data-jump="lodge"]'); if (!b) return false; b.textContent = 'Royal Assembly Rooms'; return true; };
    retry(relabel, 30, 1000);
    const side = warp(-93, -447.5);
    retry(() => { let k = 0; for (const c of fx.clusters || []) { if (c.key !== 'cat:royal-assembly-rooms' && c.key !== 'cat:assembly-rooms-hatch') continue; if (!c.grp.userData.v81) return false;
        if (!c.grp.userData.v99) { c.grp.position.z += (c.key === 'cat:royal-assembly-rooms' ? 16 : -10); c.grp.position.y += 2; c.grp.userData.v99 = 1; } k++; } info.lodge = k; return k >= 2; });
  });
}
