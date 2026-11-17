import { aimAt } from '../aim';
import { DECK } from '../venue';
import type { RigBuilder } from './RigBuilder';

/**
 * The static profiles on the side ladders, between the washes; each left unit has a mirror unit on the right. Each is
 * aimed at a point on the deck as it is created and keeps that aim as its rigged pan/tilt.
 */
export function addProfiles(rig: RigBuilder): void {
  let id = 2201;
  for (const sx of [-1, 1])
    for (const z of [-3, -9, -15])
      for (const y of [7.25, 11.75]) {
        const fixed = { pan: 0, tilt: 0 };
        const aim = aimAt(rig.add(id++, 'profile', sx * 23.6, y, z, 'hang', fixed), sx * 8, DECK + 1.5, z);
        fixed.pan = aim.pan;
        fixed.tilt = aim.tilt;
      }
}
