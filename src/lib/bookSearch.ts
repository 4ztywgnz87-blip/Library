import type { Book, Lang, SeriesInfo } from '../types';
import { bookKey, normalize } from './library';

/** A search hit, not yet in her library */
export type SearchResult = Omit<
  Book,
  'id' | 'status' | 'language' | 'specialEdition' | 'tags' | 'addedAt' | 'updatedAt'
> & { language?: Lang; source: 'google' | 'openlibrary' };

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_BOOKS_KEY as string | undefined;

// ---------- genres ----------

const GENRE_PATTERNS: [string, RegExp][] = [
  ['Fantasy', /fantas|\bfae\b|faer|dragon|magic|witch|vampire|paranormal/],
  ['Romance', /roman(ce|tic)|rom-com|love stor/],
  ['Spicy', /erotic|spicy|smut|steamy/],
  ['Thriller', /thriller|suspense/],
  ['Mystery', /mystery|detective|crime|whodunit/],
  ['Historical', /histor/],
  ['Sci-fi', /science fiction|sci-fi|dystop/],
  ['Literature', /literary fiction|literature|literatuur|\bclassics?\b|contemporary fiction/],
  ['Young adult', /young adult fiction|juvenile fiction|\bya\b|teen fiction/],
];

/**
 * Turns messy store categories / reader shelves into her own genre list.
 * With a long list of subjects (Open Library), a genre needs two mentions, so one stray tag
 * doesn't turn a thriller into a romance.
 */
export function mapGenres(categories: string[]): string[] {
  const subjects = categories.map((c) =>
    c
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''),
  );
  const long = subjects.length > 6;
  // a genre counts when it's mentioned twice, or right at the top of the list
  const fits = (re: RegExp) => {
    if (!long) return subjects.some((x) => re.test(x));
    return subjects.filter((x) => re.test(x)).length >= 2 || subjects.slice(0, 4).some((x) => re.test(x));
  };
  const out = GENRE_PATTERNS.filter(([, re]) => fits(re)).map(([g]) => g);
  if (out.includes('Fantasy') && out.includes('Romance')) out.unshift('Romantasy');
  if (out.length === 0 && subjects.some((x) => /fiction|novel|literature|roman/.test(x))) out.push('Fiction');
  return out;
}

// ---------- series ----------

/** Finds "(Crescent City, #2)" or "Crescent City 2:" style series hints in a title */
export function parseSeries(rawTitle: string, subtitle?: string): { title: string; series?: SeriesInfo } {
  // Shop labels are not part of the title: "(Prime Tie-In)", "(Deluxe Edition)", "[Special edition]"
  const title =
    rawTitle
      .replace(
        /\s*[([][^()[\]]*\b(tie-?in|edition|editie|uitgave|exclusive|signed|paperback|hardcover|illustrated|collector'?s?)\b[^()[\]]*[)\]]/gi,
        '',
      )
      .trim() || rawTitle;
  // "(Crescent City, #2)" and "(Dream Harbor, Book 3)"
  const paren = title.match(/^(.*?)\s*\(([^()#]+?),?\s*(?:#|book\s+|boek\s+|deel\s+)\s*(\d+(?:\.\d+)?)\)\s*$/i);
  if (paren)
    return {
      title: paren[1],
      series: { name: paren[2].trim(), number: Number(paren[3]) },
    };
  // "A Court of Thorns and Roses, 6"
  // "Boys of Tommen #1"
  const hash = subtitle?.match(/^(.+?)\s*#\s*(\d+(?:\.\d+)?)$/);
  if (hash) return { title, series: { name: hash[1].trim(), number: Number(hash[2]) } };
  const named = subtitle?.match(/^(.+?),\s*(?:book\s*|#\s*)?(\d+(?:\.\d+)?)$/i);
  if (named) return { title, series: { name: named[1].trim(), number: Number(named[2]) } };
  const sub = subtitle?.match(
    /^(?:(?:book|deel|vol\.?|volume)\s*(\d+)\s*(?:of|in|van)\s*(?:the\s*)?)(.+?)(?:\s*series)?$/i,
  );
  if (sub) return { title, series: { name: sub[2].trim(), number: Number(sub[1]) } };
  const sub2 = subtitle?.match(/^(?:a\s+)?(.+?)\s+(?:novel|book|series)\s*(?:#|book\s*)?(\d+)?$/i);
  if (sub2 && sub2[2]) return { title, series: { name: sub2[1].trim(), number: Number(sub2[2]) } };
  return { title };
}

const ORDINALS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
};

/**
 * A series stated in so many words in the blurb: "the seventh book in the #1 bestselling
 * Court of Thorns and Roses (ACOTAR) series"
 */
export function seriesFromDescription(description?: string): SeriesInfo | undefined {
  const m = description?.match(
    /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|\d{1,2}(?:st|nd|rd|th))\s+(?:book|novel|instal?l?ment|volume|entry)\s+(?:in|of)\s+the\s+(?:#1\s+)?(?:(?:[\w-]+\s+){0,3}?bestselling\s+)?([A-Z][\w'’&\s-]{2,60}?)\s+(?:\([^)]{1,20}\)\s+)?(?:series|saga)\b/i,
  );
  if (!m) return undefined;
  const word = m[1].toLowerCase();
  const number = ORDINALS[word] ?? parseInt(word, 10);
  return number ? { name: m[2].trim(), number } : undefined;
}

// ---------- language ----------

const DUTCH =
  /\b(de|het|een|van|en|ik|je|jij|niet|wat|zijn|haar|hij|zij|wij|ons|voor|met|naar|uit|op|bij|als|maar|nooit|altijd|liefde|nacht|dag|meisje|huis|boek|deel)\b/gi;
const ENGLISH =
  /\b(the|a|an|of|and|to|in|is|you|it|we|my|your|never|always|love|night|day|girl|house|book|with|from)\b/gi;

/** Rough guess from the title: Dutch or English? */
export function guessLang(text: string): Lang | undefined {
  const nl = text.match(DUTCH)?.length ?? 0;
  const en = text.match(ENGLISH)?.length ?? 0;
  if (nl > en) return 'nl';
  if (en > nl) return 'en';
  return undefined;
}

const COMMON_WORDS = new Set(
  (
    'the of and to in is you it we my your with from for on at by an as his her she he they their them was were are be been has have had not but or if so what who when where which that this there then than into out up about after before over under again never always one two all new more most only some any can will would could should do did does just like love'.split(
      ' ',
    ) as string[]
  ).concat(
    'de het een van en ik je jij niet wat zijn haar hij zij wij ons voor met naar uit op bij als maar nooit altijd dat die dit deze er ook nog wel dan toen zo of te om aan ze hem hen was waren is wordt worden heeft hebben zou kan moet komt'.split(
      ' ',
    ),
  ),
);

/** Is this text in some other language than English or Dutch (e.g. a Hungarian edition's blurb)? */
export function looksForeign(text?: string) {
  if (!text) return false;
  const words = text.toLowerCase().match(/[\p{L}']+/gu) ?? [];
  if (words.length < 15) return false;
  const known = words.filter((w) => COMMON_WORDS.has(w)).length;
  return known / words.length < 0.12;
}

// ---------- Google Books ----------

interface GoogleVolume {
  id: string;
  volumeInfo: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    description?: string;
    categories?: string[];
    pageCount?: number;
    publishedDate?: string;
    language?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
}

function googleCover(v: GoogleVolume): string | undefined {
  const raw = v.volumeInfo.imageLinks?.thumbnail ?? v.volumeInfo.imageLinks?.smallThumbnail;
  if (!raw) return undefined;
  // https + bigger image without the page-curl effect
  return raw.replace(/^http:/, 'https:').replace('&edge=curl', '') + '&fife=w600';
}

function stripHtml(s?: string) {
  return s
    ?.replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Google Books, directly; if that's refused (rate limit), through Snug's own server, which caches */
export async function googleBooks(params: URLSearchParams, signal?: AbortSignal): Promise<Response> {
  const direct = new URLSearchParams(params);
  if (GOOGLE_KEY) direct.set('key', GOOGLE_KEY);
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${direct}`, { signal });
    if (res.ok) return res;
  } catch (e) {
    if (signal?.aborted) throw e;
  }
  const res = await fetch(`/api/gbooks?${params}`, { signal });
  if (!res.ok) throw new Error(`Google Books ${res.status}`);
  return res;
}

async function searchGoogle(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const res = await googleBooks(new URLSearchParams({ q: query, maxResults: '20', printType: 'books' }), signal);
  const json = (await res.json()) as { items?: GoogleVolume[] };
  return (
    (json.items ?? [])
      .filter((v) => v.volumeInfo.title && v.volumeInfo.authors?.length)
      // she only reads English and Dutch: foreign editions bring foreign blurbs and covers
      .filter((v) => !v.volumeInfo.language || v.volumeInfo.language === 'en' || v.volumeInfo.language === 'nl')
      .filter((v) => !looksForeign(stripHtml(v.volumeInfo.description)))
      .map((v, index) => {
        const info = v.volumeInfo;
        const { title, series } = parseSeries(info.title!, info.subtitle);
        // the language of this edition, as the store lists it
        const lang =
          info.language === 'nl' || info.language === 'en'
            ? info.language
            : guessLang(`${info.title} ${info.subtitle ?? ''}`);
        const r: SearchResult = {
          source: 'google' as const,
          title,
          subtitle: info.subtitle,
          authors: info.authors!,
          coverUrl: googleCover(v),
          description: stripHtml(info.description),
          genres: mapGenres(info.categories ?? []),
          pageCount: info.pageCount || undefined,
          publishedDate: info.publishedDate,
          isbn13: info.industryIdentifiers?.find((i) => i.type === 'ISBN_13')?.identifier,
          googleId: v.id,
          series,
          language: lang,
        };
        // Google has no popularity number; its own order is the best signal
        popularity.set(r, Math.max(0, 30 - index * 1.5));
        return r;
      })
  );
}

// ---------- Open Library ----------

/** Open Library search, directly; if that's refused (busy / rate limit), through Snug's own server, which caches */
export async function openLibrarySearch(params: URLSearchParams, signal?: AbortSignal): Promise<Response> {
  try {
    const res = await fetch(`https://openlibrary.org/search.json?${params}`, {
      signal,
    });
    if (res.ok) return res;
  } catch (e) {
    if (signal?.aborted) throw e;
  }
  const res = await fetch(`/api/olsearch?${params}`, { signal });
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  return res;
}

interface OLDoc {
  key: string;
  title: string;
  subtitle?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  isbn?: string[];
  number_of_pages_median?: number;
  subject?: string[];
  language?: string[];
  readinglog_count?: number;
  edition_count?: number;
}

async function searchOpenLibrary(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: '20',
    fields:
      'key,title,subtitle,author_name,cover_i,first_publish_year,isbn,number_of_pages_median,subject,language,readinglog_count,edition_count',
  });
  const res = await openLibrarySearch(params, signal);
  const json = (await res.json()) as { docs: OLDoc[] };
  return (
    json.docs
      .filter((d) => d.author_name?.length)
      // only English and Dutch: a work that is only listed in other languages is a foreign edition
      .filter((d) => !d.language?.length || d.language.includes('eng') || d.language.includes('dut'))
      .map((d) => {
        const { title, series } = parseSeries(d.title, d.subtitle);
        const langs = d.language ?? [];
        const r: SearchResult = {
          source: 'openlibrary' as const,
          title,
          subtitle: d.subtitle,
          authors: d.author_name!,
          coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : undefined,
          genres: mapGenres(d.subject?.slice(0, 40) ?? []),
          pageCount: d.number_of_pages_median,
          publishedDate: d.first_publish_year?.toString(),
          isbn13: d.isbn?.find((i) => i.length === 13),
          olKey: d.key,
          series,
          // Open Library lists the languages of all editions; the title tells which one this is
          language:
            langs.length === 1 && langs[0] === 'dut'
              ? 'nl'
              : langs.length === 1 && langs[0] === 'eng'
                ? 'en'
                : (guessLang(`${d.title} ${d.subtitle ?? ''}`) ??
                  (langs.includes('eng') ? 'en' : langs.includes('dut') ? 'nl' : undefined)),
        };
        // how many readers have it on their shelves (log scale), plus a little for many editions
        popularity.set(r, Math.log10((d.readinglog_count ?? 0) + 1) * 10 + Math.min(5, (d.edition_count ?? 1) / 4));
        return r;
      })
  );
}

/** Fetches a longer description from Open Library when we only have the basics */
export async function fetchOpenLibraryDescription(olKey: string): Promise<string | undefined> {
  try {
    const res = await fetch(`/api/ol?path=${encodeURIComponent(olKey)}`);
    if (!res.ok) return undefined;
    const json = (await res.json()) as { description?: string };
    return json.description?.replace(/\(\[source\]\[\d+\]\)|\[\d+\]:.*$/gms, '').trim() || undefined;
  } catch {
    return undefined;
  }
}

// ---------- combined ----------

/** How popular a result is (higher = better known); used to rank real books above look-alikes */
const popularity = new WeakMap<SearchResult, number>();

/** Genres from both sources together; plain "Fiction" only when nothing more specific is known */
export function mergeGenres(a: string[], b: string[]) {
  const all = [...new Set([...a, ...b])];
  return all.length > 1 ? all.filter((g) => g !== 'Fiction') : all;
}

const JUNK =
  /\b(collection|box ?set|boxed set|books? \d+\s*[-–]\s*\d+|\d books|bundle|tarot|colou?ring|journal|summary|study guide|workbook|calendar|notebook|sampler|analysis)\b/i;

/**
 * Searches Google Books and Open Library at the same time and merges the results.
 * Google usually has the nicest covers and descriptions; Open Library fills the gaps
 * (and takes over when Google is rate limited).
 */
export async function searchBooks(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const isIsbn = /^[\d-]{10,17}$/.test(q);
  const gq = isIsbn ? `isbn:${q.replace(/-/g, '')}` : q;

  // While typing, the last word is often unfinished ("a court of splin"): also search with it
  // as a prefix, so the book shows up before the word is complete
  const last = q.split(/\s+/).pop() ?? '';
  const partial = !isIsbn && last.length >= 2 && !/\s$/.test(query);
  const [google, ol, olPrefix] = await Promise.allSettled([
    searchGoogle(gq, signal),
    searchOpenLibrary(q, signal),
    partial ? searchOpenLibrary(`${q}*`, signal) : Promise.resolve([]),
  ]);
  const merged = new Map<string, SearchResult>();
  for (const r of [
    ...(google.status === 'fulfilled' ? google.value : []),
    ...(ol.status === 'fulfilled' ? ol.value : []),
    ...(olPrefix.status === 'fulfilled' ? olPrefix.value : []),
  ]) {
    const key = bookKey(r);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, r);
      continue;
    }
    // Fill in what the first source was missing
    existing.coverUrl ??= r.coverUrl;
    existing.description ??= r.description;
    existing.pageCount ??= r.pageCount;
    existing.isbn13 ??= r.isbn13;
    existing.series ??= r.series;
    existing.olKey ??= r.olKey;
    existing.language ??= r.language;
    existing.genres = mergeGenres(existing.genres, r.genres);
    popularity.set(existing, Math.max(popularity.get(existing) ?? 0, popularity.get(r) ?? 0));
  }

  if (google.status === 'rejected' && ol.status === 'rejected') {
    if (signal?.aborted) return [];
    throw new Error('Search is not reachable right now');
  }
  // Ranking: titles (or "title author") that start with what she typed come first; within that,
  // well-known books before obscure look-alikes; no cover and box sets/summaries count against
  const typed = normalize(q);
  const score = (r: SearchResult) => {
    const title = normalize(r.title);
    const starts = title.startsWith(typed) || normalize(`${r.title} ${r.authors.join(' ')}`).startsWith(typed);
    const exact = title === typed;
    return (
      (exact ? 25 : starts ? 15 : 0) +
      (popularity.get(r) ?? 0) -
      (r.coverUrl ? 0 : 8) -
      (JUNK.test(`${r.title} ${r.subtitle ?? ''}`) ? 30 : 0)
    );
  };
  const ranked = [...merged.values()].sort((a, b) => score(b) - score(a));
  // drop obscure, coverless look-alikes when there are enough real results
  const solid = ranked.filter((r) => r.coverUrl || (popularity.get(r) ?? 0) >= 12);
  return solid.length >= 3 ? solid : ranked;
}

/** From search results, the ones that are really this book (same title and author) */
export function sameBook(results: SearchResult[], title: string, author: string) {
  const surname = normalize(author).split(' ').pop() ?? '';
  const want = bookKey({ title, authors: [author] });
  return results.filter(
    (r) =>
      (bookKey(r) === want || normalize(r.title).startsWith(normalize(title))) &&
      (!surname || normalize(r.authors.join(' ')).includes(surname)),
  );
}

/**
 * A blurb for a search result that came without one: Open Library first, then Google Books.
 * Blurbs in other languages (a Hungarian edition's) are skipped.
 */
export async function findDescription(
  r: Pick<SearchResult, 'title' | 'authors' | 'olKey'>,
): Promise<string | undefined> {
  if (r.olKey) {
    const d = await fetchOpenLibraryDescription(r.olKey).catch(() => undefined);
    if (d && !looksForeign(d)) return d;
  }
  try {
    const res = await googleBooks(
      new URLSearchParams({
        q: `intitle:${r.title} inauthor:${r.authors[0] ?? ''}`,
        maxResults: '8',
        printType: 'books',
      }),
    );
    const items = ((await res.json()) as { items?: GoogleVolume[] }).items ?? [];
    for (const v of items) {
      const lang = v.volumeInfo.language;
      if (lang && lang !== 'en' && lang !== 'nl') continue;
      const d = stripHtml(v.volumeInfo.description);
      if (d && d.length > 60 && !looksForeign(d)) return d;
    }
  } catch {
    // no blurb: that's fine
  }
  return undefined;
}
