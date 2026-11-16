import { useEffect, useState } from 'react';
import { getMeta, setMeta } from '../db';
import type { SeriesBook } from '../shared';
import type { SeriesGroup } from './series';

const WEEK = 7 * 86_400_000;

/** The full list of parts of a series (from Open Library), cached on the device for a week */
export async function seriesPartsCached(key: string): Promise<SeriesBook[]> {
  const cacheKey = `seriesParts:${key}`;
  const cached = await getMeta<{ at: number; books: SeriesBook[] } | null>(cacheKey, null);
  if (cached && (Date.now() - cached.at < WEEK || !navigator.onLine)) return cached.books;
  try {
    const res = await fetch(`/api/series-books?key=${key}`);
    if (!res.ok) throw new Error();
    const { books } = (await res.json()) as { books: SeriesBook[] };
    if (books.length) await setMeta(cacheKey, { at: Date.now(), books });
    return books;
  } catch {
    return cached?.books ?? [];
  }
}

/** Known parts per series name, for the series she has (loads in the background) */
/** what was found before, so a screen opening again shows its series at once (no late pop-in) */
const knownParts: Record<string, SeriesBook[]> = {};

export function useSeriesParts(groups: SeriesGroup[]) {
  const [parts, setPartsState] = useState<Record<string, SeriesBook[]>>(() => ({ ...knownParts }));
  const setParts = (f: (p: Record<string, SeriesBook[]>) => Record<string, SeriesBook[]>) =>
    setPartsState((p) => {
      const next = f(p);
      Object.assign(knownParts, next);
      return next;
    });
  const wanted = groups
    .map((g) => `${g.name}|${g.books.find((b) => b.series?.key)?.series?.key ?? ''}`)
    .filter((x) => !x.endsWith('|'))
    .join(',');
  useEffect(() => {
    let cancelled = false;
    for (const item of wanted ? wanted.split(',') : []) {
      const [name, key] = item.split('|');
      void seriesPartsCached(key).then((books) => {
        // (unchanged since last time: no new render)
        if (!cancelled && books.length && JSON.stringify(knownParts[name]) !== JSON.stringify(books))
          setParts((p) => ({ ...p, [name]: books }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [wanted]);
  return parts;
}
