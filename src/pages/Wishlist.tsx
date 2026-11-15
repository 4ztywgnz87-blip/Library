import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useBooks } from '../lib/hooks';
import { updateBook } from '../lib/library';
import { Cover } from '../components/Cover';
import { Button, PageHeader } from '../components/ui';
import { EmptyState } from '../components/SleepyCat';

/** Books she doesn't have yet: her dream list */
export default function Wishlist() {
  const books = useBooks();
  const [gotIt, setGotIt] = useState<string | null>(null);
  const wishes = useMemo(
    () => (books ?? []).filter((b) => b.status === 'wishlist').sort((a, b) => b.addedAt - a.addedAt),
    [books],
  );
  if (!books) return null;

  return (
    <div>
      <PageHeader back title="Wishlist" />
      <div className="mx-auto max-w-4xl px-4 pb-10">
        <p className="-mt-1 mb-4 text-sm text-cocoa">
          Books you're dreaming of. Got one? Tap “Got it!” and it moves onto your shelf.
        </p>
        {wishes.length > 0 && <ShareWishlist />}
        {wishes.length === 0 ? (
          <EmptyState title="Nothing on your wishlist">
            Add books you want with “+ Wishlist” anywhere in Snug.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5">
            <AnimatePresence>
              {wishes.map((b, i) => (
                <motion.div
                  key={b.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i * 0.04, 0.4) } }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                >
                  <Link to={`/book/${b.id}`} className="block active:scale-[0.98]">
                    <Cover book={b} />
                    {/* fixed height, so the buttons line up across the row */}
                    <p className="mt-2 line-clamp-2 h-[2.1rem] text-xs leading-snug font-medium">{b.title}</p>
                    <p className="truncate text-[0.7rem] text-mocha">
                      {b.series?.number ? `${b.series.name} #${b.series.number} · ` : ''}
                      {b.authors[0]}
                    </p>
                  </Link>
                  <Button
                    variant="soft"
                    className="mt-2 w-full px-3 py-2 text-xs"
                    disabled={gotIt === b.id}
                    onClick={async () => {
                      setGotIt(b.id);
                      await updateBook(b.id, { status: 'owned' });
                      setGotIt(null);
                    }}
                  >
                    Got it! 🎉
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

/** Send her wishlist to family and friends: a cute page with the language of each book, and gift reservations */
function ShareWishlist() {
  const [state, setState] = useState<'idle' | 'busy' | 'copied' | 'error'>('idle');
  const [more, setMore] = useState(false);
  const share = async (renew = false) => {
    setState('busy');
    try {
      const res = await fetch('/api/share/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ renew }),
      });
      const { token } = (await res.json()) as { token: string };
      const url = `${location.origin}/w/${token}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'My book wishlist 📚', text: 'The books I’m dreaming of 💛', url });
          setState('idle');
          return;
        } catch (e) {
          if ((e as Error).name === 'AbortError') return setState('idle');
        }
      }
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch {
      setState('error');
    }
  };
  return (
    <div className="mb-6 rounded-[var(--radius-card)] bg-blush/50 p-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🎁</span>
        <div className="min-w-0 flex-1">
          <p className="font-soft text-lg leading-tight font-semibold">Share your wishlist</p>
          <p className="text-xs text-cocoa">
            A cute page for family and friends, with the language of each book. They can reserve a gift, and you won’t
            see which.
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button className="px-4 py-2 text-sm" disabled={state === 'busy'} onClick={() => void share()}>
          {state === 'copied' ? 'Link copied ✓' : 'Share link'}
        </Button>
        <button className="text-xs text-mocha underline" onClick={() => setMore(!more)}>
          {more ? 'close' : 'more'}
        </button>
      </div>
      {state === 'error' && <p className="mt-2 text-xs text-wine">That didn’t work. Are you online?</p>}
      {more && (
        <p className="mt-3 text-xs text-cocoa">
          Sent it to the wrong person?{' '}
          <button className="text-wine underline" onClick={() => void share(true)}>
            Make a new link
          </button>{' '}
          and the old one stops working.
        </p>
      )}
    </div>
  );
}
