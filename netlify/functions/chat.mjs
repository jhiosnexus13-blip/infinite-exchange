/* World text chat (+ the list that carries voice notes, see voice.mjs).
   GET  /api/chat?since=<k>       -> { msgs: [{ k, h, t, x? , v?: { id, d } }], me? }  newest last, max 50, last 30 min
   POST /api/chat { sid, text }   -> { ok, msg } | { error }
   Privacy / safety: anonymous handles ('visitor-xxxx', a one-way hash of a random per-tab id); no IPs, user agents or
   locations stored. Text is stripped of HTML, links and control characters, capped at 200 chars, profanity / slur filtered,
   and rate limited to one message per 2 s per id. Store "jhios-chat" (production) / "jhios-chat-test" (previews, netlify dev). */
import { json, chatStore, okSid, sameOrigin, handle, msgKey, clean, rateOk, listMsgs, pub } from '../lib/chat-lib.mjs';

export default async (req) => {
  const store = chatStore(), now = Date.now(), url = new URL(req.url);
  if (req.method === 'GET') { const since = url.searchParams.get('since') || '', sid = url.searchParams.get('sid');
    const msgs = (await listMsgs(store, now)).filter(m => !since || m.k > since).map(pub);
    return json({ msgs, ...(okSid(sid) ? { me: handle(sid) } : {}) }); }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  const raw = await req.text(); if (raw.length > 1200) return json({ error: 'too large' }, 413);
  let b; try { b = JSON.parse(raw); } catch { return json({ error: 'bad json' }, 400); }
  if (!okSid(b.sid)) return json({ error: 'bad sid' }, 400);
  const x = clean(b.text); if (!x || /^\**$/.test(x.replace(/\s/g, ''))) return json({ error: 'empty' }, 400);
  if (!(await rateOk(store, b.sid, now))) return json({ error: 'slow down' }, 429);
  const k = msgKey(now), m = { h: handle(b.sid), t: now, x }; await store.setJSON(k, m);
  await listMsgs(store, now, true);
  return json({ ok: true, msg: pub(Object.assign(m, { k: k.slice(2) })) });
};
export const config = { path: '/api/chat' };
