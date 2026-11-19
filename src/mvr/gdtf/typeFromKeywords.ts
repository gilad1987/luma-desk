import type { FixtureTypeId } from '../../domain/FixtureType';
import { PRODUCT_TYPES, stripRevision } from './productTypes';

/**
 * Words for a thing that is no light; they come first, because no light has one of them as its product word. Audio
 * and rigging words of two words ("K2 Line Array", "Monitor Wedge") must come before `line`, which is a bar word.
 */
const DEVICE_WORDS = [
  'hoist',
  'motor',
  'winch',
  'speaker',
  'line array',
  'subwoofer',
  'sub bass',
  'monitor wedge',
  'hazer',
  'fog',
  'fan',
] as const;

/**
 * Name words and the desk type each one suggests, in precedence order. Body words (strobe, blinder, par, the bar
 * family) come first: they name the housing the desk draws, while beam, wash and spot also describe the light of a
 * static unit ("Wash Par", "Beam Bar"). `dot` and `pixel` describe the light source, not the housing, so they come
 * after the moving-head words: a "Pixel Wash" is a wash, and only a name with no other word ("Glow Dot") draws as a
 * bar. The desk has no moving hybrid head, so it becomes `spot`, the generic moving head; `profile` names the static
 * ellipsoidal, which `classifyFixture` turns into `spot` when the channels pan. Product names (`PRODUCT_TYPES`) come
 * after the light words, so a "Viper Wash" is a wash, and before `profile`, so a "Viper Profile" is a moving spot.
 */
const KEYWORD_TYPES: readonly (readonly [keyword: string, type: FixtureTypeId])[] = [
  ...DEVICE_WORDS.map((word) => [word, 'device'] as const),
  ['strobe', 'strobe'],
  ['blinder', 'blinder'],
  ['par', 'par'],
  ['bar', 'bar'],
  ['batten', 'bar'],
  ['line', 'bar'],
  ['beam', 'beam'],
  ['wash', 'wash'],
  ['follow', 'follow'],
  ['spot', 'spot'],
  // a single-cell strobe and blinder whose name holds `dot`, which would make it a bar
  ['atomic dot', 'strobe'],
  ['dot', 'bar'],
  ['pixel', 'bar'],
  ...PRODUCT_TYPES,
  ['hybrid', 'spot'],
  ['profile', 'profile'],
];

const KEYWORDS: ReadonlySet<string> = new Set(KEYWORD_TYPES.map(([keyword]) => keyword));

/** The words that may start a joined pair: every keyword, and `led`, which writers prefix to a body ("LEDBAR"). */
const HEADS: ReadonlySet<string> = new Set([...KEYWORDS, 'led']);

/** The two known words `word` is made of ("pixelline" -> pixel, line), or none; nothing else is ever split. */
function halvesOf(word: string): readonly string[] {
  for (let cut = 1; cut < word.length; cut += 1) {
    const head = word.slice(0, cut);
    const tail = word.slice(cut);
    if (HEADS.has(head) && KEYWORDS.has(tail)) return [head, tail];
  }
  return [];
}

/**
 * The lower-case words of `name`. Writers join words with spaces, `@`, `_`, digits or camel case (`LEDBeam`,
 * `SixBar`), so each of those splits. All-caps writers join words with nothing ("LEDBAR"), so a word made of two
 * known words counts as both; a word is never matched inside a longer one ("par" in "sparkle").
 */
function wordsOf(name: string): ReadonlySet<string> {
  const spaced = name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
  const words = spaced.toLowerCase().split(/[^a-z]+/);
  return new Set([...words, ...words.flatMap(halvesOf)]);
}

/**
 * The desk type a GDTF name suggests by its words, or `undefined` when no keyword is in it. A fixture whose GDTF file
 * is missing then still looks like the product: a "Wash" head draws as a wash, not as a par. In a
 * `Manufacturer@Product` name only the product counts, as a maker such as "Pixel Range" says nothing of the fixture.
 */
export function typeFromKeywords(name: string): FixtureTypeId | undefined {
  const product = stripRevision(name);
  const words = wordsOf(product.slice(product.indexOf('@') + 1));
  return KEYWORD_TYPES.find(([keyword]) => keyword.split(' ').every((word) => words.has(word)))?.[1];
}
