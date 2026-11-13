import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useBook } from '../lib/hooks';
import { deleteBook, updateBook } from '../lib/library';
import { GENRES, STATUSES, type Book, type Status } from '../types';
import { Cover } from '../components/Cover';
import { StarsInput } from '../components/Stars';
import { Button, Card, Chip, PageHeader, Segmented, Toggle } from '../components/ui';
import { CameraIcon, TrashIcon } from '../components/Icons';
import { shrinkPhoto } from '../lib/photo';

const TAG_SUGGESTIONS = ['spicy 🌶️', 'emotional 😭', 'plot twist 🤯', 'funny 😂', 'slow burn 🔥', 'cosy ☕', 'dark 🖤', 'page-turner'];

export default function BookDetail() {
  const { id } = useParams();
  const book = useBook(id);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [celebrate, setCelebrate] = useState(0);
  const ratingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (params.get('rate') && ratingRef.current) {
      ratingRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [params, book?.status]);

  if (book === undefined) return null;
  if (!book || book.deleted) {
    return (
      <div>
        <PageHeader back title="" />
        <p className="p-8 text-center text-cocoa">This book isn't in your library.</p>
      </div>
    );
  }

  const set = (patch: Partial<Book>) => updateBook(book.id, patch);

  const setStatus = (status: Status) => {
    if (status === 'read' && book.status !== 'read') {
      setCelebrate((c) => c + 1);
      setTimeout(() => ratingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
    void set({ status });
  };

  return (
    <div className="relative">
      {/* soft blurred cover as backdrop */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        {(book.customCover || book.coverUrl) && (
          <img
            src={book.customCover || book.coverUrl}
            alt=""
            className="h-full w-full scale-125 object-cover opacity-30 blur-2xl"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-cream/30 to-cream" />
      </div>

      <PageHeader back title="" />

      <div className="relative mx-auto max-w-3xl px-4 pb-16">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 12, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            className="w-40 sm:w-48"
          >
            <Cover book={book} rounded="rounded-lg" />
          </motion.div>
          <h1 className="mt-5 text-3xl leading-tight font-semibold">{book.title}</h1>
          <p className="mt-1 text-cocoa">{book.authors.join(', ')}</p>
          {book.series && (
            <p className="mt-1 text-sm text-mocha">
              {book.series.name}
              {book.series.number ? ` · book ${book.series.number}` : ''}
            </p>
          )}
          {book.specialEdition && (
            <span className="mt-2 rounded-full bg-gold/15 px-3 py-1 text-xs text-[#8a6a3a]">✦ Special edition</span>
          )}
        </div>

        <div className="mt-8 space-y-4">
          {/* Status */}
          <Card>
            <p className="mb-3 text-xs tracking-wide text-mocha uppercase">Status</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATUSES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatus(s.id)}
                  className={`rounded-2xl border px-3 py-2.5 text-sm transition-all ${
                    book.status === s.id
                      ? 'border-wine bg-white font-medium text-wine shadow-[var(--shadow-soft)]'
                      : 'border-sand text-cocoa'
                  }`}
                >
                  {s.short}
                </button>
              ))}
            </div>
            {book.status === 'reading' && (
              <Button className="mt-4 w-full" onClick={() => setStatus('read')}>
                I finished it! 🎉
              </Button>
            )}
          </Card>

          {/* Rating & review */}
          {book.status === 'read' && (
            <div ref={ratingRef}>
              <Card className="space-y-4">
                <div className="flex flex-col items-center pt-1">
                  <p className="mb-3 font-soft text-lg">How did you like it?</p>
                  <StarsInput value={book.rating} onChange={(rating) => set({ rating })} />
                </div>
                <ReviewBox book={book} />
                <div>
                  <p className="mb-2 text-xs tracking-wide text-mocha uppercase">Tags (optional)</p>
                  <div className="flex flex-wrap gap-2">
                    {TAG_SUGGESTIONS.map((t) => {
                      const on = book.tags.includes(t);
                      return (
                        <Chip
                          key={t}
                          active={on}
                          onClick={() => set({ tags: on ? book.tags.filter((x) => x !== t) : [...book.tags, t] })}
                        >
                          {t}
                        </Chip>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* My copy */}
          <Card className="space-y-4">
            <p className="text-xs tracking-wide text-mocha uppercase">My copy</p>
            <Segmented
              value={book.language}
              onChange={(language) => set({ language })}
              options={[
                { id: 'en', label: '🇬🇧 English' },
                { id: 'nl', label: '🇳🇱 Dutch' },
              ]}
            />
            <Toggle checked={book.specialEdition} onChange={(specialEdition) => set({ specialEdition })} label="✦ Special edition" />
            {book.specialEdition && (
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-linen px-4 py-2.5 text-sm text-ink hover:bg-sand">
                  <CameraIcon width={18} height={18} />
                  {book.customCover ? 'Change photo' : 'Add a photo of my edition'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) await set({ customCover: await shrinkPhoto(file, 700) });
                    }}
                  />
                </label>
                {book.customCover && (
                  <button className="text-xs text-cocoa underline" onClick={() => set({ customCover: undefined })}>
                    use store cover
                  </button>
                )}
              </div>
            )}
          </Card>

          {/* Genres */}
          <Card>
            <p className="mb-3 text-xs tracking-wide text-mocha uppercase">Genres</p>
            <div className="flex flex-wrap gap-2">
              {[...new Set([...GENRES, ...book.genres])].map((g) => {
                const on = book.genres.includes(g);
                return (
                  <Chip
                    key={g}
                    active={on}
                    onClick={() => set({ genres: on ? book.genres.filter((x) => x !== g) : [...book.genres, g] })}
                  >
                    {g}
                  </Chip>
                );
              })}
            </div>
          </Card>

          <SeriesCard book={book} />

          {/* About */}
          {book.description && <AboutCard text={book.description} />}

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-xs text-mocha">
            {book.pageCount && <span>{book.pageCount} pages</span>}
            {book.publishedDate && <span>Published {book.publishedDate.slice(0, 4)}</span>}
            {book.isbn13 && <span>ISBN {book.isbn13}</span>}
          </div>

          <div className="flex justify-center pt-4">
            <button
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-cocoa hover:bg-linen"
              onClick={async () => {
                if (confirm(`Remove "${book.title}" from your library?`)) {
                  await deleteBook(book.id);
                  navigate(-1);
                }
              }}
            >
              <TrashIcon width={16} height={16} /> Remove from library
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>{celebrate > 0 && <Petals key={celebrate} onDone={() => setCelebrate(0)} />}</AnimatePresence>
    </div>
  );
}

function ReviewBox({ book }: { book: Book }) {
  const [text, setText] = useState(book.review ?? '');
  const [saved, setSaved] = useState(false);
  useEffect(() => setText(book.review ?? ''), [book.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave a moment after she stops typing
  useEffect(() => {
    if (text === (book.review ?? '')) return;
    const t = setTimeout(async () => {
      await updateBook(book.id, { review: text.trim() || undefined });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }, 800);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-xs tracking-wide text-mocha uppercase">A few words</p>
        {saved && <span className="text-xs text-sage">saved ✓</span>}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="What did you love? What bugged you? (helps with better tips later)"
        className="w-full resize-none rounded-2xl border border-sand bg-white/80 p-3 text-[16px] outline-none placeholder:text-mocha focus:border-oat"
      />
    </div>
  );
}

function SeriesCard({ book }: { book: Book }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(book.series?.name ?? '');
  const [num, setNum] = useState(book.series?.number?.toString() ?? '');

  const save = async () => {
    await updateBook(book.id, {
      series: name.trim() ? { name: name.trim(), number: num ? Number(num) : undefined } : undefined,
    });
    setEditing(false);
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-xs tracking-wide text-mocha uppercase">Series</p>
        {!editing && (
          <button className="text-sm text-wine" onClick={() => setEditing(true)}>
            {book.series ? 'Edit' : 'Part of a series?'}
          </button>
        )}
      </div>
      {!editing && book.series && (
        <p className="mt-2 text-sm">
          {book.series.name}
          {book.series.number ? ` · book ${book.series.number}` : ''}
        </p>
      )}
      {editing && (
        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Series name"
              className="min-w-0 flex-1 rounded-xl border border-sand bg-white px-3 py-2 text-[16px] outline-none focus:border-oat"
            />
            <input
              value={num}
              onChange={(e) => setNum(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="#"
              inputMode="decimal"
              className="w-16 rounded-xl border border-sand bg-white px-3 py-2 text-center text-[16px] outline-none focus:border-oat"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function AboutCard({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <p className="mb-2 text-xs tracking-wide text-mocha uppercase">About</p>
      <p className={`text-sm leading-relaxed text-ink/90 ${open ? '' : 'line-clamp-5'}`}>{text}</p>
      {text.length > 300 && (
        <button className="mt-2 text-sm text-wine" onClick={() => setOpen(!open)}>
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </Card>
  );
}

/** Little burst of petals when she finishes a book */
function Petals({ onDone }: { onDone: () => void }) {
  const petals = Array.from({ length: 18 }, (_, i) => ({
    x: (Math.random() - 0.5) * 320,
    y: -180 - Math.random() * 220,
    r: Math.random() * 360,
    color: ['#7A2E3A', '#C49A5A', '#E7B9A8', '#8F9E7F'][i % 4],
    delay: Math.random() * 0.15,
  }));
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-1/3 z-50 flex justify-center">
      {petals.map((p, i) => (
        <motion.span
          key={i}
          className="absolute h-3 w-2 rounded-[50%_50%_50%_0]"
          style={{ background: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 260], opacity: [1, 1, 0], rotate: p.r }}
          transition={{ duration: 1.6, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}
