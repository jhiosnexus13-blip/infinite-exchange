/* JHIOS shared playback engine — one instance per page, used by site pages AND the 3D world.
   Source abstraction: each track plays from self-hosted audio (track.audio_url, HTML5 <audio>)
   if set, otherwise from YouTube (IFrame Player API, visible 200x200 mini-player per YouTube terms).
   Switching a track to self-hosted audio = fill audio_url in tracks.json. No UI changes needed. */
(function () {
  const C = window.JHIOS_CONFIG || {};
  const listeners = {};
  const emit = (e, d) => (listeners[e] || []).forEach(f => { try { f(d); } catch (err) { console.warn(err); } });
  const fmt = s => !isFinite(s) || s < 0 ? '0:00' : Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const ytId = u => { const m = /(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/.exec(u || ''); return m ? m[1] : null; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- sources ---------- */
  class AudioSource {
    constructor() {
      this.el = new Audio(); this.el.preload = 'metadata';
      ['play', 'pause', 'ended', 'timeupdate', 'loadedmetadata', 'error'].forEach(e => this.el.addEventListener(e, () => this.cb && this.cb(e)));
    }
    load(t) { this.el.src = (C.AUDIO_BASE || '/') + t.audio_url; return this.el.play().catch(() => this.cb && this.cb('blocked')); }
    play() { return this.el.play().catch(() => {}); } pause() { this.el.pause(); }
    stop() { this.el.pause(); this.el.removeAttribute('src'); this.el.load(); }
    seek(s) { this.el.currentTime = s; } get time() { return this.el.currentTime; } get duration() { return this.el.duration; }
    get playing() { return !this.el.paused; }
  }
  let ytApi = null;
  const loadYT = () => ytApi || (ytApi = new Promise((res, rej) => {
    if (window.YT && YT.Player) return res(YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); res(YT); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true;
    s.onerror = () => { ytApi = null; rej(new Error('YouTube API failed to load')); }; document.head.appendChild(s);
  }));
  class YouTubeSource {
    constructor(box) { this.box = box; this.p = null; this.state = -1; }
    async load(t) {
      const id = ytId(t.youtube_url); this.box.hidden = false; document.body.classList.add('yt-on');
      await loadYT();
      if (!this.p) {
        await new Promise(res => {
          this.p = new YT.Player(this.box.querySelector('.ytmount'), {
            width: 200, height: 200, videoId: id, host: 'https://www.youtube-nocookie.com',
            playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, origin: location.origin },
            events: {
              onReady: () => { this.p.playVideo(); res(); },
              onStateChange: e => { this.state = e.data; this.cb && this.cb({ 0: 'ended', 1: 'play', 2: 'pause' }[e.data] || 'state'); },
              onError: () => this.cb && this.cb('error')
            }
          });
        });
      } else this.p.loadVideoById(id);
      clearInterval(this.tick); this.tick = setInterval(() => this.cb && this.cb('timeupdate'), 500);
    }
    play() { this.p && this.p.playVideo(); } pause() { this.p && this.p.pauseVideo && this.p.pauseVideo(); }
    stop() { this.pause(); clearInterval(this.tick); this.box.hidden = true; document.body.classList.remove('yt-on'); }
    seek(s) { this.p && this.p.seekTo(s, true); }
    get time() { return this.p && this.p.getCurrentTime ? this.p.getCurrentTime() : 0; }
    get duration() { return this.p && this.p.getDuration ? this.p.getDuration() : NaN; }
    get playing() { return this.state === 1; }
  }

  /* ---------- UI ---------- */
  const bar = document.createElement('div');
  bar.className = 'player'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Audio player');
  bar.innerHTML = `<div class="ctl"><button type="button" data-a="prev" aria-label="Previous track">⏮</button><button type="button" class="main" data-a="toggle" aria-label="Play">▶</button><button type="button" data-a="next" aria-label="Next track">⏭</button></div>
  <div class="now"><b class="pt">Nothing playing</b><input type="range" min="0" max="1000" value="0" aria-label="Seek" class="seek"><div class="time"><small class="cur">0:00</small><small class="src"></small><small class="dur">0:00</small></div></div>
  <div class="extra"><button type="button" data-a="queue" aria-label="Show queue" aria-expanded="false">☰</button></div>`;
  const qbox = document.createElement('div'); qbox.className = 'queue'; qbox.hidden = true; qbox.setAttribute('aria-label', 'Queue');
  const ytbox = document.createElement('div'); ytbox.className = 'ytbox'; ytbox.hidden = true;
  ytbox.innerHTML = '<div class="ytmount"></div><span class="ytlabel">via YouTube</span><button type="button" class="ytclose" aria-label="Close video and stop">&times;</button>';
  ytbox.querySelector('.ytclose').addEventListener('click', e => { e.stopPropagation(); try { yt.stop(); } catch (_) {} ytbox.hidden = true; document.body.classList.remove('yt-on'); window.dispatchEvent(new CustomEvent('jx:ytclose')); });
  const mount = () => { document.body.append(ytbox, qbox, bar); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', mount) : mount();

  const audio = new AudioSource(), yt = new YouTubeSource(ytbox);
  let src = null, queue = [], idx = -1, tracks = [], seeking = false, counted = new Set(), playedS = 0, lastT = 0;
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('jx-audio') : null;
  const tabId = Math.random().toString(36).slice(2);
  bc && (bc.onmessage = e => { if (e.data && e.data.playing && e.data.tab !== tabId && src && src.playing) src.pause(); });

  const sourceFor = t => t.audio_url ? audio : (ytId(t.youtube_url) ? yt : null);
  const playable = t => !!sourceFor(t);
  const cur = () => queue[idx];

  function onEvt(e) {
    const t = cur(); if (!t) return;
    if (e === 'play') { bc && bc.postMessage({ playing: true, tab: tabId }); lastT = src.time; }
    if (e === 'ended') return next(true);
    if (e === 'error') { toast('Could not play “' + t.title + '” — skipping'); return setTimeout(() => next(true), 800); }
    if (e === 'blocked') toast('Tap play to start audio');
    if (e === 'timeupdate' && src && src.playing) {
      const now = src.time, d = now - lastT; if (d > 0 && d < 2) playedS += d; lastT = now;
      if (playedS >= (C.COUNT_AFTER_S || 30) && !counted.has(t.id)) { counted.add(t.id); ping(t); }
    }
    render();
  }
  audio.cb = onEvt; yt.cb = onEvt;

  function ping(t) {
    if (!C.LISTEN_PING_URL) return;
    fetch(C.LISTEN_PING_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ track: t.id }), keepalive: true, credentials: 'same-origin' }).catch(() => {});
  }
  function toast(msg) {
    const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = msg;
    document.body.appendChild(d); setTimeout(() => d.remove(), 3000);
  }
  function render() {
    const t = cur(), q = s => bar.querySelector(s);
    const playing = !!(src && src.playing);
    q('.pt').textContent = t ? t.title + (t.artist ? ' — ' + t.artist : '') : 'Nothing playing';
    const tg = q('[data-a=toggle]'); tg.textContent = playing ? '⏸' : '▶'; tg.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    q('.src').textContent = t ? (src === yt ? 'via YouTube' : 'self-hosted') : '';
    const d = src ? src.duration : NaN, tm = src ? src.time : 0;
    q('.cur').textContent = fmt(tm); q('.dur').textContent = fmt(isFinite(d) ? d : (t && t.duration_s));
    if (!seeking) q('.seek').value = isFinite(d) && d > 0 ? Math.round(tm / d * 1000) : 0;
    if (!qbox.hidden) renderQueue();
    emit('state', { track: t, playing });
    if ('mediaSession' in navigator && t) {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
      if (navigator.mediaSession.metadata?.title !== t.title)
        navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist || t.lane, album: t.album || 'JHIOS // INFINITE EXCHANGE', artwork: [{ src: t.artwork_url || '/favicon-512.png', sizes: '512x512', type: 'image/png' }] });
      try { if (isFinite(d) && d > 0) navigator.mediaSession.setPositionState({ duration: d, position: Math.min(tm, d), playbackRate: 1 }); } catch (e) {}
    }
  }
  function renderQueue() {
    qbox.innerHTML = '<h3>Queue</h3><ol>' + queue.map((t, i) => `<li class="${i === idx ? 'cur' : ''}"><span>${esc(t.title)}</span><button type="button" data-i="${i}" aria-label="Play ${esc(t.title)}">▶</button></li>`).join('') + '</ol>';
  }
  qbox.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) go(+b.dataset.i); });

  async function go(i) {
    if (i < 0 || i >= queue.length) return;
    idx = i; const t = queue[i], s = sourceFor(t);
    if (!s) { toast('No playable source yet for “' + t.title + '”'); return; }
    if (src && src !== s) src.stop();
    src = s; playedS = 0; render();
    try { await s.load(t); } catch (e) { toast('Player unavailable: ' + e.message); }
    render();
  }
  function next(auto) { for (let i = idx + 1; i < queue.length; i++) if (playable(queue[i])) return go(i); if (auto && src) { src.pause(); render(); } }
  function prev() { if (src && src.time > 3) { src.seek(0); return; } for (let i = idx - 1; i >= 0; i--) if (playable(queue[i])) return go(i); }
  function toggle() { if (!src) { const f = queue.findIndex(playable); if (f >= 0) go(f); return; } src.playing ? src.pause() : src.play(); setTimeout(render, 150); }

  bar.addEventListener('click', e => {
    const a = e.target.closest('button')?.dataset.a; if (!a) return;
    if (a === 'toggle') toggle(); if (a === 'next') next(); if (a === 'prev') prev();
    if (a === 'queue') { qbox.hidden = !qbox.hidden; e.target.setAttribute('aria-expanded', String(!qbox.hidden)); render(); }
  });
  const seek = bar.querySelector('.seek');
  seek.addEventListener('input', () => { seeking = true; });
  seek.addEventListener('change', () => { seeking = false; const d = src && src.duration; if (isFinite(d)) src.seek(seek.value / 1000 * d); });
  if ('mediaSession' in navigator) {
    const ms = navigator.mediaSession, h = (k, f) => { try { ms.setActionHandler(k, f); } catch (e) {} };
    h('play', () => src && src.play()); h('pause', () => src && src.pause());
    h('nexttrack', () => next()); h('previoustrack', () => prev());
    h('seekto', d => src && src.seek(d.seekTime));
    h('seekforward', d => src && src.seek(src.time + (d.seekOffset || 10)));
    h('seekbackward', d => src && src.seek(Math.max(0, src.time - (d.seekOffset || 10))));
  }

  let loading = null;
  window.JX = {
    load() { return loading || (loading = fetch(C.TRACKS_URL || '/tracks.json').then(r => { if (!r.ok) throw new Error('tracks.json ' + r.status); return r.json(); }).then(d => (tracks = d.tracks))); },
    get tracks() { return tracks; },
    byLane(l) { return tracks.filter(t => t.lane === l); },
    playable, ytId, esc, fmt,
    /* play a track (or id) within a queue (array of tracks, default its lane) */
    play(t, list) { if (typeof t === 'string') t = tracks.find(x => x.id === t); if (!t) return; queue = (list || this.byLane(t.lane)).slice(); idx = queue.indexOf(t); if (idx < 0) { queue.unshift(t); idx = 0; } go(idx); },
    playLane(l) { const q = this.byLane(l), f = q.find(playable); if (f) this.play(f, q); else toast('No playable tracks in ' + l + ' yet'); },
    toggle, next, prev,
    get current() { return cur(); }, get playing() { return !!(src && src.playing); },
    on(e, f) { (listeners[e] = listeners[e] || []).push(f); }
  };
})();
