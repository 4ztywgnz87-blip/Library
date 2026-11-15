import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';

/** A book finished: little pages flutter down over the screen, like a book shaken out */
export function PageConfetti({ onDone }: { onDone: () => void }) {
  const pages = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: (i * 37 + Math.random() * 20) % 100,
        size: 14 + Math.random() * 10,
        drift: (Math.random() - 0.5) * 120,
        spin: (Math.random() - 0.5) * 540,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.2,
        tint: ['#fffaf3', '#f6efe6', '#fbe7e7', '#f4ead9'][i % 4],
      })),
    [],
  );
  useEffect(() => {
    const t = setTimeout(onDone, 3600);
    return () => clearTimeout(t);
  }, [onDone]);
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {pages.map((p, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 20 26"
          className="absolute -top-10"
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 1.3 }}
          initial={{ y: 0, x: 0, rotate: 0, rotateY: 0, opacity: 1 }}
          animate={{
            y: '110vh',
            x: [0, p.drift * 0.5, p.drift, p.drift * 0.6],
            rotate: p.spin,
            rotateY: [0, 180, 360, 540],
            opacity: [1, 1, 1, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        >
          <rect x="0.5" y="0.5" width="19" height="25" rx="1.5" fill={p.tint} stroke="#e4d3bf" />
          <path d="M4 7h12M4 11h12M4 15h9M4 19h11" stroke="#d6c2a8" strokeWidth="1.2" strokeLinecap="round" />
        </motion.svg>
      ))}
    </div>,
    document.body,
  );
}
