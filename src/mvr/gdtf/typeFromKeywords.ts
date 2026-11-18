import type { FixtureTypeId } from '../../domain/FixtureType';

/**
 * Name words and the desk type each one suggests, in precedence order. Body words (strobe, blinder, par, the bar
 * family) come first: they name the housing the desk draws, while beam, wash and spot also describe the light of a
 * static unit ("Wash Par", "Beam Bar"). `dot` and `pixel` describe the light source, not the housing, so they come
 * after the moving-head words: a "Pixel Wash" is a wash, and only a name with no other word ("Glow Dot") draws as a
 * bar. The desk has no moving hybrid head, so it becomes `spot`, the generic moving head; `profile` names the static
 * ellipsoidal, which `classifyFixture` turns into `spot` when the channels pan.
 */
const KEYWORD_TYPES: readonly (readonly [keyword: string, type: FixtureTypeId])[] = [
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
  ['dot', 'bar'],
  ['pixel', 'bar'],
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
  const words = wordsOf(name.slice(name.indexOf('@') + 1));
  return KEYWORD_TYPES.find(([keyword]) => words.has(keyword))?.[1];
}
