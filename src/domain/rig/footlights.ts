import { TYPES } from '../fixtureTypes';
import { DECK, STAGE } from '../venue';
import type { RigBuilder } from './RigBuilder';

/** The moving LED bars as footlights along the downstage edge; their tilt axis is 0.25 bar sizes above the deck. */
export function addFootlights(rig: RigBuilder): void {
  const y = DECK + 0.25 * TYPES.bar.size;
  rig.row({ firstId: 2101, count: 12, type: 'bar', x: [-17, 17], y, z: STAGE.z1 - 0.3, mount: 'floor' });
}
