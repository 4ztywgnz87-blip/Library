import { useKeyboardLift } from '../lib/keyboard';
import { useMemo, useState } from 'react';
import { updateBook } from '../lib/library';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import type { Book } from '../types';
import type { DayLog } from '../db';
import { Cover } from './Cover';
import { Button } from './ui';
import { ChevronIcon } from './Icons';
import {
  addDays,
  dayKey,
  logReading,
  pageBounds,
  pagesPerDay,
  parseDay,
  streakOf,
  unlogReading,
  useDays,
} from '../lib/streak';
import { useProfile } from '../lib/profile';

/** A little flame. With `flicker` it breathes gently from its base (centred, no swaying) */
export function Flame({
  lit = true,
  flicker = false,
  className = 'h-10 w-10',
}: {
  lit?: boolean;
  flicker?: boolean;
  className?: string;
}) {
  const move = flicker && lit;
  return (
    <svg viewBox="0 0 40 48" className={className} aria-hidden>
      <motion.path
        d="M20 2c3 8 14 13 14 27a14 14 0 0 1-28 0c0-7 4-11 6-14 1 4 3 6 5 6-1-7 0-13 3-19z"
        fill={lit ? '#f0a64b' : '#e3d6c4'}
        style={{ transformBox: 'view-box', transformOrigin: '20px 43px' }}
        animate={move ? { scaleY: [1, 1.05, 0.98, 1], scaleX: [1, 0.97, 1.01, 1] } : undefined}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M20 22c2 5 7 7 7 14a7 7 0 0 1-14 0c0-4 2-6 3-7 .5 2 2 3 3 3-.5-4 0-7 1-10z"
        fill={lit ? '#f6d27a' : '#f1e8da'}
        style={{ transformBox: 'view-box', transformOrigin: '20px 43px' }}
        // moves with the big flame (same rhythm), a touch livelier but never past its edge
        animate={move ? { scaleY: [1, 1.04, 0.97, 1], scaleX: [1, 0.98, 1, 1] } : undefined}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
}

const WEEKDAY = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** This week, Monday to Sunday */
function weekOf(today: string) {
  const dow = (parseDay(today).getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - dow));
}

function streakLine(s: ReturnType<typeof streakOf>, reading?: Book) {
  if (s.readToday)
    return s.current === 1 ? 'Day one! The start of something lovely' : 'You read today, the flame is happy';
  if (s.atRisk)
    return reading ? `A few pages of ${reading.title} keeps it going` : 'A few pages tonight keeps it going';
  return 'Read a little today to light the flame';
}

/** The streak on the home page: the flame, this week, and "I read today" */
export function StreakCard({ books }: { books: Book[] }) {
  const days = useDays();
  const profile = useProfile();
  const [sheet, setSheet] = useState<string | null>(null);
  if (!days) return null;
  const today = dayKey();
  const s = streakOf(days, profile.streakImport, today);
  const read = new Set(days.map((d) => d.date));
  const todayLog = days.find((d) => d.date === today);
  const reading = books.find((b) => b.status === 'reading');

  return (
    <section className="rounded-[var(--radius-card)] bg-white/70 p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3">
        <Link to="/streak" className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative shrink-0">
            <Flame lit={s.current > 0} flicker className="h-12 w-10" />
          </div>
          <div className="min-w-0">
            <p className="font-soft text-2xl leading-none font-semibold text-ink">
              <motion.span key={s.current} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="inline-block">
                {s.current}
              </motion.span>{' '}
              <span className="text-base font-medium text-cocoa">day{s.current === 1 ? '' : 's'} in a row</span>
            </p>
            <p className="mt-1 truncate text-xs text-cocoa">{streakLine(s, reading)}</p>
          </div>
          <ChevronIcon className="shrink-0 text-mocha" width={18} height={18} />
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between gap-1">
        {weekOf(today).map((d, i) => {
          const imp = profile.streakImport;
          const done = read.has(d) || (!!imp && d <= imp.until && d > addDays(imp.until, -imp.count));
          const future = d > today;
          return (
            <button
              key={d}
              disabled={future}
              onClick={() => setSheet(d)}
              className="flex flex-1 flex-col items-center gap-1 disabled:opacity-40"
              aria-label={`${parseDay(d).toDateString()}${done ? ', read' : ''}`}
            >
              <span className={`text-[11px] ${d === today ? 'font-semibold text-wine' : 'text-mocha'}`}>
                {WEEKDAY[i]}
              </span>
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-sm transition-colors ${
                  done ? 'bg-[#f6d27a]/80' : d === today ? 'border-2 border-dashed border-[#e08a3f]/70' : 'bg-linen'
                }`}
              >
                {done ? <Flame className="h-5 w-4" lit /> : ''}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {todayLog ? (
          <button
            onClick={() => setSheet(today)}
            className="w-full rounded-full bg-linen px-4 py-2.5 text-sm text-cocoa transition-transform active:scale-[0.98]"
          >
            ✓ Read today: {todayLog.entries.map((e) => (e.page ? `${e.title}, p. ${e.page}` : e.title)).join(' · ')}
            {(pagesPerDay(days).get(today) ?? 0) > 0 && (
              <span className="font-medium text-wine"> · that's {pagesPerDay(days).get(today)} pages ✨</span>
            )}
          </button>
        ) : (
          <Button className="w-full" onClick={() => setSheet(today)}>
            I read today
          </Button>
        )}
      </div>

      <AnimatePresence>
        {sheet && (
          <LogSheet
            date={sheet}
            books={books}
            log={days.find((d) => d.date === sheet)}
            onClose={() => setSheet(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

export function dayLabel(date: string) {
  const today = dayKey();
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  return parseDay(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** "I read today": which book, up to which page, finished?, and a little note */
export function LogSheet({
  date,
  books,
  log,
  onClose,
}: {
  date: string;
  books: Book[];
  log?: DayLog;
  onClose: () => void;
}) {
  const lift = useKeyboardLift();
  const navigate = useNavigate();
  const days = useDays();
  // the books she's reading first, then the ones waiting on her shelf, then the ones she read
  const options = useMemo(() => {
    const rank = (b: Book) => (b.status === 'reading' ? 0 : b.status === 'owned' ? 1 : b.status === 'read' ? 2 : 3);
    return books
      .filter((b) => b.status !== 'wishlist')
      .sort((a, b) => rank(a) - rank(b) || (b.startedAt ?? 0) - (a.startedAt ?? 0) || a.title.localeCompare(b.title));
  }, [books]);
  const logged = new Map((log?.entries ?? []).map((e) => [e.bookId, e]));
  const [bookId, setBookId] = useState<string | undefined>(log?.entries[0]?.bookId ?? options[0]?.id);
  const book = options.find((b) => b.id === bookId);
  const [picking, setPicking] = useState(!book);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(() => {
    const e = bookId ? logged.get(bookId) : undefined;
    return e?.page && !e.finished ? String(e.page) : '';
  });
  const [finished, setFinished] = useState(() => !!(bookId && logged.get(bookId)?.finished));
  const [note, setNote] = useState(log?.note ?? '');
  const [saving, setSaving] = useState(false);

  const pick = (id: string) => {
    setBookId(id);
    const e = logged.get(id);
    setPage(e?.page && !e.finished ? String(e.page) : '');
    setFinished(!!e?.finished);
    setPicking(false);
    setQuery('');
  };

  const bounds = book && days ? pageBounds(days, book.id, date, book.pageCount) : undefined;
  const n = Number(page);
  const tooLow = !!(page && bounds && n < bounds.min);
  const tooHigh = !!(page && bounds && n > bounds.max);
  const valid = !page || (n > 0 && !tooLow && !tooHigh);
  const since = page && bounds && bounds.min && n > bounds.min ? n - bounds.min : 0;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((b) => `${b.title} ${b.authors.join(' ')}`.toLowerCase().includes(q));
  }, [options, query]);

  const save = async () => {
    if (!book || !valid) return;
    setSaving(true);
    await logReading(date, book, { page: page ? Math.round(n) : undefined, finished, note });
    onClose();
    // finished it: straight to her stars and review
    if (finished && !logged.get(book.id)?.finished)
      setTimeout(() => navigate(`/book/${book.id}?rate=1&done=1`, { replace: false }), 250);
  };

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
        className="pb-safe fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88dvh] max-w-md overflow-y-auto rounded-t-[1.75rem] bg-cream px-5 pt-5 pb-6 shadow-2xl md:top-[10%] md:bottom-auto md:rounded-[1.75rem]"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="flex items-center gap-3">
          <Flame className="h-9 w-8" />
          <div>
            <h2 className="text-2xl leading-tight font-semibold">{dayLabel(date)}</h2>
            <p className="text-sm text-cocoa">What did you read?</p>
          </div>
        </div>

        {options.length === 0 ? (
          <p className="mt-5 text-sm text-cocoa">Add a book to your library first.</p>
        ) : picking ? (
          <div className="mt-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your books"
              className="w-full rounded-2xl border border-sand bg-white/80 px-4 py-2.5 text-base"
            />
            <div className="mt-3 grid max-h-[46dvh] grid-cols-4 gap-2.5 overflow-y-auto p-1.5">
              {shown.map((b) => (
                <button
                  key={b.id}
                  onClick={() => pick(b.id)}
                  aria-label={b.title}
                  className={`relative rounded-md transition-transform active:scale-95 ${
                    b.id === bookId ? 'ring-2 ring-wine ring-offset-2 ring-offset-cream' : ''
                  }`}
                >
                  <Cover book={b} />
                  {b.status === 'reading' && (
                    <span className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-wine text-[10px] text-cream">
                      📖
                    </span>
                  )}
                </button>
              ))}
              {shown.length === 0 && <p className="col-span-4 py-4 text-center text-sm text-mocha">No book found</p>}
            </div>
          </div>
        ) : (
          book && (
            <>
              {/* the book: cover with the title next to it */}
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/70 p-2.5">
                <Cover book={book} className="w-12 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 leading-snug font-semibold">{book.title}</p>
                  <p className="truncate text-xs text-cocoa">{book.authors[0]}</p>
                </div>
                <button
                  onClick={() => setPicking(true)}
                  className="shrink-0 rounded-full bg-linen px-3 py-1.5 text-xs text-cocoa"
                >
                  Other book
                </button>
              </div>

              {!finished && (
                <label className="mt-4 block text-xs text-cocoa">
                  Up to page <span className="text-mocha">(optional)</span>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      inputMode="numeric"
                      value={page}
                      onChange={(e) => setPage(e.target.value.replace(/\D/g, ''))}
                      placeholder={bounds?.min ? `last time: ${bounds.min}` : 'e.g. 120'}
                      className={`w-full rounded-2xl border bg-white/80 px-3 py-2.5 text-base text-ink ${
                        valid ? 'border-sand' : 'border-wine'
                      }`}
                    />
                    <span className="shrink-0 text-sm text-mocha">
                      of <PagesEditor book={book} />
                    </span>
                  </div>
                </label>
              )}
              {!finished && tooLow && bounds?.minDate && (
                <p className="mt-2 text-xs text-wine">
                  You were already on page {bounds.min} {dayLabel(bounds.minDate).toLowerCase()}.
                </p>
              )}
              {!finished && tooHigh && (
                <p className="mt-2 text-xs text-wine">
                  {bounds?.maxDate
                    ? `On ${dayLabel(bounds.maxDate).toLowerCase()} you were only on page ${bounds.max}.`
                    : `The book has ${bounds?.max} pages.`}
                </p>
              )}
              {!finished && valid && since > 0 && (
                <p className="mt-2 text-xs text-cocoa">That's {since} pages since last time ✨</p>
              )}

              <button
                onClick={() => setFinished(!finished)}
                className={`mt-4 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition-colors ${
                  finished ? 'bg-blush text-wine' : 'bg-white/70 text-cocoa'
                }`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-xs ${
                    finished ? 'border-wine bg-wine text-cream' : 'border-oat'
                  }`}
                >
                  {finished ? '✓' : ''}
                </span>
                <span className="flex-1 font-medium">I finished it! 🎉</span>
                {finished && <span className="text-xs">next: your stars</span>}
              </button>

              <label className="mt-4 block text-xs text-cocoa">
                A little note <span className="text-mocha">(optional)</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  maxLength={280}
                  placeholder="Chapter 30… I'm not okay 😭"
                  className="mt-1 w-full resize-none rounded-2xl border border-sand bg-white/80 px-3 py-2.5 text-base text-ink"
                />
              </label>
            </>
          )
        )}

        <div className="mt-5 flex gap-3">
          {log && !picking ? (
            <Button
              variant="soft"
              className="flex-1"
              onClick={async () => {
                await unlogReading(date, bookId && logged.has(bookId) ? bookId : undefined);
                onClose();
              }}
            >
              {bookId && logged.has(bookId) && log.entries.length > 1 ? 'Remove this book' : 'I didn’t read'}
            </Button>
          ) : (
            <Button variant="soft" className="flex-1" onClick={() => (picking && book ? setPicking(false) : onClose())}>
              {picking && book ? 'Back' : 'Cancel'}
            </Button>
          )}
          {!picking && (
            <Button className="flex-1" disabled={!book || !valid || saving} onClick={save}>
              {finished && !logged.get(bookId ?? '')?.finished
                ? 'Log & rate it'
                : logged.has(bookId ?? '')
                  ? 'Save'
                  : 'Log it'}
            </Button>
          )}
        </div>
      </motion.div>
    </>,
    document.body,
  );
}

/** Progress through a book, from the page she logged */
export function PageProgress({ book, className = '' }: { book: Book; className?: string }) {
  if (!book.currentPage) return null;
  const pct = book.pageCount ? Math.min(100, Math.round((book.currentPage / book.pageCount) * 100)) : undefined;
  return (
    <div className={className}>
      {pct !== undefined && (
        <div className="h-1.5 overflow-hidden rounded-full bg-linen">
          <motion.div
            className="h-full rounded-full bg-wine/70"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      )}
      <p className="mt-1 text-xs text-mocha">
        Page {book.currentPage}
        {book.pageCount ? ` of ${book.pageCount} · ${pct}%` : ''}
      </p>
    </div>
  );
}

/**
 * A fabric bookmark ribbon hanging from the top of the cover: the further she is in the book,
 * the further it hangs down
 */
export function BookmarkRibbon({ book }: { book: Book }) {
  if (book.status !== 'reading') return null;
  const pct = book.currentPage && book.pageCount ? Math.min(1, book.currentPage / book.pageCount) : 0;
  return (
    <motion.div
      className="pointer-events-none absolute top-0 right-[14%] z-10 w-[13%] origin-top drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]"
      initial={{ height: '0%' }}
      animate={{ height: `${8 + pct * 84}%`, rotate: [0, 1.2, -0.8, 0] }}
      transition={{
        height: { type: 'spring', stiffness: 60, damping: 14, delay: 0.3 },
        rotate: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
      }}
      aria-label={`Page ${book.currentPage} of ${book.pageCount}`}
    >
      <div
        className="h-full w-full bg-gradient-to-r from-[#8e3445] via-[#a8455a] to-[#7a2e3a]"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 7px), 0 100%)' }}
      >
        {/* a little stitched edge */}
        <div className="mx-auto h-full w-[60%] border-x border-dashed border-white/25" />
      </div>
    </motion.div>
  );
}

/** "352 pages ✎": the page count, which she can correct (editions differ; she knows her own copy) */
export function PagesEditor({ book, className = '' }: { book: Book; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(book.pageCount ?? ''));
  const save = async () => {
    const n = Math.round(Number(value));
    if (n > 0 && n < 5000 && n !== book.pageCount) await updateBook(book.id, { pageCount: n });
    setEditing(false);
  };
  if (editing)
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <input
          autoFocus
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && void save()}
          onBlur={() => void save()}
          className="w-16 rounded-lg border border-sand bg-white px-2 py-0.5 text-center text-sm text-ink"
        />
        <span>pages</span>
      </span>
    );
  return (
    <button
      type="button"
      onClick={() => {
        setValue(String(book.pageCount ?? ''));
        setEditing(true);
      }}
      className={`inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 ${className}`}
      aria-label="Change the number of pages"
    >
      {book.pageCount ? `${book.pageCount} pages` : 'Add page count'} <span aria-hidden>✎</span>
    </button>
  );
}
