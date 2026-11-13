import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useMeta } from '../lib/hooks';
import { syncNow } from '../lib/sync';
import { Card } from '../components/ui';
import { FavouriteAuthorsCard } from '../components/FavouriteAuthors';
import { Link } from 'react-router-dom';
import { updateProfile, useProfile } from '../lib/profile';

export default function Profile() {
  const oldName = useMeta<string>('readerName', '');
  const pending = useLiveQuery(() => db.books.where('dirty').equals(1).count(), []) ?? 0;
  const profileForName = useProfile();
  const savedName = profileForName.name ?? oldName;
  const [name, setName] = useState(savedName);
  const [syncing, setSyncing] = useState(false);
  const profile = useProfile();
  useEffect(() => setName(savedName), [savedName]);

  return (
    <div>
      <div className="pt-safe h-5" />
      <div className="mx-auto max-w-xl space-y-4 px-4">
        <Card>
          <label className="mb-2 block text-xs tracking-wide text-mocha uppercase" htmlFor="name">
            What should Snug call you?
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => updateProfile({ name: name.trim() })}
            placeholder="Your name"
            className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-[16px] outline-none focus:border-oat"
          />
        </Card>

        <Link to="/stats" className="block">
          <Card className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div className="flex-1">
              <p className="font-soft text-lg">My reading</p>
              <p className="text-sm text-cocoa">Books per month, favourite genres and your year in books.</p>
            </div>
          </Card>
        </Link>

        <FavouriteAuthorsCard />

        <Link to="/quiz" className="block">
          <Card className="flex items-center gap-3">
            <span className="text-2xl">💌</span>
            <div className="flex-1">
              <p className="font-soft text-lg">Reader quiz</p>
              <p className="text-sm text-cocoa">
                {profile.completedAt
                  ? `Done on ${new Date(profile.completedAt).toLocaleDateString('en-GB')}. Taste changed? Retake it.`
                  : 'Favourite tropes, spice level, moods… so the tips really fit you.'}
              </p>
            </div>
            <span className="text-sm font-medium text-wine">{profile.completedAt ? 'Retake' : 'Start'}</span>
          </Card>
        </Link>

        {/* Saving happens by itself; this only shows up if something is still waiting */}
        {pending > 0 && (
          <p className="text-center text-xs text-mocha">
            {pending} change{pending > 1 ? 's' : ''} not saved online yet (no internet?){' '}
            <button
              className="text-wine underline"
              disabled={syncing}
              onClick={async () => {
                setSyncing(true);
                await syncNow();
                setSyncing(false);
              }}
            >
              {syncing ? 'saving…' : 'try again'}
            </button>
          </p>
        )}

        <div className="pt-4 text-center">
          <p className="font-soft text-sm text-mocha">Snug · made with love 🤎</p>
        </div>
      </div>
    </div>
  );
}
