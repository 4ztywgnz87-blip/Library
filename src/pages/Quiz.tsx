import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { updateProfile, useProfileLoaded } from '../lib/profile';
import { MOODS, type ReaderProfile } from '../shared';
import { Button, Chip } from '../components/ui';
import { CloseIcon } from '../components/Icons';
import { SleepyCat } from '../components/SleepyCat';

const TROPES = [
  'Enemies to lovers',
  'Friends to lovers',
  'Slow burn',
  'Grumpy x sunshine',
  'Forced proximity',
  'Fake dating',
  'Second chance',
  'Found family',
  'Morally grey hero',
  'He falls first',
  'Touch her and die',
  'Only one bed',
  'Small town',
  'Forbidden love',
  'Chosen one',
  'Fae & faerie courts',
  'Dragons',
  'Magic academy',
  'Unreliable narrator',
  'Plot twists',
  'Love triangle',
  'Cliffhangers',
  'Dark romance',
  'Insta-love',
  'Miscommunication',
  'Sports romance',
  'Royalty',
  'Villain gets the girl',
];

const SPICE = ['None', 'Closed door', 'A little', 'Warm', 'Spicy', 'Very spicy'];

type Draft = Pick<
  ReaderProfile,
  'lovedTropes' | 'hatedTropes' | 'spice' | 'endings' | 'seriesOrStandalone' | 'length' | 'moods'
>;

function Option({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub?: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-all ${
        active ? 'border-wine bg-white shadow-[var(--shadow-soft)]' : 'border-sand bg-white/50'
      }`}
    >
      <span className={`block font-medium ${active ? 'text-wine' : 'text-ink'}`}>{title}</span>
      {sub && <span className="text-sm text-cocoa">{sub}</span>}
    </button>
  );
}

export default function Quiz() {
  const profile = useProfileLoaded();
  // Start from her saved answers, so a retake only changes what she changes
  return profile ? <QuizSteps profile={profile} /> : null;
}

function QuizSteps({ profile }: { profile: ReaderProfile }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => ({
    lovedTropes: profile.lovedTropes,
    hatedTropes: profile.hatedTropes,
    spice: profile.spice,
    endings: profile.endings,
    seriesOrStandalone: profile.seriesOrStandalone,
    length: profile.length,
    moods: profile.moods,
  }));
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const toggle = (key: 'lovedTropes' | 'hatedTropes' | 'moods', value: string) =>
    setDraft((d) => ({ ...d, [key]: d[key].includes(value) ? d[key].filter((x) => x !== value) : [...d[key], value] }));

  const steps: { title: string; sub?: string; body: React.ReactNode }[] = [
    {
      title: 'Tropes you love',
      sub: 'Pick as many as you like.',
      body: (
        <div className="flex flex-wrap gap-2">
          {TROPES.map((t) => (
            <Chip key={t} active={draft.lovedTropes.includes(t)} onClick={() => toggle('lovedTropes', t)}>
              {t}
            </Chip>
          ))}
        </div>
      ),
    },
    {
      title: 'And the ones that make you roll your eyes',
      sub: 'Snug will steer clear of these.',
      body: (
        <div className="flex flex-wrap gap-2">
          {TROPES.filter((t) => !draft.lovedTropes.includes(t)).map((t) => (
            <Chip key={t} active={draft.hatedTropes.includes(t)} onClick={() => toggle('hatedTropes', t)}>
              {t}
            </Chip>
          ))}
        </div>
      ),
    },
    {
      title: 'How spicy do you like it?',
      body: (
        <div className="flex flex-col items-center gap-5 pt-4">
          <div className="text-4xl tracking-wider" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <motion.span
                key={i}
                className="inline-block"
                animate={{ opacity: i < draft.spice ? 1 : 0.18, scale: i < draft.spice ? 1 : 0.85 }}
              >
                🌶️
              </motion.span>
            ))}
          </div>
          <p className="font-soft text-2xl text-wine">{SPICE[draft.spice]}</p>
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={draft.spice}
            onChange={(e) => set({ spice: Number(e.target.value) })}
            className="w-full accent-[var(--color-wine)]"
            aria-label="Spice level"
          />
        </div>
      ),
    },
    {
      title: 'Endings',
      body: (
        <div className="space-y-2">
          <Option active={draft.endings === 'happy'} onClick={() => set({ endings: 'happy' })} title="Happy ever after, please" sub="I need my HEA" />
          <Option active={draft.endings === 'bittersweet'} onClick={() => set({ endings: 'bittersweet' })} title="Bittersweet is fine" sub="A little heartbreak makes it real" />
          <Option active={draft.endings === 'any'} onClick={() => set({ endings: 'any' })} title="Surprise me" sub="Any ending, as long as it's good" />
        </div>
      ),
    },
    {
      title: 'Series or standalone?',
      body: (
        <div className="space-y-2">
          <Option active={draft.seriesOrStandalone === 'series'} onClick={() => set({ seriesOrStandalone: 'series' })} title="Give me a series" sub="I love getting lost in a world" />
          <Option active={draft.seriesOrStandalone === 'standalone'} onClick={() => set({ seriesOrStandalone: 'standalone' })} title="Standalones" sub="One book, one story" />
          <Option active={draft.seriesOrStandalone === 'both'} onClick={() => set({ seriesOrStandalone: 'both' })} title="Both are great" />
        </div>
      ),
    },
    {
      title: 'Book length',
      body: (
        <div className="space-y-2">
          <Option active={draft.length === 'short'} onClick={() => set({ length: 'short' })} title="Short & sweet" sub="Under 300 pages" />
          <Option active={draft.length === 'medium'} onClick={() => set({ length: 'medium' })} title="Just right" sub="300–450 pages" />
          <Option active={draft.length === 'long'} onClick={() => set({ length: 'long' })} title="Big chunky books" sub="The thicker the better" />
          <Option active={draft.length === 'any'} onClick={() => set({ length: 'any' })} title="Doesn't matter" />
        </div>
      ),
    },
    {
      title: 'Moods you often crave',
      sub: 'Pick a few.',
      body: (
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <Chip key={m.id} active={draft.moods.includes(m.id)} onClick={() => toggle('moods', m.id)}>
              {m.emoji} {m.label}
            </Chip>
          ))}
        </div>
      ),
    },
  ];

  const done = step >= steps.length;
  const finish = async () => {
    await updateProfile({ ...draft, completedAt: Date.now() });
    setStep(steps.length);
  };

  return (
    <div className="pt-safe relative z-10 mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-28">
      <div className="flex items-center gap-3 py-4">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand">
          <motion.div
            className="h-full rounded-full bg-wine"
            animate={{ width: `${(Math.min(step, steps.length) / steps.length) * 100}%` }}
          />
        </div>
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-cocoa hover:bg-linen" aria-label="Close quiz">
          <CloseIcon />
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22 }}
          className="flex-1"
        >
          {done ? (
            <div className="flex flex-col items-center pt-10 text-center">
              <SleepyCat className="w-44" />
              <h1 className="mt-5 text-3xl font-semibold">All set! 📚</h1>
              <p className="mt-2 max-w-xs text-cocoa">
                Snug knows your taste a bit better now. You can retake the quiz any time under Me.
              </p>
              <Button className="mt-8" onClick={() => navigate('/next', { replace: true })}>
                Find my next read
              </Button>
              <button className="mt-3 text-sm text-cocoa underline" onClick={() => navigate('/', { replace: true })}>
                Back home
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs tracking-wide text-mocha uppercase">
                Question {step + 1} of {steps.length}
              </p>
              <h1 className="mt-2 text-3xl leading-tight font-semibold">{steps[step].title}</h1>
              {steps[step].sub && <p className="mt-1 text-cocoa">{steps[step].sub}</p>}
              <div className="mt-6">{steps[step].body}</div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {!done && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-cream via-cream to-transparent pt-6 md:pl-24">
          <div className="mx-auto flex max-w-xl gap-3 px-5 pb-5">
            {step > 0 && (
              <Button variant="soft" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            <Button className="flex-1" onClick={() => (step === steps.length - 1 ? finish() : setStep(step + 1))}>
              {step === steps.length - 1 ? 'Done' : 'Next'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
