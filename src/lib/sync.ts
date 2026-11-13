import { db, getMeta, setMeta, type LocalBook } from '../db';
import type { Book, SyncRecord } from '../types';
import type { ReaderProfile } from '../shared';

let timer: ReturnType<typeof setTimeout> | undefined;
let running: Promise<void> | undefined;

/** Sync shortly after a change (batched), or right away when called with 0 */
export function scheduleSync(delay = 1500) {
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), delay);
}

export async function syncNow(): Promise<void> {
  if (!navigator.onLine) return;
  if (running) return running;
  running = (async () => {
    try {
      const since = await getMeta<number>('lastSync', 0);
      const dirty = await db.books.where('dirty').equals(1).toArray();
      const changes: SyncRecord[] = dirty.map(({ dirty: _d, ...book }) => ({
        kind: 'book',
        id: book.id,
        data: book,
        updatedAt: book.updatedAt,
        deleted: !!book.deleted,
      }));
      // Her reader profile (quiz, favourite authors) travels as one record
      const profile = await getMeta<ReaderProfile | null>('profile', null);
      const profileDirty = await getMeta<boolean>('profileDirty', false);
      if (profile && profileDirty) {
        changes.push({ kind: 'profile', id: 'me', data: profile, updatedAt: profile.updatedAt, deleted: false });
      }

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ since, changes }),
      });
      if (!res.ok) return;
      const { now, records } = (await res.json()) as { now: number; records: SyncRecord[] };

      await db.transaction('rw', db.books, db.meta, async () => {
        // Pushed rows are clean now, unless edited again while syncing
        for (const b of dirty) {
          const cur = await db.books.get(b.id);
          if (cur && cur.updatedAt === b.updatedAt) await db.books.update(b.id, { dirty: 0 });
        }
        if (profileDirty) {
          const cur = await getMeta<ReaderProfile | null>('profile', null);
          if (cur && profile && cur.updatedAt === profile.updatedAt) await setMeta('profileDirty', false);
        }
        for (const r of records) {
          if (r.kind === 'profile') {
            const cur = await getMeta<ReaderProfile | null>('profile', null);
            if (!cur || cur.updatedAt < r.updatedAt) await setMeta('profile', r.data);
            continue;
          }
          if (r.kind !== 'book') continue;
          const cur = await db.books.get(r.id);
          if (cur && cur.updatedAt > r.updatedAt) continue; // local is newer
          await db.books.put({ ...(r.data as Book), dirty: 0 } as LocalBook);
        }
        await setMeta('lastSync', now);
      });
    } catch {
      // Offline or server hiccup: try again later
    } finally {
      running = undefined;
    }
  })();
  return running;
}

/** Syncs now, when coming back online or to the app, and every few minutes. Returns a cleanup function. */
export function startBackgroundSync() {
  const sync = () => void syncNow();
  const onVisible = () => document.visibilityState === 'visible' && sync();
  sync();
  window.addEventListener('online', sync);
  document.addEventListener('visibilitychange', onVisible);
  const timer = setInterval(sync, 5 * 60_000);
  return () => {
    window.removeEventListener('online', sync);
    document.removeEventListener('visibilitychange', onVisible);
    clearInterval(timer);
  };
}
