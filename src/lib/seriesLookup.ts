import { db } from '../db';
import type { Book, SeriesInfo } from '../types';
import { updateBook } from './library';

/** Asks Open Library which series a book is part of (free) and fills it in */
export async function lookupSeries(book: Pick<Book, 'id' | 'title' | 'authors' | 'series'>): Promise<SeriesInfo | undefined> {
  if (!navigator.onLine) return undefined;
  try {
    const params = new URLSearchParams({ title: book.title, author: book.authors[0] ?? '' });
    const res = await fetch(`/api/book-series?${params}`);
    if (!res.ok) return undefined;
    const found = (await res.json()) as Partial<SeriesInfo>;
    const series = found.name ? { name: found.name, number: found.number, key: found.key } : undefined;
    // Never overwrite a series she typed herself
    const current = await db.books.get(book.id);
    if (!current || current.series) {
      if (current) await updateBook(book.id, { seriesChecked: true });
      return current?.series;
    }
    await updateBook(book.id, { series, seriesChecked: true });
    return series;
  } catch {
    return undefined;
  }
}

let running = false;

/** Fills in series for books added before this existed, a few at a time */
export async function backfillSeries(max = 25) {
  if (running || !navigator.onLine) return;
  running = true;
  try {
    const todo = (await db.books.filter((b) => !b.deleted && !b.series && !b.seriesChecked).toArray()).slice(0, max);
    for (const b of todo) await lookupSeries(b);
  } finally {
    running = false;
  }
}
