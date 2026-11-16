import { db } from '../db';
import type { Pick } from '../shared';
import { useMeta } from './hooks';
import { scheduleSync } from './sync';
import { normalize } from './library';

/** A "Something new" tip Snug gave her earlier, kept so it isn't lost when she leaves the page */
export interface SavedTip extends Pick {
  at: number;
  coverUrl?: string;
  /** what she asked for when Snug suggested it (newest first; a book can come up in more searches) */
  asks?: TipAsk[];
}

/** The choices on the What's next page: a genre (none = "Surprise me") and a mood */
export interface TipAsk {
  genre?: string;
  mood?: string;
}

const KEY = 'nextTips';
const MAX = 30;
const same = (a: { title: string; author: string }, b: { title: string; author: string }) =>
  normalize(a.title) === normalize(b.title) && normalize(a.author) === normalize(b.author);

export const useSavedTips = () => useMeta<SavedTip[]>(KEY, []);

/** The list travels to her other devices as one record (the newest list wins) */

const TIPS_AT = 'nextTipsAt';
const TIPS_DIRTY = 'nextTipsDirty';

async function change(f: (tips: SavedTip[]) => SavedTip[]) {
  await db.transaction('rw', db.meta, async () => {
    const tips = ((await db.meta.get(KEY))?.value as SavedTip[] | undefined) ?? [];
    await db.meta.bulkPut([
      { key: KEY, value: f(tips).slice(0, MAX) },
      { key: TIPS_AT, value: Date.now() },
      { key: TIPS_DIRTY, value: true },
    ]);
  });
  scheduleSync();
}

/** New tips go on top (a tip she got before moves up, keeping the cover it had) */
export const saveTips = (picks: Pick[], ask: TipAsk) =>
  change((tips) => {
    const at = Date.now();
    const key = (a: TipAsk) => `${a.genre ?? ''}|${a.mood ?? ''}`;
    const fresh = picks.map((p) => {
      const old = tips.find((t) => same(t, p));
      const asks = [ask, ...(old?.asks ?? []).filter((a) => key(a) !== key(ask))].slice(0, 4);
      return { ...old, ...p, at, asks };
    });
    return [...fresh, ...tips.filter((t) => !picks.some((p) => same(t, p)))];
  });

export const tipCover = (p: { title: string; author: string }, coverUrl: string) =>
  change((tips) => tips.map((t) => (same(t, p) && !t.coverUrl ? { ...t, coverUrl } : t)));

export const forgetTip = (p: { title: string; author: string }) => change((tips) => tips.filter((t) => !same(t, p)));

export const clearTips = () => change(() => []);
