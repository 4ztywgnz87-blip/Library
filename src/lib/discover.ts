import { useEffect, useMemo, useState } from 'react';
import type { Book } from '../types';
import type { ScoredBook } from '../shared';
import { authorNews, followedAuthors, type AuthorNews } from './authors';
import { scoreBooks, tasteFingerprint } from './ai';
import { useProfile } from './profile';
import { bookKey } from './library';

/** New and upcoming books by the authors she follows, newest first (undefined while loading) */
export function useAuthorNews(books: Book[] | undefined, favourites: string[]) {
  const authors = books ? followedAuthors(books, favourites).slice(0, 10) : [];
  const authorsKey = authors.join('|');
  const [items, setItems] = useState<AuthorNews[] | undefined>(undefined);
  useEffect(() => {
    if (!books) return;
    let alive = true;
    Promise.all(authors.map((a) => authorNews(a).catch(() => [])))
      .then((lists) => {
        if (alive) setItems(lists.flat().sort((a, b) => b.publishedDate.localeCompare(a.publishedDate)));
      })
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [authorsKey, !!books]); // eslint-disable-line react-hooks/exhaustive-deps
  return items;
}

/** Match scores for a list of books, keyed by bookKey (empty while loading) */
export function useScores(
  books: Book[] | undefined,
  list: { title: string; author: string; description?: string; genres?: string[] }[],
) {
  const profile = useProfile();
  const fp = books ? tasteFingerprint(books, profile) : undefined;
  const listKey = list.map((b) => `${b.title}|${b.author}`).join('#');
  const [scores, setScores] = useState<Map<string, ScoredBook>>(new Map());
  useEffect(() => {
    if (fp === undefined || !list.length) return;
    let alive = true;
    scoreBooks(list, fp).then((r) => {
      if (alive && r) setScores(new Map(r.map((s) => [bookKey({ title: s.title, authors: [s.author] }), s])));
    });
    return () => {
      alive = false;
    };
  }, [fp, listKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return scores;
}

/** Books she already has (not counting her wishlist) */
export function useHave(books: Book[] | undefined) {
  return useMemo(() => {
    const m = new Map<string, Book>();
    for (const b of books ?? []) if (b.status !== 'wishlist') m.set(bookKey(b), b);
    return m;
  }, [books]);
}

export const keyOf = (b: { title: string; author: string }) => bookKey({ title: b.title, authors: [b.author] });
