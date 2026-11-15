import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useBooks } from '../lib/hooks';
import { updateBook } from '../lib/library';
import { Cover } from '../components/Cover';
import { PartyConfetti } from '../components/PageConfetti';
import { Button, PageHeader, Segmented } from '../components/ui';
import { EmptyState } from '../components/SleepyCat';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { ShareIcon } from '../components/Icons';
import { useProfile } from '../lib/profile';
import { useMeta } from '../lib/hooks';
import { useKeyboardLift } from '../lib/keyboard';
import type { Book } from '../types';

/** Books she doesn't have yet: her dream list, and (second tab) the books she keeps on her radar */
export default function Wishlist() {
  const books = useBooks();
  const [params, setParams] = useSearchParams();
  const tab: 'wishlist' | 'radar' = params.get('tab') === 'radar' ? 'radar' : 'wishlist';
  const radar = tab === 'radar';
  const [gotIt, setGotIt] = useState<string | null>(null);
  const [party, setParty] = useState(0);
  const lists = useMemo(() => {
    const newest = (s: 'wishlist' | 'radar') =>
      (books ?? []).filter((b) => b.status === s).sort((a, b) => b.addedAt - a.addedAt);
    return { wishlist: newest('wishlist'), radar: newest('radar') };
  }, [books]);
  const wishes = lists[tab];
  if (!books) return null;

  return (
    <div>
      <PageHeader
        back
        title={radar ? 'On my radar' : 'Wishlist'}
        right={!radar && wishes.length > 0 ? <ShareActions wishes={wishes} /> : undefined}
      />
      <div className="mx-auto max-w-4xl px-4 pb-10">
        {party > 0 && <PartyConfetti key={party} onDone={() => setParty(0)} />}
        <div className="mx-auto mt-1 mb-5 max-w-sm">
          <Segmented
            value={tab}
            onChange={(t) => setParams(t === 'radar' ? { tab: 'radar' } : {}, { replace: true })}
            options={[
              { id: 'wishlist', label: `💛 Wishlist ${lists.wishlist.length}` },
              { id: 'radar', label: `👀 Radar ${lists.radar.length}` },
            ]}
          />
        </div>
        {radar && wishes.length > 0 && (
          <p className="-mt-2 mb-5 text-center text-xs text-mocha">
            Books you're curious about, without wanting them yet. Not shared, just for you.
          </p>
        )}
        {wishes.length === 0 ? (
          radar ? (
            <EmptyState title="Nothing on your radar">
              Curious about a book but not ready to wish for it? Tap “👀 Radar” on a tip or a search result.
            </EmptyState>
          ) : (
            <EmptyState title="Nothing on your wishlist">
              Add books you want with “+ Wishlist” anywhere in Snug.
            </EmptyState>
          )
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
                    <div className="relative">
                      <Cover book={b} />
                      {!radar && !b.buyUrl && (
                        <span className="absolute inset-x-1 bottom-1 rounded-full bg-ink/70 px-1.5 py-0.5 text-center text-[0.6rem] text-cream">
                          no link yet
                        </span>
                      )}
                    </div>
                    {/* fixed height, so the buttons line up across the row */}
                    <p className="mt-2 line-clamp-2 h-[2.1rem] text-xs leading-snug font-medium">{b.title}</p>
                    <p className="truncate text-[0.7rem] text-mocha">
                      {b.series?.number ? `${b.series.name} #${b.series.number} · ` : ''}
                      {b.authors[0]}
                    </p>
                  </Link>
                  {radar ? (
                    <Button
                      variant="soft"
                      className="mt-2 w-full px-3 py-2 text-xs"
                      disabled={gotIt === b.id}
                      onClick={async () => {
                        setGotIt(b.id);
                        await updateBook(b.id, { status: 'wishlist' });
                        setGotIt(null);
                      }}
                    >
                      + Wishlist
                    </Button>
                  ) : (
                    <Button
                      variant="soft"
                      className="mt-2 w-full px-3 py-2 text-xs"
                      disabled={gotIt === b.id}
                      onClick={async () => {
                        setGotIt(b.id);
                        setParty((n) => n + 1);
                        await updateBook(b.id, { status: 'owned' });
                        setGotIt(null);
                      }}
                    >
                      Got it! 🎉
                    </Button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

/** Share the wishlist, plus a small "more" menu with the rarely needed things (so they can't be hit by accident) */
function ShareActions({ wishes }: { wishes: Book[] }) {
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div className="relative flex items-center gap-2">
      <ShareButton wishes={wishes} />
      <button
        onClick={() => setMenu(!menu)}
        className="grid h-9 w-9 place-items-center rounded-full text-xl leading-none text-cocoa hover:bg-linen"
        aria-label="More"
        aria-expanded={menu}
      >
        ⋯
      </button>
      {menu && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
          <div className="absolute top-full right-0 z-40 mt-2 w-56 rounded-2xl bg-white p-1.5 shadow-[var(--shadow-soft)] ring-1 ring-sand">
            <button
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-ink hover:bg-linen"
              onClick={() => {
                setMenu(false);
                setConfirm(true);
              }}
            >
              {done ? 'Reservations cleared ✓' : 'Reset gift reservations'}
            </button>
          </div>
        </>
      )}
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

function ShareButton({ wishes }: { wishes: Book[] }) {
  const profile = useProfile();
  const oldName = useMeta<string>('readerName', '');
  const [state, setState] = useState<'idle' | 'busy' | 'copied'>('idle');
  const [missing, setMissing] = useState<Book[] | null>(null);
  const withLink = wishes.filter((b) => b.buyUrl);

  const share = async () => {
    setMissing(null);
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

  // only books with a link of her own go on the list: tell her about the ones that don't
  const start = () => {
    const without = wishes.filter((b) => !b.buyUrl);
    if (without.length) setMissing(without);
    else void share();
  };

  return (
    <>
      <button
        onClick={start}
        disabled={state === 'busy'}
        className="inline-flex items-center gap-1.5 rounded-full bg-wine px-3.5 py-2 text-sm font-medium text-cream shadow-[var(--shadow-soft)] active:scale-95 disabled:opacity-60"
      >
        <ShareIcon width={16} height={16} />
        {state === 'copied' ? 'Copied ✓' : 'Share'}
      </button>
      <AnimatePresence>
        {missing && (
          <MissingLinks
            missing={missing}
            canShare={withLink.length > 0}
            onClose={() => setMissing(null)}
            onShare={() => void share()}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/** Books without a buy link stay off the shared list: she adds the link herself, so people buy the right edition */
function MissingLinks({
  missing,
  canShare,
  onClose,
  onShare,
}: {
  missing: Book[];
  canShare: boolean;
  onClose: () => void;
  onShare: () => void;
}) {
  const lift = useKeyboardLift();
  return createPortal(
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-ink/35 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        style={lift}
        className="pb-safe fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85dvh] max-w-md overflow-y-auto rounded-t-[1.75rem] bg-cream px-6 pt-6 pb-6 shadow-2xl md:top-[12%] md:bottom-auto md:rounded-[1.75rem]"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <p className="text-center text-3xl">🔗</p>
        <h2 className="mt-1 text-center text-2xl font-semibold">
          {missing.length === 1 ? 'One book has no link yet' : `${missing.length} books have no link yet`}
        </h2>
        <p className="mt-2 text-center text-sm text-cocoa">
          Only books with a link go on the shared list, so people buy exactly the edition you want. Open a book and
          paste a shop link under “My copy”.
        </p>
        <ul className="mt-4 divide-y divide-linen rounded-2xl bg-white/70 px-3">
          {missing.map((b) => (
            <li key={b.id}>
              <Link to={`/book/${b.id}`} className="flex items-center gap-3 py-2.5" onClick={onClose}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{b.title}</span>
                  <span className="block truncate text-xs text-mocha">{b.authors[0]}</span>
                </span>
                <span className="shrink-0 text-xs text-wine">Add link</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex gap-3">
          <Button variant="soft" className="flex-1" onClick={onClose}>
            Add links first
          </Button>
          {canShare && (
            <Button className="flex-1" onClick={onShare}>
              Share without them
            </Button>
          )}
        </div>
      </motion.div>
    </>,
    document.body,
  );
}
