import { motion } from 'motion/react';

/** Small ring with a match percentage, coloured by how good the match is */
export function MatchRing({ score, size = 44 }: { score: number; size?: number }) {
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  const color = score >= 85 ? '#7A2E3A' : score >= 70 ? '#8F9E7F' : score >= 55 ? '#C49A5A' : '#A08A78';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={`${score}% match`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-sand)" strokeWidth="4" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - score / 100) }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-soft text-[0.72rem] font-semibold" style={{ color }}>
        {score}%
      </span>
    </div>
  );
}

export function matchLabel(score: number) {
  if (score >= 85) return 'Made for you';
  if (score >= 70) return 'Great match';
  if (score >= 55) return 'Worth a try';
  return 'A wildcard';
}
