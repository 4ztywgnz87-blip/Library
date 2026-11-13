import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useBooks } from '../lib/hooks';
import { shelfOrder } from '../lib/library';
import { STATUSES, type Book, type Status } from '../types';
import { PageHeader } from '../components/ui';
import { Bookend, Candle, FairyLights, Mug, Plant, ShelfCat } from '../components/ShelfDecor';

const ROW = 140; // px per shelf row (spines + board)
const BOARD = 12;

const SPINE_COLORS = ['#7A2E3A', '#8B5E3C', '#5F6B52', '#A0644B', '#4E3B47', '#9C7A4C', '#3F4E5A', '#B08968', '#6D3B47', '#556B5E'];

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/** Lighten/darken a hex colour a little, so series parts look related but not identical */
function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount)));
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
}

function spineStyle(b: Book) {
  const pages = b.pageCount ?? 280 + (hash(b.title) % 240);
  const height = Math.round(Math.min(124, Math.max(92, 78 + pages / 12)));
  const width = Math.round(Math.min(40, Math.max(20, 14 + pages / 22)));
  // A whole series shares one colour family
  const base = SPINE_COLORS[hash(b.series?.name ?? b.title) % SPINE_COLORS.length];
  const color = b.series ? shade(base, ((b.series.number ?? 1) - 1) * 9) : base;
  return { height, width, color };
}

function Spine({ book, delay, lean }: { book: Book; delay: number; lean: boolean }) {
  const navigate = useNavigate();
  const { height, width, color } = spineStyle(book);
  // Fit the title on the spine: wider spines get two lines, long titles a smaller font
  const twoLines = width >= 30 && book.title.length > 14;
  const charsPerLine = twoLines ? Math.ceil(book.title.length / 2) : book.title.length;
  const fontSize = Math.max(7.5, Math.min(11, (height - 34) / (charsPerLine * 0.58)));
  return (
    <motion.button
      title={`${book.title} · ${book.authors[0] ?? ''}`}
      aria-label={book.title}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, rotate: lean ? 6 : 0 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 22 }}
      whileHover={{ y: -8 }}
      whileTap={{ y: -16, scale: 1.04 }}
      onClick={() => setTimeout(() => navigate(`/book/${book.id}`), 160)}
      className="relative flex shrink-0 flex-col items-center justify-between overflow-hidden rounded-t-[3px] rounded-b-[1px] py-2 shadow-[inset_-3px_0_4px_rgba(0,0,0,0.25),inset_2px_0_2px_rgba(255,255,255,0.12)]"
      style={{ height, width, background: color, transformOrigin: 'bottom left' }}
    >
      <span className="h-[3px] w-[70%] rounded-full bg-[#e9c98f]/70" />
      <span
        className={`font-soft max-h-[80%] overflow-hidden px-[2px] leading-[1.05] font-semibold text-[#f6efe6] [writing-mode:vertical-rl] ${
          twoLines ? 'line-clamp-2' : 'line-clamp-1'
        }`}
        style={{ fontSize }}
      >
        {book.title}
      </span>
      <span className="flex flex-col items-center gap-[3px]">
        {book.rating !== undefined && book.rating >= 4.5 && <span className="text-[8px] leading-none text-[#e9c98f]">★</span>}
        <span className="h-[3px] w-[70%] rounded-full bg-[#e9c98f]/70" />
      </span>
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
  books: Book[];
  decor?: ReactNode;
  startDelay: number;
}) {
  const navigate = useNavigate();
  return (
    <section className="mb-2">
      <button
        onClick={() => navigate(`/library?tab=${status}`)}
        className="mx-auto mb-2 flex items-center gap-2 rounded-md bg-gradient-to-b from-[#d9b77c] to-[#b8925a] px-3 py-0.5 font-soft text-xs font-semibold text-[#3b2a22] shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
      >
        {label} <span className="opacity-60">{books.length}</span>
      </button>
      <div
        className="flex flex-wrap content-start items-end px-2"
        style={{
          minHeight: ROW,
          // a wooden board under every row
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${ROW - BOARD}px, #a47148 ${ROW - BOARD}px ${ROW - BOARD + 3}px, #8b5e3c ${ROW - BOARD + 3}px ${ROW}px)`,
        }}
      >
        {books.length === 0 && !decor && (
          <div className="flex items-end pb-3" style={{ height: ROW }}>
            <span className="text-xs text-cream/50 italic">empty for now</span>
          </div>
        )}
        {books.map((b, i) => {
          // a little breathing room between different series/authors
          const prev = books[i - 1];
          const newGroup =
            prev && (prev.series?.name ?? prev.authors[0]) !== (b.series?.name ?? b.authors[0]) ? 'ml-1.5' : 'ml-[1px]';
          return (
            <div key={b.id} className={`flex items-end ${i === 0 ? '' : newGroup}`} style={{ height: ROW, paddingBottom: BOARD }}>
              <Spine
                book={b}
                delay={startDelay + Math.min(i * 0.025, 0.6)}
                // like a real bookcase, the last book sometimes leans over
                lean={i === books.length - 1 && books.length > 2 && hash(b.id) % 2 === 0}
              />
            </div>
          );
        })}
        {decor && (
          <div className="ml-3 flex items-end" style={{ height: ROW, paddingBottom: BOARD }}>
            {decor}
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

  if (!books) return null;

  const decor: Record<Status, ReactNode> = {
    reading: <Bookend className="h-16" />,
    owned: <Plant className="h-20" />,
    read: <Mug className="h-14" />,
    wishlist: <Candle className="h-20" />,
  };

  return (
    <div>
      <PageHeader title="My shelf" />
      <div className="mx-auto max-w-4xl px-3 pb-10">
        {/* things on top of the bookcase */}
        <div className="relative flex h-20 items-end justify-between px-6">
          <Plant className="h-20" />
          <ShelfCat className="absolute bottom-[-6px] left-1/2 h-16 -translate-x-1/2" />
          <Candle className="h-16" />
        </div>

        {/* the bookcase */}
        <div className="rounded-xl bg-gradient-to-b from-[#9a6a45] to-[#7d5236] p-3 shadow-[0_18px_40px_-18px_rgba(59,42,34,0.7)]">
          <div className="relative overflow-hidden rounded-md bg-[#4a3226] pt-2 shadow-[inset_0_8px_18px_rgba(0,0,0,0.45)] [background-image:repeating-linear-gradient(90deg,rgba(255,255,255,0.025)_0_2px,transparent_2px_9px)]">
            <FairyLights className="pointer-events-none mb-1 h-6 w-full" />
            {STATUSES.map((s, i) => (
              <ShelfSection
                key={s.id}
                status={s.id}
                label={s.label}
                books={byStatus[s.id]}
                decor={decor[s.id]}
                startDelay={i * 0.15}
              />
            ))}
          </div>
        </div>
        {/* feet */}
        <div className="flex justify-between px-4">
          <div className="h-3 w-8 rounded-b-md bg-[#6b4630]" />
          <div className="h-3 w-8 rounded-b-md bg-[#6b4630]" />
        </div>

        <p className="mt-5 text-center text-xs text-mocha">Tap a spine to open the book · tap a label to see that list</p>
      </div>
    </div>
  );
}
