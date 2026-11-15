import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useBooks } from '../lib/hooks';
import { useProfile, updateProfile } from '../lib/profile';
import { addDays, dayKey, pagesPerDay, parseDay, streakOf, useDays } from '../lib/streak';
import { Flame, LogSheet, dayLabel } from '../components/Streak';
import { Button, Card, PageHeader } from '../components/ui';
import { BackIcon } from '../components/Icons';

const WEEKDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function StreakPage() {
  const books = useBooks();
  const days = useDays();
  const profile = useProfile();
  const [month, setMonth] = useState(() => dayKey().slice(0, 7));
  const [sheet, setSheet] = useState<string | null>(null);
  if (!books || !days) return null;

  const today = dayKey();
  const s = streakOf(days, profile.streakImport, today);
  const read = new Map(days.map((d) => [d.date, d]));
  const pages = pagesPerDay(days);
  const imp = profile.streakImport;
  const imported = (d: string) => !!imp && d <= imp.until && d > addDays(imp.until, -imp.count) && !read.has(d);

  // the month grid, Monday first
  const first = parseDay(`${month}-01`);
  const lead = (first.getDay() + 6) % 7;
  const inMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = [
    ...Array(lead).fill(null),
    ...Array.from({ length: inMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  ];
  const shift = (n: number) => {
    const d = new Date(first.getFullYear(), first.getMonth() + n, 1);
    setMonth(dayKey(d).slice(0, 7));
  };
  const monthDays = cells.filter((c) => c && read.has(c)).length;
  const monthPages = cells.reduce((t, c) => t + (c ? (pages.get(c) ?? 0) : 0), 0);
  const weekPages = Array.from({ length: 7 }, (_, i) => pages.get(addDays(today, -i)) ?? 0).reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader title="Reading streak" back />
      <div className="mx-auto max-w-md space-y-5 px-4 pb-10">
        <section className="flex flex-col items-center pt-2 text-center">
          <Flame lit={s.current > 0} className="h-24 w-20" />
          <motion.p
            key={s.current}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-soft mt-2 text-6xl font-semibold text-ink"
          >
            {s.current}
          </motion.p>
          <p className="text-cocoa">day{s.current === 1 ? '' : 's'} in a row</p>
          {!s.readToday && (
            <Button className="mt-4" onClick={() => setSheet(today)}>
              {s.atRisk ? 'Keep the flame going' : 'I read today'}
            </Button>
          )}
        </section>

        <div className="grid grid-cols-3 gap-3 text-center">
          <Card className="px-2">
            <p className="font-soft text-2xl font-semibold">{s.longest}</p>
            <p className="text-xs text-cocoa">longest streak</p>
          </Card>
          <Card className="px-2">
            <p className="font-soft text-2xl font-semibold">{s.totalDays}</p>
            <p className="text-xs text-cocoa">reading days</p>
          </Card>
          <Card className="px-2">
            <p className="font-soft text-2xl font-semibold">{weekPages}</p>
            <p className="text-xs text-cocoa">pages this week</p>
          </Card>
        </div>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => shift(-1)}
              className="rounded-full p-2 text-cocoa hover:bg-linen"
              aria-label="Previous month"
            >
              <BackIcon width={18} height={18} />
            </button>
            <div className="text-center">
              <p className="font-soft text-lg font-semibold">
                {first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xs text-mocha">
                {monthDays} day{monthDays === 1 ? '' : 's'}
                {monthPages ? ` · ${monthPages} pages` : ''}
              </p>
            </div>
            <button
              onClick={() => shift(1)}
              disabled={month >= today.slice(0, 7)}
              className="rounded-full p-2 text-cocoa hover:bg-linen disabled:opacity-30"
              aria-label="Next month"
            >
              <BackIcon width={18} height={18} className="rotate-180" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY.map((w) => (
              <span key={w} className="pb-1 text-[11px] text-mocha">
                {w}
              </span>
            ))}
            {cells.map((c, i) => {
              if (!c) return <span key={`x${i}`} />;
              const done = read.has(c);
              const was = imported(c);
              const future = c > today;
              // days in a row get joined together, like a little ribbon
              const joinL = (done || was) && (read.has(addDays(c, -1)) || imported(addDays(c, -1))) && i % 7 !== 0;
              const joinR = (done || was) && (read.has(addDays(c, 1)) || imported(addDays(c, 1))) && i % 7 !== 6;
              return (
                <button
                  key={c}
                  disabled={future}
                  onClick={() => setSheet(c)}
                  className="relative grid aspect-square place-items-center disabled:opacity-30"
                >
                  {(joinL || joinR) && (
                    <span
                      className={`absolute inset-y-[18%] bg-[#fbe7b5] ${joinL ? 'left-0' : 'left-1/2'} ${joinR ? 'right-0' : 'right-1/2'}`}
                    />
                  )}
                  <span
                    className={`relative grid h-[82%] w-[82%] place-items-center rounded-full text-sm ${
                      done
                        ? 'bg-[#f6d27a] font-semibold text-ink'
                        : was
                          ? 'bg-[#fbe7b5] text-ink'
                          : c === today
                            ? 'border-2 border-dashed border-wine/40 text-wine'
                            : 'text-cocoa'
                    }`}
                  >
                    {Number(c.slice(8))}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs text-mocha">Tap a day to fill it in or change it</p>
        </Card>

        {days.length > 0 && (
          <section>
            <h2 className="mb-2 text-xl">Lately</h2>
            <Card className="divide-y divide-linen py-1">
              {days.slice(0, 10).map((d) => (
                <button
                  key={d.date}
                  onClick={() => setSheet(d.date)}
                  className="flex w-full items-baseline gap-3 py-2.5 text-left"
                >
                  <span className="w-24 shrink-0 text-xs text-mocha">{dayLabel(d.date)}</span>
                  <span className="min-w-0 flex-1 text-sm">
                    {d.entries.map((e) => (
                      <span key={e.bookId} className="block truncate">
                        {e.title}
                        {e.page ? <span className="text-mocha"> · p. {e.page}</span> : null}
                        {e.finished ? ' 🎉' : ''}
                      </span>
                    ))}
                  </span>
                  {(pages.get(d.date) ?? 0) > 0 && <span className="text-xs text-cocoa">+{pages.get(d.date)}</span>}
                </button>
              ))}
            </Card>
          </section>
        )}

        <ImportStreak />
      </div>
      <AnimatePresence>
        {sheet && <LogSheet date={sheet} books={books} log={read.get(sheet)} onClose={() => setSheet(null)} />}
      </AnimatePresence>
    </div>
  );
}

/** Bring over the streak she already had in another app, once, so she doesn't start from zero */
function ImportStreak() {
  const profile = useProfile();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState('');
  const [when, setWhen] = useState<'today' | 'yesterday'>('yesterday');
  if (profile.streakImport && !open) {
    return (
      <p className="text-center text-xs text-mocha">
        Includes {profile.streakImport.count} days brought over from before Snug ·{' '}
        <button className="underline" onClick={() => setOpen(true)}>
          change
        </button>
      </p>
    );
  }
  if (!open)
    return (
      <button className="mx-auto block text-center text-xs text-mocha underline" onClick={() => setOpen(true)}>
        Had a streak in another app? Bring it over
      </button>
    );
  const n = Number(count);
  return (
    <Card>
      <p className="font-soft text-lg font-semibold">Bring over your streak</p>
      <p className="mt-1 text-sm text-cocoa">So you don't have to start from zero. Your days in Snug add on to it.</p>
      <div className="mt-3 flex items-center gap-2">
        <input
          inputMode="numeric"
          value={count}
          onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))}
          placeholder="e.g. 112"
          className="w-28 rounded-2xl border border-sand bg-white/80 px-3 py-2.5 text-base"
        />
        <span className="text-sm text-cocoa">days, the last one</span>
      </div>
      <div className="mt-2 flex gap-2">
        {(['yesterday', 'today'] as const).map((w) => (
          <button
            key={w}
            onClick={() => setWhen(w)}
            className={`rounded-full px-3 py-1.5 text-sm ${when === w ? 'bg-wine text-cream' : 'bg-linen text-cocoa'}`}
          >
            {w}
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-3">
        <Button variant="soft" className="flex-1" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        {profile.streakImport && (
          <Button
            variant="soft"
            className="flex-1"
            onClick={async () => {
              await updateProfile({ streakImport: undefined });
              setOpen(false);
            }}
          >
            Remove
          </Button>
        )}
        <Button
          className="flex-1"
          disabled={!n || n > 20000}
          onClick={async () => {
            const until = when === 'today' ? dayKey() : addDays(dayKey(), -1);
            await updateProfile({ streakImport: { count: n, until } });
            setOpen(false);
          }}
        >
          Save
        </Button>
      </div>
    </Card>
  );
}
