(function () {
  const C = window.JHIOS_CONFIG, $ = s => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  let lane = params.get('lane') || 'All', tag = params.get('tag') || '', q = params.get('q') || '';
  const list = $('#list'), qi = $('#q'); qi.value = q;
  const laneBox = $('#lanes');

  function filtered() {
    const s = q.trim().toLowerCase();
    return JX.tracks.filter(t => (lane === 'All' || t.lane === lane) && (!tag || t.tags.some(x => x.includes(tag)))
      && (!s || (t.title + ' ' + t.artist + ' ' + t.album + ' ' + t.tags.join(' ')).toLowerCase().includes(s)));
  }
  function syncUrl() {
    const p = new URLSearchParams(); if (lane !== 'All') p.set('lane', lane); if (tag) p.set('tag', tag); if (q) p.set('q', q);
    const t = new URLSearchParams(location.search).get('t'); if (t) p.set('t', t);
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
  }
  function row(t, i) {
    const ok = JX.playable(t), cur = JX.current === t;
    return `<li class="tr"><button type="button" class="pbtn${cur && JX.playing ? ' playing' : ''}" data-id="${JX.esc(t.id)}" ${ok ? '' : 'disabled'} aria-label="${ok ? 'Play' : 'Not playable yet:'} ${JX.esc(t.title)}">${cur && JX.playing ? '⏸' : '▶'}</button>
    <span class="t"><b><a href="?t=${encodeURIComponent(t.id)}">${JX.esc(t.title)}</a></b><small>${JX.esc(t.artist || '')}${t.artist ? ' · ' : ''}${JX.esc(t.lane)}${t.album ? ' · ' + JX.esc(t.album) : ''}</small></span>
    <span class="meta">${t.release_date || ''} ${t.duration_s ? JX.fmt(t.duration_s) : ''}</span></li>`;
  }
  function render() {
    laneBox.innerHTML = ['All', ...C.LANES].map(l => `<button type="button" class="chip" aria-pressed="${l === lane}" data-lane="${JX.esc(l)}">${JX.esc(l)} <span class="badge">${l === 'All' ? JX.tracks.length : JX.byLane(l).length}</span></button>`).join('');
    const tf = $('#tagf'); tf.hidden = !tag; tf.innerHTML = tag ? `<button type="button" class="chip" aria-pressed="true" data-cleartag>playlist: ${JX.esc(tag)} ✕</button>` : '';
    const f = filtered(); $('#count').textContent = f.length + ' tracks';
    list.innerHTML = f.map(row).join('');
    detail();
  }
  function detail() {
    const id = new URLSearchParams(location.search).get('t'), box = $('#detail');
    const t = id && JX.tracks.find(x => x.id === id);
    if (!t) { box.innerHTML = ''; return; }
    document.title = t.title + ' | JHIOS Vault';
    const url = location.origin + location.pathname + '?t=' + encodeURIComponent(t.id);
    const also = [t.youtube_url && `<a href="${JX.esc(t.youtube_url)}" rel="noopener">YouTube</a>`, ...(t.also_on || []).map(a => `<a href="${JX.esc(a.url)}" rel="noopener">${JX.esc(a.label)}</a>`)].filter(Boolean).join(' · ');
    box.innerHTML = `<article class="card" style="margin-bottom:1.5rem"><span class="k">TRACK // ${JX.esc(t.lane)}</span><h2>${JX.esc(t.title)}</h2>
    <p>${JX.esc(t.artist || '')}${t.album ? ' · ' + JX.esc(t.album) : ''}${t.release_date ? ' · ' + t.release_date : ''}${t.duration_s ? ' · ' + JX.fmt(t.duration_s) : ''}</p>
    <button type="button" class="btn solid" data-id="${JX.esc(t.id)}" ${JX.playable(t) ? '' : 'disabled'}>▶ PLAY</button>
    <button type="button" class="btn" data-share="${JX.esc(url)}">SHARE LINK</button> <a class="btn ghost" href="${location.pathname}">✕ CLOSE</a>
    ${also ? `<p>Also on: ${also}</p>` : ''}</article>`;
  }
  document.addEventListener('click', async e => {
    const p = e.target.closest('[data-id]'); if (p && !p.disabled) {
      const t = JX.tracks.find(x => x.id === p.dataset.id);
      if (JX.current === t) JX.toggle(); else JX.play(t, filtered().includes(t) ? filtered() : undefined);
      return;
    }
    const l = e.target.closest('#lanes [data-lane]'); if (l) { lane = l.dataset.lane; syncUrl(); render(); return; }
    if (e.target.closest('[data-cleartag]')) { tag = ''; syncUrl(); render(); return; }
    const s = e.target.closest('[data-share]'); if (s) {
      const url = s.dataset.share;
      try { if (navigator.share) await navigator.share({ title: document.title, url }); else { await navigator.clipboard.writeText(url); s.textContent = 'COPIED ✓'; } }
      catch (err) { s.textContent = url; }
    }
    const a = e.target.closest('a[href^="?t="]'); if (a) { e.preventDefault(); history.pushState(null, '', a.getAttribute('href')); detail(); window.scrollTo({ top: 0 }); }
  });
  window.addEventListener('popstate', detail);
  let tm; qi.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { q = qi.value; syncUrl(); render(); }, 150); });
  const boot = () => JX.load().then(() => { render(); JX.on('state', () => {
    list.querySelectorAll('.pbtn').forEach(b => { const on = JX.current && b.dataset.id === JX.current.id && JX.playing; b.classList.toggle('playing', on); b.textContent = on ? '⏸' : '▶'; });
  }); }).catch(err => { $('#count').textContent = 'Could not load the vault: ' + err.message; });
  window.JX ? boot() : addEventListener('DOMContentLoaded', boot);
})();
