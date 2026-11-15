import { getMeta, setMeta } from '../db';
import type { SeriesBook } from '../shared';
import { googleBooks, parseSeries } from './bookSearch';
import { baseTitle } from './authors';
import { normalize } from './library';

/**
 * The parts of a series, worked out for free from what Google Books lists: titles like
 * "The Christmas Tree Farm (Dream Harbor, Book 3)", "Boys of Tommen #1", and the box sets,
 * whose titles name every book in order. Used before asking the AI.
 */

const seriesName = (n: string) => normalize(n.replace(/^(a|an|the)\s+/i, '').replace(/\s+(series|saga)$/i, ''));
const tkey = (t: string) => normalize(baseTitle(t)).replace(/^(the|a|an|de|het|een)\s+/, '');
const NOT_BOOK =
  /(colou?ring|cookbook|kookboek|reflective guide|summary|study guide|companion|workbook|untitled|journal|planner|calendar|novella)/i;
const SET = /(collection|box ?set|boxed set|set of|bundle|bundel|\d+ books)/i;

const clean = (s: string) =>
  s
    .replace(/^(the\s+)?books?\s*\d+\s*[:.-]\s*/i, '')
    .replace(/\s+by\s+.*$/i, '')
    .trim();

/** The titles named in a box set's title, in order: "(A, B, C & the D)" or "Set. A, B, C by Author" */
export function listFromSet(title: string, subtitle?: string): string[] {
  const text = `${title} ${subtitle ?? ''}`.trim();
  const candidates = [...text.matchAll(/\(([^()]{8,})\)/g)].map((m) => m[1]);
  const tail = text.match(/\b(?:set|collection)\s*[.:\-–]\s*(.+?)\s+by\s+/i)?.[1];
  if (tail) candidates.push(tail);
  let best: string[] = [];
  for (const c of candidates) {
    const parts = c
      .split(/\s*,\s*/)
      // "…, X & the Y": only an "&" before an article separates two titles
      .flatMap((p) => p.split(/\s+(?:&|and)\s+(?=(?:the|de|het|een)\s)/i))
      .map(clean)
      .filter((x) => x.length > 1 && !NOT_BOOK.test(x));
    if (parts.length >= 2 && parts.length > best.length) best = parts;
  }
  return best;
}

interface Volume {
  title?: string;
  subtitle?: string;
  authors?: string[];
  language?: string;
  publishedDate?: string;
}

const proper = (t: string) => (t === t.toLowerCase() ? t.replace(/\b[a-z]/g, (c) => c.toUpperCase()) : t);

/** Pure part: Google's volumes in, the series' parts out (empty when it isn't clear enough) */
export function partsFromVolumes(name: string, author: string, volumes: Volume[]): SeriesBook[] {
  const surname = normalize(author).split(' ').pop() ?? '';
  const want = seriesName(name);
  const numbered = new Map<string, { number: number; title: string }>();
  const dates = new Map<string, string[]>();
  const titles = new Map<string, string>();
  let order: string[] = [];

  for (const v of volumes) {
    if (!v.title || (v.language && v.language !== 'en' && v.language !== 'nl')) continue;
    if (surname && !normalize((v.authors ?? []).join(' ')).includes(surname)) continue;
    if (NOT_BOOK.test(`${v.title} ${v.subtitle ?? ''}`)) continue;
    if (SET.test(v.title)) {
      const l = listFromSet(v.title, v.subtitle);
      if (l.length > order.length) order = l;
      continue;
    }
    const { title, series } = parseSeries(v.title, v.subtitle);
    const base = baseTitle(title);
    if (!base) continue;
    const k = tkey(base);
    titles.set(k, titles.get(k) ?? base);
    if (v.publishedDate) dates.set(k, [...(dates.get(k) ?? []), v.publishedDate]);
    if (series?.number && seriesName(series.name) === want && Number.isInteger(series.number))
      numbered.set(k, { number: series.number, title: base });
  }

  const parts = new Map<number, { title: string; key: string }>();
  for (const [k, n] of numbered) if (!parts.has(n.number)) parts.set(n.number, { title: n.title, key: k });
  // the box set's order fills in the books that carry no number of their own
  order.forEach((t, i) => {
    const k = tkey(t);
    if ([...parts.values()].some((p) => p.key === k)) return;
    const number = i + 1;
    if (!parts.has(number)) parts.set(number, { title: titles.get(k) ?? proper(t), key: k });
  });
  if (parts.size < 3) return [];

  return [...parts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([number, p]) => {
      const first = (dates.get(p.key) ?? []).sort()[0] ?? null;
      const when = first ? Date.parse(first.length === 4 ? `${first}-12-31` : first) : NaN;
      return {
        number,
        title: p.title,
        status: when > Date.now() ? ('announced' as const) : ('published' as const),
        releaseDate: first,
      };
    });
}

const WEEK = 7 * 86_400_000;

export async function seriesFromGoogle(name: string, author: string): Promise<SeriesBook[]> {
  const cacheKey = `seriesGoogle:${seriesName(name)}|${normalize(author)}`;
  const cached = await getMeta<{ at: number; books: SeriesBook[] } | null>(cacheKey, null);
  if (cached && (Date.now() - cached.at < WEEK || !navigator.onLine)) return cached.books;
  try {
    const res = await googleBooks(
      new URLSearchParams({ q: `"${name}" inauthor:"${author}"`, maxResults: '40', printType: 'books' }),
    );
    const json = (await res.json()) as { items?: { volumeInfo: Volume }[] };
    const books = partsFromVolumes(
      name,
      author,
      (json.items ?? []).map((i) => i.volumeInfo),
    );
    await setMeta(cacheKey, { at: Date.now(), books });
    return books;
  } catch {
    return cached?.books ?? [];
  }
}
