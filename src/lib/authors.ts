import { getMeta, setMeta } from '../db';
import type { Book } from '../types';
import { bookKey } from './library';
import { mapGenres, parseSeries, sameBook, searchBooks } from './bookSearch';

export interface AuthorNews {
  title: string;
  author: string;
  coverUrl?: string;
  publishedDate: string;
  upcoming: boolean;
  isbn13?: string;
  series?: { name: string; number?: number };
  genres: string[];
  description?: string;
}

const DAY = 86_400_000;

/** Authors she follows: her chosen favourites plus authors she clearly loves */
export function followedAuthors(books: Book[], favourites: string[]) {
  const stats = new Map<string, { count: number; ratingSum: number; rated: number }>();
  for (const b of books) {
    const a = b.authors[0];
    if (!a) continue;
    const s = stats.get(a) ?? { count: 0, ratingSum: 0, rated: 0 };
    s.count++;
    if (b.rating !== undefined) {
      s.ratingSum += b.rating;
      s.rated++;
    }
    stats.set(a, s);
  }
  const auto = [...stats.entries()]
    .filter(([, s]) => s.count >= 3 || (s.rated >= 1 && s.ratingSum / s.rated >= 4.5))
    .map(([a]) => a);
  const seen = new Set<string>();
  return [...favourites, ...auto].filter((a) => {
    const k = a.toLowerCase().replace(/[^a-z]/g, '');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Published in the last ~6 months, or coming out */
function recent(date: string | undefined) {
  if (!date) return false;
  const t = Date.parse(date.length === 4 ? `${date}-07-01` : date);
  return !Number.isNaN(t) && t > Date.now() - 180 * DAY;
}

// ---------- telling real new books from translations, re-issues and placeholders ----------

const FOREIGN =
  /\b(el|la|los|las|del|un|una|uno|um|uma|nunca|talvez|jamais|día|dia|edición|edicion|especial|alas|de la|le|les|des|une|et|du|der|die|das|und|ein|eine|il|lo|gli|och|og|ja)\b|[áéíóúñãõçâêôàèìòùäöüß¿¡]/i;
const NOT_A_NEW_BOOK =
  /\b(box ?set|collection|bind-?up|omnibus|books? \d+\s*[-–&]\s*\d+|\d books|summary|study guide|workbook|journal|colou?ring|calendar|language edition|untitled|tbc|tba)\b|\s\/\s/i;

/** "Onyx Storm (Deluxe Limited Edition)" → "Onyx Storm" */
export function baseTitle(t: string) {
  return t
    .replace(/\s*[([].*?[)\]]\s*/g, ' ')
    .replace(/\s*[:–—-]\s*(a novel|the .*edition|.*edition|.*sprayed edges.*)$/i, '')
    .replace(/\b(deluxe|special|collector'?s|limited|exclusive|signed|illustrated|anniversary)\b.*\bedition\b/i, '')
    .replace(/\b(with )?(stencil(l)?ed |sprayed )edges?\b/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Is this a real, new English/Dutch book by (only) this author? */
function isRealNewBook(title: string, authors: string[] | undefined, author: string) {
  const same = (a: string) => a.toLowerCase().replace(/[^a-z]/g, '') === author.toLowerCase().replace(/[^a-z]/g, '');
  if (!authors?.length || !same(authors[0])) return false;
  if (authors.length > 1) return false; // translations list the translator as second author
  if (NOT_A_NEW_BOOK.test(title)) return false;
  if (FOREIGN.test(title)) return false;
  if (/^[\w\s]+ \d+$/.test(title) && title.split(' ').length <= 3) return false; // "The Empyrean 5"
  return true;
}

// ---------- sources ----------

async function fromGoogle(author: string): Promise<AuthorNews[]> {
  const key = import.meta.env.VITE_GOOGLE_BOOKS_KEY as string | undefined;
  const params = new URLSearchParams({ q: `inauthor:"${author}"`, orderBy: 'newest', maxResults: '30', printType: 'books' });
  if (key) params.set('key', key);
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`);
  if (!res.ok) throw new Error('google');
  const json = (await res.json()) as {
    items?: {
      volumeInfo: {
        title?: string;
        subtitle?: string;
        authors?: string[];
        publishedDate?: string;
        categories?: string[];
        description?: string;
        language?: string;
        imageLinks?: { thumbnail?: string };
        industryIdentifiers?: { type: string; identifier: string }[];
      };
    }[];
  };
  return (json.items ?? [])
    .map((i) => i.volumeInfo)
    .filter(
      (v) =>
        v.title &&
        (v.language === 'en' || v.language === 'nl') &&
        recent(v.publishedDate) &&
        isRealNewBook(v.title, v.authors, author),
    )
    .map((v) => {
      const { title, series } = parseSeries(v.title!, v.subtitle);
      return {
        title: baseTitle(title),
        author,
        series,
        coverUrl: v.imageLinks?.thumbnail
          ? `${v.imageLinks.thumbnail.replace(/^http:/, 'https:').replace('&edge=curl', '')}&fife=w400`
          : undefined,
        publishedDate: v.publishedDate!,
        upcoming: Date.parse(v.publishedDate!) > Date.now(),
        isbn13: v.industryIdentifiers?.find((x) => x.type === 'ISBN_13')?.identifier,
        genres: mapGenres(v.categories ?? []),
        description: v.description,
      };
    });
}

/** Open Library works: one per book, with the original title */
async function fromOpenLibrary(author: string): Promise<AuthorNews[]> {
  const params = new URLSearchParams({
    author,
    sort: 'new',
    limit: '30',
    fields: 'title,subtitle,author_name,first_publish_year,publish_date,cover_i,subject,language',
  });
  const res = await fetch(`https://openlibrary.org/search.json?${params}`);
  if (!res.ok) throw new Error('ol');
  const json = (await res.json()) as {
    docs: {
      title: string;
      subtitle?: string;
      author_name?: string[];
      first_publish_year?: number;
      cover_i?: number;
      subject?: string[];
      language?: string[];
      publish_date?: string[];
    }[];
  };
  const year = new Date().getFullYear();
  // an exact date when Open Library has one in that year (e.g. "January 12, 2027" or "2027-01-12")
  const exactDate = (dates: string[] | undefined, y: number) => {
    for (const d of dates ?? []) {
      if (!/[a-z]/i.test(d) && !/^\d{4}-\d{2}-\d{2}$/.test(d)) continue; // skip ambiguous 01/12/2027
      const t = Date.parse(d);
      if (!Number.isNaN(t) && new Date(t).getFullYear() === y) return new Date(t).toISOString().slice(0, 10);
    }
    return String(y);
  };
  return json.docs
    .filter(
      (d) =>
        d.first_publish_year &&
        d.first_publish_year >= year &&
        // English/Dutch, or no language known yet (brand new)
        (!d.language?.length || d.language.some((l) => l === 'eng' || l === 'dut')) &&
        isRealNewBook(d.title, d.author_name, author),
    )
    .map((d) => {
      const { title, series } = parseSeries(d.title, d.subtitle);
      return {
        title: baseTitle(title),
        author,
        series,
        coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : undefined,
        publishedDate: exactDate(d.publish_date, d.first_publish_year!),
        upcoming: d.first_publish_year! > year || Date.parse(exactDate(d.publish_date, d.first_publish_year!)) > Date.now(),
        genres: mapGenres(d.subject?.slice(0, 20) ?? []),
      };
    });
}

/** New and upcoming books by an author, from both sources combined (cached for a day) */
export async function authorNews(author: string): Promise<AuthorNews[]> {
  const cacheKey = `authorNews5:${author.toLowerCase()}`; // v5: exact dates where known
  const cached = await getMeta<{ at: number; items: AuthorNews[] } | null>(cacheKey, null);
  if (cached && Date.now() - cached.at < DAY) return cached.items;

  const [google, ol] = await Promise.all([fromGoogle(author).catch(() => []), fromOpenLibrary(author).catch(() => [])]);

  // One entry per book: Google gives exact dates and descriptions, Open Library the canonical
  // title and often a cover; fill in each other's gaps
  const byBook = new Map<string, AuthorNews>();
  for (const i of [...google, ...ol]) {
    const k = bookKey({ title: i.title, authors: [i.author] });
    const prev = byBook.get(k);
    if (!prev) {
      byBook.set(k, { ...i });
      continue;
    }
    prev.coverUrl ??= i.coverUrl;
    prev.description ??= i.description;
    prev.isbn13 ??= i.isbn13;
    prev.series ??= i.series;
    if (!prev.genres.length) prev.genres = i.genres;
    if (prev.publishedDate.length < i.publishedDate.length) prev.publishedDate = i.publishedDate;
  }
  const items = [...byBook.values()];

  // Still no cover: borrow one, but only from an English/Dutch edition with exactly this title
  for (const item of items.filter((i) => !i.coverUrl)) {
    const results = await searchBooks(`${item.title} ${item.author}`).catch(() => []);
    const want = bookKey({ title: item.title, authors: [item.author] });
    item.coverUrl = sameBook(results, item.title, item.author).find(
      (r) =>
        r.coverUrl &&
        bookKey({ title: baseTitle(r.title), authors: [item.author] }) === want &&
        r.language !== undefined &&
        (r.language === 'en' || r.language === 'nl'),
    )?.coverUrl;
  }

  await setMeta(cacheKey, { at: Date.now(), items });
  return items;
}
