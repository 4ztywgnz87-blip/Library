import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Cover } from '../components/Cover';
import { Button } from '../components/ui';
import { SleepyCat } from '../components/SleepyCat';
import type { Lang, SeriesInfo } from '../types';

interface Wish {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  customCover?: string;
  language: Lang;
  specialEdition: boolean;
  series?: SeriesInfo;
  isbn13?: string;
  pageCount?: number;
  claimedBy: string | null;
}

const LANG: Record<Lang, { flag: string; label: string; hint: string }> = {
  en: { flag: '🇬🇧', label: 'English', hint: 'the English edition, please' },
  nl: { flag: '🇳🇱', label: 'Nederlands', hint: 'graag de Nederlandse vertaling' },
};

function readLocal<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode: it just won't be remembered */
  }
}

/** The wishlist as family and friends see it, through her secret link. Works without the rest of Snug. */
export default function SharedWishlist({ token }: { token: string }) {
  const [data, setData] = useState<{ name: string; books: Wish[] } | null>(null);
  const [error, setError] = useState('');
  // gift mode shows what's already reserved; it stays off by default so she can peek without spoilers
  const [giving, setGiving] = useState(() => readLocal('snug-gift-mode', false));
  const [mine, setMine] = useState<string[]>(() => readLocal(`snug-gifts-${token}`, []));
  const [giver, setGiver] = useState(() => readLocal('snug-giver', ''));
  const [asking, setAsking] = useState<Wish | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/wish/${encodeURIComponent(token)}`);
    const body = await res.json();
    if (!res.ok) setError(body.error ?? 'This wishlist could not be opened');
    else setData(body);
  }, [token]);
  useEffect(() => {
    void load().catch(() => setError('No connection. Try again in a moment.'));
  }, [load]);

  const name = data?.name || 'her';
  useEffect(() => {
    if (data) document.title = `${data.name ? `${data.name}'s` : 'A little'} wishlist 📚`;
  }, [data]);

  const claim = async (w: Wish, who: string) => {
    const res = await fetch(`/api/wish/${encodeURIComponent(token)}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: w.id, name: who }),
    });
    if (!res.ok) alert((await res.json()).error ?? 'That did not work, sorry');
    else {
      const next = [...mine, w.id];
      setMine(next);
      writeLocal(`snug-gifts-${token}`, next);
      setGiver(who);
      writeLocal('snug-giver', who);
    }
    setAsking(null);
    await load();
  };
  const unclaim = async (w: Wish) => {
    await fetch(`/api/wish/${encodeURIComponent(token)}/claim/${encodeURIComponent(w.id)}`, { method: 'DELETE' });
    const next = mine.filter((id) => id !== w.id);
    setMine(next);
    writeLocal(`snug-gifts-${token}`, next);
    await load();
  };

  return (
    <div className="min-h-dvh bg-cream text-ink">
      <div className="pt-safe mx-auto max-w-3xl px-4 pb-16">
        <header className="relative pt-10 pb-6 text-center">
          <GiftDoodle />
          <h1 className="mt-3 text-[2.1rem] leading-tight font-semibold">
            {data?.name ? `${data.name}'s wishlist` : 'A little wishlist'}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-cocoa">
            The books {name} is dreaming of. Each one says which language to get, because that matters to a reader. 💛
          </p>
          {data && data.books.length > 0 && (
            <button
              onClick={() => {
                setGiving(!giving);
                writeLocal('snug-gift-mode', !giving);
              }}
              className={`mt-4 rounded-full px-4 py-2 text-sm transition-colors ${
                giving ? 'bg-wine text-cream' : 'bg-white/80 text-wine shadow-[var(--shadow-soft)]'
              }`}
            >
              {giving ? '🎁 Gift mode on · showing what’s taken' : '🎁 I’m choosing a gift'}
            </button>
          )}
          {data && !giving && data.books.length > 0 && (
            <p className="mt-2 text-xs text-mocha">
              (Reserved gifts stay hidden until you tap that, so {name} can look without spoilers.)
            </p>
          )}
        </header>

        {error ? (
          <div className="pt-6 text-center">
            <SleepyCat className="mx-auto w-32" />
            <p className="mt-3 text-cocoa">{error}</p>
          </div>
        ) : !data ? (
          <p className="pt-10 text-center text-sm text-mocha">Opening the wishlist…</p>
        ) : data.books.length === 0 ? (
          <div className="pt-6 text-center">
            <SleepyCat className="mx-auto w-32" />
            <p className="mt-3 text-cocoa">The wishlist is empty right now. Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.books.map((w, i) => {
              const taken = giving && w.claimedBy && !mine.includes(w.id);
              const byMe = giving && mine.includes(w.id);
              const lang = LANG[w.language] ?? LANG.en;
              const find = `https://www.bol.com/be/nl/s/?searchtext=${encodeURIComponent(w.isbn13 ?? `${w.title} ${w.author}`)}`;
              return (
                <motion.article
                  key={w.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i * 0.05, 0.5) } }}
                  className={`relative flex gap-4 rounded-[var(--radius-card)] bg-white/75 p-4 shadow-[var(--shadow-soft)] ${
                    taken ? 'opacity-55' : ''
                  }`}
                >
                  <div className="relative w-24 shrink-0">
                    <Cover
                      book={{ title: w.title, authors: [w.author], coverUrl: w.coverUrl, customCover: w.customCover }}
                    />
                    {(taken || byMe) && (
                      <span className="absolute -top-2 -right-2 grid h-8 w-8 place-items-center rounded-full bg-blush text-base shadow">
                        🎀
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h2 className="text-lg leading-snug font-semibold select-text">{w.title}</h2>
                    <p className="text-sm text-cocoa select-text">{w.author}</p>
                    {w.series?.name && (
                      <p className="mt-0.5 text-xs text-mocha">
                        {w.series.name}
                        {w.series.number ? ` · book ${w.series.number}` : ''}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-linen px-2.5 py-1 text-xs font-medium">
                        <span>{lang.flag}</span> {lang.label}
                      </span>
                      {w.specialEdition && (
                        <span className="rounded-full bg-blush/70 px-2.5 py-1 text-xs font-medium text-wine">
                          ✨ Special edition
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-mocha italic">{lang.hint}</p>
                    {w.isbn13 && <p className="mt-1 text-[11px] text-mocha select-text">ISBN {w.isbn13}</p>}

                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                      {giving &&
                        (byMe ? (
                          <>
                            <span className="text-xs font-medium text-wine">You’re getting this one 🎁</span>
                            <button className="text-xs text-mocha underline" onClick={() => void unclaim(w)}>
                              undo
                            </button>
                          </>
                        ) : taken ? (
                          <span className="text-xs text-cocoa">Already taken by {w.claimedBy} 🎀</span>
                        ) : (
                          <Button className="px-4 py-2 text-xs" onClick={() => setAsking(w)}>
                            I’ll get this
                          </Button>
                        ))}
                      {!taken && (
                        <a href={find} target="_blank" rel="noreferrer" className="text-xs text-wine underline">
                          Find it online
                        </a>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
        <p className="mt-10 text-center text-xs text-mocha">Made with love in Snug 📚</p>
      </div>

      <AnimatePresence>
        {asking && (
          <ClaimSheet
            book={asking}
            initial={giver}
            onCancel={() => setAsking(null)}
            onClaim={(who) => claim(asking, who)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ClaimSheet({
  book,
  initial,
  onCancel,
  onClaim,
}: {
  book: Wish;
  initial: string;
  onCancel: () => void;
  onClaim: (name: string) => Promise<void>;
}) {
  const [who, setWho] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-ink/35 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      />
      <motion.div
        className="pb-safe fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-[1.75rem] bg-cream px-6 pt-6 pb-6 text-center shadow-2xl md:top-1/3 md:bottom-auto md:rounded-[1.75rem]"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <p className="text-3xl">🎁</p>
        <h2 className="mt-1 text-2xl font-semibold">Reserve {book.title}?</h2>
        <p className="mt-1 text-sm text-cocoa">
          Other gift-givers will see it’s taken, so nobody buys it twice. She won’t see who.
        </p>
        <input
          value={who}
          onChange={(e) => setWho(e.target.value)}
          placeholder="Your name"
          maxLength={40}
          autoFocus
          className="mt-4 w-full rounded-2xl border border-sand bg-white/80 px-4 py-3 text-base"
        />
        <div className="mt-5 flex gap-3">
          <Button variant="soft" className="flex-1" onClick={onCancel}>
            Not yet
          </Button>
          <Button
            className="flex-1"
            disabled={!who.trim() || busy}
            onClick={async () => {
              setBusy(true);
              await onClaim(who.trim());
            }}
          >
            Reserve it
          </Button>
        </div>
      </motion.div>
    </>
  );
}

/** A stack of books tied up with a bow */
function GiftDoodle() {
  return (
    <motion.svg
      viewBox="0 0 120 90"
      className="mx-auto h-20 w-28"
      aria-hidden
      initial={{ y: -6, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 160, damping: 12 }}
    >
      <ellipse cx="60" cy="84" rx="42" ry="4" fill="#e8dccb" />
      <rect x="22" y="58" width="76" height="24" rx="3" fill="#7A2E3A" />
      <rect x="22" y="58" width="76" height="4" fill="#f4ead9" opacity="0.5" />
      <rect x="28" y="38" width="64" height="20" rx="3" fill="#5F6B52" />
      <rect x="34" y="20" width="52" height="18" rx="3" fill="#c98b5a" />
      <rect x="57" y="20" width="6" height="62" fill="#f1bf6a" />
      <motion.g
        style={{ transformBox: 'view-box', transformOrigin: '60px 20px' }}
        animate={{ rotate: [0, -5, 5, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.5 }}
      >
        <path d="M60 20c-6-12-20-12-18-4 2 6 12 5 18 4z" fill="#f1bf6a" />
        <path d="M60 20c6-12 20-12 18-4-2 6-12 5-18 4z" fill="#f1bf6a" />
        <circle cx="60" cy="19" r="3.5" fill="#e0a85a" />
      </motion.g>
      {[
        [14, 30],
        [104, 22],
        [100, 50],
      ].map(([x, y], i) => (
        <motion.path
          key={i}
          d={`M${x} ${y - 4}l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2z`}
          fill="#e0a85a"
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.1, 0.8] }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
        />
      ))}
    </motion.svg>
  );
}
