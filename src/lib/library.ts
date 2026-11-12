import { db, type LocalBook } from '../db';
import type { Book, Status } from '../types';
import { scheduleSync } from './sync';

export function newId() {
  return crypto.randomUUID();
}

/** Lowercase, no accents/punctuation: used to spot duplicates */
export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function bookKey(b: Pick<Book, 'title' | 'authors'>) {
  const title = normalize(b.title.split(/[:(]/)[0]);
  return `${title}|${normalize(b.authors[0] ?? '')}`;
}

export async function findExisting(b: Pick<Book, 'title' | 'authors' | 'isbn13'>) {
  const all = await db.books.filter((x) => !x.deleted).toArray();
  const key = bookKey(b);
  return all.find((x) => (b.isbn13 && x.isbn13 === b.isbn13) || bookKey(x) === key);
}

export async function saveBook(book: Book) {
  const now = Date.now();
  const row: LocalBook = { ...book, updatedAt: now, dirty: 1 };
  await db.books.put(row);
  scheduleSync();
  return row;
}

export async function updateBook(id: string, patch: Partial<Book>) {
  const current = await db.books.get(id);
  if (!current) return;
  const next: Book = { ...current, ...patch };
  // Keep reading dates sensible when the status changes
  if (patch.status && patch.status !== current.status) {
    if (patch.status === 'reading' && !current.startedAt) next.startedAt = Date.now();
    if (patch.status === 'read' && !current.finishedAt) next.finishedAt = Date.now();
  }
  return saveBook(next);
}

export async function deleteBook(id: string) {
  return updateBook(id, { deleted: true });
}

export function sortByTitle(a: Book, b: Book) {
  return a.title.localeCompare(b.title);
}

/** Series together and in order, the rest alphabetically by author */
export function shelfOrder(a: Book, b: Book) {
  const ka = a.series?.name ?? a.authors[0] ?? a.title;
  const kb = b.series?.name ?? b.authors[0] ?? b.title;
  const c = ka.localeCompare(kb);
  if (c !== 0) return c;
  return (a.series?.number ?? 0) - (b.series?.number ?? 0) || a.title.localeCompare(b.title);
}

export const statusOrder: Record<Status, number> = { reading: 0, owned: 1, wishlist: 2, read: 3 };
