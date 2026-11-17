import { TR } from '../venue';
import type { RigBuilder } from './RigBuilder';

/** The rows on the five straight trusses: spots, blinders, beams, washes and strobes, front truss first. */
export function addTrussRows(rig: RigBuilder): void {
  rig.row(101, 20, 'spot', -20, 20, TR.front.y - 0.75, TR.front.z, 'hang');
  rig.row(801, 16, 'blinder', -22, 22, TR.front.y - 0.6, TR.front.z + 0.5, 'hang', { pan: 0, tilt: 64 });
  rig.row(201, 30, 'beam', -21.5, 21.5, TR.t2.y - 0.7, TR.t2.z, 'hang');
  rig.row(301, 30, 'wash', -21.5, 21.5, TR.t3.y - 0.75, TR.t3.z, 'hang');
  rig.row(901, 20, 'strobe', -20, 20, TR.t3.y - 0.55, TR.t3.z + 0.5, 'hang', { pan: 0, tilt: 34 });
  rig.row(401, 20, 'spot', -20, 20, TR.t4.y - 0.75, TR.t4.z, 'hang');
  rig.row(501, 30, 'beam', -21.5, 21.5, TR.back.y - 0.7, TR.back.z, 'hang');
}
