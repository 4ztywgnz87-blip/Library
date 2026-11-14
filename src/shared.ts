// Types shared by the app and the server for the AI features

export interface ReaderProfile {
  /** What Snug calls her */
  name?: string;
  lovedTropes: string[];
  hatedTropes: string[];
  /** 0 (none) – 5 (very spicy) */
  spice: number;
  endings: 'happy' | 'any' | 'bittersweet';
  seriesOrStandalone: 'series' | 'standalone' | 'both';
  length: 'short' | 'medium' | 'long' | 'any';
  moods: string[];
  favouriteAuthors: string[];
  /** Books she said "not for me" to */
  notForMe: string[];
  completedAt?: number;
  updatedAt: number;
}

export const DEFAULT_FAVOURITE_AUTHORS = [
  'Colleen Hoover',
  'Sarah J. Maas',
  'Lucy Score',
  'Ali Hazelwood',
  'Rebecca Yarros',
];

export const MOODS = [
  { id: 'light', label: 'Light & fun', emoji: '🌸' },
  { id: 'swoony', label: 'Swoony', emoji: '💕' },
  { id: 'spicy', label: 'Spicy', emoji: '🌶️' },
  { id: 'cry', label: 'Make me cry', emoji: '😭' },
  { id: 'tense', label: 'Edge of my seat', emoji: '😱' },
  { id: 'epic', label: 'Epic & immersive', emoji: '🐉' },
  { id: 'quick', label: 'Quick read', emoji: '⚡' },
] as const;

export interface RecommendRequest {
  source: 'shelf' | 'buy';
  genre?: string;
  mood?: string;
  /** Titles already shown, for "show me 3 others" */
  exclude?: string[];
}

export interface Pick {
  title: string;
  author: string;
  why: string;
  /** Set when the pick is a book from her own shelf */
  bookId?: string;
  /** How well it fits her, 0–100 */
  score?: number;
  seriesNote?: string;
  /** Something in it she may not like */
  headsUp?: string;
}

export interface RecommendResponse {
  picks: Pick[];
  mock: boolean;
}

/** Corners as fractions of the image (0–1), clockwise from top-left */
export interface CoverCorners {
  corners: { x: number; y: number }[] | null;
  mock: boolean;
}

export interface IdentifyResponse {
  title: string | null;
  author: string | null;
  isbn: string | null;
  mock: boolean;
}

export interface FitResponse {
  verdict: 'love' | 'like' | 'maybe' | 'skip';
  score: number;
  why: string;
  seriesNote: string | null;
  /** Something in it she may not like */
  headsUp?: string;
  /** Too few of her ratings yet to be sure */
  earlyGuess?: boolean;
  mock: boolean;
}

export interface SeriesBook {
  number: number;
  title: string;
  status: 'published' | 'announced';
  releaseDate: string | null;
  coverUrl?: string;
}

export interface SeriesResponse {
  books: SeriesBook[];
  mock: boolean;
}

export interface AiStatus {
  mode: 'mock' | 'live';
  usedToday: number;
  limit: number;
}
