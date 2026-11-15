import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useBooks } from '../lib/hooks';
import { useProfile } from '../lib/profile';
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
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Card className="flex items-center gap-3">
            <Flame lit={s.current > 0} flicker className="h-11 w-9 shrink-0" />
            <div>
              <p className="font-soft text-3xl leading-none font-semibold">{s.current}</p>
              <p className="mt-1 text-xs text-cocoa">day{s.current === 1 ? '' : 's'} in a row</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <span className="text-3xl">📖</span>
            <div>
              <p className="font-soft text-3xl leading-none font-semibold">{weekPages}</p>
              <p className="mt-1 text-xs text-cocoa">pages this week</p>
            </div>
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
          <div className="grid grid-cols-7 gap-y-1.5 text-center">
            {WEEKDAY.map((w) => (
              <span key={w} className="pb-1 text-[11px] text-mocha">
                {w}
              </span>
            ))}
            {cells.map((c, i) => {
              if (!c) return <span key={`x${i}`} />;
              const on = (d: string) => read.has(d) || imported(d);
              const inRun = on(c);
              const future = c > today;
              // a streak is one long pill: rounded where it starts and ends (and at the week's edges)
              const start = inRun && (!on(addDays(c, -1)) || i % 7 === 0 || c.endsWith('-01'));
              const end = inRun && (!on(addDays(c, 1)) || i % 7 === 6 || c === cells[cells.length - 1]);
              const isToday = c === today;
              return (
                <button
                  key={c}
                  disabled={future}
                  onClick={() => setSheet(c)}
                  className="relative flex h-10 items-center justify-center disabled:opacity-30"
                >
                  {inRun && (
                    <span
                      className={`absolute inset-y-1 bg-[#f4bf78] ${start ? 'left-1 rounded-l-full' : '-left-px'} ${end ? 'right-1 rounded-r-full' : '-right-px'}`}
                    />
                  )}
                  <span
                    className={`relative grid h-8 w-8 place-items-center rounded-full text-sm ${
                      inRun
                        ? `font-semibold ${isToday ? 'bg-[#e08a3f] text-white shadow-sm' : 'text-ink'}`
                        : isToday
                          ? 'border-2 border-dashed border-[#e08a3f]/70 font-semibold text-[#c2702c]'
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

        <Button className="w-full" variant={s.readToday ? 'soft' : 'primary'} onClick={() => setSheet(today)}>
          {s.readToday ? 'Change today' : s.atRisk ? 'I read today · keep the flame going' : 'I read today'}
        </Button>

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
                    {d.note && <span className="mt-0.5 block text-xs text-cocoa italic">“{d.note}”</span>}
                  </span>
                  {(pages.get(d.date) ?? 0) > 0 && <span className="text-xs text-cocoa">+{pages.get(d.date)}</span>}
                </button>
              ))}
            </Card>
          </section>
        )}
      </div>
      <AnimatePresence>
        {sheet && <LogSheet date={sheet} books={books} log={read.get(sheet)} onClose={() => setSheet(null)} />}
      </AnimatePresence>
    </div>
  );
}
