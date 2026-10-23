/* World voice notes (Messenger-style: hold to record, release to send; no live audio, no WebRTC).
   POST /api/voice?sid=<id>&d=<ms>  body = the recorded clip (audio/webm;opus or audio/mp4), max 300 KB, max 15 s
        -> { ok, msg }  and the note appears in the chat list (chat.mjs) as { h, t, v: { id, d } }
   GET  /api/voice?id=<id>          -> the clip bytes with their audio content-type
   Same safety as the chat: anonymous 'visitor-xxxx' handle, one post per 2 s per id (shared with text), same-origin only,
   clips expire with their chat message (30 min / newest 50). No IPs, user agents or locations stored. */
import { json, chatStore, voiceStore, okSid, sameOrigin, handle, msgKey, rateOk, listMsgs, pub } from '../lib/chat-lib.mjs';

const MAX_BYTES = 300 * 1024, MAX_MS = 15500, TYPES = /^audio\/(webm|mp4|ogg|aac|mpeg|x-m4a)(;.*)?$/i;
export default async (req) => {
  const url = new URL(req.url), now = Date.now();
  if (req.method === 'GET') { const id = url.searchParams.get('id') || ''; if (!/^[a-z0-9]{10,24}$/.test(id)) return json({ error: 'bad id' }, 400);
    const r = await voiceStore().getWithMetadata('a/' + id, { type: 'arrayBuffer' }).catch(() => null);
    if (!r || !r.data || now - (r.metadata?.t || 0) > 31 * 60 * 1000) return json({ error: 'gone' }, 404);
    return new Response(r.data, { status: 200, headers: { 'content-type': r.metadata?.mime || 'audio/webm', 'cache-control': 'private, max-age=1800', 'content-length': String(r.data.byteLength) } }); }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  const sid = url.searchParams.get('sid'); if (!okSid(sid)) return json({ error: 'bad sid' }, 400);
  const mime = String(req.headers.get('content-type') || ''); if (!TYPES.test(mime)) return json({ error: 'bad type' }, 415);
  if (Number(req.headers.get('content-length') || 0) > MAX_BYTES) return json({ error: 'too large' }, 413);
  const buf = await req.arrayBuffer(); if (buf.byteLength > MAX_BYTES) return json({ error: 'too large' }, 413); if (buf.byteLength < 200) return json({ error: 'empty' }, 400);
  const d = Math.max(300, Math.min(MAX_MS, Math.round(Number(url.searchParams.get('d')) || 0)));
  const store = chatStore(); if (!(await rateOk(store, sid, now))) return json({ error: 'slow down' }, 429);
  const id = now.toString(36) + Math.random().toString(36).slice(2, 10);
  await voiceStore().set('a/' + id, buf, { metadata: { mime: mime.split(';')[0], t: now } });
  const k = msgKey(now), m = { h: handle(sid), t: now, v: { id, d } }; await store.setJSON(k, m);
  await listMsgs(store, now, true);
  return json({ ok: true, msg: pub(Object.assign(m, { k: k.slice(2) })) });
};
export const config = { path: '/api/voice' };
