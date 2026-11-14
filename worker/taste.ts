// A small "taste engine" for the free test mode: learns what she likes from her ratings,
// reviews, tags and quiz, and scores books against it. With the AI on, Claude does this
// (with the same information) instead.

import type { Book } from '../src/types';
import type { ReaderProfile } from '../src/shared';

/** Things books can have, recognised in descriptions, reviews and tags */
export const TRAITS: Record<string, RegExp> = {
  dragons: /dragon/i,
  fae: /\bfae\b|faerie|fairy court|high lord/i,
  'enemies to lovers': /enem(y|ies)[ -]to[ -]lovers|rivals? to lovers|\brivals?\b/i,
  'slow burn': /slow[ -]burn/i,
  banter: /banter|witty|funny|hilarious|humou?r|laugh/i,
  spice: /spic(e|y)|steamy|smut|sexy|hot scenes/i,
  'plot twists': /twist|didn'?t see .* coming|unpredictable|shock/i,
  emotional: /emotional|cr(y|ied)|tears|heartbr|sob/i,
  dark: /\bdark\b|brutal|violent|grim/i,
  'small town': /small[ -]town/i,
  'found family': /found family/i,
  'magic school': /academy|war college|magic school/i,
  'grumpy sunshine': /grumpy/i,
  'fake dating': /fake (dating|relationship|boyfriend|girlfriend)/i,
  'morally grey': /morally gr[ae]y|villain/i,
  'fast pace': /page[- ]turner|could(n'?t| not) (stop|put)|fast[- ]paced|gripping|addictive/i,
  'slow pace': /\bslow\b(?![ -]burn)|boring|dragg|took (a while|long)/i,
  'love triangle': /love triangle/i,
  vampires: /vampire/i,
  werewolves: /werewol|shifter/i,
};

/** Tropes from the quiz → traits above */
const TROPE_TO_TRAIT: Record<string, string> = {
  'Enemies to lovers': 'enemies to lovers',
  'Slow burn': 'slow burn',
  'Grumpy x sunshine': 'grumpy sunshine',
  'Fake dating': 'fake dating',
  'Found family': 'found family',
  'Morally grey hero': 'morally grey',
  'Small town': 'small town',
  'Fae & faerie courts': 'fae',
  Dragons: 'dragons',
  'Magic academy': 'magic school',
  'Plot twists': 'plot twists',
  'Love triangle': 'love triangle',
  'Dark romance': 'dark',
  'Villain gets the girl': 'morally grey',
};

/** "not enough banter", "needed more spice": she wants MORE of it */
const WANTS_MORE = /(not enough|more|needed|wish(ed)?( for)?|lack(ed|ing|s)?|missing|too little)\W+(\w+\W+){0,2}$/i;
const NEGATION = /(too|not|no|bit|little|less|didn'?t|hate[ds]?|wasn'?t|lacked?)\W+(\w+\W+){0,2}$/i;

export function traitsIn(text: string): string[] {
  return Object.entries(TRAITS)
    .filter(([, re]) => re.test(text))
    .map(([t]) => t);
}

export interface Taste {
  genre: Map<string, number>; // -2 … +2: how she rates this genre compared to her average
  author: Map<string, number>;
  liked: Map<string, { weight: number; from: Book }>; // trait → evidence
  disliked: Map<string, { weight: number; from?: Book }>;
  favourite?: Book; // her highest rated book
  /** Spice level she likes (0–5); undefined when we don't know yet */
  spice?: number;
  avg: number;
  /** Reading habits, also from books she didn't rate: genre → share of what she read (0–1) */
  habitGenre: Map<string, number>;
  /** author → how many of their books she read or is reading */
  habitAuthor: Map<string, number>;
  favouriteAuthors: Set<string>;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

export function learnTaste(books: Book[], profile?: ReaderProfile): Taste {
  const rated = books.filter((b) => b.status === 'read' && b.rating !== undefined);
  const avg = rated.length ? rated.reduce((s, b) => s + b.rating!, 0) / rated.length : 3.5;
  const genre = new Map<string, number[]>();
  const author = new Map<string, number[]>();
  const liked = new Map<string, { weight: number; from: Book }>();
  const disliked = new Map<string, { weight: number; from?: Book }>();

  for (const b of rated) {
    const delta = b.rating! - avg;
    for (const g of b.genres) genre.set(g, [...(genre.get(g) ?? []), delta]);
    const a = norm(b.authors[0] ?? '');
    if (a) author.set(a, [...(author.get(a) ?? []), b.rating! - 3]);

    // her own words: what she praised or complained about
    const review = b.review ?? '';
    for (const [trait, re] of Object.entries(TRAITS)) {
      const m = review.match(re);
      if (!m) continue;
      const before = review.slice(0, m.index);
      if (WANTS_MORE.test(before) && trait !== 'slow pace') {
        liked.set(trait, { weight: (liked.get(trait)?.weight ?? 0) + 1.5, from: liked.get(trait)?.from ?? b });
        continue;
      }
      const complaint = NEGATION.test(before) || trait === 'slow pace';
      if (complaint || b.rating! <= 2.5) {
        const cur = disliked.get(trait);
        disliked.set(trait, { weight: (cur?.weight ?? 0) + 1.5, from: b });
      } else if (b.rating! >= 4) {
        const cur = liked.get(trait);
        if (!cur || b.rating! > cur.from.rating!) liked.set(trait, { weight: (cur?.weight ?? 0) + 1.5, from: b });
      }
    }
    // tags she gave
    for (const tag of b.tags) {
      for (const trait of traitsIn(tag)) {
        if (b.rating! >= 4) liked.set(trait, { weight: (liked.get(trait)?.weight ?? 0) + 1, from: b });
        if (b.rating! <= 2.5) disliked.set(trait, { weight: (disliked.get(trait)?.weight ?? 0) + 1, from: b });
      }
    }
    // what loved/disliked books are about (lighter weight)
    for (const trait of traitsIn(`${b.description ?? ''} ${b.genres.join(' ')}`)) {
      if (b.rating! >= 4.5 && !liked.has(trait)) liked.set(trait, { weight: 0.5, from: b });
      if (b.rating! <= 2 && !disliked.has(trait)) disliked.set(trait, { weight: 0.5, from: b });
    }
  }

  // the quiz
  for (const t of profile?.lovedTropes ?? []) {
    const trait = TROPE_TO_TRAIT[t];
    if (trait)
      liked.set(trait, { weight: (liked.get(trait)?.weight ?? 0) + 1.2, from: liked.get(trait)?.from ?? rated[0] });
  }
  for (const t of profile?.hatedTropes ?? []) {
    const trait = TROPE_TO_TRAIT[t];
    if (trait) disliked.set(trait, { weight: (disliked.get(trait)?.weight ?? 0) + 2 });
  }

  const avgOf = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
  const mean = (m: Map<string, number[]>) =>
    new Map([...m.entries()].map(([k, v]) => [k, Math.max(-2, Math.min(2, v.reduce((s, x) => s + x, 0) / v.length))]));
  // habits: what she reads (and keeps reading), rated or not
  const readish = books.filter((b) => b.status === 'read' || b.status === 'reading');
  const habitGenre = new Map<string, number>();
  const habitAuthor = new Map<string, number>();
  for (const b of readish) {
    for (const g of b.genres) habitGenre.set(g, (habitGenre.get(g) ?? 0) + 1 / readish.length);
    const a = norm(b.authors[0] ?? '');
    if (a) habitAuthor.set(a, (habitAuthor.get(a) ?? 0) + 1);
  }

  return {
    habitGenre,
    habitAuthor,
    favouriteAuthors: new Set((profile?.favouriteAuthors ?? []).map(norm)),
    genre: mean(genre),
    author: mean(author),
    liked: new Map([...liked].filter(([, v]) => v.from)),
    disliked,
    favourite: [...rated].sort((a, b) => b.rating! - a.rating!)[0],
    spice: profile?.completedAt
      ? profile.spice
      : (genre.get('Spicy')?.length ?? 0) > 0
        ? Math.round(2.5 + Math.max(-2, Math.min(2, avgOf(genre.get('Spicy')!))))
        : undefined,
    avg,
  };
}

export interface Candidate {
  /** For books on her shelf: the series part before this one, if she read it */
  previous?: Book;
  title: string;
  author: string;
  genres: string[];
  traits: string[];
  moods?: string[];
  spice?: number;
  blurb?: string;
}

export interface Scored {
  score: number;
  why: string;
}

/** How a trait reads in a sentence */
const NICE: Record<string, string> = {
  fae: 'faerie courts',
  'enemies to lovers': 'enemies-to-lovers tension',
  banter: 'banter',
  spice: 'spice',
  'plot twists': 'plot twists',
  emotional: 'emotional punch',
  dark: 'dark edge',
  'small town': 'small-town charm',
  'grumpy sunshine': 'grumpy/sunshine pairing',
  'morally grey': 'morally grey love interest',
  'fast pace': 'can’t-put-it-down pace',
  'slow pace': 'slow pace',
  'magic school': 'magic-school setting',
};
const nice = (t: string) => NICE[t] ?? t;

const PLURAL: Record<string, string> = {
  Thriller: 'thrillers',
  Mystery: 'mysteries',
  Spicy: 'spicy books',
  'Young adult': 'young adult books',
  Historical: 'historical fiction',
};
const genreWord = (g: string) => PLURAL[g] ?? g.toLowerCase();

const fmt = (r: number) => (r % 1 === 0 ? String(r) : r.toFixed(2).replace(/0$/, ''));

/** How well a book fits her (0–100) and a short reason in her own terms */
export function scoreBook(c: Candidate, taste: Taste, books: Book[], wish: { genre?: string; mood?: string }): Scored {
  let score = 62;
  const reasons: { weight: number; text: string }[] = [];

  // genre: what she rates high, and the genre she asked for
  for (const g of c.genres) {
    const w = taste.genre.get(g);
    if (w !== undefined) score += w * 8;
  }
  if (wish.genre) score += c.genres.includes(wish.genre) ? 8 : -15;

  // the next part of a series she's reading: the strongest reason there is
  if (c.previous?.rating !== undefined) {
    const r = c.previous.rating;
    score += (r - 3) * 9 + 4;
    if (r >= 3.5)
      reasons.push({
        weight: 6,
        text: `It's the next book after ${c.previous.title}, which you gave ${fmt(r)}★${c.previous.review ? ` (“${c.previous.review}”)` : ''}.`,
      });
    else
      reasons.push({
        weight: 3,
        text: `It continues ${c.previous.title}, which you gave ${fmt(r)}★, so maybe not first in line.`,
      });
  }

  // authors she rated
  const aw = taste.author.get(norm(c.author));
  if (aw !== undefined) {
    score += aw * 5;
    const best = books
      .filter((b) => b.status === 'read' && b.rating !== undefined && norm(b.authors[0] ?? '') === norm(c.author))
      .sort((a, b) => b.rating! - a.rating!)[0];
    if (best && best.rating! >= 4 && best.id !== c.previous?.id)
      reasons.push({ weight: 3, text: `You gave ${best.title} by ${c.author} ${fmt(best.rating!)}★.` });
    if (best && best.rating! <= 2.5) reasons.push({ weight: 1, text: `Heads up: you weren't a fan of ${best.title}.` });
  }

  // favourite authors (from her profile) and authors she keeps reading, rated or not
  const an = norm(c.author);
  const readByAuthor = taste.habitAuthor.get(an) ?? 0;
  if (taste.favouriteAuthors.has(an)) {
    score += 9;
    if (aw === undefined) reasons.push({ weight: 3.5, text: `${c.author} is one of your favourite authors.` });
  } else if (readByAuthor && aw === undefined) {
    score += Math.min(10, 4 + readByAuthor * 2);
    reasons.push({
      weight: 3,
      text: `You've read ${readByAuthor > 1 ? `${readByAuthor} books` : 'a book'} by ${c.author}${readByAuthor > 2 ? ' already: clearly a favourite' : ''}.`,
    });
  }

  // genres she reads a lot (counts books she didn't rate too)
  const habit = c.genres.map((g) => ({ g, share: taste.habitGenre.get(g) ?? 0 })).sort((a, b) => b.share - a.share)[0];
  if (habit && habit.share > 0) score += Math.round(Math.min(1, habit.share) * 12);
  else if (c.genres.length && taste.habitGenre.size >= 3) score -= 5; // not what she usually reads

  // things she loves / dislikes (from her reviews, tags and quiz)
  const hits = c.traits
    .filter((t) => taste.liked.has(t))
    .sort((a, b) => taste.liked.get(b)!.weight - taste.liked.get(a)!.weight);
  const misses = c.traits.filter((t) => taste.disliked.has(t));
  score += Math.min(3, hits.length) * 6 - misses.length * 9;
  if (hits.length) {
    const ev = taste.liked.get(hits[0])!.from;
    // only quote what she really wrote in that review
    const said = ev?.review ? hits.filter((t) => TRAITS[t].test(ev.review!)).slice(0, 2) : [];
    const ratedTxt = ev?.rating !== undefined ? ` (${fmt(ev.rating)}★)` : '';
    reasons.push({
      weight: 4,
      text: said.length
        ? `You loved the ${said.map(nice).join(' and ')} in ${ev.title}${ratedTxt}, and this one has ${said.length > 1 ? 'both' : 'that too'}.`
        : ev && ev.rating !== undefined && ev.rating >= 4
          ? `It has the ${hits.slice(0, 2).map(nice).join(' and ')} you enjoyed in ${ev.title}${ratedTxt}.`
          : `It brings the ${hits.slice(0, 2).map(nice).join(' and ')} you love.`,
    });
  }
  if (misses.length) {
    const ev = taste.disliked.get(misses[0])?.from;
    reasons.push({
      weight: 2,
      text: `Heads up: it has a ${nice(misses[0])}${ev ? `, and that's what bugged you in ${ev.title}` : ', which you said isn’t your thing'}.`,
    });
  }

  // mood and spice
  if (wish.mood && c.moods?.includes(wish.mood)) score += 6;
  if (c.spice !== undefined && taste.spice !== undefined) score -= Math.max(0, Math.abs(c.spice - taste.spice) - 1) * 5;

  // genre fit sentence
  if (wish.genre && c.genres.includes(wish.genre))
    reasons.push({ weight: 1.5, text: `A real ${wish.genre.toLowerCase()} pick.` });
  // dark books are a gamble unless she has shown she likes them
  if (c.traits.includes('dark') && !taste.liked.has('dark') && !taste.disliked.has('dark')) score -= 8;

  // what her ratings say about this genre, with a book of hers as proof
  const rated = books.filter((b) => b.status === 'read' && b.rating !== undefined);
  const byGenre = c.genres
    .map((g) => ({ g, w: taste.genre.get(g) }))
    .filter((x): x is { g: string; w: number } => x.w !== undefined)
    .sort((a, b) => Math.abs(b.w) - Math.abs(a.w))[0];
  if (byGenre) {
    const inGenre = rated.filter((b) => b.genres.includes(byGenre.g)).sort((a, b) => b.rating! - a.rating!);
    const best = inGenre[0];
    const worst = inGenre[inGenre.length - 1];
    if (byGenre.w >= 0.25 && best)
      reasons.push({
        weight: 2.5,
        text: `You rate ${genreWord(byGenre.g)} highly, like ${best.title} (${fmt(best.rating!)}★).`,
      });
    else if (byGenre.w <= -0.5 && worst)
      reasons.push({
        weight: 2.5,
        text: `A long shot: you haven't loved ${genreWord(byGenre.g)} so far (${worst.title} got ${fmt(worst.rating!)}★).`,
      });
  } else if (habit && habit.share >= 0.2) {
    const example = books
      .filter((b) => (b.status === 'read' || b.status === 'reading') && b.genres.includes(habit.g))
      // a book that's mainly this genre, best rated first
      .sort(
        (a, b) =>
          a.genres.indexOf(habit.g) - b.genres.indexOf(habit.g) ||
          (b.rating ?? 0) - (a.rating ?? 0) ||
          a.genres.length - b.genres.length,
      )[0];
    reasons.push({
      weight: 2,
      text: `You read a lot of ${genreWord(habit.g)}${example ? `, like ${example.title}` : ''}.`,
    });
  } else if (!reasons.length && c.genres.length) {
    reasons.push({
      weight: 1,
      text: taste.habitGenre.size
        ? `Something different: you rarely read ${genreWord(c.genres[0])}.`
        : `A popular ${genreWord(c.genres[0]).replace(/s$/, '')} pick to start with.`,
    });
  }

  const why = reasons
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((r) => r.text)
    .join(' ');
  return { score: Math.round(Math.max(35, Math.min(97, score))), why };
}

/** Traits of a book in her library (from its description, genres and tags) */
export function bookTraits(b: Book): string[] {
  return traitsIn(`${b.description ?? ''} ${b.genres.join(' ')} ${b.tags.join(' ')}`);
}
