/* Member signups for the 3D world.
   POST /api/members { name?, message?, email } -> { ok: true }
   Stores in Blobs. Does not email on every signup (avoids flooding).
   GET /api/members (with a simple key later) can list them.
*/
import { getStore } from '@netlify/blobs';

const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const storeFor = () => getStore({ name: process.env.CONTEXT === 'production' ? 'jhios-members' : 'jhios-members-test', consistency: 'strong' });

export default async (req) => {
  const store = storeFor();
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const url = new URL(req.url), origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== url.host) return json({ error: 'forbidden' }, 403);
  const raw = await req.text(); if (raw.length > 800) return json({ error: 'too large' }, 413);
  let b; try { b = JSON.parse(raw); } catch { return json({ error: 'bad json' }, 400); }
  const email = String(b.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'bad email' }, 400);
  const name = String(b.name || '').trim().slice(0, 60);
  const message = String(b.message || '').trim().slice(0, 200);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  await store.setJSON('m/' + id, { id, email, name, message, t: Date.now() });
  return json({ ok: true });
};

export const config = { path: ['/api/members'] };
