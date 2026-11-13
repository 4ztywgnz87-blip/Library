/**
 * Shrinks a photo (JPEG) so it stays light to send, store and sync.
 * With `asCover`, it is cropped to a book's 2:3 shape from the centre, so it sits
 * nicely between the other covers.
 */
export async function shrinkPhoto(file: Blob, max = 1024, quality = 0.82, asCover = false): Promise<string> {
  const bitmap = await createImageBitmap(file);
  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (asCover) {
    const ratio = 2 / 3;
    if (sw / sh > ratio) {
      sw = Math.round(sh * ratio);
      sx = Math.round((bitmap.width - sw) / 2);
    } else {
      sh = Math.round(sw / ratio);
      sy = Math.round((bitmap.height - sh) / 2);
    }
  }
  const scale = Math.min(1, max / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext('2d')!;
  // A touch warmer and crisper, so phone photos match printed covers better
  if (asCover) ctx.filter = 'contrast(1.06) saturate(1.08)';
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}
