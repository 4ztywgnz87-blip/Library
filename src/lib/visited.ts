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
