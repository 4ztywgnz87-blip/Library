import { db, getMeta, setMeta, type LocalBook } from '../db';
import type { Book, SyncRecord } from '../types';

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

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ since, changes }),
      });
      if (res.status === 401) {
        await setMeta('loggedIn', false);
        window.dispatchEvent(new Event('snug:logged-out'));
        return;
      }
      if (!res.ok) return;
      const { now, records } = (await res.json()) as { now: number; records: SyncRecord[] };

      await db.transaction('rw', db.books, db.meta, async () => {
        // Pushed rows are clean now, unless edited again while syncing
        for (const b of dirty) {
          const cur = await db.books.get(b.id);
          if (cur && cur.updatedAt === b.updatedAt) await db.books.update(b.id, { dirty: 0 });
        }
        for (const r of records) {
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

export function startBackgroundSync() {
  void syncNow();
  window.addEventListener('online', () => void syncNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow();
  });
  setInterval(() => void syncNow(), 5 * 60_000);
}
