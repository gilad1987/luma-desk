import type { FixtureTypeId } from '../../domain/FixtureType';

/**
 * Name words and the desk type each one suggests, in precedence order. Body words (strobe, blinder, par, the bar
 * family) come first: they name the housing the desk draws, while beam, wash and spot also describe the light of a
 * static unit ("Wash Par", "Beam Bar"). The desk has no moving profile or hybrid head, so both become `spot`, the
 * generic moving head.
 */
const KEYWORD_TYPES: readonly (readonly [keyword: string, type: FixtureTypeId])[] = [
  ['strobe', 'strobe'],
  ['blinder', 'blinder'],
  ['par', 'par'],
  ['bar', 'bar'],
  ['batten', 'bar'],
  ['dot', 'bar'],
  ['pixel', 'bar'],
  ['line', 'bar'],
  ['beam', 'beam'],
  ['wash', 'wash'],
  ['spot', 'spot'],
  ['profile', 'spot'],
  ['hybrid', 'spot'],
];

/**
 * The lower-case words of `name`. Writers join words with spaces, `@`, `_`, digits or camel case (`LEDBeam`,
 * `SixBar`), so each of those splits; a word is never matched inside a longer one ("par" in "sparkle").
 */
function wordsOf(name: string): ReadonlySet<string> {
  const spaced = name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
  return new Set(spaced.toLowerCase().split(/[^a-z]+/));
}

/**
 * The desk type a GDTF name suggests by its words, or `undefined` when no keyword is in it. A fixture whose GDTF file
 * is missing then still looks like the product: a "Wash" head draws as a wash, not as a par.
 */
export function typeFromKeywords(name: string): FixtureTypeId | undefined {
  const words = wordsOf(name);
  return KEYWORD_TYPES.find(([keyword]) => words.has(keyword))?.[1];
}
