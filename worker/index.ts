import { Hono, type Context } from 'hono';
import type { Book, SyncRecord } from '../src/types';
import type { ReaderProfile, RecommendRequest } from '../src/shared';
import { AiLimitError, aiStatus, fitCheck, identifyCover, recommend, seriesInfo } from './ai';
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

// ---------- AI ----------

async function loadLibrary(env: Env) {
  const { results } = await env.DB.prepare('SELECT kind, data FROM records WHERE owner = ? AND deleted = 0')
    .bind(OWNER)
    .all<{ kind: string; data: string }>();
  const books = results.filter((r) => r.kind === 'book').map((r) => JSON.parse(r.data) as Book);
  const profileRow = results.find((r) => r.kind === 'profile');
  return { books, profile: profileRow ? (JSON.parse(profileRow.data) as ReaderProfile) : undefined };
}

async function aiRoute<T>(c: Context<{ Bindings: Env }>, run: () => Promise<T>) {
  try {
    return c.json(await run());
  } catch (err) {
    if (err instanceof AiLimitError) return c.json({ error: err.message }, 429);
    console.error('AI error', err);
    return c.json({ error: "Snug's AI couldn't answer right now. Please try again in a moment." }, 502);
  }
}

app.get('/ai/status', async (c) => c.json(await aiStatus(c.env)));

app.post('/ai/identify', async (c) => {
  const { image, mediaType = 'image/jpeg' } = await c.req.json<{ image?: string; mediaType?: string }>();
  if (!image || image.length > 4_000_000) return c.json({ error: 'Photo missing or too large' }, 400);
  return aiRoute(c, () => identifyCover(c.env, image, mediaType));
});

app.post('/ai/recommend', async (c) => {
  const req = await c.req.json<RecommendRequest>();
  return aiRoute(c, async () => {
    const { books, profile } = await loadLibrary(c.env);
    return recommend(c.env, req, books, profile);
  });
});

app.post('/ai/fit', async (c) => {
  const book = await c.req.json<{ title?: string; author?: string; description?: string }>();
  if (!book.title || !book.author) return c.json({ error: 'Title and author required' }, 400);
  return aiRoute(c, async () => {
    const { books, profile } = await loadLibrary(c.env);
    return fitCheck(c.env, { title: book.title!, author: book.author!, description: book.description }, books, profile);
  });
});

app.post('/ai/series', async (c) => {
  const { name, author } = await c.req.json<{ name?: string; author?: string }>();
  if (!name) return c.json({ error: 'Series name required' }, 400);
  return aiRoute(c, () => seriesInfo(c.env, name, author ?? ''));
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
