/* v66 world request box: visitors suggest a world feature for Joseph to review. Stored only (never auto-built, never shown publicly).
   POST /api/requests { sid, text }  -> { ok } | { error }   text through the chat filter, 4-200 chars, 1 per 60 s per visitor id
   GET  /api/requests                -> { count }            (no contents; review in the Netlify Blobs store "jhios-requests")
   Stored: key q/<time>-<hash of visitor id>, value { t, x, name? }. No IPs, user agents or locations. */
import { json, okSid, sameOrigin, clean } from '../lib/chat-lib.mjs';
import { withStore, hashId, rate } from '../lib/store-lib.mjs';
export default async (req) => withStore('jhios-requests', async s => {
  const now = Date.now();
  if (req.method === 'GET') return json({ count: (await s.list({ prefix: 'q/' })).blobs.length });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  const raw = await req.text(); if (raw.length > 1500) return json({ error: 'too large' }, 413);
  let b; try { b = JSON.parse(raw); } catch { return json({ error: 'bad json' }, 400); }
  if (!okSid(b.sid)) return json({ error: 'bad sid' }, 400);
  let x = String(b.text || '').slice(0, 600); x = clean(x.replace(/\s+/g, ' ')); // clean() caps at 200; requests keep up to 200 chars after filtering
  if (x.length < 4) return json({ error: 'too short' }, 400);
  const h = hashId(b.sid); if (!(await rate(s, 'q' + h, 60000, now))) return json({ error: 'one request a minute' }, 429);
  const name = b.name ? clean(String(b.name)).slice(0, 24) : null;
  await s.setJSON('q/' + String(now).padStart(15, '0') + '-' + h, { t: now, x, ...(name ? { name } : {}) }); return json({ ok: true });
});
export const config = { path: '/api/requests' };
