import { useLiveQuery } from 'dexie-react-hooks';
import { db, type DayLog } from '../db';
import type { Book } from '../types';
import { updateBook } from './library';
import { scheduleSync } from './sync';

/** A date as YYYY-MM-DD in her own time zone */
export function dayKey(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseDay(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number) {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** Every day she logged reading (newest first), live-updating */
export function useDays() {
  return useLiveQuery(async () => {
    const all = await db.days.toArray();
    return all.filter((d) => !d.deleted && d.entries.length).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, []);
}

export interface StreakImport {
  count: number;
  until: string;
}

export interface Streak {
  /** Days in a row, up to today (or up to yesterday while today is still open) */
  current: number;
  longest: number;
  readToday: boolean;
  /** The streak is alive but today isn't logged yet */
  atRisk: boolean;
  totalDays: number;
}

/**
 * Days in a row. A streak brought over from another app counts as `count` days ending on `until`,
 * and joins on to her own log when the days connect.
 */
export function streakOf(days: Pick<DayLog, 'date'>[], imported?: StreakImport, today = dayKey()): Streak {
  const read = new Set(days.map((d) => d.date));
  const runBack = (from: string) => {
    let n = 0;
    let d = from;
    for (;;) {
      if (imported && d === imported.until) return n + imported.count;
      if (!read.has(d)) return n;
      n++;
      d = addDays(d, -1);
    }
  };
  const readToday = read.has(today);
  const yesterday = addDays(today, -1);
  const current = readToday ? runBack(today) : runBack(yesterday);

  // the longest run: walk every run from its last day back
  let longest = Math.max(current, imported?.count ?? 0);
  for (const d of read) if (!read.has(addDays(d, 1))) longest = Math.max(longest, runBack(d));

  const extra = imported ? imported.count - (read.has(imported.until) ? 1 : 0) : 0;
  return { current, longest, readToday, atRisk: !readToday && current > 0, totalDays: read.size + Math.max(0, extra) };
}

/** Log that she read `book` on `date`, up to `page` */
export async function logReading(date: string, book: Book, page?: number) {
  const cur = await db.days.get(date);
  const entries = (cur && !cur.deleted ? cur.entries : []).filter((e) => e.bookId !== book.id);
  const finished = !!(page && book.pageCount && page >= book.pageCount);
  entries.push({ bookId: book.id, title: book.title, ...(page ? { page } : {}), ...(finished ? { finished } : {}) });
  await db.days.put({ date, entries, updatedAt: Date.now(), dirty: 1 });

  const patch: Partial<Book> = {};
  // only move the bookmark forward when this is her latest log of the book
  if (page && (date >= dayKey() || !book.currentPage || page > book.currentPage)) patch.currentPage = page;
  if (book.status === 'owned' || book.status === 'wishlist') {
    patch.status = 'reading';
    patch.startedAt = book.startedAt ?? parseDay(date).getTime();
  }
  if (Object.keys(patch).length) await updateBook(book.id, patch);
  scheduleSync();
}

/** Take one book (or the whole day) off her log */
export async function unlogReading(date: string, bookId?: string) {
  const cur = await db.days.get(date);
  if (!cur) return;
  const entries = bookId ? cur.entries.filter((e) => e.bookId !== bookId) : [];
  await db.days.put({ ...cur, entries, deleted: entries.length === 0, updatedAt: Date.now(), dirty: 1 });
  scheduleSync();
}

/** Pages she read on each day, worked out from how far she got in each book */
export function pagesPerDay(days: DayLog[]) {
  const out = new Map<string, number>();
  const last = new Map<string, number>();
  for (const d of [...days].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    let n = 0;
    for (const e of d.entries) {
      if (!e.page) continue;
      const before = last.get(e.bookId);
      if (before !== undefined && e.page > before) n += e.page - before;
      last.set(e.bookId, e.page);
    }
    out.set(d.date, n);
  }
  return out;
}
