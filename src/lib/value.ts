import type { Book } from '../types';

/** What a book is guessed to be worth when she hasn't filled in any prices yet */
export const DEFAULT_PRICE = 15;

export const euro = (n: number) =>
  n.toLocaleString('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

/**
 * What her bookcase is worth: the prices she filled in, plus an estimate for the other books
 * (the average of her own prices once she has a few, otherwise a typical paperback).
 * Wishlist books aren't hers yet.
 */
export function shelfValue(books: Book[]) {
  const mine = books.filter((b) => b.status !== 'wishlist');
  const priced = mine.filter((b) => (b.price ?? 0) > 0);
  const known = priced.reduce((t, b) => t + b.price!, 0);
  const estimate = priced.length >= 3 ? known / priced.length : DEFAULT_PRICE;
  const unpriced = mine.length - priced.length;
  return {
    total: known + unpriced * estimate,
    books: mine.length,
    priced: priced.length,
    unpriced,
    estimate,
  };
}
