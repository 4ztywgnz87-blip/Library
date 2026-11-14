import { useEffect, useState, type ReactNode } from 'react';
import { sameBook, searchBooks } from '../lib/bookSearch';
import { Cover } from './Cover';
import { MatchRing } from './MatchRing';

/** A cover from the book search, for books she doesn't have (once per title) */
export function useCover(title: string, author: string, known?: string) {
  const [cover, setCover] = useState<string | undefined>(known);
  useEffect(() => {
    if (known) return setCover(known);
    let alive = true;
    searchBooks(`${title} ${author}`)
      .then((r) => alive && setCover(sameBook(r, title, author).find((x) => x.coverUrl)?.coverUrl))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [title, author, known]);
  return cover;
}

interface Item {
  title: string;
  author: string;
  coverUrl?: string;
  /** small line under the author: why it's popular, or the release date */
  note?: string;
  score?: number;
  badge?: ReactNode;
}

/** A cover card for the horizontal rows on Home */
export function DiscoverCard({ item, onOpen }: { item: Item; onOpen: (cover?: string) => void }) {
  const cover = useCover(item.title, item.author, item.coverUrl);
  return (
    <button className="w-28 shrink-0 text-left active:scale-[0.97]" onClick={() => onOpen(cover)}>
      <div className="relative">
        <Cover book={{ title: item.title, authors: [item.author], coverUrl: cover }} />
        {item.score !== undefined && (
          <span className="absolute -right-1.5 -bottom-1.5 rounded-full bg-cream p-0.5 shadow">
            <MatchRing score={item.score} size={34} />
          </span>
        )}
        {item.badge}
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-snug font-medium text-ink">{item.title}</p>
      <p className="truncate text-[0.7rem] text-mocha">{item.author}</p>
      {item.note && <p className="mt-0.5 line-clamp-2 text-[0.65rem] leading-tight text-cocoa">{item.note}</p>}
    </button>
  );
}

/** A row for the full lists (Trending, New from your authors) */
export function DiscoverRow({
  item,
  why,
  lead,
  onOpen,
}: {
  item: Item;
  why?: string;
  /** e.g. the rank number */
  lead?: ReactNode;
  onOpen: (cover?: string) => void;
}) {
  const cover = useCover(item.title, item.author, item.coverUrl);
  return (
    <button className="flex w-full gap-3 py-3 text-left active:opacity-80" onClick={() => onOpen(cover)}>
      {lead}
      <div className="relative w-16 shrink-0">
        <Cover book={{ title: item.title, authors: [item.author], coverUrl: cover }} rounded="rounded" />
        {item.badge}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="leading-snug font-medium">{item.title}</p>
            <p className="text-sm text-cocoa">{item.author}</p>
            {item.note && <p className="mt-0.5 text-xs text-mocha">{item.note}</p>}
          </div>
          {item.score !== undefined && <MatchRing score={item.score} size={40} />}
        </div>
        {why && <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-ink/80">{why}</p>}
      </div>
    </button>
  );
}

export const YoursBadge = () => (
  <span className="absolute top-1.5 left-1.5 rounded-full bg-sage px-2 py-0.5 text-[0.6rem] font-medium text-white shadow">
    Yours
  </span>
);

export const SoonBadge = () => (
  <span className="absolute top-1.5 left-1.5 rounded-full bg-gold px-2 py-0.5 text-[0.6rem] font-medium text-white shadow">
    Soon
  </span>
);

export function formatDate(d: string) {
  if (d.length === 4) return d;
  const t = Date.parse(d.length === 7 ? `${d}-01` : d);
  return Number.isNaN(t)
    ? d
    : new Date(t).toLocaleDateString('en-GB', {
        day: d.length > 7 ? 'numeric' : undefined,
        month: 'short',
        year: 'numeric',
      });
}
