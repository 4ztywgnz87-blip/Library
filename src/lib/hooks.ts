import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LocalBook } from '../db';

/**
 * The last library we loaded: pages that open straight away show it at once, instead of an empty
 * page for a moment while the database answers (which looked like a flash or a lag)
 */
let lastBooks: LocalBook[] | undefined;

/** All books in the library (not deleted), live-updating */
export function useBooks() {
  return useLiveQuery(
    async () => {
      const all = await db.books.filter((b) => !b.deleted).toArray();
      lastBooks = all;
      return all;
    },
    [],
    lastBooks,
  );
}

export function useBook(id: string | undefined) {
  return useLiveQuery(() => (id ? db.books.get(id) : undefined), [id]);
}

/** settings as last read, so a screen opening again has them at once (e.g. her name in the greeting) */
const lastMeta = new Map<string, unknown>();

export function useMeta<T>(key: string, fallback: T): T {
  return (
    useLiveQuery(
      async () => {
        const v = ((await db.meta.get(key))?.value as T) ?? fallback;
        lastMeta.set(key, v);
        return v;
      },
      [key],
      lastMeta.get(key) as T | undefined,
    ) ?? fallback
  );
}
