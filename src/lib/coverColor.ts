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

/** Version of the colour rule: spines are worked out again when it changes */
const COLOR_RULE = 'v5';

/** Lightness, colourfulness (chroma: how far from grey, 0–1; cream and pastels are low) and hue (0–360) */
function tone(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const c = (max - min) / 255;
  let h = 0;
  if (max !== min) {
    if (max === r) h = ((g - b) / (max - min)) % 6;
    else if (max === g) h = (b - r) / (max - min) + 2;
    else h = (r - g) / (max - min) + 4;
    h = (h * 60 + 360) % 360;
  }
  return { l: (max + min) / 510, c, h };
}

/**
 * The cover's main colour, as a spine would have it: the strongest colour family on the cover
 * (a white or pale cream background hardly counts), averaged over just those pixels so it stays
 * a clean colour. A cover with almost no colour at all keeps its own (white, black, grey).
 */
export async function dominantColor(src: string): Promise<string | undefined> {
  const img = await loadImage(readable(src));
  const w = 32;
  const h = 48;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const BINS = 18; // 20° of hue each
  const bins = Array.from({ length: BINS }, () => ({ weight: 0, r: 0, g: 0, b: 0 }));
  let colourful = 0;
  const plain = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const t = tone(r, g, b);
    if (t.c >= 0.15 && t.l > 0.08 && !(t.l > 0.8 && t.c < 0.25)) {
      colourful++;
      const wgt = t.c ** 1.5;
      const bin = bins[Math.floor(t.h / (360 / BINS)) % BINS];
      bin.weight += wgt;
      bin.r += r * wgt;
      bin.g += g * wgt;
      bin.b += b * wgt;
    } else {
      const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      const p = plain.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      p.n++;
      p.r += r;
      p.g += g;
      p.b += b;
      plain.set(key, p);
    }
  }
  // hardly any colour (a white cover with a thin title, a black cover): its own main colour
  if (colourful / (w * h) < 0.12) {
    const top = [...plain.values()].sort((x, y) => y.n - x.n)[0];
    return top ? hex(top.r / top.n, top.g / top.n, top.b / top.n) : undefined;
  }
  // the strongest hue, together with its two neighbours (so a colour on a bin edge isn't split)
  let best = 0;
  let bestScore = -1;
  for (let i = 0; i < BINS; i++) {
    const score = bins[i].weight + 0.5 * (bins[(i + 1) % BINS].weight + bins[(i + BINS - 1) % BINS].weight);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  const pick = [bins[best], bins[(best + 1) % BINS], bins[(best + BINS - 1) % BINS]];
  const wsum = pick[0].weight + 0.5 * (pick[1].weight + pick[2].weight);
  const avg = (k: 'r' | 'g' | 'b') => (pick[0][k] + 0.5 * (pick[1][k] + pick[2][k])) / wsum;
  return hex(avg('r'), avg('g'), avg('b'));
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
      .filter(
        (b) =>
          !b.deleted &&
          !!(b.customCover || b.coverUrl) &&
          b.spineColorFrom !== `${COLOR_RULE}|${b.customCover || b.coverUrl}`,
      )
      .toArray();
    for (const b of todo) {
      const src = b.customCover || b.coverUrl!;
      const color = await dominantColor(src).catch(() => undefined);
      await updateBook(b.id, { spineColor: color, spineColorFrom: `${COLOR_RULE}|${src}` });
    }
  } finally {
    running = false;
  }
}
