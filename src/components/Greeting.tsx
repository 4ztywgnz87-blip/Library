import { useEffect, useState } from 'react';
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

/**
 * One cosy line under the greeting. There are many: about the book she's reading, her shelves, the
 * time of day or the day of the week, or just something nice. A new one is picked each visit, and
 * about half of the time it's about the book she's reading.
 */
function subline(books: Book[], m: Moment, r: number) {
  const reading = books.filter((b) => b.status === 'reading');
  const book = reading.length ? reading[Math.floor(r * 997) % reading.length] : undefined;
  const t = book?.title;
  const waiting = books.filter((b) => b.status === 'owned').length;
  const wishes = books.filter((b) => b.status === 'wishlist').length;
  const year = new Date().getFullYear();
  const readThisYear = books.filter(
    (b) => b.status === 'read' && b.finishedAt && new Date(b.finishedAt).getFullYear() === year,
  ).length;
  const day = new Date().getDay();

  const about: string[] = [];
  if (book && t) {
    about.push(`${t} is waiting for you`, `Back to ${t}?`, `Where did you leave off in ${t}?`);
    if (m === 'night') about.push(`Just one more chapter of ${t}?`);
    if (m === 'morning') about.push(`A chapter of ${t} with your coffee?`);
    if (m === 'evening') about.push(`Blanket, tea and ${t}: the perfect evening`);
    const left = book.pageCount && book.currentPage ? book.pageCount - book.currentPage : undefined;
    if (left !== undefined && left > 0 && left <= 60)
      about.push(`Only ${left} pages left in ${t}!`, `The end of ${t} is in sight…`);
    else if (book.currentPage && book.pageCount)
      about.push(`Page ${book.currentPage} of ${book.pageCount} in ${t}`);
  }

  const other: string[] = [
    'What shall we read next?',
    'Every book is a little holiday',
    'So many books, so little time',
    'The cat saved you a cosy spot by the shelf',
    'A good day to get lost in a story',
    'Your shelves look lovely today',
  ];
  if (waiting) other.push(`${waiting} ${waiting === 1 ? 'book is' : 'books are'} waiting on your TBR`);
  if (waiting >= 10) other.push(`Your TBR is ${waiting} books tall. No pressure 😌`);
  if (wishes) other.push(`${wishes} ${wishes === 1 ? 'book is' : 'books are'} dreaming on your wishlist`);
  if (readThisYear) other.push(`${readThisYear} ${readThisYear === 1 ? 'book' : 'books'} read in ${year} so far 📚`);
  if (m === 'morning') other.push('Fresh coffee, fresh chapter?', 'Rise and read ☀️');
  if (m === 'afternoon') other.push('Time for tea and a few pages?', 'A little afternoon reading break?');
  if (m === 'evening') other.push('Candles on, phone away, book open', 'The coziest part of the day');
  if (m === 'night') other.push('The best stories are read after midnight', 'Snug is sleepy… but one more page is fine');
  if (day === 0) other.push('A perfect Sunday for a chapter or two');
  if (day === 5) other.push('Weekend reading is almost here');
  if (day === 6) other.push('Saturday: a whole day for reading');
  if (day === 1) other.push('A new week, a new chapter');

  // about half of the visits it's about her book, the rest something else
  const list = about.length && r < 0.5 ? about : other;
  return list[Math.floor(r * 7919) % list.length];
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
  // a new line on every visit to Home (the same while she stays)
  const [roll] = useState(Math.random);
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
            {subline(books, m, roll)}
          </motion.p>
        )}
      </div>
    </header>
  );
}
