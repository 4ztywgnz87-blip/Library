import { useState } from 'react';
import { updateProfile, useProfile } from '../lib/profile';
import { Card } from './ui';
import { CloseIcon } from './Icons';

export function FavouriteAuthorsCard() {
  const profile = useProfile();
  const [name, setName] = useState('');
  const authors = profile.favouriteAuthors;

  const add = () => {
    const n = name.trim();
    if (!n || authors.some((a) => a.toLowerCase() === n.toLowerCase())) return;
    void updateProfile({ favouriteAuthors: [...authors, n] });
    setName('');
  };

  return (
    <Card className="space-y-3">
      <p className="text-xs tracking-wide text-mocha uppercase">Favourite authors</p>
      <p className="text-sm text-cocoa">Snug keeps an eye out for their new books. Authors you love are added automatically too.</p>
      <div className="flex flex-wrap gap-2">
        {authors.map((a) => (
          <span key={a} className="inline-flex items-center gap-1 rounded-full bg-linen py-1.5 pr-1.5 pl-3 text-sm">
            {a}
            <button
              aria-label={`Remove ${a}`}
              className="rounded-full p-0.5 text-mocha hover:bg-sand"
              onClick={() => updateProfile({ favouriteAuthors: authors.filter((x) => x !== a) })}
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
          placeholder="Add an author"
          className="min-w-0 flex-1 rounded-xl border border-sand bg-white px-3 py-2.5 text-[16px] outline-none focus:border-oat"
        />
        <button type="submit" className="rounded-xl bg-linen px-4 text-sm font-medium hover:bg-sand" disabled={!name.trim()}>
          Add
        </button>
      </form>
    </Card>
  );
}
