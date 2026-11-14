import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useBooks, useMeta } from '../lib/hooks';
import { setMeta } from '../db';
import { STATUSES, type Book, type Status } from '../types';
import { Cover } from '../components/Cover';
import { StarsDisplay } from '../components/Stars';
import { Chip } from '../components/ui';
import { FilterIcon, SearchIcon, CloseIcon } from '../components/Icons';
import { EmptyState } from '../components/SleepyCat';
import { normalize, shelfOrder } from '../lib/library';

type Sort = 'added' | 'title' | 'author' | 'rating' | 'series';

const SORTS: { id: Sort; label: string }[] = [
  { id: 'added', label: 'Recently added' },
  { id: 'series', label: 'Series together' },
  { id: 'title', label: 'Title' },
  { id: 'author', label: 'Author' },
  { id: 'rating', label: 'Rating' },
];

function sortBooks(list: Book[], sort: Sort) {
  const l = [...list];
  switch (sort) {
    case 'added':
      return l.sort((a, b) => b.addedAt - a.addedAt);
    case 'title':
      return l.sort((a, b) => a.title.localeCompare(b.title));
    case 'author':
      return l.sort((a, b) => (a.authors[0] ?? '').localeCompare(b.authors[0] ?? '') || shelfOrder(a, b));
    case 'rating':
      return l.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    case 'series':
      return l.sort(shelfOrder);
  }
}

export default function Library() {
  const books = useBooks();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Status | 'all') || 'all';
  // from the stats: only the books she finished in this year
  const year = Number(params.get('year')) || undefined;
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState<string | null>(null);
  const [lang, setLang] = useState<'all' | 'en' | 'nl'>('all');
  // The chosen sort order is remembered on this device
  const savedSort = useMeta<Sort | null>('librarySort', null);
  const sort: Sort = savedSort ?? (tab === 'read' ? 'rating' : 'added');
  const setSort = (s: Sort) => void setMeta('librarySort', s);
  const [showFilters, setShowFilters] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: books?.length ?? 0 };
    for (const b of books ?? []) c[b.status] = (c[b.status] ?? 0) + 1;
    return c;
  }, [books]);

  const genres = useMemo(() => {
    const s = new Set<string>();
    for (const b of books ?? []) b.genres.forEach((g) => s.add(g));
    return [...s].sort();
  }, [books]);

  const visible = useMemo(() => {
    if (!books) return [];
    const q = normalize(query);
    const filtered = books.filter(
      (b) =>
        (tab === 'all' || b.status === tab) &&
        (!year || (b.status === 'read' && !!b.finishedAt && new Date(b.finishedAt).getFullYear() === year)) &&
        (!genre || b.genres.includes(genre)) &&
        (lang === 'all' || b.language === lang) &&
        (!q || normalize([b.title, ...b.authors, b.series?.name ?? ''].join(' ')).includes(q)),
    );
    return sortBooks(filtered, sort);
  }, [books, tab, year, query, genre, lang, sort]);

  const filtersActive = !!genre || lang !== 'all';

  return (
    <div>
      <div className="pt-safe" />
      <div className="mx-auto max-w-5xl px-4 pt-4">
        {/* Search + filters */}
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-mocha" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, author or series"
              className="w-full rounded-full border border-sand bg-white/70 py-3 pr-10 pl-11 text-[16px] outline-none placeholder:text-mocha focus:border-oat focus:bg-white"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-mocha">
                <CloseIcon width={18} height={18} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((f) => !f)}
            className={`relative shrink-0 rounded-full border p-3 ${
              showFilters ? 'border-wine bg-white text-wine' : 'border-sand bg-white/70 text-cocoa'
            }`}
            aria-label="Filters"
          >
            <FilterIcon width={20} height={20} />
            {filtersActive && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-wine" />}
          </button>
        </div>

        {/* Status tabs */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-3">
          <Chip active={tab === 'all'} onClick={() => setParams({})}>
            All <span className="opacity-60">{counts.all}</span>
          </Chip>
          {STATUSES.map((s) => (
            <Chip key={s.id} active={tab === s.id} onClick={() => setParams({ tab: s.id })}>
              {s.short} <span className="opacity-60">{counts[s.id] ?? 0}</span>
            </Chip>
          ))}
        </div>

        {year && (
          <div className="-mt-1 mb-3">
            <button
              onClick={() => setParams({ tab: 'read' })}
              className="inline-flex items-center gap-1.5 rounded-full bg-wine px-3 py-1.5 text-xs text-cream"
            >
              Finished in {year} · {visible.length} <CloseIcon width={14} height={14} />
            </button>
          </div>
        )}

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mb-4 space-y-3 rounded-[var(--radius-card)] bg-white/60 p-4">
                <div>
                  <p className="mb-2 text-xs tracking-wide text-mocha uppercase">Genre</p>
                  <div className="flex flex-wrap gap-2">
                    <Chip active={!genre} onClick={() => setGenre(null)}>
                      Any
                    </Chip>
                    {genres.map((g) => (
                      <Chip key={g} active={genre === g} onClick={() => setGenre(genre === g ? null : g)}>
                        {g}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs tracking-wide text-mocha uppercase">Language</p>
                  <div className="flex gap-2">
                    {(['all', 'en', 'nl'] as const).map((l) => (
                      <Chip key={l} active={lang === l} onClick={() => setLang(l)}>
                        {l === 'all' ? 'Both' : l === 'en' ? '🇬🇧 English' : '🇳🇱 Dutch'}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs tracking-wide text-mocha uppercase">Sort</p>
                  <div className="flex flex-wrap gap-2">
                    {SORTS.map((s) => (
                      <Chip key={s.id} active={sort === s.id} onClick={() => setSort(s.id)}>
                        {s.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid */}
        {books && visible.length === 0 ? (
          <EmptyState title={books.length ? 'No books found' : 'No books yet'}>
            {books.length ? 'Try another search or filter.' : 'Add your first book with the + button.'}
          </EmptyState>
        ) : (
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 pt-1 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {visible.map((b, i) => (
              <motion.div
                key={b.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
              >
                <Link to={`/book/${b.id}`} className="block transition-transform active:scale-[0.97]">
                  <div className="relative">
                    <Cover book={b} />
                    {b.status === 'reading' && (
                      <span className="absolute top-1.5 left-1.5 rounded-full bg-wine px-2 py-0.5 text-[0.6rem] font-medium text-cream">
                        Reading
                      </span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-snug font-medium text-ink">{b.title}</p>
                  <p className="truncate text-[0.7rem] text-mocha">
                    {b.series?.number ? `#${b.series.number} · ` : ''}
                    {b.authors[0]}
                  </p>
                  {b.rating !== undefined && (
                    <div className="mt-0.5">
                      <StarsDisplay value={b.rating} size={11} />
                    </div>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
