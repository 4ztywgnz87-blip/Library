import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';

/** One loose page: flat, with a curled corner, or bent like a page caught in the wind */
function Page({ kind, tint }: { kind: number; tint: string }) {
  const lines = <path d="M5 8h10M5 11.5h10M5 15h7M5 18.5h9" stroke="#cdb79c" strokeWidth="1.1" strokeLinecap="round" />;
  if (kind === 1)
    // the bottom corner curls up
    return (
      <>
        <path d="M1 1h18v17.5L13.5 25H1z" fill={tint} stroke="#e1cdb4" strokeWidth="0.8" />
        {lines}
        <path
          d="M19 18.5c-3.2.2-5.3 2.3-5.5 6.5 1.8-2.6 3.8-4.6 5.5-6.5z"
          fill="#e8d8c2"
          stroke="#d9c3a5"
          strokeWidth="0.6"
        />
      </>
    );
  if (kind === 2)
    // bent in a soft S, shaded where it curves away
    return (
      <>
        <defs>
          <linearGradient id="pc-bend" x1="0" x2="1">
            <stop offset="0" stopColor={tint} />
            <stop offset="0.65" stopColor={tint} />
            <stop offset="1" stopColor="#dcc8ad" />
          </linearGradient>
        </defs>
        <path
          d="M2 2c6-1.5 11 1 17 0 -1 8 1.5 15 0 23-6 1-11-1.5-17 0 1.5-8-1-15 0-23z"
          fill="url(#pc-bend)"
          stroke="#e1cdb4"
          strokeWidth="0.8"
        />
        <path
          d="M5.5 8c3-.6 6 .4 9 0M5.5 11.5c3-.6 6 .4 9 0M5.5 15c2.5-.5 4.5.3 6.5 0"
          stroke="#cdb79c"
          strokeWidth="1.1"
          strokeLinecap="round"
          fill="none"
        />
      </>
    );
  if (kind === 3)
    // rolled at the top edge
    return (
      <>
        <path d="M1 5h18v20H1z" fill={tint} stroke="#e1cdb4" strokeWidth="0.8" />
        <path d="M1 5c0-3 2-4 4.5-4h13.5c-2.5 0-4.5 1.5-4.5 4z" fill="#eadbc6" stroke="#d9c3a5" strokeWidth="0.6" />
        <path d="M5 11h10M5 14.5h10M5 18h7" stroke="#cdb79c" strokeWidth="1.1" strokeLinecap="round" />
      </>
    );
  return (
    <>
      <rect x="1" y="1" width="18" height="24" rx="1.2" fill={tint} stroke="#e1cdb4" strokeWidth="0.8" />
      {lines}
    </>
  );
}

/**
 * A book finished: a little party popper goes off, shooting pages and confetti up into the air,
 * and the loose pages then flutter down over the screen.
 */
export function PageConfetti({ onDone }: { onDone: () => void }) {
  const { pages, bits } = useMemo(() => {
    const h = window.innerHeight;
    const pages = Array.from({ length: 20 }, (_, i) => {
      const angle = (-90 + (Math.random() - 0.5) * 110) * (Math.PI / 180);
      const power = h * (0.45 + Math.random() * 0.35);
      return {
        kind: i % 4,
        size: 26 + Math.random() * 14,
        peakX: Math.cos(angle) * power * 0.7,
        peakY: Math.sin(angle) * power,
        sway: (Math.random() - 0.5) * 90,
        spin: (Math.random() - 0.5) * 300,
        delay: Math.random() * 0.12,
        fall: 2.4 + Math.random() * 1.3,
        tint: ['#fffaf3', '#f8f1e6', '#fdf0f0', '#f6ecdc'][i % 4],
      };
    });
    const bits = Array.from({ length: 26 }, () => {
      const angle = (-90 + (Math.random() - 0.5) * 120) * (Math.PI / 180);
      const power = h * (0.25 + Math.random() * 0.4);
      return {
        x: Math.cos(angle) * power * 0.8,
        y: Math.sin(angle) * power,
        color: ['#7A2E3A', '#f1bf6a', '#e05a73', '#8F9E7F', '#E7B9A8'][Math.floor(Math.random() * 5)],
        round: Math.random() > 0.5,
        rot: Math.random() * 720,
      };
    });
    return { pages, bits };
  }, []);
  useEffect(() => {
    const t = setTimeout(onDone, 4300);
    return () => clearTimeout(t);
  }, [onDone]);

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {/* the pop: a soft flash where it goes off */}
      <motion.span
        className="absolute bottom-[12%] left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-[#f6d27a]"
        initial={{ scale: 0.2, opacity: 0.9 }}
        animate={{ scale: 2.2, opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      {bits.map((b, i) => (
        <motion.span
          key={`b${i}`}
          className={`absolute bottom-[14%] left-1/2 h-2 ${b.round ? 'w-2 rounded-full' : 'w-1 rounded-[1px]'}`}
          style={{ background: b.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: [0, b.x, b.x * 1.1], y: [0, b.y, b.y + 260], opacity: [1, 1, 0], rotate: b.rot }}
          transition={{ duration: 1.6, times: [0, 0.4, 1], ease: 'easeOut' }}
        />
      ))}
      {pages.map((p, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 20 26"
          className="absolute bottom-[14%] left-1/2 drop-shadow-[0_2px_2px_rgba(80,50,30,0.18)]"
          style={{ width: p.size, height: p.size * 1.3, marginLeft: -p.size / 2 }}
          initial={{ x: 0, y: 0, rotate: 0, rotateY: 0, opacity: 1 }}
          animate={{
            // up with the pop, then a slow flutter down, swaying from side to side
            x: [0, p.peakX, p.peakX + p.sway, p.peakX - p.sway * 0.6, p.peakX + p.sway * 0.4],
            y: [
              0,
              p.peakY,
              p.peakY + window.innerHeight * 0.35,
              p.peakY + window.innerHeight * 0.7,
              window.innerHeight * 0.3,
            ],
            rotate: [0, p.spin * 0.3, p.spin * 0.55, p.spin * 0.8, p.spin],
            rotateY: [0, 90, 220, 360, 480],
            opacity: [1, 1, 1, 1, 0],
          }}
          transition={{
            duration: 0.55 + p.fall,
            delay: p.delay,
            times: [0, 0.16, 0.5, 0.82, 1],
            ease: ['easeOut', 'easeInOut', 'easeInOut', 'easeIn'],
          }}
        >
          <Page kind={p.kind} tint={p.tint} />
        </motion.svg>
      ))}
    </div>,
    document.body,
  );
}

/** A new book on the shelf: a party popper shoots coloured confetti up, and it floats back down */
export function PartyConfetti({ onDone }: { onDone: () => void }) {
  const bits = useMemo(() => {
    const h = window.innerHeight;
    return Array.from({ length: 70 }, (_, i) => {
      const angle = (-90 + (Math.random() - 0.5) * 120) * (Math.PI / 180);
      const power = h * (0.4 + Math.random() * 0.4);
      const peakX = Math.cos(angle) * power * 0.75;
      return {
        kind: i % 3, // 0 rectangle, 1 dot, 2 streamer
        peakX,
        peakY: Math.sin(angle) * power,
        sway: (Math.random() - 0.5) * 80,
        spin: (Math.random() - 0.5) * 900,
        delay: Math.random() * 0.12,
        fall: 2 + Math.random() * 1.4,
        color: ['#7A2E3A', '#f1bf6a', '#e05a73', '#8F9E7F', '#E7B9A8', '#7fa7d9', '#b07bd6'][i % 7],
      };
    });
  }, []);
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);
  const h = typeof window === 'undefined' ? 800 : window.innerHeight;
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      <motion.span
        className="absolute bottom-[12%] left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-[#f6d27a]"
        initial={{ scale: 0.2, opacity: 0.9 }}
        animate={{ scale: 2.2, opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className={`absolute bottom-[14%] left-1/2 ${
            b.kind === 1 ? 'h-2 w-2 rounded-full' : b.kind === 2 ? 'h-4 w-1 rounded-full' : 'h-2.5 w-1.5 rounded-[1px]'
          }`}
          style={{ background: b.color }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{
            x: [0, b.peakX, b.peakX + b.sway, b.peakX - b.sway * 0.6, b.peakX + b.sway * 0.3],
            y: [0, b.peakY, b.peakY + h * 0.3, b.peakY + h * 0.62, h * 0.3],
            rotate: b.spin,
            opacity: [1, 1, 1, 1, 0],
          }}
          transition={{
            duration: 0.5 + b.fall,
            delay: b.delay,
            times: [0, 0.16, 0.5, 0.82, 1],
            ease: ['easeOut', 'easeInOut', 'easeInOut', 'easeIn'],
          }}
        />
      ))}
    </div>,
    document.body,
  );
}
