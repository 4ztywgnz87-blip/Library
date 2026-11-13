import { Hono, type Context } from 'hono';
import type { Book, SyncRecord } from '../src/types';
import type { ReaderProfile, RecommendRequest } from '../src/shared';
import { AiLimitError, aiStatus, findCoverCorners, fitCheck, identifyCover, recommend, seriesInfo } from './ai';
import { ASSETS } from './assets.gen';
import { findBookSeries, seriesParts } from './series';

export interface Env {
  DB: D1Database;
  AI_MODE?: string;
  AI_DAILY_LIMIT?: string;
  ANTHROPIC_API_KEY?: string;
  /** Optional: gives Google Books its own quota */
  GOOGLE_BOOKS_KEY?: string;
}

/** Snug has one reader for now, so there is no login: everything belongs to this one library. */
const OWNER = 'library';

const app = new Hono<{ Bindings: Env }>().basePath('/api');

// ---------- sync ----------
// The app keeps everything locally (works offline) and calls this to exchange changes.

app.post('/sync', async (c) => {
  const { since = 0, changes = [] } = await c.req.json<{
    since?: number;
    changes?: SyncRecord[];
  }>();
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
    .all<{
      kind: SyncRecord['kind'];
      id: string;
      data: string;
      updated_at: number;
      deleted: number;
    }>();

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
  const json = (await res.json()) as {
    description?: string | { value: string };
  };
  const d = json.description;
  return c.json({ description: typeof d === 'string' ? d : d?.value });
});

// Covers of all editions of a book (for special editions), from Open Library
app.get('/editions', async (c) => {
  const title = c.req.query('title') ?? '';
  const author = c.req.query('author') ?? '';
  if (!title) return c.json({ covers: [] });
  const ua = { 'User-Agent': 'Snug personal library app' };
  const search = await fetch(
    `https://openlibrary.org/search.json?${new URLSearchParams({ title, author, limit: '3', fields: 'key' })}`,
    { headers: ua, cf: { cacheTtl: 86_400, cacheEverything: true } },
  );
  if (!search.ok) return c.json({ covers: [] });
  const works = ((await search.json()) as { docs: { key: string }[] }).docs.map((d) => d.key).slice(0, 2);
  const covers: { id: number; label: string }[] = [];
  for (const work of works) {
    const res = await fetch(`https://openlibrary.org${work}/editions.json?limit=150`, {
      headers: ua,
      cf: { cacheTtl: 86_400, cacheEverything: true },
    });
    if (!res.ok) continue;
    const json = (await res.json()) as {
      entries: {
        title?: string;
        covers?: number[];
        publishers?: string[];
        publish_date?: string;
        languages?: { key: string }[];
      }[];
    };
    const norm = (t = '') => t.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const e of json.entries) {
      // Only English and Dutch editions. Without language info, keep it only if the title
      // is the original one (translations have another title).
      const langs = (e.languages ?? []).map((l) => l.key.split('/').pop());
      const ok = langs.length ? langs.some((l) => l === 'eng' || l === 'dut') : norm(e.title).startsWith(norm(title));
      if (!ok) continue;
      for (const id of e.covers ?? []) {
        if (id > 0 && !covers.some((x) => x.id === id)) {
          covers.push({
            id,
            label: [e.publishers?.[0], e.publish_date].filter(Boolean).join(' · '),
          });
        }
      }
    }
  }
  return c.json({ covers: covers.slice(0, 80) });
});

// ---------- series (free, from Open Library) ----------

/** Which series a book belongs to, and its number in it */
app.get('/book-series', async (c) =>
  c.json(await findBookSeries(c.req.query('title') ?? '', c.req.query('author') ?? '')),
);

/** All books of a series in reading order */
app.get('/series-books', async (c) => c.json({ books: await seriesParts(c.req.query('key') ?? '') }));

// ---------- Google Books (fallback when the phone's direct call is rate limited; cached a day) ----------

app.get('/gbooks', async (c) => {
  const params = new URLSearchParams();
  for (const k of ['q', 'maxResults', 'printType', 'orderBy']) {
    const v = c.req.query(k);
    if (v) params.set(k, v);
  }
  if (!params.get('q')) return c.json({ items: [] });
  if (c.env.GOOGLE_BOOKS_KEY) params.set('key', c.env.GOOGLE_BOOKS_KEY);
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, {
    cf: { cacheTtl: 86_400, cacheEverything: true },
  });
  if (!res.ok) return c.json({ error: 'Google Books unavailable' }, 502);
  return new Response(res.body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
});

// Open Library search, same idea (cached a day)
app.get('/olsearch', async (c) => {
  const params = new URLSearchParams();
  for (const k of ['q', 'title', 'author', 'sort', 'limit', 'fields']) {
    const v = c.req.query(k);
    if (v) params.set(k, v);
  }
  const res = await fetch(`https://openlibrary.org/search.json?${params}`, {
    headers: { 'User-Agent': 'Snug personal library app' },
    cf: { cacheTtl: 86_400, cacheEverything: true },
  });
  if (!res.ok) return c.json({ error: 'Open Library unavailable' }, 502);
  return new Response(res.body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
});

// ---------- cover images (same-origin copy, so the app can read their colours) ----------

app.get('/img', async (c) => {
  const url = c.req.query('url') ?? '';
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return c.text('Bad url', 400);
  }
  const allowed =
    ['books.google.com', 'covers.openlibrary.org'].includes(host) || host.endsWith('.googleusercontent.com');
  if (!allowed) return c.text('Not allowed', 400);
  const res = await fetch(url, {
    cf: { cacheTtl: 604_800, cacheEverything: true },
  });
  if (!res.ok) return c.text('Not found', 404);
  return new Response(res.body, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=604800',
    },
  });
});

// ---------- AI ----------

async function loadLibrary(env: Env) {
  const { results } = await env.DB.prepare('SELECT kind, data FROM records WHERE owner = ? AND deleted = 0')
    .bind(OWNER)
    .all<{ kind: string; data: string }>();
  const books = results.filter((r) => r.kind === 'book').map((r) => JSON.parse(r.data) as Book);
  const profileRow = results.find((r) => r.kind === 'profile');
  return {
    books,
    profile: profileRow ? (JSON.parse(profileRow.data) as ReaderProfile) : undefined,
  };
}

async function aiRoute<T>(c: Context<{ Bindings: Env }>, run: () => Promise<T>) {
  try {
    return c.json(await run());
  } catch (err) {
    if (err instanceof AiLimitError) return c.json({ error: err.message }, 429);
    console.error('AI error', err);
    return c.json(
      {
        error: "Snug's AI couldn't answer right now. Please try again in a moment.",
      },
      502,
    );
  }
}

app.get('/ai/status', async (c) => c.json(await aiStatus(c.env)));

app.post('/ai/identify', async (c) => {
  const { image, mediaType = 'image/jpeg' } = await c.req.json<{
    image?: string;
    mediaType?: string;
  }>();
  if (!image || image.length > 4_000_000) return c.json({ error: 'Photo missing or too large' }, 400);
  return aiRoute(c, () => identifyCover(c.env, image, mediaType));
});

app.post('/ai/corners', async (c) => {
  const {
    image,
    mediaType = 'image/jpeg',
    width,
    height,
  } = await c.req.json<{
    image?: string;
    mediaType?: string;
    width?: number;
    height?: number;
  }>();
  if (!image || image.length > 4_000_000 || !width || !height)
    return c.json({ error: 'Photo missing or too large' }, 400);
  return aiRoute(c, () => findCoverCorners(c.env, image, mediaType, width, height));
});

app.post('/ai/recommend', async (c) => {
  const req = await c.req.json<RecommendRequest>();
  return aiRoute(c, async () => {
    const { books, profile } = await loadLibrary(c.env);
    return recommend(c.env, req, books, profile);
  });
});

app.post('/ai/fit', async (c) => {
  const book = await c.req.json<{
    title?: string;
    author?: string;
    description?: string;
    genres?: string[];
  }>();
  if (!book.title || !book.author) return c.json({ error: 'Title and author required' }, 400);
  return aiRoute(c, async () => {
    const { books, profile } = await loadLibrary(c.env);
    return fitCheck(
      c.env,
      {
        title: book.title!,
        author: book.author!,
        description: book.description,
        genres: book.genres,
      },
      books,
      profile,
    );
  });
});

app.post('/ai/series', async (c) => {
  const { name, author } = await c.req.json<{
    name?: string;
    author?: string;
  }>();
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
