import { z } from 'zod';
import {
  PROFILE_VERSION,
  SCALES,
  SCALE_IDS,
  TAGS,
  TAG_GROUPS,
  profileKey,
  type BookProfile,
  type FeatureId,
  type ReviewInsight,
  type ScaleId,
  type TagGroup,
} from '../src/taste/vocab';
import { AiLimitError, ask, googleDescription, isLive, TIPS_MODEL, type AiEnv } from './ai';

// ---------- analysing a book, once ----------

const enumOf = (values: readonly string[]) => z.enum(values as unknown as [string, ...string[]]);

const ProfileSchema = z.object({
  title: z.string(),
  author: z.string(),
  scales: z.object(Object.fromEntries(SCALE_IDS.map((id) => [id, z.number()])) as Record<ScaleId, z.ZodNumber>),
  tags: z.object(
    Object.fromEntries(TAG_GROUPS.map((g) => [g, z.array(enumOf(TAGS[g]))])) as unknown as Record<
      TagGroup,
      z.ZodArray<z.ZodType<string>>
    >,
  ),
  pages: z.number().nullable(),
  comps: z.array(z.string()),
  vibe: z.array(z.string()),
  confidence: z.enum(['knows it well', 'knows it somewhat', 'blurb only']),
  seriesName: z.string().nullable(),
  seriesNumber: z.number().nullable(),
});
const BatchSchema = z.object({ books: z.array(ProfileSchema) });

const ANALYST = `You analyse novels for a personal book-recommendation app. Each book is analysed once and the result is reused for years, so be precise and consistent: the same kind of book must get the same values.

Use what you know about the book itself (plot, characters, reviews readers wrote, how it is discussed) together with the description provided. If you don't know the book, go by the description and set confidence to "blurb only".

SCALES (whole numbers 0–5). Use the anchors to stay calibrated:
${SCALE_IDS.map((id) => `- ${id}: ${SCALES[id]}`).join('\n')}
Calibration examples:
- spice: Twilight 0 · A Court of Thorns and Roses 3 · Fourth Wing 3 · A Court of Mist and Fury 4 · Haunting Adeline 5
- darkness: Beach Read 1 · Fourth Wing 3 · It Ends with Us 4 · Haunting Adeline 5
- romance: The Silent Patient 0 · Throne of Glass 3 · Fourth Wing 4 · Beach Read 5
- slowStart: Fourth Wing 1 · The Housemaid 1 · A Court of Thorns and Roses 3 · The Way of Kings 4
- worldbuilding: Beach Read 0 · A Court of Thorns and Roses 3 · Fourth Wing 3 · The Way of Kings 5
- banter: The Silent Patient 0 · Fourth Wing 3 · The Love Hypothesis 4 · From Blood and Ash 4
- romancePace: Fourth Wing 3 · A Court of Mist and Fury 3 · Throne of Glass 4 · insta-love romance 0

TAGS: choose every value from the given lists that clearly applies (and only those), per group. Prefer a few accurate tags over many vague ones; tropes must be real, central elements of this book. Use "none" for creatures if there are none. hero/heroine describe the main romantic leads (or the main characters if there is no romance).

pages: page count of the usual English edition, or null.
comps: 3–5 well-known books that readers compare it to ("for fans of …"), exact titles.
vibe: 3–6 short words or phrases on how it feels to read (e.g. "lush", "brutal", "swoony", "laugh-out-loud", "claustrophobic"). No plot.
seriesName / seriesNumber: the series and its number in it, or null for a standalone.`;

function rowToProfile(data: string): BookProfile {
  return JSON.parse(data) as BookProfile;
}

async function stored(env: AiEnv, keys: string[]) {
  if (!keys.length) return new Map<string, BookProfile>();
  const { results } = await env.DB.prepare(
    `SELECT key, data FROM book_profiles WHERE version = ? AND key IN (${keys.map(() => '?').join(',')})`,
  )
    .bind(PROFILE_VERSION, ...keys)
    .all<{ key: string; data: string }>();
  return new Map(results.map((r) => [r.key, rowToProfile(r.data)]));
}

const clampScale = (n: number) => Math.max(0, Math.min(5, Math.round(n)));

/** A rough profile for test mode (no AI), so the app still works */
function guessProfile(b: { title: string; author: string; genres?: string[] }): BookProfile {
  const g = (b.genres ?? []).join(' ').toLowerCase();
  const scales = Object.fromEntries(SCALE_IDS.map((id) => [id, 2])) as Record<ScaleId, number>;
  if (/romance|romantasy|spicy/.test(g)) Object.assign(scales, { romance: 4, spice: /spicy/.test(g) ? 4 : 2 });
  if (/thriller|mystery/.test(g)) Object.assign(scales, { tension: 4, twists: 4, mystery: 3, romance: 1 });
  if (/fantasy|romantasy/.test(g)) Object.assign(scales, { worldbuilding: 3, action: 3 });
  return {
    version: PROFILE_VERSION,
    title: b.title,
    author: b.author,
    scales,
    tags: {
      genre: [
        ...(/romantasy/.test(g) ? ['romantasy'] : []),
        ...(/thriller/.test(g) ? ['psychological thriller'] : []),
        ...(/romance/.test(g) && !/romantasy/.test(g) ? ['contemporary romance'] : []),
        ...(/fantasy/.test(g) && !/romantasy/.test(g) ? ['high fantasy'] : []),
      ],
    },
    comps: [],
    vibe: [],
    confidence: 'blurb only',
  };
}

/**
 * Profiles for these books: from the database when Snug analysed them before, otherwise
 * analysed now by Claude (a few per request) and stored for good.
 */
export async function bookProfiles(
  env: AiEnv,
  books: { title: string; author: string; description?: string; genres?: string[] }[],
): Promise<{ profiles: Record<string, BookProfile>; pending: number }> {
  const wanted = new Map(books.map((b) => [profileKey(b.title, b.author), b]));
  const have = await stored(env, [...wanted.keys()]);
  const out: Record<string, BookProfile> = Object.fromEntries(have);
  const missing = [...wanted.entries()].filter(([k]) => !have.has(k));
  if (!missing.length) return { profiles: out, pending: 0 };

  if (!isLive(env)) {
    for (const [k, b] of missing) out[k] = guessProfile(b);
    return { profiles: out, pending: 0 };
  }

  // a few books per question: cheaper, and each answer stays short enough
  const groups: (typeof missing)[] = [];
  for (let i = 0; i < missing.length; i += 4) groups.push(missing.slice(i, i + 4));
  let pending = 0;
  await Promise.all(
    groups.map(async (group) => {
      const withBlurbs = await Promise.all(
        group.map(async ([k, b]) => {
          const blurb = (await googleDescription(env, b.title, b.author).catch(() => undefined)) ?? b.description;
          return { k, b, blurb: blurb && b.description && b.description.length > blurb.length ? b.description : blurb };
        }),
      );
      try {
        const res = await ask(
          env,
          TIPS_MODEL,
          BatchSchema,
          ANALYST,
          `Analyse these books:\n\n${withBlurbs
            .map(
              (x, i) =>
                `${i + 1}. "${x.b.title}" by ${x.b.author}\nDescription: ${(x.blurb ?? 'none available').replace(/\s+/g, ' ').slice(0, 2500)}`,
            )
            .join('\n\n')}`,
          'medium',
          16000,
          { kind: 'analysis', count: group.length },
        );
        const now = Date.now();
        for (const x of withBlurbs) {
          const r =
            res?.books.find((p) => profileKey(p.title, p.author) === x.k) ??
            res?.books.find((p) => profileKey(p.title, '') === profileKey(x.b.title, ''));
          if (!r) {
            pending++;
            continue;
          }
          const profile: BookProfile = {
            version: PROFILE_VERSION,
            title: x.b.title,
            author: x.b.author,
            scales: Object.fromEntries(SCALE_IDS.map((id) => [id, clampScale(r.scales[id] ?? 0)])) as Record<
              ScaleId,
              number
            >,
            tags: Object.fromEntries(
              TAG_GROUPS.map((g) => [
                g,
                [
                  ...new Set(
                    ((r.tags as Record<string, string[]>)[g] ?? []).filter((t) =>
                      (TAGS[g] as readonly string[]).includes(t),
                    ),
                  ),
                ],
              ]),
            ),
            pages: r.pages ?? undefined,
            comps: r.comps.slice(0, 5),
            vibe: r.vibe.slice(0, 6),
            confidence: r.confidence,
            series: r.seriesName ? { name: r.seriesName, number: r.seriesNumber ?? undefined } : undefined,
          };
          out[x.k] = profile;
          await env.DB.prepare(
            'INSERT OR REPLACE INTO book_profiles (key, version, data, created_at) VALUES (?, ?, ?, ?)',
          )
            .bind(x.k, PROFILE_VERSION, JSON.stringify(profile), now)
            .run();
        }
      } catch (err) {
        if (!(err instanceof AiLimitError)) console.error('analysis failed', err);
        pending += group.length;
      }
    }),
  );
  return { profiles: out, pending };
}

// ---------- reading her review, once per review ----------

const FEATURES: FeatureId[] = [
  ...TAG_GROUPS.flatMap((g) => TAGS[g].filter((t) => t !== 'none').map((t) => `${g}:${t}` as FeatureId)),
  ...SCALE_IDS.map((id) => `scale:${id}` as FeatureId),
];

const InsightSchema = z.object({
  summary: z.string(),
  likes: z.array(
    z.object({ feature: enumOf(FEATURES), strength: z.number(), quote: z.string(), wantedMore: z.boolean() }),
  ),
  dislikes: z.array(z.object({ feature: enumOf(FEATURES), strength: z.number(), quote: z.string() })),
});

const REVIEW_READER = `You read one reader's short review of a book (with her star rating and the book's analysis) and translate what she says into fixed features, so an app can learn her taste.

Features are tags ("trope:enemies to lovers", "hero:morally grey", "setting:fae realm", "theme:grief", "warning:infidelity / cheating", …) or scales ("scale:banter", "scale:slowStart", "scale:spice", …).
- likes: what she enjoyed, or missed and wants more of. For a scale this means she wants this much or MORE of it. Set wantedMore to true when she missed it in this book ("not enough romance", "wish it was spicier", "where was the spice?"), false when she enjoyed it here ("loved the banter").
- dislikes: what bothered her because there was too MUCH of it. For a scale this means she wants LESS (e.g. "took forever to get going" → scale:slowStart; "too dark for me" → scale:darkness; "the miscommunication drove me crazy" → scale:angst).
- Mind the direction of each scale: "plotPace" is high when the plot is FAST, so "too slow", "slow middle" or "dragged" is a like of scale:plotPace with wantedMore true (she wants more pace), never a dislike. Likewise "too short" or "nothing happens" means she wanted more of something, never a dislike of it.
- strength: 1 a light mention, 2 clearly said, 3 emphatic or a dealbreaker.
- quote: her own words (short, exactly as written; in Dutch if she wrote Dutch).
Only include what she actually expresses or very clearly implies; never guess from the book alone. Map each remark to the single most specific feature it is about, and don't stretch it: "the first chapters were info-dumpy" is about scale:slowStart, not a dislike of worldbuilding; "Rhysand is the best book boyfriend" is a like of that hero's type (e.g. hero:morally grey or hero:alpha protector, as the analysis says), not of romance in general. A general "loved it" or "couldn't put it down" maps to nothing specific unless she names what. Use the book analysis to pick the right feature for what she describes (e.g. which character she means).
summary: one sentence, in English, on what made her rate it like this.`;

export async function reviewInsight(
  env: AiEnv,
  input: {
    title: string;
    author: string;
    rating?: number;
    review: string;
    tags?: string[];
    profile?: BookProfile;
    hash: string;
  },
): Promise<ReviewInsight | null> {
  if (!isLive(env)) return { hash: input.hash, summary: '', likes: [], dislikes: [] };
  const p = input.profile;
  const res = await ask(
    env,
    TIPS_MODEL,
    InsightSchema,
    REVIEW_READER,
    [
      `Book: "${input.title}" by ${input.author}`,
      `Her rating: ${input.rating !== undefined ? `${input.rating} out of 5` : 'none'}`,
      input.tags?.length ? `Her tags: ${input.tags.join(', ')}` : '',
      `Her review: """${input.review}"""`,
      p
        ? `Book analysis: ${Object.entries(p.scales)
            .map(([k, v]) => `${k} ${v}`)
            .join(', ')}; ${TAG_GROUPS.map((g) => (p.tags[g]?.length ? `${g}: ${p.tags[g]!.join(', ')}` : ''))
            .filter(Boolean)
            .join('; ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n'),
    'low',
    6000,
    { kind: 'analysis', count: 1 },
  );
  if (!res) return null;
  const clean = (l: { feature: string; strength: number; quote: string; wantedMore?: boolean }[]) =>
    l
      .filter((x) => (FEATURES as string[]).includes(x.feature))
      .map((x) => ({
        feature: x.feature as FeatureId,
        strength: Math.max(1, Math.min(3, Math.round(x.strength))) as 1 | 2 | 3,
        quote: x.quote.slice(0, 200),
        ...(x.wantedMore ? { wantedMore: true } : {}),
      }));
  return { hash: input.hash, summary: res.summary, likes: clean(res.likes), dislikes: clean(res.dislikes) };
}
