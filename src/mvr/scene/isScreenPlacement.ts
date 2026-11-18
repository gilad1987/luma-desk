import type { MeshPlacement } from './MvrScene';

/** Words, in lower case, that name an LED surface: `LED Panel`, `Video Screen`, `LED-Wand`, `Videowand`, `Display`. */
const SCREEN_WORDS: ReadonlySet<string> = new Set([
  'screen',
  'display',
  'video',
  'videowall',
  'videowand',
  'led',
  'ledwall',
  'ledwand',
]);

/**
 * Words, in lower case, that name a part which holds or frames a screen and is drawn as steel, not as LED light:
 * `Screen frame`, `LED truss`, `Video wall bumper`.
 */
const PART_WORDS: ReadonlySet<string> = new Set([
  'frame',
  'rahmen',
  'truss',
  'traverse',
  'bumper',
  'support',
  'stand',
  'mount',
  'bracket',
  'rigging',
  'structure',
  'cable',
]);

/**
 * A name's words in lower case. Words break at anything but letters and digits and where an upper-case run meets a
 * capitalised word (`LEDWall` is `led`, `wall`), so letters inside a word (`Angled`) never form a word of their own.
 */
function wordsOf(name: string): string[] {
  return (name.match(/\p{Lu}+(?!\p{Ll})|\p{Lu}?\p{Ll}+|\d+/gu) ?? []).map((word) => word.toLowerCase());
}

/**
 * Whether a placement draws as an emissive LED screen rather than as scenery. MVR has a `<VideoScreen>` element, but
 * writers often export an LED wall as a plain `SceneObject` and say what it is only in its name, so a name with a
 * screen word counts too, unless another word says it is a part that holds or frames the screen.
 */
export function isScreenPlacement(placement: Pick<MeshPlacement, 'kind' | 'name'>): boolean {
  if (placement.kind === 'VideoScreen') return true;
  const words = wordsOf(placement.name);
  return words.some((word) => SCREEN_WORDS.has(word)) && !words.some((word) => PART_WORDS.has(word));
}
