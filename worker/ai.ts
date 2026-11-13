import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import type { Book } from '../src/types';
import type {
  FitResponse,
  IdentifyResponse,
  Pick,
  ReaderProfile,
  RecommendRequest,
  RecommendResponse,
  SeriesResponse,
} from '../src/shared';
import { MOCK_BUY_LIST } from './mockBooks';
import { bookTraits, learnTaste, scoreBook, traitsIn, type Candidate } from './taste';
import { findBookSeries, seriesParts, type FoundSeries } from './series';

export interface AiEnv {
  DB: D1Database;
  AI_MODE?: string;
  AI_DAILY_LIMIT?: string;
  ANTHROPIC_API_KEY?: string;
}

// Cover reading is simple: the small, very cheap model is plenty.
const VISION_MODEL = 'claude-haiku-5-5';
// Recommendations need taste and book knowledge.
const TIPS_MODEL = 'claude-sonnet-5-5';

export class AiLimitError extends Error {}

export const isLive = (env: AiEnv) => env.AI_MODE === 'live' && !!env.ANTHROPIC_API_KEY;
const today = () => new Date().toISOString().slice(0, 10);

export async function aiStatus(env: AiEnv) {
  const row = await env.DB.prepare('SELECT count FROM ai_usage WHERE day = ?').bind(today()).first<{ count: number }>();
  return { mode: isLive(env) ? 'live' : 'mock', usedToday: row?.count ?? 0, limit: Number(env.AI_DAILY_LIMIT ?? 40) } as const;
}

/** Counts one paid AI call; refuses once today's limit is reached */
async function spend(env: AiEnv) {
  const status = await aiStatus(env);
  if (status.usedToday >= status.limit) {
    throw new AiLimitError(`Snug's AI is resting for today (${status.limit} questions). Try again tomorrow!`);
  }
  await env.DB.prepare(
    'INSERT INTO ai_usage (day, count) VALUES (?, 1) ON CONFLICT (day) DO UPDATE SET count = count + 1',
  )
    .bind(today())
    .run();
}

async function sha(input: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Same question within `maxAgeDays` → answer from the cache, no cost */
async function cached<T>(env: AiEnv, keyParts: unknown, maxAgeDays: number, run: () => Promise<T>): Promise<T> {
  const key = await sha(JSON.stringify(keyParts));
  const row = await env.DB.prepare('SELECT value, created_at FROM ai_cache WHERE key = ?')
    .bind(key)
    .first<{ value: string; created_at: number }>();
  if (row && Date.now() - row.created_at < maxAgeDays * 86_400_000) return JSON.parse(row.value) as T;
  const value = await run();
  await env.DB.prepare('INSERT OR REPLACE INTO ai_cache (key, value, created_at) VALUES (?, ?, ?)')
    .bind(key, JSON.stringify(value), Date.now())
    .run();
  return value;
}

function client(env: AiEnv) {
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

/** Runs a structured request; returns null when Claude declines */
async function ask<T extends z.ZodType>(
  env: AiEnv,
  model: string,
  schema: T,
  system: string,
  content: Anthropic.Beta.BetaMessageContentParam,
  effort: 'low' | 'medium',
): Promise<z.infer<T> | null> {
  await spend(env);
  // On Sonnet, a declined request is retried server-side on a suitable fallback model
  const fallback = model === TIPS_MODEL ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {};
  const response = await client(env).beta.messages.parse({
    model,
    max_tokens: 8000,
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
    return { title: 'Fourth Wing', author: 'Rebecca Yarros', isbn: null, mock: true };
  }
  const result = await ask(
    env,
    VISION_MODEL,
    IdentifySchema,
    'You read book covers and barcodes from photos. Give the exact book title (without series info) and the main author, as printed. Give the ISBN-13 only if a barcode or ISBN number is clearly readable. Use null for anything you cannot read.',
    [
      {
        type: 'image',
        source: { type: 'base64', media_type: mediaType as 'image/jpeg', data: imageBase64 },
      },
      { type: 'text', text: 'Which book is this?' },
    ],
    'low',
  );
  return { title: result?.title ?? null, author: result?.author ?? null, isbn: result?.isbn ?? null, mock: false };
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

// ---------- "What's next?" ----------

const PicksSchema = z.object({
  picks: z
    .array(
      z.object({
        title: z.string(),
        author: z.string(),
        why: z.string(),
        seriesNote: z.string().nullable(),
        score: z.number(),
      }),
    ),
});

const clampScore = (n: number) => Math.round(Math.max(0, Math.min(100, n)));

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

export async function recommend(
  env: AiEnv,
  req: RecommendRequest,
  books: Book[],
  profile?: ReaderProfile,
): Promise<RecommendResponse> {
  const unread = books.filter((b) => b.status === 'owned');
  if (req.source === 'shelf' && unread.length === 0) return { picks: [], mock: !isLive(env) };

  if (!isLive(env)) return { picks: await inSeriesOrder(mockRecommend(req, books, profile), req.source, books), mock: true };

  const wish = [
    req.source === 'shelf'
      ? 'Pick her next read ONLY from the books under "OWNED BUT NOT READ YET". Use the exact title.'
      : 'Suggest books to BUY: real, published books she does not have yet. Prefer books available in English or Dutch.',
    req.genre ? `Genre: ${req.genre}.` : 'Any of her genres.',
    req.mood ? `Mood: ${MOOD_LABELS[req.mood] ?? req.mood}.` : '',
    req.exclude?.length ? `Do not repeat these suggestions: ${req.exclude.join('; ')}.` : '',
    'Give your 3 best picks (fewer only if there are not enough fitting books), best first.',
    'For each pick give a match score 0–100: how well it fits her taste (her ratings, her own words in reviews, her quiz) and, if she asked for one, the genre and mood. Be honest: 90+ only for a near-certain favourite.',
    'The "why" must be specific to her: name one or two of her books and what she rated or wrote about them.',
  ]
    .filter(Boolean)
    .join('\n');

  const result = await cached(env, ['recommend', req, books, profile], 1, () =>
    ask(
      env,
      TIPS_MODEL,
      PicksSchema,
      SYSTEM_TIPS,
      `HER LIBRARY\n${describeLibrary(books)}\n\nHER READER PROFILE\n${describeProfile(profile)}\n\nWHAT SHE ASKS NOW\n${wish}`,
      'medium',
    ),
  );

  const byKey = new Map(books.map((b) => [key(b.title, b.authors[0]), b]));
  const picks: Pick[] = (result?.picks ?? []).slice(0, 3).map((p) => {
    const own = byKey.get(key(p.title, p.author)) ?? books.find((b) => key(b.title) === key(p.title));
    return { ...p, seriesNote: p.seriesNote ?? undefined, bookId: own?.id, score: clampScore(p.score) };
  });
  const fitting = req.source === 'shelf' ? picks.filter((p) => p.bookId) : picks.filter((p) => !p.bookId);
  return { picks: await inSeriesOrder(fitting, req.source, books), mock: false };
}

// ---------- never skip ahead in a series ----------

const sameSeries = (a: { name: string; key?: string }, b: { name: string; key?: string }) =>
  (a.key && b.key ? a.key === b.key : false) || key(a.name) === key(b.name);

/**
 * Makes sure a tip is never part 2 of a series she hasn't started:
 * - from her shelf: swap to the first part she hasn't read, if she owns it (otherwise drop the tip)
 * - to buy: swap to the first part she doesn't have yet
 * Series come from her library or from Open Library.
 */
async function inSeriesOrder(picks: Pick[], source: RecommendRequest['source'], books: Book[]): Promise<Pick[]> {
  const out: Pick[] = [];
  for (const pick of picks) {
    const own = pick.bookId ? books.find((b) => b.id === pick.bookId) : undefined;
    let series: { name: string; number?: number; key?: string } | undefined = own?.series;
    if (!series?.number) {
      const found = await findBookSeries(pick.title, pick.author).catch(() => ({}) as FoundSeries);
      if (found.name && found.number) series = { name: found.name, number: found.number, key: found.key };
    }
    const n = series?.number;
    if (!series || !n || n <= 1) {
      out.push(pick);
      continue;
    }
    const parts = books.filter((b) => b.series && sameSeries(b.series, series!));
    const partNo = (k: number) => parts.find((b) => b.series?.number === k);

    if (source === 'shelf') {
      // first earlier part she hasn't read
      let k = 1;
      while (k < n && partNo(k)?.status === 'read') k++;
      if (k === n) {
        out.push(pick);
        continue;
      }
      const earlier = partNo(k);
      if (earlier && (earlier.status === 'owned' || earlier.status === 'reading')) {
        out.push({
          title: earlier.title,
          author: earlier.authors[0] ?? pick.author,
          bookId: earlier.id,
          why: `Start with book ${k} of ${series.name} first, it's waiting on your shelf. ${pick.why}`,
          seriesNote: `${series.name} #${k}`,
          score: pick.score,
        });
      }
      continue; // she doesn't own the earlier part: not a shelf tip
    }

    // to buy: the first part she doesn't have yet
    const has = (k: number) => {
      const b = partNo(k);
      return !!b && b.status !== 'wishlist';
    };
    let k = 1;
    while (k < n && has(k)) k++;
    if (k === n) {
      out.push(pick);
      continue;
    }
    const list = series.key ? await seriesParts(series.key).catch(() => []) : [];
    const first = list.find((p) => p.number === k);
    if (first) {
      out.push({
        title: first.title,
        author: pick.author,
        why: `It's book ${k} of ${series.name}, so start here! ${pick.why}`,
        seriesNote: `${series.name} #${k}`,
        score: pick.score,
      });
    }
  }
  // no doubles after swapping
  const seen = new Set<string>();
  return out.filter((p) => (seen.has(key(p.title)) ? false : (seen.add(key(p.title)), true)));
}

/**
 * Test-mode tips, still tailored to her: the taste engine learns from her ratings, reviews,
 * tags and quiz, scores every candidate and explains the match in her own terms.
 */
export function mockRecommend(req: RecommendRequest, books: Book[], profile?: ReaderProfile): Pick[] {
  const taste = learnTaste(books, profile);
  const exclude = new Set((req.exclude ?? []).map((t) => key(t)));
  const notForMe = new Set((profile?.notForMe ?? []).map((t) => key(t.replace(/\s*\(.*\)$/, ''))));
  const wish = { genre: req.genre, mood: req.mood };

  const candidates =
    req.source === 'shelf'
      ? books
          .filter((b) => b.status === 'owned')
          .map((b) => ({
            book: b,
            c: {
              title: b.title,
              author: b.authors[0] ?? '',
              genres: b.genres,
              traits: bookTraits(b),
              previous:
                b.series?.number && b.series.number > 1
                  ? books.find(
                      (x) =>
                        x.status === 'read' &&
                        x.series?.number === b.series!.number! - 1 &&
                        key(x.series.name) === key(b.series!.name),
                    )
                  : undefined,
            } as Candidate,
          }))
      : (() => {
          const have = new Set(books.map((b) => key(b.title, b.authors[0])));
          return MOCK_BUY_LIST.filter((m) => !have.has(key(m.title, m.author))).map((m) => ({ book: undefined, c: m as Candidate }));
        })();

  return candidates
    .filter(({ c }) => !exclude.has(key(c.title)) && !notForMe.has(key(c.title)))
    .map(({ book, c }) => ({ book, c, ...scoreBook(c, taste, books, wish) }))
    .filter((x) => !req.genre || x.c.genres.includes(req.genre))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ book, c, score, why }) => ({
      title: c.title,
      author: c.author,
      why,
      score,
      bookId: book?.id,
      seriesNote: book?.series ? `${book.series.name} #${book.series.number ?? '?'}` : undefined,
    }));
}

// ---------- "Does this fit me?" ----------

const FitSchema = z.object({
  verdict: z.enum(['love', 'like', 'maybe', 'skip']),
  score: z.number(),
  why: z.string(),
  seriesNote: z.string().nullable(),
});

export async function fitCheck(
  env: AiEnv,
  book: { title: string; author: string; description?: string; genres?: string[] },
  books: Book[],
  profile?: ReaderProfile,
): Promise<FitResponse> {
  if (!isLive(env)) {
    // Test mode: the same taste engine as the tips, so scores mean the same everywhere
    const taste = learnTaste(books, profile);
    const traits = traitsIn(`${book.description ?? ''} ${(book.genres ?? []).join(' ')}`);
    const { score, why } = scoreBook({ title: book.title, author: book.author, genres: book.genres ?? [], traits }, taste, books, {});
    const verdict = score >= 85 ? 'love' : score >= 70 ? 'like' : score >= 55 ? 'maybe' : 'skip';
    return { verdict, score, why, seriesNote: null, mock: true };
  }
  const result = await cached(env, ['fit', book, books, profile], 7, () =>
    ask(
      env,
      TIPS_MODEL,
      FitSchema,
      SYSTEM_TIPS,
      `HER LIBRARY\n${describeLibrary(books)}\n\nHER READER PROFILE\n${describeProfile(profile)}\n\nShe is in a bookshop holding "${book.title}" by ${book.author}.${
        book.description ? `\nBlurb: ${book.description.slice(0, 1500)}` : ''
      }\nHow well does it fit her? verdict: love/like/maybe/skip, score 0–100, why in 2–3 sentences. If it is part of a series, say in seriesNote which book she should start with or buy next given what she owns/read; otherwise null.`,
      'medium',
    ),
  );
  if (!result) return { verdict: 'maybe', score: 50, why: "Snug couldn't judge this one.", seriesNote: null, mock: false };
  return { ...result, score: clampScore(result.score), mock: false };
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
