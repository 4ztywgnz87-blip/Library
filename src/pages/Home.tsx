import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useBooks, useMeta } from '../lib/hooks';
import { Cover } from '../components/Cover';
import { Card } from '../components/ui';
import { SparkleIcon, ChevronIcon } from '../components/Icons';
import { EmptyState } from '../components/SleepyCat';
import { AuthorNewsSection } from '../components/AuthorNews';
import { SeriesCard } from './Series';
import { groupSeries } from '../lib/series';
import { useProfile } from '../lib/profile';

/** Greeting + a little emoji that fits the time of day */
function greeting(): [string, string] {
  const h = new Date().getHours();
  if (h < 5) return ['Still up reading', '🌙'];
  if (h < 12) return ['Good morning', '☕'];
  if (h < 17) return ['Good afternoon', '🫖'];
  if (h < 22) return ['Good evening', '🕯️'];
  return ['Good night', '🌙'];
}

export default function Home() {
  const books = useBooks();
  const oldName = useMeta<string>('readerName', '');
  const profile = useProfile();
  const name = profile.name ?? oldName;
  if (!books) return null;

  const reading = books.filter((b) => b.status === 'reading');
  const year = new Date().getFullYear();
  const readThisYear = books.filter(
    (b) => b.status === 'read' && b.finishedAt && new Date(b.finishedAt).getFullYear() === year,
  ).length;
  const unread = books.filter((b) => b.status === 'owned').length;
  const recent = [...books].sort((a, b) => b.addedAt - a.addedAt).slice(0, 12);
  // Series worth a nudge: something missing, or the next part is waiting on the shelf
  const series = groupSeries(books);
  // Series she's busy with (or still has parts of to read), the ones she's furthest in first
  const seriesToShow = series
    .filter((g) => g.read < g.books.length + g.missing.length)
    .sort((a, b) => b.read / (b.books.length + b.missing.length) - a.read / (a.books.length + a.missing.length))
    .slice(0, 3);

  return (
    <div className="pt-safe mx-auto max-w-5xl px-4">
      <header className="pt-8 pb-6">
        <h1 className="text-4xl leading-tight font-semibold">
          {greeting()[0]}
          {name ? `, ${name}` : ''} <span className="inline-block">{greeting()[1]}</span>
        </h1>
      </header>

      {books.length === 0 ? (
        <EmptyState title="Your library is still empty">
          Tap the <span className="font-medium text-wine">+</span> below to add your first book.
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {/* Currently reading */}
          <section>
            <h2 className="mb-3 text-xl">Currently reading</h2>
            {reading.length === 0 ? (
              <Card className="text-sm text-cocoa">
                Nothing on the go. Pick something from{' '}
                <Link to="/library?tab=owned" className="text-wine underline">
                  your shelf
                </Link>
                .
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {reading.map((b) => (
                  <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <Link to={`/book/${b.id}`}>
                      <Card className="flex gap-4 transition-transform active:scale-[0.99]">
                        <Cover book={b} className="w-24 shrink-0" />
                        <div className="flex min-w-0 flex-col py-1">
                          <h3 className="text-lg leading-snug font-semibold">{b.title}</h3>
                          <p className="text-sm text-cocoa">{b.authors.join(', ')}</p>
                          {b.series && (
                            <p className="mt-1 text-xs text-mocha">
                              {b.series.name}
                              {b.series.number ? ` · #${b.series.number}` : ''}
                            </p>
                          )}
                          <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-wine">
                            Finished it? Rate it <ChevronIcon width={16} height={16} />
                          </span>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* What's next */}
          <section className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <Link
              to="/next"
              className="relative block overflow-hidden rounded-[var(--radius-card)] bg-wine p-5 text-cream shadow-[var(--shadow-soft)] transition-transform active:scale-[0.99]"
            >
              <SparkleIcon className="absolute -top-2 -right-2 h-24 w-24 opacity-15" />
              <h2 className="text-2xl">What's next?</h2>
              <p className="mt-1 max-w-sm text-sm opacity-85">
                Three handpicked tips, from your own shelf or for your next bookshop visit.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-cream/15 px-3 py-1 text-sm">
                Find my next read <ChevronIcon width={16} height={16} />
              </span>
            </Link>
            <Link to="/shop">
              <Card className="flex h-full items-center gap-3 sm:flex-col sm:items-start sm:justify-center">
                <span className="text-3xl">🛍️</span>
                <div>
                  <p className="font-soft text-lg leading-tight font-semibold">In a bookshop?</p>
                  <p className="text-xs text-cocoa">Do I have it? Will I like it?</p>
                </div>
              </Card>
            </Link>
          </section>

          {!profile.completedAt && (
            <Link to="/quiz" className="block">
              <Card className="flex items-center gap-3 bg-blush/60">
                <span className="text-2xl">💌</span>
                <p className="flex-1 text-sm text-wine">
                  <span className="font-medium">Take the 2-minute reader quiz</span> so Snug's tips really fit you.
                </p>
                <ChevronIcon className="text-wine" width={18} height={18} />
              </Card>
            </Link>
          )}

          {/* Little stats */}
          <Link to="/stats" className="grid grid-cols-3 gap-3" aria-label="See my reading stats">
            {[
              { n: readThisYear, label: `read in ${year}` },
              { n: unread, label: 'waiting on the shelf' },
              { n: books.filter((b) => b.status === 'wishlist').length, label: 'on the wishlist' },
            ].map((s) => (
              <Card key={s.label} className="text-center">
                <div className="font-soft text-3xl font-semibold text-wine">{s.n}</div>
                <div className="mt-1 text-xs leading-tight text-cocoa">{s.label}</div>
              </Card>
            ))}
          </Link>

          {/* Series */}
          {seriesToShow.length > 0 && (
            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-xl">Your series</h2>
                <Link to="/series" className="text-sm text-wine">
                  All {series.length}
                </Link>
              </div>
              {/* grid-cols-1 = minmax(0, 1fr): long series names get "…" instead of stretching the card */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {seriesToShow.map((g) => (
                  <SeriesCard key={g.name} group={g} />
                ))}
              </div>
            </section>
          )}

          <AuthorNewsSection books={books} favourites={profile.favouriteAuthors} />

          {/* Recently added */}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-xl">Recently added</h2>
              <Link to="/library" className="text-sm text-wine">
                See all
              </Link>
            </div>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-4">
              {recent.map((b) => (
                <Link key={b.id} to={`/book/${b.id}`} className="w-24 shrink-0 sm:w-28">
                  <Cover book={b} />
                  <p className="mt-2 line-clamp-2 text-xs leading-snug text-cocoa">{b.title}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
