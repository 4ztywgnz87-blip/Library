/**
 * Snug's taste model: predicts how much she will like a book, for free, on her own device.
 *
 * Every book has a fixed profile (scales 0–5 and tags, analysed once by Claude) and every review
 * she writes is read once into the same features. From those, this model learns her taste and
 * predicts a star rating for any other profiled book, with the reasons why. It runs again,
 * instantly, every time she rates or reviews something.
 *
 * Four signals, combined:
 *  1. Closest books: the books she rated that are most like this one (by tags, scales,
 *     author, comparisons and series), and what she gave them.
 *  2. Features: what each tag (trope, hero, setting, …) does to her ratings, learned from all
 *     her ratings, plus what she says in her reviews and the quiz (her words weigh most).
 *  3. Scales: her sweet spot for heat, darkness, pace, banter, … and which way her reviews push.
 *  4. Author and series: how she rated this author and the earlier parts of the series.
 */
import {
  QUIZ_TROPE_FEATURES,
  SCALE_IDS,
  tagFeatures,
  type BookProfile,
  type FeatureId,
  type ReviewInsight,
  type ScaleId,
  type TagGroup,
} from './vocab';

// ---------- inputs ----------

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  status: 'reading' | 'owned' | 'read' | 'wishlist' | 'radar';
  rating?: number;
  series?: { name: string; number?: number };
  profile?: BookProfile;
  insight?: ReviewInsight;
}

export interface Quiz {
  lovedTropes: string[];
  hatedTropes: string[];
  spice: number;
  endings: 'happy' | 'any' | 'bittersweet';
  seriesOrStandalone: 'series' | 'standalone' | 'both';
  length: 'short' | 'medium' | 'long' | 'any';
  favouriteAuthors: string[];
  completedAt?: number;
}

export interface Candidate {
  title: string;
  author: string;
  profile: BookProfile;
  series?: { name: string; number?: number };
}

export type Mood = 'light' | 'swoony' | 'spicy' | 'cry' | 'tense' | 'epic' | 'quick';

// ---------- tuning (set by evaluation on test readers; see PLAN.md) ----------

/**
 * Tuned on her own 25 rated books (leave-one-out, checked with a nested test so the tuning itself
 * was never shown the book it predicts): average error 0.47★ → 0.38★, right order 67% → 76%.
 */
export const PARAMS = {
  priorMean: 3.75,
  priorWeight: 2,
  unratedWeight: 0.3,
  tagShrink: 1.2,
  reviewLike: 0.15,
  reviewDislike: 0.5,
  quizLove: 0.37,
  quizHate: 0.6,
  tagCap: 1.8,
  tagPosMax: 1.5,
  tagNegMax: 1.6,
  scaleTolerance: 1.4,
  scalePenalty: 0.05,
  scaleSlope: 0.44,
  scaleDirection: 0.05,
  scaleMax: 1.3,
  knnK: 4,
  knnPower: 3.75,
  knnWeight: 0.6,
  tagWeight: 0.15,
  scaleWeight: 1.4,
  authorShrink: 1.5,
  seriesWeight: 0.3,
  gain: 0.5,
  /** > 0: learn all tag weights together (ridge regression) instead of one by one */
  ridge: 4,
  dataShrink: 3,
  /**
   * > 0: a remark counts by how she rated the book it's about. Something she "loved" in a book she
   * gave less than her usual rating didn't make it a favourite; something that "bothered" her in a
   * book she still gave 5★ hardly mattered. (0 = every remark counts the same)
   */
  remarkByRating: 0,
};

/** How much a remark counts: full when the rating agrees with it, little when it goes against it */
function remarkWeight(sign: 1 | -1, rating: number | undefined, mean: number) {
  const P = PARAMS;
  if (!P.remarkByRating || rating === undefined) return 1;
  const agree = sign > 0 ? rating - mean : mean - rating; // a "like" in a book rated above her average agrees
  return Math.max(0.15, Math.min(1, 0.6 + agree / P.remarkByRating));
}

/**
 * All tags at once: which tags explain her ratings, given the other tags in the same books
 * (so a trope isn't blamed for a book she disliked for another reason). Ridge regression,
 * solved exactly (a few hundred tags at most).
 */
function ridge(
  read: LibraryBook[],
  vote: (b: LibraryBook) => { r: number; w: number },
  mean: number,
  lambda: number,
): Map<FeatureId, number> {
  const feats = [...new Set(read.flatMap((b) => tagFeatures(b.profile!)))];
  const idx = new Map(feats.map((f, i) => [f, i]));
  const n = feats.length;
  const A = Array.from({ length: n }, () => new Float64Array(n));
  const y = new Float64Array(n);
  for (const b of read) {
    const { r, w } = vote(b);
    const fs = tagFeatures(b.profile!).map((f) => idx.get(f)!);
    const scaleDown = 1 / Math.sqrt(fs.length || 1); // books with many tags spread their signal
    for (const i of fs) {
      y[i] += w * (r - mean) * scaleDown;
      for (const j of fs) A[i][j] += w * scaleDown * scaleDown;
    }
  }
  for (let i = 0; i < n; i++) A[i][i] += lambda;
  // Gaussian elimination (A is symmetric positive definite)
  for (let i = 0; i < n; i++) {
    const piv = A[i][i];
    for (let j = i + 1; j < n; j++) {
      const f = A[j][i] / piv;
      if (!f) continue;
      for (let k = i; k < n; k++) A[j][k] -= f * A[i][k];
      y[j] -= f * y[i];
    }
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i];
    for (let k = i + 1; k < n; k++) sum -= A[i][k] * x[k];
    x[i] = sum / A[i][i];
  }
  // back on the same footing as per-tag averages (a book's full deviation spread over its tags)
  return new Map(feats.map((f, i) => [f, x[i] * 3]));
}

const GROUP_WEIGHT: Record<TagGroup, number> = {
  trope: 1,
  hero: 0.8,
  heroine: 0.7,
  creature: 0.8,
  setting: 0.6,
  genre: 0.7,
  theme: 0.45,
  ending: 0.5,
  pov: 0.25,
  seriesRole: 0.3,
  audience: 0.7,
  warning: 0.9,
};

/** How much a scale tells apart two books (for similarity) */
const SCALE_SIM_WEIGHT: Partial<Record<ScaleId, number>> = {
  romance: 1.4,
  spice: 1.2,
  darkness: 1.2,
  worldbuilding: 1.4,
  mystery: 1.1,
  twists: 1,
  humour: 1,
  tension: 0.8,
  action: 0.9,
};

// ---------- helpers ----------

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
/** "A Court of Thorns and Roses" and "Court of Thorns and Roses series" are the same series */
const seriesNorm = (s: string) =>
  norm(s.replace(/^(a|an|the)\s+/i, '').replace(/\s+(series|saga|trilogy|duology)$/i, ''));
const lastName = (a: string) => (a.toLowerCase().match(/[a-z]+/g) ?? []).pop() ?? '';
const groupOf = (f: FeatureId) => f.split(':')[0] as TagGroup | 'scale';
const fmt = (r: number) =>
  Number.isInteger(r) ? `${r}` : r.toFixed(r * 4 === Math.round(r * 4) && (r * 2) % 1 !== 0 ? 2 : 1).replace(/0$/, '');

/** Diminishing returns: many small pluses add up, but never without limit */
const soft = (x: number, max: number) => max * (1 - Math.exp(-Math.abs(x) / max)) * Math.sign(x);

// ---------- the learned taste ----------

interface Evidence {
  book: LibraryBook;
  rating?: number;
  quote?: string;
  sign: 1 | -1;
  strength: number;
  /** for scales: how much of it the reviewed book had (what "too much" or "loved it" refers to) */
  level?: number;
  /** she missed it in that book ("not enough romance"), rather than enjoyed it there */
  wantedMore?: boolean;
  /** how much this remark counts, given how she rated that book (see `remarkWeight`) */
  w?: number;
}

interface ScaleTaste {
  sweet: number;
  spread: number;
  slope: number;
  avg: number;
  /** what her reviews said about this scale, anchored at the level of that book */
  evidence: Evidence[];
}

export interface Taste {
  mean: number;
  rated: LibraryBook[];
  read: LibraryBook[];
  feature: Map<FeatureId, { weight: number; evidence: Evidence[] }>;
  scale: Map<ScaleId, ScaleTaste>;
  author: Map<string, { dev: number; count: number; best?: LibraryBook; worst?: LibraryBook }>;
  favourites: Set<string>;
  quiz?: Quiz;
  /** features she named in the quiz, with the quiz's own words for them */
  fromQuiz: Map<FeatureId, string>;
}

export function learn(library: LibraryBook[], quiz?: Quiz): Taste {
  const P = PARAMS;
  const read = library.filter((b) => (b.status === 'read' || b.status === 'reading') && b.profile);
  const rated = read.filter((b) => b.status === 'read' && b.rating !== undefined);
  const sum = rated.reduce((s, b) => s + b.rating!, 0);
  const mean = (sum + P.priorMean * P.priorWeight) / (rated.length + P.priorWeight);

  // what each book counts as: her rating, or (unrated) a small vote of confidence: she finished it
  const vote = (b: LibraryBook) =>
    b.rating !== undefined && b.status === 'read'
      ? { r: b.rating, w: 1 }
      : { r: mean + 0.1, w: b.status === 'read' ? P.unratedWeight : P.unratedWeight / 2 };

  // 1. features
  const acc = new Map<FeatureId, { num: number; den: number; evidence: Evidence[] }>();
  const get = (f: FeatureId) => acc.get(f) ?? (acc.set(f, { num: 0, den: 0, evidence: [] }), acc.get(f)!);
  for (const b of read) {
    const { r, w } = vote(b);
    for (const f of tagFeatures(b.profile!)) {
      const a = get(f);
      a.num += w * (r - mean);
      a.den += w;
      if (w === 1) a.evidence.push({ book: b, rating: r, sign: r >= mean ? 1 : -1, strength: Math.abs(r - mean) });
    }
  }
  const feature = new Map<FeatureId, { weight: number; evidence: Evidence[] }>();
  const ridgeW = P.ridge > 0 ? ridge(read, vote, mean, P.ridge) : undefined;
  for (const [f, a] of acc)
    feature.set(f, {
      // content warnings only count when she said something about them herself
      weight: groupOf(f) === 'warning' ? 0 : ridgeW ? (ridgeW.get(f) ?? 0) : a.num / (a.den + P.tagShrink),
      evidence: groupOf(f) === 'warning' ? [] : a.evidence,
    });

  // her own words weigh most
  const bump = (f: FeatureId, delta: number, ev?: Evidence) => {
    const cur = feature.get(f) ?? { weight: 0, evidence: [] };
    cur.weight += delta;
    if (ev) cur.evidence.push(ev);
    feature.set(f, cur);
  };
  // (a remark that goes against a clear pattern in her ratings counts less: "Miles was awful"
  // is about that one hero, not about the broody heroes she keeps rating 5★)
  const fromRatings = new Map([...acc].map(([f, a]) => [f, { w: a.den ? a.num / a.den : 0, n: a.evidence.length }]));
  // and the more of her books have a feature, the more her ratings already say about it
  const against = (f: FeatureId, sign: number) => {
    const r = fromRatings.get(f);
    const common = 1 / (1 + (r?.n ?? 0) / 6);
    return (r && r.n >= 3 && Math.sign(r.w) === -sign && Math.abs(r.w) > 0.1 ? 0.35 : 1) * Math.max(0.3, common);
  };
  for (const b of read) {
    for (const l of b.insight?.likes ?? [])
      if (!l.feature.startsWith('scale:'))
        bump(l.feature, P.reviewLike * l.strength * against(l.feature, 1) * remarkWeight(1, b.rating, mean), {
          book: b,
          rating: b.rating,
          quote: l.quote,
          sign: 1,
          strength: l.strength + 2,
        });
    for (const l of b.insight?.dislikes ?? [])
      if (!l.feature.startsWith('scale:'))
        bump(l.feature, -P.reviewDislike * l.strength * against(l.feature, -1) * remarkWeight(-1, b.rating, mean), {
          book: b,
          rating: b.rating,
          quote: l.quote,
          sign: -1,
          strength: l.strength + 2,
        });
  }
  // the quiz
  const fromQuiz = new Map<FeatureId, string>();
  if (quiz?.completedAt) {
    for (const t of quiz.lovedTropes)
      for (const f of QUIZ_TROPE_FEATURES[t] ?? [])
        if (!f.startsWith('scale:')) {
          bump(f, P.quizLove);
          fromQuiz.set(f, t);
        }
    for (const t of quiz.hatedTropes)
      for (const f of QUIZ_TROPE_FEATURES[t] ?? [])
        if (!f.startsWith('scale:')) {
          bump(f, -P.quizHate);
          fromQuiz.set(f, t);
        }
    if (quiz.endings === 'happy') {
      bump('ending:happily ever after', 0.25);
      bump('ending:tragic', -0.6);
      bump('ending:bittersweet', -0.2);
    }
    if (quiz.endings === 'bittersweet') bump('ending:bittersweet', 0.25);
    if (quiz.seriesOrStandalone === 'standalone') bump('seriesRole:standalone', 0.2);
    if (quiz.seriesOrStandalone === 'series') bump('seriesRole:series opener', 0.15);
  }
  for (const v of feature.values()) v.weight = Math.max(-P.tagCap, Math.min(P.tagCap, v.weight));

  // 2. scales
  const scale: Taste['scale'] = new Map();
  for (const k of SCALE_IDS) {
    // sweet spot: weighted towards the books she loved most
    let aw = 0;
    let as = 0;
    let all = 0;
    for (const b of read) {
      const { r, w } = vote(b);
      const a = w * Math.max(0.05, r - (mean - 0.75)) ** 2;
      aw += a;
      as += a * b.profile!.scales[k];
      all += b.profile!.scales[k];
    }
    const sweet = aw ? as / aw : 2.5;
    let vs = 0;
    for (const b of read) {
      const { r, w } = vote(b);
      const a = w * Math.max(0.05, r - (mean - 0.75)) ** 2;
      vs += a * (b.profile!.scales[k] - sweet) ** 2;
    }
    const spread = aw ? Math.sqrt(vs / aw) : 1.5;
    const avg = read.length ? all / read.length : 2.5;
    // slope: do higher values go with higher ratings? (weighted least squares, shrunk)
    let sx = 0;
    let sy = 0;
    let sw = 0;
    for (const b of rated) {
      sx += b.profile!.scales[k];
      sy += b.rating!;
      sw += 1;
    }
    let slope = 0;
    if (sw >= 3) {
      const mx = sx / sw;
      const my = sy / sw;
      let cov = 0;
      let vx = 0;
      for (const b of rated) {
        cov += (b.profile!.scales[k] - mx) * (b.rating! - my);
        vx += (b.profile!.scales[k] - mx) ** 2;
      }
      slope = vx > 0 ? (cov / vx) * (sw / (sw + 5)) : 0;
    }
    // her reviews: "loved the banter", "too slow a start": anchored at that book's level
    const evidence: Evidence[] = [];
    for (const b of read) {
      const level = b.profile!.scales[k];
      for (const l of b.insight?.likes ?? [])
        if (l.feature === `scale:${k}`)
          evidence.push({
            book: b,
            rating: b.rating,
            quote: l.quote,
            sign: 1,
            strength: l.strength,
            level,
            wantedMore: l.wantedMore,
            // missing something is a complaint: it agrees with a lower rating
            w: remarkWeight(l.wantedMore ? -1 : 1, b.rating, mean),
          });
      for (const l of b.insight?.dislikes ?? [])
        if (l.feature === `scale:${k}`)
          evidence.push({
            book: b,
            rating: b.rating,
            quote: l.quote,
            sign: -1,
            strength: l.strength,
            level,
            w: remarkWeight(-1, b.rating, mean),
          });
    }
    scale.set(k, { sweet, spread, slope, avg, evidence });
  }
  // the quiz's spice level is what she says she wants: blend it into the sweet spot
  if (quiz?.completedAt) {
    const s = scale.get('spice')!;
    const n = Math.min(rated.length, 8);
    s.sweet = (quiz.spice * 3 + s.sweet * n) / (3 + n);
  }

  // 3. authors
  const author: Taste['author'] = new Map();
  for (const b of read) {
    const a = lastName(b.author);
    const cur = author.get(a) ?? { dev: 0, count: 0 };
    cur.count++;
    if (b.rating !== undefined && b.status === 'read') {
      cur.dev += b.rating - mean;
      if (!cur.best || b.rating > (cur.best.rating ?? 0)) cur.best = b;
      if (!cur.worst || b.rating < (cur.worst.rating ?? 5)) cur.worst = b;
    }
    author.set(a, cur);
  }
  return {
    mean,
    rated,
    read,
    feature,
    scale,
    author,
    favourites: new Set((quiz?.favouriteAuthors ?? []).map(lastName)),
    quiz,
    fromQuiz,
  };
}

// ---------- similarity between two books ----------

function weightedTags(p: BookProfile) {
  const m = new Map<FeatureId, number>();
  for (const f of tagFeatures(p)) m.set(f, GROUP_WEIGHT[groupOf(f) as TagGroup] ?? 0.5);
  return m;
}

export function similarity(a: BookProfile, b: BookProfile, aAuthor: string, bAuthor: string) {
  const ta = weightedTags(a);
  const tb = weightedTags(b);
  let inter = 0;
  let union = 0;
  for (const [f, w] of ta) {
    if (tb.has(f)) inter += w;
    union += w;
  }
  for (const [f, w] of tb) if (!ta.has(f)) union += w;
  const jac = union ? inter / union : 0;
  let diff = 0;
  let tot = 0;
  for (const k of SCALE_IDS) {
    const w = SCALE_SIM_WEIGHT[k] ?? 0.6;
    diff += w * Math.abs(a.scales[k] - b.scales[k]);
    tot += w * 5;
  }
  const close = 1 - diff / tot;
  let sim = 0.5 * jac + 0.5 * Math.max(0, (close - 0.55) / 0.45);
  if (lastName(aAuthor) === lastName(bAuthor)) sim += 0.12;
  const compsA = a.comps.map(norm);
  const compsB = b.comps.map(norm);
  if (compsA.includes(norm(b.title)) || compsB.includes(norm(a.title))) sim += 0.15;
  if (a.series && b.series && seriesNorm(a.series.name) === seriesNorm(b.series.name)) sim += 0.25;
  return Math.min(1, sim);
}

// ---------- prediction ----------

export interface Reason {
  /** effect in stars (+ helps, − hurts) */
  value: number;
  /** a favourite she named in the quiz (these are told together, in one sentence) */
  quiz?: string;
  text: string;
  kind: 'closest' | 'feature' | 'scale' | 'author' | 'series' | 'mood';
  /** "It has X / It is Y, which you loved in <book> (“quote”)": told together when they share a book */
  loved?: { pred: string; book: string; quote: string };
  /** the books a reason names (so a book already mentioned isn't named twice) */
  books?: LibraryBook[];
  /** "has slow burn": the reason without the book, for when the book was already named */
  pred?: string;
}

export interface Prediction {
  stars: number;
  score: number;
  confidence: 'early guess' | 'fair' | 'strong';
  closest: { book: LibraryBook; sim: number }[];
  reasons: Reason[];
  why: string;
  headsUp?: string;
}

const SCORE_POINTS: [number, number][] = [
  [0.5, 3],
  [1, 6],
  [2, 22],
  [3, 48],
  [3.5, 62],
  [4, 76],
  [4.5, 88],
  [5, 97],
];
export function starsToScore(stars: number) {
  for (let i = 1; i < SCORE_POINTS.length; i++) {
    const [x1, y1] = SCORE_POINTS[i];
    const [x0, y0] = SCORE_POINTS[i - 1];
    if (stars <= x1) return Math.round(y0 + ((Math.max(x0, stars) - x0) / (x1 - x0)) * (y1 - y0));
  }
  return 97;
}

const MOOD_TARGETS: Record<Mood, Partial<Record<ScaleId, [number, number]>>> = {
  light: { darkness: [0, 2], humour: [3, 5] },
  swoony: { romance: [4, 5], banter: [3, 5] },
  spicy: { spice: [4, 5], romance: [3, 5] },
  cry: { emotional: [4, 5] },
  tense: { tension: [4, 5] },
  epic: { worldbuilding: [4, 5] },
  quick: { plotPace: [4, 5], complexity: [0, 2] },
};

export function predict(t: Taste, c: Candidate, wish: { mood?: Mood; genre?: string } = {}): Prediction {
  const P = PARAMS;
  const p = c.profile;
  const reasons: Reason[] = [];

  // 1. closest books she rated
  const sims = t.rated
    .filter((b) => norm(b.title) !== norm(c.title))
    .map((b) => ({ book: b, sim: similarity(p, b.profile!, c.author, b.author) }))
    .sort((a, b) => b.sim - a.sim);
  const top = sims.slice(0, P.knnK);
  const simById = new Map(sims.map((x) => [x.book.id, x.sim]));
  const simTo = (b: LibraryBook) => simById.get(b.id) ?? (b.profile ? similarity(p, b.profile, c.author, b.author) : 0);
  let knnDev = 0;
  if (top.length) {
    const ws = top.map((x) => x.sim ** P.knnPower);
    const wsum = ws.reduce((s, w) => s + w, 0);
    const knn = wsum ? top.reduce((s, x, i) => s + ws[i] * x.book.rating!, 0) / wsum : t.mean;
    const strength = top.slice(0, 2).reduce((s, x) => s + x.sim, 0) / Math.min(2, top.length);
    knnDev = (knn - t.mean) * Math.max(0, Math.min(1, (strength - 0.2) / 0.45));
  }
  const closest = top
    .filter((x) => x.sim >= 0.35 && (knnDev > 0 ? x.book.rating! >= t.mean - 0.25 : x.book.rating! <= t.mean - 0.25))
    .slice(0, 2);
  if (closest.length && Math.abs(knnDev) > 0.05)
    reasons.push({
      value: P.knnWeight * knnDev,
      kind: 'closest',
      books: closest.map((x) => x.book),
      text:
        knnDev > 0
          ? `It's most like ${listBooks(closest.map((x) => x.book))}`
          : `It's closest to ${listBooks(closest.map((x) => x.book))}, which didn't quite win you over`,
    });

  // 2. features
  let pos = 0;
  let neg = 0;
  const featureHits: { f: FeatureId; v: number; ev: Evidence[] }[] = [];
  for (const f of tagFeatures(p)) {
    const ft = t.feature.get(f);
    if (!ft) continue;
    const v = ft.weight * (GROUP_WEIGHT[groupOf(f) as TagGroup] ?? 0.5);
    if (v > 0) pos += v;
    else neg += v;
    // content warnings are never a reason to read something
    if (Math.abs(v) >= 0.08 && !(v > 0 && groupOf(f) === 'warning')) featureHits.push({ f, v, ev: ft.evidence });
  }
  const tagTotal = soft(pos, P.tagPosMax) + soft(neg, P.tagNegMax);
  featureHits.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  for (const h of featureHits.slice(0, 6)) {
    const { text, loved, books, pred } = featureText(h.f, h.v, h.ev, t, simTo);
    reasons.push({
      value: P.tagWeight * h.v,
      kind: 'feature',
      text,
      loved,
      books,
      pred,
      quiz: h.v > 0 && text.endsWith('a favourite of yours from your quiz') ? quizSay(t.fromQuiz.get(h.f)!) : undefined,
    });
  }

  // 3. scales: her sweet spot, the trend in her ratings, and what her reviews ask for
  let scaleSum = 0;
  for (const k of SCALE_IDS) {
    if ((k === 'romancePace' || k === 'angst') && p.scales.romance <= 1) continue;
    const s = t.scale.get(k)!;
    const x = p.scales[k];
    const d = Math.abs(x - s.sweet);
    const tol = Math.max(P.scaleTolerance, s.spread + 0.4);
    const miss = -Math.min(0.6, P.scalePenalty * Math.max(0, d - tol) ** 1.5);
    const trend = Math.max(-0.3, Math.min(0.3, P.scaleSlope * s.slope * (x - s.avg)));
    // what she said, measured against the book she said it about:
    // "loved the banter" (in a 5/5 banter book) → more is better, little banter is a minus;
    // "too dark" (about a 5/5 dark book) → only books that dark get a minus
    let said = 0;
    let saidBy: Evidence | undefined;
    let saidByValue = 0;
    for (const e of s.evidence) {
      const L = e.level ?? 3;
      const effect =
        e.sign < 0
          ? // too much there: a minus only for books with about as much or more (she's sensitive to it)
            -Math.max(0, Math.min(1, (x - Math.max(1.5, L - 1)) / 1.5))
          : e.wantedMore
            ? // missed it there: more than that book is a plus, as little or less a minus
              Math.max(-1, Math.min(1, (x - L) / 1.5))
            : lowEnd(e)
              ? // enjoyed how little of it there was ("such a light book" about a 1/5 dark book):
                // about as little is a plus, much more of it a minus
                Math.max(e.strength >= 3 ? -1 : -0.5, Math.min(1, (L + 1.5 - x) / 1.5))
              : // enjoyed it there: about as much is a plus; lacking it only counts if she was emphatic
                Math.max(e.strength >= 3 ? -0.5 : 0, Math.min(1, (x - Math.max(2, L - 2)) / 2));
      // "not enough of it" is a complaint within a kind of book: wanting more worldbuilding in a
      // fantasy says nothing about a thriller set in the real world
      const relevance = e.wantedMore ? Math.max(0.15, Math.min(1, (simTo(e.book) - 0.1) / 0.3)) : 1;
      const v = P.scaleDirection * e.strength * effect * relevance * (e.w ?? 1);
      said += v;
      if (!saidBy || Math.abs(v) * (0.5 + simTo(e.book)) > Math.abs(saidByValue) * (0.5 + simTo(saidBy.book))) {
        saidBy = e;
        saidByValue = v;
      }
    }
    said = Math.max(-1.2 * P.scaleDirection * 3, Math.min(1.2 * P.scaleDirection * 3, said));
    const v = miss + trend + said;
    scaleSum += v;
    const reason = scaleReason(k, x, miss, said, s, saidBy, simTo);
    if (reason)
      reasons.push({ value: P.scaleWeight * reason.value, kind: 'scale', text: reason.text, loved: reason.loved });
  }
  const scaleTotal = soft(scaleSum, P.scaleMax);

  // 4. author and series
  let authorDev = 0;
  const a = t.author.get(lastName(c.author));
  if (a) {
    const ratedByAuthor = t.rated.filter((b) => lastName(b.author) === lastName(c.author));
    authorDev = ratedByAuthor.reduce((s, b) => s + (b.rating! - t.mean), 0) / (ratedByAuthor.length + P.authorShrink);
    if (!ratedByAuthor.length) authorDev = Math.min(0.15, 0.05 * a.count);
    if (a.best && a.best.rating! >= t.mean + 0.25 && authorDev > 0.05)
      reasons.push({
        value: authorDev,
        kind: 'author',
        text: `You gave ${a.best.title} by ${c.author} ${fmt(a.best.rating!)}★`,
        books: [a.best],
      });
    else if (a.worst && authorDev < -0.1)
      reasons.push({
        value: authorDev,
        kind: 'author',
        text: `${c.author}'s ${a.worst.title} only got ${fmt(a.worst.rating!)}★ from you`,
      });
  }
  if (t.favourites.has(lastName(c.author))) {
    authorDev += 0.2;
    if (!reasons.some((r) => r.kind === 'author'))
      reasons.push({ value: 0.2, kind: 'author', text: `${c.author} is one of your favourite authors` });
  }

  let seriesDev = 0;
  const seriesName = c.series?.name ?? p.series?.name;
  const seriesNo = c.series?.number ?? p.series?.number;
  if (seriesName) {
    const mine = t.read.filter((b) => {
      const n = b.series?.name ?? b.profile?.series?.name;
      return n && seriesNorm(n) === seriesNorm(seriesName) && norm(b.title) !== norm(c.title);
    });
    const ratedMine = mine.filter((b) => b.rating !== undefined && b.status === 'read');
    if (ratedMine.length) {
      seriesDev = ratedMine.reduce((s, b) => s + (b.rating! - t.mean), 0) / (ratedMine.length + 0.5);
      const avg = ratedMine.reduce((s, b) => s + b.rating!, 0) / ratedMine.length;
      const maxRead = Math.max(0, ...ratedMine.map((b) => b.series?.number ?? b.profile?.series?.number ?? 0));
      const verb = seriesNo && seriesNo > maxRead ? 'It continues' : "It's part of";
      reasons.push({
        value: P.seriesWeight * seriesDev,
        kind: 'series',
        text: `${verb} ${seriesName}, which you rate ${fmt(Math.round(avg * 4) / 4)}★ on average`,
      });
    } else if (mine.length) {
      const furthest = Math.max(0, ...mine.map((b) => b.series?.number ?? b.profile?.series?.number ?? 0));
      reasons.push({
        value: 0.12,
        kind: 'series',
        text:
          seriesNo && furthest && seriesNo > furthest
            ? `It's the next part of ${seriesName}, which you've been reading`
            : `You've read ${mine.length > 1 ? `${mine.length} books` : 'a book'} of ${seriesName} already`,
      });
    } else if (seriesNo && seriesNo > 1) {
      seriesDev = -0.5;
      reasons.push({ value: -0.5, kind: 'series', text: `It's book ${seriesNo} of ${seriesName}: start with book 1` });
    }
  }

  // 5. what she asked for right now
  let moodDev = 0;
  if (wish.mood) {
    for (const [k, [lo, hi]] of Object.entries(MOOD_TARGETS[wish.mood]) as [ScaleId, [number, number]][]) {
      const x = p.scales[k];
      moodDev += x >= lo && x <= hi ? 0.2 : -0.25 * Math.min(2, x < lo ? lo - x : x - hi);
    }
  }

  // the series, its author and its closest books often tell the same story: don't count it three times
  let knnW = P.knnWeight;
  if (
    seriesDev > 0 ||
    (seriesDev < 0 && reasons.some((r) => r.kind === 'series' && !r.text.includes('start with book 1')))
  ) {
    knnW *= 0.5;
    authorDev *= 0.5;
  }
  // the less she has rated, the more careful the guess
  const evidence = t.rated.length + 0.3 * (t.read.length - t.rated.length) + (t.quiz?.completedAt ? 3 : 0);
  const dev =
    (evidence / (evidence + P.dataShrink)) *
    P.gain *
    (knnW * knnDev +
      P.tagWeight * tagTotal +
      P.scaleWeight * scaleTotal +
      authorDev +
      P.seriesWeight * seriesDev +
      moodDev);
  // soft limits: 5★ and 1★ are only reached with overwhelming evidence
  const stars = t.mean + (dev >= 0 ? soft(dev, 5 - t.mean) : soft(dev, t.mean - 1));
  const n = t.rated.length;
  const best = sims[0]?.sim ?? 0;
  const confidence = n < 4 ? 'early guess' : n >= 10 && best >= 0.45 ? 'strong' : 'fair';
  const ex = explain(reasons, t, c, stars);
  const why = ex.plus ? `${ex.why} ${ex.plus}` : ex.why;
  const headsUp = ex.headsUp;
  return { stars, score: starsToScore(stars), confidence, closest, reasons, why, headsUp };
}

/** A remark she liked about a book with little of it: she enjoyed the low end ("so light", "an easy read") */
const lowEnd = (e: Evidence) => e.sign > 0 && !e.wantedMore && (e.level ?? 3) <= 2;

// ---------- the explanation ----------

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** "Morally grey hero" (quiz) → "a morally grey hero" */
const quizSay = (label: string) => {
  const l = lower(label);
  return /\b(hero|heroine|setting)$/.test(l) ? `a ${l}` : l;
};

function listBooks(books: LibraryBook[]) {
  const s = books.map((b) => `${b.title}${b.rating !== undefined ? ` (${fmt(b.rating)}★)` : ''}`);
  return s.length > 1 ? `${s.slice(0, -1).join(', ')} and ${s[s.length - 1]}` : s[0];
}

/** How to say a scale value in a sentence: [high, low, noun] */
const SCALE_SAY: Record<ScaleId, [string, string, string]> = {
  romance: ['has a big romance', 'has little romance', 'romance'],
  spice: ['has plenty of heat', 'is low on spice', 'spice'],
  romancePace: ['is a slow burn', 'gets the couple together fast', 'a slow burn'],
  angst: ['has lots of relationship angst', 'has little relationship drama', 'relationship angst'],
  banter: ['has lots of banter', 'has little banter', 'banter'],
  humour: ['is really funny', 'is quite serious', 'humour'],
  darkness: ['goes to dark places', 'stays light and cosy', 'dark themes'],
  violence: ['has graphic violence', 'has little violence', 'violence'],
  emotional: ['is an emotional rollercoaster', 'is emotionally light', 'big emotions'],
  tension: ['is full of tension', 'is more relaxed than suspenseful', 'tension'],
  twists: ['is full of twists', 'has few twists', 'twists'],
  mystery: ['has a mystery at its heart', 'has no real mystery', 'a mystery'],
  action: ['has lots of action', 'has little action', 'action'],
  intrigue: ['is full of scheming and politics', 'has little scheming', 'politics and scheming'],
  worldbuilding: ['has a rich, complex world', 'is set in the real world', 'worldbuilding'],
  plotPace: ['moves fast', 'takes its time', 'a fast pace'],
  slowStart: ['takes a while to get going', 'grabs you from the start', 'a slow start'],
  complexity: ['is demanding and layered', 'is an easy read', 'complexity'],
  characterFocus: ['is very character-driven', 'is very plot-driven', 'character focus'],
};
/** Scales where "right in your sweet spot" is worth saying */
const SWEET_SPOT_WORTH_SAYING: ScaleId[] = ['spice', 'darkness', 'romance', 'banter', 'humour', 'emotional'];

function scaleReason(
  k: ScaleId,
  x: number,
  miss: number,
  said: number,
  s: ScaleTaste,
  e: Evidence | undefined,
  simTo: (b: LibraryBook) => number,
): { value: number; text: string; loved?: Reason['loved'] } | undefined {
  const [hi, lo, noun] = SCALE_SAY[k];
  const phrase = x >= 3 ? hi : lo;
  if (Math.abs(said) >= 0.08 && e?.quote) {
    const related = simTo(e.book) >= 0.3;
    if (said > 0)
      return e.sign > 0
        ? e.wantedMore
          ? { value: said, text: `It ${phrase}: just what you missed in ${e.book.title} (“${e.quote}”)` }
          : {
              value: said,
              text: `It ${phrase}, which you loved in ${e.book.title} (“${e.quote}”)`,
              loved: { pred: phrase, book: e.book.title, quote: e.quote },
            }
        : // "none of what bothered you" only matters for books in the same corner
          { value: related ? said : said * 0.4, text: `It ${phrase}, unlike ${e.book.title} (“${e.quote}”)` };
    return e.sign > 0
      ? e.wantedMore
        ? { value: said, text: `It ${phrase}, and you missed ${noun} in ${e.book.title} too (“${e.quote}”)` }
        : lowEnd(e)
          ? { value: said, text: `It ${phrase}, unlike ${e.book.title}, which you loved for it (“${e.quote}”)` }
          : { value: said, text: `It ${phrase}, and you love ${noun} (“${e.quote}” about ${e.book.title})` }
      : { value: said, text: `It ${phrase}, which bothered you in ${e.book.title} (“${e.quote}”)` };
  }
  if (miss <= -0.15)
    return { value: miss, text: `It ${phrase}, ${x > s.sweet ? 'more' : 'less'} than you usually enjoy` };
  if (
    SWEET_SPOT_WORTH_SAYING.includes(k) &&
    Math.abs(x - s.sweet) <= 0.6 &&
    s.spread <= 1 &&
    Math.abs(s.sweet - 2.5) >= 1.2
  )
    return {
      value: 0.1,
      text: k === 'spice' ? `Its heat level (${x}/5) is right where you like it` : `It ${phrase}, just how you like it`,
    };
  return undefined;
}

const COUNTABLE_TROPES = new Set([
  'quest',
  'heist',
  'bargain / deal',
  'chosen one',
  'love triangle',
  'secret identity',
  'revenge plot',
  'serial killer',
  'stalker',
  'missing person',
  'secret society',
  'unreliable narrator',
  'dual timeline',
  'locked room / closed circle',
  'family saga',
  'holiday romance',
  'workplace romance',
  'celebrity romance',
  'body swap / magic twist',
  'redemption arc',
  'boss / employee',
  'bodyguard',
  'single parent',
  'marriage of convenience / arranged marriage',
]);
const TROPE_SAY: Record<string, string> = {
  'trials / deadly competition': 'deadly trials',
  'captive / kidnapped': 'a captive storyline',
  'locked room / closed circle': 'a closed-circle mystery',
  'body swap / magic twist': 'a magical twist',
  'marriage of convenience / arranged marriage': 'an arranged marriage',
  'reverse harem / why choose': 'a why-choose romance',
  'boss / employee': 'a boss-employee romance',
  'missing person': 'a missing-person case',
  'he falls first': 'a hero who falls first',
  'touch her and die': 'a touch-her-and-die hero',
  'villain gets the girl': 'a villain who gets the girl',
  'morally grey choices': 'morally grey choices',
  'brother’s best friend': "a brother's-best-friend romance",
};
const first = (v: string) => v.split(' / ')[0];
const article = (w: string) => (/^[aeiou]/i.test(w) ? 'an' : 'a');

function featureName(f: FeatureId) {
  const [g, v] = f.split(/:(.+)/) as [string, string];
  switch (g) {
    case 'trope':
      if (TROPE_SAY[v]) return TROPE_SAY[v];
      return COUNTABLE_TROPES.has(v) ? `${article(first(v))} ${first(v)}` : first(v);
    case 'hero':
      return v === 'no clear male lead' ? 'no clear male lead' : `${article(first(v))} ${first(v)} hero`;
    case 'heroine':
      return v === 'no clear female lead' ? 'no clear female lead' : `${article(first(v))} ${first(v)} heroine`;
    case 'setting':
      return `the ${first(v)} setting`;
    case 'creature':
      return v;
    case 'theme':
      return `a theme of ${first(v)}`;
    case 'genre':
      return `a ${v} feel`;
    case 'ending':
      return v === 'cliffhanger' ? 'a cliffhanger ending' : `${article(v)} ${v} ending`;
    case 'pov':
      return `${v.replace(',', '')} narration`;
    case 'seriesRole':
      return v === 'standalone' ? 'a standalone story' : `${article(first(v))} ${first(v)}`;
    case 'audience':
      return v === 'young adult' ? 'a young adult feel' : `an ${v} audience`;
    case 'warning':
      return `content with ${v}`;
    default:
      return v;
  }
}

function featureText(
  f: FeatureId,
  v: number,
  evidence: Evidence[],
  t: Taste,
  simTo: (b: LibraryBook) => number,
): { text: string; loved?: Reason['loved']; books?: LibraryBook[]; pred?: string } {
  const say = (text: string) => ({ text });
  const name = featureName(f);
  // her own words first, from the book most like this one
  const quoted = evidence
    .filter((e) => e.quote && e.sign > 0 === v > 0)
    .sort((a, b) => b.strength * (0.5 + simTo(b.book)) - a.strength * (0.5 + simTo(a.book)))[0];
  if (quoted)
    return {
      text: `It has ${name}, and you wrote “${quoted.quote}” about ${quoted.book.title}`,
      loved: v > 0 ? { pred: `has ${name}`, book: quoted.book.title, quote: quoted.quote! } : undefined,
    };
  const books = evidence
    .filter((e) => e.rating !== undefined && (v > 0 ? e.rating >= t.mean + 0.25 : e.rating <= t.mean - 0.25))
    .sort((a, b) => (v > 0 ? b.rating! - a.rating! : a.rating! - b.rating!) || simTo(b.book) - simTo(a.book))
    .slice(0, 2)
    .map((e) => e.book);
  if (books.length)
    return {
      text:
        v > 0
          ? `It has ${name}, like ${listBooks(books)}`
          : `It has ${name}, like ${listBooks(books)}, which you rated lower`,
      books: v > 0 ? books : undefined,
      pred: `has ${name}`,
    };
  if (t.fromQuiz.has(f))
    return say(
      v > 0
        ? `It has ${name}, a favourite of yours from your quiz`
        : `It has ${name}, which you said in your quiz isn't for you`,
    );
  return say(v > 0 ? `It has ${name}, which you love` : `It has ${name}, which isn't really your thing`);
}

function explain(reasons: Reason[], t: Taste, c: Candidate, stars: number) {
  // specific beats general: a trope or hero type says more than "it has romance"
  const telling = (r: Reason) =>
    r.value * (r.kind === 'feature' ? 1.4 : r.kind === 'scale' ? (/romance|heat/.test(r.text) ? 0.6 : 0.9) : 1);
  const plus = reasons.filter((r) => r.value > 0).sort((a, b) => telling(b) - telling(a));
  const minus = reasons.filter((r) => r.value < 0).sort((a, b) => a.value - b.value);
  // a low score: say what holds it back first, then what it does have going for it
  if (stars < t.mean - 0.4 && minus.length) {
    const why = minus
      .slice(0, 2)
      .map((r) => `${r.text}.`)
      .join(' ');
    const bright = plus.find((r) => r.kind !== 'closest');
    // the book was already named above ("it's closest to …"): call it "that one"
    const named = minus.slice(0, 2).flatMap((r) => r.books?.map((b) => b.title) ?? []);
    const brightText =
      bright?.loved && named.length === 1 && named[0] === bright.loved.book
        ? `it ${bright.loved.pred}, which you did love in that one (“${bright.loved.quote}”)`
        : bright && lower(bright.text);
    return { why, headsUp: undefined, plus: bright ? `On the plus side: ${brightText}.` : undefined };
  }
  const sentences: string[] = [];
  const closest = plus.find((r) => r.kind === 'closest');
  const series = reasons.find((r) => r.kind === 'series');
  if (series && series.value > 0) sentences.push(series.text);
  else if (closest) sentences.push(closest.text);
  let unlikes = 0;
  const used = new Set(sentences);
  // favourites from her quiz in one sentence (and "fae" and "the fae realm setting" only once)
  const quizNames: string[] = [];
  for (const r of plus.filter((x) => x.quiz)) {
    if (!quizNames.includes(r.quiz!)) quizNames.push(r.quiz!);
  }
  let quizSaid = false;
  // several things she loved in the same book: one sentence, the book named once
  const lovedIn = new Map<string, Reason[]>();
  for (const r of plus) if (r.loved) lovedIn.set(r.loved.book, [...(lovedIn.get(r.loved.book) ?? []), r]);
  const cited = new Set<string>();
  // "It's most like <book>" opens the explanation: that book is then not named again
  const opener = sentences.length && closest && sentences[0] === closest.text ? closest.books : undefined;
  const openerBook = opener?.length === 1 ? opener[0].title : undefined;
  if (opener) opener.forEach((b) => cited.add(b.title));
  for (const r of plus) {
    if (sentences.length >= 3) break;
    if (used.has(r.text) || r.kind === 'closest' || r.kind === 'series') continue;
    if (r.kind === 'feature' && r.pred && r.books?.every((b) => cited.has(b.title))) {
      sentences.push(`It ${r.pred} too`);
      used.add(r.text);
      continue;
    }
    if (r.kind === 'author' && r.books?.length === 1 && cited.has(r.books[0].title)) {
      sentences.push(`It's by ${c.author}, just like that one`);
      used.add(r.text);
      continue;
    }
    if (r.loved) {
      const group = (lovedIn.get(r.loved.book) ?? []).slice(0, 3);
      const sameAsOpener = r.loved.book === openerBook;
      if (cited.has(r.loved.book) && !sameAsOpener) continue;
      if (sameAsOpener && used.has(`opener:${openerBook}`)) continue;
      cited.add(r.loved.book);
      const preds = group.map((g) => g.loved!.pred);
      const quotes = group.map((g) => `“${g.loved!.quote}”`).join(', ');
      const what =
        group.length > 1
          ? `${preds.slice(0, -1).join(', ')} and ${preds[preds.length - 1]}, ${group.length === 2 ? 'both' : 'all'} things you loved`
          : `${preds[0]}, which you loved`;
      if (sameAsOpener) {
        // fold it into the opening sentence: "It's most like X (4.5★): it has …, things you loved there (…)"
        sentences[0] = `${closest!.text}, and it ${what} there (${quotes})`;
        used.add(`opener:${openerBook}`);
        group.forEach((g) => used.add(g.text));
        continue;
      }
      if (group.length > 1) {
        sentences.push(`It ${what} in ${r.loved.book} (${quotes})`);
        group.forEach((g) => used.add(g.text));
        continue;
      }
    }
    if (r.quiz) {
      if (quizSaid) continue;
      quizSaid = true;
      const list = quizNames.slice(0, 3);
      sentences.push(
        list.length > 1
          ? `It has ${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}: all favourites from your quiz`
          : `It has ${list[0]}, a favourite of yours from your quiz`,
      );
      continue;
    }
    // at most one "unlike that book you didn't enjoy"
    if (r.text.includes(', unlike ') && unlikes++ > 0) continue;
    sentences.push(r.text);
    used.add(r.text);
  }
  if (!sentences.length) {
    if (!t.rated.length)
      sentences.push(`Snug doesn't know your taste well yet: rate a few books you've read and this gets personal`);
    else if (minus.length) sentences.push(`Not much here matches what you love`);
    else sentences.push(`Not much is known about ${c.title} yet, so this is a careful guess`);
  }
  const worry = minus[0] && (minus[0].value <= -0.15 || plus.length === 0) ? minus[0] : undefined;
  let headsUp = worry && `${worry.text}.`;
  // the book it's most like was already named above: don't name it again
  if (worry?.kind === 'closest' && worry.books?.length === 1 && cited.has(worry.books[0].title)) {
    const b = worry.books[0];
    headsUp = `Overall it's most like that book, and you only gave it ${fmt(b.rating!)}★.`;
  }
  return { why: sentences.map((s) => `${s}.`).join(' '), headsUp, plus: undefined as string | undefined };
}
