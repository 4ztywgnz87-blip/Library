import { useEffect, useState } from 'react';

const seen = new Set<string>();

/**
 * True only the first time a page is shown in this visit of the app. Entrance animations (books
 * sliding onto the shelf) play then, and are skipped when she comes back to the page: nothing
 * changed, so nothing should move.
 */
export function useFirstVisit(page: string) {
  const [first] = useState(() => !seen.has(page));
  useEffect(() => {
    seen.add(page);
  }, [page]);
  return first;
}

const seenIds = new Map<string, Set<string>>();

/** The ids shown on this page the last time she was here (so only a newly added book animates in) */
export function useSeenIds(page: string, ids: string[]) {
  const [before] = useState(() => new Set(seenIds.get(page)));
  const key = ids.join();
  useEffect(() => {
    seenIds.set(page, new Set(ids));
  }, [page, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return before;
}

/** The Library as she left it: which tab/filter, and how far she had scrolled */
export const libraryMemory = { search: '', y: 0 };
