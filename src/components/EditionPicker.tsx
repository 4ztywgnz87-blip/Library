import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import type { Book } from '../types';
import { googleBooks } from '../lib/bookSearch';
import { CameraIcon, CloseIcon, PhotosIcon } from './Icons';
import { PhotoInput } from './PhotoInput';
import { CoverCropper } from './CoverCropper';

interface Option {
  thumb: string;
  full: string;
  label?: string;
}

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
const BUNDLE = /\b(collection|box ?set|boxed set|books? \d|bundle|omnibus|\d[- ]book)\b/i;

/** "The Love Hypothesis: A Novel" is the same book; "Love on the Brain" or a box set is not */
function sameTitle(found: string, wanted: string) {
  if (BUNDLE.test(found)) return false;
  const a = norm(found);
  const b = norm(wanted);
  return !!b && (a.startsWith(b) || b.startsWith(a)) && a.length > 2;
}

async function googleCovers(title: string, author: string): Promise<Option[]> {
  const res = await googleBooks(
    new URLSearchParams({
      q: `intitle:"${title}" inauthor:"${author}"`,
      maxResults: '40',
      printType: 'books',
    }),
  ).catch(() => undefined);
  if (!res) return [];
  const json = (await res.json()) as {
    items?: {
      volumeInfo: {
        title?: string;
        imageLinks?: { thumbnail?: string };
        publisher?: string;
        publishedDate?: string;
        language?: string;
      };
    }[];
  };
  return (
    (json.items ?? [])
      // English and Dutch editions of this very book (Google also returns her other books)
      .filter(
        (i) =>
          i.volumeInfo.imageLinks?.thumbnail &&
          ['en', 'nl'].includes(i.volumeInfo.language ?? '') &&
          sameTitle(i.volumeInfo.title ?? '', title),
      )
      .map((i) => {
        const base = i.volumeInfo.imageLinks!.thumbnail!.replace(/^http:/, 'https:').replace('&edge=curl', '');
        return {
          thumb: `${base}&fife=w300`,
          full: `${base}&fife=w800`,
          label: [i.volumeInfo.publisher, i.volumeInfo.publishedDate?.slice(0, 4)].filter(Boolean).join(' · '),
        };
      })
  );
}

async function openLibraryCovers(title: string, author: string): Promise<Option[]> {
  const res = await fetch(`/api/editions?${new URLSearchParams({ title, author })}`);
  if (!res.ok) return [];
  const { covers } = (await res.json()) as {
    covers: { id: number; label: string }[];
  };
  return covers.map((c) => ({
    thumb: `https://covers.openlibrary.org/b/id/${c.id}-M.jpg?default=false`,
    full: `https://covers.openlibrary.org/b/id/${c.id}-L.jpg`,
    label: c.label,
  }));
}

/** Pick the cover of her own (special) edition from all editions found online, or take a photo */
export function EditionPicker({
  book,
  onPick,
  onClose,
}: {
  book: Pick<Book, 'title' | 'authors'>;
  onPick: (cover: string) => void;
  onClose: () => void;
}) {
  const [options, setOptions] = useState<Option[] | null>(null);
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const [photo, setPhoto] = useState<File | null>(null);

  useEffect(() => {
    const author = book.authors[0] ?? '';
    Promise.all([
      googleCovers(book.title, author).catch(() => []),
      openLibraryCovers(book.title, author).catch(() => []),
    ]).then(([g, ol]) => {
      const seen = new Set<string>();
      setOptions([...g, ...ol].filter((o) => (seen.has(o.thumb) ? false : (seen.add(o.thumb), true))));
    });
  }, [book.title, book.authors]);

  const visible = (options ?? []).filter((o) => !broken.has(o.thumb));

  return createPortal(
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-ink/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        className="pb-safe fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] max-w-2xl flex-col rounded-t-[1.75rem] bg-cream shadow-2xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div>
            <h2 className="text-xl font-semibold">Which edition do you have?</h2>
            <p className="text-xs text-cocoa">Covers of every edition we could find online</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-cocoa hover:bg-linen" aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {options === null && <p className="pb-3 text-center text-sm text-cocoa">Looking for editions…</p>}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {visible.map((o) => (
              <button key={o.thumb} onClick={() => onPick(o.full)} className="text-left active:scale-95">
                <div className="aspect-[2/3] overflow-hidden rounded-md bg-sand shadow-[var(--shadow-book)]">
                  <img
                    src={o.thumb}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={() => setBroken((s) => new Set(s).add(o.thumb))}
                    onLoad={(e) => {
                      // Open Library sometimes returns a tiny placeholder
                      if (e.currentTarget.naturalWidth < 20) setBroken((s) => new Set(s).add(o.thumb));
                    }}
                  />
                </div>
                {o.label && <p className="mt-1 line-clamp-2 text-[0.65rem] leading-tight text-mocha">{o.label}</p>}
              </button>
            ))}
            {/* Her own photo: the book is found, cut out and straightened */}
            <PhotoInput
              camera
              onFile={setPhoto}
              className="flex aspect-[2/3] flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-oat text-center text-xs text-cocoa"
            >
              <CameraIcon />
              Not here?
              <br />
              Take a photo
            </PhotoInput>
            <PhotoInput
              onFile={setPhoto}
              className="flex aspect-[2/3] flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-oat text-center text-xs text-cocoa"
            >
              <PhotosIcon />
              Pick from
              <br />
              your photos
            </PhotoInput>
          </div>
          {options !== null && visible.length === 0 && (
            <p className="mt-4 text-center text-sm text-cocoa">
              No other editions found online. A photo works too: Snug cuts out just the book.
            </p>
          )}
        </div>
      </motion.div>
      {photo && <CoverCropper file={photo} onCancel={() => setPhoto(null)} onDone={(cover) => onPick(cover)} />}
    </>,
    document.body,
  );
}
