/* Country-level listener counts for the JHIOS listener globe.
   GET  /listeners.json  (also /api/listeners) -> { countries: { GB: 12, ... }, updated }
   POST /api/listen  { track }                 -> counts ONE play for the caller's country.
   Privacy: only the 2-letter country code from Netlify's geo data is used. No IP address,
   user agent or track-per-person data is stored. Rate limit: a 30-minute cookie (jx_l) per
   browser session; plays inside that window are not re-counted, plus a per-country
   sanity cap per minute. Storage: Netlify Blobs store "jhios-listeners". */
import { getStore } from '@netlify/blobs';

const WINDOW_S = 30 * 60;
const MAX_PER_COUNTRY_PER_MIN = 120;
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });

export default async (req, context) => {
  const store = getStore({ name: 'jhios-listeners', consistency: 'strong' });
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const data = (await store.get('countries', { type: 'json' })) || {};
    return json({ countries: data, updated: (await store.get('updated')) || null },
      200, { 'cache-control': 'public, max-age=60' });
  }
  if (req.method !== 'POST' || !url.pathname.endsWith('/listen')) return json({ error: 'method not allowed' }, 405);

  // Same-origin only.
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== url.host) return json({ error: 'forbidden' }, 403);

  const cookie = req.headers.get('cookie') || '';
  if (/(?:^|;\s*)jx_l=1/.test(cookie)) return json({ counted: false, reason: 'rate-limited' }, 202);

  const cc = (context.geo?.country?.code || req.headers.get('x-country') || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return json({ counted: false, reason: 'no-country' }, 202);

  const minute = Math.floor(Date.now() / 60000);
  const rlKey = `rl/${cc}/${minute}`;
  const n = Number(await store.get(rlKey)) || 0;
  if (n >= MAX_PER_COUNTRY_PER_MIN) return json({ counted: false, reason: 'busy' }, 202);
  await store.set(rlKey, String(n + 1));

  // Read-modify-write; low traffic makes rare lost updates acceptable for a display counter.
  const data = (await store.get('countries', { type: 'json' })) || {};
  data[cc] = (data[cc] || 0) + 1;
  await store.setJSON('countries', data);
  await store.set('updated', new Date().toISOString());

  return json({ counted: true }, 200, {
    'set-cookie': `jx_l=1; Max-Age=${WINDOW_S}; Path=/; Secure; HttpOnly; SameSite=Lax` });
};

export const config = { path: ['/listeners.json', '/api/listeners', '/api/listen'] };
