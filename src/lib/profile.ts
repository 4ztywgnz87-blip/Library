import { useLiveQuery } from 'dexie-react-hooks';
import { db, getMeta, setMeta } from '../db';
import { DEFAULT_FAVOURITE_AUTHORS, type ReaderProfile } from '../shared';
import { scheduleSync } from './sync';
import { GENRES } from '../types';

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
/** the profile as last read, so a screen opening again has it at once (her name in the greeting
 *  no longer pops in a moment later, making the line wrap) */
let lastProfile: ReaderProfile | undefined;

export function useProfileLoaded(): ReaderProfile | undefined {
  return useLiveQuery(
    async () => {
      lastProfile = { ...EMPTY_PROFILE, ...((await db.meta.get('profile'))?.value as ReaderProfile | undefined) };
      return lastProfile;
    },
    [],
    lastProfile,
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

/** Snug's genres plus the ones she added herself */
export function useGenreList(): string[] {
  const custom = useProfile().customGenres ?? [];
  return [...GENRES, ...custom.filter((g) => !(GENRES as readonly string[]).includes(g))];
}
