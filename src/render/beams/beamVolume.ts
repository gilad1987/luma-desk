import type { BeamBatch } from './BeamBatch';

/**
 * The scene layer of a beam cone that the volume draws instead. The render camera sees only layer 0, so the cone
 * leaves the scene pass but keeps its `visible` flag, which the fixture sync owns.
 */
export const VOLUME_LAYER = 1;

/**
 * Where the fixture sync finds the volumetric beam pass. `batch` exists only while the pass of an MVR stage
 * exists; a built-in stage never has one, so its beams stay the cone meshes and its frames do not change.
 */
export const beamVolume: { batch: BeamBatch | undefined } = { batch: undefined };
