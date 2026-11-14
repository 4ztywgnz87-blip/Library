import { Link } from 'react-router-dom';
import type { Book } from '../types';
import type { AuthorNews } from '../lib/authors';
import { profileKey } from '../taste/vocab';
import { useMatches, type Match } from '../lib/taste';
import { keyOf, useAuthorNews, useHave } from '../lib/discover';
import { BookPreview, type PreviewBook } from './BookPreview';
import { DiscoverCard, SoonBadge, formatDate } from './Discover';
import { useHistoryModal } from '../lib/modal';

export const newsPreview = (i: AuthorNews, cover?: string, s?: Match): PreviewBook => ({
  title: i.title,
  author: i.author,
  coverUrl: cover ?? i.coverUrl,
  publishedDate: i.publishedDate,
  upcoming: i.upcoming,
  description: i.description,
  series: i.series,
  isbn13: i.isbn13,
  match: s ? { score: s.score, why: s.why, headsUp: s.headsUp } : undefined,
});

/** The news list both Home and the full page use, with match scores for what she doesn't have */
export function useScoredNews(books: Book[] | undefined, favourites: string[]) {
  const items = useAuthorNews(books, favourites);
  const have = useHave(books);
  const toScore = (items ?? []).filter((i) => !have.has(keyOf(i))).slice(0, 30);
  const matches = useMatches(
    toScore.map((i) => ({
      title: i.title,
      author: i.author,
      description: i.description,
      genres: i.genres,
      series: i.series,
    })),
  );
  // keyed like the rest of the news list
  const scores = new Map<string, Match>();
  for (const i of toScore) {
    const m = matches.get(profileKey(i.title, i.author));
    if (m) scores.set(keyOf(i), m);
  }
  return { items, have, scores };
}

/** "New from your authors": recent and upcoming books by the authors she follows */
export function AuthorNewsSection({ books, favourites }: { books: Book[]; favourites: string[] }) {
  const { items, have, scores } = useScoredNews(books, favourites);
  const preview = useHistoryModal<PreviewBook>('book');
  const fresh = (items ?? [])
    .filter(
      (i) =>
        !have.has(keyOf(i)) && !books.some((b) => keyOf({ title: b.title, author: b.authors[0] ?? '' }) === keyOf(i)),
    )
    .slice(0, 12);
  if (fresh.length === 0) return null;

  return (
    <section>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <Link to="/new-books">
          <h2 className="text-xl">New from your authors</h2>
        </Link>
        <Link to="/new-books" className="text-sm whitespace-nowrap text-wine">
          See all
        </Link>
      </div>
      <p className="mb-3 text-xs text-mocha">Recently out or coming soon</p>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-4">
        {fresh.map((i) => {
          const s = scores.get(keyOf(i));
          return (
            <DiscoverCard
              key={keyOf(i)}
              item={{
                title: i.title,
                author: i.author,
                coverUrl: i.coverUrl,
                note: formatDate(i.publishedDate),
                score: s?.score,
                badge: i.upcoming ? <SoonBadge /> : undefined,
              }}
              onOpen={(cover) => preview.open(newsPreview(i, cover, s))}
            />
          );
        })}
      </div>
      {preview.item && <BookPreview book={preview.item} onClose={preview.close} />}
    </section>
  );
}
