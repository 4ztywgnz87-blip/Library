import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { searchBooks } from '../lib/bookSearch';
import { bookKey, findExisting, normalize } from '../lib/library';
import { quickAdd } from '../lib/quickAdd';
import type { Book } from '../types';
import { Cover } from './Cover';
import { Button } from './ui';
import { CloseIcon } from './Icons';

export interface PreviewBook {
  title: string;
  author: string;
  coverUrl?: string;
  publishedDate?: string;
  upcoming?: boolean;
  description?: string;
  series?: { name: string; number?: number };
  isbn13?: string;
}

function when(d?: string, upcoming?: boolean) {
  if (!d) return undefined;
  if (d.length === 4) return upcoming ? `Coming in ${d}` : `Published ${d}`;
  const t = Date.parse(d.length === 7 ? `${d}-01` : d);
  if (Number.isNaN(t)) return d;
  const date = new Date(t).toLocaleDateString('en-GB', d.length === 7 ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' });
  return t > Date.now() ? `Coming ${date}` : `Published ${date}`;
}

/** Details of a book she doesn't have yet, with "+ Wishlist" */
export function BookPreview({ book, onClose }: { book: PreviewBook; onClose: () => void }) {
  const [details, setDetails] = useState(book);
  const [owned, setOwned] = useState<Book | undefined>();
  const [added, setAdded] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    findExisting({ title: book.title, authors: [book.author] }).then(setOwned);
    if (book.description && book.coverUrl) return;
    // Fill in the blurb (and a cover) from the book search
    searchBooks(`${book.title} ${book.author}`)
      .then((r) => {
        // Only trust results that are really this book (same title and author)
        const surname = normalize(book.author).split(' ').pop() ?? '';
        const same = r.filter(
          (x) =>
            (bookKey(x) === bookKey({ title: book.title, authors: [book.author] }) ||
              normalize(x.title).startsWith(normalize(book.title))) &&
            normalize(x.authors.join(' ')).includes(surname),
        );
        const match = same.find((x) => x.description) ?? same[0];
        if (match)
          setDetails((d) => ({
            ...d,
            description: d.description ?? match.description,
            coverUrl: d.coverUrl ?? match.coverUrl,
            series: d.series ?? match.series,
          }));
      })
      .catch(() => {});
  }, [book]);

  return createPortal(
    <>
      <motion.div className="fixed inset-0 z-40 bg-ink/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        className="pb-safe fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88dvh] max-w-lg flex-col rounded-t-[1.75rem] bg-cream shadow-2xl md:bottom-8 md:rounded-[1.75rem]"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="flex justify-end px-3 pt-3">
          <button onClick={onClose} className="rounded-full p-2 text-cocoa hover:bg-linen" aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          <div className="flex gap-4">
            <Cover book={{ title: details.title, authors: [details.author], coverUrl: details.coverUrl }} className="w-28 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-2xl leading-tight font-semibold">{details.title}</h2>
              <p className="mt-1 text-cocoa">{details.author}</p>
              {details.series && (
                <p className="mt-1 text-sm text-mocha">
                  {details.series.name}
                  {details.series.number ? ` · book ${details.series.number}` : ''}
                </p>
              )}
              {when(details.publishedDate, details.upcoming) && (
                <p className="mt-2 inline-block rounded-full bg-gold/15 px-3 py-1 text-xs text-[#8a6a3a]">
                  {when(details.publishedDate, details.upcoming)}
                </p>
              )}
            </div>
          </div>
          {details.description ? (
            <div className="mt-5">
              <p className={`text-sm leading-relaxed text-ink/90 ${open ? '' : 'line-clamp-6'}`}>{details.description}</p>
              {details.description.length > 320 && (
                <button className="mt-1 text-sm text-wine" onClick={() => setOpen(!open)}>
                  {open ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          ) : (
            <p className="mt-5 text-sm text-mocha">No description found yet.</p>
          )}
        </div>
        <div className="border-t border-sand/70 p-4">
          {owned ? (
            <Link to={`/book/${owned.id}`} onClick={onClose} className="block text-center text-sm text-wine">
              Already in your library · open it
            </Link>
          ) : (
            <Button
              className="w-full py-3.5"
              disabled={added}
              onClick={async () => {
                setAdded(true);
                await quickAdd(details.title, details.author, 'wishlist', {
                  coverUrl: details.coverUrl,
                  series: details.series,
                  isbn13: details.isbn13,
                  description: details.description,
                });
              }}
            >
              {added ? 'On your wishlist ✓' : '+ Add to wishlist'}
            </Button>
          )}
        </div>
      </motion.div>
    </>,
    document.body,
  );
}
