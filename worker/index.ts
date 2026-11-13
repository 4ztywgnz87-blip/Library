import { Hono } from 'hono';
import type { SyncRecord } from '../src/types';
import { ASSETS } from './assets.gen';

export interface Env {
  DB: D1Database;
  AI_MODE?: string;
  AI_DAILY_LIMIT?: string;
  ANTHROPIC_API_KEY?: string;
}

/** Snug has one reader for now, so there is no login: everything belongs to this one library. */
const OWNER = 'library';

const app = new Hono<{ Bindings: Env }>().basePath('/api');

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
      changes.map((r) => stmt.bind(OWNER, r.kind, r.id, JSON.stringify(r.data), r.updatedAt, now, r.deleted ? 1 : 0)),
    );
  }

  const { results } = await c.env.DB.prepare(
    'SELECT kind, id, data, updated_at, deleted FROM records WHERE owner = ? AND server_ts > ?',
  )
    .bind(OWNER, since)
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
