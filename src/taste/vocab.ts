/**
 * The fixed vocabulary every book is analysed with (once, by Claude), so books can be compared
 * exactly and her taste can be computed from them for free. Shared by the app and the server.
 *
 * Bump PROFILE_VERSION when the vocabulary changes in a way that needs books re-analysed.
 */
export const PROFILE_VERSION = 1;

/** 0–5 scales, with what the ends mean (also shown to Claude when analysing) */
export const SCALES = {
  romance: 'How central the romance is: 0 none · 1 a hint · 3 a major subplot · 5 the romance is the plot',
  spice:
    'Heat: 0 none/closed door · 1 kissing · 2 fade to black · 3 a few open-door scenes · 4 several explicit scenes · 5 very explicit and frequent',
  romancePace:
    'How slowly the couple gets together: 0 instant attraction/insta-love · 3 steady · 5 very slow burn (only if there is a romance; else 0)',
  angst: 'Relationship drama, pining, misunderstandings, heartbreak between the leads: 0 none · 5 a lot',
  banter: 'Witty back-and-forth between characters (especially the leads): 0 none · 5 constant',
  humour: 'How funny the book is overall: 0 serious · 5 laugh-out-loud',
  darkness: 'Emotional/thematic darkness (abuse, trauma, bleakness, cruelty): 0 cosy · 5 very dark',
  violence: 'Graphic violence and gore: 0 none · 5 brutal and frequent',
  emotional: 'Emotional intensity, how likely to make you cry: 0 light · 5 devastating',
  tension: 'Suspense and stakes, how much you need to know what happens: 0 relaxed · 5 edge-of-your-seat',
  twists: 'Plot twists and reveals: 0 none · 5 twist-driven',
  mystery: 'Investigation / whodunit element: 0 none · 5 the core of the book',
  action: 'Fights, battles, chases, trials: 0 none · 5 non-stop',
  intrigue: 'Political scheming, court politics, power games: 0 none · 5 central',
  worldbuilding:
    'Invented world, lore and magic systems: 0 real world · 2 light magic in our world · 5 dense, complex world',
  plotPace: 'Pace of the plot once it gets going: 0 quiet, slow and reflective · 5 relentless',
  slowStart: 'How slow the opening is: 0 hooks from page one · 3 first part takes its time · 5 the first third drags',
  complexity: 'How demanding: many POVs, dense prose, many names, layered plot: 0 easy breezy · 5 very demanding',
  characterFocus: 'Character-driven (inner life, relationships) vs plot-driven: 0 all plot · 5 all character',
} as const;
export type ScaleId = keyof typeof SCALES;
export const SCALE_IDS = Object.keys(SCALES) as ScaleId[];

/** Tag lists: Claude picks from these exact values */
export const TAGS = {
  genre: [
    'romantasy',
    'high fantasy',
    'urban fantasy',
    'paranormal romance',
    'dark romance',
    'contemporary romance',
    'romantic comedy',
    'sports romance',
    'historical romance',
    'romantic suspense',
    'psychological thriller',
    'domestic thriller',
    'crime / detective',
    'cosy mystery',
    'horror',
    'literary fiction',
    "women's fiction",
    'historical fiction',
    'science fiction',
    'dystopian',
    'young adult',
    'new adult',
    'magical realism',
  ],
  setting: [
    'fae realm',
    'magic school / academy',
    'war college / military',
    'royal court / palace',
    'battlefield / at war',
    'small town',
    'big city',
    'college / university',
    'high school',
    'workplace / office',
    'sports world',
    'high society / wealthy',
    'historical (19th century or earlier)',
    'historical (20th century)',
    'space',
    'post-apocalyptic',
    'dark academia',
    'remote island / wilderness',
    'suburbia',
    'road trip / journey',
    'underworld / afterlife',
    'sea / ships',
    'Hollywood / showbiz',
    'Scandinavia / Europe',
    'Netherlands / Belgium',
  ],
  trope: [
    'enemies to lovers',
    'rivals to lovers',
    'friends to lovers',
    'second chance',
    'forced proximity',
    'only one bed',
    'fake dating',
    'marriage of convenience / arranged marriage',
    'fated mates',
    'forbidden love',
    'love triangle',
    'grumpy x sunshine',
    'he falls first',
    'touch her and die',
    'age gap',
    'boss / employee',
    'bodyguard',
    'brother’s best friend',
    'single parent',
    'slow burn',
    'insta-love',
    'secret identity',
    'hidden powers',
    'chosen one',
    'trials / deadly competition',
    'heist',
    'quest',
    'revenge plot',
    'captive / kidnapped',
    'bargain / deal',
    'morally grey choices',
    'redemption arc',
    'found family',
    'secret society',
    'unreliable narrator',
    'dual timeline',
    'locked room / closed circle',
    'missing person',
    'serial killer',
    'stalker',
    'small-town secrets',
    'family saga',
    'coming of age',
    'amnesia',
    'time travel',
    'body swap / magic twist',
    'workplace romance',
    'celebrity romance',
    'holiday romance',
    'reverse harem / why choose',
    'villain gets the girl',
    'betrayal',
  ],
  hero: [
    'morally grey',
    'alpha protector',
    'cinnamon roll / soft',
    'broody / tortured',
    'cocky / charming',
    'villain',
    'reformed bad boy',
    'grumpy',
    'nerdy / academic',
    'powerful immortal',
    'warrior / soldier',
    'royal / heir',
    'billionaire / rich',
    'athlete',
    'possessive',
    'no clear male lead',
  ],
  heroine: [
    'fierce fighter',
    'underestimated underdog',
    'sunshine',
    'prickly / sharp-tongued',
    'smart / career-driven',
    'reluctant chosen one',
    'morally grey',
    'shy / bookish',
    'reckless / impulsive',
    'healer / caregiver',
    'survivor of trauma',
    'grieving',
    'ordinary woman',
    'no clear female lead',
  ],
  creature: [
    'dragons',
    'fae',
    'vampires',
    'shifters / wolves',
    'witches',
    'gods',
    'demons',
    'angels',
    'monsters',
    'merfolk',
    'ghosts',
    'none',
  ],
  theme: [
    'grief',
    'trauma and healing',
    'found family',
    'power and corruption',
    'war and its cost',
    'revenge',
    'sacrifice',
    'identity / self-discovery',
    'freedom',
    'family secrets',
    'friendship',
    'motherhood / parenthood',
    'mental health',
    'class and money',
    'betrayal',
    'redemption',
    'survival',
    'second chances',
    'self-worth',
    'fame',
    'obsession',
    'justice',
    'faith',
    'love versus duty',
  ],
  pov: [
    'first person, one narrator',
    'first person, two narrators',
    'third person, one narrator',
    'multiple narrators',
  ],
  ending: [
    'happily ever after',
    'happy for now',
    'bittersweet',
    'tragic',
    'cliffhanger',
    'open ending',
    'twist ending',
  ],
  seriesRole: ['standalone', 'series opener', 'middle of a series', 'series finale', 'companion / spin-off'],
  audience: ['adult', 'new adult', 'young adult'],
  warning: [
    'sexual assault',
    'dubious consent',
    'abuse',
    'domestic violence',
    'self-harm',
    'suicide',
    'child death',
    'animal death',
    'torture',
    'gore',
    'drug or alcohol abuse',
    'infidelity / cheating',
    'stalking',
    'kidnapping',
    'pregnancy loss',
    'terminal illness',
    'war violence',
    'captivity',
    'death of a loved one',
  ],
} as const;
export type TagGroup = keyof typeof TAGS;
export const TAG_GROUPS = Object.keys(TAGS) as TagGroup[];

/** A feature is a tag ("trope:slow burn") or a scale ("scale:banter") */
export type FeatureId = `${TagGroup}:${string}` | `scale:${ScaleId}`;

/** What Claude wrote down about one book (stored once, reused forever) */
export interface BookProfile {
  version: number;
  title: string;
  author: string;
  scales: Record<ScaleId, number>;
  tags: Partial<Record<TagGroup, string[]>>;
  pages?: number;
  /** Books readers often compare it to ("for fans of …") */
  comps: string[];
  /** A few words on the feel of the book, for explanations (no plot) */
  vibe: string[];
  /** How well Claude knows this book: from real knowledge, or only from the blurb */
  confidence: 'knows it well' | 'knows it somewhat' | 'blurb only';
  series?: { name: string; number?: number };
}

/** What her review (plus rating) says she liked and disliked, in the same vocabulary */
export interface ReviewInsight {
  /** Which review and rating this was made from (it's redone when either changes) */
  hash: string;
  /** One sentence: what made her rate it like this */
  summary: string;
  /** `wantedMore`: she missed it in this book ("not enough romance"), rather than enjoyed it */
  likes: { feature: FeatureId; strength: 1 | 2 | 3; quote: string; wantedMore?: boolean }[];
  dislikes: { feature: FeatureId; strength: 1 | 2 | 3; quote: string }[];
}

/** The quiz uses its own words for tropes: how they map onto the vocabulary */
export const QUIZ_TROPE_FEATURES: Record<string, FeatureId[]> = {
  'Enemies to lovers': ['trope:enemies to lovers', 'trope:rivals to lovers'],
  'Friends to lovers': ['trope:friends to lovers'],
  'Slow burn': ['trope:slow burn', 'scale:romancePace'],
  'Grumpy x sunshine': ['trope:grumpy x sunshine'],
  'Forced proximity': ['trope:forced proximity'],
  'Fake dating': ['trope:fake dating'],
  'Second chance': ['trope:second chance'],
  'Found family': ['trope:found family', 'theme:found family'],
  'Morally grey hero': ['hero:morally grey'],
  'He falls first': ['trope:he falls first'],
  'Touch her and die': ['trope:touch her and die', 'hero:possessive'],
  'Only one bed': ['trope:only one bed'],
  'Small town': ['setting:small town'],
  'Forbidden love': ['trope:forbidden love'],
  'Chosen one': ['trope:chosen one', 'heroine:reluctant chosen one'],
  'Fae & faerie courts': ['creature:fae', 'setting:fae realm'],
  Dragons: ['creature:dragons'],
  'Magic academy': ['setting:magic school / academy'],
  'Unreliable narrator': ['trope:unreliable narrator'],
  'Plot twists': ['scale:twists'],
  'Love triangle': ['trope:love triangle'],
  Cliffhangers: ['ending:cliffhanger'],
  'Dark romance': ['genre:dark romance'],
  'Insta-love': ['trope:insta-love'],
  Miscommunication: ['scale:angst'],
  'Sports romance': ['genre:sports romance', 'setting:sports world'],
  Royalty: ['setting:royal court / palace', 'hero:royal / heir'],
  'Villain gets the girl': ['trope:villain gets the girl', 'hero:villain'],
};

export const tagFeatures = (p: BookProfile): FeatureId[] =>
  TAG_GROUPS.flatMap((g) => (p.tags[g] ?? []).filter((t) => t !== 'none').map((t) => `${g}:${t}` as FeatureId));

export const profileKey = (title: string, author: string) =>
  `${title
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]/g, '')}|${(author.toLowerCase().match(/[a-z]+/g) ?? []).pop() ?? ''}`;
