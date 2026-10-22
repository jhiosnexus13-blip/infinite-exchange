/* Live presence for the 3D world (/world).
   POST /api/presence { sid, x, z, h }  -> { count, others: [[x, z, h, tag], ...] }  (h = heading in rad, tag = short one-way hash of the sid, for smoothing only)   (count = other visitors seen in the last 20 s)
   Privacy: sid is a random id the page makes per tab (not a cookie, not linked to anything); x/z are rounded 3D-world
   coordinates only. No names, IP addresses, user agents or real-world location are stored. One small blob per session
   in store "jhios-presence", pruned once stale (> 20 s). Max 50 positions returned; body capped at 200 bytes. */
import { getStore } from '@netlify/blobs';

const STALE_MS = 20000, MAX_OUT = 50, MAX_SCAN = 120;
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const tag = k => { let a = 2166136261; for (const c of k) a = Math.imul(a ^ c.charCodeAt(0), 16777619); return (a >>> 0).toString(36).slice(0, 5); };

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const url = new URL(req.url), origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== url.host) return json({ error: 'forbidden' }, 403);
  const raw = await req.text(); if (raw.length > 200) return json({ error: 'too large' }, 413);
  let b; try { b = JSON.parse(raw); } catch { return json({ error: 'bad json' }, 400); }
  const sid = String(b.sid || ''); if (!/^[a-z0-9]{8,24}$/.test(sid)) return json({ error: 'bad sid' }, 400);
  const x = Math.round(Math.max(-5000, Math.min(5000, Number(b.x) || 0))), z = Math.round(Math.max(-5000, Math.min(5000, Number(b.z) || 0)));
  const h = Math.round((Number(b.h) || 0) * 10) / 10;
  const store = getStore('jhios-presence'), now = Date.now();
  await store.setJSON('s/' + sid, { x, z, h, t: now });
  const { blobs } = await store.list({ prefix: 's/' });
  const keys = blobs.map(k => k.key).filter(k => k !== 's/' + sid).slice(0, MAX_SCAN);
  const vals = await Promise.all(keys.map(k => store.get(k, { type: 'json' }).then(v => [k, v]).catch(() => [k, null])));
  const others = [], stale = [];
  for (const [k, v] of vals) { if (!v || now - v.t > STALE_MS) stale.push(k); else if (others.length < MAX_OUT) others.push([v.x, v.z, v.h || 0, tag(k)]); }
  if (stale.length) await Promise.all(stale.slice(0, 25).map(k => store.delete(k).catch(() => {})));
  if (b.bye) await store.delete('s/' + sid).catch(() => {});
  return json({ count: others.length, others });
};

export const config = { path: '/api/presence' };
