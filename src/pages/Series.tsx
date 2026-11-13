import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useBooks } from '../lib/hooks';
import { groupSeries, seriesEntries, seriesPath, upcomingParts, type SeriesGroup } from '../lib/series';
import { authorNews, type AuthorNews } from '../lib/authors';
import { normalize } from '../lib/library';
import { seriesInfo } from '../lib/ai';
import { quickAdd } from '../lib/quickAdd';
import { sameBook, searchBooks } from '../lib/bookSearch';
import type { SeriesBook } from '../shared';
import { STATUSES } from '../types';
import { Cover } from '../components/Cover';
import { StarsDisplay } from '../components/Stars';
import { Button, Card, PageHeader } from '../components/ui';
import { EmptyState } from '../components/SleepyCat';
import { ChevronIcon } from '../components/Icons';

/** Little row of covers with a progress line, used in lists */
export function SeriesCard({ group }: { group: SeriesGroup }) {
  return (
    <Link to={seriesPath(group.name)} className="block min-w-0">
      <Card className="flex items-center gap-4 transition-transform active:scale-[0.99]">
        {/* A little fanned stack of the first covers */}
        <div className="relative h-[4.5rem] w-16 shrink-0">
          {group.books.slice(0, 3).map((b, i) => (
            <div
              key={b.id}
              className="absolute top-0 left-0 w-12"
              style={{ zIndex: 10 - i, transform: `translateX(${i * 7}px) rotate(${i * 4}deg)`, transformOrigin: 'bottom left' }}
            >
              <Cover book={b} rounded="rounded" />
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-soft text-lg leading-tight font-semibold">{group.name}</p>
          <p className="truncate text-xs text-mocha">{group.author}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand">
            <div
              className="h-full rounded-full bg-wine"
              style={{ width: `${(group.read / Math.max(group.books.length + group.missing.length, 1)) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-cocoa">
            {group.read} of {group.books.length + group.missing.length} read
            {group.missing.length > 0 && <span className="text-wine"> · missing #{group.missing.join(', #')}</span>}
          </p>
        </div>
        <ChevronIcon className="shrink-0 text-mocha" width={18} height={18} />
      </Card>
    </Link>
  );
}

export function SeriesList() {
  const books = useBooks();
  const groups = useMemo(() => groupSeries(books ?? []), [books]);
  if (!books) return null;
  return (
    <div>
      <PageHeader back title="My series" />
      <div className="mx-auto max-w-3xl space-y-3 px-4 pb-8">
        {groups.length === 0 ? (
          <EmptyState title="No series yet">
            Books that are part of a series show up here, with the parts you still miss.
          </EmptyState>
        ) : (
          groups.map((g) => <SeriesCard key={g.name} group={g} />)
        )}
      </div>
    </div>
  );
}

export function SeriesDetail() {
  const { name = '' } = useParams();
  const books = useBooks();
  const navigate = useNavigate();
  const group = useMemo(
    () => groupSeries(books ?? []).find((g) => normalize(g.name) === normalize(decodeURIComponent(name))),
    [books, name],
  );
  const [known, setKnown] = useState<SeriesBook[]>([]);
  const [mock, setMock] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);

  // Announced books by the author, to add upcoming parts ("Coming …") that aren't listed yet
  const [news, setNews] = useState<AuthorNews[]>([]);
  useEffect(() => {
    if (group?.author) authorNews(group.author).then(setNews).catch(() => {});
  }, [group?.author]);

  // Full list of the series: from Open Library (free) when we know the series there,
  // otherwise from Snug's AI (which also knows announced books)
  const seriesKey = group?.books.find((b) => b.series?.key)?.series?.key;
  useEffect(() => {
    if (!group) return;
    let cancelled = false;
    (async () => {
      // no link to Open Library's series yet: look it up via one of her books
      let key = seriesKey;
      for (const b of key ? [] : group.books.slice(0, 3)) {
        const params = new URLSearchParams({ title: b.title, author: b.authors[0] ?? '' });
        type Found = { key?: string; name?: string };
        const found: Found = await fetch(`/api/book-series?${params}`)
          .then((r) => (r.ok ? (r.json() as Promise<Found>) : {}))
          .catch(() => ({}));
        if (found.key && found.name && normalize(found.name) === normalize(group.name)) {
          key = found.key;
          break;
        }
      }
      if (key) {
        const res = await fetch(`/api/series-books?key=${key}`).catch(() => undefined);
        const list = res?.ok ? ((await res.json()) as { books: SeriesBook[] }).books : [];
        if (list.length && !cancelled) {
          setKnown(list);
          setMock(false);
          return;
        }
      }
      const r = await seriesInfo(group.name, group.author).catch(() => undefined);
      if (r && !cancelled) {
        setKnown(r.books);
        setMock(r.mock);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [group?.name, group?.author, seriesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!books) return null;
  if (!group) {
    return (
      <div>
        <PageHeader back title="Series" />
        <EmptyState title="Series not found" />
      </div>
    );
  }

  const entries = seriesEntries(group, [...known, ...upcomingParts(group, known, news)]);

  return (
    <div>
      <PageHeader back title="" />
      <div className="mx-auto max-w-3xl px-4 pb-10">
        <h1 className="text-3xl leading-tight font-semibold">{group.name}</h1>
        <p className="mt-1 text-cocoa">{group.author}</p>
        <p className="mt-3 text-sm text-cocoa">
          {group.read} read · {group.books.filter((b) => b.status === 'owned').length} waiting on your shelf
          {entries.some((e) => e.kind === 'missing') && (
            <> · {entries.filter((e) => e.kind === 'missing').length} not in your library</>
          )}
        </p>

        <ol className="mt-6 space-y-3">
          {entries.map((e, i) => (
            <motion.li
              key={e.kind === 'mine' ? e.book.id : `m${e.number}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              {e.kind === 'mine' ? (
                <Link to={`/book/${e.book.id}`}>
                  <Card className="flex items-center gap-4 py-3">
                    <span className="w-6 text-center font-soft text-lg text-mocha">{e.number ?? '·'}</span>
                    <Cover book={e.book} className="w-12 shrink-0" rounded="rounded" />
                    <div className="min-w-0 flex-1">
                      <p className="leading-snug font-medium">{e.book.title}</p>
                      <p className="mt-0.5 text-xs text-cocoa">
                        {STATUSES.find((s) => s.id === e.book.status)?.label}
                        {e.book.language === 'nl' ? ' · 🇳🇱' : ''}
                      </p>
                      {e.book.rating !== undefined && <StarsDisplay value={e.book.rating} size={12} />}
                    </div>
                    {e.book.status === 'read' && <span className="text-lg text-sage">✓</span>}
                  </Card>
                </Link>
              ) : (
                <div className="flex items-center gap-4 rounded-[var(--radius-card)] border-2 border-dashed border-sand px-4 py-3">
                  <span className="w-6 text-center font-soft text-lg text-mocha">{e.number}</span>
                  <MissingCover title={e.title} author={group.author} coverUrl={e.coverUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="leading-snug font-medium text-cocoa">{e.title ?? `Book ${e.number}`}</p>
                    <p className="text-xs text-wine">
                      {e.announced
                        ? `Coming soon${e.releaseDate ? ` · ${formatRelease(e.releaseDate)}` : ''}`
                        : 'Not in your library'}
                    </p>
                  </div>
                  <Button
                    variant="soft"
                    className="shrink-0 px-3 py-2 text-xs"
                    disabled={adding === e.number}
                    onClick={async () => {
                      if (!e.title) {
                        navigate(`/add?q=${encodeURIComponent(`${group.name} ${group.author}`)}`);
                        return;
                      }
                      setAdding(e.number);
                      await quickAdd(e.title, group.author, 'wishlist', {
                        series: { name: group.name, number: e.number },
                        coverUrl: e.coverUrl,
                      });
                      setAdding(null);
                    }}
                  >
                    {adding === e.number ? 'Adding…' : e.title ? '+ Wishlist' : 'Find it'}
                  </Button>
                </div>
              )}
            </motion.li>
          ))}
        </ol>

        {mock && (
          <p className="mt-6 text-center text-xs text-mocha">
            Test mode: Snug shows gaps in your numbering. With the AI on, it also knows every book in the series and
            new announcements.
          </p>
        )}
      </div>
    </div>
  );
}

function formatRelease(d: string) {
  if (/^\d{4}$/.test(d)) return d; // only the year is known
  const t = Date.parse(d.length === 7 ? `${d}-01` : d);
  if (Number.isNaN(t)) return d;
  return new Date(t).toLocaleDateString('en-GB', d.length === 7 ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Cover of a part she doesn't have: from the series data, or looked up (exactly this book only) */
function MissingCover({ title, author, coverUrl }: { title?: string; author: string; coverUrl?: string }) {
  const [cover, setCover] = useState(coverUrl);
  useEffect(() => {
    setCover(coverUrl);
    if (coverUrl || !title || !navigator.onLine) return;
    let cancelled = false;
    searchBooks(`${title} ${author}`)
      .then((r) => {
        const match = sameBook(r, title, author).find((x) => x.coverUrl && x.language !== undefined && ['en', 'nl'].includes(x.language));
        if (!cancelled && match) setCover(match.coverUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [title, author, coverUrl]);

  if (!title) {
    return (
      <div className="flex aspect-[2/3] w-12 shrink-0 items-center justify-center rounded bg-linen text-lg text-mocha">?</div>
    );
  }
  // slightly faded: she doesn't have it (yet)
  return <Cover book={{ title, authors: [author], coverUrl: cover }} className="w-12 shrink-0 opacity-80" rounded="rounded" />;
}
