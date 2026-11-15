import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import type { Book } from '../types';
import { Button, Card } from './ui';
import { ConfirmSheet } from './ConfirmSheet';
import { useKeyboardLift } from '../lib/keyboard';
import { ago, dateLabel, lendBook, returnBook, useLending } from '../lib/lending';

/** On the book page: lend it to someone, or see who has it and mark it as back */
export function LendCard({ book }: { book: Book }) {
  const [sheet, setSheet] = useState(false);
  const [back, setBack] = useState(false);
  const lent = book.lent;
  return (
    <Card className="space-y-3">
      <p className="text-xs tracking-wide text-mocha uppercase">Lending</p>
      {lent ? (
        <>
          <p className="text-sm">
            📦 Lent to <span className="font-semibold">{lent.to}</span>{' '}
            <span className="text-cocoa">· {ago(lent.since)}</span>
          </p>
          <div className="flex gap-2">
            <Button className="flex-1 py-2.5" onClick={() => setBack(true)}>
              Got it back ✓
            </Button>
            <Button variant="soft" className="py-2.5" onClick={() => setSheet(true)}>
              Change
            </Button>
          </div>
        </>
      ) : (
        <Button variant="soft" className="w-full py-2.5" onClick={() => setSheet(true)}>
          Lent it to someone
        </Button>
      )}
      {(book.loans?.length ?? 0) > 0 && (
        <p className="text-xs text-mocha">
          Lent before: {book.loans!.map((l) => `${l.to} (${dateLabel(l.since)})`).join(', ')}
        </p>
      )}
      <AnimatePresence>{sheet && <LendSheet book={book} onClose={() => setSheet(false)} />}</AnimatePresence>
      {back && (
        <ConfirmSheet
          title={`Is ${book.title} back?`}
          confirmLabel="Yes, it's back"
          cancelLabel="Not yet"
          onCancel={() => setBack(false)}
          onConfirm={async () => {
            await returnBook(book);
            setBack(false);
          }}
        >
          It was lent to {lent?.to}. You can put it back on loan afterwards under “Earlier loans” on the Lent out page.
        </ConfirmSheet>
      )}
    </Card>
  );
}

const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function LendSheet({ book, onClose }: { book: Book; onClose: () => void }) {
  const lift = useKeyboardLift();
  const { names } = useLending();
  const [to, setTo] = useState(book.lent?.to ?? '');
  const [date, setDate] = useState(book.lent ? inputOf(book.lent.since) : todayInput());
  const save = async () => {
    if (!to.trim()) return;
    const [y, m, d] = date.split('-').map(Number);
    await lendBook(book, to, new Date(y, m - 1, d, 12).getTime());
    onClose();
  };
  return createPortal(
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-ink/35 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        style={lift}
        className="pb-safe fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-[1.75rem] bg-cream px-6 pt-6 pb-6 shadow-2xl md:top-[15%] md:bottom-auto md:rounded-[1.75rem]"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <p className="text-center text-3xl">📦</p>
        <h2 className="mt-1 text-center text-2xl font-semibold">Who has {book.title}?</h2>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="Name"
          autoComplete="off"
          maxLength={40}
          className="mt-5 w-full rounded-2xl border border-sand bg-white/80 px-4 py-3"
        />
        {names.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {names.slice(0, 8).map((n) => (
              <button
                key={n}
                onClick={() => setTo(n)}
                className={`rounded-full px-3 py-1 text-xs ${to === n ? 'bg-wine text-cream' : 'bg-linen text-cocoa'}`}
              >
                {n}
              </button>
            ))}
          </div>
        )}
        <label className="mt-4 block text-xs text-cocoa">
          Lent on
          <input
            type="date"
            value={date}
            max={todayInput()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="mt-1 block w-full rounded-2xl border border-sand bg-white/80 px-4 py-3"
          />
        </label>
        <div className="mt-5 flex gap-3">
          <Button variant="soft" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={!to.trim()} onClick={() => void save()}>
            Save
          </Button>
        </div>
      </motion.div>
    </>,
    document.body,
  );
}

const inputOf = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
