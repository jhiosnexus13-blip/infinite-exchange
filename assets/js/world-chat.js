/* JHIOS world v61: text chat + Messenger-style voice notes (hold to record, release to send). No live audio, no WebRTC.
   - Chat window (minimisable like every window via world-ui.js): last 50 messages / 4 hours from /api/chat, polled every 4 s while
     open (20 s while closed, for the unread badge). Anonymous 'visitor-xxxx' handles; everything is rendered with textContent only.
   - Voice notes: the mic is requested only when you first hold the talk button, and released again as soon as the clip is sent
     (nothing is ever left on). MediaRecorder: webm/opus, or mp4/aac on iOS Safari. Max 15 s with a live timer; under 0.4 s is discarded.
     Notes show in the chat with a play button; they never autoplay.
   - Controls: keyboard hold V = record, T = open chat (Esc leaves the text box). Controller: hold LB + RB together = record
     (a single bumper still skips tracks, on release). Touch: press and hold the 🎙 button. */
export function initChat(o) {
  const { fx } = o, MAX_MS = 15000, MIN_MS = 400;
  const sid = (fx.presence && fx.presence.sid) || Array.from(crypto.getRandomValues(new Uint8Array(10)), b => (b % 36).toString(36)).join('');
  const touch = matchMedia('(pointer:coarse)').matches;
  const css = document.createElement('style'); css.textContent = `
.wsoc{position:fixed;z-index:24;right:calc(.5rem + env(safe-area-inset-right));bottom:calc(var(--player-h,64px) + 1.4rem + env(safe-area-inset-bottom));display:flex;gap:.4rem;font-family:ui-monospace,monospace}
.wsoc button{position:relative;min-width:44px;min-height:44px;padding:0 .7rem;border-radius:22px;border:1px solid #00e5ff;background:rgba(0,10,14,.9);color:#dffcff;font:600 .78rem ui-monospace,monospace;cursor:pointer;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.wsoc button:hover{background:rgba(0,229,255,.2)}.wsoc .wtalk.on{background:#ff2e4d;border-color:#ff8a9a;color:#fff;box-shadow:0 0 14px rgba(255,46,77,.7)}
.wsoc .badge{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;border-radius:9px;background:#ff2e4d;color:#fff;font-size:.65rem;line-height:18px;text-align:center}
.wchat{position:fixed;z-index:30;right:calc(.5rem + env(safe-area-inset-right));bottom:calc(var(--player-h,64px) + 4.6rem + env(safe-area-inset-bottom));width:min(330px,calc(100vw - 1rem));max-height:min(50vh,380px);display:flex;flex-direction:column;background:rgba(0,10,14,.94);border:1px solid #00e5ff;border-radius:10px;color:#dffcff;font:.78rem/1.35 ui-monospace,monospace;box-shadow:0 0 18px rgba(0,229,255,.25)}
.wchat[hidden]{display:none}.wchat .hd{padding:.45rem 5.4rem .45rem .6rem;font-weight:700;color:#00ff9d;letter-spacing:.06em;border-bottom:1px solid rgba(0,229,255,.25)}
.wchat .hd small{display:block;font-weight:400;color:#8fc9d4;letter-spacing:0}
.wchat .x{position:absolute;top:6px;right:6px;width:34px;height:34px;border-radius:8px;border:1px solid #00e5ff;background:rgba(0,10,14,.9);color:#dffcff;font:700 1rem ui-monospace,monospace;cursor:pointer}
.wchat .log{flex:1;overflow-y:auto;padding:.4rem .6rem;min-height:90px}.wchat .m{margin:.18rem 0;word-wrap:break-word;overflow-wrap:anywhere}.wchat .m b{color:#7dffd0;font-weight:600;margin-right:.35rem}.wchat .m.me b{color:#ffe14a}
.wchat .m .t{color:#6f97a0;font-size:.66rem;margin-left:.3rem}.wchat .play{border:1px solid #7dffd0;background:transparent;color:#c8ffe8;border-radius:12px;padding:.1rem .55rem;font:600 .72rem ui-monospace,monospace;cursor:pointer}
.wchat .play.on{background:#7dffd0;color:#001014}.wchat form{display:flex;gap:.3rem;padding:.4rem;border-top:1px solid rgba(0,229,255,.25)}
.wchat input{flex:1;min-width:0;min-height:36px;padding:0 .5rem;border-radius:8px;border:1px solid #2f6a75;background:#02161b;color:#e8feff;font:.8rem ui-monospace,monospace}
.wchat form button{min-height:36px;padding:0 .6rem;border-radius:8px;border:1px solid #00e5ff;background:transparent;color:#dffcff;font:600 .75rem ui-monospace,monospace;cursor:pointer;touch-action:none;-webkit-user-select:none;user-select:none}
.wchat .note{padding:0 .6rem .4rem;color:#8fc9d4;font-size:.68rem;min-height:1em}
.wrec{position:fixed;z-index:80;left:50%;top:calc(4.2rem + env(safe-area-inset-top));transform:translateX(-50%);padding:.35rem .9rem;border-radius:16px;background:#ff2e4d;color:#fff;font:700 .8rem ui-monospace,monospace;box-shadow:0 0 18px rgba(255,46,77,.8);pointer-events:none}
.wrec[hidden]{display:none}.wrec i{display:inline-block;width:.6rem;height:.6rem;border-radius:50%;background:#fff;margin-right:.45rem;animation:wrecb 1s infinite}@keyframes wrecb{50%{opacity:.25}}
@media (prefers-reduced-motion:reduce){.wrec i{animation:none}}`;
  document.head.appendChild(css);
  // ---- DOM ----
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };
  const bar = el('div', 'wsoc'); const chatBtn = el('button', 'wchatb', '💬'); chatBtn.type = 'button'; chatBtn.title = 'Chat (T)'; chatBtn.setAttribute('aria-label', 'Open chat');
  const badge = el('span', 'badge'); badge.hidden = true; chatBtn.appendChild(badge);
  const talk = el('button', 'wtalk', touch ? '🎙 Hold' : '🎙 Hold V'); talk.type = 'button'; talk.title = 'Hold to record a voice note (max 15 s), release to send'; talk.setAttribute('aria-label', 'Hold to record a voice note');
  bar.append(chatBtn, talk); document.body.appendChild(bar);
  const box = el('div', 'wchat'); box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Chat');
  const hd = el('div', 'hd', 'CHAT'); const who = el('small', '', 'anonymous · last 4 hours'); hd.appendChild(who);
  const x = el('button', 'x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close chat');
  const log = el('div', 'log'); log.setAttribute('aria-live', 'polite');
  const form = el('form'); const inp = el('input'); inp.type = 'text'; inp.maxLength = 200; inp.placeholder = 'Say something…'; inp.setAttribute('aria-label', 'Chat message'); inp.autocomplete = 'off';
  const send = el('button', '', 'Send'); send.type = 'submit'; const mic2 = el('button', 'wtalk2', '🎙'); mic2.type = 'button'; mic2.title = 'Hold to record a voice note'; mic2.setAttribute('aria-label', 'Hold to record a voice note');
  form.append(inp, send, mic2); const note = el('div', 'note');
  box.append(hd, x, log, form, note); document.body.appendChild(box);
  const rec = el('div', 'wrec'); rec.hidden = true; rec.setAttribute('role', 'status'); document.body.appendChild(rec);
  // ---- chat data ----
  let last = '', me = '', unread = 0, timer = 0, busy = false; const seen = new Set();
  const say = s => { note.textContent = s || ''; };
  const fmt = ms => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const hhmm = t => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  let audio = null, playing = null;
  function play(btn, id, d) { if (playing === btn) { audio.pause(); return; } if (audio) audio.pause();
    audio = new Audio('/api/voice?id=' + encodeURIComponent(id)); playing = btn; btn.classList.add('on'); btn.textContent = '❚❚ ' + fmt(d);
    const done = () => { btn.classList.remove('on'); btn.textContent = '▶ voice note ' + fmt(d); if (playing === btn) playing = null; };
    audio.onended = done; audio.onpause = done; audio.onerror = () => { done(); say('That voice note has expired.'); };
    audio.play().catch(() => done()); }
  function add(m) { if (seen.has(m.k)) return; seen.add(m.k); const row = el('div', 'm' + (m.h === me ? ' me' : '')); row.appendChild(el('b', '', m.h));
    if (m.v) { const b = el('button', 'play', '▶ voice note ' + fmt(m.v.d)); b.type = 'button'; b.setAttribute('aria-label', `Play voice note from ${m.h}, ${fmt(m.v.d)}`); b.addEventListener('click', () => play(b, m.v.id, m.v.d)); row.appendChild(b); }
    else row.appendChild(document.createTextNode(m.x || ''));
    row.appendChild(el('span', 't', hhmm(m.t))); const atEnd = log.scrollHeight - log.scrollTop - log.clientHeight < 30; log.appendChild(row);
    while (log.children.length > 60) log.firstChild.remove(); if (atEnd || m.h === me) log.scrollTop = log.scrollHeight;
    if (box.hidden && m.h !== me && last) { unread++; badge.textContent = unread > 9 ? '9+' : String(unread); badge.hidden = false; } }
  async function poll() { if (busy || document.hidden) return; busy = true;
    try { const r = await fetch('/api/chat?sid=' + sid + (last ? '&since=' + encodeURIComponent(last) : ''), { cache: 'no-store' }); if (!r.ok) throw 0; const d = await r.json();
      if (d.me && d.me !== me) { me = d.me; who.textContent = `you are ${me} · anonymous · last 4 hours`; }
      const first = !last; for (const m of d.msgs || []) add(m); if ((d.msgs || []).length) last = d.msgs[d.msgs.length - 1].k; if (first && !last) last = ' ';
      if (first) { unread = 0; badge.hidden = true; } } catch (_) {} finally { busy = false; } }
  const schedule = () => { clearInterval(timer); timer = setInterval(poll, box.hidden ? 20000 : 4000); };
  const open = (focus) => { box.hidden = false; unread = 0; badge.hidden = true; chatBtn.setAttribute('aria-expanded', 'true'); poll(); schedule(); if (focus) setTimeout(() => inp.focus(), 0); };
  const close = () => { box.hidden = true; chatBtn.setAttribute('aria-expanded', 'false'); inp.blur(); schedule(); };
  chatBtn.addEventListener('click', () => (box.hidden ? open(!touch) : close())); x.addEventListener('click', close);
  for (const e of [bar, box, rec]) e.addEventListener('pointerdown', ev => ev.stopPropagation());
  form.addEventListener('submit', async e => { e.preventDefault(); const t = inp.value.trim(); if (!t) return; send.disabled = true;
    try { const r = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sid, text: t.slice(0, 200) }) }); const d = await r.json().catch(() => ({}));
      if (r.ok && d.msg) { inp.value = ''; say(''); add(d.msg); last = d.msg.k > last ? d.msg.k : last; } else say(r.status === 429 ? 'Easy — one message every 2 seconds.' : d.error === 'empty' ? 'Nothing left to send after the filter.' : 'Could not send. Chat works best on Wi-Fi.'); }
    catch (_) { say('Could not send. Chat works best on Wi-Fi.'); } finally { send.disabled = false; } });
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') inp.blur(); });
  inp.addEventListener('keyup', e => e.stopPropagation());
  // ---- voice notes ----
  const R = { state: 'idle', mr: null, stream: null, chunks: [], t0: 0, tick: 0, want: false, mime: '' };
  const pickMime = () => { if (!window.MediaRecorder) return null; for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/aac', 'audio/ogg;codecs=opus']) if (!MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(m)) return m; return ''; };
  const ui = on => { for (const b of [talk, mic2]) b.classList.toggle('on', on); rec.hidden = !on; };
  const stopStream = () => { if (R.stream) for (const t of R.stream.getTracks()) t.stop(); R.stream = null; };
  async function start() { if (R.state !== 'idle') return; R.want = true; const mime = pickMime();
    if (mime === null || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { open(false); say('Voice notes are not supported in this browser.'); return; }
    R.state = 'asking';
    try { R.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }); }
    catch (e) { R.state = 'idle'; open(false); say(e && e.name === 'NotAllowedError' ? 'Microphone blocked. Allow it in your browser settings to send voice notes.' : 'No microphone found.'); return; }
    if (!R.want) { stopStream(); R.state = 'idle'; open(false); say('Mic ready. Hold the button (or V) to record.'); return; } // first press only granted permission
    try { R.mr = new MediaRecorder(R.stream, Object.assign({ audioBitsPerSecond: 32000 }, mime ? { mimeType: mime } : {})); } catch (_) { R.mr = new MediaRecorder(R.stream); }
    R.mime = (R.mr.mimeType || mime || 'audio/webm'); R.chunks = []; R.mr.ondataavailable = e => { if (e.data && e.data.size) R.chunks.push(e.data); };
    R.mr.onstop = finish; R.mr.start(250); R.t0 = performance.now(); R.state = 'rec'; ui(true);
    const upd = () => { const ms = performance.now() - R.t0; rec.innerHTML = ''; rec.appendChild(el('i')); rec.appendChild(document.createTextNode(`REC ${fmt(ms)} / 0:15 · release to send`)); if (ms >= MAX_MS) stop(); };
    upd(); R.tick = setInterval(upd, 200); }
  function stop() { R.want = false; if (R.state !== 'rec') return; R.state = 'stopping'; clearInterval(R.tick); R.dur = Math.min(MAX_MS, performance.now() - R.t0); try { R.mr.stop(); } catch (_) { finish(); } }
  async function finish() { ui(false); stopStream(); const blob = new Blob(R.chunks, { type: R.mime.split(';')[0] }), d = R.dur; R.chunks = []; R.state = 'idle';
    if (d < MIN_MS || blob.size < 200) { say('Hold a little longer to record.'); return; } if (blob.size > 300 * 1024) { say('That clip is too big.'); return; }
    open(false); say('Sending voice note…');
    try { const r = await fetch(`/api/voice?sid=${sid}&d=${Math.round(d)}`, { method: 'POST', headers: { 'content-type': blob.type || 'audio/webm' }, body: blob }); const j = await r.json().catch(() => ({}));
      if (r.ok && j.msg) { say(''); add(j.msg); last = j.msg.k > last ? j.msg.k : last; } else say(r.status === 429 ? 'Easy — one message every 2 seconds.' : 'Could not send. Voice notes need a stable Wi-Fi connection.'); }
    catch (_) { say('Could not send. Voice notes need a stable Wi-Fi connection.'); } }
  for (const b of [talk, mic2]) { b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); try { b.setPointerCapture(e.pointerId); } catch (_) {} start(); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => stop()); b.addEventListener('contextmenu', e => e.preventDefault());
    b.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } }); b.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') stop(); }); }
  const typing = e => { const a = document.activeElement; return /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable) || !!(a && (/INPUT|TEXTAREA|SELECT/.test(a.tagName) || a.isContentEditable)); }; // v69: T/V never steal keys from Operator / name / request inputs
  addEventListener('keydown', e => { if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'KeyV') { e.preventDefault(); if (!e.repeat) start(); } else if (e.code === 'KeyT' && !e.repeat) { e.preventDefault(); open(true); } });
  addEventListener('keyup', e => { if (e.code === 'KeyV') stop(); });
  addEventListener('blur', () => stop());
  // controller: world-gamepad.js sets window.__pttPad while LB + RB are both held
  let padWas = false; setInterval(() => { const p = !!window.__pttPad; if (p && !padWas) start(); else if (!p && padWas) stop(); padWas = p; }, 50);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else poll(); });
  poll(); schedule();
  const api = { open, close, start, stop, poll, get info() { return { me, open: !box.hidden, rows: log.children.length, rec: R.state, note: note.textContent, sid }; } };
  window.__chat = api; fx.chat = api; return api;
}
