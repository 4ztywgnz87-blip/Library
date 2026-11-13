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

/** A tabby cat lounging on top of the bookcase: swishes its tail and blinks */
export function ShelfCat({ className = '' }: { className?: string }) {
  const id = useId();
  const blink = { ry: [3, 3, 0.3, 3, 3] };
  const blinkT = { duration: 4.5, repeat: Infinity, times: [0, 0.46, 0.5, 0.54, 1] };
  return (
    <svg viewBox="0 0 150 80" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}fur`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c08a5c" />
          <stop offset="1" stopColor="#9a6a43" />
        </linearGradient>
      </defs>
      {/* tail */}
      <motion.path
        d="M112 66c18 2 28-6 30-20"
        stroke="#a87449"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
        animate={{ d: ['M112 66c18 2 28-6 30-20', 'M112 66c18 4 30 2 34-10', 'M112 66c18 2 28-6 30-20'] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* body (breathing) */}
      <motion.g
        style={{ transformOrigin: '80px 74px', transformBox: 'view-box' }}
        animate={{ scaleY: [1, 1.04, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d="M44 74c-4-20 14-34 40-34 24 0 36 12 34 34z" fill={`url(#${id}fur)`} />
        {/* stripes */}
        <path d="M70 42c2 6 2 12 0 18M82 40c2 7 2 14 0 21M94 42c2 6 2 12 0 18M104 48c2 5 2 10 0 14" stroke="#8a5a36" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />
      </motion.g>
      {/* front paws */}
      <ellipse cx="34" cy="74" rx="9" ry="4.5" fill="#f2e3cf" />
      <ellipse cx="52" cy="75" rx="9" ry="4.5" fill="#f2e3cf" />
      {/* head */}
      <path d="M22 34l2-17 12 10z" fill="#a87449" />
      <path d="M54 27l12-10 2 17z" fill="#a87449" />
      <path d="M25.5 29l1.2-8 6 5z" fill="#e7b9a8" />
      <path d="M57 26l6-5 1.2 8z" fill="#e7b9a8" />
      <ellipse cx="45" cy="47" rx="25" ry="21" fill={`url(#${id}fur)`} />
      <path d="M40 27c2 3 2 6 0 9M46 26c1 3 1 6 0 9M52 27c-1 3-1 6 0 9" stroke="#8a5a36" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.6" />
      {/* muzzle + chest */}
      <ellipse cx="45" cy="57" rx="12" ry="9" fill="#f2e3cf" />
      <path d="M42 53.5h6l-3 3z" fill="#d98b84" />
      <path d="M45 56.5v2.5M45 59c-2 2-4 2-5 0M45 59c2 2 4 2 5 0" stroke="#5c4033" strokeWidth="1" fill="none" strokeLinecap="round" />
      {/* eyes: blink by squashing the eye itself, so they stay in place */}
      {[35, 55].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy="45" rx="4.2" ry="3.4" fill="#e9d38a" />
          <motion.ellipse cx={cx} cy="45" rx="1.4" initial={{ ry: 3 }} animate={blink} transition={blinkT} fill="#2b1d16" />
        </g>
      ))}
      {/* whiskers */}
      <path d="M33 57l-14-2M33 60l-13 2M57 57l14-2M57 60l13 2" stroke="#fff" strokeOpacity="0.7" strokeWidth="0.8" strokeLinecap="round" />
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
