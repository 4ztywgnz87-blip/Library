import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, setMeta } from '../db';
import { useMeta } from '../lib/hooks';
import { syncNow } from '../lib/sync';
import { Button, Card, PageHeader } from '../components/ui';

export default function Profile() {
  const savedName = useMeta<string>('readerName', '');
  const lastSync = useMeta<number>('lastSync', 0);
  const pending = useLiveQuery(() => db.books.where('dirty').equals(1).count(), []) ?? 0;
  const [name, setName] = useState(savedName);
  const [syncing, setSyncing] = useState(false);
  useEffect(() => setName(savedName), [savedName]);

  return (
    <div>
      <PageHeader title="Me" />
      <div className="mx-auto max-w-xl space-y-4 px-4">
        <Card>
          <label className="mb-2 block text-xs tracking-wide text-mocha uppercase" htmlFor="name">
            What should Snug call you?
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setMeta('readerName', name.trim())}
            placeholder="Your name"
            className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-[16px] outline-none focus:border-oat"
          />
        </Card>

        <Card className="opacity-70">
          <p className="font-soft text-lg">Reader quiz</p>
          <p className="mt-1 text-sm text-cocoa">
            Favourite tropes, spice level, moods… so the tips really fit you. Coming soon, and you'll be able to
            retake it whenever your taste changes.
          </p>
        </Card>

        <Card className="space-y-3">
          <p className="text-xs tracking-wide text-mocha uppercase">Sync</p>
          <p className="text-sm text-cocoa">
            {pending > 0
              ? `${pending} change${pending > 1 ? 's' : ''} waiting to sync`
              : 'Everything is saved on all your devices.'}
            {lastSync > 0 && (
              <span className="block text-xs text-mocha">Last sync: {new Date(lastSync).toLocaleString()}</span>
            )}
          </p>
          <Button
            variant="soft"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              await syncNow();
              setSyncing(false);
            }}
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </Button>
        </Card>

        <div className="pt-4 text-center">
          <p className="font-soft text-sm text-mocha">Snug · made with love 🤎</p>
        </div>
      </div>
    </div>
  );
}
