export type Status = 'reading' | 'owned' | 'read' | 'wishlist';
export type Lang = 'en' | 'nl';

export const STATUSES: { id: Status; label: string; short: string }[] = [
  { id: 'reading', label: 'Currently reading', short: 'Reading' },
  { id: 'owned', label: 'On my shelf', short: 'Owned' },
  { id: 'read', label: 'Read', short: 'Read' },
  { id: 'wishlist', label: 'Wishlist', short: 'Wishlist' },
];

export const GENRES = [
  'Romantasy',
  'Fantasy',
  'Romance',
  'Spicy',
  'Thriller',
  'Mystery',
  'Fiction',
  'Historical',
  'Sci-fi',
  'Young adult',
] as const;
export type Genre = (typeof GENRES)[number];

export interface SeriesInfo {
  name: string;
  number?: number;
  /** Open Library series key, used to list the whole series */
  key?: string;
}

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  authors: string[];
  coverUrl?: string;
  /** Own photo of a special edition, stored as a data URL */
  customCover?: string;
  description?: string;
  genres: string[];
  pageCount?: number;
  publishedDate?: string;
  isbn13?: string;
  googleId?: string;
  olKey?: string;
  series?: SeriesInfo;
  /** Series was looked up automatically (so we don't keep asking) */
  seriesChecked?: boolean;
  /** Spine colour taken from the cover, and which cover it came from */
  spineColor?: string;
  spineColorFrom?: string;

  status: Status;
  /** Language of her copy */
  language: Lang;
  specialEdition: boolean;
  /** 0.25 – 5 in quarter steps */
  rating?: number;
  review?: string;
  tags: string[];

  addedAt: number;
  updatedAt: number;
  startedAt?: number;
  finishedAt?: number;
  deleted?: boolean;
}

/** Shape of a record as it travels between app and server */
export interface SyncRecord {
  kind: 'book' | 'profile';
  id: string;
  data: unknown;
  updatedAt: number;
  deleted: boolean;
}
