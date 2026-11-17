import { TYPES } from '../fixtureTypes';
import { DECK, STAGE } from '../venue';
import type { RigBuilder } from './RigBuilder';

/** The moving LED bars as footlights along the downstage edge; their tilt axis is 0.25 bar sizes above the deck. */
export function addFootlights(rig: RigBuilder): void {
  rig.row(2101, 12, 'bar', -17, 17, DECK + 0.25 * (TYPES.bar.size ?? 0), STAGE.z1 - 0.3, 'floor');
}
