export interface Pt {
  x: number;
  y: number;
}

/** Solves the 8 unknowns of a homography that maps the unit square onto quad q (clockwise from top-left) */
function squareToQuad(q: Pt[]) {
  const [p0, p1, p2, p3] = q;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const sx = p0.x - p1.x + p2.x - p3.x;
  const sy = p0.y - p1.y + p2.y - p3.y;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (sx * dy2 - dx2 * sy) / den;
  const h = (dx1 * sy - sx * dy1) / den;
  return {
    a: p1.x - p0.x + g * p1.x,
    b: p3.x - p0.x + h * p3.x,
    c: p0.x,
    d: p1.y - p0.y + g * p1.y,
    e: p3.y - p0.y + h * p3.y,
    f: p0.y,
    g,
    h,
  };
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Cuts the quad (in image pixels, clockwise from top-left) out of the image and straightens it
 * into a flat rectangle, like a scanner app. Returns a JPEG data URL.
 */
export function warpToCover(img: CanvasImageSource & { width: number; height: number }, quad: Pt[], outHeight = 900) {
  // Shape of the result from the quad's own sides (a book cover is ~2:3; keep it sensible)
  const w = (dist(quad[0], quad[1]) + dist(quad[3], quad[2])) / 2;
  const h = (dist(quad[0], quad[3]) + dist(quad[1], quad[2])) / 2;
  const ratio = Math.min(0.85, Math.max(0.5, w / h));
  const H = outHeight;
  const W = Math.round(H * ratio);

  const src = document.createElement('canvas');
  src.width = img.width;
  src.height = img.height;
  const sctx = src.getContext('2d')!;
  sctx.drawImage(img, 0, 0);
  const sdata = sctx.getImageData(0, 0, src.width, src.height).data;
  const SW = src.width;
  const SH = src.height;

  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const octx = out.getContext('2d')!;
  const odata = octx.createImageData(W, H);
  const m = squareToQuad(quad);

  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H;
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      const z = m.g * u + m.h * v + 1;
      const fx = Math.min(SW - 1.001, Math.max(0, (m.a * u + m.b * v + m.c) / z - 0.5));
      const fy = Math.min(SH - 1.001, Math.max(0, (m.d * u + m.e * v + m.f) / z - 0.5));
      const x0 = fx | 0;
      const y0 = fy | 0;
      const tx = fx - x0;
      const ty = fy - y0;
      const i00 = (y0 * SW + x0) * 4;
      const i10 = i00 + 4;
      const i01 = i00 + SW * 4;
      const i11 = i01 + 4;
      const o = (y * W + x) * 4;
      for (let k = 0; k < 3; k++) {
        const top = sdata[i00 + k] * (1 - tx) + sdata[i10 + k] * tx;
        const bot = sdata[i01 + k] * (1 - tx) + sdata[i11 + k] * tx;
        odata.data[o + k] = top * (1 - ty) + bot * ty;
      }
      odata.data[o + 3] = 255;
    }
  }
  octx.putImageData(odata, 0, 0);

  // A touch warmer and crisper, so phone photos match printed covers better
  const final = document.createElement('canvas');
  final.width = W;
  final.height = H;
  const fctx = final.getContext('2d')!;
  fctx.filter = 'contrast(1.06) saturate(1.08)';
  fctx.drawImage(out, 0, 0);
  return final.toDataURL('image/jpeg', 0.85);
}
