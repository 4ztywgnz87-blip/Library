import type { Book } from '../types';
import { hashColor } from '../components/Cover';

export interface WrapSummary {
  name?: string;
  year: number;
  books: number;
  pages: number;
  topGenre?: string;
  topAuthor?: string;
  favourite?: Book;
  longestStreak?: number;
  covers: Book[];
}

function loadImage(book: Book): Promise<HTMLImageElement | null> {
  const raw = book.customCover || book.coverUrl;
  if (!raw) return Promise.resolve(null);
  const src = raw.startsWith('data:') || raw.startsWith('/') ? raw : `/api/img?url=${encodeURIComponent(raw)}`;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

async function drawCover(ctx: CanvasRenderingContext2D, book: Book, x: number, y: number, w: number, rot = 0) {
  const h = w * 1.5;
  const img = await loadImage(book);
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  roundRect(ctx, -w / 2, -h / 2, w, h, 14);
  ctx.fillStyle = hashColor(book.title);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.clip();
  if (img) {
    // cover the box like object-fit: cover
    const s = Math.max(w / img.width, h / img.height);
    ctx.drawImage(img, -img.width * s * 0.5, -img.height * s * 0.5, img.width * s, img.height * s);
  } else {
    ctx.fillStyle = '#f6efe6';
    ctx.font = `600 ${w * 0.12}px "Fraunces Variable", serif`;
    ctx.textAlign = 'left';
    wrap(ctx, book.title, -w / 2 + w * 0.1, -h / 2 + w * 0.25, w * 0.8, w * 0.14, 5);
  }
  ctx.restore();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number, lines = 3) {
  const words = text.split(' ');
  let line = '';
  let n = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line, x, y + n * lh);
      n++;
      line = w;
      if (n === lines - 1) {
        // last line: squeeze the rest in with an ellipsis
        let rest = words.slice(words.indexOf(w)).join(' ');
        while (ctx.measureText(rest).width > max && rest.length > 3) rest = `${rest.slice(0, -2)}…`;
        ctx.fillText(rest, x, y + n * lh);
        return n + 1;
      }
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y + n * lh);
  return n + 1;
}

/** A story-sized picture (1080×1920) of her year, to share on Instagram or WhatsApp */
export async function wrapCard(s: WrapSummary): Promise<Blob> {
  await document.fonts.ready;
  const W = 1080;
  const H = 1920;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#7A2E3A');
  bg.addColorStop(1, '#4E3B47');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // a sprinkle of stars
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(246,239,230,${0.15 + ((i * 37) % 50) / 100})`;
    ctx.beginPath();
    ctx.arc((i * 263) % W, (i * 397) % H, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f6efe6';
  ctx.font = '600 96px "Fraunces Variable", serif';
  ctx.fillText(s.name ? `${s.name}’s` : 'My', W / 2, 200);
  ctx.fillText(`${s.year} in books`, W / 2, 310);

  // the covers of the year, fanned out
  const fan = s.covers.slice(0, 5);
  const cw = 230;
  const mid = (fan.length - 1) / 2;
  for (let i = 0; i < fan.length; i++)
    await drawCover(ctx, fan[i], W / 2 - cw / 2 + (i - mid) * 150, 420 + Math.abs(i - mid) * 22, cw, (i - mid) * 7);

  // the numbers
  const stat = (value: string, label: string, x: number, y: number, size: number) => {
    ctx.fillStyle = '#f6efe6';
    ctx.font = `600 ${size}px "Fraunces Variable", serif`;
    ctx.fillText(value, x, y);
    ctx.fillStyle = 'rgba(246,239,230,0.75)';
    ctx.font = '400 38px "Inter Variable", sans-serif';
    ctx.fillText(label, x, y + 58);
  };
  const stats: [string, string][] = [
    [String(s.books), s.books === 1 ? 'book' : 'books'],
    [s.pages ? s.pages.toLocaleString('en-GB') : '–', 'pages'],
  ];
  if (s.longestStreak) stats.push([String(s.longestStreak), 'day streak']);
  stats.forEach(([v, l], i) => stat(v, l, (W / (stats.length * 2)) * (i * 2 + 1), 1000, stats.length > 2 ? 104 : 120));

  const rows: [string, string][] = [];
  if (s.topGenre) rows.push(['Genre of the year', s.topGenre]);
  if (s.topAuthor) rows.push(['Favourite author', s.topAuthor]);
  if (s.favourite) rows.push(['Book of the year', s.favourite.title]);
  let y = 1190;
  ctx.textAlign = 'left';
  for (const [k, v] of rows) {
    ctx.fillStyle = 'rgba(246,239,230,0.65)';
    ctx.font = '400 36px "Inter Variable", sans-serif';
    ctx.fillText(k, 140, y);
    ctx.fillStyle = '#f6efe6';
    ctx.font = '600 56px "Fraunces Variable", serif';
    y += wrap(ctx, v, 140, y + 62, W - 280, 62, 2) * 62 + 70;
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(246,239,230,0.75)';
  ctx.font = '600 44px "Fraunces Variable", serif';
  ctx.fillText('Snug', W / 2, 1850);

  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'),
  );
}

/** Share the picture (Instagram, WhatsApp…) or, where sharing files isn't possible, download it */
export async function shareWrapCard(s: WrapSummary) {
  const blob = await wrapCard(s);
  const file = new File([blob], `snug-${s.year}-in-books.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `My ${s.year} in books` });
    } catch {
      /* she closed the share sheet */
    }
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
