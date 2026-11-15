import { useMemo } from 'react';
import type { Book } from '../types';
import { updateBook } from './library';
import { useBooks } from './hooks';

/** Lend a book to someone (since: when it left the house) */
export function lendBook(book: Book, to: string, since = Date.now()) {
  return updateBook(book.id, { lent: { to: to.trim(), since } });
}

/** It's back: the loan moves to the book's history */
export function returnBook(book: Book) {
  if (!book.lent) return;
  return updateBook(book.id, {
    lent: undefined,
    loans: [...(book.loans ?? []), { ...book.lent, returnedAt: Date.now() }],
  });
}

/** "today", "yesterday", "3 days ago", "2 weeks ago", "4 months ago" */
export function ago(ts: number, now = Date.now()) {
  const days = Math.floor((now - ts) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export const dateLabel = (ts: number) =>
  new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Everything about her lending: books out now (per person) and everyone she ever lent to */
export function useLending() {
  const books = useBooks();
  return useMemo(() => {
    const out = (books ?? []).filter((b) => b.lent).sort((a, b) => a.lent!.since - b.lent!.since);
    const people = new Map<string, Book[]>();
    for (const b of out) people.set(b.lent!.to, [...(people.get(b.lent!.to) ?? []), b]);
    const history = (books ?? [])
      .flatMap((b) => (b.loans ?? []).map((l) => ({ book: b, ...l })))
      .sort((a, b) => b.returnedAt - a.returnedAt);
    const names = [...new Set([...out.map((b) => b.lent!.to), ...history.map((h) => h.to)])];
    return { out, people, history, names, ready: !!books };
  }, [books]);
}
