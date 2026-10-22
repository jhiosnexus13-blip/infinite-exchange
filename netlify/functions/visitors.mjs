/* All-time visitor counter for the 3D world (/world).
   GET  /api/visitors           -> { total }
   POST /api/visitors { vid }   -> { total, counted }   (called once per browser, on its first visit)
   Privacy: vid is a random id the page keeps in localStorage (separate from the per-tab presence id). It is only used
   to avoid double counting; nothing else is stored: no IP, user agent, cookie or location.
   Deploy context: only production counts. Deploy previews / branch deploys / netlify dev write to a separate test store.
   Starts at 0 (no seed). Increments use conditional writes (ETag) with retry, so concurrent visits are not lost. */
import { getStore } from '@netlify/blobs';

const json = (b, s = 200, cc = 'no-store') => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cc } });

const storeFor = () => getStore({ name: process.env.CONTEXT === 'production' ? 'jhios-visitors' : 'jhios-visitors-test', consistency: 'strong' });

async function readTotal(store) {
  const r = await store.getWithMetadata('total', { type: 'json' });
  return r ? { n: Number(r.data && r.data.n) || 0, etag: r.etag } : { n: 0, etag: null };
}

export default async (req) => {
  const store = storeFor();
  if (req.method === 'GET') return json({ total: (await readTotal(store)).n }, 200, 'public, max-age=30');
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const url = new URL(req.url), origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== url.host) return json({ error: 'forbidden' }, 403);
  const raw = await req.text(); if (raw.length > 120) return json({ error: 'too large' }, 413);
  let b; try { b = JSON.parse(raw); } catch { return json({ error: 'bad json' }, 400); }
  const vid = String(b.vid || ''); if (!/^[a-z0-9]{12,32}$/.test(vid)) return json({ error: 'bad vid' }, 400);

  // one count per browser id: the marker write only succeeds if this id is new
  const mark = await store.set('v/' + vid, '1', { onlyIfNew: true });
  if (!mark.modified) return json({ total: (await readTotal(store)).n, counted: false });

  for (let i = 0; i < 8; i++) {
    const { n, etag } = await readTotal(store);
    const r = await store.setJSON('total', { n: n + 1 }, etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
    if (r.modified) return json({ total: n + 1, counted: true });
    await new Promise(res => setTimeout(res, 20 + Math.random() * 60 * (i + 1)));
  }
  return json({ total: (await readTotal(store)).n, counted: false, reason: 'busy' }, 202);
};

export const config = { path: ['/api/visitors'] };
