import { Vector3 } from 'three';
import { DECK, TOWERS } from '../venue';
import type { RigBuilder } from './RigBuilder';

/**
 * The standing light towers on the deck: a beam on top with a vertical pixel strip (1601..) and a wash halfway up
 * (1701..). Beam and wash of one tower share the last two id digits.
 */
export function addTowers(rig: RigBuilder): void {
  TOWERS.forEach(([x, z, H], i) => {
    const beam = rig.add({ id: 1601 + i, type: 'beam', at: [x, DECK + H + 0.55, z], mount: 'floor' });
    beam.pix = { p: new Vector3(x, DECK + H / 2, z + 0.28), tan: new Vector3(0, 1, 0), len: H * 0.96 };
    rig.add({ id: 1701 + i, type: 'wash', at: [x, DECK + H * 0.55, z + 0.62], mount: 'floor' });
  });
}
