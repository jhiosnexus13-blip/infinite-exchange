/* v66 globe name-tag list ("infinite name list"). Display names only, real names never required.
   GET    /api/names?q=<search>&sid=<id>  -> { total, names: [{ n, t, mine? }] (newest first, max 300), mine }
   POST   /api/names { sid, name }        -> { ok, name } | { error }   one name per visitor id (re-posting replaces it), 1 change / 20 s
   DELETE /api/names { sid }              -> { ok }                     removes your own name
   Stored per name: key n/<one-way hash of the visitor id>/<url-encoded name>, value { t }. No IPs, user agents or locations.
   Names go through the chat filter (HTML/links/control chars stripped, profanity/slurs starred) and must be 2-24 letters/digits/space . _ - */
import { json, okSid, sameOrigin, clean } from '../lib/chat-lib.mjs';
import { withStore, hashId, rate } from '../lib/store-lib.mjs';
const OK = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{1,23}$/u;
const parse = k => { const [, h, n] = k.split('/'); let name = n; try { name = decodeURIComponent(n); } catch {} return { h, n: name }; };
export default async (req) => withStore('jhios-names', async s => {
  const now = Date.now(), url = new URL(req.url);
  if (req.method === 'GET') { const q = (url.searchParams.get('q') || '').toLowerCase().slice(0, 24), sid = url.searchParams.get('sid'), me = okSid(sid) ? hashId(sid) : null;
    const { blobs } = await s.list({ prefix: 'n/' }); const all = blobs.map(b => parse(b.key)); const hits = q ? all.filter(x => x.n.toLowerCase().includes(q)) : all;
    const mine = me ? (all.find(x => x.h === me) || {}).n || null : null;
    return json({ total: all.length, names: hits.slice(-300).reverse().map(x => ({ n: x.n, ...(x.h === me ? { mine: true } : {}) })), mine }); }
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  const raw = await req.text(); if (raw.length > 400) return json({ error: 'too large' }, 413);
  let b; try { b = JSON.parse(raw); } catch { return json({ error: 'bad json' }, 400); }
  if (!okSid(b.sid)) return json({ error: 'bad sid' }, 400); const h = hashId(b.sid);
  const own = async () => (await s.list({ prefix: 'n/' + h + '/' })).blobs;
  if (req.method === 'DELETE') { for (const x of await own()) await s.delete(x.key); return json({ ok: true }); }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const name = clean(b.name).trim(); if (!OK.test(name) || name.includes('*')) return json({ error: 'use 2-24 letters, numbers, spaces, . _ - (no links or bad words)' }, 400);
  if (!(await rate(s, 'n' + h, 20000, now))) return json({ error: 'slow down' }, 429);
  for (const x of await own()) await s.delete(x.key);
  await s.setJSON('n/' + h + '/' + encodeURIComponent(name), { t: now }); return json({ ok: true, name });
});
export const config = { path: '/api/names' };
