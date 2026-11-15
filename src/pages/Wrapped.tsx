import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useBooks } from '../lib/hooks';
import { useProfile } from '../lib/profile';
import { dayKey, streakOf, useDays } from '../lib/streak';
import { Cover } from '../components/Cover';
import { CloseIcon } from '../components/Icons';
import { formatRating } from '../components/Stars';
import { Flame } from '../components/Streak';
import type { Book } from '../types';
import { shareWrapCard, type WrapSummary } from '../lib/wrapCard';

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
    return {
      name: 'The Faerie Court Regular',
      emoji: '🧚',
      line: 'Dragons, fae and a slow burn: your natural habitat.',
      tint: ['#f6c27a', '#e05a73', '#b07bd6'],
    };
  if (spicy >= read.length / 3)
    return {
      name: 'The Chilli Connoisseur',
      emoji: '🌶️',
      line: 'You like your books with a little heat.',
      tint: ['#ff9f43', '#e05a73', '#f6d27a'],
    };
  if (inSeries > 0.6)
    return {
      name: 'The Series Devourer',
      emoji: '📚',
      line: 'One book is never enough. You need to know what happens next.',
      tint: ['#8fc1a9', '#f6d27a', '#e08a3f'],
    };
  if (topGenre === 'Thriller' || topGenre === 'Mystery')
    return {
      name: 'The Midnight Sleuth',
      emoji: '🔍',
      line: 'Just one more chapter… until the twist.',
      tint: ['#7fa7d9', '#b07bd6', '#f6d27a'],
    };
  if (topGenre === 'Fantasy')
    return {
      name: 'The World Wanderer',
      emoji: '🗺️',
      line: 'Maps at the front of the book? Yes please.',
      tint: ['#8fc1a9', '#7fa7d9', '#f6d27a'],
    };
  if (topGenre === 'Romance')
    return {
      name: 'The Hopeless Romantic',
      emoji: '💌',
      line: 'Happily ever after, every single time.',
      tint: ['#f2a7b8', '#e05a73', '#f6d27a'],
    };
  return {
    name: 'The Cosy Collector',
    emoji: '☕',
    line: 'A blanket, a cup of tea and a good book: that’s your year.',
    tint: ['#f6c27a', '#d9a27a', '#f2a7b8'],
  };
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

  const { slides, summary } = useMemo<{ slides: Slide[]; summary?: WrapSummary }>(() => {
    if (!books || !days) return { slides: [] };
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
      return { slides: out };
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
    // unbroken all year: the streak simply kept growing
    const unbroken = st.current > 0 && st.current === st.longest;
    if (inYear.length >= 1 || imp)
      out.push({
        key: 'streak',
        bg: 'from-[#A0644B] to-[#9C7A4C]',
        body: (
          <Center>
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 140, damping: 11 }}
            >
              <Flame flicker className="h-28 w-24" />
            </motion.div>
            <Pop delay={0.3}>
              <p className="mt-4 text-cream/85">
                {unbroken ? 'This year your streak grew to' : 'Your longest streak this year was'}
              </p>
            </Pop>
            <Count to={st.longest} className="font-soft my-1 text-8xl leading-none font-semibold" />
            <Pop delay={0.6}>
              <p className="text-xl">days in a row{unbroken ? ', and counting' : ''}</p>
            </Pop>
            <Pop delay={1.2}>
              <p className="mt-6 text-cream/85">You picked up a book on {st.totalDays} days this year.</p>
            </Pop>
          </Center>
        ),
      });

    const p = personality(read, genres[0]?.key);
    // three little facts that back up the personality
    const traits: string[] = [];
    const seriesShare = Math.round((read.filter((b) => b.series).length / read.length) * 100);
    if (seriesShare >= 30) traits.push(`${seriesShare}% in a series`);
    const ratedYear = read.filter((b) => b.rating);
    if (ratedYear.length)
      traits.push(
        `${formatRating(Math.round((ratedYear.reduce((t, b) => t + b.rating!, 0) / ratedYear.length) * 4) / 4)}★ on average`,
      );
    if (tags[0]) traits.push(`mostly ${tags[0].key}`);
    else if (genres[1]) traits.push(`a soft spot for ${genres[1].key.toLowerCase()}`);
    out.push({
      key: 'persona',
      bg: 'from-[#2e2238] to-[#4E3B47]',
      body: <Persona p={p} traits={traits.slice(0, 3)} />,
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
    return {
      slides: out,
      summary: {
        name,
        year,
        books: read.length,
        pages,
        topGenre: genres[0]?.key,
        topAuthor: authors[0] && authors[0].n >= 2 ? authors[0].key : undefined,
        favourite: rated[0],
        longestStreak: inYear.length >= 3 || imp ? st.longest : undefined,
        // her favourites first on the picture
        covers: [...rated, ...read.filter((b) => !b.rating)],
      },
    };
  }, [books, days, profile, year]);

  // stories move on by themselves; holding a finger down pauses (the bar stops too)
  const DURATION = 6500;
  const elapsed = useRef(0);
  const bar = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  useEffect(() => {
    elapsed.current = 0;
    if (!slides.length) return;
    const last = i >= slides.length - 1;
    let prev = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      if (!pausedRef.current) elapsed.current += now - prev;
      prev = now;
      const p = last ? 1 : Math.min(1, elapsed.current / DURATION);
      if (bar.current) bar.current.style.width = `${p * 100}%`;
      if (!last && elapsed.current >= DURATION) setI((n) => Math.min(slides.length - 1, n + 1));
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [i, slides.length]);

  // swipe down to close, like a story
  const [dragY, setDragY] = useState(0);
  const press = useRef<{ x: number; y: number; dragging: boolean; held: boolean; timer?: number } | null>(null);
  const close = () => (history.length > 1 ? navigate(-1) : navigate('/stats'));

  if (!slides.length) return null;
  const slide = slides[Math.min(i, slides.length - 1)];
  const go = (d: number) => setI((n) => Math.max(0, Math.min(slides.length - 1, n + d)));

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = { x: e.clientX, y: e.clientY, dragging: false, held: false, timer: 0 };
    p.timer = window.setTimeout(() => {
      p.held = true;
      setPaused(true);
    }, 220);
    press.current = p;
  };
  const onMove = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.dragging && dy > 10 && Math.abs(dy) > Math.abs(dx)) {
      p.dragging = true;
      clearTimeout(p.timer);
      setPaused(true);
    }
    if (p.dragging) setDragY(Math.max(0, dy));
  };
  const onUp = (e: React.PointerEvent) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    clearTimeout(p.timer);
    if (p.dragging) {
      if (e.clientY - p.y > 110) {
        setDragY(window.innerHeight);
        setTimeout(close, 180);
      } else {
        setDragY(0);
        setPaused(false);
      }
      return;
    }
    if (p.held) return setPaused(false);
    go(e.clientX < window.innerWidth / 3 ? -1 : 1);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden bg-ink text-cream"
      animate={{ y: dragY, scale: 1 - Math.min(dragY, 400) / 2000, borderRadius: dragY ? 28 : 0 }}
      transition={press.current?.dragging ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 36 }}
    >
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

      {/* tap left to go back, right to go on; hold to pause; swipe down to close */}
      <div
        className="absolute inset-0 z-10 touch-none select-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onContextMenu={(e) => e.preventDefault()}
        role="button"
        aria-label="Next"
      />

      {summary && i === slides.length - 1 && <ShareButton summary={summary} />}

      <motion.div
        className="pt-safe absolute inset-x-0 top-0 z-20 px-3"
        animate={{ opacity: paused && !dragY ? 0 : 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="mt-3 flex gap-1">
          {slides.map((s, n) => (
            <div key={s.key} className="h-1 flex-1 overflow-hidden rounded-full bg-cream/25">
              <div
                ref={n === i ? bar : undefined}
                className="h-full bg-cream"
                style={{ width: n < i ? '100%' : n === i ? undefined : '0%' }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-cream/70">Snug · {year}</span>
          <button onClick={close} className="rounded-full p-2 text-cream/90" aria-label="Close">
            <CloseIcon width={22} height={22} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** The reader-personality reveal: a shiny card that flips over, with her emblem orbited by sparkles */
function Persona({ p, traits }: { p: ReturnType<typeof personality>; traits: string[] }) {
  const [a, b, c] = p.tint;
  return (
    <Center>
      {/* soft coloured glows drifting behind */}
      {[a, b, c].map((col, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute h-64 w-64 rounded-full opacity-40 blur-3xl"
          style={{ background: col, left: `${[5, 45, 20][i]}%`, top: `${[12, 40, 62][i]}%` }}
          animate={{ x: [0, 30, -20, 0], y: [0, -25, 15, 0] }}
          transition={{ duration: 9 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <Pop>
        <p className="text-sm tracking-[0.25em] text-cream/70 uppercase">Your reader personality</p>
      </Pop>
      <motion.div
        className="relative mt-6 w-full max-w-[19rem] rounded-[2rem] p-[3px] shadow-2xl"
        style={{ perspective: 800 }}
        initial={{ rotateY: 180, scale: 0.6, opacity: 0 }}
        animate={{ rotateY: 0, scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, duration: 1.1, type: 'spring', stiffness: 70, damping: 12 }}
      >
        {/* a shimmering rainbow edge */}
        <motion.div
          className="absolute inset-0 rounded-[2rem]"
          style={{ background: `conic-gradient(from 0deg, ${a}, ${b}, ${c}, #fff, ${a})` }}
          animate={{ filter: ['hue-rotate(0deg)', 'hue-rotate(40deg)', 'hue-rotate(0deg)'] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <div className="relative overflow-hidden rounded-[calc(2rem-3px)] bg-gradient-to-b from-[#3a2c45] to-[#2a1f33] px-6 pt-8 pb-7">
          {/* a glint sweeping across the card */}
          <motion.span
            className="pointer-events-none absolute inset-y-0 w-16 -skew-x-12 bg-white/15 blur-md"
            initial={{ left: '-30%' }}
            animate={{ left: '130%' }}
            transition={{ delay: 1.6, duration: 1.4, repeat: Infinity, repeatDelay: 2.5 }}
          />
          <div className="relative mx-auto grid h-32 w-32 place-items-center">
            <span
              className="absolute inset-0 rounded-full blur-xl"
              style={{ background: `radial-gradient(${a}, transparent 70%)` }}
            />
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            >
              {Array.from({ length: 6 }, (_, i) => (
                <span
                  key={i}
                  className="absolute top-1/2 left-1/2 h-2 w-2 rounded-full"
                  style={{
                    background: [a, b, c][i % 3],
                    transform: `rotate(${i * 60}deg) translateX(62px)`,
                    boxShadow: `0 0 10px ${[a, b, c][i % 3]}`,
                  }}
                />
              ))}
            </motion.div>
            <motion.span
              className="relative text-7xl"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              {p.emoji}
            </motion.span>
          </div>
          <p
            className="font-soft mt-5 bg-clip-text text-[2rem] leading-tight font-semibold text-transparent"
            style={{ backgroundImage: `linear-gradient(90deg, ${a}, #fff, ${c})` }}
          >
            {p.name}
          </p>
          <p className="mt-2 text-sm text-cream/80">{p.line}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {traits.map((t, i) => (
              <motion.span
                key={t}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6 + i * 0.2 }}
                className="rounded-full border border-cream/20 bg-cream/10 px-3 py-1 text-xs text-cream"
              >
                {t}
              </motion.span>
            ))}
          </div>
        </div>
      </motion.div>
    </Center>
  );
}

function ShareButton({ summary }: { summary: WrapSummary }) {
  const [busy, setBusy] = useState(false);
  return (
    <motion.div
      className="pb-safe absolute inset-x-0 bottom-0 z-20 flex justify-center px-8 pb-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.8 }}
    >
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await shareWrapCard(summary).catch(() => undefined);
          setBusy(false);
        }}
        className="rounded-full bg-cream px-6 py-3 text-sm font-semibold text-wine shadow-xl transition-transform active:scale-95 disabled:opacity-70"
      >
        {busy ? 'Making your picture…' : 'Share my year ✨'}
      </button>
    </motion.div>
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
