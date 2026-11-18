import { describe, expect, it } from 'vitest';
import type { LayerBox } from '../../../src/mvr/design/layerBoxes.ts';
import { stageBox } from '../../../src/mvr/design/stageBox.ts';
import type { Aabb } from '../../../src/mvr/math/Aabb.ts';

const box = (min: Aabb['min'], max: Aabb['max']): Aabb => ({ min, max });
const DECK: LayerBox = { layer: 'deck', name: 'Deck', box: box([-16, 0, -8], [16, 1.5, 8]), rig: false };
const HALL: LayerBox = { layer: 'hall', name: 'Walls', box: box([-17, 0, -20], [17, 10, 10]), rig: false };
const RIG = [
  [-15, 7, -6],
  [15, 7, 6],
] as const;
/** A front-of-house pair 16 m in front of the deck, as plots often place it. */
const FOH = [
  [-5, 5, 24],
  [5, 5, 24],
] as const;

describe('stageBox', () => {
  it('holds the shown layers and the rig, and leaves out hall layers and far FOH fixtures', () => {
    expect(stageBox([DECK, HALL], [...RIG, ...FOH], ['hall'])).toEqual(box([-16, 0, -8], [16, 7, 8]));
  });

  it('keeps a fixture up to 8 m outside the meshes', () => {
    expect(stageBox([DECK], [[0, 6, 15.5]], []).max).toEqual([16, 6, 15.5]);
    expect(stageBox([DECK], [[0, 6, 16.5]], []).max).toEqual([16, 1.5, 8]);
  });

  it('leaves out a layer the user hid, and holds every fixture when no mesh is shown', () => {
    expect(stageBox([DECK], [...RIG, ...FOH], ['deck'])).toEqual(box([-15, 5, -6], [15, 7, 24]));
  });
});
