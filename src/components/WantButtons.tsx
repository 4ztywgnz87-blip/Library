import { useState } from 'react';
import { updateBook } from '../lib/library';
import { quickAdd } from '../lib/quickAdd';
import type { Book } from '../types';
import { Button } from './ui';

type Want = 'wishlist' | 'radar' | 'owned';

/**
 * "+ Wishlist" and "👀 Radar" for a book she doesn't have yet, and below them a big "I bought it!"
 * that puts it straight on her to-read shelf (in the shop, a good tip is often bought right away).
 * The radar is for books she is curious about but doesn't want (to buy) yet. Tapping another
 * button after the first moves the book over.
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
  const [saved, setSaved] = useState<{ id: string; status: Want } | null>(null);
  const [busy, setBusy] = useState(false);

  const keep = async (status: Want) => {
    if (busy || saved?.status === status) return;
    setBusy(true);
    try {
      if (saved) {
        await updateBook(saved.id, { status });
        setSaved({ id: saved.id, status });
      } else {
        const book = await quickAdd(title, author, status, extra);
        // she already had it as a wish or on her radar: move it to where she wants it now
        if (book.status !== status && (book.status === 'wishlist' || book.status === 'radar'))
          await updateBook(book.id, { status });
        setSaved({ id: book.id, status });
      }
    } finally {
      setBusy(false);
    }
  };

  const big = size === 'large';
  const cls = big ? 'py-3.5' : 'px-3 py-2 text-xs whitespace-nowrap';
  const bought = saved?.status === 'owned';
  const wish = (
    <Button
      className={`${cls} ${big ? 'flex-1' : ''}`}
      variant={saved?.status === 'wishlist' ? undefined : 'soft'}
      disabled={busy || bought || saved?.status === 'wishlist'}
      onClick={() => void keep('wishlist')}
    >
      {saved?.status === 'wishlist' ? 'On your wishlist ✓' : big ? '+ Add to wishlist' : '+ Wishlist'}
    </Button>
  );
  const radar = (
    <Button
      variant="soft"
      className={cls}
      disabled={busy || bought || saved?.status === 'radar'}
      onClick={() => void keep('radar')}
    >
      {saved?.status === 'radar' ? 'On your radar ✓' : '👀 Radar'}
    </Button>
  );
  const buy = (
    <Button
      className={`w-full ${big ? 'py-3.5' : 'order-last mt-1 py-2.5 text-sm'}`}
      disabled={busy || bought}
      onClick={() => void keep('owned')}
    >
      {bought ? 'On your to-read shelf ✓ 🎉' : '🛍️ I bought it!'}
    </Button>
  );
  return big ? (
    <div className="w-full space-y-2">
      <div className="flex gap-2">
        {wish}
        {radar}
      </div>
      {buy}
    </div>
  ) : (
    <>
      {wish}
      {radar}
      {buy}
    </>
  );
}
