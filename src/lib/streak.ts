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

/** Every logged page of one book, oldest day first */
async function bookLog(bookId: string) {
  const all = await db.days.toArray();
  return all
    .filter((d) => !d.deleted)
    .flatMap((d) => d.entries.filter((e) => e.bookId === bookId).map((e) => ({ date: d.date, ...e })))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * The pages that make sense for this book on this day: at least where she was before,
 * at most where she was after (and never past the end of the book)
 */
export function pageBounds(days: DayLog[], bookId: string, date: string, pageCount?: number) {
  let min = 0;
  let minDate: string | undefined;
  let max = pageCount ?? Infinity;
  let maxDate: string | undefined;
  for (const d of days) {
    if (d.deleted) continue;
    const e = d.entries.find((x) => x.bookId === bookId);
    if (!e?.page) continue;
    if (d.date < date && e.page >= min) {
      min = e.page;
      minDate = d.date;
    }
    if (d.date > date && e.page <= max) {
      max = e.page;
      maxDate = d.date;
    }
  }
  return { min, minDate, max, maxDate };
}

/** Her bookmark follows her log: the page of the latest day she logged this book */
async function syncBookmark(book: Book) {
  const log = (await bookLog(book.id)).filter((e) => e.page);
  const last = log[log.length - 1];
  const patch: Partial<Book> = { currentPage: last?.page };
  // the day she finished it was taken off her log: the book is back to "reading"
  const finishedOn = (await bookLog(book.id)).find((e) => e.finished);
  if (book.status === 'read' && book.finishedAt && !finishedOn && book.finishedVia === 'log') {
    patch.status = 'reading';
    patch.finishedAt = undefined;
    patch.finishedVia = undefined;
  }
  if (patch.currentPage !== book.currentPage || patch.status) await updateBook(book.id, patch);
}

/** Log that she read `book` on `date`, up to `page`; `finished` when she turned the last page */
export async function logReading(
  date: string,
  book: Book,
  { page, finished = false, note }: { page?: number; finished?: boolean; note?: string },
) {
  const cur = await db.days.get(date);
  const entries = (cur && !cur.deleted ? cur.entries : []).filter((e) => e.bookId !== book.id);
  const last = finished && book.pageCount ? Math.max(page ?? 0, book.pageCount) : page;
  entries.push({
    bookId: book.id,
    title: book.title,
    ...(last ? { page: last } : {}),
    ...(finished ? { finished } : {}),
  });
  await db.days.put({
    date,
    entries,
    note: note?.trim() || undefined,
    updatedAt: Date.now(),
    dirty: 1,
  });

  const patch: Partial<Book> = {};
  if (finished) {
    patch.status = 'read';
    patch.finishedAt = parseDay(date).getTime() + 12 * 3_600_000;
    patch.finishedVia = 'log';
    patch.startedAt = book.startedAt ?? parseDay(date).getTime();
  } else if (book.status !== 'reading') {
    patch.status = 'reading';
    patch.startedAt = book.startedAt ?? parseDay(date).getTime();
    if (book.finishedVia === 'log') {
      patch.finishedAt = undefined;
      patch.finishedVia = undefined;
    }
  }
  if (Object.keys(patch).length) await updateBook(book.id, patch);
  const fresh = await db.books.get(book.id);
  if (fresh) await syncBookmark(fresh);
  scheduleSync();
}

/** Take one book (or the whole day) off her log; the bookmark goes back to the last page she logged */
export async function unlogReading(date: string, bookId?: string) {
  const cur = await db.days.get(date);
  if (!cur) return;
  const removed = cur.entries.filter((e) => !bookId || e.bookId === bookId);
  const entries = bookId ? cur.entries.filter((e) => e.bookId !== bookId) : [];
  await db.days.put({ ...cur, entries, deleted: entries.length === 0, updatedAt: Date.now(), dirty: 1 });
  for (const e of removed) {
    const book = await db.books.get(e.bookId);
    if (book) await syncBookmark(book);
  }
  scheduleSync();
}

/** Her note for a day, without changing what she read */
export async function setDayNote(date: string, note: string) {
  const cur = await db.days.get(date);
  if (!cur) return;
  await db.days.put({ ...cur, note: note.trim() || undefined, updatedAt: Date.now(), dirty: 1 });
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

/**
 * Her streaks for one year. A streak that began the year before counts in full: it's the same streak.
 * `longest` is the longest streak that was still going at some point this year; `current` is today's
 * streak (only for the year we're in).
 */
export function yearStreaks(
  days: Pick<DayLog, 'date'>[],
  imported: StreakImport | undefined,
  year: number,
  today = dayKey(),
) {
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
  const first = `${year}-01-01`;
  const end = `${year}-12-31` < today ? `${year}-12-31` : today;
  const ends = [...read].filter((d) => d >= first && d <= end);
  if (imported && imported.until >= first && imported.until <= end) ends.push(imported.until);
  let longest = 0;
  for (const d of ends) if (!read.has(addDays(d, 1)) || d === end) longest = Math.max(longest, runBack(d));
  const thisYear = end === today;
  const current = thisYear ? streakOf(days, imported, today).current : 0;
  return { longest: Math.max(longest, current), current, thisYear };
}
