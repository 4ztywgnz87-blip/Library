import type { Book, Lang, SeriesInfo } from '../types';
import { bookKey, normalize } from './library';

/** A search hit, not yet in her library */
export type SearchResult = Omit<
  Book,
  'id' | 'status' | 'language' | 'specialEdition' | 'tags' | 'addedAt' | 'updatedAt'
> & { language?: Lang; source: 'google' | 'openlibrary' };

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_BOOKS_KEY as string | undefined;

// ---------- genres ----------

/** Turns messy store categories into her own genre list */
export function mapGenres(categories: string[]): string[] {
  const text = categories.join(' | ').toLowerCase();
  const out = new Set<string>();
  const fantasy = /fantasy|fae|dragon|magic|witch|vampire|paranormal/.test(text);
  const romance = /romance|love stor/.test(text);
  if (fantasy && romance) out.add('Romantasy');
  if (fantasy) out.add('Fantasy');
  if (romance) out.add('Romance');
  if (/erotic|erotica|spicy/.test(text)) out.add('Spicy');
  if (/thriller|suspense/.test(text)) out.add('Thriller');
  if (/mystery|detective|crime|whodunit/.test(text)) out.add('Mystery');
  if (/histor/.test(text)) out.add('Historical');
  if (/science fiction|sci-fi|dystop/.test(text)) out.add('Sci-fi');
  if (/young adult|juvenile/.test(text)) out.add('Young adult');
  if (out.size === 0 && /fiction|novel|literature|roman/.test(text)) out.add('Fiction');
  return [...out];
}

// ---------- series ----------

/** Finds "(Crescent City, #2)" or "Crescent City 2:" style series hints in a title */
export function parseSeries(title: string, subtitle?: string): { title: string; series?: SeriesInfo } {
  const paren = title.match(/^(.*?)\s*\(([^()#]+?),?\s*#\s*(\d+(?:\.\d+)?)\)\s*$/);
  if (paren) return { title: paren[1], series: { name: paren[2].trim(), number: Number(paren[3]) } };
  const sub = subtitle?.match(/^(?:(?:book|deel|vol\.?|volume)\s*(\d+)\s*(?:of|in|van)\s*(?:the\s*)?)(.+?)(?:\s*series)?$/i);
  if (sub) return { title, series: { name: sub[2].trim(), number: Number(sub[1]) } };
  const sub2 = subtitle?.match(/^(?:a\s+)?(.+?)\s+(?:novel|book|series)\s*(?:#|book\s*)?(\d+)?$/i);
  if (sub2 && sub2[2]) return { title, series: { name: sub2[1].trim(), number: Number(sub2[2]) } };
  return { title };
}

// ---------- language ----------

const DUTCH = /\b(de|het|een|van|en|ik|je|jij|niet|wat|zijn|haar|hij|zij|wij|ons|voor|met|naar|uit|op|bij|als|maar|nooit|altijd|liefde|nacht|dag|meisje|huis|boek|deel)\b/gi;
const ENGLISH = /\b(the|a|an|of|and|to|in|is|you|it|we|my|your|never|always|love|night|day|girl|house|book|with|from)\b/gi;

/** Rough guess from the title: Dutch or English? */
export function guessLang(text: string): Lang | undefined {
  const nl = text.match(DUTCH)?.length ?? 0;
  const en = text.match(ENGLISH)?.length ?? 0;
  if (nl > en) return 'nl';
  if (en > nl) return 'en';
  return undefined;
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
  return s?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function searchGoogle(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, maxResults: '20', printType: 'books' });
  if (GOOGLE_KEY) params.set('key', GOOGLE_KEY);
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, { signal });
  if (!res.ok) throw new Error(`Google Books ${res.status}`);
  const json = (await res.json()) as { items?: GoogleVolume[] };
  return (json.items ?? [])
    .filter((v) => v.volumeInfo.title && v.volumeInfo.authors?.length)
    .map((v) => {
      const info = v.volumeInfo;
      const { title, series } = parseSeries(info.title!, info.subtitle);
      // the language of this edition, as the store lists it
      const lang =
        info.language === 'nl' || info.language === 'en' ? info.language : guessLang(`${info.title} ${info.subtitle ?? ''}`);
      return {
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
    });
}

// ---------- Open Library ----------

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
}

async function searchOpenLibrary(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: '20',
    fields: 'key,title,subtitle,author_name,cover_i,first_publish_year,isbn,number_of_pages_median,subject,language',
  });
  const res = await fetch(`https://openlibrary.org/search.json?${params}`, { signal });
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  const json = (await res.json()) as { docs: OLDoc[] };
  return json.docs
    .filter((d) => d.author_name?.length)
    .map((d) => {
      const { title, series } = parseSeries(d.title, d.subtitle);
      const langs = d.language ?? [];
      return {
        source: 'openlibrary' as const,
        title,
        subtitle: d.subtitle,
        authors: d.author_name!,
        coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : undefined,
        genres: mapGenres(d.subject?.slice(0, 30) ?? []),
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
              : (guessLang(`${d.title} ${d.subtitle ?? ''}`) ?? (langs.includes('eng') ? 'en' : langs.includes('dut') ? 'nl' : undefined)),
      };
    });
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

  const [google, ol] = await Promise.allSettled([searchGoogle(gq, signal), searchOpenLibrary(q, signal)]);
  const merged = new Map<string, SearchResult>();
  for (const r of [
    ...(google.status === 'fulfilled' ? google.value : []),
    ...(ol.status === 'fulfilled' ? ol.value : []),
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
    if (!existing.genres.length) existing.genres = r.genres;
  }

  if (google.status === 'rejected' && ol.status === 'rejected') {
    if (signal?.aborted) return [];
    throw new Error('Search is not reachable right now');
  }
  // Real editions with a cover first; box sets, journals, summaries etc. last
  const score = (r: SearchResult) =>
    (r.coverUrl ? 0 : 1) + (JUNK.test(`${r.title} ${r.subtitle ?? ''}`) ? 2 : 0);
  return [...merged.values()].sort((a, b) => score(a) - score(b));
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
