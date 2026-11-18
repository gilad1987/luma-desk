import type { MeshPlacement } from './MvrScene';

/** Words that name an LED surface in any case: `Side Screen`, `video wall`, `Display 2`. */
const SCREEN_WORDS = /screen|video|display/i;

/**
 * `LED` in capitals anywhere (`LED-Wand`, `LEDWall`) or `led` as a whole word (`led panel`). Not `led` inside a word,
 * so `Angled deck` and `Scaffolded tower` stay scenery.
 */
const LED_WORD = /LED|\b[Ll]ed\b/;

/**
 * Whether a placement draws as an emissive LED screen rather than as scenery. MVR has a `<VideoScreen>` element, but
 * writers often export an LED wall as a plain `SceneObject` and say what it is only in its name, so both count.
 */
export function isScreenPlacement(placement: Pick<MeshPlacement, 'kind' | 'name'>): boolean {
  if (placement.kind === 'VideoScreen') return true;
  return SCREEN_WORDS.test(placement.name) || LED_WORD.test(placement.name);
}
