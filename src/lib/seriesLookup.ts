import { db } from '../db';
import type { Book, SeriesInfo } from '../types';
import { normalize, updateBook } from './library';
import { findDescription, looksForeign, mapGenres, mergeGenres, searchBooks } from './bookSearch';
import { isbnCover } from './coverCache';
import { bookKey } from './library';

/** First words of a title, e.g. "a court of" for "A Court of Mist and Fury" */
export const titleStart = (t: string, words = 3) => normalize(t).split(' ').slice(0, words).join(' ');

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

/**
 * Last resort: Claude (once per book, remembered on the server). Open Library mostly doesn't know
 * translated editions or lesser known books. The author's series she already has are passed along,
 * so the same series keeps the same spelling.
 */
async function askSeries(book: Pick<Book, 'id' | 'title' | 'authors'>): Promise<SeriesInfo | 'paused' | undefined> {
  const author = book.authors[0] ?? '';
  if (!author) return undefined;
  const mine = await db.books
    .filter((b) => !b.deleted && b.id !== book.id && !!b.series && normalize(b.authors[0] ?? '') === normalize(author))
    .toArray();
  const known = [...new Set(mine.map((b) => b.series!.name))];
  const params = new URLSearchParams({ title: book.title, author, known: known.join('|') });
  try {
    const res = await fetch(`/api/ai/book-series?${params}`);
    if (!res.ok) return undefined;
    const found = (await res.json()) as { name?: string; number?: number; paused?: boolean };
    if (found.paused) return 'paused';
    if (!found.name) return undefined;
    // a number another part of the series already has can't be right: better none than a wrong one
    const taken = mine.some(
      (b) => normalize(b.series!.name) === normalize(found.name!) && b.series!.number === found.number,
    );
    return { name: found.name, number: taken ? undefined : found.number };
  } catch {
    return undefined;
  }
}

/** Genres the other parts of the same series already have */
async function seriesGenres(book: Pick<Book, 'id'>, series?: SeriesInfo): Promise<string[]> {
  if (!series) return [];
  const parts = await db.books
    .filter((b) => !b.deleted && b.id !== book.id && !!b.series && normalize(b.series.name) === normalize(series.name))
    .toArray();
  return [...new Set(parts.flatMap((b) => b.genres))];
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
    const found = res.ok ? ((await res.json()) as Partial<SeriesInfo> & { subjects?: string[] }) : {};
    let series: SeriesInfo | undefined = found.name
      ? { name: found.name, number: found.number, key: found.key }
      : undefined;
    if (!series) series = await guessSeriesFromLibrary(book);
    let paused = false;
    if (!series) {
      const asked = await askSeries(book);
      if (asked === 'paused') paused = true;
      else series = asked;
    }

    const current = await db.books.get(book.id);
    if (!current) return undefined;
    // while the AI is paused the check isn't finished: it is asked again later
    const patch: Partial<Book> = paused ? {} : { seriesChecked: true, lookupVersion: LOOKUP_VERSION };
    if (!current.series && series) patch.series = series;
    // Genres: stores often only say "Fiction"; add what readers shelve it under and what the
    // rest of the series has. Only when she hasn't picked specific genres herself.
    const vague = current.genres.length === 0 || (current.genres.length === 1 && current.genres[0] === 'Fiction');
    if (vague) {
      const genres = mergeGenres(
        mergeGenres(current.genres, mapGenres(found.subjects ?? [])),
        await seriesGenres(current, patch.series ?? current.series),
      );
      if (genres.join() !== current.genres.join()) patch.genres = genres;
    }
    await updateBook(book.id, patch);
    if (patch.series ?? current.series) await harmonizeSeriesGenres();
    return patch.series ?? current.series;
  } catch {
    return undefined;
  }
}

/** Bump to look up older books again when the lookup gets smarter */
const LOOKUP_VERSION = 4;

let running = false;

/** Fills in series for books added before this existed, a few at a time */
export async function backfillSeries(max = 25) {
  if (running || !navigator.onLine) return;
  running = true;
  try {
    const todo = (
      await db.books
        .filter(
          (b) =>
            !b.deleted &&
            (!b.series || b.genres.length === 0 || b.genres.join() === 'Fiction') &&
            (b.lookupVersion ?? 0) < LOOKUP_VERSION,
        )
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
    ? await db.books
        .filter((b) => !b.deleted && !!b.series && normalize(b.series.name) === normalize(book.series!.name))
        .toArray()
    : [book];
  for (const b of parts) {
    const has = b.genres.includes(genre);
    if (on && !has) await updateBook(b.id, { genres: [...b.genres, genre] });
    if (!on && has) await updateBook(b.id, { genres: b.genres.filter((g) => g !== genre) });
  }
}

/** A blurb in another language than English or Dutch (from a foreign edition) is replaced by a proper one, or removed */
export async function repairDescriptions(max = 10) {
  if (!navigator.onLine) return;
  const bad = (await db.books.filter((b) => !b.deleted && looksForeign(b.description)).toArray()).slice(0, max);
  for (const b of bad) {
    const description = await findDescription({ title: b.title, authors: b.authors, olKey: b.olKey });
    await updateBook(b.id, { description });
  }
}

/** Does this image address really load? */
const loads = (src: string) =>
  new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 1);
    img.onerror = () => resolve(false);
    img.src = src;
  });

/**
 * Books without a cover: look for one (Open Library's cover for the ISBN, or another English or
 * Dutch edition found by title). A book that stays without cover isn't tried again for a week.
 */
export async function backfillCovers(max = 8) {
  if (!navigator.onLine) return;
  const week = 7 * 86_400_000;
  const todo = (
    await db.books
      .filter((b) => !b.deleted && !b.coverUrl && !b.customCover && Date.now() - (b.coverTriedAt ?? 0) > week)
      .toArray()
  ).slice(0, max);
  for (const b of todo) {
    let found: string | undefined;
    const viaIsbn = isbnCover(b.isbn13);
    if (viaIsbn && (await loads(viaIsbn))) found = `https://covers.openlibrary.org/b/isbn/${b.isbn13}-L.jpg`;
    if (!found) {
      const results = await searchBooks(`${b.title} ${b.authors[0] ?? ''}`).catch(() => []);
      const want = bookKey(b);
      found = results.find(
        (r) => r.coverUrl && bookKey(r) === want && (r.language === 'en' || r.language === 'nl'),
      )?.coverUrl;
    }
    await updateBook(b.id, found ? { coverUrl: found } : { coverTriedAt: Date.now() });
  }
}
