import { db } from '../db';
import { updateBook } from './library';

/** Same-origin address for a cover, so its pixels can be read */
const readable = (src: string) => (src.startsWith('data:') ? src : `/api/img?url=${encodeURIComponent(src)}`);

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const hex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** The cover's main colour: the most common colour family, averaged */
export async function dominantColor(src: string): Promise<string | undefined> {
  const img = await loadImage(readable(src));
  const w = 24;
  const h = 36;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bucket.n++;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }
  const top = [...buckets.values()].sort((a, b) => b.n - a.n)[0];
  return top ? hex(top.r / top.n, top.g / top.n, top.b / top.n) : undefined;
}

/** Light colours get dark text on the spine, dark colours light text */
export function isLight(color: string) {
  const n = parseInt(color.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

let running = false;

/** Works out spine colours for books whose cover changed (one at a time, in the background) */
export async function updateSpineColors() {
  if (running) return;
  running = true;
  try {
    const todo = await db.books
      .filter((b) => !b.deleted && !!(b.customCover || b.coverUrl) && b.spineColorFrom !== (b.customCover || b.coverUrl))
      .toArray();
    for (const b of todo) {
      const src = b.customCover || b.coverUrl!;
      const color = await dominantColor(src).catch(() => undefined);
      await updateBook(b.id, { spineColor: color, spineColorFrom: src });
    }
  } finally {
    running = false;
  }
}
