import { motion } from 'motion/react';

/** A little potted plant whose leaves sway gently */
export function Plant({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 90" className={className} aria-hidden>
      <motion.g
        style={{ originX: '30px', originY: '58px' }}
        animate={{ rotate: [-3, 3, -3] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M30 58C28 40 18 30 8 28c6 10 10 22 22 30z" fill="#7d9070" />
        <path d="M30 58c2-20 12-32 24-34-5 12-10 26-24 34z" fill="#8f9e7f" />
        <path d="M30 58c-2-22 0-38 4-48 4 12 4 30-4 48z" fill="#6f8462" />
        <path d="M30 58c-6-12-16-16-22-14 6 6 12 12 22 14z" fill="#9aab89" />
      </motion.g>
      <path d="M14 58h32l-4 28H18z" fill="#c2775a" />
      <rect x="12" y="55" width="36" height="7" rx="2" fill="#d08a6c" />
    </svg>
  );
}

/** A candle with a flickering flame and a soft glow */
export function Candle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 90" className={className} aria-hidden>
      <motion.circle
        cx="20"
        cy="28"
        r="16"
        fill="#f6c86b"
        animate={{ opacity: [0.18, 0.3, 0.2, 0.28, 0.18] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      />
      <motion.path
        d="M20 14c5 7 6 12 0 18-6-6-5-11 0-18z"
        fill="#f7b548"
        style={{ originX: '20px', originY: '32px' }}
        animate={{ scaleY: [1, 1.15, 0.92, 1.08, 1], rotate: [0, 3, -2, 1, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <path d="M20 22c2 3 2 6 0 9-2-3-2-6 0-9z" fill="#fff3c4" />
      <rect x="19" y="31" width="2" height="5" fill="#3b2a22" />
      <rect x="10" y="36" width="20" height="44" rx="3" fill="#f3e7d6" />
      <path d="M10 42c4 3 6-2 10 1s6-2 10 0v-3H10z" fill="#e8d8c2" />
      <ellipse cx="20" cy="82" rx="16" ry="4" fill="#c49a5a" />
    </svg>
  );
}

/** A mug of tea with rising steam */
export function Mug({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 70" className={className} aria-hidden>
      {[20, 30, 40].map((x, i) => (
        <motion.path
          key={x}
          d={`M${x} 22c-3-4 3-6 0-10`}
          stroke="#a08a78"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
          animate={{ opacity: [0, 0.9, 0], y: [4, -3, -8] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.6 }}
        />
      ))}
      <path d="M10 28h36v22a12 12 0 0 1-12 12H22a12 12 0 0 1-12-12z" fill="#7a2e3a" />
      <path d="M46 33h4a7 7 0 0 1 0 14h-5" stroke="#7a2e3a" strokeWidth="4" fill="none" />
      <path d="M22 40c2-3 6-3 6 0s-4 5-3 7c-4-2-6-4-3-7z" fill="#f1dcdc" opacity=".8" />
    </svg>
  );
}

/** A cat lounging on top of the bookcase: swishes its tail and blinks */
export function ShelfCat({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 70" className={className} aria-hidden>
      <motion.path
        d="M88 58c14 0 22-6 24-18"
        stroke="#a47148"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
        animate={{ d: ['M88 58c14 0 22-6 24-18', 'M88 58c14 2 24 4 28-6', 'M88 58c14 0 22-6 24-18'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.ellipse
        cx="66"
        cy="54"
        rx="30"
        ry="14"
        fill="#a47148"
        animate={{ ry: [14, 15, 14] }}
        transition={{ duration: 3.2, repeat: Infinity }}
      />
      <circle cx="36" cy="44" r="15" fill="#a47148" />
      <path d="M24 36l1-13 9 8zM40 30l9-7 1 13z" fill="#a47148" />
      <path d="M27 32l1-5 3 3zM44 29l4-3 .5 5z" fill="#e7b9a8" />
      <motion.g
        animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
        transition={{ duration: 4, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
        style={{ originY: '44px' }}
      >
        <ellipse cx="30" cy="44" rx="2" ry="2.6" fill="#3b2a22" />
        <ellipse cx="42" cy="44" rx="2" ry="2.6" fill="#3b2a22" />
      </motion.g>
      <path d="M35 49l1 1 1-1" stroke="#3b2a22" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <ellipse cx="54" cy="66" rx="14" ry="4" fill="#a47148" />
    </svg>
  );
}

/** String of fairy lights that twinkle */
export function FairyLights({ className = '' }: { className?: string }) {
  const bulbs = Array.from({ length: 11 }, (_, i) => i);
  return (
    <svg viewBox="0 0 300 30" preserveAspectRatio="none" className={className} aria-hidden>
      <path d="M0 4 Q75 26 150 8 T300 6" stroke="#5c4033" strokeWidth="1.2" fill="none" />
      {bulbs.map((i) => {
        const x = 10 + i * 28;
        const y = 4 + Math.sin((i / 10) * Math.PI * 2) * 6 + 8;
        return (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            r="3.2"
            fill={i % 3 === 0 ? '#f7c76b' : i % 3 === 1 ? '#f1b8a0' : '#fbe3a1'}
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 2 + (i % 3) * 0.6, repeat: Infinity, delay: i * 0.2 }}
          />
        );
      })}
    </svg>
  );
}

/** Wooden bookend */
export function Bookend({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 80" className={className} aria-hidden>
      <path d="M4 80V30a12 12 0 0 1 12-12h4v62z" fill="#5f6b52" />
      <rect x="2" y="74" width="26" height="6" rx="2" fill="#4e5944" />
    </svg>
  );
}
