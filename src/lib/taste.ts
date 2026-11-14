import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Book } from '../types';
import { profileKey, type BookProfile } from '../taste/vocab';
import {
  learn,
  predict,
  type Candidate,
  type LibraryBook,
  type Mood,
  type Prediction,
  type Quiz,
} from '../taste/model';
import { useBooks } from './hooks';
import { useProfile } from './profile';
import { updateBook } from './library';

export interface ToProfile {
  title: string;
  author: string;
  description?: string;
  genres?: string[];
}

// ---------- book analyses (Snug reads every book once; kept on the device) ----------

const inFlight = new Map<string, Promise<void>>();

/** Analyses for these books: from the device, else from Snug's server (which analyses new ones once) */
export async function getProfiles(list: ToProfile[]): Promise<Map<string, BookProfile>> {
  const keys = [...new Set(list.map((b) => profileKey(b.title, b.author)))];
  const local = await db.profiles.bulkGet(keys);
  const out = new Map<string, BookProfile>();
  local.forEach((r) => r && out.set(r.key, r.profile));
  const missing = list.filter((b, i, all) => {
    const k = profileKey(b.title, b.author);
    return !out.has(k) && all.findIndex((x) => profileKey(x.title, x.author) === k) === i;
  });
  if (!missing.length || !navigator.onLine) return out;

  // the same book asked for twice at once is only fetched once
  const waits: Promise<void>[] = [];
  const fresh: ToProfile[] = [];
  for (const b of missing) {
    const k = profileKey(b.title, b.author);
    const w = inFlight.get(k);
    if (w) waits.push(w);
    else fresh.push(b);
  }
  for (let i = 0; i < fresh.length; i += 12) {
    const chunk = fresh.slice(i, i + 12);
    const job = fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        books: chunk.map((b) => ({ ...b, description: b.description?.replace(/<[^>]+>/g, ' ').slice(0, 2500) })),
      }),
    })
      .then((r) => (r.ok ? (r.json() as Promise<{ profiles: Record<string, BookProfile> }>) : { profiles: {} }))
      .then(async ({ profiles }: { profiles: Record<string, BookProfile> }) => {
        await db.profiles.bulkPut(Object.entries(profiles).map(([key, profile]) => ({ key, profile })));
      })
      .catch(() => {})
      .finally(() => chunk.forEach((b) => inFlight.delete(profileKey(b.title, b.author))));
    chunk.forEach((b) => inFlight.set(profileKey(b.title, b.author), job));
    waits.push(job);
  }
  await Promise.all(waits);
  const again = await db.profiles.bulkGet(keys);
  again.forEach((r) => r && out.set(r.key, r.profile));
  return out;
}

const bookToProfile = (b: Book): ToProfile => ({
  title: b.title,
  author: b.authors[0] ?? '',
  description: b.description,
  genres: b.genres,
});

// ---------- her reviews (read once per review) ----------

function reviewHash(b: Book) {
  const text = `${b.review ?? ''}#${b.tags.join(',')}`;
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return `r${h}`;
}

/** Reads a review into features, only when it is new or changed (a rating alone needs no AI) */
async function readReview(b: Book, profile?: BookProfile) {
  const hash = reviewHash(b);
  if (!b.review?.trim() || b.reviewInsight?.hash === hash) return;
  const res = await fetch('/api/review-insight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: b.title,
      author: b.authors[0] ?? '',
      rating: b.rating,
      review: b.review,
      tags: b.tags,
      profile,
      hash,
    }),
  }).catch(() => undefined);
  if (!res?.ok) return;
  const { insight } = (await res.json()) as { insight: Book['reviewInsight'] | null };
  if (insight) await updateBook(b.id, { reviewInsight: insight });
}

/**
 * Keeps Snug's knowledge up to date in the background: every book in her library analysed,
 * every review read. Only new books and new or changed reviews cost anything.
 */
export function useTasteUpkeep() {
  const books = useBooks();
  const fingerprint = (books ?? [])
    .map((b) => `${b.id}:${b.status}:${b.review ? reviewHash(b) : ''}:${b.reviewInsight?.hash ?? ''}`)
    .join('|');
  useEffect(() => {
    if (!books?.length || !navigator.onLine) return;
    const t = setTimeout(async () => {
      // read books first (they teach her taste), then the rest of her shelf
      const order = [...books].sort(
        (a, b) =>
          Number(b.status === 'read' || b.status === 'reading') - Number(a.status === 'read' || a.status === 'reading'),
      );
      const profiles = await getProfiles(order.slice(0, 48).map(bookToProfile));
      for (const b of order.filter((x) => x.review?.trim() && x.reviewInsight?.hash !== reviewHash(x)).slice(0, 10))
        await readReview(b, profiles.get(profileKey(b.title, b.authors[0] ?? '')));
    }, 2500);
    return () => clearTimeout(t);
  }, [fingerprint]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ---------- her taste, and scores for any book ----------

/** Her learned taste (recomputed, for free, whenever her ratings, reviews or quiz change) */
export function useTaste() {
  const books = useBooks();
  const profile = useProfile();
  const profiles = useLiveQuery(() => db.profiles.toArray(), []);
  return useMemo(() => {
    if (!books || !profiles) return undefined;
    const byKey = new Map(profiles.map((p) => [p.key, p.profile]));
    const library: LibraryBook[] = books.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.authors[0] ?? '',
      status: b.status,
      rating: b.rating,
      series: b.series,
      profile: byKey.get(profileKey(b.title, b.authors[0] ?? '')),
      insight: b.reviewInsight,
    }));
    const quiz: Quiz = {
      lovedTropes: profile.lovedTropes,
      hatedTropes: profile.hatedTropes,
      spice: profile.spice,
      endings: profile.endings,
      seriesOrStandalone: profile.seriesOrStandalone,
      length: profile.length,
      favouriteAuthors: profile.favouriteAuthors,
      completedAt: profile.completedAt,
    };
    return { taste: learn(library, quiz), byKey };
  }, [books, profiles, profile]);
}

export type Match = Prediction;

/**
 * Match scores for a list of books, worked out on the device. Books Snug hasn't analysed yet
 * are analysed first (once). Keyed by profileKey(title, author).
 */
export function useMatches(
  list: (ToProfile & { series?: Candidate['series'] })[],
  wish: { mood?: Mood; genre?: string } = {},
) {
  const t = useTaste();
  const listKey = list.map((b) => `${b.title}|${b.author}`).join('#');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!list.length) return;
    let alive = true;
    getProfiles(list).finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [listKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return useMemo(() => {
    const out = new Map<string, Match>();
    if (!t) return out;
    for (const b of list) {
      const k = profileKey(b.title, b.author);
      const p = t.byKey.get(k);
      if (p) out.set(k, predict(t.taste, { title: b.title, author: b.author, profile: p, series: b.series }, wish));
    }
    return out;
  }, [t, listKey, ready, wish.mood, wish.genre]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** One-off score (bookshop check, tips): analyses the book if needed */
export async function matchFor(
  taste: ReturnType<typeof useTaste>,
  b: ToProfile & { series?: Candidate['series'] },
  wish: { mood?: Mood; genre?: string } = {},
): Promise<Match | undefined> {
  if (!taste) return undefined;
  const profiles = await getProfiles([b]);
  const p = profiles.get(profileKey(b.title, b.author));
  if (!p) return undefined;
  return predict(taste.taste, { title: b.title, author: b.author, profile: p, series: b.series }, wish);
}
