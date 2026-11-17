import { TR } from '../venue';
import type { RigBuilder } from './RigBuilder';

/** The audience lighting: 12 crowd washes on the front truss and two delay towers in the crowd with 3 washes each. */
export function addAudienceWashes(rig: RigBuilder): void {
  rig.row(1801, 12, 'wash', -21, 21, TR.front.y - 0.75, TR.front.z + 1.05, 'hang');
  let id = 1813;
  for (const sx of [-1, 1]) for (const y of [5.5, 7.5, 9.5]) rig.add(id++, 'wash', sx * 24, y, 33.6, 'floor');
}
