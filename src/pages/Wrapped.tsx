import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useBooks } from '../lib/hooks';
import { useProfile } from '../lib/profile';
import { dayKey, streakOf, useDays } from '../lib/streak';
import { Cover } from '../components/Cover';
import { CloseIcon } from '../components/Icons';
import { formatRating } from '../components/Stars';
import type { Book } from '../types';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Which year to look back on: last year during January, otherwise this one */
export function wrappedYear(now = new Date()) {
  return now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
}

/** From December until the end of January, the year is worth wrapping up */
export function wrappedSeason(now = new Date()) {
  return now.getMonth() === 11 || now.getMonth() === 0;
}

function top<T>(items: T[], key: (t: T) => string | undefined) {
  const m = new Map<string, { n: number; items: T[] }>();
  for (const it of items) {
    const k = key(it);
    if (!k) continue;
    const e = m.get(k) ?? { n: 0, items: [] };
    e.n++;
    e.items.push(it);
    m.set(k, e);
  }
  return [...m.entries()].sort((a, b) => b[1].n - a[1].n).map(([k, v]) => ({ key: k, ...v }));
}

/** A reader "personality" from her year, the way a music wrap names your listening style */
function personality(read: Book[], topGenre?: string) {
  const inSeries = read.filter((b) => b.series).length / Math.max(1, read.length);
  const spicy = read.filter((b) => b.genres.includes('Spicy') || b.tags.some((t) => t.startsWith('spicy'))).length;
  if (topGenre === 'Romantasy')
    return { name: 'The Faerie Court Regular', line: 'Dragons, fae and a slow burn: your natural habitat.' };
  if (spicy >= read.length / 3)
    return { name: 'The Chilli Connoisseur', line: 'You like your books with a little 🌶️.' };
  if (inSeries > 0.6)
    return { name: 'The Series Devourer', line: 'One book is never enough. You need to know what happens next.' };
  if (topGenre === 'Thriller' || topGenre === 'Mystery')
    return { name: 'The Midnight Sleuth', line: 'Just one more chapter… until the twist.' };
  if (topGenre === 'Fantasy') return { name: 'The World Wanderer', line: 'Maps at the front of the book? Yes please.' };
  if (topGenre === 'Romance') return { name: 'The Hopeless Romantic', line: 'Happily ever after, every single time.' };
  return { name: 'The Cosy Collector', line: 'A blanket, a cup of tea and a good book: that’s your year.' };
}

interface Slide {
  key: string;
  bg: string;
  body: ReactNode;
}

export default function Wrapped() {
  const books = useBooks();
  const days = useDays();
  const profile = useProfile();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const year = Number(params.get('year')) || wrappedYear();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides = useMemo<Slide[]>(() => {
    if (!books || !days) return [];
    const name = profile.name;
    const read = books
      .filter((b) => b.status === 'read' && b.finishedAt && new Date(b.finishedAt).getFullYear() === year)
      .sort((a, b) => a.finishedAt! - b.finishedAt!);
    const out: Slide[] = [];
    out.push({
      key: 'intro',
      bg: 'from-[#7A2E3A] to-[#4E3B47]',
      body: (
        <Center>
          <Pop delay={0.1}>
            <p className="text-sm tracking-[0.3em] text-cream/70 uppercase">Snug presents</p>
          </Pop>
          <Pop delay={0.4}>
            <h1 className="font-soft mt-3 text-5xl leading-tight font-semibold">
              {name ? `${name}’s` : 'Your'}
              <br />
              {year} in books
            </h1>
          </Pop>
          <Pop delay={1}>
            <p className="mt-6 text-cream/80">Grab a cup of tea. Let’s look back. ☕</p>
          </Pop>
        </Center>
      ),
    });
    if (!read.length) {
      out.push({
        key: 'empty',
        bg: 'from-[#8B5E3C] to-[#5F6B52]',
        body: (
          <Center>
            <p className="font-soft text-3xl">No finished books in {year} yet.</p>
            <p className="mt-3 text-cream/80">Mark books as read and this story fills itself up.</p>
          </Center>
        ),
      });
      return out;
    }

    const pages = read.reduce((t, b) => t + (b.pageCount ?? 0), 0);
    out.push({
      key: 'count',
      bg: 'from-[#5F6B52] to-[#3F4E5A]',
      body: (
        <Center>
          <Pop>
            <p className="text-cream/80">This year you finished</p>
          </Pop>
          <Count to={read.length} className="font-soft my-2 text-[7rem] leading-none font-semibold" />
          <Pop delay={0.5}>
            <p className="text-2xl">book{read.length === 1 ? '' : 's'}</p>
          </Pop>
          {pages > 0 && (
            <Pop delay={1.2}>
              <p className="mt-8 text-cream/85">
                That’s <b>{pages.toLocaleString('en-GB')}</b> pages, about <b>{Math.round((pages * 1.5) / 60)} hours</b>{' '}
                lost in other worlds.
              </p>
            </Pop>
          )}
          <CoverRain books={read} />
        </Center>
      ),
    });

    const months = Array.from({ length: 12 }, () => 0);
    for (const b of read) months[new Date(b.finishedAt!).getMonth()]++;
    const best = months.indexOf(Math.max(...months));
    if (months[best] >= 2)
      out.push({
        key: 'month',
        bg: 'from-[#A0644B] to-[#7A2E3A]',
        body: (
          <Center>
            <Pop>
              <p className="text-cream/80">Your biggest reading month was</p>
            </Pop>
            <Pop delay={0.4}>
              <p className="font-soft mt-2 text-6xl font-semibold">{MONTH_NAMES[best]}</p>
            </Pop>
            <Pop delay={0.8}>
              <p className="mt-2 text-xl">
                with {months[best]} book{months[best] === 1 ? '' : 's'}
              </p>
            </Pop>
            <div className="mt-10 flex h-28 w-full max-w-xs items-end gap-1.5">
              {months.map((n, m) => (
                <motion.div
                  key={m}
                  className={`flex-1 rounded-t ${m === best ? 'bg-[#f6d27a]' : 'bg-cream/35'}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${(n / Math.max(...months)) * 100}%` }}
                  transition={{ delay: 1 + m * 0.06, type: 'spring', stiffness: 120, damping: 16 }}
                />
              ))}
            </div>
            <div className="mt-1 flex w-full max-w-xs gap-1.5 text-[10px] text-cream/60">
              {MONTH_NAMES.map((m) => (
                <span key={m} className="flex-1 text-center">
                  {m[0]}
                </span>
              ))}
            </div>
          </Center>
        ),
      });

    const genres = top(
      read.flatMap((b) => b.genres.map((g) => ({ g, b }))),
      (x) => x.g,
    );
    if (genres.length)
      out.push({
        key: 'genre',
        bg: 'from-[#4E3B47] to-[#7A2E3A]',
        body: (
          <Center>
            <Pop>
              <p className="text-cream/80">Your genre of the year</p>
            </Pop>
            <Pop delay={0.4}>
              <p className="font-soft mt-2 text-6xl font-semibold">{genres[0].key}</p>
            </Pop>
            <div className="mt-8 w-full max-w-xs space-y-3 text-left">
              {genres.slice(0, 4).map((g, n) => (
                <Pop key={g.key} delay={0.9 + n * 0.25}>
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-cream/60">{n + 1}</span>
                    <span className="flex-1">{g.key}</span>
                    <span className="text-cream/70">{g.n}</span>
                  </div>
                </Pop>
              ))}
            </div>
          </Center>
        ),
      });

    const authors = top(read, (b) => b.authors[0]);
    if (authors[0] && authors[0].n >= 2)
      out.push({
        key: 'author',
        bg: 'from-[#8B5E3C] to-[#4E3B47]',
        body: (
          <Center>
            <Pop>
              <p className="text-cream/80">The author you couldn’t get enough of</p>
            </Pop>
            <Pop delay={0.4}>
              <p className="font-soft mt-3 text-5xl leading-tight font-semibold">{authors[0].key}</p>
            </Pop>
            <Pop delay={0.8}>
              <p className="mt-3 text-xl">{authors[0].n} books this year</p>
            </Pop>
            <Fan books={authors[0].items} />
          </Center>
        ),
      });

    const series = top(read, (b) => b.series?.name);
    if (series[0] && series[0].n >= 2)
      out.push({
        key: 'series',
        bg: 'from-[#3F4E5A] to-[#5F6B52]',
        body: (
          <Center>
            <Pop>
              <p className="text-cream/80">The series you binged</p>
            </Pop>
            <Pop delay={0.4}>
              <p className="font-soft mt-3 text-4xl leading-tight font-semibold">{series[0].key}</p>
            </Pop>
            <Pop delay={0.8}>
              <p className="mt-3 text-xl">{series[0].n} parts in one year 📚</p>
            </Pop>
            <Fan books={series[0].items} />
          </Center>
        ),
      });

    const tags = top(
      read.flatMap((b) => b.tags.map((t) => ({ t }))),
      (x) => x.t,
    );
    if (tags[0] && tags[0].n >= 2)
      out.push({
        key: 'tags',
        bg: 'from-[#9C7A4C] to-[#A0644B]',
        body: (
          <Center>
            <Pop>
              <p className="text-cream/80">The word you used most for your books</p>
            </Pop>
            <Pop delay={0.4}>
              <p className="font-soft mt-3 text-5xl font-semibold">{tags[0].key}</p>
            </Pop>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {tags.slice(1, 6).map((t, n) => (
                <Pop key={t.key} delay={0.9 + n * 0.15}>
                  <span className="rounded-full bg-cream/20 px-3 py-1 text-sm">{t.key}</span>
                </Pop>
              ))}
            </div>
          </Center>
        ),
      });

    const rated = read.filter((b) => b.rating).sort((a, b) => b.rating! - a.rating!);
    if (rated.length)
      out.push({
        key: 'best',
        bg: 'from-[#7A2E3A] to-[#A0644B]',
        body: (
          <Center>
            <Pop>
              <p className="text-cream/80">Your favourite book of {year}</p>
            </Pop>
            <motion.div
              initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: -3, opacity: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 140, damping: 12 }}
              className="mt-6 w-40"
            >
              <Cover book={rated[0]} rounded="rounded-lg" />
            </motion.div>
            <Pop delay={1}>
              <p className="font-soft mt-6 text-3xl leading-tight font-semibold">{rated[0].title}</p>
              <p className="mt-1 text-cream/80">
                {rated[0].authors[0]} · {formatRating(rated[0].rating!)}★
              </p>
            </Pop>
            {rated.length > 2 && (
              <Pop delay={1.6}>
                <p className="mt-6 text-sm text-cream/75">
                  Runners-up: {rated[1].title} and {rated[2].title}
                </p>
              </Pop>
            )}
          </Center>
        ),
      });

    const longest = read.filter((b) => b.pageCount).sort((a, b) => b.pageCount! - a.pageCount!)[0];
    if (longest && read.length >= 3)
      out.push({
        key: 'longest',
        bg: 'from-[#5F6B52] to-[#8B5E3C]',
        body: (
          <Center>
            <Pop>
              <p className="text-cream/80">Your biggest adventure</p>
            </Pop>
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
              className="mt-6 w-32"
            >
              <Cover book={longest} rounded="rounded-lg" />
            </motion.div>
            <Pop delay={0.9}>
              <p className="font-soft mt-5 text-3xl leading-tight font-semibold">{longest.title}</p>
              <p className="mt-1 text-xl">{longest.pageCount!.toLocaleString('en-GB')} pages</p>
            </Pop>
          </Center>
        ),
      });

    // her reading streak in this year
    const inYear = days.filter((d) => d.date.startsWith(`${year}-`));
    const imp = profile.streakImport?.until.startsWith(`${year}-`) ? profile.streakImport : undefined;
    const st = streakOf(inYear, imp, `${year}-12-31` < dayKey() ? `${year}-12-31` : dayKey());
    if (inYear.length >= 3 || imp)
      out.push({
        key: 'streak',
        bg: 'from-[#A0644B] to-[#9C7A4C]',
        body: (
          <Center>
            <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.6, repeat: Infinity }}>
              <p className="text-7xl">🔥</p>
            </motion.div>
            <Pop delay={0.3}>
              <p className="mt-4 text-cream/80">Your longest streak</p>
            </Pop>
            <Count to={st.longest} className="font-soft my-1 text-8xl leading-none font-semibold" />
            <Pop delay={0.6}>
              <p className="text-xl">days in a row</p>
            </Pop>
            <Pop delay={1.2}>
              <p className="mt-6 text-cream/85">You picked up a book on {st.totalDays} days this year.</p>
            </Pop>
          </Center>
        ),
      });

    const p = personality(read, genres[0]?.key);
    out.push({
      key: 'persona',
      bg: 'from-[#4E3B47] to-[#3F4E5A]',
      body: (
        <Center>
          <Pop>
            <p className="text-cream/80">Your reader personality</p>
          </Pop>
          <motion.div
            initial={{ scale: 0.3, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 120, damping: 10 }}
            className="mt-6 rounded-[2rem] bg-cream px-6 py-8 text-ink shadow-2xl"
          >
            <p className="text-5xl">📚</p>
            <p className="font-soft mt-3 text-3xl leading-tight font-semibold">{p.name}</p>
            <p className="mt-2 text-sm text-cocoa">{p.line}</p>
          </motion.div>
        </Center>
      ),
    });

    out.push({
      key: 'outro',
      bg: 'from-[#7A2E3A] to-[#4E3B47]',
      body: (
        <Center>
          <Pop>
            <p className="font-soft text-4xl leading-tight font-semibold">What a year{name ? `, ${name}` : ''}. 💛</p>
          </Pop>
          <Pop delay={0.6}>
            <p className="mt-4 text-cream/85">
              {read.length} stories, {authors.length} author{authors.length === 1 ? '' : 's'}, and plenty of “just one
              more chapter”.
            </p>
          </Pop>
          <Pop delay={1.2}>
            <p className="mt-8 text-cream/70">Here’s to {year + 1} and all the books still waiting on your shelf.</p>
          </Pop>
          <CoverRain books={read} />
        </Center>
      ),
    });
    return out;
  }, [books, days, profile, year]);

  // stories move on by themselves; holding a finger down pauses
  useEffect(() => {
    if (paused || !slides.length || i >= slides.length - 1) return;
    const t = setTimeout(() => setI((n) => n + 1), 6500);
    return () => clearTimeout(t);
  }, [i, paused, slides.length]);

  if (!slides.length) return null;
  const slide = slides[Math.min(i, slides.length - 1)];
  const go = (d: number) => setI((n) => Math.max(0, Math.min(slides.length - 1, n + d)));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-ink text-cream">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={slide.key}
          className={`absolute inset-0 isolate bg-gradient-to-br ${slide.bg}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Sparkles />
          {slide.body}
        </motion.div>
      </AnimatePresence>

      {/* tap left to go back, right to go on; hold to pause */}
      <div
        className="absolute inset-0 z-10 flex"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        <button className="h-full w-1/3" aria-label="Previous" onClick={() => go(-1)} />
        <button className="h-full flex-1" aria-label="Next" onClick={() => go(1)} />
      </div>

      <div className="pt-safe absolute inset-x-0 top-0 z-20 px-3">
        <div className="mt-3 flex gap-1">
          {slides.map((s, n) => (
            <div key={s.key} className="h-1 flex-1 overflow-hidden rounded-full bg-cream/25">
              <motion.div
                key={n === i ? `on-${i}` : `off-${n}`}
                className="h-full bg-cream"
                initial={{ width: n < i ? '100%' : '0%' }}
                animate={{ width: n <= i ? '100%' : '0%' }}
                transition={
                  n === i ? { duration: n === slides.length - 1 ? 0.3 : 6.5, ease: 'linear' } : { duration: 0 }
                }
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-cream/70">Snug · {year}</span>
          <button onClick={() => navigate(-1)} className="rounded-full p-2 text-cream/90" aria-label="Close">
            <CloseIcon width={22} height={22} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Center({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-8 pt-16 pb-12 text-center">
      {children}
    </div>
  );
}

function Pop({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }}>
      {children}
    </motion.div>
  );
}

/** A number that counts up */
function Count({ to, className }: { to: number; className?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1200);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <p className={className}>{n}</p>;
}

/** A few covers fanned out like cards in a hand */
function Fan({ books }: { books: Book[] }) {
  const shown = books.slice(0, 5);
  const mid = (shown.length - 1) / 2;
  return (
    <div className="relative mt-8 flex h-40 justify-center">
      {shown.map((b, n) => (
        <motion.div
          key={b.id}
          className="-mx-5 w-24"
          initial={{ opacity: 0, y: 30, rotate: 0 }}
          animate={{ opacity: 1, y: Math.abs(n - mid) * 6, rotate: (n - mid) * 8 }}
          transition={{ delay: 1 + n * 0.12, type: 'spring', stiffness: 140, damping: 14 }}
        >
          <Cover book={b} />
        </motion.div>
      ))}
    </div>
  );
}

/** Covers of the year drifting down in the background */
function CoverRain({ books }: { books: Book[] }) {
  const some = books.slice(0, 10);
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-25">
      {some.map((b, n) => (
        <motion.div
          key={b.id}
          className="absolute w-14"
          style={{ left: `${(n * 37) % 90}%` }}
          initial={{ y: -120, rotate: (n % 2 ? 1 : -1) * 12 }}
          animate={{ y: '110vh' }}
          transition={{ duration: 9 + (n % 4), delay: n * 0.6, repeat: Infinity, ease: 'linear' }}
        >
          <Cover book={b} />
        </motion.div>
      ))}
    </div>
  );
}

function Sparkles() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: 12 }, (_, n) => (
        <motion.span
          key={n}
          className="absolute h-1 w-1 rounded-full bg-cream"
          style={{ left: `${(n * 53) % 100}%`, top: `${(n * 29) % 100}%` }}
          animate={{ opacity: [0, 0.8, 0] }}
          transition={{ duration: 2.5, delay: (n % 5) * 0.5, repeat: Infinity }}
        />
      ))}
    </div>
  );
}
