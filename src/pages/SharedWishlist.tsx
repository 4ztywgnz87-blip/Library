import { useKeyboardLift } from '../lib/keyboard';
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
  buyUrl?: string;
  claimedBy: string | null;
  mine: boolean;
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

interface Visitor {
  name: string;
  email: string;
}

/**
 * The wishlist as family and friends see it, through her link. Givers sign in with their name and
 * email first, so a reservation can be changed later from any device. She can look too, without
 * spoilers: then nothing about reservations is even loaded.
 */
export default function SharedWishlist({ token }: { token: string }) {
  const [data, setData] = useState<{ name: string; books: Wish[] } | null>(null);
  const [error, setError] = useState('');
  const [visitor, setVisitor] = useState<Visitor | null>(() => readLocal('snug-giver-v2', null));
  const [peeking, setPeeking] = useState(() => readLocal('snug-owner-peek', false));
  const [asking, setAsking] = useState<Wish | null>(null);

  const load = useCallback(async () => {
    const q = visitor && !peeking ? `?email=${encodeURIComponent(visitor.email)}` : '';
    const res = await fetch(`/api/wish/${encodeURIComponent(token)}${q}`);
    const body = await res.json();
    if (!res.ok) setError(body.error ?? 'This wishlist could not be opened');
    else setData(body);
  }, [token, visitor, peeking]);
  useEffect(() => {
    void load().catch(() => setError('No connection. Try again in a moment.'));
  }, [load]);

  const owner = data?.name?.trim();
  const title = owner ? `${owner}'s little wishlist` : 'A little wishlist';
  useEffect(() => {
    if (data) document.title = `${title} 📚`;
  }, [data, title]);

  const claim = async (w: Wish) => {
    if (!visitor) return;
    const res = await fetch(`/api/wish/${encodeURIComponent(token)}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: w.id, name: visitor.name, email: visitor.email }),
    });
    if (!res.ok) alert((await res.json()).error ?? 'That did not work, sorry');
    setAsking(null);
    await load();
  };
  const unclaim = async (w: Wish) => {
    if (!visitor) return;
    await fetch(
      `/api/wish/${encodeURIComponent(token)}/claim/${encodeURIComponent(w.id)}?email=${encodeURIComponent(visitor.email)}`,
      { method: 'DELETE' },
    );
    await load();
  };

  const signedIn = !!visitor || peeking;
  return (
    <div className="min-h-dvh bg-cream text-ink">
      <div className="pt-safe mx-auto max-w-3xl px-4 pb-16">
        <header className="relative pt-10 pb-6 text-center">
          <GiftDoodle />
          <h1 className="mt-3 text-[2.1rem] leading-tight font-semibold">{title}</h1>
          {signedIn && (
            <p className="mt-2 text-xs text-mocha">
              {peeking ? (
                <>
                  Just looking, no spoilers ·{' '}
                  <button
                    className="underline"
                    onClick={() => {
                      setPeeking(false);
                      writeLocal('snug-owner-peek', false);
                    }}
                  >
                    I'm buying a gift
                  </button>
                </>
              ) : (
                <>
                  Hi {visitor!.name} 👋 ·{' '}
                  <button
                    className="underline"
                    onClick={() => {
                      setVisitor(null);
                      writeLocal('snug-giver-v2', null);
                    }}
                  >
                    not you?
                  </button>
                </>
              )}
            </p>
          )}
        </header>

        {error ? (
          <div className="pt-6 text-center">
            <SleepyCat className="mx-auto w-32" />
            <p className="mt-3 text-cocoa">{error}</p>
          </div>
        ) : !signedIn ? (
          <SignIn
            owner={owner}
            onSignIn={(v) => {
              setVisitor(v);
              writeLocal('snug-giver-v2', v);
            }}
            onPeek={() => {
              setPeeking(true);
              writeLocal('snug-owner-peek', true);
            }}
          />
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
              const taken = !peeking && w.claimedBy && !w.mine;
              const byMe = !peeking && w.mine;
              const lang = LANG[w.language] ?? LANG.en;
              const find = w.buyUrl;
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
                      {!peeking &&
                        (byMe ? (
                          <>
                            <span className="text-xs font-medium text-wine">You're getting this one 🎁</span>
                            <button className="text-xs text-mocha underline" onClick={() => void unclaim(w)}>
                              undo
                            </button>
                          </>
                        ) : taken ? (
                          <span className="text-xs text-cocoa">Already taken by {w.claimedBy} 🎀</span>
                        ) : (
                          <Button className="px-4 py-2 text-xs" onClick={() => setAsking(w)}>
                            I'll get this
                          </Button>
                        ))}
                      {!taken && find && (
                        <a href={find} target="_blank" rel="noreferrer" className="text-xs text-wine underline">
                          Buy it here
                        </a>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
        <p className="mt-10 text-center text-xs text-mocha">Snug 📚</p>
      </div>

      <AnimatePresence>
        {asking && <ClaimSheet book={asking} onCancel={() => setAsking(null)} onClaim={() => claim(asking)} />}
      </AnimatePresence>
    </div>
  );
}

/** Name and email first: then reservations follow them to any device */
function SignIn({ owner, onSignIn, onPeek }: { owner?: string; onSignIn: (v: Visitor) => void; onPeek: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const ok = name.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  return (
    <form
      className="mx-auto max-w-sm rounded-[var(--radius-card)] bg-white/75 p-5 shadow-[var(--shadow-soft)]"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onSignIn({ name: name.trim(), email: email.trim().toLowerCase() });
      }}
    >
      <p className="text-center text-sm text-cocoa">
        Choosing a gift? Fill in your name and email. You can reserve a book, and change it later from any device.
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        autoComplete="name"
        maxLength={40}
        className="mt-4 w-full rounded-2xl border border-sand bg-white/80 px-4 py-3 text-base"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        type="email"
        autoComplete="email"
        className="mt-2 w-full rounded-2xl border border-sand bg-white/80 px-4 py-3 text-base"
      />
      <Button type="submit" className="mt-4 w-full" disabled={!ok}>
        Open the wishlist
      </Button>
      <button type="button" onClick={onPeek} className="mt-4 block w-full text-center text-xs text-mocha underline">
        I'm {owner || 'the owner'}: show it without spoilers
      </button>
    </form>
  );
}

function ClaimSheet({ book, onCancel, onClaim }: { book: Wish; onCancel: () => void; onClaim: () => Promise<void> }) {
  const lift = useKeyboardLift();
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
        style={lift}
        className="pb-safe fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-[1.75rem] bg-cream px-6 pt-6 pb-6 text-center shadow-2xl md:top-1/3 md:bottom-auto md:rounded-[1.75rem]"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <p className="text-3xl">🎁</p>
        <h2 className="mt-1 text-2xl font-semibold">Reserve {book.title}?</h2>
        <p className="mt-1 text-sm text-cocoa">
          Others choosing a gift will see it's taken, so nobody buys it twice. You can undo it any time.
        </p>
        <div className="mt-5 flex gap-3">
          <Button variant="soft" className="flex-1" onClick={onCancel}>
            Not yet
          </Button>
          <Button
            className="flex-1"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onClaim();
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
