import { useState } from 'react';
import type { Book } from '../types';

const PALETTE = ['#7A2E3A', '#8B5E3C', '#5F6B52', '#A0644B', '#4E3B47', '#9C7A4C', '#6B4A3A', '#3F4E5A'];

export function hashColor(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

type CoverBook = Pick<Book, 'title' | 'authors' | 'coverUrl'> & { customCover?: string };

/** Book cover with a soft shadow, or a pretty generated cover when there's no image */
export function Cover({
  book,
  className = '',
  rounded = 'rounded-md',
}: {
  book: CoverBook;
  className?: string;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = book.customCover || book.coverUrl;
  return (
    <div
      className={`relative aspect-[2/3] overflow-hidden ${rounded} bg-sand shadow-[var(--shadow-book)] ${className}`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={book.title}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        // drawn cover: text scales with the cover's width (cqw), so it reads well tiny and large
        <div className="h-full w-full [container-type:inline-size]" style={{ background: hashColor(book.title) }}>
          <div className="flex h-full w-full flex-col justify-between p-[10cqw] text-cream">
            <div>
              <span className="mb-[6cqw] block h-[1.5cqw] w-[30cqw] rounded-full bg-cream/50" />
              <span className="font-soft line-clamp-5 block text-[12.5cqw] leading-[1.12] font-semibold break-words">
                {book.title}
              </span>
            </div>
            <span className="truncate text-[6.5cqw] tracking-wide uppercase opacity-80">{book.authors[0]}</span>
          </div>
        </div>
      )}
      {/* spine highlight */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[6%] bg-gradient-to-r from-black/20 via-white/10 to-transparent" />
    </div>
  );
}
