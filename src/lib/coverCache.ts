/**
 * Covers that show up instantly when you switch pages.
 *
 * Open Library covers redirect to archive.org on every load, which the browser and the app's
 * offline cache didn't keep, so covers loaded again each time. Now every cover goes through Snug's
 * own image address (kept for a week by the browser and for a year by the offline cache), and the
 * covers already shown stay decoded in memory, so they appear immediately when a page comes back.
 */
const PROXY_HOSTS = ['books.google.com', 'covers.openlibrary.org'];

export function coverSrc(url?: string) {
  if (!url) return undefined;
  if (url.startsWith('data:') || url.startsWith('/')) return url;
  try {
    const host = new URL(url).hostname;
    if (PROXY_HOSTS.includes(host) || host.endsWith('.googleusercontent.com'))
      return `/api/img?url=${encodeURIComponent(url)}`;
  } catch {
    /* not a url: leave it */
  }
  return url;
}

/** The cover Open Library has for this exact edition (404 when it has none, so it can fall back) */
export function isbnCover(isbn?: string) {
  return isbn && /^\d{13}$/.test(isbn)
    ? coverSrc(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`)
    : undefined;
}

const kept = new Map<string, HTMLImageElement>();

/** Has this cover been shown before (so it can appear without fading in)? */
export function isLoaded(src: string) {
  const img = kept.get(src);
  return !!img && img.complete && img.naturalWidth > 0;
}

/** Keep a decoded copy around, so the browser holds it in memory */
export function keep(src: string) {
  if (kept.has(src) || src.startsWith('data:')) return;
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  kept.set(src, img);
  if (kept.size > 400) kept.delete(kept.keys().next().value!);
}

/** Load covers ahead of time (e.g. the year's covers before the Wrapped story starts) */
export function preloadCovers(urls: (string | undefined)[]) {
  for (const u of urls) {
    const s = coverSrc(u);
    if (s) keep(s);
  }
}
