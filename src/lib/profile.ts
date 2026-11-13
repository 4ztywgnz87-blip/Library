import { useLiveQuery } from 'dexie-react-hooks';
import { db, getMeta, setMeta } from '../db';
import { DEFAULT_FAVOURITE_AUTHORS, type ReaderProfile } from '../shared';
import { scheduleSync } from './sync';

export const EMPTY_PROFILE: ReaderProfile = {
  lovedTropes: [],
  hatedTropes: [],
  spice: 2,
  endings: 'any',
  seriesOrStandalone: 'both',
  length: 'any',
  moods: [],
  favouriteAuthors: DEFAULT_FAVOURITE_AUTHORS,
  notForMe: [],
  updatedAt: 0,
};

/** Her profile, or undefined while it is still loading */
export function useProfileLoaded(): ReaderProfile | undefined {
  return useLiveQuery(
    async () => ({ ...EMPTY_PROFILE, ...((await db.meta.get('profile'))?.value as ReaderProfile | undefined) }),
    [],
  );
}

export function useProfile(): ReaderProfile {
  return useProfileLoaded() ?? EMPTY_PROFILE;
}

export async function updateProfile(patch: Partial<ReaderProfile>) {
  const current = { ...EMPTY_PROFILE, ...(await getMeta<ReaderProfile | null>('profile', null)) };
  await setMeta('profile', { ...current, ...patch, updatedAt: Date.now() });
  await setMeta('profileDirty', true);
  scheduleSync();
}
