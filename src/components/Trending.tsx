import { useEffect, useState } from 'react';
import type { Book } from '../types';
import type { TrendingBook, TrendingResponse } from '../shared';
import { trending } from '../lib/ai';
import { sameBook, searchBooks } from '../lib/bookSearch';
import { bookKey } from '../lib/library';
import { useMeta } from '../lib/hooks';
import { setMeta } from '../db';
import { Cover } from './Cover';
import { MatchRing } from './MatchRing';
import { BookPreview, type PreviewBook } from './BookPreview';
import { useHistoryModal } from '../lib/modal';

/** "Trending now": what's popular this week (bestseller lists, BookTok, Goodreads), scored for her */
export function TrendingSection({ books }: { books: Book[] }) {
  const [data, setData] = useState<TrendingResponse | null | undefined>(undefined);
  const hideOwned = useMeta<boolean>('trendingHideOwned', true);
  const [sortByMatch, setSortByMatch] = useState(false);
  const preview = useHistoryModal<PreviewBook>('book');

  useEffect(() => {
    let alive = true;
    trending().then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, []);

  if (data === null || (data && !data.books.length)) return null; // offline the first time, or no list

  const have = new Set(books.map((b) => bookKey(b)));
  const owned = (t: TrendingBook) => have.has(bookKey({ title: t.title, authors: [t.author] }));
  const list = (data?.books ?? [])
    .filter((t) => !hideOwned || !owned(t))
    .sort((a, b) => (sortByMatch ? b.score - a.score : 0));

  return (
    <section>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="text-xl">Trending now 🔥</h2>
        {data && (
          <button className="text-xs whitespace-nowrap text-wine" onClick={() => setSortByMatch(!sortByMatch)}>
            {sortByMatch ? 'Most popular first' : 'Best match first'}
          </button>
        )}
      </div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-mocha">Popular this week · with how well each fits you</p>
        {data && (
          <label className="flex shrink-0 items-center gap-1.5 text-xs text-cocoa">
            <input
              type="checkbox"
              checked={hideOwned}
              onChange={(e) => void setMeta('trendingHideOwned', e.target.checked)}
              className="accent-wine"
            />
            Hide mine
          </label>
        )}
      </div>
      {data === undefined ? (
        // first visit of the week: a few soft placeholders while the list loads
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-hidden px-4 pb-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-28 shrink-0">
              <div className="aspect-[2/3] animate-pulse rounded-md bg-sand/70" />
              <div className="mt-2 h-3 w-24 animate-pulse rounded-full bg-sand/70" />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="pb-4 text-sm text-cocoa">You already have everything that's trending. Impressive! ✨</p>
      ) : (
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-4">
          {list.map((t) => (
            <TrendingCard
              key={bookKey({ title: t.title, authors: [t.author] })}
              book={t}
              owned={owned(t)}
              onOpen={preview.open}
            />
          ))}
        </div>
      )}
      {preview.item && <BookPreview book={preview.item} onClose={preview.close} />}
    </section>
  );
}

function TrendingCard({
  book,
  owned,
  onOpen,
}: {
  book: TrendingBook;
  owned: boolean;
  onOpen: (b: PreviewBook) => void;
}) {
  const [cover, setCover] = useState<string | undefined>();

  useEffect(() => {
    let alive = true;
    searchBooks(`${book.title} ${book.author}`)
      .then((r) => alive && setCover(sameBook(r, book.title, book.author).find((x) => x.coverUrl)?.coverUrl))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [book.title, book.author]);

  return (
    <button
      className="w-28 shrink-0 text-left active:scale-[0.97]"
      onClick={() =>
        onOpen({
          title: book.title,
          author: book.author,
          coverUrl: cover,
          match: { score: book.score, why: book.why, buzz: book.buzz },
        })
      }
    >
      <div className="relative">
        <Cover book={{ title: book.title, authors: [book.author], coverUrl: cover }} />
        <span className="absolute -right-1.5 -bottom-1.5 rounded-full bg-cream p-0.5 shadow">
          <MatchRing score={book.score} size={34} />
        </span>
        {owned && (
          <span className="absolute top-1.5 left-1.5 rounded-full bg-sage px-2 py-0.5 text-[0.6rem] font-medium text-white shadow">
            Yours
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-snug font-medium text-ink">{book.title}</p>
      <p className="truncate text-[0.7rem] text-mocha">{book.author}</p>
      <p className="mt-0.5 line-clamp-2 text-[0.65rem] leading-tight text-cocoa">{book.buzz}</p>
    </button>
  );
}
