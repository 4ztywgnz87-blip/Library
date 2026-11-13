import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useBooks } from '../lib/hooks';
import { shelfOrder } from '../lib/library';
import { STATUSES, type Book, type Status } from '../types';
import { BookPile, Bookend, Candle, FairyLights, Mug, Plant, ShelfCat } from '../components/ShelfDecor';

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
  const style = hash(book.title + book.id) % 3; // three kinds of spine design
  // Fit the title on the spine: wider spines get two lines, long titles a smaller font
  const twoLines = width >= 30 && book.title.length > 14;
  const charsPerLine = twoLines ? Math.ceil(book.title.length / 2) : book.title.length;
  const fontSize = Math.max(7.5, Math.min(11, (height - 40) / (charsPerLine * 0.58)));
  const gold = '#e3c288';
  const band = <span className="block h-[2px] w-[78%] rounded-full" style={{ background: gold, opacity: 0.8 }} />;
  const rib = <span className="block h-[4px] w-full bg-black/25 shadow-[0_1px_0_rgba(255,255,255,0.15)]" />;
  const ends = (
    <>
      {style === 0 && (
        <>
          {band}
          {band}
        </>
      )}
      {style === 2 && (
        <>
          {rib}
          {rib}
        </>
      )}
    </>
  );
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
      className="relative flex shrink-0 flex-col items-center justify-between overflow-hidden rounded-t-[3px] rounded-b-[1px] py-1.5 shadow-[1px_0_0_rgba(0,0,0,0.35)]"
      style={{
        height,
        width,
        transformOrigin: 'bottom left',
        // rounded spine: light from the left, shadow on the right, and a fine cloth texture
        backgroundImage:
          'linear-gradient(90deg, rgba(0,0,0,0.3) 0%, rgba(255,255,255,0.18) 16%, rgba(255,255,255,0.05) 38%, rgba(0,0,0,0.06) 70%, rgba(0,0,0,0.38) 100%), repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 3px)',
        backgroundColor: color,
      }}
    >
      <span className="flex w-full flex-col items-center gap-[2px]">{ends}</span>
      <span
        className={`font-soft overflow-hidden leading-[1.05] font-semibold [writing-mode:vertical-rl] ${
          twoLines ? 'line-clamp-2' : 'line-clamp-1'
        } ${style === 1 ? 'rounded-[2px] px-[2px] py-1.5' : 'px-[2px]'}`}
        style={{
          fontSize,
          maxHeight: '74%',
          color: style === 1 ? '#3b2a22' : '#f6efe6',
          background: style === 1 ? '#efe2c8' : undefined,
          boxShadow: style === 1 ? `0 0 0 1.5px ${gold}` : undefined,
          textShadow: style === 1 ? undefined : '0 1px 1px rgba(0,0,0,0.35)',
        }}
      >
        {book.title}
      </span>
      <span className="flex w-full flex-col items-center gap-[2px]">
        {book.rating !== undefined && book.rating >= 4.5 && (
          <span className="text-[8px] leading-none" style={{ color: gold }}>
            ★
          </span>
        )}
        {ends}
        {style === 1 && <span className="block h-[5px] w-[5px] rotate-45" style={{ background: gold, opacity: 0.85 }} />}
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
        className="flex flex-wrap content-start items-end px-2"
        style={{
          minHeight: ROW,
          // a wooden board under every row: the shadow it casts on the back panel, the soft
          // shadow under the books, the lit top surface and the front edge
          backgroundImage: `linear-gradient(to bottom, transparent 0, transparent ${ROW - BOARD - 8}px, rgba(0,0,0,0.28) ${ROW - BOARD}px, #c99466 ${ROW - BOARD}px, #b8835a ${ROW - BOARD + 4}px, #966440 ${ROW - BOARD + 4}px, #7a4e31 ${ROW}px)`,
          backgroundSize: `100% ${ROW}px`,
          backgroundRepeat: 'repeat-y',
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
    owned: <Plant className="h-24" />,
    read: <Mug className="h-20" />,
    wishlist: <Candle className="h-20" />,
  };

  return (
    <div>
      <div className="pt-safe h-4" />
      <div className="mx-auto max-w-4xl px-3 pb-10">
        {/* things on top of the bookcase */}
        <div className="relative flex h-24 items-end justify-between px-5">
          <Plant className="h-24" />
          <ShelfCat className="absolute bottom-[-4px] left-1/2 h-20 -translate-x-1/2" />
          <div className="relative flex items-end">
            <BookPile className="w-20" />
            <Candle className="absolute bottom-[38px] left-1/2 h-14 -translate-x-1/2" />
          </div>
        </div>

        {/* crown moulding */}
        <div className="relative z-10 -mx-1.5 h-4 rounded-t-lg bg-gradient-to-b from-[#b98257] to-[#8b5e3c] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_3px_rgba(0,0,0,0.3)]" />
        {/* the bookcase */}
        <div
          className="px-3 pt-2 pb-3 shadow-[0_22px_40px_-18px_rgba(59,42,34,0.75)]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(97deg, rgba(0,0,0,0.05) 0 2px, transparent 2px 9px, rgba(255,255,255,0.03) 9px 11px, transparent 11px 17px), linear-gradient(90deg, #8d6040, #a7754d 50%, #8d6040)',
          }}
        >
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
        {/* plinth + feet */}
        <div className="-mx-1 h-4 rounded-b-md bg-gradient-to-b from-[#8b5e3c] to-[#6b4630] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]" />
        <div className="flex justify-between px-5">
          <div className="h-2.5 w-10 rounded-b-md bg-[#5a3a28]" />
          <div className="h-2.5 w-10 rounded-b-md bg-[#5a3a28]" />
        </div>

        <p className="mt-5 text-center text-xs text-mocha">Tap a spine to open the book · tap a label to see that list</p>
      </div>
    </div>
  );
}
