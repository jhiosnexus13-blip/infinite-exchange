/* Shared helpers for the world chat + voice notes (netlify/functions/chat.mjs, voice.mjs); bundled into each by esbuild. */
import { getStore } from '@netlify/blobs';

export const TTL_MS = 30 * 60 * 1000, MAX_MSGS = 50, RATE_MS = 2000, MAX_TEXT = 200;
export const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const ctx = () => (process.env.CONTEXT === 'production' ? '' : '-test');
export const chatStore = () => getStore({ name: 'jhios-chat' + ctx(), consistency: 'strong' });
export const voiceStore = () => getStore({ name: 'jhios-voice' + ctx(), consistency: 'strong' });
export const okSid = s => /^[a-z0-9]{8,24}$/.test(String(s || ''));
export const sameOrigin = req => { const o = req.headers.get('origin'); if (!o) return true; try { return new URL(o).host === new URL(req.url).host; } catch { return false; } };
// anonymous handle: one-way hash of the per-tab id, never the id itself
export const handle = sid => { let a = 2166136261; for (const c of String(sid)) a = Math.imul(a ^ c.charCodeAt(0), 16777619); return 'visitor-' + ((a >>> 0) % 1679616).toString(36).padStart(4, '0'); };
export const msgKey = now => 'm/' + String(now).padStart(15, '0') + '-' + Math.random().toString(36).slice(2, 8);

// ---- safety: strip HTML, links, control chars; basic profanity / slur filter ----
const WORDS = ['fuck', 'shit', 'cunt', 'bitch', 'bastard', 'wanker', 'twat', 'dick', 'cock', 'pussy', 'slut', 'whore', 'bollocks', 'prick', 'arsehole', 'asshole', 'motherfucker',
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'spastic', 'spaz', 'paki', 'chink', 'kike', 'spic', 'wetback', 'tranny', 'gook', 'coon', 'dyke', 'raghead', 'gypo', 'pikey', 'nonce', 'rape', 'rapist', 'kys'];
const LEET = { '0': 'o', '1': 'i', '!': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't' };
const norm = w => w.toLowerCase().replace(/[01!34@5$7+]/g, c => LEET[c]).replace(/[^a-z]/g, '').replace(/(.)\1{2,}/g, '$1$1');
const bad = w => { const n = norm(w); if (!n) return false; return WORDS.some(b => n === b || n === b + 's' || n === b + 'es' || n === b + 'ed' || n === b + 'ing' || n === b + 'er' || n === b + 'ers' || (b.length >= 5 && n.includes(b))); };
export function clean(input) {
  let s = String(input || '').normalize('NFKC');
  s = s.replace(/<[^>]*>?/g, ' ');                                                  // any HTML tag (or a dangling '<...')
  s = s.replace(/[<>]/g, ' ');
  s = s.replace(/\b(?:https?|ftp|file|data|javascript|mailto):\S*/gi, ' ');
  s = s.replace(/\bwww\.\S*/gi, ' ');
  s = s.replace(/\b[\w-]+(?:\s*(?:\.|\(dot\)|\[dot\])\s*[\w-]+)*\s*(?:\.|\(dot\)|\[dot\])\s*(?:com|net|org|io|co|uk|online|xyz|ly|gg|me|tv|app|dev|info|biz|ru|cn|de|fr|link|site|shop|club|top|live|to|sh|be|us|ai)\b\S*/gi, ' ');
  s = s.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  s = s.split(' ').map(w => (bad(w) ? '*'.repeat(Math.min(6, Math.max(3, w.length))) : w)).join(' ');
  if (s.length > MAX_TEXT) s = s.slice(0, MAX_TEXT).trim();
  return s;
}

export async function rateOk(store, sid, now) { const k = 'r/' + sid, last = await store.get(k, { type: 'json' }).catch(() => null); if (last && now - last.t < RATE_MS) return false; await store.setJSON(k, { t: now }); return true; }

// newest-last list of live messages; prunes expired / overflow messages (and their voice clips) as a side effect
export async function listMsgs(store, now, prune = false) {
  const { blobs } = await store.list({ prefix: 'm/' }); const keys = blobs.map(b => b.key).sort();
  const live = [], dead = [];
  for (const k of keys) { const t = Number(k.slice(2, 17)); (now - t > TTL_MS ? dead : live).push(k); }
  while (live.length > MAX_MSGS) dead.push(live.shift());
  const vals = (await Promise.all(live.map(k => store.get(k, { type: 'json' }).then(v => v && Object.assign(v, { k: k.slice(2) })).catch(() => null)))).filter(Boolean);
  if (prune && dead.length) { const vs = voiceStore(); await Promise.all(dead.slice(0, 40).map(async k => { const v = await store.get(k, { type: 'json' }).catch(() => null); if (v && v.v) await vs.delete('a/' + v.v.id).catch(() => {}); await store.delete(k).catch(() => {}); }));
    const { blobs: rb } = await store.list({ prefix: 'r/' }); if (rb.length > 200) await Promise.all(rb.slice(0, 100).map(b => store.delete(b.key).catch(() => {}))); }
  return vals;
}
export const pub = m => ({ k: m.k, h: m.h, t: m.t, ...(m.x ? { x: m.x } : {}), ...(m.v ? { v: { id: m.v.id, d: m.v.d } } : {}) });
