import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useBooks } from '../lib/hooks';
import { updateBook } from '../lib/library';
import { Cover } from '../components/Cover';
import { Button, PageHeader } from '../components/ui';
import { EmptyState } from '../components/SleepyCat';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { ShareIcon } from '../components/Icons';
import { useProfile } from '../lib/profile';
import { useMeta } from '../lib/hooks';

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
      <PageHeader back title="Wishlist" right={wishes.length > 0 ? <ShareButton /> : undefined} />
      <div className="mx-auto max-w-4xl px-4 pb-10">
        <div className="h-2" />
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
        {wishes.length > 0 && <ResetReservations />}
      </div>
    </div>
  );
}

/** Send her wishlist to family and friends: a cute page with the language of each book, and gift reservations */
function ShareButton() {
  const profile = useProfile();
  const oldName = useMeta<string>('readerName', '');
  const [state, setState] = useState<'idle' | 'busy' | 'copied'>('idle');
  const share = async () => {
    setState('busy');
    try {
      const res = await fetch('/api/share/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profile.name ?? oldName }),
      });
      const { token } = (await res.json()) as { token: string };
      const url = `${location.origin}/w/${token}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'My book wishlist 📚', text: 'The books I’m dreaming of 💛', url });
          return setState('idle');
        } catch (e) {
          if ((e as Error).name === 'AbortError') return setState('idle');
        }
      }
      await navigator.clipboard.writeText(url);
      setState('copied');
      setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('idle');
      alert('That didn’t work. Are you online?');
    }
  };
  return (
    <button
      onClick={() => void share()}
      disabled={state === 'busy'}
      className="inline-flex items-center gap-1.5 rounded-full bg-wine px-3.5 py-2 text-sm font-medium text-cream shadow-[var(--shadow-soft)] active:scale-95 disabled:opacity-60"
    >
      <ShareIcon width={16} height={16} />
      {state === 'copied' ? 'Copied ✓' : 'Share'}
    </button>
  );
}

/** People reserved a gift but never bought it: open everything up again for next time */
function ResetReservations() {
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div className="mt-10 text-center">
      <button className="text-xs text-mocha underline" onClick={() => setConfirm(true)}>
        {done ? 'Gift reservations cleared ✓' : 'Reset gift reservations'}
      </button>
      {confirm && (
        <ConfirmSheet
          title="Reset reservations?"
          confirmLabel="Reset"
          onCancel={() => setConfirm(false)}
          onConfirm={async () => {
            await fetch('/api/share/wishlist/reset', { method: 'POST' });
            setConfirm(false);
            setDone(true);
          }}
        >
          Every book on your shared wishlist is open to reserve again. You still won’t see who had reserved what.
        </ConfirmSheet>
      )}
    </div>
  );
}
