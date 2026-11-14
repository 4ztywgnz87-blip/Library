import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { findCorners } from '../lib/ai';
import { warpToCover, type Pt } from '../lib/warp';
import { Button } from './ui';
import { CloseIcon } from './Icons';

const DEFAULT: Pt[] = [
  { x: 0.2, y: 0.12 },
  { x: 0.8, y: 0.12 },
  { x: 0.8, y: 0.88 },
  { x: 0.2, y: 0.88 },
];

interface Loaded {
  canvas: HTMLCanvasElement;
  url: string;
}

/** Downscales the photo (keeps the warp fast and the AI call light) */
async function load(file: Blob, max: number): Promise<Loaded> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return { canvas, url: canvas.toDataURL('image/jpeg', 0.85) };
}

/**
 * Her own cover photo: Snug finds the book in the photo, she can nudge the four corners,
 * and the cover is cut out and straightened (no background, no table, no fingers).
 */
export function CoverCropper({
  file,
  onDone,
  onCancel,
}: {
  file: Blob;
  onDone: (cover: string) => void;
  onCancel: () => void;
}) {
  const [img, setImg] = useState<Loaded | null>(null);
  const [quad, setQuad] = useState<Pt[]>(DEFAULT);
  const [finding, setFinding] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const touched = useRef(false);
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  const doneRef = useRef(false);

  // Its own history entry: swiping back (or the browser's back button) cancels
  useEffect(() => {
    window.history.pushState({ ...window.history.state, snugCrop: true }, '');
    const onPop = () => {
      if (!doneRef.current) cancelRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const cancel = () => window.history.back(); // → popstate → onCancel

  // The photo always fits the free space, so the buttons below stay on screen
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setArea({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const big = await load(file, 1600);
      if (!alive) return;
      setImg(big);
      try {
        const small = await load(file, 1024);
        const res = await findCorners(small.url, small.canvas.width, small.canvas.height);
        if (!alive || touched.current) return;
        if (res.corners) setQuad(res.corners);
        else setNote(res.mock ? null : "Snug couldn't spot the book. Drag the corners onto it.");
      } catch {
        if (alive) setNote('Drag the corners onto the corners of the cover.');
      } finally {
        if (alive) setFinding(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [file]);

  const move = (e: React.PointerEvent) => {
    if (drag === null || !boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    setQuad((q) => q.map((p, i) => (i === drag ? { x, y } : p)));
  };

  const save = () => {
    if (!img) return;
    setSaving(true);
    // let the button show its state before the (short) heavy work
    setTimeout(() => {
      const { width: w, height: h } = img.canvas;
      doneRef.current = true; // leaving via "back" below is not a cancel
      window.history.back();
      onDone(
        warpToCover(
          img.canvas,
          quad.map((p) => ({ x: p.x * w, y: p.y * h })),
        ),
      );
    }, 30);
  };

  const ratio = img ? img.canvas.width / img.canvas.height : 3 / 4;
  const pts = quad.map((p) => `${p.x},${p.y}`).join(' ');
  const active = drag !== null ? quad[drag] : null;

  return createPortal(
    <motion.div
      className="pt-safe pb-safe fixed inset-0 z-[60] flex flex-col bg-ink"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="relative px-12 pt-4 pb-3 text-center text-cream">
        <button
          onClick={cancel}
          aria-label="Cancel"
          className="absolute top-3 left-3 rounded-full p-2 text-cream/80 active:bg-white/10"
        >
          <CloseIcon />
        </button>
        <h2 className="font-soft text-xl font-semibold">Your cover</h2>
        <p className="mt-0.5 text-xs text-cream/70">
          {finding ? 'Snug is finding the book…' : (note ?? 'Drag the corners onto the corners of the cover')}
        </p>
      </div>

      <div ref={areaRef} className="mx-5 flex min-h-0 flex-1 items-center justify-center">
        {img ? (
          <div
            ref={boxRef}
            className="relative touch-none select-none"
            style={{
              width: Math.max(0, Math.min(area.w, area.h * ratio)),
              height: Math.max(0, Math.min(area.h, area.w / ratio)),
            }}
            onPointerMove={move}
            onPointerUp={() => setDrag(null)}
            onPointerCancel={() => setDrag(null)}
          >
            <img src={img.url} alt="" className="absolute inset-0 h-full w-full rounded-md" draggable={false} />
            <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
              {/* everything outside the cover is dimmed */}
              <path
                d={`M0,0 H1 V1 H0 Z M${quad.map((p) => `${p.x},${p.y}`).join(' L')} Z`}
                fill="rgba(30,20,16,0.55)"
                fillRule="evenodd"
              />
              <polygon
                points={pts}
                fill="none"
                stroke="#F6EFE6"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                className={finding ? 'animate-pulse' : ''}
              />
            </svg>
            {quad.map((p, i) => (
              <button
                key={i}
                aria-label="Move corner"
                className="absolute -mt-6 -ml-6 flex h-12 w-12 items-center justify-center"
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  touched.current = true;
                  setDrag(i);
                }}
                onPointerMove={move}
                onPointerUp={() => setDrag(null)}
              >
                <span
                  className={`block rounded-full border-2 border-cream bg-wine shadow-lg transition-transform ${
                    drag === i ? 'h-4 w-4' : 'h-6 w-6'
                  }`}
                />
              </button>
            ))}
            {/* magnifier above the finger, to put the corner exactly right */}
            {active && boxRef.current && (
              <Loupe url={img.url} point={active} box={boxRef.current.getBoundingClientRect()} />
            )}
          </div>
        ) : (
          <p className="text-sm text-cream/70">Opening your photo…</p>
        )}
      </div>

      <div className="flex gap-3 px-5 pt-4 pb-5">
        <Button variant="soft" className="flex-1 py-3.5" onClick={cancel}>
          Cancel
        </Button>
        <Button className="flex-1 py-3.5" disabled={!img || saving} onClick={save}>
          {saving ? 'Cutting out…' : 'Use this cover'}
        </Button>
      </div>
    </motion.div>,
    document.body,
  );
}

function Loupe({ url, point, box }: { url: string; point: Pt; box: DOMRect }) {
  const size = 104;
  const zoom = 2.5;
  const left = point.x * box.width - size / 2;
  // above the finger, or below it near the top edge
  const top =
    point.y * box.height - size - 44 < -box.top + 8 ? point.y * box.height + 44 : point.y * box.height - size - 44;
  return (
    <div
      className="pointer-events-none absolute overflow-hidden rounded-full border-2 border-cream shadow-xl"
      style={{
        width: size,
        height: size,
        left,
        top,
        backgroundImage: `url(${url})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${box.width * zoom}px ${box.height * zoom}px`,
        backgroundPosition: `${size / 2 - point.x * box.width * zoom}px ${size / 2 - point.y * box.height * zoom}px`,
      }}
    >
      <span className="absolute top-1/2 left-1/2 h-px w-4 -translate-x-1/2 bg-wine" />
      <span className="absolute top-1/2 left-1/2 h-4 w-px -translate-y-1/2 bg-wine" />
    </div>
  );
}
