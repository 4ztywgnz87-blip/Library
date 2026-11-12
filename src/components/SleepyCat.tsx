import { motion } from 'motion/react';

/** A little sleeping cat for empty states */
export function SleepyCat({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 90" className={className} aria-hidden>
      {/* tail */}
      <motion.path
        d="M118 68c14 2 24-4 26-14"
        stroke="#8B5E3C"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
        animate={{ d: ['M118 68c14 2 24-4 26-14', 'M118 68c14 2 22-8 20-18', 'M118 68c14 2 24-4 26-14'] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* body */}
      <motion.ellipse
        cx="88"
        cy="62"
        rx="36"
        ry="20"
        fill="#A47148"
        animate={{ ry: [20, 21.5, 20] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* head */}
      <circle cx="56" cy="58" r="18" fill="#A47148" />
      <path d="M42 48 44 34l10 9zM62 42l10-7 1 14z" fill="#A47148" />
      <path d="M45 44l1-6 4 4zM66 41l5-3 .5 6z" fill="#E7B9A8" />
      {/* closed eyes */}
      <path d="M47 58q3 3 6 0M59 58q3 3 6 0" stroke="#3B2A22" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M55 63l1 1 1-1" stroke="#3B2A22" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* zzz */}
      <motion.text
        x="72"
        y="30"
        fontFamily="Fraunces Variable, serif"
        fontSize="13"
        fill="#A08A78"
        animate={{ opacity: [0, 1, 0], y: [34, 24, 16] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        z
      </motion.text>
      <motion.text
        x="82"
        y="22"
        fontFamily="Fraunces Variable, serif"
        fontSize="10"
        fill="#A08A78"
        animate={{ opacity: [0, 1, 0], y: [26, 16, 8] }}
        transition={{ duration: 3, repeat: Infinity, delay: 1 }}
      >
        z
      </motion.text>
      {/* cushion */}
      <ellipse cx="88" cy="82" rx="62" ry="7" fill="#E4D3BF" />
    </svg>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-8 py-12 text-center">
      <SleepyCat className="w-40" />
      <h3 className="mt-4 text-xl text-ink">{title}</h3>
      {children && <div className="mt-2 max-w-xs text-sm text-cocoa">{children}</div>}
    </div>
  );
}
