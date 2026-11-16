import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useBooks } from '../lib/hooks';
import { shelfOrder } from '../lib/library';
import { isLight, updateSpineColors } from '../lib/coverColor';
import { hashColor } from '../components/Cover';
import { notOwned, type Book, type Status } from '../types';
import { dayKey, useDays } from '../lib/streak';
import { useFirstVisit, useSeenIds } from '../lib/visited';
import {
  Bookend,
  Candle,
  DreamCloud,
  FairyLights,
  Globe,
  HangingPlant,
  Mug,
  Painting,
  ShelfCat,
} from '../components/ShelfDecor';
import {
  ChristmasTree,
  Cobweb,
  EggBasket,
  FloatingHearts,
  Pumpkins,
  RoseVase,
  SnowCap,
  Snowfall,
  useSeason,
} from '../components/Seasonal';

/** Something that stands on a shelf */
interface DecorItem {
  key: string;
  /** assigned to this shelf (not one that the other shelf had no room for) */
  own?: boolean;
  el: ReactNode;
  /** natural width in px, so its spot on the shelf is exactly that wide */
  width: number;
}

const ROW = 146; // px per shelf row (spines + board): room above the tallest spines
const BOARD = 12;
const GROUP_GAP = 3; // px between two series/authors; books of one series touch
const MIN_SCALE = 0.72; // books never get smaller than this before a new row is added

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function spineStyle(b: Book) {
  const pages = b.pageCount ?? 280 + (hash(b.title) % 240);
  const height = Math.round(Math.min(124, Math.max(92, 78 + pages / 12)));
  const width = Math.round(Math.min(40, Math.max(20, 14 + pages / 22)));
  // Same colour as the cover: taken from the cover image, or the colour of the drawn cover
  const hasCover = !!(b.customCover || b.coverUrl);
  const color = b.spineColor ?? (hasCover ? '#8b6f5a' : hashColor(b.title));
  return { height, width, color };
}

/** Splits words into `n` lines as evenly as possible */
function splitLines(words: string[], n: number): string[] {
  if (n <= 1 || words.length <= 1) return [words.join(' ')];
  const total = words.join(' ').length;
  for (let limit = Math.ceil(total / n); limit <= total; limit++) {
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (next.length > limit && cur) {
        lines.push(cur);
        cur = w;
      } else cur = next;
    }
    lines.push(cur);
    if (lines.length <= n) return lines;
  }
  return [words.join(' ')];
}

/** The biggest font at which the whole title fits on the spine (length × thickness) */
function fitTitle(title: string, length: number, thickness: number) {
  const words = title.split(/\s+/).filter(Boolean);
  let best = { lines: [title], fontSize: 0 };
  for (const n of [1, 2, 3]) {
    if (n > words.length) break;
    const lines = splitLines(words, n);
    const longest = Math.max(...lines.map((l) => l.length));
    // Fraunces semibold is ~0.56em per character; lines sit 1.05em apart
    const size = Math.min(11, length / (longest * 0.62), thickness / (lines.length * 1.08));
    if (size > best.fontSize + 0.4) best = { lines, fontSize: size };
  }
  return { lines: best.lines, fontSize: Math.max(4, best.fontSize) };
}

function Spine({
  book,
  entrance,
  delay,
  lean,
  scale = 1,
  widthFactor = 1,
  restHeight,
}: {
  book: Book;
  /** slides onto the shelf (first visit only) */
  entrance: boolean;
  delay: number;
  /** leaning to the left (against its neighbour) or to the right (against the side of the case) */
  lean: false | 'left' | 'right';
  scale?: number;
  /** A row is filled exactly: its spines get a touch wider or narrower (0.88–1.14) */
  widthFactor?: number;
  /** Leaning against something lower than the book (the bookend): its height in px */
  restHeight?: number;
}) {
  const navigate = useNavigate();
  const natural = spineStyle(book);
  const color = natural.color;
  const height = Math.round(natural.height * scale);
  const width = Math.floor(natural.width * scale * widthFactor);
  const style = hash(book.title + book.id) % 3; // three kinds of spine decoration
  const light = isLight(color);
  const gold = light ? '#8a6a3a' : '#e3c288';
  // The title runs along the spine, always in full: it is split over one to three lines
  // (at word breaks) and gets the largest font that fits. It is turned with a rotation (not
  // vertical writing mode), which Safari on iPhone renders reliably.
  const textLength = height - 34; // room along the spine, between the decorations at both ends
  const { lines, fontSize } = fitTitle(book.title, textLength, width - 4);
  const band = <span className="block h-[2px] w-[78%] rounded-full" style={{ background: gold, opacity: 0.8 }} />;
  const rib = <span className="block h-[4px] w-full bg-black/25 shadow-[0_1px_0_rgba(255,255,255,0.15)]" />;
  const ends = (top: boolean) => (
    <span className="flex w-full flex-col items-center gap-[2px]">
      {!top && book.rating !== undefined && book.rating >= 4.5 && (
        <span className="mb-0.5 text-[8px] leading-none" style={{ color: gold }}>
          ★
        </span>
      )}
      {style === 0 && (
        <>
          {band}
          {band}
        </>
      )}
      {style === 1 && <span className="block h-[4px] w-[4px] rotate-45" style={{ background: gold, opacity: 0.85 }} />}
      {style === 2 && (
        <>
          {rib}
          {rib}
        </>
      )}
    </span>
  );
  return (
    <motion.button
      title={`${book.title} · ${book.authors[0] ?? ''}${book.status === 'reading' ? ' · reading now' : ''}`}
      aria-label={book.title}
      initial={entrance ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0, rotate: lean === 'left' ? -7 : lean === 'right' ? 7 : 0 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 22 }}
      whileHover={{ y: -8 }}
      whileTap={{ y: -16, scale: 1.04 }}
      onClick={() => setTimeout(() => navigate(`/book/${book.id}`), 160)}
      className="relative flex shrink-0 flex-col items-center justify-between rounded-t-[3px] rounded-b-[1px] py-1.5 shadow-[1px_0_0_rgba(0,0,0,0.35)]"
      style={{
        height,
        width,
        // a leaning book rests its top against its neighbour; its foot slides out a little
        // pivot where the book touches what it leans on: the top of its neighbour book, or the
        // top edge of a (lower) bookend
        // leaning right, against the side of the case: it tips over its bottom right corner
        transformOrigin: !lean
          ? 'bottom center'
          : lean === 'right'
            ? 'bottom right'
            : restHeight && restHeight < height
            ? `0 ${height - restHeight}px` // taller than its neighbour: touches the neighbour's top corner
            : 'top left', // shorter: its own top corner rests against the neighbour
        // rounded spine: light from the left, shadow on the right, and a fine cloth texture
        backgroundImage:
          'linear-gradient(90deg, rgba(0,0,0,0.3) 0%, rgba(255,255,255,0.18) 16%, rgba(255,255,255,0.05) 38%, rgba(0,0,0,0.06) 70%, rgba(0,0,0,0.38) 100%), repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 3px)',
        backgroundColor: color,
      }}
    >
      {book.status === 'reading' && (
        // a bookmark ribbon peeking out of the top and hanging down the side
        <span
          className="pointer-events-none absolute -top-[9px] right-[3px] z-10 h-[32px] w-[6px] bg-gradient-to-b from-[#9b3a49] to-[#7a2e3a] shadow-[1px_1px_1px_rgba(0,0,0,0.3)]"
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 84%, 0 100%)' }}
        />
      )}
      {ends(true)}
      <span
        className="font-soft pointer-events-none absolute top-1/2 left-1/2 flex items-center justify-center text-center leading-[1.05] font-semibold"
        style={{
          width: textLength,
          height: width - 4,
          fontSize,
          transform: 'translate(-50%, -50%) rotate(90deg)',
          color: light ? '#3b2a22' : '#f6efe6',
          textShadow: light ? 'none' : '0 1px 1px rgba(0,0,0,0.35)',
        }}
      >
        <span className="whitespace-nowrap">
          {lines.map((l, i) => (
            <span key={i} className="block">
              {l}
            </span>
          ))}
        </span>
      </span>
      {ends(false)}
    </motion.button>
  );
}

/**
 * Which decorations stand on the shelves today: decided by the date, so it changes from day to day,
 * and never fewer than two. Each one can stand on either shelf.
 */
function decorToday(forced: string | null): Set<string> {
  const pool = ['candle', 'painting', 'mug', 'globe'];
  if (forced) return new Set(forced === 'all' ? pool : forced.split(','));
  const day = dayKey();
  const roll = (k: string) => hash(`${day}|${k}`) % 100;
  const on = pool.filter((k) => roll(k) < 62);
  // never fewer than two
  for (const k of [...pool].sort((x, y) => roll(x) - roll(y))) {
    if (on.length >= 2) break;
    if (!on.includes(k)) on.push(k);
  }
  return new Set(on);
}

function ShelfSection({
  status,
  label,
  books,
  decors,
  reserve,
  onDropped,
  startDelay,
  entrance,
  seen,
}: {
  status: Status;
  label: string;
  books: readonly Book[];
  decors: DecorItem[];
  /** width kept free for decoration, so the books keep the same size whatever stands there today */
  reserve: number;
  /** tells which decorations had no room on this shelf, so the other shelf can take them */
  onDropped: (keys: string[]) => void;
  startDelay: number;
  entrance: boolean;
  /** books she has already seen here: they don't animate in again */
  seen: Set<string>;
}) {
  const navigate = useNavigate();

  // Books first get smaller (down to MIN_SCALE) to stay on one row; only then a new row is added
  const rowRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const booksWidth = books.reduce((sum, b, i) => {
    const prev = books[i - 1];
    const gap = !prev ? 0 : (prev.series?.name ?? prev.authors[0]) !== (b.series?.name ?? b.authors[0]) ? GROUP_GAP : 0;
    return sum + spineStyle(b).width + gap;
  }, 0);
  const bw = (64 * 24) / 84; // a bookend's width at full size
  // each decoration needs its own width, margins and (in the middle of the shelf) a bookend
  const decorsTotal = (list: DecorItem[]) => list.reduce((t, d) => t + d.width + 20 + (books.length ? 18 : 0), 0);
  const room = Math.max(1, available - 2);
  // shrink just enough for books (+ decorations) to fit on one row, but not below MIN_SCALE
  const kept = reserve + 20 + (books.length ? 18 : 0);
  const scale = !available
    ? 1
    : booksWidth + kept <= room
      ? 1
      : Math.max(MIN_SCALE, Math.min(1, room / (booksWidth + kept), room / booksWidth));
  const row = Math.round((ROW - BOARD) * scale) + BOARD;
  // decorations only stand where there's room on the last row; they never get a row of their own
  const lastRowUsed = (booksWidth * scale) % room;
  let shown = decors;
  while (shown.length && books.length && lastRowUsed + decorsTotal(shown) * scale > room) shown = shown.slice(0, -1);
  // The first one stands between two series/authors (a fixed spot per shelf), the next at the end of the shelf
  const groupOf = (b: Book) => b.series?.name ?? b.authors[0];
  const boundaries = books.map((_, i) => i).filter((i) => i > 0 && groupOf(books[i - 1]) !== groupOf(books[i]));
  const ats = shown.map((_, k) =>
    k === 0 && boundaries.length ? boundaries[hash(status) % boundaries.length] : books.length,
  );
  const atSet = new Set(ats);
  const droppedKey = decors
    .filter((d) => !shown.includes(d) && d.own)
    .map((d) => d.key)
    .join(',');
  useEffect(() => {
    onDropped(droppedKey ? droppedKey.split(',') : []);
  }, [droppedKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const decorEl = (d: DecorItem, mid: boolean) => (
    // in the middle of the shelf a bookend keeps the books after it upright
    <div
      key={`decor-${d.key}`}
      className={`ml-1.5 flex items-end gap-1 ${mid ? 'mr-0' : 'mr-1.5'}`}
      style={{ height: row, paddingBottom: BOARD }}
    >
      <div style={{ width: d.width * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'bottom left' }}>{d.el}</div>
      </div>
      {mid && <Bookend className="shrink-0" style={{ height: 64 * scale, width: bw * scale }} />}
    </div>
  );

  // Lay out the rows ourselves, so every full row reaches the side of the case: when the next book
  // almost fits, it joins the row and that row's spines get a touch narrower; when a small gap is
  // left, the row's spines get a touch wider (heights stay the same, so it doesn't show).
  type Item =
    | { kind: 'decor'; w: number; d: DecorItem; mid: boolean }
    | {
        kind: 'book';
        b: Book;
        i: number;
        prev?: Book;
        w: number;
        gap: number;
        foot: number;
        lean: false | 'left' | 'right';
        factor: number;
      };
  const items: Item[] = [];
  const decorItem = (d: DecorItem, mid: boolean): Item => ({
    kind: 'decor',
    d,
    mid,
    w: d.width * scale + 6 + (mid ? 4 + bw * scale : 6),
  });
  const endDecor = atSet.has(books.length);
  books.forEach((b, i) => {
    const prev = books[i - 1];
    const newGroup = prev && (prev.series?.name ?? prev.authors[0]) !== (b.series?.name ?? b.authors[0]);
    // Leaning books rest their top against the left neighbour (a book or the bookend) and
    // their foot slides a little to the right, so they get some room on that side.
    // Who leans: the last book of the shelf, or the book just before a decoration.
    const isLast = i === books.length - 1;
    const lean =
      (isLast && !endDecor && !atSet.has(i) && books.length > 2) || (atSet.has(i + 1) && i > 0)
        ? ('left' as const)
        : false;
    // (a book right next to a bookend always stands upright: that's what the bookend is for)
    const foot = lean && (!isLast || endDecor) ? Math.ceil((row - BOARD) * 0.13) : 0;
    shown.forEach((d, k) => {
      if (ats[k] === i) items.push(decorItem(d, true));
    });
    items.push({
      kind: 'book',
      b,
      i,
      prev,
      w: Math.round(spineStyle(b).width * scale),
      gap: newGroup && !atSet.has(i) ? GROUP_GAP : 0,
      foot,
      lean,
      factor: 1,
    });
  });
  shown.forEach((d, k) => {
    if (ats[k] >= books.length) items.push(decorItem(d, false));
  });

  const rows: Item[][] = [];
  let cur: Item[] = [];
  const widths = (r: Item[]) =>
    r.reduce(
      (acc, it) =>
        it.kind === 'book'
          ? { flex: acc.flex + it.w, fixed: acc.fixed + it.gap + it.foot }
          : { ...acc, fixed: acc.fixed + it.w },
      { flex: 0, fixed: 0 },
    );
  const close = (fill: boolean) => {
    if (!cur.length) return;
    // A full row: sometimes its last book doesn't stand up straight but tilts into the bit of room
    // left. Mostly to the left, against its neighbour; now and then to the right, against the
    // side of the case. Decided per book, so the shelf looks the same every visit.
    const last = cur[cur.length - 1];
    const before = cur[cur.length - 2];
    if (fill && last.kind === 'book' && !last.lean) {
      const roll = hash(`${last.b.id}|tilt`) % 20;
      const h = Math.round(spineStyle(last.b).height * scale);
      const tilt: Item | undefined =
        roll < 8 && before?.kind === 'book'
          ? { ...last, lean: 'left', foot: Math.ceil((row - BOARD) * 0.13) }
          : roll >= 8 && roll < 11
            ? { ...last, lean: 'right', foot: Math.ceil(h * Math.sin((7 * Math.PI) / 180)) + 1 }
            : undefined;
      if (tilt) {
        const { flex, fixed } = widths([...cur.slice(0, -1), tilt]);
        if (flex * 0.88 + fixed <= room - 1) cur[cur.length - 1] = tilt;
      }
    }
    if (fill) {
      const { flex, fixed } = widths(cur);
      const f = Math.max(0.88, Math.min(1.14, (room - fixed - 1) / Math.max(1, flex)));
      cur = cur.map((it) => (it.kind === 'book' ? { ...it, factor: f } : it));
    }
    rows.push(cur);
    cur = [];
  };
  for (const it of items) {
    const { flex, fixed } = widths([...cur, it]);
    if (!cur.length || flex + fixed <= room) {
      cur.push(it);
      continue;
    }
    // almost fits: squeeze it in (the row's books get up to 12% narrower)
    if (it.kind === 'book' && flex * 0.88 + fixed <= room - 1) {
      cur.push(it);
      close(true);
      continue;
    }
    close(true);
    cur.push(it);
  }
  close(false); // the last row stays as it is: books just stand there, from the left

  return (
    // the shelf above casts a soft shadow onto the back panel, starting right under its board
    <section
      className="pt-2"
      style={{ backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.32), transparent 18px)' }}
    >
      <button
        onClick={() => navigate(`/library?tab=${status}`)}
        className="relative mx-auto mb-2 flex items-center gap-2 rounded-[4px] bg-gradient-to-b from-[#e2c48a] via-[#c9a465] to-[#a9824b] px-5 py-[3px] font-soft text-xs font-semibold text-[#3b2a22] shadow-[0_1px_2px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.45)]"
      >
        <span className="absolute top-1/2 left-1.5 h-1 w-1 -translate-y-1/2 rounded-full bg-[#7d5f35]" />
        {label} <span className="opacity-60">{books.length}</span>
        <span className="absolute top-1/2 right-1.5 h-1 w-1 -translate-y-1/2 rounded-full bg-[#7d5f35]" />
      </button>
      <div
        ref={rowRef}
        className="flex flex-col px-2"
        style={{
          minHeight: row,
          // a wooden board under every row: the shadow it casts on the back panel, the soft
          // shadow under the books, the lit top surface and the front edge
          backgroundImage: `linear-gradient(to bottom, transparent 0, transparent ${row - BOARD - 8}px, rgba(0,0,0,0.28) ${row - BOARD}px, #c99466 ${row - BOARD}px, #b8835a ${row - BOARD + 4}px, #966440 ${row - BOARD + 4}px, #7a4e31 ${row}px)`,
          backgroundSize: `100% ${row}px`,
          backgroundRepeat: 'repeat-y',
        }}
      >
        {books.length === 0 && !shown.length && (
          <div className="flex items-end pb-3" style={{ height: row }}>
            <span className="text-xs text-cream/50 italic">empty for now</span>
          </div>
        )}
        {rows.map((r, ri) => (
          <div key={ri} className="flex w-full items-end">
            {r.map((it) =>
              it.kind === 'decor' ? (
                decorEl(it.d, it.mid)
              ) : (
                <div
                  key={it.b.id}
                  className="flex items-end"
                  style={{ height: row, paddingBottom: BOARD, marginLeft: it.gap, marginRight: it.foot }}
                >
                  <Spine
                    book={it.b}
                    scale={scale}
                    widthFactor={it.factor}
                    entrance={entrance || !seen.has(it.b.id)}
                    delay={startDelay + Math.min(it.i * 0.025, 0.6)}
                    lean={it.lean}
                    // it rests on the top corner of the book to its left: pivot exactly there
                    restHeight={it.lean && it.prev ? Math.round(spineStyle(it.prev).height * scale) : undefined}
                  />
                </div>
              ),
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Shelf() {
  const books = useBooks();
  // the bookcase dresses up for Christmas, Halloween, Valentine's and Easter
  const season = useSeason();
  // the cat keeps an eye on her streak: content once she's read today, one eye open in the evening if not
  const days = useDays();
  const forcedMood = new URLSearchParams(location.search).get('cat');
  const readToday = days?.some((d) => d.date === dayKey());
  const catMood: 'content' | 'peek' | undefined =
    forcedMood === 'content' || forcedMood === 'peek'
      ? forcedMood
      : readToday
        ? 'content'
        : days && new Date().getHours() >= 17
          ? 'peek'
          : undefined;
  // the books slide onto the shelf once per visit; coming back, nothing moves
  const bookCount = (books ?? []).filter((b) => !notOwned(b)).length;
  const firstVisit = useFirstVisit('shelf');
  const [dropped, setDropped] = useState<Record<string, string[]>>({});
  const seenBefore = useSeenIds(
    'shelf',
    (books ?? []).map((b) => b.id),
  );
  const byStatus = useMemo(() => {
    const m: Record<Status, Book[]> = { reading: [], owned: [], read: [], wishlist: [], radar: [] };
    for (const b of books ?? []) m[b.status].push(b);
    for (const k of Object.keys(m) as Status[]) m[k].sort(shelfOrder);
    return m;
  }, [books]);

  // Give spines the colours of their covers (worked out once per cover, in the background)
  const coverKey = (books ?? []).map((b) => b.customCover?.slice(0, 40) || b.coverUrl).join('|');
  useEffect(() => {
    void updateSpineColors();
  }, [coverKey]);

  if (!books) return null;
  const wishCount = byStatus.wishlist.length;

  // Not every decoration stands there every day: what is on the shelves changes from day to day, but
  // there are always at least two. (`?decor=all` or `?decor=globe,mug` shows a chosen set.)
  const all: Record<string, DecorItem> = {
    candle: { key: 'candle', el: <Candle className="h-20 w-12" season={season} />, width: 48 },
    painting: { key: 'painting', el: <Painting className="h-[58px] w-12" />, width: 48 },
    mug: { key: 'mug', el: <Mug className="h-20 w-[68px]" season={season} />, width: 68 },
    globe: { key: 'globe', el: <Globe className="h-[72px] w-[50px]" />, width: 50 },
  };
  const today = decorToday(new URLSearchParams(location.search).get('decor'));
  // each decoration stands on either shelf (decided by the day); what has no room moves to the other one
  const day = dayKey();
  const assigned: Record<'owned' | 'read', string[]> = { owned: [], read: [] };
  for (const k of ['candle', 'painting', 'mug', 'globe'])
    if (today.has(k)) assigned[hash(`${day}|${k}|shelf`) % 2 ? 'read' : 'owned'].push(k);
  const list = (shelf: 'owned' | 'read', other: 'owned' | 'read'): DecorItem[] => [
    ...assigned[shelf].map((k) => ({ ...all[k], own: true })),
    ...(dropped[other] ?? []).filter((k) => !assigned[shelf].includes(k)).map((k) => all[k]),
  ];
  const decors: Partial<Record<Status, DecorItem[]>> = { owned: list('owned', 'read'), read: list('read', 'owned') };

  return (
    <div>
      <div className="pt-safe" />
      <div className="mx-auto max-w-4xl px-5 pb-10">
        {/* things on top of the bookcase: a plant and the cat (its tail hangs over the edge) */}
        <div className="relative -mt-3 h-44">
          {/* pot stands on top, vines hang over the front edge of the cornice */}
          {season === 'christmas' ? (
            <ChristmasTree className="absolute bottom-0 left-3 z-20 h-[116px] w-[78px]" />
          ) : season === 'halloween' ? (
            <Pumpkins className="absolute bottom-0 left-3 z-20 h-[64px] w-[100px]" />
          ) : season === 'valentine' ? (
            <RoseVase className="absolute bottom-0 left-4 z-20 h-[104px] w-[66px]" />
          ) : (
            <HangingPlant className="absolute bottom-[-95px] left-2 z-20 h-[190px] w-[107px]" />
          )}
          {season === 'easter' && <EggBasket className="absolute bottom-0 left-[118px] z-20 h-[46px] w-[60px]" />}
          <Link
            to="/wishlist"
            aria-label={`Wishlist, ${wishCount} books`}
            className="absolute top-0 right-[22%] z-20 block w-44 transition-transform active:scale-95"
          >
            <DreamCloud count={wishCount} className="w-full" />
          </Link>
          <ShelfCat className="absolute right-[6%] bottom-[-7px] z-20 h-[78px]" season={season} mood={catMood} />
        </div>

        {/* crown: a little arched pediment on a layered cornice with dentils */}
        <div className="relative z-10">
          <div className="absolute bottom-full left-1/2 h-10 w-[54%] -translate-x-1/2">
            <svg viewBox="0 0 200 22" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id="pediment" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#c08a5d" />
                  <stop offset="1" stopColor="#9a6a45" />
                </linearGradient>
              </defs>
              <path d="M0 22C46 22 60 1 100 1s54 21 100 21z" fill="url(#pediment)" />
              <path
                d="M14 21C56 20 66 4 100 4s44 16 86 17"
                stroke="#fff"
                strokeOpacity="0.18"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
            {/* a little brass plate in the arch: how many books she has (the wishlist doesn't count) */}
            <Link
              to="/library?tab=have"
              aria-label={`${bookCount} books in your library`}
              className="absolute bottom-[6px] left-1/2 -translate-x-1/2 rounded-[3px] bg-gradient-to-b from-[#e2c48a] via-[#c9a465] to-[#a9824b] px-3.5 py-[2px] font-soft text-[12px] leading-none font-semibold whitespace-nowrap text-[#3b2a22] shadow-[0_1px_2px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.45)]"
            >
              {bookCount}
            </Link>
          </div>
          <div className="-mx-4 h-2.5 rounded-t-md bg-gradient-to-b from-[#c99466] to-[#a7754d] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]" />
          {season === 'christmas' && (
            <SnowCap className="pointer-events-none absolute -top-2 -left-4 z-10 h-3.5 w-[calc(100%+2rem)]" />
          )}
          <div className="-mx-3 h-3 bg-gradient-to-b from-[#8b5e3c] to-[#6f4a30]" />
          <div
            className="-mx-2 h-2.5"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, #a7754d 0 7px, #6f4a30 7px 11px), linear-gradient(#a7754d, #a7754d)',
              boxShadow: '0 3px 4px rgba(0,0,0,0.25)',
            }}
          />
        </div>

        {/* the bookcase, with fluted side posts */}
        <div
          className="relative px-4 pt-2 pb-3 shadow-[0_22px_40px_-18px_rgba(59,42,34,0.75)]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(97deg, rgba(0,0,0,0.05) 0 2px, transparent 2px 9px, rgba(255,255,255,0.03) 9px 11px, transparent 11px 17px), linear-gradient(90deg, #8d6040, #a7754d 50%, #8d6040)',
          }}
        >
          {['left-0', 'right-0'].map((side) => (
            <div
              key={side}
              className={`pointer-events-none absolute inset-y-0 ${side} w-4`}
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, #9c6b46 0 2px, #6f4a30 2px 3.5px, #b07d52 3.5px 5px)',
                boxShadow: 'inset 0 0 4px rgba(0,0,0,0.3)',
              }}
            />
          ))}
          <div
            className="relative overflow-hidden rounded-[3px] pt-1 shadow-[inset_0_10px_22px_rgba(0,0,0,0.5),inset_6px_0_12px_rgba(0,0,0,0.3),inset_-6px_0_12px_rgba(0,0,0,0.3)]"
            style={{
              // back panel: vertical planks, warmly lit by the fairy lights
              backgroundImage:
                'radial-gradient(ellipse 80% 22% at 50% 0%, rgba(255,196,120,0.22), transparent), repeating-linear-gradient(90deg, rgba(0,0,0,0) 0 54px, rgba(0,0,0,0.35) 54px 56px), repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 7px)',
              backgroundColor: '#4d3427',
            }}
          >
            <FairyLights className="pointer-events-none -mb-2 h-7 w-full" season={season} />
            {season === 'halloween' && <Cobweb className="pointer-events-none absolute top-0 right-0 z-10 h-16 w-16" />}
            {season === 'valentine' && (
              <FloatingHearts className="pointer-events-none absolute inset-0 z-10 h-full w-full" />
            )}
            {season === 'christmas' && <Snowfall className="pointer-events-none absolute inset-0 z-10 h-full w-full" />}
            {/* one shelf with her books (the ones she's reading first, with a bookmark), one with read books */}
            {(
              [
                { status: 'owned', label: 'To read', books: [...byStatus.reading, ...byStatus.owned] },
                { status: 'read', label: 'Read', books: byStatus.read },
              ] as const
            ).map((shelf, i) => (
              <ShelfSection
                key={shelf.status}
                status={shelf.status}
                label={shelf.label}
                books={shelf.books}
                decors={decors[shelf.status] ?? []}
                reserve={shelf.status === 'owned' ? 48 : 68}
                onDropped={(keys) =>
                  setDropped((d) => (d[shelf.status]?.join() === keys.join() ? d : { ...d, [shelf.status]: keys }))
                }
                startDelay={i * 0.15}
                entrance={firstVisit}
                seen={seenBefore}
              />
            ))}
          </div>
        </div>

        {/* base: plinth, a curved apron and little bun feet */}
        <div className="-mx-2 h-3 bg-gradient-to-b from-[#a7754d] to-[#7d5236] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]" />
        <div className="relative">
          <svg
            viewBox="0 0 400 24"
            preserveAspectRatio="none"
            className="-mx-1 block h-6 w-[calc(100%+0.5rem)]"
            aria-hidden
          >
            <defs>
              <linearGradient id="apron" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#7d5236" />
                <stop offset="1" stopColor="#5f3d28" />
              </linearGradient>
            </defs>
            <path d="M0 0h400v24h-34c-10 0-14-13-30-13H64c-16 0-20 13-30 13H0z" fill="url(#apron)" />
          </svg>
        </div>
        <div className="-mt-1 flex justify-between px-1">
          <div className="h-3 w-9 rounded-b-full bg-gradient-to-b from-[#6b4630] to-[#4f3222]" />
          <div className="h-3 w-9 rounded-b-full bg-gradient-to-b from-[#6b4630] to-[#4f3222]" />
        </div>
      </div>
    </div>
  );
}
