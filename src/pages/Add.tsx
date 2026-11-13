import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { searchBooks, fetchOpenLibraryDescription, type SearchResult } from '../lib/bookSearch';
import { bookKey, newId, saveBook } from '../lib/library';
import { useBooks } from '../lib/hooks';
import { STATUSES, type Lang, type Status } from '../types';
import { Cover } from '../components/Cover';
import { Button, PageHeader, Segmented, Toggle } from '../components/ui';
import { BarcodeIcon, CameraIcon, CheckIcon, CloseIcon, SearchIcon } from '../components/Icons';
import { SleepyCat } from '../components/SleepyCat';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { EditionPicker } from '../components/EditionPicker';
import { lookupSeries } from '../lib/seriesLookup';
import { identifyCover } from '../lib/ai';
import { shrinkPhoto } from '../lib/photo';
import type { IdentifyResponse } from '../shared';

export default function Add() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPickedState] = useState<SearchResult | null>(null);
  const books = useBooks();
  const inputRef = useRef<HTMLInputElement>(null);
  // The scanner and the add-sheet get their own history entry (?m=…), so swiping back on the
  // iPhone closes them instead of leaving the Add screen
  const modal = params.get('m');
  const scanning = modal === 'scan';
  const openModal = (m: 'scan' | 'add') =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set('m', m);
      return next;
    });
  const closeModal = () => navigate(-1);
  const setScanning = (open: boolean) => (open ? openModal('scan') : closeModal());
  const setPicked = (r: SearchResult | null) => {
    if (r) {
      setPickedState(r);
      openModal('add');
    } else closeModal();
  };
  useEffect(() => {
    if (modal !== 'add') setPickedState(null);
  }, [modal]);
  const [reading, setReading] = useState(false);
  const [recognised, setRecognised] = useState<IdentifyResponse | null>(null);

  const readCover = async (file: File) => {
    setReading(true);
    setRecognised(null);
    setError(null);
    try {
      const result = await identifyCover(await shrinkPhoto(file));
      setRecognised(result);
      if (result.isbn) setQuery(result.isbn);
      else if (result.title) setQuery([result.title, result.author].filter(Boolean).join(' '));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReading(false);
    }
  };

  const onBarcode = useCallback((isbn: string) => {
    navigate(-1);
    setRecognised(null);
    setQuery(isbn);
  }, []);

  const owned = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of books ?? []) {
      m.set(bookKey(b), b.id);
      if (b.isbn13) m.set(b.isbn13, b.id);
    }
    return m;
  }, [books]);

  // Search while typing (debounced, cancels older searches)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        setResults(await searchBooks(q, ctrl.signal));
      } catch (e) {
        if (!ctrl.signal.aborted) setError(navigator.onLine ? (e as Error).message : "You're offline right now");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  return (
    <div>
      <PageHeader title="Add a book" />
      <div className="mx-auto max-w-3xl px-4">
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-mocha" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, author or ISBN"
            className="w-full rounded-full border border-sand bg-white py-3.5 pr-11 pl-12 text-[16px] shadow-[var(--shadow-soft)] outline-none placeholder:text-mocha focus:border-oat"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="absolute top-1/2 right-3.5 -translate-y-1/2 p-1 text-mocha"
            >
              <CloseIcon width={18} height={18} />
            </button>
          )}
        </div>

        {/* Main ways to add: photo of the cover, or the barcode */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label
            className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-wine px-3 py-3.5 text-sm font-medium text-cream shadow-[var(--shadow-soft)] transition-transform active:scale-[0.97] ${
              reading ? 'opacity-60' : ''
            }`}
          >
            <CameraIcon width={20} height={20} /> Photo of cover
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={reading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void readCover(file);
              }}
            />
          </label>
          <button
            onClick={() => setScanning(true)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white/80 px-3 py-3.5 text-sm font-medium text-ink shadow-[var(--shadow-soft)] transition-transform active:scale-[0.97]"
          >
            <BarcodeIcon width={20} height={20} /> Scan barcode
          </button>
        </div>

        {reading && <LoadingTea text="Reading the cover…" />}
        {recognised && (
          <div className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-sm text-cocoa">
            {recognised.title ? (
              <>
                Looks like <span className="font-medium text-ink">{recognised.title}</span>
                {recognised.author && <> by {recognised.author}</>}. Pick the right edition below.
              </>
            ) : (
              <>Snug couldn't read that cover. Try again in better light, or type the title.</>
            )}
            {recognised.mock && (
              <span className="mt-1 block text-xs text-mocha">Test mode: the AI is off, so this is always the same example book.</span>
            )}
          </div>
        )}

        <div className="mt-5">
          {loading && results.length === 0 && !reading && <LoadingTea />}
          {error && <p className="py-8 text-center text-sm text-cocoa">{error}</p>}
          {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
            <p className="py-8 text-center text-sm text-cocoa">No books found. Try the author's name too?</p>
          )}
          {query.trim().length < 2 && !reading && (
            <div className="flex flex-col items-center py-10 text-center text-sm text-cocoa">
              <SleepyCat className="w-32 opacity-90" />
              <p className="mt-3">Take a photo of the cover, scan the barcode, or search by title.</p>
            </div>
          )}

          <ul className={`divide-y divide-sand/70 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            {results.map((r) => {
              const existingId = owned.get(bookKey(r)) ?? (r.isbn13 ? owned.get(r.isbn13) : undefined);
              return (
                <li key={(r.googleId ?? r.olKey) + r.title}>
                  <button onClick={() => setPicked(r)} className="flex w-full gap-4 py-3 text-left">
                    <Cover book={r} className="w-14 shrink-0" rounded="rounded" />
                    <div className="min-w-0 flex-1">
                      <p className="leading-snug font-medium">{r.title}</p>
                      <p className="text-sm text-cocoa">{r.authors.join(', ')}</p>
                      <p className="mt-0.5 text-xs text-mocha">
                        {[
                          r.series && `${r.series.name}${r.series.number ? ` #${r.series.number}` : ''}`,
                          r.publishedDate?.slice(0, 4),
                          r.language?.toUpperCase(),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {existingId && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-blush px-2 py-0.5 text-xs text-wine">
                          <CheckIcon width={12} height={12} /> Already in your library
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {scanning && <BarcodeScanner onResult={onBarcode} onClose={() => setScanning(false)} />}

      <AnimatePresence>
        {picked && (
          <AddSheet
            result={picked}
            existingId={owned.get(bookKey(picked)) ?? (picked.isbn13 ? owned.get(picked.isbn13) : undefined)}
            onClose={() => setPicked(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function LoadingTea({ text = 'Looking through the shelves…' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center py-10 text-sm text-cocoa">
      <svg viewBox="0 0 64 64" className="h-16 w-16">
        {[22, 32, 42].map((x, i) => (
          <motion.path
            key={x}
            d={`M${x} 26c-3-4 3-6 0-10`}
            stroke="#A08A78"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            animate={{ opacity: [0, 1, 0], y: [4, -2, -6] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
        <path d="M12 30h40v8a16 16 0 0 1-16 16h-8a16 16 0 0 1-16-16z" fill="#7A2E3A" />
        <path d="M52 34h3a5 5 0 0 1 0 10h-4" stroke="#7A2E3A" strokeWidth="3" fill="none" />
      </svg>
      <p className="mt-2">{text}</p>
    </div>
  );
}

function AddSheet({
  result,
  existingId,
  onClose,
}: {
  result: SearchResult;
  existingId?: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('owned');
  const [language, setLanguage] = useState<Lang>(result.language ?? 'en');
  const [special, setSpecial] = useState(false);
  const [editionCover, setEditionCover] = useState<string | undefined>();
  const [pickingEdition, setPickingEdition] = useState(false);
  // Most books added as "read" were finished a while ago; only "this year" counts in this year's stats
  const [finished, setFinished] = useState<'this' | 'earlier'>('earlier');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    setSaving(true);
    const { source: _s, language: _l, ...data } = result;
    const description =
      data.description ?? (data.olKey ? await fetchOpenLibraryDescription(data.olKey) : undefined);
    const now = Date.now();
    const book = await saveBook({
      ...data,
      description,
      id: newId(),
      status,
      language,
      specialEdition: special,
      customCover: special ? editionCover : undefined,
      tags: [],
      addedAt: now,
      updatedAt: now,
      startedAt: status === 'reading' ? now : undefined,
      finishedAt: status === 'read' && finished === 'this' ? now : undefined,
    });
    if (!book.series) void lookupSeries(book); // fills in the series in the background
    navigate(status === 'read' ? `/book/${book.id}?rate=1` : `/book/${book.id}`, { replace: true });
  };

  return createPortal(
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="pb-safe fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-[1.75rem] bg-cream shadow-2xl md:bottom-8 md:rounded-[1.75rem]"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-sand md:hidden" />
        <div className="space-y-5 p-5">
          <div className="flex gap-4">
            <Cover book={{ ...result, customCover: special ? editionCover : undefined }} className="w-20 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-xl leading-snug font-semibold">{result.title}</h2>
              <p className="text-sm text-cocoa">{result.authors.join(', ')}</p>
              {result.series && (
                <p className="mt-1 text-xs text-mocha">
                  {result.series.name}
                  {result.series.number ? ` #${result.series.number}` : ''}
                </p>
              )}
            </div>
          </div>

          {existingId && (
            <div className="rounded-2xl bg-blush px-4 py-3 text-sm text-wine">
              This one is already in your library.{' '}
              <button className="font-medium underline" onClick={() => navigate(`/book/${existingId}`, { replace: true })}>
                Open it
              </button>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs tracking-wide text-mocha uppercase">Where does it go?</p>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatus(s.id)}
                  className={`rounded-2xl border px-3 py-3 text-sm transition-all ${
                    status === s.id ? 'border-wine bg-white font-medium text-wine shadow-[var(--shadow-soft)]' : 'border-sand text-cocoa'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs tracking-wide text-mocha uppercase">My copy is in</p>
            <Segmented
              value={language}
              onChange={setLanguage}
              options={[
                { id: 'en', label: '🇬🇧 English' },
                { id: 'nl', label: '🇳🇱 Dutch' },
              ]}
            />
          </div>

          {status === 'read' && (
            <div>
              <p className="mb-2 text-xs tracking-wide text-mocha uppercase">Finished</p>
              <Segmented
                value={finished}
                onChange={setFinished}
                options={[
                  { id: 'this', label: `In ${new Date().getFullYear()}` },
                  { id: 'earlier', label: 'Earlier' },
                ]}
              />
            </div>
          )}

          {status !== 'wishlist' && (
            <div className="space-y-2">
              <Toggle
                checked={special}
                onChange={(on) => {
                  setSpecial(on);
                  if (on && !editionCover) setPickingEdition(true);
                }}
                label="✦ Special edition"
              />
              {special && (
                <button className="text-sm text-wine underline" onClick={() => setPickingEdition(true)}>
                  {editionCover ? 'Change edition cover' : 'Choose my edition’s cover'}
                </button>
              )}
            </div>
          )}
          {pickingEdition && (
            <EditionPicker
              book={result}
              onClose={() => setPickingEdition(false)}
              onPick={(cover) => {
                setEditionCover(cover);
                setPickingEdition(false);
              }}
            />
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="soft" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={add} disabled={saving} className="flex-[2]">
              {saving ? 'Adding…' : 'Add to library'}
            </Button>
          </div>
        </div>
      </motion.div>
    </>,
    document.body,
  );
}
