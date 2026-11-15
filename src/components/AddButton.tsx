import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PlusIcon } from './Icons';

/**
 * After she adds a book, the + in the menu gives a happy wiggle and throws a few sparkles.
 * The book page hides the menu, so the celebration waits until the + is on screen again.
 */
let waiting = false;
const listeners = new Set<() => void>();

export function celebrateNewBook() {
  waiting = true;
  listeners.forEach((l) => l());
}

export function AddButtonIcon() {
  const [burst, setBurst] = useState(0);
  const [sparkles, setSparkles] = useState(false);
  useEffect(() => {
    if (!burst) return;
    setSparkles(true);
    const t = setTimeout(() => setSparkles(false), 1100);
    return () => clearTimeout(t);
  }, [burst]);
  useEffect(() => {
    const play = () => {
      if (!waiting) return;
      waiting = false;
      // a moment after the screen settles
      setTimeout(() => setBurst((n) => n + 1), 350);
    };
    play();
    listeners.add(play);
    return () => void listeners.delete(play);
  }, []);

  return (
    <span className="relative block">
      <motion.span
        key={burst}
        className="block"
        animate={burst ? { rotate: [0, -16, 14, -10, 6, 0], scale: [1, 1.18, 1.1, 1.05, 1] } : undefined}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      >
        <PlusIcon width={26} height={26} />
      </motion.span>
      <AnimatePresence>
        {sparkles && (
          <motion.span key={burst} className="pointer-events-none absolute inset-0" exit={{ opacity: 0 }}>
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
              return (
                <motion.svg
                  key={i}
                  viewBox="0 0 10 10"
                  className="absolute top-1/2 left-1/2 -mt-1.5 -ml-1.5 h-3 w-3"
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{ x: Math.cos(a) * 34, y: Math.sin(a) * 34, scale: [0, 1.2, 0.6], opacity: [1, 1, 0] }}
                  transition={{ duration: 0.9, delay: 0.1, ease: 'easeOut' }}
                >
                  <path d="M5 0l1.2 3.8L10 5 6.2 6.2 5 10 3.8 6.2 0 5l3.8-1.2z" fill={i % 2 ? '#f1bf6a' : '#e05a73'} />
                </motion.svg>
              );
            })}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
