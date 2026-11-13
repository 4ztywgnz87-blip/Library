import { Hono, type Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { SyncRecord } from '../src/types';
import { ASSETS } from './assets.gen';

export interface Env {
  DB: D1Database;
  ALLOWED_EMAIL: string;
  RESEND_API_KEY?: string;
  BREVO_API_KEY?: string;
  MAIL_FROM?: string;
  AI_MODE?: string;
  AI_DAILY_LIMIT?: string;
  ANTHROPIC_API_KEY?: string;
}

type Vars = { email: string };

const SESSION_COOKIE = 'snug_session';
const SESSION_DAYS = 365;
const LOGIN_MINUTES = 15;

const app = new Hono<{ Bindings: Env; Variables: Vars }>().basePath('/api');

// ---------- helpers ----------

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const normEmail = (e: string) => e.trim().toLowerCase();

function randomCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, '0');
}

const hasMail = (env: Env) => !!(env.BREVO_API_KEY || env.RESEND_API_KEY);

function mailHtml(code: string, link: string) {
  return `<div style="font-family:Georgia,serif;background:#F6EFE6;padding:32px;color:#3B2A22;text-align:center">
    <h2 style="margin:0 0 8px">Your Snug login code</h2>
    <p style="margin:0 0 20px;color:#7A6455">Type this code in the app. It works for ${LOGIN_MINUTES} minutes.</p>
    <div style="font-size:36px;letter-spacing:10px;font-weight:bold;background:#fff;border-radius:16px;padding:16px 8px;display:inline-block;min-width:240px">${code}</div>
    <p style="margin:28px 0 8px;color:#7A6455;font-size:14px">Or open Snug in your browser:</p>
    <p><a href="${link}" style="display:inline-block;background:#7A2E3A;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-family:Arial,sans-serif">Open Snug</a></p>
  </div>`;
}

async function sendLoginMail(env: Env, to: string, code: string, link: string): Promise<void> {
  const subject = `${code} is your Snug login code 📚`;
  const html = mailHtml(code, link);
  if (env.BREVO_API_KEY) {
    // Brevo: free, only needs a verified sender address (no own domain)
    const from = env.MAIL_FROM || '';
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ sender: { name: 'Snug', email: from }, to: [{ email: to }], subject, htmlContent: html }),
    });
    if (!res.ok) throw new Error(`Mail failed: ${res.status} ${await res.text()}`);
    return;
  }
  if (env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM || 'Snug <onboarding@resend.dev>', to, subject, html }),
    });
    if (!res.ok) throw new Error(`Mail failed: ${res.status} ${await res.text()}`);
    return;
  }
  // Development / no mail provider: show it in the server log
  console.log(`\n✉️  Login for ${to}: code ${code}\n${link}\n`);
}

async function startSession(c: Context<{ Bindings: Env; Variables: Vars }>, email: string) {
  const sessionId = randomToken();
  const now = Date.now();
  await c.env.DB.prepare('INSERT INTO sessions (id_hash, email, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(sessionId), email, now, now + SESSION_DAYS * 86_400_000)
    .run();
  setCookie(c, SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_DAYS * 86_400,
  });
}

// ---------- password ----------

const PBKDF2_ITERATIONS = 100_000;
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return ['pbkdf2', PBKDF2_ITERATIONS, b64(salt), b64(hash)].join(':');
}

async function checkPassword(password: string, stored: string) {
  const [, iter, salt, hash] = stored.split(':');
  const got = await pbkdf2(password, unb64(salt), Number(iter));
  const want = unb64(hash);
  let diff = got.length ^ want.length;
  for (let i = 0; i < Math.min(got.length, want.length); i++) diff |= got[i] ^ want[i];
  return diff === 0;
}

async function getPasswordHash(env: Env) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'password'").first<{ value: string }>();
  return row?.value;
}

// ---------- auth ----------

app.get('/auth/status', async (c) => c.json({ hasPassword: !!(await getPasswordHash(c.env)) }));

app.post('/auth/login', async (c) => {
  const { password } = await c.req.json<{ password?: string }>();
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
  const now = Date.now();

  // At most 10 wrong tries per 15 minutes per connection, against guessing
  const tries = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND ts > ?')
    .bind(ip, now - 15 * 60_000)
    .first<{ n: number }>();
  if ((tries?.n ?? 0) >= 10) return c.json({ error: 'Too many tries. Wait 15 minutes.' }, 429);

  const stored = await getPasswordHash(c.env);
  if (!stored || !password || !(await checkPassword(password, stored))) {
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO login_attempts (ip, ts) VALUES (?, ?)').bind(ip, now),
      c.env.DB.prepare('DELETE FROM login_attempts WHERE ts < ?').bind(now - 86_400_000),
    ]);
    return c.json({ error: 'That password is not right.' }, 400);
  }
  const owner = (c.env.ALLOWED_EMAIL || '').split(',').map(normEmail).filter(Boolean)[0];
  if (!owner) return c.json({ error: 'No reader configured' }, 500);
  await startSession(c, owner);
  return c.json({ ok: true });
});

app.post('/auth/request', async (c) => {
  const { email } = await c.req.json<{ email?: string }>();
  if (!email) return c.json({ error: 'Email required' }, 400);
  const to = normEmail(email);
  const allowed = (c.env.ALLOWED_EMAIL || '').split(',').map(normEmail).filter(Boolean);

  // Always answer the same, so the endpoint doesn't reveal which emails are allowed
  if (allowed.includes(to)) {
    const now = Date.now();
    const recent = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM login_tokens WHERE email = ? AND created_at > ?')
      .bind(to, now - 15 * 60_000)
      .first<{ n: number }>();
    if ((recent?.n ?? 0) >= 5) return c.json({ error: 'Too many tries, wait a few minutes' }, 429);

    const token = randomToken();
    const code = randomCode();
    await c.env.DB.prepare(
      'INSERT INTO login_tokens (token_hash, email, expires_at, code_hash, created_at) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(await sha256(token), to, now + LOGIN_MINUTES * 60_000, await sha256(`${to}:${code}`), now)
      .run();
    const origin = c.req.header('origin') || new URL(c.req.url).origin;
    await sendLoginMail(c.env, to, code, `${origin}/api/auth/verify?token=${token}`);
  }
  return c.json({ ok: true, mail: hasMail(c.env) });
});

app.post('/auth/code', async (c) => {
  const { email, code } = await c.req.json<{ email?: string; code?: string }>();
  if (!email || !code) return c.json({ error: 'Email and code required' }, 400);
  const to = normEmail(email);
  const row = await c.env.DB.prepare(
    `SELECT token_hash, code_hash, attempts FROM login_tokens
     WHERE email = ? AND used = 0 AND expires_at > ? AND code_hash IS NOT NULL
     ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(to, Date.now())
    .first<{ token_hash: string; code_hash: string; attempts: number }>();
  if (!row || row.attempts >= 5) return c.json({ error: 'This code has expired. Ask for a new one.' }, 400);

  if ((await sha256(`${to}:${code.replace(/\D/g, '')}`)) !== row.code_hash) {
    await c.env.DB.prepare('UPDATE login_tokens SET attempts = attempts + 1 WHERE token_hash = ?').bind(row.token_hash).run();
    return c.json({ error: 'That code is not right. Try again.' }, 400);
  }
  await c.env.DB.prepare('UPDATE login_tokens SET used = 1 WHERE token_hash = ?').bind(row.token_hash).run();
  await startSession(c, to);
  return c.json({ ok: true });
});

app.get('/auth/verify', async (c) => {
  const token = c.req.query('token');
  if (!token) return c.redirect('/login?error=missing');
  const hash = await sha256(token);
  const row = await c.env.DB.prepare('SELECT email, expires_at, used FROM login_tokens WHERE token_hash = ?')
    .bind(hash)
    .first<{ email: string; expires_at: number; used: number }>();
  if (!row || row.used || row.expires_at < Date.now()) return c.redirect('/login?error=expired');

  await c.env.DB.prepare('UPDATE login_tokens SET used = 1 WHERE token_hash = ?').bind(hash).run();
  await startSession(c, row.email);
  return c.redirect('/');
});

// Same as opening the link, but pasted inside the app (iPhone home-screen apps can't open links themselves)
app.post('/auth/link', async (c) => {
  const { token } = await c.req.json<{ token?: string }>();
  if (!token) return c.json({ error: 'No link' }, 400);
  const hash = await sha256(token);
  const row = await c.env.DB.prepare('SELECT email, expires_at, used FROM login_tokens WHERE token_hash = ?')
    .bind(hash)
    .first<{ email: string; expires_at: number; used: number }>();
  if (!row || row.used || row.expires_at < Date.now()) {
    return c.json({ error: 'This link was already used or has expired.' }, 400);
  }
  await c.env.DB.prepare('UPDATE login_tokens SET used = 1 WHERE token_hash = ?').bind(hash).run();
  await startSession(c, row.email);
  return c.json({ ok: true });
});

// Everything below requires a session
app.use('/*', async (c, next) => {
  if (['/api/auth/request', '/api/auth/verify', '/api/auth/code', '/api/auth/link', '/api/auth/status', '/api/auth/login'].includes(c.req.path)) return next();
  const sid = getCookie(c, SESSION_COOKIE);
  if (!sid) return c.json({ error: 'Not logged in' }, 401);
  const row = await c.env.DB.prepare('SELECT email, expires_at FROM sessions WHERE id_hash = ?')
    .bind(await sha256(sid))
    .first<{ email: string; expires_at: number }>();
  if (!row || row.expires_at < Date.now()) return c.json({ error: 'Not logged in' }, 401);
  c.set('email', row.email);

  // Sliding session: using the app keeps you logged in (renewed at most once a week)
  const fullExpiry = Date.now() + SESSION_DAYS * 86_400_000;
  if (fullExpiry - row.expires_at > 7 * 86_400_000) {
    await c.env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE id_hash = ?').bind(fullExpiry, await sha256(sid)).run();
    setCookie(c, SESSION_COOKIE, sid, {
      httpOnly: true,
      secure: new URL(c.req.url).protocol === 'https:',
      sameSite: 'Lax',
      path: '/',
      maxAge: SESSION_DAYS * 86_400,
    });
  }
  await next();
});

// A logged-in reader can create a login link for another allowed address
// (useful when the mail service can only reach her inbox). Valid for 7 days, works once.
app.post('/auth/invite', async (c) => {
  const { email } = await c.req.json<{ email?: string }>();
  const allowed = (c.env.ALLOWED_EMAIL || '').split(',').map(normEmail).filter(Boolean);
  if (!email || !allowed.includes(normEmail(email))) {
    return c.json({ error: 'This address is not on the list of allowed readers' }, 400);
  }
  const token = randomToken();
  await c.env.DB.prepare('INSERT INTO login_tokens (token_hash, email, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256(token), normEmail(email), Date.now() + 7 * 86_400_000)
    .run();
  return c.json({ link: `${new URL(c.req.url).origin}/api/auth/verify?token=${token}` });
});

app.post('/auth/password', async (c) => {
  const { password } = await c.req.json<{ password?: string }>();
  if (!password || password.length < 6) return c.json({ error: 'Use at least 6 characters.' }, 400);
  await c.env.DB.prepare(
    "INSERT INTO settings (key, value) VALUES ('password', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
  )
    .bind(await hashPassword(password))
    .run();
  return c.json({ ok: true });
});

app.get('/auth/me', (c) => c.json({ email: c.get('email') }));

app.post('/auth/logout', async (c) => {
  const sid = getCookie(c, SESSION_COOKIE);
  if (sid) await c.env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(await sha256(sid)).run();
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

// ---------- sync ----------
// The app keeps everything locally (works offline) and calls this to exchange changes.

app.post('/sync', async (c) => {
  const { since = 0, changes = [] } = await c.req.json<{ since?: number; changes?: SyncRecord[] }>();
  const now = Date.now();

  if (changes.length) {
    const stmt = c.env.DB.prepare(
      `INSERT INTO records (owner, kind, id, data, updated_at, server_ts, deleted) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (owner, kind, id) DO UPDATE SET
         data = excluded.data, updated_at = excluded.updated_at,
         server_ts = excluded.server_ts, deleted = excluded.deleted
       WHERE excluded.updated_at > records.updated_at`,
    );
    await c.env.DB.batch(
      changes.map((r) => stmt.bind(c.get('email'), r.kind, r.id, JSON.stringify(r.data), r.updatedAt, now, r.deleted ? 1 : 0)),
    );
  }

  const { results } = await c.env.DB.prepare(
    'SELECT kind, id, data, updated_at, deleted FROM records WHERE owner = ? AND server_ts > ?',
  )
    .bind(c.get('email'), since)
    .all<{ kind: SyncRecord['kind']; id: string; data: string; updated_at: number; deleted: number }>();

  const records: SyncRecord[] = results.map((r) => ({
    kind: r.kind,
    id: r.id,
    data: JSON.parse(r.data),
    updatedAt: r.updated_at,
    deleted: !!r.deleted,
  }));
  // Cursor is the time *before* this sync wrote, so nothing written concurrently is missed
  return c.json({ now: now - 1, records });
});

// ---------- book info ----------
// Open Library details (longer descriptions), fetched server-side to avoid browser CORS hiccups

app.get('/ol', async (c) => {
  const path = c.req.query('path') ?? '';
  if (!/^\/(works|books)\/OL\d+[WM]$/.test(path)) return c.json({ error: 'Bad path' }, 400);
  const res = await fetch(`https://openlibrary.org${path}.json`, {
    headers: { 'User-Agent': 'Snug personal library app' },
    cf: { cacheTtl: 86_400, cacheEverything: true },
  });
  if (!res.ok) return c.json({ error: 'Not found' }, 404);
  const json = (await res.json()) as { description?: string | { value: string } };
  const d = json.description;
  return c.json({ description: typeof d === 'string' ? d : d?.value });
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));

// ---------- the app itself ----------
// The built app is embedded in this Worker (see scripts/embed-assets.mjs).

const decoded = new Map<string, Uint8Array>();
function asset(path: string) {
  const a = ASSETS[path];
  if (!a) return undefined;
  let bytes = decoded.get(path);
  if (!bytes) {
    bytes = Uint8Array.from(atob(a.body), (ch) => ch.charCodeAt(0));
    decoded.set(path, bytes);
  }
  return { type: a.type, bytes };
}

function serveStatic(req: Request): Response {
  const { pathname } = new URL(req.url);
  // Unknown paths are app routes (/library, /book/…): serve the app shell
  const path = ASSETS[pathname] ? pathname : '/index.html';
  const a = asset(path)!;
  const immutable = path.startsWith('/assets/');
  return new Response(a.bytes, {
    headers: {
      'Content-Type': a.type,
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    },
  });
}

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext) {
    const { pathname } = new URL(req.url);
    if (pathname.startsWith('/api/')) return app.fetch(req, env, ctx);
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
    return serveStatic(req);
  },
} satisfies ExportedHandler<Env>;
