import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Book } from '../types';
import { authorNews, followedAuthors, type AuthorNews } from '../lib/authors';
import { bookKey } from '../lib/library';
import { quickAdd } from '../lib/quickAdd';
import { Cover } from './Cover';
import { BookPreview, type PreviewBook } from './BookPreview';
import { useHistoryModal } from '../lib/modal';

/** "New from your authors": recent and upcoming books by the authors she follows */
export function AuthorNewsSection({ books, favourites }: { books: Book[]; favourites: string[] }) {
  const [items, setItems] = useState<AuthorNews[] | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const preview = useHistoryModal<PreviewBook>('book');
  const authors = followedAuthors(books, favourites).slice(0, 10);
  const authorsKey = authors.join('|');

  useEffect(() => {
    if (!navigator.onLine) return;
    let cancelled = false;
    Promise.all(authors.map((a) => authorNews(a).catch(() => [])))
      .then((lists) => {
        if (!cancelled) setItems(lists.flat().sort((a, b) => b.publishedDate.localeCompare(a.publishedDate)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authorsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const have = new Set(books.map((b) => bookKey(b)));
  const fresh = (items ?? []).filter((i) => !have.has(bookKey({ title: i.title, authors: [i.author] }))).slice(0, 12);
  if (fresh.length === 0) return null;

  return (
    <section>
      <h2 className="mb-1 text-xl">New from your authors</h2>
      <p className="mb-3 text-xs text-mocha">Recently out or coming soon</p>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-4">
        {fresh.map((i) => {
          const k = bookKey({ title: i.title, authors: [i.author] });
          return (
            <div key={k} className="w-28 shrink-0">
              <button
                className="block w-full text-left active:scale-[0.97]"
                onClick={() =>
                  preview.open({
                    title: i.title,
                    author: i.author,
                    coverUrl: i.coverUrl,
                    publishedDate: i.publishedDate,
                    upcoming: i.upcoming,
                    description: i.description,
                    series: i.series,
                    isbn13: i.isbn13,
                  })
                }
              >
              <div className="relative">
                <Cover book={{ title: i.title, authors: [i.author], coverUrl: i.coverUrl }} />
                {i.upcoming && (
                  <span className="absolute right-1.5 bottom-1.5 rounded-full bg-gold px-2 py-0.5 text-[0.6rem] font-medium text-white shadow">
                    Soon
                  </span>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-snug font-medium text-ink">{i.title}</p>
              <p className="truncate text-[0.7rem] text-mocha">
                {i.author} · {formatDate(i.publishedDate)}
              </p>
              </button>
              <button
                className="mt-1 text-xs font-medium text-wine disabled:text-sage"
                disabled={added.has(k)}
                onClick={async () => {
                  setAdded((s) => new Set(s).add(k));
                  const book = await quickAdd(i.title, i.author, 'wishlist', {
                    coverUrl: i.coverUrl,
                    series: i.series,
                    isbn13: i.isbn13,
                  });
                  if (!book) navigate('/add');
                }}
              >
                {added.has(k) ? 'On your wishlist ✓' : '+ Wishlist'}
              </button>
            </div>
          );
        })}
      </div>
      {preview.item && <BookPreview book={preview.item} onClose={preview.close} />}
    </section>
  );
}

function formatDate(d: string) {
  if (d.length === 4) return d;
  const t = Date.parse(d.length === 7 ? `${d}-01` : d);
  return Number.isNaN(t) ? d : new Date(t).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}
