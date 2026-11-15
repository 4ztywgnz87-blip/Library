import { useState } from 'react';
import { useBooks } from '../lib/hooks';
import { updateProfile, useProfile } from '../lib/profile';
import { autoAuthors } from '../lib/authors';
import { GENRES } from '../types';
import { FavouriteAuthorsCard } from '../components/FavouriteAuthors';
import { Card, PageHeader } from '../components/ui';
import { CloseIcon } from '../components/Icons';

const same = (a: string, b: string) =>
  a.toLowerCase().replace(/[^a-z]/g, '') === b.toLowerCase().replace(/[^a-z]/g, '');

/** Authors Snug keeps an eye out for (her favourites plus the ones it follows by itself), and her genre list */
export default function AuthorsGenres() {
  const books = useBooks();
  const profile = useProfile();
  const muted = profile.mutedAuthors ?? [];
  const auto = autoAuthors(books ?? []).filter((a) => !profile.favouriteAuthors.some((f) => same(f, a.name)));
  const following = auto.filter((a) => !muted.some((m) => same(m, a.name)));
  const hidden = auto.filter((a) => muted.some((m) => same(m, a.name)));

  return (
    <div>
      <PageHeader back title="Authors & genres" />
      <div className="mx-auto max-w-xl space-y-4 px-4 pb-10">
        <FavouriteAuthorsCard />

        <Card className="space-y-3">
          <p className="text-xs tracking-wide text-mocha uppercase">Snug also follows</p>
          <p className="text-sm text-cocoa">
            Authors you have more than one book of, or one book you rated 4.5★ or higher. Their new books show up under
            “New from your authors”.
          </p>
          {following.length === 0 ? (
            <p className="text-sm text-mocha">Nobody yet. Add books and rate them, and they appear here.</p>
          ) : (
            <ul className="divide-y divide-linen">
              {following.map((a) => (
                <li key={a.name} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.name}</span>
                    <span className="block truncate text-xs text-mocha">{a.reason}</span>
                  </span>
                  <button
                    className="rounded-full bg-linen px-3 py-1.5 text-xs"
                    onClick={() => updateProfile({ favouriteAuthors: [...profile.favouriteAuthors, a.name] })}
                  >
                    Make favourite
                  </button>
                  <button
                    aria-label={`Stop following ${a.name}`}
                    className="rounded-full p-1.5 text-mocha hover:bg-sand"
                    onClick={() => updateProfile({ mutedAuthors: [...muted, a.name] })}
                  >
                    <CloseIcon width={16} height={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {hidden.length > 0 && (
            <p className="text-xs text-mocha">
              Not following:{' '}
              {hidden.map((a, i) => (
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

        <GenresCard />
      </div>
    </div>
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
