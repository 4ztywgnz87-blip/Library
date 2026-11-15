import { useState } from 'react';
import { useBooks } from '../lib/hooks';
import { updateProfile, useProfile } from '../lib/profile';
import { autoAuthors } from '../lib/authors';
import { GENRES } from '../types';
import { Card, PageHeader } from '../components/ui';
import { CloseIcon } from '../components/Icons';

const same = (a: string, b: string) =>
  a.toLowerCase().replace(/[^a-z]/g, '') === b.toLowerCase().replace(/[^a-z]/g, '');

/** One list of the authors Snug keeps an eye out for (her favourites and the ones it follows by itself), and her genres */
export default function AuthorsGenres() {
  return (
    <div>
      <PageHeader back title="Authors & genres" />
      <div className="mx-auto max-w-xl space-y-4 px-4 pb-10">
        <AuthorsCard />
        <GenresCard />
      </div>
    </div>
  );
}

function AuthorsCard() {
  const books = useBooks();
  const profile = useProfile();
  const [name, setName] = useState('');
  const favs = profile.favouriteAuthors;
  const muted = profile.mutedAuthors ?? [];
  const auto = autoAuthors(books ?? []);
  const reasonOf = (n: string) => auto.find((a) => same(a.name, n))?.reason;
  const isFav = (n: string) => favs.some((f) => same(f, n));
  const isMuted = (n: string) => muted.some((m) => same(m, n));

  // favourites first (in her order), then the ones Snug follows by itself
  const rows = [
    ...favs.map((n) => ({ name: n, fav: true })),
    ...auto.filter((a) => !isFav(a.name) && !isMuted(a.name)).map((a) => ({ name: a.name, fav: false })),
  ];
  const stopped = auto.filter((a) => isMuted(a.name) && !isFav(a.name));

  const add = () => {
    const n = name.trim();
    if (!n) return;
    void updateProfile({
      favouriteAuthors: isFav(n) ? favs : [...favs, n],
      mutedAuthors: muted.filter((m) => !same(m, n)),
    });
    setName('');
  };

  return (
    <Card className="space-y-3">
      <p className="text-xs tracking-wide text-mocha uppercase">Authors</p>
      <p className="text-sm text-cocoa">
        Snug keeps an eye out for their new books. It follows your favourites, and by itself the authors you have more
        than one book of, or one book you rated 4.5★ or higher.
      </p>
      <ul className="divide-y divide-linen">
        {rows.map((r) => {
          const reason = reasonOf(r.name);
          return (
            <li key={r.name} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{r.name}</span>
                <span className="block text-xs text-mocha">
                  {r.fav ? `Favourite${reason ? ` · ${reason}` : ''}` : `Followed by Snug · ${reason}`}
                </span>
              </span>
              {r.fav ? (
                <span className="px-1.5 text-lg text-[#e0a85a]" aria-label="Favourite">
                  ★
                </span>
              ) : (
                <button
                  className="rounded-full bg-linen px-3 py-1.5 text-xs"
                  onClick={() => updateProfile({ favouriteAuthors: [...favs, r.name] })}
                >
                  ☆ Favourite
                </button>
              )}
              <button
                aria-label={`Stop following ${r.name}`}
                className="rounded-full p-1.5 text-mocha hover:bg-sand"
                onClick={() =>
                  updateProfile({
                    favouriteAuthors: favs.filter((f) => !same(f, r.name)),
                    // an author Snug would follow anyway is muted, so it really stops
                    mutedAuthors: reason ? [...muted, r.name] : muted,
                  })
                }
              >
                <CloseIcon width={16} height={16} />
              </button>
            </li>
          );
        })}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add an author"
          className="min-w-0 flex-1 rounded-xl border border-sand bg-white px-3 py-2.5 outline-none focus:border-oat"
        />
        <button
          type="submit"
          className="rounded-xl bg-linen px-4 text-sm font-medium hover:bg-sand"
          disabled={!name.trim()}
        >
          Add
        </button>
      </form>
      {stopped.length > 0 && (
        <p className="text-xs text-mocha">
          Not following:{' '}
          {stopped.map((a, i) => (
            <span key={a.name}>
              {i > 0 && ', '}
              {a.name}{' '}
              <button
                className="underline"
                onClick={() => updateProfile({ mutedAuthors: muted.filter((m) => !same(m, a.name)) })}
              >
                follow again
              </button>
            </span>
          ))}
        </p>
      )}
    </Card>
  );
}

function GenresCard() {
  const profile = useProfile();
  const custom = profile.customGenres ?? [];
  const [name, setName] = useState('');
  const all = [...GENRES, ...custom] as string[];
  const add = () => {
    const n = name.trim();
    if (!n || all.some((g) => g.toLowerCase() === n.toLowerCase())) return setName('');
    void updateProfile({ customGenres: [...custom, n.charAt(0).toUpperCase() + n.slice(1)] });
    setName('');
  };
  return (
    <Card className="space-y-3">
      <p className="text-xs tracking-wide text-mocha uppercase">Genres</p>
      <p className="text-sm text-cocoa">The genres you can give a book. Add your own if one is missing.</p>
      <div className="flex flex-wrap gap-2">
        {GENRES.map((g) => (
          <span key={g} className="rounded-full bg-linen px-3 py-1.5 text-sm text-cocoa">
            {g}
          </span>
        ))}
        {custom.map((g) => (
          <span
            key={g}
            className="inline-flex items-center gap-1 rounded-full bg-blush py-1.5 pr-1.5 pl-3 text-sm text-wine"
          >
            {g}
            <button
              aria-label={`Remove ${g}`}
              className="rounded-full p-0.5 hover:bg-white/60"
              onClick={() => updateProfile({ customGenres: custom.filter((x) => x !== g) })}
            >
              <CloseIcon width={14} height={14} />
            </button>
          </span>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a genre"
          className="min-w-0 flex-1 rounded-xl border border-sand bg-white px-3 py-2.5 outline-none focus:border-oat"
        />
        <button
          type="submit"
          className="rounded-xl bg-linen px-4 text-sm font-medium hover:bg-sand"
          disabled={!name.trim()}
        >
          Add
        </button>
      </form>
    </Card>
  );
}
