import { useState } from 'react';
import { updateBook } from '../lib/library';
import { quickAdd } from '../lib/quickAdd';
import type { Book } from '../types';
import { Button } from './ui';

/**
 * "+ Wishlist" and "👀 Radar" for a book she doesn't have yet. The radar is for books she is curious
 * about but doesn't want (to buy) yet. Tapping the other button after the first moves the book over.
 */
export function WantButtons({
  title,
  author,
  extra = {},
  size = 'small',
}: {
  title: string;
  author: string;
  extra?: Partial<Book>;
  size?: 'small' | 'large';
}) {
  const [saved, setSaved] = useState<{ id: string; status: 'wishlist' | 'radar' } | null>(null);
  const [busy, setBusy] = useState(false);

  const keep = async (status: 'wishlist' | 'radar') => {
    if (busy || saved?.status === status) return;
    setBusy(true);
    try {
      if (saved) await updateBook(saved.id, { status });
      else {
        const book = await quickAdd(title, author, status, extra);
        // she already had it as a wish or on her radar: move it to where she wants it now
        if (book.status !== status && (book.status === 'wishlist' || book.status === 'radar'))
          await updateBook(book.id, { status });
        setSaved({ id: book.id, status });
      }
      if (saved) setSaved({ id: saved.id, status });
    } finally {
      setBusy(false);
    }
  };

  const big = size === 'large';
  const cls = big ? 'py-3.5' : 'px-3 py-2 text-xs whitespace-nowrap';
  return (
    <>
      <Button
        className={`${cls} ${big ? 'flex-1' : ''}`}
        variant={saved?.status === 'radar' ? 'soft' : undefined}
        disabled={busy || saved?.status === 'wishlist'}
        onClick={() => void keep('wishlist')}
      >
        {saved?.status === 'wishlist' ? 'On your wishlist ✓' : big ? '+ Add to wishlist' : '+ Wishlist'}
      </Button>
      <Button
        variant="soft"
        className={cls}
        disabled={busy || saved?.status === 'radar'}
        onClick={() => void keep('radar')}
      >
        {saved?.status === 'radar' ? 'On your radar ✓' : '👀 Radar'}
      </Button>
    </>
  );
}
