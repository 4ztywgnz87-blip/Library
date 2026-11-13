import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useBooks } from '../lib/hooks';
import type { Book } from '../types';
import { Card, Chip, PageHeader } from '../components/ui';
import { EmptyState } from '../components/SleepyCat';
import { formatRating } from '../components/Stars';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <Card className="text-center">
      <div className="font-soft text-3xl font-semibold text-ink">{value}</div>
      <div className="mt-1 text-xs leading-tight text-cocoa">{label}</div>
    </Card>
  );
}

/** Books finished per month: one series, so one colour and no legend */
function MonthChart({ counts }: { counts: number[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...counts);
  return (
    <div>
      <div className="relative flex h-40 items-end gap-[2px] border-b border-sand">
        {counts.map((n, i) => (
          <button
            key={i}
            className="group relative flex h-full flex-1 items-end justify-center"
            onClick={() => setActive(active === i ? null : i)}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            aria-label={`${MONTH_NAMES[i]}: ${n} book${n === 1 ? '' : 's'}`}
          >
            <motion.div
              className="w-full max-w-7 rounded-t bg-wine"
              style={{ opacity: active === null || active === i ? 1 : 0.45 }}
              initial={{ height: 0 }}
              animate={{ height: n ? `${(n / max) * 100}%` : 0 }}
              transition={{ delay: i * 0.03, type: 'spring', stiffness: 160, damping: 20 }}
            />
            {active === i && (
              <span className="absolute -top-8 z-10 rounded-lg bg-ink px-2 py-1 text-xs whitespace-nowrap text-cream">
                {MONTH_NAMES[i]} · {n} book{n === 1 ? '' : 's'}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px]">
        {MONTHS.map((m, i) => (
          <span key={i} className="flex-1 text-center text-[0.65rem] text-mocha">
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Horizontal bars with the value written next to each bar */
function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-24 shrink-0 truncate text-ink">{r.label}</span>
          <div className="h-3 flex-1">
            <motion.div
              className="h-full rounded-r bg-wine"
              initial={{ width: 0 }}
              animate={{ width: `${(r.value / max) * 100}%` }}
              transition={{ delay: i * 0.05 }}
            />
          </div>
          <span className="w-6 text-right text-cocoa tabular-nums">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function countBy(list: Book[], key: (b: Book) => string[]) {
  const m = new Map<string, number>();
  for (const b of list) for (const k of key(b)) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export default function Stats() {
  const books = useBooks();
  const read = useMemo(() => (books ?? []).filter((b) => b.status === 'read'), [books]);
  const years = useMemo(() => {
    const ys = new Set(read.filter((b) => b.finishedAt).map((b) => new Date(b.finishedAt!).getFullYear()));
    ys.add(new Date().getFullYear());
    return [...ys].sort((a, b) => b - a);
  }, [read]);
  const [year, setYear] = useState<number | 'all'>(new Date().getFullYear());

  if (!books) return null;

  const inYear = year === 'all' ? read : read.filter((b) => b.finishedAt && new Date(b.finishedAt).getFullYear() === year);
  const months = Array.from({ length: 12 }, (_, m) =>
    inYear.filter((b) => b.finishedAt && new Date(b.finishedAt).getMonth() === m).length,
  );
  const pages = inYear.reduce((s, b) => s + (b.pageCount ?? 0), 0);
  const rated = inYear.filter((b) => b.rating !== undefined);
  const avg = rated.length ? rated.reduce((s, b) => s + b.rating!, 0) / rated.length : undefined;
  const genres = countBy(inYear, (b) => b.genres).slice(0, 6);
  const authors = countBy(inYear, (b) => b.authors.slice(0, 1)).slice(0, 5);
  const favourite = [...rated].sort((a, b) => b.rating! - a.rating!)[0];
  const ratingRows = [5, 4, 3, 2, 1].map((s) => ({
    label: '★'.repeat(s),
    value: rated.filter((b) => Math.max(1, Math.round(b.rating!)) === s).length,
  }));

  return (
    <div>
      <PageHeader back title="My reading" />
      <div className="mx-auto max-w-3xl space-y-5 px-4 pb-10">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {years.map((y) => (
            <Chip key={y} active={year === y} onClick={() => setYear(y)}>
              {y}
            </Chip>
          ))}
          <Chip active={year === 'all'} onClick={() => setYear('all')}>
            All time
          </Chip>
        </div>

        {inYear.length === 0 ? (
          <EmptyState title="Nothing finished yet">Mark a book as read and your year starts filling up here.</EmptyState>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Tile value={inYear.length} label={inYear.length === 1 ? 'book read' : 'books read'} />
              <Tile value={pages ? pages.toLocaleString('en-GB') : '–'} label="pages" />
              <Tile value={avg !== undefined ? `${formatRating(Math.round(avg * 4) / 4)}★` : '–'} label="average rating" />
            </div>

            {year !== 'all' && (
              <Card>
                <h2 className="mb-4 text-lg">Books finished per month</h2>
                <MonthChart counts={months} />
              </Card>
            )}

            {genres.length > 0 && (
              <Card>
                <h2 className="mb-4 text-lg">Favourite genres</h2>
                <Bars rows={genres} />
              </Card>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <Card>
                <h2 className="mb-4 text-lg">Most read authors</h2>
                <Bars rows={authors} />
              </Card>
              {rated.length > 0 && (
                <Card>
                  <h2 className="mb-4 text-lg">Your ratings</h2>
                  <Bars rows={ratingRows} />
                </Card>
              )}
            </div>

            {favourite && (
              <Card className="bg-blush/50 text-center">
                <p className="text-xs tracking-wide text-wine uppercase">Highest rated {year === 'all' ? 'ever' : `in ${year}`}</p>
                <p className="mt-1 font-soft text-2xl font-semibold">{favourite.title}</p>
                <p className="text-sm text-cocoa">
                  {favourite.authors[0]} · {formatRating(favourite.rating!)}★
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
