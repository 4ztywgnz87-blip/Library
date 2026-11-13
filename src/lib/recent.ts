import { getMeta, setMeta } from '../db';
import { useMeta } from './hooks';

/** A recent search on the Add screen: typed, or read from a cover photo */
export interface RecentSearch {
  q: string;
  kind: 'search' | 'photo';
  /** The book she looked at (or the cover that was read), when known */
  title?: string;
  author?: string;
  cover?: string;
  at: number;
}

const KEY = 'recentSearches';
const MAX = 8;
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export const useRecentSearches = () => useMeta<RecentSearch[]>(KEY, []);

export async function rememberSearch(entry: Omit<RecentSearch, 'at'>) {
  const q = norm(entry.q);
  if (q.length < 2) return;
  const list = await getMeta<RecentSearch[]>(KEY, []);
  const old = list.find((r) => norm(r.q) === q);
  const rest = list.filter((r) => {
    const o = norm(r.q);
    // the same search, or one she was still typing ("a court of" → "a court of thorns")
    return o !== q && !(entry.kind === 'search' && r.kind === 'search' && !r.title && q.startsWith(o));
  });
  // keep what we knew (and whether it started as a photo) about the book unless this entry knows better
  const merged = {
    ...old,
    ...Object.fromEntries(Object.entries(entry).filter(([, v]) => v !== undefined)),
    kind: old?.kind ?? entry.kind,
    at: Date.now(),
  };
  await setMeta(KEY, [merged as RecentSearch, ...rest].slice(0, MAX));
}

export async function forgetSearch(q: string) {
  const list = await getMeta<RecentSearch[]>(KEY, []);
  await setMeta(
    KEY,
    list.filter((r) => norm(r.q) !== norm(q)),
  );
}

export const clearSearches = () => setMeta(KEY, []);
