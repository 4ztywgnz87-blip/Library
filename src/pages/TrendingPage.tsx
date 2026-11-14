import { useMemo, useState } from 'react';
import { useBooks, useMeta } from '../lib/hooks';
import { setMeta } from '../db';
import { useTrending } from '../lib/discover';
import { BookPreview, type PreviewBook } from '../components/BookPreview';
import { DiscoverRow, YoursBadge } from '../components/Discover';
import { trendingPreview } from '../components/Trending';
import { Chip, PageHeader, Segmented, Toggle } from '../components/ui';
import { useHistoryModal } from '../lib/modal';

type Sort = 'popular' | 'match';

/** All of this week's trending books, to filter and sort */
export default function TrendingPage() {
  const books = useBooks();
  const data = useTrending(books);
  const hideMine = useMeta<boolean>('trendingHideOwned', false);
  const [sort, setSort] = useState<Sort>('popular');
  const [genre, setGenre] = useState<string | null>(null);
  const preview = useHistoryModal<PreviewBook>('book');

  const genres = useMemo(() => {
    const count = new Map<string, number>();
    for (const t of data?.books ?? []) for (const g of t.genres) count.set(g, (count.get(g) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
  }, [data]);

  const list = (data?.books ?? [])
    .filter((t) => (!hideMine || !t.have) && (!genre || t.genres.includes(genre)))
    .sort((a, b) =>
      sort === 'match' ? (a.have ? 1 : 0) - (b.have ? 1 : 0) || b.score - a.score || a.rank - b.rank : a.rank - b.rank,
    );

  return (
    <div>
      <PageHeader back title="Trending now 🔥" />
      <div className="mx-auto max-w-3xl px-4 pb-10">
        <p className="text-sm text-cocoa">
          What's popular this week on bestseller lists, BookTok and Goodreads, with how well each fits you.
          {data?.updatedAt && (
            <span className="text-mocha">
              {' '}
              Updated {new Date(data.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}.
            </span>
          )}
        </p>

        <div className="mt-4 space-y-3">
          <Segmented
            value={sort}
            onChange={setSort}
            options={[
              { id: 'popular', label: 'Most popular' },
              { id: 'match', label: 'Best match for me' },
            ]}
          />
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            <Chip active={!genre} onClick={() => setGenre(null)}>
              All genres
            </Chip>
            {genres.map((g) => (
              <Chip key={g} active={genre === g} onClick={() => setGenre(genre === g ? null : g)}>
                {g}
              </Chip>
            ))}
          </div>
          <Toggle
            checked={hideMine}
            onChange={(v) => void setMeta('trendingHideOwned', v)}
            label="Hide books I already have"
          />
        </div>

        {data === undefined ? (
          <p className="py-12 text-center text-sm text-cocoa">Looking at what everyone's reading…</p>
        ) : data === null ? (
          <p className="py-12 text-center text-sm text-cocoa">
            The trending list isn't available right now. Try again later.
          </p>
        ) : list.length === 0 ? (
          <p className="py-12 text-center text-sm text-cocoa">Nothing here with these filters.</p>
        ) : (
          <div className="mt-2 divide-y divide-sand/70">
            {list.map((t) => (
              <DiscoverRow
                key={`${t.title}|${t.author}`}
                lead={<span className="w-5 shrink-0 pt-1 text-right font-soft text-sm text-mocha">{t.rank}</span>}
                item={{
                  title: t.title,
                  author: t.author,
                  note: `🔥 ${t.buzz}`,
                  score: t.have ? undefined : t.score,
                  badge: t.have ? <YoursBadge /> : undefined,
                }}
                why={t.have ? (t.have === 'read' ? 'You already read this one.' : 'Already on your shelf.') : t.why}
                onOpen={(cover) => preview.open(trendingPreview(t, cover))}
              />
            ))}
          </div>
        )}
      </div>
      {preview.item && <BookPreview book={preview.item} onClose={preview.close} />}
    </div>
  );
}
