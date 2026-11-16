import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import type { Book } from '../types';

type Moment = 'morning' | 'afternoon' | 'evening' | 'night';

function moment(h: number): Moment {
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

const WORDS: Record<Moment, string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
  night: 'Still up reading',
};

interface Line {
  /** stays the same while the line still applies (a book's lines carry the book's id) */
  id: string;
  text: string;
  /** about the time of day: a new line is picked once that moment has passed */
  moment?: boolean;
}

/** Every line that could stand under the greeting right now */
function lines(books: Book[], m: Moment): { about: Line[]; other: Line[] } {
  const reading = books.filter((b) => b.status === 'reading');
  const waiting = books.filter((b) => b.status === 'owned').length;
  const wishes = books.filter((b) => b.status === 'wishlist').length;
  const year = new Date().getFullYear();
  const readThisYear = books.filter(
    (b) => b.status === 'read' && b.finishedAt && new Date(b.finishedAt).getFullYear() === year,
  ).length;
  const day = new Date().getDay();

  const about: Line[] = [];
  for (const book of reading) {
    const t = book.title;
    const id = (k: string) => `${k}:${book.id}`;
    about.push(
      { id: id('waiting'), text: `${t} is waiting for you` },
      { id: id('back'), text: `Back to ${t}?` },
      { id: id('where'), text: `Where did you leave off in ${t}?` },
    );
    if (m === 'night') about.push({ id: id('night'), text: `Just one more chapter of ${t}?`, moment: true });
    if (m === 'morning') about.push({ id: id('coffee'), text: `A chapter of ${t} with your coffee?`, moment: true });
    if (m === 'evening')
      about.push({ id: id('evening'), text: `Blanket, tea and ${t}: the perfect evening`, moment: true });
    const left = book.pageCount && book.currentPage ? book.pageCount - book.currentPage : undefined;
    if (left !== undefined && left > 0 && left <= 60)
      about.push(
        { id: id('left'), text: `Only ${left} ${left === 1 ? 'page' : 'pages'} left in ${t}!` },
        { id: id('end'), text: `The end of ${t} is in sight…` },
      );
    else if (book.currentPage && book.pageCount)
      about.push({ id: id('page'), text: `Page ${book.currentPage} of ${book.pageCount} in ${t}` });
  }

  const other: Line[] = [
    { id: 'next', text: 'What shall we read next?' },
    { id: 'holiday', text: 'Every book is a little holiday' },
    { id: 'time', text: 'So many books, so little time' },
    { id: 'cat', text: 'The cat saved you a cosy spot by the shelf' },
    { id: 'lost', text: 'A good day to get lost in a story' },
    { id: 'lovely', text: 'Your shelves look lovely today' },
  ];
  if (waiting)
    other.push({ id: 'tbr', text: `${waiting} ${waiting === 1 ? 'book is' : 'books are'} waiting on your TBR` });
  if (waiting >= 10) other.push({ id: 'tall', text: `Your TBR is ${waiting} books tall. No pressure 😌` });
  if (wishes)
    other.push({ id: 'wish', text: `${wishes} ${wishes === 1 ? 'book is' : 'books are'} dreaming on your wishlist` });
  if (readThisYear)
    other.push({
      id: 'year',
      text: `${readThisYear} ${readThisYear === 1 ? 'book' : 'books'} read in ${year} so far 📚`,
    });
  const at = (id: string, text: string) => other.push({ id, text, moment: true });
  if (m === 'morning') (at('m1', 'Fresh coffee, fresh chapter?'), at('m2', 'Rise and read ☀️'));
  if (m === 'afternoon') (at('a1', 'Time for tea and a few pages?'), at('a2', 'A little afternoon reading break?'));
  if (m === 'evening') (at('e1', 'Candles on, phone away, book open'), at('e2', 'The coziest part of the day'));
  if (m === 'night')
    (at('n1', 'The best stories are read after midnight'), at('n2', 'Snug is sleepy… but one more page is fine'));
  // a weekday's line only holds on that day
  if (day === 0) other.push({ id: 'sun', text: 'A perfect Sunday for a chapter or two' });
  if (day === 5) other.push({ id: 'fri', text: 'Weekend reading is almost here' });
  if (day === 6) other.push({ id: 'sat', text: 'Saturday: a whole day for reading' });
  if (day === 1) other.push({ id: 'mon', text: 'A new week, a new chapter' });
  return { about, other };
}

const KEPT = 'snug.greetingLine';

/**
 * One cosy line under the greeting. It stays put from visit to visit, and only changes when it no
 * longer applies: a line about the time of day once that moment has passed, a line about a book
 * once she's finished it, a weekday's line the next day. Then a new one is picked, about half of
 * the time about the book she's reading.
 */
function subline(books: Book[], m: Moment) {
  const { about, other } = lines(books, m);
  const all = [...about, ...other];
  let kept: { id: string; m: Moment } | null = null;
  try {
    kept = JSON.parse(localStorage.getItem(KEPT) ?? 'null');
  } catch {
    // no storage (private window): a fresh line each visit is fine
  }
  const still = kept && all.find((l) => l.id === kept!.id && (!l.moment || kept!.m === m));
  if (still) return still.text;
  const pool = about.length && Math.random() < 0.5 ? about : other;
  // never the line she just had
  const fresh = pool.filter((l) => l.id !== kept?.id);
  const line = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))];
  try {
    localStorage.setItem(KEPT, JSON.stringify({ id: line.id, m }));
  } catch {
    // see above
  }
  return line.text;
}

/** Small animated picture for the time of day: a rising sun, steaming tea, a candle, a moon */
function MomentIcon({ m }: { m: Moment }) {
  if (m === 'morning')
    return (
      <svg viewBox="0 0 48 48" className="-my-2 h-12 w-12" aria-hidden>
        <motion.g
          style={{ transformBox: 'view-box', transformOrigin: '24px 26px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        >
          {Array.from({ length: 8 }, (_, i) => (
            <line
              key={i}
              x1="24"
              y1="8"
              x2="24"
              y2="12"
              stroke="#e0a85a"
              strokeWidth="2.4"
              strokeLinecap="round"
              transform={`rotate(${i * 45} 24 26)`}
            />
          ))}
        </motion.g>
        <motion.circle
          cx="24"
          cy="26"
          r="9"
          fill="#f1bf6a"
          style={{ transformBox: 'view-box', transformOrigin: '24px 26px' }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <path d="M6 38h36" stroke="#d9c3a5" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  if (m === 'afternoon')
    return (
      <svg viewBox="0 0 48 48" className="-my-2 h-12 w-12" aria-hidden>
        {[18, 24, 30].map((x, i) => (
          <motion.path
            key={x}
            d={`M${x} 20c-2.5-3 2.5-5 0-8.5`}
            stroke="#c9b29a"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            animate={{ opacity: [0, 0.9, 0], y: [3, -1, -4] }}
            transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.7 }}
          />
        ))}
        <path d="M10 23h28v5a12 12 0 0 1-12 12h-4a12 12 0 0 1-12-12z" fill="#7A2E3A" />
        <path d="M38 25h2a4 4 0 0 1 0 8h-3" stroke="#7A2E3A" strokeWidth="2.4" fill="none" />
        <path d="M8 42h32" stroke="#d9c3a5" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  if (m === 'evening')
    return (
      <svg viewBox="0 0 48 48" className="-my-2 h-12 w-12" aria-hidden>
        <motion.ellipse
          cx="24"
          cy="13"
          rx="9"
          ry="9"
          fill="#f6d27a"
          opacity="0.25"
          animate={{ opacity: [0.18, 0.32, 0.2] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />
        <motion.path
          d="M24 6c3 4 3.5 7 0 11-3.5-4-3-7 0-11z"
          fill="#f0a64b"
          style={{ transformBox: 'view-box', transformOrigin: '24px 17px' }}
          animate={{ scaleY: [1, 1.12, 0.95, 1], rotate: [0, -3, 2, 0] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
        <rect x="19" y="18" width="10" height="22" rx="2" fill="#ffffff" stroke="#d9c3a5" strokeWidth="1.2" />
        <path d="M21.5 22v14" stroke="#efe3d1" strokeWidth="1.6" strokeLinecap="round" />
        {/* wax running down one side */}
        <path
          d="M19 18h10v2.5c-1.5 1.8-2.5 1-3.5 2.8-.8-1.6-1.8-.6-3-1.8-1.2.8-2.5.3-3.5-1z"
          fill="#fffaf0"
          stroke="#e4d3bf"
          strokeWidth="0.8"
        />
        <path d="M24 17v3" stroke="#3b2a22" strokeWidth="1.5" />
        <path d="M12 41h24" stroke="#d9c3a5" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 48 48" className="-my-2 h-12 w-12" aria-hidden>
      <path d="M30 10a14 14 0 1 0 8 22 12 12 0 0 1-8-22z" fill="#e9d7a6" />
      {[
        [12, 12],
        [40, 16],
        [36, 40],
      ].map(([x, y], i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={y}
          r="1.6"
          fill="#c9a465"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8 }}
        />
      ))}
    </svg>
  );
}

/** The greeting writes itself in once per visit; coming back to Home shows it straight away */
let greeted = false;

export function Greeting({ name, books }: { name?: string; books: Book[] }) {
  // (`?moment=morning` shows another time of day, to preview it)
  const [params] = useSearchParams();
  const forced = params.get('moment') as Moment | null;
  const m = forced && forced in WORDS ? forced : moment(new Date().getHours());
  const words = `${WORDS[m]}${name ? `, ${name}` : ''}`.split(' ');
  const [animate] = useState(!greeted);
  const line = useMemo(() => subline(books, m), [books, m]);
  useEffect(() => {
    greeted = true;
  }, []);
  return (
    <header className="pt-8 pb-6">
      <div>
        <h1 className="text-[2rem] leading-tight font-semibold">
          {words.map((w, i) => {
            const word = (
              <motion.span
                key={i}
                className="mr-[0.25em] inline-block"
                initial={animate ? { opacity: 0, y: 8 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i, duration: 0.45, ease: 'easeOut' }}
              >
                {w}
              </motion.span>
            );
            if (i < words.length - 1) return word;
            // the picture for the time of day sticks to the last word, like a little emoji
            return (
              <span key={i} className="whitespace-nowrap">
                {word}
                <motion.span
                  className="inline-block align-middle"
                  initial={animate ? { opacity: 0, scale: 0.6, rotate: -10 } : false}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ delay: 0.08 * words.length + 0.1, type: 'spring', stiffness: 200, damping: 14 }}
                >
                  <MomentIcon m={m} />
                </motion.span>
              </span>
            );
          })}
        </h1>
        {books.length > 0 && (
          <motion.p
            className="mt-1 text-sm text-cocoa"
            initial={animate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.08 * words.length + 0.3, duration: 0.6 }}
          >
            {line}
          </motion.p>
        )}
      </div>
    </header>
  );
}
