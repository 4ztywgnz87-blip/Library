import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { seriesPath } from '../lib/series';
import { AnimatePresence, motion } from 'motion/react';
import { useBook } from '../lib/hooks';
import { deleteBook, updateBook } from '../lib/library';
import { GENRES, STATUSES, type Book, type Status } from '../types';
import { Cover } from '../components/Cover';
import { StarsDisplay, StarsInput, formatRating } from '../components/Stars';
import { Button, Card, Chip, PageHeader, Segmented } from '../components/ui';
import { CoverChoice } from '../components/CoverChoice';
import { ChevronIcon, TrashIcon } from '../components/Icons';
import { EditionPicker } from '../components/EditionPicker';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { lookupSeries, setGenreForSeries } from '../lib/seriesLookup';
import { useMatches } from '../lib/taste';
import { profileKey } from '../taste/vocab';
import { MatchRing, matchLabel } from '../components/MatchRing';

const TAG_SUGGESTIONS = [
  'spicy 🌶️',
  'emotional 😭',
  'plot twist 🤯',
  'funny 😂',
  'slow burn 🔥',
  'cosy ☕',
  'dark 🖤',
  'page-turner',
];

export default function BookDetail() {
  const { id } = useParams();
  const book = useBook(id);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [celebrate, setCelebrate] = useState(0);
  const [pickingEdition, setPickingEdition] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const ratingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (params.get('rate') && ratingRef.current) {
      ratingRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [params, book?.status]);

  if (book === undefined) return null;
  if (!book || book.deleted) {
    return (
      <div>
        <PageHeader back title="" />
        <p className="p-8 text-center text-cocoa">This book isn't in your library.</p>
      </div>
    );
  }

  const set = (patch: Partial<Book>) => updateBook(book.id, patch);

  const setStatus = (status: Status) => {
    if (status === 'read' && book.status !== 'read') {
      setCelebrate((c) => c + 1);
      setTimeout(() => ratingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
    void set({ status });
  };

  return (
    <div className="relative">
      {/* soft blurred cover as backdrop */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        {(book.customCover || book.coverUrl) && (
          <img
            src={book.customCover || book.coverUrl}
            alt=""
            className="h-full w-full scale-125 object-cover opacity-30 blur-2xl"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-cream/30 to-cream" />
      </div>

      <PageHeader back title="" />

      <div className="relative mx-auto max-w-3xl px-4 pb-16">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 12, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            className="w-40 sm:w-48"
          >
            <Cover book={book} rounded="rounded-lg" />
          </motion.div>
          <h1 className="mt-5 text-3xl leading-tight font-semibold">{book.title}</h1>
          <p className="mt-1 text-cocoa">{book.authors.join(', ')}</p>
          {book.series && (
            <p className="mt-1 text-sm text-mocha">
              {book.series.name}
              {book.series.number ? ` · book ${book.series.number}` : ''}
            </p>
          )}
        </div>

        <div className="mt-8 space-y-4">
          {/* Status */}
          <Card>
            <p className="mb-3 text-xs tracking-wide text-mocha uppercase">Status</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATUSES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatus(s.id)}
                  className={`rounded-2xl border px-3 py-2.5 text-sm transition-all ${
                    book.status === s.id
                      ? 'border-wine bg-white font-medium text-wine shadow-[var(--shadow-soft)]'
                      : 'border-sand text-cocoa'
                  }`}
                >
                  {s.short}
                </button>
              ))}
            </div>
            {/* the obvious next step, one tap */}
            {book.status === 'reading' && (
              <Button className="mt-4 w-full" onClick={() => setStatus('read')}>
                I finished it! 🎉
              </Button>
            )}
            {book.status === 'owned' && (
              <Button className="mt-4 w-full" onClick={() => setStatus('reading')}>
                Start reading 📖
              </Button>
            )}
            {book.status === 'wishlist' && (
              <Button className="mt-4 w-full" onClick={() => setStatus('owned')}>
                Got it! 🎉
              </Button>
            )}
          </Card>

          {/* How well it fits her (books she hasn't read yet) */}
          {(book.status === 'owned' || book.status === 'wishlist') && <FitForYou book={book} />}

          {/* Rating & review */}
          {book.status === 'read' && (
            <div ref={ratingRef}>
              <RatingCard book={book} />
            </div>
          )}

          {/* My copy */}
          <Card className="space-y-4">
            <p className="text-xs tracking-wide text-mocha uppercase">My copy</p>
            <Segmented
              value={book.language}
              onChange={(language) => set({ language })}
              options={[
                { id: 'en', label: '🇬🇧 English' },
                { id: 'nl', label: '🇳🇱 Dutch' },
              ]}
            />
            <CoverChoice
              cover={book.customCover}
              onChoose={() => setPickingEdition(true)}
              onReset={() => set({ customCover: undefined, specialEdition: false })}
            />
          </Card>

          {/* Genres */}
          <Card>
            <p className="mb-3 text-xs tracking-wide text-mocha uppercase">
              Genres{book.series && <span className="normal-case tracking-normal"> · for the whole series</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {[...new Set([...GENRES, ...book.genres])].map((g) => {
                const on = book.genres.includes(g);
                return (
                  <Chip key={g} active={on} onClick={() => setGenreForSeries(book, g, !on)}>
                    {g}
                  </Chip>
                );
              })}
            </div>
          </Card>

          <SeriesCard book={book} />

          {/* About */}
          {book.description && <AboutCard text={book.description} />}

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-xs text-mocha">
            {book.pageCount && <span>{book.pageCount} pages</span>}
            {book.publishedDate && <span>Published {book.publishedDate.slice(0, 4)}</span>}
            {book.isbn13 && <span>ISBN {book.isbn13}</span>}
          </div>

          <div className="flex justify-center pt-4">
            <button
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-cocoa hover:bg-linen"
              onClick={() => setConfirmRemove(true)}
            >
              <TrashIcon width={16} height={16} /> Remove from library
            </button>
          </div>
        </div>
      </div>

      {confirmRemove && (
        <ConfirmSheet
          title="Remove this book?"
          confirmLabel="Remove"
          onCancel={() => setConfirmRemove(false)}
          onConfirm={async () => {
            setConfirmRemove(false);
            await deleteBook(book.id);
            navigate(-1);
          }}
        >
          <span className="font-medium text-ink">{book.title}</span> will leave your library, with its rating and
          review.
        </ConfirmSheet>
      )}

      {pickingEdition && (
        <EditionPicker
          book={book}
          onClose={() => setPickingEdition(false)}
          onPick={async (cover) => {
            setPickingEdition(false);
            await set({ customCover: cover, specialEdition: true });
          }}
        />
      )}

      <AnimatePresence>{celebrate > 0 && <Petals key={celebrate} onDone={() => setCelebrate(0)} />}</AnimatePresence>
    </div>
  );
}

/** Year she finished a book in; undefined = "earlier / don't remember" */
const finishedYear = (b: Book) => (b.finishedAt ? new Date(b.finishedAt).getFullYear() : undefined);

/**
 * Rating, review and tags. Once saved they are shown read-only, and "Edit" unlocks them,
 * so nothing changes by accident.
 */
function RatingCard({ book }: { book: Book }) {
  // Opens ready to rate, unless she already saved this card once (e.g. only a year, no stars)
  const [editing, setEditing] = useState(book.rating === undefined && !book.ratingSaved);
  const [rating, setRating] = useState(book.rating);
  const [review, setReview] = useState(book.review ?? '');
  const [tags, setTags] = useState(book.tags);
  const [year, setYear] = useState(finishedYear(book));
  const now = new Date().getFullYear();

  const startEdit = () => {
    setRating(book.rating);
    setReview(book.review ?? '');
    setTags(book.tags);
    setYear(finishedYear(book));
    setEditing(true);
  };

  const save = async () => {
    // Keep the exact date if the year didn't change; otherwise mid-year of the chosen year
    const finishedAt =
      year === undefined
        ? undefined
        : year === finishedYear(book)
          ? book.finishedAt
          : year === now
            ? Date.now()
            : Date.UTC(year, 6, 1);
    await updateBook(book.id, { rating, review: review.trim() || undefined, tags, finishedAt, ratingSaved: true });
    setEditing(false);
  };

  if (!editing) {
    return (
      <Card className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs tracking-wide text-mocha uppercase">My rating</p>
            {book.rating !== undefined ? (
              <div className="mt-1 flex items-center gap-2">
                <StarsDisplay value={book.rating} size={24} />
                <span className="font-soft text-lg font-semibold">{formatRating(book.rating)}</span>
              </div>
            ) : (
              <p className="mt-1 text-sm text-cocoa">Not rated yet</p>
            )}
          </div>
          <Button variant="soft" className="px-4 py-2 text-xs" onClick={startEdit}>
            Edit
          </Button>
        </div>
        {book.review && <p className="font-soft text-[15px] leading-relaxed text-ink/90 italic">“{book.review}”</p>}
        {book.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {book.tags.map((t) => (
              <span key={t} className="rounded-full bg-linen px-2.5 py-1 text-xs text-cocoa">
                {t}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-mocha">
          {finishedYear(book) ? `Finished in ${finishedYear(book)}` : 'Finished a while ago'}
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-col items-center pt-1">
        <p className="mb-3 font-soft text-lg">How did you like it?</p>
        <StarsInput value={rating} onChange={setRating} />
      </div>
      <div>
        <p className="mb-2 text-xs tracking-wide text-mocha uppercase">A few words</p>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          rows={3}
          placeholder="What did you love? What bugged you? (helps with better tips later)"
          className="w-full resize-none rounded-2xl border border-sand bg-white/80 p-3 text-[16px] outline-none placeholder:text-mocha focus:border-oat"
        />
      </div>
      <div>
        <p className="mb-2 text-xs tracking-wide text-mocha uppercase">Tags (optional)</p>
        <div className="flex flex-wrap gap-2">
          {TAG_SUGGESTIONS.map((t) => {
            const on = tags.includes(t);
            return (
              <Chip key={t} active={on} onClick={() => setTags(on ? tags.filter((x) => x !== t) : [...tags, t])}>
                {t}
              </Chip>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs tracking-wide text-mocha uppercase">Finished in</p>
        <div className="flex flex-wrap gap-2">
          {[now, now - 1, now - 2].map((y) => (
            <Chip key={y} active={year === y} onClick={() => setYear(y)}>
              {y}
            </Chip>
          ))}
          <Chip active={year === undefined || year < now - 2} onClick={() => setYear(undefined)}>
            Earlier
          </Chip>
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="soft" className="flex-1" onClick={() => setEditing(false)}>
          Cancel
        </Button>
        <Button className="flex-[2]" onClick={save}>
          Save
        </Button>
      </div>
    </Card>
  );
}

function SeriesCard({ book }: { book: Book }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(book.series?.name ?? '');
  const [num, setNum] = useState(book.series?.number?.toString() ?? '');
  const [looking, setLooking] = useState(false);

  // Fill in the series automatically the first time the book is opened
  useEffect(() => {
    if ((book.series && book.genres.length) || (book.lookupVersion ?? 0) >= 3) return;
    setLooking(true);
    lookupSeries(book).finally(() => setLooking(false));
  }, [book.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setName(book.series?.name ?? '');
    setNum(book.series?.number?.toString() ?? '');
  }, [book.series?.name, book.series?.number]);

  const save = async () => {
    await updateBook(book.id, {
      series: name.trim()
        ? {
            name: name.trim(),
            number: num ? Number(num) : undefined,
            // keep the link to the full series list if only the number changed
            key: name.trim() === book.series?.name ? book.series?.key : undefined,
          }
        : undefined,
    });
    setEditing(false);
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-xs tracking-wide text-mocha uppercase">Series</p>
        {!editing &&
          (looking ? (
            <span className="text-xs text-mocha">Looking it up…</span>
          ) : (
            <button className="text-sm text-wine" onClick={() => setEditing(true)}>
              {book.series ? 'Edit' : 'Part of a series?'}
            </button>
          ))}
      </div>
      {!editing && !looking && !book.series && book.seriesChecked && (
        <p className="mt-2 text-sm text-cocoa">Looks like a standalone.</p>
      )}
      {!editing && book.series && (
        <div className="mt-2">
          {/* the name gets the full width, so long series names don't break awkwardly */}
          <p className="text-sm leading-snug">
            {book.series.name}
            {book.series.number ? <span className="text-cocoa"> · book {book.series.number}</span> : ''}
          </p>
          <Link
            to={seriesPath(book.series.name)}
            className="mt-2 inline-flex items-center text-sm font-medium text-wine"
          >
            View series <ChevronIcon width={16} height={16} />
          </Link>
        </div>
      )}
      {editing && (
        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Series name"
              className="min-w-0 flex-1 rounded-xl border border-sand bg-white px-3 py-2 text-[16px] outline-none focus:border-oat"
            />
            <input
              value={num}
              onChange={(e) => setNum(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="#"
              inputMode="decimal"
              className="w-16 rounded-xl border border-sand bg-white px-3 py-2 text-center text-[16px] outline-none focus:border-oat"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function AboutCard({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <p className="mb-2 text-xs tracking-wide text-mocha uppercase">About</p>
      <p className={`text-sm leading-relaxed text-ink/90 ${open ? '' : 'line-clamp-5'}`}>{text}</p>
      {text.length > 300 && (
        <button className="mt-2 text-sm text-wine" onClick={() => setOpen(!open)}>
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </Card>
  );
}

/** Little burst of petals when she finishes a book */
function Petals({ onDone }: { onDone: () => void }) {
  const petals = Array.from({ length: 18 }, (_, i) => ({
    x: (Math.random() - 0.5) * 320,
    y: -180 - Math.random() * 220,
    r: Math.random() * 360,
    color: ['#7A2E3A', '#C49A5A', '#E7B9A8', '#8F9E7F'][i % 4],
    delay: Math.random() * 0.15,
  }));
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-1/3 z-50 flex justify-center">
      {petals.map((p, i) => (
        <motion.span
          key={i}
          className="absolute h-3 w-2 rounded-[50%_50%_50%_0]"
          style={{ background: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 260], opacity: [1, 1, 0], rotate: p.r }}
          transition={{ duration: 1.6, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

/** "How well it fits you": worked out on the device from her ratings, reviews and quiz */
function FitForYou({ book }: { book: Book }) {
  const author = book.authors[0] ?? '';
  const matches = useMatches([
    { title: book.title, author, description: book.description, genres: book.genres, series: book.series },
  ]);
  const m = matches.get(profileKey(book.title, author));
  if (!m) return null;
  return (
    <Card>
      <p className="mb-3 text-xs tracking-wide text-mocha uppercase">How well it fits you</p>
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <MatchRing score={m.score} />
          <span className="mt-0.5 text-[0.6rem] whitespace-nowrap text-mocha">{matchLabel(m.score)}</span>
        </div>
        <div className="min-w-0 text-sm">
          <p className="leading-relaxed text-ink/90">{m.why}</p>
          {m.headsUp && (
            <p className="mt-1.5 text-xs leading-relaxed text-cocoa">
              <span className="font-medium">Heads up:</span> {m.headsUp}
            </p>
          )}
          {m.confidence === 'early guess' && (
            <p className="mt-1.5 text-xs text-mocha">
              An early guess: rate the books you've read and this gets sharper.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
