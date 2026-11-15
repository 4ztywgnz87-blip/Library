import { useId } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';

/**
 * The bookcase dresses up for special times of the year. Each season starts and ends on a fixed
 * date (Easter moves with the calendar). Outside these dates it's the everyday bookcase.
 *
 *   Halloween   15 Oct – 1 Nov
 *   Christmas    1 Dec – 6 Jan (through New Year)
 *   Valentine    7 Feb – 14 Feb
 *   Easter       Palm Sunday – Easter Monday
 */
export type Season = 'christmas' | 'halloween' | 'valentine' | 'easter';

/** Easter Sunday (Gregorian), Meeus/Jones/Butcher */
function easter(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function seasonFor(date: Date): Season | undefined {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if ((m === 10 && d >= 15) || (m === 11 && d === 1)) return 'halloween';
  if (m === 12 || (m === 1 && d <= 6)) return 'christmas';
  if (m === 2 && d >= 7 && d <= 14) return 'valentine';
  const e = easter(date.getFullYear());
  const day = 86_400_000;
  const t = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (t >= e.getTime() - 7 * day && t <= e.getTime() + day) return 'easter';
  return undefined;
}

/** Today's season (a `?season=christmas` in the address shows one any day, to preview it) */
export function useSeason(): Season | undefined {
  const [params] = useSearchParams();
  const forced = params.get('season');
  if (forced === 'none') return undefined;
  if (forced === 'christmas' || forced === 'halloween' || forced === 'valentine' || forced === 'easter') return forced;
  return seasonFor(new Date());
}

/** Fairy light colours per season */
export const SEASON_LIGHTS: Record<Season | 'default', string[]> = {
  default: ['#ffd27a', '#ffb89a', '#fff0b8'],
  christmas: ['#ff6b6b', '#7fd17f', '#ffd27a'],
  halloween: ['#ff9f43', '#b48cff', '#ffcf6b'],
  valentine: ['#ff8fab', '#ffc2d1', '#ff6b8a'],
  easter: ['#ffe58a', '#b8e6b0', '#d7c4ff'],
};

// ---------- things on top of the bookcase ----------

/** A little potted Christmas tree with twinkling baubles and a star */
export function ChristmasTree({ className = '' }: { className?: string }) {
  const id = useId();
  const baubles: [number, number, string][] = [
    [30, 40, '#d64545'],
    [48, 50, '#e8b84a'],
    [24, 62, '#e8b84a'],
    [42, 70, '#d64545'],
    [56, 74, '#5aa0d6'],
    [34, 84, '#5aa0d6'],
  ];
  return (
    <svg viewBox="0 0 80 120" className={className} aria-hidden style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${id}tree`} x1="0" x2="1">
          <stop offset="0" stopColor="#2f6b46" />
          <stop offset="0.5" stopColor="#3f8a5a" />
          <stop offset="1" stopColor="#2a5f3e" />
        </linearGradient>
      </defs>
      <path d="M40 14 L58 44 H50 L66 70 H56 L72 96 H8 L24 70 H14 L30 44 H22 Z" fill={`url(#${id}tree)`} />
      {/* a dusting of snow */}
      <path d="M30 44h20M24 70h32M14 96h52" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
      {baubles.map(([x, y, c], i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={y}
          r="3.4"
          fill={c}
          animate={{ opacity: [1, 0.55, 1] }}
          transition={{ duration: 2 + (i % 3) * 0.6, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
      <motion.path
        d="M40 4l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"
        fill="#f3c74f"
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 2.4, repeat: Infinity }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      {/* pot */}
      <path d="M26 96h28l-3 20H29z" fill="#b8654a" />
      <rect x="23" y="94" width="34" height="6" rx="2" fill="#d08a6c" />
      <path d="M32 100v14" stroke="#fff" strokeOpacity="0.18" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** A glowing jack-o'-lantern (and a tiny one next to it) */
export function Pumpkins({ className = '' }: { className?: string }) {
  const pumpkin = (x: number, y: number, s: number, face: boolean) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -26c3-6 8-8 12-7-4 2-6 5-6 8z" fill="#5f7d4f" />
      <ellipse cx="-12" cy="0" rx="14" ry="22" fill="#d9772f" />
      <ellipse cx="12" cy="0" rx="14" ry="22" fill="#d9772f" />
      <ellipse cx="0" cy="0" rx="14" ry="24" fill="#e8893a" />
      <path d="M-12 -18c-3 10-3 26 0 36M12 -18c3 10 3 26 0 36" stroke="#b85f23" strokeWidth="1.5" fill="none" />
      {face && (
        <motion.g animate={{ opacity: [0.75, 1, 0.8, 1] }} transition={{ duration: 1.6, repeat: Infinity }}>
          <path d="M-14 -6l6-6 5 6zM14 -6l-6-6-5 6zM-2 1l2-4 2 4z" fill="#ffd56b" />
          <path d="M-16 6c6 6 26 6 32 0l-3 8-4-3-4 4-4-4-4 4-4-4-4 3z" fill="#ffd56b" />
        </motion.g>
      )}
    </g>
  );
  return (
    <svg viewBox="0 0 110 70" className={className} aria-hidden style={{ overflow: 'visible' }}>
      <ellipse cx="44" cy="68" rx="40" ry="3" fill="#000" opacity="0.18" />
      {pumpkin(40, 42, 1, true)}
      {pumpkin(88, 54, 0.55, false)}
    </svg>
  );
}

/** A small vase with three roses */
export function RoseVase({ className = '' }: { className?: string }) {
  const rose = (x: number, y: number, c: string) => (
    <g>
      <circle cx={x} cy={y} r="7" fill={c} />
      <path
        d={`M${x - 4} ${y}c2-4 6-4 8 0M${x - 2} ${y + 3}c1-3 4-3 5 0`}
        stroke="#000"
        strokeOpacity="0.18"
        fill="none"
        strokeWidth="1.2"
      />
    </g>
  );
  return (
    <svg viewBox="0 0 70 110" className={className} aria-hidden style={{ overflow: 'visible' }}>
      <path
        d="M35 70c-2-18-12-34-12-46M35 70c0-20 2-38 2-52M35 70c3-18 12-30 14-42"
        stroke="#5f7d4f"
        strokeWidth="2"
        fill="none"
      />
      <path d="M28 46c-6-2-8-6-6-9 4 0 6 4 6 9zM44 44c6-2 8-6 6-9-4 0-6 4-6 9z" fill="#6f8f5c" />
      {rose(23, 22, '#c8344d')}
      {rose(37, 14, '#e05a73')}
      {rose(50, 26, '#c8344d')}
      <path d="M22 70h26l-3 34a6 6 0 0 1-6 5h-8a6 6 0 0 1-6-5z" fill="#f3d6dc" opacity="0.9" />
      <path d="M30 80c2 3 6 3 8 0" stroke="#e05a73" strokeWidth="1.5" fill="none" />
      <path d="M33 86c1-3 5-3 4 1-1 2-3 3-3 3s-2-1-3-3c-1-3 2-4 2-1z" fill="#e05a73" />
    </svg>
  );
}

/** A little basket of painted eggs */
export function EggBasket({ className = '' }: { className?: string }) {
  const egg = (x: number, y: number, c: string, stripe: string, r: number) => (
    <g transform={`rotate(${r} ${x} ${y})`}>
      <ellipse cx={x} cy={y} rx="7" ry="9" fill={c} />
      <path d={`M${x - 6} ${y}h12`} stroke={stripe} strokeWidth="2.2" strokeDasharray="2 2" />
    </g>
  );
  return (
    <svg viewBox="0 0 90 70" className={className} aria-hidden style={{ overflow: 'visible' }}>
      <path d="M14 34c0-26 62-26 62 0" stroke="#b8865a" strokeWidth="3" fill="none" />
      {egg(30, 34, '#f6c8d6', '#fff', -15)}
      {egg(45, 31, '#cfe8b8', '#fff', 5)}
      {egg(60, 34, '#d7c8f4', '#fff', 18)}
      {egg(38, 40, '#fbe39a', '#f2a7b8', -5)}
      <path d="M10 40h70l-6 24H16z" fill="#c9965f" />
      <path d="M12 46h66M14 54h62" stroke="#a87449" strokeWidth="1.5" />
    </svg>
  );
}

// ---------- what the cat wears (drawn in the cat's own coordinates: viewBox 0 0 150 80) ----------

export function CatHat({ season }: { season: Season }) {
  if (season === 'christmas')
    // (the cat's ears are left out under the hat, so it sits right on the head)
    return (
      <g>
        <path d="M23 35C24 16 42 4 60 9c10 3 17 10 23 19-6-3-12-3-16 1-10-5-28-4-44 6z" fill="#c8344d" />
        <path
          d="M47 8c6 0 11 2 15 5"
          stroke="#fff"
          strokeOpacity="0.25"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M22.5 37A24.5 20.5 0 0 1 67.5 37" stroke="#fff" strokeWidth="7" strokeLinecap="round" fill="none" />
        <motion.circle
          cx="84"
          cy="29"
          r="5"
          fill="#fff"
          animate={{ y: [0, 1.5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </g>
    );
  if (season === 'halloween')
    return (
      <g>
        <path d="M34 26c4-14 8-30 22-38-4 10-2 22 4 34z" fill="#3b2a4f" />
        <path d="M37 22c8 1 16 1 22-1" stroke="#ff9f43" strokeWidth="3" fill="none" />
        <ellipse cx="46" cy="27" rx="28" ry="4.5" fill="#2d1f3d" />
      </g>
    );
  if (season === 'valentine')
    return (
      <g transform="translate(58 26) rotate(18)">
        <path d="M0 0c-6-6-14-4-12 2 2 5 12-2 12-2zM0 0c6-6 14-4 12 2-2 5-12-2-12-2z" fill="#e05a73" />
        <circle cx="0" cy="0" r="2.6" fill="#c8344d" />
      </g>
    );
  // easter: bunny ears on a headband that follows the top of the head
  return (
    <g>
      <g transform="rotate(-9 39 28)">
        <ellipse cx="39" cy="12" rx="5.2" ry="15" fill="#fff" />
        <ellipse cx="39" cy="13" rx="2.4" ry="10" fill="#f6c8d6" />
      </g>
      <g transform="rotate(9 51 28)">
        <ellipse cx="51" cy="12" rx="5.2" ry="15" fill="#fff" />
        <ellipse cx="51" cy="13" rx="2.4" ry="10" fill="#f6c8d6" />
      </g>
      <path d="M23.5 37A23.8 20 0 0 1 66.5 37" stroke="#f3d6dc" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  );
}

// ---------- little extras on the case ----------

/** Snow drifts on the cornice */
export function SnowCap({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 12" preserveAspectRatio="none" className={className} aria-hidden>
      <path
        d="M0 12V7c10-4 20 2 32-1s18-5 30-2 22 3 34 0 20-4 32-1 24 4 36 1 18-5 30-2 22 4 34 1 20-3 30-1 16 2 22 1 12-2 20-1V12z"
        fill="#fbfaf7"
      />
      <path d="M0 7c10-4 20 2 32-1s18-5 30-2" stroke="#dfe9f0" strokeWidth="1" fill="none" />
    </svg>
  );
}

/** A cobweb in the corner of the case, with a tiny spider bobbing on its thread */
export function Cobweb({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 60" className={className} aria-hidden>
      <g stroke="#e9e1d6" strokeOpacity="0.55" strokeWidth="0.8" fill="none">
        <path d="M60 0L56.8 36.9 M60 0L42.6 32.7 M60 0L31.7 23.8 M60 0L24.8 11.4 M60 0L23.0 1.3" />
        <path d="M59.0 12.0A12 12 0 0 1 48.0 0.4 M57.9 23.9A24 24 0 0 1 36.0 0.8 M56.9 35.9A36 36 0 0 1 24.0 1.3" />
      </g>
      <motion.g animate={{ y: [0, 6, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}>
        <path d="M46 22v14" stroke="#e9e1d6" strokeOpacity="0.6" strokeWidth="0.6" />
        <circle cx="46" cy="38" r="2.6" fill="#2a1d18" />
        <path d="M43 37l-3-2M43 39l-3 2M49 37l3-2M49 39l3 2" stroke="#2a1d18" strokeWidth="0.8" />
      </motion.g>
    </svg>
  );
}

/** Tiny hearts drifting up past the shelves (Valentine) */
export function FloatingHearts({ className = '' }: { className?: string }) {
  return (
    <div className={`overflow-hidden ${className}`} aria-hidden>
      {[12, 38, 66, 88].map((left, i) => (
        <motion.svg
          key={left}
          viewBox="0 0 16 14"
          className="absolute h-3.5 w-4"
          style={{ left: `${left}%`, bottom: '8%' }}
          animate={{ opacity: [0, 0.85, 0], y: [0, -140, -240] }}
          transition={{ duration: 7, repeat: Infinity, delay: i * 1.8, ease: 'easeOut' }}
        >
          <path d="M8 3c2-4 8-3 6 2-1.5 3-6 7-6 7S3.5 8 2 5C0 0 6-1 8 3z" fill="#ff8fab" />
        </motion.svg>
      ))}
    </div>
  );
}

/** Snowflakes drifting past the front of the case (Christmas) */
export function Snowfall({ className = '' }: { className?: string }) {
  return (
    <div className={`overflow-hidden ${className}`} aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <motion.span
          key={i}
          className="absolute top-0 rounded-full bg-white"
          style={{ left: `${5 + i * 10}%`, width: 3 + (i % 3), height: 3 + (i % 3) }}
          animate={{ y: [-10, 700], x: [0, i % 2 ? 10 : -10, 0], opacity: [0, 0.85, 0.85, 0] }}
          transition={{ duration: 10 + (i % 4) * 2, repeat: Infinity, delay: i * 1.1, ease: 'linear' }}
        />
      ))}
    </div>
  );
}
