/* JHIOS world v83 — floating card height floor (Joseph "1+2", preview only).
   Rule: every floating world card clears a standing visitor/NPC (~1.8 m) with headroom.
     - label sprites (landmark tags, road/place labels, song sub-labels): sprite BOTTOM edge >= 3.4 m above its ground (deck/base y)
     - song/track panel clusters (fx.clusters: Lodge, Youth, catalogue clusters): lowest panel BOTTOM edge >= 5.2 m
   Only lifts things that sit lower than the floor (idempotent, never lowers, never sends cards up into the sky).
   Ground reference: window.__groundParts heights (decks/bridges) else 0.
   Revert: window.IE_V83_CARD_FLOOR=false (before load) or git 09db4b9. */
export function initV83(o) {
  const { T, S, fx } = o, info = { sprites: 0, clusters: 0, rule: { spriteBottom: 3.4, panelBottom: 5.2 } };
  fx.v83Info = info; window.__fx83 = info;
  if (window.IE_V83_CARD_FLOOR === false) { info.off = true; return { info }; }
  const SB = 3.4, PB = 5.2, v = new T.Vector3(), bb = new T.Box3(), tb = new T.Box3();
  const ground = (x, z) => { let g = 0; for (const f of window.__groundParts || []) { try { const h = f(x, z, 99); if (h != null && h > g && h < 40) g = h; } catch {} } return g; };
  const inCluster = new Set();
  const pass = () => { S.updateMatrixWorld(true); inCluster.clear();
    for (const c of fx.clusters || []) { const g = c.grp; if (!g) continue; g.traverse(m => inCluster.add(m)); bb.makeEmpty();
      g.traverse(m => { if (m.userData && m.userData.track && m.visible !== false) { tb.setFromObject(m); bb.union(tb); } });
      if (bb.isEmpty()) continue; const base = ground(g.position.x, g.position.z), need = base + PB - bb.min.y;
      if (need > 0.05) { g.position.y += need; if (c.y0 != null) c.y0 += need; if (!g.userData.v83) { g.userData.v83 = 1; info.clusters++; } } }
    S.traverse(m => { if (!m.isSprite || !m.visible || inCluster.has(m) || m.userData.v83keep) return; m.getWorldPosition(v);
      const half = m.getWorldScale(new T.Vector3()).y / 2, base = ground(v.x, v.z), need = base + SB - (v.y - half);
      if (need > 0.05 && v.y < 60) { m.position.y += need / (m.parent ? m.parent.getWorldScale(new T.Vector3()).y || 1 : 1); if (!m.userData.v83) { m.userData.v83 = 1; info.sprites++; } } });
  };
  // modules load async and v81 re-places Lodge/Youth clusters on retries; re-assert for ~60 s, then every 10 s (cheap: only lifts)
  let k = 0; const go = () => { try { pass(); } catch (e) { console.warn('v83', e); } setTimeout(go, ++k < 30 ? 2000 : 10000); }; setTimeout(go, 1500);
  return { info };
}
