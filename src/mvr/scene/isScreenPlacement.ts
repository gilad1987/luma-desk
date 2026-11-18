import { mvrNameWords } from '../../i18n/he/mvrNameWords';
import type { MeshPlacement } from './MvrScene';
import { nameWords } from './nameWords';

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
  ...mvrNameWords.screen,
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

/** Element tags that are steel by what they are, whatever their name or layer says. */
const STEEL_KINDS: ReadonlySet<string> = new Set(['Truss', 'Support']);

/** The names the rule reads: the element tag, the object, its innermost Symdef and its layer. */
export type ScreenNames = Pick<MeshPlacement, 'kind' | 'name' | 'layerName' | 'symdef'>;

/** Whether a name says LED surface: a screen word, and no word for a part that holds the screen. */
function namesScreen(name: string): boolean {
  const words = nameWords(name);
  return words.some((word) => SCREEN_WORDS.has(word)) && !words.some((word) => PART_WORDS.has(word));
}

/** Whether a name says the part holds or frames a screen. */
function namesPart(name: string): boolean {
  return nameWords(name).some((word) => PART_WORDS.has(word));
}

/**
 * Whether a placement draws as an emissive LED screen rather than as scenery. MVR has a `<VideoScreen>` element, but
 * writers often export an LED wall as a plain `SceneObject` and say what it is only in its own name, its Symdef's
 * name or its layer's name, so a screen word in any of them counts too. The object itself has the last word: a truss
 * or support, or an object or Symdef named as a part that holds or frames a screen, stays steel even on an LED layer.
 */
export function isScreenPlacement(placement: ScreenNames): boolean {
  if (placement.kind === 'VideoScreen') return true;
  const { name, symdef = '', layerName } = placement;
  if (STEEL_KINDS.has(placement.kind) || namesPart(name) || namesPart(symdef)) return false;
  return [name, symdef, layerName].some(namesScreen);
}
