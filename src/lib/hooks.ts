import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

/** All books in the library (not deleted), live-updating */
export function useBooks() {
  return useLiveQuery(() => db.books.filter((b) => !b.deleted).toArray(), []);
}

export function useBook(id: string | undefined) {
  return useLiveQuery(() => (id ? db.books.get(id) : undefined), [id]);
}

export function useMeta<T>(key: string, fallback: T): T {
  return useLiveQuery(async () => ((await db.meta.get(key))?.value as T) ?? fallback, [key]) ?? fallback;
}
