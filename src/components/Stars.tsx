import { useRef, useState } from 'react';
import { motion } from 'motion/react';

const STAR = 'M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z';

function Star({ fill, size }: { fill: number; size: number }) {
  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size} height={size} className="absolute inset-0">
        <path d={STAR} fill="var(--color-sand)" stroke="var(--color-oat)" strokeWidth="1" strokeLinejoin="round" />
      </svg>
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <path d={STAR} fill="var(--color-gold)" stroke="#b0874a" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}

export function formatRating(r: number) {
  return r % 1 === 0 ? r.toFixed(0) : r.toFixed(2).replace(/0$/, '');
}

/** Read-only stars, supports quarter values */
export function StarsDisplay({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-[1px]" aria-label={`${value} stars`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} fill={Math.max(0, Math.min(1, value - i))} size={size} />
      ))}
    </span>
  );
}

/** Tap or slide across the stars; snaps to quarter stars */
export function StarsInput({
  value,
  onChange,
  size = 36,
}: {
  value?: number;
  onChange: (v: number | undefined) => void;
  size?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<number | undefined>();
  const [sparkle, setSparkle] = useState(0);
  const shown = draft ?? value ?? 0;

  const valueAt = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    return Math.min(5, Math.max(0.25, Math.ceil(ratio * 20) / 4));
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        key={sparkle}
        animate={sparkle ? { scale: [1, 1.08, 1] } : undefined}
        transition={{ duration: 0.35 }}
        ref={ref}
        className="flex touch-none gap-1 select-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDraft(valueAt(e.clientX));
        }}
        onPointerMove={(e) => {
          if (draft !== undefined) setDraft(valueAt(e.clientX));
        }}
        onPointerUp={(e) => {
          const v = valueAt(e.clientX);
          setDraft(undefined);
          onChange(v);
          setSparkle((s) => s + 1);
        }}
        onPointerCancel={() => setDraft(undefined)}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={shown}
        aria-label="Rating"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') onChange(Math.min(5, (value ?? 0) + 0.25));
          if (e.key === 'ArrowLeft') onChange(Math.max(0.25, (value ?? 0.5) - 0.25));
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} fill={Math.max(0, Math.min(1, shown - i))} size={size} />
        ))}
      </motion.div>
      <div className="flex h-5 items-center gap-3 text-sm text-cocoa">
        {shown > 0 ? (
          <>
            <span className="font-soft text-base font-semibold text-ink">{formatRating(shown)}</span>
            {value !== undefined && draft === undefined && (
              <button className="text-xs underline decoration-dotted" onClick={() => onChange(undefined)}>
                clear
              </button>
            )}
          </>
        ) : (
          <span>Tap or slide to rate</span>
        )}
      </div>
    </div>
  );
}
