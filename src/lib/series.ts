import type { Book } from '../types';
import type { SeriesBook } from '../shared';
import { normalize } from './library';

export interface SeriesGroup {
  name: string;
  author: string;
  books: Book[];
  read: number;
  /** Whole-number parts that are clearly missing (gaps before her highest number) */
  missing: number[];
  /** First part she owns but hasn't read, in order */
  next?: Book;
}

export function groupSeries(books: Book[]): SeriesGroup[] {
  const map = new Map<string, Book[]>();
  for (const b of books) {
    if (!b.series?.name || b.deleted) continue;
    const k = normalize(b.series.name);
    map.set(k, [...(map.get(k) ?? []), b]);
  }
  return [...map.values()]
    .map((list) => {
      const sorted = [...list].sort((a, b) => (a.series?.number ?? 99) - (b.series?.number ?? 99));
      const numbers = new Set(sorted.map((b) => b.series?.number).filter((n): n is number => n !== undefined));
      const max = Math.max(0, ...numbers);
      const missing: number[] = [];
      for (let n = 1; n < max; n++) if (!numbers.has(n)) missing.push(n);
      return {
        name: sorted[0].series!.name,
        author: sorted[0].authors[0] ?? '',
        books: sorted,
        read: sorted.filter((b) => b.status === 'read').length,
        missing,
        next: sorted.find((b) => b.status === 'owned'),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type SeriesEntry =
  | { kind: 'mine'; number?: number; book: Book }
  | { kind: 'missing'; number: number; title?: string; releaseDate?: string | null; announced: boolean };

/** Her books + the full series list (when known) + gaps, in reading order */
export function seriesEntries(group: SeriesGroup, known: SeriesBook[]): SeriesEntry[] {
  const entries: SeriesEntry[] = group.books.map((book) => ({ kind: 'mine', number: book.series?.number, book }));
  const have = (sb: SeriesBook) =>
    group.books.some(
      (b) => b.series?.number === sb.number || normalize(b.title) === normalize(sb.title),
    );
  for (const sb of known) {
    if (!have(sb)) {
      entries.push({
        kind: 'missing',
        number: sb.number,
        title: sb.title,
        releaseDate: sb.releaseDate,
        announced: sb.status === 'announced',
      });
    }
  }
  for (const n of group.missing) {
    if (!entries.some((e) => e.number === n)) entries.push({ kind: 'missing', number: n, announced: false });
  }
  return entries.sort((a, b) => (a.number ?? 99) - (b.number ?? 99));
}

export const seriesPath = (name: string) => `/series/${encodeURIComponent(name)}`;
