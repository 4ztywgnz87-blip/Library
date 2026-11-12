import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { SyncRecord } from '../src/types';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ALLOWED_EMAIL: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  AI_MODE?: string;
  AI_DAILY_LIMIT?: string;
  ANTHROPIC_API_KEY?: string;
}

type Vars = { email: string };

const SESSION_COOKIE = 'snug_session';
const SESSION_DAYS = 365;
const LOGIN_LINK_MINUTES = 30;

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

async function sendLoginMail(env: Env, to: string, link: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    // Development / no mail provider: show the link in the server log
    console.log(`\n✉️  Login link for ${to}:\n${link}\n`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM || 'Snug <onboarding@resend.dev>',
      to,
      subject: 'Your Snug login link 📚',
      html: `<div style="font-family:Georgia,serif;background:#F6EFE6;padding:32px;color:#3B2A22">
        <h2 style="margin:0 0 12px">Welcome back to Snug</h2>
        <p>Tap the button to open your library. The link works for ${LOGIN_LINK_MINUTES} minutes.</p>
        <p><a href="${link}" style="display:inline-block;background:#7A2E3A;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none">Open Snug</a></p>
      </div>`,
    }),
  });
  if (!res.ok) throw new Error(`Mail failed: ${res.status} ${await res.text()}`);
}

// ---------- auth ----------

app.post('/auth/request', async (c) => {
  const { email } = await c.req.json<{ email?: string }>();
  if (!email) return c.json({ error: 'Email required' }, 400);
  const allowed = (c.env.ALLOWED_EMAIL || '').split(',').map(normEmail).filter(Boolean);

  // Always answer the same, so the endpoint doesn't reveal which emails are allowed
  if (allowed.includes(normEmail(email))) {
    const token = randomToken();
    await c.env.DB.prepare('INSERT INTO login_tokens (token_hash, email, expires_at) VALUES (?, ?, ?)')
      .bind(await sha256(token), normEmail(email), Date.now() + LOGIN_LINK_MINUTES * 60_000)
      .run();
    const origin = c.req.header('origin') || new URL(c.req.url).origin;
    await sendLoginMail(c.env, normEmail(email), `${origin}/api/auth/verify?token=${token}`);
  }
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
  const sessionId = randomToken();
  const now = Date.now();
  await c.env.DB.prepare('INSERT INTO sessions (id_hash, email, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(sessionId), row.email, now, now + SESSION_DAYS * 86_400_000)
    .run();

  setCookie(c, SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_DAYS * 86_400,
  });
  return c.redirect('/');
});

// Everything below requires a session
app.use('/*', async (c, next) => {
  if (c.req.path.startsWith('/api/auth/request') || c.req.path.startsWith('/api/auth/verify')) return next();
  const sid = getCookie(c, SESSION_COOKIE);
  if (!sid) return c.json({ error: 'Not logged in' }, 401);
  const row = await c.env.DB.prepare('SELECT email, expires_at FROM sessions WHERE id_hash = ?')
    .bind(await sha256(sid))
    .first<{ email: string; expires_at: number }>();
  if (!row || row.expires_at < Date.now()) return c.json({ error: 'Not logged in' }, 401);
  c.set('email', row.email);
  await next();
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
      `INSERT INTO records (kind, id, data, updated_at, server_ts, deleted) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (kind, id) DO UPDATE SET
         data = excluded.data, updated_at = excluded.updated_at,
         server_ts = excluded.server_ts, deleted = excluded.deleted
       WHERE excluded.updated_at > records.updated_at`,
    );
    await c.env.DB.batch(
      changes.map((r) => stmt.bind(r.kind, r.id, JSON.stringify(r.data), r.updatedAt, now, r.deleted ? 1 : 0)),
    );
  }

  const { results } = await c.env.DB.prepare(
    'SELECT kind, id, data, updated_at, deleted FROM records WHERE server_ts > ?',
  )
    .bind(since)
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

export default app;
