/**
 * How well does Snug know her? Leave-one-out test on her real library.
 *
 * For every book she rated, the model learns from all her other ratings and reviews and predicts
 * this one; the prediction is compared with her own rating. Nothing is changed and no AI is used:
 * it reads her library and the stored book analyses from the live database.
 *
 *   npm run taste-check            summary + every book
 *   npm run taste-check -- --short summary only
 */
import { execFileSync } from 'node:child_process';
import type { Book } from '../src/types';
import type { ReaderProfile } from '../src/shared';
import { profileKey, type BookProfile } from '../src/taste/vocab';
import { learn, predict, type LibraryBook, type Quiz } from '../src/taste/model';

function d1<T>(sql: string): T[] {
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'snug', '--remote', '--json', '--command', sql], {
    encoding: 'utf8',
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    maxBuffer: 64 * 1024 * 1024,
  });
  return (JSON.parse(out.slice(out.indexOf('['))) as { results: T[] }[])[0].results;
}

const records = d1<{ kind: string; data: string }>(
  "SELECT kind, data FROM records WHERE owner = 'library' AND deleted = 0",
);
const books = records.filter((r) => r.kind === 'book').map((r) => JSON.parse(r.data) as Book);
const profileRow = records.find((r) => r.kind === 'profile');
const reader = profileRow ? (JSON.parse(profileRow.data) as ReaderProfile) : undefined;
const profiles = new Map(
  d1<{ key: string; data: string }>('SELECT key, data FROM book_profiles').map((r) => [
    r.key,
    JSON.parse(r.data) as BookProfile,
  ]),
);

const lib: LibraryBook[] = books.map((b) => ({
  id: b.id,
  title: b.title,
  author: b.authors[0] ?? '',
  status: b.status,
  rating: b.rating,
  series: b.series,
  profile: profiles.get(profileKey(b.title, b.authors[0] ?? '')),
  insight: b.reviewInsight,
}));
const quiz: Quiz | undefined = reader && {
  lovedTropes: reader.lovedTropes,
  hatedTropes: reader.hatedTropes,
  spice: reader.spice,
  endings: reader.endings,
  seriesOrStandalone: reader.seriesOrStandalone,
  length: reader.length,
  favouriteAuthors: reader.favouriteAuthors,
  completedAt: reader.completedAt,
};

const rated = lib.filter((b) => b.status === 'read' && b.rating !== undefined);
const testable = rated.filter((b) => b.profile);
console.log(
  `Library: ${books.length} books · ${rated.length} rated · ${testable.length} rated and analysed · ` +
    `${books.filter((b) => b.review?.trim()).length} reviews (${books.filter((b) => b.reviewInsight).length} read by Snug)`,
);
if (testable.length < 8) {
  console.log('Not enough rated books yet for a meaningful test (at least 8 needed).');
  process.exit(0);
}

const rows: { b: LibraryBook; pred: number; base: number; why: string; headsUp?: string }[] = [];
for (const held of testable) {
  // the book she's being tested on is left out completely: its rating and its review
  const t = learn(
    lib.filter((b) => b !== held),
    quiz,
  );
  const r = predict(t, { title: held.title, author: held.author, profile: held.profile!, series: held.series });
  rows.push({ b: held, pred: r.stars, base: t.mean, why: r.why, headsUp: r.headsUp });
}

const mae = rows.reduce((s, r) => s + Math.abs(r.pred - r.b.rating!), 0) / rows.length;
const base = rows.reduce((s, r) => s + Math.abs(r.base - r.b.rating!), 0) / rows.length;
let ok = 0;
let pairs = 0;
for (let i = 0; i < rows.length; i++)
  for (let j = i + 1; j < rows.length; j++) {
    const d = rows[i].b.rating! - rows[j].b.rating!;
    if (Math.abs(d) < 0.5) continue;
    pairs++;
    if (d * (rows[i].pred - rows[j].pred) > 0) ok++;
  }
const within = rows.filter((r) => Math.abs(r.pred - r.b.rating!) <= 0.5).length;

console.log(`\nAverage error: ${mae.toFixed(2)}★ (always guessing her average: ${base.toFixed(2)}★)`);
console.log(`Within half a star: ${within} of ${rows.length} (${Math.round((within / rows.length) * 100)}%)`);
console.log(
  `Right order (books she rated at least half a star apart): ${pairs ? Math.round((ok / pairs) * 100) : '–'}%`,
);

if (!process.argv.includes('--short')) {
  console.log('\nBiggest misses first:');
  for (const r of rows.sort((a, b) => Math.abs(b.pred - b.b.rating!) - Math.abs(a.pred - a.b.rating!)))
    console.log(
      `\n${r.b.rating!.toFixed(2)}★ her rating · ${r.pred.toFixed(2)}★ Snug · ${r.b.title}\n   ${r.why}${r.headsUp ? `\n   ⚠ ${r.headsUp}` : ''}`,
    );
}
