import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import type { Book } from '../types';
import type { DayLog } from '../db';
import { Cover } from './Cover';
import { Button } from './ui';
import { ChevronIcon } from './Icons';
import { addDays, dayKey, logReading, parseDay, streakOf, unlogReading, useDays } from '../lib/streak';
import { useProfile } from '../lib/profile';

/** A little flame; it dances while the streak is alive and sleeps when it isn't */
export function Flame({ lit = true, className = 'h-10 w-10' }: { lit?: boolean; className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 40 48"
      className={className}
      aria-hidden
      style={{ transformBox: 'view-box', transformOrigin: '20px 46px' }}
      animate={lit ? { scaleY: [1, 1.06, 0.97, 1], rotate: [0, -2, 2, 0] } : undefined}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <path
        d="M20 2c3 8 14 13 14 27a14 14 0 0 1-28 0c0-7 4-11 6-14 1 4 3 6 5 6-1-7 0-13 3-19z"
        fill={lit ? '#f0a64b' : '#e3d6c4'}
      />
      <path
        d="M20 22c2 5 7 7 7 14a7 7 0 0 1-14 0c0-4 2-6 3-7 .5 2 2 3 3 3-.5-4 0-7 1-10z"
        fill={lit ? '#f6d27a' : '#f1e8da'}
      />
    </motion.svg>
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
            <Flame lit={s.current > 0} className="h-12 w-10" />
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
                  done ? 'bg-[#f6d27a]/80' : d === today ? 'border-2 border-dashed border-wine/40' : 'bg-linen'
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

/** "I read today": which book, and up to which page */
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
  // the books she's reading first, then the ones waiting on her shelf
  const options = useMemo(() => {
    const rank = (b: Book) => (b.status === 'reading' ? 0 : b.status === 'owned' ? 1 : b.status === 'read' ? 2 : 3);
    return books
      .filter((b) => b.status !== 'wishlist')
      .sort((a, b) => rank(a) - rank(b) || (b.startedAt ?? 0) - (a.startedAt ?? 0) || a.title.localeCompare(b.title));
  }, [books]);
  const quick = options.filter((b) => b.status === 'reading');
  const logged = new Map((log?.entries ?? []).map((e) => [e.bookId, e]));
  const [bookId, setBookId] = useState<string | undefined>(log?.entries[0]?.bookId ?? quick[0]?.id ?? options[0]?.id);
  const book = options.find((b) => b.id === bookId);
  const [page, setPage] = useState<string>(() => {
    const e = bookId ? logged.get(bookId) : undefined;
    return e?.page ? String(e.page) : '';
  });
  const [saving, setSaving] = useState(false);

  const pick = (id: string) => {
    setBookId(id);
    setPage(logged.get(id)?.page ? String(logged.get(id)!.page) : '');
  };
  const n = Number(page);
  const valid = !page || (Number.isFinite(n) && n > 0 && n < 5000);
  const finishing = !!(book?.pageCount && n >= book.pageCount);

  const save = async () => {
    if (!book || !valid) return;
    setSaving(true);
    await logReading(date, book, page ? Math.round(n) : undefined);
    onClose();
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
        className="pb-safe fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85dvh] max-w-md overflow-y-auto rounded-t-[1.75rem] bg-cream px-5 pt-5 pb-6 shadow-2xl md:top-1/4 md:bottom-auto md:rounded-[1.75rem]"
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
        ) : (
          <>
            {quick.length > 0 && (
              <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
                {quick.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => pick(b.id)}
                    className={`w-20 shrink-0 rounded-2xl p-1.5 text-left transition-all ${
                      bookId === b.id ? 'bg-blush ring-2 ring-wine/50' : 'bg-white/60'
                    }`}
                  >
                    <Cover book={b} className="w-full" />
                    <p className="mt-1 line-clamp-2 text-[11px] leading-tight text-ink">{b.title}</p>
                  </button>
                ))}
              </div>
            )}
            <label className="mt-4 block text-xs text-cocoa">
              {quick.length ? 'Or another book' : 'Book'}
              <select
                value={bookId}
                onChange={(e) => pick(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-sand bg-white/80 px-3 py-2.5 text-sm text-ink"
              >
                {options.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                    {b.status === 'read' ? ' (read)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-xs text-cocoa">
              Up to page <span className="text-mocha">(optional)</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  inputMode="numeric"
                  value={page}
                  onChange={(e) => setPage(e.target.value.replace(/\D/g, ''))}
                  placeholder={book?.currentPage ? `last time: ${book.currentPage}` : 'e.g. 120'}
                  className="w-full rounded-2xl border border-sand bg-white/80 px-3 py-2.5 text-base text-ink"
                />
                {book?.pageCount && <span className="shrink-0 text-sm text-mocha">of {book.pageCount}</span>}
              </div>
            </label>
            {book?.currentPage && n > book.currentPage && (
              <p className="mt-2 text-xs text-cocoa">That's {n - book.currentPage} pages since last time ✨</p>
            )}
            {finishing && <p className="mt-2 text-xs text-wine">The last page! Don't forget to rate it afterwards.</p>}
          </>
        )}

        <div className="mt-6 flex gap-3">
          {log ? (
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
            <Button variant="soft" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button className="flex-1" disabled={!book || !valid || saving} onClick={save}>
            {logged.has(bookId ?? '') ? 'Save' : 'Log it'}
          </Button>
        </div>
        {finishing && book && (
          <Link
            to={`/book/${book.id}`}
            onClick={() => void save()}
            className="mt-3 block text-center text-sm text-wine underline"
          >
            Log it and rate the book
          </Link>
        )}
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
