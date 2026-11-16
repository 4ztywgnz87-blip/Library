import { useEffect, useMemo, useState } from 'react';
import { notOwned, type Book } from '../types';
import { authorNews, followedAuthors, type AuthorNews } from './authors';
import { looseKey } from './library';
import { useProfile } from './profile';

/** New and upcoming books by the authors she follows, newest first (undefined while loading) */
const lastNews = new Map<string, AuthorNews[]>();

export function useAuthorNews(books: Book[] | undefined, favourites: string[]) {
  const muted = useProfile().mutedAuthors ?? [];
  const authors = books ? followedAuthors(books, favourites, muted).slice(0, 30) : [];
  const authorsKey = authors.join('|');
  // the news found last time is shown at once when the screen opens again (no late pop-in)
  const [items, setItemsState] = useState<AuthorNews[] | undefined>(() => lastNews.get(authorsKey));
  const setItems = (v: AuthorNews[]) => {
    lastNews.set(authorsKey, v);
    setItemsState(v);
  };
  useEffect(() => {
    if (!books) return;
    let alive = true;
    Promise.all(authors.map((a) => authorNews(a).catch(() => [])))
      .then((lists) => {
        const v = lists.flat().sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));
        // same as shown: keep it, so nothing re-renders
        const was = lastNews.get(authorsKey);
        if (alive && JSON.stringify(was) !== JSON.stringify(v)) setItems(v);
      })
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [authorsKey, !!books]); // eslint-disable-line react-hooks/exhaustive-deps
  return items;
}

/** Books she already has (not counting her wishlist) */
export function useHave(books: Book[] | undefined) {
  return useMemo(() => {
    const m = new Map<string, Book>();
    for (const b of books ?? []) if (!notOwned(b)) m.set(looseKey(b), b);
    return m;
  }, [books]);
}

export const keyOf = (b: { title: string; author: string }) => looseKey({ title: b.title, authors: [b.author] });
