import { useId } from 'react';
import { motion } from 'motion/react';

/** A terracotta pot with a leafy plant that sways gently */
export function Plant({ className = '' }: { className?: string }) {
  const id = useId();
  const leaf = (d: string, fill: string, vein: string) => (
    <g>
      <path d={d} fill={fill} />
      <path d={vein} stroke="#4f6346" strokeWidth="0.8" fill="none" opacity="0.55" strokeLinecap="round" />
    </g>
  );
  return (
    <svg viewBox="0 0 80 110" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}pot`} x1="0" x2="1">
          <stop offset="0" stopColor="#b8654a" />
          <stop offset="0.45" stopColor="#d4876a" />
          <stop offset="1" stopColor="#9c5039" />
        </linearGradient>
        <linearGradient id={`${id}rim`} x1="0" x2="1">
          <stop offset="0" stopColor="#c5715a" />
          <stop offset="0.5" stopColor="#e09a7c" />
          <stop offset="1" stopColor="#a95a42" />
        </linearGradient>
      </defs>
      <motion.g
        style={{ transformOrigin: '40px 70px', transformBox: 'view-box' }}
        animate={{ rotate: [-2.5, 2.5, -2.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {leaf('M40 70C36 50 22 40 6 40c8 14 18 26 34 30z', '#6f8a5f', 'M40 70C30 58 20 48 8 41')}
        {leaf('M40 70c4-22 18-34 34-34-6 15-16 28-34 34z', '#86a173', 'M40 70c10-14 20-26 33-33')}
        {leaf('M40 70c-6-26-2-46 6-60 6 18 4 40-6 60z', '#5f7d52', 'M40 70c1-20 3-40 6-59')}
        {leaf('M40 70c-10-16-24-22-34-18 8 10 20 16 34 18z', '#97b083', 'M40 70C30 62 18 55 7 52')}
        {leaf('M40 70c8-16 20-22 32-20-8 10-18 16-32 20z', '#7a9668', 'M40 70c10-10 20-16 31-19')}
      </motion.g>
      {/* pot */}
      <path d="M18 76h44l-6 30H24z" fill={`url(#${id}pot)`} />
      <path d="M24 106h32l-1 3H25z" fill="#8a4532" />
      <rect x="14" y="70" width="52" height="9" rx="2.5" fill={`url(#${id}rim)`} />
      <ellipse cx="40" cy="71" rx="23" ry="2.2" fill="#4a3226" />
      <path d="M24 84c2 6 3 14 4 20" stroke="#fff" strokeOpacity="0.18" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** A candle in a glass jar with a flickering flame and warm glow */
export function Candle({ className = '' }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 60 100" className={className} aria-hidden>
      <defs>
        <radialGradient id={`${id}glow`}>
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.75" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}glass`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.25" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="0.8" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.22" />
        </linearGradient>
        <linearGradient id={`${id}wax`} x1="0" x2="1">
          <stop offset="0" stopColor="#efe1cc" />
          <stop offset="0.5" stopColor="#fbf3e6" />
          <stop offset="1" stopColor="#e2d1b8" />
        </linearGradient>
      </defs>
      <motion.circle
        cx="30"
        cy="40"
        r="30"
        fill={`url(#${id}glow)`}
        animate={{ opacity: [0.7, 1, 0.8, 0.95, 0.7], scale: [1, 1.06, 0.98, 1.04, 1] }}
        style={{ transformOrigin: '30px 40px', transformBox: 'view-box' }}
        transition={{ duration: 2.6, repeat: Infinity }}
      />
      {/* wax inside the jar */}
      <rect x="14" y="56" width="32" height="38" rx="3" fill={`url(#${id}wax)`} />
      <ellipse cx="30" cy="56" rx="16" ry="3" fill="#f6e7cd" />
      <ellipse cx="30" cy="56" rx="7" ry="1.4" fill="#e9cf9f" />
      {/* flame */}
      <rect x="29.3" y="47" width="1.4" height="9" rx="0.7" fill="#3b2a22" />
      <motion.path
        d="M30 30c6 8 7 14 0 20-7-6-6-12 0-20z"
        fill="#f6a93b"
        style={{ transformOrigin: '30px 50px', transformBox: 'view-box' }}
        animate={{ scaleY: [1, 1.14, 0.94, 1.08, 1], scaleX: [1, 0.94, 1.04, 0.97, 1], rotate: [0, 2.5, -2, 1, 0] }}
        transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M30 38c3 4 3.5 7 0 11-3.5-4-3-7 0-11z"
        fill="#fff4cf"
        style={{ transformOrigin: '30px 49px', transformBox: 'view-box' }}
        animate={{ scaleY: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 1.3, repeat: Infinity }}
      />
      {/* glass jar */}
      <path d="M11 44h38v48a6 6 0 0 1-6 6H17a6 6 0 0 1-6-6z" fill={`url(#${id}glass)`} stroke="#fff" strokeOpacity="0.35" />
      <rect x="10" y="42" width="40" height="4" rx="2" fill="#fff" fillOpacity="0.3" />
      <rect x="18" y="68" width="24" height="12" rx="2" fill="#c49a5a" fillOpacity="0.85" />
      <text x="30" y="76.5" textAnchor="middle" fontSize="5.5" fontFamily="Fraunces Variable, serif" fill="#3b2a22">
        old books
      </text>
    </svg>
  );
}

/** A ceramic mug with a heart, rising steam, on a little stack of books */
export function Mug({ className = '' }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 80 100" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}mug`} x1="0" x2="1">
          <stop offset="0" stopColor="#6a2632" />
          <stop offset="0.4" stopColor="#8e3a47" />
          <stop offset="1" stopColor="#5a1f29" />
        </linearGradient>
      </defs>
      {[28, 38, 48].map((x, i) => (
        <motion.path
          key={x}
          d={`M${x} 30c-4-5 4-8 0-13s3-7 0-11`}
          stroke="#e8dccd"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
          animate={{ opacity: [0, 0.7, 0], y: [6, -2, -8] }}
          transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.8 }}
        />
      ))}
      {/* mug */}
      <path d="M18 36h40v24a12 12 0 0 1-12 12H30a12 12 0 0 1-12-12z" fill={`url(#${id}mug)`} />
      <path d="M58 41h4a8 8 0 0 1 0 16h-5" stroke="#7a2e3a" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <ellipse cx="38" cy="36" rx="20" ry="3.4" fill="#4a1821" />
      <ellipse cx="38" cy="36.6" rx="17" ry="2.4" fill="#7b4a30" />
      <path d="M33 47c2-4 7-3 5 1-1 3-5 5-5 5s-4-2-5-5c-2-4 3-5 5-1z" fill="#f1dcdc" opacity="0.9" />
      <path d="M23 40v20" stroke="#fff" strokeOpacity="0.18" strokeWidth="3" strokeLinecap="round" />
      {/* books underneath */}
      <rect x="6" y="72" width="66" height="10" rx="1.5" fill="#5f6b52" />
      <rect x="6" y="73" width="3" height="8" fill="#e9c98f" opacity="0.7" />
      <rect x="64" y="73.5" width="6" height="7" fill="#f3ead9" />
      <rect x="10" y="82" width="62" height="12" rx="1.5" fill="#4e3b47" />
      <rect x="14" y="85" width="34" height="2" fill="#e9c98f" opacity="0.7" />
      <rect x="66" y="83.5" width="5" height="9" fill="#f3ead9" />
    </svg>
  );
}

/**
 * A tabby cat lying on top of the bookcase. Only stable animations: the tail swings by
 * rotating around its base, an ear twitches around its own base, and the eyes blink by
 * flattening the eye shape itself. Nothing is scaled, so no part can shift out of place.
 */
export function ShelfCat({ className = '' }: { className?: string }) {
  const id = useId();
  const fur = `url(#${id}fur)`;
  const blink = { duration: 5, repeat: Infinity, times: [0, 0.47, 0.5, 0.53, 1] };
  return (
    <svg viewBox="0 0 160 84" className={className} aria-hidden style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${id}fur`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c99868" />
          <stop offset="1" stopColor="#9a6a43" />
        </linearGradient>
        <radialGradient id={`${id}eye`} cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#e3d27a" />
          <stop offset="1" stopColor="#a8a04a" />
        </radialGradient>
      </defs>

      {/* tail curling up behind the body */}
      <motion.g
        style={{ transformOrigin: '118px 72px', transformBox: 'view-box', willChange: 'transform' }}
        animate={{ rotate: [0, -14, 4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M118 72c16 1 26-6 28-20 1-6 4-9 8-9" stroke="#a87449" strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M134 68l3-5M142 60l4-3M146 50l5-1" stroke="#7d5232" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M151 43c2 0 4 0 5 1" stroke="#5f3d26" strokeWidth="8" strokeLinecap="round" fill="none" />
      </motion.g>

      {/* body, loafing */}
      <path d="M48 80c-5-22 14-36 42-36 26 0 38 13 36 36z" fill={fur} />
      <path d="M74 46c2 6 2 13 0 19M87 44c2 7 2 15 0 22M100 46c2 6 2 13 0 19M111 52c2 5 2 10 0 15" stroke="#86593a" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.55" />
      {/* front paws */}
      <ellipse cx="38" cy="79" rx="9.5" ry="4.5" fill="#f4e7d4" />
      <ellipse cx="57" cy="80" rx="9.5" ry="4.5" fill="#f4e7d4" />
      <path d="M34 80.5v-2M38 80.8v-2M53 81.5v-2M57 81.8v-2" stroke="#cdb79b" strokeWidth="0.8" strokeLinecap="round" />

      {/* ears (the right one twitches now and then) */}
      <path d="M27 36l1-18 13 10z" fill="#b07d50" />
      <path d="M30 32l1-9 6 5z" fill="#e8b2a3" />
      <motion.g
        style={{ transformOrigin: '60px 30px', transformBox: 'view-box' }}
        animate={{ rotate: [0, 0, 12, 0, 0] }}
        transition={{ duration: 7, repeat: Infinity, times: [0, 0.8, 0.83, 0.86, 1] }}
      >
        <path d="M63 36l-1-18-13 10z" fill="#b07d50" />
        <path d="M60 32l-1-9-6 5z" fill="#e8b2a3" />
      </motion.g>

      {/* head */}
      <ellipse cx="45" cy="50" rx="23" ry="20" fill={fur} />
      <path d="M24 52c-3 4-2 8 2 10M66 52c3 4 2 8-2 10" stroke="#c99868" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M38 35l3 6 4-6 4 6 3-6" stroke="#7d5232" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
      <path d="M24 47h6M25 51h5M66 47h-6M65 51h-5" stroke="#7d5232" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
      <ellipse cx="45" cy="60" rx="11" ry="7.5" fill="#f4e7d4" />
      <path d="M42.2 56.5h5.6l-2.8 3z" fill="#d98b84" />
      <path d="M45 59.5v2.5M45 62c-1.6 1.8-3.6 1.8-4.6.2M45 62c1.6 1.8 3.6 1.8 4.6.2" stroke="#5c4033" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <path d="M34 60l-14-2M34 63l-13 2M56 60l14-2M56 63l13 2" stroke="#fff" strokeOpacity="0.75" strokeWidth="0.7" strokeLinecap="round" />
      {/* eyes */}
      {[37, 53].map((cx) => (
        <g key={cx}>
          <motion.ellipse cx={cx} cy="50" rx="4.3" initial={{ ry: 3.6 }} animate={{ ry: [3.6, 3.6, 0.35, 3.6, 3.6] }} transition={blink} fill={`url(#${id}eye)`} />
          <motion.ellipse cx={cx} cy="50" rx="1.2" initial={{ ry: 3 }} animate={{ ry: [3, 3, 0.25, 3, 3] }} transition={blink} fill="#2b1d16" />
          <motion.circle cx={cx + 1.4} cy="48.6" r="0.9" animate={{ opacity: [1, 1, 0, 1, 1] }} transition={blink} fill="#fff" />
        </g>
      ))}
    </svg>
  );
}

/** String of fairy lights with soft glowing halos */
export function FairyLights({ className = '' }: { className?: string }) {
  const id = useId();
  const bulbs = Array.from({ length: 13 }, (_, i) => i);
  const yAt = (x: number) => 6 + 9 * Math.sin((x / 300) * Math.PI) + 3 * Math.sin((x / 300) * Math.PI * 4);
  return (
    <svg viewBox="0 0 300 34" preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <filter id={`${id}blur`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <path
        d={`M0 ${yAt(0)} ${Array.from({ length: 31 }, (_, i) => `L${i * 10} ${yAt(i * 10)}`).join(' ')}`}
        stroke="#3b2a22"
        strokeWidth="1"
        fill="none"
      />
      {bulbs.map((i) => {
        const x = 8 + i * 23.5;
        const y = yAt(x) + 5;
        const color = ['#ffd27a', '#ffb89a', '#fff0b8'][i % 3];
        return (
          <g key={i}>
            <motion.circle
              cx={x}
              cy={y}
              r="7"
              fill={color}
              filter={`url(#${id}blur)`}
              animate={{ opacity: [0.25, 0.75, 0.25] }}
              transition={{ duration: 2.2 + (i % 3) * 0.7, repeat: Infinity, delay: i * 0.25 }}
            />
            <rect x={x - 1.2} y={y - 5.5} width="2.4" height="2.5" fill="#5c4033" />
            <ellipse cx={x} cy={y} rx="2.6" ry="3.3" fill={color} />
          </g>
        );
      })}
    </svg>
  );
}

/** A wooden bookend with a little brass detail */
export function Bookend({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 84" className={className} aria-hidden>
      <path d="M4 84V34a14 14 0 0 1 14-14h6v64z" fill="#5f6b52" />
      <path d="M8 84V36a10 10 0 0 1 10-10" stroke="#fff" strokeOpacity="0.15" strokeWidth="2" fill="none" />
      <circle cx="15" cy="40" r="3" fill="#c49a5a" />
      <rect x="2" y="78" width="30" height="6" rx="2" fill="#4e5944" />
    </svg>
  );
}

/** A small stack of books lying flat, for on top of the bookcase */
export function BookPile({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 48" className={className} aria-hidden>
      <rect x="4" y="34" width="80" height="13" rx="2" fill="#7a2e3a" />
      <rect x="78" y="36" width="5" height="9" fill="#f3ead9" />
      <rect x="10" y="39" width="40" height="2" fill="#e9c98f" opacity="0.8" />
      <rect x="10" y="22" width="70" height="12" rx="2" fill="#c49a5a" />
      <rect x="74" y="24" width="5" height="8" fill="#f3ead9" />
      <rect x="16" y="27" width="30" height="2" fill="#5c4033" opacity="0.6" />
      <rect x="6" y="10" width="66" height="12" rx="2" fill="#3f4e5a" />
      <rect x="66" y="12" width="5" height="8" fill="#f3ead9" />
      <rect x="12" y="15" width="24" height="2" fill="#e9c98f" opacity="0.8" />
    </svg>
  );
}

/** A dreamy thought cloud (the cat dreams of the wishlist), floating gently */
export function DreamCloud({ count, className = '' }: { count: number; className?: string }) {
  const id = useId();
  return (
    <motion.svg
      viewBox="0 0 170 120"
      className={className}
      aria-hidden
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <defs>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffaf3" />
          <stop offset="1" stopColor="#f1e4d6" />
        </linearGradient>
        <filter id={`${id}s`} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#7a5a45" floodOpacity="0.22" />
        </filter>
      </defs>
      <g filter={`url(#${id}s)`}>
        <path
          d="M30 74c-16 0-24-16-14-27 4-5 10-6 15-5 2-14 18-22 31-16 7-12 26-14 36-3 12-6 29 0 31 15 14 1 21 17 12 27-4 5-10 7-16 6-3 10-15 15-25 10-8 9-24 10-33 2-11 7-28 4-33-9z"
          fill={`url(#${id}c)`}
        />
        {/* little bubbles leading down to the cat */}
        <circle cx="128" cy="92" r="6" fill={`url(#${id}c)`} />
        <circle cx="140" cy="106" r="4" fill={`url(#${id}c)`} />
        <circle cx="149" cy="116" r="2.6" fill={`url(#${id}c)`} />
      </g>
      {/* tiny books + text */}
      <g transform="translate(26 38) scale(0.82)">
        <rect x="0" y="6" width="7" height="22" rx="1" fill="#7a2e3a" />
        <rect x="8" y="2" width="7" height="26" rx="1" fill="#c49a5a" />
        <rect x="16" y="8" width="7" height="20" rx="1" fill="#5f6b52" transform="rotate(8 19 28)" />
      </g>
      <text x="102" y="53" textAnchor="middle" fontFamily="Fraunces Variable, serif" fontSize="16" fontWeight="600" fill="#7a2e3a">
        Wishlist
      </text>
      <text x="102" y="67" textAnchor="middle" fontFamily="Inter Variable, sans-serif" fontSize="8.5" fill="#7a6455">
        {count} {count === 1 ? 'book' : 'books'} to dream of
      </text>
      {[
        [22, 30],
        [150, 36],
        [80, 18],
      ].map(([x, y], i) => (
        <motion.text
          key={i}
          x={x}
          y={y}
          fontSize="10"
          fill="#c49a5a"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.7 }}
        >
          ✦
        </motion.text>
      ))}
    </motion.svg>
  );
}
