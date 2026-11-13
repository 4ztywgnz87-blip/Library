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

function recent(date: string | undefined) {
  if (!date) return false;
  const t = Date.parse(date.length === 4 ? `${date}-07-01` : date);
  return !Number.isNaN(t) && t > Date.now() - 180 * DAY;
}

async function fromGoogle(author: string): Promise<AuthorNews[]> {
  const key = import.meta.env.VITE_GOOGLE_BOOKS_KEY as string | undefined;
  const params = new URLSearchParams({ q: `inauthor:"${author}"`, orderBy: 'newest', maxResults: '20', printType: 'books' });
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
        v.authors?.some((a) => a.toLowerCase() === author.toLowerCase()) &&
        recent(v.publishedDate) &&
        // English and Dutch editions only (no "Día de ceifa" for "Sunrise on the Reaping")
        (v.language === 'en' || v.language === 'nl'),
    )
    .map((v) => {
      const { title, series } = parseSeries(v.title!, v.subtitle);
      return {
        title,
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

async function fromOpenLibrary(author: string): Promise<AuthorNews[]> {
  const params = new URLSearchParams({
    author,
    sort: 'new',
    limit: '15',
    fields: 'title,subtitle,author_name,first_publish_year,cover_i,subject,language',
  });
  const res = await fetch(`https://openlibrary.org/search.json?${params}`);
  if (!res.ok) throw new Error('ol');
  const json = (await res.json()) as {
    docs: { title: string; subtitle?: string; first_publish_year?: number; cover_i?: number; subject?: string[]; language?: string[] }[];
  };
  return json.docs
    .filter(
      (d) =>
        d.first_publish_year &&
        d.first_publish_year >= new Date().getFullYear() &&
        (!d.language || d.language.some((l) => l === 'eng' || l === 'dut')),
    )
    .map((d) => {
      const { title, series } = parseSeries(d.title, d.subtitle);
      return {
        title,
        author,
        series,
        coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : undefined,
        publishedDate: String(d.first_publish_year),
        upcoming: d.first_publish_year! > new Date().getFullYear(),
        genres: mapGenres(d.subject?.slice(0, 20) ?? []),
      };
    });
}

/** Title without edition extras: "Onyx Storm (Deluxe Limited Edition)" → "Onyx Storm" */
export function baseTitle(t: string) {
  return t
    .replace(/\s*[([].*?[)\]]\s*/g, ' ')
    .replace(/\s*[:–—-]\s*(a novel|the .*edition|.*edition|.*sprayed edges.*)$/i, '')
    .replace(/\b(deluxe|special|collector'?s|limited|exclusive|signed|illustrated|anniversary)\b.*\bedition\b/i, '')
    .replace(/\b(with )?(stencil(l)?ed |sprayed )edges?\b/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** New and upcoming books by an author (cached for a day) */
export async function authorNews(author: string): Promise<AuthorNews[]> {
  const cacheKey = `authorNews3:${author.toLowerCase()}`; // v3: EN/NL only, one entry per book
  const cached = await getMeta<{ at: number; items: AuthorNews[] } | null>(cacheKey, null);
  if (cached && Date.now() - cached.at < DAY) return cached.items;
  let items: AuthorNews[];
  try {
    items = await fromGoogle(author);
  } catch {
    items = await fromOpenLibrary(author).catch(() => []);
  }
  // One entry per book: stores list many editions ("... (Deluxe Edition)", "... with sprayed edges")
  const byBook = new Map<string, AuthorNews>();
  for (const i of items) {
    if (/box ?set|collection|\d books/i.test(i.title)) continue;
    const k = bookKey({ title: baseTitle(i.title), authors: [i.author] });
    const prev = byBook.get(k);
    // keep the plain edition (shortest title), and remember a cover if it had none
    if (!prev || i.title.length < prev.title.length) byBook.set(k, { ...i, title: baseTitle(i.title), coverUrl: i.coverUrl ?? prev?.coverUrl });
    else prev.coverUrl ??= i.coverUrl;
  }
  items = [...byBook.values()];
  // Books without a cover in this source: borrow one from the regular book search
  for (const item of items.filter((i) => !i.coverUrl)) {
    const results = await searchBooks(`${item.title} ${item.author}`).catch(() => []);
    item.coverUrl = sameBook(results, item.title, item.author).find(
      (r) => r.coverUrl && (r.language === 'en' || r.language === 'nl' || r.language === undefined),
    )?.coverUrl;
  }
  await setMeta(cacheKey, { at: Date.now(), items });
  return items;
}
