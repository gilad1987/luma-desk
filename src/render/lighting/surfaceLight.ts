import type { LightBatch } from './LightBatch';

/** The state the fixture sync and the scene lights share with the surface light pass. */
export interface SurfaceLightState {
  batch: LightBatch | undefined;
  isEnabled: boolean;
  isAwaited: () => boolean;
  /** The scale of the floor pools and their stand-in lights: 1, or `mvrPoolGain` while the hall light is on. */
  poolGain: number;
}

/**
 * Where the fixture sync and the scene lights find the surface light of an MVR stage. `batch` exists while the
 * pass of the chain in use draws: every lit fixture then lights the scenery in the post chain, so the fixture sync
 * hides the floor decals, offers its beams here, and the scene lights that stand in for that light stay dark. A
 * built-in stage never has it, so its frames do not change. `isEnabled` is the Real light button.
 *
 * `isAwaited` is true for an MVR stage whose surface light draws or is still on its way (the scenery loads, the lazy
 * post chain loads): the decals stay off from the first frame, because the surface light replaces them, and a decal
 * drawn for a few frames would flash and upload a texture no later frame uses. The app wiring sets it, as render
 * does not know the stage kind. It is false for a built-in stage and for an MVR stage that gets no surface light (no
 * scenery, a post chain that did not load): there the decals are the only light on the floor.
 */
export const surfaceLight: SurfaceLightState = {
  batch: undefined,
  isEnabled: true,
  isAwaited: () => false,
  poolGain: 1,
};

/**
 * Whether the floor decals give way to the surface light: it draws, or it is on its way and Real light is on. With
 * Real light off the pass gives its batch back, so an MVR stage keeps the cheap light of the built-in stages: the
 * decals and the stand-in scene lights. A decal that returns uploads its gobo texture then, and only then.
 */
export function replacesPools(): boolean {
  return surfaceLight.batch !== undefined || (surfaceLight.isEnabled && surfaceLight.isAwaited());
}
