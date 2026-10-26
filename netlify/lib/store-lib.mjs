/* v66: Blobs store with an in-memory fallback for local test servers (no Netlify Blobs environment). Production always uses Netlify Blobs. */
import { getStore } from '@netlify/blobs';
const ctx = () => (process.env.CONTEXT === 'production' ? '' : '-test');
const mem = new Map();
function memStore(name) { const m = mem.get(name) || mem.set(name, new Map()).get(name);
  return { local: true, async get(k, o) { const v = m.get(k); return v == null ? null : (o && o.type === 'json' ? JSON.parse(v) : v); }, async setJSON(k, v) { m.set(k, JSON.stringify(v)); }, async set(k, v) { m.set(k, String(v)); },
    async delete(k) { m.delete(k); }, async list({ prefix = '' } = {}) { return { blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }; } }; }
export function store(base) { const name = base + ctx(); try { const s = getStore({ name, consistency: 'strong' }); return s; } catch { return memStore(name); } }
// run a store op; if the Blobs environment is missing at call time (local), switch to memory
export async function withStore(base, f) { try { return await f(store(base)); } catch (e) { if (/MissingBlobsEnvironment|environment has not been configured/i.test(String(e && (e.name + e.message)))) return f(memStore(base + ctx())); throw e; } }
export const hashId = sid => { let a = 2166136261; for (const c of String(sid)) a = Math.imul(a ^ c.charCodeAt(0), 16777619); return ((a >>> 0) % 2176782336).toString(36).padStart(6, '0'); };
export async function rate(s, key, ms, now) { const last = await s.get('r/' + key, { type: 'json' }).catch(() => null); if (last && now - last.t < ms) return false; await s.setJSON('r/' + key, { t: now }); return true; }
