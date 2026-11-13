// Series data from Open Library (free): which series a book is in, and the whole series in order

const OL_HEADERS = { 'User-Agent': 'Snug personal library app' };
export const olFetch = (path: string) =>
  fetch(`https://openlibrary.org${path}`, { headers: OL_HEADERS, cf: { cacheTtl: 86_400, cacheEverything: true } });

interface OLWork {
  title?: string;
  covers?: number[];
  first_publish_date?: string;
  series?: { series: { key: string }; position?: string }[];
}

const toNumber = (pos?: string) => (pos && /^\d+(\.\d+)?$/.test(pos) ? Number(pos) : undefined);

export interface FoundSeries {
  name?: string;
  number?: number;
  key?: string;
}

export async function findBookSeries(title: string, author: string): Promise<FoundSeries> {
  if (!title) return {};
  const res = await olFetch(
    `/search.json?${new URLSearchParams({ title, author, limit: '3', fields: 'key,title,series_key,series_name' })}`,
  );
  if (!res.ok) return {};
  const docs = ((await res.json()) as { docs: { key: string; series_key?: string[]; series_name?: string[] }[] }).docs;
  const doc = docs.find((d) => d.series_key?.length);
  if (!doc) return {};
  const key = doc.series_key![0];
  const work = await olFetch(`${doc.key}.json`);
  const position = work.ok ? ((await work.json()) as OLWork).series?.find((s) => s.series.key.endsWith(key))?.position : undefined;
  return { name: doc.series_name?.[0], number: toNumber(position), key };
}

export interface SeriesPart {
  number: number;
  title: string;
  status: 'published' | 'announced';
  releaseDate: string | null;
  coverUrl?: string;
}

export async function seriesParts(key: string): Promise<SeriesPart[]> {
  if (!/^OL\d+L$/.test(key)) return [];
  const res = await olFetch(`/series/${key}/seeds.json`);
  if (!res.ok) return [];
  const seeds = ((await res.json()) as { entries: { url: string; type: string; title: string }[] }).entries
    .filter((e) => e.type === 'work' && !/\/|box ?set|collection|\d books/i.test(e.title))
    .slice(0, 30);
  const works = await Promise.all(
    seeds.map(async (s): Promise<SeriesPart | undefined> => {
      const w = await olFetch(`${s.url}.json`);
      if (!w.ok) return undefined;
      const work = (await w.json()) as OLWork;
      const number = toNumber(work.series?.find((x) => x.series.key.endsWith(key))?.position);
      if (number === undefined || number % 1 !== 0) return undefined; // skip novellas like 3.5
      const released = work.first_publish_date ?? null;
      return {
        number,
        title: work.title ?? s.title,
        status: released && Date.parse(released) > Date.now() ? 'announced' : 'published',
        releaseDate: released,
        coverUrl: work.covers?.find((c) => c > 0) ? `https://covers.openlibrary.org/b/id/${work.covers.find((c) => c > 0)}-L.jpg` : undefined,
      };
    }),
  );
  const seen = new Set<number>();
  return works
    .filter((w): w is SeriesPart => !!w && !seen.has(w.number) && (seen.add(w.number), true))
    .sort((a, b) => a.number - b.number);
}
