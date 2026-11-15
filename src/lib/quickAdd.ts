import type { Book, Lang, Status } from '../types';
import { searchBooks } from './bookSearch';
import { bookKey, findExisting, newId, normalize, saveBook } from './library';
import { lookupSeries } from './seriesLookup';

/**
 * Finds a book by title + author and adds it with one tap (e.g. a missing series part
 * or a tip from Snug). Returns the existing book if she already has it.
 */
export async function quickAdd(
  title: string,
  author: string,
  status: Status,
  extra: Partial<Book> = {},
): Promise<Book> {
  const existing = await findExisting({ title, authors: [author] });
  if (existing) return existing;

  const results = await searchBooks(`${title} ${author}`).catch(() => []);
  const want = bookKey({ title, authors: [author] });
  const surname = normalize(author).split(' ').pop() ?? '';
  const match =
    results.find((r) => bookKey(r) === want) ??
    results.find(
      (r) => normalize(r.title).startsWith(normalize(title)) && normalize(r.authors.join(' ')).includes(surname),
    );

  // a cover from another English or Dutch edition of the same book, when the matched one has none
  const coverFrom =
    match?.coverUrl ??
    results.find((r) => bookKey(r) === want && r.coverUrl && (r.language === 'en' || r.language === 'nl'))?.coverUrl;
  // empty values in `extra` (e.g. a cover we didn't have) must not wipe what the search found
  const given = Object.fromEntries(
    Object.entries(extra).filter(([, v]) => v !== undefined && v !== ''),
  ) as Partial<Book>;

  const now = Date.now();
  const {
    source: _s,
    language,
    ...data
  } = match ?? {
    source: 'google' as const,
    language: undefined as Lang | undefined,
    title,
    authors: [author],
    genres: [] as string[],
  };
  const saved = await saveBook({
    ...data,
    coverUrl: coverFrom,
    ...given,
    id: newId(),
    status,
    language: language ?? 'en',
    specialEdition: false,
    tags: [],
    addedAt: now,
    updatedAt: now,
    series: given.series ?? data.series,
  });
  if (!saved.series || !saved.genres.length) void lookupSeries(saved);
  return saved;
}
