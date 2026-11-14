import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import type { Book } from '../src/types';
import type { CoverCorners, IdentifyResponse, ReaderProfile, SeriesResponse } from '../src/shared';
import { MOCK_BUY_LIST } from './mockBooks';

export interface AiEnv {
  DB: D1Database;
  AI_MODE?: string;
  AI_DAILY_LIMIT?: string;
  ANTHROPIC_API_KEY?: string;
  GOOGLE_BOOKS_KEY?: string;
}

// Cover reading is simple: the small, very cheap model is plenty.
const VISION_MODEL = 'claude-haiku-5-5';
// Recommendations need taste and book knowledge.
export const TIPS_MODEL = 'claude-sonnet-5-5';

export class AiLimitError extends Error {}

export const isLive = (env: AiEnv) => env.AI_MODE === 'live' && !!env.ANTHROPIC_API_KEY;
const today = () => new Date().toISOString().slice(0, 10);

export async function aiStatus(env: AiEnv) {
  const row = await env.DB.prepare('SELECT count FROM ai_usage WHERE day = ?').bind(today()).first<{ count: number }>();
  return {
    mode: isLive(env) ? 'live' : 'mock',
    usedToday: row?.count ?? 0,
    limit: Number(env.AI_DAILY_LIMIT ?? 40),
  } as const;
}

/** Book analyses have their own (larger) daily allowance: each one is small and happens once per book */
const ANALYSIS_DAILY_LIMIT = 150;
export type Usage = { kind: 'question' | 'analysis'; count: number };

/** Counts paid AI work; refuses once today's limit is reached */
export async function spend(env: AiEnv, usage: Usage = { kind: 'question', count: 1 }) {
  const day = usage.kind === 'analysis' ? `analysis:${today()}` : today();
  if (usage.kind === 'analysis') {
    const row = await env.DB.prepare('SELECT count FROM ai_usage WHERE day = ?').bind(day).first<{ count: number }>();
    if ((row?.count ?? 0) + usage.count > ANALYSIS_DAILY_LIMIT)
      throw new AiLimitError('Snug has read enough new books for today. The rest follows tomorrow!');
  } else {
    const status = await aiStatus(env);
    if (status.usedToday >= status.limit) {
      throw new AiLimitError(`Snug's AI is resting for today (${status.limit} questions). Try again tomorrow!`);
    }
  }
  await env.DB.prepare(
    'INSERT INTO ai_usage (day, count) VALUES (?, ?) ON CONFLICT (day) DO UPDATE SET count = count + excluded.count',
  )
    .bind(day, usage.count)
    .run();
}

async function sha(input: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Same question within `maxAgeDays` → answer from the cache, no cost */
export async function cached<T>(env: AiEnv, keyParts: unknown, maxAgeDays: number, run: () => Promise<T>): Promise<T> {
  const key = await sha(JSON.stringify(keyParts));
  const row = await env.DB.prepare('SELECT value, created_at FROM ai_cache WHERE key = ?')
    .bind(key)
    .first<{ value: string; created_at: number }>();
  if (row && Date.now() - row.created_at < maxAgeDays * 86_400_000) return JSON.parse(row.value) as T;
  const value = await run();
  if (value === null || value === undefined) return value; // never remember a failed answer
  await env.DB.prepare('INSERT OR REPLACE INTO ai_cache (key, value, created_at) VALUES (?, ?, ?)')
    .bind(key, JSON.stringify(value), Date.now())
    .run();
  return value;
}

function client(env: AiEnv) {
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

/** Runs a structured request; returns null when Claude declines */
export async function ask<T extends z.ZodType>(
  env: AiEnv,
  model: string,
  schema: T,
  system: string,
  content: Anthropic.Beta.BetaMessageContentParam,
  effort: 'low' | 'medium',
  maxTokens = 8000,
  usage?: Usage,
): Promise<z.infer<T> | null> {
  await spend(env, usage);
  // On Sonnet, a declined request is retried server-side on a suitable fallback model
  const fallback =
    model === TIPS_MODEL
      ? {
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default' as const,
        }
      : {};
  const response = await client(env).beta.messages.parse({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content }],
    output_config: { effort, format: betaZodOutputFormat(schema) },
    ...fallback,
  });
  if (response.stop_reason === 'refusal') return null;
  return (response.parsed_output as z.infer<T> | null) ?? null;
}

// ---------- reading a cover ----------

const IdentifySchema = z.object({
  title: z.string().nullable(),
  author: z.string().nullable(),
  isbn: z.string().nullable(),
});

export async function identifyCover(env: AiEnv, imageBase64: string, mediaType: string): Promise<IdentifyResponse> {
  if (!isLive(env)) {
    // Test mode: always "recognises" the same book, so the flow can be tried for free
    return {
      title: 'Fourth Wing',
      author: 'Rebecca Yarros',
      isbn: null,
      mock: true,
    };
  }
  const result = await ask(
    env,
    VISION_MODEL,
    IdentifySchema,
    'You read book covers and barcodes from photos. Give the exact book title (without series info) and the main author, as printed. Give the ISBN-13 only if a barcode or ISBN number is clearly readable. Use null for anything you cannot read.',
    [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType as 'image/jpeg',
          data: imageBase64,
        },
      },
      { type: 'text', text: 'Which book is this?' },
    ],
    'low',
  );
  return {
    title: result?.title ?? null,
    author: result?.author ?? null,
    isbn: result?.isbn ?? null,
    mock: false,
  };
}

// ---------- finding the book in a photo (for her own cover photo) ----------

const Point = z.object({ x: z.number(), y: z.number() });
const CornersSchema = z.object({
  found: z.boolean(),
  topLeft: Point,
  topRight: Point,
  bottomRight: Point,
  bottomLeft: Point,
});

/** The four corners of the front cover, in pixels of the given image; null when no book is visible */
export async function findCoverCorners(
  env: AiEnv,
  imageBase64: string,
  mediaType: string,
  width: number,
  height: number,
): Promise<CoverCorners> {
  if (!isLive(env)) return { corners: null, mock: true };
  const r = await ask(
    env,
    VISION_MODEL,
    CornersSchema,
    'You locate the front cover of a book in a photo, so it can be cut out precisely. Give the pixel coordinates of the four corners of the front cover itself (not the spine, not the hand holding it, not the background). If the book is tilted or seen at an angle, give the real corners, so the shape may be a skewed quadrilateral. Name the corners as they are on the cover itself when it is held upright to read (topLeft is the cover’s own top-left corner, where the title starts), even when the book lies sideways or upside down in the photo: the cut-out is turned upright from these names. Be as precise as you can: the corners are where the cover edges meet. If no book cover is visible, set found to false.',
    [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType as 'image/jpeg',
          data: imageBase64,
        },
      },
      {
        type: 'text',
        text: `The image is ${width} x ${height} pixels (x to the right, y down, origin top-left). Where are the four corners of the front cover?`,
      },
    ],
    'low',
  );
  if (!r?.found) return { corners: null, mock: false };
  const clamp = (p: { x: number; y: number }) => ({
    x: Math.min(1, Math.max(0, p.x / width)),
    y: Math.min(1, Math.max(0, p.y / height)),
  });
  return {
    corners: [r.topLeft, r.topRight, r.bottomRight, r.bottomLeft].map(clamp),
    mock: false,
  };
}

// ---------- describing her library to Claude ----------

function describeLibrary(books: Book[]) {
  const line = (b: Book) =>
    [
      `"${b.title}" by ${b.authors.join(', ')}`,
      b.series ? `(series: ${b.series.name}${b.series.number ? ` #${b.series.number}` : ''})` : '',
      b.genres.length ? `[${b.genres.join(', ')}]` : '',
      b.rating !== undefined ? `rated ${b.rating}/5` : '',
      b.tags.length ? `tags: ${b.tags.join(', ')}` : '',
      b.review ? `her words: "${b.review}"` : '',
      `copy: ${b.language === 'nl' ? 'Dutch' : 'English'}`,
    ]
      .filter(Boolean)
      .join(' ');
  const by = (status: Book['status']) => books.filter((b) => b.status === status).map(line);
  return [
    `READ (${by('read').length}):\n${by('read').join('\n') || '-'}`,
    `CURRENTLY READING:\n${by('reading').join('\n') || '-'}`,
    `OWNED BUT NOT READ YET:\n${by('owned').join('\n') || '-'}`,
    `WISHLIST:\n${by('wishlist').join('\n') || '-'}`,
  ].join('\n\n');
}

function describeProfile(p?: ReaderProfile) {
  if (!p) return 'She has not filled in her reader quiz yet; go by her ratings and reviews.';
  return [
    p.lovedTropes.length && `Loves: ${p.lovedTropes.join(', ')}`,
    p.hatedTropes.length && `Dislikes: ${p.hatedTropes.join(', ')}`,
    `Spice level she likes: ${p.spice}/5`,
    `Endings: ${p.endings}`,
    `Series or standalone: ${p.seriesOrStandalone}`,
    `Preferred length: ${p.length}`,
    p.moods.length && `Moods she often wants: ${p.moods.join(', ')}`,
    p.favouriteAuthors.length && `Favourite authors: ${p.favouriteAuthors.join(', ')}`,
    p.notForMe.length && `Already said "not for me" to: ${p.notForMe.join('; ')}`,
  ]
    .filter(Boolean)
    .join('\n');
}

const SYSTEM_TIPS = `You are Snug, a warm, well-read friend who recommends books to one reader.
She reads thrillers, fantasy, romance, romantasy and spicy books in English and Dutch, and never non-fiction.
Base every pick on her ratings, her own words in reviews, her reader profile and what each book is actually like.
Write the "why" in English, 2–3 short sentences, addressed to her ("you"), naming the books of hers it connects to.
Never suggest a book she has already read, already owns, or said "not for me" to (unless asked to pick from her own shelf).
If a series is involved, make sure the pick is the right next book in reading order.`;

/** The publisher's blurb from Google Books: the most detailed description we can get for free */
export async function googleDescription(env: AiEnv, title: string, author: string): Promise<string | undefined> {
  const params = new URLSearchParams({
    q: `intitle:"${title}" inauthor:"${author}"`,
    maxResults: '8',
    printType: 'books',
  });
  if (env.GOOGLE_BOOKS_KEY) params.set('key', env.GOOGLE_BOOKS_KEY);
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, {
    cf: { cacheTtl: 604_800, cacheEverything: true },
  }).catch(() => undefined);
  if (!res?.ok) return undefined;
  const json = (await res.json().catch(() => ({}))) as {
    items?: { volumeInfo: { title?: string; description?: string } }[];
  };
  const want = key(title);
  return (json.items ?? [])
    .map((i) => i.volumeInfo)
    .filter((v) => v.description && key(v.title ?? '').startsWith(want.split('|')[0]))
    .sort((a, b) => b.description!.length - a.description!.length)[0]?.description;
}

// ---------- "Something new": books to buy, suggested by Claude, scored by the app ----------

const MOOD_LABELS: Record<string, string> = {
  light: 'light & fun',
  swoony: 'swoony romance',
  spicy: 'spicy',
  cry: 'something that makes her cry',
  tense: 'edge-of-her-seat tension',
  epic: 'epic & immersive',
  quick: 'a quick, short read',
};

const key = (title: string, author = '') =>
  `${title.toLowerCase().replace(/[^a-z0-9]/g, '')}|${author.toLowerCase().split(/\s+/).pop() ?? ''}`;

const SuggestSchema = z.object({
  books: z.array(z.object({ title: z.string(), author: z.string(), genres: z.array(z.string()) })),
});

/**
 * Real, published books she doesn't have yet that fit her request. Claude only suggests:
 * the app works out how well each one fits her (and picks the best three).
 */
export async function suggestBooks(
  env: AiEnv,
  req: { genre?: string; mood?: string; exclude?: string[] },
  books: Book[],
  profile?: ReaderProfile,
): Promise<{ books: { title: string; author: string; genres: string[] }[]; mock: boolean }> {
  const have = new Set(books.map((b) => key(b.title, b.authors[0])));
  if (!isLive(env)) {
    const pool = MOCK_BUY_LIST.filter(
      (m) => !have.has(key(m.title, m.author)) && !(req.exclude ?? []).some((t) => key(t) === key(m.title)),
    );
    return { books: pool.slice(0, 8).map((m) => ({ title: m.title, author: m.author, genres: m.genres })), mock: true };
  }
  const ask_ = [
    'Suggest 7 real, published books to BUY that she does not have yet (not in her library, not on her wishlist, not something she said "not for me" to), available in English or Dutch.',
    req.genre ? `Genre: ${req.genre}.` : 'Any of her genres.',
    req.mood ? `Mood: ${MOOD_LABELS[req.mood] ?? req.mood}.` : '',
    req.exclude?.length ? `Not these (already shown): ${req.exclude.join('; ')}.` : '',
    'Go for books that fit what she loves (look at what she rated highest and what she wrote) and vary them a little. For a series she has not started, suggest book 1. Exact titles and authors.',
  ]
    .filter(Boolean)
    .join('\n');
  const result = await cached(
    env,
    ['suggest', 1, req, books.map((b) => [b.title, b.status, b.rating, b.review]), profile],
    1,
    () =>
      ask(
        env,
        TIPS_MODEL,
        SuggestSchema,
        SYSTEM_TIPS,
        `HER LIBRARY\n${describeLibrary(books)}\n\nHER READER PROFILE\n${describeProfile(profile)}\n\nWHAT SHE ASKS NOW\n${ask_}`,
        'medium',
      ),
  );
  return {
    books: (result?.books ?? []).filter((b) => !have.has(key(b.title, b.author))).slice(0, 8),
    mock: false,
  };
}

// ---------- series ----------

const SeriesSchema = z.object({
  books: z.array(
    z.object({
      number: z.number(),
      title: z.string(),
      status: z.enum(['published', 'announced']),
      releaseDate: z.string().nullable(),
    }),
  ),
});

export async function seriesInfo(env: AiEnv, name: string, author: string): Promise<SeriesResponse> {
  if (!isLive(env)) return { books: [], mock: true };
  const result = await cached(env, ['series', name.toLowerCase(), author.toLowerCase()], 14, () =>
    ask(
      env,
      TIPS_MODEL,
      SeriesSchema,
      'You know book series well. List the main numbered books of the series in reading order. Include a book as "announced" only if it has been officially announced by the author or publisher, with its release date (YYYY-MM-DD or YYYY-MM) if known. Leave out novellas without a whole number unless they are commonly read in order. If you do not know the series, return an empty list.',
      `Series: "${name}" by ${author}.`,
      'low',
    ),
  );
  return { books: result?.books ?? [], mock: false };
}
