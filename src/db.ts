import Dexie, { type EntityTable } from 'dexie';
import type { Book } from './types';
import type { BookProfile } from './taste/vocab';

export interface Meta {
  key: string;
  value: unknown;
}

/** Local copy of everything, so the library works offline. `dirty` = not yet synced. */
export type LocalBook = Book & { dirty: 0 | 1 };

/** Snug's analysis of a book (fetched once, kept on the device) */
export interface StoredProfile {
  key: string;
  profile: BookProfile;
}

export const db = new Dexie('snug') as Dexie & {
  books: EntityTable<LocalBook, 'id'>;
  meta: EntityTable<Meta, 'key'>;
  profiles: EntityTable<StoredProfile, 'key'>;
};

db.version(1).stores({
  books: 'id, status, title, *authors, *genres, series.name, isbn13, dirty, updatedAt',
  meta: 'key',
});
db.version(2).stores({ profiles: 'key' });

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const row = await db.meta.get(key);
  return (row?.value as T) ?? fallback;
}

export async function setMeta(key: string, value: unknown) {
  await db.meta.put({ key, value });
}
