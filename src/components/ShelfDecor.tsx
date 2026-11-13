import { useId, useState } from 'react';
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

/**
 * A candle in a glass jar. Tap to blow it out (a wisp of smoke curls up), tap again to light it.
 */
export function Candle({ className = '' }: { className?: string }) {
  const id = useId();
  const [lit, setLit] = useState(true);
  const [puffs, setPuffs] = useState(0); // bumps each time it's blown out, to replay the smoke
  return (
    <svg
      viewBox="0 0 60 100"
      className={`${className} cursor-pointer`}
      role="button"
      aria-label={lit ? 'Blow out the candle' : 'Light the candle'}
      onClick={() => {
        if (lit) setPuffs((n) => n + 1);
        setLit(!lit);
      }}
      style={{ overflow: 'visible' }}
    >
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
      {/* warm glow (fades away when blown out) */}
      <motion.g animate={{ opacity: lit ? 1 : 0 }} transition={{ duration: 0.5 }}>
        <motion.circle
          cx="30"
          cy="40"
          r="30"
          fill={`url(#${id}glow)`}
          animate={{ opacity: [0.7, 1, 0.8, 0.95, 0.7] }}
          transition={{ duration: 2.6, repeat: Infinity }}
        />
      </motion.g>
      {/* wax inside the jar */}
      <rect x="14" y="56" width="32" height="38" rx="3" fill={`url(#${id}wax)`} />
      <ellipse cx="30" cy="56" rx="16" ry="3" fill="#f6e7cd" />
      <ellipse cx="30" cy="56" rx="7" ry="1.4" fill={lit ? '#e9cf9f' : '#efe0c6'} />
      {/* wick, glowing at the tip for a moment after blowing out */}
      <rect x="29.3" y="47" width="1.4" height="9" rx="0.7" fill="#3b2a22" />
      <motion.circle
        key={`ember${puffs}`}
        cx="30"
        cy="47.5"
        r="1.1"
        fill="#ff8a3d"
        initial={{ opacity: 0 }}
        animate={{ opacity: lit || puffs === 0 ? 0 : [0.9, 0] }}
        transition={{ duration: 1.6 }}
      />
      {/* flame: shrinks away when blown out, grows back when lit */}
      <motion.g
        style={{ transformOrigin: '30px 50px', transformBox: 'view-box' }}
        initial={false}
        animate={{ scale: lit ? 1 : 0, opacity: lit ? 1 : 0 }}
        transition={{ duration: lit ? 0.45 : 0.18, ease: lit ? 'backOut' : 'easeIn' }}
      >
        <motion.path
          d="M30 30c6 8 7 14 0 20-7-6-6-12 0-20z"
          fill="#f6a93b"
          style={{ transformOrigin: '30px 50px', transformBox: 'view-box' }}
          animate={{ scaleY: [1, 1.12, 0.95, 1.07, 1], scaleX: [1, 0.95, 1.03, 0.97, 1], rotate: [0, 2.5, -2, 1, 0] }}
          transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <path d="M30 38c3 4 3.5 7 0 11-3.5-4-3-7 0-11z" fill="#fff4cf" />
      </motion.g>
      {/* a wisp of smoke after blowing out */}
      {!lit &&
        puffs > 0 &&
        [0, 1].map((i) => (
          <motion.path
            key={`smoke${puffs}-${i}`}
            d={i === 0 ? 'M30 46c-4-6 4-10 0-16s4-10 0-16' : 'M31 46c3-5-3-9 0-14s-3-9 0-13'}
            stroke="#e3dad0"
            strokeWidth={i === 0 ? 2.8 : 1.8}
            strokeLinecap="round"
            fill="none"
            initial={{ opacity: 0, y: 0, x: 0, pathLength: 0 }}
            animate={{ opacity: [0, 0.8, 0.5, 0], y: -26, x: [0, 2, -2, 1], pathLength: 1 }}
            transition={{ duration: 3.2, delay: i * 0.3, ease: 'easeOut' }}
          />
        ))}
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
    <svg viewBox="0 0 80 94" className={className} aria-hidden>
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
      <ellipse cx="41" cy="93.5" rx="34" ry="1.6" fill="#000" opacity="0.35" />
      <rect x="10" y="82" width="62" height="12" rx="1.5" fill="#a0644b" />
      <rect x="10" y="82" width="62" height="2" rx="1" fill="#fff" opacity="0.15" />
      <rect x="14" y="85" width="34" height="2" fill="#e9c98f" opacity="0.7" />
      <rect x="66" y="83.5" width="5" height="9" fill="#f3ead9" />
    </svg>
  );
}

/**
 * The tabby cat asleep on top of the bookcase (dreaming of the wishlist). Eyes closed, little
 * "z"s drift up towards the dream cloud, and now and then the tail gives a lazy flick. The tail
 * keeps its shape and only rotates around where it joins the body, so nothing can flicker.
 */
export function ShelfCat({ className = '' }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 150 80" className={className} aria-hidden style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${id}fur`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c08a5c" />
          <stop offset="1" stopColor="#9a6a43" />
        </linearGradient>
      </defs>
      {/* tail: a slow, lazy flick now and then */}
      <motion.g
        style={{ transformOrigin: '112px 66px', transformBox: 'view-box', willChange: 'transform' }}
        animate={{ rotate: [0, 0, 12, 0, 0] }}
        transition={{ duration: 7, repeat: Infinity, times: [0, 0.55, 0.68, 0.82, 1], ease: 'easeInOut' }}
      >
        <path d="M112 66c18 2 28-6 30-20" stroke="#a87449" strokeWidth="8" strokeLinecap="round" fill="none" />
      </motion.g>
      {/* body */}
      <path d="M44 74c-4-20 14-34 40-34 24 0 36 12 34 34z" fill={`url(#${id}fur)`} />
      <path d="M70 42c2 6 2 12 0 18M82 40c2 7 2 14 0 21M94 42c2 6 2 12 0 18M104 48c2 5 2 10 0 14" stroke="#8a5a36" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />
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
      {/* muzzle */}
      <ellipse cx="45" cy="57" rx="12" ry="9" fill="#f2e3cf" />
      <path d="M42 53.5h6l-3 3z" fill="#d98b84" />
      <path d="M45 56.5v2.5M45 59c-2 2-4 2-5 0M45 59c2 2 4 2 5 0" stroke="#5c4033" strokeWidth="1" fill="none" strokeLinecap="round" />
      {/* closed, sleepy eyes */}
      <path d="M30.5 45.5q4.5 3.2 9 0M50.5 45.5q4.5 3.2 9 0" stroke="#3b2a22" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {/* whiskers */}
      <path d="M33 57l-14-2M33 60l-13 2M57 57l14-2M57 60l13 2" stroke="#fff" strokeOpacity="0.7" strokeWidth="0.8" strokeLinecap="round" />
      {/* z z z, drifting up and away from the head (left of the ear) */}
      {[0, 1, 2].map((i) => (
        <motion.text
          key={i}
          x="12"
          y="30"
          fontFamily="Fraunces Variable, serif"
          fontWeight="600"
          fontSize={10 + i * 3}
          fill="#8a7565"
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={{ opacity: [0, 0.95, 0], x: [0, -7, -14], y: [0, -14, -28] }}
          transition={{ duration: 3.6, repeat: Infinity, delay: i * 1.2, ease: 'easeOut' }}
        >
          z
        </motion.text>
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
export function Bookend({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    // the upright plate is the right edge of the drawing, so books stand right against it
    <svg viewBox="2 0 24 84" className={className} style={style} aria-hidden>
      <path d="M4 84V34a14 14 0 0 1 14-14h8v64z" fill="#5f6b52" />
      <path d="M8 84V36a10 10 0 0 1 10-10" stroke="#fff" strokeOpacity="0.15" strokeWidth="2" fill="none" />
      <circle cx="15" cy="40" r="3" fill="#c49a5a" />
      <rect x="2" y="78" width="24" height="6" rx="2" fill="#4e5944" />
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
      <text x="80" y="49" textAnchor="middle" fontFamily="Inter Variable, sans-serif" fontSize="7.5" letterSpacing="1.1" fill="#a08a78">
        WISHLIST
      </text>
      <text x="80" y="63" textAnchor="middle" fontFamily="Fraunces Variable, serif" fontSize="12" fontWeight="600" fill="#7a2e3a">
        {count === 0 ? 'Dreaming of books' : `Dreaming of ${count} ${count === 1 ? 'book' : 'books'}`}
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

/**
 * A trailing pothos in a pot on top of the bookcase; its vines hang down over the front
 * edge and sway gently. The top of the bookcase is at y = 80.
 */
export function HangingPlant({ className = '' }: { className?: string }) {
  const id = useId();
  // heart-shaped leaf at (x, y), turned by `r` degrees
  const leaf = (x: number, y: number, r: number, s = 1, shade = 0) => (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M0 0c-6-2-9-8-6-12 2-3 5-2 6 0 1-2 4-3 6 0 3 4 0 10-6 12z" fill={['#6f8f5c', '#85a56f', '#5f7d4f'][shade]} />
      <path d="M0 0v-10" stroke="#4f6a42" strokeWidth="0.7" opacity="0.6" />
    </g>
  );
  const vine = (d: string, leaves: [number, number, number, number?, number?][], delay: number, originX: number) => (
    <motion.g
      style={{ transformOrigin: `${originX}px 46px`, transformBox: 'view-box', willChange: 'transform' }}
      animate={{ rotate: [-2.5, 2.5, -2.5] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <path d={d} stroke="#5f7d4f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {leaves.map(([x, y, r, s, sh], i) => (
        <g key={i}>{leaf(x, y, r, s, sh)}</g>
      ))}
    </motion.g>
  );
  return (
    <svg viewBox="0 0 90 160" className={className} aria-hidden style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${id}pot`} x1="0" x2="1">
          <stop offset="0" stopColor="#b8654a" />
          <stop offset="0.45" stopColor="#d4876a" />
          <stop offset="1" stopColor="#9c5039" />
        </linearGradient>
      </defs>
      {/* pot */}
      <path d="M22 50h46l-5 30H27z" fill={`url(#${id}pot)`} />
      <rect x="18" y="44" width="54" height="9" rx="2.5" fill="#d08a6c" />
      <path d="M28 56c1 7 2 14 3 21" stroke="#fff" strokeOpacity="0.18" strokeWidth="3" strokeLinecap="round" />
      {/* vines spilling over the rim, in front of the pot, and down over the cornice */}
      {vine('M26 48c-6 16-6 38-10 62-2 14-1 28 3 40', [[22, 62, 160, 1, 0], [18, 82, 200, 1.1, 2], [16, 102, 150, 1, 1], [16, 122, 210, 0.9, 0], [19, 142, 170, 0.8, 2]], 0, 26)}
      {vine('M42 49c3 18 2 36 5 56 2 12 1 22-1 30', [[44, 64, 200, 1, 1], [46, 84, 160, 1.1, 0], [47, 104, 210, 0.9, 2], [46, 124, 170, 0.8, 1]], 0.8, 42)}
      {vine('M60 48c7 12 10 26 10 42', [[63, 60, 210, 1, 2], [68, 74, 160, 0.9, 0], [70, 88, 200, 0.8, 1]], 1.6, 60)}
      {/* leaves on top of the pot */}
      {leaf(30, 44, -20, 1.1, 1)}
      {leaf(40, 42, 5, 1.2, 0)}
      {leaf(50, 43, 25, 1.1, 2)}
      {leaf(60, 45, 45, 1, 1)}
      {leaf(24, 46, -45, 1, 0)}
    </svg>
  );
}
