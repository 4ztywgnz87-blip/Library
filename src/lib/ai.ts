import type {
  AiStatus,
  CoverCorners,
  FitResponse,
  IdentifyResponse,
  RecommendRequest,
  RecommendResponse,
  SeriesResponse,
  TrendingResponse,
  ScoredBook,
} from '../shared';
import type { Book } from '../types';
import { syncNow } from './sync';
import { getMeta, setMeta } from '../db';

async function post<T>(url: string, body: unknown): Promise<T> {
  if (!navigator.onLine) throw new Error("You're offline. Tips and cover reading need internet.");
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? 'Something went wrong');
  return json;
}

export async function identifyCover(dataUrl: string) {
  const [meta, image] = dataUrl.split(',');
  const mediaType = meta.match(/data:(.*?);/)?.[1] ?? 'image/jpeg';
  return post<IdentifyResponse>('/api/ai/identify', { image, mediaType });
}

/** Where the book is in a photo (for cutting out her own cover) */
export async function findCorners(dataUrl: string, width: number, height: number) {
  const [meta, image] = dataUrl.split(',');
  const mediaType = meta.match(/data:(.*?);/)?.[1] ?? 'image/jpeg';
  return post<CoverCorners>('/api/ai/corners', {
    image,
    mediaType,
    width,
    height,
  });
}

/** Tips use the library on the server, so make sure her latest changes are there first */
export async function recommend(req: RecommendRequest) {
  await syncNow();
  return post<RecommendResponse>('/api/ai/recommend', req);
}

export async function fitCheck(book: { title: string; author: string; description?: string; genres?: string[] }) {
  await syncNow();
  return post<FitResponse>('/api/ai/fit', book);
}

export function seriesInfo(name: string, author: string) {
  return post<SeriesResponse>('/api/ai/series', { name, author });
}

export async function aiStatus(): Promise<AiStatus | null> {
  try {
    return (await (await fetch('/api/ai/status')).json()) as AiStatus;
  } catch {
    return null;
  }
}

/**
 * A fingerprint of what tells Snug her taste: ratings, reviews and what she has read. When it
 * changes (a new rating, a finished book), the match scores are worked out again.
 */
export function tasteFingerprint(books: Book[], profile?: { completedAt?: number; favouriteAuthors?: string[] }) {
  const parts = books
    .filter((b) => b.status === 'read' || b.status === 'reading')
    .map((b) => `${b.id}:${b.status}:${b.rating ?? ''}:${b.review ?? ''}:${b.tags.join(',')}`)
    .sort()
    .join('|');
  const text = `${parts}#${profile?.completedAt ?? ''}#${(profile?.favouriteAuthors ?? []).join(',')}`;
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return String(h);
}

/** What's popular right now, scored for her. Kept until her taste changes (or half a day) */
export async function trending(fingerprint: string): Promise<TrendingResponse | null> {
  const saved = await getMeta<{ at: number; fp?: string; data: TrendingResponse } | null>('trending', null);
  if (saved && saved.fp === fingerprint && Date.now() - saved.at < 12 * 3_600_000) return saved.data;
  if (!navigator.onLine) return saved?.data ?? null;
  try {
    await syncNow(); // the scores use her latest ratings
    const res = await fetch('/api/ai/trending');
    if (!res.ok) return saved?.data ?? null;
    const data = (await res.json()) as TrendingResponse;
    await setMeta('trending', { at: Date.now(), fp: fingerprint, data });
    return data;
  } catch {
    return saved?.data ?? null;
  }
}

/** Match scores for a list of books (kept per list until her taste changes) */
export async function scoreBooks(
  list: { title: string; author: string; description?: string; genres?: string[] }[],
  fingerprint: string,
): Promise<ScoredBook[] | null> {
  if (!list.length) return [];
  const id = `scores:${fingerprint}:${list.map((b) => `${b.title}|${b.author}`).join('#')}`;
  const saved = await getMeta<ScoredBook[] | null>(id, null);
  if (saved) return saved;
  if (!navigator.onLine) return null;
  try {
    await syncNow();
    const res = await fetch('/api/ai/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ books: list.map((b) => ({ ...b, description: b.description?.slice(0, 2000) })) }),
    });
    if (!res.ok) return null;
    const { books } = (await res.json()) as { books: ScoredBook[] };
    await setMeta(id, books);
    return books;
  } catch {
    return null;
  }
}
