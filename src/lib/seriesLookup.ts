import { db } from '../db';
import type { Book, SeriesInfo } from '../types';
import { normalize, updateBook } from './library';

/** First words of a title, e.g. "a court of" for "A Court of Mist and Fury" */
const titleStart = (t: string, words = 3) => normalize(t).split(' ').slice(0, words).join(' ');

/**
 * Brand-new books often have no series data online yet. If the same author has a series in her
 * library whose titles start the same way ("A Court of …"), it's that series; the number is the
 * next one after the highest part we know of.
 */
async function guessSeriesFromLibrary(book: Pick<Book, 'id' | 'title' | 'authors'>): Promise<SeriesInfo | undefined> {
  const author = normalize(book.authors[0] ?? '');
  if (!author) return undefined;
  const all = await db.books.filter((b) => !b.deleted && b.id !== book.id && !!b.series).toArray();
  const sameAuthor = all.filter((b) => normalize(b.authors[0] ?? '') === author);
  const start = titleStart(book.title);
  const bySeries = new Map<string, Book[]>();
  for (const b of sameAuthor) {
    if (titleStart(b.title) !== start) continue;
    const k = normalize(b.series!.name);
    bySeries.set(k, [...(bySeries.get(k) ?? []), b]);
  }
  const best = [...bySeries.values()].sort((a, b) => b.length - a.length)[0];
  if (!best || best.length < 2) return undefined;
  const series = best[0].series!;
  // highest part number known: from her books and the full series list (if we have it)
  let max = Math.max(0, ...best.map((b) => b.series?.number ?? 0));
  const key = best.find((b) => b.series?.key)?.series?.key;
  if (key) {
    try {
      const res = await fetch(`/api/series-books?key=${key}`);
      const { books } = (await res.json()) as { books: { number: number }[] };
      max = Math.max(max, ...books.map((b) => b.number));
    } catch {
      // offline: her own books are enough
    }
  }
  return { name: series.name, number: max ? max + 1 : undefined, key };
}

/** Genres from the other parts of the series, otherwise from her books by the same author */
async function guessGenres(book: Pick<Book, 'id' | 'authors'>, series?: SeriesInfo): Promise<string[]> {
  const all = await db.books.filter((b) => !b.deleted && b.id !== book.id && b.genres.length > 0).toArray();
  const pool = series
    ? all.filter((b) => b.series && normalize(b.series.name) === normalize(series.name))
    : all.filter((b) => normalize(b.authors[0] ?? '') === normalize(book.authors[0] ?? ''));
  const count = new Map<string, number>();
  for (const b of pool) for (const g of b.genres) count.set(g, (count.get(g) ?? 0) + 1);
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g);
}

/**
 * Fills in series (Open Library, free) and, when missing, genres for a book.
 * Never overwrites what she typed herself.
 */
export async function lookupSeries(
  book: Pick<Book, 'id' | 'title' | 'authors' | 'series'>,
): Promise<SeriesInfo | undefined> {
  if (!navigator.onLine) return undefined;
  try {
    const params = new URLSearchParams({ title: book.title, author: book.authors[0] ?? '' });
    const res = await fetch(`/api/book-series?${params}`);
    const found = res.ok ? ((await res.json()) as Partial<SeriesInfo>) : {};
    let series: SeriesInfo | undefined = found.name ? { name: found.name, number: found.number, key: found.key } : undefined;
    if (!series) series = await guessSeriesFromLibrary(book);

    const current = await db.books.get(book.id);
    if (!current) return undefined;
    const patch: Partial<Book> = { seriesChecked: true, lookupVersion: LOOKUP_VERSION };
    if (!current.series && series) patch.series = series;
    if (!current.genres.length) {
      const genres = await guessGenres(current, patch.series ?? current.series);
      if (genres.length) patch.genres = genres;
    }
    await updateBook(book.id, patch);
    if (patch.series ?? current.series) await harmonizeSeriesGenres();
    return patch.series ?? current.series;
  } catch {
    return undefined;
  }
}

/** Bump to look up older books again when the lookup gets smarter */
const LOOKUP_VERSION = 2;

let running = false;

/** Fills in series for books added before this existed, a few at a time */
export async function backfillSeries(max = 25) {
  if (running || !navigator.onLine) return;
  running = true;
  try {
    const todo = (
      await db.books
        .filter((b) => !b.deleted && (!b.series || !b.genres.length) && (b.lookupVersion ?? 0) < LOOKUP_VERSION)
        .toArray()
    ).slice(0, max);
    for (const b of todo) await lookupSeries(b);
  } finally {
    running = false;
  }
}

/** Same series, same genres: every part gets the genres the other parts have (only adds) */
export async function harmonizeSeriesGenres() {
  const books = await db.books.filter((b) => !b.deleted && !!b.series).toArray();
  const groups = new Map<string, Book[]>();
  for (const b of books) {
    const k = normalize(b.series!.name);
    groups.set(k, [...(groups.get(k) ?? []), b]);
  }
  for (const parts of groups.values()) {
    if (parts.length < 2) continue;
    const all = [...new Set(parts.flatMap((b) => b.genres))];
    for (const b of parts) {
      const missing = all.filter((g) => !b.genres.includes(g));
      if (missing.length) await updateBook(b.id, { genres: [...b.genres, ...missing] });
    }
  }
}

/** Turns a genre on or off for a book and, when it's part of a series, for the whole series */
export async function setGenreForSeries(book: Book, genre: string, on: boolean) {
  const parts = book.series
    ? await db.books.filter((b) => !b.deleted && !!b.series && normalize(b.series.name) === normalize(book.series!.name)).toArray()
    : [book];
  for (const b of parts) {
    const has = b.genres.includes(genre);
    if (on && !has) await updateBook(b.id, { genres: [...b.genres, genre] });
    if (!on && has) await updateBook(b.id, { genres: b.genres.filter((g) => g !== genre) });
  }
}
