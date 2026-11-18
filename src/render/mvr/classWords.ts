import { mvrClassWords as he } from '../../i18n/he/mvrClassWords';
import type { SceneryClass } from './materialClass';

/**
 * Words that name a kind of scenery in object and layer names, in English and Hebrew (`mvrClassWords`), checked in
 * this order: the first class with a matching word wins. Narrow kinds come before broad ones, so "speaker scaffold" is
 * a speaker and "stage truss" is a truss, not a deck.
 */
const WORDS: readonly (readonly [SceneryClass, readonly string[]])[] = [
  ['figure', ['band', 'people', 'person', 'figure', 'mannequin', 'human', 'musician', ...he.figure]],
  ['speaker', ['speaker', 'loudspeaker', 'subwoofer', 'pa', ...he.speaker]],
  ['truss', ['truss', 'roof', ...he.truss]],
  ['scaffold', ['scaffold', 'layher', 'tower', ...he.scaffold]],
  ['cloth', ['drape', 'curtain', 'soft goods', 'softgoods', 'masking', 'cloth', ...he.cloth]],
  ['wall', ['wall', ...he.wall]],
  ['deck', ['deck', 'stage', 'floor', 'riser', 'stairs', 'steps', 'platform', ...he.deck]],
];

/**
 * Whether `word` appears in `text` as a word: an exact token, a token with a Hebrew prefix, or, for words of four
 * letters or more, inside a token ("trusses", "backstage"). Short words must stand alone, so "pa" never matches
 * "panel" and the Hebrew "cloth" never matches inside "work".
 */
function matches(tokens: readonly string[], text: string, word: string): boolean {
  if (word.includes(' ')) return text.includes(word);
  return tokens.some(
    (token) =>
      token === word ||
      (he.prefixes.includes(token.charAt(0)) && token.slice(1) === word) ||
      (word.length >= 4 && token.includes(word)),
  );
}

/** The class the words of `text` name, if any. */
export function wordClass(text: string): SceneryClass | undefined {
  const lower = text.toLowerCase();
  const tokens = lower.split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 0);
  if (tokens.length === 0) return undefined;
  return WORDS.find(([, words]) => words.some((word) => matches(tokens, lower, word)))?.[0];
}
