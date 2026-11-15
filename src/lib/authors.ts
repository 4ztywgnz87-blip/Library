import { getMeta, setMeta } from '../db';
import { notOwned, type Book } from '../types';
import { bookKey } from './library';
import {
  googleBooks,
  mapGenres,
  openLibrarySearch,
  parseSeries,
  sameBook,
  searchBooks,
  seriesFromDescription,
} from './bookSearch';

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

export interface AutoAuthor {
  name: string;
  /** why Snug follows this author, in her words ("3 books in your library") */
  reason: string;
}

/**
 * Authors Snug follows by itself: those she has more than one book of, and those of whom a single
 * book got an exceptional rating (4.5★ or more). Wishlist books don't count.
 */
export function autoAuthors(books: Book[]): AutoAuthor[] {
  const stats = new Map<string, { count: number; best?: Book }>();
  for (const b of books) {
    const a = b.authors[0];
    if (!a || notOwned(b)) continue;
    const s = stats.get(a) ?? { count: 0 };
    s.count++;
    if (b.rating !== undefined && (!s.best || b.rating > s.best.rating!)) s.best = b;
    stats.set(a, s);
  }
  return [...stats.entries()]
    .map(([name, s]) => ({ name, s, loved: s.best && s.best.rating! >= 4.5 }))
    .filter((x) => x.s.count >= 2 || x.loved)
    .sort((a, b) => Number(!!b.loved) - Number(!!a.loved) || b.s.count - a.s.count)
    .map(({ name, s, loved }) => ({
      name,
      reason: loved
        ? `you gave ${s.best!.title} ${s.best!.rating}★${s.count > 1 ? ` · ${s.count} books` : ''}`
        : `${s.count} books in your library`,
    }));
}

const sameAuthor = (a: string, b: string) =>
  a.toLowerCase().replace(/[^a-z]/g, '') === b.toLowerCase().replace(/[^a-z]/g, '');

/** Authors she follows: her chosen favourites plus the ones Snug follows by itself (minus the ones she muted) */
export function followedAuthors(books: Book[], favourites: string[], muted: string[] = []) {
  const auto = autoAuthors(books)
    .map((a) => a.name)
    .filter((a) => !muted.some((m) => sameAuthor(m, a)));
  const seen = new Set<string>();
  return [...favourites, ...auto].filter((a) => {
    const k = a.toLowerCase().replace(/[^a-z]/g, '');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** How far back a book still counts as new (a year), and how far ahead an announcement counts (2.5 years) */
const NEW_WINDOW = 365 * DAY;
const AHEAD_WINDOW = 913 * DAY;

/** Published in the last year, or coming out */
function recent(date: string | undefined) {
  if (!date) return false;
  const t = Date.parse(date.length === 4 ? `${date}-07-01` : date);
  // not older than a year, and not further ahead than 2.5 years (that's a typo in a listing, like "3430")
  return !Number.isNaN(t) && t > Date.now() - NEW_WINDOW && t < Date.now() + AHEAD_WINDOW;
}

const noArticle = (t: string) => t.replace(/^(the|a|an|de|het|een)\s+/i, '');
/** "Witch" and "The Witch" are one book */
const newsKey = (i: { title: string; author: string }) => bookKey({ title: noArticle(i.title), authors: [i.author] });

// ---------- telling real new books from translations, re-issues and placeholders ----------

const FOREIGN =
  /\b(el|la|los|las|del|un|una|uno|um|uma|nunca|talvez|jamais|día|dia|edición|edicion|especial|alas|de la|le|les|des|une|et|du|der|die|das|und|ein|eine|il|lo|gli|och|og|ja)\b|[áéíóúñãõçâêôàèìòùäöüß¿¡]/i;
/** A special/deluxe/anniversary… edition is a new printing of an existing book, not a new book */
const AN_EDITION =
  /\b(deluxe|special|collector'?s?|anniversary|limited|exclusive|illustrated|signed|reissue|re-?release|new edition|(?:\w+ )?edition)\b/i;
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
  if (AN_EDITION.test(title)) return false;
  if (FOREIGN.test(title)) return false;
  if (/^[\w\s]+ \d+$/.test(title) && title.split(' ').length <= 3) return false; // "The Empyrean 5"
  return true;
}

// ---------- sources ----------

async function fromGoogle(author: string): Promise<AuthorNews[]> {
  const res = await googleBooks(
    new URLSearchParams({ q: `inauthor:"${author}"`, orderBy: 'newest', maxResults: '30', printType: 'books' }),
  );
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
        // what the blurb says in so many words beats a (sometimes wrong) number in a subtitle
        series: seriesFromDescription(v.description) ?? series,
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
async function fromOpenLibrary(author: string): Promise<{ items: AuthorNews[]; older: Set<string> }> {
  const params = new URLSearchParams({
    author,
    sort: 'new',
    limit: '30',
    fields: 'title,subtitle,author_name,first_publish_year,publish_date,cover_i,subject,language',
  });
  const res = await openLibrarySearch(params);
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
  // books first published before this year: a Google edition dated this year is just a new printing
  const older = new Set(
    json.docs
      .filter((d) => d.first_publish_year && d.first_publish_year < year)
      .map((d) => newsKey({ title: baseTitle(d.title), author })),
  );
  const items = json.docs
    .filter(
      (d) =>
        d.first_publish_year &&
        d.first_publish_year >= year &&
        d.first_publish_year <= year + 3 &&
        // English or Dutch, and known to be: an entry without a language is left out
        d.language?.some((l) => l === 'eng' || l === 'dut') &&
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
        upcoming:
          d.first_publish_year! > year || Date.parse(exactDate(d.publish_date, d.first_publish_year!)) > Date.now(),
        genres: mapGenres(d.subject?.slice(0, 20) ?? []),
      };
    });
  return { items, older };
}

/**
 * When this book first came out: the earliest date among its English/Dutch editions on Google Books.
 * A new printing of an old book carries a new date, but the earliest edition tells the truth.
 * Kept for good (a first publication never changes).
 */
async function firstPublished(title: string, author: string): Promise<number | null> {
  const key = `firstPub:${newsKey({ title, author })}`;
  const saved = await getMeta<{ t: number | null } | null>(key, null);
  if (saved) return saved.t;
  try {
    const res = await googleBooks(
      new URLSearchParams({ q: `intitle:"${title}" inauthor:"${author}"`, maxResults: '20', printType: 'books' }),
    );
    const json = (await res.json()) as {
      items?: { volumeInfo: { title?: string; language?: string; publishedDate?: string } }[];
    };
    const want = newsKey({ title, author });
    const dates = (json.items ?? [])
      .map((x) => x.volumeInfo)
      .filter(
        (v) =>
          v.title &&
          v.publishedDate &&
          (!v.language || v.language === 'en' || v.language === 'nl') &&
          !NOT_A_NEW_BOOK.test(v.title) &&
          newsKey({ title: baseTitle(v.title), author }) === want,
      )
      .map((v) => Date.parse(v.publishedDate!.length === 4 ? `${v.publishedDate}-07-01` : v.publishedDate!))
      .filter((t) => !Number.isNaN(t) && t > Date.parse('1900-01-01'));
    const t = dates.length ? Math.min(...dates) : null;
    await setMeta(key, { t });
    return t;
  } catch {
    return null; // can't tell right now: leave the book in
  }
}

/** New and upcoming books by an author, from both sources combined (cached for a day) */
export async function authorNews(author: string): Promise<AuthorNews[]> {
  const cacheKey = `authorNews11:${author.toLowerCase()}`; // v8: no foreign editions, no re-issues, no duplicates
  const cached = await getMeta<{ at: number; items: AuthorNews[] } | null>(cacheKey, null);
  if (cached && Date.now() - cached.at < DAY) return cached.items;

  const [googleItems, olResult] = await Promise.all([
    fromGoogle(author).catch(() => [] as AuthorNews[]),
    fromOpenLibrary(author).catch(() => ({ items: [] as AuthorNews[], older: new Set<string>() })),
  ]);
  // Google dates the edition: a new printing of an old book isn't a new book
  const google = googleItems.filter((i) => i.upcoming || !olResult.older.has(newsKey(i)));
  const ol = olResult.items;

  // One entry per book: Google gives exact dates and descriptions, Open Library the canonical
  // title and often a cover; fill in each other's gaps
  const byBook = new Map<string, AuthorNews>();
  for (const i of [...google, ...ol]) {
    const k = newsKey(i);
    const prev = byBook.get(k);
    if (!prev) {
      byBook.set(k, { ...i });
      continue;
    }
    // "Witch" and "The Witch": the title with the article is the real one
    if (i.title.length > prev.title.length && noArticle(i.title) === prev.title) prev.title = i.title;
    prev.coverUrl ??= i.coverUrl;
    prev.description ??= i.description;
    prev.isbn13 ??= i.isbn13;
    prev.series ??= i.series;
    if (!prev.genres.length) prev.genres = i.genres;
    if (prev.publishedDate.length < i.publishedDate.length) prev.publishedDate = i.publishedDate;
  }
  const merged = [...byBook.values()];

  // A new printing of an old book isn't a new book: when the earliest edition is older than the
  // "new" window (a year), it's the same old book (only books that are still to come are always kept)
  const items: AuthorNews[] = [];
  for (const item of merged) {
    if (item.upcoming) {
      items.push(item);
      continue;
    }
    const first = await firstPublished(item.title, item.author);
    if (first === null || first > Date.now() - NEW_WINDOW) items.push(item);
  }

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

  // No series or blurb yet (often brand-new books that only Open Library listed): ask Google
  // about this very title; its blurb may say "the seventh book in the … series"
  for (const item of items.filter((i) => !i.series || !i.description).slice(0, 6)) {
    const res = await googleBooks(
      new URLSearchParams({
        q: `intitle:"${item.title}" inauthor:"${item.author}"`,
        maxResults: '10',
        printType: 'books',
      }),
    ).catch(() => undefined);
    const json = res
      ? ((await res.json().catch(() => ({}))) as {
          items?: { volumeInfo: { title?: string; subtitle?: string; description?: string; publishedDate?: string } }[];
        })
      : {};
    const same = (json.items ?? [])
      .map((x) => x.volumeInfo)
      .filter(
        (v) =>
          v.title &&
          bookKey({ title: baseTitle(v.title), authors: [item.author] }) ===
            bookKey({ title: item.title, authors: [item.author] }),
      );
    item.series ??=
      same.map((v) => seriesFromDescription(v.description)).find(Boolean) ??
      same.map((v) => parseSeries(v.title!, v.subtitle).series).find(Boolean);
    item.description ??= same.find((v) => v.description)?.description;
    // an exact release date beats just a year
    const exact = same
      .map((v) => v.publishedDate ?? '')
      .find((d) => d.length > item.publishedDate.length && d.startsWith(item.publishedDate.slice(0, 4)));
    if (exact) item.publishedDate = exact;
  }

  await setMeta(cacheKey, { at: Date.now(), items });
  return items;
}
