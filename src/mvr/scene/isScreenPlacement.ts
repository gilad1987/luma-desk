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

/** What the rule reads: the element tag, the three names, and the two facts the import adds (`withScreenEvidence`). */
export type ScreenNames = Pick<MeshPlacement, 'kind' | 'name' | 'layerName' | 'symdef' | 'display' | 'panel'>;

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
 * Whether a placement draws as an LED surface rather than as scenery. The file's data decides, strongest first:
 * 1. An MVR `<VideoScreen>` element is a screen: the file says so.
 * 2. A truss or support is steel, whatever its name or layer says.
 * 3. An object whose GDTF holds a `Display` geometry is a screen (`display`).
 * 4. A screen word in the object, Symdef or layer name counts only for a standing panel (`panel`), and never for an
 *    object or Symdef named as a part that holds a screen (frame, bumper).
 *
 * Why a word alone is not enough: plots put the deck, the stairs and the backdrop solids of a video set on the layer
 * named after the LED wall, and a layer name says where an object is filed, not what it is.
 *
 * What the rule cannot decide, and so draws as scenery: an LED wall exported as a plain object with no screen word
 * anywhere; a curved LED wall and an LED floor that only a name word marks, because their boxes are those of a
 * backdrop solid and of a deck. What it wrongly takes as a screen: a thin standing flat (a fascia, a banner) that
 * only shares a layer with the LED wall. Without the two import facts (a placement straight from the scene walk)
 * only rules 1 and 2 apply.
 */
export function isScreenPlacement(placement: ScreenNames): boolean {
  if (placement.kind === 'VideoScreen') return true;
  if (STEEL_KINDS.has(placement.kind)) return false;
  if (placement.display === true) return true;
  const { name, symdef = '', layerName } = placement;
  if (placement.panel !== true || namesPart(name) || namesPart(symdef)) return false;
  return [name, symdef, layerName].some(namesScreen);
}
