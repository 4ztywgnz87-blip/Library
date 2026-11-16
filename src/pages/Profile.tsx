import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useMeta } from '../lib/hooks';
import { syncNow } from '../lib/sync';
import { Card } from '../components/ui';
import { useLending } from '../lib/lending';
import { Link } from 'react-router-dom';
import { aiStatus, setAiPause } from '../lib/ai';
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

        <LentLink />

        <Link to="/authors" className="block">
          <Card className="flex items-center gap-3">
            <span className="text-2xl">✍️</span>
            <div className="flex-1">
              <p className="font-soft text-lg">Authors & genres</p>
              <p className="text-sm text-cocoa">Who Snug keeps an eye out for, and your own genres.</p>
            </div>
          </Card>
        </Link>

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

        <AiPauseCard />

        <Card className="space-y-2">
          <p className="text-xs tracking-wide text-mocha uppercase">Backup</p>
          <p className="text-sm text-cocoa">
            Your library is saved online automatically. Want a copy for yourself? Download everything as a file.
          </p>
          <button
            className="rounded-full bg-linen px-4 py-2.5 text-sm font-medium hover:bg-sand"
            onClick={async () => {
              const books = await db.books.filter((b) => !b.deleted).toArray();
              const data = {
                exportedAt: new Date().toISOString(),
                profile: profileForName,
                books: books.map(({ dirty: _d, ...b }) => b),
              };
              const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
              const a = document.createElement('a');
              a.href = url;
              a.download = `snug-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download backup
          </button>
        </Card>

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

/** "Lent out": how many books are out on loan right now */
function LentLink() {
  const { out } = useLending();
  return (
    <Link to="/lent" className="block">
      <Card className="flex items-center gap-3">
        <span className="text-2xl">📦</span>
        <div className="flex-1">
          <p className="font-soft text-lg">Lent out</p>
          <p className="text-sm text-cocoa">
            {out.length
              ? `${out.length} book${out.length === 1 ? ' is' : 's are'} out on loan.`
              : 'Who has which book?'}
          </p>
        </div>
      </Card>
    </Link>
  );
}

/** Adding lots of books at once? Pause the automatic AI work, then switch it on again afterwards */
const PAUSED_KEY = 'snug.aiPaused';
const lastKnown = () => {
  try {
    return localStorage.getItem(PAUSED_KEY) === '1';
  } catch {
    return false;
  }
};

function AiPauseCard() {
  // shown straight away with the last known setting, so the page doesn't jump when the answer
  // comes in; the switch works once the server has answered
  const [paused, setPausedState] = useState(lastKnown);
  const [known, setKnown] = useState(false);
  const setPaused = (v: boolean) => {
    setPausedState(v);
    try {
      localStorage.setItem(PAUSED_KEY, v ? '1' : '0');
    } catch {
      // no storage: it just loads again next time
    }
  };
  useEffect(() => {
    void aiStatus().then((s) => {
      if (!s) return;
      setPaused(!!s.paused);
      setKnown(true);
    });
  }, []);
  return (
    <Card className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-soft text-lg">Adding lots of books?</p>
        <p className="text-sm text-cocoa">
          {paused
            ? 'AI is paused: new books aren’t analysed or looked up for now. Switch it off when you’re done and Snug catches up.'
            : 'Pause the automatic AI work (scores, series look-ups) while you add a lot of books at once.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={paused}
        aria-label="Pause AI"
        disabled={!known}
        onClick={async () => setPaused(await setAiPause(!paused))}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${paused ? 'bg-wine' : 'bg-sand'}`}
      >
        <span
          className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${paused ? 'translate-x-5' : ''}`}
        />
      </button>
    </Card>
  );
}
