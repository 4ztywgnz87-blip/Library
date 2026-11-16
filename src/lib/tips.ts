import { db } from '../db';
import type { Pick } from '../shared';
import { useMeta } from './hooks';
import { scheduleSync } from './sync';
import { normalize } from './library';

/** A "Something new" tip Snug gave her earlier, kept so it isn't lost when she leaves the page */
export interface SavedTip extends Pick {
  at: number;
  coverUrl?: string;
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
export const saveTips = (picks: Pick[]) =>
  change((tips) => {
    const at = Date.now();
    const fresh = picks.map((p) => ({ ...tips.find((t) => same(t, p)), ...p, at }));
    return [...fresh, ...tips.filter((t) => !picks.some((p) => same(t, p)))];
  });

export const tipCover = (p: { title: string; author: string }, coverUrl: string) =>
  change((tips) => tips.map((t) => (same(t, p) && !t.coverUrl ? { ...t, coverUrl } : t)));

export const forgetTip = (p: { title: string; author: string }) => change((tips) => tips.filter((t) => !same(t, p)));

export const clearTips = () => change(() => []);
