import { getMeta, setMeta } from '../db';
import type { Book } from '../types';
import { bookKey } from './library';
import { mapGenres, parseSeries } from './bookSearch';

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
        imageLinks?: { thumbnail?: string };
        industryIdentifiers?: { type: string; identifier: string }[];
      };
    }[];
  };
  return (json.items ?? [])
    .map((i) => i.volumeInfo)
    .filter((v) => v.title && v.authors?.some((a) => a.toLowerCase() === author.toLowerCase()) && recent(v.publishedDate))
    .map((v) => {
      const { title, series } = parseSeries(v.title!, v.subtitle);
      return {
        title,
        author,
        series,
        coverUrl: v.imageLinks?.thumbnail?.replace(/^http:/, 'https:').replace('&edge=curl', '') + '&fife=w400',
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
    fields: 'title,subtitle,author_name,first_publish_year,cover_i,subject',
  });
  const res = await fetch(`https://openlibrary.org/search.json?${params}`);
  if (!res.ok) throw new Error('ol');
  const json = (await res.json()) as {
    docs: { title: string; subtitle?: string; first_publish_year?: number; cover_i?: number; subject?: string[] }[];
  };
  return json.docs
    .filter((d) => d.first_publish_year && d.first_publish_year >= new Date().getFullYear())
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

/** New and upcoming books by an author (cached for a day) */
export async function authorNews(author: string): Promise<AuthorNews[]> {
  const cacheKey = `authorNews:${author.toLowerCase()}`;
  const cached = await getMeta<{ at: number; items: AuthorNews[] } | null>(cacheKey, null);
  if (cached && Date.now() - cached.at < DAY) return cached.items;
  let items: AuthorNews[];
  try {
    items = await fromGoogle(author);
  } catch {
    items = await fromOpenLibrary(author).catch(() => []);
  }
  // One entry per book (stores list many editions)
  const seen = new Set<string>();
  items = items.filter((i) => {
    const k = bookKey({ title: i.title, authors: [i.author] });
    if (seen.has(k) || /box ?set|collection|\d books/i.test(i.title)) return false;
    seen.add(k);
    return true;
  });
  await setMeta(cacheKey, { at: Date.now(), items });
  return items;
}
