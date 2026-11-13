import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useBooks } from '../lib/hooks';
import { shelfOrder } from '../lib/library';
import { isLight, updateSpineColors } from '../lib/coverColor';
import { hashColor } from '../components/Cover';
import type { Book, Status } from '../types';
import { Candle, DreamCloud, FairyLights, HangingPlant, Mug, ShelfCat } from '../components/ShelfDecor';

const ROW = 140; // px per shelf row (spines + board)
const BOARD = 12;
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

function Spine({ book, delay, lean, scale = 1 }: { book: Book; delay: number; lean: boolean; scale?: number }) {
  const navigate = useNavigate();
  const natural = spineStyle(book);
  const color = natural.color;
  const height = Math.round(natural.height * scale);
  const width = Math.round(natural.width * scale);
  const style = hash(book.title + book.id) % 3; // three kinds of spine decoration
  const light = isLight(color);
  const gold = light ? '#8a6a3a' : '#e3c288';
  // The title runs along the spine. It is turned with a rotation (not vertical writing mode),
  // which Safari on iPhone renders reliably, also when the title has to be cut off.
  const textLength = height - 34; // room along the spine
  const twoLines = width >= 30 && book.title.length > 14;
  const charsPerLine = twoLines ? Math.ceil(book.title.length / 2) : book.title.length;
  const fontSize = Math.max(7.5, Math.min(11, textLength / (charsPerLine * 0.56)));
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, rotate: lean ? -7 : 0 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 22 }}
      whileHover={{ y: -8 }}
      whileTap={{ y: -16, scale: 1.04 }}
      onClick={() => setTimeout(() => navigate(`/book/${book.id}`), 160)}
      className="relative flex shrink-0 flex-col items-center justify-between rounded-t-[3px] rounded-b-[1px] py-1.5 shadow-[1px_0_0_rgba(0,0,0,0.35)]"
      style={{
        height,
        width,
        // a leaning book rests its top against its neighbour; its foot slides out a little
        transformOrigin: lean ? 'top left' : 'bottom center',
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
        <span className={`overflow-hidden ${twoLines ? 'line-clamp-2' : 'line-clamp-1'}`}>{book.title}</span>
      </span>
      {ends(false)}
    </motion.button>
  );
}

function ShelfSection({
  status,
  label,
  books,
  decor,
  startDelay,
}: {
  status: Status;
  label: string;
  books: readonly Book[];
  decor?: ReactNode;
  startDelay: number;
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
    const gap = !prev ? 0 : (prev.series?.name ?? prev.authors[0]) !== (b.series?.name ?? b.authors[0]) ? 6 : 1;
    return sum + spineStyle(b).width + gap;
  }, 0);
  const DECOR = 84;
  const room = Math.max(1, available - 2);
  // shrink just enough for books (+ decoration) to fit on one row, but not below MIN_SCALE
  const scale = !available
    ? 1
    : booksWidth + (decor ? DECOR : 0) <= room
      ? 1
      : Math.max(MIN_SCALE, Math.min(1, room / (booksWidth + (decor ? DECOR : 0)), room / booksWidth));
  const row = Math.round((ROW - BOARD) * scale) + BOARD;
  // the decoration only stands where there's room on the last row; it never gets a row of its own
  const lastRowUsed = (booksWidth * scale) % room;
  const showDecor = !!decor && (books.length === 0 || lastRowUsed + DECOR * scale <= room);

  return (
    // the shelf above casts a soft shadow onto the back panel, starting right under its board
    <section className="pt-2" style={{ backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.32), transparent 18px)' }}>
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
        className="flex flex-wrap content-start items-end px-2"
        style={{
          minHeight: row,
          // a wooden board under every row: the shadow it casts on the back panel, the soft
          // shadow under the books, the lit top surface and the front edge
          backgroundImage: `linear-gradient(to bottom, transparent 0, transparent ${row - BOARD - 8}px, rgba(0,0,0,0.28) ${row - BOARD}px, #c99466 ${row - BOARD}px, #b8835a ${row - BOARD + 4}px, #966440 ${row - BOARD + 4}px, #7a4e31 ${row}px)`,
          backgroundSize: `100% ${row}px`,
          backgroundRepeat: 'repeat-y',
        }}
      >
        {books.length === 0 && !decor && (
          <div className="flex items-end pb-3" style={{ height: row }}>
            <span className="text-xs text-cream/50 italic">empty for now</span>
          </div>
        )}
        {books.map((b, i) => {
          // a little breathing room between different series/authors
          const prev = books[i - 1];
          const newGroup =
            prev && (prev.series?.name ?? prev.authors[0]) !== (b.series?.name ?? b.authors[0]) ? 'ml-1.5' : 'ml-[1px]';
          return (
            <div key={b.id} className={`flex items-end ${i === 0 ? '' : newGroup}`} style={{ height: row, paddingBottom: BOARD }}>
              <Spine
                book={b}
                scale={scale}
                delay={startDelay + Math.min(i * 0.025, 0.6)}
                // like a real bookcase, the last book sometimes leans over
                lean={i === books.length - 1 && books.length > 2 && hash(b.id) % 2 === 0}
              />
            </div>
          );
        })}
        {showDecor && (
          <div
            className="ml-3 flex items-end"
            style={{ height: row, paddingBottom: BOARD, width: 72 * scale }}
          >
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'bottom left' }}>{decor}</div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Shelf() {
  const books = useBooks();
  const byStatus = useMemo(() => {
    const m: Record<Status, Book[]> = { reading: [], owned: [], read: [], wishlist: [] };
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

  const decor: Partial<Record<Status, ReactNode>> = {
    owned: <Candle className="h-20 w-12" />,
    read: <Mug className="h-20 w-[68px]" />,
  };

  return (
    <div>
      <div className="pt-safe h-4" />
      <div className="mx-auto max-w-4xl px-5 pb-10">
        {/* things on top of the bookcase: a plant and the cat (its tail hangs over the edge) */}
        <div className="relative h-44">
          {/* pot stands on top, vines hang over the front edge of the cornice */}
          <HangingPlant className="absolute bottom-[-95px] left-2 z-20 h-[190px] w-[107px]" />
          <Link
            to="/wishlist"
            aria-label={`Wishlist, ${wishCount} books`}
            className="absolute top-0 right-[22%] z-20 block w-44 transition-transform active:scale-95"
          >
            <DreamCloud count={wishCount} className="w-full" />
          </Link>
          <ShelfCat className="absolute right-[6%] bottom-[-3px] z-20 h-[78px]" />
        </div>

        {/* crown: a little arched pediment on a layered cornice with dentils */}
        <div className="relative z-10">
          <svg viewBox="0 0 200 22" className="absolute bottom-full left-1/2 h-5 w-[44%] -translate-x-1/2" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="pediment" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#c08a5d" />
                <stop offset="1" stopColor="#9a6a45" />
              </linearGradient>
            </defs>
            <path d="M0 22C46 22 60 1 100 1s54 21 100 21z" fill="url(#pediment)" />
            <path d="M14 21C56 20 66 4 100 4s44 16 86 17" stroke="#fff" strokeOpacity="0.18" strokeWidth="1.5" fill="none" />
          </svg>
          <div className="-mx-4 h-2.5 rounded-t-md bg-gradient-to-b from-[#c99466] to-[#a7754d] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]" />
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
            <FairyLights className="pointer-events-none mb-1 h-7 w-full" />
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
                decor={decor[shelf.status]}
                startDelay={i * 0.15}
              />
            ))}
          </div>
        </div>

        {/* base: plinth, a curved apron and little bun feet */}
        <div className="-mx-2 h-3 bg-gradient-to-b from-[#a7754d] to-[#7d5236] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]" />
        <svg viewBox="0 0 400 24" preserveAspectRatio="none" className="-mx-1 block h-6 w-[calc(100%+0.5rem)]" aria-hidden>
          <defs>
            <linearGradient id="apron" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7d5236" />
              <stop offset="1" stopColor="#5f3d28" />
            </linearGradient>
          </defs>
          <path d="M0 0h400v24h-34c-10 0-14-13-30-13H64c-16 0-20 13-30 13H0z" fill="url(#apron)" />
        </svg>
        <div className="-mt-1 flex justify-between px-1">
          <div className="h-3 w-9 rounded-b-full bg-gradient-to-b from-[#6b4630] to-[#4f3222]" />
          <div className="h-3 w-9 rounded-b-full bg-gradient-to-b from-[#6b4630] to-[#4f3222]" />
        </div>
      </div>
    </div>
  );
}
