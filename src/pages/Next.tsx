import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useBooks } from '../lib/hooks';
import { useProfile, updateProfile } from '../lib/profile';
import { recommend } from '../lib/ai';
import { sameBook, searchBooks } from '../lib/bookSearch';
import { updateBook } from '../lib/library';
import { quickAdd } from '../lib/quickAdd';
import { MOODS, type Pick, type RecommendRequest } from '../shared';
import { GENRES } from '../types';
import { Cover } from '../components/Cover';
import { Button, Card, Chip, PageHeader } from '../components/ui';
import { SparkleIcon } from '../components/Icons';
import { BookPreview, type PreviewBook } from '../components/BookPreview';
import { MatchRing, matchLabel } from '../components/MatchRing';
import { useHistoryModal } from '../lib/modal';

type Source = RecommendRequest['source'];

export default function Next() {
  const books = useBooks();
  const profile = useProfile();
  const [source, setSource] = useState<Source>('shelf');
  const [genre, setGenre] = useState<string | undefined>();
  const [mood, setMood] = useState<string | undefined>();
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [shown, setShown] = useState<string[]>([]);
  const [mock, setMock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Genres she actually reads first, then the rest
  const genres = useMemo(() => {
    const count = new Map<string, number>();
    for (const b of books ?? []) for (const g of b.genres) count.set(g, (count.get(g) ?? 0) + 1);
    return [...new Set([...[...count.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g), ...GENRES])];
  }, [books]);

  const unread = (books ?? []).filter((b) => b.status === 'owned').length;

  const ask = async (more = false) => {
    setLoading(true);
    setError(null);
    const exclude = more ? [...shown, ...(picks ?? []).map((p) => p.title)] : [];
    try {
      const res = await recommend({ source, genre, mood, exclude });
      setPicks(res.picks);
      setMock(res.mock);
      setShown(exclude);
      // bring the tips into view (they appear below the choices)
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPicks(null);
    setShown([]);
  };

  return (
    <div>
      <PageHeader back title="What's next?" />
      <div className="mx-auto max-w-3xl px-4 pb-10">
        {!profile.completedAt && (
          <Link to="/quiz">
            <Card className="mb-5 flex items-center gap-3 bg-blush/60">
              <span className="text-2xl">💌</span>
              <p className="flex-1 text-sm text-wine">
                <span className="font-medium">Take the 2-minute reader quiz</span> for tips that really fit you.
              </p>
            </Card>
          </Link>
        )}

        {/* 1. Where from */}
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { id: 'shelf', title: 'From my shelf', sub: `${unread} unread waiting`, emoji: '📚' },
              { id: 'buy', title: 'Something new', sub: 'For the bookshop', emoji: '🛍️' },
            ] as const
          ).map((o) => (
            <button
              key={o.id}
              onClick={() => {
                setSource(o.id);
                reset();
              }}
              className={`rounded-[var(--radius-card)] border-2 p-4 text-left transition-all ${
                source === o.id ? 'border-wine bg-white shadow-[var(--shadow-soft)]' : 'border-transparent bg-white/50'
              }`}
            >
              <span className="text-2xl">{o.emoji}</span>
              <span className={`mt-2 block font-soft text-lg leading-tight font-semibold ${source === o.id ? 'text-wine' : ''}`}>
                {o.title}
              </span>
              <span className="text-xs text-cocoa">{o.sub}</span>
            </button>
          ))}
        </div>

        {/* 2. Genre */}
        <p className="mt-6 mb-2 text-xs tracking-wide text-mocha uppercase">Genre</p>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip active={!genre} onClick={() => (setGenre(undefined), reset())}>
            ✨ Surprise me
          </Chip>
          {genres.map((g) => (
            <Chip key={g} active={genre === g} onClick={() => (setGenre(genre === g ? undefined : g), reset())}>
              {g}
            </Chip>
          ))}
        </div>

        {/* 3. Mood */}
        <p className="mt-5 mb-2 text-xs tracking-wide text-mocha uppercase">Mood (optional)</p>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <Chip key={m.id} active={mood === m.id} onClick={() => (setMood(mood === m.id ? undefined : m.id), reset())}>
              {m.emoji} {m.label}
            </Chip>
          ))}
        </div>

        {!picks && (
          <Button className="mt-7 w-full py-4 text-base" disabled={loading} onClick={() => ask()}>
            <SparkleIcon width={20} height={20} />
            {loading ? 'Snug is thinking…' : 'Find my next read'}
          </Button>
        )}

        {error && <p className="mt-4 text-center text-sm text-wine">{error}</p>}
        {loading && <Thinking />}

        {/* Results */}
        {picks && !loading && (
          <div className="mt-8 scroll-mt-20" ref={resultsRef}>
            {picks.length === 0 ? (
              <Card className="text-center text-sm text-cocoa">
                {source === 'shelf'
                  ? 'No unread books on your shelf fit this. Try another genre, or something new to buy.'
                  : 'No new tips for this combination. Try another genre or mood.'}
              </Card>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {picks.map((p, i) => (
                    <PickCard
                      key={p.title}
                      pick={p}
                      rank={i}
                      source={source}
                      onNotForMe={() => {
                        void updateProfile({ notForMe: [...profile.notForMe, `${p.title} (${p.author})`] });
                        setPicks((list) => list?.filter((x) => x !== p) ?? null);
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button variant="soft" onClick={() => ask(true)}>
                Show me 3 others
              </Button>
              {mock && (
                <p className="max-w-sm text-center text-xs text-mocha">
                  Test mode: tips come from Snug's own taste guesses (your ratings, reviews and quiz). With the AI on, Claude makes them even more personal.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PickCard({
  pick,
  rank,
  source,
  onNotForMe,
}: {
  pick: Pick;
  rank: number;
  source: Source;
  onNotForMe: () => void;
}) {
  const books = useBooks();
  const navigate = useNavigate();
  const own = pick.bookId ? books?.find((b) => b.id === pick.bookId) : undefined;
  const [cover, setCover] = useState<string | undefined>();
  const [done, setDone] = useState(false);
  const preview = useHistoryModal<PreviewBook>('book');

  // New books: borrow a cover from the book search
  useEffect(() => {
    if (pick.bookId) return; // her own book: it already has its cover
    searchBooks(`${pick.title} ${pick.author}`)
      .then((r) => setCover(sameBook(r, pick.title, pick.author).find((x) => x.coverUrl)?.coverUrl))
      .catch(() => {});
  }, [pick.bookId, pick.title, pick.author]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ delay: rank * 0.12 }}
    >
      <Card className="flex gap-4">
        <div className="w-24 shrink-0">
          <button
            className="block w-full active:scale-[0.97]"
            onClick={() =>
              own ? navigate(`/book/${own.id}`) : preview.open({ title: pick.title, author: pick.author, coverUrl: cover })
            }
          >
            <Cover book={own ?? { title: pick.title, authors: [pick.author], coverUrl: cover }} />
          </button>
          <p className="mt-2 text-center font-soft text-sm text-mocha">#{rank + 1}</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg leading-snug font-semibold">{pick.title}</h3>
              <p className="text-sm text-cocoa">{pick.author}</p>
            </div>
            {pick.score !== undefined && (
              <div className="flex flex-col items-center">
                <MatchRing score={pick.score} />
                <span className="mt-0.5 text-[0.6rem] whitespace-nowrap text-mocha">{matchLabel(pick.score)}</span>
              </div>
            )}
          </div>
          {pick.seriesNote && <p className="mt-1 text-xs text-mocha">{pick.seriesNote}</p>}
          <p className="mt-2 text-sm leading-relaxed text-ink/90">{pick.why}</p>
          <div className="mt-3 flex items-center gap-1">
            {source === 'shelf' && own ? (
              <Button
                className="px-4 py-2 text-xs whitespace-nowrap"
                onClick={async () => {
                  await updateBook(own.id, { status: 'reading' });
                  navigate(`/book/${own.id}`);
                }}
              >
                Start reading
              </Button>
            ) : (
              <Button
                className="px-4 py-2 text-xs whitespace-nowrap"
                disabled={done}
                onClick={async () => {
                  setDone(true);
                  await quickAdd(pick.title, pick.author, 'wishlist', cover ? { coverUrl: cover } : {});
                }}
              >
                {done ? 'On your wishlist ✓' : '+ Wishlist'}
              </Button>
            )}
            <Button variant="ghost" className="px-3 py-2 text-xs whitespace-nowrap" onClick={onNotForMe}>
              Not for me
            </Button>
          </div>
        </div>
      </Card>
      {preview.item && <BookPreview book={preview.item} onClose={preview.close} />}
    </motion.div>
  );
}

function Thinking() {
  return (
    <div className="flex flex-col items-center py-10 text-sm text-cocoa">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-10 w-7 rounded-sm bg-wine"
            style={{ background: ['#7A2E3A', '#C49A5A', '#8B5E3C'][i] }}
            animate={{ y: [0, -10, 0], rotate: [0, i === 1 ? 0 : i === 0 ? -6 : 6, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
      <p className="mt-4">Snug is browsing the shelves for you…</p>
    </div>
  );
}
