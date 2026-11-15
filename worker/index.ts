import { Hono, type Context } from 'hono';
import type { Book, SyncRecord } from '../src/types';
import type { ReaderProfile } from '../src/shared';
import { AiLimitError, aiStatus, bookSeries, findCoverCorners, identifyCover, suggestBooks, seriesInfo } from './ai';
import { ASSETS } from './assets.gen';
import { findBookSeries, seriesParts } from './series';
import { bookProfiles, reviewInsight } from './profiles';

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

/** Series via Claude, for books Open Library doesn't know (translations, lesser known books) */
app.get('/ai/book-series', async (c) => {
  const title = c.req.query('title') ?? '';
  const author = c.req.query('author') ?? '';
  if (!title || !author) return c.json({});
  const known = (c.req.query('known') ?? '').split('|').filter(Boolean).slice(0, 12);
  try {
    return c.json(await bookSeries(c.env, title, author, known));
  } catch (err) {
    if (!(err instanceof AiLimitError)) console.error('series AI error', err);
    return c.json({}); // not now: the app asks again another day
  }
});

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

// Book analyses (once per book, then stored) and her reviews read into features
app.post('/profiles', async (c) => {
  const { books = [] } = await c.req.json<{
    books?: { title: string; author: string; description?: string; genres?: string[] }[];
  }>();
  const list = books.filter((b) => b.title && b.author).slice(0, 24);
  return aiRoute(c, () => bookProfiles(c.env, list));
});

app.post('/review-insight', async (c) => {
  const body = await c.req.json<Parameters<typeof reviewInsight>[1]>();
  if (!body.title || !body.review || !body.hash) return c.json({ error: 'Review missing' }, 400);
  return aiRoute(c, async () => ({ insight: await reviewInsight(c.env, body) }));
});

// "Something new": Claude suggests books she doesn't have; the app scores them for her
app.post('/ai/suggest', async (c) => {
  const req = await c.req.json<{ genre?: string; mood?: string; exclude?: string[] }>();
  return aiRoute(c, async () => {
    const { books, profile } = await loadLibrary(c.env);
    return suggestBooks(c.env, req, books, profile);
  });
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

app.post('/ai/series', async (c) => {
  const { name, author } = await c.req.json<{
    name?: string;
    author?: string;
  }>();
  if (!name) return c.json({ error: 'Series name required' }, 400);
  return aiRoute(c, () => seriesInfo(c.env, name, author ?? ''));
});

// ---------- her shareable wishlist ----------
// A secret link she can send to family and friends. It shows only her wishlist (no reviews, nothing else),
// and lets givers quietly reserve a gift so nobody buys the same book twice. Snug itself never asks who
// reserved what, so the surprise stays a surprise.

async function shareToken(env: Env) {
  return (
    await env.DB.prepare('SELECT token FROM wish_shares WHERE revoked = 0 ORDER BY created_at DESC LIMIT 1').first<{
      token: string;
    }>()
  )?.token;
}

app.get('/share/wishlist', async (c) => c.json({ token: (await shareToken(c.env)) ?? null }));

/** A friendly address from her name: /w/kels */
function slugOf(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
}

/**
 * The link to share. With her name it becomes /w/<name>; reservations always carry over to the
 * current link, so changing the address never loses them.
 */
app.post('/share/wishlist', async (c) => {
  const { name = '' } = await c.req.json<{ name?: string }>().catch(() => ({ name: '' }));
  const existing = await shareToken(c.env);
  const wanted = slugOf(name) || existing || crypto.randomUUID().slice(0, 8);
  if (existing === wanted) {
    await c.env.DB.prepare('UPDATE wish_shares SET name = ? WHERE token = ?').bind(name.trim(), wanted).run();
    return c.json({ token: wanted });
  }
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE wish_shares SET revoked = 1'),
    c.env.DB.prepare(
      'INSERT INTO wish_shares (token, created_at, revoked, name) VALUES (?, ?, 0, ?) ON CONFLICT (token) DO UPDATE SET revoked = 0, name = excluded.name',
    ).bind(wanted, Date.now(), name.trim()),
    c.env.DB.prepare('UPDATE wish_claims SET token = ?').bind(wanted),
  ]);
  return c.json({ token: wanted });
});

/** Open every book up again (people reserved but never bought) */
app.post('/share/wishlist/reset', async (c) => {
  await c.env.DB.prepare('DELETE FROM wish_claims').run();
  return c.json({ ok: true });
});

async function shareInfo(env: Env, token: string) {
  return env.DB.prepare('SELECT name FROM wish_shares WHERE token = ? AND revoked = 0')
    .bind(token)
    .first<{ name: string | null }>();
}

const cleanEmail = (e?: string | null) => (e ?? '').trim().toLowerCase().slice(0, 120);

app.get('/wish/:token', async (c) => {
  const token = c.req.param('token');
  const share = await shareInfo(c.env, token);
  if (!share) return c.json({ error: 'This wishlist link is no longer active' }, 404);
  const email = cleanEmail(c.req.query('email'));
  // her own peek (no email): nothing about reservations is sent at all
  const showClaims = !!email;
  const { books, profile } = await loadLibrary(c.env);
  const { results: claims } = await c.env.DB.prepare('SELECT book_id, name, email FROM wish_claims WHERE token = ?')
    .bind(token)
    .all<{ book_id: string; name: string; email: string | null }>();
  const claimed = new Map(claims.map((r) => [r.book_id, r]));
  const wishes = books
    // only books she gave a link for: she decides exactly which edition people buy
    .filter((b) => b.status === 'wishlist' && !b.deleted && b.buyUrl)
    .sort((a, b) => b.addedAt - a.addedAt)
    .map((b) => {
      const cl = showClaims ? claimed.get(b.id) : undefined;
      return {
        id: b.id,
        title: b.title,
        author: b.authors[0] ?? '',
        coverUrl: b.coverUrl,
        // her own photo of a special edition, only when it's small enough to send along
        customCover: b.customCover && b.customCover.length < 250_000 ? b.customCover : undefined,
        language: b.language,
        specialEdition: b.specialEdition,
        series: b.series,
        isbn13: b.isbn13,
        buyUrl: b.buyUrl,
        claimedBy: cl ? cl.name : null,
        mine: !!cl && cl.email === email,
      };
    });
  return c.json({ name: share.name || profile?.name || '', books: wishes });
});

app.post('/wish/:token/claim', async (c) => {
  const token = c.req.param('token');
  if (!(await shareInfo(c.env, token))) return c.json({ error: 'This wishlist link is no longer active' }, 404);
  const { bookId, name, email } = await c.req.json<{ bookId?: string; name?: string; email?: string }>();
  const who = (name ?? '').trim().slice(0, 40);
  const mail = cleanEmail(email);
  if (!bookId || !who || !mail.includes('@')) return c.json({ error: 'Name or email missing' }, 400);
  const res = await c.env.DB.prepare(
    'INSERT INTO wish_claims (token, book_id, name, claimed_at, email) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING',
  )
    .bind(token, bookId, who, Date.now(), mail)
    .run();
  if (!res.meta.changes) return c.json({ error: 'Someone else has just reserved this one' }, 409);
  return c.json({ ok: true });
});

/** Undo a reservation: only the person who made it (same email), from any device */
app.delete('/wish/:token/claim/:bookId', async (c) => {
  const mail = cleanEmail(c.req.query('email'));
  if (!mail) return c.json({ error: 'Email missing' }, 400);
  await c.env.DB.prepare('DELETE FROM wish_claims WHERE token = ? AND book_id = ? AND email = ?')
    .bind(c.req.param('token'), c.req.param('bookId'), mail)
    .run();
  return c.json({ ok: true });
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
  // a shared wishlist gets its own preview card in WhatsApp and Messages
  if (pathname.startsWith('/w/')) {
    const html = new TextDecoder()
      .decode(a.bytes)
      .replace(/<title>[^<]*<\/title>/, '<title>A little wishlist 📚</title>')
      .replace(
        '</head>',
        '<meta property="og:title" content="A little wishlist 📚"><meta property="og:description" content="The books on her wishlist, and which language to get them in. Reserve one so nobody buys it twice."><meta name="robots" content="noindex"></head>',
      );
    return new Response(html, { headers: { 'Content-Type': a.type, 'Cache-Control': 'no-cache' } });
  }
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
