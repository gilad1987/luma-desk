import { Vector3 } from 'three';
import { aimAt } from '../aim';
import { TYPES } from '../fixtureTypes';
import { DECK } from '../venue';
import type { RigBuilder } from './RigBuilder';

/**
 * The static profiles on the side ladders, between the washes; each left unit has a mirror unit on the right. Each is
 * aimed at a point on the deck from where it hangs, and that aim is its rigged pan/tilt.
 */
export function addProfiles(rig: RigBuilder): void {
  let id = 2201;
  for (const sx of [-1, 1])
    for (const z of [-3, -9, -15])
      for (const y of [7.25, 11.75]) {
        const x = sx * 23.6;
        const aim = aimAt({ pos: new Vector3(x, y, z), mount: 'hang', T: TYPES.profile }, sx * 8, DECK + 1.5, z);
        rig.add(id++, 'profile', x, y, z, 'hang', aim);
      }
}
