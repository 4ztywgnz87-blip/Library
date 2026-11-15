import { useId, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CatHat, SEASON_LIGHTS, type Season } from './Seasonal';

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
const WAX: Record<Season | 'default', [string, string, string, string]> = {
  default: ['#efe1cc', '#fbf3e6', '#e2d1b8', '#f6e7cd'],
  christmas: ['#b52a3c', '#d64a5a', '#9c2232', '#e06070'],
  halloween: ['#d9772f', '#ef9a50', '#c0641f', '#f2ab6a'],
  valentine: ['#f2a7b8', '#fbd0da', '#e58a9e', '#fbd6de'],
  easter: ['#d7c8f4', '#ece4fb', '#c4b2ea', '#efe9fc'],
};

export function Candle({ className = '', season }: { className?: string; season?: Season }) {
  const wax = WAX[season ?? 'default'];
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
          <stop offset="0" stopColor={wax[0]} />
          <stop offset="0.5" stopColor={wax[1]} />
          <stop offset="1" stopColor={wax[2]} />
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
      <ellipse cx="30" cy="56" rx="16" ry="3" fill={wax[3]} />
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
      <path
        d="M11 44h38v48a6 6 0 0 1-6 6H17a6 6 0 0 1-6-6z"
        fill={`url(#${id}glass)`}
        stroke="#fff"
        strokeOpacity="0.35"
      />
      <rect x="10" y="42" width="40" height="4" rx="2" fill="#fff" fillOpacity="0.3" />
      {season === 'christmas' ? (
        <g>
          <path
            d="M24 74c3-5 8-5 6 0 4-2 6 2 2 4-3 1-6 0-8-4zM36 74c-3-5-8-5-6 0-4-2-6 2-2 4 3 1 6 0 8-4z"
            fill="#3f8a5a"
          />
          <circle cx="29" cy="76" r="2" fill="#d64545" />
          <circle cx="32" cy="77.5" r="2" fill="#d64545" />
        </g>
      ) : season === 'halloween' ? (
        <path d="M30 72c-2-3-5-3-7-1 2 0 3 2 2 4 2-1 3 0 5 2 2-2 3-3 5-2-1-2 0-4 2-4-2-2-5-2-7 1z" fill="#3b2a22" />
      ) : season === 'valentine' ? (
        <path d="M30 71c2-4 8-3 6 2-1.5 3-6 6-6 6s-4.5-3-6-6c-2-5 4-6 6-2z" fill="#e05a73" />
      ) : season === 'easter' ? (
        <g>
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} cx="30" cy="71" rx="2" ry="3" fill="#fbe39a" transform={`rotate(${r} 30 74)`} />
          ))}
          <circle cx="30" cy="74" r="1.6" fill="#f2a7b8" />
        </g>
      ) : (
        <>
          <rect x="17" y="68" width="26" height="12" rx="2" fill="#c49a5a" fillOpacity="0.85" />
          <text
            x="30"
            y="75.8"
            textAnchor="middle"
            fontSize="4.3"
            letterSpacing="0.1"
            fontFamily="Fraunces Variable, serif"
            fill="#3b2a22"
          >
            old books
          </text>
        </>
      )}
    </svg>
  );
}

/** A ceramic mug with a heart, rising steam, on a little stack of books */
/** Tap the mug: it wobbles, a puff of steam rises and a little heart floats up */
const MUG: Record<Season | 'default', { colors: [string, string, string]; rim: string; tea: string }> = {
  default: { colors: ['#6a2632', '#8e3a47', '#5a1f29'], rim: '#4a1821', tea: '#7b4a30' },
  christmas: { colors: ['#a3202b', '#d23a3a', '#8a1a24'], rim: '#6e131b', tea: '#f7efe6' },
  halloween: { colors: ['#3b2a4f', '#5a3f73', '#2d1f3d'], rim: '#21162d', tea: '#6ab04c' },
  valentine: { colors: ['#e58a9a', '#f2a7b8', '#d97085'], rim: '#c25d72', tea: '#8a5a44' },
  easter: { colors: ['#f1d27a', '#f7e3a1', '#e2bf5f'], rim: '#c9a54a', tea: '#c98a5a' },
};

export function Mug({ className = '', season }: { className?: string; season?: Season }) {
  const id = useId();
  const look = MUG[season ?? 'default'];
  const [sips, setSips] = useState(0);
  return (
    <motion.svg
      viewBox="0 0 80 94"
      className={className}
      role="button"
      aria-label="Mug of tea"
      style={{ cursor: 'pointer', overflow: 'visible', WebkitTapHighlightColor: 'transparent' }}
      onClick={() => setSips((n) => n + 1)}
    >
      <defs>
        <linearGradient id={`${id}mug`} x1="0" x2="1">
          <stop offset="0" stopColor={look.colors[0]} />
          <stop offset="0.4" stopColor={look.colors[1]} />
          <stop offset="1" stopColor={look.colors[2]} />
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
      {/* a heart floats up from the tea after a tap */}
      {sips > 0 && (
        <motion.path
          key={`heart${sips}`}
          d="M38 20c2-4 8-3 6 2-1.5 3-6 6-6 6s-4.5-3-6-6c-2-5 4-6 6-2z"
          fill="#e58a9a"
          initial={{ opacity: 0, y: 8, scale: 0.6 }}
          animate={{ opacity: [0, 1, 1, 0], y: [8, -6, -20, -34], scale: [0.6, 1, 1.05, 1], x: [0, -3, 3, 0] }}
          transition={{ duration: 2.2, ease: 'easeOut' }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      )}
      {sips > 0 &&
        [30, 46].map((x, i) => (
          <motion.path
            key={`puff${sips}-${i}`}
            d={`M${x} 30c-4-5 4-8 0-13`}
            stroke="#f3ebe1"
            strokeWidth="2.6"
            strokeLinecap="round"
            fill="none"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: [0, 0.9, 0], y: [4, -10] }}
            transition={{ duration: 1.4, delay: i * 0.15 }}
          />
        ))}
      {/* mug (wobbles when tapped) */}
      <motion.g
        key={`mug${sips}`}
        animate={sips ? { rotate: [0, -7, 5, -2, 0] } : undefined}
        transition={{ duration: 0.6 }}
        style={{ transformBox: 'view-box', transformOrigin: '38px 72px' }}
      >
        <path d="M18 36h40v24a12 12 0 0 1-12 12H30a12 12 0 0 1-12-12z" fill={`url(#${id}mug)`} />
        <path
          d="M58 41h4a8 8 0 0 1 0 16h-5"
          stroke={look.colors[0]}
          strokeWidth="4.5"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="38" cy="36" rx="20" ry="3.4" fill={look.rim} />
        <ellipse cx="38" cy="36.6" rx="17" ry="2.4" fill={look.tea} />
        {season === 'christmas' ? (
          <>
            <rect x="30" y="33.5" width="4" height="3" rx="1" fill="#fff" />
            <rect x="38" y="34" width="4" height="3" rx="1" fill="#fde2e6" />
            <path
              d="M33 44v12M27.8 47l10.4 6M27.8 53l10.4-6"
              stroke="#fff"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.9"
            />
          </>
        ) : season === 'halloween' ? (
          <>
            {[32, 42].map((x, i) => (
              <motion.circle
                key={x}
                cx={x}
                cy={35}
                r={1.6}
                fill="#9be07b"
                animate={{ y: [0, -5], opacity: [1, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.7 }}
              />
            ))}
            <path d="M33 47c-2-3-5-3-7-1 2 0 3 2 2 4 2-1 3 0 5 2 2-2 3-3 5-2-1-2 0-4 2-4-2-2-5-2-7 1z" fill="#ff9f43" />
          </>
        ) : season === 'easter' ? (
          <g>
            {[0, 72, 144, 216, 288].map((r) => (
              <ellipse key={r} cx="33" cy="46" rx="2.2" ry="3.4" fill="#fff" transform={`rotate(${r} 33 49)`} />
            ))}
            <circle cx="33" cy="49" r="1.8" fill="#f2a7b8" />
          </g>
        ) : (
          <path
            d="M33 47c2-4 7-3 5 1-1 3-5 5-5 5s-4-2-5-5c-2-4 3-5 5-1z"
            fill={season === 'valentine' ? '#c8344d' : '#f1dcdc'}
            opacity="0.9"
          />
        )}
        <path d="M23 40v20" stroke="#fff" strokeOpacity="0.18" strokeWidth="3" strokeLinecap="round" />
      </motion.g>
      {/* books underneath */}
      <rect x="6" y="72" width="66" height="10" rx="1.5" fill="#5f6b52" />
      <rect x="6" y="73" width="3" height="8" fill="#e9c98f" opacity="0.7" />
      <rect x="64" y="73.5" width="6" height="7" fill="#f3ead9" />
      <ellipse cx="41" cy="93.5" rx="34" ry="1.6" fill="#000" opacity="0.35" />
      <rect x="10" y="82" width="62" height="12" rx="1.5" fill="#a0644b" />
      <rect x="10" y="82" width="62" height="2" rx="1" fill="#fff" opacity="0.15" />
      <rect x="14" y="85" width="34" height="2" fill="#e9c98f" opacity="0.7" />
      <rect x="66" y="83.5" width="5" height="9" fill="#f3ead9" />
    </motion.svg>
  );
}

/**
 * The tabby cat asleep on top of the bookcase (dreaming of the wishlist). Eyes closed, little
 * "z"s drift up towards the dream cloud, and now and then the tail gives a lazy flick. The tail
 * keeps its shape and only rotates around where it joins the body, so nothing can flicker.
 */
export function ShelfCat({
  className = '',
  season,
  mood,
}: {
  className?: string;
  season?: Season;
  /** content: she read today (a little heart floats up) · peek: not yet, and it's evening (one eye open) */
  mood?: 'content' | 'peek';
}) {
  const id = useId();
  return (
    <svg viewBox="0 0 150 80" className={className} aria-hidden style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${id}fur`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c08a5c" />
          <stop offset="1" stopColor="#9a6a43" />
        </linearGradient>
      </defs>
      {/* body */}
      <path d="M44 74c-4-20 14-34 40-34 24 0 36 12 34 34z" fill={`url(#${id}fur)`} />
      <path
        d="M70 42c2 6 2 12 0 18M82 40c2 7 2 14 0 21M94 42c2 6 2 12 0 18M104 48c2 5 2 10 0 14"
        stroke="#8a5a36"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      {/* tail: grows out of the back of the body (drawn in front, so it never disappears behind the
          cat) and curls up; a slow, lazy flick of the tip now and then */}
      <motion.g
        style={{ transformOrigin: '112px 70px', transformBox: 'view-box', willChange: 'transform' }}
        animate={{ rotate: [0, 0, -9, 0, 0] }}
        transition={{ duration: 7, repeat: Infinity, times: [0, 0.55, 0.68, 0.82, 1], ease: 'easeInOut' }}
      >
        <path d="M108 71c16 3 31 0 34-15" stroke="#a87449" strokeWidth="8" strokeLinecap="round" fill="none" />
        <path
          d="M139.5 61c1.6-1.8 2.4-3.6 2.5-5"
          stroke="#8a5a36"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />
      </motion.g>
      {/* front paws */}
      <ellipse cx="34" cy="74" rx="9" ry="4.5" fill="#f2e3cf" />
      <ellipse cx="52" cy="75" rx="9" ry="4.5" fill="#f2e3cf" />
      {/* head */}
      {season !== 'christmas' && season !== 'halloween' && (
        <>
          <path d="M22 34l2-17 12 10z" fill="#a87449" />
          <path d="M54 27l12-10 2 17z" fill="#a87449" />
          <path d="M25.5 29l1.2-8 6 5z" fill="#e7b9a8" />
          <path d="M57 26l6-5 1.2 8z" fill="#e7b9a8" />
        </>
      )}
      <ellipse cx="45" cy="47" rx="25" ry="21" fill={`url(#${id}fur)`} />
      <path
        d="M40 27c2 3 2 6 0 9M46 26c1 3 1 6 0 9M52 27c-1 3-1 6 0 9"
        stroke="#8a5a36"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      {/* muzzle */}
      <ellipse cx="45" cy="57" rx="12" ry="9" fill="#f2e3cf" />
      <path d="M42 53.5h6l-3 3z" fill="#d98b84" />
      <path
        d="M45 56.5v2.5M45 59c-2 2-4 2-5 0M45 59c2 2 4 2 5 0"
        stroke="#5c4033"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
      {/* closed, sleepy eyes (or one peeking open: "did you read yet?") */}
      <path
        d={mood === 'peek' ? 'M30.5 45.5q4.5 3.2 9 0' : 'M30.5 45.5q4.5 3.2 9 0M50.5 45.5q4.5 3.2 9 0'}
        stroke="#3b2a22"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      {mood === 'peek' && (
        <motion.g
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          animate={{ scaleY: [1, 1, 0.12, 1, 1] }}
          transition={{ duration: 4.5, repeat: Infinity, times: [0, 0.8, 0.84, 0.88, 1] }}
        >
          <ellipse cx="55" cy="45.2" rx="3.7" ry="4.3" fill="#3b2a22" />
          <circle cx="56.4" cy="43.6" r="1.35" fill="#fff" />
          <circle cx="53.9" cy="46.7" r="0.6" fill="#fff" opacity="0.8" />
        </motion.g>
      )}
      {/* rosy cheeks when she's content */}
      {mood === 'content' && (
        <>
          <ellipse cx="29" cy="52" rx="3.4" ry="2" fill="#e7a3a0" opacity="0.55" />
          <ellipse cx="61" cy="52" rx="3.4" ry="2" fill="#e7a3a0" opacity="0.55" />
        </>
      )}
      {/* whiskers */}
      <path
        d="M33 57l-14-2M33 60l-13 2M57 57l14-2M57 60l13 2"
        stroke="#fff"
        strokeOpacity="0.7"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      {season && <CatHat season={season} />}
      {/* she read today: a little heart floats up now and then */}
      {mood === 'content' && (
        <motion.path
          d="M0 2.2c-1.6-2.6-5-1.4-4.4 1.2.4 1.8 4.4 4.6 4.4 4.6s4-2.8 4.4-4.6C5 .8 1.6-.4 0 2.2z"
          fill="#e05a73"
          initial={{ opacity: 0, x: 66, y: 22, scale: 0.6 }}
          animate={{ opacity: [0, 1, 1, 0], x: [66, 70, 66, 71], y: [22, 12, 2, -8], scale: [0.6, 1, 1, 0.9] }}
          transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 2.5, ease: 'easeOut' }}
        />
      )}
      {/* z z z, drifting up and away from the head (left of the ear) */}
      {mood !== 'peek' &&
        [0, 1, 2].map((i) => (
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
export function FairyLights({ className = '', season }: { className?: string; season?: Season }) {
  const colors = SEASON_LIGHTS[season ?? 'default'];
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
        const color = colors[i % 3];
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
      style={{ overflow: 'visible' }}
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
        <circle cx="117" cy="95" r="6" fill={`url(#${id}c)`} />
        <circle cx="123" cy="109" r="4" fill={`url(#${id}c)`} />
        <circle cx="128" cy="121" r="2.6" fill={`url(#${id}c)`} />
      </g>
      <text
        x="80"
        y="49"
        textAnchor="middle"
        fontFamily="Inter Variable, sans-serif"
        fontSize="7.5"
        letterSpacing="1.1"
        fill="#a08a78"
      >
        WISHLIST
      </text>
      <text
        x="80"
        y="63"
        textAnchor="middle"
        fontFamily="Fraunces Variable, serif"
        fontSize="12"
        fontWeight="600"
        fill="#7a2e3a"
      >
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
const today = () => new Date().toISOString().slice(0, 10);
const wateredToday = () => {
  try {
    return localStorage.getItem('snug-plant-watered') === today();
  } catch {
    return false;
  }
};

/**
 * Tap the plant to water it: drops fall, the vines do a happy little dance and four little flowers
 * open between the leaves (they stay for the day). Tap again and they close, one by one.
 */
export function HangingPlant({ className = '' }: { className?: string }) {
  const id = useId();
  const [waters, setWaters] = useState(0);
  const [bloom, setBloom] = useState(wateredToday);
  const tap = () => {
    if (bloom) {
      setBloom(false);
      try {
        localStorage.removeItem('snug-plant-watered');
      } catch {
        /* nothing to forget */
      }
      return;
    }
    setWaters((n) => n + 1);
    setTimeout(() => setBloom(true), 900);
    try {
      localStorage.setItem('snug-plant-watered', today());
    } catch {
      /* no storage: it just flowers until the app closes */
    }
  };
  // a small five-petal flower on the stem, in the gap between two leaves; `n` = its turn (0–3)
  const flower = (x: number, y: number, n: number, color: string) => (
    <motion.g
      key={`f${n}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, transition: { delay: n * 0.18, type: 'spring', stiffness: 260, damping: 12 } }}
      exit={{ scale: 0, opacity: 0, transition: { delay: (3 - n) * 0.22, duration: 0.25 } }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx={x} cy={y - 2.4} rx="1.8" ry="2.6" fill={color} transform={`rotate(${r} ${x} ${y})`} />
      ))}
      <circle cx={x} cy={y} r="1.3" fill="#f3d27a" />
    </motion.g>
  );
  // heart-shaped leaf at (x, y), turned by `r` degrees
  const leaf = (x: number, y: number, r: number, s = 1, shade = 0) => (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path
        d="M0 0c-6-2-9-8-6-12 2-3 5-2 6 0 1-2 4-3 6 0 3 4 0 10-6 12z"
        fill={['#6f8f5c', '#85a56f', '#5f7d4f'][shade]}
      />
      <path d="M0 0v-10" stroke="#4f6a42" strokeWidth="0.7" opacity="0.6" />
    </g>
  );
  const vine = (
    d: string,
    leaves: [number, number, number, number?, number?][],
    delay: number,
    originX: number,
    flowers?: ReactNode,
  ) => (
    <motion.g
      style={{ transformOrigin: `${originX}px 46px`, transformBox: 'view-box', willChange: 'transform' }}
      key={`v${originX}-${waters}`}
      animate={waters ? { rotate: [-2.5, 7, -6, 4, -2.5, 2.5, -2.5] } : { rotate: [-2.5, 2.5, -2.5] }}
      transition={
        waters
          ? { duration: 6, times: [0, 0.06, 0.13, 0.2, 0.28, 0.64, 1], ease: 'easeInOut', delay: 0.6 }
          : { duration: 6, repeat: Infinity, ease: 'easeInOut', delay }
      }
    >
      <path d={d} stroke="#5f7d4f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {leaves.map(([x, y, r, s, sh], i) => (
        <g key={i}>{leaf(x, y, r, s, sh)}</g>
      ))}
      <AnimatePresence>{flowers}</AnimatePresence>
    </motion.g>
  );
  return (
    <svg
      viewBox="0 0 90 160"
      className={className}
      role="button"
      aria-label={bloom ? 'Plant in bloom' : 'Water the plant'}
      onClick={tap}
      style={{ overflow: 'visible', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
    >
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
      {vine(
        'M26 48c-6 16-6 38-10 62-2 14-1 28 3 40',
        [
          [22, 62, 160, 1, 0],
          [18, 82, 200, 1.1, 2],
          [16, 102, 150, 1, 1],
          [16, 122, 210, 0.9, 0],
          [19, 142, 170, 0.8, 2],
        ],
        0,
        26,
        bloom && [flower(20.5, 72, 0, '#f2a7b8'), flower(14.6, 132, 3, '#f7c6d0')],
      )}
      {vine(
        'M42 49c3 18 2 36 5 56 2 12 1 22-1 30',
        [
          [44, 64, 200, 1, 1],
          [46, 84, 160, 1.1, 0],
          [47, 104, 210, 0.9, 2],
          [46, 124, 170, 0.8, 1],
        ],
        0.8,
        42,
        bloom && flower(45.6, 94, 1, '#f7c6d0'),
      )}
      {vine(
        'M60 48c7 12 10 26 10 42',
        [
          [63, 60, 210, 1, 2],
          [68, 74, 160, 0.9, 0],
          [70, 88, 200, 0.8, 1],
        ],
        1.6,
        60,
        bloom && flower(66.6, 67, 2, '#f2a7b8'),
      )}
      {/* water drops after a tap */}
      {waters > 0 &&
        [36, 46, 56].map((x, i) => (
          <motion.path
            key={`drop${waters}-${i}`}
            d={`M${x} 0c2 3 3 5 3 6.5a3 3 0 0 1-6 0c0-1.5 1-3.5 3-6.5z`}
            fill="#8cc2e0"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: [0, 1, 1, 0], y: [-14, 10, 30, 36] }}
            transition={{ duration: 0.9, delay: i * 0.12, ease: 'easeIn' }}
          />
        ))}
      {/* watered today: little flowers on the vines */}
      {/* leaves on top of the pot: a low, full layer over the soil first, so the pot looks filled */}
      <ellipse cx="45" cy="45.5" rx="24" ry="3" fill="#5a3d2b" />
      {leaf(23, 49, -55, 0.85, 2)}
      {leaf(67, 49, 55, 0.85, 0)}
      {leaf(34, 48.5, -25, 0.95, 0)}
      {leaf(56, 48.5, 22, 0.95, 2)}
      {leaf(45, 48, 0, 0.9, 1)}
      {leaf(30, 44, -20, 1.1, 1)}
      {leaf(40, 42, 5, 1.2, 0)}
      {leaf(50, 43, 25, 1.1, 2)}
      {leaf(60, 45, 45, 1, 1)}
      {leaf(24, 46, -45, 1, 0)}
    </svg>
  );
}

/**
 * A little desk globe on a wooden stand. Only the land drifts slowly across the sphere (it turns);
 * the stand, the ring and the shading never move.
 */
export function Globe({ className = '' }: { className?: string }) {
  const id = useId();
  // one pattern of land, 40 wide; two copies side by side make it loop without a seam
  const land = (
    <>
      <path d="M4 22c4-5 10-5 13-1 2 3-1 6 1 9 2 3-1 7-5 7-4 0-8-3-9-7 0-3-2-5 0-8z" fill="#8f9e7f" />
      <path d="M24 16c4-2 8 0 9 4 1 3-2 4-1 7 1 3 5 3 4 7-1 3-6 4-9 2-3-2-2-6-4-8-2-3-1-9 1-12z" fill="#b9a779" />
      <circle cx="21" cy="42" r="2" fill="#8f9e7f" />
      <circle cx="3" cy="36" r="1.6" fill="#b9a779" />
    </>
  );
  return (
    <svg viewBox="0 0 50 72" className={className} aria-hidden>
      <defs>
        <clipPath id={`${id}clip`}>
          <circle cx="25" cy="30" r="17.5" />
        </clipPath>
        <radialGradient id={`${id}sea`} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#7fa8c9" />
          <stop offset="1" stopColor="#4a7899" />
        </radialGradient>
        <radialGradient id={`${id}shade`} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#1d2f3d" stopOpacity="0.45" />
        </radialGradient>
      </defs>
      {/* foot and stem */}
      <ellipse cx="25" cy="68" rx="14" ry="4" fill="#6b4630" />
      <ellipse cx="25" cy="66.5" rx="13" ry="3" fill="#8b5e3c" />
      <rect x="23.4" y="49" width="3.2" height="17" fill="#a47148" />
      <ellipse cx="25" cy="63.5" rx="4.5" ry="1.6" fill="#c49a5a" />
      {/* the ring the globe turns in */}
      <circle cx="25" cy="30" r="21" fill="none" stroke="#c49a5a" strokeWidth="1.8" />
      {/* the sphere with its turning land */}
      <circle cx="25" cy="30" r="17.5" fill={`url(#${id}sea)`} />
      <g clipPath={`url(#${id}clip)`}>
        <motion.g
          initial={{ x: 0 }}
          animate={{ x: -40 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        >
          <g transform="translate(-5 0)">{land}</g>
          <g transform="translate(35 0)">{land}</g>
          <g transform="translate(75 0)">{land}</g>
        </motion.g>
        <circle cx="25" cy="30" r="17.5" fill={`url(#${id}shade)`} />
        <ellipse cx="18.5" cy="20.5" rx="5" ry="3" fill="#fff" opacity="0.22" transform="rotate(-35 18.5 20.5)" />
      </g>
      <circle cx="25" cy="30" r="17.5" fill="none" stroke="#35566f" strokeOpacity="0.35" strokeWidth="0.8" />
      {/* the pins at both poles */}
      <circle cx="25" cy="9" r="1.8" fill="#c49a5a" />
      <circle cx="25" cy="51" r="1.8" fill="#c49a5a" />
    </svg>
  );
}

/** A small framed picture standing on the shelf: a moonlit hill */
export function Painting({ className = '' }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 56 68" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f4e5a" />
          <stop offset="1" stopColor="#d9a27a" />
        </linearGradient>
      </defs>
      {/* little feet it stands on */}
      <rect x="9" y="61" width="7" height="7" rx="1.5" fill="#5e3d28" />
      <rect x="40" y="61" width="7" height="7" rx="1.5" fill="#5e3d28" />
      {/* frame, mat and picture */}
      <rect x="4" y="4" width="48" height="58" rx="2.5" fill="#8b5e3c" />
      <rect x="7" y="7" width="42" height="52" rx="1.5" fill="#a47148" />
      <rect x="10" y="10" width="36" height="46" fill="#f4ead9" />
      <rect x="13" y="13" width="30" height="40" fill={`url(#${id}sky)`} />
      <circle cx="33" cy="23" r="7" fill="#f6e7b8" opacity="0.25" />
      <circle cx="33" cy="23" r="4.2" fill="#f6e7b8" />
      <circle cx="19" cy="19" r="0.8" fill="#fff" opacity="0.85" />
      <circle cx="26" cy="16" r="0.6" fill="#fff" opacity="0.7" />
      <path d="M13 44c6-8 12-9 18-5 4 2 8 2 12-3v17H13z" fill="#8f9e7f" />
      <path d="M13 49c7-4 14-3 20 0s8 2 10 0v4H13z" fill="#5f6b52" />
      {/* a tiny lit window on the hill */}
      <rect x="21" y="41" width="3.5" height="3" fill="#f6d27a" />
      <path d="M20 41l3.2-2.4L26.5 41z" fill="#6b4630" />
      {/* a soft shine over the glass */}
      <path d="M13 13h14L13 30z" fill="#fff" opacity="0.1" />
    </svg>
  );
}
