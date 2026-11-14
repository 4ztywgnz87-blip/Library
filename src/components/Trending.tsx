import { Link } from 'react-router-dom';
import type { Book } from '../types';
import type { TrendingBook } from '../shared';
import { useTrending } from '../lib/discover';
import { BookPreview, type PreviewBook } from './BookPreview';
import { DiscoverCard, YoursBadge } from './Discover';
import { useHistoryModal } from '../lib/modal';

export const trendingPreview = (t: TrendingBook, cover?: string): PreviewBook => ({
  title: t.title,
  author: t.author,
  coverUrl: cover,
  match: t.have ? undefined : { score: t.score, why: t.why, buzz: t.buzz, headsUp: t.headsUp },
  buzz: t.buzz,
});

/** Home: the top 10 of what's popular this week, scored for her */
export function TrendingSection({ books }: { books: Book[] }) {
  const data = useTrending(books);
  const preview = useHistoryModal<PreviewBook>('book');
  if (data === null || (data && !data.books.length)) return null;
  const top = [...(data?.books ?? [])].sort((a, b) => a.rank - b.rank).slice(0, 10);

  return (
    <section>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <Link to="/trending">
          <h2 className="text-xl">Trending now 🔥</h2>
        </Link>
        <Link to="/trending" className="text-sm whitespace-nowrap text-wine">
          See all
        </Link>
      </div>
      <p className="mb-3 text-xs text-mocha">Popular this week · with how well each fits you</p>
      {data === undefined ? (
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-hidden px-4 pb-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-28 shrink-0">
              <div className="aspect-[2/3] animate-pulse rounded-md bg-sand/70" />
              <div className="mt-2 h-3 w-24 animate-pulse rounded-full bg-sand/70" />
            </div>
          ))}
        </div>
      ) : (
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-4">
          {top.map((t) => (
            <DiscoverCard
              key={`${t.title}|${t.author}`}
              item={{
                title: t.title,
                author: t.author,
                note: t.buzz,
                score: t.have ? undefined : t.score,
                badge: t.have ? <YoursBadge /> : undefined,
              }}
              onOpen={(cover) => preview.open(trendingPreview(t, cover))}
            />
          ))}
        </div>
      )}
      {preview.item && <BookPreview book={preview.item} onClose={preview.close} />}
    </section>
  );
}
