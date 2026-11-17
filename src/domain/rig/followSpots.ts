import { TR } from '../venue';
import type { RigBuilder } from './RigBuilder';

/**
 * The four follow spots on the front truss. They sit in the gaps after spots 103, 107, 113 and 117 (x = -20 + 40/19 *
 * (gap + 0.5)), the gaps that keep 1 m clear of the blinders.
 */
export function addFollowSpots(rig: RigBuilder): void {
  [2, 6, 12, 16].forEach((gap, k) =>
    rig.add({
      id: 1901 + k,
      type: 'follow',
      at: [-20 + (40 / 19) * (gap + 0.5), TR.front.y - 0.75, TR.front.z],
      mount: 'hang',
    }),
  );
}
