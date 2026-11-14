import { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useBooks } from '../lib/hooks';
import { fitCheck, identifyCover } from '../lib/ai';
import { shrinkPhoto } from '../lib/photo';
import { sameBook, searchBooks, type SearchResult } from '../lib/bookSearch';
import { bookKey, normalize } from '../lib/library';
import { quickAdd } from '../lib/quickAdd';
import type { FitResponse } from '../shared';
import { STATUSES, type Book } from '../types';
import { Cover } from '../components/Cover';
import { StarsDisplay } from '../components/Stars';
import { Button, Card, PageHeader } from '../components/ui';
import { CameraIcon, SearchIcon } from '../components/Icons';
import { PhotoInput } from '../components/PhotoInput';

const VERDICT: Record<FitResponse['verdict'], { label: string; color: string }> = {
  love: { label: "You'll love this 💕", color: '#7A2E3A' },
  like: { label: 'A good match 👍', color: '#8F9E7F' },
  maybe: { label: 'Could go either way 🤔', color: '#C49A5A' },
  skip: { label: 'Probably not for you', color: '#A08A78' },
};

type State =
  | { kind: 'idle' }
  | { kind: 'working'; text: string }
  | { kind: 'owned'; book: Book }
  | { kind: 'fit'; book: SearchResult; fit: FitResponse }
  | { kind: 'error'; text: string };

export default function Shop() {
  const books = useBooks();
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [query, setQuery] = useState('');

  // Typing a title checks her own library instantly (works offline too)
  const matches = useMemo(() => {
    const q = normalize(query);
    if (q.length < 3 || !books) return [];
    return books.filter((b) => normalize(`${b.title} ${b.authors.join(' ')}`).includes(q)).slice(0, 5);
  }, [query, books]);

  // Search results while typing (debounced), like on the Add screen
  const [found, setFound] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const q = query.trim();
    setFound([]);
    if (q.length < 3 || !navigator.onLine) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchBooks(q, ctrl.signal);
        if (!ctrl.signal.aborted) setFound(results.slice(0, 10));
      } catch {
        // offline or not found: the library check above still works
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  // books she already has are shown above ("Yes! It's already in your library"), not again below
  const ownedKeys = new Set((books ?? []).map((b) => bookKey(b)));
  const notOwned = found.filter((r) => !ownedKeys.has(bookKey(r))).slice(0, 8);

  // Every check gets a number; cancelling (or starting another) makes older answers count for nothing
  const runRef = useRef(0);
  const begin = () => {
    const my = ++runRef.current;
    return (next: State) => {
      if (my === runRef.current) setState(next);
    };
  };
  const cancel = () => {
    runRef.current++;
    setState({ kind: 'idle' });
  };

  const check = async (title: string, author: string, picked?: SearchResult, setState = begin()) => {
    const own = books?.find((b) => bookKey(b) === bookKey({ title, authors: [author] }));
    if (own) return setState({ kind: 'owned', book: own });
    setState({ kind: 'working', text: 'Checking if it fits you…' });
    try {
      if (picked) {
        const fit = await fitCheck({
          title: picked.title,
          author: picked.authors[0] ?? author,
          description: picked.description,
          genres: picked.genres,
        });
        return setState({ kind: 'fit', book: picked, fit });
      }
      const results = await searchBooks(`${title} ${author}`);
      const matches = author ? sameBook(results, title, author) : results;
      const found = matches.find((r) => r.coverUrl) ??
        matches[0] ?? {
          source: 'google' as const,
          title,
          authors: [author],
          genres: [],
        };
      const fit = await fitCheck({
        title: found.title,
        author: found.authors[0] ?? author,
        description: found.description,
        genres: found.genres,
      });
      setState({ kind: 'fit', book: found, fit });
    } catch (e) {
      setState({ kind: 'error', text: (e as Error).message });
    }
  };

  const fromPhoto = async (file: File) => {
    const setState = begin();
    setState({ kind: 'working', text: 'Reading the cover…' });
    try {
      const id = await identifyCover(await shrinkPhoto(file));
      if (!id.title)
        return setState({
          kind: 'error',
          text: "Snug couldn't read that cover. Try again, or type the title.",
        });
      await check(id.title, id.author ?? '', undefined, setState);
    } catch (e) {
      setState({ kind: 'error', text: (e as Error).message });
    }
  };

  return (
    <div>
      <PageHeader back title="In a bookshop?" />
      <div className="mx-auto max-w-xl px-4 pb-10">
        <p className="text-cocoa">
          Snap the cover: Snug tells you if you already have it, and if it's your kind of book.
        </p>

        <PhotoInput
          onFile={(f) => void fromPhoto(f)}
          className="mt-5 flex items-center justify-center gap-2 rounded-[var(--radius-card)] bg-wine px-4 py-5 text-base font-medium text-cream shadow-[var(--shadow-soft)] active:scale-[0.98]"
        >
          <CameraIcon width={24} height={24} /> Photo of the cover
        </PhotoInput>

        <div className="relative mt-4">
          <SearchIcon className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-mocha" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="…or type the title: do I have it?"
            className="w-full rounded-full border border-sand bg-white py-3.5 pr-4 pl-12 text-[16px] outline-none placeholder:text-mocha focus:border-oat"
          />
        </div>

        {query.trim().length >= 3 && state.kind === 'idle' && (
          <div className="mt-3">
            {matches.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-wine">Yes! It's already in your library:</p>
                {matches.map((b) => (
                  <OwnedRow key={b.id} book={b} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-cocoa">Not in your library yet. Which one is it?</p>
            )}
            {/* search results, so she can tap the exact book */}
            {notOwned.length > 0 && (
              <ul className="mt-3 divide-y divide-sand/70">
                {notOwned.map((r) => (
                  <li key={(r.googleId ?? r.olKey ?? '') + r.title}>
                    <button
                      className="flex w-full gap-3 py-2.5 text-left"
                      onClick={() => check(r.title, r.authors[0] ?? '', r)}
                    >
                      <Cover book={r} className="w-11 shrink-0" rounded="rounded" />
                      <div className="min-w-0">
                        <p className="text-sm leading-snug font-medium">{r.title}</p>
                        <p className="text-xs text-cocoa">{r.authors.join(', ')}</p>
                        {r.series && (
                          <p className="text-xs text-mocha">
                            {r.series.name}
                            {r.series.number ? ` #${r.series.number}` : ''}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {searching && notOwned.length === 0 && <p className="mt-3 text-sm text-mocha">Searching…</p>}
          </div>
        )}

        <div className="mt-6">
          {state.kind === 'working' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-center text-sm text-cocoa">{state.text}</p>
              <Button variant="soft" className="px-5 py-2 text-sm" onClick={cancel}>
                Cancel
              </Button>
            </div>
          )}
          {state.kind === 'error' && <p className="py-4 text-center text-sm text-wine">{state.text}</p>}
          {state.kind === 'owned' && (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <p className="mb-2 text-center font-soft text-2xl text-wine">You already have this one! 🎉</p>
              <OwnedRow book={state.book} />
            </motion.div>
          )}
          {state.kind === 'fit' && <FitCard book={state.book} fit={state.fit} />}
          {state.kind !== 'idle' && state.kind !== 'working' && (
            <div className="mt-4 text-center">
              <button
                className="text-sm text-cocoa underline"
                onClick={() => {
                  setState({ kind: 'idle' });
                  setQuery('');
                }}
              >
                Check another book
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OwnedRow({ book }: { book: Book }) {
  return (
    <Link to={`/book/${book.id}`}>
      <Card className="flex items-center gap-3 py-3">
        <Cover book={book} className="w-12 shrink-0" rounded="rounded" />
        <div className="min-w-0">
          <p className="leading-snug font-medium">{book.title}</p>
          <p className="text-xs text-cocoa">
            {STATUSES.find((s) => s.id === book.status)?.label}
            {book.language === 'nl' ? ' · in Dutch' : ' · in English'}
          </p>
          {book.rating !== undefined && <StarsDisplay value={book.rating} size={12} />}
        </div>
      </Card>
    </Link>
  );
}

function FitCard({ book, fit }: { book: SearchResult; fit: FitResponse }) {
  const [added, setAdded] = useState(false);
  const v = VERDICT[fit.verdict];
  const r = 34;
  const circ = 2 * Math.PI * r;
  return (
    <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <Card className="space-y-4">
        <div className="flex gap-4">
          <Cover book={book} className="w-24 shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg leading-snug font-semibold">{book.title}</h3>
            <p className="text-sm text-cocoa">{book.authors.join(', ')}</p>
            <div className="mt-3 flex items-center gap-3">
              <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
                <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-sand)" strokeWidth="7" />
                <motion.circle
                  cx="40"
                  cy="40"
                  r={r}
                  fill="none"
                  stroke={v.color}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  initial={{ strokeDashoffset: circ }}
                  animate={{ strokeDashoffset: circ * (1 - fit.score / 100) }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <div>
                <p className="font-soft text-3xl font-semibold" style={{ color: v.color }}>
                  {fit.score}%
                </p>
                <p className="text-sm font-medium">{v.label}</p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm leading-relaxed">{fit.why}</p>
        {fit.seriesNote && <p className="rounded-xl bg-linen px-3 py-2 text-sm text-cocoa">📚 {fit.seriesNote}</p>}
        <Button
          className="w-full"
          disabled={added}
          onClick={async () => {
            setAdded(true);
            await quickAdd(book.title, book.authors[0] ?? '', 'wishlist', {
              coverUrl: book.coverUrl,
            });
          }}
        >
          {added ? 'On your wishlist ✓' : '+ Add to wishlist'}
        </Button>
        {fit.mock && <p className="text-center text-xs text-mocha">Test mode: a rough guess without AI.</p>}
      </Card>
    </motion.div>
  );
}
