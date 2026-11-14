import { useMemo, useState } from 'react';
import { useBooks, useMeta } from '../lib/hooks';
import { useProfile } from '../lib/profile';
import { setMeta } from '../db';
import { keyOf } from '../lib/discover';
import { newsPreview, useScoredNews } from '../components/AuthorNews';
import { BookPreview, type PreviewBook } from '../components/BookPreview';
import { DiscoverRow, SoonBadge, YoursBadge, formatDate } from '../components/Discover';
import { Chip, PageHeader, Segmented, Toggle } from '../components/ui';
import { useHistoryModal } from '../lib/modal';

type When = 'all' | 'out' | 'soon';
type Sort = 'newest' | 'soonest' | 'match';

/** Every new and upcoming book by the authors she follows, to filter and sort */
export default function NewBooksPage() {
  const books = useBooks();
  const profile = useProfile();
  const { items, have, scores } = useScoredNews(books, profile.favouriteAuthors);
  const hideMine = useMeta<boolean>('newBooksHideOwned', true);
  const [when, setWhen] = useState<When>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [author, setAuthor] = useState<string | null>(null);
  const preview = useHistoryModal<PreviewBook>('book');

  const authors = useMemo(() => [...new Set((items ?? []).map((i) => i.author))].sort(), [items]);

  const list = (items ?? [])
    .filter(
      (i) =>
        (!hideMine || !have.has(keyOf(i))) &&
        (when === 'all' || (when === 'soon' ? i.upcoming : !i.upcoming)) &&
        (!author || i.author === author),
    )
    .sort((a, b) =>
      sort === 'match'
        ? (scores.get(keyOf(b))?.score ?? -1) - (scores.get(keyOf(a))?.score ?? -1)
        : sort === 'soonest'
          ? Number(b.upcoming) - Number(a.upcoming) || a.publishedDate.localeCompare(b.publishedDate)
          : b.publishedDate.localeCompare(a.publishedDate),
    );

  return (
    <div>
      <PageHeader back title="New from your authors" />
      <div className="mx-auto max-w-3xl px-4 pb-10">
        <p className="text-sm text-cocoa">
          Recent and upcoming books by your favourite authors and the ones you read most.
        </p>

        <div className="mt-4 space-y-3">
          <Segmented
            value={when}
            onChange={setWhen}
            options={[
              { id: 'all', label: 'All' },
              { id: 'out', label: 'Out now' },
              { id: 'soon', label: 'Coming soon' },
            ]}
          />
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {(
              [
                ['newest', 'Newest first'],
                ['soonest', 'Coming soonest'],
                ['match', 'Best match for me'],
              ] as const
            ).map(([id, label]) => (
              <Chip key={id} active={sort === id} onClick={() => setSort(id)}>
                {label}
              </Chip>
            ))}
          </div>
          {authors.length > 1 && (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              <Chip active={!author} onClick={() => setAuthor(null)}>
                All authors
              </Chip>
              {authors.map((a) => (
                <Chip key={a} active={author === a} onClick={() => setAuthor(author === a ? null : a)}>
                  {a}
                </Chip>
              ))}
            </div>
          )}
          <Toggle
            checked={hideMine}
            onChange={(v) => void setMeta('newBooksHideOwned', v)}
            label="Hide books I already have"
          />
        </div>

        {items === undefined ? (
          <p className="py-12 text-center text-sm text-cocoa">Checking what your authors are up to…</p>
        ) : list.length === 0 ? (
          <p className="py-12 text-center text-sm text-cocoa">Nothing here with these filters.</p>
        ) : (
          <div className="mt-2 divide-y divide-sand/70">
            {list.map((i) => {
              const s = scores.get(keyOf(i));
              const mine = have.get(keyOf(i));
              return (
                <DiscoverRow
                  key={keyOf(i)}
                  item={{
                    title: i.title,
                    author: i.author,
                    coverUrl: i.coverUrl,
                    note: [
                      i.upcoming ? `Coming ${formatDate(i.publishedDate)}` : `Out ${formatDate(i.publishedDate)}`,
                      i.series && `${i.series.name}${i.series.number ? ` #${i.series.number}` : ''}`,
                    ]
                      .filter(Boolean)
                      .join(' · '),
                    score: mine ? undefined : s?.score,
                    badge: mine ? <YoursBadge /> : i.upcoming ? <SoonBadge /> : undefined,
                  }}
                  why={mine ? undefined : s?.why}
                  onOpen={(cover) => preview.open(newsPreview(i, cover, mine ? undefined : s))}
                />
              );
            })}
          </div>
        )}
      </div>
      {preview.item && <BookPreview book={preview.item} onClose={preview.close} />}
    </div>
  );
}
